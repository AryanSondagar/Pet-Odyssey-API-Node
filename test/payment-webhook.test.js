const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Stripe = require('stripe');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

process.env.STRIPE_SECRET_KEY = 'sk_test_payment-webhook-tests';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_payment-webhook-test-secret';
process.env.JWT_SECRET = 'payment-integration-jwt-secret';

const Course = require('../src/models/course.model');
const Order = require('../src/models/order.model');
const Product = require('../src/models/marketplace.model');
const ProcessedStripeEvent = require('../src/models/processedStripeEvent.model');
const User = require('../src/models/user.model');
const paymentController = require('../src/controllers/payment.controller');
const orderController = require('../src/controllers/order.controller');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

let mongo;
let originalStripeCreate;
let originalStripeRefundCreate;
let nextPaymentIntentId = 0;
let refundCalls = [];
let refundsToFail = 0;

before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri(), { dbName: 'pet-odyssey-test' });
  await Promise.all([
    Order.init(),
    Product.init(),
    Course.init(),
    User.init(),
    ProcessedStripeEvent.init(),
  ]);
  originalStripeCreate = paymentController.stripe.paymentIntents.create;
  originalStripeRefundCreate = paymentController.stripe.refunds.create;
  paymentController.stripe.paymentIntents.create = async () => ({
    id: `pi_integration_${++nextPaymentIntentId}`,
    client_secret: 'pi_integration_secret',
  });
  paymentController.stripe.refunds.create = async (_params, options) => {
    refundCalls.push(options.idempotencyKey);
    if (refundsToFail > 0) {
      refundsToFail -= 1;
      throw new Error('Temporary Stripe refund error');
    }
    return { id: `re_integration_${refundCalls.length}` };
  };
});

after(async () => {
  paymentController.stripe.paymentIntents.create = originalStripeCreate;
  paymentController.stripe.refunds.create = originalStripeRefundCreate;
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  refundCalls = [];
  refundsToFail = 0;
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) =>
      collection.deleteMany({})
    )
  );
});

const makeResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(value) {
    this.body = value;
    return this;
  },
});

const createProduct = async (productStock) => Product.create({
  productName: 'Dog Bed',
  productCategory: 'Bedding',
  productPrice: 100,
  productStock,
  productImages: [{ url: 'https://example.test/dog-bed.png', public_id: 'dog-bed' }],
});

const createPendingOrder = async ({
  userId = new mongoose.Types.ObjectId(),
  productId,
  quantity = 1,
  amount = 11800,
  paymentIntentId = `pi_order_${new mongoose.Types.ObjectId()}`,
} = {}) => Order.create({
  userId,
  items: [{
    itemId: productId,
    type: 'product',
    name: 'Dog Bed',
    quantity,
    unitAmount: 10000,
  }],
  amount,
  taxAmount: 1800,
  tipAmount: 0,
  status: 'pending',
  paymentIntentId,
});

const makeEvent = ({
  id = `evt_${new mongoose.Types.ObjectId()}`,
  type = 'payment_intent.succeeded',
  orderId,
  paymentIntentId,
  amount = 11800,
} = {}) => ({
  id,
  object: 'event',
  api_version: '2025-01-27.acacia',
  created: Math.floor(Date.now() / 1000),
  livemode: false,
  pending_webhooks: 1,
  request: null,
  type,
  data: {
    object: {
      id: paymentIntentId,
      object: 'payment_intent',
      amount,
      currency: 'inr',
      metadata: { orderId: orderId.toString() },
    },
  },
});

const invokeWebhook = async (event, { invalidSignature = false } = {}) => {
  const body = Buffer.from(JSON.stringify(event));
  const signature = stripe.webhooks.generateTestHeaderString({
    payload: body.toString(),
    secret: process.env.STRIPE_WEBHOOK_SECRET,
  });
  const response = makeResponse();
  await paymentController.webhook({
    body,
    get: (name) => name === 'Stripe-Signature'
      ? invalidSignature ? `${signature}invalid` : signature
      : undefined,
  }, response);
  return response;
};

test('creates and persists a pending order using database catalog pricing', async () => {
  const product = await createProduct(2);
  const userId = new mongoose.Types.ObjectId();
  const response = makeResponse();

  await paymentController.createIntent({
    user: { userId: userId.toString() },
    body: {
      items: [{ type: 'product', itemId: product._id.toString(), quantity: 2 }],
      tipAmount: 5,
    },
  }, response, (error) => {
    throw error;
  });

  const order = await Order.findById(response.body.orderId);
  assert.equal(response.statusCode, 201);
  assert.ok(order);
  assert.equal(order.userId.toString(), userId.toString());
  assert.equal(order.amount, 24100);
  assert.equal(order.status, 'pending');
  assert.ok(order.expiresAt > new Date());
  assert.equal((await Product.findById(product._id)).productStock, 2);
});

test('rejects a webhook with an invalid Stripe signature without changing data', async () => {
  const product = await createProduct(1);
  const order = await createPendingOrder({ productId: product._id });
  const event = makeEvent({
    orderId: order._id,
    paymentIntentId: order.paymentIntentId,
  });

  const response = await invokeWebhook(event, { invalidSignature: true });

  assert.equal(response.statusCode, 400);
  assert.equal((await Order.findById(order._id)).status, 'pending');
  assert.equal((await Product.findById(product._id)).productStock, 1);
  assert.equal(await ProcessedStripeEvent.countDocuments(), 0);
});

test('records Stripe events durably and fulfills a duplicate success event once', async () => {
  const product = await createProduct(1);
  const order = await createPendingOrder({ productId: product._id });
  const event = makeEvent({
    id: 'evt_duplicate_success',
    orderId: order._id,
    paymentIntentId: order.paymentIntentId,
  });

  const responses = await Promise.all([
    invokeWebhook(event),
    invokeWebhook(event),
  ]);

  assert.equal(responses.every((response) => response.statusCode === 200), true);
  assert.equal(responses.filter((response) => response.body.duplicate).length, 1);
  assert.equal((await Order.findById(order._id)).status, 'paid');
  assert.equal((await Product.findById(product._id)).productStock, 0);
  assert.equal(await ProcessedStripeEvent.countDocuments({ eventId: event.id }), 1);
});

test('marks amount-tampered orders failed without decrementing stock', async () => {
  const product = await createProduct(1);
  const order = await createPendingOrder({ productId: product._id });
  const event = makeEvent({
    orderId: order._id,
    paymentIntentId: order.paymentIntentId,
    amount: order.amount + 1,
  });

  const response = await invokeWebhook(event);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.amountMismatch, true);
  assert.equal((await Order.findById(order._id)).status, 'failed');
  assert.equal((await Product.findById(product._id)).productStock, 1);
});

test('handles failed and canceled Payment Intents as terminal failed orders', async () => {
  const product = await createProduct(2);
  for (const type of ['payment_intent.payment_failed', 'payment_intent.canceled']) {
    const order = await createPendingOrder({ productId: product._id });
    const response = await invokeWebhook(makeEvent({
      type,
      orderId: order._id,
      paymentIntentId: order.paymentIntentId,
    }));

    assert.equal(response.statusCode, 200);
    assert.equal((await Order.findById(order._id)).status, 'failed');
  }
  assert.equal((await Product.findById(product._id)).productStock, 2);
});

test('concurrent purchases for the final unit cannot oversell or partially fulfill', async () => {
  const product = await createProduct(1);
  const [firstOrder, secondOrder] = await Promise.all([
    createPendingOrder({ productId: product._id }),
    createPendingOrder({ productId: product._id }),
  ]);
  const events = [
    makeEvent({
      id: 'evt_competing_order_1',
      orderId: firstOrder._id,
      paymentIntentId: firstOrder.paymentIntentId,
    }),
    makeEvent({
      id: 'evt_competing_order_2',
      orderId: secondOrder._id,
      paymentIntentId: secondOrder.paymentIntentId,
    }),
  ];

  const responses = await Promise.all(events.map((event) => invokeWebhook(event)));
  const orders = await Order.find({ _id: { $in: [firstOrder._id, secondOrder._id] } });

  assert.equal(responses.every((response) => response.statusCode === 200), true);
  assert.deepEqual(orders.map((order) => order.status).sort(), ['failed', 'paid']);
  assert.equal((await Product.findById(product._id)).productStock, 0);
  assert.equal(await ProcessedStripeEvent.countDocuments(), 2);
  assert.equal(refundCalls.length, 1);
});

test('rolls back all stock changes when one item in an order is unavailable', async () => {
  const availableProduct = await createProduct(2);
  const unavailableProduct = await createProduct(0);
  const order = await Order.create({
    userId: new mongoose.Types.ObjectId(),
    items: [
      {
        itemId: availableProduct._id,
        type: 'product',
        name: 'Available item',
        quantity: 1,
        unitAmount: 10000,
      },
      {
        itemId: unavailableProduct._id,
        type: 'product',
        name: 'Unavailable item',
        quantity: 1,
        unitAmount: 10000,
      },
    ],
    amount: 23600,
    taxAmount: 3600,
    status: 'pending',
    paymentIntentId: 'pi_multi_item_rollback',
  });
  const response = await invokeWebhook(makeEvent({
    id: 'evt_multi_item_rollback',
    orderId: order._id,
    paymentIntentId: order.paymentIntentId,
    amount: order.amount,
  }));

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.stockUnavailable, true);
  assert.equal((await Order.findById(order._id)).status, 'failed');
  assert.equal((await Product.findById(availableProduct._id)).productStock, 2);
  assert.equal((await Product.findById(unavailableProduct._id)).productStock, 0);
});

test('retries an out-of-stock refund with the same idempotency key after Stripe failure', async () => {
  const product = await createProduct(0);
  const order = await createPendingOrder({ productId: product._id });
  const event = makeEvent({
    id: 'evt_retry_inventory_refund',
    orderId: order._id,
    paymentIntentId: order.paymentIntentId,
  });
  refundsToFail = 1;

  const firstResponse = await invokeWebhook(event);
  const retryResponse = await invokeWebhook(event);

  assert.equal(firstResponse.statusCode, 500);
  assert.equal(retryResponse.statusCode, 200);
  assert.equal(retryResponse.body.duplicate, true);
  assert.deepEqual(refundCalls, [
    'stripe-event-evt_retry_inventory_refund-stock-refund',
    'stripe-event-evt_retry_inventory_refund-stock-refund',
  ]);
  assert.equal((await Order.findById(order._id)).status, 'failed');
  assert.equal((await ProcessedStripeEvent.findOne({ eventId: event.id })).refundStatus, 'succeeded');
});

test('keeps pending-order expiry limited to pending orders', async () => {
  const indexes = await Order.collection.indexes();
  const ttlIndex = indexes.find((index) =>
    index.key.expiresAt === 1 &&
    index.expireAfterSeconds === 0 &&
    index.partialFilterExpression.status === 'pending'
  );
  assert.ok(ttlIndex);

  const eventIndexes = await ProcessedStripeEvent.collection.indexes();
  assert.ok(eventIndexes.some((index) =>
    index.key.eventId === 1 && index.unique === true
  ));
});

test('lists a user order history separately from the admin-wide view', async () => {
  const product = await createProduct(1);
  const [firstUser, secondUser] = await User.create([
    { name: 'First User', email: 'first@example.test', password: 'hash' },
    { name: 'Second User', email: 'second@example.test', password: 'hash' },
  ]);
  await Promise.all([
    createPendingOrder({ userId: firstUser._id, productId: product._id }),
    createPendingOrder({ userId: secondUser._id, productId: product._id }),
  ]);
  const userResponse = makeResponse();
  const adminResponse = makeResponse();

  await orderController.listCurrentUserOrders(
    { user: { userId: firstUser._id.toString() }, query: {} },
    userResponse,
    (error) => { throw error; }
  );
  await orderController.listAllOrders(
    { query: {} },
    adminResponse,
    (error) => { throw error; }
  );

  assert.equal(userResponse.body.orders.length, 1);
  assert.equal(userResponse.body.orders[0].userId._id.toString(), firstUser._id.toString());
  assert.equal(adminResponse.body.orders.length, 2);
});

test('protects user history and limits the all-order view to administrators', async (t) => {
  const user = await User.create({
    name: 'Regular User',
    email: 'route-user@example.test',
    password: 'hash',
  });
  const product = await createProduct(1);
  await createPendingOrder({ userId: user._id, productId: product._id });
  const app = express();
  app.use(cookieParser());
  app.use('/api', require('../src/routes/order.routes'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const makeCookie = (role) => `accessToken=${jwt.sign(
    { userId: user._id.toString(), role },
    process.env.JWT_SECRET,
    { expiresIn: '1m' }
  )}`;

  const userHistory = await fetch(`${baseUrl}/orders`, {
    headers: { Cookie: makeCookie('user') },
  });
  const forbiddenAdminList = await fetch(`${baseUrl}/admin/orders`, {
    headers: { Cookie: makeCookie('user') },
  });
  const adminList = await fetch(`${baseUrl}/admin/orders`, {
    headers: { Cookie: makeCookie('admin') },
  });

  assert.equal(userHistory.status, 200);
  assert.equal((await userHistory.json()).orders.length, 1);
  assert.equal(forbiddenAdminList.status, 403);
  assert.equal(adminList.status, 200);
});

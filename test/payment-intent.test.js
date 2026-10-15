const assert = require('node:assert/strict');
const { test } = require('node:test');
const mongoose = require('mongoose');

process.env.STRIPE_SECRET_KEY = 'sk_test_payment-intent-tests';

const Course = require('../src/models/course.model');
const Order = require('../src/models/order.model');
const Product = require('../src/models/marketplace.model');
const paymentController = require('../src/controllers/payment.controller');

test('creates Payment Intent using catalog prices and stores a pending order', async (t) => {
  const originalProductFind = Product.find;
  const originalCourseFind = Course.find;
  const originalOrderCreate = Order.create;
  const originalStripeCreate = paymentController.stripe.paymentIntents.create;
  t.after(() => {
    Product.find = originalProductFind;
    Course.find = originalCourseFind;
    Order.create = originalOrderCreate;
    paymentController.stripe.paymentIntents.create = originalStripeCreate;
  });

  const productId = new mongoose.Types.ObjectId();
  const orderId = new mongoose.Types.ObjectId();
  let createdOrder;
  let stripeRequest;
  Product.find = async () => [{
    _id: productId,
    productName: 'Dog Bed',
    productPrice: 10,
    productStock: 5,
  }];
  Course.find = async () => [];
  Order.create = async (data) => {
    createdOrder = data;
    return {
      ...data,
      _id: orderId,
      paymentIntentId: undefined,
      save: async function save() {},
    };
  };
  paymentController.stripe.paymentIntents.create = async (params) => {
    stripeRequest = params;
    return { id: 'pi_server_priced', client_secret: 'pi_secret' };
  };

  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  await paymentController.createIntent({
    user: { userId: new mongoose.Types.ObjectId().toString() },
    body: {
      items: [{ type: 'product', itemId: productId.toString(), quantity: 2 }],
      tipAmount: 5,
      amount: 1,
      currency: 'usd',
    },
  }, response, (error) => {
    throw error;
  });

  assert.equal(response.statusCode, 201);
  assert.equal(createdOrder.status, 'pending');
  assert.equal(createdOrder.amount, 2860);
  assert.equal(createdOrder.items[0].unitAmount, 1000);
  assert.equal(createdOrder.items[0].quantity, 2);
  assert.equal(createdOrder.taxAmount, 360);
  assert.equal(createdOrder.tipAmount, 500);
  assert.equal(stripeRequest.amount, 2860);
  assert.equal(stripeRequest.currency, 'inr');
  assert.equal(response.body.clientSecret, 'pi_secret');
});

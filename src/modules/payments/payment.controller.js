const mongoose = require('mongoose');
const { env } = require('../../config/env');
const { Course } = require('../courses');
const { Order } = require('../orders');
const { Product } = require('../marketplace');
const paymentService = require('./payment.service');

const { stripe } = paymentService;

const priceInMinorUnits = (value) => {
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) return null;
  const minorUnits = Math.round((price + Number.EPSILON) * 100);
  return Number.isSafeInteger(minorUnits) ? minorUnits : null;
};

const loadOrderItems = async (items, tipInRupees) => {
  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > 20
  ) {
    return { error: 'Provide between 1 and 20 order items' };
  }

  const normalizedItems = [];
  for (const item of items) {
    if (
      !item ||
      !['product', 'course'].includes(item.type) ||
      typeof item.itemId !== 'string' ||
      !mongoose.Types.ObjectId.isValid(item.itemId) ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 99
    ) {
      return { error: 'Each item needs a valid type, itemId, and quantity from 1 to 99' };
    }
    normalizedItems.push({ ...item, itemId: new mongoose.Types.ObjectId(item.itemId) });
  }

  const productIds = normalizedItems
    .filter((item) => item.type === 'product')
    .map((item) => item.itemId);
  const courseIds = normalizedItems
    .filter((item) => item.type === 'course')
    .map((item) => item.itemId);

  const [products, courses] = await Promise.all([
    productIds.length ? Product.find({ _id: { $in: productIds } }) : [],
    courseIds.length ? Course.find({ _id: { $in: courseIds } }) : [],
  ]);
  const catalog = new Map([
    ...products.map((product) => [`product:${product._id}`, {
      name: product.productName,
      price: product.productPrice,
      available: Number.isSafeInteger(Number(product.productStock))
        ? Number(product.productStock)
        : 0,
    }]),
    ...courses.map((course) => [`course:${course._id}`, {
      name: course.category,
      price: course.price,
      available: Number.POSITIVE_INFINITY,
    }]),
  ]);

  const orderItems = [];
  for (const item of normalizedItems) {
    const catalogItem = catalog.get(`${item.type}:${item.itemId}`);
    if (!catalogItem) {
      return { error: 'One or more catalog items do not exist' };
    }
    if (item.quantity > catalogItem.available) {
      return { error: `Insufficient stock for ${catalogItem.name}` };
    }

    const unitAmount = priceInMinorUnits(catalogItem.price);
    if (unitAmount === null) {
      return { error: `Invalid catalog price for ${catalogItem.name}` };
    }

    orderItems.push({
      itemId: item.itemId,
      type: item.type,
      name: catalogItem.name,
      quantity: item.quantity,
      unitAmount,
    });
  }

  const subtotal = orderItems.reduce(
    (total, item) => total + item.unitAmount * item.quantity,
    0
  );
  const taxAmount = Math.round(subtotal * 0.18);
  const tipAmount = priceInMinorUnits(tipInRupees);
  if (tipAmount === null) {
    return { error: 'Invalid tip amount' };
  }
  const amount = subtotal + taxAmount + tipAmount;
  if (!Number.isSafeInteger(amount) || amount < 1) {
    return { error: 'Order total must be greater than zero and within the supported amount range' };
  }

  return { items: orderItems, subtotal, taxAmount, tipAmount, amount };
};

const createIntent = async (req, res, next) => {
  let order;
  let paymentIntent;
  let orderSaved = false;
  try {
    if (!req.user || !mongoose.Types.ObjectId.isValid(req.user.userId)) {
      return res.status(401).json({ message: 'Authenticated user is required' });
    }

    const tipAmount = req.body.tipAmount === undefined ? 0 : req.body.tipAmount;
    if (
      typeof tipAmount !== 'number' ||
      !Number.isFinite(tipAmount) ||
      tipAmount < 0 ||
      tipAmount > 1000000
    ) {
      return res.status(400).json({ message: 'tipAmount must be between 0 and 1000000 INR' });
    }

    const result = await loadOrderItems(req.body.items, tipAmount);
    if (result.error) {
      return res.status(400).json({ message: result.error });
    }

    order = await Order.create({
      userId: req.user.userId,
      items: result.items,
      amount: result.amount,
      taxAmount: result.taxAmount,
      tipAmount: result.tipAmount,
      status: 'pending',
    });

    paymentIntent = await stripe.paymentIntents.create(
      {
        amount: order.amount,
        currency: 'inr',
        payment_method_types: ['card'],
        metadata: {
          orderId: order._id.toString(),
          userId: req.user.userId,
        },
      },
      { idempotencyKey: `order-${order._id}` }
    );

    order.paymentIntentId = paymentIntent.id;
    await order.save();
    orderSaved = true;

    return res.status(201).json({
      orderId: order._id,
      amount: order.amount,
      currency: 'inr',
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    if (order && !orderSaved) {
      if (paymentIntent) {
        await stripe.paymentIntents.cancel(paymentIntent.id).catch((cancelError) => {
          console.error('Unable to cancel orphaned Payment Intent:', cancelError.message);
        });
      }
      await Order.updateOne(
        { _id: order._id, status: 'pending' },
        { $set: { status: 'failed' } }
      ).catch((updateError) => {
        console.error('Unable to mark failed order:', updateError.message);
      });
    }
    return next(error);
  }
};

const webhook = async (req, res) => {
  const signature = req.get('Stripe-Signature');
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  if (!Buffer.isBuffer(req.body)) {
    return res.status(400).json({ message: 'Expected raw Stripe webhook body' });
  }
  if (!signature || !webhookSecret) {
    return res.status(400).json({ message: 'Stripe webhook signature configuration is missing' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    return res.status(400).json({ message: 'Invalid Stripe webhook signature' });
  }

  try {
    const outcome = await paymentService.processStripeEvent(event);
    return res.json(outcome);
  } catch (error) {
    if (error.statusCode === 400 || error.statusCode === 404) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error('Stripe webhook processing error:', error.message);
    return res.status(500).json({ message: 'Unable to process Stripe webhook' });
  }
};

module.exports = { createIntent, webhook, stripe };

const mongoose = require('mongoose');
const Stripe = require('stripe');
const { env } = require('../../config/env');
const { Order } = require('../orders');
const { Product } = require('../marketplace');
const ProcessedStripeEvent = require('./processedStripeEvent.model');

const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const handledEventTypes = new Set([
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
]);

const refundForUnavailableStock = async (eventRecord, paymentIntentId) => {
  if (!eventRecord || eventRecord.refundStatus !== 'pending') return;

  const refund = await stripe.refunds.create(
    { payment_intent: paymentIntentId },
    { idempotencyKey: `stripe-event-${eventRecord.eventId}-stock-refund` }
  );
  await ProcessedStripeEvent.updateOne(
    { _id: eventRecord._id, refundStatus: 'pending' },
    { $set: { refundStatus: 'succeeded', refundId: refund.id } }
  );
};

const processStripeEvent = async (event) => {
  if (!handledEventTypes.has(event.type)) return { received: true };

  const paymentIntent = event.data.object;
  const orderId = paymentIntent.metadata && paymentIntent.metadata.orderId;
  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    const error = new Error('Payment Intent has no valid order reference');
    error.statusCode = 400;
    throw error;
  }

  const session = await mongoose.startSession();
  const outcome = {
    received: true,
    duplicate: false,
    amountMismatch: false,
    stockUnavailable: false,
  };

  try {
    try {
      await session.withTransaction(async () => {
        outcome.duplicate = false;
        outcome.amountMismatch = false;
        outcome.stockUnavailable = false;

        await ProcessedStripeEvent.create([{
          eventId: event.id,
          type: event.type,
          orderId,
        }], { session });

        const order = await Order.findOne({
          _id: orderId,
          paymentIntentId: paymentIntent.id,
        }).session(session);
        if (!order) {
          const error = new Error('Order not found for Payment Intent');
          error.statusCode = 404;
          throw error;
        }

        if (order.status !== 'pending') {
          outcome.duplicate = true;
          return;
        }

        if (
          event.type === 'payment_intent.payment_failed' ||
          event.type === 'payment_intent.canceled'
        ) {
          order.status = 'failed';
          await order.save({ session });
          return;
        }

        if (paymentIntent.amount !== order.amount || paymentIntent.currency !== 'inr') {
          order.status = 'failed';
          await order.save({ session });
          outcome.amountMismatch = true;
          return;
        }

        const reservedItems = [];
        for (const item of order.items) {
          if (item.type !== 'product') continue;

          const updatedProduct = await Product.findOneAndUpdate(
            {
              _id: item.itemId,
              productStock: { $gte: item.quantity },
            },
            { $inc: { productStock: -item.quantity } },
            { returnDocument: 'after', session }
          );

          if (!updatedProduct) {
            for (const { itemId, quantity } of reservedItems) {
              await Product.updateOne(
                { _id: itemId },
                { $inc: { productStock: quantity } },
                { session }
              );
            }
            order.status = 'failed';
            await order.save({ session });
            await ProcessedStripeEvent.updateOne(
              { eventId: event.id },
              { $set: { refundStatus: 'pending' } },
              { session }
            );
            outcome.stockUnavailable = true;
            return;
          }
          reservedItems.push({ itemId: item.itemId, quantity: item.quantity });
        }

        order.status = 'paid';
        await order.save({ session });
      });
    } catch (error) {
      if (error.code === 11000) {
        const alreadyProcessed = await ProcessedStripeEvent.findOne({ eventId: event.id });
        if (alreadyProcessed) {
          await refundForUnavailableStock(alreadyProcessed, paymentIntent.id);
          return { received: true, duplicate: true };
        }
      }
      throw error;
    }
  } finally {
    await session.endSession();
  }

  if (outcome.amountMismatch) {
    console.error(`Payment amount mismatch for order ${orderId}`);
  }
  if (outcome.stockUnavailable) {
    console.error(`Insufficient stock while fulfilling order ${orderId}`);
    const eventRecord = await ProcessedStripeEvent.findOne({ eventId: event.id });
    await refundForUnavailableStock(eventRecord, paymentIntent.id);
  }

  return outcome;
};

module.exports = { processStripeEvent, stripe };

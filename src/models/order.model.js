const mongoose = require('mongoose');

const PENDING_ORDER_TTL_MS = 24 * 60 * 60 * 1000;

const orderItemSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    type: {
      type: String,
      enum: ['product', 'course'],
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [(items) => items.length > 0, 'Order must contain at least one item'],
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    taxAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    tipAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
      required: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + PENDING_ORDER_TTL_MS),
    },
    paymentIntentId: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

orderSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { status: 'pending' },
  }
);

module.exports = mongoose.model('Order', orderSchema);

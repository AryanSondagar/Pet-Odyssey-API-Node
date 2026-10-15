const mongoose = require('mongoose');

const processedStripeEventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: String,
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  processedAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  refundStatus: {
    type: String,
    enum: ['not_required', 'pending', 'succeeded'],
    default: 'not_required',
    required: true,
  },
  refundId: {
    type: String,
  },
});

module.exports = mongoose.model('ProcessedStripeEvent', processedStripeEventSchema);

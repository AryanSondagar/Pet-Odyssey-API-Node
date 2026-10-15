const mongoose = require('mongoose');

const refreshSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    previousTokenHashes: {
      type: [String],
      default: [],
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

refreshSessionSchema.index({ previousTokenHashes: 1 });

module.exports = mongoose.model('RefreshSession', refreshSessionSchema);

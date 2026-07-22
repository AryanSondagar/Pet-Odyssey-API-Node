const mongoose = require('mongoose');

const petSchema = new mongoose.Schema(
  {
    petName: {
      type: String,
      required: true
    },
    petCategory: {
      type: String,
      required: true
    },
    petBreed: {
      type: String,
      required: true
    },
    petAge: {
      type: Number,
      required: true
    },
    petSellingPrice: {
      type: Number,
      required: true
    },
    ownerMobileNumber: {
      type: String,
      required: true
    },
    images: {
      type: [
        {
          url: { type: String, required: true },
          public_id: { type: String, required: true },
        },
      ],
      required: true,
      validate: [arr => arr.length >= 3 && arr.length <= 8, 'Min 3, Max 8 images']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Pet', petSchema);

const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    courseDate: {
      type: Date,
      required: true
    },
    timeSlot: {
      type: [String],
      required: true,
      validate: [
        arr => arr.length > 0,
        'At least one time slot is required'
      ]
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Course', courseSchema);

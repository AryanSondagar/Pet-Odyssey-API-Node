const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    productCategory: {
      type: String,
      required: true,
    },
    productPrice: {
      type: Number,
      required: true,
    },
    productStock: {
      type: Number,
      required: true,
    },
    productDescription: {
      type: String,
    },
    productImages: {
      type: [String], // store image paths / URLs
      required: true,
      validate: [arrayLimit, "Min 1 and Max 5 images allowed"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // admin
    },
  },
  { timestamps: true }
);

function arrayLimit(val) {
  return val.length >= 1 && val.length <= 5;
}

module.exports = mongoose.model("Product", productSchema);

const Product = require("../models/marketplace.model");
const cloudinary = require("../config/cloudinary");
const uploadToCloudinary = require("../utils/uploadToCloudinary");

exports.addProduct = async (req, res) => {
  try {
    if (require('mongoose').connection.readyState !== 1) {
      return res.status(503).json({ message: 'Server error', error: 'MongoDB not connected' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "At least 1 image required" });
    }

    const images = await Promise.all(
      req.files.map((file) =>
        uploadToCloudinary(file.buffer, `uploads/${req.uploadType}`)
      )
    );

    const product = await Product.create({
      productName: req.body.productName,
      productCategory: req.body.productCategory,
      productPrice: req.body.productPrice,
      productStock: req.body.productStock,
      productDescription: req.body.productDescription,
      productImages: images,
      createdBy: req.user.userId || req.user.id,
    });

    res.status(201).json({
      message: "Product added successfully",
      product,
    });
  } catch (err) {
    console.error('Marketplace addProduct error:', {
      message: err.message,
      stack: err.stack,
      readyState: require('mongoose').connection.readyState,
    });
    res.status(500).json({
      message: 'Server error',
      error: err.message,
      readyState: require('mongoose').connection.readyState,
    });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Update fields
    Object.assign(product, req.body);

    if (req.files && req.files.length > 0) {
      // delete old images from Cloudinary (best-effort, non-blocking)
      Promise.all(
        (product.productImages || []).map((img) =>
          cloudinary.uploader.destroy(img.public_id).catch((e) =>
            console.error('Failed to delete Cloudinary image', img.public_id, e.message)
          )
        )
      );

      product.productImages = await Promise.all(
        req.files.map((file) =>
          uploadToCloudinary(file.buffer, `uploads/${req.uploadType}`)
        )
      );
    }

    await product.save();

    res.json({
      success: true,
      product,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await Promise.all(
      (product.productImages || []).map((img) =>
        cloudinary.uploader.destroy(img.public_id).catch((e) =>
          console.error('Failed to delete Cloudinary image', img.public_id, e.message)
        )
      )
    );

    await product.deleteOne();

    res.json({
      success: true,
      message: "Product deleted",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

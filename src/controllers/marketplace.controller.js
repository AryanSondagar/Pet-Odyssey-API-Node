const Product = require("../models/marketplace.model");
const fs = require("fs");

exports.addProduct = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "At least 1 image required" });
    }

    const images = req.files.map((file) => file.path);

    const product = await Product.create({
      productName: req.body.productName,
      productCategory: req.body.productCategory,
      productPrice: req.body.productPrice,
      productStock: req.body.productStock,
      productDescription: req.body.productDescription,
      productImages: images,
      createdBy: req.user.id, // admin id from JWT
    });

    res.status(201).json({
      message: "Product added successfully",
      product,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

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

    // If new images uploaded → replace old ones
    if (req.files && req.files.length > 0) {
      // delete old images (best-effort, non-blocking)
        product.productImages.forEach(img => {
          try {
            if (fs.existsSync(img)) {
              fs.unlink(img, (err) => {
                if (err) console.error('Failed to unlink image', img, err.message);
              });
            }
          } catch (e) {
            console.error('Error while attempting to remove image', img, e && e.message ? e.message : e);
          }
        });

        product.productImages = req.files.map(file => file.path);
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

    // delete images from disk (best-effort)
    product.productImages.forEach(img => {
      try {
        if (fs.existsSync(img)) {
          fs.unlink(img, (err) => {
            if (err) console.error('Failed to unlink image', img, err.message);
          });
        }
      } catch (e) {
        console.error('Error while attempting to remove image', img, e && e.message ? e.message : e);
      }
    });

    await product.deleteOne();

    res.json({
      success: true,
      message: "Product deleted",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

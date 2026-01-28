const Product = require("../models/marketplace.model");

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

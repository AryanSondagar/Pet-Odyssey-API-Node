const express = require("express");
const router = express.Router();

const { addProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct } = require('../controllers/marketplace.controller');
const { protect  } = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/role.middleware');
const upload = require('../middleware/upload.middleware');

// CREATE 
router.post(
  '/',
  protect,
  allowRoles('admin'),
  (req, res, next) => {
    req.uploadType = "products";
    next();
  },
  upload.array('productImages', 5), // max 8
  addProduct
);

// READ & GETALL
router.get("/", getAllProducts);
router.get("/:id", getProductById);

// UPDATE
router.put(
  "/:id",
  protect,
  (req, res, next) => {
    req.uploadType = "products";
    next();
  },
  upload.array("productImages", 5),
  updateProduct
);

// DELETE
router.delete("/:id", protect, deleteProduct);

module.exports = router;

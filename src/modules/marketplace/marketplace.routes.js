const express = require("express");
const publicRouter = express.Router();
const adminRouter = express.Router();

const { addProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct } = require('./marketplace.controller');
const { protect  } = require('../../common/middleware/auth.middleware');
const { allowRoles } = require('../../common/middleware/role.middleware');
const upload = require('../../common/middleware/upload.middleware');
const { validateBody } = require('../../common/middleware/validate-body.middleware');
const { productBody, productUpdateBody } = require('./marketplace.schema');

// CREATE 
adminRouter.post(
  '/',
  protect,
  allowRoles('admin'),
  (req, res, next) => {
    req.uploadType = "products";
    next();
  },
  upload.array('productImages', 5), // max 8
  validateBody(productBody),
  addProduct
);

// READ & GETALL
publicRouter.get("/", getAllProducts);
publicRouter.get("/:id", getProductById);

adminRouter.get("/", protect, allowRoles('admin'), getAllProducts);
adminRouter.get("/:id", protect, allowRoles('admin'), getProductById);

// UPDATE
adminRouter.put(
  "/:id",
  protect,
  allowRoles('admin'),
  (req, res, next) => {
    req.uploadType = "products";
    next();
  },
  upload.array("productImages", 5),
  validateBody(productUpdateBody),
  updateProduct
);

// DELETE
adminRouter.delete("/:id", protect, allowRoles('admin'), deleteProduct);

module.exports = { publicRouter, adminRouter };

const express = require("express");
const router = express.Router();

const { addProduct } = require('../controllers/marketplace.controller');
const { protect } = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/role.middleware');
const upload = require('../middleware/upload.middleware');

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

module.exports = router;

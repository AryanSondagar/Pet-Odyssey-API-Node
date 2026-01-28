const express = require('express');
const router = express.Router();

const { createPet } = require('../controllers/adoption.controller');
const { protect } = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/role.middleware');
const upload = require('../middleware/upload.middleware');

router.post(
  '/',
  protect,
  allowRoles('admin'),
  (req, res, next) => {
    req.uploadType = "pets";
    next();
  },
  upload.array('petImages', 8), // max 8
  createPet
);

module.exports = router;

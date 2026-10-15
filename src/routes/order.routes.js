const express = require('express');
const { listAllOrders, listCurrentUserOrders } = require('../controllers/order.controller');
const { protect } = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/role.middleware');

const router = express.Router();

router.get('/orders', protect, listCurrentUserOrders);
router.get('/admin/orders', protect, allowRoles('admin'), listAllOrders);

module.exports = router;

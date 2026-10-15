const express = require('express');
const { listAllOrders, listCurrentUserOrders } = require('./order.controller');
const { protect } = require('../../common/middleware/auth.middleware');
const { allowRoles } = require('../../common/middleware/role.middleware');

const router = express.Router();

router.get('/orders', protect, listCurrentUserOrders);
router.get('/admin/orders', protect, allowRoles('admin'), listAllOrders);

module.exports = router;

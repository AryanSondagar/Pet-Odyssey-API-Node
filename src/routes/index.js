const express = require('express');

const router = express.Router();

router.use('/auth', require('../modules/auth/auth.routes'));
router.use('/users', require('../modules/users/user.routes'));
const adoptionRoutes = require('../modules/adoption/adoption.routes');
router.use('/pets', adoptionRoutes.publicRouter);
router.use('/admin/pets', adoptionRoutes.adminRouter);
const courseRoutes = require('../modules/courses/course.routes');
router.use('/courses', courseRoutes.publicRouter);
router.use('/admin/courses', courseRoutes.adminRouter);
const marketplaceRoutes = require('../modules/marketplace/marketplace.routes');
router.use('/products', marketplaceRoutes.publicRouter);
router.use('/admin/products', marketplaceRoutes.adminRouter);
router.use('/payments', require('../modules/payments/payment.routes'));
router.use('/', require('../modules/orders/order.routes'));

module.exports = router;

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate-body.middleware');
const { createIntentBody } = require('../validation/request.schemas');

router.post('/webhook', paymentController.webhook);
router.post(
  '/create-intent',
  protect,
  validateBody(createIntentBody),
  paymentController.createIntent
);

module.exports = router;
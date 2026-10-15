const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const { protect } = require('../../common/middleware/auth.middleware');
const { validateBody } = require('../../common/middleware/validate-body.middleware');
const { createIntentBody } = require('./payment.schema');

router.post('/webhook', paymentController.webhook);
router.post(
  '/create-intent',
  protect,
  validateBody(createIntentBody),
  paymentController.createIntent
);

module.exports = router;
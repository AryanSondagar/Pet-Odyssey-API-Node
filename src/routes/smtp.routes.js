const express = require('express');
const router = express.Router();
const smtpController = require('../controllers/smtp.controller');

router.post('/send', smtpController.sendEmail);

module.exports = router;

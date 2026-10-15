const express = require('express');
const router = express.Router();
const {
  register,
  login,
  refresh,
  logout,
  getCsrfToken,
} = require('../controllers/auth.controller');
const {
  loginRateLimit,
  refreshRateLimit,
  registerRateLimit,
} = require('../middleware/rate-limit.middleware');
const { validateBody } = require('../middleware/validate-body.middleware');
const {
  loginBody,
  registerBody,
} = require('../validation/request.schemas');

router.get('/csrf', getCsrfToken);
router.post('/register', registerRateLimit, validateBody(registerBody), register);
router.post('/login', loginRateLimit, validateBody(loginBody), login);
router.post('/refresh', refreshRateLimit, refresh);
router.post('/logout', logout);

module.exports = router;

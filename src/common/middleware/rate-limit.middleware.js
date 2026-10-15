const { rateLimit } = require('express-rate-limit');

const createRateLimiter = (windowMs, limit, message) => rateLimit({
  windowMs,
  limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ message }),
});

module.exports = {
  createRateLimiter,
  loginRateLimit: createRateLimiter(
    15 * 60 * 1000,
    10,
    'Too many login attempts. Try again later.'
  ),
  registerRateLimit: createRateLimiter(
    60 * 60 * 1000,
    5,
    'Too many registration attempts. Try again later.'
  ),
  refreshRateLimit: createRateLimiter(
    15 * 60 * 1000,
    30,
    'Too many session refresh requests. Try again later.'
  ),
};

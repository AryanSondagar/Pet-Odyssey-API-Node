const { requireCsrfToken } = require('../utils/csrf');

const requireBrowserRequest = (allowedOrigins) => (req, res, next) => {
  if (req.originalUrl && req.originalUrl.split('?')[0] === '/api/payments/webhook') {
    return next();
  }

  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (!isMutation) return next();

  const origin = req.get('Origin');
  if (!origin || !allowedOrigins.includes(origin)) {
    return res.status(403).json({ message: 'A permitted Origin header is required' });
  }

  return requireCsrfToken(req, res, next);
};

module.exports = { requireBrowserRequest };

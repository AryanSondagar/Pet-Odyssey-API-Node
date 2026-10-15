const crypto = require('crypto');
const { env } = require('../../config/env');

const CSRF_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const createCsrfToken = () => {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  const payload = `${crypto.randomBytes(32).toString('base64url')}.${Date.now() + CSRF_TOKEN_TTL_MS}`;
  const signature = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
};

const isValidCsrfToken = (token) => {
  if (typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [nonce, expiresAt, signature] = parts;
  if (!/^[A-Za-z0-9_-]{40,}$/.test(nonce) || !/^\d+$/.test(expiresAt)) {
    return false;
  }
  if (!/^[A-Za-z0-9_-]{43}$/.test(signature)) return false;
  if (Number(expiresAt) <= Date.now() || Number(expiresAt) > Date.now() + CSRF_TOKEN_TTL_MS) {
    return false;
  }
  if (!env.JWT_SECRET) return false;

  const payload = `${nonce}.${expiresAt}`;
  const expectedSignature = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(payload)
    .digest();
  const actualSignature = Buffer.from(signature, 'base64url');

  return actualSignature.toString('base64url') === signature &&
    actualSignature.length === expectedSignature.length &&
    crypto.timingSafeEqual(actualSignature, expectedSignature);
};

const csrfCookieOptions = () => ({
  httpOnly: false,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
  maxAge: CSRF_TOKEN_TTL_MS,
});

const requireCsrfToken = (req, res, next) => {
  const cookieToken = req.cookies && req.cookies.csrfToken;
  const headerToken = req.get('X-CSRF-Token');

  if (
    !cookieToken ||
    !headerToken ||
    cookieToken.length !== headerToken.length ||
    !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken)) ||
    !isValidCsrfToken(cookieToken)
  ) {
    return res.status(403).json({ message: 'CSRF token missing or invalid' });
  }

  return next();
};

module.exports = {
  createCsrfToken,
  csrfCookieOptions,
  isValidCsrfToken,
  requireCsrfToken,
};

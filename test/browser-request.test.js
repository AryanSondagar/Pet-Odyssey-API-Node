const assert = require('node:assert/strict');
const { test } = require('node:test');
const { requireBrowserRequest } = require('../src/middleware/browser-request.middleware');
const { createCsrfToken } = require('../src/utils/csrf');

process.env.JWT_SECRET = 'browser-request-test-secret';

const callMiddleware = (middleware, {
  method = 'POST',
  origin,
  cookieToken,
  headerToken,
  originalUrl,
}) => {
  const req = {
    method,
    originalUrl,
    cookies: cookieToken ? { csrfToken: cookieToken } : {},
    get(name) {
      if (name === 'Origin') return origin;
      if (name === 'X-CSRF-Token') return headerToken;
      return undefined;
    },
  };
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let continued = false;

  middleware(req, res, () => {
    continued = true;
  });

  return { res, continued };
};

test('rejects mutation requests when Origin is absent', () => {
  const result = callMiddleware(requireBrowserRequest(['https://pet.example']), {});
  assert.equal(result.res.statusCode, 403);
  assert.equal(result.continued, false);
});

test('rejects mutation requests from unconfigured origins', () => {
  const result = callMiddleware(requireBrowserRequest(['https://pet.example']), {
    origin: 'https://attacker.example',
  });
  assert.equal(result.res.statusCode, 403);
  assert.equal(result.continued, false);
});

test('requires a valid matching double-submit CSRF token', () => {
  const middleware = requireBrowserRequest(['https://pet.example']);
  const token = createCsrfToken();

  const missingToken = callMiddleware(middleware, { origin: 'https://pet.example' });
  assert.equal(missingToken.res.statusCode, 403);

  const mismatchedToken = callMiddleware(middleware, {
    origin: 'https://pet.example',
    cookieToken: token,
    headerToken: `${token}x`,
  });
  assert.equal(mismatchedToken.res.statusCode, 403);

  const forgedToken = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;
  const forgedMatch = callMiddleware(middleware, {
    origin: 'https://pet.example',
    cookieToken: forgedToken,
    headerToken: forgedToken,
  });
  assert.equal(forgedMatch.res.statusCode, 403);

  const validToken = callMiddleware(middleware, {
    origin: 'https://pet.example',
    cookieToken: token,
    headerToken: token,
  });
  assert.equal(validToken.continued, true);
});

test('does not require browser Origin or CSRF token for safe methods', () => {
  const result = callMiddleware(requireBrowserRequest(['https://pet.example']), {
    method: 'GET',
  });
  assert.equal(result.continued, true);
});

test('allows the Stripe webhook through browser checks for signature validation', () => {
  const result = callMiddleware(requireBrowserRequest(['https://pet.example']), {
    method: 'POST',
    originalUrl: '/api/payment/webhook',
  });
  assert.equal(result.continued, true);
});

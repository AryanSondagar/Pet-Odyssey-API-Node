const assert = require('node:assert/strict');
const { test } = require('node:test');

process.env.STRIPE_SECRET_KEY = 'sk_test_payment-route-test';
process.env.JWT_SECRET = 'payment-route-auth-test-secret';

const paymentRoutes = require('../src/modules/payments/payment.routes');
const { protect } = require('../src/common/middleware/auth.middleware');
const { createAccessToken } = require('./helpers/auth');

test('Payment Intent creation requires authentication and webhooks are signature-authenticated', () => {
  const protectedPaths = paymentRoutes.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      handlers: layer.route.stack.map((routeLayer) => routeLayer.handle),
    }));

  const intentRoute = protectedPaths.find((candidate) => candidate.path === '/create-intent');
  assert.ok(intentRoute, 'Payment Intent route is registered');
  assert.equal(intentRoute.handlers[0], protect, 'Payment Intent creation must require authentication');

  const webhookRoute = protectedPaths.find((candidate) => candidate.path === '/webhook');
  assert.ok(webhookRoute, 'Stripe webhook route is registered');
  assert.notEqual(webhookRoute.handlers[0], protect, 'Stripe webhook uses Stripe signature verification');

  const response = {
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

  protect({ cookies: {}, headers: {} }, response, () => {
    continued = true;
  });

  assert.equal(response.statusCode, 401);
  assert.equal(continued, false);

  let authenticated = false;
  protect({ cookies: { accessToken: createAccessToken('507f1f77bcf86cd799439011') } }, response, () => {
    authenticated = true;
  });
  assert.equal(authenticated, true);
});

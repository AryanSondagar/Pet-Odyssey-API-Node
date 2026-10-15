const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { test } = require('node:test');

process.env.JWT_SECRET = 'auth-refresh-test-secret';

const User = require('../src/modules/users/user.model');
const RefreshSession = require('../src/modules/auth/refreshSession.model');
const authController = require('../src/modules/auth/auth.controller');

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

test('reusing a rotated refresh token revokes its entire session', async (t) => {
  const originalFindOne = RefreshSession.findOne;
  const originalFindOneAndUpdate = RefreshSession.findOneAndUpdate;
  const originalUpdateOne = RefreshSession.updateOne;
  const originalFindById = User.findById;
  t.after(() => {
    RefreshSession.findOne = originalFindOne;
    RefreshSession.findOneAndUpdate = originalFindOneAndUpdate;
    RefreshSession.updateOne = originalUpdateOne;
    User.findById = originalFindById;
  });

  const oldRefreshToken = 'previous-refresh-token';
  const session = {
    _id: 'session-id',
    userId: 'user-id',
    tokenHash: hashToken(oldRefreshToken),
    previousTokenHashes: [],
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
  };

  RefreshSession.findOne = async ({ $or: conditions }) =>
    conditions.some((condition) =>
      condition.tokenHash === session.tokenHash ||
      session.previousTokenHashes.includes(condition.previousTokenHashes)
    )
      ? session
      : null;
  RefreshSession.findOneAndUpdate = async (filter, update) => {
    if (filter.tokenHash !== session.tokenHash || session.revokedAt) return null;
    session.previousTokenHashes.push(update.$addToSet.previousTokenHashes);
    session.tokenHash = update.$set.tokenHash;
    return session;
  };
  RefreshSession.updateOne = async (_filter, update) => {
    session.revokedAt = update.$set.revokedAt;
  };
  User.findById = async () => ({
    _id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
  });

  const makeResponse = () => ({
    statusCode: 200,
    body: null,
    cookies: {},
    cookie(name, value, options) {
      this.cookies[name] = { value, options };
      return this;
    },
    clearCookie() {
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  });

  const rotationResponse = makeResponse();
  await authController.refresh(
    { cookies: { refreshToken: oldRefreshToken } },
    rotationResponse
  );

  assert.equal(rotationResponse.statusCode, 200);
  assert.notEqual(rotationResponse.cookies.refreshToken.value, oldRefreshToken);
  assert.ok(session.previousTokenHashes.includes(hashToken(oldRefreshToken)));

  const replayResponse = makeResponse();
  await authController.refresh(
    { cookies: { refreshToken: oldRefreshToken } },
    replayResponse
  );

  assert.equal(replayResponse.statusCode, 401);
  assert.ok(session.revokedAt instanceof Date);
});

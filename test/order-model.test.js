const assert = require('node:assert/strict');
const { test } = require('node:test');
const Order = require('../src/modules/orders/order.model');

test('expires only pending orders with the TTL index', () => {
  const ttlIndex = Order.schema.indexes().find(([keys]) => keys.expiresAt === 1);

  assert.ok(ttlIndex, 'expiresAt TTL index is defined');
  assert.deepEqual(ttlIndex[1], {
    expireAfterSeconds: 0,
    partialFilterExpression: { status: 'pending' },
  });
});

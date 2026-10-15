const assert = require('node:assert/strict');
const { test } = require('node:test');
const express = require('express');
const { createRateLimiter } = require('../src/middleware/rate-limit.middleware');

test('returns 429 after the configured request limit is exceeded', async (t) => {
  const app = express();
  app.post('/login', createRateLimiter(60_000, 1, 'Try again later.'), (_req, res) => {
    res.sendStatus(204);
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const address = server.address();
  const url = `http://127.0.0.1:${address.port}/login`;
  const firstResponse = await fetch(url, { method: 'POST' });
  const limitedResponse = await fetch(url, { method: 'POST' });

  assert.equal(firstResponse.status, 204);
  assert.equal(limitedResponse.status, 429);
  assert.deepEqual(await limitedResponse.json(), { message: 'Try again later.' });
});

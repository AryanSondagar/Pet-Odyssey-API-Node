const assert = require('node:assert/strict');
const { test } = require('node:test');

process.env.STRIPE_SECRET_KEY = 'sk_test_route-mounts';

const apiRoutes = require('../src/routes');
const adoptionRoutes = require('../src/modules/adoption/adoption.routes');
const courseRoutes = require('../src/modules/courses/course.routes');
const marketplaceRoutes = require('../src/modules/marketplace/marketplace.routes');
const userRoutes = require('../src/modules/users/user.routes');

test('mounts all feature routers in the API router', () => {
  assert.equal(apiRoutes.stack.length, 10);
});

test('separates public pet endpoints from protected admin management endpoints', () => {
  const routePaths = (router) => router.stack.map((layer) => ({
    method: Object.keys(layer.route.methods)[0],
    path: layer.route.path,
  }));

  assert.deepEqual(routePaths(adoptionRoutes.publicRouter), [
    { method: 'get', path: '/' },
    { method: 'get', path: '/:id' },
    { method: 'post', path: '/apply' },
  ]);
  assert.deepEqual(routePaths(adoptionRoutes.adminRouter), [
    { method: 'post', path: '/' },
    { method: 'get', path: '/' },
    { method: 'get', path: '/:id' },
    { method: 'put', path: '/:id' },
    { method: 'delete', path: '/:id' },
  ]);
});

test('separates public course and product reads from admin management routes', () => {
  const routePaths = (router) => router.stack.map((layer) => ({
    method: Object.keys(layer.route.methods)[0],
    path: layer.route.path,
  }));

  for (const routes of [courseRoutes, marketplaceRoutes]) {
    assert.deepEqual(routePaths(routes.publicRouter), [
      { method: 'get', path: '/' },
      { method: 'get', path: '/:id' },
    ]);
    assert.deepEqual(routePaths(routes.adminRouter), [
      { method: 'post', path: '/' },
      { method: 'get', path: '/' },
      { method: 'get', path: '/:id' },
      { method: 'put', path: '/:id' },
      { method: 'delete', path: '/:id' },
    ]);
  }
});

test('does not expose the obsolete users admin example route', () => {
  const registeredPaths = userRoutes.stack.flatMap((layer) =>
    Object.values(layer.route.methods).includes(true) ? [layer.route.path] : []
  );

  assert.deepEqual(registeredPaths, ['/profile']);
});

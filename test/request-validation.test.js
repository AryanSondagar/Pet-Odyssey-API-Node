const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  createIntentBody,
  loginBody,
  petBody,
  productBody,
  registerBody,
} = require('../src/validation/request.schemas');
const { validateBody } = require('../src/middleware/validate-body.middleware');

test('validates registration and login input without allowing public role assignment', () => {
  assert.equal(registerBody.safeParse({
    name: 'Pet Owner',
    email: 'owner@example.com',
    password: 'strong-password',
    role: 'User',
  }).success, true);
  assert.equal(registerBody.safeParse({
    name: 'Admin',
    email: 'admin@example.com',
    password: 'strong-password',
    role: 'admin',
  }).success, false);
  assert.equal(loginBody.safeParse({
    email: 'not-an-email',
    password: '',
  }).success, false);
});

test('validates payment items and rejects client-supplied price fields', () => {
  const validBody = {
    items: [{
      type: 'product',
      itemId: '507f1f77bcf86cd799439011',
      quantity: 2,
    }],
  };
  assert.equal(createIntentBody.safeParse(validBody).success, true);
  assert.equal(createIntentBody.safeParse({
    ...validBody,
    amount: 1,
  }).success, false);
});

test('accepts multipart numeric fields and rejects empty numeric values', () => {
  const product = {
    productName: 'Dog Bed',
    productCategory: 'Bedding',
    productPrice: '19.99',
    productStock: '5',
  };
  const parsedProduct = productBody.safeParse(product);
  assert.equal(parsedProduct.success, true);
  assert.equal(parsedProduct.data.productPrice, 19.99);
  assert.equal(parsedProduct.data.productStock, 5);
  assert.equal(productBody.safeParse({
    ...product,
    productPrice: null,
  }).success, false);

  assert.equal(petBody.safeParse({
    petName: 'Milo',
    petCategory: 'Dog',
    petBreed: 'Beagle',
    petAge: '',
    petSellingPrice: '100',
    ownerMobileNumber: '1234567890',
  }).success, false);
});

test('returns a structured 400 response for invalid request bodies', () => {
  const middleware = validateBody(loginBody);
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

  middleware({ body: { email: 'invalid', password: '' } }, response, () => {
    continued = true;
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.message, 'Invalid request body');
  assert.ok(response.body.issues.length > 0);
  assert.equal(continued, false);
});

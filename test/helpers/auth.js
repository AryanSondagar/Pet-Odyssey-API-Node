const jwt = require('jsonwebtoken');
const { env } = require('../../src/config/env');

const createAccessToken = (userId, role = 'user') => {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required by authenticated tests');
  }
  return jwt.sign({ userId, role }, env.JWT_SECRET, { expiresIn: '15m' });
};

module.exports = { createAccessToken };

const { createCsrfToken } = require('../../src/common/utils/csrf');

const createCsrfRequest = (origin) => {
  const token = createCsrfToken();
  return {
    token,
    req: {
      method: 'POST',
      originalUrl: '/api/test',
      cookies: { csrfToken: token },
      get(name) {
        if (name === 'Origin') return origin;
        if (name === 'X-CSRF-Token') return token;
        return undefined;
      },
    },
  };
};

module.exports = { createCsrfRequest };

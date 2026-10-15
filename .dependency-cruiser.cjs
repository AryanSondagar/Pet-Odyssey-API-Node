const moduleNames = ['adoption', 'auth', 'courses', 'marketplace', 'orders', 'payments', 'users'];

module.exports = {
  forbidden: moduleNames.map((moduleName) => ({
    name: `modules-${moduleName}-must-not-import-other-modules`,
    severity: 'error',
    from: { path: `^src/modules/${moduleName}/` },
    to: { path: `^src/modules/(?!${moduleName}/)(?![^/]+/index\\.js$)` },
  })),
  options: {
    doNotFollow: { path: 'node_modules' },
  },
};

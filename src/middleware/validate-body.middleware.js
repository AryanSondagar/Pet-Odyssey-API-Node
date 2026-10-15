const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: 'Invalid request body',
      issues: result.error.issues.map(({ path, message }) => ({
        path: path.join('.'),
        message,
      })),
    });
  }

  req.body = result.data;
  return next();
};

module.exports = { validateBody };

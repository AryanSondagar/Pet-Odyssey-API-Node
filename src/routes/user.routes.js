const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/role.middleware');

router.get('/profile', protect, (req, res) => {
  res.json({
    message: 'User profile',
    user: req.user
  });
});

// Admin-only route
router.get('/admin', protect, allowRoles('admin'), (req, res) => {
  res.json({ message: 'Welcome Admin 👑' });
});

module.exports = router;

const express = require('express');
const router = express.Router();

const { protect } = require('../../common/middleware/auth.middleware');

router.get('/profile', protect, (req, res) => {
  res.json({
    message: 'User profile',
    user: req.user
  });
});

module.exports = router;

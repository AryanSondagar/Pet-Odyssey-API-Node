const express = require('express');
const router = express.Router();

const { createCourse } = require('../controllers/course.controller');
const { protect } = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/role.middleware');

// Create course (Admin)
router.post(
  '/',
  protect,
  allowRoles('admin'),
  createCourse
);

module.exports = router;

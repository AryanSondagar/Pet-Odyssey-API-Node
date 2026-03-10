const express = require('express');
const router = express.Router();

const { createCourse , 
        getAllCourses,
        updateCourse,
        getCourseById,
        deleteCourse } = require('../controllers/course.controller');
const { protect } = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/role.middleware');

// Create course (Admin)
router.post(
  '/',
  protect,
  allowRoles('admin'),
  createCourse
);

// GET ALL COURSES (Public)
router.get("/", getAllCourses);

// get by ID
router.get('/:id', getCourseById);

// UPDATE COURSE (Admin)
router.put(
  "/:id",
  protect,
  updateCourse
);

// DELETE COURSE (Admin)
router.delete("/:id", protect, deleteCourse);

module.exports = router;

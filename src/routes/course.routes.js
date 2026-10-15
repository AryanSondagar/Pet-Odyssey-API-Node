const express = require('express');
const router = express.Router();

const { createCourse , 
        getAllCourses,
        updateCourse,
        getCourseById,
        deleteCourse } = require('../controllers/course.controller');
const { protect } = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/role.middleware');
const { validateBody } = require('../middleware/validate-body.middleware');
const { courseBody, courseUpdateBody } = require('../validation/request.schemas');

// Create course (Admin)
router.post(
  '/',
  protect,
  allowRoles('admin'),
  validateBody(courseBody),
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
  allowRoles('admin'),
  validateBody(courseUpdateBody),
  updateCourse
);

// DELETE COURSE (Admin)
router.delete("/:id", protect, allowRoles('admin'), deleteCourse);

module.exports = router;

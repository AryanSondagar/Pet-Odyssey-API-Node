const express = require('express');
const publicRouter = express.Router();
const adminRouter = express.Router();

const { createCourse , 
        getAllCourses,
        updateCourse,
        getCourseById,
        deleteCourse } = require('./course.controller');
const { protect } = require('../../common/middleware/auth.middleware');
const { allowRoles } = require('../../common/middleware/role.middleware');
const { validateBody } = require('../../common/middleware/validate-body.middleware');
const { courseBody, courseUpdateBody } = require('./course.schema');

// Create course (Admin)
adminRouter.post(
  '/',
  protect,
  allowRoles('admin'),
  validateBody(courseBody),
  createCourse
);

// GET ALL COURSES (Public)
publicRouter.get("/", getAllCourses);

// Public course detail
publicRouter.get('/:id', getCourseById);

// Admin-only reads and mutations
adminRouter.get("/", protect, allowRoles('admin'), getAllCourses);
adminRouter.get('/:id', protect, allowRoles('admin'), getCourseById);

adminRouter.put(
  "/:id",
  protect,
  allowRoles('admin'),
  validateBody(courseUpdateBody),
  updateCourse
);

// DELETE COURSE (Admin)
adminRouter.delete("/:id", protect, allowRoles('admin'), deleteCourse);

module.exports = { publicRouter, adminRouter };

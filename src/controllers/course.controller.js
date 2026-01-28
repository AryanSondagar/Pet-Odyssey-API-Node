const Course = require('../models/course.model');

exports.createCourse = async (req, res) => {
  try {
    const {
      city,
      state,
      category,
      price,
      courseDate,
      timeSlot
    } = req.body;

    // Basic validation
    if (
      !city ||
      !state ||
      !category ||
      !price ||
      !courseDate ||
      !timeSlot ||
      !Array.isArray(timeSlot)
    ) {
      return res.status(400).json({
        message: 'All fields are required'
      });
    }

    const course = await Course.create({
      city,
      state,
      category,
      price,
      courseDate,
      timeSlot,
      createdBy: req.user.userId
    });

    res.status(201).json({
      message: 'Course created successfully',
      course
    });

  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

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
      createdBy: req.user.userId || req.user.id
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

exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    console.error("Get Courses Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch courses",
    });
  }
};

exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        ...(req.file && { thumbnail: req.file.path }),
      },
      { new: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: updatedCourse,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

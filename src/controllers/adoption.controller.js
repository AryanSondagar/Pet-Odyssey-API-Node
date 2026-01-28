const Pet = require('../models/adoption.model');

exports.createPet = async (req, res) => {
  try {
    const {
      petName,
      petCategory,
      petBreed,
      petAge,
      petSellingPrice,
      ownerMobileNumber
    } = req.body;

    // Images validation
    if (!req.files || req.files.length < 3 || req.files.length > 8) {
      return res.status(400).json({
        message: 'Please upload minimum 3 and maximum 8 images'
      });
    }

    const imagePaths = req.files.map(file => file.path);

    const pet = await Pet.create({
      petName,
      petCategory,
      petBreed,
      petAge,
      petSellingPrice,
      ownerMobileNumber,
      images: imagePaths,
      createdBy: req.user.userId
    });

    res.status(201).json({
      message: 'Pet created successfully',
      pet
    });

  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

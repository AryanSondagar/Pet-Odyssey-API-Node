const Pet = require('../models/adoption.model');
const AdoptionApplication = require('../models/AdoptionApplication.model');

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

exports.getAllPets = async (req, res) => {
  try {
    const pets = await Pet.find()
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      count: pets.length,
      data: pets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch pets",
    });
  }
};

exports.getPetById = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id).populate(
      "createdBy",
      "name email"
    );

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "Pet not found",
      });
    }

    res.status(200).json({
      success: true,
      data: pet,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Invalid pet ID",
    });
  }
};

exports.updatePet = async (req, res) => {
  try {
    let pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "Pet not found",
      });
    }

    // Optional: update images
    if (req.files && req.files.length > 0) {
      pet.images = req.files.map((file) => file.path);
    }

    pet = await Pet.findByIdAndUpdate(
      req.params.id,
      { ...req.body, images: pet.images },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: pet,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deletePet = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "Pet not found",
      });
    }

    await pet.deleteOne();

    res.status(200).json({
      success: true,
      message: "Pet deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete pet",
    });
  }
};


exports.applyForAdoption = async (req, res) => {
  try {
    const { petId, petName, name, email, phone, address, reason, isAdult, hasPets } = req.body;

    // Validate required fields
    if (!petId || !name || !email || !phone || !address || !reason) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if pet exists
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }

    // Create adoption application
    const application = await AdoptionApplication.create({
      petId,
      petName,
      name,
      email,
      phone,
      address,
      reason,
      isAdult,
      hasPets,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Adoption application submitted successfully',
      data: application
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
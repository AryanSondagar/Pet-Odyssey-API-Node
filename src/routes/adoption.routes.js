const express = require('express');
const router = express.Router();

const { createPet,
        getAllPets,
        getPetById,
        updatePet,
        deletePet,
        applyForAdoption
 } = require('../controllers/adoption.controller');
const { protect } = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/role.middleware');
const upload = require('../middleware/upload.middleware');
const { validateBody } = require('../middleware/validate-body.middleware');
const {
  adoptionApplicationBody,
  petBody,
  petUpdateBody,
} = require('../validation/request.schemas');

router.post(
  '/',
  protect,
  allowRoles('admin'),
  (req, res, next) => {
    req.uploadType = "pets";
    next();
  },
  upload.array('petImages', 8), // max 8
  validateBody(petBody),
  createPet
);

router.get("/", getAllPets);
router.get("/:id", getPetById);

router.put(
  "/:id",
  protect,
  allowRoles('admin'),
  (req, res, next) => {
    req.uploadType = "pets";
    next();
  },
  upload.array("images", 8),
  validateBody(petUpdateBody),
  updatePet
);

router.delete("/:id", protect, allowRoles('admin'), deletePet);

router.post('/apply', validateBody(adoptionApplicationBody), applyForAdoption);

module.exports = router;

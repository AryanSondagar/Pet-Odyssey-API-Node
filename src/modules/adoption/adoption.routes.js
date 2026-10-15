const express = require('express');
const publicRouter = express.Router();
const adminRouter = express.Router();

const { createPet,
        getAllPets,
        getPetById,
        updatePet,
        deletePet,
        applyForAdoption
 } = require('./adoption.controller');
const { protect } = require('../../common/middleware/auth.middleware');
const { allowRoles } = require('../../common/middleware/role.middleware');
const upload = require('../../common/middleware/upload.middleware');
const { validateBody } = require('../../common/middleware/validate-body.middleware');
const {
  adoptionApplicationBody,
  petBody,
  petUpdateBody,
} = require('./adoption.schema');

adminRouter.post(
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

publicRouter.get("/", getAllPets);
publicRouter.get("/:id", getPetById);

adminRouter.get("/", protect, allowRoles('admin'), getAllPets);
adminRouter.get("/:id", protect, allowRoles('admin'), getPetById);

adminRouter.put(
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

adminRouter.delete("/:id", protect, allowRoles('admin'), deletePet);

publicRouter.post('/apply', validateBody(adoptionApplicationBody), applyForAdoption);

module.exports = { publicRouter, adminRouter };

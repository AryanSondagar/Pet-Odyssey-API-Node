const { z } = require('zod');
const {
  formNumber,
  nonEmptyText,
  objectId,
  optionalBoolean,
  positiveMoney,
} = require('../../common/utils/schema-helpers');

const petBody = z.object({
  petName: nonEmptyText,
  petCategory: nonEmptyText,
  petBreed: nonEmptyText,
  petAge: formNumber(z.number().int().min(0).max(100)),
  petSellingPrice: positiveMoney,
  ownerMobileNumber: z.string().trim().min(5).max(30),
});

const petUpdateBody = petBody.partial();

const adoptionApplicationBody = z.object({
  petId: objectId,
  petName: nonEmptyText.optional(),
  name: nonEmptyText.max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(5).max(30),
  address: z.string().trim().min(1).max(1000),
  reason: z.string().trim().min(1).max(3000),
  isAdult: optionalBoolean,
  hasPets: optionalBoolean,
}).strict();

module.exports = { adoptionApplicationBody, petBody, petUpdateBody };

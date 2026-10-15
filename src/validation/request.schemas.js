const { z } = require('zod');

const nonEmptyText = z.string().trim().min(1).max(200);
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Must be a valid ID');
const formNumber = (schema) => z.preprocess((value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) return Number(value);
  return Number.NaN;
}, schema);
const positiveMoney = formNumber(z.number().finite().min(0).max(10000000));
const optionalBoolean = z.preprocess((value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean().optional());

const registerBody = z.object({
  name: nonEmptyText.max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  role: z.literal('User').optional(),
}).strict();

const loginBody = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
}).strict();

const createIntentBody = z.object({
  items: z.array(z.object({
    type: z.enum(['product', 'course']),
    itemId: objectId,
    quantity: z.number().int().min(1).max(99),
  }).strict()).min(1).max(20),
  tipAmount: z.number().finite().min(0).max(1000000).optional(),
}).strict();

const productBody = z.object({
  productName: nonEmptyText,
  productCategory: nonEmptyText,
  productPrice: positiveMoney,
  productStock: formNumber(z.number().int().min(0).max(1000000)),
  productDescription: z.string().max(5000).optional(),
});

const productUpdateBody = productBody.partial();

const courseBody = z.object({
  city: nonEmptyText,
  state: nonEmptyText,
  category: nonEmptyText,
  price: positiveMoney,
  courseDate: z.coerce.date(),
  timeSlot: z.array(nonEmptyText.max(100)).min(1).max(30),
});

const courseUpdateBody = courseBody.partial().refine(
  (body) => Object.keys(body).length > 0,
  'At least one course field must be provided'
);

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

module.exports = {
  adoptionApplicationBody,
  courseBody,
  courseUpdateBody,
  createIntentBody,
  loginBody,
  petBody,
  petUpdateBody,
  productBody,
  productUpdateBody,
  registerBody,
};

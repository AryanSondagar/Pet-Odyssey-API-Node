const { z } = require('zod');
const { nonEmptyText, positiveMoney } = require('../../common/utils/schema-helpers');

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

module.exports = { courseBody, courseUpdateBody };

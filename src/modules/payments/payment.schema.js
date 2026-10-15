const { z } = require('zod');
const { objectId } = require('../../common/utils/schema-helpers');

const createIntentBody = z.object({
  items: z.array(z.object({
    type: z.enum(['product', 'course']),
    itemId: objectId,
    quantity: z.number().int().min(1).max(99),
  }).strict()).min(1).max(20),
  tipAmount: z.number().finite().min(0).max(1000000).optional(),
}).strict();

module.exports = { createIntentBody };

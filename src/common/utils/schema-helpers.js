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

module.exports = { formNumber, nonEmptyText, objectId, optionalBoolean, positiveMoney };

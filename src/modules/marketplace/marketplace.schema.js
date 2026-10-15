const { z } = require('zod');
const { formNumber, nonEmptyText, positiveMoney } = require('../../common/utils/schema-helpers');

const productBody = z.object({
  productName: nonEmptyText,
  productCategory: nonEmptyText,
  productPrice: positiveMoney,
  productStock: formNumber(z.number().int().min(0).max(1000000)),
  productDescription: z.string().max(5000).optional(),
});

const productUpdateBody = productBody.partial();

module.exports = { productBody, productUpdateBody };

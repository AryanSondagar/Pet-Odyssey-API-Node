const { z } = require('zod');
const { nonEmptyText } = require('../../common/utils/schema-helpers');

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

module.exports = { loginBody, registerBody };

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { z } = require('zod');

const optionalString = z.string().trim().min(1).optional();
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
  VERCEL: z.string().optional(),
  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),
  PORT: z.preprocess(
    (value) => value === undefined ? 3000 : Number(value),
    z.number().int().min(1).max(65535)
  ),
  MONGO_URI: optionalString,
  JWT_SECRET: optionalString,
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  CLIENT_ORIGIN: z.string().trim().min(1).default('http://localhost:4200'),
  TRUST_PROXY_HOPS: z.string().regex(/^\d+$/).transform(Number).optional(),
  CLOUDINARY_URL: optionalString,
  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_API_KEY: optionalString,
  CLOUDINARY_API_SECRET: optionalString,
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  const details = result.error.issues
    .map(({ path: issuePath, message }) => `${issuePath.join('.')}: ${message}`)
    .join('; ');
  throw new Error(`Invalid environment configuration: ${details}`);
}

module.exports = { env: result.data };

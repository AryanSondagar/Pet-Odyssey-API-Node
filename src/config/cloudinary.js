const cloudinary = require("cloudinary").v2;

const {
  CLOUDINARY_URL,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = process.env;

const missingVars = [];

if (!CLOUDINARY_URL) {
  if (!CLOUDINARY_CLOUD_NAME) missingVars.push("CLOUDINARY_CLOUD_NAME");
  if (!CLOUDINARY_API_KEY) missingVars.push("CLOUDINARY_API_KEY");
  if (!CLOUDINARY_API_SECRET) missingVars.push("CLOUDINARY_API_SECRET");
}

if (missingVars.length > 0) {
  console.error(
    "Cloudinary is not configured. Set CLOUDINARY_URL or the following env vars:",
    missingVars.join(", ")
  );
}

const config = CLOUDINARY_URL
  ? { secure: true, cloudinary_url: CLOUDINARY_URL }
  : {
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
      secure: true,
    };

cloudinary.config(config);

cloudinary.isConfigured = Boolean(CLOUDINARY_URL) ||
  Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);

module.exports = cloudinary;

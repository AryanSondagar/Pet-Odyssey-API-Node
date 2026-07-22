const cloudinary = require("../config/cloudinary");

const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    if (!cloudinary.isConfigured) {
      return reject(
        new Error(
          "Cloudinary credentials are not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
        )
      );
    }

    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, public_id: result.public_id });
      }
    );
    stream.end(buffer);
  });
};

module.exports = uploadToCloudinary;

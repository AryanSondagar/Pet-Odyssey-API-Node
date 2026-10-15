const path = require('node:path');
const { env } = require('./config/env');
const app = require('./app');

const { connectDB } = require('./config/db');
const fs = require('fs');
const PORT = env.PORT;

console.log('ENV MONGO_URI set:', Boolean(env.MONGO_URI));
console.log('ENV MONGO_URI protocol:', env.MONGO_URI ? env.MONGO_URI.split('://')[0] : 'missing');
console.log('ENV JWT_SECRET set:', Boolean(env.JWT_SECRET));
console.log('ENV STRIPE_SECRET_KEY set:', Boolean(env.STRIPE_SECRET_KEY));
console.log('ENV CLOUDINARY_URL set:', Boolean(env.CLOUDINARY_URL));
console.log('ENV CLOUDINARY_CLOUD_NAME set:', Boolean(env.CLOUDINARY_CLOUD_NAME));
console.log('ENV CLOUDINARY_API_KEY set:', Boolean(env.CLOUDINARY_API_KEY));
console.log('ENV CLOUDINARY_API_SECRET set:', Boolean(env.CLOUDINARY_API_SECRET));

// Ensure upload directories exist (avoids multer destination errors on first upload)
try {
  const base = path.resolve(__dirname, '..', 'uploads');
  fs.mkdirSync(path.join(base, 'products'), { recursive: true });
  fs.mkdirSync(path.join(base, 'pets'), { recursive: true });
} catch (err) {
  console.error('Failed to create upload directories:', err.message);
}

const startServer = async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error('MongoDB startup error — continuing to start server so /health can report status');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Pet Odyssey API is running' });
});
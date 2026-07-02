const app = require('./src/app');

const { connectDB } = require('./src/db');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

console.log('ENV MONGO_URI set:', Boolean(process.env.MONGO_URI));
console.log('ENV MONGO_URI protocol:', process.env.MONGO_URI ? process.env.MONGO_URI.split('://')[0] : 'missing');
console.log('ENV JWT_SECRET set:', Boolean(process.env.JWT_SECRET));
console.log('ENV STRIPE_SECRET_KEY set:', Boolean(process.env.STRIPE_SECRET_KEY));

// Ensure upload directories exist (avoids multer destination errors on first upload)
try {
  const base = path.join(__dirname, 'uploads');
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
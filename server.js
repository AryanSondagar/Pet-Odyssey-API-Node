const app = require('./src/app');

const connectDB = require('./src/db');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Ensure upload directories exist (avoids multer destination errors on first upload)
try {
  const base = path.join(__dirname, 'uploads');
  fs.mkdirSync(path.join(base, 'products'), { recursive: true });
  fs.mkdirSync(path.join(base, 'pets'), { recursive: true });
} catch (err) {
  console.error('Failed to create upload directories:', err.message);
}

connectDB();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Pet Odyssey API is running' });
});
const app = require('./src/app');

const connectDB = require('./src/db');

const PORT = process.env.PORT || 3000;


connectDB();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Pet Odyssey API is running' });
});
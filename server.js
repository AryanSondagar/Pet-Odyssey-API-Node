const app = require('./src/app');

const PORT = process.env.PORT || 3000;

const connectDB = require('./src/db');

connectDB();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

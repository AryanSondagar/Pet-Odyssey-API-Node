const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      // Mongoose modern options
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // fail fast if can't connect
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Error: ', error && error.message ? error.message : error);
    // don't exit the process in serverless/deployed environments; let the app start and
    // endpoints will return errors which we log — this helps remote hosts like Vercel
    // surface the underlying error instead of shutting down the process immediately.
  }
};

module.exports = connectDB;

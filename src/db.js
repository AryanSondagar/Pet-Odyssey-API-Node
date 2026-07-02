const mongoose = require('mongoose');

mongoose.set('strictQuery', false);
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 5000);

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error('❌ MongoDB Error: MONGO_URI is not set');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // fail fast if can't connect
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Error:', error && error.message ? error.message : error);
  }

  mongoose.connection.on('connected', () => {
    console.log('✅ Mongoose connection open');
  });
  mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err && err.message ? err.message : err);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ Mongoose disconnected');
  });
};

module.exports = connectDB;

const mongoose = require('mongoose');

mongoose.set('strictQuery', false);
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 5000);

let connectionPromise = null;
let lastConnectError = null;

const connectDB = async () => {
  if (connectionPromise) {
    return connectionPromise;
  }

  if (!process.env.MONGO_URI) {
    console.error('❌ MongoDB Error: MONGO_URI is not set');
    lastConnectError = new Error('MONGO_URI is not set');
    throw lastConnectError;
  }

  const uriScheme = process.env.MONGO_URI.split('://')[0];
  console.log('MongoDB URI scheme:', uriScheme);

  connectionPromise = mongoose
    .connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    })
    .then(() => {
      console.log('✅ MongoDB Connected');
      console.log('MongoDB readyState after connect:', mongoose.connection.readyState);
      return mongoose.connection;
    })
    .catch((error) => {
      lastConnectError = error;
      console.error('❌ MongoDB Error:', error && error.stack ? error.stack : error);
      console.error('MongoDB readyState after failed connect:', mongoose.connection.readyState);
      throw error;
    });

  return connectionPromise;
};

const getLastConnectError = () => lastConnectError;

mongoose.connection.on('connecting', () => console.log('ℹ️ Mongoose connecting'));
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connection open');
});
mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err && err.message ? err.message : err);
  lastConnectError = err;
});
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ Mongoose disconnected');
});

module.exports = {
  connectDB,
  getLastConnectError,
};

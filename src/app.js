const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { env } = require('./config/env');
const cloudinary = require('./config/cloudinary');
const apiRoutes = require('./routes');
const { connectDB, getLastConnectError } = require('./config/db');
const { requireBrowserRequest } = require('./common/middleware/browser-request.middleware');

const app = express();
if (env.TRUST_PROXY_HOPS !== undefined) {
  app.set('trust proxy', env.TRUST_PROXY_HOPS);
}
const allowedOrigins = env.CLIENT_ORIGIN
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

console.log('Cloudinary configured:', cloudinary.isConfigured);

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: (origin, callback) => {
    callback(null, !origin || allowedOrigins.includes(origin));
  },
  credentials: true,
}));
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));

app.use('/api', requireBrowserRequest(allowedOrigins));

app.use(async (req, res, next) => {
  if (req.path === '/health') return next();

  try {
    await connectDB();
    return next();
  } catch (err) {
    console.error('Request DB connect failed:', err && err.message ? err.message : err);
    return res.status(503).json({
      message: 'Service unavailable',
      error: 'MongoDB connection failed',
      details: err && err.message ? err.message : null,
    });
  }
});

app.use('/api', apiRoutes);
app.get('/', (req, res) => res.send('API is running'));
app.get('/api', (req, res) => res.json({ status: 'ok' }));

let lastMongooseError = null;

const mongoose = require('mongoose');

mongoose.connection.on('error', (err) => {
  lastMongooseError = err;
});

const ensureDb = async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error('App-level DB connect failed:', err && err.message ? err.message : err);
  }
};

ensureDb();

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    vercel: Boolean(env.VERCEL),
    vercelEnv: env.VERCEL_ENV || null,
    mongooseReadyState: mongoose.connection.readyState,
    cloudinaryConfigured: cloudinary.isConfigured,
    lastMongooseError: getLastConnectError() ? getLastConnectError().message : lastMongooseError ? lastMongooseError.message : null,
    env: {
      MONGO_URI: Boolean(env.MONGO_URI),
      JWT_SECRET: Boolean(env.JWT_SECRET),
      STRIPE_SECRET_KEY: Boolean(env.STRIPE_SECRET_KEY)
    }
  });
});

// Global error handler (log and return JSON)
app.use((err, req, res, next) => {
	console.error('Unhandled error:', err && err.stack ? err.stack : err);
	if (res.headersSent) return next(err);
	res.status(500).json({ message: 'Server error', error: err && err.message ? err.message : String(err) });
});

module.exports = app;
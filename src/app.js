const express = require('express');
const cors = require('cors');
require('dotenv').config();
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const adoptionRoutes = require('./routes/adoption.routes');
const courseRoutes = require('./routes/course.routes');
const marketplaceRoutes = require('./routes/marketplace.routes');
const paymentRoutes = require('./routes/payment.routes')

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin/adoption', adoptionRoutes);
app.use('/api/admin/course', courseRoutes);
app.use('/api/admin/marketplace', marketplaceRoutes);
app.use('/api/payment', paymentRoutes);

let lastMongooseError = null;

const mongoose = require('mongoose');

mongoose.connection.on('error', (err) => {
  lastMongooseError = err;
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mongooseReadyState: mongoose.connection.readyState,
    lastMongooseError: lastMongooseError ? lastMongooseError.message : null,
    env: {
      MONGO_URI: Boolean(process.env.MONGO_URI),
      JWT_SECRET: Boolean(process.env.JWT_SECRET),
      STRIPE_SECRET_KEY: Boolean(process.env.STRIPE_SECRET_KEY)
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
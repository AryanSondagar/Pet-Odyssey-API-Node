const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.send('API is running...');
});
const userRoutes = require('./routes/user.routes');

app.use('/api/users', userRoutes);


module.exports = app;

const mongoose = require('mongoose');
const { DB_URI } = require('./env');

const connect = async () => {
  try {
    // Mongoose v6+ uses sensible defaults; pass URI only to avoid deprecated option errors
    if (!DB_URI) throw new Error('DB_URI is not set');
    await mongoose.connect(DB_URI);
    // Optional: set mongoose options globally
    mongoose.set('strictQuery', false);
    // Simple console message (replace with logger if available)
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
};

module.exports = { connect, mongoose };

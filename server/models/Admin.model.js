const mongoose = require('mongoose');

// Minimal, clean Admin model
const SessionSchema = new mongoose.Schema({
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
}, { _id: false });

const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: {
    type: String,
    required: true,
  },

  activeSessions: [
    {
      token: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
      expiresAt: { type: Date }, // Optional TTL for session expiry
    },
  ],

  // Optional admin contact via WhatsApp
  whatsappNumber: { type: String, default: null },
  role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' },
  metadata: { lastLogin: Date, ipAddress: String },
}, { timestamps: true, versionKey: false });

module.exports = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

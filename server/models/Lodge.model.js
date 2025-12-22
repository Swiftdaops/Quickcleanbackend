const mongoose = require('mongoose');

const LodgeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    location: {
      type: String,
      required: true,
      trim: true
    },

    status: {
      type: String,
      enum: ['pending', 'approved'],
      default: 'pending'
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports =
  mongoose.models.Lodge || mongoose.model('Lodge', LodgeSchema);

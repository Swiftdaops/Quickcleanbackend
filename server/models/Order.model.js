const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
  {
    cid: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    lodge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lodge',
      required: true
    },

    serviceType: {
      type: String,
      enum: ['Cleaning', 'Dry Cleaning'],
      default: 'Cleaning'
    },

    customerName: {
      type: String,
      required: true,
      trim: true
    },

    customerPhone: {
      type: String,
      required: true,
      trim: true
    },

    location: {
      type: String,
      required: true,
      trim: true
    },

    status: {
      type: String,
      enum: ['initiated', 'whatsapp_initiated', 'accepted', 'completed'],
      default: 'initiated'
    },

    schemaVersion: {
      type: String,
      default: '1.0'
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports =
  mongoose.models.Order || mongoose.model('Order', OrderSchema);

const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, index: true },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    icon: { type: String, default: 'MdCleaningServices' } // use default icon
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.models.Service || mongoose.model('Service', ServiceSchema);

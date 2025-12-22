const mongoose = require('mongoose');

const StoreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    location: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    active: { type: Boolean, default: true }
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.models.Store || mongoose.model('Store', StoreSchema);

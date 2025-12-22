const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
      isAvailable: { type: Boolean, default: true },
      image: { type: String, trim: true },
      description: { type: String, trim: true },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.models.Product || mongoose.model('Product', ProductSchema);

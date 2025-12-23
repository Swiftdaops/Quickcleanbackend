const mongoose = require('mongoose');

const ProductStatsSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true, index: true },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.models.ProductStats || mongoose.model('ProductStats', ProductStatsSchema);

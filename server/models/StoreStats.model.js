const mongoose = require('mongoose');

const StoreStatsSchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, unique: true, index: true },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.models.StoreStats || mongoose.model('StoreStats', StoreStatsSchema);

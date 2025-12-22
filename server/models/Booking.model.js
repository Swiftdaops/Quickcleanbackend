const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  // Allow flexible service names (services are defined/seeded elsewhere)
  service: { type: String, required: true },
  price: { type: Number, required: true, min: 1 },
  date: { type: Date },
  // Optional items for product-based orders (e.g., Help Me Buy Pack)
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      name: { type: String },
      qty: { type: Number, default: 1, min: 1 },
      unitPrice: { type: Number, default: 0 },
      subtotal: { type: Number, default: 0 },
    },
  ],
  // Computed/attached order summary for quick frontend consumption
  orderSummary: {
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: { type: String },
        qty: { type: Number, default: 1 },
        unitPrice: { type: Number, default: 0 },
        subtotal: { type: Number, default: 0 },
      },
    ],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  // Align possible statuses with route handlers
  status: { type: String, enum: ['pending', 'assigned', 'in-progress', 'completed', 'cancelled'], default: 'pending' },
  assignedTo: { type: String },
  store: { type: String },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  notes: { type: String },
  additionalNotes: { type: String },
}, { timestamps: true });

// Enforce that `store` is only set for Help Me Buy Pack
// Use synchronous hook body (no `next` callback) to avoid middleware arity issues.
BookingSchema.pre('validate', function () {
  // If service is not Help Me Buy Pack but store provided -> invalidate
  if (this.service !== 'Help Me Buy Pack' && this.store) {
    this.invalidate('store', 'Store is only valid for Help Me Buy Pack');
  }
  if (this.service !== 'Help Me Buy Pack' && this.product) {
    this.invalidate('product', 'Product is only valid for Help Me Buy Pack');
  }
  // If service is Help Me Buy Pack and store is missing, we allow it (route-level validation handles required store)
});

module.exports = mongoose.model('Booking', BookingSchema);

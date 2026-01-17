const mongoose = require('mongoose');
const { normalizePhone } = require('../utils/phone');

const CustomerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: function (v) {
        // allow optional leading + and 10-15 digits total
        return /^\+?\d{10,15}$/.test(v);
      },
      message: (props) => `${props.value} is not a valid phone number (10-15 digits)`,
    },
  },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
}, { timestamps: true });

// Normalize phone numbers before saving
// Use synchronous middleware (no `next` callback) so mongoose/kareem
// can execute this safely whether using promise-based or callback flow.
CustomerSchema.pre('save', function () {
  if (this.phone) this.phone = normalizePhone(this.phone);
  if (this.name) this.name = String(this.name).trim();
});

module.exports = mongoose.model('Customer', CustomerSchema);

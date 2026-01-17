#!/usr/bin/env node
require('dotenv').config();
const { connect } = require('../config/db');
const Booking = require('../models/Booking.model');

const id = process.argv[2] || '694a9bb2db16e0f42a380e21';

(async () => {
  try {
    await connect();
    console.log(`[INFO] Querying booking id=${id}`);
    const booking = await Booking.findById(id).populate('customer').populate('product').lean();
    if (!booking) {
      console.log('[RESULT] Booking not found');
      process.exit(0);
    }

    // Avoid printing extremely large or sensitive fields; show core info
    const out = {
      _id: booking._id,
      customer: booking.customer || null,
      service: booking.service,
      price: booking.price,
      status: booking.status,
      store: booking.store || null,
      product: booking.product || null,
      createdAt: booking.createdAt,
      items: booking.items || [],
      orderSummary: booking.orderSummary || null,
    };

    console.log('[RESULT] Booking found:');
    console.log(JSON.stringify(out, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('[ERROR] Failed to query booking:', err && err.message ? err.message : err);
    process.exit(2);
  }
})();

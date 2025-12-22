// Seed an admin user into the configured MongoDB.
// WARNING: This will write to the database pointed at by DB_URI in your `.env`.
// Make sure you want to seed the target database before running.

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin.model');

const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME || 'Tobechukwu';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Qc@Admin#2025!';
const ADMIN_WHATSAPP = process.env.SEED_ADMIN_WHATSAPP || process.env.ADMIN_WHATSAPP || '+2349079529836';

async function seedAdmin() {
  if (!process.env.DB_URI) {
    console.error('Missing DB_URI in environment. Aborting.');
    process.exit(1);
  }

  // Modern Mongoose (v6+) ignores/use the default parser options; pass the URI only
  await mongoose.connect(process.env.DB_URI);

  const existing = await Admin.findOne({ username: ADMIN_USERNAME });
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

  if (existing) {
    // Update whatsapp number and password if needed (do not lower role)
    existing.whatsappNumber = ADMIN_WHATSAPP;
    // If you want to force-update the password, set SEED_ADMIN_FORCE=true in env
    if (process.env.SEED_ADMIN_FORCE === 'true') {
      existing.password = hashedPassword;
    }
    await existing.save();
    console.log('Admin updated successfully:', ADMIN_USERNAME);
  } else {
    await Admin.create({
      username: ADMIN_USERNAME,
      password: hashedPassword,
      role: 'admin',
      whatsappNumber: ADMIN_WHATSAPP,
    });
    console.log('Admin seeded successfully:', ADMIN_USERNAME);
  }
  await mongoose.disconnect();
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

// Seed an admin user into the configured MongoDB.
// WARNING: This will write to the database pointed at by DB_URI in your `.env`.
// Make sure you want to seed the target database before running.

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin.model');

const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Qc@Admin#2025!';
const ADMIN_WHATSAPP = process.env.SEED_ADMIN_WHATSAPP || process.env.ADMIN_WHATSAPP || '+2349079529836';

function parseUsernames() {
  const list = process.env.SEED_ADMIN_USERNAMES || process.env.SEED_ADMIN_USERNAME || 'Tobechukwu';
  return String(list)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.toLowerCase());
}

async function seedAdmin() {
  if (!process.env.DB_URI) {
    console.error('Missing DB_URI in environment. Aborting.');
    process.exit(1);
  }

  // Modern Mongoose (v6+) ignores/use the default parser options; pass the URI only
  await mongoose.connect(process.env.DB_URI);

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const usernames = parseUsernames();
  for (const username of usernames) {
    const existing = await Admin.findOne({ username });
    if (existing) {
      // Update whatsapp number and password if needed (do not lower role)
      existing.whatsappNumber = ADMIN_WHATSAPP;
      // If you want to force-update the password, set SEED_ADMIN_FORCE=true in env
      if (process.env.SEED_ADMIN_FORCE === 'true') {
        existing.password = hashedPassword;
      }
      await existing.save();
      console.log('Admin updated successfully:', username);
    } else {
      await Admin.create({
        username,
        password: hashedPassword,
        role: 'admin',
        whatsappNumber: ADMIN_WHATSAPP,
      });
      console.log('Admin seeded successfully:', username);
    }
  }
  await mongoose.disconnect();
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

// scripts/setAdminWhatsapp.cjs
// Usage:
//   node scripts/setAdminWhatsapp.cjs +2349079529836
// or
//   ADMIN_WHATSAPP=+2349079529836 node scripts/setAdminWhatsapp.cjs

require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin.model');

const adminUsername = process.env.SEED_ADMIN_USERNAME || 'Tobechukwu';
const whatsappArg = process.argv[2] || process.env.ADMIN_WHATSAPP;

if (!whatsappArg) {
  console.error('Usage: provide WhatsApp number as first arg or set ADMIN_WHATSAPP env var');
  process.exit(1);
}

async function setNumber() {
  if (!process.env.DB_URI) {
    console.error('Missing DB_URI in environment. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(process.env.DB_URI);

  const admin = await Admin.findOne({ username: adminUsername });
  if (!admin) {
    console.error('Admin not found:', adminUsername);
    await mongoose.disconnect();
    process.exit(2);
  }

  admin.whatsappNumber = whatsappArg;
  await admin.save();

  console.log(`Admin ${adminUsername} updated with whatsappNumber=${whatsappArg}`);
  await mongoose.disconnect();
  process.exit(0);
}

setNumber().catch((err) => {
  console.error('Failed to set WhatsApp number:', err);
  process.exit(1);
});

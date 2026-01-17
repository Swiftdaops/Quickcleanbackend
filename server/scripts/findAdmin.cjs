#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { connect } = require('../config/db');
const Admin = require('../models/Admin.model');

const usernameArg = process.argv[2] || 'Tobechukwu';
const username = String(usernameArg).trim().toLowerCase();

(async () => {
  try {
    await connect();
    console.log(`[INFO] Looking up admin username='${username}'`);
    const admin = await Admin.findOne({ username }).lean();
    if (!admin) {
      console.log('[RESULT] Admin not found');
      process.exit(0);
    }

    // Print non-sensitive fields only
    const out = {
      _id: admin._id,
      username: admin.username,
      role: admin.role,
      whatsappNumber: admin.whatsappNumber || null,
      createdAt: admin.createdAt,
      metadata: admin.metadata || null,
    };

    console.log('[RESULT] Admin found:');
    console.log(JSON.stringify(out, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('[ERROR] Failed to query admin:', err && err.message ? err.message : err);
    process.exit(2);
  }
})();

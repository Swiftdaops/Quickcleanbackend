#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

(async () => {
  try {
    const uri = process.env.DB_URI;
    if (!uri) throw new Error('DB_URI not set in server/.env');
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const dbName = db.databaseName;
    console.log('[INFO] Connected to DB:', dbName);

    const cols = await db.listCollections().toArray();
    if (!cols || cols.length === 0) {
      console.log('[RESULT] No collections found');
      process.exit(0);
    }

    console.log('[RESULT] Collections and counts:');
    for (const c of cols) {
      try {
        const count = await db.collection(c.name).countDocuments();
        console.log(`- ${c.name}: ${count}`);
      } catch (err) {
        console.log(`- ${c.name}: count error (${err && err.message ? err.message : err})`);
      }
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[ERROR]', err && err.message ? err.message : err);
    process.exit(2);
  }
})();

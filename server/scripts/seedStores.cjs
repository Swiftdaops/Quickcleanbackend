#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');
const Store = require('../models/Store.model');

const DEFAULT_STORE = {
  name: 'Chijohnz supermarket',
  location: 'Yahoo junction',
  address: ''
};

async function main() {
  const uri = process.env.DB_URI || process.env.MONGO_URI_TEST || process.env.DATABASE_URL;
  if (!uri) {
    console.error('No DB URI provided. Set DB_URI or MONGO_URI_TEST in your environment.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to DB');

    // Upsert the default store
    const result = await Store.findOneAndUpdate(
      { name: DEFAULT_STORE.name },
      { $set: { location: DEFAULT_STORE.location, address: DEFAULT_STORE.address, active: true } },
      { upsert: true, new: true }
    );

    console.log('Seeded store:', result.name, '-', result.location);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(2);
  }
}

main();

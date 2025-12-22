// Seed the single store (Chijohnz's Supermarket) and two services
require('dotenv').config();
const mongoose = require('mongoose');
const Store = require('../models/Store.model');
const Service = require('../models/Service.model');

async function seed() {
  if (!process.env.DB_URI) {
    console.error('Missing DB_URI in environment. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(process.env.DB_URI);

  try {
    const storeName = "Chijohnz's Supermarket";
    const storeLocation = 'Yahoo junction';

    const existingStore = await Store.findOne({ name: storeName });
    if (existingStore) {
      console.log('Store already exists:', storeName);
    } else {
      await Store.create({ name: storeName, location: storeLocation, address: 'Yahoo junction' });
      console.log('Seeded store:', storeName);
    }

    // Seed services
    const services = [
      { name: 'Help Me Buy Pack', price: 1500, description: "We purchase and deliver groceries from our official partner — Chijohnz's Supermarket. Only groceries from their stores are sold online.", isActive: true },
      { name: 'Lodge Clean', price: 5000, description: 'Professional lodge and residence cleaning for short-stay accommodations.', isActive: true },
      { name: 'Home & Apartment', price: 15000, description: 'Complete home cleaning: sweeping, mopping, and sanitizing all toilets and surfaces.', isActive: true },
    ];

    for (const s of services) {
      const found = await Service.findOne({ name: s.name });
      if (found) {
        console.log('Service exists:', s.name);
      } else {
        await Service.create(s);
        console.log('Seeded service:', s.name);
      }
    }

    console.log('Seeding complete.');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();

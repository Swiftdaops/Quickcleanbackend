/*
  Deletes ALL stores, their products, and related stats.

  Safety:
  - Requires CONFIRM_DELETE_ALL_STORES=YES unless DRY_RUN is enabled.
  - DRY_RUN=1 will only print what would be deleted.

  Usage:
    DRY_RUN=1 node scripts/deleteAllStores.cjs
    CONFIRM_DELETE_ALL_STORES=YES node scripts/deleteAllStores.cjs
*/

require('dotenv').config();
const mongoose = require('mongoose');

const Store = require('../models/Store.model');
const Product = require('../models/Product.model');
const ProductStats = require('../models/ProductStats.model');
const StoreStats = require('../models/StoreStats.model');

function isTruthy(value) {
  if (!value) return false;
  return ['1', 'true', 'yes', 'y', 'on'].includes(String(value).toLowerCase());
}

(async () => {
  const dryRun = isTruthy(process.env.DRY_RUN);
  const confirm = String(process.env.CONFIRM_DELETE_ALL_STORES || '').trim().toUpperCase();

  if (!process.env.DB_URI) {
    console.error('Missing DB_URI in environment');
    process.exit(1);
  }

  if (!dryRun && confirm !== 'YES') {
    console.error('Refusing to delete. Set CONFIRM_DELETE_ALL_STORES=YES (or use DRY_RUN=1).');
    process.exit(1);
  }

  await mongoose.connect(process.env.DB_URI);

  try {
    const stores = await Store.find().select('_id name').lean();
    const storeIds = stores.map((s) => s._id);

    const products = storeIds.length
      ? await Product.find({ store: { $in: storeIds } }).select('_id store').lean()
      : [];
    const productIds = products.map((p) => p._id);

    const [storeCount, productCount, storeStatsCount, productStatsCount] = await Promise.all([
      Store.countDocuments({}),
      Product.countDocuments({ store: { $in: storeIds } }),
      StoreStats.countDocuments({ store: { $in: storeIds } }),
      ProductStats.countDocuments({ product: { $in: productIds } }),
    ]);

    console.log('Target DB:', mongoose.connection.name);
    console.log('Stores found:', storeCount);
    console.log('Products found (under stores):', productCount);
    console.log('StoreStats found (under stores):', storeStatsCount);
    console.log('ProductStats found (under products):', productStatsCount);

    if (dryRun) {
      console.log('DRY_RUN enabled: no deletions performed.');
      return;
    }

    const [delProductStats, delProducts, delStoreStats, delStores] = await Promise.all([
      productIds.length ? ProductStats.deleteMany({ product: { $in: productIds } }) : Promise.resolve({ deletedCount: 0 }),
      storeIds.length ? Product.deleteMany({ store: { $in: storeIds } }) : Promise.resolve({ deletedCount: 0 }),
      storeIds.length ? StoreStats.deleteMany({ store: { $in: storeIds } }) : Promise.resolve({ deletedCount: 0 }),
      Store.deleteMany({}),
    ]);

    console.log('Deleted ProductStats:', delProductStats.deletedCount ?? delProductStats.n ?? 0);
    console.log('Deleted Products:', delProducts.deletedCount ?? delProducts.n ?? 0);
    console.log('Deleted StoreStats:', delStoreStats.deletedCount ?? delStoreStats.n ?? 0);
    console.log('Deleted Stores:', delStores.deletedCount ?? delStores.n ?? 0);
  } catch (err) {
    console.error('Failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();

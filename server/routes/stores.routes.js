const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Store = require('../models/Store.model');
const Product = require('../models/Product.model');
const ProductStats = require('../models/ProductStats.model');
const StoreStats = require('../models/StoreStats.model');
const auth = require('../middlewares/auth.middleware');

const router = express.Router();

// Add product to a store
router.post(
  '/:storeId/products',
  auth,
  [
    param('storeId').isMongoId(),
    body('name').isString().trim().notEmpty(),
    body('price').isFloat({ gt: 0 }),
    body('isAvailable').optional().isBoolean(),
    body('quantity').optional().isInt({ min: 0 }).withMessage('quantity must be a non-negative integer'),
    body('image').optional().isString().trim().isURL().withMessage('image must be a valid URL'),
    body('description').optional().isString().trim().isLength({ max: 1000 }).withMessage('description too long'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { storeId } = req.params;
    const { name, price, isAvailable, image, description, quantity } = req.body;

    try {
      const store = await Store.findById(storeId);
      if (!store) return res.status(404).json({ error: 'Store not found' });

      const product = await Product.create({ name, price, store: store._id, isAvailable, image, description, quantity: typeof quantity !== 'undefined' ? Number(quantity) : undefined });
      // Ensure product stats exists so UI can immediately show likes/dislikes
      try {
        await ProductStats.create({ product: product._id });
      } catch (e) {
        console.warn('Failed to create ProductStats for product', product._id, e && e.message ? e.message : e);
      }

      // Return product (store is embedded via `store` ObjectId)
      res.status(201).json(product);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to add product' });
    }
  }
);

// List products for a store
router.get('/:storeId/products', [param('storeId').isMongoId()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { storeId } = req.params;
  try {
    const products = await Product.find({ store: storeId }).sort({ createdAt: -1 });
    const ids = products.map((p) => p._id);
    const stats = await ProductStats.find({ product: { $in: ids } });
    const statsMap = new Map(stats.map((s) => [String(s.product), s]));

    const withStats = products.map((p) => {
      const obj = typeof p.toObject === 'function' ? p.toObject() : p;
      const st = statsMap.get(String(p._id));
      return {
        ...obj,
        likes: st ? st.likes : 0,
        dislikes: st ? st.dislikes : 0,
      };
    });

    res.json(withStats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list products' });
  }
});

// Create a new store
router.post(
  '/',
  auth,
  [
    body('name').isString().trim().notEmpty().withMessage('name is required'),
    body('location').isString().trim().notEmpty().withMessage('location is required'),
    // NOTE: full address is no longer required on store creation. Keep the
    // `address` field optional at model level but do not accept it here to
    // simplify store onboarding. If needed, address can be set later via
    // an admin route.
    body('avgDeliveryTime').optional().isInt({ min: 0 }).withMessage('avgDeliveryTime must be a non-negative integer (minutes)'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { name, location, avgDeliveryTime } = req.body;
      const storePayload = { name, location };
      if (typeof avgDeliveryTime !== 'undefined') storePayload.avgDeliveryTime = Number(avgDeliveryTime);
      const store = await Store.create(storePayload);

      // Create associated StoreStats document so frontend can show ratings
      // and completedOrders immediately after store creation.
      try {
        await StoreStats.create({ store: store._id });
      } catch (e) {
        // ignore duplicate or other errors but log for visibility
        console.warn('Failed to create StoreStats for store', store._id, e && e.message ? e.message : e);
      }

      res.status(201).json(store);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create store' });
    }
  }
);

// Delete a store (admin-only). Also deletes store products and related stats.
router.delete(
  '/:storeId',
  auth,
  [param('storeId').isMongoId()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      if (!req.admin || !['admin', 'superadmin'].includes(req.admin.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { storeId } = req.params;
      const store = await Store.findById(storeId);
      if (!store) return res.status(404).json({ error: 'Store not found' });

      const prods = await Product.find({ store: storeId }).select('_id');
      const productIds = prods.map((p) => p._id);

      await Promise.all([
        Product.deleteMany({ store: storeId }),
        productIds.length ? ProductStats.deleteMany({ product: { $in: productIds } }) : Promise.resolve(),
        StoreStats.deleteOne({ store: storeId }),
      ]);

      await Store.findByIdAndDelete(storeId);
      return res.json({ message: 'Deleted', storeId, deletedProducts: productIds.length });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete store' });
    }
  }
);

// List all stores
router.get('/', async (req, res) => {
  try {
    const stores = await Store.find().sort({ name: 1 });
    res.json(stores);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
});

// Get a single store with its products
router.get('/:storeId', [param('storeId').isMongoId()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { storeId } = req.params;
    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    const products = await Product.find({ store: storeId }).sort({ createdAt: -1 });

    const ids = products.map((p) => p._id);
    const [productStats, storeStats] = await Promise.all([
      ProductStats.find({ product: { $in: ids } }),
      StoreStats.findOne({ store: storeId }),
    ]);

    const statsMap = new Map(productStats.map((s) => [String(s.product), s]));
    const withStats = products.map((p) => {
      const obj = typeof p.toObject === 'function' ? p.toObject() : p;
      const st = statsMap.get(String(p._id));
      return {
        ...obj,
        likes: st ? st.likes : 0,
        dislikes: st ? st.dislikes : 0,
      };
    });

    const sStats = storeStats || { likes: 0, dislikes: 0, completedOrders: 0 };
    const totalReactions = (sStats.likes || 0) + (sStats.dislikes || 0);
    const rating = totalReactions > 0 ? (sStats.likes / totalReactions) * 5 : null;

    res.json({
      store,
      products: withStats,
      storeStats: {
        likes: sStats.likes || 0,
        dislikes: sStats.dislikes || 0,
        rating,
        completedOrders: sStats.completedOrders || 0,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch store details' });
  }
});

module.exports = router;

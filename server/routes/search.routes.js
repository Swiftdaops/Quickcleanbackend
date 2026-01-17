const express = require('express');
const router = express.Router();
const Product = require('../models/Product.model');
const Store = require('../models/Store.model');

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/search?q=term
router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ results: [] });

  try {
    // build a loose OR regex from tokens to increase matches
    const tokens = q.split(/\s+/).filter(Boolean).map(escapeRegex);
    const pattern = tokens.join('|');
    const re = new RegExp(pattern, 'i');

    const [products, stores] = await Promise.all([
      Product.find({ $or: [{ name: re }, { description: re }] })
        .limit(12)
        .populate('store', 'name')
        .select('_id name image price store'),
      Store.find({ name: re })
        .limit(10)
        .select('_id name location image'),
    ]);

    const storeResults = (stores || []).map((s) => ({
      _id: s._id,
      name: s.name,
      image: s.image || null,
      type: 'store',
      location: s.location || s.address || null,
    }));

    const prodResults = (products || []).map((p) => ({
      _id: p._id,
      name: p.name,
      image: p.image || null,
      price: p.price || 0,
      type: 'product',
      store: p.store && p.store.name ? p.store.name : null,
    }));

    // Put stores first then products
    return res.json({ results: [...storeResults, ...prodResults] });
  } catch (err) {
    console.error('Search error', err);
    return res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;

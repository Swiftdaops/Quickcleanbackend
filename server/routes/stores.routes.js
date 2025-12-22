const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Store = require('../models/Store.model');
const Product = require('../models/Product.model');

const router = express.Router();

// Add product to a store
router.post(
  '/:storeId/products',
  [
    param('storeId').isMongoId(),
    body('name').isString().trim().notEmpty(),
    body('price').isFloat({ gt: 0 }),
    body('isAvailable').optional().isBoolean(),
    body('image').optional().isString().trim().isURL().withMessage('image must be a valid URL'),
    body('description').optional().isString().trim().isLength({ max: 1000 }).withMessage('description too long'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { storeId } = req.params;
    const { name, price, isAvailable, image, description } = req.body;

    try {
      const store = await Store.findById(storeId);
      if (!store) return res.status(404).json({ error: 'Store not found' });

      const product = await Product.create({ name, price, store: store._id, isAvailable, image, description });
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
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list products' });
  }
});

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
    res.json({ store, products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch store details' });
  }
});

module.exports = router;

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Product = require('../models/Product.model');
const ProductStats = require('../models/ProductStats.model');
const StoreStats = require('../models/StoreStats.model');
const auth = require('../middlewares/auth.middleware');

const router = express.Router();

// Update product fields: name, price, isAvailable
router.patch(
  '/:id',
  auth,
  [
    param('id').isMongoId(),
    body('name').optional().isString().trim().notEmpty(),
    body('price').optional().isFloat({ gt: 0 }),
    body('isAvailable').optional().isBoolean(),
    body('quantity').optional().isInt({ min: 0 }),
    body('image').optional().isString().trim().isURL().withMessage('image must be a valid URL'),
    body('description').optional().isString().trim().isLength({ max: 1000 }).withMessage('description too long'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { id } = req.params;
      const updates = {};
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.price !== undefined) updates.price = req.body.price;
      if (req.body.isAvailable !== undefined) updates.isAvailable = req.body.isAvailable;
      if (req.body.quantity !== undefined) updates.quantity = req.body.quantity;
      if (req.body.image !== undefined) updates.image = req.body.image;
      if (req.body.description !== undefined) updates.description = req.body.description;

      const product = await Product.findByIdAndUpdate(id, updates, { new: true });
      if (!product) return res.status(404).json({ error: 'Product not found' });
      res.json(product);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update product' });
    }
  }
);

// Delete a product (admin-only). Also deletes associated ProductStats.
router.delete(
  '/:id',
  auth,
  [param('id').isMongoId()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      if (!req.admin || !['admin', 'superadmin'].includes(req.admin.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { id } = req.params;
      const product = await Product.findByIdAndDelete(id);
      if (!product) return res.status(404).json({ error: 'Product not found' });

      try {
        await ProductStats.deleteOne({ product: product._id });
      } catch (e) {
        // ignore stats cleanup failure
        console.warn('Failed to delete ProductStats for product', product._id, e && e.message ? e.message : e);
      }

      return res.json({ message: 'Deleted', product });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete product' });
    }
  }
);

// React to a product (like or dislike)
router.post(
  '/:id/react',
  [
    param('id').isMongoId(),
    body('action').isIn(['like', 'dislike']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { id } = req.params;
      const { action } = req.body;

      const product = await Product.findById(id);
      if (!product) return res.status(404).json({ error: 'Product not found' });

      const inc = action === 'like' ? { likes: 1 } : { dislikes: 1 };

      const productStats = await ProductStats.findOneAndUpdate(
        { product: product._id },
        { $inc: inc },
        { new: true, upsert: true }
      );

      let storeStats = null;
      if (product.store) {
        storeStats = await StoreStats.findOneAndUpdate(
          { store: product.store },
          { $inc: inc },
          { new: true, upsert: true }
        );
      }

      res.json({ productStats, storeStats });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update product reaction' });
    }
  }
);

module.exports = router;

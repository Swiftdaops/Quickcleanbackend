const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Service = require('../models/Service.model');

const router = express.Router();

// Get all services
router.get('/', async (req, res) => {
  try {
    const services = await Service.find().sort({ name: 1 });
    // If no services exist in DB and we're in development, return a small
    // default set so the frontend can render service toggles while developing.
    if ((!services || services.length === 0) && process.env.NODE_ENV !== 'production') {
      const defaultServices = [
        { name: 'General Cleaning', price: 2500, description: 'Standard home cleaning', isActive: true, icon: 'MdCleaningServices' },
        { name: 'Deep Cleaning', price: 6000, description: 'Thorough deep cleaning', isActive: true, icon: 'MdCleaningServices' },
        { name: 'Laundry Service', price: 2000, description: 'Wash and fold', isActive: true, icon: 'MdLocalLaundryService' },
        { name: 'Help Me Buy Pack', price: 0, description: 'Assisted shopping & delivery', isActive: true, icon: 'MdShoppingCart' },
      ];
      return res.json(defaultServices);
    }

    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Create a service (used by seed or admin)
router.post(
  '/',
  [
    body('name').isString().trim().notEmpty(),
    body('price').isFloat({ gt: 0 }),
    body('description').optional().isString(),
    body('icon').optional().isString().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { name, price, isActive, description, icon } = req.body;
      const existing = await Service.findOne({ name });
      if (existing) return res.status(409).json({ error: 'Service already exists' });
      const service = await Service.create({ name, price, isActive, description, icon });
      res.status(201).json(service);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create service' });
    }
  }
);

// Update service (price / isActive)
router.patch(
  '/:id',
  [
    param('id').isMongoId(),
    body('price').optional().isFloat({ gt: 0 }),
    body('isActive').optional().isBoolean(),
    body('description').optional().isString(),
    body('icon').optional().isString().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { id } = req.params;
      const updates = {};
      if (req.body.price !== undefined) updates.price = req.body.price;
      if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.icon !== undefined) updates.icon = req.body.icon;

      const service = await Service.findByIdAndUpdate(id, updates, { new: true });
      if (!service) return res.status(404).json({ error: 'Service not found' });
      res.json(service);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update service' });
    }
  }
);

module.exports = router;

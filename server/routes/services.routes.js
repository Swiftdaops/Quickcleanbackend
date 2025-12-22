const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Service = require('../models/Service.model');

const router = express.Router();

// Get all services
router.get('/', async (req, res) => {
  try {
    const services = await Service.find().sort({ name: 1 });
    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Create a service (used by seed or admin)
router.post(
  '/',
  [body('name').isString().trim().notEmpty(), body('price').isFloat({ gt: 0 }), body('description').optional().isString()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { name, price, isActive, description } = req.body;
      const existing = await Service.findOne({ name });
      if (existing) return res.status(409).json({ error: 'Service already exists' });
      const service = await Service.create({ name, price, isActive, description });
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
  [param('id').isMongoId(), body('price').optional().isFloat({ gt: 0 }), body('isActive').optional().isBoolean(), body('description').optional().isString()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { id } = req.params;
      const updates = {};
      if (req.body.price !== undefined) updates.price = req.body.price;
      if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
      if (req.body.description !== undefined) updates.description = req.body.description;

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

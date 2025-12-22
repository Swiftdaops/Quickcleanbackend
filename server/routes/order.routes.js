const express = require('express');
const Order = require('../models/Order.model');

const router = express.Router();

// Create order
router.post('/', async (req, res) => {
  try {
    const { cid, lodge, serviceType } = req.body;
    const order = await Order.create({ cid, lodge, serviceType });
    return res.status(201).json(order);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// Get order by CID
router.get('/:cid', async (req, res) => {
  try {
    const { cid } = req.params;
    const order = await Order.findOne({ cid });
    if (!order) return res.status(404).json({ error: 'Not found' });
    return res.json(order);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

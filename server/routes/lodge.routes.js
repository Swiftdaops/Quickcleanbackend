const express = require('express');
const Lodge = require('../models/Lodge.model');

const router = express.Router();

// List lodges
router.get('/', async (req, res) => {
  const lodges = await Lodge.find({});
  res.json(lodges);
});

// Create lodge
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    const lodge = await Lodge.create({ name });
    res.status(201).json(lodge);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

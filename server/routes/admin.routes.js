const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin.model');

const router = express.Router();

// Simple login for tests: finds admin by username and returns a cookie token
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    // Verify password using bcrypt. In tests you can seed a plain password or
    // set admin.password to 'hashedpassword' for convenience, but production
    // should always store hashed passwords and we verify them here.
    const matches = await bcrypt.compare(password, admin.password);
    if (!matches) return res.status(401).json({ error: 'Invalid credentials' });

    const secret = process.env.JWT_SECRET || 'test-secret';
    const token = jwt.sign({ id: admin._id }, secret, { expiresIn: '1h' });
    const isProd = process.env.NODE_ENV === 'production';
    // In dev (localhost), allow cookie over HTTP with SameSite 'Lax'.
    // In production, for cross-origin use, set SameSite=None and Secure.
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: isProd ? 'None' : 'Lax',
      secure: isProd ? true : false,
    });
    // Also return the token in JSON so frontend auth context can store it
    res.json({ ok: true, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Example protected route: return orders (no real join here)
router.get('/orders', async (req, res) => {
  res.json([]);
});

// INTERNAL: update an admin's whatsapp number
// Protected by a simple header secret: `x-internal-secret` must equal `SEED_ADMIN_PASSWORD` or ADMIN_WHATSAPP env var.
router.post('/internal/set-whatsapp', async (req, res) => {
  try {
    const secretHeader = req.headers['x-internal-secret'];
    const secret = process.env.ADMIN_WHATSAPP_SECRET || process.env.SEED_ADMIN_PASSWORD;
    if (!secret || secretHeader !== secret) return res.status(403).json({ error: 'Forbidden' });

    const { username, whatsapp } = req.body;
    if (!username || !whatsapp) return res.status(400).json({ error: 'username and whatsapp required' });

    const admin = await Admin.findOne({ username: username.toLowerCase() });
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    admin.whatsappNumber = whatsapp;
    await admin.save();
    res.json({ ok: true, username: admin.username, whatsapp: admin.whatsappNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;


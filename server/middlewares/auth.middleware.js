const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin.model');

module.exports = async function authMiddleware(req, res, next) {
  try {
    const token = (req.cookies && req.cookies.token) || req.headers.authorization && req.headers.authorization.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const secret = process.env.JWT_SECRET || 'test-secret';
    const payload = jwt.verify(token, secret);
    const admin = await Admin.findById(payload.id || payload._id);
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });

    req.admin = admin;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized', details: err.message });
  }
};

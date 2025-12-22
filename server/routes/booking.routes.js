const express = require('express');
const Booking = require('../models/Booking.model');
const Customer = require('../models/Customer.model');
const stores = require('../data/stores');
const Product = require('../models/Product.model');
const Store = require('../models/Store.model');
const { normalizePhone, isValidPhone } = require('../utils/phone');

const router = express.Router();

// Create a booking (creates customer if phone not found)
router.post('/', async (req, res) => {
  try {
    // Support two payload shapes for compatibility:
    // - top-level: { name, phone, service, price, notes, store, productId, additionalNotes, date }
    // - array: { name, phone, services: [{ service, price, notes, store, productId, additionalNotes, date }] }
    let { name, phone, service, price, notes, store, productId, additionalNotes, date, items, orderSummary } = req.body;
    if (Array.isArray(req.body.services) && req.body.services.length) {
      const s = req.body.services[0] || {};
      service = s.service ?? service;
      price = s.price ?? price;
      notes = s.notes ?? notes;
      store = s.store ?? store;
      productId = s.productId ?? productId;
      additionalNotes = s.additionalNotes ?? additionalNotes;
      date = s.date ?? date;
    }

    if (!name || !phone || !service || price == null) return res.status(400).json({ error: 'Missing fields' });

    if (!isValidPhone(phone)) return res.status(400).json({ error: 'Invalid phone number' });
    const normPhone = normalizePhone(phone);

    let customer = await Customer.findOne({ phone: normPhone });
    if (!customer) {
      customer = await Customer.create({ name: name.trim(), phone: normPhone });
    }

    // Enforce booking rules: if Help Me Buy Pack, require store and product
    const svc = String(service).trim();
    let storeName;
    if (svc === 'Help Me Buy Pack') {
      // Must provide store and productId
      if (!store) return res.status(400).json({ error: 'Store required for Help Me Buy Pack' });
      // Ensure the store is the partnered store
      const partnered = "Chijohnz's Supermarket";
      if (store !== partnered) return res.status(400).json({ error: `Only ${partnered} is supported for Help Me Buy Pack` });

      if (!productId) return res.status(400).json({ error: 'productId required for Help Me Buy Pack' });

      // Validate product existence and belongs to store
      const prod = await Product.findById(productId);
      if (!prod) return res.status(400).json({ error: 'Product not found' });
      const storeRec = await Store.findById(prod.store);
      if (!storeRec || storeRec.name !== partnered) return res.status(400).json({ error: 'Product does not belong to the partnered store' });

      storeName = partnered;
    }

    // If this is a Help Me Buy Pack and a productId is provided, derive items/orderSummary from the product
    let bookingPayload = {
      customer: customer._id,
      service: svc,
      price: Number(price),
      date: date ? new Date(date) : undefined,
      notes: notes || '',
      additionalNotes: additionalNotes || '',
      store: storeName || (store && stores.includes(store) ? store : undefined),
      product: productId || undefined,
    };

    if (svc === 'Help Me Buy Pack' && productId) {
      try {
        const prod = await Product.findById(productId);
        if (prod) {
          const it = {
            productId: prod._id,
            name: prod.name || prod.title || 'Product',
            qty: 1,
            unitPrice: Number(prod.price || 0),
            subtotal: Number(prod.price || 0),
          };
          bookingPayload.items = [it];
          bookingPayload.orderSummary = {
            items: [it],
            subtotal: it.subtotal,
            tax: 0,
            shipping: 0,
            total: it.subtotal,
          };
        }
      } catch (e) {
        // ignore; validation earlier ensured product exists normally
      }
    }

    // Allow callers to provide items/orderSummary directly (e.g., cart payloads)
    if (Array.isArray(items) && items.length) {
      // normalize incoming items into schema shape
      bookingPayload.items = items.map((it) => ({
        productId: it.productId || it._id || null,
        name: it.name || it.title || it.productName || '',
        qty: Number(it.qty || it.quantity || 1),
        unitPrice: Number(it.unitPrice ?? it.price ?? 0),
        subtotal: Number(it.subtotal ?? (it.qty ? it.qty * (it.unitPrice ?? it.price ?? 0) : it.unitPrice ?? it.price ?? 0)),
      }));
    }
    if (orderSummary && typeof orderSummary === 'object') {
      bookingPayload.orderSummary = {
        items: (orderSummary.items || bookingPayload.items || []).map((it) => ({
          productId: it.productId || it._id || null,
          name: it.name || it.title || it.productName || '',
          qty: Number(it.qty || it.quantity || 1),
          unitPrice: Number(it.unitPrice ?? it.price ?? 0),
          subtotal: Number(it.subtotal ?? (it.qty ? it.qty * (it.unitPrice ?? it.price ?? 0) : it.unitPrice ?? it.price ?? 0)),
        })),
        subtotal: Number(orderSummary.subtotal ?? (bookingPayload.items || []).reduce((s, x) => s + (x.subtotal || 0), 0)),
        tax: Number(orderSummary.tax ?? 0),
        shipping: Number(orderSummary.shipping ?? 0),
        total: Number(orderSummary.total ?? (orderSummary.subtotal ?? (bookingPayload.items || []).reduce((s, x) => s + (x.subtotal || 0), 0))),
      };
    }

    const booking = await Booking.create(bookingPayload);

    await booking.populate('customer');

    // Notify room that a booking was created (optional for clients tracking creation)
    try {
      const io = req.app.get('io');
      if (io) io.to(`order:${booking._id}`).emit('orderCreated', { orderId: String(booking._id), status: booking.status, createdAt: booking.createdAt });
    } catch (e) { /* noop */ }

    res.status(201).json({ booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create booking' });
  }
});

// List bookings (supports pagination and filtering)
router.get('/', async (req, res) => {
  try {
    const { status, service, phone, store, page = 1, limit = 20 } = req.query;
    const q = {};
    if (status) q.status = status;
    if (service) q.service = service;
    if (store) q.store = store;
    if (phone) q['customer'] = await (async () => {
      const norm = normalizePhone(phone);
      const c = await Customer.findOne({ phone: norm });
      return c ? c._id : null;
    })();

    // Remove null customer filter
    if (q.customer === null) delete q.customer;

    const p = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, parseInt(limit, 10) || 20);
    const skip = (p - 1) * lim;

    const [total, bookingsRaw] = await Promise.all([
      Booking.countDocuments(q),
      Booking.find(q).sort({ createdAt: -1 }).skip(skip).limit(lim).populate('customer').populate('product'),
    ]);

    // Ensure bookings include a usable orderSummary for frontend consumption
    const bookings = (bookingsRaw || []).map((b) => {
      const obj = (typeof b.toObject === 'function') ? b.toObject() : b;
      try {
        if ((!obj.orderSummary || !obj.orderSummary.total) && obj.product) {
          const prod = obj.product;
          const it = {
            productId: prod._id,
            name: prod.name || prod.title || 'Product',
            qty: 1,
            unitPrice: Number(prod.price || 0),
            subtotal: Number(prod.price || 0),
          };
          obj.items = obj.items && obj.items.length ? obj.items : [it];
          obj.orderSummary = obj.orderSummary && obj.orderSummary.items && obj.orderSummary.items.length ? obj.orderSummary : {
            items: [it],
            subtotal: it.subtotal,
            tax: 0,
            shipping: 0,
            total: it.subtotal,
          };
        }
      } catch (e) { /* noop */ }
      return obj;
    });

    res.json({
      meta: { total, page: p, limit: lim, pages: Math.ceil(total / lim) },
      bookings,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch bookings' });
  }
});

// Assign a booking to a rider/agent
router.post('/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;
    if (!assignedTo) return res.status(400).json({ error: 'assignedTo required' });

    const booking = await Booking.findByIdAndUpdate(id, { assignedTo, status: 'assigned' }, { new: true }).populate('customer');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    // Emit socket update to order room
    try {
      const io = req.app.get('io');
      if (io) io.to(`order:${booking._id}`).emit('orderStatusUpdate', { orderId: String(booking._id), status: booking.status, updatedAt: new Date().toISOString(), assignedTo });
    } catch (e) { /* noop */ }
    res.json({ booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not assign booking' });
  }
});

// Update booking status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status required' });
    if (!['pending', 'assigned', 'completed', 'cancelled'].includes(status)) return res.status(400).json({ error: 'invalid status' });

    const booking = await Booking.findByIdAndUpdate(id, { status }, { new: true }).populate('customer');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    // Emit socket update to order room
    try {
      const io = req.app.get('io');
      if (io) io.to(`order:${booking._id}`).emit('orderStatusUpdate', { orderId: String(booking._id), status: booking.status, updatedAt: new Date().toISOString() });
    } catch (e) { /* noop */ }
    res.json({ booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update status' });
  }
});

module.exports = router;

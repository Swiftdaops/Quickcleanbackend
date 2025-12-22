const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const uploadRouter = require('./routes/upload.routes');
const cookieParser = require('cookie-parser');
const adminRouter = require('./routes/admin.routes');
const orderRouter = require('./routes/order.routes');
const lodgeRouter = require('./routes/lodge.routes');
const bookingRouter = require('./routes/booking.routes');
const bookingAdminRouter = require('./routes/booking.admin.routes');
const bookingV2Router = require('./routes/booking');
const storesRouter = require('./routes/stores.routes');
const servicesRouter = require('./routes/services.routes');
const productsRouter = require('./routes/products.routes');

const app = express();

// Basic security headers
app.use(helmet());

// JSON parser for non-file routes
app.use(express.json());

// Parse cookies for auth middleware
app.use(cookieParser());

// CORS: allow configured origin in env or default to dev permissive
const { NODE_ENV } = process.env;
const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin && NODE_ENV !== 'production') return cb(null, true); // allow tools/curl
      if (corsOrigins.length === 0 || corsOrigins.includes('*')) return cb(null, true);
      if (origin && corsOrigins.includes(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Health check
app.get('/healthz', (req, res) => res.json({ ok: true }));

// Mount upload route
app.use('/api/upload', uploadRouter);

// Mount API routes
app.use('/api/admin', adminRouter);
app.use('/api/orders', orderRouter);
app.use('/api/lodges', lodgeRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/bookings/admin', bookingAdminRouter);
// Store and service management
app.use('/api/stores', storesRouter);
app.use('/api/services', servicesRouter);
app.use('/api/products', productsRouter);
// New v2 booking routes (paths: /booking, /bookings)
app.use('/', bookingV2Router);

module.exports = app;

require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { connect } = require('./config/db');

const PORT = process.env.PORT || 3001;

(async () => {
  try {
    await connect();

    // Create HTTP server and attach Socket.IO
    const server = http.createServer(app);

    // Configure Socket.IO CORS to mirror API CORS origins
    const { NODE_ENV } = process.env;
    const corsOrigins = (process.env.CORS_ORIGIN || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const io = new Server(server, {
      cors: {
        origin: (origin, cb) => {
          if (!origin && NODE_ENV !== 'production') return cb(null, true);
          if (corsOrigins.length === 0 || corsOrigins.includes('*')) return cb(null, true);
          if (origin && corsOrigins.includes(origin)) return cb(null, true);
          return cb(new Error('Not allowed by CORS'));
        },
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    // Expose io to routes via app
    app.set('io', io);

    io.on('connection', (socket) => {
      console.log('Socket connected:', socket.id);

      // Client requests to join a specific order room
      socket.on('joinOrder', (orderId) => {
        if (!orderId) return;
        const room = `order:${orderId}`;
        socket.join(room);
        socket.emit('joinedOrder', { orderId });
      });

      socket.on('leaveOrder', (orderId) => {
        if (!orderId) return;
        const room = `order:${orderId}`;
        socket.leave(room);
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', socket.id, reason);
      });
    });

    server.listen(PORT, () => {
      console.log(`QuickClean backend listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();

/**
 * Express API Server
 * Runs on port 3001, serves all backend routes
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { UPLOADS_PATH } = require('../database/db');

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:3000', 'file://'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded images statically
app.use('/uploads', express.static(UPLOADS_PATH));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/settings',   require('./routes/settings'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products',   require('./routes/products'));
app.use('/api/customers',  require('./routes/customers'));
app.use('/api/invoices',   require('./routes/invoices'));
app.use('/api/reports',    require('./routes/reports'));
app.use('/api/dashboard',  require('./routes/dashboard'));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 IMS Server running on http://localhost:${PORT}`);
});

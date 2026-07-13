const express = require('express');
const router = express.Router();
const { db } = require('../../database/db');

// GET all customers
router.get('/', (req, res) => {
  const { search } = req.query;
  let query = 'SELECT * FROM customers WHERE 1=1';
  const params = [];
  if (search) {
    query += ' AND (name LIKE ? OR phone LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  query += ' ORDER BY name';
  res.json(db.prepare(query).all(...params));
});

// GET single customer with purchase history
router.get('/:id', (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  customer.invoices = db.prepare(`
    SELECT i.*, COUNT(ii.id) as item_count
    FROM invoices i
    LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
    WHERE i.customer_id = ?
    GROUP BY i.id
    ORDER BY i.created_at DESC
    LIMIT 50
  `).all(req.params.id);

  res.json(customer);
});

// POST create customer
router.post('/', (req, res) => {
  const { name, phone, address, notes } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Customer name is required' });

  try {
    const result = db.prepare(`
      INSERT INTO customers (name, phone, address, notes)
      VALUES (?, ?, ?, ?)
    `).run(name.trim(), phone || null, address || null, notes || null);
    res.status(201).json(db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Phone number already registered' });
    throw err;
  }
});

// PUT update customer
router.put('/:id', (req, res) => {
  const { name, phone, address, notes } = req.body;
  try {
    db.prepare(`
      UPDATE customers SET name = ?, phone = ?, address = ?, notes = ? WHERE id = ?
    `).run(name, phone || null, address || null, notes || null, req.params.id);
    res.json({ success: true });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Phone number already in use' });
    throw err;
  }
});

// DELETE customer
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;

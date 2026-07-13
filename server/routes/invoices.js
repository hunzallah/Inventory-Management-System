const express = require('express');
const router = express.Router();
const { db } = require('../../database/db');

// GET all invoices
router.get('/', (req, res) => {
  const { date, customer_id, limit = 50 } = req.query;
  let query = `
    SELECT i.*, c.name as customer_name_ref,
      COUNT(ii.id) as item_count
    FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
    LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
    WHERE 1=1
  `;
  const params = [];
  if (date)        { query += ' AND DATE(i.created_at) = ?'; params.push(date); }
  if (customer_id) { query += ' AND i.customer_id = ?'; params.push(customer_id); }
  query += ` GROUP BY i.id ORDER BY i.created_at DESC LIMIT ${parseInt(limit)}`;
  res.json(db.prepare(query).all(...params));
});

// GET single invoice with items
router.get('/:id', (req, res) => {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  invoice.items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id').all(invoice.id);
  res.json(invoice);
});

// POST create invoice (main POS action)
router.post('/', (req, res) => {
  const { customer_id, customer_name, customer_phone, items, discount = 0, notes } = req.body;

  if (!items?.length) return res.status(400).json({ error: 'Invoice must have at least one item' });

  const createInvoice = db.transaction(() => {
    // Generate invoice number
    const counter = db.prepare("SELECT value FROM settings WHERE key = 'invoice_counter'").get();
    const invoiceNum = parseInt(counter.value) + 1;
    db.prepare("UPDATE settings SET value = ? WHERE key = 'invoice_counter'").run(invoiceNum);
    const invoice_number = `INV-${invoiceNum}`;

    let subtotal = 0;

    // Validate stock and compute subtotal
    for (const item of items) {
      if (item.variant_id) {
        // Garment variant
        const variant = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(item.variant_id);
        if (!variant) throw new Error(`Variant not found for item: ${item.product_name}`);
        if (variant.quantity < item.quantity) {
          throw new Error(`Insufficient stock: ${item.product_name} (${item.color_name} / ${item.size}). Available: ${variant.quantity}`);
        }
      } else {
        // Simple product
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
        if (!product) throw new Error(`Product not found: ${item.product_name}`);
        if (product.quantity < item.quantity) {
          throw new Error(`Insufficient stock: ${item.product_name}. Available: ${product.quantity}`);
        }
      }
      subtotal += item.unit_price * item.quantity;
    }

    const total = Math.max(0, subtotal - parseFloat(discount));

    // Resolve customer
    let resolvedCustomerId = customer_id || null;
    let resolvedName = customer_name || 'Walk-in Customer';
    let resolvedPhone = customer_phone || null;

    if (!resolvedCustomerId && customer_name?.trim()) {
      // Create new customer on-the-fly
      try {
        const newCust = db.prepare(`
          INSERT INTO customers (name, phone) VALUES (?, ?)
        `).run(customer_name.trim(), customer_phone || null);
        resolvedCustomerId = newCust.lastInsertRowid;
      } catch (_) { /* phone duplicate: ignore */ }
    }

    // Insert invoice
    const invoiceResult = db.prepare(`
      INSERT INTO invoices (invoice_number, customer_id, customer_name, customer_phone, subtotal, discount, total, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(invoice_number, resolvedCustomerId, resolvedName, resolvedPhone, subtotal, discount, total, notes || null);

    const invoiceId = invoiceResult.lastInsertRowid;

    // Insert items and deduct stock
    for (const item of items) {
      const itemTotal = item.unit_price * item.quantity;
      db.prepare(`
        INSERT INTO invoice_items
          (invoice_id, product_id, product_name, variant_id, color_name, size, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        invoiceId, item.product_id, item.product_name,
        item.variant_id || null, item.color_name || null, item.size || null,
        item.quantity, item.unit_price, itemTotal
      );

      // Deduct stock
      if (item.variant_id) {
        db.prepare('UPDATE product_variants SET quantity = quantity - ? WHERE id = ?')
          .run(item.quantity, item.variant_id);
      } else {
        db.prepare('UPDATE products SET quantity = quantity - ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run(item.quantity, item.product_id);
      }
    }

    // Update customer stats
    if (resolvedCustomerId) {
      db.prepare(`
        UPDATE customers SET
          total_purchases = total_purchases + 1,
          total_spent = total_spent + ?,
          last_visit = datetime('now')
        WHERE id = ?
      `).run(total, resolvedCustomerId);
    }

    return db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
  });

  try {
    const invoice = createInvoice();
    invoice.items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoice.id);
    res.status(201).json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE invoice (void)
router.delete('/:id', (req, res) => {
  // Restore stock on void
  const restoreStock = db.transaction(() => {
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(req.params.id);
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);

    for (const item of items) {
      if (item.variant_id) {
        db.prepare('UPDATE product_variants SET quantity = quantity + ? WHERE id = ?').run(item.quantity, item.variant_id);
      } else if (item.product_id) {
        db.prepare("UPDATE products SET quantity = quantity + ?, updated_at = datetime('now') WHERE id = ?").run(item.quantity, item.product_id);
      }
    }

    if (invoice?.customer_id) {
      db.prepare(`
        UPDATE customers SET
          total_purchases = MAX(0, total_purchases - 1),
          total_spent = MAX(0, total_spent - ?)
        WHERE id = ?
      `).run(invoice.total, invoice.customer_id);
    }

    db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
  });

  restoreStock();
  res.json({ success: true });
});

module.exports = router;

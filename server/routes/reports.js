const express = require('express');
const router = express.Router();
const { db } = require('../../database/db');

// Daily sales report
router.get('/daily', (req, res) => {
  const { date = new Date().toISOString().split('T')[0] } = req.query;
  const sales = db.prepare(`
    SELECT i.*, ii.product_name, ii.color_name, ii.size, ii.quantity, ii.unit_price, ii.total_price
    FROM invoices i
    JOIN invoice_items ii ON ii.invoice_id = i.id
    WHERE DATE(i.created_at) = ?
    ORDER BY i.created_at DESC
  `).all(date);

  const summary = db.prepare(`
    SELECT COUNT(DISTINCT id) as invoice_count, SUM(total) as total_revenue
    FROM invoices WHERE DATE(created_at) = ?
  `).get(date);

  res.json({ date, summary, items: sales });
});

// Monthly sales report
router.get('/monthly', (req, res) => {
  const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const daily = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as invoices, SUM(total) as revenue
    FROM invoices
    WHERE strftime('%Y-%m', created_at) = ?
    GROUP BY DATE(created_at)
    ORDER BY date
  `).all(monthStr);

  const summary = db.prepare(`
    SELECT COUNT(*) as invoice_count, SUM(total) as total_revenue, AVG(total) as avg_sale
    FROM invoices WHERE strftime('%Y-%m', created_at) = ?
  `).get(monthStr);

  res.json({ month: monthStr, summary, daily });
});

// Best selling products
router.get('/best-selling', (req, res) => {
  const { days = 30 } = req.query;
  const products = db.prepare(`
    SELECT ii.product_id, ii.product_name,
      SUM(ii.quantity) as sold_qty,
      SUM(ii.total_price) as revenue,
      COUNT(DISTINCT ii.invoice_id) as orders
    FROM invoice_items ii
    JOIN invoices i ON i.id = ii.invoice_id
    WHERE i.created_at >= DATE('now', ?)
    GROUP BY ii.product_id, ii.product_name
    ORDER BY sold_qty DESC
    LIMIT 20
  `).all(`-${days} days`);
  res.json(products);
});

// Low stock report
router.get('/low-stock', (req, res) => {
  const products = db.prepare(`
    SELECT *
    FROM (
      SELECT
        p.*,
        c.name AS category_name,
        CASE
          WHEN c.has_variants = 1 THEN (
            SELECT COALESCE(SUM(pv.quantity), 0)
            FROM product_variants pv
            WHERE pv.product_id = p.id
          )
          ELSE p.quantity
        END AS total_quantity
      FROM products p
      JOIN categories c ON c.id = p.category_id
    ) t
    WHERE total_quantity <= low_stock_threshold
    ORDER BY total_quantity ASC
  `).all();

  res.json(products);
});

// Inventory value report
router.get('/inventory-value', (req, res) => {
  const products = db.prepare(`
    SELECT p.name, p.sku, c.name as category_name,
      p.purchase_price, p.selling_price,
      CASE WHEN c.has_variants = 1
        THEN (SELECT COALESCE(SUM(pv.quantity), 0) FROM product_variants pv WHERE pv.product_id = p.id)
        ELSE p.quantity
      END as total_quantity
    FROM products p JOIN categories c ON c.id = p.category_id
    ORDER BY c.name, p.name
  `).all().map(p => ({
    ...p,
    purchase_value: p.total_quantity * p.purchase_price,
    retail_value: p.total_quantity * p.selling_price,
  }));

  const totals = products.reduce((acc, p) => ({
    purchase_value: acc.purchase_value + p.purchase_value,
    retail_value: acc.retail_value + p.retail_value,
  }), { purchase_value: 0, retail_value: 0 });

  res.json({ products, totals });
});

// Customer purchase report
router.get('/customers', (req, res) => {
  const customers = db.prepare(`
    SELECT c.*,
      COUNT(DISTINCT i.id) as invoice_count,
      COALESCE(SUM(i.total), 0) as actual_spent
    FROM customers c
    LEFT JOIN invoices i ON i.customer_id = c.id
    GROUP BY c.id
    ORDER BY actual_spent DESC
    LIMIT 50
  `).all();
  res.json(customers);
});

module.exports = router;

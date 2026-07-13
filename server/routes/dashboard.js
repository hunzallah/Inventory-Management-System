const express = require('express');
const router = express.Router();
const { db } = require('../../database/db');

router.get('/', (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  // Today's sales total
  const todaySales = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as amount, COUNT(*) as count
    FROM invoices WHERE DATE(created_at) = ?
  `).get(today);

  // Total customers
  const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;

  // Total products
  const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;

  // Total inventory value (purchase price * quantity)
  const inventoryValue = db.prepare(`
    SELECT COALESCE(SUM(
      CASE WHEN c.has_variants = 1
        THEN (SELECT COALESCE(SUM(pv.quantity), 0) FROM product_variants pv WHERE pv.product_id = p.id) * p.purchase_price
        ELSE p.quantity * p.purchase_price
      END
    ), 0) as value
    FROM products p JOIN categories c ON c.id = p.category_id
  `).get().value;

  // Low stock items
  const lowStock = db.prepare(`
    SELECT p.id, p.name, p.low_stock_threshold,
      CASE WHEN c.has_variants = 1
        THEN (SELECT COALESCE(SUM(pv.quantity), 0) FROM product_variants pv WHERE pv.product_id = p.id)
        ELSE p.quantity
      END as total_quantity
    FROM products p JOIN categories c ON c.id = p.category_id
    WHERE total_quantity > 0 AND total_quantity <= p.low_stock_threshold
    ORDER BY total_quantity ASC
    LIMIT 10
  `).all();

  // Out of stock items
  const outOfStock = db.prepare(`
    SELECT p.id, p.name,
      CASE WHEN c.has_variants = 1
        THEN (SELECT COALESCE(SUM(pv.quantity), 0) FROM product_variants pv WHERE pv.product_id = p.id)
        ELSE p.quantity
      END as total_quantity
    FROM products p JOIN categories c ON c.id = p.category_id
    WHERE total_quantity = 0
    ORDER BY p.name
    LIMIT 10
  `).all();

  // Top selling products (last 30 days)
  const topSelling = db.prepare(`
    SELECT ii.product_name, SUM(ii.quantity) as sold_qty, SUM(ii.total_price) as revenue
    FROM invoice_items ii
    JOIN invoices i ON i.id = ii.invoice_id
    WHERE DATE(i.created_at) >= DATE('now', '-30 days')
    GROUP BY ii.product_id, ii.product_name
    ORDER BY sold_qty DESC
    LIMIT 5
  `).all();

  // Recent sales (last 10 invoices)
  const recentSales = db.prepare(`
    SELECT i.*, COUNT(ii.id) as item_count
    FROM invoices i
    LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
    GROUP BY i.id
    ORDER BY i.created_at DESC
    LIMIT 10
  `).all();

  // Monthly sales (last 12 months)
  const monthlySales = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month,
      SUM(total) as revenue, COUNT(*) as count
    FROM invoices
    WHERE created_at >= DATE('now', '-12 months')
    GROUP BY month
    ORDER BY month
  `).all();

  // Sales by category (last 30 days)
  const salesByCategory = db.prepare(`
    SELECT c.name as category,
      SUM(ii.total_price) as revenue,
      SUM(ii.quantity) as qty
    FROM invoice_items ii
    JOIN invoices i ON i.id = ii.invoice_id
    LEFT JOIN products p ON p.id = ii.product_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE DATE(i.created_at) >= DATE('now', '-30 days')
    GROUP BY c.name
    ORDER BY revenue DESC
  `).all();

  res.json({
    todaySales,
    totalCustomers,
    totalProducts,
    inventoryValue,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    lowStock,
    outOfStock,
    topSelling,
    recentSales,
    monthlySales,
    salesByCategory,
  });
});

module.exports = router;

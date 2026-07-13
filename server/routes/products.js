const express = require('express');
const router = express.Router();
const { db } = require('../../database/db');
const multer = require('multer');
const path = require('path');
const { UPLOADS_PATH } = require('../../database/db');

const storage = multer.diskStorage({
  destination: UPLOADS_PATH,
  filename: (_, file, cb) => cb(null, `product-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ─── GET all products with category info ──────────────────────────────────────
router.get('/', (req, res) => {
  const { category, search, low_stock, out_of_stock } = req.query;

  let query = `
    SELECT p.*, c.name as category_name, c.has_variants,
      CASE WHEN c.has_variants = 1
        THEN (SELECT COALESCE(SUM(pv.quantity), 0) FROM product_variants pv WHERE pv.product_id = p.id)
        ELSE p.quantity
      END as total_quantity
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE 1=1
  `;
  const params = [];

  if (category) { query += ' AND p.category_id = ?'; params.push(category); }
  if (search)   { query += ' AND (p.name LIKE ? OR p.sku LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  query += ' ORDER BY p.name';
  let products = db.prepare(query).all(...params);

  if (low_stock === 'true') {
    products = products.filter(p => p.total_quantity > 0 && p.total_quantity <= p.low_stock_threshold);
  }
  if (out_of_stock === 'true') {
    products = products.filter(p => p.total_quantity === 0);
  }

  res.json(products);
});

// ─── GET single product with full variant tree ────────────────────────────────
router.get('/:id', (req, res) => {
  const product = db.prepare(`
    SELECT p.*, c.name as category_name, c.has_variants
    FROM products p JOIN categories c ON c.id = p.category_id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!product) return res.status(404).json({ error: 'Product not found' });

  if (product.has_variants) {
    const colors = db.prepare('SELECT * FROM product_colors WHERE product_id = ? ORDER BY color_name').all(product.id);
    for (const color of colors) {
      color.sizes = db.prepare(
        'SELECT * FROM product_variants WHERE color_id = ? ORDER BY size'
      ).all(color.id);
    }
    product.colors = colors;
  }

  res.json(product);
});

// ─── POST create product ──────────────────────────────────────────────────────
router.post('/', upload.single('image'), (req, res) => {
  const {
    name, sku, category_id, purchase_price, selling_price,
    description, quantity, low_stock_threshold, colors
  } = req.body;

  if (!name || !category_id) return res.status(400).json({ error: 'Name and category are required' });

  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(category_id);
  if (!category) return res.status(404).json({ error: 'Category not found' });

  const image_path = req.file ? `/uploads/${req.file.filename}` : null;

  const createProduct = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO products (name, sku, category_id, purchase_price, selling_price,
        description, image_path, quantity, low_stock_threshold, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      name.trim(), sku || null, category_id,
      parseFloat(purchase_price) || 0,
      parseFloat(selling_price) || 0,
      description || null, image_path,
      category.has_variants ? 0 : (parseInt(quantity) || 0),
      parseInt(low_stock_threshold) || 5
    );

    const productId = result.lastInsertRowid;

    // If garment: insert color/size variants
    if (category.has_variants && colors) {
      const parsedColors = typeof colors === 'string' ? JSON.parse(colors) : colors;
      for (const color of parsedColors) {
        const colorResult = db.prepare(
          'INSERT INTO product_colors (product_id, color_name) VALUES (?, ?)'
        ).run(productId, color.name);

        for (const size of color.sizes) {
          db.prepare(
            'INSERT INTO product_variants (product_id, color_id, size, quantity) VALUES (?, ?, ?, ?)'
          ).run(productId, colorResult.lastInsertRowid, size.size, parseInt(size.quantity) || 0);
        }
      }
    }

    return productId;
  });

  const productId = createProduct();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  res.status(201).json(product);
});

// ─── PUT update product ───────────────────────────────────────────────────────
router.put('/:id', upload.single('image'), (req, res) => {
  const {
    name, sku, category_id, purchase_price, selling_price,
    description, quantity, low_stock_threshold, colors, remove_image
  } = req.body;

  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(category_id || existing.category_id);
  const image_path = req.file
    ? `/uploads/${req.file.filename}`
    : (remove_image === 'true' ? null : existing.image_path);

  const updateProduct = db.transaction(() => {
    db.prepare(`
      UPDATE products SET
        name = ?, sku = ?, category_id = ?, purchase_price = ?, selling_price = ?,
        description = ?, image_path = ?, quantity = ?, low_stock_threshold = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name, sku || null, category_id, parseFloat(purchase_price) || 0,
      parseFloat(selling_price) || 0, description || null, image_path,
      category.has_variants ? 0 : (parseInt(quantity) || 0),
      parseInt(low_stock_threshold) || 5,
      req.params.id
    );

    // Update variants if garment
    if (category.has_variants && colors) {
      const parsedColors = typeof colors === 'string' ? JSON.parse(colors) : colors;

      // Delete and re-insert colors/variants for simplicity
      db.prepare('DELETE FROM product_colors WHERE product_id = ?').run(req.params.id);

      for (const color of parsedColors) {
        const colorResult = db.prepare(
          'INSERT INTO product_colors (product_id, color_name) VALUES (?, ?)'
        ).run(req.params.id, color.name);

        for (const size of color.sizes) {
          db.prepare(
            'INSERT INTO product_variants (product_id, color_id, size, quantity) VALUES (?, ?, ?, ?)'
          ).run(req.params.id, colorResult.lastInsertRowid, size.size, parseInt(size.quantity) || 0);
        }
      }
    }
  });

  updateProduct();
  res.json({ success: true });
});

// ─── DELETE product ───────────────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;

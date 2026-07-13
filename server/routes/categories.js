const express = require('express');
const router = express.Router();
const { db } = require('../../database/db');

// GET all categories
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY c.name
  `).all();
  res.json(rows);
});

// POST create category
router.post('/', (req, res) => {
  const { name, has_variants = 0 } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Category name is required' });

  try {
    const result = db.prepare(
      'INSERT INTO categories (name, has_variants) VALUES (?, ?)'
    ).run(name.trim(), has_variants ? 1 : 0);
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(category);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Category already exists' });
    throw err;
  }
});

// PUT update category
router.put('/:id', (req, res) => {
  const { name, has_variants } = req.body;
  db.prepare('UPDATE categories SET name = ?, has_variants = ? WHERE id = ?')
    .run(name, has_variants ? 1 : 0, req.params.id);
  res.json({ success: true });
});

// DELETE category
router.delete('/:id', (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as c FROM products WHERE category_id = ?').get(req.params.id);
  if (count.c > 0) return res.status(409).json({ error: 'Category has products. Remove products first.' });
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;

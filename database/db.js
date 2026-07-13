/**
 * Database Schema & Initialization
 * Sets up all tables with proper relationships
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV !== 'production';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'inventory.db');
const UPLOADS_PATH = process.env.UPLOADS_PATH || path.join(__dirname, '..', 'database', 'uploads');

// Ensure directories exist
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
fs.mkdirSync(UPLOADS_PATH, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Initialize all database tables
 */
function initializeDatabase() {
  db.exec(`
    -- ─────────────────────────────────────────
    -- SETTINGS
    -- ─────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    -- ─────────────────────────────────────────
    -- CATEGORIES
    -- ─────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      has_variants INTEGER NOT NULL DEFAULT 0, -- 1 = garments (color+size), 0 = simple
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ─────────────────────────────────────────
    -- PRODUCTS
    -- ─────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS products (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT    NOT NULL,
      sku            TEXT    UNIQUE,
      category_id    INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      purchase_price REAL    NOT NULL DEFAULT 0,
      selling_price  REAL    NOT NULL DEFAULT 0,
      description    TEXT,
      image_path     TEXT,
      -- Simple quantity (used only when category has_variants = 0)
      quantity       INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ─────────────────────────────────────────
    -- PRODUCT COLORS  (garments only)
    -- ─────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS product_colors (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      color_name TEXT    NOT NULL,
      UNIQUE(product_id, color_name)
    );

    -- ─────────────────────────────────────────
    -- PRODUCT VARIANTS  (color + size + qty)
    -- ─────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS product_variants (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      color_id   INTEGER NOT NULL REFERENCES product_colors(id) ON DELETE CASCADE,
      size       TEXT    NOT NULL,
      quantity   INTEGER NOT NULL DEFAULT 0,
      UNIQUE(color_id, size)
    );

    -- ─────────────────────────────────────────
    -- CUSTOMERS
    -- ─────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS customers (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT NOT NULL,
      phone           TEXT UNIQUE,
      address         TEXT,
      notes           TEXT,
      total_purchases INTEGER NOT NULL DEFAULT 0,
      total_spent     REAL    NOT NULL DEFAULT 0,
      last_visit      TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ─────────────────────────────────────────
    -- INVOICES
    -- ─────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS invoices (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT    NOT NULL UNIQUE,
      customer_id    INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      customer_name  TEXT,   -- snapshot at time of sale
      customer_phone TEXT,
      subtotal       REAL    NOT NULL DEFAULT 0,
      discount       REAL    NOT NULL DEFAULT 0,
      total          REAL    NOT NULL DEFAULT 0,
      notes          TEXT,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ─────────────────────────────────────────
    -- INVOICE ITEMS
    -- ─────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS invoice_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id  INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      product_id  INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT   NOT NULL, -- snapshot
      variant_id  INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
      color_name  TEXT,   -- snapshot
      size        TEXT,   -- snapshot
      quantity    INTEGER NOT NULL,
      unit_price  REAL    NOT NULL,
      total_price REAL    NOT NULL
    );

    -- ─────────────────────────────────────────
    -- INDEXES for performance
    -- ─────────────────────────────────────────
    CREATE INDEX IF NOT EXISTS idx_products_category    ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_variants_product     ON product_variants(product_id);
    CREATE INDEX IF NOT EXISTS idx_variants_color       ON product_variants(color_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_customer    ON invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_date        ON invoices(created_at);
    CREATE INDEX IF NOT EXISTS idx_items_invoice        ON invoice_items(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_items_product        ON invoice_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_customers_phone      ON customers(phone);
  `);

  // Seed default settings
  const seedSettings = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `);

  const defaults = [
    ['store_name', 'My Store'],
    ['store_logo', ''],
    ['receipt_header', 'Thank you for your purchase!'],
    ['receipt_footer', 'Visit us again!'],
    ['theme', 'light'],
    ['currency', 'PKR'],
    ['low_stock_threshold', '5'],
    ['invoice_counter', '1000'],
  ];

  const seedMany = db.transaction(() => {
    for (const [key, value] of defaults) {
      seedSettings.run(key, value);
    }
  });
  seedMany();

  // Seed default categories
  const seedCategory = db.prepare(`
    INSERT OR IGNORE INTO categories (name, has_variants) VALUES (?, ?)
  `);

  const seedCategories = db.transaction(() => {
    seedCategory.run('Garments', 1);
    seedCategory.run('Military Items', 0);
    seedCategory.run('Souvenirs', 0);
    seedCategory.run('Gift Items', 0);
  });
  seedCategories();

  console.log('✅ Database initialized successfully');
}

initializeDatabase();

module.exports = { db, UPLOADS_PATH };

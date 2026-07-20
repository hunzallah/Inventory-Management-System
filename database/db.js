/**
 * Database Schema & Initialization
 * Sets up all tables with proper relationships
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// SAFE PATH LOGIC: Always verify if explicitly overridden by main process environment
const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '..', 'database', 'inventory.db');
const UPLOADS_PATH = process.env.UPLOADS_PATH || path.resolve(__dirname, '..', 'database', 'uploads');

// Ensure directories exist
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
if (!fs.existsSync(UPLOADS_PATH)) {
  fs.mkdirSync(UPLOADS_PATH, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Initialize all database tables
 */
function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT UNIQUE,
      has_variants INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      name                TEXT,
      sku                 TEXT,
      category_id         INTEGER,
      purchase_price      REAL    DEFAULT 0,
      selling_price       REAL    DEFAULT 0,
      description         TEXT,
      image_path          TEXT,
      quantity            INTEGER DEFAULT 0,
      low_stock_threshold INTEGER DEFAULT 5,
      updated_at          TEXT,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS product_colors (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      color_name TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      color_id   INTEGER,
      size       TEXT,
      quantity   INTEGER DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (color_id)   REFERENCES product_colors(id)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT,
      phone           TEXT UNIQUE,
      address         TEXT,
      notes           TEXT,
      total_purchases INTEGER DEFAULT 0,
      total_spent     REAL    DEFAULT 0,
      last_visit      TEXT
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number  TEXT,
      customer_id     INTEGER,
      customer_name   TEXT,
      customer_phone  TEXT,
      subtotal        REAL DEFAULT 0,
      discount        REAL DEFAULT 0,
      total           REAL DEFAULT 0,
      notes           TEXT,
      created_at      TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id   INTEGER,
      product_id   INTEGER,
      product_name TEXT,
      variant_id   INTEGER,
      color_name   TEXT,
      size         TEXT,
      quantity     INTEGER,
      unit_price   REAL DEFAULT 0,
      total_price  REAL DEFAULT 0,
      FOREIGN KEY (invoice_id)   REFERENCES invoices(id),
      FOREIGN KEY (product_id)   REFERENCES products(id),
      FOREIGN KEY (variant_id)   REFERENCES product_variants(id)
    );

    CREATE INDEX IF NOT EXISTS idx_products_category       ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_product_colors_product   ON product_colors(product_id);
    CREATE INDEX IF NOT EXISTS idx_product_variants_color   ON product_variants(color_id);
    CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_customer        ON invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_created_at      ON invoices(created_at);
    CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice    ON invoice_items(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_invoice_items_product    ON invoice_items(product_id);
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
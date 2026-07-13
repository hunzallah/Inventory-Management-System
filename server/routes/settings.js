const express = require('express');
const router = express.Router();
const { db } = require('../../database/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { UPLOADS_PATH } = require('../../database/db');

const storage = multer.diskStorage({
  destination: UPLOADS_PATH,
  filename: (_, file, cb) => cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET all settings
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
  res.json(settings);
});

// PUT update settings (bulk)
router.put('/', (req, res) => {
  const update = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const updateMany = db.transaction((data) => {
    for (const [key, value] of Object.entries(data)) {
      update.run(key, String(value));
    }
  });
  updateMany(req.body);
  res.json({ success: true });
});

// POST upload logo
router.post('/logo', upload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const logoPath = `/uploads/${req.file.filename}`;
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('store_logo', logoPath);
  res.json({ path: logoPath });
});

// GET backup database file
router.get('/backup', (req, res) => {
  const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../database/inventory.db');
  if (!fs.existsSync(DB_PATH)) return res.status(404).json({ error: 'Database file not found' });

  // Checkpoint WAL before backup
  try { db.pragma('wal_checkpoint(FULL)'); } catch (_) {}

  const filename = `ims-backup-${new Date().toISOString().slice(0,10)}.db`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  fs.createReadStream(DB_PATH).pipe(res);
});

module.exports = router;

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const dotenv = require('dotenv');

function loadEnv() {
  const root = path.join(__dirname, '..');
  const stagingEnv = path.join(root, '.env.staging');
  if (process.env.NODE_ENV === 'staging' && fs.existsSync(stagingEnv)) {
    dotenv.config({ path: stagingEnv });
  } else {
    const dotEnv = path.join(root, '.env');
    if (fs.existsSync(dotEnv)) dotenv.config({ path: dotEnv });
  }
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function init() {
  loadEnv();
  const root = path.join(__dirname, '..');
  const dbPath = path.resolve(root, process.env.DB_PATH || './data/app.db');
  ensureDir(dbPath);
  console.log(`[init-db] Using DB at ${dbPath}`);

  const db = new Database(dbPath);
  try {
    db.pragma('journal_mode = WAL');

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS stations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        value INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE VIEW IF NOT EXISTS daily_stats AS
        SELECT date(created_at) AS day,
               event_type,
               COUNT(*) AS count,
               SUM(value) AS total_value
        FROM events
        GROUP BY day, event_type;
    `);

    const hasAdmin = db.prepare('SELECT 1 FROM users WHERE username = ?').get('admin');
    if (!hasAdmin) {
      db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)')
        .run('admin', 'admin', 'admin');
      console.log('[init-db] Created default admin user (admin/admin).');
    } else {
      console.log('[init-db] Default admin user already exists.');
    }

    const stationCount = db.prepare('SELECT COUNT(1) as c FROM stations').get().c;
    if (stationCount === 0) {
      const insertStation = db.prepare('INSERT INTO stations (name) VALUES (?)');
      ['Alpha', 'Bravo', 'Charlie'].forEach(n => insertStation.run(n));
      console.log('[init-db] Seeded stations.');
    }

    console.log('[init-db] Database initialized successfully (WAL + tables + daily_stats view).');
  } finally {
    db.close();
  }
}

init();

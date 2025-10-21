const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const dotenv = require('dotenv');

function loadEnv() {
  const root = path.join(__dirname, '..');
  const stagingEnv = path.join(root, '.env.staging');
  const defaultEnv = path.join(root, '.env');
  if (process.env.NODE_ENV === 'staging' && fs.existsSync(stagingEnv)) {
    dotenv.config({ path: stagingEnv });
  } else if (fs.existsSync(defaultEnv)) {
    dotenv.config({ path: defaultEnv });
  }
}

loadEnv();

const app = express();
app.use(express.json());

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

const dbPath = path.resolve(path.join(__dirname, '..'), process.env.DB_PATH || './data/app.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const db = new Database(dbPath);

// Ensure WAL and base schema exist (idempotent)
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

// Seed admin user if not exists
const hasAdmin = db.prepare('SELECT 1 FROM users WHERE username = ?').get('admin');
if (!hasAdmin) {
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)')
    .run('admin', 'admin', 'admin');
}

// Seed stations if empty
const stationCount = db.prepare('SELECT COUNT(1) as c FROM stations').get().c;
if (stationCount === 0) {
  const insertStation = db.prepare('INSERT INTO stations (name) VALUES (?)');
  ['Alpha', 'Bravo', 'Charlie'].forEach(n => insertStation.run(n));
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/analytics', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM daily_stats ORDER BY day DESC LIMIT 30').all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/stations', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, name FROM stations ORDER BY id').all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  // A minimal token mock
  res.json({ token: 'dummy-token', user: { id: user.id, username: user.username, role: user.role } });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`[server] NODE_ENV=${process.env.NODE_ENV || ''} listening on :${port}`);
});

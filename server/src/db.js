const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'admin123';

function ensureDirectory(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createDatabase(options = {}) {
  const {
    dbPath,
    memory = false,
    seedAdmin = true,
    seedStations = true
  } = options;

  const resolvedPath = memory ? ':memory:' : path.resolve(dbPath || path.join(__dirname, '..', 'data', 'app.db'));

  if (!memory) {
    ensureDirectory(resolvedPath);
  }

  const db = new Database(resolvedPath);
  db.pragma('foreign_keys = ON');
  if (!memory) {
    try {
      db.pragma('journal_mode = WAL');
    } catch (err) {
      // Ignore if WAL cannot be enabled (e.g. network drives)
    }
  }

  applyMigrations(db);

  if (seedAdmin) {
    seedDefaultAdmin(db);
  }

  if (seedStations) {
    seedDefaultStations(db);
  }

  return db;
}

function applyMigrations(db) {
  migrateUsersTable(db);
  migrateStationsTable(db);
  ensurePermitRecordsTable(db);
}

function migrateUsersTable(db) {
  const info = db.prepare('PRAGMA table_info(users)').all();

  if (info.length === 0) {
    createUsersTable(db);
    return;
  }

  const columnNames = info.map(column => column.name);
  const hasPasswordHash = columnNames.includes('password_hash');
  const hasPasswordColumn = columnNames.includes('password');
  const hasPasswordReset = columnNames.includes('password_reset_required');
  const hasUpdatedAt = columnNames.includes('updated_at');

  const needsMigration = !hasPasswordHash || hasPasswordColumn || !hasPasswordReset || !hasUpdatedAt;

  if (!needsMigration) {
    return;
  }

  db.exec('ALTER TABLE users RENAME TO users_legacy');
  createUsersTable(db);

  const legacyUsers = db.prepare('SELECT id, username, password, role, created_at, updated_at FROM users_legacy').all();
  const insert = db.prepare(`
    INSERT INTO users (id, username, password_hash, role, password_reset_required, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const migrate = db.transaction(() => {
    const now = new Date().toISOString();
    for (const user of legacyUsers) {
      const hashed = bcrypt.hashSync(user.password || DEFAULT_ADMIN_PASSWORD, 10);
      insert.run(
        user.id,
        user.username,
        hashed,
        user.role || 'admin',
        1,
        user.created_at || now,
        user.updated_at || now
      );
    }
  });

  migrate();
  db.exec('DROP TABLE users_legacy');
}

function createUsersTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      password_reset_required INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function migrateStationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const info = db.prepare('PRAGMA table_info(stations)').all();
  const columnNames = info.map(column => column.name);

  if (!columnNames.includes('location')) {
    db.exec('ALTER TABLE stations ADD COLUMN location TEXT');
  }

  if (!columnNames.includes('updated_at')) {
    db.exec('ALTER TABLE stations ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
  }
}

function ensurePermitRecordsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS permit_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      station_id INTEGER NOT NULL,
      permit_number TEXT NOT NULL UNIQUE,
      holder_name TEXT NOT NULL,
      permit_type TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'active', 'expired', 'revoked')),
      issued_at DATETIME NOT NULL,
      expires_at DATETIME,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
    )
  `);

  db.exec('CREATE INDEX IF NOT EXISTS idx_permit_records_station ON permit_records(station_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_permit_records_status ON permit_records(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_permit_records_issued_at ON permit_records(issued_at)');
}

function seedDefaultAdmin(db) {
  const existing = db.prepare('SELECT 1 FROM users WHERE username = ?').get(DEFAULT_ADMIN_USERNAME);
  if (existing) {
    return;
  }

  const hash = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10);
  db.prepare(`
    INSERT INTO users (username, password_hash, role, password_reset_required)
    VALUES (?, ?, ?, ?)
  `).run(DEFAULT_ADMIN_USERNAME, hash, 'admin', 1);
}

function seedDefaultStations(db) {
  const countRow = db.prepare('SELECT COUNT(1) AS count FROM stations').get();
  if (countRow && countRow.count > 0) {
    return;
  }

  const stations = [
    { name: 'Alpha Station', location: 'North District' },
    { name: 'Bravo Station', location: 'East District' },
    { name: 'Charlie Station', location: 'South District' }
  ];

  const insert = db.prepare('INSERT INTO stations (name, location) VALUES (?, ?)');
  const seed = db.transaction(() => {
    for (const station of stations) {
      insert.run(station.name, station.location);
    }
  });

  seed();
}

module.exports = {
  createDatabase,
  DEFAULT_ADMIN_USERNAME,
  DEFAULT_ADMIN_PASSWORD
};

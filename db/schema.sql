-- PRAGMA and connection setup
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;

-- Table: police_station
CREATE TABLE IF NOT EXISTS police_station (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_name TEXT,
  remark TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- Trigger to update updated_at on police_station
CREATE TRIGGER IF NOT EXISTS trg_police_station_updated
AFTER UPDATE ON police_station
FOR EACH ROW BEGIN
  UPDATE police_station SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- Table: permit_record
CREATE TABLE IF NOT EXISTS permit_record (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  station_id INTEGER NOT NULL,
  apply_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success','exception')),
  exception_reason TEXT,
  created_at DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at DATETIME NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(station_id) REFERENCES police_station(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Trigger to update updated_at on permit_record
CREATE TRIGGER IF NOT EXISTS trg_permit_record_updated
AFTER UPDATE ON permit_record
FOR EACH ROW BEGIN
  UPDATE permit_record SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- Index to speed up queries
CREATE INDEX IF NOT EXISTS idx_permit_record_station_date ON permit_record(station_id, apply_date);

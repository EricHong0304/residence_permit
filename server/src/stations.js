const express = require('express');
const { AppError, validationError } = require('./errors');

function createStationsRouter({ db, authenticate }) {
  const router = express.Router();

  router.use(authenticate());

  const listStmt = db.prepare(`
    SELECT id, name, location, created_at, updated_at
    FROM stations
    ORDER BY id
  `);

  const getByIdStmt = db.prepare(`
    SELECT id, name, location, created_at, updated_at
    FROM stations
    WHERE id = ?
  `);

  const insertStmt = db.prepare(`
    INSERT INTO stations (name, location)
    VALUES (?, ?)
  `);

  const updateStmt = db.prepare(`
    UPDATE stations
    SET name = ?,
        location = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const deleteStmt = db.prepare('DELETE FROM stations WHERE id = ?');

  router.get('/', (req, res, next) => {
    try {
      const rows = listStmt.all().map(mapStationRow);
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', (req, res, next) => {
    try {
      const payload = validateStationPayload(req.body);
      const result = insertStmt.run(payload.name, payload.location);
      const row = getByIdStmt.get(result.lastInsertRowid);
      res.status(201).json(mapStationRow(row));
    } catch (err) {
      if (err instanceof AppError) {
        return next(err);
      }
      next(err);
    }
  });

  router.get('/:id', (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      const row = getByIdStmt.get(id);
      if (!row) {
        throw new AppError('Station not found', 404, 'STATION_NOT_FOUND');
      }
      res.json(mapStationRow(row));
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      const existing = getByIdStmt.get(id);
      if (!existing) {
        throw new AppError('Station not found', 404, 'STATION_NOT_FOUND');
      }

      const payload = validateStationPayload(req.body);
      updateStmt.run(payload.name, payload.location, id);
      const updated = getByIdStmt.get(id);
      res.json(mapStationRow(updated));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      const result = deleteStmt.run(id);
      if (result.changes === 0) {
        throw new AppError('Station not found', 404, 'STATION_NOT_FOUND');
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

function validateStationPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw validationError('Station payload is required', { field: 'body' });
  }

  const { name, location = null } = payload;

  if (typeof name !== 'string' || !name.trim()) {
    throw validationError('Station name is required', { field: 'name' });
  }

  if (location !== null && location !== undefined && typeof location !== 'string') {
    throw validationError('Station location must be a string if provided', { field: 'location' });
  }

  return {
    name: name.trim(),
    location: location !== null && location !== undefined ? location.trim() : null
  };
}

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('Invalid station id', 400, 'INVALID_STATION_ID');
  }
  return id;
}

function mapStationRow(row) {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  createStationsRouter
};

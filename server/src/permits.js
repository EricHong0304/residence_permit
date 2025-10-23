const express = require('express');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { AppError, validationError } = require('./errors');

const PERMIT_STATUSES = ['pending', 'active', 'expired', 'revoked'];

function createPermitsRouter({ db, authenticate }) {
  const router = express.Router();

  router.use(authenticate());

  const baseSelect = `
    SELECT
      permit_records.id,
      permit_records.station_id,
      permit_records.permit_number,
      permit_records.holder_name,
      permit_records.permit_type,
      permit_records.status,
      permit_records.issued_at,
      permit_records.expires_at,
      permit_records.metadata,
      permit_records.created_at,
      permit_records.updated_at,
      stations.name AS station_name,
      stations.location AS station_location
    FROM permit_records
    JOIN stations ON stations.id = permit_records.station_id
  `;

  const getByIdStmt = db.prepare(`${baseSelect} WHERE permit_records.id = ?`);
  const stationExistsStmt = db.prepare('SELECT id FROM stations WHERE id = ?');

  const insertStmt = db.prepare(`
    INSERT INTO permit_records (
      station_id,
      permit_number,
      holder_name,
      permit_type,
      status,
      issued_at,
      expires_at,
      metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateStmt = db.prepare(`
    UPDATE permit_records
    SET station_id = ?,
        permit_number = ?,
        holder_name = ?,
        permit_type = ?,
        status = ?,
        issued_at = ?,
        expires_at = ?,
        metadata = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const deleteStmt = db.prepare('DELETE FROM permit_records WHERE id = ?');

  router.get('/', (req, res, next) => {
    try {
      const filters = [];
      const params = [];

      if (req.query.stationId !== undefined) {
        const stationId = parseId(req.query.stationId, 'stationId');
        filters.push('permit_records.station_id = ?');
        params.push(stationId);
      }

      if (req.query.status !== undefined) {
        const status = normalizeStatus(req.query.status);
        filters.push('permit_records.status = ?');
        params.push(status);
      }

      let query = baseSelect;
      if (filters.length) {
        query += ' WHERE ' + filters.join(' AND ');
      }
      query += ' ORDER BY permit_records.id';

      const stmt = db.prepare(query);
      const rows = stmt.all(...params).map(mapPermitRow);
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', (req, res, next) => {
    try {
      const payload = validatePermitPayload(req.body);
      ensureStationExists(stationExistsStmt, payload.stationId);

      const result = insertStmt.run(
        payload.stationId,
        payload.permitNumber,
        payload.holderName,
        payload.permitType,
        payload.status,
        payload.issuedAt,
        payload.expiresAt,
        payload.metadata ? JSON.stringify(payload.metadata) : null
      );

      const created = getByIdStmt.get(result.lastInsertRowid);
      res.status(201).json(mapPermitRow(created));
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return next(validationError('Permit number must be unique', { field: 'permitNumber' }));
      }
      if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        return next(validationError('Station does not exist', { field: 'stationId' }));
      }
      next(err);
    }
  });

  router.get('/export', (req, res, next) => {
    try {
      const rows = db.prepare(baseSelect + ' ORDER BY permit_records.id').all();
      const data = rows.map(row => ({
        id: row.id,
        station_id: row.station_id,
        station_name: row.station_name,
        permit_number: row.permit_number,
        holder_name: row.holder_name,
        permit_type: row.permit_type,
        status: row.status,
        issued_at: row.issued_at,
        expires_at: row.expires_at,
        metadata: row.metadata || ''
      }));

      const csv = stringify(data, { header: true });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="permit-records.csv"');
      res.send(csv);
    } catch (err) {
      next(err);
    }
  });

  router.post('/import', (req, res, next) => {
    try {
      const csvInput = typeof req.body === 'string' ? req.body : req.body?.data;
      if (typeof csvInput !== 'string' || !csvInput.trim()) {
        throw validationError('CSV data is required for import', { field: 'data' });
      }

      const records = parse(csvInput, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      let inserted = 0;
      const errors = [];

      const importer = db.transaction(rows => {
        rows.forEach((row, index) => {
          try {
            const payload = validatePermitPayload({
              stationId: row.station_id ?? row.stationId,
              permitNumber: row.permit_number ?? row.permitNumber,
              holderName: row.holder_name ?? row.holderName,
              permitType: row.permit_type ?? row.permitType,
              status: row.status,
              issuedAt: row.issued_at ?? row.issuedAt,
              expiresAt: row.expires_at ?? row.expiresAt,
              metadata: parseMetadataFromCsv(row.metadata)
            });

            ensureStationExists(stationExistsStmt, payload.stationId);

            insertStmt.run(
              payload.stationId,
              payload.permitNumber,
              payload.holderName,
              payload.permitType,
              payload.status,
              payload.issuedAt,
              payload.expiresAt,
              payload.metadata ? JSON.stringify(payload.metadata) : null
            );

            inserted += 1;
          } catch (error) {
            const info = error instanceof AppError
              ? { code: error.code, message: error.message, details: error.details }
              : { message: error.message };

            errors.push({ row: index + 1, ...info });
          }
        });
      });

      importer(records);

      res.json({ inserted, errors });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', (req, res, next) => {
    try {
      const id = parseId(req.params.id, 'permitId');
      const row = getByIdStmt.get(id);
      if (!row) {
        throw new AppError('Permit record not found', 404, 'PERMIT_NOT_FOUND');
      }
      res.json(mapPermitRow(row));
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', (req, res, next) => {
    try {
      const id = parseId(req.params.id, 'permitId');
      const existing = getByIdStmt.get(id);
      if (!existing) {
        throw new AppError('Permit record not found', 404, 'PERMIT_NOT_FOUND');
      }

      const payload = validatePermitPayload(req.body);
      ensureStationExists(stationExistsStmt, payload.stationId);

      updateStmt.run(
        payload.stationId,
        payload.permitNumber,
        payload.holderName,
        payload.permitType,
        payload.status,
        payload.issuedAt,
        payload.expiresAt,
        payload.metadata ? JSON.stringify(payload.metadata) : null,
        id
      );

      const updated = getByIdStmt.get(id);
      res.json(mapPermitRow(updated));
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return next(validationError('Permit number must be unique', { field: 'permitNumber' }));
      }
      if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        return next(validationError('Station does not exist', { field: 'stationId' }));
      }
      next(err);
    }
  });

  router.delete('/:id', (req, res, next) => {
    try {
      const id = parseId(req.params.id, 'permitId');
      const result = deleteStmt.run(id);
      if (result.changes === 0) {
        throw new AppError('Permit record not found', 404, 'PERMIT_NOT_FOUND');
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

function validatePermitPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw validationError('Permit payload is required', { field: 'body' });
  }

  const {
    stationId,
    permitNumber,
    holderName,
    permitType,
    status,
    issuedAt,
    expiresAt = null,
    metadata = null
  } = payload;

  const numericStationId = Number(stationId);
  if (!Number.isInteger(numericStationId) || numericStationId <= 0) {
    throw validationError('stationId must be a positive integer', { field: 'stationId' });
  }

  if (typeof permitNumber !== 'string' || !permitNumber.trim()) {
    throw validationError('permitNumber is required', { field: 'permitNumber' });
  }

  if (typeof holderName !== 'string' || !holderName.trim()) {
    throw validationError('holderName is required', { field: 'holderName' });
  }

  if (typeof permitType !== 'string' || !permitType.trim()) {
    throw validationError('permitType is required', { field: 'permitType' });
  }

  const normalizedStatus = normalizeStatus(status);
  const issuedAtIso = toIsoString(issuedAt, 'issuedAt', { required: true });
  const expiresAtIso = toIsoString(expiresAt, 'expiresAt', { required: false });
  const normalizedMetadata = normalizeMetadata(metadata);

  return {
    stationId: numericStationId,
    permitNumber: permitNumber.trim(),
    holderName: holderName.trim(),
    permitType: permitType.trim(),
    status: normalizedStatus,
    issuedAt: issuedAtIso,
    expiresAt: expiresAtIso,
    metadata: normalizedMetadata
  };
}

function normalizeStatus(status) {
  if (typeof status !== 'string' || !status.trim()) {
    throw validationError('status is required', { field: 'status' });
  }
  const normalized = status.trim().toLowerCase();
  if (!PERMIT_STATUSES.includes(normalized)) {
    throw validationError(`status must be one of: ${PERMIT_STATUSES.join(', ')}`, { field: 'status' });
  }
  return normalized;
}

function toIsoString(value, field, { required }) {
  if (value === null || value === undefined) {
    if (required) {
      throw validationError(`${field} is required`, { field });
    }
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw validationError(`${field} must be a valid date`, { field });
  }
  return date.toISOString();
}

function normalizeMetadata(metadata) {
  if (metadata === null || metadata === undefined) {
    return null;
  }

  if (typeof metadata === 'string') {
    const trimmed = metadata.trim();
    if (!trimmed) {
      return null;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
      throw validationError('metadata must be a JSON object', { field: 'metadata' });
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }
      throw validationError('metadata must be a JSON object', { field: 'metadata' });
    }
  }

  if (typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata;
  }

  throw validationError('metadata must be an object', { field: 'metadata' });
}

function ensureStationExists(stmt, stationId) {
  const station = stmt.get(stationId);
  if (!station) {
    throw new AppError('Station not found', 404, 'STATION_NOT_FOUND');
  }
}

function parseMetadataFromCsv(value) {
  if (value === undefined) {
    return null;
  }
  if (value === null || value === '') {
    return null;
  }
  return value;
}

function parseId(value, field) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(`Invalid ${field}`, 400, 'INVALID_IDENTIFIER');
  }
  return id;
}

function mapPermitRow(row) {
  let metadata = null;
  if (row.metadata) {
    try {
      metadata = JSON.parse(row.metadata);
    } catch (_err) {
      metadata = null;
    }
  }

  return {
    id: row.id,
    stationId: row.station_id,
    stationName: row.station_name,
    stationLocation: row.station_location,
    permitNumber: row.permit_number,
    holderName: row.holder_name,
    permitType: row.permit_type,
    status: row.status,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  createPermitsRouter,
  PERMIT_STATUSES,
  mapPermitRow
};

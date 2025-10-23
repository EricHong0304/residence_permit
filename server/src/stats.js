const express = require('express');
const { validationError } = require('./errors');
const { PERMIT_STATUSES, mapPermitRow } = require('./permits');

function createStatsRouter({ db, authenticate }) {
  const router = express.Router();

  router.use(authenticate());

  router.get('/summary', (req, res, next) => {
    try {
      const permitSummary = db.prepare(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0) AS active,
          SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0) AS expired,
          SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0) AS revoked,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0) AS pending
        FROM permit_records
      `).get();

      const stationsSummary = db.prepare('SELECT COUNT(*) AS total FROM stations').get();

      res.json({
        totalPermits: numberOrZero(permitSummary?.total),
        activePermits: numberOrZero(permitSummary?.active),
        expiredPermits: numberOrZero(permitSummary?.expired),
        revokedPermits: numberOrZero(permitSummary?.revoked),
        pendingPermits: numberOrZero(permitSummary?.pending),
        totalStations: numberOrZero(stationsSummary?.total)
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/timeseries', (req, res, next) => {
    try {
      const { startDate, endDate, startIso, endIso } = resolveDateRange(req.query.start, req.query.end);

      const rows = db.prepare(`
        SELECT
          date(issued_at) AS day,
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0) AS active,
          SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0) AS expired,
          SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0) AS revoked,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0) AS pending
        FROM permit_records
        WHERE issued_at BETWEEN ? AND ?
        GROUP BY day
        ORDER BY day
      `).all(startIso, endIso);

      const map = new Map(rows.map(row => [row.day, row]));
      const result = [];
      for (let cursor = new Date(startDate); cursor <= endDate; cursor = addDays(cursor, 1)) {
        const key = toDateString(cursor);
        const row = map.get(key);
        result.push({
          date: key,
          total: numberOrZero(row?.total),
          active: numberOrZero(row?.active),
          expired: numberOrZero(row?.expired),
          revoked: numberOrZero(row?.revoked),
          pending: numberOrZero(row?.pending)
        });
      }

      res.json({
        start: toDateString(startDate),
        end: toDateString(endDate),
        points: result
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/drilldown', (req, res, next) => {
    try {
      const dimension = (req.query.dimension || 'station').toString().toLowerCase();

      if (dimension === 'station') {
        const rows = db.prepare(`
          SELECT
            stations.id AS station_id,
            stations.name AS station_name,
            COUNT(permit_records.id) AS total,
            SUM(CASE WHEN permit_records.status = 'active' THEN 1 ELSE 0) AS active,
            SUM(CASE WHEN permit_records.status = 'expired' THEN 1 ELSE 0) AS expired,
            SUM(CASE WHEN permit_records.status = 'revoked' THEN 1 ELSE 0) AS revoked,
            SUM(CASE WHEN permit_records.status = 'pending' THEN 1 ELSE 0) AS pending
          FROM stations
          LEFT JOIN permit_records ON permit_records.station_id = stations.id
          GROUP BY stations.id
          ORDER BY stations.name
        `).all();

        return res.json({
          dimension: 'station',
          rows: rows.map(row => ({
            stationId: row.station_id,
            stationName: row.station_name,
            totals: {
              total: numberOrZero(row?.total),
              active: numberOrZero(row?.active),
              expired: numberOrZero(row?.expired),
              revoked: numberOrZero(row?.revoked),
              pending: numberOrZero(row?.pending)
            }
          }))
        });
      }

      if (dimension === 'status') {
        const rows = db.prepare(`
          SELECT status, COUNT(*) AS total
          FROM permit_records
          GROUP BY status
        `).all();

        const map = new Map(rows.map(row => [row.status, row.total]));

        return res.json({
          dimension: 'status',
          rows: PERMIT_STATUSES.map(status => ({
            status,
            total: numberOrZero(map.get(status))
          }))
        });
      }

      throw validationError("dimension must be either 'station' or 'status'", { field: 'dimension' });
    } catch (err) {
      next(err);
    }
  });

  router.get('/daily', (req, res, next) => {
    try {
      const { dateParam, dateString } = resolveSingleDate(req.query.date);

      const summary = db.prepare(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0) AS active,
          SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0) AS expired,
          SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0) AS revoked,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0) AS pending
        FROM permit_records
        WHERE date(issued_at) = ?
      `).get(dateString);

      const permitRows = db.prepare(`${PERMIT_BASE_SELECT}
        WHERE date(permit_records.issued_at) = ?
        ORDER BY permit_records.issued_at
      `).all(dateString);

      res.json({
        date: toDateString(dateParam),
        total: numberOrZero(summary?.total),
        byStatus: {
          active: numberOrZero(summary?.active),
          expired: numberOrZero(summary?.expired),
          revoked: numberOrZero(summary?.revoked),
          pending: numberOrZero(summary?.pending)
        },
        permits: permitRows.map(mapPermitRow)
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

const PERMIT_BASE_SELECT = `
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

function resolveDateRange(startInput, endInput) {
  const today = startOfDay(new Date());
  const endDate = endInput ? startOfDay(parseDateValue(endInput, 'end')) : today;
  const startDate = startInput
    ? startOfDay(parseDateValue(startInput, 'start'))
    : addDays(endDate, -29);

  if (startDate > endDate) {
    throw validationError('start date must be before end date', { fields: ['start', 'end'] });
  }

  const startIso = startDate.toISOString();
  const endIso = endOfDay(endDate).toISOString();

  return {
    startDate,
    endDate,
    startIso,
    endIso
  };
}

function resolveSingleDate(dateValue) {
  if (!dateValue) {
    throw validationError('date query parameter is required', { field: 'date' });
  }

  const parsed = startOfDay(parseDateValue(dateValue, 'date'));
  return {
    dateParam: parsed,
    dateString: toDateString(parsed)
  };
}

function parseDateValue(value, field) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value !== 'string') {
    throw validationError(`${field} must be a date string`, { field });
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw validationError(`${field} must be a date string`, { field });
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw validationError(`${field} must be a valid date`, { field });
  }
  return date;
}

function startOfDay(date) {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0, 0, 0, 0
  ));
}

function endOfDay(date) {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    23, 59, 59, 999
  ));
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

function numberOrZero(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

module.exports = {
  createStatsRouter
};

const express = require('express');
const cors = require('cors');
const { createAuthModule } = require('./auth');
const { createStationsRouter } = require('./stations');
const { createPermitsRouter } = require('./permits');
const { createStatsRouter } = require('./stats');
const { AppError, errorHandler } = require('./errors');

function createApp({ db, config }) {
  if (!db) {
    throw new Error('Database instance is required to create the app');
  }

  const appConfig = config || {};
  const allowedOrigins = Array.isArray(appConfig.corsOrigins) ? appConfig.corsOrigins : [];

  const app = express();
  app.locals.config = appConfig;
  app.locals.db = db;

  app.use(express.json());
  app.use(express.text({ type: ['text/csv', 'application/csv'] }));

  app.use(cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (!allowedOrigins.length) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new AppError('Not allowed by CORS', 403, 'CORS_NOT_ALLOWED'));
    },
    credentials: true
  }));

  const authModule = createAuthModule({
    db,
    jwtSecret: appConfig.jwtSecret,
    tokenExpiresIn: appConfig.jwtExpiresIn
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authModule.router);
  app.use('/api/stations', createStationsRouter({ db, authenticate: authModule.authenticate }));
  app.use('/api/permits', createPermitsRouter({ db, authenticate: authModule.authenticate }));
  app.use('/api/stats', createStatsRouter({ db, authenticate: authModule.authenticate }));

  app.use((_req, _res, next) => {
    next(new AppError('Not Found', 404, 'NOT_FOUND'));
  });

  app.use(errorHandler);

  return app;
}

module.exports = createApp;

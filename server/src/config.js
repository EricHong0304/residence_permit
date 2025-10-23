const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

let envLoaded = false;

function loadEnv() {
  if (envLoaded) return;

  const root = path.join(__dirname, '..');
  const stagingEnv = path.join(root, '.env.staging');
  const defaultEnv = path.join(root, '.env');

  if (process.env.NODE_ENV === 'staging' && fs.existsSync(stagingEnv)) {
    dotenv.config({ path: stagingEnv });
  } else if (fs.existsSync(defaultEnv)) {
    dotenv.config({ path: defaultEnv });
  }

  envLoaded = true;
}

function normalizeOrigins(origins) {
  if (Array.isArray(origins)) {
    return origins.map(origin => origin.trim()).filter(Boolean);
  }
  if (typeof origins === 'string') {
    return origins.split(',').map(origin => origin.trim()).filter(Boolean);
  }
  return [];
}

function getConfig(overrides = {}) {
  const root = path.join(__dirname, '..');

  const envOrigins = normalizeOrigins(process.env.CORS_ORIGINS || '');
  const corsOrigins = overrides.corsOrigins !== undefined
    ? normalizeOrigins(overrides.corsOrigins)
    : envOrigins;

  return {
    port: overrides.port !== undefined ? Number(overrides.port) : Number(process.env.PORT || 3000),
    dbPath: overrides.dbPath || path.resolve(root, process.env.DB_PATH || './data/app.db'),
    jwtSecret: overrides.jwtSecret || process.env.JWT_SECRET || 'development-secret',
    jwtExpiresIn: overrides.jwtExpiresIn || process.env.JWT_EXPIRES_IN || '1h',
    corsOrigins
  };
}

module.exports = {
  loadEnv,
  getConfig
};

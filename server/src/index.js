const { loadEnv, getConfig } = require('./config');
const { createDatabase } = require('./db');
const createApp = require('./app');

loadEnv();

const config = getConfig();
const db = createDatabase({ dbPath: config.dbPath });
const app = createApp({ db, config });

const port = Number(config.port || 3000);

const server = app.listen(port, () => {
  console.log(`[server] NODE_ENV=${process.env.NODE_ENV || ''} listening on :${port}`);
});

function gracefulShutdown() {
  try {
    if (server) {
      server.close(() => {
        db.close();
        process.exit(0);
      });
    } else {
      db.close();
      process.exit(0);
    }
  } catch (err) {
    console.error('[server] Error during shutdown', err);
    process.exit(1);
  }
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

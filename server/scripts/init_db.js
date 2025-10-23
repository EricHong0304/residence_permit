const { loadEnv, getConfig } = require('../src/config');
const { createDatabase, DEFAULT_ADMIN_PASSWORD, DEFAULT_ADMIN_USERNAME } = require('../src/db');

function init() {
  loadEnv();
  const config = getConfig();
  const db = createDatabase({ dbPath: config.dbPath });

  console.log(`[init-db] Database ready at ${config.dbPath}`);
  console.log(`[init-db] Default admin credentials: ${DEFAULT_ADMIN_USERNAME}/${DEFAULT_ADMIN_PASSWORD}`);

  db.close();
}

init();

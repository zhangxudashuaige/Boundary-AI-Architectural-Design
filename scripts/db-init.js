const fs = require('fs/promises');
const path = require('path');

const { query, closeDatabasePool } = require('../src/config/database');

const schemaFilePath = path.resolve(__dirname, '..', 'database', 'init.sql');

const run = async () => {
  const schemaSql = await fs.readFile(schemaFilePath, 'utf8');

  await query(schemaSql);

  console.log(`Database schema applied from ${schemaFilePath}`);
};

run()
  .catch((error) => {
    console.error('Failed to apply database schema');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabasePool().catch(() => {});
  });

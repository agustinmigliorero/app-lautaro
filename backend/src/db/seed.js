const fs = require('fs');
const path = require('path');

const mysql = require('mysql2/promise');
const { env } = require('../config/env');

function listSqlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
}

async function runSeedFile(conn, filePath, filename) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const statements = sql
    .split(/;\s*$/m)
    .join(';')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`Running seed: ${filename}`);
  await conn.beginTransaction();
  try {
    for (const stmt of statements) {
      await conn.query(stmt);
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  }
}

async function seed() {
  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });
  try {
    const seedsDir = path.join(__dirname, '..', '..', 'seeds');
    const files = listSqlFiles(seedsDir);
    for (const filename of files) {
      const filePath = path.join(seedsDir, filename);
      await runSeedFile(conn, filePath, filename);
    }
    console.log('Seeding complete.');
  } finally {
    await conn.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});



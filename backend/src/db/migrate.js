const fs = require('fs');
const path = require('path');

const mysql = require('mysql2/promise');
const { env } = require('../config/env');

async function ensureMigrationsTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function listSqlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
}

async function getApplied(conn) {
  const [rows] = await conn.query(`SELECT filename FROM schema_migrations`);
  return new Set(rows.map((r) => r.filename));
}

async function applyFile(conn, filePath, filename) {
  const sql = fs.readFileSync(filePath, 'utf8');
  // mysql2 permite múltiples statements solo si se habilita; evitamos eso separando por `;`
  // y ejecutando statement por statement de forma simple.
  const statements = sql
    .split(/;\s*$/m)
    .join(';')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  await conn.beginTransaction();
  try {
    for (const stmt of statements) {
      await conn.query(stmt);
    }
    await conn.query(`INSERT INTO schema_migrations (filename) VALUES (?)`, [
      filename,
    ]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  }
}

async function migrate() {
  // Asegura que la DB exista (dev-friendly)
  {
    const adminConn = await mysql.createConnection({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
    });
    try {
      await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\``);
    } finally {
      await adminConn.end();
    }
  }

  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });
  try {
    await ensureMigrationsTable(conn);
    const applied = await getApplied(conn);

    const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
    const files = listSqlFiles(migrationsDir);

    for (const filename of files) {
      if (applied.has(filename)) continue;
      const filePath = path.join(migrationsDir, filename);
      console.log(`Applying migration: ${filename}`);
      await applyFile(conn, filePath, filename);
    }

    console.log('Migrations complete.');
  } finally {
    await conn.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});



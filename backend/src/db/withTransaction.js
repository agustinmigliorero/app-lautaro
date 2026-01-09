const { pool } = require("./pool");

/**
 * Ejecuta un callback dentro de una transacción.
 * Asegura commit/rollback y libera la conexión al finalizar.
 *
 * @template T
 * @param {(conn: import('mysql2/promise').PoolConnection) => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (e) {
    try {
      await conn.rollback();
    } catch {
      // ignore rollback errors
    }
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = { withTransaction };


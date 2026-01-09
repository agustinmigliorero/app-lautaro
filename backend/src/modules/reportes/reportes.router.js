const express = require("express");

const { pool } = require("../../db/pool");
const { authJwt } = require("../../middlewares/authJwt");
const { requireRole } = require("../../middlewares/requireRole");

const router = express.Router();

// Reporte resumido (Soporte/Admin)
router.get("/summary", authJwt, requireRole("Soporte"), async (req, res, next) => {
  try {
    const [[totals]] = await pool.query(
      `
      SELECT
        (SELECT COUNT(*) FROM Solicitudes) AS solicitudes_total,
        (SELECT COUNT(*) FROM Usuarios) AS usuarios_total,
        (SELECT COUNT(*) FROM Usuarios WHERE habilitado = TRUE) AS usuarios_habilitados,
        (SELECT COUNT(*) FROM Dispositivos) AS dispositivos_total,
        (SELECT COUNT(*) FROM Areas) AS areas_total,
        (SELECT COUNT(*) FROM DispositivoComponentes) AS componentes_total
      `
    );

    const [solPorEstado] = await pool.query(
      `SELECT estado, COUNT(*) AS total FROM Solicitudes GROUP BY estado ORDER BY total DESC`
    );
    const [solPorPrioridad] = await pool.query(
      `SELECT prioridad, COUNT(*) AS total FROM Solicitudes GROUP BY prioridad ORDER BY total DESC`
    );
    const [solPorMetodo] = await pool.query(
      `
      SELECT resolucion_metodo, COUNT(*) AS total
      FROM Solicitudes
      WHERE resolucion_metodo IS NOT NULL
      GROUP BY resolucion_metodo
      ORDER BY total DESC
      `
    );

    const [dispPorTipo] = await pool.query(
      `SELECT tipo, COUNT(*) AS total FROM Dispositivos GROUP BY tipo ORDER BY total DESC`
    );

    const [compPorTipo] = await pool.query(
      `SELECT tipo, COUNT(*) AS total FROM DispositivoComponentes GROUP BY tipo ORDER BY total DESC`
    );

    const [topAreas] = await pool.query(
      `
      SELECT
        a.id_area,
        a.nombre,
        (SELECT COUNT(*) FROM Usuarios u WHERE u.id_area = a.id_area) AS usuarios_total,
        (SELECT COUNT(*) FROM Dispositivos d WHERE d.id_area = a.id_area) AS dispositivos_total,
        (SELECT COUNT(*) FROM Solicitudes s WHERE s.id_area = a.id_area) AS solicitudes_total
      FROM Areas a
      ORDER BY solicitudes_total DESC, dispositivos_total DESC, usuarios_total DESC
      LIMIT 20
      `
    );

    res.json({
      totals,
      solicitudes: {
        por_estado: solPorEstado,
        por_prioridad: solPorPrioridad,
        por_resolucion_metodo: solPorMetodo,
      },
      dispositivos: { por_tipo: dispPorTipo },
      componentes: { por_tipo: compPorTipo },
      areas: { top: topAreas },
    });
  } catch (e) {
    next(e);
  }
});

module.exports = { reportesRouter: router };


const express = require("express");

const { pool } = require("../../db/pool");
const { authJwt } = require("../../middlewares/authJwt");
const { requireRole } = require("../../middlewares/requireRole");
const { httpError } = require("../../utils/httpError");

const router = express.Router();
const TIPOS_VALIDOS = new Set([
  "Celular",
  "Notebook",
  "Conectividad",
  "Impresora",
  "UPS",
  "PC Escritorio",
  "Otro",
]);

// Listar dispositivos (cualquier usuario autenticado)
router.get("/", authJwt, async (req, res, next) => {
  try {
    const { id_area, nro_patrimonio } = req.query || {};
    const where = [];
    const params = [];

    if (id_area) {
      where.push("d.id_area = ?");
      params.push(id_area);
    }
    if (nro_patrimonio) {
      where.push("d.nro_patrimonio = ?");
      params.push(nro_patrimonio);
    }

    const [rows] = await pool.query(
      `
      SELECT d.id_equipo, d.tipo, d.descripcion, d.id_area, d.nro_patrimonio, a.nombre AS area_nombre
      FROM Dispositivos d
      JOIN Areas a ON a.id_area = d.id_area
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY d.id_equipo DESC
      `,
      params
    );
    res.json({ items: rows });
  } catch (e) {
    next(e);
  }
});

// Detalle de dispositivo + componentes asignados (cualquier usuario autenticado)
router.get("/:id", authJwt, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw httpError(400, "id inválido");

    const [[dispositivo]] = await pool.query(
      `
      SELECT d.id_equipo, d.tipo, d.descripcion, d.id_area, d.nro_patrimonio, a.nombre AS area_nombre
      FROM Dispositivos d
      JOIN Areas a ON a.id_area = d.id_area
      WHERE d.id_equipo = ?
      `,
      [id]
    );
    if (!dispositivo) throw httpError(404, "Dispositivo no encontrado");

    const [componentes] = await pool.query(
      `
      SELECT
        cd.id_equipo, cd.id_componente, cd.fecha_asignacion, cd.fecha_baja,
        c.tipo AS componente_tipo, c.detalle AS componente_detalle
      FROM ComponentesDispositivos cd
      JOIN Componentes c ON c.id_componente = cd.id_componente
      WHERE cd.id_equipo = ?
      ORDER BY cd.fecha_baja IS NULL DESC, cd.fecha_asignacion DESC
      `,
      [id]
    );

    res.json({ dispositivo, componentes });
  } catch (e) {
    next(e);
  }
});

// Crear dispositivo (Soporte/Admin)
router.post("/", authJwt, requireRole("Soporte"), async (req, res, next) => {
  try {
    const { descripcion, id_area, nro_patrimonio, tipo } = req.body || {};
    if (!id_area) throw httpError(400, "id_area es requerido");

    const finalTipo = tipo || "Otro";
    if (!TIPOS_VALIDOS.has(String(finalTipo))) throw httpError(400, "tipo inválido");

    const [result] = await pool.query(
      `INSERT INTO Dispositivos (tipo, descripcion, id_area, nro_patrimonio) VALUES (?, ?, ?, ?)`,
      [finalTipo, descripcion || null, id_area, nro_patrimonio || null]
    );
    res.status(201).json({ id_equipo: result.insertId });
  } catch (e) {
    next(e);
  }
});

// Editar dispositivo (Soporte/Admin)
router.patch("/:id", authJwt, requireRole("Soporte"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw httpError(400, "id inválido");

    const { descripcion, id_area, nro_patrimonio, tipo } = req.body || {};
    const updates = [];
    const params = [];

    if (typeof tipo !== "undefined") {
      const v = String(tipo || "").trim();
      if (!v) throw httpError(400, "tipo es requerido");
      if (!TIPOS_VALIDOS.has(v)) throw httpError(400, "tipo inválido");
      updates.push("tipo = ?");
      params.push(v);
    }
    if (typeof descripcion !== "undefined") {
      updates.push("descripcion = ?");
      const v = String(descripcion || "").trim();
      params.push(v.length ? v : null);
    }
    if (typeof nro_patrimonio !== "undefined") {
      updates.push("nro_patrimonio = ?");
      const v = String(nro_patrimonio || "").trim();
      params.push(v.length ? v : null);
    }
    if (typeof id_area !== "undefined") {
      updates.push("id_area = ?");
      params.push(id_area);
    }

    if (!updates.length) throw httpError(400, "Nada para actualizar");

    // si cambia id_area, validar que exista
    if (typeof id_area !== "undefined") {
      const [[area]] = await pool.query(`SELECT id_area FROM Areas WHERE id_area = ?`, [id_area]);
      if (!area) throw httpError(400, "id_area inválido");
    }

    params.push(id);
    const [result] = await pool.query(
      `UPDATE Dispositivos SET ${updates.join(", ")} WHERE id_equipo = ?`,
      params
    );
    if (result.affectedRows === 0) throw httpError(404, "Dispositivo no encontrado");

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Asignar componente al dispositivo (Soporte/Admin)
router.post("/:id/componentes", authJwt, requireRole("Soporte"), async (req, res, next) => {
  try {
    const id_equipo = Number(req.params.id);
    const { id_componente, fecha_asignacion } = req.body || {};
    if (!id_equipo || Number.isNaN(id_equipo)) throw httpError(400, "id inválido");
    if (!id_componente) throw httpError(400, "id_componente es requerido");

    const [[disp]] = await pool.query(`SELECT id_equipo FROM Dispositivos WHERE id_equipo = ?`, [id_equipo]);
    if (!disp) throw httpError(404, "Dispositivo no encontrado");

    const [[comp]] = await pool.query(`SELECT id_componente FROM Componentes WHERE id_componente = ?`, [id_componente]);
    if (!comp) throw httpError(400, "id_componente inválido");

    await pool.query(
      `INSERT INTO ComponentesDispositivos (id_equipo, id_componente, fecha_asignacion, fecha_baja)
       VALUES (?, ?, ?, NULL)`,
      [id_equipo, id_componente, fecha_asignacion || new Date().toISOString().slice(0, 10)]
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Dar de baja (quitar) componente del dispositivo (Soporte/Admin)
router.patch(
  "/:id/componentes/:id_componente/baja",
  authJwt,
  requireRole("Soporte"),
  async (req, res, next) => {
    try {
      const id_equipo = Number(req.params.id);
      const id_componente = Number(req.params.id_componente);
      const { fecha_baja } = req.body || {};
      if (!id_equipo || Number.isNaN(id_equipo)) throw httpError(400, "id inválido");
      if (!id_componente || Number.isNaN(id_componente)) throw httpError(400, "id_componente inválido");

      const [result] = await pool.query(
        `UPDATE ComponentesDispositivos
         SET fecha_baja = ?
         WHERE id_equipo = ? AND id_componente = ?`,
        [fecha_baja || new Date().toISOString().slice(0, 10), id_equipo, id_componente]
      );
      if (result.affectedRows === 0) throw httpError(404, "Relación no encontrada");

      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
);

module.exports = { dispositivosRouter: router };



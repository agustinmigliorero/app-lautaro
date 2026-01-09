const express = require("express");

const { pool } = require("../../db/pool");
const { authJwt } = require("../../middlewares/authJwt");
const { requireRole } = require("../../middlewares/requireRole");
const { httpError } = require("../../utils/httpError");

const router = express.Router();
const TIPOS_VALIDOS = new Set(["Hardware", "Software", "Periférico"]);

// Listar componentes (cualquier usuario autenticado)
router.get("/", authJwt, async (req, res, next) => {
  try {
    const { tipo } = req.query || {};
    const where = [];
    const params = [];
    if (tipo) {
      where.push("c.tipo = ?");
      params.push(tipo);
    }
    const [rows] = await pool.query(
      `
      SELECT c.id_componente, c.tipo, c.detalle
      FROM Componentes c
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY c.id_componente DESC
      `,
      params
    );
    res.json({ items: rows });
  } catch (e) {
    next(e);
  }
});

// Crear componente (Soporte/Admin)
router.post("/", authJwt, requireRole("Soporte"), async (req, res, next) => {
  try {
    const { tipo, detalle } = req.body || {};
    if (!tipo) throw httpError(400, "tipo es requerido");
    if (!TIPOS_VALIDOS.has(String(tipo))) throw httpError(400, "tipo inválido");
    if (!detalle || String(detalle).trim().length === 0) throw httpError(400, "detalle es requerido");

    const [result] = await pool.query(
      `INSERT INTO Componentes (tipo, detalle) VALUES (?, ?)`,
      [String(tipo), String(detalle).trim()]
    );
    res.status(201).json({ id_componente: result.insertId });
  } catch (e) {
    next(e);
  }
});

// Editar componente (Soporte/Admin)
router.patch("/:id", authJwt, requireRole("Soporte"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw httpError(400, "id inválido");
    const { tipo, detalle } = req.body || {};

    const updates = [];
    const params = [];
    if (typeof tipo !== "undefined") {
      if (!TIPOS_VALIDOS.has(String(tipo))) throw httpError(400, "tipo inválido");
      updates.push("tipo = ?");
      params.push(String(tipo));
    }
    if (typeof detalle !== "undefined") {
      const v = String(detalle || "").trim();
      if (!v) throw httpError(400, "detalle es requerido");
      updates.push("detalle = ?");
      params.push(v);
    }
    if (!updates.length) throw httpError(400, "Nada para actualizar");

    params.push(id);
    const [result] = await pool.query(
      `UPDATE Componentes SET ${updates.join(", ")} WHERE id_componente = ?`,
      params
    );
    if (result.affectedRows === 0) throw httpError(404, "Componente no encontrado");

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = { componentesRouter: router };


const express = require("express");

const { pool } = require("../../db/pool");
const { authJwt } = require("../../middlewares/authJwt");
const { requireRole } = require("../../middlewares/requireRole");
const { httpError } = require("../../utils/httpError");

const router = express.Router();

// Listar diagnósticos (cualquier usuario autenticado)
router.get("/", authJwt, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_diagnostico, descripcion FROM Diagnostico ORDER BY id_diagnostico DESC`
    );
    res.json({ items: rows });
  } catch (e) {
    next(e);
  }
});

// Crear diagnóstico (Soporte/Admin)
router.post("/", authJwt, requireRole("Soporte"), async (req, res, next) => {
  try {
    const { descripcion } = req.body || {};
    if (!descripcion) throw httpError(400, "descripcion es requerida");

    const [result] = await pool.query(
      `INSERT INTO Diagnostico (descripcion) VALUES (?)`,
      [descripcion]
    );
    res.status(201).json({ id_diagnostico: result.insertId });
  } catch (e) {
    next(e);
  }
});

// Editar diagnóstico (Soporte/Admin)
router.patch("/:id", authJwt, requireRole("Soporte"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { descripcion } = req.body || {};
    if (!id || Number.isNaN(id)) throw httpError(400, "id inválido");
    if (!descripcion || String(descripcion).trim().length === 0) {
      throw httpError(400, "descripcion es requerida");
    }

    const [result] = await pool.query(
      `UPDATE Diagnostico SET descripcion = ? WHERE id_diagnostico = ?`,
      [String(descripcion).trim(), id]
    );
    if (result.affectedRows === 0) throw httpError(404, "Diagnóstico no encontrado");

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = { diagnosticosRouter: router };



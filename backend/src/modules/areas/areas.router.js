const express = require("express");

const { pool } = require("../../db/pool");
const { authJwt } = require("../../middlewares/authJwt");
const { requireRole } = require("../../middlewares/requireRole");
const { httpError } = require("../../utils/httpError");

const router = express.Router();

// Listar áreas (cualquier usuario autenticado)
router.get("/", authJwt, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_area, nombre, descripcion FROM Areas ORDER BY nombre ASC`
    );
    res.json({ items: rows });
  } catch (e) {
    next(e);
  }
});

// Crear área (Admin)
router.post("/", authJwt, requireRole("Admin"), async (req, res, next) => {
  try {
    const { nombre, descripcion } = req.body || {};
    if (!nombre) throw httpError(400, "nombre es requerido");

    const [result] = await pool.query(
      `INSERT INTO Areas (nombre, descripcion) VALUES (?, ?)`,
      [nombre, descripcion || null]
    );
    res.status(201).json({ id_area: result.insertId });
  } catch (e) {
    next(e);
  }
});

// Actualizar área (Admin)
router.patch("/:id", authJwt, requireRole("Admin"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { nombre, descripcion } = req.body || {};

    if (!nombre && typeof descripcion === "undefined") {
      throw httpError(400, "Debe enviar nombre y/o descripcion");
    }

    const updates = [];
    const params = [];
    if (nombre) {
      updates.push("nombre = ?");
      params.push(nombre);
    }
    if (typeof descripcion !== "undefined") {
      updates.push("descripcion = ?");
      params.push(descripcion || null);
    }
    params.push(id);

    const [result] = await pool.query(
      `UPDATE Areas SET ${updates.join(", ")} WHERE id_area = ?`,
      params
    );
    if (result.affectedRows === 0) throw httpError(404, "Área no encontrada");

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = { areasRouter: router };



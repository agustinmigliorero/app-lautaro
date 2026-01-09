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

// Detalle de área (cualquier usuario autenticado)
router.get("/:id", authJwt, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw httpError(400, "id inválido");

    const [[area]] = await pool.query(
      `SELECT id_area, nombre, descripcion FROM Areas WHERE id_area = ?`,
      [id]
    );
    if (!area) throw httpError(404, "Área no encontrada");

    const [[stats]] = await pool.query(
      `
      SELECT
        (SELECT COUNT(*) FROM Usuarios u WHERE u.id_area = ?) AS usuarios_total,
        (SELECT COUNT(*) FROM Dispositivos d WHERE d.id_area = ?) AS dispositivos_total
      `,
      [id, id]
    );

    const rol = req.user?.rol || "Empleado";
    if (rol === "Soporte" || rol === "Admin") {
      const [usuarios] = await pool.query(
        `
        SELECT
          u.id_usuario, u.apellido_nombre, u.nombre_usuario, u.legajo,
          u.perfil_rol, u.habilitado, u.id_area
        FROM Usuarios u
        WHERE u.id_area = ?
        ORDER BY u.apellido_nombre ASC
        `,
        [id]
      );
      const [dispositivos] = await pool.query(
        `
        SELECT d.id_equipo, d.tipo, d.descripcion, d.id_area, d.nro_patrimonio
        FROM Dispositivos d
        WHERE d.id_area = ?
        ORDER BY d.id_equipo DESC
        `,
        [id]
      );
      return res.json({ area, stats, usuarios, dispositivos });
    }

    res.json({ area, stats });
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



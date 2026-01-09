const express = require("express");
const bcrypt = require("bcrypt");

const { pool } = require("../../db/pool");
const { authJwt } = require("../../middlewares/authJwt");
const { requireRole } = require("../../middlewares/requireRole");
const { httpError } = require("../../utils/httpError");

const router = express.Router();

function normalizeRole(perfil_rol) {
  const r = perfil_rol || "Empleado";
  if (!["Empleado", "Soporte", "Admin"].includes(r)) return null;
  return r;
}

// Listar usuarios (Soporte/Admin) - útil para asignaciones
router.get("/", authJwt, requireRole("Soporte"), async (req, res, next) => {
  try {
    const { id_area, perfil_rol, habilitado } = req.query || {};

    const where = [];
    const params = [];

    if (id_area) {
      where.push("u.id_area = ?");
      params.push(id_area);
    }
    if (perfil_rol) {
      where.push("u.perfil_rol = ?");
      params.push(perfil_rol);
    }
    if (typeof habilitado !== "undefined") {
      where.push("u.habilitado = ?");
      params.push(String(habilitado) === "true" ? 1 : 0);
    }

    const [rows] = await pool.query(
      `
      SELECT
        u.id_usuario, u.apellido_nombre, u.nombre_usuario, u.legajo, u.perfil_rol, u.habilitado, u.id_area,
        a.nombre AS area_nombre
      FROM Usuarios u
      JOIN Areas a ON a.id_area = u.id_area
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY u.apellido_nombre ASC
      `,
      params
    );
    res.json({ items: rows });
  } catch (e) {
    next(e);
  }
});

// Detalle de usuario (Soporte/Admin)
router.get("/:id", authJwt, requireRole("Soporte"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) throw httpError(400, "id inválido");

    const [[user]] = await pool.query(
      `
      SELECT
        u.id_usuario, u.apellido_nombre, u.nombre_usuario, u.legajo,
        u.perfil_rol, u.habilitado, u.id_area,
        a.nombre AS area_nombre,
        u.created_at, u.updated_at
      FROM Usuarios u
      JOIN Areas a ON a.id_area = u.id_area
      WHERE u.id_usuario = ?
      `,
      [id]
    );
    if (!user) throw httpError(404, "Usuario no encontrado");

    const [[stats]] = await pool.query(
      `
      SELECT
        (SELECT COUNT(*) FROM Solicitudes s WHERE s.usuario_solicitud = ?) AS solicitudes_como_solicitante,
        (SELECT COUNT(*) FROM Solicitudes s WHERE s.usuario_generador = ?) AS solicitudes_creadas,
        (SELECT COUNT(*) FROM Solicitudes s WHERE s.usuario_asignado = ?) AS solicitudes_asignadas
      `,
      [id, id, id]
    );

    res.json({ user, stats });
  } catch (e) {
    next(e);
  }
});

// Crear usuario (Soporte/Admin)
router.post("/", authJwt, requireRole("Soporte"), async (req, res, next) => {
  try {
    const { apellido_nombre, nombre_usuario, legajo, perfil_rol, habilitado, id_area, password } =
      req.body || {};

    if (!apellido_nombre || !nombre_usuario || !id_area || !password) {
      throw httpError(
        400,
        "apellido_nombre, nombre_usuario, id_area y password son requeridos"
      );
    }

    const role = normalizeRole(perfil_rol);
    if (!role) throw httpError(400, "perfil_rol inválido");

    // Regla: Soporte puede crear usuarios, pero no puede crear Admins.
    // (Admin puede crear cualquier rol.)
    if ((req.user?.rol || "Empleado") === "Soporte" && role === "Admin") {
      throw httpError(403, "Forbidden");
    }

    const password_hash = await bcrypt.hash(String(password), 10);

    const [result] = await pool.query(
      `INSERT INTO Usuarios (apellido_nombre, nombre_usuario, legajo, perfil_rol, habilitado, id_area, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        apellido_nombre,
        nombre_usuario,
        legajo ? String(legajo).trim() : null,
        role,
        typeof habilitado === "undefined" ? 1 : habilitado ? 1 : 0,
        id_area,
        password_hash,
      ]
    );

    res.status(201).json({ id_usuario: result.insertId });
  } catch (e) {
    next(e);
  }
});

// Actualizar usuario (Admin): habilitado/rol/area
router.patch("/:id", authJwt, requireRole("Admin"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { apellido_nombre, nombre_usuario, perfil_rol, habilitado, id_area, legajo } =
      req.body || {};

    const updates = [];
    const params = [];

    if (typeof apellido_nombre !== "undefined") {
      const v = String(apellido_nombre || "").trim();
      if (!v) throw httpError(400, "apellido_nombre es requerido");
      updates.push("apellido_nombre = ?");
      params.push(v);
    }

    if (typeof nombre_usuario !== "undefined") {
      const v = String(nombre_usuario || "").trim();
      if (!v) throw httpError(400, "nombre_usuario es requerido");
      updates.push("nombre_usuario = ?");
      params.push(v);
    }

    if (typeof perfil_rol !== "undefined") {
      const role = normalizeRole(perfil_rol);
      if (!role) throw httpError(400, "perfil_rol inválido");
      updates.push("perfil_rol = ?");
      params.push(role);
    }

    if (typeof habilitado !== "undefined") {
      updates.push("habilitado = ?");
      params.push(habilitado ? 1 : 0);
    }

    if (typeof id_area !== "undefined") {
      updates.push("id_area = ?");
      params.push(id_area);
    }

    if (typeof legajo !== "undefined") {
      updates.push("legajo = ?");
      const v = String(legajo || "").trim();
      params.push(v.length ? v : null);
    }

    if (!updates.length) throw httpError(400, "Nada para actualizar");

    params.push(id);
    const [result] = await pool.query(
      `UPDATE Usuarios SET ${updates.join(", ")} WHERE id_usuario = ?`,
      params
    );
    if (result.affectedRows === 0) throw httpError(404, "Usuario no encontrado");

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Reset password (Admin)
router.patch(
  "/:id/password",
  authJwt,
  requireRole("Admin"),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const { password } = req.body || {};
      if (!password) throw httpError(400, "password es requerido");

      const password_hash = await bcrypt.hash(String(password), 10);
      const [result] = await pool.query(
        `UPDATE Usuarios SET password_hash = ? WHERE id_usuario = ?`,
        [password_hash, id]
      );
      if (result.affectedRows === 0) throw httpError(404, "Usuario no encontrado");

      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
);

module.exports = { usuariosRouter: router };



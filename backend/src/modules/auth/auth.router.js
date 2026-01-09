const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { pool } = require("../../db/pool");
const { env } = require("../../config/env");
const { httpError } = require("../../utils/httpError");
const { authJwt } = require("../../middlewares/authJwt");

const router = express.Router();

router.post("/login", async (req, res, next) => {
  try {
    const { nombre_usuario, password } = req.body || {};
    if (!nombre_usuario || !password)
      throw httpError(400, "nombre_usuario y password son requeridos");

    const [rows] = await pool.query(
      `SELECT id_usuario, apellido_nombre, nombre_usuario, legajo, perfil_rol, habilitado, id_area, password_hash
       FROM Usuarios
       WHERE nombre_usuario = ?`,
      [nombre_usuario]
    );

    const user = rows[0];
    if (!user || !user.habilitado)
      throw httpError(401, "Credenciales inválidas");

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw httpError(401, "Credenciales inválidas");

    const payload = {
      sub: user.id_usuario,
      rol: user.perfil_rol || "Empleado",
      id_area: user.id_area,
      nombre_usuario: user.nombre_usuario,
    };

    const access_token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });

    res.json({
      access_token,
      user: {
        id_usuario: user.id_usuario,
        apellido_nombre: user.apellido_nombre,
        nombre_usuario: user.nombre_usuario,
        legajo: user.legajo,
        perfil_rol: payload.rol,
        id_area: user.id_area,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.get("/me", authJwt, async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const [rows] = await pool.query(
      `SELECT id_usuario, apellido_nombre, nombre_usuario, legajo, perfil_rol, habilitado, id_area
       FROM Usuarios
       WHERE id_usuario = ?`,
      [userId]
    );
    const user = rows[0];
    if (!user) throw httpError(404, "Usuario no encontrado");
    res.json({ user });
  } catch (e) {
    next(e);
  }
});

module.exports = { authRouter: router };

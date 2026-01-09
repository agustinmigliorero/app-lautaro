const express = require("express");

const { pool } = require("../../db/pool");
const { withTransaction } = require("../../db/withTransaction");
const { authJwt } = require("../../middlewares/authJwt");
const { requireRole } = require("../../middlewares/requireRole");
const { httpError } = require("../../utils/httpError");

const router = express.Router();
const ESTADOS_VALIDOS = new Set(["Iniciada", "En Proceso", "Finalizada"]);
const METODOS_VALIDOS = new Set([
  "Laboratorio",
  "Telefónica",
  "Remota",
  "Desplazamiento",
]);
const PRIORIDADES_VALIDAS = new Set([
  "Muy bajo",
  "Bajo",
  "Medio",
  "Alto",
  "Urgente",
]);

// Crear solicitud (cualquier usuario autenticado)
router.post("/", authJwt, async (req, res, next) => {
  try {
    const {
      descripcion_falla,
      usuario_solicitud,
      usuario_generador,
      id_equipo,
      id_area,
      prioridad,
    } = req.body || {};

    if (!descripcion_falla || !usuario_solicitud || !usuario_generador) {
      throw httpError(
        400,
        "descripcion_falla, usuario_solicitud y usuario_generador son requeridos"
      );
    }

    // Regla simple: el generador debe coincidir con el usuario autenticado
    if (Number(usuario_generador) !== Number(req.user.sub)) {
      throw httpError(403, "usuario_generador debe ser el usuario autenticado");
    }

    const prioridadFinal = prioridad || "Medio";
    if (!PRIORIDADES_VALIDAS.has(String(prioridadFinal))) {
      throw httpError(400, "prioridad inválida");
    }

    const id_solicitud = await withTransaction(async (conn) => {
      // Validaciones de FK para errores más claros
      const [[uSol]] = await conn.query(
        `SELECT id_usuario FROM Usuarios WHERE id_usuario = ? AND habilitado = TRUE`,
        [usuario_solicitud]
      );
      if (!uSol) throw httpError(400, "usuario_solicitud inválido");

      let equipoId = null;
      let areaId = null;

      if (
        typeof id_equipo !== "undefined" &&
        id_equipo !== null &&
        String(id_equipo).trim() !== ""
      ) {
        const [[equipo]] = await conn.query(
          `SELECT id_equipo, id_area FROM Dispositivos WHERE id_equipo = ?`,
          [id_equipo]
        );
        if (!equipo) throw httpError(400, "id_equipo inválido");
        equipoId = equipo.id_equipo;
        areaId = equipo.id_area;
      } else if (
        typeof id_area !== "undefined" &&
        id_area !== null &&
        String(id_area).trim() !== ""
      ) {
        const [[area]] = await conn.query(
          `SELECT id_area FROM Areas WHERE id_area = ?`,
          [id_area]
        );
        if (!area) throw httpError(400, "id_area inválido");
        areaId = area.id_area;
      }

      const [result] = await conn.query(
        `INSERT INTO Solicitudes (descripcion_falla, prioridad, usuario_solicitud, usuario_generador, id_area, id_equipo, estado)
         VALUES (?, ?, ?, ?, ?, ?, 'Iniciada')`,
        [
          descripcion_falla,
          prioridadFinal,
          usuario_solicitud,
          usuario_generador,
          areaId,
          equipoId,
        ]
      );

      // Evento de creación
      await conn.query(
        `INSERT INTO Eventos (id_solicitud, observaciones, id_usuario)
         VALUES (?, ?, ?)`,
        [result.insertId, "Ticket creado", req.user.sub]
      );

      return result.insertId;
    });

    res.status(201).json({ id_solicitud });
  } catch (e) {
    next(e);
  }
});

// Listar solicitudes (Empleado ve las suyas; Soporte/Admin ven todas)
router.get("/", authJwt, async (req, res, next) => {
  try {
    const {
      estado,
      usuario_asignado,
      usuario_solicitud,
      from,
      to,
      page,
      pageSize,
      sortBy,
      sortDir,
    } = req.query || {};

    const where = [];
    const params = [];

    // filtros
    if (estado) {
      where.push("s.estado = ?");
      params.push(estado);
    }
    if (usuario_asignado) {
      where.push("s.usuario_asignado = ?");
      params.push(usuario_asignado);
    }
    if (usuario_solicitud) {
      where.push("s.usuario_solicitud = ?");
      params.push(usuario_solicitud);
    }
    if (from) {
      where.push("s.fecha >= ?");
      params.push(from);
    }
    if (to) {
      where.push("s.fecha <= ?");
      params.push(to);
    }

    const rol = req.user.rol || "Empleado";
    if (rol === "Empleado") {
      where.push("(s.usuario_solicitud = ? OR s.usuario_generador = ?)");
      params.push(req.user.sub, req.user.sub);
    }

    // paginación
    const _page = Math.max(1, Number(page || 1) || 1);
    const _pageSize = Math.min(100, Math.max(1, Number(pageSize || 10) || 10));
    const offset = (_page - 1) * _pageSize;

    // sorting (whitelist)
    const SORTABLE = {
      id_solicitud: "s.id_solicitud",
      fecha: "s.fecha",
      estado: "s.estado",
      prioridad: "s.prioridad",
      id_area: "s.id_area",
      id_equipo: "s.id_equipo",
      usuario_asignado: "s.usuario_asignado",
    };
    const sortCol = SORTABLE[String(sortBy || "fecha")] || SORTABLE.fecha;
    const sortDirection =
      String(sortDir || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";

    // counts por estado (mismo scope de seguridad/fecha/filtros, pero sin el filtro estado)
    const whereNoEstado = where.filter((w) => w !== "s.estado = ?");
    const paramsNoEstado = (() => {
      if (!estado) return params;
      // removemos el primer param correspondiente a estado
      const idx = where.indexOf("s.estado = ?");
      if (idx === -1) return params;
      const copy = [...params];
      copy.splice(idx, 1);
      return copy;
    })();

    const countsSql = `
      SELECT s.estado, COUNT(*) AS total
      FROM Solicitudes s
      ${whereNoEstado.length ? "WHERE " + whereNoEstado.join(" AND ") : ""}
      GROUP BY s.estado
    `;

    const countSql = `
      SELECT COUNT(*) AS total
      FROM Solicitudes s
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
    `;

    const sql = `
      SELECT
        s.id_solicitud, s.fecha, s.descripcion_falla, s.usuario_solicitud, s.usuario_generador,
        s.usuario_asignado, s.id_area, s.id_equipo, s.estado, s.prioridad, s.id_diagnostico, s.resolucion_metodo,
        d.descripcion AS diagnostico_descripcion,
        a.nombre AS area_nombre
      FROM Solicitudes s
      LEFT JOIN Diagnostico d ON d.id_diagnostico = s.id_diagnostico
      LEFT JOIN Areas a ON a.id_area = s.id_area
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY ${sortCol} ${sortDirection}
      LIMIT ?
      OFFSET ?
    `;

    const [[totalRow]] = await pool.query(countSql, params);
    const [countRows] = await pool.query(countsSql, paramsNoEstado);
    const counts = { Iniciada: 0, "En Proceso": 0, Finalizada: 0 };
    for (const r of countRows) counts[r.estado] = Number(r.total) || 0;

    const [rows] = await pool.query(sql, [...params, _pageSize, offset]);
    res.json({
      items: rows,
      meta: {
        total: Number(totalRow.total) || 0,
        page: _page,
        pageSize: _pageSize,
        counts,
      },
    });
  } catch (e) {
    next(e);
  }
});

// Detalle + eventos
router.get("/:id", authJwt, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [rows] = await pool.query(
      `SELECT
        s.id_solicitud, s.fecha, s.descripcion_falla, s.usuario_solicitud, s.usuario_generador,
        s.usuario_asignado, s.id_area, s.id_equipo, s.estado, s.prioridad, s.id_diagnostico, s.resolucion_metodo,
        d.descripcion AS diagnostico_descripcion,
        a.nombre AS area_nombre
       FROM Solicitudes s
       LEFT JOIN Diagnostico d ON d.id_diagnostico = s.id_diagnostico
       LEFT JOIN Areas a ON a.id_area = s.id_area
       WHERE s.id_solicitud = ?`,
      [id]
    );
    const solicitud = rows[0];
    if (!solicitud) throw httpError(404, "Solicitud no encontrada");

    const rol = req.user.rol || "Empleado";
    if (
      rol === "Empleado" &&
      Number(solicitud.usuario_solicitud) !== Number(req.user.sub) &&
      Number(solicitud.usuario_generador) !== Number(req.user.sub)
    ) {
      throw httpError(403, "Forbidden");
    }

    const [eventos] = await pool.query(
      `SELECT id_evento, id_solicitud, fecha_evento, observaciones, id_usuario
       FROM Eventos
       WHERE id_solicitud = ?
       ORDER BY fecha_evento ASC`,
      [id]
    );

    res.json({ solicitud, eventos });
  } catch (e) {
    next(e);
  }
});

// Asignar/reasignar (Soporte/Admin)
router.patch(
  "/:id/asignar",
  authJwt,
  requireRole("Soporte"),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const { usuario_asignado } = req.body || {};
      if (!usuario_asignado)
        throw httpError(400, "usuario_asignado es requerido");

      await withTransaction(async (conn) => {
        const [rows] = await conn.query(
          `SELECT estado FROM Solicitudes WHERE id_solicitud = ? FOR UPDATE`,
          [id]
        );
        const solicitud = rows[0];
        if (!solicitud) throw httpError(404, "Solicitud no encontrada");

        if (solicitud.estado === "Finalizada") {
          throw httpError(
            409,
            "No se puede reasignar una solicitud Finalizada (cambie el estado primero)"
          );
        }

        // Validar que el asignado exista y sea Soporte/Admin
        const [urows] = await conn.query(
          `SELECT perfil_rol, habilitado FROM Usuarios WHERE id_usuario = ?`,
          [usuario_asignado]
        );
        const asignado = urows[0];
        if (!asignado || !asignado.habilitado)
          throw httpError(400, "usuario_asignado inválido");
        if (!["Soporte", "Admin"].includes(asignado.perfil_rol || "Empleado")) {
          throw httpError(
            400,
            "usuario_asignado debe tener rol Soporte o Admin"
          );
        }

        // Si estaba Iniciada, al asignar pasa a En Proceso (flujo típico)
        const updates = ["usuario_asignado = ?"];
        const params = [usuario_asignado];
        if (solicitud.estado === "Iniciada") {
          updates.push("estado = 'En Proceso'");
        }
        params.push(id);

        await conn.query(
          `UPDATE Solicitudes SET ${updates.join(", ")} WHERE id_solicitud = ?`,
          params
        );

        await conn.query(
          `INSERT INTO Eventos (id_solicitud, observaciones, id_usuario)
           VALUES (?, ?, ?)`,
          [id, `Asignado a usuario ${usuario_asignado}`, req.user.sub]
        );
      });

      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
);

// Cambiar estado (Soporte/Admin)
router.patch(
  "/:id/estado",
  authJwt,
  requireRole("Soporte"),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const { estado, id_diagnostico, resolucion_metodo } = req.body || {};
      if (!estado) throw httpError(400, "estado es requerido");
      if (!ESTADOS_VALIDOS.has(estado)) throw httpError(400, "estado inválido");

      await withTransaction(async (conn) => {
        const [rows] = await conn.query(
          `SELECT estado AS estado_actual, id_diagnostico
           FROM Solicitudes
           WHERE id_solicitud = ?
           FOR UPDATE`,
          [id]
        );
        const solicitud = rows[0];
        if (!solicitud) throw httpError(404, "Solicitud no encontrada");

        if (estado === "Finalizada" && !id_diagnostico) {
          throw httpError(400, "id_diagnostico es obligatorio para finalizar");
        }
        if (estado === "Finalizada" && !resolucion_metodo) {
          throw httpError(
            400,
            "resolucion_metodo es obligatorio para finalizar"
          );
        }
        if (
          typeof resolucion_metodo !== "undefined" &&
          resolucion_metodo !== null &&
          !METODOS_VALIDOS.has(String(resolucion_metodo))
        ) {
          throw httpError(400, "resolucion_metodo inválido");
        }
        if (estado === "Finalizada") {
          const [drows] = await conn.query(
            `SELECT id_diagnostico FROM Diagnostico WHERE id_diagnostico = ?`,
            [id_diagnostico]
          );
          if (!drows[0]) throw httpError(400, "id_diagnostico inválido");
        }

        const updates = [];
        const params = [];

        updates.push("estado = ?");
        params.push(estado);

        if (estado === "Finalizada") {
          updates.push("id_diagnostico = ?");
          params.push(id_diagnostico);
          updates.push("resolucion_metodo = ?");
          params.push(resolucion_metodo);
        } else if (solicitud.estado_actual === "Finalizada") {
          // Si se reabre, limpiamos el diagnóstico opcionalmente (auditable por eventos)
          updates.push("id_diagnostico = NULL");
          updates.push("resolucion_metodo = NULL");
        }

        params.push(id);

        await conn.query(
          `UPDATE Solicitudes SET ${updates.join(", ")} WHERE id_solicitud = ?`,
          params
        );

        await conn.query(
          `INSERT INTO Eventos (id_solicitud, observaciones, id_usuario)
           VALUES (?, ?, ?)`,
          [
            id,
            `Cambio de estado: ${solicitud.estado_actual} -> ${estado}${
              estado === "Finalizada"
                ? ` (Resolución: ${resolucion_metodo})`
                : ""
            }`,
            req.user.sub,
          ]
        );
      });

      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
);

// Agregar una observación/evento (Empleado: solo si es solicitante/generador; Soporte/Admin: cualquiera)
router.post("/:id/eventos", authJwt, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { observaciones } = req.body || {};
    if (!observaciones || String(observaciones).trim().length === 0) {
      throw httpError(400, "observaciones es requerido");
    }

    const [rows] = await pool.query(
      `SELECT usuario_solicitud, usuario_generador, usuario_asignado
       FROM Solicitudes
       WHERE id_solicitud = ?`,
      [id]
    );
    const solicitud = rows[0];
    if (!solicitud) throw httpError(404, "Solicitud no encontrada");

    const rol = req.user.rol || "Empleado";
    const userId = Number(req.user.sub);

    if (rol === "Empleado") {
      const ok =
        Number(solicitud.usuario_solicitud) === userId ||
        Number(solicitud.usuario_generador) === userId ||
        Number(solicitud.usuario_asignado) === userId;
      if (!ok) throw httpError(403, "Forbidden");
    }

    await pool.query(
      `INSERT INTO Eventos (id_solicitud, observaciones, id_usuario)
       VALUES (?, ?, ?)`,
      [id, String(observaciones).trim(), req.user.sub]
    );

    res.status(201).json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = { solicitudesRouter: router };

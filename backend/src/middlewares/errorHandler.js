function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-unused-vars
  const _next = next;

  // Zod validation errors (si se usan en algún router)
  if (err && err.name === "ZodError") {
    return res.status(400).json({
      error: "Validation Error",
      details: err.issues || err.errors,
    });
  }

  // MySQL common errors -> respuestas claras (sin 500 opaco)
  if (err && typeof err === "object" && err.code) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Duplicado" });
    }
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ error: "Referencia inválida" });
    }
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({ error: "No se puede completar: registro en uso" });
    }
    if (err.code === "ER_BAD_NULL_ERROR") {
      return res.status(400).json({ error: "Falta un dato requerido" });
    }
    if (err.code === "ER_DATA_TOO_LONG") {
      return res.status(400).json({ error: "Dato demasiado largo" });
    }
  }

  const status = err.statusCode || err.status || 500;
  const message = err.expose ? err.message : "Internal Server Error";

  if (process.env.NODE_ENV !== 'test') {
    // Log mínimo para debug; si luego querés, lo reemplazamos por un logger.
    console.error(err);
  }

  res.status(status).json({
    error: message,
    ...(err && typeof err === "object" && err.payload ? { payload: err.payload } : {}),
  });
}

module.exports = { errorHandler };



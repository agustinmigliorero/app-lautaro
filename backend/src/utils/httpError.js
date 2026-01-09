function httpError(statusCode, message, { expose = true } = {}) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.expose = expose;
  return err;
}

module.exports = { httpError };



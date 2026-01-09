const { httpError } = require('../utils/httpError');

const ROLE_ORDER = {
  Empleado: 1,
  Soporte: 2,
  Admin: 3,
};

function requireRole(minRole) {
  return (req, res, next) => {
    const role = req.user?.rol;
    if (!role || !(role in ROLE_ORDER)) return next(httpError(403, 'Forbidden'));
    if (ROLE_ORDER[role] < ROLE_ORDER[minRole]) return next(httpError(403, 'Forbidden'));
    return next();
  };
}

module.exports = { requireRole };



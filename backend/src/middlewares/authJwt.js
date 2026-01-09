const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { httpError } = require('../utils/httpError');

function authJwt(req, res, next) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) {
    return next(httpError(401, 'Unauthorized'));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return next(httpError(401, 'Unauthorized'));
  }
}

module.exports = { authJwt };



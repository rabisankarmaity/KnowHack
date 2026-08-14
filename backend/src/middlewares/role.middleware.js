const ApiError = require('../utils/ApiError');
const ROLES = ['guest', 'student', 'creator', 'admin'];
function requireRole(...allowed) {
  return (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    if (!allowed.includes(req.user.role)) return next(new ApiError(403, 'Forbidden'));
    next();
  };
}
module.exports = { requireRole, ROLES };

const { verifyAccessToken } = require('../config/jwt');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

async function requireAuth(req, _res, next) {
  try {
    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7) : null;
    const token = bearer || req.cookies?.accessToken;
    if (!token) throw new ApiError(401, 'Authentication required');
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub);
    if (!user) throw new ApiError(401, 'User no longer exists');
    req.user = user;
    req.auth = { sub: user.id, role: user.role };
    next();
  } catch (err) { next(err); }
}

async function optionalAuth(req, _res, next) {
  try {
    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7) : null;
    const token = bearer || req.cookies?.accessToken;
    if (!token) return next();
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub);
    if (user) { req.user = user; req.auth = { sub: user.id, role: user.role }; }
  } catch { /* ignore */ }
  next();
}

module.exports = { requireAuth, optionalAuth };

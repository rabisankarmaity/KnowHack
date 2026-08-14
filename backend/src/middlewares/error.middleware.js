const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

function isCloudinaryError(err) {
  return Boolean(
    err &&
    (err.name === 'UnexpectedResponse' || typeof err.http_code === 'number' ||
      (Array.isArray(err.storageErrors) && err.storageErrors.length && err.storageErrors.some((e) => typeof e?.http_code === 'number'))),
  );
}

function cloudinaryMessage(err) {
  const first = Array.isArray(err.storageErrors) && err.storageErrors.length
    ? err.storageErrors[0]
    : err;
  const code = first?.http_code || err.http_code;
  if (code === 401 || code === 403) {
    return 'File storage upload is not authorized. Check Cloudinary credentials and API key permissions.';
  }
  if (code === 404) return 'File storage upload failed: cloud or folder not found.';
  return (first?.message && `File storage upload failed: ${first.message}`) || 'File upload failed.';
}

function notFoundHandler(req, _res, next) {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found`));
}

function errorHandler(err, _req, res, _next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err.name === 'ValidationError') { status = 400; message = 'Validation failed'; details = err.errors; }
  if (err.name === 'CastError') { status = 400; message = `Invalid ${err.path}`; }
  if (err.code === 11000) { status = 409; message = 'Duplicate value'; details = err.keyValue; }
  if (err.name === 'JsonWebTokenError') { status = 401; message = 'Invalid token'; }
  if (err.name === 'TokenExpiredError') { status = 401; message = 'Token expired'; }
  if (err.name === 'MulterError') { status = 400; message = err.message; }
  if (isCloudinaryError(err)) { status = 502; message = cloudinaryMessage(err); }

  if (status >= 500) logger.error(err);
  res.status(status).json({
    success: false,
    message,
    ...(details ? { errors: details } : {}),
    ...(process.env.NODE_ENV !== 'production' && err.stack ? { stack: err.stack } : {}),
  });
}

module.exports = { notFoundHandler, errorHandler };

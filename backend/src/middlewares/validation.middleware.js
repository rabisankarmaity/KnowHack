const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');
function validate(req, _res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  next(new ApiError(422, 'Validation failed',
    errors.array().map((e) => ({ field: e.path, message: e.msg }))));
}
module.exports = { validate };

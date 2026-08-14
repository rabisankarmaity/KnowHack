const { body } = require('express-validator');

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

const registerRules = [
  body('name').isString().trim().isLength({ min: 2, max: 100 }),
  body('username').isString().trim().toLowerCase().matches(/^[a-z0-9_.-]{3,30}$/)
    .withMessage('Username must be 3-30 chars: a-z, 0-9, _ . -'),
  body('email').isEmail().normalizeEmail(),
  body('password').matches(PASSWORD_RULE)
    .withMessage('Password needs 8+ chars incl. upper, lower, number, special'),
];

const loginRules = [
  body('emailOrUsername').isString().trim().notEmpty(),
  body('password').isString().notEmpty(),
  body('remember').optional().isBoolean().toBoolean(),
];

const forgotRules = [body('email').isEmail().normalizeEmail()];

const resetRules = [
  body('token').isString().isLength({ min: 20 }),
  body('password').matches(PASSWORD_RULE),
];

module.exports = { registerRules, loginRules, forgotRules, resetRules, PASSWORD_RULE };

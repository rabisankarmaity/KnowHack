const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validation.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const { authLimiter } = require('../middlewares/rateLimiter');
const V = require('../validators/auth.validator');

router.post('/register', authLimiter, V.registerRules, validate, ctrl.register);
router.post('/login', authLimiter, V.loginRules, validate, ctrl.login);
router.post('/logout', requireAuth, ctrl.logout);
router.post('/refresh', ctrl.refresh);
router.post('/forgot-password', authLimiter, V.forgotRules, validate, ctrl.forgotPassword);
router.post('/reset-password', authLimiter, V.resetRules, validate, ctrl.resetPassword);
router.get('/me', requireAuth, ctrl.me);
router.post('/verify-email', ctrl.verifyEmailPlaceholder);
router.post('/resend-verification', ctrl.resendVerificationPlaceholder);

module.exports = router;

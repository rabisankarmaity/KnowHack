const router = require('express').Router();
const { param, body } = require('express-validator');
const ctrl = require('../controllers/ai.controller');
const { requireAuth, optionalAuth } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');

const idRule = [param('id').isMongoId()];
const askRule = [body('question').trim().isLength({ min: 2, max: 2000 })];

// Frontend -> Backend only. The AI service is never exposed to the browser.
router.post('/projects/:id/analyze', requireAuth, idRule, validate, ctrl.analyze);
router.get('/projects/:id/status', optionalAuth, idRule, validate, ctrl.status);
router.get('/projects/:id/similar', optionalAuth, idRule, validate, ctrl.similar);
router.post('/projects/:id/weakness', requireAuth, idRule, validate, ctrl.weakness);
router.post('/mentor', requireAuth, askRule, validate, ctrl.mentor);
router.post('/similarity', requireAuth, validate, ctrl.similarityText);

module.exports = router;
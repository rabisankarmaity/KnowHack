const router = require('express').Router();
const ctrl = require('../controllers/project.controller');
const { requireAuth, optionalAuth } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { upload } = require('../middlewares/upload.middleware');
const V = require('../validators/project.validator');

router.get('/', V.listRules, validate, ctrl.list);
router.post('/', requireAuth, V.createRules, validate, ctrl.create);
router.post('/uploads', requireAuth, upload.array('files', 10), ctrl.uploadFiles);
router.get('/:slug', optionalAuth, ctrl.getBySlug);
router.put('/:id', requireAuth, V.updateRules, validate, ctrl.update);
router.delete('/:id', requireAuth, ctrl.remove);
router.post('/:id/ai-review', requireAuth, ctrl.aiReview);
router.post('/:id/publish', requireAuth, ctrl.publish);
router.post('/:id/archive', requireAuth, ctrl.archive);
router.post('/:id/duplicate', requireAuth, ctrl.duplicate);

module.exports = router;

const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.get('/profile', requireAuth, ctrl.getProfile);
router.put('/profile', requireAuth, ctrl.updateProfile);
router.get('/projects', requireAuth, ctrl.myProjects);
router.get('/:id', ctrl.getById);

module.exports = router;

const router = require('express').Router();
const ctrl = require('../controllers/bookmark.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.get('/', requireAuth, ctrl.list);
router.post('/', requireAuth, ctrl.create);
router.delete('/:id', requireAuth, ctrl.remove);

module.exports = router;

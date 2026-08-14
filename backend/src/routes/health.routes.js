const router = require('express').Router();
const { fullHealth } = require('../services/health.service');

router.get('/', async (_req, res, next) => {
  try {
    const result = await fullHealth();
    res.status(result.ok ? 200 : 503).json({
      success: result.ok,
      message: result.status,
      data: result,
    });
  } catch (e) { next(e); }
});

module.exports = router;
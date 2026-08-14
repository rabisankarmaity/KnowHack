require('dotenv').config();
const app = require('./app');
const { connectDatabase } = require('./config/database');
const { fullHealth } = require('./services/health.service');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDatabase();

    const server = app.listen(PORT, () => {
      logger.info(`KnowHack API listening on :${PORT} [${process.env.NODE_ENV}]`);

      // Startup verification: Backend <-> Database / Cloudinary / AI.
      // Fire-and-forget AFTER listen: a sleeping AI instance must never delay
      // the backend from accepting requests (Render cold starts can take ~15s).
      fullHealth()
        .then((health) => {
          Object.entries(health.checks).forEach(([name, check]) => {
            const label = `Backend <-> ${name}`;
            if (check.ok) logger.info(`${label}: ok`);
            else logger.error(`${label}: FAILED — ${check.error || check.status || 'unavailable'}`);
          });
        })
        .catch((err) => logger.error('Startup health verification failed:', err));
    });
    const shutdown = (signal) => {
      logger.warn(`${signal} received. Closing server...`);
      server.close(() => process.exit(0));
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('unhandledRejection', (err) => logger.error('Unhandled rejection:', err));
  } catch (err) {
    logger.error('Fatal boot error:', err);
    process.exit(1);
  }
})();

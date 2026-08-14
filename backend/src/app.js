const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const { globalLimiter } = require('./middlewares/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const projectRoutes = require('./routes/project.routes');
const hackathonRoutes = require('./routes/hackathon.routes');
const bookmarkRoutes = require('./routes/bookmark.routes');
const aiRoutes = require('./routes/ai.routes');
const healthRoutes = require('./routes/health.routes');

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());
app.use(compression());
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
app.use(globalLimiter);

// Lightweight, unauthenticated liveness probe. Default routes point at it as
// the Render healthCheckPath AND the browser warm-up target: no DB, no AI, no
// auth — safe to call on every page load.
app.get('/health', (_req, res) =>
  res.json({
    success: true,
    message: 'ok',
    data: { service: 'backend', uptime: process.uptime(), timestamp: new Date().toISOString() },
  })
);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/hackathons', hackathonRoutes);
app.use('/api/v1/bookmarks', bookmarkRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/health', healthRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

const mongoose = require('mongoose');
const { cloudinary } = require('../config/cloudinary');
const aiClient = require('./ai.client');
const { aiConfig } = require('../config/ai');

const STATE = ['disconnected', 'connected', 'connecting', 'disconnecting'];

async function checkDatabase() {
  const state = STATE[mongoose.connection.readyState] || 'unknown';
  if (mongoose.connection.readyState !== 1) return { ok: false, state };
  try {
    await mongoose.connection.db.admin().ping();
    return { ok: true, state };
  } catch (err) {
    return { ok: false, state, error: err.message };
  }
}

async function checkCloudinary() {
  if (!process.env.CLOUDINARY_CLOUD_NAME) return { ok: false, error: 'Cloudinary is not configured' };
  try {
    await cloudinary.api.ping();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function checkAi() {
  if (!aiConfig.enabled) return { ok: false, error: 'AI_SERVICE_URL is not set' };
  try {
    // Bounded probe: never let a sleeping AI instance stall the backend's own
    // health response (Render cold starts can take ~15s).
    const timeout = parseInt(process.env.AI_HEALTH_TIMEOUT_MS, 10) || 8000;
    const data = await aiClient.health(timeout);
    return { ok: data.status === 'healthy', status: data.status, checks: data.checks };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function fullHealth() {
  const [database, cloudinaryCheck, ai] = await Promise.all([
    checkDatabase(),
    checkCloudinary(),
    checkAi(),
  ]);
  const checks = { database, cloudinary: cloudinaryCheck, ai };
  const ok = Object.values(checks).every((c) => c.ok);
  return { ok, status: ok ? 'ok' : 'degraded', uptime: process.uptime(), checks };
}

module.exports = { fullHealth, checkDatabase, checkCloudinary, checkAi };
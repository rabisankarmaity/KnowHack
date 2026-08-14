const crypto = require('crypto');
const authService = require('../services/auth.service');
const { cookieOptions, verifyRefreshToken } = require('../config/jwt');
const User = require('../models/User');
const logger = require('../utils/logger');

const ACCESS_MAX = 15 * 60 * 1000;
const REFRESH_MAX_REMEMBER = 30 * 24 * 60 * 60 * 1000;
const REFRESH_MAX = 7 * 24 * 60 * 60 * 1000;

function setAuthCookies(res, tokens, remember) {
  res.cookie('accessToken', tokens.accessToken, cookieOptions(ACCESS_MAX));
  res.cookie('refreshToken', tokens.refreshToken, cookieOptions(remember ? REFRESH_MAX_REMEMBER : REFRESH_MAX));
}

exports.register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    const tokens = authService.issueTokens(user, false);
    await authService.persistRefresh(user, tokens.refreshToken);
    setAuthCookies(res, tokens, false);
    res.status(201).json({ success: true, message: 'Registered', data: { user, tokens } });
  } catch (e) { next(e); }
};

exports.login = async (req, res, next) => {
  try {
    const remember = Boolean(req.body.remember);
    const user = await authService.login(req.body);
    const tokens = authService.issueTokens(user, remember);
    await authService.persistRefresh(user, tokens.refreshToken);
    setAuthCookies(res, tokens, remember);
    logger.info(`[AUTH] Login ok: user=${user.id} remember=${remember}`);
    res.json({ success: true, message: 'Logged in', data: { user, tokens } });
  } catch (e) { next(e); }
};

exports.logout = async (req, res, next) => {
  try {
    if (req.user) await authService.clearRefresh(req.user);
    res.clearCookie('accessToken', cookieOptions(0));
    res.clearCookie('refreshToken', cookieOptions(0));
    res.json({ success: true, message: 'Logged out', data: {} });
  } catch (e) { next(e); }
};

exports.refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) return res.status(401).json({ success: false, message: 'Missing refresh token' });
    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.sub).select('+refreshTokenHash');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    if (!user || user.refreshTokenHash !== hash) {
      logger.warn(`[AUTH] Refresh rejected: sub=${decoded.sub || 'unknown'} (invalid or rotated token)`);
      return res.status(401).json({ success: false, message: 'Invalid session' });
    }
    const tokens = authService.issueTokens(user, true);
    await authService.persistRefresh(user, tokens.refreshToken);
    setAuthCookies(res, tokens, true);
    logger.info(`[AUTH] Refresh ok: user=${user.id}`);
    res.json({ success: true, message: 'Refreshed', data: { tokens } });
  } catch (e) {
    logger.warn(`[AUTH] Refresh failed: ${e.message || 'unknown error'}`);
    next(e);
  }
};

exports.me = async (req, res) => {
  res.json({ success: true, message: 'OK', data: { user: req.user } });
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.createPasswordResetToken(req.body.email);
    const payload = { message: 'If the email exists, a reset link was issued.' };
    if (process.env.NODE_ENV !== 'production' && result) payload.resetToken = result.token;
    res.json({ success: true, message: 'OK', data: payload });
  } catch (e) { next(e); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json({ success: true, message: 'Password reset. Please log in.', data: {} });
  } catch (e) { next(e); }
};

exports.verifyEmailPlaceholder = async (_req, res) =>
  res.json({ success: true, message: 'Email verification is a placeholder in MVP', data: {} });

exports.resendVerificationPlaceholder = async (_req, res) =>
  res.json({ success: true, message: 'Resend verification is a placeholder in MVP', data: {} });

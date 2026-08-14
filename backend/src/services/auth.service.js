const crypto = require('crypto');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { signAccessToken, signRefreshToken } = require('../config/jwt');

async function register({ name, username, email, password, role }) {
  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) throw new ApiError(409, 'Email or username already in use');
  const user = await User.create({ name, username, email, password, role: role || 'student' });
  return user;
}

async function login({ emailOrUsername, password }) {
  const user = await User.findOne({
    $or: [{ email: emailOrUsername.toLowerCase() }, { username: emailOrUsername.toLowerCase() }],
  }).select('+password');
  if (!user) throw new ApiError(401, 'Invalid credentials');
  const ok = await user.comparePassword(password);
  if (!ok) throw new ApiError(401, 'Invalid credentials');
  return user;
}

function issueTokens(user, remember = false) {
  const payload = { sub: user.id, role: user.role };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload, remember),
  };
}

async function persistRefresh(user, refreshToken) {
  user.refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await user.save({ validateBeforeSave: false });
}

async function clearRefresh(user) {
  user.refreshTokenHash = undefined;
  await user.save({ validateBeforeSave: false });
}

async function createPasswordResetToken(email) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return null;
  const token = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
  await user.save({ validateBeforeSave: false });
  return { user, token };
}

async function resetPassword(token, newPassword) {
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires');
  if (!user) throw new ApiError(400, 'Reset token is invalid or expired');
  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  return user;
}

module.exports = {
  register, login, issueTokens, persistRefresh, clearRefresh,
  createPasswordResetToken, resetPassword,
};

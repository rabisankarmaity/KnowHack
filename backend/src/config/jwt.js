const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '30d';

const signAccessToken = (payload) => jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
const signRefreshToken = (payload, remember = false) =>
  jwt.sign(payload, REFRESH_SECRET, { expiresIn: remember ? REFRESH_EXPIRES : '7d' });
const verifyAccessToken = (t) => jwt.verify(t, ACCESS_SECRET);
const verifyRefreshToken = (t) => jwt.verify(t, REFRESH_SECRET);

function parseCookieDomain(rawDomain) {
  if (!rawDomain) return undefined;
  try {
    const parsed = new URL(rawDomain);
    return parsed.hostname || undefined;
  } catch {
    return rawDomain;
  }
}

const cookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: process.env.COOKIE_SECURE === 'true' ? 'none' : 'lax',
  domain: parseCookieDomain(process.env.COOKIE_DOMAIN),
  path: '/',
  maxAge: maxAgeMs,
});

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, cookieOptions };

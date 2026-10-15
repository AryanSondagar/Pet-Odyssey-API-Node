const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { env } = require('../../config/env');
const { User } = require('../users');
const RefreshSession = require('./refreshSession.model');
const { createCsrfToken, csrfCookieOptions } = require('../../common/utils/csrf');

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ACCESS_COOKIE = 'accessToken';
const REFRESH_COOKIE = 'refreshToken';

const cookieOptions = (path, maxAge) => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  path,
  ...(maxAge ? { maxAge } : {}),
});

const clearAuthCookies = (res) => {
  res.clearCookie(ACCESS_COOKIE, cookieOptions('/', 0));
  res.clearCookie(REFRESH_COOKIE, cookieOptions('/api/auth', 0));
  res.clearCookie('csrfToken', csrfCookieOptions());
};

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

exports.getCsrfToken = (req, res, next) => {
  try {
    const csrfToken = createCsrfToken();
    res.set('Cache-Control', 'no-store');
    res.cookie('csrfToken', csrfToken, csrfCookieOptions());
    return res.json({ csrfToken });
  } catch (error) {
    return next(error);
  }
};

const publicUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
});

const issueAccessToken = (user) => {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
};

const setAuthCookies = (res, accessToken, refreshToken, refreshExpiresAt) => {
  const now = Date.now();
  res.cookie(
    ACCESS_COOKIE,
    accessToken,
    cookieOptions('/', 15 * 60 * 1000)
  );
  res.cookie(
    REFRESH_COOKIE,
    refreshToken,
    cookieOptions('/api/auth', Math.max(0, refreshExpiresAt.getTime() - now))
  );
};

const createRefreshSession = async (user) => {
  const refreshToken = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await RefreshSession.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  });

  return { refreshToken, expiresAt };
};

const startSession = async (res, user) => {
  const accessToken = issueAccessToken(user);
  const { refreshToken, expiresAt } = await createRefreshSession(user);

  setAuthCookies(res, accessToken, refreshToken, expiresAt);
  return publicUser(user);
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (!env.JWT_SECRET) {
      return res.status(500).json({ message: 'Authentication is not configured' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });
    const sessionUser = await startSession(res, user);

    return res.status(201).json({
      message: 'User registered successfully',
      user: sessionUser,
    });
  } catch (error) {
    console.error('Auth registration error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    if (!env.JWT_SECRET) {
      return res.status(500).json({ message: 'Authentication is not configured' });
    }

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const sessionUser = await startSession(res, user);
    return res.json({ message: 'Login successful', user: sessionUser });
  } catch (error) {
    console.error('Auth login error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.refresh = async (req, res) => {
  const refreshToken = req.cookies && req.cookies[REFRESH_COOKIE];
  if (!refreshToken) {
    clearAuthCookies(res);
    return res.status(401).json({ message: 'Refresh token required' });
  }

  try {
    const tokenHash = hashToken(refreshToken);
    const session = await RefreshSession.findOne({
      $or: [{ tokenHash }, { previousTokenHashes: tokenHash }],
    });
    if (!session || session.expiresAt <= new Date()) {
      clearAuthCookies(res);
      return res.status(401).json({ message: 'Refresh session expired or invalid' });
    }

    const wasReused = session.previousTokenHashes.includes(tokenHash);
    if (session.revokedAt || wasReused) {
      await RefreshSession.updateOne(
        { _id: session._id },
        { $set: { revokedAt: new Date() } }
      );
      clearAuthCookies(res);
      return res.status(401).json({ message: 'Refresh session is no longer valid' });
    }

    const user = await User.findById(session.userId);
    if (!user) {
      await RefreshSession.updateOne(
        { _id: session._id },
        { $set: { revokedAt: new Date() } }
      );
      clearAuthCookies(res);
      return res.status(401).json({ message: 'Account no longer exists' });
    }

    const newRefreshToken = crypto.randomBytes(48).toString('base64url');
    const rotatedSession = await RefreshSession.findOneAndUpdate(
      {
        _id: session._id,
        tokenHash,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: { tokenHash: hashToken(newRefreshToken) },
        $addToSet: { previousTokenHashes: tokenHash },
      },
      { new: true }
    );

    if (!rotatedSession) {
      await RefreshSession.updateOne(
        { _id: session._id },
        { $set: { revokedAt: new Date() } }
      );
      clearAuthCookies(res);
      return res.status(401).json({ message: 'Refresh session is no longer valid' });
    }

    setAuthCookies(
      res,
      issueAccessToken(user),
      newRefreshToken,
      session.expiresAt
    );
    return res.json({ user: publicUser(user) });
  } catch (error) {
    console.error('Auth refresh error:', error.message);
    clearAuthCookies(res);
    return res.status(500).json({ message: 'Unable to refresh session' });
  }
};

exports.logout = async (req, res) => {
  try {
    const refreshToken = req.cookies && req.cookies[REFRESH_COOKIE];
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await RefreshSession.updateOne(
        {
          $or: [{ tokenHash }, { previousTokenHashes: tokenHash }],
          revokedAt: null,
        },
        { $set: { revokedAt: new Date() } }
      );
    }

    clearAuthCookies(res);
    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Auth logout error:', error.message);
    return res.status(500).json({ message: 'Unable to log out' });
  }
};

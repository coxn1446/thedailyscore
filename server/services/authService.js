const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { isDbHealthy, query } = require('../db');
const { userQueries } = require('../queries');
const {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TOS_VERSION,
  presentUser,
} = require('../utils/policyVersions');
const { sendEmail } = require('../helpers/email');
const {
  VERIFY_TTL_MS,
  RESET_TTL_MS,
  createToken,
  hashToken,
  expiresAt,
  clientOrigin,
} = require('../utils/emailTokens');

const DB_REQUIRED = 'Database is unavailable. Start Postgres and apply server/db/schema.sql.';
const HANDLE_PATTERN = /^[a-z0-9_]{3,24}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sanitizeUser = presentUser;

const requireDb = () => {
  if (!isDbHealthy()) {
    const err = new Error(DB_REQUIRED);
    err.status = 503;
    throw err;
  }
};

const rejectIfSuspended = (user) => {
  if (!user?.suspended) return user;
  const err = new Error('Account is suspended');
  err.status = 403;
  throw err;
};

const conflictFromUnique = (err) => {
  if (err?.code !== '23505') return null;
  const constraint = String(err.constraint || '');
  const error = new Error(
    constraint.includes('handle')
      ? 'Handle already in use'
      : constraint.includes('email')
        ? 'Email already in use'
        : 'Email or handle already in use'
  );
  error.status = 409;
  return error;
};

const normalizeHandle = (value) => {
  const handle = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!HANDLE_PATTERN.test(handle)) {
    const err = new Error('Handle must use 3 to 24 letters, numbers, or underscores');
    err.status = 400;
    throw err;
  }
  return handle;
};

const normalizeTimezone = (value) => {
  const zone = typeof value === 'string' ? value.trim() : '';
  if (!zone) return 'UTC';
  try {
    Intl.DateTimeFormat('en-US', { timeZone: zone });
    return zone;
  } catch {
    return 'UTC';
  }
};

const normalizeDisplayName = (value) => {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name || name.length > 80) {
    const err = new Error('Display name is required');
    err.status = 400;
    throw err;
  }
  return name;
};

const normalizeRequiredEmail = (email) => {
  const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!normalized || !EMAIL_PATTERN.test(normalized)) {
    const err = new Error('Email is required');
    err.status = 400;
    throw err;
  }
  return normalized;
};

const normalizeEmail = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
};

const getUserById = async (userId) => {
  if (!isDbHealthy()) return null;
  try {
    const { rows } = await query(userQueries.findById, [userId]);
    return sanitizeUser(rows[0] || null);
  } catch {
    return null;
  }
};

const validateLocalCredentials = async (identifier, password) => {
  requireDb();
  const key = typeof identifier === 'string' ? identifier.trim() : '';
  if (!key || !password) return null;
  const { rows } = await query(userQueries.findByIdentifier, [key]);
  const row = rows[0];
  if (!row || !row.password) return null;
  const ok = await bcrypt.compare(password, row.password);
  if (!ok) return null;
  return rejectIfSuspended(sanitizeUser(row));
};

const registerLocalUser = async ({
  email,
  password,
  handle,
  displayName,
  timezone,
  acceptedPolicies,
}) => {
  requireDb();
  if (typeof password !== 'string' || !password) {
    const err = new Error('Password is required');
    err.status = 400;
    throw err;
  }
  if (acceptedPolicies !== true) {
    const err = new Error('You must accept the Terms of Service and Privacy Policy');
    err.status = 400;
    throw err;
  }
  const normalizedHandle = normalizeHandle(handle);
  const normalizedEmail = normalizeRequiredEmail(email);
  const name = normalizeDisplayName(displayName);
  const zone = normalizeTimezone(timezone);

  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await query(userQueries.insertLocalUser, [
      normalizedEmail,
      normalizedHandle,
      hash,
      name,
      zone,
      CURRENT_TOS_VERSION,
      CURRENT_PRIVACY_VERSION,
    ]);
    const user = sanitizeUser(rows[0]);
    await sendVerificationEmail(user);
    return user;
  } catch (err) {
    const conflict = conflictFromUnique(err);
    if (conflict) throw conflict;
    throw err;
  }
};

const sendVerificationEmail = async (user) => {
  if (!user?.user_id || !user.email || user.email_verified) return { skipped: true };
  const token = createToken();
  await query(userQueries.setVerifyToken, [
    user.user_id,
    hashToken(token),
    expiresAt(VERIFY_TTL_MS),
  ]);
  const link = `${clientOrigin()}/verify-email?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: user.email,
    subject: 'Confirm your Daily Score account',
    text: `Confirm your email for The Daily Score:\n${link}`,
  });
  return { skipped: false };
};

const verifyEmailToken = async (token) => {
  requireDb();
  const hashed = hashToken(token);
  if (!hashed) {
    const err = new Error('Invalid or expired verification link');
    err.status = 400;
    throw err;
  }
  const { rows } = await query(userQueries.findByVerifyTokenHash, [hashed]);
  const row = rows[0];
  if (!row) {
    const err = new Error('Invalid or expired verification link');
    err.status = 400;
    throw err;
  }
  if (row.email_verified) return sanitizeUser(row);
  const updated = await query(userQueries.markEmailVerified, [row.user_id]);
  return sanitizeUser(updated.rows[0] || row);
};

const resendVerification = async (user) => {
  requireDb();
  if (!user?.user_id) {
    const err = new Error('Not authenticated');
    err.status = 401;
    throw err;
  }
  const { rows } = await query(userQueries.findById, [user.user_id]);
  const row = rows[0];
  if (!row) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  const presented = sanitizeUser(row);
  if (presented.email_verified) return presented;
  await sendVerificationEmail(presented);
  return presented;
};

const forgotPassword = async (email) => {
  requireDb();
  const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (normalized && EMAIL_PATTERN.test(normalized)) {
    const { rows } = await query(userQueries.findByEmail, [normalized]);
    const row = rows[0];
    if (row) {
      const token = createToken();
      await query(userQueries.setResetToken, [
        row.user_id,
        hashToken(token),
        expiresAt(RESET_TTL_MS),
      ]);
      const link = `${clientOrigin()}/reset-password?token=${encodeURIComponent(token)}`;
      await sendEmail({
        to: row.email,
        subject: 'Reset your Daily Score password',
        text: `Reset your password:\n${link}`,
      });
    }
  }
  return { ok: true };
};

const resetPassword = async ({ token, password }) => {
  requireDb();
  if (typeof password !== 'string' || !password) {
    const err = new Error('Password is required');
    err.status = 400;
    throw err;
  }
  const hashed = hashToken(token);
  if (!hashed) {
    const err = new Error('Invalid or expired reset link');
    err.status = 400;
    throw err;
  }
  const { rows } = await query(userQueries.findByResetTokenHash, [hashed]);
  const row = rows[0];
  if (!row) {
    const err = new Error('Invalid or expired reset link');
    err.status = 400;
    throw err;
  }
  const hash = await bcrypt.hash(password, 12);
  const updated = await query(userQueries.setPasswordAndClearReset, [row.user_id, hash]);
  return sanitizeUser(updated.rows[0] || row);
};

const verifyGoogleCredential = async (credential) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !credential) {
    const err = new Error('Google sign in is not configured');
    err.status = 503;
    throw err;
  }
  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: clientId,
  });
  const payload = ticket.getPayload() || {};
  return {
    id: payload.sub,
    emails: payload.email ? [{ value: payload.email }] : [],
    displayName: payload.name || payload.email || 'Reader',
    email: payload.email || null,
  };
};

const decodeJwtPayload = (token) => {
  if (typeof token !== 'string' || !token.includes('.')) return {};
  try {
    const payload = token.split('.')[1];
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (payload.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return {};
  }
};

const extractAppleIdToken = (idToken) => {
  if (typeof idToken === 'string' && idToken.includes('.')) return idToken;
  if (idToken && typeof idToken === 'object') {
    return idToken.id_token || idToken.idToken || null;
  }
  return null;
};

const parseAppleUser = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const profileFromAppleCallback = ({ idToken, profile, req } = {}) => {
  const token = extractAppleIdToken(idToken);
  const decoded = decodeJwtPayload(token);
  const appleUser = req?.appleProfile || parseAppleUser(req?.body?.user);
  const email = normalizeEmail(
    appleUser.email || decoded.email || profile?.emails?.[0]?.value || profile?.email
  );
  const named = [appleUser.name?.firstName, appleUser.name?.lastName].filter(Boolean).join(' ').trim();
  const providerId = decoded.sub || profile?.id || profile?.sub;
  return {
    id: providerId,
    emails: email ? [{ value: email }] : [],
    email,
    displayName: named || profile?.displayName || email || 'Reader',
  };
};

const findOrCreateOAuthUser = async (provider, profile) => {
  requireDb();
  const providerId = profile?.id || profile?.sub;
  if (!providerId) {
    const err = new Error('Sign in did not return a provider account id');
    err.status = 400;
    throw err;
  }
  const email = normalizeEmail(profile?.emails?.[0]?.value || profile?.email);
  const displayName = profile?.displayName || email || provider;
  const subject = String(providerId);
  const findByProviderId = provider === 'google' ? userQueries.findByGoogleId : userQueries.findByAppleId;
  const linkProviderId = provider === 'google' ? userQueries.linkGoogleId : userQueries.linkAppleId;

  const existing = await query(findByProviderId, [subject]);
  if (existing.rows[0]) {
    return rejectIfSuspended(sanitizeUser(existing.rows[0]));
  }

  if (email) {
    const byEmail = await query(userQueries.findByEmail, [email]);
    const row = byEmail.rows[0];
    if (row) {
      const linkedId = provider === 'google' ? row.google_id : row.apple_id;
      if (linkedId && linkedId !== subject) {
        const err = new Error('This email is already linked to a different account');
        err.status = 409;
        throw err;
      }
      const { rows } = await query(linkProviderId, [row.user_id, subject]);
      return rejectIfSuspended(sanitizeUser(rows[0]));
    }
  }

  if (!email) {
    const err = new Error('Email is required');
    err.status = 400;
    throw err;
  }

  try {
    const { rows } = await query(userQueries.insertOAuthUser, [
      email,
      provider === 'google' ? subject : null,
      provider === 'apple' ? subject : null,
      displayName,
    ]);
    return sanitizeUser(rows[0]);
  } catch (err) {
    const conflict = conflictFromUnique(err);
    if (conflict) throw conflict;
    throw err;
  }
};

const claimHandle = async (userId, { handle, timezone, displayName, acceptedPolicies }) => {
  requireDb();
  if (!userId) {
    const err = new Error('Not authenticated');
    err.status = 401;
    throw err;
  }
  if (acceptedPolicies !== true) {
    const err = new Error('You must accept the Terms of Service and Privacy Policy');
    err.status = 400;
    throw err;
  }
  const normalizedHandle = normalizeHandle(handle);
  const zone = normalizeTimezone(timezone);
  const name = typeof displayName === 'string' && displayName.trim()
    ? normalizeDisplayName(displayName)
    : null;

  const current = await query(userQueries.findById, [userId]);
  const row = current.rows[0];
  if (!row) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  if (row.handle) {
    const err = new Error('Handle is already set');
    err.status = 400;
    throw err;
  }

  try {
    const { rows } = await query(userQueries.setHandle, [
      userId,
      normalizedHandle,
      zone,
      name,
      CURRENT_TOS_VERSION,
      CURRENT_PRIVACY_VERSION,
    ]);
    if (!rows[0]) {
      const err = new Error('Handle is already set');
      err.status = 400;
      throw err;
    }
    return sanitizeUser(rows[0]);
  } catch (err) {
    const conflict = conflictFromUnique(err);
    if (conflict) throw conflict;
    throw err;
  }
};

/** Matches capacitor.config.js server.hostname and ios.scheme. */
const NATIVE_OAUTH_APP_HOST = 'thedailyscore.com';
const NATIVE_OAUTH_URL_SCHEME = 'Thedailyscore';

const OAUTH_RETURN_NATIVE_STATE_ISSUER = 'thedailyscore-oauth-return-native';
const OAUTH_RETURN_NATIVE_STATE_TTL = '15m';
const NATIVE_OAUTH_SESSION_HANDOFF_ISSUER = 'thedailyscore-oauth-native-handoff';
const NATIVE_OAUTH_SESSION_HANDOFF_TTL = '5m';

const LOG_PREFIX = '[oauth-native]';

function sessionSecretForSignedOAuthState() {
  const s = process.env.SESSION_SECRET;
  return typeof s === 'string' && s.trim().length > 0 ? s.trim() : null;
}

function createNativeOAuthSessionHandoffToken(userId) {
  const secret = sessionSecretForSignedOAuthState();
  if (!secret) {
    console.warn(`${LOG_PREFIX} createNativeOAuthSessionHandoffToken: SESSION_SECRET missing`);
    return null;
  }
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) return null;
  return jwt.sign({ u: uid, v: 1 }, secret, {
    expiresIn: NATIVE_OAUTH_SESSION_HANDOFF_TTL,
    issuer: NATIVE_OAUTH_SESSION_HANDOFF_ISSUER,
  });
}

function verifyNativeOAuthSessionHandoffToken(token) {
  const secret = sessionSecretForSignedOAuthState();
  if (!secret) throw new Error('SESSION_SECRET missing');
  const payload = jwt.verify(String(token).trim(), secret, {
    issuer: NATIVE_OAUTH_SESSION_HANDOFF_ISSUER,
  });
  const uid = payload && Number(payload.u);
  if (!Number.isFinite(uid) || uid <= 0) throw new Error('invalid handoff payload');
  return { userId: uid };
}

function createOAuthReturnNativeState(req) {
  const v = req?.query?.return_native;
  if (v !== '1' && v !== 'true') return null;
  const secret = sessionSecretForSignedOAuthState();
  if (!secret) {
    console.warn(`${LOG_PREFIX} createOAuthReturnNativeState: SESSION_SECRET missing; cannot sign state`);
    return null;
  }
  return jwt.sign({ rn: 1, v: 1 }, secret, {
    expiresIn: OAUTH_RETURN_NATIVE_STATE_TTL,
    issuer: OAUTH_RETURN_NATIVE_STATE_ISSUER,
  });
}

function hydrateOAuthReturnToNativeFromOAuthState(req) {
  const raw = req.query?.state || req.body?.state;
  if (raw == null || typeof raw !== 'string' || !raw.trim()) return false;
  const secret = sessionSecretForSignedOAuthState();
  if (!secret) {
    console.warn(`${LOG_PREFIX} callback hydrate: SESSION_SECRET missing`);
    return false;
  }
  try {
    const payload = jwt.verify(raw.trim(), secret, {
      issuer: OAUTH_RETURN_NATIVE_STATE_ISSUER,
    });
    if (payload && Number(payload.rn) === 1) {
      req.session.oauthReturnToNative = true;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function captureOAuthReturnToNativeFromQuery(req) {
  const v = req?.query?.return_native;
  if (v === '1' || v === 'true') req.session.oauthReturnToNative = true;
}

function isSafeOAuthWebRedirectPath(target) {
  if (target == null || typeof target !== 'string') return false;
  if (!target.startsWith('/') || target.startsWith('//')) return false;
  return true;
}

function takeOAuthClientRedirect(session, webTarget, options = {}) {
  const fromSignedState = options.returnNativeFromSignedState === true;
  const fromSession = session?.oauthReturnToNative === true;
  if (fromSession && session) delete session.oauthReturnToNative;
  const wantsNative = fromSignedState || fromSession;
  const safe = isSafeOAuthWebRedirectPath(webTarget);
  if (!wantsNative) return webTarget;
  if (!safe) return webTarget;
  let targetForNative = webTarget;
  const handoffUid = options.handoffUserId;
  if (handoffUid != null) {
    const t = createNativeOAuthSessionHandoffToken(handoffUid);
    if (t) {
      const sep = targetForNative.includes('?') ? '&' : '?';
      targetForNative = `${targetForNative}${sep}oauth_handoff=${encodeURIComponent(t)}`;
    }
  }
  return `${NATIVE_OAUTH_URL_SCHEME}://${NATIVE_OAUTH_APP_HOST}${targetForNative}`;
}

async function getUserForNativeOAuthSessionHandoff(token) {
  if (token == null || typeof token !== 'string' || !token.trim()) {
    const err = new Error('token required');
    err.code = 'NATIVE_HANDOFF_TOKEN_REQUIRED';
    throw err;
  }
  const { userId } = verifyNativeOAuthSessionHandoffToken(token.trim());
  const user = await getUserById(userId);
  if (!user) {
    const err = new Error('Invalid session handoff');
    err.code = 'NATIVE_HANDOFF_UNKNOWN_USER';
    throw err;
  }
  return rejectIfSuspended(user);
}

module.exports = {
  getUserById,
  validateLocalCredentials,
  registerLocalUser,
  verifyEmailToken,
  resendVerification,
  forgotPassword,
  resetPassword,
  verifyGoogleCredential,
  profileFromAppleCallback,
  findOrCreateOAuthUser,
  claimHandle,
  normalizeHandle,
  normalizeTimezone,
  NATIVE_OAUTH_APP_HOST,
  NATIVE_OAUTH_URL_SCHEME,
  isSafeOAuthWebRedirectPath,
  captureOAuthReturnToNativeFromQuery,
  createOAuthReturnNativeState,
  hydrateOAuthReturnToNativeFromOAuthState,
  takeOAuthClientRedirect,
  verifyNativeOAuthSessionHandoffToken,
  createNativeOAuthSessionHandoffToken,
  getUserForNativeOAuthSessionHandoff,
};

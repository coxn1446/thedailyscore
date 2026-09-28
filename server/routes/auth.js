const { Router } = require('express');
const passport = require('passport');
const authService = require('../services/authService');
const { buildGoogleAuthenticateOptions } = require('../utils/googleOAuthPassportOptions');
const { postAuthPath } = require('../utils/policyVersions');

const getClientUrl = () => process.env.DEFAULT_CLIENT_URL || 'http://localhost:3000';

const getCookie = (req, name) => {
  const header = req.headers.cookie || '';
  const parts = header.split(';');
  for (const part of parts) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
};

const oauthConfigured = (name) => {
  if (name === 'google') {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }
  if (name === 'apple') {
    return Boolean(
      process.env.APPLE_CLIENT_ID &&
        process.env.APPLE_TEAM_ID &&
        process.env.APPLE_KEY_ID &&
        process.env.APPLE_KEY
    );
  }
  return false;
};

const redirectOAuthClient = (res, session, webPath, options) => {
  const target = authService.takeOAuthClientRedirect(session, webPath, options);
  if (/^Thedailyscore:/i.test(target)) return res.redirect(target);
  const base = getClientUrl().replace(/\/$/, '');
  const path = target.startsWith('/') ? target : `/${target}`;
  return res.redirect(`${base}${path}`);
};

const nativeSessionHandoff = async (req, res, next) => {
  try {
    const user = await authService.getUserForNativeOAuthSessionHandoff(req.body?.token);
    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      return res.json({ user });
    });
  } catch (error) {
    if (error && error.code === 'NATIVE_HANDOFF_TOKEN_REQUIRED') {
      return res.status(400).json({ error: 'token required' });
    }
    return res.status(401).json({ error: 'Invalid or expired session handoff' });
  }
};

module.exports = () => {
  const router = Router();

  router.get('/config', (req, res) => {
    res.json({
      googleClientId: oauthConfigured('google') ? process.env.GOOGLE_CLIENT_ID : null,
      appleClientId: oauthConfigured('apple') ? process.env.APPLE_CLIENT_ID : null,
    });
  });

  router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ error: info?.message || 'Invalid email, handle, or password' });
      }
      return req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        return res.json({ user });
      });
    })(req, res, next);
  });

  router.post('/register', async (req, res, next) => {
    try {
      const user = await authService.registerLocalUser({
        email: req.body?.email,
        password: req.body?.password,
        handle: req.body?.handle,
        displayName: req.body?.displayName,
        timezone: req.body?.timezone,
        acceptedPolicies: req.body?.acceptedPolicies,
      });
      return req.login(user, (err) => {
        if (err) return next(err);
        return res.status(201).json({ user });
      });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/forgot-password', async (req, res, next) => {
    try {
      const payload = await authService.forgotPassword(req.body?.email);
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/reset-password', async (req, res, next) => {
    try {
      await authService.resetPassword({
        token: req.body?.token,
        password: req.body?.password,
      });
      return res.json({ ok: true });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/verify-email', async (req, res, next) => {
    try {
      const user = await authService.verifyEmailToken(req.body?.token || req.query?.token);
      return res.json({ user, ok: true });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/verify-email/resend', async (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    try {
      const user = await authService.resendVerification(req.user);
      return res.json({ user });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/native-session-handoff', nativeSessionHandoff);

  router.get('/google', (req, res, next) => {
    if (!oauthConfigured('google')) {
      return res.status(503).json({ error: 'Google OAuth is not configured' });
    }
    authService.captureOAuthReturnToNativeFromQuery(req);
    const signedState = authService.createOAuthReturnNativeState(req);
    const authOpts = buildGoogleAuthenticateOptions(signedState ? { state: signedState } : {});
    return passport.authenticate('google', authOpts)(req, res, next);
  });

  router.get('/google/callback', (req, res, next) => {
    const returnNativeFromSignedState = authService.hydrateOAuthReturnToNativeFromOAuthState(req);
    const nativeRedirectOpts = { returnNativeFromSignedState };
    if (!oauthConfigured('google')) {
      return redirectOAuthClient(res, req.session, '/login?error=google', nativeRedirectOpts);
    }
    return passport.authenticate('google', (err, user) => {
      if (err) return next(err);
      if (!user) {
        return redirectOAuthClient(res, req.session, '/login?error=google', nativeRedirectOpts);
      }
      return req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        return redirectOAuthClient(res, req.session, postAuthPath(user), {
          ...nativeRedirectOpts,
          handoffUserId: user.user_id,
        });
      });
    })(req, res, next);
  });

  router.post('/google/callback', async (req, res, next) => {
    if (!oauthConfigured('google')) {
      return res.redirect(`${getClientUrl()}/login?error=google`);
    }
    try {
      const csrfCookie = getCookie(req, 'g_csrf_token');
      const csrfBody = req.body?.g_csrf_token;
      if (!csrfCookie || !csrfBody || csrfCookie !== csrfBody) {
        return res.redirect(`${getClientUrl()}/login?error=google`);
      }
      const profile = await authService.verifyGoogleCredential(req.body?.credential);
      const user = await authService.findOrCreateOAuthUser('google', profile);
      return req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        const path = postAuthPath(user);
        return res.redirect(`${getClientUrl().replace(/\/$/, '')}${path}`);
      });
    } catch {
      return res.redirect(`${getClientUrl()}/login?error=google`);
    }
  });

  router.get('/apple', (req, res, next) => {
    if (!oauthConfigured('apple')) {
      return res.status(503).json({ error: 'Apple Sign In is not configured' });
    }
    authService.captureOAuthReturnToNativeFromQuery(req);
    const signedState = authService.createOAuthReturnNativeState(req);
    const authOpts = { scope: ['name', 'email'] };
    if (signedState) authOpts.state = signedState;
    return passport.authenticate('apple', authOpts)(req, res, next);
  });

  router.post('/apple/callback', (req, res, next) => {
    const returnNativeFromSignedState = authService.hydrateOAuthReturnToNativeFromOAuthState(req);
    const nativeRedirectOpts = { returnNativeFromSignedState };
    if (!oauthConfigured('apple')) {
      return redirectOAuthClient(res, req.session, '/login?error=apple', nativeRedirectOpts);
    }
    return passport.authenticate('apple', (err, user) => {
      if (err || !user) {
        return redirectOAuthClient(res, req.session, '/login?error=apple', nativeRedirectOpts);
      }
      return req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        return redirectOAuthClient(res, req.session, postAuthPath(user), {
          ...nativeRedirectOpts,
          handoffUserId: user.user_id,
        });
      });
    })(req, res, next);
  });

  router.get('/me', (req, res) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
      return res.json({ user: req.user });
    }
    return res.status(401).json({ error: 'Not authenticated' });
  });

  router.post('/logout', (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ success: true });
      });
    });
  });

  return router;
};

module.exports.nativeSessionHandoff = nativeSessionHandoff;

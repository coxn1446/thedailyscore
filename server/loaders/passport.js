const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const AppleStrategy = require('passport-apple');
const authService = require('../services/authService');
const { getAppleCallbackURL } = require('../utils/appleOAuthPassportOptions');

module.exports = async ({ app }) => {
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, done) => {
    done(null, user.user_id);
  });

  passport.deserializeUser(async (userId, done) => {
    try {
      const user = await authService.getUserById(userId);
      if (user?.suspended) return done(null, false);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  passport.use(
    new LocalStrategy(
      { usernameField: 'identifier', passwordField: 'password' },
      async (identifier, password, done) => {
        try {
          const user = await authService.validateLocalCredentials(identifier, password);
          if (!user) {
            return done(null, false, { message: 'Invalid email, handle, or password' });
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: '/api/auth/google/callback',
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const user = await authService.findOrCreateOAuthUser('google', profile);
            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  } else {
    console.warn('Google OAuth not configured (GOOGLE_CLIENT_ID/SECRET missing).');
  }

  if (
    process.env.APPLE_CLIENT_ID &&
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_KEY_ID &&
    process.env.APPLE_KEY
  ) {
    passport.use(
      new AppleStrategy(
        {
          clientID: process.env.APPLE_CLIENT_ID,
          teamID: process.env.APPLE_TEAM_ID,
          keyID: process.env.APPLE_KEY_ID,
          privateKeyString: process.env.APPLE_KEY.replace(/\\n/g, '\n'),
          callbackURL: getAppleCallbackURL(),
          passReqToCallback: true,
        },
        async (req, accessToken, refreshToken, idToken, profile, done) => {
          try {
            const mapped = authService.profileFromAppleCallback({ idToken, profile, req });
            const user = await authService.findOrCreateOAuthUser('apple', mapped);
            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  } else {
    console.warn('Apple Sign In not configured (APPLE_* credentials missing).');
  }

  return app;
};

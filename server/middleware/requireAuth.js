module.exports = (req, res, next) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (req.user?.suspended) {
    return res.status(403).json({ error: 'Account is suspended' });
  }
  return next();
};

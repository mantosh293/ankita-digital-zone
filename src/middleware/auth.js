const { query } = require('../config/db');

async function currentUser(req, _res, next) {
  if (!req.session.userId) return next();
  const users = await query('SELECT * FROM users WHERE id = ? AND status != "deleted" LIMIT 1', [req.session.userId]);
  req.user = users[0] || null;
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Login required' });
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Login required' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Access denied' });
    next();
  };
}

module.exports = { currentUser, requireAuth, requireRole };

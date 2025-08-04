
// Middleware to ensure user is logged in
function requireLogin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Please login' });
  }
  next();
}

// Middleware for Manager role
function requireManager(req, res, next) {
  if (!req.user || req.user.role !== 'Manager') {
    return res.status(403).json({ error: 'Forbidden: Manager access only' });
  }
  next();
}

// Middleware for Admin role
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access only' });
  }
  next();
}

module.exports = {
  requireLogin,
  requireManager,
  requireAdmin,
};


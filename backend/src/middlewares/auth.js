const { verifyAccessToken } = require('../utils/jwt');

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  return next();
}

module.exports = { authRequired, adminOnly };

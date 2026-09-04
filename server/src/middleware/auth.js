const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');

// Attaches req.user if a valid Bearer token is presented.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(payload.sub).lean();
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }
    req.user = { id: user._id.toString(), email: user.email, name: user.name };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth };
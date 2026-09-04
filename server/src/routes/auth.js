const express = require('express');
const router = express.Router();
const asyncWrapper = require('../middleware/asyncWrapper');
const { requireAuth } = require('../middleware/auth');
const { waitForConnection } = require('../db');
const { createUser, signToken, verifyPassword, findUserByEmail } = require('../services/authService');

async function guardDb(res) {
  const ok = await waitForConnection();
  if (!ok) {
    res.status(503).json({ error: 'Auth service unavailable: database not connected' });
    return false;
  }
  return true;
}

// POST /api/auth/register
router.post(
  '/register',
  asyncWrapper(async (req, res) => {
    if (!guardDb(res)) return;
    const { name, email, password } = req.body || {};

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'email is required' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'password is required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 characters' });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const user = await createUser({ name: name.trim(), email: email.trim(), password });
    const token = signToken(user);
    res.status(201).json({ token, user });
  })
);

// POST /api/auth/login
router.post(
  '/login',
  asyncWrapper(async (req, res) => {
    if (!guardDb(res)) return;
    const { email, password } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'email is required' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'password is required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user);
    const { passwordHash, ...safeUser } = user.toObject();
    delete safeUser.__v;
    res.json({ token, user: safeUser });
  })
);

// GET /api/auth/me
router.get(
  '/me',
  requireAuth,
  asyncWrapper(async (req, res) => {
    res.json({ user: req.user });
  })
);

// POST /api/auth/logout (stateless: client discards token)
router.post('/logout', (req, res) => {
  res.json({ success: true });
});

module.exports = router;
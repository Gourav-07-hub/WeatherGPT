const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/env');
const User = require('../models/User');

const SALT_ROUNDS = 10;

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
}

async function findUserByEmail(email) {
  return User.findOne({ email: String(email).toLowerCase().trim() }).select('+passwordHash');
}

async function createUser({ name, email, password }) {
  const passwordHash = await hashPassword(password);
  const user = await User.create({ name, email, passwordHash });
  return user;
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  findUserByEmail,
  createUser,
};
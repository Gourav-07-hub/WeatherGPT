const mongoose = require('mongoose');
const config = require('./config/env');
const logger = require('./utils/logger');

let connected = false;
let connectPromise = null;

async function connectDB() {
  if (!config.MONGODB_URI) {
    logger.warn('MONGODB_URI not set — skipping DB connection (auth disabled).');
    return false;
  }
  if (connectPromise) return connectPromise;
  connectPromise = (async () => {
    try {
      await mongoose.connect(config.MONGODB_URI, {
        dbName: 'weathergpt',
        serverSelectionTimeoutMS: 10000,
      });
      connected = true;
      logger.info('MongoDB connected.');
      return true;
    } catch (err) {
      logger.error('MongoDB connection failed', { message: err.message });
      connected = false;
      return false;
    }
  })();
  return connectPromise;
}

function isConnected() {
  return mongoose.connection.readyState === 1;
}

// Waits for the connection to be established (or fail), so auth requests
// that arrive during startup don't get a premature 503.
async function waitForConnection(timeoutMs = 8000) {
  const start = Date.now();
  while (!isConnected()) {
    if (Date.now() - start > timeoutMs) return isConnected();
    await new Promise((r) => setTimeout(r, 100));
  }
  return true;
}

module.exports = { connectDB, isConnected, waitForConnection };
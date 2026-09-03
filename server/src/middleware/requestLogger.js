const logger = require('../utils/logger');
module.exports = function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('Request processed', { method: req.method, path: req.originalUrl, status: res.statusCode, durationMs: Date.now() - start });
  });
  next();
};

const logger = require('../utils/logger');
function errorHandler(err, req, res, next) {
  logger.error(err.message, { stack: err.stack, path: req.path });
  const status = err.status || 500;
  if (status === 429) res.set('Retry-After', '1');
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    details: err.details || undefined,
    status
  });
}
function notFoundHandler(req, res, next) {
  res.status(404).json({ error: 'Not Found', status: 404 });
}
module.exports = { errorHandler, notFoundHandler };

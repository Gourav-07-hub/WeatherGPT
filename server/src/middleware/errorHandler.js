const logger = require('../utils/logger');
function errorHandler(err, req, res, next) {
  logger.error(err.message, { stack: err.stack, path: req.path });
  const status = err.status || 500;
  if (status === 429) res.set('Retry-After', '1');
  const message = status >= 500 ? 'Internal Server Error' : (err.message || 'Bad Request');
  res.status(status).json({
    error: message,
    details: status < 500 ? (err.details || undefined) : undefined,
    status
  });
}
function notFoundHandler(req, res, next) {
  res.status(404).json({ error: 'Not Found', status: 404 });
}
module.exports = { errorHandler, notFoundHandler };

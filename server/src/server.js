const app = require('./app');

if (require.main === module) {
  app.startServer();
}

module.exports = app;


const config = require('./config/env');
const app = require('./app');
const { connectDB } = require('./db');

if (require.main === module) {
  connectDB();
  const PORT = config.PORT;
  const server = app.listen(PORT, () => {
    console.log(`WeatherGPT running on http://localhost:${PORT}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\nPort ${PORT} is already in use.`);
      console.error(`A WeatherGPT server may already be running on http://localhost:${PORT}.`);
      console.error(`Stop the existing process or set PORT=<other> to run another instance.\n`);
      process.exit(1);
    }
    console.error(err);
    process.exit(1);
  });
}

module.exports = app;

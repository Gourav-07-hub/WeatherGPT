const config = require('./config/env');
const app = require('./app');
const { connectDB } = require('./db');

const PORT = config.PORT;

// Connect to MongoDB (non-fatal if unavailable — weather features still work,
// but auth endpoints will report the DB as unavailable).
connectDB();

const server = app.listen(PORT, () => {
  console.log(`WeatherGPT running on http://localhost:${PORT}`);
});

// Gracefully handle listen errors (e.g. port already in use) instead of
// letting Node throw an uncaught 'error' event and crash with a raw stack trace.
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
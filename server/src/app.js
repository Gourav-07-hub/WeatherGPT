const config = require('./config/env');
const requestLogger = require('./middleware/requestLogger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const chatRouter = require('./routes/chat');
const weatherRouter = require('./routes/weather');
const geocodeRouter = require('./routes/geocode');
const alertsRouter = require('./routes/alerts');
const subscribeRouter = require('./routes/subscribe');
const streamRouter = require('./routes/stream');
const climateRouter = require('./routes/climate');
const authRouter = require('./routes/auth');

const app = express();

app.use(cors({ origin: config.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? false : '*') }));
app.use(express.json());
app.use(requestLogger);

// Health + API root BEFORE static, so they aren't shadowed by the SPA
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// API routes
app.use('/api/auth', authRouter);
app.use('/api/chat', chatRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/geocode', geocodeRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/subscribe', subscribeRouter);
app.use('/api/stream', streamRouter);
app.use('/api/climate', climateRouter);

// Serve the built React client if it exists (production)
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  // SPA fallback: any non-API GET -> index.html
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => res.json({ message: 'WeatherGPT API', docs: '/api/chat' }));
}

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  process.on('uncaughtException', (err) => {
    console.error('[CRITICAL STARTUP ERROR] Uncaught exception:', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[CRITICAL STARTUP ERROR] Unhandled promise rejection:', reason);
    process.exit(1);
  });

  const { connectDB } = require('./db');
  const PORT = parseInt(process.env.PORT || config.PORT || '3000', 10);
  const HOST = '0.0.0.0';

  console.log(`[STARTUP] Initializing WeatherGPT on Node ${process.version} (NODE_ENV: ${process.env.NODE_ENV || 'development'})...`);

  try {
    console.log('[STARTUP] Connecting to database...');
    await connectDB();
  } catch (dbErr) {
    console.error('[STARTUP WARNING] MongoDB connection failed (server will continue running):', dbErr.message);
  }

  try {
    const server = app.listen(PORT, HOST, () => {
      console.log(`[STARTUP SUCCESS] WeatherGPT is running on http://${HOST}:${PORT}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n[STARTUP ERROR] Port ${PORT} is already in use.`);
        console.error(`Another process may be running on port ${PORT}.`);
      } else {
        console.error('[STARTUP ERROR] Server error:', err);
      }
      process.exit(1);
    });

    return server;
  } catch (listenErr) {
    console.error('[STARTUP ERROR] Failed to bind to port:', listenErr);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

app.startServer = startServer;
module.exports = app;
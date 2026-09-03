const config = require('./config/env');
const requestLogger = require('./middleware/requestLogger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const express = require('express');
const cors = require('cors');
const path = require('path');
const chatRouter = require('./routes/chat');
const weatherRouter = require('./routes/weather');
const geocodeRouter = require('./routes/geocode');
const alertsRouter = require('./routes/alerts');
const subscribeRouter = require('./routes/subscribe');
const streamRouter = require('./routes/stream');
const climateRouter = require('./routes/climate');


const app = express();

app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(express.json());
app.use(requestLogger);
app.use(express.static(path.join(__dirname, '../../client/dist')));

app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.get('/', (req, res) => {
  res.json({ message: 'WeatherGPT API', docs: '/api/docs' });
});

app.use('/api/chat', chatRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/geocode', geocodeRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/subscribe', subscribeRouter);
app.use('/api/stream', streamRouter);
app.use('/api/climate', climateRouter);

const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`WeatherGPT running on http://localhost:${PORT}`);
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

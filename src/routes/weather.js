const express = require('express');
const router = express.Router();
const { getCurrentWeather, getDailyForecast, getHourlyForecast } = require('../services/weatherService');
const { geocode } = require('../services/geocodeService');
const asyncWrapper = require('../middleware/asyncWrapper');
const { validate, validators } = require('../middleware/validator');

router.get('/nearby', validate(validators.latLonQuery), asyncWrapper(async (req, res) => {
  const { lat, lon } = req.query;
  const current = await getCurrentWeather(Number(lat), Number(lon), req.query.debug === 'true');
  res.json({ current, lat: Number(lat), lon: Number(lon) });
}));

router.get('/', asyncWrapper(async (req, res) => {
  const { q, lat, lon, daily, hourly } = req.query;
  
  let location = { lat: Number(lat), lon: Number(lon), name: 'Unknown' };
  
  if (q) {
    const geo = await geocode(q, req.query.debug === 'true');
    if (!geo) return res.status(404).json({ error: 'Location not found' });
    location = geo;
  } else if (!lat || !lon) {
    return res.status(400).json({ error: 'Provide q or lat/lon' });
  }
  
  const current = await getCurrentWeather(location.lat, location.lon, req.query.debug === 'true');
  let weatherData = { current, ...location };
  
  if (daily === '1') {
    weatherData.daily = await getDailyForecast(location.lat, location.lon, 7, req.query.debug === 'true');
  }
  if (hourly === '1') {
    weatherData.hourly = await getHourlyForecast(location.lat, location.lon, req.query.debug === 'true');
  }
  
  // ALWAYS return them to be safe if not explicitly asked
  weatherData.hourly = await getHourlyForecast(location.lat, location.lon, req.query.debug === 'true');
  weatherData.daily = await getDailyForecast(location.lat, location.lon, 7, req.query.debug === 'true');
  
  res.json(weatherData);
}));

module.exports = router;

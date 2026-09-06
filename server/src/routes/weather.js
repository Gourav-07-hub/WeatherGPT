const express = require('express');
const router = express.Router();
const { getCurrentWeather, getDailyForecast, getHourlyForecast } = require('../services/weatherService');
const { geocode, reverseGeocode } = require('../services/geocodeService');
const { extractLocation } = require('../services/intentService');
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
    const rawQ = String(q).trim();
    let geo = await geocode(rawQ, req.query.debug === 'true');
    if (!geo) {
      const extracted = extractLocation(rawQ);
      if (extracted && extracted.toLowerCase() !== rawQ.toLowerCase()) {
        geo = await geocode(extracted, req.query.debug === 'true');
      }
    }
    if (!geo) {
      return res.status(404).json({ error: `Location "${rawQ}" not found. Please check spelling or try another city.` });
    }
    location = geo;
  } else if (!lat || !lon) {
    return res.status(400).json({ error: 'Provide q or lat/lon' });
  } else {
    const rev = await reverseGeocode(Number(lat), Number(lon), req.query.debug === 'true');
    if (rev) location.name = rev.name;
  }
  
  const [current, dailyForecast, hourlyForecast] = await Promise.all([
    getCurrentWeather(location.lat, location.lon, req.query.debug === 'true'),
    daily === '1' ? getDailyForecast(location.lat, location.lon, 7, req.query.debug === 'true') : Promise.resolve(null),
    hourly === '1' ? getHourlyForecast(location.lat, location.lon, req.query.debug === 'true') : Promise.resolve(null),
  ]);

  const weatherData = { current, ...location };
  if (dailyForecast) weatherData.daily = dailyForecast;
  if (hourlyForecast) weatherData.hourly = hourlyForecast;
  
  res.json(weatherData);
}));

module.exports = router;

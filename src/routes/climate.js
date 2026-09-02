const express = require('express');
const router = express.Router();
const { getHistoricalDaily } = require('../services/climateService');
const asyncWrapper = require('../middleware/asyncWrapper');
const { validate, validators } = require('../middleware/validator');

router.get('/', validate(validators.latLonQuery), validate(validators.daysQuery), asyncWrapper(async (req, res) => {
  const { lat, lon, days } = req.query;
  const pastDays = days ? Number(days) : 30;
  const daily = await getHistoricalDaily(Number(lat), Number(lon), pastDays);
  res.json({ lat: Number(lat), lon: Number(lon), pastDays, daily });
}));

module.exports = router;

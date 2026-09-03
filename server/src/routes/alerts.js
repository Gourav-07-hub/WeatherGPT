const express = require('express');
const router = express.Router();
const { checkAlertsForLocation } = require('../services/alertService');
const asyncWrapper = require('../middleware/asyncWrapper');
const { validate, validators } = require('../middleware/validator');

router.get('/', validate(validators.latLonQuery), asyncWrapper(async (req, res) => {
  const { lat, lon } = req.query;
  const alerts = await checkAlertsForLocation(Number(lat), Number(lon));
  res.json({ alerts, count: alerts.length });
}));

module.exports = router;

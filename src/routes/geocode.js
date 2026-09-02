const express = require('express');
const router = express.Router();
const { geocode } = require('../services/geocodeService');
const asyncWrapper = require('../middleware/asyncWrapper');
const { validate, validators } = require('../middleware/validator');

router.get('/', validate(validators.qQuery), asyncWrapper(async (req, res) => {
  const result = await geocode(req.query.q, req.query.debug === 'true');
  if (!result) {
    return res.status(404).json({ error: 'Location not found' });
  }
  res.json(result);
}));

module.exports = router;

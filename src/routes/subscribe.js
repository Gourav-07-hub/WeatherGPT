const express = require('express');
const router = express.Router();
const { addSubscription, removeSubscription, listSubscriptions, checkAllSubscriptions } = require('../services/alertSubscriptionService');
const asyncWrapper = require('../middleware/asyncWrapper');
const { validate, validators } = require('../middleware/validator');

router.get('/', (req, res) => {
  res.json({ subscriptions: listSubscriptions() });
});

router.post('/', validate(validators.latLonBody), (req, res) => {
  const { name, lat, lon } = req.body;
  const sub = addSubscription({ name, lat, lon });
  res.status(201).json({ subscription: sub });
});

router.delete('/:id', (req, res) => {
  const removed = removeSubscription(Number(req.params.id));
  if (!removed) return res.status(404).json({ error: 'Not found' });
  res.json({ removed });
});

router.get('/check', asyncWrapper(async (req, res) => {
  const results = await checkAllSubscriptions();
  res.json({ checks: results });
}));

module.exports = router;

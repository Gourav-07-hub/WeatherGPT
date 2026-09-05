const express = require('express');
const router = express.Router();
const { subscriptions } = require('../services/alertSubscriptionService');
const asyncWrapper = require('../middleware/asyncWrapper');

router.get('/', asyncWrapper(async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write('data: {"status":"connected"}\n\n');

  const cityFilter = (req.query.city || '').toLowerCase().trim();

  const interval = setInterval(() => {
    const matched = [];
    for (const sub of subscriptions) {
      const subName = String(sub.name ?? '');
      if (cityFilter && !subName.toLowerCase().includes(cityFilter)) continue;
      if (sub.lastAlerts && sub.lastAlerts.length > 0) {
        matched.push({ location: sub.name, alerts: sub.lastAlerts });
      }
    }
    if (matched.length > 0) {
      res.write(`data: ${JSON.stringify({ type: 'alerts', alerts: matched })}\n\n`);
    } else {
      res.write('data: {"status":"ping"}\n\n');
    }
  }, 10000);

  res.on('error', () => clearInterval(interval));
  req.on('close', () => clearInterval(interval));
}));

module.exports = router;

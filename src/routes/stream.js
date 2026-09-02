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

  const interval = setInterval(() => {
    const alerts = [];
    for (const sub of subscriptions) {
      if (sub.lastAlerts && sub.lastAlerts.length > 0) {
        alerts.push({ location: sub.name, alerts: sub.lastAlerts });
      }
    }
    if (alerts.length > 0) {
      res.write(`data: ${JSON.stringify({ type: 'alerts', alerts })}\n\n`);
    } else {
      res.write('data: {"status":"ping"}\n\n');
    }
  }, 10000);

  req.on('close', () => clearInterval(interval));
}));

module.exports = router;

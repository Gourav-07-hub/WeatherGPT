// In-memory alert subscription store
// For hackathon: persists in process memory; replace with DB in production
const { checkAlertsForLocation } = require('./alertService');
const subscriptions = [];
let idCounter = 1;

async function checkAllSubscriptions() {
  const results = [];
  for (const sub of subscriptions) {
    const alerts = await checkAlertsForLocation(sub.lat, sub.lon);
    const newAlerts = alerts.filter((a) => {
      if (!sub.lastNotifiedAt) return true;
      return new Date(a.time) > new Date(sub.lastNotifiedAt);
    });
    if (newAlerts.length) {
      sub.lastNotifiedAt = new Date().toISOString();
      sub.lastAlerts = newAlerts;
      sub.updatedAt = new Date().toISOString();
    }
    results.push({ id: sub.id, name: sub.name, alerts: newAlerts });
  }
  return results;
}

function addSubscription({ name, lat, lon }) {
  const safeName = String(name || '').trim().slice(0, 100) || `${lat},${lon}`;
  const sub = {
    id: idCounter++,
    name: safeName,
    lat: Number(lat),
    lon: Number(lon),
    createdAt: new Date().toISOString(),
    lastNotifiedAt: null,
    lastAlerts: [],
    updatedAt: new Date().toISOString(),
  };
  subscriptions.push(sub);
  return sub;
}

function removeSubscription(id) {
  const idx = subscriptions.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  const [removed] = subscriptions.splice(idx, 1);
  return removed;
}

function listSubscriptions() {
  return subscriptions.map(({ id, name, lat, lon, createdAt, updatedAt }) => ({
    id, name, lat, lon, createdAt, updatedAt,
  }));
}

module.exports = {
  subscriptions,
  addSubscription,
  removeSubscription,
  listSubscriptions,
  checkAllSubscriptions,
};

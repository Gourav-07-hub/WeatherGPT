const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');

test('Health check endpoint returns 200 OK', async (t) => {
  const res = await fetch('http://localhost:3000/health');
  assert.strictEqual(res.status, 200);
  const json = await res.json();
  assert.strictEqual(json.status, 'ok');
});

test('Geocode endpoint handles missing q parameter', async (t) => {
  const res = await fetch('http://localhost:3000/api/geocode');
  assert.strictEqual(res.status, 400);
  const json = await res.json();
  assert.strictEqual(json.error, 'q is required and must be a string');
});

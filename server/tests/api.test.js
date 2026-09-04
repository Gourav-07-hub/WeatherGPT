const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

test.after(() => {
  if (server) server.close();
});

test('Health check endpoint returns 200 OK', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.strictEqual(res.status, 200);
  const json = await res.json();
  assert.strictEqual(json.status, 'ok');
});

test('Geocode endpoint handles missing q parameter', async () => {
  const res = await fetch(`${baseUrl}/api/geocode`);
  assert.strictEqual(res.status, 400);
  const json = await res.json();
  assert.strictEqual(json.error, 'q is required and must be a string');
});
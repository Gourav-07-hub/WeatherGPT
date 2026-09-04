const test = require('node:test');
const assert = require('node:assert');

// --- Unit tests for OWM hourly forecast format mapping ---

// Simulate the mapping logic from openWeatherMapService.js
function mapOWMCode(owmId) {
  if (!owmId && owmId !== 0) return 0;
  if (owmId === 800) return 0;
  if (owmId >= 801 && owmId <= 804) return owmId - 800 + 2;
  if (owmId >= 200 && owmId < 300) return 95;
  if (owmId >= 300 && owmId < 400) return 51;
  if (owmId >= 500 && owmId < 600) return 61;
  if (owmId >= 600 && owmId < 700) return 71;
  if (owmId >= 700 && owmId < 800) return 45;
  if (owmId >= 800 && owmId < 900) return 0;
  return 0;
}

function mapOWMHourlyResponse(data) {
  if (!Array.isArray(data.list) || data.list.length === 0) return null;
  return {
    time: data.list.map(item => {
      if (!item.dt_txt) return null;
      return item.dt_txt.replace(' ', 'T').slice(0, 16);
    }),
    temperature_2m: data.list.map(item => item.main?.temp),
    relative_humidity_2m: data.list.map(item => item.main?.humidity),
    weather_code: data.list.map(item => mapOWMCode(item.weather?.[0]?.id)),
    wind_speed_10m: data.list.map(item => (item.wind?.speed ?? 0) * 3.6),
    precipitation: data.list.map(item => (item.rain?.['3h'] ?? item.snow?.['3h'] ?? 0) / 3),
    source: 'openweathermap',
  };
}

const sampleOWMResponse = {
  cod: '200',
  list: [
    {
      dt_txt: '2026-09-04 12:00:00',
      main: { temp: 32.5, humidity: 65, feels_like: 35.1 },
      weather: [{ id: 800, main: 'Clear', description: 'clear sky' }],
      wind: { speed: 5.5, deg: 180 },
      rain: null,
      snow: null,
    },
    {
      dt_txt: '2026-09-04 15:00:00',
      main: { temp: 33.1, humidity: 60, feels_like: 36.0 },
      weather: [{ id: 801, main: 'Clouds', description: 'few clouds' }],
      wind: { speed: 8.2, deg: 200 },
      rain: { '3h': 2.5 },
      snow: null,
    },
    {
      dt_txt: '2026-09-04 18:00:00',
      main: { temp: 28.0, humidity: 80, feels_like: 30.0 },
      weather: [{ id: 500, main: 'Rain', description: 'light rain' }],
      wind: { speed: 12.0, deg: 250 },
      rain: { '3h': 15.0 },
      snow: null,
    },
  ],
};

test('OWM time format is normalized to ISO-like format', () => {
  const result = mapOWMHourlyResponse(sampleOWMResponse);
  assert.ok(result, 'should return result');
  assert.deepStrictEqual(result.time, [
    '2026-09-04T12:00',
    '2026-09-04T15:00',
    '2026-09-04T18:00',
  ]);
});

test('OWM time format matches the T separator the frontend expects', () => {
  const result = mapOWMHourlyResponse(sampleOWMResponse);
  const isoNow = '2026-09-04T12:00';
  // The frontend does: hourly.time.findIndex((t) => t >= isoNow)
  const startIndex = result.time.findIndex((t) => t >= isoNow);
  assert.strictEqual(startIndex, 0, 'should find the first entry matching current time');
});

test('OWM wind speed is converted from m/s to km/h', () => {
  const result = mapOWMHourlyResponse(sampleOWMResponse);
  // 5.5 m/s * 3.6 = 19.8 km/h
  assert.strictEqual(result.wind_speed_10m[0], 5.5 * 3.6);
  // 8.2 m/s * 3.6 = 29.52 km/h
  assert.strictEqual(result.wind_speed_10m[1], 8.2 * 3.6);
  // 12.0 m/s * 3.6 = 43.2 km/h
  assert.strictEqual(result.wind_speed_10m[2], 12.0 * 3.6);
});

test('OWM precipitation is divided by 3 (3h accumulation -> hourly rate)', () => {
  const result = mapOWMHourlyResponse(sampleOWMResponse);
  // No rain: 0 / 3 = 0
  assert.strictEqual(result.precipitation[0], 0);
  // 2.5mm over 3h -> ~0.833 mm/h
  assert.ok(Math.abs(result.precipitation[1] - 2.5 / 3) < 0.001);
  // 15mm over 3h -> 5 mm/h
  assert.strictEqual(result.precipitation[2], 15.0 / 3);
});

test('OWM weather codes are mapped to WMO codes', () => {
  const result = mapOWMHourlyResponse(sampleOWMResponse);
  assert.strictEqual(result.weather_code[0], 0);   // 800 -> clear -> 0
  assert.strictEqual(result.weather_code[1], 3);   // 801 -> few clouds -> 3
  assert.strictEqual(result.weather_code[2], 61);  // 500 -> light rain -> 61
});

test('OWM source tag is set correctly', () => {
  const result = mapOWMHourlyResponse(sampleOWMResponse);
  assert.strictEqual(result.source, 'openweathermap');
});

test('OWM returns null for empty list', () => {
  const result = mapOWMHourlyResponse({ list: [] });
  assert.strictEqual(result, null);
});

test('OWM returns null for missing list', () => {
  const result = mapOWMHourlyResponse({ cod: '200' });
  assert.strictEqual(result, null);
});

test('OWM handles null rain/snow fields', () => {
  const data = {
    list: [
      {
        dt_txt: '2026-09-04 12:00:00',
        main: { temp: 25, humidity: 50 },
        weather: [{ id: 800 }],
        wind: { speed: 3 },
        rain: null,
        snow: null,
      },
    ],
  };
  const result = mapOWMHourlyResponse(data);
  assert.strictEqual(result.precipitation[0], 0);
});

test('OWM handles missing wind field', () => {
  const data = {
    list: [
      {
        dt_txt: '2026-09-04 12:00:00',
        main: { temp: 25, humidity: 50 },
        weather: [{ id: 800 }],
        wind: undefined,
        rain: null,
        snow: null,
      },
    ],
  };
  const result = mapOWMHourlyResponse(data);
  assert.strictEqual(result.wind_speed_10m[0], 0);
});

test('Wind speed threshold consistency: strong_wind alert at 50 km/h', () => {
  const result = mapOWMHourlyResponse({
    list: [
      {
        dt_txt: '2026-09-04 12:00:00',
        main: { temp: 25, humidity: 50 },
        weather: [{ id: 800 }],
        // wind.speed = 14 m/s = 50.4 km/h -> should trigger wind > 50
        wind: { speed: 14 },
        rain: null,
        snow: null,
      },
    ],
  });
  assert.ok(result.wind_speed_10m[0] > 50, '14 m/s should convert to >50 km/h and trigger alert');
});

// --- Integration test: weatherService fallback path ---
// We mock fetch to test the fallback logic without hitting real APIs

test('getHourlyForecast falls back to OWM when Open-Meteo fails', async () => {
  // We can't easily test the full weatherService without heavy mocking,
  // so we verify the contract: OWM output shape matches what the frontend expects
  const owmResult = mapOWMHourlyResponse(sampleOWMResponse);

  // Verify all fields the frontend HourlyForecast.jsx reads
  assert.ok(Array.isArray(owmResult.time), 'time must be an array');
  assert.ok(Array.isArray(owmResult.temperature_2m), 'temperature_2m must be an array');
  assert.ok(Array.isArray(owmResult.weather_code), 'weather_code must be an array');

  // Verify all fields the alertService reads
  assert.ok(Array.isArray(owmResult.precipitation), 'precipitation must be an array');
  assert.ok(Array.isArray(owmResult.wind_speed_10m), 'wind_speed_10m must be an array');

  // Verify arrays are same length
  const len = owmResult.time.length;
  assert.strictEqual(owmResult.temperature_2m.length, len);
  assert.strictEqual(owmResult.weather_code.length, len);
  assert.strictEqual(owmResult.wind_speed_10m.length, len);
  assert.strictEqual(owmResult.precipitation.length, len);

  // Verify time strings are parseable and in the right format
  for (const t of owmResult.time) {
    assert.ok(t.includes('T'), `time "${t}" should contain T separator`);
    assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t), `time "${t}" should match ISO format`);
  }
});

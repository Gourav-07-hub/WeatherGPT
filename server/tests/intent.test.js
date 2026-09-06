const test = require('node:test');
const assert = require('node:assert');
const { extractLocation, detectIntent } = require('../src/services/intentService');

test('extractLocation returns empty for generic phrases with no location', () => {
  assert.strictEqual(extractLocation('will it rain today?'), '');
  assert.strictEqual(extractLocation('any extreme alerts'), '');
  assert.strictEqual(extractLocation('show me climate trends'), '');
  assert.strictEqual(extractLocation('what is the temperature now'), '');
});

test('extractLocation returns empty for greetings and chit-chat', () => {
  assert.strictEqual(extractLocation('hi'), '');
  assert.strictEqual(extractLocation('hello'), '');
  assert.strictEqual(extractLocation('hey weathergpt'), '');
  assert.strictEqual(extractLocation('good morning'), '');
});

test('extractLocation finds the location after prepositions', () => {
  assert.strictEqual(extractLocation('what is the weather in Delhi tomorrow'), 'delhi');
  assert.strictEqual(extractLocation('is it raining in Mumbai?'), 'mumbai');
  assert.strictEqual(extractLocation('weather in Bangalore'), 'bangalore');
  assert.strictEqual(extractLocation('forecast for London this week'), 'london');
  assert.strictEqual(extractLocation('rain in Chennai'), 'chennai');
});

test('extractLocation handles multi-word locations after a preposition', () => {
  const loc = extractLocation('weather in new york tomorrow');
  assert.strictEqual(loc, 'new york');
});

test('detectIntent classifies the main suggestion queries', () => {
  assert.strictEqual(detectIntent('will it rain today?'), 'current');
  assert.strictEqual(detectIntent('any extreme alerts'), 'alerts');
  assert.strictEqual(detectIntent('show me climate trends'), 'climate');
  assert.strictEqual(detectIntent('what\'s the weather tomorrow'), 'forecast');
});

test('detectIntent classifies vader intelligence queries', () => {
  assert.strictEqual(detectIntent('vader briefing for Mumbai'), 'vader');
  assert.strictEqual(detectIntent('situation report for Delhi'), 'vader');
  assert.strictEqual(detectIntent('ground report in Chennai'), 'vader');
  assert.strictEqual(detectIntent('navic status for Pune'), 'vader');
});
function validate(schema) {
  return (req, res, next) => {
    try { schema(req); next(); } catch (err) { err.status = 400; next(err); }
  };
}
function assertNumber(val, min, max, name) {
  if (val === undefined || val === null || val === '') throw new Error(`${name} is required`);
  const num = Number(val);
  if (Number.isNaN(num) || num < min || num > max) throw new Error(`${name} must be a valid number between ${min} and ${max}`);
  return num;
}
function assertString(val, maxLen, name) {
  if (!val || typeof val !== 'string') throw new Error(`${name} is required and must be a string`);
  if (val.length > maxLen) throw new Error(`${name} must be max ${maxLen} characters`);
  return val;
}
const validators = {
  latLonQuery: (req) => { assertNumber(req.query.lat, -90, 90, 'lat'); assertNumber(req.query.lon, -180, 180, 'lon'); },
  latLonBody: (req) => { assertNumber(req.body.lat, -90, 90, 'lat'); assertNumber(req.body.lon, -180, 180, 'lon'); },
  qQuery: (req) => { assertString(req.query.q, 200, 'q'); },
  daysQuery: (req) => { if (req.query.days) assertNumber(req.query.days, 1, 90, 'days'); },
  chat: (req) => {
    assertString(req.body.message, 1000, 'message');
    if (req.body.lang) {
      if (!['en', 'hi', 'ta', 'bn', 'te', 'mr', 'gu'].includes(req.body.lang)) throw new Error('Unsupported lang code');
    }
    if (req.body.mode != null && req.body.mode !== '') {
      if (typeof req.body.mode !== 'string' || !['vader', 'weather', 'auto'].includes(req.body.mode.toLowerCase().trim())) throw new Error('Unsupported chat mode');
    }
  }
};
module.exports = { validate, validators };

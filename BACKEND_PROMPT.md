# WeatherGPT — Backend Refactor & Hardening Prompt for AI Agent

## Project context
WeatherGPT is a Node.js + Express weather assistant for Smart India Hackathon (SIH) 2026 problem statement **"WeatherGPT: Conversational AI for Weather Forecasting, Alerts, and Climate Information"** (PS ID 26068, Ministry of Earth Sciences / India Meteorological Department).

## Repo
Path: `/home/gorumulewa/weathergpt`
Start server: `cd /home/gorumulewa/weathergpt && npm start`
Backend entry: `src/app.js`
Routes: `src/routes/`
Services: `src/services/`
Utils: `src/utils/`

## Current backend APIs (do NOT break these)
- `POST /api/chat` — { message, lang? } → { reply, intent, location, lat, lon, weather, replyMode }
- `GET /api/weather?q=City&daily=1` — current/daily weather JSON
- `GET /api/geocode?q=City` — { lat, lon, name }
- `GET /api/alerts?lat=&lon=` — { alerts, count }
- `POST /api/subscribe` — { name, lat, lon }
- `GET /api/subscribe` — list subscriptions
- `DELETE /api/subscribe/:id`
- `GET /api/stream` — SSE for live alerts
- `GET /api/climate?lat=&lon=&days=30` — { daily } for charts
- `GET /api/weather/nearby?lat=&lon=` — current weather by coords
- `GET /health` — health check (to be added)

## What to build
Refactor and harden the backend into a clean, production-ready Node.js service. Keep the API surface identical. Do NOT change request/response shapes that the frontend depends on.

### 1. Project structure & cleanup
- Keep `src/app.js` as the entrypoint.
- Keep all routes in `src/routes/`.
- Keep all services in `src/services/`.
- Keep all utils in `src/utils/`.
- Add a `src/middleware/` folder for reusable middleware.
- Add a `src/config/` folder for env/config loading.
- Remove any duplicate or dead code.
- Ensure every file has a single clear responsibility.

### 2. Configuration & environment
- Replace ad-hoc `process.env` usage with a central config module in `src/config/`.
- Validate required env vars at startup with clear error messages.
- Support `.env`, `.env.local`, and `.env.development`.
- Provide sensible defaults for local development.
- Make `PORT`, `CORS_ORIGIN`, `OPENAI_API_KEY`, `OPENAI_BASE`, `OPENAI_MODEL` configurable.

### 3. Error handling & logging
- Add a global error handler middleware in `src/middleware/errorHandler.js`.
- Replace `console.error` with a structured logger (use `pino` or a minimal custom logger).
- Ensure all async route handlers catch errors consistently.
- Return consistent error JSON: `{ error: string, details?: string, status?: number }`.
- Log request method, path, status, and response time.

### 4. Caching
- Add in-memory caching for:
  - Geocoding results (key: normalized query, TTL: 24h)
  - Current weather (key: lat|lon, TTL: 10m)
  - Daily forecast (key: lat|lon|days, TTL: 30m)
  - Hourly forecast / alerts (key: lat|lon, TTL: 15m)
- Use a simple `Map`-based cache with TTL eviction.
- Add cache hit/miss logging for observability.
- Ensure cache is bypassed for explicit `debug=true` query param.

### 5. Rate limiting
- Add a simple in-memory rate limiter for external API calls:
  - Open-Meteo: max 10 requests/second per server instance
  - Nominatim: max 1 request/second, with mandatory User-Agent header
- Add a retry with backoff for transient 429/503 responses from upstreams.
- Return `429` with `Retry-After` header when rate limit is hit.

### 6. Input validation
- Validate all query params and request bodies with clear error messages.
- `lat`/`lon` must be valid numbers within +/- 90/180.
- `q` must be non-empty string, max 200 chars.
- `days` must be integer 1-90.
- `message` must be non-empty string, max 1000 chars.
- `lang` must be one of supported codes: `en`, `hi`, `ta`, `bn`, `te`, `mr`, `gu`.

### 7. Service improvements
- `weatherService.js`: add request timeout (10s), retry logic, and better error messages.
- `geocodeService.js`: add input sanitization, rate limiting, and caching.
- `alertService.js`: make alert thresholds configurable via constants.
- `alertSubscriptionService.js`: add TTL for subscriptions (30 days), cleanup expired subscriptions.
- `climateService.js`: validate `days` param, cap at 90.
- `llmService.js`: add timeout (5s), better fallback messaging when LLM is unavailable.
- `intentService.js`: keep as-is for now, but ensure it handles edge cases (empty strings, special chars).

### 8. SSE / streaming improvements
- Add heartbeat comment `: ping\n\n` every 30s to keep connections alive.
- Handle client disconnect gracefully.
- Limit max connections to `/api/stream` to 100.
- Document SSE event format in code comments.

### 9. Health check
- Add `GET /health` returning:
  ```json
  {
    "status": "ok",
    "uptime": 123,
    "timestamp": "2026-09-02T...",
    "dependencies": {
      "openmeteo": "ok",
      "nominatim": "ok"
    }
  }
  ```
- Make dependency checks async and cached for 60s.

### 10. Security
- Add `helmet` for security headers (keep CORS separate via existing `cors` package).
- Sanitize all user inputs before logging.
- Do NOT expose stack traces in production error responses.
- Add basic request size limits (`express.json({ limit: '100kb' })`).

### 11. Tests
- Add a `tests/` folder with basic integration tests using `node:test`.
- Test every route with at least 2 cases (happy path + error).
- Test geocoding, weather, chat, alerts, subscribe, climate.
- Make tests runnable with `npm test`.

### 12. Documentation
- Update `README.md` with:
  - Project overview
  - API endpoint table
  - Environment variables
  - How to run locally
  - How to run tests
  - How to deploy
- Add JSDoc comments to all public functions in services and routes.
- Add an `OPENAPI.md` or inline route docs for API consumers.

## Constraints
- Do NOT change the API contract for any existing route.
- Do NOT add new runtime dependencies beyond what is needed for logging/testing.
- Keep local `npm start` behavior unchanged.
- All changes must be backward-compatible.
- Do not ask for API keys; design for optional env vars.

## Output expected
1. List of files added/changed.
2. One-paragraph summary of what changed.
3. Exact commands to run, test, and verify.
4. One curl command per API route showing it still works with expected output shape.

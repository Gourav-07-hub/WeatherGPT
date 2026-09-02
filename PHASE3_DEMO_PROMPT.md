# WeatherGPT — Phase 3: Demo-Ready Polish Prompt

## Project context
WeatherGPT is a Node.js + Express weather assistant for Smart India Hackathon (SIH) 2026 PS 26068. The backend is functional with Open-Meteo, OpenWeatherMap, and WeatherAPI.com integrations. The frontend is a working animated prototype but still needs real data wiring and demo polish.

## Repo
Path: `/home/gorumulewa/weathergpt`
Start: `cd /home/gorumulewa/weathergpt && npm start`
Frontend: `public/index.html`
Backend: `src/app.js` + routes in `src/routes/`

## Current backend APIs
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

## What to build
Make the app demo-ready by completing the frontend wiring and adding production polish. Focus on features judges will see during a live demo.

### Priority 1: Real Data Wiring (must complete)
1. Replace mock `hourlyData` and `dailyData` in `public/index.html` with live API calls.
2. On page load, geocode default city and fetch real weather.
3. After chat response, update hourly/daily sections with real data.
4. Map weather codes to existing sky states: clear-day, cloudy, rain, storm, snow, clear-night.
5. Wire alerts panel with subscribe/list/remove functionality.
6. Wire climate panel with 30-day SVG chart.
7. Add voice input/output with Web Speech API.
8. Add geolocation onboarding with permission prompt.
9. Add quick-reply chips below prompt bar.
10. Remove the debug widget.

### Priority 2: Demo Experience (polish for judges)
1. Add loading skeletons for bot messages and data sections.
2. Add retry UX for failed API calls.
3. Improve mobile keyboard handling with `visualViewport`.
4. Add safe-area insets for notched phones.
5. Ensure all animations respect `prefers-reduced-motion`.
6. Add a simple onboarding hint for first-time users.

### Priority 3: Production Basics (if time permits)
1. Add `/health` endpoint.
2. Add `README.md` with run instructions.
3. Add `.dockerignore` and `Dockerfile`.
4. Add basic integration tests using `node:test`.

## Constraints
- Keep the existing animated sky UI and color palette.
- Do not add external CSS/JS frameworks.
- Do not break any existing API contracts.
- Keep changes additive and reversible.
- Do not ask for API keys; use env vars with safe fallbacks.

## Verification
1. `cd /home/gorumulewa/weathergpt && npm start`
2. Open `http://localhost:3000`
3. Confirm:
   - Hourly/daily show real data
   - Chat updates location and weather
   - Sky state changes based on real weather codes
   - Alerts panel subscribes/removes
   - Climate panel shows chart
   - Mic button works for voice input
   - Geolocation prompt appears on first visit
   - Quick-reply chips populate and submit
   - Debug widget is removed
   - No console errors

## Output
- List of files changed/added
- One-paragraph summary
- Commands to run and verify

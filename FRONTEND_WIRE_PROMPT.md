# WeatherGPT — Frontend Real-Data Wiring Prompt

## Goal
Replace mock data in `public/index.html` with live API calls while keeping the existing animated sky UI intact. Do not redesign the page; only wire data and add missing UI features.

## Repo
Path: `/home/gorumulewa/weathergpt`
Server: `cd /home/gorumulewa/weathergpt && npm start`
Frontend: `public/index.html`

## Existing APIs (do NOT change backend)
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

## What to change in `public/index.html`

### 1. Remove mock data
- Delete the hardcoded `hourlyData` and `dailyData` arrays.
- Replace with live API calls on page load and after each chat response.

### 2. Wire real hourly + daily data
- On first load, call `/api/geocode?q=Bhopal` to get lat/lon.
- Then call `/api/weather?q=Bhopal&daily=1` to get current + 7-day forecast.
- Render hourly ticks from `weather.hourly` if available, else from current weather time series.
- Render daily strips from `weather.daily`.
- If geocoding fails, show a friendly inline error and keep the mock data as fallback.

### 3. Wire chat to update location + weather
- After `/api/chat` returns `location`, `lat`, `lon`:
  - Update `#loc-display` with the location name.
  - Call `/api/weather?q=<location>&daily=1` and re-render hourly/daily.
  - Update sky state based on `weather.current.weather_code` using the existing `setWeatherState()` mapping.

### 4. Add weather-code → sky-state mapping
- Map Open-Meteo / mapped weather codes to existing states:
  - Clear / 0 → `clear-day`
  - Cloudy / 2-3 → `cloudy`
  - Rain / 51-67 → `rain`
  - Thunderstorm / 95-99 → `storm`
  - Snow / 71-77 → `snow`
  - Night → only if local time is after 19:00 or before 06:00, use `clear-night`

### 5. Add alerts panel
- Add a new button in `.controls`: `🔔 Alerts`
- On click, open a right-side drawer (`.alerts-panel`) with:
  - Subscribe button that calls `/api/subscribe` with current lat/lon
  - List of subscriptions from `/api/subscribe`
  - Remove button per subscription calling `DELETE /api/subscribe/:id`
  - Alert list for selected subscription from `lastAlerts`
- Auto-refresh every 60s with a subtle spinner.

### 6. Add climate chart panel
- Add a new button in `.controls`: `📈 Climate`
- On click, open a right-side drawer (`.chart-panel`) with:
  - SVG line chart rendered from `/api/climate?lat=&lon=&days=30`
  - Max temperature line, min temperature line, rain bars
  - Responsive width, horizontal scroll if needed
- Lazy-load chart data only when panel opens.

### 7. Add voice input/output
- Add a 🎤 mic button next to the chat input.
- Use `SpeechRecognition` / `webkitSpeechRecognition` for voice input.
- Use `speechSynthesis` for bot reply voice output.
- Match `lang` select to speech lang codes (`en-IN`, `hi-IN`, etc.).
- Hide mic button if API unavailable.

### 8. Add geolocation onboarding
- On first visit, if `navigator.geolocation` is available, ask permission.
- If granted, call `/api/weather/nearby?lat=&lon=` and render current weather.
- If denied or unavailable, fall back to Bhopal.

### 9. Add quick-reply chips
- Below the prompt bar, show 4 chips: `Current weather`, `7-day forecast`, `Alerts`, `Climate`
- On click, populate input and submit the corresponding query.

### 10. Improve mobile composer
- Use `visualViewport` API to shift composer above keyboard on mobile.
- Add safe-area padding for notched phones.

### 11. Loading/error states
- Show a spinner in `#send-btn` while waiting for `/api/chat`.
- Show inline error message in chat thread on network failure.
- Show skeleton loaders for hourly/daily while fetching.

### 12. Remove debug widget
- Delete the `.debug-widget` div entirely.
- Keep only the real sky-state logic.

## Constraints
- Keep the existing animated sky, glass UI, and color palette.
- Do not add external CSS/JS libraries.
- Do not change backend APIs.
- Keep all existing JS functionality intact.
- Ensure `prefers-reduced-motion` still disables animations.

## Verification
1. `cd /home/gorumulewa/weathergpt && npm start`
2. Open `http://localhost:3000`
3. Verify:
   - Hourly/daily sections show real data
   - Chat updates location and weather
   - Sky state changes based on weather code
   - Alerts panel opens, subscribes, removes
   - Climate panel shows 30-day chart
   - Mic button appears and captures speech
   - Geolocation prompt appears on first visit
   - Quick-reply chips work
   - Mobile keyboard doesn’t hide composer
   - Debug widget is gone

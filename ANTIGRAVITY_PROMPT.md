# WeatherGPT — Build Prompt for Antigravity

## Project context
WeatherGPT is a Node.js + Express weather assistant for the Smart India Hackathon (SIH) 2026 problem statement **"WeatherGPT: Conversational AI for Weather Forecasting, Alerts, and Climate Information"** (PS ID 26068, Ministry of Earth Sciences / India Meteorological Department).

## Repo
Path: `/home/gorumulewa/weathergpt`
Start server: `cd /home/gorumulewa/weathergpt && npm start`
Frontend: `public/index.html`
Backend: `src/app.js` + routes in `src/routes/`

## Current state
- Chatbot with rule-based intent detection (current / forecast / alerts / climate)
- Open-Meteo API integration (no key required)
- Nominatim geocoding
- Voice input/output via Web Speech API
- 7-language selector: English, Hindi, Tamil, Bengali, Telugu, Marathi, Gujarati
- Optional OpenAI-compatible LLM multilingual replies via `.env`
- Alert subscription + SSE live push
- 30-day climate chart (SVG)
- Geolocation-aware weather endpoint
- Mobile-first dark-themed UI

## What to build next
Pick **one** lane and complete it end-to-end with working code and a short manual test proof.

### Lane A — Productionize & Deploy
1. Add a `Dockerfile` and `.dockerignore`.
2. Add a `README.md` with setup, run, and deploy steps.
3. Make the app deployable to **Vercel** (preferred) or Render/Railway.
4. Add health-check route `/health`.
5. Ensure `CORS_ORIGIN` can be set via env for production.
6. Do NOT break local `npm start` behavior.

### Lane B — Browser UX Polish & Demo Flow
1. Add an onboarding/permissions flow for geolocation with graceful fallback.
2. Add quick-reply chips: "Current weather", "7-day forecast", "Alerts", "Climate".
3. Add loading skeletons for bot replies and chart panel.
4. Make alerts panel auto-refresh without full reload.
5. Improve mobile keyboard handling so composer never hides the input.
6. Keep the existing dark theme and WCAG-AA contrast.

### Lane C — Indian-language Quality & Offline Mode
1. Replace hardcoded term-mapping with backend-generated multilingual replies.
2. Add Indian-language voice output fallbacks when `speechSynthesis` voices are missing.
3. Add service-worker-based offline caching for the chat shell and last-known weather.
4. Add a visible “offline mode” indicator in the UI.

## Constraints
- Keep changes reversible and additive.
- Do not remove existing features.
- Node.js only; no new backend frameworks.
- Do not ask the user for API keys or secrets; design for optional env vars.
- Verify with a short manual test after building (curl or browser check).

## Output expected
1. List of files changed/added.
2. One-paragraph summary of what changed.
3. Exact command to run or deploy.
4. One manual verification step with expected output.

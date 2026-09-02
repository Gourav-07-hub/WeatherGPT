# WeatherGPT

Conversational AI for weather forecasting, alerts, and climate information.

**Built for Smart India Hackathon (SIH) 2026**

![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## What It Does

WeatherGPT turns plain English questions into live weather answers. Instead of clicking through menus, users can ask natural questions like:

- "What is the weather in Delhi tomorrow?"
- "Will it rain in Bangalore this weekend?"
- "Set an alert if temperature drops below 10 in Shimla"
- "Compare climate data between Mumbai and Chennai"

The backend parses intent, fetches data through a provider fallback chain, and returns structured answers through a unified chat API.

## Features

- **Natural Language Weather Queries** -- chat-style interface for current, forecast, and historical weather
- **Multi-Provider Fallback Chain** -- WeatherAPI -> OpenWeatherMap -> Open-Meteo for resilient data access
- **Geo-Aware Search** -- city name, coordinates, and IP-based geocoding
- **Weather Alerts & Subscriptions** -- server-sent event (SSE) streams for real-time alert delivery
- **Climate Data & Visualization** -- monthly and seasonal climate summaries with trend indicators
- **Live Weather Sky UI** -- animated sky background that reflects actual weather conditions
- **Error-Handled API Layer** -- centralized error handler, async wrappers, request logging, and cache

## Tech Stack

| Layer | Tools |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express |
| Clients | node-fetch |
| Config | dotenv |
| Browser | Vanilla HTML/CSS/JS served from `/public` |

## Project Structure

```
weathergpt/
├── src/
│   ├── app.js                 # Express app setup, middleware, routes
│   ├── config/
│   │   └── env.js             # Environment configuration
│   ├── routes/
│   │   ├── chat.js            # Natural language weather chat
│   │   ├── weather.js         # Direct weather data endpoints
│   │   ├── geocode.js         # Location search and reverse geocoding
│   │   ├── alerts.js          # Weather alerts management
│   │   ├── subscribe.js       # Alert subscription handlers
│   │   ├── stream.js          # SSE alert streaming
│   │   └── climate.js         # Climate data endpoints
│   ├── services/
│   │   ├── weatherService.js  # Orchestrates weather provider chain
│   │   ├── weatherApiService.js
│   │   ├── openWeatherMapService.js
│   │   ├── llmService.js      # Intent parsing and response generation
│   │   ├── intentService.js   # Query intent classification
│   │   ├── climateService.js  # Climate data aggregation
│   │   ├── geocodeService.js  # Location resolution
│   │   ├── alertService.js    # Alert evaluation logic
│   │   └── alertSubscriptionService.js
│   ├── middleware/
│   │   ├── validator.js       # Input validation
│   │   ├── asyncWrapper.js    # Async error catching
│   │   ├── requestLogger.js   # Request logging
│   │   └── errorHandler.js    # Centralized error formatting
│   └── utils/
│       ├── fetcher.js         # HTTP fetch wrapper with retries
│       ├── cache.js           # In-memory caching layer
│       ├── logger.js          # Structured logging
│       └── weatherCodes.js    # WMO weather code mappings
├── public/                    # Frontend assets
├── tests/                     # Test suite
├── package.json
├── Dockerfile
└── .env                       # API keys and config
```

## Weather Provider Chain

WeatherGPT uses a **failover strategy** to maximize uptime:

1. **WeatherAPI** -- primary source for current weather and forecasts
2. **OpenWeatherMap** -- fallback for current weather and geocoding
3. **Open-Meteo** -- last-resort fallback for forecasts and climate data

If one provider is rate-limited, down, or missing an API key, the service automatically routes to the next available provider.

## Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Add your API keys: WEATHERAPI_KEY, OPENWEATHER_API_KEY, OPENAI_API_KEY

# 3. Start the server
npm start

# 4. Open the app
open http://localhost:3000
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `WEATHERAPI_KEY` | - | WeatherAPI key for current/forecast weather |
| `OPENWEATHER_API_KEY` | - | OpenWeatherMap key for fallback weather data |
| `OPENAI_API_KEY` | - | OpenAI key for natural language intent parsing |
| `CORS_ORIGIN` | `*` | CORS allowed origins |
| `NODE_ENV` | `development` | Environment mode |

See `src/config/env.js` for the full list.

## API Endpoints

### Chat
`POST /api/chat`
Send natural language weather questions.

```json
{
  "message": "What is the weather in Pune today?",
  "location": "Pune"
}
```

### Weather
`GET /api/weather?city=Pune&days=3`
Direct forecast endpoint.

### Alerts
`POST /api/alerts` -- create an alert
`GET /api/alerts?city=Mumbai` -- list active alerts

### Subscriptions & Streaming
`POST /api/subscribe` -- subscribe to city alert stream
`GET /api/stream?city=Mumbai` -- SSE endpoint for real-time alerts

### Climate
`GET /api/climate?city=Delhi&month=June`
Monthly and seasonal climate summaries.

### Geocode
`GET /api/geocode?city=Bangalore`
City name to coordinates and metadata.

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test
```

## Docker

```bash
docker build -t weathergpt .
docker run -p 3000:3000 --env-file .env weathergpt
```

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes (`git commit -m "feat: add your feature"`)
4. Push the branch (`git push origin feat/your-feature`)
5. Open a Pull Request

## License

MIT

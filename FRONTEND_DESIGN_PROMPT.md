# WeatherGPT — Frontend Animation & Design Prompt for AI Agent

## Project context
WeatherGPT is a Node.js + Express weather assistant for the Smart India Hackathon (SIH) 2026 problem statement **"WeatherGPT: Conversational AI for Weather Forecasting, Alerts, and Climate Information"** (PS ID 26068, Ministry of Earth Sciences / India Meteorological Department).

## Repo
Path: `/home/gorumulewa/weathergpt`
Start server: `cd /home/gorumulewa/weathergpt && npm start`
Frontend entry: `public/index.html`
Backend API: `src/app.js` with routes in `src/routes/`

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

## Design mission
Redesign `public/index.html` into a **premium, animated, mobile-first** weather assistant UI that feels like a modern production app. Keep all existing JS functionality intact: chat, voice input/output, SSE alerts, climate chart panel, language selector, alert subscriptions.

## Design requirements

### Color palette
- Primary background: deep navy/slate `#0b1220`
- Surface panels: layered dark blues `#111a2e`, `#192236`
- Accent primary: vibrant green `#3ecf8e`
- Accent secondary: sky blue `#5ab0ff`
- Text primary: near-white `#e7eeff`
- Text secondary: muted blue-gray `#8ea3c4`
- Danger/alert: coral red `#ff6b6b`
- Success: `#3ecf8e`
- Use gradients sparingly: accent-to-accent2 for brand elements only

### Typography
- System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Clear hierarchy: brand/title, section headers, body, captions
- Comfortable line-height 1.45–1.6
- Avoid tiny fonts; minimum 12px for body, 10px only for badges

### Animation strategy
Use **subtle, purposeful** animations. No excessive motion.

1. **Page load**
   - Fade-in header from top with slight blur reveal
   - Chat messages stagger-fade in with gentle upward float

2. **Chat interactions**
   - User messages: slide in from right with spring easing
   - Bot messages: slide in from left with fade
   - Typing indicator: 3-dot wave animation
   - Send button: scale-down on press, scale-up on release

3. **Weather cards**
   - Current weather card: gentle floating animation (translateY 0→-6px, 3s ease-in-out infinite)
   - Forecast chips: staggered entrance on load
   - Temperature numbers: count-up animation when values change

4. **Panel transitions**
   - Alerts panel: slide in from right, backdrop blur fade
   - Climate chart panel: slide in from right with slight scale
   - All panels: backdrop-filter blur on overlay

5. **Micro-interactions**
   - Mic button: pulse ring when listening, color shift to danger
   - Quick-reply chips: hover lift + glow, press scale
   - Language selector: smooth dropdown with fade
   - Subscribe button: success checkmark animation after click
   - SSE alert: gentle shake + glow on new alert bubble

6. **Weather-specific animations**
   - Weather icon gentle bob (translateY, 2s infinite)
   - Rain effect: subtle diagonal line particles on rainy days
   - Sun effect: slow rotate glow on clear days
   - Thunder: screen flash on thunderstorm alerts

### Layout & components
1. **Header**
   - Sticky with backdrop blur
   - Logo + brand gradient text
   - Action buttons: Alerts, Climate, Language
   - Collapse to hamburger on very small screens

2. **Chat area**
   - Max-width 720px, centered
   - Message bubbles with distinct user/bot styling
   - Bot messages: show timestamp, reply mode badge (rule/llm)
   - Weather cards inside chat: elevated card with icon, temp, condition
   - Quick-reply chips below bot weather responses

3. **Composer**
   - Fixed bottom with gradient fade
   - Rounded input with focus ring animation
   - Mic + Send buttons with hover/active states
   - Auto-adjust for keyboard on mobile (use `visualViewport` API)

4. **Alerts panel**
   - Right-side drawer, 380px max
   - Subscription cards with remove button
   - Alert list with severity color coding
   - Auto-refresh every 60s with subtle spinner

5. **Climate chart panel**
   - Right-side drawer, SVG-based
   - Smooth line chart with gradient fill under curves
   - Rain bars overlay
   - Responsive width with horizontal scroll if needed

6. **Onboarding**
   - First visit: 3-step carousel
     - Step 1: "Ask in plain English or your language"
     - Step 2: "Tap the mic to speak"
     - Step 3: "Get alerts for your area"
   - Skip button, dot indicators
   - Store "seen" in localStorage

7. **Empty/loading states**
   - Skeleton loaders for bot messages
   - Skeleton for chart panel
   - Gentle shimmer animation on skeletons

### Accessibility
- WCAG AA contrast: all text on dark bg must pass 4.5:1
- Focus indicators: visible 2px ring on all interactive elements
- `prefers-reduced-motion`: disable non-essential animations
- Screen reader text for icon-only buttons
- Semantic HTML: header, main, nav roles

### Mobile considerations
- Safe area insets for notched phones
- Minimum touch target 44px
- Composer above keyboard on iOS/Android
- Swipe to close panels
- Pull-to-refresh disabled in chat

### Performance
- CSS animations use `transform` and `opacity` only
- No layout-triggering animations
- `will-change` on animated elements
- Lazy-load chart only when panel opens
- Debounce resize handlers

## What to deliver
1. **Single-file frontend**: `public/index.html` with inline CSS and JS
2. **Keep all existing API calls** exactly as they are
3. **No external CSS/JS libraries** — pure vanilla
4. **No build step** required

## Manual verification
1. `cd /home/gorumulewa/weathergpt && npm start`
2. Open `http://localhost:3000`
3. Verify:
   - Page loads with fade-in animation
   - Type "weather in Mumbai" → bot replies with slide-in animation
   - Click mic → listening pulse animation
   - Click Alerts → panel slides from right
   - Click Climate → chart panel with animated lines
   - Switch language → UI updates
   - Resize to mobile → layout adapts
   - Open DevTools → no console errors

## Do NOT
- Break any existing API route
- Add external dependencies
- Use framework-specific syntax
- Ask for API keys
- Remove existing features

## Success criteria
- UI feels premium and polished
- All animations are smooth 60fps
- Dark theme is consistent and easy on eyes
- Mobile experience is native-app quality
- All existing backend features still work

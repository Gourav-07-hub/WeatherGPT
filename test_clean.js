    // Config / State
    let currentLat = null;
    let currentLon = null;
    let currentLocName = 'Bhopal';

    function mapWeatherCodeToState(code) {
      if (code <= 1) return 'clear-day';
      if (code <= 3) return 'cloudy';
      if (code <= 67) return 'rain';
      if (code <= 77) return 'snow';
      if (code >= 95) return 'storm';
      return 'cloudy';
    }

    function getWeatherIcon(code) {
      if (code <= 1) return '☀️';
      if (code === 2) return '⛅';
      if (code === 3) return '☁️';
      if (code >= 51 && code <= 67) return '🌧️';
      if (code >= 71 && code <= 82) return '❄️';
      if (code >= 95) return '⛈️';
      return '☁️';
    }

    function updateSkyState(code) {
      let state = mapWeatherCodeToState(code);
      const h = new Date().getHours();
      if (state === 'clear-day' && (h >= 19 || h < 6)) state = 'clear-night';
      
      document.body.className = `state-${state}`;
      const container = document.getElementById('particles');
      container.innerHTML = '';
      if (state === 'rain' || state === 'storm') {
        for(let i=0; i<50; i++) {
          const p = document.createElement('div');
          p.className = 'particle-rain';
          p.style.left = Math.random() * 100 + 'vw';
          p.style.animationDuration = 0.5 + Math.random() * 0.3 + 's';
          p.style.animationDelay = Math.random() * 2 + 's';
          container.appendChild(p);
        }
      } else if (state === 'snow') {
        for(let i=0; i<40; i++) {
          const p = document.createElement('div');
          p.className = 'particle-snow';
          p.style.left = Math.random() * 100 + 'vw';
          p.style.animationDuration = 2 + Math.random() * 2 + 's';
          p.style.animationDelay = Math.random() * 3 + 's';
          container.appendChild(p);
        }
      }
    }
    
    let isF = false;
    document.getElementById('unit-toggle').addEventListener('click', function() {
      isF = !isF;
      this.classList.toggle('is-f', isF);
      const spans = this.querySelectorAll('span');
      spans[0].classList.toggle('active', !isF);
      spans[1].classList.toggle('active', isF);
      // In a real app we'd convert DOM text nodes, skipping for demo scale
    });

    // Voice setup
    const micBtn = document.getElementById('mic-btn');
    const langSelect = document.getElementById('lang');
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      micBtn.addEventListener('click', () => {
        recognition.lang = langSelect.value === 'hi' ? 'hi-IN' : 'en-IN';
        recognition.start();
        micBtn.style.color = 'var(--danger)';
      });
      recognition.onresult = (e) => {
        document.getElementById('chat-input').value = e.results[0][0].transcript;
        document.getElementById('chat-form').dispatchEvent(new Event('submit'));
      };
      recognition.onend = () => { micBtn.style.color = 'var(--sky-ink)'; };
    } else {
      micBtn.style.display = 'none';
    }

    function speak(text) {
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = langSelect.value === 'hi' ? 'hi-IN' : 'en-IN';
        speechSynthesis.speak(u);
      }
    }

    // App Init & Fetching
    async function fetchAndRenderWeather(query, isCoords=false) {
      try {
        let url = `/api/weather?${isCoords ? query : 'q=' + encodeURIComponent(query)}&daily=1&hourly=1`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        
        currentLat = data.lat;
        currentLon = data.lon;
        currentLocName = data.name || query;
        document.getElementById('loc-display').textContent = currentLocName.toLowerCase();
        
        const c = data.current;
        document.getElementById('hero-temp').textContent = `${Math.round(c.temperature_2m)}°`;
        document.getElementById('hero-cond').textContent = getWeatherIcon(c.weather_code) + ' ' + (c.weather_code <= 3 ? 'Clear/Cloudy' : 'Precipitation');
        document.getElementById('hero-feels').textContent = `feels like ${Math.round(c.apparent_temperature)}°`;
        updateSkyState(c.weather_code);

        if (data.hourly && data.hourly.time) {
          const now = new Date(); now.setMinutes(0, 0, 0);
          const isoNow = now.toISOString().slice(0, 16);
          let startIndex = data.hourly.time.findIndex(t => t >= isoNow);
          if (startIndex === -1) startIndex = 0;
          
          const slices = [];
          for (let i = startIndex; i < startIndex + 24 && i < data.hourly.time.length; i++) {
            slices.push({
              time: data.hourly.time[i].substring(11, 16),
              icon: getWeatherIcon(data.hourly.weather_code[i]),
              temp: `${Math.round(data.hourly.temperature_2m[i])}°`
            });
          }
          document.getElementById('hourly-scroll').innerHTML = slices.map(h => 
            `<div class="tick"><div class="time mono">${h.time}</div><div class="icon">${h.icon}</div><div class="temp mono">${h.temp}</div></div>`
          ).join('');
        }

        if (data.daily && data.daily.time) {
          const allMins = data.daily.temperature_2m_min;
          const allMaxs = data.daily.temperature_2m_max;
          const absMin = Math.min(...allMins);
          const absMax = Math.max(...allMaxs);
          const range = absMax - absMin || 1;

          const days = [];
          for (let i = 0; i < data.daily.time.length; i++) {
            const date = new Date(data.daily.time[i]);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const lo = Math.round(data.daily.temperature_2m_min[i]);
            const hi = Math.round(data.daily.temperature_2m_max[i]);
            const sparkStart = ((lo - absMin) / range) * 100;
            const sparkW = ((hi - lo) / range) * 100;

            days.push({ day: dayName, icon: getWeatherIcon(data.daily.weather_code[i]), lo, hi, sparkStart, sparkW });
          }
          document.getElementById('daily-scroll').innerHTML = days.map(d => 
            `<div class="day-strip">
              <div class="day-name">${d.day}</div>
              <div class="icon">${d.icon}</div>
              <div class="lo mono">${d.lo}°</div>
              <div class="sparkline"><div class="spark-fill" style="left:${d.sparkStart}%; width:${d.sparkW}%"></div></div>
              <div class="hi mono">${d.hi}°</div>
            </div>`
          ).join('');
        }
      } catch (err) {
        console.error(err);
        document.getElementById('hero-cond').textContent = "error connecting";
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => fetchAndRenderWeather(`lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`, true).catch(() => fetchAndRenderWeather('Bhopal')),
        () => fetchAndRenderWeather('Bhopal')
      );
    } else {
      fetchAndRenderWeather('Bhopal');
    }

    // Chat functionality
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatThread = document.getElementById('chat-thread');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      
      const uMsg = document.createElement('div');
      uMsg.className = 'msg user'; uMsg.textContent = text;
      chatThread.appendChild(uMsg);
      input.value = '';
      sendBtn.classList.add('loading');
      
      try {
        const res = await fetch('/api/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, lang: langSelect.value }),
        });
        const data = await res.json();
        
        const bMsg = document.createElement('div');
        bMsg.className = 'msg bot glass'; bMsg.textContent = data.reply || "Can't reach the sky right now.";
        chatThread.appendChild(bMsg);
        speak(bMsg.textContent);

        if (data.location && data.location.toLowerCase() !== currentLocName.toLowerCase()) {
          fetchAndRenderWeather(data.location);
        } else if (data.weather && data.weather.current) {
          updateSkyState(data.weather.current.weather_code);
        }

      } catch (err) {
        const bMsg = document.createElement('div');
        bMsg.className = 'msg bot glass'; bMsg.textContent = "Can't reach the sky right now.";
        chatThread.appendChild(bMsg);
      } finally {
        sendBtn.classList.remove('loading');
        uMsg.scrollIntoView({ behavior: 'smooth' });
      }
    });

    // Alerts Panel
    let alertsInterval;
    function openAlerts() {
      document.getElementById('drawer-alerts').classList.add('open');
      fetchSubscriptions();
      alertsInterval = setInterval(refreshAlerts, 60000);
    }
    function closeAlerts() {
      document.getElementById('drawer-alerts').classList.remove('open');
      clearInterval(alertsInterval);
    }
    async function fetchSubscriptions() {
      const res = await fetch('/api/subscribe');
      const data = await res.json();
      const list = document.getElementById('sub-list');
      list.innerHTML = data.subscriptions.map(s => `
        <div style="display:flex; justify-content:space-between; margin-top:8px;">
          <span>${s.name}</span>
          <button onclick="removeSub(${s.id})" style="color:var(--danger); background:transparent; border:none; cursor:pointer;">Remove</button>
        </div>`).join('');
      refreshAlerts();
    }
    async function removeSub(id) { await fetch(`/api/subscribe/${id}`, { method: 'DELETE' }); fetchSubscriptions(); }
    document.getElementById('subscribe-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('sub-name').value;
      await fetch('/api/subscribe', {
        method: 'POST', headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ name, lat: currentLat, lon: currentLon })
      });
      document.getElementById('sub-name').value = '';
      fetchSubscriptions();
    });
    async function refreshAlerts() {
      const res = await fetch('/api/subscribe/check');
      const data = await res.json();
      const list = document.getElementById('alert-list');
      let html = '';
      data.checks.forEach(c => {
        if (c.alerts && c.alerts.length > 0) {
          html += `<div style="color:var(--danger); margin-bottom:8px;"><strong>${c.name}</strong>: ${c.alerts.map(a => a.detail).join(', ')}</div>`;
        }
      });
      list.innerHTML = html || '<i>No active alerts.</i>';
    }

    // Chart Panel
    function openChart() {
      document.getElementById('drawer-chart').classList.add('open');
      if (!currentLat || !currentLon) return;
      fetch(`/api/climate?lat=${currentLat}&lon=${currentLon}&days=30`)
        .then(r => r.json())
        .then(data => {
           document.getElementById('chart-container').innerHTML = drawChart(data.daily);
        }).catch(() => document.getElementById('chart-container').innerHTML = 'Failed to load chart');
    }
    function closeChart() { document.getElementById('drawer-chart').classList.remove('open'); }
    function drawChart(daily) {
      if (!daily || !daily.time) return '';
      const maxT = Math.max(...daily.temperature_2m_max);
      const minT = Math.min(...daily.temperature_2m_min);
      const range = maxT - minT || 1;
      const w = 400; const h = 200; const step = w / (daily.time.length - 1);
      
      let maxPath = 'M'; let minPath = 'M';
      daily.time.forEach((t, i) => {
        const x = i * step;
        const yMax = h - ((daily.temperature_2m_max[i] - minT) / range) * h;
        const yMin = h - ((daily.temperature_2m_min[i] - minT) / range) * h;
        maxPath += `${x},${yMax} L`; minPath += `${x},${yMin} L`;
      });
      maxPath = maxPath.slice(0, -2); minPath = minPath.slice(0, -2);

      return `<svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <path d="${maxPath}" fill="none" stroke="var(--danger)" stroke-width="2"/>
        <path d="${minPath}" fill="none" stroke="var(--sky-accent)" stroke-width="2"/>
      </svg>`;
    }

/**
 * Weather Manager
 * Fetches and displays weather information using Open-Meteo API (free, no API key required)
 * Supports temperature units, location-based weather, and auto-refresh
 */

class WeatherManager extends BaseManager {
  constructor(storage) {
    super();
    this.storage = storage;
    this.weatherCard = document.getElementById("weatherCard");
    this.weatherIcon = document.getElementById("weatherIcon");
    this.weatherTemp = document.getElementById("weatherTemp");
    this.weatherDesc = document.getElementById("weatherDesc");
    this.weatherLocation = document.getElementById("weatherLocation");
    this.weatherFeelsLike = document.getElementById("weatherFeelsLike");
    this.weatherHumidity = document.getElementById("weatherHumidity");
    this.weatherWind = document.getElementById("weatherWind");
    this.weatherRefreshBtn = document.getElementById("weatherRefreshBtn");

    this.weatherForecast = document.getElementById("weatherForecast");
    this.weatherChart = document.getElementById("weatherChart");
    this.weatherChartLegend = document.getElementById("weatherChartLegend");
    this.weatherChartTabs = document.querySelectorAll(
      "#weatherCard .weather-chart-tab[data-metric]",
    );

    this.weatherChartWrap = this.weatherChart?.closest(".weather-chart-wrap");
    this.weatherChartTooltip = null;
    this._chartBars = null;
    this._chartLayout = null;
    this._chartRaf = null;
    this._chartAnim = null;
    this._chartHoverIndex = -1;

    this.currentWeather = null;
    this.dailyForecast = null;
    this.hourlyForecast = null;
    this.lastFetch = null;
    this.refreshInterval = null;

    this._resizeTimer = null;
    this._forecastResizeTimer = null; // used for debouncing forecast layout recalcs
    this.selectedForecastIndex = 0;
    this.selectedMetric = "temperature";

    // Reflow handler for chart resize
    this._onResize = () => {
      if (this._resizeTimer) window.clearTimeout(this._resizeTimer);
      this._resizeTimer = window.setTimeout(() => {
        this.renderHourlyChart();
      }, 120);
    };

    // Debounced handler to update forecast flex layout on viewport changes
    this._onForecastResize = () => {
      if (this._forecastResizeTimer)
        window.clearTimeout(this._forecastResizeTimer);
      this._forecastResizeTimer = window.setTimeout(() => {
        this.applyForecastFlexLayout();
      }, 80);
    };

    // Listen for resize to update forecast layout (keeps last-row spreading correct)
    window.addEventListener("resize", this._onForecastResize);

    // Listen for icon theme changes
    document.addEventListener("md:icon-theme-change", () => {
      this._refreshWeatherIcons();
    });

    // Weather code to icon/description mapping (WMO codes)
    this.weatherCodes = {
      0: { icon: "☀️", desc: "Clear sky" },
      1: { icon: "🌤️", desc: "Mainly clear" },
      2: { icon: "⛅", desc: "Partly cloudy" },
      3: { icon: "☁️", desc: "Overcast" },
      45: { icon: "🌫️", desc: "Foggy" },
      48: { icon: "🌫️", desc: "Depositing rime fog" },
      51: { icon: "🌧️", desc: "Light drizzle" },
      53: { icon: "🌧️", desc: "Moderate drizzle" },
      55: { icon: "🌧️", desc: "Dense drizzle" },
      56: { icon: "🌧️", desc: "Light freezing drizzle" },
      57: { icon: "🌧️", desc: "Dense freezing drizzle" },
      61: { icon: "🌧️", desc: "Slight rain" },
      63: { icon: "🌧️", desc: "Moderate rain" },
      65: { icon: "🌧️", desc: "Heavy rain" },
      66: { icon: "🌧️", desc: "Light freezing rain" },
      67: { icon: "🌧️", desc: "Heavy freezing rain" },
      71: { icon: "🌨️", desc: "Slight snow" },
      73: { icon: "🌨️", desc: "Moderate snow" },
      75: { icon: "❄️", desc: "Heavy snow" },
      77: { icon: "🌨️", desc: "Snow grains" },
      80: { icon: "🌦️", desc: "Slight rain showers" },
      81: { icon: "🌦️", desc: "Moderate rain showers" },
      82: { icon: "⛈️", desc: "Violent rain showers" },
      85: { icon: "🌨️", desc: "Slight snow showers" },
      86: { icon: "🌨️", desc: "Heavy snow showers" },
      95: { icon: "⛈️", desc: "Thunderstorm" },
      96: { icon: "⛈️", desc: "Thunderstorm with slight hail" },
      99: { icon: "⛈️", desc: "Thunderstorm with heavy hail" },
    };
  }

  /**
   * Refresh all weather icons when theme changes
   */
  _refreshWeatherIcons() {
    if (this.currentWeather) {
      this.displayCurrentWeather(this.currentWeather);
    }
    if (this.dailyForecast) {
      this.displayForecast(this.dailyForecast);
    }
    if (this.hourlyForecast) {
      this.renderHourlyChart();
    }
  }

  _getLocalDateKey(ts) {
    const d = ts ? new Date(ts) : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  _getWeatherForecastCache() {
    const cache = this.storage.get("weather_openmeteo_cache_v1", null);
    return cache && typeof cache === "object" ? cache : null;
  }

  _setWeatherForecastCache(cache) {
    try {
      this.storage.set("weather_openmeteo_cache_v1", cache);
    } catch (e) {}
  }

  /**
   * Initialize weather manager
   * Shows loading state immediately, fetches data in background
   */
  async init() {
    this.setupEventListeners();

    // Show loading state immediately (non-blocking)
    this.showLoadingState();

    // Initialize compact weather (will show loading state)
    this.initCompactWeather();

    // Fetch weather data (may take time due to geolocation + API)
    try {
      await this.fetchWeather();
    } catch (err) {
      console.warn("Weather fetch error during init:", err);
      this.showErrorState();
    }

    // Trigger the hourly chart animation on initial load so it animates
    // the same way it does when switching metric tabs.
    this._startHourlyChartAnimation();
    this.renderHourlyChart();

    // Update compact weather with fetched data
    this.updateCompactWeather();

    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.refreshInterval = setInterval(
      () => {
        this.fetchWeather({ force: false });
      },
      30 * 60 * 1000,
    );

    return;
  }

  /**
   * Initialize compact weather display in header
   */
  initCompactWeather() {
    const settings = this.storage.getSettings();

    // Check if compact weather should be enabled
    if (!settings.compactWeatherEnabled) {
      this.hideCompactWeather();
      return;
    }

    // Create compact weather element if it doesn't exist
    this.ensureCompactWeatherElement();
    this.updateCompactWeather();
  }

  /**
   * Create compact weather element in header below date display
   */
  ensureCompactWeatherElement() {
    const header = document.querySelector(".header");
    const greetingSection = document.querySelector(".greeting-section");
    const dateDisplay = document.getElementById("dateDisplay");
    const timeSection = document.querySelector(".time-section");
    if (!header || !greetingSection || !timeSection) return;

    const legacyRightSection = document.querySelector(".header-right-section");
    if (legacyRightSection && legacyRightSection.contains(timeSection)) {
      header.insertBefore(timeSection, legacyRightSection);
    }

    let compactWeather = document.getElementById("compactWeather");
    if (!compactWeather) {
      compactWeather = document.createElement("div");
      compactWeather.id = "compactWeather";
      compactWeather.className = "compact-weather";

      compactWeather.innerHTML = `
      <span class="compact-weather-icon"></span>
      <span class="compact-weather-temp"></span>
      <div class="compact-weather-details">
        <span class="compact-weather-feels"></span>
        <span class="compact-weather-humidity"></span>
        <span class="compact-weather-wind"></span>
      </div>
      <span class="compact-weather-location"></span>
    `;
    }

    if (!compactWeather.querySelector(".compact-weather-location")) {
      const locationEl = document.createElement("span");
      locationEl.className = "compact-weather-location";
      compactWeather.appendChild(locationEl);
    }

    if (legacyRightSection && legacyRightSection.contains(compactWeather)) {
      legacyRightSection.removeChild(compactWeather);
    }
    if (legacyRightSection && legacyRightSection.childElementCount === 0) {
      legacyRightSection.remove();
    }

    if (dateDisplay && dateDisplay.parentNode === greetingSection) {
      dateDisplay.insertAdjacentElement("afterend", compactWeather);
    } else {
      greetingSection.appendChild(compactWeather);
    }

    this.compactWeatherEl = compactWeather;
  }

  /**
   * Update compact weather display with current weather data
   */
  updateCompactWeather() {
    const settings = this.storage.getSettings();

    if (!settings.compactWeatherEnabled) {
      this.hideCompactWeather();
      return;
    }

    this.ensureCompactWeatherElement();

    const compactEl = document.getElementById("compactWeather");
    if (!compactEl) return;

    const weather = this.currentWeather;
    if (!weather) {
      compactEl.classList.remove("active");
      return;
    }

    const mode = settings.compactWeatherMode || "simple";
    const showLocationName = settings.compactWeatherShowLocationName === true;
    const locationName =
      typeof weather.location === "string" ? weather.location.trim() : "";
    const weatherInfo = this.weatherCodes[weather.weatherCode] || {
      icon: "🌡️",
      desc: "Unknown",
    };
    const unitSymbol = weather.unit === "fahrenheit" ? "°F" : "°C";
    const windUnitLabel = weather.unit === "fahrenheit" ? "mph" : "km/h";

    // Update compact weather content
    const iconEl = compactEl.querySelector(".compact-weather-icon");
    const tempEl = compactEl.querySelector(".compact-weather-temp");
    const feelsEl = compactEl.querySelector(".compact-weather-feels");
    const humidityEl = compactEl.querySelector(".compact-weather-humidity");
    const windEl = compactEl.querySelector(".compact-weather-wind");
    const locationEl = compactEl.querySelector(".compact-weather-location");

    if (iconEl)
      iconEl.innerHTML = this._getIcon(weatherInfo.icon, { size: 24 });
    if (tempEl) {
      tempEl.textContent =
        weather.temperature === null
          ? `--${unitSymbol}`
          : `${weather.temperature}${unitSymbol}`;
    }

    // Detailed mode shows extra info
    if (feelsEl) {
      feelsEl.textContent =
        weather.feelsLike === null
          ? `Feels --${unitSymbol}`
          : `Feels ${weather.feelsLike}${unitSymbol}`;
    }
    if (humidityEl) {
      humidityEl.textContent =
        weather.humidity === null
          ? `Humidity --%`
          : `Humidity ${weather.humidity}%`;
    }
    if (windEl) {
      windEl.textContent =
        weather.windSpeed === null
          ? `Wind -- ${windUnitLabel}`
          : `Wind ${weather.windSpeed} ${windUnitLabel}`;
    }
    if (locationEl) {
      locationEl.textContent = locationName;
      locationEl.title = locationName;
    }

    // Apply mode class
    compactEl.classList.remove(
      "compact-weather-simple",
      "compact-weather-detailed",
    );
    compactEl.classList.add(`compact-weather-${mode}`);
    compactEl.classList.toggle(
      "show-location",
      showLocationName && locationName.length > 0,
    );
    compactEl.classList.add("active");
  }

  /**
   * Hide compact weather element
   */
  hideCompactWeather() {
    const compactEl = document.getElementById("compactWeather");
    if (compactEl) {
      compactEl.classList.remove("active");
    }
  }

  setupEventListeners() {
    if (this._listenersBound) return;
    this._listenersBound = true;

    if (this.weatherRefreshBtn) {
      this.weatherRefreshBtn.addEventListener("click", () =>
        this.fetchWeather({ force: false }),
      );
    }

    if (this.weatherChartTabs && this.weatherChartTabs.length) {
      this.weatherChartTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          const metric = tab.getAttribute("data-metric");
          if (!metric) return;
          this.selectedMetric = metric;
          this.updateMetricTabs();
          this._startHourlyChartAnimation();
          this.renderHourlyChart();
        });
      });
    }

    if (this.weatherChart) {
      this.weatherChart.addEventListener("mousemove", (e) =>
        this._handleChartMouseMove(e),
      );
      this.weatherChart.addEventListener("mouseleave", () =>
        this._handleChartMouseLeave(),
      );
    }

    window.addEventListener("resize", this._onResize);
  }

  updateMetricTabs() {
    if (!this.weatherChartTabs || !this.weatherChartTabs.length) return;
    const metric = this.selectedMetric || "temperature";
    this.weatherChartTabs.forEach((tab) => {
      const isActive = tab.getAttribute("data-metric") === metric;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  /* -------------------------- Color helpers -------------------------- */
  _hexToRgb(hexOrRgb) {
    if (!hexOrRgb) return null;
    const s = String(hexOrRgb).trim();

    // Accept rgb(...) or rgba(...)
    const rgbMatch = s.match(
      /^rgba?\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*[0-9.]+)?\s*\)$/i,
    );
    if (rgbMatch) {
      return {
        r: Math.round(Number(rgbMatch[1])),
        g: Math.round(Number(rgbMatch[2])),
        b: Math.round(Number(rgbMatch[3])),
      };
    }

    let hex = s.replace("#", "");
    if (hex.length === 3)
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    if (hex.length !== 6) return null;
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return { r, g, b };
  }

  _rgbToCss(rgb) {
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  }

  _rgbToHex(rgb) {
    if (!rgb) return "#000000";
    const toHex = (n) => {
      const v = Math.max(0, Math.min(255, Math.round(n)));
      const h = v.toString(16);
      return h.length === 1 ? "0" + h : h;
    };
    return "#" + toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b);
  }

  _interpolateHex(a, b, t) {
    const ra = this._hexToRgb(a);
    const rb = this._hexToRgb(b);
    if (!ra || !rb) return { r: 0, g: 0, b: 0 };
    const r = Math.round(ra.r + (rb.r - ra.r) * t);
    const g = Math.round(ra.g + (rb.g - ra.g) * t);
    const b2 = Math.round(ra.b + (rb.b - ra.b) * t);
    return { r, g, b: b2 };
  }

  _lightenHex(hex, factor) {
    const rgb = this._hexToRgb(hex);
    if (!rgb) return { r: 255, g: 255, b: 255 };
    const r = Math.round(rgb.r + (255 - rgb.r) * factor);
    const g = Math.round(rgb.g + (255 - rgb.g) * factor);
    const b = Math.round(rgb.b + (255 - rgb.b) * factor);
    return { r, g, b };
  }

  _colorForMetric(metric, value, min, max) {
    const v = Number.isFinite(value) ? value : null;
    if (v === null) return "#888888";

    let t = 0;
    if (Number.isFinite(min) && Number.isFinite(max) && max > min) {
      t = Math.max(0, Math.min(1, (v - min) / (max - min)));
    }

    // Define color endpoints for each metric
    switch (metric) {
      case "humidity": {
        const low = "#e6f6ff"; // very light blue
        const high = "#003f8a"; // deep blue
        const rgb = this._interpolateHex(low, high, t);
        return this._rgbToHex(rgb);
      }
      case "precipitation": {
        const low = "#ffffff";
        const high = "#bdbdbd";
        const rgb = this._interpolateHex(low, high, t);
        return this._rgbToHex(rgb);
      }
      case "wind": {
        const low = "#d7f6e6";
        const high = "#0b6b48";
        const rgb = this._interpolateHex(low, high, t);
        return this._rgbToHex(rgb);
      }
      case "temperature":
      default: {
        // blue -> red/orange
        const low = "#2b8cff";
        const high = "#ff3b30";
        const rgb = this._interpolateHex(low, high, t);
        return this._rgbToHex(rgb);
      }
    }
  }

  _ensureWeatherChartTooltip() {
    if (this.weatherChartTooltip) return this.weatherChartTooltip;
    if (!this.weatherChartWrap) return null;

    const tip = document.createElement("div");
    tip.className = "weather-chart-tooltip";
    tip.setAttribute("role", "tooltip");
    tip.setAttribute("aria-hidden", "true");
    this.weatherChartWrap.appendChild(tip);
    this.weatherChartTooltip = tip;
    return tip;
  }

  _handleChartMouseLeave() {
    this._chartHoverIndex = -1;
    this._hideWeatherChartTooltip();
  }

  _handleChartMouseMove(e) {
    if (!this.weatherChart || !this.weatherChartWrap) return;
    if (!this._chartBars || !this._chartLayout) return;

    const canvasRect = this.weatherChart.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;

    const idx = this._hitTestWeatherBarIndex(x, y);
    if (!Number.isFinite(idx) || idx < 0) {
      this._chartHoverIndex = -1;
      this._hideWeatherChartTooltip();
      return;
    }

    if (this._chartHoverIndex !== idx) {
      this._chartHoverIndex = idx;
    }

    this._showWeatherChartTooltip(idx);
  }

  _hitTestWeatherBarIndex(x, y) {
    const layout = this._chartLayout;
    if (!layout) return -1;
    if (x < layout.plotLeft || x > layout.plotLeft + layout.plotWidth)
      return -1;
    if (y < layout.plotTop || y > layout.plotBottom) return -1;

    const bars = this._chartBars;
    if (!Array.isArray(bars) || !bars.length) return -1;

    // Prefer direct hit on the bar's x-range; y is validated against plot area.
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      if (!b) continue;
      if (x >= b.x && x <= b.x + b.w) return i;
    }

    // Fallback: nearest by x center
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      if (!b) continue;
      const d = Math.abs(x - b.cx);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }

  _hideWeatherChartTooltip() {
    const tip = this._ensureWeatherChartTooltip();
    if (!tip) return;
    tip.classList.remove("active");
    tip.setAttribute("aria-hidden", "true");
  }

  _showWeatherChartTooltip(index) {
    const tip = this._ensureWeatherChartTooltip();
    if (!tip || !this.weatherChart || !this.weatherChartWrap) return;
    const bars = this._chartBars;
    const bar = Array.isArray(bars) ? bars[index] : null;
    if (!bar) {
      this._hideWeatherChartTooltip();
      return;
    }

    const wrapRect = this.weatherChartWrap.getBoundingClientRect();
    const canvasRect = this.weatherChart.getBoundingClientRect();

    const left = canvasRect.left - wrapRect.left + bar.cx;
    const top = canvasRect.top - wrapRect.top + bar.y;

    const label = bar.timeLabel ? `${bar.timeLabel}: ` : "";
    tip.textContent = `${label}${bar.valueLabel}`;

    // Position and clamp horizontally within the wrap
    const padding = 10;
    const maxLeft = wrapRect.width - padding;
    const clampedLeft = Math.max(padding, Math.min(maxLeft, left));

    tip.style.left = `${clampedLeft}px`;
    tip.style.top = `${top}px`;
    tip.classList.add("active");
    tip.setAttribute("aria-hidden", "false");
  }

  _startHourlyChartAnimation() {
    if (this._chartRaf) {
      cancelAnimationFrame(this._chartRaf);
      this._chartRaf = null;
    }
    this._chartAnim = {
      start: performance.now(),
      duration: 520,
      stagger: 16,
      metric: this.selectedMetric || "temperature",
    };
  }

  _applyWeatherIconAnimation(weatherCode) {
    if (!this.weatherIcon) return;
    const code = Number(weatherCode);
    const cls = this.weatherIcon.classList;
    ["weather-anim-sunny", "weather-anim-cloudy", "weather-anim-rainy"].forEach(
      (c) => cls.remove(c),
    );
    if (!Number.isFinite(code)) return;

    if (code === 0 || code === 1) {
      cls.add("weather-anim-sunny");
    } else if (code === 2 || code === 3 || code === 45 || code === 48) {
      cls.add("weather-anim-cloudy");
    } else if (code >= 71 && code <= 77) {
      cls.add("weather-anim-cloudy");
    } else {
      cls.add("weather-anim-rainy");
    }
  }

  _toNumber(value) {
    const n = typeof value === "string" ? Number.parseFloat(value) : value;
    return Number.isFinite(n) ? n : null;
  }

  _formatPlaceName(result) {
    if (!result) return "";
    const parts = [result.name, result.admin1, result.country].filter(Boolean);
    return parts.join(", ");
  }

  async _geocodeCity(city) {
    if (!city) return null;
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      city,
    )}&count=1&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const first = data?.results?.[0];
    if (!first) return null;
    return {
      latitude: first.latitude,
      longitude: first.longitude,
      city: this._formatPlaceName(first) || first.name,
    };
  }

  async _reverseGeocodeName(latitude, longitude) {
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const first = data?.results?.[0];
        const name = this._formatPlaceName(first);
        if (name) return name;
      }
    } catch {
      // ignore
    }

    // fallback (best effort)
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
      const res = await fetch(url);
      if (!res.ok) return "";
      const data = await res.json();
      return data?.display_name || "";
    } catch {
      return "";
    }
  }

  async _getBrowserLocation() {
    if (!navigator.geolocation) return null;

    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 10 * 60 * 1000,
        });
      });

      const latitude = this._toNumber(pos?.coords?.latitude);
      const longitude = this._toNumber(pos?.coords?.longitude);
      if (latitude === null || longitude === null) return null;

      const city = (await this._reverseGeocodeName(latitude, longitude)) || "";
      return { latitude, longitude, city };
    } catch {
      return null;
    }
  }

  async _resolveWeatherLocation(settings) {
    const mode = settings.weatherLocationMode || "dashboard";

    if (mode === "custom") {
      const latitude = this._toNumber(settings.weatherLatitude);
      const longitude = this._toNumber(settings.weatherLongitude);
      const cityName = (settings.weatherCity || "").trim();
      if (latitude !== null && longitude !== null) {
        const city =
          cityName || (await this._reverseGeocodeName(latitude, longitude));
        return { latitude, longitude, city: city || "" };
      }

      if (cityName) {
        const geo = await this._geocodeCity(cityName);
        if (geo) return geo;
      }
    }

    // dashboard location
    const latitude = this._toNumber(settings.latitude);
    const longitude = this._toNumber(settings.longitude);
    const city = (settings.city || "").trim();
    if (latitude !== null && longitude !== null) {
      return { latitude, longitude, city };
    }

    return await this._getBrowserLocation();
  }

  async fetchWeather(opts = {}) {
    try {
      if (!this.weatherCard) return;

      const { force = false } = opts;

      const settings = this.storage.getSettings();
      const unit = settings.weatherUnit || "celsius";

      const location = await this._resolveWeatherLocation(settings);
      if (!location) {
        throw new Error("No location available");
      }

      const tempUnit = unit === "fahrenheit" ? "fahrenheit" : "celsius";
      const windUnit = unit === "fahrenheit" ? "mph" : "kmh";

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&forecast_days=7&timezone=auto&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}`;

      const todayKey = this._getLocalDateKey(Date.now());
      const cached = this._getWeatherForecastCache();
      const cacheHit =
        !force &&
        cached &&
        cached.url === url &&
        cached.dateKey === todayKey &&
        cached.data;

      let data;
      let usedCache = false;

      if (cacheHit) {
        data = cached.data;
        usedCache = true;
      } else {
        // Fetch with retry logic for network errors (common in Chrome extensions)
        let response;
        let lastError;
        const maxRetries = 3;
        const retryDelay = 1000; // 1 second

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            response = await fetch(url);
            break; // Success, exit retry loop
          } catch (networkError) {
            lastError = networkError;
            console.warn(
              `Weather fetch attempt ${attempt}/${maxRetries} failed:`,
              networkError?.message || networkError,
            );
            if (attempt < maxRetries) {
              // Wait before retrying
              await new Promise((resolve) =>
                setTimeout(resolve, retryDelay * attempt),
              );
            }
          }
        }

        // If all retries failed, try to fall back to cached payload (even if stale).
        if (!response) {
          if (cached && cached.url === url && cached.data) {
            data = cached.data;
            usedCache = true;
          } else {
            const errorMsg =
              lastError?.message === "Failed to fetch"
                ? "Network error - check your internet connection"
                : lastError?.message || "Unable to connect to weather service";
            throw new Error(errorMsg);
          }
        }

        if (!usedCache) {
          if (!response.ok) {
            const text = await response.text().catch(() => "");
            console.error(
              "Weather API response not OK:",
              response.status,
              text.substr ? text.substr(0, 200) : text,
            );
            throw new Error(
              `Weather API request failed (status ${response.status})`,
            );
          }

          try {
            data = await response.json();
          } catch (e) {
            const txt = await response.text().catch(() => "");
            console.error(
              "Weather API JSON parse error:",
              e,
              txt.substr ? txt.substr(0, 500) : txt,
            );
            throw new Error("Weather API returned invalid JSON");
          }

          // Persist only when we successfully fetched fresh data.
          this._setWeatherForecastCache({
            url,
            dateKey: todayKey,
            data,
            savedAt: Date.now(),
          });
        }
      }
      const current = data.current || data.current_weather || {};

      let locationName = null;
      if (usedCache && cached && cached.url === url && cached.locationName) {
        locationName = cached.locationName;
      }
      if (!locationName) {
        locationName =
          location.city ||
          (await this._reverseGeocodeName(
            location.latitude,
            location.longitude,
          )) ||
          `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`;
      }

      // Try to derive reasonable current values when API uses different field names
      const hourly = data.hourly || {};
      const pickNearestHourly = (arr) => {
        if (
          !Array.isArray(arr) ||
          !arr.length ||
          !Array.isArray(hourly.time) ||
          !hourly.time.length
        )
          return null;
        const now = new Date();
        for (let i = 0; i < hourly.time.length; i++) {
          const t = new Date(hourly.time[i]);
          if (t >= now)
            return Number.isFinite(Number(arr[i])) ? Number(arr[i]) : null;
        }
        const last = arr[arr.length - 1];
        return Number.isFinite(Number(last)) ? Number(last) : null;
      };

      const temps = hourly.temperature_2m || hourly.temperature || null;
      const hums = hourly.relative_humidity_2m || null;
      const prec = hourly.precipitation || null;
      const winds = hourly.wind_speed_10m || hourly.windspeed || null;

      const derivedTemp = Number.isFinite(current.temperature_2m)
        ? current.temperature_2m
        : Number.isFinite(current.temperature)
          ? current.temperature
          : pickNearestHourly(temps);

      const derivedFeels = Number.isFinite(current.apparent_temperature)
        ? current.apparent_temperature
        : null;

      const derivedHum = Number.isFinite(current.relative_humidity_2m)
        ? current.relative_humidity_2m
        : pickNearestHourly(hums);

      const derivedWind = Number.isFinite(current.wind_speed_10m)
        ? current.wind_speed_10m
        : Number.isFinite(current.windspeed)
          ? current.windspeed
          : pickNearestHourly(winds);

      const derivedWeatherCode =
        current.weather_code ?? current.weathercode ?? null;

      this.currentWeather = {
        temperature: Number.isFinite(derivedTemp)
          ? Math.round(derivedTemp)
          : null,
        feelsLike: Number.isFinite(derivedFeels)
          ? Math.round(derivedFeels)
          : null,
        humidity: Number.isFinite(derivedHum) ? Math.round(derivedHum) : null,
        windSpeed: Number.isFinite(derivedWind)
          ? Math.round(derivedWind)
          : null,
        weatherCode: derivedWeatherCode,
        unit: unit,
        windUnit: windUnit,
        location: locationName,
      };

      this.dailyForecast = data.daily || null;
      this.hourlyForecast = data.hourly || null;
      this.lastFetch = Date.now();

      // Update cached locationName lazily (so cache-only runs still get it).
      if (
        cached &&
        cached.url === url &&
        cached.locationName !== locationName
      ) {
        this._setWeatherForecastCache({
          ...cached,
          locationName,
        });
      }

      // keep selection in-range
      const dayCount = this.dailyForecast?.time?.length || 0;
      if (dayCount > 0) {
        this.selectedForecastIndex = Math.max(
          0,
          Math.min(this.selectedForecastIndex, dayCount - 1),
        );
      } else {
        this.selectedForecastIndex = 0;
      }

      this.updateDisplay();
    } catch (error) {
      console.error("Weather fetch error:", error);
      this.showError(error?.message || String(error));
    }
  }

  /**
   * Show error state
   */
  showError(message) {
    if (this.weatherIcon) {
      this.weatherIcon.innerHTML = this._getIcon("⚠️", { size: 48 });
    }
    if (this.weatherTemp) {
      this.weatherTemp.textContent = "--";
    }
    if (this.weatherDesc) {
      const suffix = message ? `: ${String(message).slice(0, 120)}` : "";
      this.weatherDesc.textContent = `Unable to load weather${suffix}`;
    }
    if (this.weatherLocation) {
      this.weatherLocation.textContent = "";
    }

    if (this.weatherForecast) {
      this.weatherForecast.innerHTML = "";
    }
    if (this.weatherChartLegend) {
      this.weatherChartLegend.textContent = "";
    }
    if (this.weatherChart) {
      const ctx = this.weatherChart.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, this.weatherChart.width, this.weatherChart.height);
      }
    }
  }

  /**
   * Show loading state - displays placeholder UI while fetching data
   */
  showLoadingState() {
    if (this.weatherIcon) {
      this.weatherIcon.innerHTML = this._getIcon("🌡️", { size: 48 });
    }
    if (this.weatherTemp) {
      this.weatherTemp.textContent = "--°";
    }
    if (this.weatherDesc) {
      this.weatherDesc.textContent = "Loading weather...";
    }
    if (this.weatherLocation) {
      this.weatherLocation.textContent = "Detecting location...";
    }
    if (this.weatherFeelsLike) {
      this.weatherFeelsLike.textContent = "Feels like --°";
    }
    if (this.weatherHumidity) {
      this.weatherHumidity.textContent = "Humidity --%";
    }
    if (this.weatherWind) {
      this.weatherWind.textContent = "Wind --";
    }
    if (this.weatherForecast) {
      this.weatherForecast.innerHTML =
        '<div class="weather-loading-placeholder">Loading forecast...</div>';
    }
  }

  /**
   * Show error state - displays error UI when fetch fails
   */
  showErrorState() {
    this.showError("Failed to load weather data");
  }

  /**
   * Update weather unit and refresh
   */
  updateUnit(unit) {
    const settings = this.storage.getSettings();
    settings.weatherUnit = unit;
    this.storage.saveSettings(settings);
    this.fetchWeather({ force: true });
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    window.removeEventListener("resize", this._onResize);
  }

  /**
   * Update the weather display
   */
  updateDisplay() {
    if (!this.currentWeather) return;

    const weather = this.currentWeather;
    const weatherInfo = this.weatherCodes[weather.weatherCode] || {
      icon: "🌡️",
      desc: "Unknown",
    };
    const unitSymbol = weather.unit === "fahrenheit" ? "°F" : "°C";
    const windUnitLabel = weather.unit === "fahrenheit" ? "mph" : "km/h";

    if (this.weatherIcon) {
      this.weatherIcon.innerHTML = this._getIcon(weatherInfo.icon, {
        size: 48,
      });
      this._applyWeatherIconAnimation(weather.weatherCode);
    }

    if (this.weatherTemp) {
      this.weatherTemp.textContent =
        weather.temperature === null
          ? `--${unitSymbol}`
          : `${weather.temperature}${unitSymbol}`;
    }

    if (this.weatherDesc) {
      this.weatherDesc.textContent = weatherInfo.desc;
    }

    if (this.weatherLocation) {
      this.weatherLocation.textContent = weather.location;
    }

    if (this.weatherFeelsLike) {
      this.weatherFeelsLike.textContent =
        weather.feelsLike === null
          ? `Feels like --${unitSymbol}`
          : `Feels like ${weather.feelsLike}${unitSymbol}`;
    }

    if (this.weatherHumidity) {
      this.weatherHumidity.textContent =
        weather.humidity === null ? `--%` : `${weather.humidity}%`;
    }

    if (this.weatherWind) {
      this.weatherWind.textContent =
        weather.windSpeed === null
          ? `-- ${windUnitLabel}`
          : `${weather.windSpeed} ${windUnitLabel}`;
    }

    // Update compact weather as well
    this.updateCompactWeather();

    this.render7DayForecast();
    this.updateMetricTabs();
    this.renderHourlyChart();
  }

  render7DayForecast() {
    if (!this.weatherForecast) return;

    const daily = this.dailyForecast;
    const settings = this.storage.getSettings();
    const unitSymbol =
      (settings.weatherUnit || "celsius") === "fahrenheit" ? "°F" : "°C";
    const windUnitLabel =
      (settings.weatherUnit || "celsius") === "fahrenheit" ? "mph" : "km/h";

    if (!daily || !Array.isArray(daily.time) || daily.time.length === 0) {
      this.weatherForecast.innerHTML = "";
      return;
    }

    const items = daily.time.slice(0, 7).map((dateStr, index) => {
      const code = daily.weather_code?.[index];
      const max = daily.temperature_2m_max?.[index];
      const min = daily.temperature_2m_min?.[index];
      const precip = daily.precipitation_sum?.[index];
      const windMax = daily.wind_speed_10m_max?.[index];
      const info = this.weatherCodes[code] || { icon: "🌡️", desc: "" };
      const themedIcon = this._getIcon(info.icon, { size: 24 });

      const dayName = new Date(dateStr).toLocaleDateString(undefined, {
        weekday: "short",
      });

      const tempText =
        Number.isFinite(max) && Number.isFinite(min)
          ? `${Math.round(min)}–${Math.round(max)}${unitSymbol}`
          : `--${unitSymbol}`;

      const precipText = Number.isFinite(precip)
        ? `${Math.round(precip)}mm`
        : "--";
      const windText = Number.isFinite(windMax)
        ? `${Math.round(windMax)} ${windUnitLabel}`
        : "--";

      const selectedClass =
        index === this.selectedForecastIndex ? " selected" : "";
      return `
        <div class="weather-forecast-day${selectedClass}" data-day-index="${index}" title="${info.desc}">
          <div class="day-name">${dayName}</div>
          <div class="day-icon">${themedIcon}</div>
          <div class="day-temp">${tempText}</div>
          <div class="day-meta">
            <span>${precipText}</span>
            <span>${windText}</span>
          </div>
        </div>
      `;
    });

    this.weatherForecast.innerHTML = items.join("");

    // Click to select day (updates chart with animation)
    this.weatherForecast
      .querySelectorAll(".weather-forecast-day")
      .forEach((el) => {
        el.addEventListener("click", () => {
          const idx = Number(el.getAttribute("data-day-index"));
          if (!Number.isFinite(idx)) return;
          const wasSelected = this.selectedForecastIndex === idx;
          this.selectedForecastIndex = Math.max(0, Math.min(6, idx));
          this.render7DayForecast();
          // Trigger bar animation when day changes
          if (!wasSelected) {
            this._startHourlyChartAnimation();
          }
          this.renderHourlyChart();
        });
      });

    // Apply responsive flex rules so 7-column full rows remain exact,
    // and any incomplete last row items spread equally to fill the row.
    this.applyForecastFlexLayout();
  }

  applyForecastFlexLayout() {
    const container = this.weatherForecast;
    if (!container) return;
    const items = Array.from(
      container.querySelectorAll(".weather-forecast-day"),
    );
    if (!items.length) return;

    // Read gap from CSS var so JS math matches CSS exactly
    const computedGap =
      getComputedStyle(container).getPropertyValue("--wf-gap") || "10px";
    const gapPx = parseFloat(computedGap) || 10;

    // Breakpoints: <=640px => 2 cols, <=1020px => 4 cols, otherwise 7 cols
    const w = window.innerWidth;
    let columns = 7;
    if (w <= 640) columns = 2;
    else if (w <= 1020) columns = 4;

    // base width for full rows (no grow)
    const base = `calc((100% - (${columns - 1} * ${gapPx}px)) / ${columns})`;

    // set defaults (full-row behavior)
    items.forEach((el) => {
      el.style.boxSizing = "border-box";
      el.style.flex = `0 0 ${base}`;
      el.style.maxWidth = "none";
    });

    // if last row incomplete, make those items grow equally to fill the row
    const remainder = items.length % columns;
    if (remainder === 0) return;

    const lastBasis = `calc((100% - (${Math.max(
      0,
      remainder - 1,
    )} * ${gapPx}px)) / ${remainder})`;
    const lastItems = items.slice(-remainder);
    lastItems.forEach((el) => {
      el.style.flex = `1 1 ${lastBasis}`;
    });
  }

  renderHourlyChart() {
    if (!this.weatherChart || !this.hourlyForecast) return;
    const hourly = this.hourlyForecast;
    if (!Array.isArray(hourly.time) || hourly.time.length < 2) return;

    // Prefer selected day (from the 7-day forecast) if possible
    const selectedDate = this.dailyForecast?.time?.[this.selectedForecastIndex];
    let indices = [];
    if (typeof selectedDate === "string" && selectedDate.length >= 10) {
      indices = hourly.time
        .map((t, i) =>
          typeof t === "string" && t.startsWith(selectedDate) ? i : -1,
        )
        .filter((i) => i >= 0);
    }

    let from = 0;
    let to = 0;
    if (indices.length >= 2) {
      from = indices[0];
      // Most days are 24 points; handle DST by just taking up to 24 from that day.
      to = Math.min(from + 24, hourly.time.length);
    } else {
      const now = new Date();
      const startIndex = hourly.time.findIndex((t) => new Date(t) >= now);
      from = startIndex >= 0 ? startIndex : 0;
      to = Math.min(from + 24, hourly.time.length);
    }

    const times = hourly.time.slice(from, to).map((t) => new Date(t));
    const temps = (hourly.temperature_2m || []).slice(from, to);
    const humidity = (hourly.relative_humidity_2m || []).slice(from, to);
    const precip = (hourly.precipitation || []).slice(from, to);
    const wind = (hourly.wind_speed_10m || []).slice(from, to);

    const settings = this.storage.getSettings();
    const unitSymbol =
      (settings.weatherUnit || "celsius") === "fahrenheit" ? "°F" : "°C";
    const windUnitLabel =
      (settings.weatherUnit || "celsius") === "fahrenheit" ? "mph" : "km/h";

    const metric = this.selectedMetric || "temperature";
    let values = temps;
    let metricLabel = `Temperature (${unitSymbol})`;
    let metricUnit = unitSymbol;

    if (metric === "humidity") {
      values = humidity;
      metricLabel = "Humidity (%)";
      metricUnit = "%";
    } else if (metric === "precipitation") {
      values = precip;
      metricLabel = "Precipitation (mm)";
      metricUnit = "mm";
    } else if (metric === "wind") {
      values = wind;
      metricLabel = `Wind (${windUnitLabel})`;
      metricUnit = windUnitLabel;
    }

    if (this.weatherChartLegend) {
      const dayLabel = selectedDate
        ? new Date(selectedDate).toLocaleDateString(undefined, {
            weekday: "short",
          })
        : "";
      const prefix = dayLabel ? `${dayLabel} • ` : "";
      this.weatherChartLegend.textContent = `${prefix}${metricLabel}`;
    }

    const rootStyles = getComputedStyle(document.documentElement);
    const colorTemp =
      rootStyles.getPropertyValue("--weather-metric-temperature").trim() ||
      rootStyles.getPropertyValue("--accent-gold").trim() ||
      "#d4af37";
    const colorHum =
      rootStyles.getPropertyValue("--weather-metric-humidity").trim() ||
      rootStyles.getPropertyValue("--accent-blue").trim() ||
      "#0066cc";
    const colorPrecip =
      rootStyles.getPropertyValue("--weather-metric-precipitation").trim() ||
      rootStyles.getPropertyValue("--text-muted").trim() ||
      "rgba(255, 255, 255, 0.6)";
    const colorWind =
      rootStyles.getPropertyValue("--weather-metric-wind").trim() ||
      rootStyles.getPropertyValue("--primary-color").trim() ||
      "#1a5f4a";
    const colorMuted =
      rootStyles.getPropertyValue("--text-muted").trim() ||
      "rgba(255, 255, 255, 0.6)";
    const colorBorder =
      rootStyles.getPropertyValue("--glass-border").trim() ||
      "rgba(255, 255, 255, 0.2)";

    const canvas = this.weatherChart;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Cancel any in-flight frame; we'll schedule a fresh one if animation is still running.
    if (this._chartRaf) {
      cancelAnimationFrame(this._chartRaf);
      this._chartRaf = null;
    }

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth || 800;
    const cssHeight = canvas.clientHeight || 260;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = cssWidth;
    const height = cssHeight;
    ctx.clearRect(0, 0, width, height);

    const padding = { left: 54, right: 12, top: 12, bottom: 28 };
    const plotLeft = padding.left;
    const plotTop = padding.top;
    const plotBottom = height - padding.bottom;
    const plotHeight = plotBottom - plotTop;
    const plotWidth = width - padding.left - padding.right;
    const points = times.length;
    if (points < 2 || plotWidth <= 20 || plotHeight <= 20) return;

    const numericValues = (values || []).map((v) => Number(v));
    const finiteValues = numericValues.filter((v) => Number.isFinite(v));

    let min = 0;
    let max = finiteValues.length ? Math.max(...finiteValues) : 1;

    if (metric === "temperature") {
      min = finiteValues.length ? Math.min(...finiteValues) : 0;
      max = finiteValues.length ? Math.max(...finiteValues) : 1;
      if (min === max) {
        min -= 1;
        max += 1;
      }
    } else if (metric === "humidity") {
      min = 0;
      max = 100;
    } else {
      min = 0;
      max = max === 0 ? 1 : max;
    }

    const yFor = (v) => {
      const vv = Number.isFinite(v) ? v : min;
      const t = (vv - min) / (max - min);
      return plotBottom - 2 - t * (plotHeight - 10);
    };

    // axis frame
    ctx.strokeStyle = colorBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(plotLeft, plotTop, plotWidth, plotHeight);
    ctx.stroke();

    // horizontal grid lines
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = colorBorder;
    for (let i = 1; i <= 3; i++) {
      const y = plotTop + (plotHeight * i) / 4;
      ctx.beginPath();
      ctx.moveTo(plotLeft, y);
      ctx.lineTo(plotLeft + plotWidth, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // y labels (min/max)
    ctx.fillStyle = colorMuted;
    ctx.font = "12px Poppins, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(`${Math.round(max)}${metricUnit}`, plotLeft - 8, plotTop + 6);
    ctx.fillText(`${Math.round(min)}${metricUnit}`, plotLeft - 8, plotBottom);

    // bar color
    let barColor = colorTemp;
    if (metric === "humidity") barColor = colorHum;
    else if (metric === "precipitation") barColor = colorPrecip;
    else if (metric === "wind") barColor = colorWind;

    // bars
    const stepX = plotWidth / points;
    const barWidth = Math.max(2, Math.floor(stepX * 0.72));
    const baseY = yFor(min);

    // Cache layout + x hitboxes for tooltip
    this._chartLayout = {
      plotLeft,
      plotTop,
      plotBottom,
      plotWidth,
      plotHeight,
      stepX,
      barWidth,
      baseY,
      points,
    };

    const bars = new Array(points);

    const nowMs = performance.now();
    const anim = this._chartAnim;
    const shouldAnimate =
      !!anim &&
      anim.metric === metric &&
      nowMs - anim.start < anim.duration + points * anim.stagger + 60;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const scaleForIndex = (i) => {
      if (!shouldAnimate || !anim) return 1;
      const local = (nowMs - anim.start - i * anim.stagger) / anim.duration;
      const t = Math.max(0, Math.min(1, local));
      return easeOutCubic(t);
    };

    ctx.save();
    ctx.globalAlpha = 0.92;
    for (let i = 0; i < points; i++) {
      const x = plotLeft + i * stepX + stepX / 2;
      const y = yFor(numericValues[i]);
      const h = baseY - y;
      const heightPx = Math.max(0, h);
      const scale = scaleForIndex(i);
      const scaledH = heightPx * scale;
      const scaledY = baseY - scaledH;

      // compute a value-based color for this bar and use a subtle vertical gradient
      const baseColor = this._colorForMetric(
        metric,
        numericValues[i],
        min,
        max,
      );
      const topRgb = this._lightenHex(baseColor, 0.32);
      const topColor = this._rgbToCss(topRgb);
      const bottomColor = baseColor;
      const grad = ctx.createLinearGradient(0, scaledY, 0, scaledY + scaledH);
      grad.addColorStop(0, topColor);
      grad.addColorStop(1, bottomColor);
      ctx.fillStyle = grad;

      ctx.fillRect(x - barWidth / 2, scaledY, barWidth, scaledH);

      const value = numericValues[i];
      const valueLabel = Number.isFinite(value)
        ? `${Math.round(value * 10) / 10}${metricUnit}`
        : `--${metricUnit}`;
      const timeLabel = times[i]?.toLocaleTimeString(undefined, {
        hour: "numeric",
      });

      bars[i] = {
        x: x - barWidth / 2,
        w: barWidth,
        cx: x,
        y: scaledY,
        h: scaledH,
        valueLabel,
        timeLabel,
      };
    }
    ctx.restore();

    this._chartBars = bars;

    // subtle outline for readability
    ctx.strokeStyle = colorBorder;
    ctx.lineWidth = 1;
    for (let i = 0; i < points; i++) {
      const x = plotLeft + i * stepX + stepX / 2;
      const y = yFor(numericValues[i]);
      const h = baseY - y;
      const heightPx = Math.max(0, h);
      const scale = scaleForIndex(i);
      const scaledH = heightPx * scale;
      const scaledY = baseY - scaledH;
      ctx.strokeRect(x - barWidth / 2, scaledY, barWidth, scaledH);
    }

    // Draw current time vertical strip (if within range)
    (function () {
      if (!Array.isArray(times) || times.length < 2) return;
      const startMs = times[0].getTime();
      const endMs = times[times.length - 1].getTime();
      const nowMs = Date.now();
      if (endMs > startMs && nowMs >= startMs && nowMs <= endMs) {
        const p = (nowMs - startMs) / (endMs - startMs);
        const xPos = plotLeft + p * plotWidth;
        const stripW = Math.max(3, Math.min(14, stepX * 0.4));
        const half = stripW / 2;

        // vertical gradient stripe for depth
        const gradStrip = ctx.createLinearGradient(0, plotTop, 0, plotBottom);
        gradStrip.addColorStop(0, "rgba(255,255,255,0.02)");
        gradStrip.addColorStop(0.48, "rgba(255,255,255,0.06)");
        gradStrip.addColorStop(0.5, "rgba(255,255,255,0.12)");
        gradStrip.addColorStop(0.52, "rgba(255,255,255,0.06)");
        gradStrip.addColorStop(1, "rgba(255,255,255,0.02)");

        ctx.save();
        ctx.fillStyle = gradStrip;
        ctx.fillRect(xPos - half, plotTop, stripW, plotHeight);

        // center accent line
        ctx.strokeStyle = "rgba(255,255,255,0.24)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xPos, plotTop);
        ctx.lineTo(xPos, plotBottom);
        ctx.stroke();

        // 'Now' pill label above chart (clamped to plot area)
        const labelText = "Now";
        ctx.font = "11px Poppins, sans-serif";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        const txtW = Math.max(28, ctx.measureText(labelText).width + 12);
        const labelH = 18;
        let labelX = xPos - txtW / 2;
        const minX = plotLeft;
        const maxX = plotLeft + plotWidth - txtW;
        if (labelX < minX) labelX = minX;
        if (labelX > maxX) labelX = maxX;
        const labelY = plotTop - labelH - 8;

        // Draw rounded rect background for pill (softer transparent gray)
        const r = 6;
        ctx.fillStyle = "rgba(120,120,120,0.35)";
        ctx.beginPath();
        ctx.moveTo(labelX + r, labelY);
        ctx.arcTo(labelX + txtW, labelY, labelX + txtW, labelY + labelH, r);
        ctx.arcTo(labelX + txtW, labelY + labelH, labelX, labelY + labelH, r);
        ctx.arcTo(labelX, labelY + labelH, labelX, labelY, r);
        ctx.arcTo(labelX, labelY, labelX + txtW, labelY, r);
        ctx.closePath();
        ctx.fill();

        // label text (slightly softer white for contrast)
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fillText(labelText, labelX + txtW / 2, labelY + labelH / 2);

        ctx.restore();
      }
    })();

    // x labels (every 3 hours)
    const labelEvery = 3;
    ctx.fillStyle = colorMuted;
    ctx.font = "11px Poppins, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i < points; i += labelEvery) {
      const x = plotLeft + i * stepX + stepX / 2;
      const hourLabel = times[i].toLocaleTimeString(undefined, {
        hour: "numeric",
      });
      ctx.fillText(hourLabel, x, plotBottom + 6);
    }

    if (shouldAnimate) {
      this._chartRaf = requestAnimationFrame(() => this.renderHourlyChart());
    } else {
      this._chartAnim = null;
    }

    return;
  }
}

window.WeatherManager = WeatherManager;

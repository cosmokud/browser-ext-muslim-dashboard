/**
 * Weather Manager
 * Fetches and displays weather information using Open-Meteo API (free, no API key required)
 * Supports temperature units, location-based weather, and auto-refresh
 */

class WeatherManager {
  constructor(storage) {
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
      "#weatherCard .weather-chart-tab[data-metric]"
    );

    this.currentWeather = null;
    this.dailyForecast = null;
    this.hourlyForecast = null;
    this.lastFetch = null;
    this.refreshInterval = null;

    this._resizeTimer = null;
    this.selectedForecastIndex = 0;
    this.selectedMetric = "temperature";
    this._onResize = () => {
      if (this._resizeTimer) window.clearTimeout(this._resizeTimer);
      this._resizeTimer = window.setTimeout(() => {
        this.renderHourlyChart();
      }, 120);
    };

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
   * Initialize weather manager
   */
  async init() {
    this.setupEventListeners();
    await this.fetchWeather();

    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.refreshInterval = setInterval(() => {
      this.fetchWeather();
    }, 30 * 60 * 1000);

    return;
    /*
    const cssWidth = canvas.clientWidth || 800;
    const cssHeight = canvas.clientHeight || 280;
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

    // bars
    const stepX = plotWidth / points;
    const barWidth = Math.max(2, Math.floor(stepX * 0.72));
    const baseY = yFor(min);

    let barColor = colorTemp;
    if (metric === "humidity") barColor = colorHum;
    else if (metric === "precipitation") barColor = colorPrecip;
    else if (metric === "wind") barColor = colorWind;

    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = barColor;
    for (let i = 0; i < points; i++) {
      const x = plotLeft + i * stepX + stepX / 2;
      const y = yFor(numericValues[i]);
      const h = baseY - y;
      const heightPx = Math.max(0, h);
      ctx.fillRect(x - barWidth / 2, y, barWidth, heightPx);
    }
    ctx.restore();

    // x labels (every 3 hours)
    const labelEvery = 3;
    ctx.fillStyle = colorMuted;
    ctx.font = "11px Poppins, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i < points; i += labelEvery) {
      const x = plotLeft + i * stepX + stepX / 2;
      const hourLabel = times[i].toLocaleTimeString(undefined, { hour: "numeric" });
      ctx.fillText(hourLabel, x, plotBottom + 6);
    }
    */
  }

  setupEventListeners() {
    if (this._listenersBound) return;
    this._listenersBound = true;

    if (this.weatherRefreshBtn) {
      this.weatherRefreshBtn.addEventListener("click", () =>
        this.fetchWeather()
      );
    }

    if (this.weatherChartTabs && this.weatherChartTabs.length) {
      this.weatherChartTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          const metric = tab.getAttribute("data-metric");
          if (!metric) return;
          this.selectedMetric = metric;
          this.updateMetricTabs();
          this.renderHourlyChart();
        });
      });
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
      city
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

  async fetchWeather() {
    try {
      if (!this.weatherCard) return;

      const settings = this.storage.getSettings();
      const unit = settings.weatherUnit || "celsius";

      const location = await this._resolveWeatherLocation(settings);
      if (!location) {
        throw new Error("No location available");
      }

      const tempUnit = unit === "fahrenheit" ? "fahrenheit" : "celsius";
      const windUnit = unit === "fahrenheit" ? "mph" : "kmh";

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&forecast_days=7&timezone=auto&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Weather API request failed");
      }

      const data = await response.json();
      const current = data.current || {};

      const locationName =
        location.city ||
        (await this._reverseGeocodeName(
          location.latitude,
          location.longitude
        )) ||
        `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`;

      this.currentWeather = {
        temperature: Number.isFinite(current.temperature_2m)
          ? Math.round(current.temperature_2m)
          : null,
        feelsLike: Number.isFinite(current.apparent_temperature)
          ? Math.round(current.apparent_temperature)
          : null,
        humidity: Number.isFinite(current.relative_humidity_2m)
          ? Math.round(current.relative_humidity_2m)
          : null,
        windSpeed: Number.isFinite(current.wind_speed_10m)
          ? Math.round(current.wind_speed_10m)
          : null,
        weatherCode: current.weather_code,
        unit: unit,
        windUnit: windUnit,
        location: locationName,
      };

      this.dailyForecast = data.daily || null;
      this.hourlyForecast = data.hourly || null;
      this.lastFetch = Date.now();

      // keep selection in-range
      const dayCount = this.dailyForecast?.time?.length || 0;
      if (dayCount > 0) {
        this.selectedForecastIndex = Math.max(
          0,
          Math.min(this.selectedForecastIndex, dayCount - 1)
        );
      } else {
        this.selectedForecastIndex = 0;
      }

      this.updateDisplay();
    } catch (error) {
      console.error("Weather fetch error:", error);
      this.showError();
    }
  }

  /**
   * Show error state
   */
  showError() {
    if (this.weatherIcon) {
      this.weatherIcon.textContent = "⚠️";
    }
    if (this.weatherTemp) {
      this.weatherTemp.textContent = "--";
    }
    if (this.weatherDesc) {
      this.weatherDesc.textContent = "Unable to load weather";
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
   * Update weather unit and refresh
   */
  updateUnit(unit) {
    const settings = this.storage.getSettings();
    settings.weatherUnit = unit;
    this.storage.saveSettings(settings);
    this.fetchWeather();
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
  /*
      const unit = settings.weatherUnit || "celsius";

// Export for use
window.WeatherManager = WeatherManager;

      const tempUnit = unit === "fahrenheit" ? "fahrenheit" : "celsius";
      const windUnit = unit === "fahrenheit" ? "mph" : "kmh";

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&forecast_days=7&timezone=auto&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Weather API request failed");
      }

      const data = await response.json();

      const current = data.current || {};

      this.currentWeather = {
        temperature: Number.isFinite(current.temperature_2m)
          ? Math.round(current.temperature_2m)
          : null,
        feelsLike: Number.isFinite(current.apparent_temperature)
          ? Math.round(current.apparent_temperature)
          : null,
        humidity: Number.isFinite(current.relative_humidity_2m)
          ? Math.round(current.relative_humidity_2m)
          : null,
        windSpeed: Number.isFinite(current.wind_speed_10m)
          ? Math.round(current.wind_speed_10m)
          : null,
        weatherCode: current.weather_code,
        unit: unit,
        windUnit: windUnit,
        location: location.city,
      };

      this.dailyForecast = data.daily || null;
      this.hourlyForecast = data.hourly || null;

      this.lastFetch = Date.now();
      this.updateDisplay();
    } catch (error) {
      console.error("Weather fetch error:", error);
      this.showError();
    }
  }

  */

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
      this.weatherIcon.textContent = weatherInfo.icon;
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
          <div class="day-icon">${info.icon}</div>
          <div class="day-temp">${tempText}</div>
          <div class="day-meta">
            <span>${precipText}</span>
            <span>${windText}</span>
          </div>
        </div>
      `;
    });

    this.weatherForecast.innerHTML = items.join("");

    // Click to select day (updates chart)
    this.weatherForecast
      .querySelectorAll(".weather-forecast-day")
      .forEach((el) => {
        el.addEventListener("click", () => {
          const idx = Number(el.getAttribute("data-day-index"));
          if (!Number.isFinite(idx)) return;
          this.selectedForecastIndex = Math.max(0, Math.min(6, idx));
          this.render7DayForecast();
          this.renderHourlyChart();
        });
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
          typeof t === "string" && t.startsWith(selectedDate) ? i : -1
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
      rootStyles.getPropertyValue("--accent-gold").trim() || "#d4af37";
    const colorHum =
      rootStyles.getPropertyValue("--primary-light").trim() || "#2d8a6e";
    const colorPrecip =
      rootStyles.getPropertyValue("--accent-gold-light").trim() || "#e6c866";
    const colorWind =
      rootStyles.getPropertyValue("--primary-color").trim() || "#1a5f4a";
    const colorMuted =
      rootStyles.getPropertyValue("--text-muted").trim() ||
      "rgba(255, 255, 255, 0.6)";
    const colorBorder =
      rootStyles.getPropertyValue("--glass-border").trim() ||
      "rgba(255, 255, 255, 0.2)";

    const canvas = this.weatherChart;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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

    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = barColor;
    for (let i = 0; i < points; i++) {
      const x = plotLeft + i * stepX + stepX / 2;
      const y = yFor(numericValues[i]);
      const h = baseY - y;
      const heightPx = Math.max(0, h);
      ctx.fillRect(x - barWidth / 2, y, barWidth, heightPx);
    }
    ctx.restore();

    // subtle outline for readability
    ctx.strokeStyle = colorBorder;
    ctx.lineWidth = 1;
    for (let i = 0; i < points; i++) {
      const x = plotLeft + i * stepX + stepX / 2;
      const y = yFor(numericValues[i]);
      const h = baseY - y;
      const heightPx = Math.max(0, h);
      ctx.strokeRect(x - barWidth / 2, y, barWidth, heightPx);
    }

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

    return;
    /*

    const panelHeight =
      (height - padding.top - padding.bottom - panelGap * (panels.length - 1)) /
      panels.length;
    const plotWidth = width - padding.left - padding.right;
    const points = times.length;
    if (points < 2 || plotWidth <= 20 || panelHeight <= 20) return;
    const stepX = plotWidth / (points - 1);
    const labelEvery = 3;

    panels.forEach((panel, idx) => {
      const top = padding.top + idx * (panelHeight + panelGap);
      const left = padding.left;
      const bottom = top + panelHeight;

      // label
      ctx.fillStyle = colorMuted;
      ctx.font = "12px Poppins, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(panel.label, 10, top + 2);

      // frame
      ctx.strokeStyle = colorBorder;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(left + plotWidth, top);
      ctx.lineTo(left + plotWidth, bottom);
      ctx.lineTo(left, bottom);
      ctx.closePath();
      ctx.stroke();

      const numericValues = (panel.values || []).map((v) => Number(v));
      const finiteValues = numericValues.filter((v) => Number.isFinite(v));
      let min = finiteValues.length ? Math.min(...finiteValues) : 0;
      let max = finiteValues.length ? Math.max(...finiteValues) : 1;
      if (min === max) {
        min -= 1;
        max += 1;
      }

      const yFor = (v) => {
        const vv = Number.isFinite(v) ? v : min;
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

        // bars
        const stepX = plotWidth / points;
        const barWidth = Math.max(2, Math.floor(stepX * 0.72));
        const baseY = yFor(min);

        let barColor = colorTemp;
        if (metric === "humidity") barColor = colorHum;
        else if (metric === "precipitation") barColor = colorPrecip;
        else if (metric === "wind") barColor = colorWind;

        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = barColor;
        for (let i = 0; i < points; i++) {
          const x = plotLeft + i * stepX + stepX / 2;
          const y = yFor(numericValues[i]);
          const h = baseY - y;
          const heightPx = Math.max(0, h);
          ctx.fillRect(x - barWidth / 2, y, barWidth, heightPx);
        }
        ctx.restore();

        // x labels (every 3 hours)
        const labelEvery = 3;
        ctx.fillStyle = colorMuted;
        ctx.font = "11px Poppins, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        for (let i = 0; i < points; i += labelEvery) {
          const x = plotLeft + i * stepX + stepX / 2;
          const hourLabel = times[i].toLocaleTimeString(undefined, { hour: "numeric" });
          ctx.fillText(hourLabel, x, plotBottom + 6);
        }

    */
  }
}

window.WeatherManager = WeatherManager;

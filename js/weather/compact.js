/**
 * WeatherManager: compact weather card.
 * Part of the class declared in js/weather/index.js; load this after it.
 */
(function (prototype, members) {
  for (const name of Object.getOwnPropertyNames(members.prototype)) {
    if (name === "constructor") continue;
    Object.defineProperty(
      prototype,
      name,
      Object.getOwnPropertyDescriptor(members.prototype, name),
    );
  }
})(WeatherManager.prototype, class {

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

  ensureCompactWeatherElement() {
    const settings = this.storage.getSettings();
    const headingSettings = settings.heading || {};
    const compactWeatherBgEnabled =
      headingSettings.wholeComponentSurfaceEnabled !== true &&
      headingSettings.compactWeatherBackgroundEnabled === true;

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

    compactWeather.classList.toggle(
      "header-surface-enabled",
      compactWeatherBgEnabled,
    );

    this.compactWeatherEl = compactWeather;
  }

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
      locationEl.removeAttribute("title");
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

  hideCompactWeather() {
    const compactEl = document.getElementById("compactWeather");
    if (compactEl) {
      compactEl.classList.remove("active");
    }
  }
});

/**
 * WeatherManager: display update and teardown.
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

  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    if (this._resizeTimer) {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = null;
    }

    if (this._forecastResizeTimer) {
      clearTimeout(this._forecastResizeTimer);
      this._forecastResizeTimer = null;
    }

    if (this._weatherCardResizeTimer) {
      clearTimeout(this._weatherCardResizeTimer);
      this._weatherCardResizeTimer = null;
    }

    if (this._responsiveSyncTimer) {
      clearTimeout(this._responsiveSyncTimer);
      this._responsiveSyncTimer = null;
    }

    if (this._responsiveSyncRaf1) {
      cancelAnimationFrame(this._responsiveSyncRaf1);
      this._responsiveSyncRaf1 = null;
    }

    if (this._responsiveSyncRaf2) {
      cancelAnimationFrame(this._responsiveSyncRaf2);
      this._responsiveSyncRaf2 = null;
    }

    if (this._responsiveSyncFrameRaf) {
      cancelAnimationFrame(this._responsiveSyncFrameRaf);
      this._responsiveSyncFrameRaf = null;
    }
    this._responsiveSyncFrameIncludeChart = false;

    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("resize", this._onForecastResize);

    this._weatherLayoutSyncEvents.forEach((eventName) => {
      document.removeEventListener(eventName, this._externalLayoutSyncHandler);
    });

    if (this._weatherResizeObserver) {
      this._weatherResizeObserver.disconnect();
      this._weatherResizeObserver = null;
    }

    if (this._weatherContentResizeObserver) {
      this._weatherContentResizeObserver.disconnect();
      this._weatherContentResizeObserver = null;
    }

    if (this._weatherMainContainerResizeObserver) {
      this._weatherMainContainerResizeObserver.disconnect();
      this._weatherMainContainerResizeObserver = null;
    }

    if (this._weatherCardMutationObserver) {
      this._weatherCardMutationObserver.disconnect();
      this._weatherCardMutationObserver = null;
    }

    if (this._chartVisibilityObserver) {
      this._chartVisibilityObserver.disconnect();
      this._chartVisibilityObserver = null;
    }
  }

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

    this.setWeatherLocationText(weather.location);

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

    this.syncWeatherResponsiveLayout();

    this.render7DayForecast();
    this.updateMetricTabs();
    this.renderHourlyChart();
  }

  setWeatherLocationText(locationText) {
    if (!this.weatherLocation) return;

    const displayText = String(locationText || "").trim();
    this.weatherLocation.textContent = displayText;
    this.weatherLocation.removeAttribute("data-full-location");
    this.weatherLocation.removeAttribute("aria-label");
    this.weatherLocation.removeAttribute("title");
    this.weatherLocation.removeAttribute("tabindex");

    this.updateWeatherLocationTruncation();
  }
});

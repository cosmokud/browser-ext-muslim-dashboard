/**
 * WeatherManager: forecast cache and payload validation.
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

  isPerformanceModeEnabled() {
    if (typeof window !== "undefined") {
      if (typeof window.__MD_PERFORMANCE_MODE__ === "boolean") {
        return window.__MD_PERFORMANCE_MODE__ === true;
      }
    }

    try {
      return this.storage.getSettings()?.performanceModeEnabled === true;
    } catch (e) {
      return false;
    }
  }

  isHighestVisualFidelityEnabled() {
    if (typeof window !== "undefined") {
      if (typeof window.__MD_HIGHEST_VISUAL_FIDELITY__ === "boolean") {
        return window.__MD_HIGHEST_VISUAL_FIDELITY__ === true;
      }
    }

    try {
      return (
        this.storage.getSettings()?.theme?.highestVisualFidelityEnabled === true
      );
    } catch (e) {
      return false;
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

  _isUsableWeatherPayload(data) {
    if (!data || typeof data !== "object") return false;
    if (data.error === true) return false;

    const hasCurrent = data.current && typeof data.current === "object";
    const hasLegacyCurrent =
      data.current_weather && typeof data.current_weather === "object";
    const hasHourly = data.hourly && typeof data.hourly === "object";
    const hasDaily = data.daily && typeof data.daily === "object";

    return (hasCurrent || hasLegacyCurrent) && (hasHourly || hasDaily);
  }

  _validateWeatherPayload(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Weather API returned malformed payload.");
    }

    if (data.error === true) {
      const reason =
        typeof data.reason === "string" && data.reason.trim()
          ? data.reason.trim()
          : "Unknown weather API error";
      throw new Error(reason);
    }

    if (!this._isUsableWeatherPayload(data)) {
      throw new Error(
        "Weather API payload is missing required forecast fields.",
      );
    }
  }
});

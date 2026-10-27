/**
 * WeatherManager: forecast fetching and loading states.
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

      // Two decimals (~1 km) is the request grid and the cache key, so GPS
      // jitter no longer throws away today's forecast. The extra Number() drops
      // the "-0.00" their string form would produce at the equator.
      const latitude = Number(Number(location.latitude).toFixed(2));
      const longitude = Number(Number(location.longitude).toFixed(2));

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&forecast_days=7&timezone=auto&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}`;

      const todayKey = this._getLocalDateKey(Date.now());
      const cached = this._getWeatherForecastCache();
      const hasUsableCachedData =
        cached &&
        cached.url === url &&
        this._isUsableWeatherPayload(cached.data);
      const cacheHit =
        !force &&
        hasUsableCachedData &&
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
          if (hasUsableCachedData) {
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

          try {
            this._validateWeatherPayload(data);
          } catch (validationError) {
            console.error(
              "Weather API payload validation failed:",
              validationError?.message || validationError,
            );
            if (hasUsableCachedData) {
              data = cached.data;
              usedCache = true;
            } else {
              throw validationError;
            }
          }

          // Persist only when we successfully fetched fresh valid data.
          if (!usedCache) {
            this._setWeatherForecastCache({
              url,
              dateKey: todayKey,
              data,
              savedAt: Date.now(),
            });
          }
        }
      }

      this._validateWeatherPayload(data);

      const current = data.current || data.current_weather || {};

      const displayLocationName =
        this._getDashboardDisplayCity(settings) ||
        this._extractCityLikeName(location.city) ||
        `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`;

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
        location: displayLocationName,
      };

      this.dailyForecast = data.daily || null;
      this.hourlyForecast = data.hourly || null;
      this.lastFetch = Date.now();

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
    this.setWeatherLocationText("");

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
    this.setWeatherLocationText("Detecting location...");
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

  showErrorState() {
    this.showError("Failed to load weather data");
  }

  updateUnit(unit) {
    const settings = this.storage.getSettings();
    settings.weatherUnit = unit;
    this.storage.saveSettings(settings);
    this.fetchWeather({ force: true });
  }
});

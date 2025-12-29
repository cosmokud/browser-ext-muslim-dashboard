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

    this.currentWeather = null;
    this.lastFetch = null;
    this.refreshInterval = null;

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

    // Auto-refresh every 30 minutes
    this.refreshInterval = setInterval(() => {
      this.fetchWeather();
    }, 30 * 60 * 1000);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    if (this.weatherRefreshBtn) {
      this.weatherRefreshBtn.addEventListener("click", () => {
        this.weatherRefreshBtn.classList.add("rotating");
        this.fetchWeather().then(() => {
          setTimeout(() => {
            this.weatherRefreshBtn.classList.remove("rotating");
          }, 500);
        });
      });
    }
  }

  /**
   * Get current location
   */
  async getLocation() {
    const settings = this.storage.getSettings();
    const lastLocation = this.storage.getLastLocation();

    // Use manual location if set
    if (
      settings.locationMethod === "manual" &&
      settings.latitude &&
      settings.longitude
    ) {
      return {
        latitude: settings.latitude,
        longitude: settings.longitude,
        city: settings.city || "Unknown",
      };
    }

    // Use last known location if available
    if (lastLocation) {
      return lastLocation;
    }

    // Try to get location via geolocation API
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            city: "Current Location",
          };

          // Try to get city name via reverse geocoding
          try {
            const cityName = await this.reverseGeocode(
              location.latitude,
              location.longitude
            );
            if (cityName) {
              location.city = cityName;
            }
          } catch (e) {
            console.warn("Reverse geocoding failed:", e);
          }

          this.storage.saveLastLocation(location);
          resolve(location);
        },
        (error) => {
          // Fallback to a default location (Mecca)
          resolve({
            latitude: 21.4225,
            longitude: 39.8262,
            city: "Mecca",
          });
        },
        { timeout: 10000, maximumAge: 300000 }
      );
    });
  }

  /**
   * Reverse geocode to get city name
   */
  async reverseGeocode(lat, lon) {
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=&latitude=${lat}&longitude=${lon}&count=1`
      );

      // Try alternative approach - use nominatim (fallback)
      const nominatimResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
      );

      if (nominatimResponse.ok) {
        const data = await nominatimResponse.json();
        return (
          data.address?.city ||
          data.address?.town ||
          data.address?.village ||
          data.address?.county ||
          null
        );
      }
    } catch (e) {
      console.warn("Reverse geocoding error:", e);
    }
    return null;
  }

  /**
   * Fetch weather data from Open-Meteo API
   */
  async fetchWeather() {
    try {
      const location = await this.getLocation();
      const settings = this.storage.getSettings();
      const unit = settings.weatherUnit || "celsius";

      const tempUnit = unit === "fahrenheit" ? "fahrenheit" : "celsius";
      const windUnit = unit === "fahrenheit" ? "mph" : "kmh";

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Weather API request failed");
      }

      const data = await response.json();

      this.currentWeather = {
        temperature: Math.round(data.current.temperature_2m),
        feelsLike: Math.round(data.current.apparent_temperature),
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m),
        weatherCode: data.current.weather_code,
        unit: unit,
        location: location.city,
      };

      this.lastFetch = Date.now();
      this.updateDisplay();
    } catch (error) {
      console.error("Weather fetch error:", error);
      this.showError();
    }
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
    const windUnit = weather.unit === "fahrenheit" ? "mph" : "km/h";

    if (this.weatherIcon) {
      this.weatherIcon.textContent = weatherInfo.icon;
    }

    if (this.weatherTemp) {
      this.weatherTemp.textContent = `${weather.temperature}${unitSymbol}`;
    }

    if (this.weatherDesc) {
      this.weatherDesc.textContent = weatherInfo.desc;
    }

    if (this.weatherLocation) {
      this.weatherLocation.textContent = weather.location;
    }

    if (this.weatherFeelsLike) {
      this.weatherFeelsLike.textContent = `Feels like ${weather.feelsLike}${unitSymbol}`;
    }

    if (this.weatherHumidity) {
      this.weatherHumidity.textContent = `${weather.humidity}%`;
    }

    if (this.weatherWind) {
      this.weatherWind.textContent = `${weather.windSpeed} ${windUnit}`;
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
  }
}

// Export for use
window.WeatherManager = WeatherManager;

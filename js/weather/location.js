/**
 * WeatherManager: city and browser location resolution.
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

  _toNumber(value) {
    const n = typeof value === "string" ? Number.parseFloat(value) : value;
    return Number.isFinite(n) ? n : null;
  }

  _formatPlaceName(result) {
    if (!result) return "";
    const parts = [result.name, result.admin1, result.country].filter(Boolean);
    return parts.join(", ");
  }

  _extractCityLikeName(locationText) {
    const normalized = String(locationText || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!normalized) return "";

    const [firstPart] = normalized.split(",");
    const city = String(firstPart || "").trim();
    return city || normalized;
  }

  _getDashboardDisplayCity(settings = null) {
    const activeSettings = settings || this.storage.getSettings() || {};
    const useManualLocation = activeSettings.locationMethod === "manual";
    const locationTextEl = document.getElementById("locationText");
    const locationDisplayText = String(locationTextEl?.textContent || "")
      .replace(/\s+/g, " ")
      .trim();

    if (locationDisplayText) {
      const lowered = locationDisplayText.toLowerCase();
      const isTransientText =
        lowered.includes("detecting") ||
        lowered.includes("requesting permission") ||
        lowered.includes("loading");
      if (!isTransientText) {
        return this._extractCityLikeName(locationDisplayText);
      }
    }

    if (!useManualLocation) {
      const lastLocation = this.storage.getLastLocation();
      const lastCity = this._extractCityLikeName(lastLocation?.city || "");
      if (lastCity) {
        return lastCity;
      }
      return "";
    }

    return this._extractCityLikeName(activeSettings.city || "");
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
      city: this._extractCityLikeName(
        first.name || this._formatPlaceName(first),
      ),
    };
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

      const city = this._getDashboardDisplayCity(this.storage.getSettings());
      return { latitude, longitude, city };
    } catch {
      return null;
    }
  }

  async _resolveWeatherLocation(settings) {
    const mode = settings.weatherLocationMode || "dashboard";
    const useManualLocation = settings.locationMethod === "manual";

    if (mode === "custom") {
      const latitude = this._toNumber(settings.weatherLatitude);
      const longitude = this._toNumber(settings.weatherLongitude);
      const cityName = (settings.weatherCity || "").trim();
      if (latitude !== null && longitude !== null) {
        const city = cityName || this._getDashboardDisplayCity(settings);
        return { latitude, longitude, city: city || "" };
      }

      if (cityName) {
        const geo = await this._geocodeCity(cityName);
        if (geo) return geo;
      }
    }

    // dashboard location
    if (useManualLocation) {
      const latitude = this._toNumber(settings.latitude);
      const longitude = this._toNumber(settings.longitude);
      const city =
        this._extractCityLikeName(settings.city || "") ||
        this._getDashboardDisplayCity(settings);

      if (latitude !== null && longitude !== null) {
        return { latitude, longitude, city };
      }
    }

    const lastLocation = this.storage.getLastLocation();
    const lastLatitude = this._toNumber(lastLocation?.latitude);
    const lastLongitude = this._toNumber(lastLocation?.longitude);
    if (lastLatitude !== null && lastLongitude !== null) {
      const city =
        this._getDashboardDisplayCity(settings) ||
        this._extractCityLikeName(lastLocation?.city || "");
      return {
        latitude: lastLatitude,
        longitude: lastLongitude,
        city,
      };
    }

    return await this._getBrowserLocation();
  }
});

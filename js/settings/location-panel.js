/**
 * SettingsManager: location detection and city search.
 * Part of the class declared in js/settings/index.js; load this after it.
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
})(SettingsManager.prototype, class {

  toggleManualLocation(show) {
    if (this.manualLocationFields) {
      if (show) {
        this.manualLocationFields.classList.add("active");
      } else {
        this.manualLocationFields.classList.remove("active");
      }
    }

    this.updateDetectedLocationTextVisibility();
  }

  toggleCustomAngles(show) {
    if (this.customAnglesGroup) {
      this.customAnglesGroup.style.display = show ? "block" : "none";
    }
  }

  getDetectedLocationText() {
    const locationTextEl = document.getElementById("locationText");
    const locationText = String(locationTextEl?.textContent || "")
      .replace(/\s+/g, " ")
      .trim();

    if (locationText) {
      const lowered = locationText.toLowerCase();
      const isTransientText =
        lowered.includes("detecting") ||
        lowered.includes("requesting permission") ||
        lowered.includes("loading");

      if (!isTransientText) {
        return locationText;
      }
    }

    const lastLocation = this.storage.getLastLocation();
    const lastCity = String(lastLocation?.city || "").trim();
    if (lastCity) {
      return lastCity;
    }

    return "Not detected yet";
  }

  updateDetectedLocationTextVisibility() {
    if (!this.detectedLocationText) return;

    const selectedRadio = document.querySelector(
      'input[name="locationMethod"]:checked',
    );
    const isManual =
      selectedRadio?.value === "manual" ||
      this.manualLocationFields?.classList.contains("active");

    this.detectedLocationText.hidden = isManual;
  }

  updateDetectedLocationText() {
    if (!this.detectedLocationText) return;

    const detectedText = this.getDetectedLocationText();
    this.detectedLocationText.textContent = detectedText;
    this.detectedLocationText.title = detectedText;
    this.updateDetectedLocationTextVisibility();
  }

  bindDetectedLocationTextSync() {
    if (this._locationTextObserver || typeof MutationObserver === "undefined") {
      return;
    }

    const locationTextEl = document.getElementById("locationText");
    if (!locationTextEl) return;

    this._locationTextObserver = new MutationObserver(() => {
      this.updateDetectedLocationText();
    });

    this._locationTextObserver.observe(locationTextEl, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  async refreshDetectedLocation() {
    const stopRefresh = this._startRefreshButton(this.refreshLocationBtn, {
      label: "Refreshing...",
    });

    try {
      await this.requestLocation({ refreshWeather: true, showToast: false });
      this.showToast("Location refreshed", "success");
    } catch (e) {
      this.showToast("Unable to refresh location", "error");
    } finally {
      stopRefresh();
      this.updateDetectedLocationText();
    }
  }

  async requestLocation({ refreshWeather = true, showToast = false } = {}) {
    if (this.prayerTimes) {
      await this.prayerTimes.requestLocation();
    }

    this.updateDetectedLocationText();

    if (refreshWeather && this.weather) {
      this.weather.fetchWeather({ force: true });
    }

    if (showToast) {
      this.showToast("Location updated", "success");
    }
  }

  async searchCity() {
    const cityName = this.cityInput?.value.trim();
    if (!cityName) {
      this.showToast("Please enter a city name", "error");
      return;
    }

    this._clearCitySearchResults(this.citySearchResults);

    if (this.searchCityBtn) {
      this.searchCityBtn.innerHTML =
        this._getIcon("🔍", { size: 16 }) + " Searching...";
      this.searchCityBtn.disabled = true;
    }

    try {
      const results = await this.prayerTimes.searchCity(cityName);

      if (results && results.length > 0) {
        this._renderCitySearchResults(
          this.citySearchResults,
          results,
          (result) => {
            if (this.cityInput) {
              this.cityInput.value = result.city;
              this.cityInput.dispatchEvent(
                new Event("input", { bubbles: true }),
              );
              this.cityInput.dispatchEvent(
                new Event("change", { bubbles: true }),
              );
            }

            this._applyLatLngToInputs(this.latitudeInput, this.longitudeInput, {
              latitude: Number(result.latitude).toFixed(4),
              longitude: Number(result.longitude).toFixed(4),
            });

            this.scheduleAutoSave(80);

            const pickedLabel = result.fullName
              ? `${result.city} (${result.fullName})`
              : result.city;
            this.showToast(`Selected: ${pickedLabel}`, "success");
          },
        );
        this.showToast("Select a city from the list below.", "info");
      } else {
        this.showToast("City not found. Please try a different name.", "error");
      }
    } catch (error) {
      this.showToast("Search failed. Please try again.", "error");
    }

    if (this.searchCityBtn) {
      this.searchCityBtn.innerHTML =
        this._getIcon("🔍", { size: 16 }) + " Search City";
      this.searchCityBtn.disabled = false;
    }
  }
});

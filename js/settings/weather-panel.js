/**
 * SettingsManager: weather panel, city search and coordinates.
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

  _clearCitySearchResults(container) {
    if (!container) return;
    container.innerHTML = "";
    container.classList.remove("active");
  }

  _renderCitySearchResults(container, results, onPick) {
    if (!container) return;
    this._clearCitySearchResults(container);

    const list = Array.isArray(results) ? results : [];
    if (!list.length) return;

    const frag = document.createDocumentFragment();
    list.forEach((result, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "city-result-item";

      const title = String(result.fullName || result.city || "").trim();
      const lat = Number(result.latitude);
      const lon = Number(result.longitude);

      const primary = document.createElement("div");
      primary.className = "city-result-primary";
      primary.textContent = title || "Unknown";

      const secondary = document.createElement("div");
      secondary.className = "city-result-secondary";
      secondary.textContent =
        Number.isFinite(lat) && Number.isFinite(lon)
          ? `${lat.toFixed(4)}, ${lon.toFixed(4)}`
          : "";

      btn.appendChild(primary);
      btn.appendChild(secondary);

      btn.addEventListener("click", () => {
        try {
          if (typeof onPick === "function") onPick(result);
        } finally {
          this._clearCitySearchResults(container);
        }
      });

      // optional hint: 1..9 shortcuts (visual only if styled)
      btn.dataset.shortcut = String(index + 1);
      frag.appendChild(btn);
    });

    container.appendChild(frag);
    container.classList.add("active");
  }

  loadWeatherSettings(settings) {
    const weatherUnit = settings.weatherUnit || "celsius";
    const weatherUnitRadio = document.querySelector(
      `input[name="weatherUnit"][value="${weatherUnit}"]`,
    );
    if (weatherUnitRadio) weatherUnitRadio.checked = true;

    const weatherLocationMode = settings.weatherLocationMode || "dashboard";
    const modeRadio = document.querySelector(
      `input[name="weatherLocationMode"][value="${weatherLocationMode}"]`,
    );
    if (modeRadio) modeRadio.checked = true;
    this.toggleWeatherManualLocation(weatherLocationMode === "custom");

    if (this.weatherCityInput)
      this.weatherCityInput.value = settings.weatherCity || "";
    if (this.weatherLatitudeInput)
      this.weatherLatitudeInput.value = settings.weatherLatitude || "";
    if (this.weatherLongitudeInput)
      this.weatherLongitudeInput.value = settings.weatherLongitude || "";
  }

  loadFastingSettings(settings) {
    const fasting = settings.fasting || {};
    const visibility = fasting.visibility || {};
    const notifications = fasting.notifications || {};
    const notify = notifications.notify || {};

    // Visibility toggles
    if (this.fastingShowMonday) {
      this.fastingShowMonday.checked = visibility.monday !== false;
    }
    if (this.fastingShowThursday) {
      this.fastingShowThursday.checked = visibility.thursday !== false;
    }
    if (this.fastingShowAyyamAlBeed) {
      this.fastingShowAyyamAlBeed.checked = visibility.ayyamAlBeed !== false;
    }
    if (this.fastingShowAshuraDays) {
      this.fastingShowAshuraDays.checked = visibility.ashuraDays !== false;
    }
    if (this.fastingShowDhuAlHijjah) {
      this.fastingShowDhuAlHijjah.checked = visibility.dhuAlHijjah !== false;
    }
    if (this.fastingShowArafah) {
      this.fastingShowArafah.checked = visibility.arafah !== false;
    }
    if (this.fastingShowRamadan) {
      this.fastingShowRamadan.checked = visibility.ramadan !== false;
    }
    if (this.fastingShowRecommendations) {
      this.fastingShowRecommendations.checked =
        fasting.showRecommendations !== false;
    }

    // Which calendar the Islamic dates come from
    if (this.fastingHijriCalendar) {
      const calendar = SettingsRegistry.coerce(
        "fasting.hijriCalendar",
        fasting.hijriCalendar,
      );
      this.fastingHijriCalendar.value = calendar;
      if (this.fastingHijriCalendarHint) {
        this.fastingHijriCalendarHint.textContent =
          calendar === "tabular"
            ? "The arithmetic calendar: months alternate 29 and 30 days."
            : `Covered years ${HijriCalendars.range(calendar).firstYear}-${HijriCalendars.range(calendar).lastYear} AH; outside them the arithmetic calendar answers.`;
      }
    }

    // Within days settings
    if (this.fastingDhuAlHijjahWithinDays) {
      const clamped = SettingsRegistry.coerce(
        "fasting.dhuAlHijjahWithinDays",
        fasting.dhuAlHijjahWithinDays,
      );
      this.fastingDhuAlHijjahWithinDays.value = String(clamped);
    }
    if (this.fastingArafahWithinDays) {
      const clamped = SettingsRegistry.coerce(
        "fasting.arafahWithinDays",
        fasting.arafahWithinDays,
      );
      this.fastingArafahWithinDays.value = String(clamped);
    }
    if (this.fastingAshuraWithinDays) {
      const clamped = SettingsRegistry.coerce(
        "fasting.ashuraWithinDays",
        fasting.ashuraWithinDays,
      );
      this.fastingAshuraWithinDays.value = String(clamped);
    }

    // Notification settings
    if (this.fastingNotificationsEnabled) {
      this.fastingNotificationsEnabled.checked = notifications.enabled === true;
      this.toggleFastingNotificationOptions(notifications.enabled === true);
    }
    if (this.fastingNotificationMinutesBefore) {
      const clamped = SettingsRegistry.coerce(
        "fasting.notifications.minutesBefore",
        notifications.minutesBefore,
      );
      this.fastingNotificationMinutesBefore.value = String(clamped);
    }

    // Per-fast notification toggles
    if (this.fastingNotifyMonday) {
      this.fastingNotifyMonday.checked = notify.monday !== false;
    }
    if (this.fastingNotifyThursday) {
      this.fastingNotifyThursday.checked = notify.thursday !== false;
    }
    if (this.fastingNotifyAyyamAlBeed) {
      this.fastingNotifyAyyamAlBeed.checked = notify.ayyamAlBeed !== false;
    }
    if (this.fastingNotifyAshuraDays) {
      this.fastingNotifyAshuraDays.checked = notify.ashuraDays !== false;
    }
    if (this.fastingNotifyDhuAlHijjah) {
      this.fastingNotifyDhuAlHijjah.checked = notify.dhuAlHijjah !== false;
    }
    if (this.fastingNotifyArafah) {
      this.fastingNotifyArafah.checked = notify.arafah !== false;
    }
    if (this.fastingNotifyRamadan) {
      this.fastingNotifyRamadan.checked = notify.ramadan !== false;
    }
  }

  toggleFastingNotificationOptions(show) {
    const offsetRow = document.getElementById("fastingNotificationOffset");
    const toggles = this.fastingNotificationToggles;
    if (offsetRow) {
      offsetRow.style.display = show ? "flex" : "none";
    }
    if (toggles) {
      toggles.style.display = show ? "" : "none";
    }
  }

  toggleWeatherManualLocation(show) {
    if (this.weatherManualLocationFields) {
      if (show) {
        this.weatherManualLocationFields.classList.add("active");
      } else {
        this.weatherManualLocationFields.classList.remove("active");
      }
    }
  }

  async searchWeatherCity() {
    const cityName = this.weatherCityInput?.value.trim();
    if (!cityName) {
      this.showToast("Please enter a city name", "error");
      return;
    }

    this._clearCitySearchResults(this.weatherCitySearchResults);

    if (this.weatherSearchCityBtn) {
      this.weatherSearchCityBtn.innerHTML =
        this._getIcon("🔍", { size: 16 }) + " Searching...";
      this.weatherSearchCityBtn.disabled = true;
    }

    try {
      const results = await this.prayerTimes.searchCity(cityName);

      if (results && results.length > 0) {
        this._renderCitySearchResults(
          this.weatherCitySearchResults,
          results,
          (result) => {
            if (this.weatherCityInput) {
              this.weatherCityInput.value = result.city;
              this.weatherCityInput.dispatchEvent(
                new Event("input", { bubbles: true }),
              );
              this.weatherCityInput.dispatchEvent(
                new Event("change", { bubbles: true }),
              );
            }

            this._applyLatLngToInputs(
              this.weatherLatitudeInput,
              this.weatherLongitudeInput,
              {
                latitude: Number(result.latitude).toFixed(4),
                longitude: Number(result.longitude).toFixed(4),
              },
            );

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

    if (this.weatherSearchCityBtn) {
      this.weatherSearchCityBtn.innerHTML =
        this._getIcon("🔍", { size: 16 }) + " Search City";
      this.weatherSearchCityBtn.disabled = false;
    }
  }

  _safeDecodeURIComponent(value) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  _normalizeLatLng(latStr, lngStr) {
    const latNum = Number(latStr);
    const lngNum = Number(lngStr);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;

    let latitudeStr = String(latStr).trim();
    let longitudeStr = String(lngStr).trim();
    let latitude = latNum;
    let longitude = lngNum;

    // Heuristic swap if user pasted lng,lat
    if (Math.abs(latitude) > 90 && Math.abs(longitude) <= 90) {
      [latitude, longitude] = [longitude, latitude];
      [latitudeStr, longitudeStr] = [longitudeStr, latitudeStr];
    }

    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
    return { latitude: latitudeStr, longitude: longitudeStr };
  }

  _parseLatLngFromText(text) {
    if (!text) return null;
    const raw = String(text).trim();
    if (!raw) return null;

    const candidates = [raw, this._safeDecodeURIComponent(raw)];

    for (const candidate of candidates) {
      // Google Maps URL often includes: @lat,lng,zoom
      const atMatch = candidate.match(
        /@\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/,
      );
      if (atMatch) {
        const normalized = this._normalizeLatLng(atMatch[1], atMatch[2]);
        if (normalized) return normalized;
      }

      // Google Maps data format sometimes includes: !3dLAT!4dLNG
      const dataMatch = candidate.match(
        /!3d\s*(-?\d+(?:\.\d+)?)\s*!4d\s*(-?\d+(?:\.\d+)?)/,
      );
      if (dataMatch) {
        const normalized = this._normalizeLatLng(dataMatch[1], dataMatch[2]);
        if (normalized) return normalized;
      }

      // Query params: q=lat,lng or ll=lat,lng or center=lat,lng
      const paramMatch = candidate.match(
        /[?&](?:q|query|ll|center)=\s*(-?\d+(?:\.\d+)?)(?:%2C|,|\s)+\s*(-?\d+(?:\.\d+)?)/i,
      );
      if (paramMatch) {
        const normalized = this._normalizeLatLng(paramMatch[1], paramMatch[2]);
        if (normalized) return normalized;
      }

      // Generic: first in-range "lat, lng" pair
      const pairRe = /(-?\d+(?:\.\d+)?)(?:\s*,\s*|\s+)(-?\d+(?:\.\d+)?)/g;
      let m;
      let best = null;
      let bestScore = -1;
      while ((m = pairRe.exec(candidate)) !== null) {
        const normalized = this._normalizeLatLng(m[1], m[2]);
        if (!normalized) continue;

        const a = String(m[1]);
        const b = String(m[2]);
        const hasDecA = a.includes(".");
        const hasDecB = b.includes(".");

        // Prefer pairs that look like real coordinates (usually decimal).
        // This helps avoid accidentally selecting integers like "15,17" from URLs.
        let score = 0;
        if (hasDecA) score += 2;
        if (hasDecB) score += 2;
        score += Math.min(6, a.replace(/[^0-9]/g, "").length);
        score += Math.min(6, b.replace(/[^0-9]/g, "").length);

        if (score > bestScore) {
          bestScore = score;
          best = normalized;
        }
      }
      if (best) return best;
    }

    return null;
  }

  async _readClipboardTextWithFallback() {
    try {
      if (navigator.clipboard?.readText) {
        return await navigator.clipboard.readText();
      }
    } catch {
      // ignore; fallback below
    }

    // Fallback for environments that block clipboard reads
    const manual = window.prompt(
      `Paste coordinates (e.g., ${this.storage.getCoordinateExample().text})`,
    );
    return manual || "";
  }

  applyCoordinateExamples() {
    const example = this.storage.getCoordinateExample();
    const text = example?.text || "";
    if (!text) return;

    [
      [this.latitudeInput, this.longitudeInput, this.pasteCoordsBtn],
      [
        this.weatherLatitudeInput,
        this.weatherLongitudeInput,
        this.weatherPasteCoordsBtn,
      ],
    ].forEach(([latInput, lngInput, pasteButton]) => {
      if (latInput) latInput.placeholder = String(example.latitude);
      if (lngInput) lngInput.placeholder = String(example.longitude);
      if (pasteButton) {
        const label = `Paste coordinates from clipboard (e.g., "${text}")`;
        pasteButton.title = label;
        pasteButton.setAttribute("aria-label", label);
      }
    });
  }

  _applyLatLngToInputs(latInput, lngInput, latLng) {
    if (!latInput || !lngInput) return;
    latInput.value = latLng.latitude;
    lngInput.value = latLng.longitude;

    // Trigger any listeners relying on change/input events
    latInput.dispatchEvent(new Event("input", { bubbles: true }));
    latInput.dispatchEvent(new Event("change", { bubbles: true }));
    lngInput.dispatchEvent(new Event("input", { bubbles: true }));
    lngInput.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async pasteLocationCoordinatesFromClipboard() {
    const text = await this._readClipboardTextWithFallback();
    const latLng = this._parseLatLngFromText(text);
    if (!latLng) {
      this.showToast(
        "Could not parse coordinates. Copy a Google Maps link or 'lat, lng' format.",
        "error",
      );
      return;
    }

    this._applyLatLngToInputs(this.latitudeInput, this.longitudeInput, latLng);
    this.showToast("Coordinates pasted into Location settings.", "success");
  }

  async pasteWeatherCoordinatesFromClipboard() {
    const text = await this._readClipboardTextWithFallback();
    const latLng = this._parseLatLngFromText(text);
    if (!latLng) {
      this.showToast(
        "Could not parse coordinates. Copy a Google Maps link or 'lat, lng' format.",
        "error",
      );
      return;
    }

    this._applyLatLngToInputs(
      this.weatherLatitudeInput,
      this.weatherLongitudeInput,
      latLng,
    );
    this.showToast("Coordinates pasted into Weather settings.", "success");
  }
});

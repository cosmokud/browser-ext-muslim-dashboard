/**
 * MuslimDashboard: prayer settings synced from other surfaces.
 * Part of the class declared in js/app/index.js; load this after it.
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
})(MuslimDashboard.prototype, class {

  setupLocationUpdates() {
    // Update qibla when prayer times location changes
    const originalUpdate = this.prayerTimes.updatePrayerTimes.bind(
      this.prayerTimes,
    );
    this.prayerTimes.updatePrayerTimes = () => {
      originalUpdate();
      const location = this.prayerTimes.getCurrentLocation();
      if (location) {
        this.qibla.updateLocation(location.latitude, location.longitude);
        if (this.lunarPhase) {
          this.lunarPhase.refresh();
        }
      }
    };
  }

  normalizePrayerSyncSettingsPayload(rawValue) {
    if (!rawValue) return null;

    if (typeof rawValue === "string") {
      try {
        const parsed = JSON.parse(rawValue);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? parsed
          : null;
      } catch (e) {
        return null;
      }
    }

    if (typeof rawValue === "object" && !Array.isArray(rawValue)) {
      return rawValue;
    }

    return null;
  }

  getPrayerSyncDelta(previousSettings, nextSettings) {
    const previous =
      previousSettings &&
      typeof previousSettings === "object" &&
      !Array.isArray(previousSettings)
        ? previousSettings
        : {};
    const next =
      nextSettings &&
      typeof nextSettings === "object" &&
      !Array.isArray(nextSettings)
        ? nextSettings
        : {};

    const prayerRefreshKeys = [
      "calculationMethod",
      "asrMethod",
      "highLatMethod",
      "midnightMethod",
      "duhaOffset",
      "customFajrAngle",
      "customIshaAngle",
      "customIshaMinutes",
      "timeFormat",
      "adjustments",
      "prayerVisibility",
      "prayerNotifications",
    ];
    const locationKeys = ["locationMethod", "latitude", "longitude", "city"];

    const didKeyChange = (key) =>
      JSON.stringify(previous[key]) !== JSON.stringify(next[key]);

    const prayerChanged = prayerRefreshKeys.some((key) => didKeyChange(key));
    const locationChanged = locationKeys.some((key) => didKeyChange(key));

    return {
      shouldRefresh: prayerChanged || locationChanged,
      locationChanged,
    };
  }

  scheduleExternalPrayerRefresh(options = {}) {
    const locationChanged = options.locationChanged === true;
    this._externalPrayerSyncPendingLocationChange =
      this._externalPrayerSyncPendingLocationChange || locationChanged;

    if (this._externalPrayerSyncTimer) {
      clearTimeout(this._externalPrayerSyncTimer);
    }

    this._externalPrayerSyncTimer = setTimeout(() => {
      const shouldUseLocationRefresh =
        this._externalPrayerSyncPendingLocationChange === true;
      this._externalPrayerSyncPendingLocationChange = false;
      this._externalPrayerSyncTimer = null;

      this.refreshPrayerTimesFromExternalSettings({
        locationChanged: shouldUseLocationRefresh,
      });
    }, 80);
  }

  refreshPrayerTimesFromExternalSettings(options = {}) {
    const locationChanged = options.locationChanged === true;

    if (
      !this.prayerTimes ||
      typeof this.prayerTimes.updateSettings !== "function"
    ) {
      return;
    }

    const settings = this.storage.getSettings();
    this.prayerTimes.updateSettings(settings);

    const hasManualCoordinates =
      Number.isFinite(settings.latitude) && Number.isFinite(settings.longitude);

    if (settings.locationMethod === "manual" && hasManualCoordinates) {
      this.prayerTimes.setManualLocation(
        settings.latitude,
        settings.longitude,
        settings.city || "Custom Location",
      );

      if (this.qibla && typeof this.qibla.updateLocation === "function") {
        this.qibla.updateLocation(settings.latitude, settings.longitude);
      }
    } else {
      const lastLocation =
        typeof this.storage.getLastLocation === "function"
          ? this.storage.getLastLocation()
          : null;
      const hasSavedLocation =
        lastLocation &&
        Number.isFinite(Number(lastLocation.latitude)) &&
        Number.isFinite(Number(lastLocation.longitude));

      if (hasSavedLocation) {
        this.prayerTimes.location = {
          latitude: Number(lastLocation.latitude),
          longitude: Number(lastLocation.longitude),
          city: lastLocation.city || "Current Location",
        };
        this.prayerTimes.updatePrayerTimes();
      } else if (
        locationChanged &&
        typeof this.prayerTimes.getLocation === "function" &&
        !this._externalPrayerSyncGettingLocation
      ) {
        this._externalPrayerSyncGettingLocation = true;

        Promise.resolve(this.prayerTimes.getLocation())
          .catch((error) => {
            console.warn("External prayer location refresh failed:", error);
          })
          .finally(() => {
            this._externalPrayerSyncGettingLocation = false;
          });
      }
    }

    this.updateHeaderNextPrayer();
  }

  setupExternalPrayerSettingsSync() {
    const settingsStorageKey = `${this.storage.prefix}settings`;
    const locationStorageKey = `${this.storage.prefix}lastLocation`;

    if (!this._boundExternalPrayerStorageHandler) {
      this._boundExternalPrayerStorageHandler = (event) => {
        const changedKey = event?.key;

        if (changedKey === locationStorageKey) {
          this.scheduleExternalPrayerRefresh({ locationChanged: true });
          return;
        }

        if (changedKey !== settingsStorageKey) {
          return;
        }

        const previousSettings = this.normalizePrayerSyncSettingsPayload(
          event?.oldValue,
        );
        const nextSettings = this.normalizePrayerSyncSettingsPayload(
          event?.newValue,
        );

        if (!previousSettings || !nextSettings) {
          this.scheduleExternalPrayerRefresh({ locationChanged: true });
          return;
        }

        const delta = this.getPrayerSyncDelta(previousSettings, nextSettings);
        if (!delta.shouldRefresh) return;

        this.scheduleExternalPrayerRefresh({
          locationChanged: delta.locationChanged,
        });
      };

      window.addEventListener(
        "storage",
        this._boundExternalPrayerStorageHandler,
      );
    }

    if (
      !this._boundExternalPrayerChromeStorageHandler &&
      typeof chrome !== "undefined" &&
      chrome.storage?.onChanged?.addListener
    ) {
      this._boundExternalPrayerChromeStorageHandler = (changes, areaName) => {
        if (areaName !== "local" || !changes) return;

        if (changes.md_lastLocation) {
          this.scheduleExternalPrayerRefresh({ locationChanged: true });
        }

        if (!changes.md_settings) {
          return;
        }

        const previousSettings = this.normalizePrayerSyncSettingsPayload(
          changes.md_settings.oldValue,
        );
        const nextSettings = this.normalizePrayerSyncSettingsPayload(
          changes.md_settings.newValue,
        );

        if (!previousSettings || !nextSettings) {
          this.scheduleExternalPrayerRefresh({ locationChanged: true });
          return;
        }

        const delta = this.getPrayerSyncDelta(previousSettings, nextSettings);
        if (!delta.shouldRefresh) return;

        this.scheduleExternalPrayerRefresh({
          locationChanged: delta.locationChanged,
        });
      };

      chrome.storage.onChanged.addListener(
        this._boundExternalPrayerChromeStorageHandler,
      );
    }

    if (!this._boundExternalPrayerCleanupHandler) {
      this._boundExternalPrayerCleanupHandler = () => {
        this.cleanupExternalPrayerSettingsSync();
      };

      window.addEventListener(
        "beforeunload",
        this._boundExternalPrayerCleanupHandler,
      );
    }
  }

  cleanupExternalPrayerSettingsSync() {
    if (this._externalPrayerSyncTimer) {
      clearTimeout(this._externalPrayerSyncTimer);
      this._externalPrayerSyncTimer = null;
    }
    this._externalPrayerSyncPendingLocationChange = false;
    this._externalPrayerSyncGettingLocation = false;

    if (this._boundExternalPrayerStorageHandler) {
      window.removeEventListener(
        "storage",
        this._boundExternalPrayerStorageHandler,
      );
      this._boundExternalPrayerStorageHandler = null;
    }

    if (
      this._boundExternalPrayerChromeStorageHandler &&
      typeof chrome !== "undefined" &&
      chrome.storage?.onChanged?.removeListener
    ) {
      chrome.storage.onChanged.removeListener(
        this._boundExternalPrayerChromeStorageHandler,
      );
      this._boundExternalPrayerChromeStorageHandler = null;
    }

    if (this._boundExternalPrayerCleanupHandler) {
      window.removeEventListener(
        "beforeunload",
        this._boundExternalPrayerCleanupHandler,
      );
      this._boundExternalPrayerCleanupHandler = null;
    }
  }
});

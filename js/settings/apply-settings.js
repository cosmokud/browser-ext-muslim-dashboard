/**
 * SettingsManager: applying settings and live updates.
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

  applySettings(settings) {
        // A calendar change re-dates every Hijri surface.
        HijriCalendars.setMode(settings?.fasting?.hijriCalendar);
        if (window.dashboard && typeof window.dashboard.updateDate === "function") {
          window.dashboard.updateDate();
        }

        // Update prayer times
        if (this.prayerTimes) {
        this.prayerTimes.updateSettings(settings);
        }
        
        // Update location if manual
        const hasManualCoordinates =
        Number.isFinite(settings.latitude) && Number.isFinite(settings.longitude);
        
        if (settings.locationMethod === "manual" && hasManualCoordinates) {
        if (this.prayerTimes) {
        this.prayerTimes.setManualLocation(
        settings.latitude,
        settings.longitude,
        settings.city,
      );
      }
      if (this.qibla) {
        this.qibla.updateLocation(settings.latitude, settings.longitude);
      }
    } else if (this.prayerTimes) {
      this.prayerTimes.getLocation();
    }

    // Update background rotation
    if (this.backgrounds) {
      const interval =
        settings.bgInterval === "custom"
          ? settings.bgIntervalCustom
          : settings.bgInterval;
      this.backgrounds.updateInterval(interval);
      if (typeof this.backgrounds.updateDisplayMode === "function") {
        this.backgrounds.updateDisplayMode(settings.bgDisplayMode || "fill");
      }
      if (typeof this.backgrounds.updateDim === "function") {
        this.backgrounds.updateDim(settings.bgDim);
      }
      if (typeof this.backgrounds.updateBlur === "function") {
        this.backgrounds.updateBlur(settings.bgBlur);
      }
      if (typeof this.backgrounds.updateShuffleMode === "function") {
        this.backgrounds.updateShuffleMode(settings.bgShuffle !== false);
      }
    }

    // Apply container width
    this.applyContainerWidth(
      settings.containerWidth,
      settings.containerWidthCustom,
    );

    const dashboardQualityState = this.resolveDashboardQualityState(
      settings.performanceModeEnabled === true,
      settings?.theme?.highestVisualFidelityEnabled === true,
      "performance",
    );
    this.applyHighestVisualFidelity(
      dashboardQualityState.highestVisualFidelityEnabled,
    );

    // Apply UI blur power
    this.applyUiBlurPower(settings.uiBlurPower ?? 100);

    // Apply performance mode last so its CSS hard-overrides remain authoritative.
    this.applyPerformanceMode(dashboardQualityState.performanceModeEnabled);

    // Update weather unit
    if (this.weather) {
      this.weather.fetchWeather();
    }

    // Apply all live updates without page reload
    this.applyLiveUpdates(settings);
  }

  runDeferredUiTask(task) {
    if (typeof task !== "function") return;

    if (
      typeof window !== "undefined" &&
      typeof window.requestIdleCallback === "function"
    ) {
      window.requestIdleCallback(
        () => {
          try {
            task();
          } catch (e) {
            // ignore deferred UI task errors
          }
        },
        { timeout: 450 },
      );
      return;
    }

    setTimeout(() => {
      try {
        task();
      } catch (e) {
        // ignore deferred UI task errors
      }
    }, 0);
  }

  applyLiveUpdates(settings) {
    try {
      // Apply debug date simulation first so all date/time renders use it.
      if (
        window.dashboard &&
        typeof window.dashboard.applyDebugDateSimulationFromSettings ===
          "function"
      ) {
        window.dashboard.applyDebugDateSimulationFromSettings(settings);
      }

      // Update greeting
      if (
        window.dashboard &&
        typeof window.dashboard.updateGreeting === "function"
      ) {
        window.dashboard.updateGreeting();
      }

      // Update date display
      if (
        window.dashboard &&
        typeof window.dashboard.updateDate === "function"
      ) {
        window.dashboard.updateDate();
      }

      // Update time display
      if (
        window.dashboard &&
        typeof window.dashboard.updateTime === "function"
      ) {
        window.dashboard.updateTime();
      }

      // Apply heading settings (clock style, seconds visibility, etc.)
      if (
        window.dashboard &&
        typeof window.dashboard.applyHeadingSettings === "function"
      ) {
        window.dashboard.applyHeadingSettings();
      }

      // Apply pinned apps settings
      if (
        window.dashboard &&
        typeof window.dashboard.applyPinnedAppsSettings === "function"
      ) {
        window.dashboard.applyPinnedAppsSettings();
      }

      // Recalculate grid layout
      if (window.dashboard && window.dashboard.gridLayout) {
        window.dashboard.gridLayout.recalculateLayout();
      }

      this.runDeferredUiTask(() => {
        if (window.dashboard && window.dashboard.quotes) {
          window.dashboard.quotes.refreshQuote();
        }
      });

      this.runDeferredUiTask(() => {
        if (window.dashboard && window.dashboard.lunarPhase) {
          window.dashboard.lunarPhase.refresh();
        }
      });

      this.runDeferredUiTask(() => {
        if (window.dashboard && window.dashboard.fasting) {
          window.dashboard.fasting.render();
        }
      });

      this.runDeferredUiTask(() => {
        if (window.dashboard && window.dashboard.calendar) {
          window.dashboard.calendar.render();
        }
      });

      this.runDeferredUiTask(() => {
        if (!window.dashboard || !window.dashboard.pocketQuran) {
          return;
        }

        const pqSettings = settings.pocketQuran || {};
        if (pqSettings.translationResourceId) {
          window.dashboard.pocketQuran.reloadTranslation(
            pqSettings.translationResourceId,
          );
        }
        if (
          pqSettings.arabicFontFamily &&
          typeof window.dashboard.pocketQuran.applyArabicFontFamily ===
            "function"
        ) {
          window.dashboard.pocketQuran.applyArabicFontFamily(
            pqSettings.arabicFontFamily,
            { persist: false, recalculate: true },
          );
        }
        if (
          pqSettings.translationFontFamily &&
          typeof window.dashboard.pocketQuran.applyTranslationFontFamily ===
            "function"
        ) {
          window.dashboard.pocketQuran.applyTranslationFontFamily(
            pqSettings.translationFontFamily,
            { persist: false, recalculate: true },
          );
        }
        if (pqSettings.arabicFontSize || pqSettings.translationFontSize) {
          window.dashboard.pocketQuran.applyFontSizes(
            pqSettings.arabicFontSize ?? 32,
            pqSettings.translationFontSize ?? 18,
            { syncInputs: true, persist: false },
          );
        }
      });

      // Notify that settings have been applied (for any listeners)
      try {
        document.dispatchEvent(
          new CustomEvent("md:settings-applied", {
            detail: { settings },
          }),
        );
      } catch (e) {}
    } catch (e) {
      console.warn("Some live updates failed:", e);
    }
  }
});

/**
 * SettingsManager, part 6 of 9.
 * Moved out of js/settings.js at method boundaries, so no single file carries the
 * whole class. The class itself is declared in js/settings.js; load this after it.
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

  saveSettings(options = {}) {
    const {
      source = "manual",
      showToast = source === "manual",
      closeModal = source === "manual",
      showValidationErrors = source === "manual",
    } = options;

    // Ensure floating mode geometry/state is persisted before we snapshot settings
    try {
      if (window.dashboard && window.dashboard.floating) {
        window.dashboard.floating.flushAll();
      }
    } catch (e) {
      // ignore
    }

    const settings = this.storage.getSettings();
    const previousSettings = this.cloneSettingsSnapshot(settings);

    // Location settings
    const locationRadio = document.querySelector(
      'input[name="locationMethod"]:checked',
    );
    if (locationRadio) settings.locationMethod = locationRadio.value;
    settings.city = this.cityInput?.value || "";
    const parsedLatitude = parseFloat(this.latitudeInput?.value);
    const parsedLongitude = parseFloat(this.longitudeInput?.value);
    settings.latitude = Number.isFinite(parsedLatitude) ? parsedLatitude : null;
    settings.longitude = Number.isFinite(parsedLongitude)
      ? parsedLongitude
      : null;

    // Prayer settings
    settings.calculationMethod = this.calculationMethod?.value || "MWL";
    settings.asrMethod = this.asrMethod?.value || "Standard";
    settings.highLatMethod = this.highLatMethod?.value || "NightMiddle";
    settings.midnightMethod = this.midnightMethod?.value || "Standard";
    settings.duhaOffset = parseInt(this.duhaOffset?.value) || 20;

    // Custom angles
    settings.customFajrAngle = parseFloat(this.customFajrAngle?.value) || 18;
    settings.customIshaAngle = parseFloat(this.customIshaAngle?.value) || 17;
    settings.customIshaMinutes = this.customIshaMinutes?.checked || false;

    // Prayer visibility
    settings.prayerVisibility = {};
    for (const prayer in this.visibilityCheckboxes) {
      settings.prayerVisibility[prayer] =
        this.visibilityCheckboxes[prayer]?.checked || false;
    }

    // Adjustments
    settings.adjustments = {};
    for (const prayer in this.adjustmentInputs) {
      settings.adjustments[prayer] =
        parseInt(this.adjustmentInputs[prayer]?.value) || 0;
    }

    // Prayer notifications
    settings.prayerNotifications = settings.prayerNotifications || {};

    const existingBeforeMinutes = SettingsRegistry.coerce(
      "prayerNotifications.beforeMinutes",
      settings.prayerNotifications.beforeMinutes,
    );
    const existingAfterMinutes = SettingsRegistry.coerce(
      "prayerNotifications.afterMinutes",
      settings.prayerNotifications.afterMinutes,
    );

    settings.prayerNotifications.enabled =
      this.enablePrayerNotifications?.checked || false;

    // Keep global defaults for backward compatibility / future fallbacks.
    settings.prayerNotifications.beforeMinutes = existingBeforeMinutes;
    settings.prayerNotifications.afterMinutes = existingAfterMinutes;

    settings.prayerNotifications.perPrayer = {};
    for (const prayer in this.notificationCheckboxes) {
      const enabled = this.notificationCheckboxes[prayer]?.checked || false;

      const beforeMinutes = SettingsRegistry.coerce(
        "prayerNotifications.beforeMinutes",
        parseInt(this.notificationBeforeMinutesInputs?.[prayer]?.value, 10),
        existingBeforeMinutes,
      );
      const afterMinutes = SettingsRegistry.coerce(
        "prayerNotifications.afterMinutes",
        parseInt(this.notificationAfterMinutesInputs?.[prayer]?.value, 10),
        existingAfterMinutes,
      );

      settings.prayerNotifications.perPrayer[prayer] = {
        enabled,
        beforeMinutes,
        afterMinutes,
        atTimeEnabled:
          this.notificationAtTimeCheckboxes?.[prayer]?.checked ?? true,
      };
    }

    // Quote settings
    settings.useDefaultQuotes = this.useDefaultQuotes?.checked ?? true;
    settings.useUserQuotes = this.useUserQuotes?.checked ?? true;

    // Quote layout style
    const selectedStyle = this.quoteLayoutStyleSelect?.value;
    settings.quoteLayoutStyle = selectedStyle || "classic";

    // Compact weather settings
    settings.compactWeatherEnabled =
      this.compactWeatherEnabled?.checked ?? false;
    const compactWeatherModeRadio = document.querySelector(
      'input[name="compactWeatherMode"]:checked',
    );
    settings.compactWeatherMode = compactWeatherModeRadio?.value || "simple";
    settings.compactWeatherShowLocationName =
      this.compactWeatherShowLocationName?.checked ?? false;

    // Background settings
    const bgIntervalValue = this.bgInterval?.value;
    if (bgIntervalValue === "custom") {
      settings.bgInterval = "custom";
      settings.bgIntervalCustom = parseInt(this.bgIntervalCustom?.value) || 60;
    } else {
      settings.bgInterval = parseInt(bgIntervalValue) || 60;
      settings.bgIntervalCustom = null;
    }
    settings.bgCategory = this.normalizeBackgroundCategory(
      this.bgCategory?.value || "all",
    );
    settings.bgDisplayMode = this.normalizeBackgroundDisplayMode(
      this.bgDisplayMode?.value || settings.bgDisplayMode || "fill",
    );
    settings.bgDim = this.normalizeBackgroundDim(
      this.bgDim?.value ?? settings.bgDim,
      100,
    );
    settings.bgBlur = this.normalizeBackgroundBlur(
      this.bgBlur?.value ?? settings.bgBlur,
      0,
    );
    settings.bgShuffle = this.bgShuffle?.checked !== false;

    // Theme settings (container width, blur power, and theme selection are now in Themes panel)
    this.saveThemeSettings(settings);

    // Pinned Apps per-row
    settings.pinnedAppsPerRow = SettingsRegistry.coerce(
      "pinnedAppsPerRow",
      parseInt(this.pinnedAppsPerRow?.value, 10),
    );
    settings.pinnedAppsOpenInNewTab =
      this.pinnedAppsOpenInNewTab?.checked ?? true;

    // Search Bar settings
    settings.searchBarOpenInNewTab =
      this.searchBarOpenInNewTab?.checked ?? true;

    // Pocket Quran settings
    const existingPocketQuran =
      settings.pocketQuran && typeof settings.pocketQuran === "object"
        ? settings.pocketQuran
        : {};

    settings.pocketQuran = {
      ...existingPocketQuran,
      arabicFontSize: SettingsRegistry.coerce(
        "arabicFontSize",
        parseInt(this.pocketQuranArabicSize?.value, 10),
        existingPocketQuran.arabicFontSize,
        ),
        translationFontSize: SettingsRegistry.coerce(
        "translationFontSize",
        parseInt(this.pocketQuranTranslationSize?.value, 10),
        existingPocketQuran.translationFontSize,
        ),
        translationFontFamily: this.normalizePocketQuranTranslationFontFamily(
        this.pocketQuranTranslationFontFamily?.value ||
        existingPocketQuran.translationFontFamily ||
        "Poppins",
        ),
        translationResourceId: this.clampNumber(
        parseInt(this.pocketQuranTranslationSelect?.value, 10),
        1,
        10000,
        existingPocketQuran.translationResourceId ?? 85,
        ),
        reciterHighlighterDelayMs: SettingsRegistry.coerce(
        "quran.reciterHighlighterDelayMs",
        parseInt(this.pocketQuranHighlighterDelay?.value, 10),
        existingPocketQuran.reciterHighlighterDelayMs ?? 0,
        ),
        recitationFloatingEnabled: this.pocketQuranRecitationFloatingEnabled
        ? this.pocketQuranRecitationFloatingEnabled.checked
        : existingPocketQuran.recitationFloatingEnabled === true,
        recitationAutoDockOnVisible: this.pocketQuranRecitationAutoDockOnVisible
        ? this.pocketQuranRecitationAutoDockOnVisible.checked
        : existingPocketQuran.recitationAutoDockOnVisible === true,
        recitationFloatingAppearance:
        document.querySelector(
        'input[name="pocketQuranRecitationFloatingAppearance"]:checked',
        )?.value === "theme"
        ? "theme"
        : "opaque",
        copyIncludeArabic: this.pocketQuranCopyIncludeArabic
        ? this.pocketQuranCopyIncludeArabic.checked
        : existingPocketQuran.copyIncludeArabic === true,
        };
        
        const existingPocketQuranPopup =
        settings.pocketQuranPopup && typeof settings.pocketQuranPopup === "object"
        ? settings.pocketQuranPopup
        : {};
        
        settings.pocketQuranPopup = {
        ...existingPocketQuranPopup,
        arabicFontSize: SettingsRegistry.coerce(
        "arabicFontSize",
        parseInt(this.pocketQuranPopupArabicSize?.value, 10),
        existingPocketQuranPopup.arabicFontSize ??
        existingPocketQuran.arabicFontSize,
        ),
        translationFontSize: SettingsRegistry.coerce(
        "translationFontSize",
        parseInt(this.pocketQuranPopupTranslationSize?.value, 10),
        existingPocketQuranPopup.translationFontSize ??
        existingPocketQuran.translationFontSize,
        ),
        arabicFontFamily: this.normalizePocketQuranArabicFontFamily(
        this.pocketQuranPopupArabicFontFamily?.value ||
        existingPocketQuranPopup.arabicFontFamily ||
        existingPocketQuran.arabicFontFamily ||
        "KFGQPC Uthman Taha Naskh",
        ),
        translationFontFamily:
        this.normalizePocketQuranPopupTranslationFontFamily(
        this.pocketQuranPopupTranslationFontFamily?.value ||
        existingPocketQuranPopup.translationFontFamily ||
        "Poppins",
        ),
        };
        
        settings.notesCardFontFamily = this.normalizeNotesCardFontFamily(
        this.notesCardFontFamily?.value || settings.notesCardFontFamily,
      );
    this.applyNotesCardFontFamily(settings.notesCardFontFamily);

    // Save heading settings
    this.saveHeadingSettings(settings);

    // Save component visibility settings
    this.saveVisibilitySettings(settings);

    // Save weather settings
    this.saveWeatherSettings(settings);

    // Save fasting settings
    this.saveFastingSettings(settings);

    // Save debug settings
    if (!this.saveDebugSettings(settings, { showValidationErrors })) {
      return false;
    }

    // Save to storage
    this.storage.saveSettings(settings);

    const isDelayOnlyPocketQuranSave =
      this.isOnlyPocketQuranHighlighterDelayChanged(
        previousSettings,
        settings,
      );

    // Apply immediate preview (if dashboard exists)
    if (
      !isDelayOnlyPocketQuranSave &&
      window.dashboard &&
      typeof window.dashboard.applyComponentVisibility === "function"
    ) {
      try {
        window.dashboard.applyComponentVisibility();
      } catch (e) {
        // ignore
      }
    }

    // Apply changes live
    if (!isDelayOnlyPocketQuranSave) {
      this.applySettings(settings);
    } else {
      this.dispatchSettingsApplied(settings);
    }

    if (source === "manual" && this._backgroundSettingsDirty) {
      this.refreshBackgroundAfterSettingsSave(settings);
      this._backgroundSettingsDirty = false;
    }

    if (showToast) {
      this.showToast("Settings saved successfully!", "success");
    }

    if (closeModal) {
      this.showSaveButtonSavedState();
      if (this._saveSettingsCloseTimer) {
        clearTimeout(this._saveSettingsCloseTimer);
      }
      this._saveSettingsCloseTimer = setTimeout(() => this.closeModal(), 420);
    }

    return true;
  }

  refreshBackgroundAfterSettingsSave(settings) {
    if (!this.backgrounds) return;

    const selectedCategory = this.normalizeBackgroundCategory(
      settings?.bgCategory || this.bgCategory?.value || "all",
    );

    try {
      const persisted = this.storage.getSettings();
      if (persisted.bgCategory !== selectedCategory) {
        persisted.bgCategory = selectedCategory;
        this.storage.saveSettings(persisted);
      }

      if (typeof this.backgrounds.updateCategory === "function") {
        this.backgrounds.updateCategory(selectedCategory);
      } else if (typeof this.backgrounds.changeBackground === "function") {
        this.backgrounds.changeBackground();
      }
    } catch (e) {
      // ignore non-critical background refresh failures
    }
  }

  cloneSettingsSnapshot(settings) {
    try {
      return JSON.parse(JSON.stringify(settings || {}));
    } catch (e) {
      return null;
    }
  }

  normalizePocketQuranHighlighterDelayMs(value) {
    return SettingsRegistry.coerce("quran.reciterHighlighterDelayMs", parseInt(value, 10));
  }

  isOnlyPocketQuranHighlighterDelayChanged(previousSettings, nextSettings) {
    if (!previousSettings || !nextSettings) return false;

    const previousDelay = this.normalizePocketQuranHighlighterDelayMs(
      previousSettings.pocketQuran?.reciterHighlighterDelayMs,
    );
    const nextDelay = this.normalizePocketQuranHighlighterDelayMs(
      nextSettings.pocketQuran?.reciterHighlighterDelayMs,
    );
    if (previousDelay === nextDelay) return false;

    const previousComparable = this.cloneSettingsSnapshot(previousSettings);
    const nextComparable = this.cloneSettingsSnapshot(nextSettings);
    if (!previousComparable || !nextComparable) return false;

    previousComparable.pocketQuran = {
      ...(previousComparable.pocketQuran || {}),
    };
    nextComparable.pocketQuran = {
      ...(nextComparable.pocketQuran || {}),
    };
    delete previousComparable.pocketQuran.reciterHighlighterDelayMs;
    delete nextComparable.pocketQuran.reciterHighlighterDelayMs;

    return JSON.stringify(previousComparable) === JSON.stringify(nextComparable);
  }

  dispatchSettingsApplied(settings) {
    try {
      document.dispatchEvent(
        new CustomEvent("md:settings-applied", {
          detail: { settings },
        }),
      );
    } catch (e) {}
  }

  saveHeadingSettings(settings) {
    const greetingTypeRadio = document.querySelector(
      'input[name="greetingType"]:checked',
    );
    const useCustomGreeting = greetingTypeRadio?.value === "custom";

    settings.heading = settings.heading || {};
    settings.heading.useCustomGreeting = useCustomGreeting;
    settings.heading.customGreeting = this.customGreetingInput?.value || "";
    settings.heading.showGreeting = this.showGreeting?.checked ?? true;

    // Time-based greetings
    settings.heading.greetingTimeRanges = {
      morning: {
        start: 3,
        end: 12,
        text: this.greetingMorning?.value || "As-salamu alaykum, Good Morning",
      },
      afternoon: {
        start: 12,
        end: 15,
        text:
          this.greetingAfternoon?.value || "As-salamu alaykum, Good Afternoon",
      },
      evening: {
        start: 15,
        end: 18,
        text: this.greetingEvening?.value || "As-salamu alaykum, Good Evening",
      },
      night: {
        start: 18,
        end: 3,
        text: this.greetingNight?.value || "As-salamu alaykum, Good Night",
      },
    };

    // Clock settings
    settings.heading.showClock = this.showClock?.checked ?? true;
    const clockFormatRadio = document.querySelector(
      'input[name="clockFormat"]:checked',
    );
    settings.heading.clockFormat = clockFormatRadio?.value || "24h";
    settings.heading.showSeconds = this.showSeconds?.checked ?? true;
    settings.heading.showAmPm = this.showAmPm?.checked ?? true;
    settings.heading.showNextPrayer = this.showNextPrayer?.checked === true;
    const clockStyleRadio = document.querySelector(
      'input[name="clockStyle"]:checked',
    );
    const selectedClockStyle = clockStyleRadio?.value || "default";
    const clockSurfaceLocked =
      this.isClockSurfaceLockedByStyle(selectedClockStyle);

    settings.heading.clockStyle = selectedClockStyle;

    // Date settings
    settings.heading.showDate = this.showDate?.checked ?? true;
    settings.heading.showIslamicEvents =
      this.showIslamicEvents?.checked ?? true;
    settings.heading.dateFormat =
      this.dateFormatSelect?.value || "full-weekday";
    const dateCalendarRadio = document.querySelector(
      'input[name="dateCalendar"]:checked',
    );
    settings.heading.dateCalendar = dateCalendarRadio?.value || "hijri";

    settings.heading.wholeComponentSurfaceEnabled =
      this.headerWholeComponentSurfaceEnabled?.checked === true;
    settings.heading.greetingBackgroundEnabled =
      this.headerGreetingBgEnabled?.checked === true;
    settings.heading.dateBackgroundEnabled =
      this.headerDateBgEnabled?.checked === true;
    settings.heading.timeBackgroundEnabled = clockSurfaceLocked
      ? false
      : this.headerTimeBgEnabled?.checked === true;
    settings.heading.nextPrayerBackgroundEnabled =
      this.headerNextPrayerBgEnabled?.checked === true;
    settings.heading.compactWeatherBackgroundEnabled =
      this.headerCompactWeatherBgEnabled?.checked === true;

    settings.heading.greetingTextColor = this.getHeaderColorControlSaveValue(
      this.headerGreetingTextColor,
    );
    settings.heading.dateTextColor = this.getHeaderColorControlSaveValue(
      this.headerDateTextColor,
    );
    settings.heading.timeTextColor = this.getHeaderColorControlSaveValue(
      this.headerTimeTextColor,
    );
    settings.heading.nextPrayerTextColor = this.getHeaderColorControlSaveValue(
      this.headerNextPrayerTextColor,
    );
    settings.heading.compactWeatherTextColor =
      this.getHeaderColorControlSaveValue(this.headerCompactWeatherTextColor);

    settings.heading.greetingGlowEnabled =
      this.headerGreetingGlowEnabled?.checked === true;
    settings.heading.greetingGlowColor = settings.heading.greetingGlowEnabled
      ? this.getHeaderColorControlSaveValue(this.headerGreetingGlowColor)
      : "";
    settings.heading.greetingGlowOpacity = this.clampHeaderGlowOpacity(
      this.headerGreetingGlowOpacity?.value,
      72,
    );
    settings.heading.greetingGlowRadius = this.clampHeaderGlowRadius(
      this.headerGreetingGlowRadius?.value,
      14,
    );

    settings.heading.dateGlowEnabled =
      this.headerDateGlowEnabled?.checked === true;
    settings.heading.dateGlowColor = settings.heading.dateGlowEnabled
      ? this.getHeaderColorControlSaveValue(this.headerDateGlowColor)
      : "";
    settings.heading.dateGlowOpacity = this.clampHeaderGlowOpacity(
      this.headerDateGlowOpacity?.value,
      72,
    );
    settings.heading.dateGlowRadius = this.clampHeaderGlowRadius(
      this.headerDateGlowRadius?.value,
      14,
    );

    settings.heading.timeGlowEnabled =
      this.headerTimeGlowEnabled?.checked === true;
    settings.heading.timeGlowColor = settings.heading.timeGlowEnabled
      ? this.getHeaderColorControlSaveValue(this.headerTimeGlowColor)
      : "";
    settings.heading.timeGlowOpacity = this.clampHeaderGlowOpacity(
      this.headerTimeGlowOpacity?.value,
      72,
    );
    settings.heading.timeGlowRadius = this.clampHeaderGlowRadius(
      this.headerTimeGlowRadius?.value,
      14,
    );

    settings.heading.nextPrayerGlowEnabled =
      this.headerNextPrayerGlowEnabled?.checked === true;
    settings.heading.nextPrayerGlowColor = settings.heading
      .nextPrayerGlowEnabled
      ? this.getHeaderColorControlSaveValue(this.headerNextPrayerGlowColor)
      : "";
    settings.heading.nextPrayerGlowOpacity = this.clampHeaderGlowOpacity(
      this.headerNextPrayerGlowOpacity?.value,
      72,
    );
    settings.heading.nextPrayerGlowRadius = this.clampHeaderGlowRadius(
      this.headerNextPrayerGlowRadius?.value,
      14,
    );

    settings.heading.compactWeatherGlowEnabled =
      this.headerCompactWeatherGlowEnabled?.checked === true;
    settings.heading.compactWeatherGlowColor = settings.heading
      .compactWeatherGlowEnabled
      ? this.getHeaderColorControlSaveValue(
          this.headerCompactWeatherGlowColor,
        )
      : "";
    settings.heading.compactWeatherGlowOpacity = this.clampHeaderGlowOpacity(
      this.headerCompactWeatherGlowOpacity?.value,
      72,
    );
    settings.heading.compactWeatherGlowRadius = this.clampHeaderGlowRadius(
      this.headerCompactWeatherGlowRadius?.value,
      14,
    );
  }

  saveVisibilitySettings(settings) {
    settings.componentVisibility = {
      header: this.visibilityHeader?.checked ?? true,
      quickPins: this.visibilityQuickPins?.checked ?? true,
      searchBar: this.visibilitySearchBar?.checked ?? true,
      quotes: this.visibilityQuotes?.checked ?? true,
      prayerTimes: this.visibilityPrayerTimes?.checked ?? true,
      hijriCalendar: this.visibilityHijriCalendar?.checked ?? true,
      qiblaDirection: this.visibilityQiblaDirection?.checked ?? true,
      weather: this.visibilityWeather?.checked ?? true,
      lunarPhase: this.visibilityLunarPhase?.checked ?? true,
      fasting: this.visibilityFasting?.checked ?? true,
      flashcards: this.visibilityFlashcards?.checked ?? true,
      adhkar: this.visibilityAdhkar?.checked ?? true,
      hadith: this.visibilityHadith?.checked ?? true,
      todoList: this.visibilityTodoList?.checked ?? true,
      notes: this.visibilityNotes?.checked ?? true,
      pocketQuran: this.visibilityPocketQuran?.checked ?? true,
    };
  }

  saveWeatherSettings(settings) {
    const weatherUnitRadio = document.querySelector(
      'input[name="weatherUnit"]:checked',
    );
    settings.weatherUnit = weatherUnitRadio?.value || "celsius";

    const weatherLocationModeRadio = document.querySelector(
      'input[name="weatherLocationMode"]:checked',
    );
    settings.weatherLocationMode =
      weatherLocationModeRadio?.value || "dashboard";
    settings.weatherCity = this.weatherCityInput?.value || "";
    settings.weatherLatitude = this.weatherLatitudeInput?.value
      ? parseFloat(this.weatherLatitudeInput.value)
      : null;
    settings.weatherLongitude = this.weatherLongitudeInput?.value
      ? parseFloat(this.weatherLongitudeInput.value)
      : null;
  }

  saveFastingSettings(settings) {
    settings.fasting = settings.fasting || {};

    // Visibility toggles
    settings.fasting.visibility = {
      monday: this.fastingShowMonday?.checked ?? true,
      thursday: this.fastingShowThursday?.checked ?? true,
      ayyamAlBeed: this.fastingShowAyyamAlBeed?.checked ?? true,
      ashuraDays: this.fastingShowAshuraDays?.checked ?? true,
      dhuAlHijjah: this.fastingShowDhuAlHijjah?.checked ?? true,
      arafah: this.fastingShowArafah?.checked ?? true,
      ramadan: this.fastingShowRamadan?.checked ?? true,
    };

    settings.fasting.showRecommendations =
      this.fastingShowRecommendations?.checked ?? true;

    settings.fasting.hijriCalendar = SettingsRegistry.coerce(
      "fasting.hijriCalendar",
      this.fastingHijriCalendar?.value,
    );

    // Within days settings
    settings.fasting.dhuAlHijjahWithinDays = SettingsRegistry.coerce(
      "fasting.dhuAlHijjahWithinDays",
      parseInt(this.fastingDhuAlHijjahWithinDays?.value, 10),
    );
    settings.fasting.arafahWithinDays = SettingsRegistry.coerce(
      "fasting.arafahWithinDays",
      parseInt(this.fastingArafahWithinDays?.value, 10),
    );
    settings.fasting.ashuraWithinDays = SettingsRegistry.coerce(
      "fasting.ashuraWithinDays",
      parseInt(this.fastingAshuraWithinDays?.value, 10),
    );

    // Notification settings
    settings.fasting.notifications = {
      enabled: this.fastingNotificationsEnabled?.checked ?? false,
      minutesBefore: SettingsRegistry.coerce(
        "fasting.notifications.minutesBefore",
        parseInt(this.fastingNotificationMinutesBefore?.value, 10),
        ),
        notify: {
        monday: this.fastingNotifyMonday?.checked ?? true,
        thursday: this.fastingNotifyThursday?.checked ?? true,
        ayyamAlBeed: this.fastingNotifyAyyamAlBeed?.checked ?? true,
        ashuraDays: this.fastingNotifyAshuraDays?.checked ?? true,
        dhuAlHijjah: this.fastingNotifyDhuAlHijjah?.checked ?? true,
        arafah: this.fastingNotifyArafah?.checked ?? true,
        ramadan: this.fastingNotifyRamadan?.checked ?? true,
        },
        };
        
        // Trigger reschedule of fasting notifications
        try {
        if (
        typeof chrome !== "undefined" &&
        chrome.runtime &&
        chrome.runtime.sendMessage
        ) {
        chrome.runtime.sendMessage({ type: "md_reschedule_fasting" });
        }
        } catch (e) {
        // ignore
        }
        }

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

  emitLayoutLiveResize(detail = {}) {
    try {
      document.dispatchEvent(
        new CustomEvent("md:layout-live-resize", {
          detail: {
            source: "settings",
            ...(detail || {}),
          },
        }),
      );
    } catch (e) {}

    try {
      const weather = window.dashboard?.weather;
      if (
        weather &&
        typeof weather.handleExternalLayoutLiveResize === "function"
      ) {
        weather.handleExternalLayoutLiveResize(detail || {});
      }
    } catch (e) {}
  }

  queueContainerResizeWindowSync() {
    if (this._containerResizeWindowSyncRaf) {
      cancelAnimationFrame(this._containerResizeWindowSyncRaf);
      this._containerResizeWindowSyncRaf = null;
    }

    this._containerResizeWindowSyncRaf = requestAnimationFrame(() => {
      this._containerResizeWindowSyncRaf = null;
      try {
        window.dispatchEvent(new Event("resize"));
      } catch (e) {}
    });
  }

  applyContainerWidth(width, customValue) {
    const mainContainer = document.querySelector(".main-container");

    if (!mainContainer) return;

    // Remove existing width classes
    mainContainer.classList.remove(
      "container-extra-compact",
      "container-compact",
      "container-slim",
      "container-narrow",
      "container-medium",
      "container-wide",
      "container-full",
      "container-custom",
    );
    mainContainer.style.removeProperty("--custom-container-width");

    // Apply new width
    switch (width) {
      case "extra-compact":
        mainContainer.classList.add("container-extra-compact");
        break;
      case "compact":
        mainContainer.classList.add("container-compact");
        break;
      case "slim":
        mainContainer.classList.add("container-slim");
        break;
      case "medium":
        mainContainer.classList.add("container-medium");
        break;
      case "wide":
        mainContainer.classList.add("container-wide");
        break;
      case "full":
        mainContainer.classList.add("container-full");
        break;
      case "custom":
        mainContainer.classList.add("container-custom");
        {
          const clamped = SettingsRegistry.coerce("containerWidthCustom", customValue);
          if (this.containerWidthCustom) {
            this.containerWidthCustom.value = String(clamped);
          }
          if (this.customWidthValue) {
            this.customWidthValue.textContent = clamped + "%";
          }
          mainContainer.style.setProperty(
            "--custom-container-width",
            clamped + "%",
          );
        }
        break;
      default: // narrow
        mainContainer.classList.add("container-narrow");
        break;
    }

    this.scheduleContainerWidthMediaEmulation(mainContainer);
    this.emitLayoutLiveResize({
      reason: "container-width-setting",
      widthMode: width || "narrow",
      customValue,
    });
    this.queueContainerResizeWindowSync();
  }

  scheduleContainerWidthMediaEmulation(mainContainer = null) {
    this.ensureContainerWidthMediaListeners();

    if (mainContainer) {
      this._containerWidthMediaRoot = mainContainer;
    }

    if (this._containerWidthMediaRaf) {
      cancelAnimationFrame(this._containerWidthMediaRaf);
    }

    this._containerWidthMediaRaf = requestAnimationFrame(() => {
      this._containerWidthMediaRaf = null;
      this.applyContainerWidthMediaEmulation();
    });
  }

  ensureContainerWidthMediaListeners() {
    if (this._containerWidthMediaListenersReady) {
      return;
    }

    this._containerWidthMediaListenersReady = true;
    this._onContainerWidthViewportResize = () =>
      this.scheduleContainerWidthMediaEmulation();

    window.addEventListener("resize", this._onContainerWidthViewportResize);
    window.addEventListener(
      "orientationchange",
      this._onContainerWidthViewportResize,
    );
  }

  applyContainerWidthMediaEmulation() {
    const mainContainer =
      this._containerWidthMediaRoot ||
      document.querySelector(".main-container");

    if (!mainContainer) {
      this.removeContainerWidthMediaEmulation();
      return;
    }

    let containerWidth = 0;
    try {
      containerWidth = Math.round(mainContainer.getBoundingClientRect().width);
    } catch (e) {
      containerWidth = 0;
    }

    if (!containerWidth && mainContainer.offsetWidth) {
      containerWidth = Math.round(mainContainer.offsetWidth);
    }

    const viewportWidth = Math.max(
      window.innerWidth || 0,
      document.documentElement?.clientWidth || 0,
      document.body?.clientWidth || 0,
    );

    // If viewport is already narrow enough, native media queries handle responsiveness.
    if (
      !containerWidth ||
      !viewportWidth ||
      containerWidth >= viewportWidth - 1
    ) {
      this.removeContainerWidthMediaEmulation();
      return;
    }

    const widthMediaRules = this.getContainerWidthMediaRules();
    if (!widthMediaRules.length) {
      this.removeContainerWidthMediaEmulation();
      return;
    }

    const matchedBlocks = [];
    widthMediaRules.forEach((entry) => {
      if (
        this.mediaQueryMatchesContainerWidth(entry.mediaText, containerWidth)
      ) {
        matchedBlocks.push(entry.cssText);
      }
    });

    if (!matchedBlocks.length) {
      this.removeContainerWidthMediaEmulation();
      return;
    }

    let styleEl = this._containerWidthMediaStyleEl;
    if (!styleEl || !styleEl.isConnected) {
      styleEl = document.getElementById("md-container-width-media-emulation");
    }

    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "md-container-width-media-emulation";
      document.head.appendChild(styleEl);
    }

    this._containerWidthMediaStyleEl = styleEl;

    const nextCss =
      "/* Generated: emulate width media queries from dashboard container width */\n" +
      matchedBlocks.join("\n");

    if (styleEl.textContent !== nextCss) {
      styleEl.textContent = nextCss;
    }
  }

  getContainerWidthMediaRules() {
    const sheetCount = document.styleSheets.length;
    if (
      Array.isArray(this._containerWidthMediaRuleCache) &&
      this._containerWidthMediaRuleCacheSheetCount === sheetCount
    ) {
      return this._containerWidthMediaRuleCache;
    }

    const collected = [];
    Array.from(document.styleSheets).forEach((sheet) => {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch (e) {
        // Cross-origin stylesheets are not readable; skip them.
        return;
      }

      if (!rules) {
        return;
      }

      this.collectContainerWidthMediaRules(rules, collected);
    });

    this._containerWidthMediaRuleCache = collected;
    this._containerWidthMediaRuleCacheSheetCount = sheetCount;

    return collected;
  }

  collectContainerWidthMediaRules(ruleList, sink) {
    Array.from(ruleList).forEach((rule) => {
      if (!rule) {
        return;
      }

      const mediaText = rule.media?.mediaText;
      if (
        typeof mediaText === "string" &&
        /(max|min)-width\s*:\s*\d+(?:\.\d+)?px/i.test(mediaText)
      ) {
        const cssText = Array.from(rule.cssRules || [])
          .map((childRule) => childRule.cssText)
          .join("\n")
          .trim();

        if (cssText) {
          sink.push({ mediaText, cssText });
        }
        return;
      }

      if (rule.cssRules && !rule.media) {
        this.collectContainerWidthMediaRules(rule.cssRules, sink);
      }
    });
  }

  mediaQueryMatchesContainerWidth(mediaText, widthPx) {
    if (!mediaText || !Number.isFinite(widthPx)) {
      return false;
    }

    const clauses = String(mediaText).split(",");
    for (const clauseText of clauses) {
      const clause = clauseText.trim();
      if (!clause) {
        continue;
      }

      const featureMatches = Array.from(
        clause.matchAll(/\(\s*([a-z-]+)\s*:\s*[^)]+\)/gi),
      );

      if (!featureMatches.length) {
        continue;
      }

      const hasUnsupportedFeature = featureMatches.some((featureMatch) => {
        const featureName = featureMatch[1].toLowerCase();
        return featureName !== "max-width" && featureName !== "min-width";
      });

      if (hasUnsupportedFeature) {
        continue;
      }

      const maxWidthMatches = Array.from(
        clause.matchAll(/\(\s*max-width\s*:\s*([0-9.]+)px\s*\)/gi),
      );
      const minWidthMatches = Array.from(
        clause.matchAll(/\(\s*min-width\s*:\s*([0-9.]+)px\s*\)/gi),
      );

      if (!maxWidthMatches.length && !minWidthMatches.length) {
        continue;
      }

      let isMatch = true;

      maxWidthMatches.forEach((match) => {
        const maxWidth = parseFloat(match[1]);
        if (Number.isFinite(maxWidth) && widthPx > maxWidth + 0.01) {
          isMatch = false;
        }
      });

      minWidthMatches.forEach((match) => {
        const minWidth = parseFloat(match[1]);
        if (Number.isFinite(minWidth) && widthPx + 0.01 < minWidth) {
          isMatch = false;
        }
      });

      if (isMatch) {
        return true;
      }
    }

    return false;
  }

  removeContainerWidthMediaEmulation() {
    const styleEl =
      this._containerWidthMediaStyleEl ||
      document.getElementById("md-container-width-media-emulation");

    if (styleEl) {
      styleEl.remove();
    }

    this._containerWidthMediaStyleEl = null;
  }

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

  getDetachedEditorConfigs() {
    return [
      {
        buttonId: "quotesDetachEditorBtn",
        groupId: "quotesEditorGroup",
        title: "Quotes Editor",
        onBeforeOpen: () => this.quotes?.renderQuotesList?.(),
        onAfterOpen: () => this.quotes?.renderQuotesList?.(),
        onAfterClose: () => this.quotes?.renderQuotesList?.(),
      },
      {
        buttonId: "flashcardsDetachEditorBtn",
        groupId: "flashcardsEditorGroup",
        title: "Flashcards Editor",
        onBeforeOpen: () => this.flashcards?.renderSettings?.(),
        onAfterOpen: () => this.flashcards?.renderSettings?.(),
        onAfterClose: () => this.flashcards?.renderSettings?.(),
      },
      {
        buttonId: "hadithDetachEditorBtn",
        groupId: "hadithEditorGroup",
        title: "Hadith Editor",
        onBeforeOpen: () => this.hadith?.renderSettings?.(),
        onAfterOpen: () => this.hadith?.renderSettings?.(),
        onAfterClose: () => this.hadith?.renderSettings?.(),
      },
      {
        buttonId: "adhkarDetachEditorBtn",
        groupId: "adhkarEditorGroup",
        title: "Adhkar Editor",
        onBeforeOpen: () => this.adhkar?.renderSettings?.(),
        onAfterOpen: () => this.adhkar?.renderSettings?.(),
        onAfterClose: () => this.adhkar?.renderSettings?.(),
      },
    ];
  }

  ensureDetachedEditorModal() {
    if (this.detachedEditorModal) return;

    let modal = document.getElementById("settingsEditorDetachModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "settingsEditorDetachModal";
      modal.className = "editor-detach-modal";
      modal.innerHTML = `
        <div class="editor-detach-modal-content">
          <div class="editor-detach-modal-header">
            <h3 class="editor-detach-modal-title" id="settingsEditorDetachTitle">Detached Editor</h3>
            <button type="button" class="editor-detach-modal-close" aria-label="Close detached editor">&times;</button>
          </div>
          <div class="editor-detach-modal-body" id="settingsEditorDetachBody"></div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    this.detachedEditorModal = modal;
    this.detachedEditorModalContent = modal.querySelector(
      ".editor-detach-modal-content",
    );
    this.detachedEditorModalBody = modal.querySelector(
      ".editor-detach-modal-body",
    );
    this.detachedEditorModalTitle = modal.querySelector(
      ".editor-detach-modal-title",
    );
    this.detachedEditorCloseBtn = modal.querySelector(
      ".editor-detach-modal-close",
    );

    if (this.detachedEditorCloseBtn?.dataset.bound !== "1") {
      this.detachedEditorCloseBtn.dataset.bound = "1";
      this.detachedEditorCloseBtn.addEventListener("click", () =>
        this.closeDetachedEditorModal(),
      );
    }

    this._bindOverlayCloseBehavior(this.detachedEditorModal, () =>
      this.closeDetachedEditorModal(),
    );

    if (!document.documentElement.dataset.detachedEditorEscBound) {
      document.documentElement.dataset.detachedEditorEscBound = "1";
      document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        if (this.detachedEditorModal?.classList.contains("active")) {
          this.closeDetachedEditorModal();
        }
      });
    }
  }

  bindDetachedEditorButtons() {
    this.getDetachedEditorConfigs().forEach((config) => {
      const btn = document.getElementById(config.buttonId);
      if (!btn || btn.dataset.bound === "1") return;

      btn.dataset.bound = "1";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        this.openDetachedEditorModal(config);
      });
    });
  }

  openDetachedEditorModal(config) {
    if (!config?.groupId) return;
    this.ensureDetachedEditorModal();

    if (!this.detachedEditorModal || !this.detachedEditorModalBody) return;

    if (typeof config.onBeforeOpen === "function") {
      try {
        config.onBeforeOpen();
      } catch (e) {
        // ignore
      }
    }

    if (this._detachedEditorState?.groupId === config.groupId) {
      return;
    }

    if (this._detachedEditorState) {
      this.closeDetachedEditorModal({ skipAfterCloseRefresh: true });
    }

    const group = document.getElementById(config.groupId);
    const parent = group?.parentElement;
    if (!group || !parent) return;

    const placeholder = document.createElement("div");
    placeholder.className = "editor-detached-host-placeholder";
    placeholder.hidden = true;
    parent.insertBefore(placeholder, group);

    this.detachedEditorModalBody.appendChild(group);
    this.detachedEditorModal.classList.add("active");
    this.detachedEditorModalTitle.textContent =
      config.title || "Detached Editor";

    this._detachedEditorState = {
      groupId: config.groupId,
      group,
      placeholder,
      onAfterClose: config.onAfterClose,
      resizeCleanup: null,
    };

    if (typeof config.onAfterOpen === "function") {
      try {
        config.onAfterOpen();
      } catch (e) {
        // ignore
      }
    }

    this.applyDetachedEditorModalInitialWidth();
    this.refreshDetachedEditorColumnResize();
    this.bindDetachedEditorViewportRefresh();
    this.bindDetachedEditorMutationRefresh();
  }

  getDetachedEditorRowCount(group) {
    if (!group) return 0;
    return group.querySelectorAll(
      ".quote-editor-row, .flashcard-row, .hadith-editor-row, .adhkar-editor-row",
    ).length;
  }

  applyDetachedEditorModalInitialWidth() {
    if (!this._detachedEditorState?.group || !this.detachedEditorModalContent)
      return;

    const group = this._detachedEditorState.group;
    const surface =
      group.querySelector(
        ".hadith-editor-table-wrap, .adhkar-editor-table-wrap, .flashcard-editor-body, .flashcards-editor, .adhkar-editor, .user-quotes-list",
      ) || group;

    const rowCount = this.getDetachedEditorRowCount(group);
    const viewportWidth =
      window.innerWidth || document.documentElement?.clientWidth || 1200;
    const minWidth = Math.max(520, Math.floor(viewportWidth * 0.36));
    const maxWidth = Math.floor(viewportWidth * 0.96);

    // Size detached editors from row density first, then cap with content width.
    const normalizedRows = Math.max(1, Math.min(rowCount || 1, 30));
    const baseRatio = Math.min(0.78, 0.42 + normalizedRows * 0.011);
    const baseWidth = Math.floor(viewportWidth * baseRatio);

    const measured = Math.max(
      surface.scrollWidth || 0,
      group.scrollWidth || 0,
      760,
    );
    const softCap = baseWidth + Math.max(120, Math.floor(normalizedRows * 6));
    const preferredWidth = Math.min(measured + 72, softCap);
    const targetWidth = Math.max(
      minWidth,
      Math.min(maxWidth, Math.max(baseWidth, preferredWidth)),
    );

    this.detachedEditorModalContent.style.setProperty(
      "--detached-editor-width",
      `${targetWidth}px`,
    );
  }

  refreshDetachedEditorColumnResize() {
    const state = this._detachedEditorState;
    if (!state?.group) return;

    if (typeof state.resizeCleanup === "function") {
      try {
        state.resizeCleanup();
      } catch (e) {
        // ignore
      }
      state.resizeCleanup = null;
    }

    state.resizeCleanup = this.enableDetachedEditorColumnResize(state.group);
  }

  scheduleDetachedEditorLayoutRefresh({ includeWidth = false } = {}) {
    if (!this._detachedEditorState) return;
    if (includeWidth) {
      this._detachedEditorRefreshNeedsWidth = true;
    }
    if (this._detachedEditorRefreshTimer) return;

    this._detachedEditorRefreshTimer = setTimeout(() => {
      this._detachedEditorRefreshTimer = null;
      if (!this._detachedEditorState) return;

      const shouldRefreshWidth = this._detachedEditorRefreshNeedsWidth;
      this._detachedEditorRefreshNeedsWidth = false;

      if (shouldRefreshWidth) {
        this.applyDetachedEditorModalInitialWidth();
      }
      this.refreshDetachedEditorColumnResize();
    }, 0);
  }
});

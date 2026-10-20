/**
 * SettingsManager: saving settings and applying the change.
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
});

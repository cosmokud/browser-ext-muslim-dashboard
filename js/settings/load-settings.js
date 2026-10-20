/**
 * SettingsManager: loading every panel from storage.
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

  loadSettings() {
    const settings = this.storage.getSettings();
    // Keep pending background refresh intent across modal reopen.
    // It will be cleared only after a manual save-triggered refresh.

    // Keep floating mode button UI in sync (handled by FloatingModeManager)
    try {
      if (window.dashboard && window.dashboard.floating) {
        window.dashboard.floating.updateAllButtons();
      }
    } catch (e) {
      // ignore
    }

    // Location settings
    const locationRadio = document.querySelector(
      `input[name="locationMethod"][value="${settings.locationMethod}"]`,
    );
    if (locationRadio) locationRadio.checked = true;
    this.toggleManualLocation(settings.locationMethod === "manual");

    if (this.cityInput) this.cityInput.value = settings.city || "";
    if (this.latitudeInput) this.latitudeInput.value = settings.latitude || "";
    if (this.longitudeInput)
      this.longitudeInput.value = settings.longitude || "";
    this.bindDetectedLocationTextSync();
    this.updateDetectedLocationText();

    // Prayer settings
    if (this.calculationMethod)
      this.calculationMethod.value = settings.calculationMethod;
    if (this.asrMethod) this.asrMethod.value = settings.asrMethod;
    if (this.highLatMethod) this.highLatMethod.value = settings.highLatMethod;
    if (this.midnightMethod)
      this.midnightMethod.value = settings.midnightMethod;
    if (this.duhaOffset) this.duhaOffset.value = settings.duhaOffset;

    // Custom angles
    if (this.customFajrAngle)
      this.customFajrAngle.value = settings.customFajrAngle;
    if (this.customIshaAngle)
      this.customIshaAngle.value = settings.customIshaAngle;
    if (this.customIshaMinutes)
      this.customIshaMinutes.checked = settings.customIshaMinutes;
    this.toggleCustomAngles(settings.calculationMethod === "Custom");

    // Prayer visibility
    for (const prayer in this.visibilityCheckboxes) {
      if (this.visibilityCheckboxes[prayer]) {
        this.visibilityCheckboxes[prayer].checked =
          settings.prayerVisibility[prayer];
      }
    }

    // Adjustments
    for (const prayer in this.adjustmentInputs) {
      if (this.adjustmentInputs[prayer] && settings.adjustments) {
        this.adjustmentInputs[prayer].value = settings.adjustments[prayer] || 0;
      }
    }

    // Prayer notifications
    const pn = settings.prayerNotifications || {};
    if (this.enablePrayerNotifications) {
      this.enablePrayerNotifications.checked = pn.enabled === true;
    }

    const defaultBeforeMinutes = SettingsRegistry.coerce(
      "prayerNotifications.beforeMinutes",
      parseInt(pn.beforeMinutes, 10),
    );
    const defaultAfterMinutes = SettingsRegistry.coerce(
      "prayerNotifications.afterMinutes",
      parseInt(pn.afterMinutes, 10),
    );

    const perPrayerRaw =
      pn.perPrayer && typeof pn.perPrayer === "object" ? pn.perPrayer : null;

    for (const prayer in this.notificationCheckboxes) {
      const entry = perPrayerRaw ? perPrayerRaw[prayer] : null;

      const enabled =
        entry && typeof entry === "object"
          ? entry.enabled === true
          : typeof entry === "boolean"
            ? entry === true
            : settings.prayerVisibility?.[prayer] === true;

      if (this.notificationCheckboxes[prayer]) {
        this.notificationCheckboxes[prayer].checked = enabled;
      }

      const beforeMinutes =
        entry && typeof entry === "object"
          ? SettingsRegistry.coerce(
            "prayerNotifications.beforeMinutes",
            parseInt(entry.beforeMinutes, 10), defaultBeforeMinutes,
          )
          : defaultBeforeMinutes;
      const afterMinutes =
        entry && typeof entry === "object"
          ? SettingsRegistry.coerce(
            "prayerNotifications.afterMinutes",
            parseInt(entry.afterMinutes, 10), defaultAfterMinutes,
          )
          : defaultAfterMinutes;

      if (this.notificationBeforeMinutesInputs?.[prayer]) {
        this.notificationBeforeMinutesInputs[prayer].value =
          String(beforeMinutes);
      }
      if (this.notificationAfterMinutesInputs?.[prayer]) {
        this.notificationAfterMinutesInputs[prayer].value =
          String(afterMinutes);
      }

      const atTimeEnabled =
        entry && typeof entry === "object"
          ? entry.atTimeEnabled !== false
          : true;

      if (this.notificationAtTimeCheckboxes?.[prayer]) {
        this.notificationAtTimeCheckboxes[prayer].checked = atTimeEnabled;
      }
    }

    this.updatePrayerNotificationRowStates();

    // Quote settings
    if (this.useDefaultQuotes)
      this.useDefaultQuotes.checked = settings.useDefaultQuotes;
    if (this.useUserQuotes) this.useUserQuotes.checked = settings.useUserQuotes;

    // Quote layout style
    const quoteLayoutStyle = settings.quoteLayoutStyle || "classic";
    if (this.quoteLayoutStyleSelect) {
      const hasOption = this.quoteLayoutStyleSelect.querySelector(
        `option[value="${quoteLayoutStyle}"]`,
      );
      this.quoteLayoutStyleSelect.value = hasOption
        ? quoteLayoutStyle
        : "classic";
    }

    // Background settings
    if (settings.bgIntervalCustom && settings.bgInterval === "custom") {
      if (this.bgInterval) this.bgInterval.value = "custom";
      if (this.bgIntervalCustom)
        this.bgIntervalCustom.value = settings.bgIntervalCustom;
      this.toggleCustomInterval(true);
    } else {
      if (this.bgInterval) this.bgInterval.value = settings.bgInterval;
      this.toggleCustomInterval(false);
    }
    const normalizedBgCategory = this.normalizeBackgroundCategory(
      settings.bgCategory,
    );
    const normalizedBgDisplayMode = this.normalizeBackgroundDisplayMode(
      settings.bgDisplayMode,
    );
    const normalizedBgDim = this.normalizeBackgroundDim(settings.bgDim, 100);
    const normalizedBgBlur = this.normalizeBackgroundBlur(settings.bgBlur, 0);
    if (this.bgCategory) {
      this.bgCategory.value = normalizedBgCategory;
    }
    if (this.bgDisplayMode) {
      this.bgDisplayMode.value = normalizedBgDisplayMode;
    }
    if (this.bgDim) {
      this.bgDim.value = String(normalizedBgDim);
      this.updateBackgroundDimLabel();
    }
    if (this.bgBlur) {
      this.bgBlur.value = String(normalizedBgBlur);
      this.updateBackgroundBlurLabel();
    }
    if (this.bgShuffle) {
      this.bgShuffle.checked = settings.bgShuffle !== false;
    }
    this.updateBackgroundPoolAddButtonVisibility();
    this.renderBackgroundImagePool();
    void this.syncCustomBackgroundMediaFromSettings(settings);

    // Container width settings
    if (this.containerWidth) {
      this.containerWidth.value = settings.containerWidth || "narrow";
    }
    if (settings.containerWidth === "custom") {
      this.toggleCustomWidth(true);
      if (this.containerWidthCustom) {
        const clamped = SettingsRegistry.coerce(
          "containerWidthCustom",
          settings.containerWidthCustom,
        );
        this.containerWidthCustom.value = String(clamped);
      }
      this.updateCustomWidthLabel();
    } else {
      this.toggleCustomWidth(false);
    }

    // UI blur power
    if (this.uiBlurPower) {
      const clamped = SettingsRegistry.coerce("uiBlurPower", settings.uiBlurPower);
      this.uiBlurPower.value = String(clamped);
      this.updateUiBlurPowerLabel();
      this.applyUiBlurPower(clamped);
    }

    // Pinned Apps settings
    if (this.pinnedAppsPerRow) {
      const clamped = SettingsRegistry.coerce(
        "pinnedAppsPerRow",
        settings.pinnedAppsPerRow,
      );
      this.pinnedAppsPerRow.value = String(clamped);
      this.updatePinnedAppsPerRowLabel();
    }
    if (this.pinnedAppsOpenInNewTab) {
      this.pinnedAppsOpenInNewTab.checked =
        settings.pinnedAppsOpenInNewTab !== false;
    }

    // Search Bar settings
    if (this.searchBarOpenInNewTab) {
      this.searchBarOpenInNewTab.checked =
        settings.searchBarOpenInNewTab !== false;
    }

    // Pocket Quran settings
    const pq = settings.pocketQuran || {};
    const pqPopup = settings.pocketQuranPopup || {};

    if (this.pocketQuranArabicSize) {
      const clamped = SettingsRegistry.coerce("arabicFontSize", pq.arabicFontSize);
      this.pocketQuranArabicSize.value = String(clamped);
      this.updatePocketQuranArabicSizeLabel();
    }

    if (this.pocketQuranTranslationSize) {
      const clamped = SettingsRegistry.coerce(
        "translationFontSize",
        pq.translationFontSize,
      );
      this.pocketQuranTranslationSize.value = String(clamped);
      this.updatePocketQuranTranslationSizeLabel();
    }

    if (this.pocketQuranHighlighterDelay) {
      const clamped = SettingsRegistry.coerce(
        "quran.reciterHighlighterDelayMs",
        pq.reciterHighlighterDelayMs,
      );
      this.pocketQuranHighlighterDelay.value = String(clamped);
      this.updatePocketQuranHighlighterDelayLabel();
    }

    if (this.pocketQuranTranslationFontFamily) {
      this.pocketQuranTranslationFontFamily.value =
        this.normalizePocketQuranTranslationFontFamily(
          pq.translationFontFamily,
        );
    }

    if (this.pocketQuranPopupArabicSize) {
      const clamped = SettingsRegistry.coerce(
        "arabicFontSize",
        pqPopup.arabicFontSize,
        SettingsRegistry.coerce("arabicFontSize", pq.arabicFontSize),
      );
      this.pocketQuranPopupArabicSize.value = String(clamped);
      this.updatePocketQuranPopupArabicSizeLabel();
    }

    if (this.pocketQuranPopupTranslationSize) {
      const clamped = SettingsRegistry.coerce(
        "translationFontSize",
        pqPopup.translationFontSize,
        SettingsRegistry.coerce("translationFontSize", pq.translationFontSize),
      );
      this.pocketQuranPopupTranslationSize.value = String(clamped);
      this.updatePocketQuranPopupTranslationSizeLabel();
    }

    if (this.pocketQuranPopupArabicFontFamily) {
      this.pocketQuranPopupArabicFontFamily.value =
        this.normalizePocketQuranArabicFontFamily(
          pqPopup.arabicFontFamily || pq.arabicFontFamily,
        );
    }

    if (this.pocketQuranPopupTranslationFontFamily) {
      this.pocketQuranPopupTranslationFontFamily.value =
        this.normalizePocketQuranPopupTranslationFontFamily(
          pqPopup.translationFontFamily,
        );
    }

    if (this.pocketQuranTranslationSelect) {
      const desired = parseInt(pq.translationResourceId, 10);
      const hasOption =
        Number.isFinite(desired) &&
        this.pocketQuranTranslationSelect.querySelector(
          `option[value="${desired}"]`,
        );
      this.pocketQuranTranslationSelect.value = hasOption
        ? String(desired)
        : "85";
    }

    this.updatePocketQuranReciterPickerLabel();
    this.updatePocketQuranArabicFontPickerLabel();
    this.updatePocketQuranPopupArabicFontPickerLabel();
    this.updatePocketQuranTranslationFontPickerLabel();
    this.updatePocketQuranPopupTranslationFontPickerLabel();
    this.updatePocketQuranTranslationPickerLabel();
    this.updateContentFontPickerLabels();

    if (this.pocketQuranRecitationFloatingEnabled) {
      this.pocketQuranRecitationFloatingEnabled.checked =
        pq.recitationFloatingEnabled === true;
    }

    if (this.pocketQuranRecitationAutoDockOnVisible) {
      this.pocketQuranRecitationAutoDockOnVisible.checked =
        pq.recitationAutoDockOnVisible === true;
    }

    const floatingAppearance =
      pq.recitationFloatingAppearance === "theme" ? "theme" : "opaque";
    const floatingAppearanceRadio = document.querySelector(
      `input[name="pocketQuranRecitationFloatingAppearance"][value="${floatingAppearance}"]`,
    );
    if (floatingAppearanceRadio) floatingAppearanceRadio.checked = true;

    if (this.pocketQuranCopyIncludeArabic) {
      this.pocketQuranCopyIncludeArabic.checked = pq.copyIncludeArabic === true;
    }

    // Pocket Quran Tajweed colors
    this.renderPocketQuranTajweedColorPickers(pq.tajweedColors);
    this.applyPocketQuranTajweedColors(pq.tajweedColors);

    // Compact weather settings
    if (this.compactWeatherEnabled) {
      this.compactWeatherEnabled.checked =
        settings.compactWeatherEnabled === true;
      this.toggleCompactWeatherOptions(settings.compactWeatherEnabled === true);
    }
    const compactWeatherMode = settings.compactWeatherMode || "simple";
    const compactWeatherModeRadio = document.querySelector(
      `input[name="compactWeatherMode"][value="${compactWeatherMode}"]`,
    );
    if (compactWeatherModeRadio) compactWeatherModeRadio.checked = true;
    if (this.compactWeatherShowLocationName) {
      this.compactWeatherShowLocationName.checked =
        settings.compactWeatherShowLocationName === true;
    }

    // Load heading settings
    this.loadHeadingSettings(settings);

    // Load component visibility settings
    this.loadVisibilitySettings(settings);

    // Load weather settings
    this.loadWeatherSettings(settings);

    // Load fasting settings
    this.loadFastingSettings(settings);

    // Load debug settings
    this.loadDebugSettings(settings);

    if (this.notesCardFontFamily) {
      this.notesCardFontFamily.value = this.normalizeNotesCardFontFamily(
        settings.notesCardFontFamily,
      );
    }
    this.applyNotesCardFontFamily(settings.notesCardFontFamily);

    this.updateNotesCountHint();
    this.updateSettingsRangeProgress();
  }

  updatePrayerNotificationRowStates() {
    for (const prayer in this.notificationCheckboxes) {
      this.updatePrayerNotificationRowState(prayer);
    }
  }

  updatePrayerNotificationRowState(prayer) {
    const checkbox = this.notificationCheckboxes?.[prayer];
    if (!checkbox) return;
    const row = checkbox.closest(".prayer-settings-row");
    if (!row) return;
    row.classList.toggle("notify-disabled", !checkbox.checked);
  }
});

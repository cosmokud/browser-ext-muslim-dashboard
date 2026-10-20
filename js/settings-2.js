/**
 * SettingsManager, part 2 of 9.
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

  init() {
    this.loadSettings();
    this.applyStoredContentFontSettings();
    this.updateContentFontPickerLabels();
    this.ensureDetachedEditorModal();
    this.setupEventListeners();
    this.updateMethodAnglesDisplay();
    this.renderBackgroundImagePool();
    void this.syncCustomBackgroundMediaFromSettings();

    this.updateNotesCountHint();
    this.updatePocketQuranBookmarkStats();
    this.applyCoordinateExamples();

    // Initialize themes panel
    this.initThemesPanel();

    // Keep Settings tabs compact + consistent width
    this.updateSettingsTabsMinWidth();

    // Apply UI settings immediately (not only after Save)
    const settings = this.storage.getSettings();
    const dashboardQualityState = this.resolveDashboardQualityState(
      settings.performanceModeEnabled === true,
      settings?.theme?.highestVisualFidelityEnabled === true,
      "performance",
    );
    this.applyHighestVisualFidelity(
      dashboardQualityState.highestVisualFidelityEnabled,
    );
    this.applyUiBlurPower(settings.uiBlurPower ?? 100);
    this.applyPerformanceMode(dashboardQualityState.performanceModeEnabled);

    // Clean up any stale inline zoom left by the removed Dashboard Scale feature.
    const root = document.documentElement;
    if (root) {
      root.style.removeProperty("zoom");
      root.style.removeProperty("--dashboard-scale");
    }
  }

  updateSettingsTabsMinWidth() {
    const strip = this.tabStrip || document.querySelector(".settings-tabs");
    if (!strip) return;

    const tabs = Array.from(strip.querySelectorAll(".settings-tab"));
    if (!tabs.length) return;

    // Clear any previous width so we can measure natural content widths.
    strip.style.removeProperty("--settings-tab-width");
    strip.style.removeProperty("--settings-tab-min-width");

    // Wait a tick so icon-theme DOM replacements/fonts have landed.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        let maxWidth = 0;
        for (const tab of tabs) {
          const rect = tab.getBoundingClientRect();
          const contentWidth = Number.isFinite(tab.scrollWidth)
            ? tab.scrollWidth
            : 0;
          if (rect && Number.isFinite(rect.width)) {
            maxWidth = Math.max(maxWidth, rect.width, contentWidth);
          }
        }

        // Add extra breathing room so the longest label does not clip.
        const preferredWidth = Math.ceil(maxWidth + 24);
        const minReadableWidth = 152;
        const availableWidth = Math.max(0, Math.floor(strip.clientWidth - 16));
        const width =
          availableWidth > 0
            ? Math.min(
                Math.max(preferredWidth, minReadableWidth),
                availableWidth,
              )
            : Math.max(preferredWidth, minReadableWidth);
        if (Number.isFinite(width) && width > 0) {
          // Primary variable used by CSS
          strip.style.setProperty("--settings-tab-width", `${width}px`);
          // Back-compat with older CSS naming
          strip.style.setProperty("--settings-tab-min-width", `${width}px`);
        }
      });
    });
  }

  normalizeSettingsSearchText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  applySettingsSearch(rawQuery = "") {
    const query = this.normalizeSettingsSearchText(rawQuery);
    const tabs = Array.from(this.tabs || []);
    const panels = Array.from(this.panels || []);
    const panelMatchMap = new Map();
    let hasVisibleTab = false;

    panels.forEach((panel) => {
      const tabName = panel.id.replace(/Panel$/, "");
      const relatedTab = tabs.find((tab) => tab.dataset.tab === tabName);
      const tabText = this.normalizeSettingsSearchText(
        relatedTab?.textContent || "",
      );
      const panelText = this.normalizeSettingsSearchText(panel.textContent);
      const tabDirectMatch = query ? tabText.includes(query) : false;
      const groups = Array.from(panel.querySelectorAll(".setting-group"));

      panel.classList.remove("settings-search-filtered-out");

      if (!query) {
        groups.forEach((group) => {
          group.classList.remove(
            "settings-search-filtered-out",
            "settings-search-match",
          );
        });
        panelMatchMap.set(panel.id, true);
        return;
      }

      if (!groups.length) {
        const matches = tabDirectMatch || panelText.includes(query);
        panel.classList.toggle("settings-search-filtered-out", !matches);
        panelMatchMap.set(panel.id, matches);
        return;
      }

      let matchedGroups = 0;
      groups.forEach((group) => {
        const groupText = this.normalizeSettingsSearchText(group.textContent);
        const matches = tabDirectMatch || groupText.includes(query);

        group.classList.toggle("settings-search-filtered-out", !matches);
        group.classList.toggle(
          "settings-search-match",
          !tabDirectMatch && groupText.includes(query),
        );

        if (matches) {
          matchedGroups += 1;
        }
      });

      const panelMatches =
        tabDirectMatch || matchedGroups > 0 || panelText.includes(query);
      panelMatchMap.set(panel.id, panelMatches);
    });

    tabs.forEach((tab) => {
      const isDebugLocked = tab.dataset.tab === "debug" && !this.debugEnabled;
      if (isDebugLocked) {
        return;
      }

      const panelId = `${tab.dataset.tab}Panel`;
      const tabText = this.normalizeSettingsSearchText(tab.textContent);
      const matches =
        !query ||
        tabText.includes(query) ||
        panelMatchMap.get(panelId) === true;

      tab.classList.toggle("settings-search-filtered-out", !matches);
      tab.classList.toggle("settings-search-match-tab", query && matches);
      tab.setAttribute("aria-hidden", matches ? "false" : "true");

      if (matches) {
        hasVisibleTab = true;
      }
    });

    if (query) {
      const hasVisibleActiveTab = tabs.some(
        (tab) =>
          tab.classList.contains("active") &&
          !tab.classList.contains("settings-search-filtered-out"),
      );

      if (!hasVisibleActiveTab) {
        const firstMatchTab = tabs.find(
          (tab) => !tab.classList.contains("settings-search-filtered-out"),
        );
        if (firstMatchTab?.dataset?.tab) {
          this.switchTab(firstMatchTab.dataset.tab);
        }
      }
    }

    if (this.settingsSearchClearBtn) {
      this.settingsSearchClearBtn.hidden = query.length === 0;
    }

    if (this.settingsSearchEmpty) {
      if (query && !hasVisibleTab) {
        const safeQuery = String(rawQuery || "").trim();
        this.settingsSearchEmpty.textContent = safeQuery
          ? `No settings matched "${safeQuery}".`
          : "No settings matched.";
        this.settingsSearchEmpty.classList.add("active");
      } else {
        this.settingsSearchEmpty.textContent = "";
        this.settingsSearchEmpty.classList.remove("active");
      }
    }

    this.updateSettingsTabsMinWidth();
  }

  resetSettingsSearch() {
    if (this.settingsSearchInput) {
      this.settingsSearchInput.value = "";
    }
    this.applySettingsSearch("");
  }

  setupSettingsSearchEventListeners() {
    if (
      this.settingsSearchInput &&
      this.settingsSearchInput.dataset.bound !== "1"
    ) {
      this.settingsSearchInput.dataset.bound = "1";

      this.settingsSearchInput.addEventListener("input", () => {
        this.applySettingsSearch(this.settingsSearchInput.value);
      });

      this.settingsSearchInput.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          this.resetSettingsSearch();
          this.settingsSearchInput.blur();
        }
      });
    }

    if (
      this.settingsSearchClearBtn &&
      this.settingsSearchClearBtn.dataset.bound !== "1"
    ) {
      this.settingsSearchClearBtn.dataset.bound = "1";
      this.settingsSearchClearBtn.addEventListener("click", () => {
        this.resetSettingsSearch();
        this.settingsSearchInput?.focus();
      });
    }
  }

  isAutoSaveTarget(target) {
    if (!(target instanceof Element)) {
      return false;
    }

    if (!this.modal || !this.modal.contains(target)) {
      return false;
    }

    const isFormControl =
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement;

    if (!isFormControl) {
      return false;
    }

    if (target.id === "settingsSearchInput") {
      return false;
    }

    if (target instanceof HTMLInputElement) {
      const type = String(target.type || "").toLowerCase();
      if (
        type === "button" ||
        type === "submit" ||
        type === "reset" ||
        type === "file" ||
        type === "image"
      ) {
        return false;
      }
    }

    return true;
  }

  runAutoSave() {
    if (this._isAutoSaving) {
      this._autoSaveQueued = true;
      return;
    }

    this._isAutoSaving = true;
    try {
      this.saveSettings({
        source: "auto",
        showToast: false,
        closeModal: false,
        showValidationErrors: false,
      });
    } finally {
      this._isAutoSaving = false;

      if (this._autoSaveQueued) {
        this._autoSaveQueued = false;
        this.scheduleAutoSave(120);
      }
    }
  }

  scheduleAutoSave(delayMs = 280) {
    if (!this.modal?.classList.contains("active")) {
      return;
    }

    if (this._autoSaveTimer) {
      clearTimeout(this._autoSaveTimer);
    }

    const safeDelay = this.clampNumber(delayMs, 0, 5000, 280);
    this._autoSaveTimer = setTimeout(() => {
      this._autoSaveTimer = null;
      this.runAutoSave();
    }, safeDelay);
  }

  clearScheduledAutoSave() {
    if (this._autoSaveTimer) {
      clearTimeout(this._autoSaveTimer);
      this._autoSaveTimer = null;
    }
    this._autoSaveQueued = false;
  }

  flushPendingAutoSaveBeforeClose() {
    const hadScheduledSave = !!this._autoSaveTimer;
    const hadQueuedSave = this._autoSaveQueued === true;

    this.clearScheduledAutoSave();

    if (!this.modal?.classList.contains("active")) {
      return;
    }

    if (!hadScheduledSave && !hadQueuedSave) {
      return;
    }

    if (this._isAutoSaving) {
      return;
    }

    try {
      this.runAutoSave();
    } catch (e) {
      // ignore close-path autosave failures
    }
  }

  setupSettingsAutoSaveListeners() {
    if (!this.modal || this.modal.dataset.autoSaveBound === "1") {
      return;
    }

    this.modal.dataset.autoSaveBound = "1";

    this.modal.addEventListener("input", (event) => {
      const target = event.target;
      if (!this.isAutoSaveTarget(target)) {
        return;
      }

      const delay =
        target instanceof HTMLInputElement &&
        (target.type === "range" || target.type === "number")
          ? 200
          : 380;

      this.scheduleAutoSave(delay);
    });

    this.modal.addEventListener("change", (event) => {
      if (!this.isAutoSaveTarget(event.target)) {
        return;
      }

      this.scheduleAutoSave(120);
    });
  }

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

  normalizeCssHexColor(value, fallback) {
    const v = String(value || "").trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) return v;
    if (/^#[0-9a-f]{3}$/i.test(v)) return v;
    return fallback;
  }

  getMergedPocketQuranTajweedColors(colors) {
    const defaults = SettingsManager.POCKET_QURAN_DEFAULT_TAJWEED_COLORS;
    const input = colors && typeof colors === "object" ? colors : {};
    return { ...defaults, ...input };
  }

  applyPocketQuranTajweedColors(colors) {
    const card = document.getElementById("pocketQuranCard");
    if (!card) return;

    const defaults = SettingsManager.POCKET_QURAN_DEFAULT_TAJWEED_COLORS;
    const merged = this.getMergedPocketQuranTajweedColors(colors);

    for (const key of Object.keys(defaults)) {
      const normalized = this.normalizeCssHexColor(merged[key], defaults[key]);
      card.style.setProperty(`--pq-tajweed-${key}`, normalized);
    }
  }

  persistPocketQuranTajweedColorPatch(patch) {
    const settings = this.storage.getSettings();
    const pq = settings.pocketQuran || {};
    const merged = this.getMergedPocketQuranTajweedColors(pq.tajweedColors);
    const next = { ...merged, ...(patch || {}) };

    settings.pocketQuran = {
      ...pq,
      tajweedColors: next,
    };

    this.storage.saveSettings(settings);
  }

  resetAllPocketQuranTajweedColors() {
    const defaults = SettingsManager.POCKET_QURAN_DEFAULT_TAJWEED_COLORS;
    const settings = this.storage.getSettings();
    const pq = settings.pocketQuran || {};

    settings.pocketQuran = {
      ...pq,
      tajweedColors: { ...defaults },
    };

    this.storage.saveSettings(settings);
    this.applyPocketQuranTajweedColors(defaults);
    this.renderPocketQuranTajweedColorPickers(defaults);
  }

  renderPocketQuranTajweedColorPickers(colors) {
    if (!this.pocketQuranTajweedColors) return;

    const defaults = SettingsManager.POCKET_QURAN_DEFAULT_TAJWEED_COLORS;
    const labels = SettingsManager.POCKET_QURAN_TAJWEED_COLOR_LABELS;
    const merged = this.getMergedPocketQuranTajweedColors(colors);

    this.pocketQuranTajweedColors.innerHTML = "";

    for (const key of Object.keys(defaults)) {
      const row = document.createElement("div");
      row.className = "pq-tajweed-color-row";

      const label = document.createElement("div");
      label.className = "pq-tajweed-color-label";
      label.textContent = labels[key] || key;

      const actions = document.createElement("div");
      actions.className = "pq-tajweed-color-actions";

      const input = document.createElement("input");
      input.type = "color";
      input.className = "pq-tajweed-color-input";
      input.value = merged[key];
      input.setAttribute("aria-label", `Pick color for ${label.textContent}`);

      const reset = document.createElement("button");
      reset.type = "button";
      reset.className = "setting-btn";
      reset.textContent = "Reset";
      reset.title = "Reset to default";
      reset.setAttribute("aria-label", `Reset ${label.textContent} to default`);

      const applyAndPersist = (nextColor) => {
        const normalized = this.normalizeCssHexColor(nextColor, defaults[key]);
        input.value = normalized;
        this.applyPocketQuranTajweedColors({ [key]: normalized });
        this.persistPocketQuranTajweedColorPatch({ [key]: normalized });
      };

      input.addEventListener("input", (e) => {
        applyAndPersist(e.target.value);
      });

      reset.addEventListener("click", () => {
        applyAndPersist(defaults[key]);
      });

      actions.appendChild(input);
      actions.appendChild(reset);

      row.appendChild(label);
      row.appendChild(actions);
      this.pocketQuranTajweedColors.appendChild(row);
    }
  }

  updatePocketQuranArabicSizeLabel() {
    if (!this.pocketQuranArabicSize || !this.pocketQuranArabicSizeValue) return;
    const clamped = SettingsRegistry.coerce(
      "arabicFontSize",
      parseInt(this.pocketQuranArabicSize.value, 10),
    );
    this.pocketQuranArabicSize.value = String(clamped);
    this.pocketQuranArabicSizeValue.textContent = `${clamped}px`;
  }

  updatePocketQuranTranslationSizeLabel() {
    if (
      !this.pocketQuranTranslationSize ||
      !this.pocketQuranTranslationSizeValue
    )
      return;
    const clamped = SettingsRegistry.coerce(
      "translationFontSize",
      parseInt(this.pocketQuranTranslationSize.value, 10),
    );
    this.pocketQuranTranslationSize.value = String(clamped);
    this.pocketQuranTranslationSizeValue.textContent = `${clamped}px`;
  }

  updatePocketQuranHighlighterDelayLabel() {
    if (
      !this.pocketQuranHighlighterDelay ||
      !this.pocketQuranHighlighterDelayValue
    )
      return;

    const clamped = SettingsRegistry.coerce(
      "quran.reciterHighlighterDelayMs",
      parseInt(this.pocketQuranHighlighterDelay.value, 10),
    );

    this.pocketQuranHighlighterDelay.value = String(clamped);
    this.pocketQuranHighlighterDelayValue.textContent = `${clamped}ms`;
  }

  updatePocketQuranPopupArabicSizeLabel() {
    if (
      !this.pocketQuranPopupArabicSize ||
      !this.pocketQuranPopupArabicSizeValue
    )
      return;

    const clamped = SettingsRegistry.coerce(
      "arabicFontSize",
      parseInt(this.pocketQuranPopupArabicSize.value, 10),
    );

    this.pocketQuranPopupArabicSize.value = String(clamped);
    this.pocketQuranPopupArabicSizeValue.textContent = `${clamped}px`;
  }

  updatePocketQuranPopupTranslationSizeLabel() {
    if (
      !this.pocketQuranPopupTranslationSize ||
      !this.pocketQuranPopupTranslationSizeValue
    )
      return;

    const clamped = SettingsRegistry.coerce(
      "translationFontSize",
      parseInt(this.pocketQuranPopupTranslationSize.value, 10),
    );

    this.pocketQuranPopupTranslationSize.value = String(clamped);
    this.pocketQuranPopupTranslationSizeValue.textContent = `${clamped}px`;
  }

  updateRangeProgress(rangeEl) {
    if (!(rangeEl instanceof HTMLInputElement) || rangeEl.type !== "range") {
      return;
    }

    const min = parseInt(rangeEl.min, 10);
    const max = parseInt(rangeEl.max, 10);
    const value = parseInt(rangeEl.value, 10);

    const safeMin = Number.isFinite(min) ? min : 0;
    const safeMax = Number.isFinite(max) ? max : safeMin + 1;
    const safeValue = Number.isFinite(value) ? value : safeMin;

    const span = Math.max(1, safeMax - safeMin);
    const progress = ((safeValue - safeMin) / span) * 100;
    const clamped = Math.max(0, Math.min(100, progress));

    rangeEl.style.setProperty("--jump-progress", `${clamped}%`);
  }

  updateSettingsRangeProgress(root = null) {
    const scope = root instanceof Element ? root : this.modal;
    if (!scope) return;

    const ranges = scope.querySelectorAll(
      '.settings-panel input[type="range"]',
    );
    ranges.forEach((rangeEl) => this.updateRangeProgress(rangeEl));
  }

  updatePocketQuranBookmarkStats() {
    if (!this.pocketQuranBookmarkStats) return;
    const categories = this.storage.get("pocketQuran_bookmarkCategories", []);
    const bookmarks = this.storage.get("pocketQuran_bookmarks", []);
    this.pocketQuranBookmarkStats.textContent = `${categories.length} categories, ${bookmarks.length} bookmarked ayahs`;
  }

  exportPocketQuranBookmarks() {
    try {
      const pocketQuran = window.dashboard?.pocketQuran;
      if (!pocketQuran) {
        this.showToast("Pocket Quran not initialized", "error");
        return;
      }

      const json = pocketQuran.exportBookmarksJSON();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `pocket-quran-bookmarks-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(url), 500);
      this.showToast("Bookmarks exported successfully", "success");
    } catch (e) {
      console.error("Failed to export bookmarks:", e);
      this.showToast("Failed to export bookmarks", "error");
    }
  }

  importPocketQuranBookmarks(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const pocketQuran = window.dashboard?.pocketQuran;
        if (!pocketQuran) {
          this.showToast("Pocket Quran not initialized", "error");
          return;
        }

        const result = pocketQuran.importBookmarksJSON(e.target.result);
        if (result.success) {
          this.updatePocketQuranBookmarkStats();
          this.showToast(
            `Imported ${result.categoriesCount} categories, ${result.bookmarksCount} bookmarks`,
            "success",
          );
        } else {
          this.showToast(`Import failed: ${result.error}`, "error");
        }
      } catch (err) {
        console.error("Failed to import bookmarks:", err);
        this.showToast("Failed to import bookmarks", "error");
      }
    };
    reader.onerror = () => {
      this.showToast("Failed to read file", "error");
    };
    reader.readAsText(file);
  }

  updatePinnedAppsPerRowLabel() {
    if (!this.pinnedAppsPerRow || !this.pinnedAppsPerRowValue) return;
    const clamped = SettingsRegistry.coerce(
      "pinnedAppsPerRow",
      parseInt(this.pinnedAppsPerRow.value, 10),
    );
    this.pinnedAppsPerRow.value = String(clamped);
    this.pinnedAppsPerRowValue.textContent = String(clamped);

    // Apply live change to the pinned apps grid width (for immediate preview)
    if (
      window.dashboard &&
      typeof window.dashboard.applyPinnedAppsSettings === "function"
    ) {
      window.dashboard.applyPinnedAppsSettings(clamped);
    } else {
      const grid = document.getElementById("pinnedAppsGrid");
      if (grid) {
        grid.style.setProperty("--pinned-apps-per-row", String(clamped));
      }
    }
  }

  loadHeadingSettings(settings) {
    const heading = settings.heading || {};

    const normalizeHeadingDateFormat = (format, legacyShowWeekday) => {
      const normalized = String(format || "").trim();
      const newValues = new Set([
        "full-weekday",
        "full",
        "medium-weekday",
        "medium",
        "short",
      ]);

      if (newValues.has(normalized)) return normalized;

      if (normalized === "full") {
        return legacyShowWeekday === false ? "full" : "full-weekday";
      }
      if (normalized === "long") {
        return "full";
      }
      if (normalized === "medium") {
        return legacyShowWeekday === false ? "medium" : "medium-weekday";
      }
      if (normalized === "short") {
        return "short";
      }

      return legacyShowWeekday === false ? "full" : "full-weekday";
    };

    // Greeting type
    const useCustom = heading.useCustomGreeting || false;
    const greetingRadio = document.querySelector(
      `input[name="greetingType"][value="${useCustom ? "custom" : "auto"}"]`,
    );
    if (greetingRadio) greetingRadio.checked = true;
    this.toggleCustomGreeting(useCustom);

    // Custom greeting text
    if (this.customGreetingInput) {
      this.customGreetingInput.value = heading.customGreeting || "";
    }

    // Time-based greetings
    const timeRanges = heading.greetingTimeRanges || {};
    if (this.greetingMorning)
      this.greetingMorning.value =
        timeRanges.morning?.text || "As-salamu alaykum, Good Morning";
    if (this.greetingAfternoon)
      this.greetingAfternoon.value =
        timeRanges.afternoon?.text || "As-salamu alaykum, Good Afternoon";
    if (this.greetingEvening)
      this.greetingEvening.value =
        timeRanges.evening?.text || "As-salamu alaykum, Good Evening";
    if (this.greetingNight)
      this.greetingNight.value =
        timeRanges.night?.text || "As-salamu alaykum, Good Night";

    // Clock settings
    if (this.showGreeting)
      this.showGreeting.checked = heading.showGreeting !== false;

    if (this.showClock) this.showClock.checked = heading.showClock !== false;
    this.toggleClockOptions(heading.showClock !== false);

    const clockFormat = heading.clockFormat || "24h";
    const clockFormatRadio = document.querySelector(
      `input[name="clockFormat"][value="${clockFormat}"]`,
    );
    if (clockFormatRadio) clockFormatRadio.checked = true;
    this.toggleAmPmOption(clockFormat === "12h");

    if (this.showSeconds)
      this.showSeconds.checked = heading.showSeconds !== false;
    if (this.showAmPm) this.showAmPm.checked = heading.showAmPm !== false;
    if (this.showNextPrayer)
      this.showNextPrayer.checked = heading.showNextPrayer === true;

    const clockStyle = heading.clockStyle || "default";
    const clockStyleRadio = document.querySelector(
      `input[name="clockStyle"][value="${clockStyle}"]`,
    );
    if (clockStyleRadio) clockStyleRadio.checked = true;

    // Date settings
    if (this.showDate) this.showDate.checked = heading.showDate !== false;
    if (this.showIslamicEvents)
      this.showIslamicEvents.checked = heading.showIslamicEvents !== false;
    if (this.dateFormatSelect) {
      const normalizedDateFormat = normalizeHeadingDateFormat(
        heading.dateFormat || "full",
        heading.showWeekday,
      );
      this.dateFormatSelect.value = normalizedDateFormat;
    }

    const dateCalendar = heading.dateCalendar || "hijri";
    const dateCalendarRadio = document.querySelector(
      `input[name="dateCalendar"][value="${dateCalendar}"]`,
    );
    if (dateCalendarRadio) dateCalendarRadio.checked = true;

    if (this.headerWholeComponentSurfaceEnabled) {
      this.headerWholeComponentSurfaceEnabled.checked =
        heading.wholeComponentSurfaceEnabled === true;
    }
    if (this.headerGreetingBgEnabled) {
      this.headerGreetingBgEnabled.checked =
        heading.greetingBackgroundEnabled === true;
    }
    if (this.headerDateBgEnabled) {
      this.headerDateBgEnabled.checked = heading.dateBackgroundEnabled === true;
    }
    if (this.headerTimeBgEnabled) {
      this.headerTimeBgEnabled.checked = heading.timeBackgroundEnabled === true;
    }
    if (this.headerNextPrayerBgEnabled) {
      this.headerNextPrayerBgEnabled.checked =
        heading.nextPrayerBackgroundEnabled === true;
    }
    if (this.headerCompactWeatherBgEnabled) {
      this.headerCompactWeatherBgEnabled.checked =
        heading.compactWeatherBackgroundEnabled === true;
    }

    this.syncClockSurfaceToggleState(clockStyle);

    this.getHeaderTextColorControlConfigs().forEach((config) => {
      this.loadHeaderColorControlValue(config, heading[config.settingKey]);
    });

    if (this.headerGreetingGlowEnabled) {
      this.headerGreetingGlowEnabled.checked =
        heading.greetingGlowEnabled === true;
    }
    if (this.headerGreetingGlowColor) {
      const fallback = this.getAutoHeaderGlowColor("#greeting");
      this.headerGreetingGlowColor.value = this.normalizeColorHex(
        heading.greetingGlowColor,
        fallback,
      );
    }
    if (this.headerGreetingGlowOpacity) {
      this.headerGreetingGlowOpacity.value = String(
        this.clampHeaderGlowOpacity(heading.greetingGlowOpacity, 72),
      );
    }
    if (this.headerGreetingGlowRadius) {
      this.headerGreetingGlowRadius.value = String(
        this.clampHeaderGlowRadius(heading.greetingGlowRadius, 14),
      );
    }

    if (this.headerDateGlowEnabled) {
      this.headerDateGlowEnabled.checked = heading.dateGlowEnabled === true;
    }
    if (this.headerDateGlowColor) {
      const fallback = this.getAutoHeaderGlowColor("#dateDisplay");
      this.headerDateGlowColor.value = this.normalizeColorHex(
        heading.dateGlowColor,
        fallback,
      );
    }
    if (this.headerDateGlowOpacity) {
      this.headerDateGlowOpacity.value = String(
        this.clampHeaderGlowOpacity(heading.dateGlowOpacity, 72),
      );
    }
    if (this.headerDateGlowRadius) {
      this.headerDateGlowRadius.value = String(
        this.clampHeaderGlowRadius(heading.dateGlowRadius, 14),
      );
    }

    if (this.headerTimeGlowEnabled) {
      this.headerTimeGlowEnabled.checked = heading.timeGlowEnabled === true;
    }
    if (this.headerTimeGlowColor) {
      const fallback = this.getAutoHeaderGlowColor("#currentTime");
      this.headerTimeGlowColor.value = this.normalizeColorHex(
        heading.timeGlowColor,
        fallback,
      );
    }
    if (this.headerTimeGlowOpacity) {
      this.headerTimeGlowOpacity.value = String(
        this.clampHeaderGlowOpacity(heading.timeGlowOpacity, 72),
      );
    }
    if (this.headerTimeGlowRadius) {
      this.headerTimeGlowRadius.value = String(
        this.clampHeaderGlowRadius(heading.timeGlowRadius, 14),
      );
    }

    if (this.headerNextPrayerGlowEnabled) {
      this.headerNextPrayerGlowEnabled.checked =
        heading.nextPrayerGlowEnabled === true;
    }
    if (this.headerNextPrayerGlowColor) {
      const fallback = this.getAutoHeaderGlowColor("#headerNextPrayer");
      this.headerNextPrayerGlowColor.value = this.normalizeColorHex(
        heading.nextPrayerGlowColor,
        fallback,
      );
    }
    if (this.headerNextPrayerGlowOpacity) {
      this.headerNextPrayerGlowOpacity.value = String(
        this.clampHeaderGlowOpacity(heading.nextPrayerGlowOpacity, 72),
      );
    }
    if (this.headerNextPrayerGlowRadius) {
      this.headerNextPrayerGlowRadius.value = String(
        this.clampHeaderGlowRadius(heading.nextPrayerGlowRadius, 14),
      );
    }

    if (this.headerCompactWeatherGlowEnabled) {
      this.headerCompactWeatherGlowEnabled.checked =
        heading.compactWeatherGlowEnabled === true;
    }
    if (this.headerCompactWeatherGlowColor) {
      const fallback = this.getAutoHeaderGlowColor(
        "#compactWeather .compact-weather-temp",
      );
      this.headerCompactWeatherGlowColor.value = this.normalizeColorHex(
        heading.compactWeatherGlowColor,
        fallback,
      );
    }
    if (this.headerCompactWeatherGlowOpacity) {
      this.headerCompactWeatherGlowOpacity.value = String(
        this.clampHeaderGlowOpacity(heading.compactWeatherGlowOpacity, 72),
      );
    }
    if (this.headerCompactWeatherGlowRadius) {
      this.headerCompactWeatherGlowRadius.value = String(
        this.clampHeaderGlowRadius(heading.compactWeatherGlowRadius, 14),
      );
    }

    this.getHeaderGlowControlConfigs().forEach((config) => {
      this.loadHeaderColorControlValue(config, heading[config.settingKey]);
    });

    this.updateHeaderGlowTuningUi();
    this.updateHeaderGlowColorLockState();

    this.updateHeaderSurfaceBackgroundsLockState();
  }

  loadVisibilitySettings(settings) {
    const visibility = settings.componentVisibility || {};
    const heading = settings.heading || {};

    if (this.visibilityHeader)
      this.visibilityHeader.checked = visibility.header !== false;
    if (this.visibilityQuickPins)
      this.visibilityQuickPins.checked = visibility.quickPins !== false;
    if (this.visibilitySearchBar)
      this.visibilitySearchBar.checked = visibility.searchBar !== false;
    if (this.visibilityQuotes)
      this.visibilityQuotes.checked = visibility.quotes !== false;
    if (this.visibilityPrayerTimes)
      this.visibilityPrayerTimes.checked = visibility.prayerTimes !== false;
    if (this.visibilityHijriCalendar)
      this.visibilityHijriCalendar.checked = visibility.hijriCalendar !== false;
    if (this.visibilityQiblaDirection)
      this.visibilityQiblaDirection.checked =
        visibility.qiblaDirection !== false;
    if (this.visibilityWeather)
      this.visibilityWeather.checked = visibility.weather !== false;
    if (this.visibilityLunarPhase)
      this.visibilityLunarPhase.checked = visibility.lunarPhase !== false;
    if (this.visibilityFasting)
      this.visibilityFasting.checked = visibility.fasting !== false;
    if (this.visibilityFlashcards)
      this.visibilityFlashcards.checked = visibility.flashcards !== false;
    if (this.visibilityAdhkar)
      this.visibilityAdhkar.checked = visibility.adhkar !== false;
    if (this.visibilityHadith)
      this.visibilityHadith.checked = visibility.hadith !== false;
    if (this.visibilityTodoList)
      this.visibilityTodoList.checked = visibility.todoList !== false;
    if (this.visibilityNotes)
      this.visibilityNotes.checked = visibility.notes !== false;
    if (this.visibilityPocketQuran)
      this.visibilityPocketQuran.checked = visibility.pocketQuran !== false;

    if (this.momentVisibilityPrayerTimes)
      this.momentVisibilityPrayerTimes.checked =
        visibility.prayerTimes !== false;
    if (this.momentVisibilityFasting)
      this.momentVisibilityFasting.checked = visibility.fasting !== false;
    if (this.momentVisibilityQuotes)
      this.momentVisibilityQuotes.checked = visibility.quotes !== false;
    if (this.momentVisibilityQuickPins)
      this.momentVisibilityQuickPins.checked = visibility.quickPins !== false;
    if (this.momentVisibilitySearchBar)
      this.momentVisibilitySearchBar.checked = visibility.searchBar !== false;
    if (this.momentVisibilityClock)
      this.momentVisibilityClock.checked = heading.showClock !== false;
  }

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
});

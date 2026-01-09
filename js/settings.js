/**
 * Settings Manager
 * Handles settings modal and configuration for all features
 * Supports 25+ calculation methods, visibility settings, quotes import/export, weather, and heading customization
 */

class SettingsManager {
  static POCKET_QURAN_DEFAULT_TAJWEED_COLORS = {
    ham_wasl: "#aaaaaa",
    slnt: "#aaaaaa",
    laam_shamsiyah: "#aaaaaa",
    madda_normal: "#537fff",
    madda_permissible: "#4050ff",
    madda_necessary: "#000ebc",
    qlq: "#db393f",
    madda_obligatory: "#2144c1",
    ikhf_shfw: "#cf43bd",
    ikhf: "#993ca5",
    idghm_shfw: "#58b800",
    iqlb: "#26bffd",
    idgh_ghn: "#169777",
    idgh_w_ghn: "#169200",
    idgh_mus: "#a1a1a1",
    ghn: "#ff7e1e",
  };

  static POCKET_QURAN_TAJWEED_COLOR_LABELS = {
    ham_wasl: "Hamzat ul Wasl",
    slnt: "Silent",
    laam_shamsiyah: "Lam Shamsiyyah",
    madda_normal: "Madda Normal",
    madda_permissible: "Madda Permissible",
    madda_necessary: "Madda Necessary",
    qlq: "Qalaqah",
    madda_obligatory: "Madda Obligatory",
    ikhf_shfw: "Ikhafa' Shafawi",
    ikhf: "Ikhafa'",
    idghm_shfw: "Idgham Shafawi",
    iqlb: "Iqlab",
    idgh_ghn: "Idgham (with Ghunnah)",
    idgh_w_ghn: "Idgham (without Ghunnah)",
    idgh_mus: "Idgham (Mutajanisayn/Mutaqaribayn)",
    ghn: "Ghunnah",
  };

  constructor(
    storage,
    prayerTimes,
    qibla,
    quotes,
    backgrounds,
    weather,
    flashcards,
    hadith,
    adhkar
  ) {
    this.storage = storage;
    this.prayerTimes = prayerTimes;
    this.qibla = qibla;
    this.quotes = quotes;
    this.backgrounds = backgrounds;
    this.weather = weather;
    this.flashcards = flashcards;
    this.hadith = hadith;
    this.adhkar = adhkar;

    // Modal elements
    this.modal = document.getElementById("settingsModal");
    this.settingsBtn = document.getElementById("settingsBtn");
    this.closeBtn = document.getElementById("settingsClose");
    this.saveBtn = document.getElementById("saveSettingsBtn");

    // Tabs
    this.tabs = document.querySelectorAll(".settings-tab");
    this.panels = document.querySelectorAll(".settings-panel");

    // Debug mode (gated)
    this.debugEnabled = globalThis.ENABLE_DEBUG_MODE === true;
    this.debugTab = document.getElementById("debugTab");
    this.debugPanel = document.getElementById("debugPanel");
    this.testNotificationBtn = document.getElementById("testNotificationBtn");
    this.applyDebugModeVisibility();

    // Location elements
    this.locationMethodRadios = document.querySelectorAll(
      'input[name="locationMethod"]'
    );
    this.manualLocationFields = document.getElementById("manualLocationFields");
    this.cityInput = document.getElementById("cityInput");
    this.latitudeInput = document.getElementById("latitudeInput");
    this.longitudeInput = document.getElementById("longitudeInput");
    this.searchCityBtn = document.getElementById("searchCityBtn");
    this.pasteCoordsBtn = document.getElementById("pasteCoordsBtn");
    this.citySearchResults = document.getElementById("citySearchResults");
    this.requestLocationBtn = document.getElementById("requestLocationBtn");

    // Prayer elements
    this.calculationMethod = document.getElementById("calculationMethod");
    this.customAnglesGroup = document.getElementById("customAnglesGroup");
    this.customFajrAngle = document.getElementById("customFajrAngle");
    this.customIshaAngle = document.getElementById("customIshaAngle");
    this.customIshaMinutes = document.getElementById("customIshaMinutes");
    this.asrMethod = document.getElementById("asrMethod");
    this.highLatMethod = document.getElementById("highLatMethod");
    this.midnightMethod = document.getElementById("midnightMethod");
    this.duhaOffset = document.getElementById("duhaOffset");

    // Prayer visibility checkboxes
    this.visibilityCheckboxes = {
      fajr: document.getElementById("showFajr"),
      sunrise: document.getElementById("showSunrise"),
      duha: document.getElementById("showDuha"),
      dhuhr: document.getElementById("showDhuhr"),
      asr: document.getElementById("showAsr"),
      maghrib: document.getElementById("showMaghrib"),
      isha: document.getElementById("showIsha"),
      midnight: document.getElementById("showMidnight"),
      qiyam: document.getElementById("showQiyam"),
    };

    // Prayer adjustment inputs
    this.adjustmentInputs = {
      fajr: document.getElementById("adjustFajr"),
      sunrise: document.getElementById("adjustSunrise"),
      duha: document.getElementById("adjustDuha"),
      dhuhr: document.getElementById("adjustDhuhr"),
      asr: document.getElementById("adjustAsr"),
      maghrib: document.getElementById("adjustMaghrib"),
      isha: document.getElementById("adjustIsha"),
      midnight: document.getElementById("adjustMidnight"),
      qiyam: document.getElementById("adjustQiyam"),
    };

    // Prayer notification controls
    this.enablePrayerNotifications = document.getElementById(
      "enablePrayerNotifications"
    );

    this.notificationCheckboxes = {
      fajr: document.getElementById("notifyFajr"),
      sunrise: document.getElementById("notifySunrise"),
      duha: document.getElementById("notifyDuha"),
      dhuhr: document.getElementById("notifyDhuhr"),
      asr: document.getElementById("notifyAsr"),
      maghrib: document.getElementById("notifyMaghrib"),
      isha: document.getElementById("notifyIsha"),
      midnight: document.getElementById("notifyMidnight"),
      qiyam: document.getElementById("notifyQiyam"),
    };

    this.notificationBeforeMinutesInputs = {
      fajr: document.getElementById("notifyFajrBeforeMinutes"),
      sunrise: document.getElementById("notifySunriseBeforeMinutes"),
      duha: document.getElementById("notifyDuhaBeforeMinutes"),
      dhuhr: document.getElementById("notifyDhuhrBeforeMinutes"),
      asr: document.getElementById("notifyAsrBeforeMinutes"),
      maghrib: document.getElementById("notifyMaghribBeforeMinutes"),
      isha: document.getElementById("notifyIshaBeforeMinutes"),
      midnight: document.getElementById("notifyMidnightBeforeMinutes"),
      qiyam: document.getElementById("notifyQiyamBeforeMinutes"),
    };

    this.notificationAfterMinutesInputs = {
      fajr: document.getElementById("notifyFajrAfterMinutes"),
      sunrise: document.getElementById("notifySunriseAfterMinutes"),
      duha: document.getElementById("notifyDuhaAfterMinutes"),
      dhuhr: document.getElementById("notifyDhuhrAfterMinutes"),
      asr: document.getElementById("notifyAsrAfterMinutes"),
      maghrib: document.getElementById("notifyMaghribAfterMinutes"),
      isha: document.getElementById("notifyIshaAfterMinutes"),
      midnight: document.getElementById("notifyMidnightAfterMinutes"),
      qiyam: document.getElementById("notifyQiyamAfterMinutes"),
    };

    // Quote elements
    this.useDefaultQuotes = document.getElementById("useDefaultQuotes");
    this.useUserQuotes = document.getElementById("useUserQuotes");
    this.newQuoteText = document.getElementById("newQuoteText");
    this.newQuoteSource = document.getElementById("newQuoteSource");
    this.newQuoteArabic = document.getElementById("newQuoteArabic");
    this.addQuoteBtn = document.getElementById("addQuoteBtn");

    // Background elements
    this.bgInterval = document.getElementById("bgInterval");
    this.bgIntervalCustom = document.getElementById("bgIntervalCustom");
    this.customIntervalGroup = document.getElementById("customIntervalGroup");
    this.bgCategory = document.getElementById("bgCategory");
    this.changeBackgroundBtn = document.getElementById("changeBackgroundBtn");
    this.customBgGroup = document.getElementById("customBgGroup");
    this.customBgList = document.getElementById("customBgList");
    this.customBgInput = document.getElementById("customBgInput");
    this.addCustomBgBtn = document.getElementById("addCustomBgBtn");
    this.customBgCount = document.getElementById("customBgCount");

    // General settings elements
    this.containerWidth = document.getElementById("containerWidth");
    this.containerWidthCustom = document.getElementById("containerWidthCustom");
    this.customWidthGroup = document.getElementById("customWidthGroup");
    this.customWidthValue = document.getElementById("customWidthValue");
    this.uiBlurPower = document.getElementById("uiBlurPower");
    this.uiBlurPowerValue = document.getElementById("uiBlurPowerValue");
    this.exportSettingsBtn = document.getElementById("exportSettingsBtn");
    this.fullExportBtn = document.getElementById("fullExportBtn");
    this.importSettingsBtn = document.getElementById("importSettingsBtn");
    this.importSettingsInput = document.getElementById("importSettingsInput");

    // General: reset buttons
    this.resetWholeSettingsBtn = document.getElementById(
      "resetWholeSettingsBtn"
    );
    this.nukeAllDataBtn = document.getElementById("nukeAllDataBtn");

    // General: refresh default content
    this.refreshDefaultDataBtn = document.getElementById(
      "refreshDefaultDataBtn"
    );

    // Reset/Nuke confirmation modal
    this.resetNukeConfirmModal = document.getElementById(
      "resetNukeConfirmModal"
    );
    this.resetNukeConfirmIcon = document.getElementById("resetNukeConfirmIcon");
    this.resetNukeConfirmTitle = document.getElementById(
      "resetNukeConfirmTitle"
    );
    this.resetNukeConfirmText = document.getElementById("resetNukeConfirmText");
    this.resetNukeCancelBtn = document.getElementById("resetNukeCancelBtn");
    this.resetNukeConfirmBtn = document.getElementById("resetNukeConfirmBtn");

    this._resetNukeConfirmResolve = null;

    // Themes panel elements
    this.themeModeButtons = document.querySelectorAll(".theme-mode-btn");
    this.themeGlassEnabled = document.getElementById("themeGlassEnabled");
    this.themeBlurPower = document.getElementById("themeBlurPower");
    this.themeBlurPowerValue = document.getElementById("themeBlurPowerValue");
    this.themeBlurGroup = document.getElementById("themeBlurGroup");
    this.themePickerGrid = document.getElementById("themePickerGrid");
    this.themeContainerWidth = document.getElementById("themeContainerWidth");
    this.themeContainerWidthCustom = document.getElementById(
      "themeContainerWidthCustom"
    );
    this.themeCustomWidthGroup = document.getElementById(
      "themeCustomWidthGroup"
    );
    this.themeCustomWidthValue = document.getElementById(
      "themeCustomWidthValue"
    );

    // Icon theme picker
    this.iconThemePicker = document.getElementById("iconThemePicker");

    // Custom searches import/export
    this.exportCustomSearchesBtn = document.getElementById(
      "exportCustomSearchesBtn"
    );
    this.importCustomSearchesBtn = document.getElementById(
      "importCustomSearchesBtn"
    );
    this.importCustomSearchesInput = document.getElementById(
      "importCustomSearchesInput"
    );

    // Method angles display
    this.methodAnglesInfo = document.getElementById("methodAnglesInfo");
    this.methodFajrAngle = document.getElementById("methodFajrAngle");
    this.methodIshaAngle = document.getElementById("methodIshaAngle");

    // Heading settings elements
    this.greetingTypeRadios = document.querySelectorAll(
      'input[name="greetingType"]'
    );
    this.customGreetingGroup = document.getElementById("customGreetingGroup");
    this.customGreetingInput = document.getElementById("customGreetingInput");
    this.timeGreetingGroup = document.getElementById("timeGreetingGroup");
    this.greetingMorning = document.getElementById("greetingMorning");
    this.greetingAfternoon = document.getElementById("greetingAfternoon");
    this.greetingEvening = document.getElementById("greetingEvening");
    this.greetingNight = document.getElementById("greetingNight");
    this.showClock = document.getElementById("showClock");
    this.clockFormatRadios = document.querySelectorAll(
      'input[name="clockFormat"]'
    );
    this.showSeconds = document.getElementById("showSeconds");
    this.showAmPm = document.getElementById("showAmPm");
    this.clockStyleRadios = document.querySelectorAll(
      'input[name="clockStyle"]'
    );
    this.showDate = document.getElementById("showDate");
    this.showIslamicEvents = document.getElementById("showIslamicEvents");
    this.dateFormatSelect = document.getElementById("dateFormatSelect");
    this.dateCalendarRadios = document.querySelectorAll(
      'input[name="dateCalendar"]'
    );

    // Component visibility elements
    this.visibilityHeader = document.getElementById("visibilityHeader");
    this.visibilityQuickPins = document.getElementById("visibilityQuickPins");
    this.visibilitySearchBar = document.getElementById("visibilitySearchBar");
    this.visibilityQuotes = document.getElementById("visibilityQuotes");
    this.visibilityPrayerTimes = document.getElementById(
      "visibilityPrayerTimes"
    );
    this.visibilityHijriCalendar = document.getElementById(
      "visibilityHijriCalendar"
    );
    this.visibilityQiblaDirection = document.getElementById(
      "visibilityQiblaDirection"
    );
    this.visibilityWeather = document.getElementById("visibilityWeather");
    this.visibilityLunarPhase = document.getElementById("visibilityLunarPhase");
    this.visibilityFasting = document.getElementById("visibilityFasting");
    this.visibilityFlashcards = document.getElementById("visibilityFlashcards");
    this.visibilityAdhkar = document.getElementById("visibilityAdhkar");
    this.visibilityHadith = document.getElementById("visibilityHadith");
    this.visibilityTodoList = document.getElementById("visibilityTodoList");
    this.visibilityNotes = document.getElementById("visibilityNotes");
    this.visibilityPocketQuran = document.getElementById(
      "visibilityPocketQuran"
    );
    this.weatherUnitRadios = document.querySelectorAll(
      'input[name="weatherUnit"]'
    );

    // Quote layout style element
    this.quoteLayoutStyleSelect = document.getElementById(
      "quoteLayoutStyleSelect"
    );

    // Compact weather elements
    this.compactWeatherEnabled = document.getElementById(
      "compactWeatherEnabled"
    );
    this.compactWeatherOptions = document.getElementById(
      "compactWeatherOptions"
    );
    this.compactWeatherModeRadios = document.querySelectorAll(
      'input[name="compactWeatherMode"]'
    );

    // Weather tab elements
    this.weatherLocationModeRadios = document.querySelectorAll(
      'input[name="weatherLocationMode"]'
    );
    this.weatherManualLocationFields = document.getElementById(
      "weatherManualLocationFields"
    );
    this.weatherCityInput = document.getElementById("weatherCityInput");
    this.weatherLatitudeInput = document.getElementById("weatherLatitudeInput");
    this.weatherLongitudeInput = document.getElementById(
      "weatherLongitudeInput"
    );
    this.weatherSearchCityBtn = document.getElementById("weatherSearchCityBtn");
    this.weatherPasteCoordsBtn = document.getElementById(
      "weatherPasteCoordsBtn"
    );
    this.weatherCitySearchResults = document.getElementById(
      "weatherCitySearchResults"
    );

    // Fasting Times tab elements
    this.fastingShowMonday = document.getElementById("fastingShowMonday");
    this.fastingShowThursday = document.getElementById("fastingShowThursday");
    this.fastingShowAyyamAlBeed = document.getElementById(
      "fastingShowAyyamAlBeed"
    );
    this.fastingShowDhuAlHijjah = document.getElementById(
      "fastingShowDhuAlHijjah"
    );
    this.fastingShowArafah = document.getElementById("fastingShowArafah");
    this.fastingShowRamadan = document.getElementById("fastingShowRamadan");
    this.fastingDhuAlHijjahWithinDays = document.getElementById(
      "fastingDhuAlHijjahWithinDays"
    );
    this.fastingArafahWithinDays = document.getElementById(
      "fastingArafahWithinDays"
    );
    this.fastingNotificationsEnabled = document.getElementById(
      "fastingNotificationsEnabled"
    );
    this.fastingNotificationMinutesBefore = document.getElementById(
      "fastingNotificationMinutesBefore"
    );
    this.fastingNotifyMonday = document.getElementById("fastingNotifyMonday");
    this.fastingNotifyThursday = document.getElementById(
      "fastingNotifyThursday"
    );
    this.fastingNotifyAyyamAlBeed = document.getElementById(
      "fastingNotifyAyyamAlBeed"
    );
    this.fastingNotifyDhuAlHijjah = document.getElementById(
      "fastingNotifyDhuAlHijjah"
    );
    this.fastingNotifyArafah = document.getElementById("fastingNotifyArafah");
    this.fastingNotifyRamadan = document.getElementById("fastingNotifyRamadan");
    this.fastingNotificationToggles = document.getElementById(
      "fastingNotificationToggles"
    );

    // Pinned Apps tab elements
    this.pinnedAppsPerRow = document.getElementById("pinnedAppsPerRow");
    this.pinnedAppsPerRowValue = document.getElementById(
      "pinnedAppsPerRowValue"
    );

    // Notes tab elements
    this.importNotesBtn = document.getElementById("importNotesBtn");
    this.exportNotesBtn = document.getElementById("exportNotesBtn");
    this.importNotesInput = document.getElementById("importNotesInput");
    this.notesCountHint = document.getElementById("notesCountHint");

    // Pocket Quran tab elements
    this.pocketQuranArabicSize = document.getElementById(
      "pocketQuranArabicSize"
    );
    this.pocketQuranArabicSizeValue = document.getElementById(
      "pocketQuranArabicSizeSettingValue"
    );
    this.pocketQuranTranslationSize = document.getElementById(
      "pocketQuranTranslationSize"
    );
    this.pocketQuranTranslationSizeValue = document.getElementById(
      "pocketQuranTranslationSizeSettingValue"
    );
    this.pocketQuranTranslationPickerBtn = document.getElementById(
      "pocketQuranTranslationPickerBtn"
    );
    this.pocketQuranTranslationPickerLabel = document.getElementById(
      "pocketQuranTranslationPickerLabel"
    );
    this.pocketQuranTranslationSelect = document.getElementById(
      "pocketQuranTranslationSelect"
    );

    this.pocketQuranTajweedColors = document.getElementById(
      "pocketQuranTajweedColors"
    );

    this.pocketQuranResetAllTajweedColorsBtn = document.getElementById(
      "pocketQuranResetAllTajweedColorsBtn"
    );

    // Pocket Quran bookmark elements
    this.pocketQuranExportBookmarksBtn = document.getElementById(
      "pocketQuranExportBookmarksBtn"
    );
    this.pocketQuranImportBookmarksBtn = document.getElementById(
      "pocketQuranImportBookmarksBtn"
    );
    this.pocketQuranImportBookmarksInput = document.getElementById(
      "pocketQuranImportBookmarksInput"
    );
    this.pocketQuranBookmarkStats = document.getElementById(
      "pocketQuranBookmarkStats"
    );
  }

  /**
   * Initialize settings
   */
  init() {
    this.loadSettings();
    this.setupEventListeners();
    this.updateMethodAnglesDisplay();
    this.renderCustomBackgrounds();

    this.updateNotesCountHint();
    this.updatePocketQuranBookmarkStats();

    // Initialize themes panel
    this.initThemesPanel();

    // Apply UI settings immediately (not only after Save)
    const settings = this.storage.getSettings();
    this.applyUiBlurPower(settings.uiBlurPower ?? 100);
  }

  /**
   * Load settings into form
   */
  loadSettings() {
    const settings = this.storage.getSettings();

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
      `input[name="locationMethod"][value="${settings.locationMethod}"]`
    );
    if (locationRadio) locationRadio.checked = true;
    this.toggleManualLocation(settings.locationMethod === "manual");

    if (this.cityInput) this.cityInput.value = settings.city || "";
    if (this.latitudeInput) this.latitudeInput.value = settings.latitude || "";
    if (this.longitudeInput)
      this.longitudeInput.value = settings.longitude || "";

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

    const defaultBeforeMinutes = this.clampNumber(
      parseInt(pn.beforeMinutes, 10),
      0,
      180,
      10
    );
    const defaultAfterMinutes = this.clampNumber(
      parseInt(pn.afterMinutes, 10),
      0,
      180,
      0
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
          ? this.clampNumber(
              parseInt(entry.beforeMinutes, 10),
              0,
              180,
              defaultBeforeMinutes
            )
          : defaultBeforeMinutes;
      const afterMinutes =
        entry && typeof entry === "object"
          ? this.clampNumber(
              parseInt(entry.afterMinutes, 10),
              0,
              180,
              defaultAfterMinutes
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
    }

    // Quote settings
    if (this.useDefaultQuotes)
      this.useDefaultQuotes.checked = settings.useDefaultQuotes;
    if (this.useUserQuotes) this.useUserQuotes.checked = settings.useUserQuotes;

    // Quote layout style
    const quoteLayoutStyle = settings.quoteLayoutStyle || "classic";
    if (this.quoteLayoutStyleSelect) {
      const hasOption = this.quoteLayoutStyleSelect.querySelector(
        `option[value="${quoteLayoutStyle}"]`
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
    if (this.bgCategory) this.bgCategory.value = settings.bgCategory;

    // Container width settings
    if (this.containerWidth) {
      this.containerWidth.value = settings.containerWidth || "narrow";
    }
    if (settings.containerWidth === "custom") {
      this.toggleCustomWidth(true);
      if (this.containerWidthCustom) {
        const clamped = this.clampNumber(
          settings.containerWidthCustom,
          20,
          98,
          70
        );
        this.containerWidthCustom.value = String(clamped);
      }
      this.updateCustomWidthLabel();
    } else {
      this.toggleCustomWidth(false);
    }

    // UI blur power
    if (this.uiBlurPower) {
      const clamped = this.clampNumber(settings.uiBlurPower, 0, 200, 100);
      this.uiBlurPower.value = String(clamped);
      this.updateUiBlurPowerLabel();
      this.applyUiBlurPower(clamped);
    }

    // Pinned Apps settings
    if (this.pinnedAppsPerRow) {
      const clamped = this.clampNumber(settings.pinnedAppsPerRow, 3, 20, 10);
      this.pinnedAppsPerRow.value = String(clamped);
      this.updatePinnedAppsPerRowLabel();
    }

    // Pocket Quran settings
    const pq = settings.pocketQuran || {};

    if (this.pocketQuranArabicSize) {
      const clamped = this.clampNumber(pq.arabicFontSize, 8, 144, 32);
      this.pocketQuranArabicSize.value = String(clamped);
      this.updatePocketQuranArabicSizeLabel();
    }

    if (this.pocketQuranTranslationSize) {
      const clamped = this.clampNumber(pq.translationFontSize, 8, 144, 18);
      this.pocketQuranTranslationSize.value = String(clamped);
      this.updatePocketQuranTranslationSizeLabel();
    }

    if (this.pocketQuranTranslationSelect) {
      const desired = parseInt(pq.translationResourceId, 10);
      const hasOption =
        Number.isFinite(desired) &&
        this.pocketQuranTranslationSelect.querySelector(
          `option[value="${desired}"]`
        );
      this.pocketQuranTranslationSelect.value = hasOption
        ? String(desired)
        : "85";
    }

    this.updatePocketQuranTranslationPickerLabel();

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
      `input[name="compactWeatherMode"][value="${compactWeatherMode}"]`
    );
    if (compactWeatherModeRadio) compactWeatherModeRadio.checked = true;

    // Load heading settings
    this.loadHeadingSettings(settings);

    // Load component visibility settings
    this.loadVisibilitySettings(settings);

    // Load weather settings
    this.loadWeatherSettings(settings);

    // Load fasting settings
    this.loadFastingSettings(settings);

    this.updateNotesCountHint();
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
    const clamped = this.clampNumber(
      parseInt(this.pocketQuranArabicSize.value, 10),
      8,
      144,
      32
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
    const clamped = this.clampNumber(
      parseInt(this.pocketQuranTranslationSize.value, 10),
      8,
      144,
      18
    );
    this.pocketQuranTranslationSize.value = String(clamped);
    this.pocketQuranTranslationSizeValue.textContent = `${clamped}px`;
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
            "success"
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
    const clamped = this.clampNumber(
      parseInt(this.pinnedAppsPerRow.value, 10),
      3,
      20,
      10
    );
    this.pinnedAppsPerRow.value = String(clamped);
    this.pinnedAppsPerRowValue.textContent = String(clamped);

    // Apply live change to the pinned apps grid width (for immediate preview)
    const grid = document.getElementById("pinnedAppsGrid");
    if (grid) {
      grid.style.setProperty("--pinned-apps-per-row", String(clamped));
    }
  }

  /**
   * Load heading settings
   */
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
      `input[name="greetingType"][value="${useCustom ? "custom" : "auto"}"]`
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
    if (this.showClock) this.showClock.checked = heading.showClock !== false;
    this.toggleClockOptions(heading.showClock !== false);

    const clockFormat = heading.clockFormat || "24h";
    const clockFormatRadio = document.querySelector(
      `input[name="clockFormat"][value="${clockFormat}"]`
    );
    if (clockFormatRadio) clockFormatRadio.checked = true;
    this.toggleAmPmOption(clockFormat === "12h");

    if (this.showSeconds)
      this.showSeconds.checked = heading.showSeconds !== false;
    if (this.showAmPm) this.showAmPm.checked = heading.showAmPm !== false;

    const clockStyle = heading.clockStyle || "default";
    const clockStyleRadio = document.querySelector(
      `input[name="clockStyle"][value="${clockStyle}"]`
    );
    if (clockStyleRadio) clockStyleRadio.checked = true;

    // Date settings
    if (this.showDate) this.showDate.checked = heading.showDate !== false;
    if (this.showIslamicEvents)
      this.showIslamicEvents.checked = heading.showIslamicEvents !== false;
    if (this.dateFormatSelect) {
      const normalizedDateFormat = normalizeHeadingDateFormat(
        heading.dateFormat || "full",
        heading.showWeekday
      );
      this.dateFormatSelect.value = normalizedDateFormat;
    }

    const dateCalendar = heading.dateCalendar || "hijri";
    const dateCalendarRadio = document.querySelector(
      `input[name="dateCalendar"][value="${dateCalendar}"]`
    );
    if (dateCalendarRadio) dateCalendarRadio.checked = true;
  }

  /**
   * Load component visibility settings
   */
  loadVisibilitySettings(settings) {
    const visibility = settings.componentVisibility || {};

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

  /**
   * Load weather settings
   */
  loadWeatherSettings(settings) {
    const weatherUnit = settings.weatherUnit || "celsius";
    const weatherUnitRadio = document.querySelector(
      `input[name="weatherUnit"][value="${weatherUnit}"]`
    );
    if (weatherUnitRadio) weatherUnitRadio.checked = true;

    const weatherLocationMode = settings.weatherLocationMode || "dashboard";
    const modeRadio = document.querySelector(
      `input[name="weatherLocationMode"][value="${weatherLocationMode}"]`
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

  /**
   * Load fasting settings
   */
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
    if (this.fastingShowDhuAlHijjah) {
      this.fastingShowDhuAlHijjah.checked = visibility.dhuAlHijjah !== false;
    }
    if (this.fastingShowArafah) {
      this.fastingShowArafah.checked = visibility.arafah !== false;
    }
    if (this.fastingShowRamadan) {
      this.fastingShowRamadan.checked = visibility.ramadan !== false;
    }

    // Within days settings
    if (this.fastingDhuAlHijjahWithinDays) {
      const clamped = this.clampNumber(
        fasting.dhuAlHijjahWithinDays,
        7,
        365,
        30
      );
      this.fastingDhuAlHijjahWithinDays.value = String(clamped);
    }
    if (this.fastingArafahWithinDays) {
      const clamped = this.clampNumber(fasting.arafahWithinDays, 7, 365, 30);
      this.fastingArafahWithinDays.value = String(clamped);
    }

    // Notification settings
    if (this.fastingNotificationsEnabled) {
      this.fastingNotificationsEnabled.checked = notifications.enabled === true;
      this.toggleFastingNotificationOptions(notifications.enabled === true);
    }
    if (this.fastingNotificationMinutesBefore) {
      const clamped = this.clampNumber(notifications.minutesBefore, 5, 180, 60);
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

  /**
   * Toggle fasting notification options visibility
   */
  toggleFastingNotificationOptions(show) {
    const offsetRow = document.getElementById("fastingNotificationOffset");
    const toggles = this.fastingNotificationToggles;
    if (offsetRow) {
      offsetRow.style.display = show ? "flex" : "none";
    }
    if (toggles) {
      toggles.style.display = show ? "block" : "none";
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
      this.weatherSearchCityBtn.textContent = "🔍 Searching...";
      this.weatherSearchCityBtn.disabled = true;
    }

    try {
      const results = await this.prayerTimes.searchCity(cityName);

      if (results && results.length > 0) {
        this._renderCitySearchResults(
          this.weatherCitySearchResults,
          results,
          (result) => {
            if (this.weatherCityInput)
              this.weatherCityInput.value = result.city;
            if (this.weatherLatitudeInput)
              this.weatherLatitudeInput.value = Number(result.latitude).toFixed(
                4
              );
            if (this.weatherLongitudeInput)
              this.weatherLongitudeInput.value = Number(
                result.longitude
              ).toFixed(4);

            const pickedLabel = result.fullName
              ? `${result.city} (${result.fullName})`
              : result.city;
            this.showToast(`Selected: ${pickedLabel}`, "success");
          }
        );
        this.showToast("Select a city from the list below.", "info");
      } else {
        this.showToast("City not found. Please try a different name.", "error");
      }
    } catch (error) {
      this.showToast("Search failed. Please try again.", "error");
    }

    if (this.weatherSearchCityBtn) {
      this.weatherSearchCityBtn.textContent = "🔍 Search City";
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
        /@\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/
      );
      if (atMatch) {
        const normalized = this._normalizeLatLng(atMatch[1], atMatch[2]);
        if (normalized) return normalized;
      }

      // Google Maps data format sometimes includes: !3dLAT!4dLNG
      const dataMatch = candidate.match(
        /!3d\s*(-?\d+(?:\.\d+)?)\s*!4d\s*(-?\d+(?:\.\d+)?)/
      );
      if (dataMatch) {
        const normalized = this._normalizeLatLng(dataMatch[1], dataMatch[2]);
        if (normalized) return normalized;
      }

      // Query params: q=lat,lng or ll=lat,lng or center=lat,lng
      const paramMatch = candidate.match(
        /[?&](?:q|query|ll|center)=\s*(-?\d+(?:\.\d+)?)(?:%2C|,|\s)+\s*(-?\d+(?:\.\d+)?)/i
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
      "Paste coordinates (e.g., -7.918300911805475, 112.60764545030851)"
    );
    return manual || "";
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
        "error"
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
        "error"
      );
      return;
    }

    this._applyLatLngToInputs(
      this.weatherLatitudeInput,
      this.weatherLongitudeInput,
      latLng
    );
    this.showToast("Coordinates pasted into Weather settings.", "success");
  }

  /**
   * Toggle custom greeting input visibility
   */
  toggleCustomGreeting(show) {
    if (this.customGreetingGroup) {
      this.customGreetingGroup.style.display = show ? "block" : "none";
    }
    if (this.timeGreetingGroup) {
      this.timeGreetingGroup.style.display = show ? "none" : "block";
    }
  }

  /**
   * Toggle clock options visibility
   */
  toggleClockOptions(show) {
    const clockOptionsGroup = document.getElementById("clockOptionsGroup");
    const clockExtraOptions = document.getElementById("clockExtraOptions");
    if (clockOptionsGroup)
      clockOptionsGroup.style.display = show ? "block" : "none";
    if (clockExtraOptions)
      clockExtraOptions.style.display = show ? "block" : "none";
  }

  /**
   * Toggle AM/PM option visibility
   */
  toggleAmPmOption(show) {
    const ampmOption = document.getElementById("ampmOption");
    if (ampmOption) ampmOption.style.display = show ? "flex" : "none";
  }

  /**
   * Toggle custom interval visibility
   */
  toggleCustomInterval(show) {
    if (this.customIntervalGroup) {
      this.customIntervalGroup.style.display = show ? "block" : "none";
    }
  }

  /**
   * Toggle compact weather options visibility
   */
  toggleCompactWeatherOptions(show) {
    if (this.compactWeatherOptions) {
      this.compactWeatherOptions.style.display = show ? "block" : "none";
    }
  }

  /**
   * Toggle custom width visibility
   */
  toggleCustomWidth(show) {
    if (this.customWidthGroup) {
      this.customWidthGroup.style.display = show ? "block" : "none";
    }
  }

  clampNumber(value, min, max, fallback) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(max, Math.max(min, numeric));
  }

  /**
   * Update custom width label
   */
  updateCustomWidthLabel() {
    if (this.customWidthValue && this.containerWidthCustom) {
      const clamped = this.clampNumber(
        parseInt(this.containerWidthCustom.value, 10),
        20,
        98,
        70
      );
      this.containerWidthCustom.value = String(clamped);
      this.customWidthValue.textContent = clamped + "%";
    }
  }

  updateUiBlurPowerLabel() {
    if (this.uiBlurPowerValue && this.uiBlurPower) {
      const clamped = this.clampNumber(
        parseInt(this.uiBlurPower.value, 10),
        0,
        200,
        100
      );
      this.uiBlurPower.value = String(clamped);
      this.uiBlurPowerValue.textContent = clamped + "%";
    }
  }

  applyUiBlurPower(powerPercent) {
    const clamped = this.clampNumber(powerPercent, 0, 200, 100);
    const multiplier = clamped / 100;
    document.documentElement.style.setProperty(
      "--ui-blur-multiplier",
      String(multiplier)
    );

    // Notify components that render UI outside their card's DOM subtree
    // (e.g., portalled dropdowns) to resync blur values.
    try {
      document.dispatchEvent(
        new CustomEvent("md:ui-blur-update", {
          detail: { multiplier },
        })
      );
    } catch (e) {}
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // THEMES PANEL METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize themes panel
   */
  initThemesPanel() {
    this.renderThemePickerGrid();
    this.loadThemePanelSettings();
    this.setupThemePanelEventListeners();
    this.setupIconThemePicker();

    // Listen for icon theme changes and update theme picker grid
    document.addEventListener("md:icon-theme-change", () => {
      this.renderThemePickerGrid();
    });
  }

  /**
   * Get icon based on current icon theme
   */
  _getIcon(emoji, options = {}) {
    if (window.dashboard?.iconThemes) {
      return window.dashboard.iconThemes.getIcon(emoji, options);
    }
    return emoji;
  }

  /**
   * Setup icon theme picker
   */
  setupIconThemePicker() {
    if (!this.iconThemePicker) return;

    // Load current icon theme setting
    const settings = this.storage.getSettings();
    const currentIconTheme = settings.iconTheme || "emoji";
    this.updateIconThemePickerState(currentIconTheme);

    // Add click handlers to icon theme cards
    this.iconThemePicker.addEventListener("click", (e) => {
      const card = e.target.closest(".icon-theme-card");
      if (!card) return;

      const themeId = card.dataset.iconTheme;
      if (!themeId) return;

      this.updateIconThemePickerState(themeId);

      // Apply icon theme immediately
      if (window.dashboard?.iconThemes) {
        window.dashboard.iconThemes.setTheme(themeId, true);
      }
    });
  }

  /**
   * Update icon theme picker active state
   */
  updateIconThemePickerState(activeTheme) {
    if (!this.iconThemePicker) return;

    const cards = this.iconThemePicker.querySelectorAll(".icon-theme-card");
    cards.forEach((card) => {
      const themeId = card.dataset.iconTheme;
      card.classList.toggle("active", themeId === activeTheme);
    });
  }

  /**
   * Load theme panel settings from storage
   */
  loadThemePanelSettings() {
    const settings = this.storage.getSettings();
    const themeSettings = settings.theme || {};

    // Load mode
    const mode = themeSettings.mode || "dark";
    this.updateThemeModeButtons(mode);

    // Load glass enabled
    const glassEnabled = themeSettings.glassEnabled !== false;
    if (this.themeGlassEnabled) {
      this.themeGlassEnabled.checked = glassEnabled;
    }
    this.updateThemeBlurGroupState(glassEnabled);

    // Load blur power
    const blurPower = this.clampNumber(settings.uiBlurPower, 0, 200, 100);
    if (this.themeBlurPower) {
      this.themeBlurPower.value = String(blurPower);
    }
    this.updateThemeBlurPowerLabel();

    // Load container width (now in Themes panel)
    if (this.themeContainerWidth) {
      this.themeContainerWidth.value = settings.containerWidth || "narrow";
    }
    if (settings.containerWidth === "custom") {
      this.toggleThemeCustomWidth(true);
      if (this.themeContainerWidthCustom) {
        const clamped = this.clampNumber(
          settings.containerWidthCustom,
          20,
          98,
          70
        );
        this.themeContainerWidthCustom.value = String(clamped);
      }
      this.updateThemeCustomWidthLabel();
    } else {
      this.toggleThemeCustomWidth(false);
    }

    // Highlight active theme
    const activeTheme = themeSettings.name || "emerald";
    this.updateThemePickerActiveState(activeTheme);
  }

  /**
   * Update theme mode buttons active state
   */
  updateThemeModeButtons(mode) {
    this.themeModeButtons.forEach((btn) => {
      const btnMode = btn.dataset.mode;
      btn.classList.toggle("active", btnMode === mode);
    });
  }

  /**
   * Update theme blur group visibility based on glass enabled
   */
  updateThemeBlurGroupState(glassEnabled) {
    if (this.themeBlurGroup) {
      this.themeBlurGroup.classList.toggle("disabled", !glassEnabled);
    }
  }

  /**
   * Update theme blur power label
   */
  updateThemeBlurPowerLabel() {
    if (this.themeBlurPowerValue && this.themeBlurPower) {
      const clamped = this.clampNumber(
        parseInt(this.themeBlurPower.value, 10),
        0,
        200,
        100
      );
      this.themeBlurPower.value = String(clamped);
      this.themeBlurPowerValue.textContent = clamped + "%";
    }
  }

  /**
   * Toggle theme custom width visibility
   */
  toggleThemeCustomWidth(show) {
    if (this.themeCustomWidthGroup) {
      this.themeCustomWidthGroup.style.display = show ? "block" : "none";
    }
  }

  /**
   * Update theme custom width label
   */
  updateThemeCustomWidthLabel() {
    if (this.themeCustomWidthValue && this.themeContainerWidthCustom) {
      const clamped = this.clampNumber(
        parseInt(this.themeContainerWidthCustom.value, 10),
        20,
        98,
        70
      );
      this.themeContainerWidthCustom.value = String(clamped);
      this.themeCustomWidthValue.textContent = clamped + "%";
    }
  }

  /**
   * Render the theme picker grid
   */
  renderThemePickerGrid() {
    if (!this.themePickerGrid || typeof ThemeManager === "undefined") return;

    const themes = ThemeManager.THEMES;
    const settings = this.storage.getSettings();
    const currentMode =
      window.dashboard?.themes?.getCurrentMode?.() ||
      settings.theme?.mode ||
      "dark";
    const activeTheme =
      window.dashboard?.themes?.getCurrentTheme?.() ||
      settings.theme?.name ||
      "emerald";

    let html = "";

    for (const [id, theme] of Object.entries(themes)) {
      const colors = theme[currentMode];
      const isActive = id === activeTheme;
      const isCustomizable = theme.customizable || false;

      const isPureTheme = id === "pureWhite" || id === "pureBlack";

      // For customizable themes, preview using the saved/custom palette (per theme + mode)
      const palette = isCustomizable
        ? window.dashboard?.themes?.getCustomPalette?.(id, currentMode) ||
          settings.theme?.customPalettes?.[id]?.[currentMode] ||
          null
        : null;

      const defaultBase =
        isCustomizable && isPureTheme
          ? ThemeManager.THEMES?.emerald?.[currentMode] || colors
          : colors;

      const previewPrimary = palette?.primary || defaultBase.primary;
      const previewAccent = palette?.accent || defaultBase.accent;
      const previewBg = palette?.bodyBg || defaultBase.bodyBg;

      html += `
        <div class="theme-card${isActive ? " active" : ""}${
        isCustomizable ? " customizable" : ""
      }" data-theme="${id}" data-customizable="${isCustomizable}">
          <div class="theme-card-preview">
            <div class="theme-preview-primary" style="background: ${previewPrimary}"></div>
            <div class="theme-preview-accent" style="background: ${previewAccent}"></div>
            <div class="theme-preview-bg" style="background: ${previewBg}"></div>
          </div>
          <div class="theme-card-header">
            <span class="theme-card-icon">${this._getIcon(theme.icon, {
              size: 20,
            })}</span>
            <span class="theme-card-name">${theme.name}</span>
          </div>
          <div class="theme-card-desc">${theme.description}</div>
          ${
            isCustomizable
              ? `<button class="theme-card-customize" type="button" title="Customize palette"><span aria-hidden="true">${this._getIcon(
                  "🎨",
                  { size: 16 }
                )}</span></button>`
              : ""
          }
          <div class="theme-card-check">✓</div>
        </div>
      `;
    }

    this.themePickerGrid.innerHTML = html;
  }

  openThemePaletteModal(themeName) {
    const overlay = document.getElementById("themePaletteModal");
    if (!overlay) return;

    const theme = ThemeManager.THEMES?.[themeName];
    if (!theme?.customizable) return;

    // Select the theme first so changes apply to dashboard immediately
    this.updateThemePickerActiveState(themeName);
    if (window.dashboard?.themes) {
      window.dashboard.themes.setTheme(themeName, false);
    }

    this._paletteModalTheme = themeName;
    this._paletteModalMode =
      window.dashboard?.themes?.getCurrentMode?.() || "dark";

    const resetBtn = document.getElementById("themePaletteResetDefaults");
    if (resetBtn) {
      const show = themeName === "pureWhite" || themeName === "pureBlack";
      resetBtn.style.display = show ? "inline-flex" : "none";
    }

    const title = document.getElementById("themePaletteModalTitle");
    if (title) {
      title.textContent = `🎨 Customize ${theme.name} Palette`;
    }

    this.updateThemePaletteModeButtons(this._paletteModalMode);
    this.syncThemePaletteModalInputs();

    overlay.classList.add("active");
    overlay.setAttribute("aria-hidden", "false");
  }

  closeThemePaletteModal() {
    const overlay = document.getElementById("themePaletteModal");
    if (!overlay) return;
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");
  }

  updateThemePaletteModeButtons(mode) {
    const darkBtn = document.getElementById("themePaletteModeDark");
    const lightBtn = document.getElementById("themePaletteModeLight");
    if (darkBtn) darkBtn.classList.toggle("active", mode === "dark");
    if (lightBtn) lightBtn.classList.toggle("active", mode === "light");
  }

  syncThemePaletteModalInputs() {
    const themeName = this._paletteModalTheme;
    const mode = this._paletteModalMode || "dark";
    if (!themeName) return;

    const primaryEl = document.getElementById("themePalettePrimary");
    const accentEl = document.getElementById("themePaletteAccent");
    const bgEl = document.getElementById("themePaletteBackground");
    const glassTintEl = document.getElementById("themePaletteGlassTint");
    if (!primaryEl || !accentEl || !bgEl || !glassTintEl) return;

    const isPureTheme = themeName === "pureWhite" || themeName === "pureBlack";
    const base = isPureTheme
      ? ThemeManager.THEMES?.emerald?.[mode]
      : ThemeManager.THEMES[themeName]?.[mode];
    if (!base) return;

    const palette =
      window.dashboard?.themes?.getCustomPalette?.(themeName, mode) || null;

    const defaultGlassTint = themeName === "pureBlack" ? "#000000" : "#ffffff";

    primaryEl.value = palette?.primary || base.primary;
    accentEl.value = palette?.accent || base.accent;
    bgEl.value = palette?.bodyBg || base.bodyBg;
    glassTintEl.value = palette?.glassTint || defaultGlassTint;
  }

  resetThemePaletteToDefaults(save = true) {
    const themeName = this._paletteModalTheme;
    const mode = this._paletteModalMode || "dark";
    if (!themeName || !window.dashboard?.themes) return;

    const isPureTheme = themeName === "pureWhite" || themeName === "pureBlack";
    if (!isPureTheme) return;

    const base = ThemeManager.THEMES?.emerald?.[mode];
    if (!base) return;

    const primaryEl = document.getElementById("themePalettePrimary");
    const accentEl = document.getElementById("themePaletteAccent");
    const bgEl = document.getElementById("themePaletteBackground");
    const glassTintEl = document.getElementById("themePaletteGlassTint");
    if (!primaryEl || !accentEl || !bgEl || !glassTintEl) return;

    primaryEl.value = base.primary;
    accentEl.value = base.accent;
    bgEl.value = base.bodyBg;
    glassTintEl.value = themeName === "pureBlack" ? "#000000" : "#ffffff";

    this.applyThemePaletteFromModal(save);
    this.renderThemePickerGrid();
  }

  applyThemePaletteFromModal(save = true) {
    const themeName = this._paletteModalTheme;
    const mode = this._paletteModalMode || "dark";
    if (!themeName || !window.dashboard?.themes) return;

    const primaryEl = document.getElementById("themePalettePrimary");
    const accentEl = document.getElementById("themePaletteAccent");
    const bgEl = document.getElementById("themePaletteBackground");
    const glassTintEl = document.getElementById("themePaletteGlassTint");
    if (!primaryEl || !accentEl || !bgEl || !glassTintEl) return;

    window.dashboard.themes.setCustomPalette(
      themeName,
      mode,
      {
        primary: primaryEl.value,
        accent: accentEl.value,
        bodyBg: bgEl.value,
        glassTint: glassTintEl.value,
      },
      save
    );

    this.renderThemePickerGrid();
  }

  /**
   * Update theme picker active state
   */
  updateThemePickerActiveState(activeTheme) {
    if (!this.themePickerGrid) return;

    const cards = this.themePickerGrid.querySelectorAll(".theme-card");
    cards.forEach((card) => {
      const themeName = card.dataset.theme;
      card.classList.toggle("active", themeName === activeTheme);
    });
  }

  /**
   * Setup theme panel event listeners
   */
  setupThemePanelEventListeners() {
    // Theme mode buttons
    this.themeModeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.mode;
        this.updateThemeModeButtons(mode);

        // Apply theme mode immediately
        if (window.dashboard?.themes) {
          window.dashboard.themes.setMode(mode, false);
        }

        // Re-render theme picker with new mode colors
        this.renderThemePickerGrid();
      });
    });

    // Glass enabled toggle
    if (this.themeGlassEnabled) {
      this.themeGlassEnabled.addEventListener("change", () => {
        const enabled = this.themeGlassEnabled.checked;
        this.updateThemeBlurGroupState(enabled);

        // Apply glass toggle immediately
        if (window.dashboard?.themes) {
          window.dashboard.themes.setGlassEnabled(enabled, false);
        }

        // Notify cards with "dashboard" blur state to update
        try {
          document.dispatchEvent(new CustomEvent("md:glass-setting-changed"));
        } catch (e) {}
      });
    }

    // Blur power slider
    if (this.themeBlurPower) {
      this.themeBlurPower.addEventListener("input", () => {
        this.updateThemeBlurPowerLabel();
        const power = parseInt(this.themeBlurPower.value, 10);
        this.applyUiBlurPower(power);
      });
    }

    // Theme picker cards
    if (this.themePickerGrid) {
      this.themePickerGrid.addEventListener("click", (e) => {
        // Check if clicking on customize button
        const customizeBtn = e.target.closest(".theme-card-customize");
        if (customizeBtn) {
          e.stopPropagation();
          const card = customizeBtn.closest(".theme-card");
          const themeName = card?.dataset?.theme;
          if (themeName) this.openThemePaletteModal(themeName);
          return;
        }

        const card = e.target.closest(".theme-card");
        if (!card) return;

        const themeName = card.dataset.theme;
        this.updateThemePickerActiveState(themeName);

        // Apply theme immediately
        if (window.dashboard?.themes) {
          window.dashboard.themes.setTheme(themeName, false);
        }

        // Re-render to update preview colors
        this.renderThemePickerGrid();
      });
    }

    // Theme palette modal event listeners
    const paletteOverlay = document.getElementById("themePaletteModal");
    const paletteClose = document.getElementById("themePaletteClose");
    const paletteDone = document.getElementById("themePaletteDone");
    const paletteReset = document.getElementById("themePaletteResetDefaults");
    const modeDark = document.getElementById("themePaletteModeDark");
    const modeLight = document.getElementById("themePaletteModeLight");
    const primaryEl = document.getElementById("themePalettePrimary");
    const accentEl = document.getElementById("themePaletteAccent");
    const bgEl = document.getElementById("themePaletteBackground");
    const glassTintEl = document.getElementById("themePaletteGlassTint");

    if (paletteOverlay) {
      paletteOverlay.addEventListener("click", (evt) => {
        if (evt.target === paletteOverlay) this.closeThemePaletteModal();
      });
    }
    if (paletteClose) {
      paletteClose.addEventListener("click", () =>
        this.closeThemePaletteModal()
      );
    }
    if (paletteDone) {
      paletteDone.addEventListener("click", () =>
        this.closeThemePaletteModal()
      );
    }
    if (paletteReset) {
      paletteReset.addEventListener("click", () =>
        this.resetThemePaletteToDefaults(true)
      );
    }
    if (modeDark) {
      modeDark.addEventListener("click", () => {
        this._paletteModalMode = "dark";
        this.updateThemePaletteModeButtons("dark");
        this.syncThemePaletteModalInputs();
      });
    }
    if (modeLight) {
      modeLight.addEventListener("click", () => {
        this._paletteModalMode = "light";
        this.updateThemePaletteModeButtons("light");
        this.syncThemePaletteModalInputs();
      });
    }

    const onPaletteInput = () => this.applyThemePaletteFromModal(true);
    if (primaryEl) primaryEl.addEventListener("input", onPaletteInput);
    if (accentEl) accentEl.addEventListener("input", onPaletteInput);
    if (bgEl) bgEl.addEventListener("input", onPaletteInput);
    if (glassTintEl) glassTintEl.addEventListener("input", onPaletteInput);

    // Container width (in Themes panel)
    if (this.themeContainerWidth) {
      this.themeContainerWidth.addEventListener("change", (e) => {
        this.toggleThemeCustomWidth(e.target.value === "custom");
        this.applyContainerWidth(
          e.target.value,
          parseInt(this.themeContainerWidthCustom?.value, 10) || 70
        );
      });
    }

    // Custom width slider (in Themes panel)
    if (this.themeContainerWidthCustom) {
      this.themeContainerWidthCustom.addEventListener("input", () => {
        this.updateThemeCustomWidthLabel();
        this.applyContainerWidth(
          this.themeContainerWidth?.value === "custom"
            ? "custom"
            : this.themeContainerWidth?.value,
          parseInt(this.themeContainerWidthCustom.value, 10)
        );
      });
    }
  }

  /**
   * Save theme settings
   */
  saveThemeSettings(settings) {
    // Get current mode from buttons
    let mode = "dark";
    this.themeModeButtons.forEach((btn) => {
      if (btn.classList.contains("active")) {
        mode = btn.dataset.mode;
      }
    });

    // Get glass enabled
    const glassEnabled = this.themeGlassEnabled?.checked !== false;

    // Get active theme
    let activeTheme = "emerald";
    const activeCard =
      this.themePickerGrid?.querySelector(".theme-card.active");
    if (activeCard) {
      activeTheme = activeCard.dataset.theme;
    }

    const customAccent = window.dashboard?.themes?.getCustomAccent?.() || null;
    const customPalettes =
      window.dashboard?.themes?.getCustomPalettes?.() ||
      settings.theme?.customPalettes ||
      {};

    // Save theme settings
    settings.theme = {
      name: activeTheme,
      mode: mode,
      glassEnabled: glassEnabled,
      customAccent: customAccent,
      customPalettes: customPalettes,
    };

    // Save blur power (now from Themes panel)
    settings.uiBlurPower = this.clampNumber(
      parseInt(this.themeBlurPower?.value, 10),
      0,
      200,
      100
    );

    // Save container width (now from Themes panel)
    settings.containerWidth = this.themeContainerWidth?.value || "narrow";
    if (settings.containerWidth === "custom") {
      settings.containerWidthCustom = this.clampNumber(
        parseInt(this.themeContainerWidthCustom?.value, 10),
        20,
        98,
        70
      );
    }

    // Apply theme manager settings
    if (window.dashboard?.themes) {
      window.dashboard.themes.setTheme(activeTheme, true);
      window.dashboard.themes.setMode(mode, true);
      window.dashboard.themes.setGlassEnabled(glassEnabled, true);
    }
  }

  /**
   * Update method angles display
   */
  updateMethodAnglesDisplay() {
    const method = this.calculationMethod?.value || "MWL";

    if (method === "Custom") {
      if (this.methodAnglesInfo) this.methodAnglesInfo.style.display = "none";
      return;
    }

    // Get method params from PrayTimes
    const prayTimes = new PrayTimes(method);
    const params = prayTimes.methods[method]?.params || { fajr: 18, isha: 17 };

    if (this.methodFajrAngle) {
      this.methodFajrAngle.textContent = params.fajr + "°";
    }
    if (this.methodIshaAngle) {
      const ishaValue =
        typeof params.isha === "string" ? params.isha : params.isha + "°";
      this.methodIshaAngle.textContent = ishaValue;
    }
    if (this.methodAnglesInfo) {
      this.methodAnglesInfo.style.display = "block";
    }
  }

  /**
   * Render custom backgrounds list
   */
  renderCustomBackgrounds() {
    const settings = this.storage.getSettings();
    const customBgs = settings.customBackgrounds || [];

    if (this.customBgList) {
      if (customBgs.length === 0) {
        this.customBgList.innerHTML =
          '<p class="empty-hint">No custom backgrounds added yet.</p>';
      } else {
        this.customBgList.innerHTML = customBgs
          .map(
            (bg, index) => `
          <div class="custom-bg-item" data-index="${index}">
            <img src="${bg}" alt="Background ${
              index + 1
            }" class="custom-bg-thumb" />
            <button class="custom-bg-remove" data-index="${index}" title="Remove">×</button>
          </div>
        `
          )
          .join("");

        // Bind remove events
        this.customBgList
          .querySelectorAll(".custom-bg-remove")
          .forEach((btn) => {
            btn.addEventListener("click", (e) => {
              e.preventDefault();
              const index = parseInt(btn.dataset.index);
              this.removeCustomBackground(index);
            });
          });
      }
    }

    if (this.customBgCount) {
      this.customBgCount.textContent = `${customBgs.length}/10`;
    }
  }

  /**
   * Add custom background
   */
  addCustomBackground(file) {
    const settings = this.storage.getSettings();
    const customBgs = settings.customBackgrounds || [];

    if (customBgs.length >= 10) {
      this.showToast("Maximum 10 custom backgrounds allowed", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;

      // Check size (limit to ~2MB per image after base64 encoding)
      if (base64.length > 2800000) {
        this.showToast("Image too large. Please use smaller images.", "error");
        return;
      }

      customBgs.push(base64);
      settings.customBackgrounds = customBgs;
      this.storage.saveSettings(settings);
      this.renderCustomBackgrounds();
      this.showToast("Background added!", "success");
    };
    reader.readAsDataURL(file);
  }

  /**
   * Remove custom background
   */
  removeCustomBackground(index) {
    const settings = this.storage.getSettings();
    const customBgs = settings.customBackgrounds || [];

    if (index >= 0 && index < customBgs.length) {
      customBgs.splice(index, 1);
      settings.customBackgrounds = customBgs;
      this.storage.saveSettings(settings);
      this.renderCustomBackgrounds();
      this.showToast("Background removed", "success");
    }
  }

  /**
   * Export all settings
   */
  exportAllSettings() {
    const settings = this.storage.getSettings();
    const todos = this.storage.getTodos();
    const userQuotes = this.storage.getUserQuotes();
    const pinnedApps = this.storage.getPinnedApps();
    const lastLocation = this.storage.getLastLocation();

    const notes = this.storage.getNotes
      ? this.storage.getNotes()
      : this.storage.get("notes", []);

    const notesActiveId = this.storage.get("notes_active", null);
    const notesPage = this.storage.get("notes_page", 1);

    const pocketQuranBookmarkCategories = this.storage.get(
      "pocketQuran_bookmarkCategories",
      []
    );
    const pocketQuranBookmarks = this.storage.get("pocketQuran_bookmarks", []);

    const customSearches = this.storage.getCustomSearches
      ? this.storage.getCustomSearches()
      : this.storage.get("customSearches", []);

    const customSearchLastId = this.storage.getLastCustomSearchId
      ? this.storage.getLastCustomSearchId()
      : this.storage.get("customSearchLastId", null);

    const exportData = {
      version: 2,
      exportDate: new Date().toISOString(),
      settings: settings,
      todos: todos,
      userQuotes: userQuotes,
      pinnedApps: pinnedApps,
      lastLocation: lastLocation,
      customSearches: Array.isArray(customSearches) ? customSearches : [],
      customSearchLastId: customSearchLastId ?? null,

      // Notes
      notes: Array.isArray(notes) ? notes : [],
      notesActiveId: notesActiveId ?? null,
      notesPage: Number.isFinite(Number(notesPage)) ? Number(notesPage) : 1,

      // Pocket Quran bookmarks
      pocketQuranBookmarks: {
        categories: Array.isArray(pocketQuranBookmarkCategories)
          ? pocketQuranBookmarkCategories
          : [],
        bookmarks: Array.isArray(pocketQuranBookmarks)
          ? pocketQuranBookmarks
          : [],
      },
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `muslim-dashboard-backup-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast("Settings exported successfully!", "success");
  }

  /**
   * Export custom searches only (Search Bar)
   */
  exportCustomSearches() {
    const searches = this.storage.getCustomSearches
      ? this.storage.getCustomSearches()
      : this.storage.get("customSearches", []);

    const lastId = this.storage.getLastCustomSearchId
      ? this.storage.getLastCustomSearchId()
      : this.storage.get("customSearchLastId", null);

    const exportData = {
      exportType: "customSearches",
      version: 1,
      exportDate: new Date().toISOString(),
      searches: Array.isArray(searches) ? searches : [],
      lastSelectedId: lastId ?? null,
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `muslim-dashboard-custom-searches-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast("Custom searches exported!", "success");
  }

  /**
   * Import custom searches only (Search Bar)
   */
  importCustomSearches(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      const searches = Array.isArray(data)
        ? data
        : Array.isArray(data?.searches)
        ? data.searches
        : null;

      if (!searches) {
        throw new Error(
          "Invalid format: expected an array or { searches: [] }"
        );
      }

      const valid = searches
        .filter(
          (s) =>
            s &&
            typeof s.name === "string" &&
            s.name.trim() !== "" &&
            typeof s.url === "string" &&
            s.url.trim() !== ""
        )
        .map((s) => ({
          id: s.id ?? Date.now() + Math.random(),
          name: String(s.name).trim().slice(0, 40),
          url: String(s.url).trim(),
          favicon: typeof s.favicon === "string" ? s.favicon : null,
        }));

      if (this.storage.saveCustomSearches) {
        this.storage.saveCustomSearches(valid);
      } else {
        this.storage.set("customSearches", valid);
      }

      const incomingLast = data?.lastSelectedId ?? null;
      if (this.storage.saveLastCustomSearchId) {
        this.storage.saveLastCustomSearchId(incomingLast);
      } else {
        this.storage.set("customSearchLastId", incomingLast);
      }

      this.showToast("Custom searches imported! Reloading...", "success");
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      this.showToast("Import failed: " + e.message, "error");
    }
  }

  /**
   * Export custom content (Flashcards sets, Custom backgrounds, Custom quotes)
   */
  exportFullExport() {
    // Base payload = same as "Export Settings" (so Full Export is a strict superset)
    const settings = this.storage.getSettings();
    const todos = this.storage.getTodos();
    const userQuotes = this.storage.getUserQuotes();
    const pinnedApps = this.storage.getPinnedApps();
    const lastLocation = this.storage.getLastLocation();

    const customSearches = this.storage.getCustomSearches
      ? this.storage.getCustomSearches()
      : this.storage.get("customSearches", []);

    const customSearchLastId = this.storage.getLastCustomSearchId
      ? this.storage.getLastCustomSearchId()
      : this.storage.get("customSearchLastId", null);

    const notes = this.storage.getNotes
      ? this.storage.getNotes()
      : this.storage.get("notes", []);
    const notesActiveId = this.storage.get("notes_active", null);
    const notesPage = this.storage.get("notes_page", 1);

    const pocketQuranBookmarkCategories = this.storage.get(
      "pocketQuran_bookmarkCategories",
      []
    );
    const pocketQuranBookmarks = this.storage.get("pocketQuran_bookmarks", []);

    let stickyNotes = [];
    let stickyNotesVisible = null;
    try {
      const rawSticky = localStorage.getItem("stickyNotes");
      stickyNotes = rawSticky ? JSON.parse(rawSticky) : [];
    } catch (e) {
      stickyNotes = [];
    }
    try {
      stickyNotesVisible = localStorage.getItem("stickyNotesVisible");
    } catch (e) {
      stickyNotesVisible = null;
    }

    // Extra payload = custom content not covered by settings export (custom flashcard sets)
    const customBackgrounds = Array.isArray(settings.customBackgrounds)
      ? settings.customBackgrounds
      : [];

    const sets = this.flashcards?.getSets
      ? this.flashcards.getSets()
      : this.storage.get("flashcardSets", []);

    const protectedIds =
      typeof FlashcardManager !== "undefined" &&
      Array.isArray(FlashcardManager.PROTECTED_SET_IDS)
        ? FlashcardManager.PROTECTED_SET_IDS
        : ["default"];

    const customSets = (Array.isArray(sets) ? sets : [])
      .filter((s) => s && s.id && !protectedIds.includes(s.id))
      .map((s) => ({
        id: String(s.id),
        name: String(s.name || "Imported").slice(0, 40),
        createdAt: s.createdAt || null,
        updatedAt: s.updatedAt || null,
        cards: Array.isArray(s.cards)
          ? s.cards
              .filter((c) => c && (c.question || c.answer))
              .map((c) => ({
                question: String(c.question || ""),
                answer: String(c.answer || ""),
              }))
          : [],
      }));

    // Adhkar custom sets (JSON)
    const adhkarSets = this.adhkar?.getSets
      ? this.adhkar.getSets()
      : this.storage.get("adhkarSets", []);

    const adhkarProtectedIds =
      typeof AdhkarManager !== "undefined" &&
      Array.isArray(AdhkarManager.PROTECTED_SET_IDS)
        ? AdhkarManager.PROTECTED_SET_IDS
        : [
            "default_adhkar_morning",
            "default_adhkar_evening",
            "default_adhkar_general",
          ];

    const customAdhkarSets = (Array.isArray(adhkarSets) ? adhkarSets : [])
      .filter((s) => s && s.id && !adhkarProtectedIds.includes(s.id))
      .map((s) => ({
        id: String(s.id),
        name: String(s.name || "Imported").slice(0, 40),
        createdAt: s.createdAt || null,
        updatedAt: s.updatedAt || null,
        cards: Array.isArray(s.cards)
          ? s.cards
              .filter(
                (c) =>
                  c &&
                  (c.arabic ||
                    c.romanization ||
                    c.english ||
                    c.title ||
                    c.reference)
              )
              .map((c) => ({
                title: String(c.title || ""),
                arabic: String(c.arabic || ""),
                romanization: String(c.romanization || ""),
                english: String(c.english || ""),
                reference: String(c.reference || ""),
                repeat:
                  Number.isFinite(parseInt(c.repeat, 10)) &&
                  parseInt(c.repeat, 10) > 0
                    ? parseInt(c.repeat, 10)
                    : 1,
              }))
          : [],
      }));

    const exportData = {
      exportType: "full",
      version: 2,
      exportDate: new Date().toISOString(),
      settings,
      todos,
      userQuotes: Array.isArray(userQuotes) ? userQuotes : [],
      pinnedApps,
      lastLocation,

      // Search Bar
      customSearches: Array.isArray(customSearches) ? customSearches : [],
      customSearchLastId: customSearchLastId ?? null,

      // Notes
      notes: Array.isArray(notes) ? notes : [],
      notesActiveId: notesActiveId ?? null,
      notesPage: Number.isFinite(Number(notesPage)) ? Number(notesPage) : 1,

      // Pocket Quran bookmarks
      pocketQuranBookmarks: {
        categories: Array.isArray(pocketQuranBookmarkCategories)
          ? pocketQuranBookmarkCategories
          : [],
        bookmarks: Array.isArray(pocketQuranBookmarks)
          ? pocketQuranBookmarks
          : [],
      },

      // Additive / full-export-only fields
      flashcards: {
        activeSetId:
          this.flashcards?.getActiveSetId?.() ||
          settings.flashcards?.activeSetId ||
          null,
        sets: customSets,
      },

      adhkar: {
        activeSetId:
          this.adhkar?.getActiveSetId?.() ||
          settings.adhkar?.activeSetId ||
          null,
        sets: customAdhkarSets,
      },

      // Kept for clarity/backward-compat (also included within settings.customBackgrounds)
      customBackgrounds,

      // Sticky Notes (not prefixed under StorageManager)
      stickyNotes: {
        notes: Array.isArray(stickyNotes) ? stickyNotes : [],
        visible:
          stickyNotesVisible === null ? null : stickyNotesVisible !== "false",
      },
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `muslim-dashboard-full-export-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast("Full export created!", "success");
  }

  importFullExport(data) {
    const maxSets =
      typeof FlashcardManager !== "undefined" &&
      typeof FlashcardManager.MAX_SETS === "number"
        ? FlashcardManager.MAX_SETS
        : 10;

    // Import base payload (same shape as normal settings export)
    if (data.settings) {
      this.storage.saveSettings(data.settings);
    }

    if (data.todos) {
      this.storage.saveTodos(data.todos);
    }

    if (data.pinnedApps) {
      this.storage.savePinnedApps(data.pinnedApps);
    }

    if (data.lastLocation) {
      this.storage.saveLastLocation(data.lastLocation);
    }

    if (Array.isArray(data.customSearches)) {
      if (this.storage.saveCustomSearches) {
        this.storage.saveCustomSearches(data.customSearches);
      } else {
        this.storage.set("customSearches", data.customSearches);
      }
    }

    if ("customSearchLastId" in (data || {})) {
      if (this.storage.saveLastCustomSearchId) {
        this.storage.saveLastCustomSearchId(data.customSearchLastId ?? null);
      } else {
        this.storage.set("customSearchLastId", data.customSearchLastId ?? null);
      }
    }

    // Notes (replace)
    if (Array.isArray(data.notes)) {
      if (this.storage.saveNotes) this.storage.saveNotes(data.notes);
      else this.storage.set("notes", data.notes);
    }
    if ("notesActiveId" in (data || {})) {
      this.storage.set("notes_active", data.notesActiveId ?? null);
    }
    if ("notesPage" in (data || {})) {
      const n = parseInt(data.notesPage, 10);
      this.storage.set("notes_page", Number.isFinite(n) && n > 0 ? n : 1);
    }

    // Pocket Quran bookmarks (replace)
    if (
      data.pocketQuranBookmarks &&
      typeof data.pocketQuranBookmarks === "object"
    ) {
      const cats = data.pocketQuranBookmarks.categories;
      const bms = data.pocketQuranBookmarks.bookmarks;
      if (Array.isArray(cats))
        this.storage.set("pocketQuran_bookmarkCategories", cats);
      if (Array.isArray(bms)) this.storage.set("pocketQuran_bookmarks", bms);
    }

    // Sticky notes (replace)
    if (data.stickyNotes && typeof data.stickyNotes === "object") {
      try {
        const incomingNotes = Array.isArray(data.stickyNotes.notes)
          ? data.stickyNotes.notes
          : [];
        localStorage.setItem("stickyNotes", JSON.stringify(incomingNotes));
      } catch (e) {
        // ignore
      }
      try {
        if (typeof data.stickyNotes.visible === "boolean") {
          localStorage.setItem(
            "stickyNotesVisible",
            String(data.stickyNotes.visible)
          );
        }
      } catch (e) {
        // ignore
      }
    }

    // Continue with a fresh settings object so we can safely patch fields below.
    const settings = this.storage.getSettings();

    // Backgrounds (full export supports overriding these explicitly)
    if (Array.isArray(data.customBackgrounds)) {
      const filtered = data.customBackgrounds
        .filter((x) => typeof x === "string" && x.startsWith("data:image"))
        .slice(0, 10);
      settings.customBackgrounds = filtered;
    }

    // Quotes (replace)
    if (Array.isArray(data.userQuotes)) {
      const validQuotes = data.userQuotes
        .filter((q) => q && typeof q.text === "string" && q.text.trim() !== "")
        .map((q) => ({
          id: q.id || Date.now() + Math.random(),
          text: String(q.text),
          source: String(q.source || ""),
          isArabic: !!q.isArabic,
        }));
      this.storage.saveUserQuotes(validQuotes);
    }

    // Flashcards (replace custom sets, keep default)
    const existingSets = this.storage.get("flashcardSets", []);

    const protectedIds =
      typeof FlashcardManager !== "undefined" &&
      Array.isArray(FlashcardManager.PROTECTED_SET_IDS)
        ? FlashcardManager.PROTECTED_SET_IDS
        : ["default"];

    const defaultDefs = Array.isArray(FlashcardManager.DEFAULT_SETS)
      ? FlashcardManager.DEFAULT_SETS
      : [{ id: "default", name: "Default" }];

    const protectedSetsOrdered = defaultDefs.map((def) => {
      const existing = Array.isArray(existingSets)
        ? existingSets.find((s) => s && s.id === def.id)
        : null;
      if (existing) return existing;
      return {
        id: def.id,
        name: def.name || "Default",
        createdAt: new Date().toISOString(),
        cards: [],
      };
    });

    const incomingSetsRaw =
      data.flashcards?.sets || data.flashcardSets || data.flashcards || [];
    const incomingSets = Array.isArray(incomingSetsRaw) ? incomingSetsRaw : [];

    const cleanedCustomSets = incomingSets
      .filter((s) => s && s.id && !protectedIds.includes(s.id))
      .map((s, i) => ({
        id: String(s.id || `set_${Date.now()}_${i}`),
        name: String(s.name || "Imported").slice(0, 40),
        createdAt: s.createdAt || new Date().toISOString(),
        updatedAt: s.updatedAt || null,
        cards: Array.isArray(s.cards)
          ? s.cards
              .filter((c) => c && (c.question || c.answer))
              .map((c) => ({
                question: String(c.question || ""),
                answer: String(c.answer || ""),
              }))
          : [],
      }))
      .slice(0, Math.max(0, maxSets - protectedSetsOrdered.length));

    // Prepend protected default sets in their canonical order and truncate to maxSets
    this.storage.set(
      "flashcardSets",
      [...protectedSetsOrdered, ...cleanedCustomSets].slice(0, maxSets)
    );

    // Flashcards active set (optional)
    const incomingActiveSetId = data.flashcards?.activeSetId;
    if (
      incomingActiveSetId &&
      typeof incomingActiveSetId === "string" &&
      (protectedIds.includes(incomingActiveSetId) ||
        cleanedCustomSets.some((s) => s.id === incomingActiveSetId))
    ) {
      settings.flashcards = {
        ...(settings.flashcards || {}),
        activeSetId: incomingActiveSetId,
      };
    } else {
      settings.flashcards = {
        ...(settings.flashcards || {}),
        activeSetId: protectedSetsOrdered[0]?.id || "default",
      };
    }

    // Adhkar (replace custom sets; keep existing protected defaults if present;
    // missing defaults will be restored by AdhkarManager.ensureDefaultSets on reload)
    const maxAdhkarSets =
      typeof AdhkarManager !== "undefined" &&
      typeof AdhkarManager.MAX_SETS === "number"
        ? AdhkarManager.MAX_SETS
        : 100;

    const existingAdhkarSets = this.storage.get("adhkarSets", []);

    const adhkarProtectedIds =
      typeof AdhkarManager !== "undefined" &&
      Array.isArray(AdhkarManager.PROTECTED_SET_IDS)
        ? AdhkarManager.PROTECTED_SET_IDS
        : [
            "default_adhkar_morning",
            "default_adhkar_evening",
            "default_adhkar_general",
          ];

    const adhkarDefaultDefs =
      typeof AdhkarManager !== "undefined" &&
      Array.isArray(AdhkarManager.DEFAULT_SETS)
        ? AdhkarManager.DEFAULT_SETS
        : [];

    const keptProtectedAdhkarSets = adhkarDefaultDefs.length
      ? adhkarDefaultDefs
          .map((def) =>
            (Array.isArray(existingAdhkarSets) ? existingAdhkarSets : []).find(
              (s) => s && s.id === def.id
            )
          )
          .filter(Boolean)
      : (Array.isArray(existingAdhkarSets) ? existingAdhkarSets : []).filter(
          (s) => s && s.id && adhkarProtectedIds.includes(s.id)
        );

    const incomingAdhkarSetsRaw =
      data.adhkar?.sets ||
      data.adhkarSets ||
      (Array.isArray(data.adhkar) ? data.adhkar : []);
    const incomingAdhkarSets = Array.isArray(incomingAdhkarSetsRaw)
      ? incomingAdhkarSetsRaw
      : [];

    const cleanedCustomAdhkarSets = incomingAdhkarSets
      .filter((s) => s && s.id && !adhkarProtectedIds.includes(s.id))
      .map((s, i) => ({
        id: String(s.id || `set_${Date.now()}_${i}`),
        name: String(s.name || "Imported").slice(0, 40),
        createdAt: s.createdAt || new Date().toISOString(),
        updatedAt: s.updatedAt || null,
        cards: Array.isArray(s.cards)
          ? s.cards
              .filter(
                (c) =>
                  c &&
                  (c.arabic ||
                    c.romanization ||
                    c.english ||
                    c.title ||
                    c.reference)
              )
              .map((c) => ({
                title: String(c.title || ""),
                arabic: String(c.arabic || ""),
                romanization: String(c.romanization || ""),
                english: String(c.english || ""),
                reference: String(c.reference || ""),
                repeat: (() => {
                  const n = parseInt(c.repeat, 10);
                  return Number.isFinite(n) && n > 0 ? Math.min(n, 9999) : 1;
                })(),
              }))
          : [],
      }))
      .slice(0, Math.max(0, maxAdhkarSets - keptProtectedAdhkarSets.length));

    const mergedAdhkarSets = [
      ...keptProtectedAdhkarSets,
      ...cleanedCustomAdhkarSets,
    ].slice(0, maxAdhkarSets);
    this.storage.set("adhkarSets", mergedAdhkarSets);

    const incomingAdhkarActiveSetId = data.adhkar?.activeSetId;
    const validActiveAdhkarId =
      typeof incomingAdhkarActiveSetId === "string" &&
      mergedAdhkarSets.some((s) => s && s.id === incomingAdhkarActiveSetId)
        ? incomingAdhkarActiveSetId
        : mergedAdhkarSets[0]?.id || null;

    settings.adhkar = {
      ...(settings.adhkar || {}),
      activeSetId: validActiveAdhkarId,
    };

    this.storage.saveSettings(settings);
  }

  /**
   * Import all settings
   */
  importAllSettings(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      // Full export import
      if (data && data.exportType === "full") {
        this.importFullExport(data);
        this.showToast("Full export imported! Reloading...", "success");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
        return;
      }

      if (!data.version || !data.settings) {
        throw new Error("Invalid backup file format");
      }

      // Import settings
      if (data.settings) {
        this.storage.saveSettings(data.settings);
      }

      // Import todos
      if (data.todos) {
        this.storage.saveTodos(data.todos);
      }

      // Import user quotes
      if (data.userQuotes) {
        this.storage.saveUserQuotes(data.userQuotes);
      }

      // Import pinned apps
      if (data.pinnedApps) {
        this.storage.savePinnedApps(data.pinnedApps);
      }

      // Import last location
      if (data.lastLocation) {
        this.storage.saveLastLocation(data.lastLocation);
      }

      // Import custom searches
      if (Array.isArray(data.customSearches)) {
        if (this.storage.saveCustomSearches) {
          this.storage.saveCustomSearches(data.customSearches);
        } else {
          this.storage.set("customSearches", data.customSearches);
        }
      }

      if ("customSearchLastId" in (data || {})) {
        if (this.storage.saveLastCustomSearchId) {
          this.storage.saveLastCustomSearchId(data.customSearchLastId ?? null);
        } else {
          this.storage.set(
            "customSearchLastId",
            data.customSearchLastId ?? null
          );
        }
      }

      // Import notes
      if (Array.isArray(data.notes)) {
        if (this.storage.saveNotes) this.storage.saveNotes(data.notes);
        else this.storage.set("notes", data.notes);
      }
      if ("notesActiveId" in (data || {})) {
        this.storage.set("notes_active", data.notesActiveId ?? null);
      }
      if ("notesPage" in (data || {})) {
        const n = parseInt(data.notesPage, 10);
        this.storage.set("notes_page", Number.isFinite(n) && n > 0 ? n : 1);
      }

      // Import Pocket Quran bookmarks
      if (
        data.pocketQuranBookmarks &&
        typeof data.pocketQuranBookmarks === "object"
      ) {
        const cats = data.pocketQuranBookmarks.categories;
        const bms = data.pocketQuranBookmarks.bookmarks;
        if (Array.isArray(cats))
          this.storage.set("pocketQuran_bookmarkCategories", cats);
        if (Array.isArray(bms)) this.storage.set("pocketQuran_bookmarks", bms);
      }

      this.showToast("Settings imported! Reloading...", "success");

      // Reload page to apply all settings
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      this.showToast("Import failed: " + e.message, "error");
    }
  }

  /**
   * Save settings
   */
  saveSettings() {
    // Ensure floating mode geometry/state is persisted before we snapshot settings
    try {
      if (window.dashboard && window.dashboard.floating) {
        window.dashboard.floating.flushAll();
      }
    } catch (e) {
      // ignore
    }

    const settings = this.storage.getSettings();

    // Location settings
    const locationRadio = document.querySelector(
      'input[name="locationMethod"]:checked'
    );
    if (locationRadio) settings.locationMethod = locationRadio.value;
    settings.city = this.cityInput?.value || "";
    settings.latitude = parseFloat(this.latitudeInput?.value) || null;
    settings.longitude = parseFloat(this.longitudeInput?.value) || null;

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

    const existingBeforeMinutes = this.clampNumber(
      settings.prayerNotifications.beforeMinutes,
      0,
      180,
      10
    );
    const existingAfterMinutes = this.clampNumber(
      settings.prayerNotifications.afterMinutes,
      0,
      180,
      0
    );

    settings.prayerNotifications.enabled =
      this.enablePrayerNotifications?.checked || false;

    // Keep global defaults for backward compatibility / future fallbacks.
    settings.prayerNotifications.beforeMinutes = existingBeforeMinutes;
    settings.prayerNotifications.afterMinutes = existingAfterMinutes;

    settings.prayerNotifications.perPrayer = {};
    for (const prayer in this.notificationCheckboxes) {
      const enabled = this.notificationCheckboxes[prayer]?.checked || false;

      const beforeMinutes = this.clampNumber(
        parseInt(this.notificationBeforeMinutesInputs?.[prayer]?.value, 10),
        0,
        180,
        existingBeforeMinutes
      );
      const afterMinutes = this.clampNumber(
        parseInt(this.notificationAfterMinutesInputs?.[prayer]?.value, 10),
        0,
        180,
        existingAfterMinutes
      );

      settings.prayerNotifications.perPrayer[prayer] = {
        enabled,
        beforeMinutes,
        afterMinutes,
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
      'input[name="compactWeatherMode"]:checked'
    );
    settings.compactWeatherMode = compactWeatherModeRadio?.value || "simple";

    // Background settings
    const bgIntervalValue = this.bgInterval?.value;
    if (bgIntervalValue === "custom") {
      settings.bgInterval = "custom";
      settings.bgIntervalCustom = parseInt(this.bgIntervalCustom?.value) || 60;
    } else {
      settings.bgInterval = parseInt(bgIntervalValue) || 60;
      settings.bgIntervalCustom = null;
    }
    settings.bgCategory = this.bgCategory?.value || "nature";

    // Theme settings (container width, blur power, and theme selection are now in Themes panel)
    this.saveThemeSettings(settings);

    // Pinned Apps per-row
    settings.pinnedAppsPerRow = this.clampNumber(
      parseInt(this.pinnedAppsPerRow?.value, 10),
      3,
      20,
      10
    );

    // Pocket Quran settings
    const existingPocketQuran =
      settings.pocketQuran && typeof settings.pocketQuran === "object"
        ? settings.pocketQuran
        : {};

    settings.pocketQuran = {
      ...existingPocketQuran,
      arabicFontSize: this.clampNumber(
        parseInt(this.pocketQuranArabicSize?.value, 10),
        8,
        144,
        existingPocketQuran.arabicFontSize ?? 32
      ),
      translationFontSize: this.clampNumber(
        parseInt(this.pocketQuranTranslationSize?.value, 10),
        8,
        144,
        existingPocketQuran.translationFontSize ?? 18
      ),
      translationResourceId: this.clampNumber(
        parseInt(this.pocketQuranTranslationSelect?.value, 10),
        1,
        10000,
        existingPocketQuran.translationResourceId ?? 85
      ),
    };

    // Save heading settings
    this.saveHeadingSettings(settings);

    // Save component visibility settings
    this.saveVisibilitySettings(settings);

    // Save weather settings
    this.saveWeatherSettings(settings);

    // Save fasting settings
    this.saveFastingSettings(settings);

    // Save to storage
    this.storage.saveSettings(settings);

    // Apply immediate preview (if dashboard exists)
    if (
      window.dashboard &&
      typeof window.dashboard.applyComponentVisibility === "function"
    ) {
      try {
        window.dashboard.applyComponentVisibility();
      } catch (e) {
        // ignore
      }
    }

    // Apply changes (may reload)
    this.applySettings(settings);

    // Show confirmation
    this.showToast("Settings saved successfully!", "success");

    // Close modal
    this.closeModal();
  }

  /**
   * Save heading settings
   */
  saveHeadingSettings(settings) {
    const greetingTypeRadio = document.querySelector(
      'input[name="greetingType"]:checked'
    );
    const useCustomGreeting = greetingTypeRadio?.value === "custom";

    settings.heading = settings.heading || {};
    settings.heading.useCustomGreeting = useCustomGreeting;
    settings.heading.customGreeting = this.customGreetingInput?.value || "";

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
      'input[name="clockFormat"]:checked'
    );
    settings.heading.clockFormat = clockFormatRadio?.value || "24h";
    settings.heading.showSeconds = this.showSeconds?.checked ?? true;
    settings.heading.showAmPm = this.showAmPm?.checked ?? true;
    const clockStyleRadio = document.querySelector(
      'input[name="clockStyle"]:checked'
    );
    settings.heading.clockStyle = clockStyleRadio?.value || "default";

    // Date settings
    settings.heading.showDate = this.showDate?.checked ?? true;
    settings.heading.showIslamicEvents =
      this.showIslamicEvents?.checked ?? true;
    settings.heading.dateFormat =
      this.dateFormatSelect?.value || "full-weekday";
    const dateCalendarRadio = document.querySelector(
      'input[name="dateCalendar"]:checked'
    );
    settings.heading.dateCalendar = dateCalendarRadio?.value || "hijri";
  }

  /**
   * Save component visibility settings
   */
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

  /**
   * Save weather settings
   */
  saveWeatherSettings(settings) {
    const weatherUnitRadio = document.querySelector(
      'input[name="weatherUnit"]:checked'
    );
    settings.weatherUnit = weatherUnitRadio?.value || "celsius";

    const weatherLocationModeRadio = document.querySelector(
      'input[name="weatherLocationMode"]:checked'
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

  /**
   * Save fasting settings
   */
  saveFastingSettings(settings) {
    settings.fasting = settings.fasting || {};

    // Visibility toggles
    settings.fasting.visibility = {
      monday: this.fastingShowMonday?.checked ?? true,
      thursday: this.fastingShowThursday?.checked ?? true,
      ayyamAlBeed: this.fastingShowAyyamAlBeed?.checked ?? true,
      dhuAlHijjah: this.fastingShowDhuAlHijjah?.checked ?? true,
      arafah: this.fastingShowArafah?.checked ?? true,
      ramadan: this.fastingShowRamadan?.checked ?? true,
    };

    // Within days settings
    settings.fasting.dhuAlHijjahWithinDays = this.clampNumber(
      parseInt(this.fastingDhuAlHijjahWithinDays?.value, 10),
      7,
      365,
      30
    );
    settings.fasting.arafahWithinDays = this.clampNumber(
      parseInt(this.fastingArafahWithinDays?.value, 10),
      7,
      365,
      30
    );

    // Notification settings
    settings.fasting.notifications = {
      enabled: this.fastingNotificationsEnabled?.checked ?? false,
      minutesBefore: this.clampNumber(
        parseInt(this.fastingNotificationMinutesBefore?.value, 10),
        5,
        180,
        60
      ),
      notify: {
        monday: this.fastingNotifyMonday?.checked ?? true,
        thursday: this.fastingNotifyThursday?.checked ?? true,
        ayyamAlBeed: this.fastingNotifyAyyamAlBeed?.checked ?? true,
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

  /**
   * Apply settings to components
   */
  applySettings(settings) {
    // Update prayer times
    if (this.prayerTimes) {
      this.prayerTimes.updateSettings(settings);
    }

    // Update location if manual
    if (
      settings.locationMethod === "manual" &&
      settings.latitude &&
      settings.longitude
    ) {
      if (this.prayerTimes) {
        this.prayerTimes.setManualLocation(
          settings.latitude,
          settings.longitude,
          settings.city
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
    }

    // Apply container width
    this.applyContainerWidth(
      settings.containerWidth,
      settings.containerWidthCustom
    );

    // Apply UI blur power
    this.applyUiBlurPower(settings.uiBlurPower ?? 100);

    // Update weather unit
    if (this.weather) {
      this.weather.fetchWeather();
    }

    // Apply all live updates without page reload
    this.applyLiveUpdates(settings);
  }

  /**
   * Apply live updates to all components without page reload
   * This replaces the previous window.location.reload() approach
   */
  applyLiveUpdates(settings) {
    try {
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

      // Refresh quotes if settings changed
      if (window.dashboard && window.dashboard.quotes) {
        try {
          window.dashboard.quotes.refreshQuote();
        } catch (e) {
          // Quote refresh is non-critical
        }
      }

      // Refresh lunar phase display
      if (window.dashboard && window.dashboard.lunarPhase) {
        try {
          window.dashboard.lunarPhase.refresh();
        } catch (e) {
          // Lunar phase refresh is non-critical
        }
      }

      // Refresh fasting display
      if (window.dashboard && window.dashboard.fasting) {
        try {
          window.dashboard.fasting.render();
        } catch (e) {
          // Fasting refresh is non-critical
        }
      }

      // Update calendar
      if (window.dashboard && window.dashboard.calendar) {
        try {
          window.dashboard.calendar.render();
        } catch (e) {
          // Calendar refresh is non-critical
        }
      }

      // Update Pocket Quran translation
      if (window.dashboard && window.dashboard.pocketQuran) {
        try {
          const pqSettings = settings.pocketQuran || {};
          if (pqSettings.translationResourceId) {
            window.dashboard.pocketQuran.reloadTranslation(
              pqSettings.translationResourceId
            );
          }
          // Also apply font sizes
          if (pqSettings.arabicFontSize || pqSettings.translationFontSize) {
            window.dashboard.pocketQuran.applyFontSizes(
              pqSettings.arabicFontSize ?? 32,
              pqSettings.translationFontSize ?? 18,
              { syncInputs: true, persist: false }
            );
          }
        } catch (e) {
          // Pocket Quran refresh is non-critical
        }
      }

      // Notify that settings have been applied (for any listeners)
      try {
        document.dispatchEvent(
          new CustomEvent("md:settings-applied", {
            detail: { settings },
          })
        );
      } catch (e) {}
    } catch (e) {
      console.warn("Some live updates failed:", e);
    }
  }

  /**
   * Apply container width setting
   */
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
      "container-custom"
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
          const clamped = this.clampNumber(customValue, 20, 98, 70);
          if (this.containerWidthCustom) {
            this.containerWidthCustom.value = String(clamped);
          }
          if (this.customWidthValue) {
            this.customWidthValue.textContent = clamped + "%";
          }
          mainContainer.style.setProperty(
            "--custom-container-width",
            clamped + "%"
          );
        }
        break;
      default: // narrow
        mainContainer.classList.add("container-narrow");
        break;
    }
  }

  /**
   * Toggle manual location fields
   */
  toggleManualLocation(show) {
    if (this.manualLocationFields) {
      if (show) {
        this.manualLocationFields.classList.add("active");
      } else {
        this.manualLocationFields.classList.remove("active");
      }
    }
  }

  /**
   * Toggle custom angles group
   */
  toggleCustomAngles(show) {
    if (this.customAnglesGroup) {
      this.customAnglesGroup.style.display = show ? "block" : "none";
    }
  }

  /**
   * Request location permission
   */
  async requestLocation() {
    if (this.prayerTimes) {
      await this.prayerTimes.requestLocation();
    }
  }

  /**
   * Search for city
   */
  async searchCity() {
    const cityName = this.cityInput?.value.trim();
    if (!cityName) {
      this.showToast("Please enter a city name", "error");
      return;
    }

    this._clearCitySearchResults(this.citySearchResults);

    if (this.searchCityBtn) {
      this.searchCityBtn.textContent = "🔍 Searching...";
      this.searchCityBtn.disabled = true;
    }

    try {
      const results = await this.prayerTimes.searchCity(cityName);

      if (results && results.length > 0) {
        this._renderCitySearchResults(
          this.citySearchResults,
          results,
          (result) => {
            if (this.cityInput) this.cityInput.value = result.city;
            if (this.latitudeInput)
              this.latitudeInput.value = Number(result.latitude).toFixed(4);
            if (this.longitudeInput)
              this.longitudeInput.value = Number(result.longitude).toFixed(4);

            const pickedLabel = result.fullName
              ? `${result.city} (${result.fullName})`
              : result.city;
            this.showToast(`Selected: ${pickedLabel}`, "success");
          }
        );
        this.showToast("Select a city from the list below.", "info");
      } else {
        this.showToast("City not found. Please try a different name.", "error");
      }
    } catch (error) {
      this.showToast("Search failed. Please try again.", "error");
    }

    if (this.searchCityBtn) {
      this.searchCityBtn.textContent = "🔍 Search City";
      this.searchCityBtn.disabled = false;
    }
  }

  /**
   * Add user quote
   */
  addUserQuote() {
    const text = this.newQuoteText?.value.trim();
    const source = this.newQuoteSource?.value.trim();
    const isArabic = this.newQuoteArabic?.checked || false;

    if (!text) {
      this.showToast("Please enter quote text", "error");
      return;
    }

    if (!source) {
      this.showToast("Please enter quote source", "error");
      return;
    }

    if (this.quotes) {
      this.quotes.addUserQuote(text, source, isArabic);
    }

    if (this.newQuoteText) this.newQuoteText.value = "";
    if (this.newQuoteSource) this.newQuoteSource.value = "";
    if (this.newQuoteArabic) this.newQuoteArabic.checked = false;

    this.showToast("Quote added!", "success");
  }

  /**
   * Open modal
   */
  openModal() {
    this.loadSettings();
    if (this.quotes) {
      this.quotes.renderQuotesList();
    }
    if (this.flashcards) {
      this.flashcards.renderSettings();
    }
    if (this.hadith) {
      this.hadith.renderSettings();
    }
    if (this.adhkar) {
      this.adhkar.renderSettings();
    }
    if (this.modal) {
      this.modal.classList.add("active");
    }
  }

  /**
   * Close modal
   */
  closeModal() {
    if (this.modal) {
      this.modal.classList.remove("active");
    }
    // Restore dashboard layout in case user made a live preview
    if (
      window.dashboard &&
      typeof window.dashboard.applyComponentVisibility === "function"
    ) {
      try {
        window.dashboard.applyComponentVisibility();
      } catch (e) {
        // ignore
      }
    }
  }

  /**
   * Switch tab
   */
  switchTab(tabName) {
    if (tabName === "debug" && !this.debugEnabled) return;

    // Update tabs
    this.tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === tabName);
    });

    // Update panels
    this.panels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === `${tabName}Panel`);
    });

    if (tabName === "flashcards" && this.flashcards) {
      this.flashcards.renderSettings();
    }

    if (tabName === "hadith" && this.hadith) {
      this.hadith.renderSettings();
    }

    if (tabName === "adhkar" && this.adhkar) {
      this.adhkar.renderSettings();
    }

    if (tabName === "notes") {
      this.updateNotesCountHint();
    }
  }

  applyDebugModeVisibility() {
    const enabled = globalThis.ENABLE_DEBUG_MODE === true;
    this.debugEnabled = enabled;

    if (this.debugTab) {
      this.debugTab.classList.toggle("hidden", !enabled);
      this.debugTab.setAttribute("aria-hidden", enabled ? "false" : "true");
      this.debugTab.toggleAttribute("disabled", !enabled);
    }

    if (this.debugPanel) {
      this.debugPanel.classList.toggle("hidden", !enabled);
    }

    // Safety: if debug is disabled while the tab is active, go back to Location.
    if (!enabled && this.debugPanel?.classList.contains("active")) {
      this.switchTab("location");
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = "info") {
    // Create toast container if not exists
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    // Create toast
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const iconSpan = document.createElement("span");
    iconSpan.textContent =
      type === "success" ? "✓" : type === "error" ? "✗" : "ℹ";

    const msgSpan = document.createElement("span");
    msgSpan.textContent = String(message ?? "");

    toast.appendChild(iconSpan);
    toast.appendChild(msgSpan);

    container.appendChild(toast);

    const removeToast = () => {
      try {
        toast.remove();
      } catch (e) {
        // ignore
      }
    };

    const hideToast = () => {
      toast.classList.add("toast-hiding");

      // Remove after transition; also keep a safety timeout.
      const fallbackMs = 350;
      const t = setTimeout(removeToast, fallbackMs);

      toast.addEventListener(
        "transitionend",
        (e) => {
          if (e && e.propertyName && e.propertyName !== "opacity") return;
          clearTimeout(t);
          removeToast();
        },
        { once: true }
      );
    };

    setTimeout(hideToast, 2500);
  }

  updateNotesCountHint() {
    if (!this.notesCountHint) return;
    const notes = this.storage.getNotes
      ? this.storage.getNotes()
      : this.storage.get("notes", []);
    const count = Array.isArray(notes) ? notes.length : 0;
    this.notesCountHint.textContent = `Currently stored: ${count} note${
      count === 1 ? "" : "s"
    }.`;
  }

  exportNotes() {
    const notes = this.storage.getNotes
      ? this.storage.getNotes()
      : this.storage.get("notes", []);
    const payload = {
      exportType: "notes",
      version: 1,
      exportDate: new Date().toISOString(),
      notes: Array.isArray(notes) ? notes : [],
    };

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `muslim-dashboard-notes-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast("Notes exported successfully!", "success");
  }

  handleNotesImport(e) {
    const input = e && e.target;
    const file = input && input.files && input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const data = JSON.parse(text);

        const incoming = Array.isArray(data)
          ? data
          : data && Array.isArray(data.notes)
          ? data.notes
          : null;

        if (!incoming) {
          this.showToast("Invalid notes JSON format.", "error");
          return;
        }

        const existing = this.storage.getNotes
          ? this.storage.getNotes()
          : Array.isArray(this.storage.get("notes", []))
          ? this.storage.get("notes", [])
          : [];

        const byId = new Set(
          existing.map((n) => String(n && n.id ? n.id : ""))
        );
        const now = Date.now();

        const normalized = incoming
          .filter((n) => n && typeof n === "object")
          .map((n) => {
            let id = String(n.id || "").trim();
            if (!id || byId.has(id)) {
              id = this._generateNotesId();
            }
            byId.add(id);

            const title = String(n.title || "Untitled").slice(0, 120);
            const html = typeof n.html === "string" ? n.html : "";
            const rawScale =
              typeof n.scale === "number" || typeof n.scale === "string"
                ? parseFloat(n.scale)
                : 1;
            const scale = Number.isNaN(rawScale)
              ? 1
              : Math.max(1, Math.min(5, rawScale));
            const createdAt =
              typeof n.createdAt === "number" ? n.createdAt : now;
            const updatedAt =
              typeof n.updatedAt === "number" ? n.updatedAt : createdAt;

            return { id, title, html, scale, createdAt, updatedAt };
          });

        const merged = existing.concat(normalized);
        merged.sort(
          (a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0)
        );

        if (this.storage.saveNotes) this.storage.saveNotes(merged);
        else this.storage.set("notes", merged);

        this.updateNotesCountHint();

        try {
          window.dashboard?.notes?.reloadFromStorage?.();
        } catch (err) {
          // ignore
        }

        this.showToast(
          `Imported ${normalized.length} note${
            normalized.length === 1 ? "" : "s"
          }.`,
          "success"
        );
      } catch (err) {
        console.error("Notes import error:", err);
        this.showToast("Failed to import notes JSON.", "error");
      } finally {
        try {
          input.value = "";
        } catch (e2) {}
      }
    };

    reader.onerror = () => {
      this.showToast("Failed to read file.", "error");
      try {
        input.value = "";
      } catch (e2) {}
    };

    reader.readAsText(file);
  }

  _generateNotesId() {
    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2)
    ).slice(0, 24);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Open/close modal
    if (this.settingsBtn) {
      this.settingsBtn.addEventListener("click", () => this.openModal());
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => this.closeModal());
    }
    if (this.saveBtn) {
      this.saveBtn.addEventListener("click", () => this.saveSettings());
    }

    if (this.modal) {
      this.modal.addEventListener("click", (e) => {
        if (e.target === this.modal) {
          this.closeModal();
        }
      });
    }

    // Tabs
    this.tabs.forEach((tab) => {
      tab.addEventListener("click", () => this.switchTab(tab.dataset.tab));
    });

    // Make the location pin open the Location settings (click + keyboard)
    try {
      const locationIcons = document.querySelectorAll(".location-icon");
      locationIcons.forEach((icon) => {
        // Avoid attaching multiple listeners if init() runs more than once
        if (icon.dataset.settingsBound === "1") return;
        icon.dataset.settingsBound = "1";

        // Add ARIA/interaction defaults when missing
        if (!icon.hasAttribute("role")) icon.setAttribute("role", "button");
        if (!icon.hasAttribute("tabindex")) icon.setAttribute("tabindex", "0");
        if (!icon.hasAttribute("title"))
          icon.setAttribute("title", "Open Location settings");
        if (!icon.hasAttribute("aria-label"))
          icon.setAttribute("aria-label", "Open Location settings");

        icon.addEventListener("click", () => {
          try {
            this.openModal();
            this.switchTab("location");
            const firstEl =
              document.getElementById("requestLocationBtn") ||
              document.getElementById("cityInput");
            if (firstEl) firstEl.focus();
          } catch (err) {
            console.warn("Failed to open Location settings:", err);
          }
        });

        icon.addEventListener("keydown", (e) => {
          const key = e.key || e.keyCode;
          if (key === "Enter" || key === " " || key === 13 || key === 32) {
            e.preventDefault();
            icon.click();
          }
        });
      });
    } catch (e) {
      // Non-critical: if DOM not ready or icons absent, ignore
    }

    if (this.testNotificationBtn) {
      this.testNotificationBtn.addEventListener("click", () =>
        this.testBrowserNotification()
      );
    }

    // Notes import/export
    if (this.importNotesBtn && this.importNotesInput) {
      this.importNotesBtn.addEventListener("click", () => {
        this.importNotesInput.click();
      });
    }

    if (this.exportNotesBtn) {
      this.exportNotesBtn.addEventListener("click", () => this.exportNotes());
    }

    if (this.importNotesInput) {
      this.importNotesInput.addEventListener("change", (e) =>
        this.handleNotesImport(e)
      );
    }

    // Location method toggle
    this.locationMethodRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        this.toggleManualLocation(radio.value === "manual");
      });
    });

    // Request location permission
    if (this.requestLocationBtn) {
      this.requestLocationBtn.addEventListener("click", () =>
        this.requestLocation()
      );
    }

    // Search city
    if (this.searchCityBtn) {
      this.searchCityBtn.addEventListener("click", () => this.searchCity());
    }

    // Paste coords (location)
    if (this.pasteCoordsBtn) {
      this.pasteCoordsBtn.addEventListener("click", () =>
        this.pasteLocationCoordinatesFromClipboard()
      );
    }

    if (this.cityInput) {
      this.cityInput.addEventListener("input", () => {
        this._clearCitySearchResults(this.citySearchResults);
      });

      // Trigger search when user presses Enter in the city input
      this.cityInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.keyCode === 13) {
          e.preventDefault();
          // Avoid duplicate search while a search is already running
          if (this.searchCityBtn && this.searchCityBtn.disabled) return;
          this.searchCity();
        }
      });
    }

    // Weather location mode toggle
    this.weatherLocationModeRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        this.toggleWeatherManualLocation(radio.value === "custom");
      });
    });

    // Search city (weather)
    if (this.weatherSearchCityBtn) {
      this.weatherSearchCityBtn.addEventListener("click", () =>
        this.searchWeatherCity()
      );
    }

    // Paste coords (weather)
    if (this.weatherPasteCoordsBtn) {
      this.weatherPasteCoordsBtn.addEventListener("click", () =>
        this.pasteWeatherCoordinatesFromClipboard()
      );
    }

    if (this.weatherCityInput) {
      this.weatherCityInput.addEventListener("input", () => {
        this._clearCitySearchResults(this.weatherCitySearchResults);
      });

      // Trigger weather search when user presses Enter in the weather city input
      this.weatherCityInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.keyCode === 13) {
          e.preventDefault();
          if (this.weatherSearchCityBtn && this.weatherSearchCityBtn.disabled)
            return;
          this.searchWeatherCity();
        }
      });
    }

    // Fasting notifications toggle
    if (this.fastingNotificationsEnabled) {
      this.fastingNotificationsEnabled.addEventListener("change", (e) => {
        this.toggleFastingNotificationOptions(e.target.checked);
      });
    }

    // Calculation method change - toggle custom angles and update display
    if (this.calculationMethod) {
      this.calculationMethod.addEventListener("change", (e) => {
        this.toggleCustomAngles(e.target.value === "Custom");
        this.updateMethodAnglesDisplay();
      });
    }

    // Add quote
    if (this.addQuoteBtn) {
      this.addQuoteBtn.addEventListener("click", () => this.addUserQuote());
    }

    // Background interval change - toggle custom interval field
    if (this.bgInterval) {
      this.bgInterval.addEventListener("change", (e) => {
        this.toggleCustomInterval(e.target.value === "custom");
      });
    }

    // Compact weather toggle
    if (this.compactWeatherEnabled) {
      this.compactWeatherEnabled.addEventListener("change", (e) => {
        this.toggleCompactWeatherOptions(e.target.checked);
      });
    }

    // Container width change - toggle custom width slider and apply preview
    if (this.containerWidth) {
      this.containerWidth.addEventListener("change", (e) => {
        this.toggleCustomWidth(e.target.value === "custom");
        // Apply preview immediately
        this.applyContainerWidth(
          e.target.value,
          parseInt(this.containerWidthCustom?.value, 10) || 70
        );
      });
    }

    // Container width slider change - update label and apply preview
    if (this.containerWidthCustom) {
      this.containerWidthCustom.addEventListener("input", () => {
        this.updateCustomWidthLabel();
        this.applyContainerWidth(
          this.containerWidth?.value === "custom"
            ? "custom"
            : this.containerWidth?.value,
          parseInt(this.containerWidthCustom.value, 10)
        );
      });
    }

    // UI blur power slider - live preview
    if (this.uiBlurPower) {
      this.uiBlurPower.addEventListener("input", () => {
        this.updateUiBlurPowerLabel();
        this.applyUiBlurPower(parseInt(this.uiBlurPower.value, 10));
      });
    }

    // Pinned Apps per-row slider - update label
    if (this.pinnedAppsPerRow) {
      this.pinnedAppsPerRow.addEventListener("input", () => {
        this.updatePinnedAppsPerRowLabel();
      });
    }

    // Pocket Quran sliders - update labels
    if (this.pocketQuranArabicSize) {
      this.pocketQuranArabicSize.addEventListener("input", () => {
        this.updatePocketQuranArabicSizeLabel();
      });
    }
    if (this.pocketQuranTranslationSize) {
      this.pocketQuranTranslationSize.addEventListener("input", () => {
        this.updatePocketQuranTranslationSizeLabel();
      });
    }

    // Pocket Quran translation picker: open the existing pqTranslationModal
    if (this.pocketQuranTranslationPickerBtn) {
      this.pocketQuranTranslationPickerBtn.addEventListener("click", () => {
        try {
          if (window.dashboard?.pocketQuran?.openTranslationModal) {
            window.dashboard.pocketQuran.openTranslationModal();
            return;
          }
        } catch (e) {
          // ignore
        }
      });
    }

    if (this.pocketQuranResetAllTajweedColorsBtn) {
      this.pocketQuranResetAllTajweedColorsBtn.addEventListener("click", () => {
        this.resetAllPocketQuranTajweedColors();
      });
    }

    // Keep Settings UI in sync when translation changes from anywhere (header modal or settings modal)
    document.addEventListener("md:pq-translation-selected", (e) => {
      const id = parseInt(e?.detail?.translationId, 10);
      if (!Number.isFinite(id)) return;

      if (this.pocketQuranTranslationSelect) {
        const has = this.pocketQuranTranslationSelect.querySelector(
          `option[value="${id}"]`
        );
        if (has) {
          this.pocketQuranTranslationSelect.value = String(id);
        }
      }

      this.updatePocketQuranTranslationPickerLabel();
    });

    // Pocket Quran bookmark export/import
    if (this.pocketQuranExportBookmarksBtn) {
      this.pocketQuranExportBookmarksBtn.addEventListener("click", () => {
        this.exportPocketQuranBookmarks();
      });
    }
    if (
      this.pocketQuranImportBookmarksBtn &&
      this.pocketQuranImportBookmarksInput
    ) {
      this.pocketQuranImportBookmarksBtn.addEventListener("click", () => {
        this.pocketQuranImportBookmarksInput.click();
      });
      this.pocketQuranImportBookmarksInput.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) {
          this.importPocketQuranBookmarks(file);
          e.target.value = "";
        }
      });
    }

    // Add custom background
    if (this.addCustomBgBtn) {
      this.addCustomBgBtn.addEventListener("click", () => {
        this.customBgInput?.click();
      });
    }

    if (this.customBgInput) {
      this.customBgInput.addEventListener("change", (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            this.addCustomBackground(files[i]);
          }
          e.target.value = ""; // Reset input
        }
      });
    }

    // Reset grid layout button
    const resetGridLayoutBtn = document.getElementById("resetGridLayoutBtn");
    if (resetGridLayoutBtn) {
      resetGridLayoutBtn.addEventListener("click", () => {
        if (window.dashboard && window.dashboard.gridLayout) {
          window.dashboard.gridLayout.resetToDefault();
          this.showToast("Layout reset to default!", "success");
        }
      });
    }

    // Refresh default flashcards + default quotes
    if (this.refreshDefaultDataBtn) {
      this.refreshDefaultDataBtn.addEventListener("click", async () => {
        const btn = this.refreshDefaultDataBtn;
        const prevText = btn.textContent;

        btn.disabled = true;
        btn.textContent = "⏳ Refreshing…";

        try {
          const tasks = [];

          if (this.flashcards?.refreshDefaultSets) {
            tasks.push(this.flashcards.refreshDefaultSets());
          }

          if (this.quotes?.refreshDefaultQuotes) {
            tasks.push(this.quotes.refreshDefaultQuotes());
          } else if (this.quotes?.loadDefaultQuotes) {
            // Backward-compatible fallback
            tasks.push(this.quotes.loadDefaultQuotes());
          }

          if (this.adhkar?.refreshDefaultData) {
            tasks.push(this.adhkar.refreshDefaultData());
          }

          if (this.hadith?.refreshDefaultData) {
            tasks.push(this.hadith.refreshDefaultData());
          }

          await Promise.all(tasks);
          this.showToast(
            "Default hadith, adhkar, flashcards and quotes refreshed!",
            "success"
          );
        } catch (e) {
          console.error("Failed to refresh default data:", e);
          this.showToast("Failed to refresh default data.", "error");
        } finally {
          btn.disabled = false;
          btn.textContent = prevText;
        }
      });
    }

    // Reset / Nuke confirmation modal wiring
    const resolveResetNukeConfirm = (confirmed) => {
      if (!this._resetNukeConfirmResolve) return;
      const resolve = this._resetNukeConfirmResolve;
      this._resetNukeConfirmResolve = null;
      try {
        this.resetNukeConfirmModal?.classList.remove("active");
      } catch (e) {}
      resolve(confirmed === true);
    };

    if (this.resetNukeCancelBtn) {
      this.resetNukeCancelBtn.addEventListener("click", () =>
        resolveResetNukeConfirm(false)
      );
    }
    if (this.resetNukeConfirmBtn) {
      this.resetNukeConfirmBtn.addEventListener("click", () =>
        resolveResetNukeConfirm(true)
      );
    }
    if (this.resetNukeConfirmModal) {
      this.resetNukeConfirmModal.addEventListener("click", (e) => {
        if (e.target === this.resetNukeConfirmModal) {
          resolveResetNukeConfirm(false);
        }
      });
    }
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (this.resetNukeConfirmModal?.classList.contains("active")) {
        resolveResetNukeConfirm(false);
      }
    });

    const openResetNukeConfirmModal = (opts = {}) => {
      const title = String(opts.title || "Confirm");
      const text = String(opts.text || "");
      const icon = String(opts.icon || "⚠️");
      const confirmLabel = String(opts.confirmLabel || "Confirm");
      const cancelLabel = String(opts.cancelLabel || "Cancel");

      // Fallback: native confirm if modal isn't available.
      if (
        !this.resetNukeConfirmModal ||
        !this.resetNukeConfirmBtn ||
        !this.resetNukeCancelBtn
      ) {
        return Promise.resolve(window.confirm(`${title}\n\n${text}`));
      }

      // Cancel any prior pending confirm.
      if (this._resetNukeConfirmResolve) {
        try {
          this._resetNukeConfirmResolve(false);
        } catch (e) {}
        this._resetNukeConfirmResolve = null;
      }

      if (this.resetNukeConfirmIcon)
        this.resetNukeConfirmIcon.textContent = icon;
      if (this.resetNukeConfirmTitle)
        this.resetNukeConfirmTitle.textContent = title;
      if (this.resetNukeConfirmText)
        this.resetNukeConfirmText.textContent = text;
      this.resetNukeConfirmBtn.textContent = confirmLabel;
      this.resetNukeCancelBtn.textContent = cancelLabel;

      this.resetNukeConfirmModal.classList.add("active");

      return new Promise((resolve) => {
        this._resetNukeConfirmResolve = resolve;
      });
    };

    const resetWholeSettings = async () => {
      const current = this.storage.getSettings();
      const defaults = this.storage.getDefaultSettings();

      // Preserve user data that is stored inside settings.
      const preservedCustomBackgrounds = Array.isArray(
        current.customBackgrounds
      )
        ? current.customBackgrounds
            .filter((x) => typeof x === "string" && x.startsWith("data:image"))
            .slice(0, 10)
        : [];

      defaults.customBackgrounds = preservedCustomBackgrounds;

      this.storage.saveSettings(defaults);

      this.showToast("Settings reset to defaults. Reloading…", "success");
      setTimeout(() => window.location.reload(), 1200);
    };

    const nukeAllData = async () => {
      const defaults = this.storage.getDefaultSettings();

      // Clear all StorageManager data.
      try {
        this.storage.clear();
      } catch (e) {
        // ignore
      }

      // Also clear Sticky Notes (not using the StorageManager prefix).
      try {
        localStorage.removeItem("stickyNotes");
        localStorage.removeItem("stickyNotesVisible");
      } catch (e) {
        // ignore
      }

      // Reset MV3 mirrored keys so the service worker converges to defaults.
      try {
        if (typeof chrome !== "undefined" && chrome.storage?.local?.set) {
          chrome.storage.local.set({
            md_settings: defaults,
            md_lastLocation: null,
          });
        }
      } catch (e) {
        // ignore
      }

      this.showToast("Everything was reset. Reloading…", "success");
      setTimeout(() => window.location.reload(), 1200);
    };

    if (this.resetWholeSettingsBtn) {
      this.resetWholeSettingsBtn.addEventListener("click", async () => {
        const ok = await openResetNukeConfirmModal({
          icon: "🧹",
          title: "Reset Whole Settings?",
          text: "This resets all settings to defaults, but keeps your custom data (flashcards, quotes, wallpapers, notes, Pocket Quran bookmarks, etc.).",
          confirmLabel: "Reset",
          cancelLabel: "Cancel",
        });
        if (!ok) return;
        await resetWholeSettings();
      });
    }

    if (this.nukeAllDataBtn) {
      this.nukeAllDataBtn.addEventListener("click", async () => {
        const ok1 = await openResetNukeConfirmModal({
          icon: "☢️",
          title: "Nuke Everything?",
          text: "This will permanently delete ALL settings and ALL user data on this device.",
          confirmLabel: "Continue",
          cancelLabel: "Cancel",
        });
        if (!ok1) return;

        const ok2 = await openResetNukeConfirmModal({
          icon: "☢️",
          title: "Final Confirmation",
          text: "Last chance: this cannot be undone. Proceed to reset EVERYTHING?",
          confirmLabel: "Yes, nuke it",
          cancelLabel: "Cancel",
        });
        if (!ok2) return;

        await nukeAllData();
      });
    }

    // Export settings
    if (this.exportSettingsBtn) {
      this.exportSettingsBtn.addEventListener("click", () => {
        this.exportAllSettings();
      });
    }

    // Export custom searches
    if (this.exportCustomSearchesBtn) {
      this.exportCustomSearchesBtn.addEventListener("click", () => {
        this.exportCustomSearches();
      });
    }

    // Full export
    if (this.fullExportBtn) {
      this.fullExportBtn.addEventListener("click", () => {
        this.exportFullExport();
      });
    }

    // Import settings
    if (this.importSettingsBtn) {
      this.importSettingsBtn.addEventListener("click", () => {
        this.importSettingsInput?.click();
      });
    }

    if (this.importSettingsInput) {
      this.importSettingsInput.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            this.importAllSettings(event.target.result);
          };
          reader.readAsText(file);
          e.target.value = ""; // Reset input
        }
      });
    }

    // Import custom searches
    if (this.importCustomSearchesBtn) {
      this.importCustomSearchesBtn.addEventListener("click", () => {
        this.importCustomSearchesInput?.click();
      });
    }

    if (this.importCustomSearchesInput) {
      this.importCustomSearchesInput.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            this.importCustomSearches(event.target.result);
          };
          reader.readAsText(file);
          e.target.value = "";
        }
      });
    }

    // Live preview for top components visibility (Prayer, Hijri, Qibla)
    const previewHandler = () => {
      const prayerChecked = this.visibilityPrayerTimes?.checked ?? true;
      const hijriChecked = this.visibilityHijriCalendar?.checked ?? true;
      const qiblaChecked = this.visibilityQiblaDirection?.checked ?? true;

      const prayerCard = document.getElementById("prayerTimesCard");
      const calCard = document.getElementById("calendarCard");
      const qiblaCard = document.getElementById("qiblaCard");

      if (prayerCard) {
        prayerCard.style.display = prayerChecked ? "" : "none";
        prayerCard.setAttribute(
          "aria-hidden",
          prayerChecked ? "false" : "true"
        );
      }
      if (calCard) {
        calCard.style.display = hijriChecked ? "" : "none";
        calCard.setAttribute("aria-hidden", hijriChecked ? "false" : "true");
      }
      if (qiblaCard) {
        qiblaCard.style.display = qiblaChecked ? "" : "none";
        qiblaCard.setAttribute("aria-hidden", qiblaChecked ? "false" : "true");
      }
    };

    [
      this.visibilityPrayerTimes,
      this.visibilityHijriCalendar,
      this.visibilityQiblaDirection,
    ].forEach((el) => {
      if (el) {
        el.addEventListener("change", previewHandler);
      }
    });

    // Change background now
    if (this.changeBackgroundBtn) {
      this.changeBackgroundBtn.addEventListener("click", () => {
        const settings = this.storage.getSettings();
        if (this.bgCategory) {
          settings.bgCategory = this.bgCategory.value;
          this.storage.saveSettings(settings);
        }
        if (this.backgrounds) {
          this.backgrounds.updateCategory(this.bgCategory?.value || "nature");
          this.backgrounds.changeBackground();
        }
        this.showToast("Background changed!", "success");
      });
    }

    // Heading settings - greeting type toggle
    this.greetingTypeRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        this.toggleCustomGreeting(radio.value === "custom");
      });
    });

    // Heading settings - show clock toggle
    if (this.showClock) {
      this.showClock.addEventListener("change", () => {
        this.toggleClockOptions(this.showClock.checked);
      });
    }

    // Heading settings - clock format toggle (show/hide AM/PM option)
    this.clockFormatRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        this.toggleAmPmOption(radio.value === "12h");
      });
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.modal?.classList.contains("active")) {
        this.closeModal();
      }
    });
  }

  testBrowserNotification() {
    if (!this.debugEnabled) return;

    try {
      const hasChromeNotifications =
        typeof chrome !== "undefined" &&
        chrome.notifications &&
        typeof chrome.notifications.create === "function";

      const hasBrowserNotifications =
        typeof browser !== "undefined" &&
        browser.notifications &&
        typeof browser.notifications.create === "function";

      if (!hasChromeNotifications && !hasBrowserNotifications) {
        this.showToast("Notifications API not available here.", "error");
        return;
      }

      const options = {
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: "Muslim Dashboard",
        message: "This is a test notification from the Debug tab.",
        priority: 0,
      };

      if (hasChromeNotifications) {
        chrome.notifications.create(options, (notificationId) => {
          const err = chrome.runtime?.lastError;
          if (err) {
            this.showToast(
              `Notification failed: ${err.message || String(err)}`,
              "error"
            );
            return;
          }
          this.showToast(
            `Test notification sent${
              notificationId ? ": " + notificationId : ""
            }.`,
            "success"
          );
        });
        return;
      }

      // Firefox-style promise API
      Promise.resolve(browser.notifications.create("md-debug-test", options))
        .then(() => this.showToast("Test notification sent.", "success"))
        .catch((e) =>
          this.showToast(`Notification failed: ${e?.message || e}`, "error")
        );
    } catch (e) {
      this.showToast(`Notification failed: ${e?.message || e}`, "error");
    }
  }

  updatePocketQuranTranslationPickerLabel() {
    const btn = this.pocketQuranTranslationPickerBtn;
    const labelEl = this.pocketQuranTranslationPickerLabel;
    const select = this.pocketQuranTranslationSelect;
    if (!btn || !labelEl || !select) return;

    const opt = select.selectedOptions?.[0] || null;
    const optText = String(opt?.textContent || "").trim();
    const lang = String(opt?.closest?.("optgroup")?.label || "").trim();

    labelEl.textContent =
      lang && optText ? `${lang} · ${optText}` : "Select translation…";
  }
}

// Export for use
window.SettingsManager = SettingsManager;

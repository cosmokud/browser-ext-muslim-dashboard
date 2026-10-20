/**
 * Settings Manager
 * Handles settings modal and configuration for all features
 * Supports 25+ calculation methods, visibility settings, quotes import/export, weather, and heading customization
 */

class SettingsManager extends BaseManager {

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

  static CUSTOM_BACKGROUND_LIMIT = 30;

  static NOTES_CARD_FONT_FAMILIES = [
    "Poppins",
    "Amiri",
    "Noto Naskh Arabic",
    "Uthmani Tajweed",
    "KFGQPC Uthman Taha Naskh",
    "KFGQPC KSA Regular",
    "KFGQPC Kufi Stylistic Regular",
    "KFGQPC AN Regular",
    "KFGQPC AlJalil Dot",
    "KFGQPC Sindhi Naskh Regular",
    "Georgia",
    "Cascadia Code",
    "Courier New",
  ];

  static POCKET_QURAN_ARABIC_FONT_FAMILIES = [
    "Noto Naskh Arabic",
    "Amiri",
    "KFGQPC Uthman Taha Naskh",
    "KFGQPC KSA Regular",
    "KFGQPC Kufi Stylistic Regular",
    "KFGQPC AN Regular",
    "KFGQPC AlJalil Dot",
    "KFGQPC Sindhi Naskh Regular",
  ];

  static POCKET_QURAN_POPUP_TRANSLATION_FONT_FAMILIES = [
    "Poppins",
    "Noto Naskh Arabic",
    "Amiri",
    "Georgia",
    "Cascadia Code",
    "Courier New",
  ];

  constructor(
    storage,
    prayerTimes,
    qibla,
    quotes,
    backgrounds,
    weather,
    flashcards,
    hadith,
    adhkar,
  ) {
    super();
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
    this.settingsVersionTrigger = document.getElementById(
      "settingsVersionTrigger",
    );
    this.changelogModal = document.getElementById("changelogModal");
    this.changelogCloseBtn = document.getElementById("changelogClose");
    this.changelogContent = document.getElementById("changelogContent");
    this._changelogHtmlCache = "";
    this._changelogLoadPromise = null;

    // Tabs
    this.tabs = document.querySelectorAll(".settings-tab");
    this.panels = document.querySelectorAll(".settings-panel");
    this.tabStrip = this.modal?.querySelector?.(".settings-tabs");
    this.settingsSearchInput = document.getElementById("settingsSearchInput");
    this.settingsSearchClearBtn = document.getElementById(
      "settingsSearchClearBtn",
    );
    this.settingsSearchEmpty = document.getElementById("settingsSearchEmpty");

    this._autoSaveTimer = null;
    this._isAutoSaving = false;
    this._autoSaveQueued = false;

    // Debug mode (gated)
    this.debugEnabled = globalThis.ENABLE_DEBUG_MODE === true;
    this.debugTab = document.getElementById("debugTab");
    this.debugPanel = document.getElementById("debugPanel");
    this.testNotificationBtn = document.getElementById("testNotificationBtn");
    this.debugSimDateEnabled = document.getElementById("debugSimDateEnabled");
    this.debugDateControls = document.getElementById("debugDateControls");
    this.debugSimDatePicker = document.getElementById("debugSimDatePicker");
    this.debugSimDateYear = document.getElementById("debugSimDateYear");
    this.debugSimDateMonth = document.getElementById("debugSimDateMonth");
    this.debugSimDateDay = document.getElementById("debugSimDateDay");
    this.debugSimDateTime = document.getElementById("debugSimDateTime");
    this.applyDebugModeVisibility();

    // Location elements
    this.locationMethodRadios = document.querySelectorAll(
      'input[name="locationMethod"]',
    );
    this.manualLocationFields = document.getElementById("manualLocationFields");
    this.cityInput = document.getElementById("cityInput");
    this.latitudeInput = document.getElementById("latitudeInput");
    this.longitudeInput = document.getElementById("longitudeInput");
    this.searchCityBtn = document.getElementById("searchCityBtn");
    this.pasteCoordsBtn = document.getElementById("pasteCoordsBtn");
    this.citySearchResults = document.getElementById("citySearchResults");
    this.requestLocationBtn = document.getElementById("requestLocationBtn");
    this.refreshLocationBtn = document.getElementById("refreshLocationBtn");
    this.detectedLocationText = document.getElementById("detectedLocationText");
    this._locationTextObserver = null;

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
      "enablePrayerNotifications",
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

    this.notificationAtTimeCheckboxes = {
      fajr: document.getElementById("notifyFajrAtTime"),
      sunrise: document.getElementById("notifySunriseAtTime"),
      duha: document.getElementById("notifyDuhaAtTime"),
      dhuhr: document.getElementById("notifyDhuhrAtTime"),
      asr: document.getElementById("notifyAsrAtTime"),
      maghrib: document.getElementById("notifyMaghribAtTime"),
      isha: document.getElementById("notifyIshaAtTime"),
      midnight: document.getElementById("notifyMidnightAtTime"),
      qiyam: document.getElementById("notifyQiyamAtTime"),
    };

    // Quote elements
    this.useDefaultQuotes = document.getElementById("useDefaultQuotes");
    this.useUserQuotes = document.getElementById("useUserQuotes");

    // Detached settings editor modal state
    this.detachedEditorModal = null;
    this.detachedEditorModalContent = null;
    this.detachedEditorModalBody = null;
    this.detachedEditorModalTitle = null;
    this.detachedEditorCloseBtn = null;
    this._detachedEditorState = null;
    this._detachedEditorViewportHandler = null;
    this._detachedEditorViewportRaf = 0;
    this._detachedEditorMutationObserver = null;
    this._detachedEditorRefreshTimer = null;
    this._detachedEditorRefreshNeedsWidth = false;

    // Background elements
    this.bgInterval = document.getElementById("bgInterval");
    this.bgIntervalCustom = document.getElementById("bgIntervalCustom");
    this.customIntervalGroup = document.getElementById("customIntervalGroup");
    this.bgDisplayMode = document.getElementById("bgDisplayMode");
    this.bgDim = document.getElementById("bgDim");
    this.bgDimValue = document.getElementById("bgDimValue");
    this.bgBlur = document.getElementById("bgBlur");
    this.bgBlurValue = document.getElementById("bgBlurValue");
    this.bgShuffle = document.getElementById("bgShuffle");
    this.bgCategory = document.getElementById("bgCategory");
    this.changeBackgroundBtn = document.getElementById("changeBackgroundBtn");
    this.customBgGroup = document.getElementById("customBgGroup");
    this.backgroundPoolLabel = document.getElementById("backgroundPoolLabel");
    this.backgroundPoolHint = document.getElementById("backgroundPoolHint");
    this.customBgList = document.getElementById("customBgList");
    this.customBgInput = document.getElementById("customBgInput");
    this.addCustomBgBtn = document.getElementById("addCustomBgBtn");
    this.addCustomBgUrlBtn = document.getElementById("addCustomBgUrlBtn");
    this.solidColorControls = document.getElementById("solidColorControls");
    this.solidColorPicker = document.getElementById("solidColorPicker");
    this.solidColorHexInput = document.getElementById("solidColorHexInput");
    this.addSolidColorBtn = document.getElementById("addSolidColorBtn");
    this.selectAllBgPoolBtn = document.getElementById("selectAllBgPoolBtn");
    this.deselectAllBgPoolBtn = document.getElementById("deselectAllBgPoolBtn");
    this.customBgCount = document.getElementById("customBgCount");
    this._activeBgPoolCategory = "";
    this._activeBgPoolImages = [];
    this._backgroundThumbUrlCache = new Map();
    this._backgroundThumbObserver = null;
    this._backgroundThumbBlobUrlCache = new Map();
    this._backgroundThumbPendingLoads = new Map();
    this._backgroundThumbCacheName = "md-background-thumbs-v1";
    this._backgroundThumbCacheMaxEntries = 220;
    this._backgroundThumbBlobUrlMaxEntries = 140;
    this._customBackgroundMediaDbName = "md-custom-background-media-v1";
    this._customBackgroundMediaStoreName = "media";
    this._customBackgroundMediaDbPromise = null;
    this._customBackgroundMediaLoadPromise = null;
    this._customBackgroundMediaSyncPromise = null;
    this._customBackgroundMediaLoaded = false;
    this._customBackgroundTokenPrefix = "mdcbg:id:";
    this._solidBackgroundUrlPrefix = "solid:";
    this._customBackgroundThumbByImageUrl = new Map();
    this._customBackgroundImageByToken = new Map();
    this._backgroundSettingsDirty = false;

    // General settings elements
    this.containerWidth = document.getElementById("containerWidth");
    this.containerWidthCustom = document.getElementById("containerWidthCustom");
    this.customWidthGroup = document.getElementById("customWidthGroup");
    this.customWidthValue = document.getElementById("customWidthValue");
    this.uiBlurPower = document.getElementById("uiBlurPower");
    this.uiBlurPowerValue = document.getElementById("uiBlurPowerValue");
    this.fullExportBtn = document.getElementById("fullExportBtn");
    this.importSettingsBtn = document.getElementById("importSettingsBtn");
    this.importSettingsInput = document.getElementById("importSettingsInput");

    // General: reset buttons
    this.resetWholeSettingsBtn = document.getElementById(
      "resetWholeSettingsBtn",
    );
    this.nukeAllDataBtn = document.getElementById("nukeAllDataBtn");

    // Reset/Nuke confirmation modal
    this.resetNukeConfirmModal = document.getElementById(
      "resetNukeConfirmModal",
    );
    this.resetNukeConfirmIcon = document.getElementById("resetNukeConfirmIcon");
    this.resetNukeConfirmTitle = document.getElementById(
      "resetNukeConfirmTitle",
    );
    this.resetNukeConfirmText = document.getElementById("resetNukeConfirmText");
    this.resetNukeCancelBtn = document.getElementById("resetNukeCancelBtn");
    this.resetNukeConfirmBtn = document.getElementById("resetNukeConfirmBtn");

    this._resetNukeConfirmResolve = null;

    // Themes panel elements
    this.themeModeButtons = document.querySelectorAll(".theme-mode-btn");
    this.themeGlassEnabled = document.getElementById("themeGlassEnabled");
    this.themeBackgroundAwareFontColorEnabled = document.getElementById(
      "themeBackgroundAwareFontColorEnabled",
    );
    this.themeBlurPower = document.getElementById("themeBlurPower");
    this.themeBlurPowerValue = document.getElementById("themeBlurPowerValue");
    this.themeBlurGroup = document.getElementById("themeBlurGroup");
    this.themeGlassOpacity = document.getElementById("themeGlassOpacity");
    this.themeGlassOpacityValue = document.getElementById(
      "themeGlassOpacityValue",
    );
    this.themeComponentOpacity = document.getElementById(
      "themeComponentOpacity",
    );
    this.themeComponentOpacityValue = document.getElementById(
      "themeComponentOpacityValue",
    );
    this.themeModalOpacity = document.getElementById("themeModalOpacity");
    this.themeModalOpacityValue = document.getElementById(
      "themeModalOpacityValue",
    );
    this.themePickerGrid = document.getElementById("themePickerGrid");
    this.themeContainerWidth = document.getElementById("themeContainerWidth");
    this.themeContainerWidthCustom = document.getElementById(
      "themeContainerWidthCustom",
    );
    this.themeCustomWidthGroup = document.getElementById(
      "themeCustomWidthGroup",
    );
    this.themeCustomWidthValue = document.getElementById(
      "themeCustomWidthValue",
    );
    this.themePerformanceModeEnabled = document.getElementById(
      "themePerformanceModeEnabled",
    );
    this.themeHighestVisualFidelityEnabled = document.getElementById(
      "themeHighestVisualFidelityEnabled",
    );

    // Icon theme picker
    this.iconThemePicker = document.getElementById("iconThemePicker");

    // Custom searches import/export
    this.exportCustomSearchesBtn = document.getElementById(
      "exportCustomSearchesBtn",
    );
    this.importCustomSearchesBtn = document.getElementById(
      "importCustomSearchesBtn",
    );
    this.importCustomSearchesInput = document.getElementById(
      "importCustomSearchesInput",
    );

    // Method angles display
    this.methodAnglesInfo = document.getElementById("methodAnglesInfo");
    this.methodFajrAngle = document.getElementById("methodFajrAngle");
    this.methodIshaAngle = document.getElementById("methodIshaAngle");

    // Heading settings elements
    this.greetingTypeRadios = document.querySelectorAll(
      'input[name="greetingType"]',
    );
    this.customGreetingGroup = document.getElementById("customGreetingGroup");
    this.customGreetingInput = document.getElementById("customGreetingInput");
    this.timeGreetingGroup = document.getElementById("timeGreetingGroup");
    this.greetingMorning = document.getElementById("greetingMorning");
    this.greetingAfternoon = document.getElementById("greetingAfternoon");
    this.greetingEvening = document.getElementById("greetingEvening");
    this.greetingNight = document.getElementById("greetingNight");
    this.showGreeting = document.getElementById("showGreeting");
    this.showClock = document.getElementById("showClock");
    this.clockFormatRadios = document.querySelectorAll(
      'input[name="clockFormat"]',
    );
    this.showSeconds = document.getElementById("showSeconds");
    this.showAmPm = document.getElementById("showAmPm");
    this.showNextPrayer = document.getElementById("showNextPrayer");
    this.clockStyleRadios = document.querySelectorAll(
      'input[name="clockStyle"]',
    );
    this.showDate = document.getElementById("showDate");
    this.showIslamicEvents = document.getElementById("showIslamicEvents");
    this.dateFormatSelect = document.getElementById("dateFormatSelect");
    this.headerWholeComponentSurfaceEnabled = document.getElementById(
      "headerWholeComponentSurfaceEnabled",
    );
    this.headerGreetingBgEnabled = document.getElementById(
      "headerGreetingBgEnabled",
    );
    this.headerDateBgEnabled = document.getElementById("headerDateBgEnabled");
    this.headerTimeBgEnabled = document.getElementById("headerTimeBgEnabled");
    this.headerNextPrayerBgEnabled = document.getElementById(
      "headerNextPrayerBgEnabled",
    );
    this.headerCompactWeatherBgEnabled = document.getElementById(
      "headerCompactWeatherBgEnabled",
    );
    this.headerGreetingTextColor = document.getElementById(
      "headerGreetingTextColor",
    );
    this.headerGreetingTextColorReset = document.getElementById(
      "headerGreetingTextColorReset",
    );
    this.headerDateTextColor = document.getElementById("headerDateTextColor");
    this.headerDateTextColorReset = document.getElementById(
      "headerDateTextColorReset",
    );
    this.headerTimeTextColor = document.getElementById("headerTimeTextColor");
    this.headerTimeTextColorReset = document.getElementById(
      "headerTimeTextColorReset",
    );
    this.headerNextPrayerTextColor = document.getElementById(
      "headerNextPrayerTextColor",
    );
    this.headerNextPrayerTextColorReset = document.getElementById(
      "headerNextPrayerTextColorReset",
    );
    this.headerCompactWeatherTextColor = document.getElementById(
      "headerCompactWeatherTextColor",
    );
    this.headerCompactWeatherTextColorReset = document.getElementById(
      "headerCompactWeatherTextColorReset",
    );
    this.headerGreetingGlowEnabled = document.getElementById(
      "headerGreetingGlowEnabled",
    );
    this.headerGreetingGlowColor = document.getElementById(
      "headerGreetingGlowColor",
    );
    this.headerGreetingGlowColorReset = document.getElementById(
      "headerGreetingGlowColorReset",
    );
    this.headerGreetingGlowPopoverBtn = document.getElementById(
      "headerGreetingGlowPopoverBtn",
    );
    this.headerGreetingGlowPopover = document.getElementById(
      "headerGreetingGlowPopover",
    );
    this.headerGreetingGlowOpacity = document.getElementById(
      "headerGreetingGlowOpacity",
    );
    this.headerGreetingGlowOpacityValue = document.getElementById(
      "headerGreetingGlowOpacityValue",
    );
    this.headerGreetingGlowRadius = document.getElementById(
      "headerGreetingGlowRadius",
    );
    this.headerGreetingGlowRadiusValue = document.getElementById(
      "headerGreetingGlowRadiusValue",
    );
    this.headerDateGlowEnabled = document.getElementById(
      "headerDateGlowEnabled",
    );
    this.headerDateGlowColor = document.getElementById("headerDateGlowColor");
    this.headerDateGlowColorReset = document.getElementById(
      "headerDateGlowColorReset",
    );
    this.headerDateGlowPopoverBtn = document.getElementById(
      "headerDateGlowPopoverBtn",
    );
    this.headerDateGlowPopover = document.getElementById(
      "headerDateGlowPopover",
    );
    this.headerDateGlowOpacity = document.getElementById(
      "headerDateGlowOpacity",
    );
    this.headerDateGlowOpacityValue = document.getElementById(
      "headerDateGlowOpacityValue",
    );
    this.headerDateGlowRadius = document.getElementById("headerDateGlowRadius");
    this.headerDateGlowRadiusValue = document.getElementById(
      "headerDateGlowRadiusValue",
    );
    this.headerTimeGlowEnabled = document.getElementById(
      "headerTimeGlowEnabled",
    );
    this.headerTimeGlowColor = document.getElementById("headerTimeGlowColor");
    this.headerTimeGlowColorReset = document.getElementById(
      "headerTimeGlowColorReset",
    );
    this.headerTimeGlowPopoverBtn = document.getElementById(
      "headerTimeGlowPopoverBtn",
    );
    this.headerTimeGlowPopover = document.getElementById(
      "headerTimeGlowPopover",
    );
    this.headerTimeGlowOpacity = document.getElementById(
      "headerTimeGlowOpacity",
    );
    this.headerTimeGlowOpacityValue = document.getElementById(
      "headerTimeGlowOpacityValue",
    );
    this.headerTimeGlowRadius = document.getElementById("headerTimeGlowRadius");
    this.headerTimeGlowRadiusValue = document.getElementById(
      "headerTimeGlowRadiusValue",
    );
    this.headerNextPrayerGlowEnabled = document.getElementById(
      "headerNextPrayerGlowEnabled",
    );
    this.headerNextPrayerGlowColor = document.getElementById(
      "headerNextPrayerGlowColor",
    );
    this.headerNextPrayerGlowColorReset = document.getElementById(
      "headerNextPrayerGlowColorReset",
    );
    this.headerNextPrayerGlowPopoverBtn = document.getElementById(
      "headerNextPrayerGlowPopoverBtn",
    );
    this.headerNextPrayerGlowPopover = document.getElementById(
      "headerNextPrayerGlowPopover",
    );
    this.headerNextPrayerGlowOpacity = document.getElementById(
      "headerNextPrayerGlowOpacity",
    );
    this.headerNextPrayerGlowOpacityValue = document.getElementById(
      "headerNextPrayerGlowOpacityValue",
    );
    this.headerNextPrayerGlowRadius = document.getElementById(
      "headerNextPrayerGlowRadius",
    );
    this.headerNextPrayerGlowRadiusValue = document.getElementById(
      "headerNextPrayerGlowRadiusValue",
    );
    this.headerCompactWeatherGlowEnabled = document.getElementById(
      "headerCompactWeatherGlowEnabled",
    );
    this.headerCompactWeatherGlowColor = document.getElementById(
      "headerCompactWeatherGlowColor",
    );
    this.headerCompactWeatherGlowColorReset = document.getElementById(
      "headerCompactWeatherGlowColorReset",
    );
    this.headerCompactWeatherGlowPopoverBtn = document.getElementById(
      "headerCompactWeatherGlowPopoverBtn",
    );
    this.headerCompactWeatherGlowPopover = document.getElementById(
      "headerCompactWeatherGlowPopover",
    );
    this.headerCompactWeatherGlowOpacity = document.getElementById(
      "headerCompactWeatherGlowOpacity",
    );
    this.headerCompactWeatherGlowOpacityValue = document.getElementById(
      "headerCompactWeatherGlowOpacityValue",
    );
    this.headerCompactWeatherGlowRadius = document.getElementById(
      "headerCompactWeatherGlowRadius",
    );
    this.headerCompactWeatherGlowRadiusValue = document.getElementById(
      "headerCompactWeatherGlowRadiusValue",
    );
    this.headerSurfaceBackgroundsGroup = document.getElementById(
      "headerSurfaceBackgroundsGroup",
    );
    this.dateCalendarRadios = document.querySelectorAll(
      'input[name="dateCalendar"]',
    );

    // Component visibility elements
    this.visibilityHeader = document.getElementById("visibilityHeader");
    this.visibilityQuickPins = document.getElementById("visibilityQuickPins");
    this.visibilitySearchBar = document.getElementById("visibilitySearchBar");
    this.visibilityQuotes = document.getElementById("visibilityQuotes");
    this.visibilityPrayerTimes = document.getElementById(
      "visibilityPrayerTimes",
    );
    this.visibilityHijriCalendar = document.getElementById(
      "visibilityHijriCalendar",
    );
    this.visibilityQiblaDirection = document.getElementById(
      "visibilityQiblaDirection",
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
      "visibilityPocketQuran",
    );

    // Moment tab visibility controls (mirrors shared settings)
    this.momentVisibilityPrayerTimes = document.getElementById(
      "momentVisibilityPrayerTimes",
    );
    this.momentVisibilityFasting = document.getElementById(
      "momentVisibilityFasting",
    );
    this.momentVisibilityQuotes = document.getElementById(
      "momentVisibilityQuotes",
    );
    this.momentVisibilityQuickPins = document.getElementById(
      "momentVisibilityQuickPins",
    );
    this.momentVisibilitySearchBar = document.getElementById(
      "momentVisibilitySearchBar",
    );
    this.momentVisibilityClock = document.getElementById(
      "momentVisibilityClock",
    );

    this.weatherUnitRadios = document.querySelectorAll(
      'input[name="weatherUnit"]',
    );

    // Quote layout style element
    this.quoteLayoutStyleSelect = document.getElementById(
      "quoteLayoutStyleSelect",
    );

    // Compact weather elements
    this.compactWeatherEnabled = document.getElementById(
      "compactWeatherEnabled",
    );
    this.compactWeatherOptions = document.getElementById(
      "compactWeatherOptions",
    );
    this.compactWeatherModeRadios = document.querySelectorAll(
      'input[name="compactWeatherMode"]',
    );
    this.compactWeatherShowLocationName = document.getElementById(
      "compactWeatherShowLocationName",
    );

    // Weather tab elements
    this.weatherLocationModeRadios = document.querySelectorAll(
      'input[name="weatherLocationMode"]',
    );
    this.weatherManualLocationFields = document.getElementById(
      "weatherManualLocationFields",
    );
    this.weatherCityInput = document.getElementById("weatherCityInput");
    this.weatherLatitudeInput = document.getElementById("weatherLatitudeInput");
    this.weatherLongitudeInput = document.getElementById(
      "weatherLongitudeInput",
    );
    this.weatherSearchCityBtn = document.getElementById("weatherSearchCityBtn");
    this.weatherPasteCoordsBtn = document.getElementById(
      "weatherPasteCoordsBtn",
    );
    this.weatherCitySearchResults = document.getElementById(
      "weatherCitySearchResults",
    );

    // Fasting Times tab elements
    this.fastingShowMonday = document.getElementById("fastingShowMonday");
    this.fastingShowThursday = document.getElementById("fastingShowThursday");
    this.fastingShowAyyamAlBeed = document.getElementById(
      "fastingShowAyyamAlBeed",
    );
    this.fastingShowAshuraDays = document.getElementById(
      "fastingShowAshuraDays",
    );
    this.fastingShowDhuAlHijjah = document.getElementById(
      "fastingShowDhuAlHijjah",
    );
    this.fastingShowArafah = document.getElementById("fastingShowArafah");
    this.fastingShowRamadan = document.getElementById("fastingShowRamadan");
    this.fastingShowRecommendations = document.getElementById(
      "fastingShowRecommendations",
    );
    this.fastingDhuAlHijjahWithinDays = document.getElementById(
      "fastingDhuAlHijjahWithinDays",
    );
    this.fastingArafahWithinDays = document.getElementById(
      "fastingArafahWithinDays",
    );
    this.fastingAshuraWithinDays = document.getElementById(
      "fastingAshuraWithinDays",
    );
    this.fastingHijriCalendar = document.getElementById(
      "fastingHijriCalendar",
    );
    this.fastingHijriCalendarHint = document.getElementById(
      "fastingHijriCalendarHint",
    );
    this.fastingNotificationsEnabled = document.getElementById(
      "fastingNotificationsEnabled",
    );
    this.fastingNotificationMinutesBefore = document.getElementById(
      "fastingNotificationMinutesBefore",
    );
    this.fastingNotifyMonday = document.getElementById("fastingNotifyMonday");
    this.fastingNotifyThursday = document.getElementById(
      "fastingNotifyThursday",
    );
    this.fastingNotifyAyyamAlBeed = document.getElementById(
      "fastingNotifyAyyamAlBeed",
    );
    this.fastingNotifyAshuraDays = document.getElementById(
      "fastingNotifyAshuraDays",
    );
    this.fastingNotifyDhuAlHijjah = document.getElementById(
      "fastingNotifyDhuAlHijjah",
    );
    this.fastingNotifyArafah = document.getElementById("fastingNotifyArafah");
    this.fastingNotifyRamadan = document.getElementById("fastingNotifyRamadan");
    this.fastingNotificationToggles = document.getElementById(
      "fastingNotificationToggles",
    );

    // Pinned Apps tab elements
    this.pinnedAppsPerRow = document.getElementById("pinnedAppsPerRow");
    this.pinnedAppsPerRowValue = document.getElementById(
      "pinnedAppsPerRowValue",
    );
    this.pinnedAppsOpenInNewTab = document.getElementById(
      "pinnedAppsOpenInNewTab",
    );

    // Search Bar tab elements
    this.searchBarOpenInNewTab = document.getElementById(
      "searchBarOpenInNewTab",
    );

    // Notes tab elements
    this.importNotesBtn = document.getElementById("importNotesBtn");
    this.exportNotesBtn = document.getElementById("exportNotesBtn");
    this.importNotesInput = document.getElementById("importNotesInput");
    this.notesCardFontFamily = document.getElementById("notesCardFontFamily");
    this.notesCountHint = document.getElementById("notesCountHint");

    // Pocket Quran tab elements
    this.pocketQuranArabicSize = document.getElementById(
      "pocketQuranArabicSize",
    );
    this.pocketQuranArabicSizeValue = document.getElementById(
      "pocketQuranArabicSizeSettingValue",
    );
    this.pocketQuranTranslationSize = document.getElementById(
      "pocketQuranTranslationSize",
    );
    this.pocketQuranTranslationSizeValue = document.getElementById(
      "pocketQuranTranslationSizeSettingValue",
    );
    this.pocketQuranPopupArabicSize = document.getElementById(
      "pocketQuranPopupArabicSize",
    );
    this.pocketQuranPopupArabicSizeValue = document.getElementById(
      "pocketQuranPopupArabicSizeSettingValue",
    );
    this.pocketQuranPopupTranslationSize = document.getElementById(
      "pocketQuranPopupTranslationSize",
    );
    this.pocketQuranPopupTranslationSizeValue = document.getElementById(
      "pocketQuranPopupTranslationSizeSettingValue",
    );
    this.pocketQuranPopupArabicFontFamily = document.getElementById(
      "pocketQuranPopupArabicFontFamily",
    );
    this.pocketQuranPopupArabicFontPickerBtn = document.getElementById(
      "pocketQuranPopupArabicFontPickerBtn",
    );
    this.pocketQuranPopupArabicFontPickerLabel = document.getElementById(
      "pocketQuranPopupArabicFontPickerLabel",
    );
    this.pocketQuranPopupTranslationFontFamily = document.getElementById(
      "pocketQuranPopupTranslationFontFamily",
    );
    this.pocketQuranPopupTranslationFontPickerBtn = document.getElementById(
      "pocketQuranPopupTranslationFontPickerBtn",
    );
    this.pocketQuranPopupTranslationFontPickerLabel = document.getElementById(
      "pocketQuranPopupTranslationFontPickerLabel",
    );
    this.pocketQuranReciterPickerBtn = document.getElementById(
      "pocketQuranReciterPickerBtn",
    );
    this.pocketQuranReciterPickerLabel = document.getElementById(
      "pocketQuranReciterPickerLabel",
    );
    this.pocketQuranHighlighterDelay = document.getElementById(
      "pocketQuranHighlighterDelay",
    );
    this.pocketQuranHighlighterDelayValue = document.getElementById(
      "pocketQuranHighlighterDelaySettingValue",
    );
    this.pocketQuranArabicFontPickerBtn = document.getElementById(
      "pocketQuranArabicFontPickerBtn",
    );
    this.pocketQuranArabicFontPickerLabel = document.getElementById(
      "pocketQuranArabicFontPickerLabel",
    );
    this.pocketQuranTranslationFontFamily = document.getElementById(
      "pocketQuranTranslationFontFamily",
    );
    this.pocketQuranTranslationFontPickerBtn = document.getElementById(
      "pocketQuranTranslationFontPickerBtn",
    );
    this.pocketQuranTranslationFontPickerLabel = document.getElementById(
      "pocketQuranTranslationFontPickerLabel",
    );
    this.pocketQuranTranslationPickerBtn = document.getElementById(
      "pocketQuranTranslationPickerBtn",
    );
    this.pocketQuranTranslationPickerLabel = document.getElementById(
      "pocketQuranTranslationPickerLabel",
    );
    this.pocketQuranTranslationSelect = document.getElementById(
      "pocketQuranTranslationSelect",
    );
    this.pocketQuranRecitationFloatingEnabled = document.getElementById(
      "pocketQuranRecitationFloatingEnabled",
    );
    this.pocketQuranRecitationAutoDockOnVisible = document.getElementById(
      "pocketQuranRecitationAutoDockOnVisible",
    );
    this.pocketQuranRecitationFloatingAppearanceRadios =
      document.querySelectorAll(
        'input[name="pocketQuranRecitationFloatingAppearance"]',
      );

    this.pocketQuranCopyIncludeArabic = document.getElementById(
      "pocketQuranCopyIncludeArabic",
    );

    this.pocketQuranTajweedColors = document.getElementById(
      "pocketQuranTajweedColors",
    );

    this.pocketQuranResetAllTajweedColorsBtn = document.getElementById(
      "pocketQuranResetAllTajweedColorsBtn",
    );

    // Pocket Quran bookmark elements
    this.pocketQuranExportBookmarksBtn = document.getElementById(
      "pocketQuranExportBookmarksBtn",
    );
    this.pocketQuranImportBookmarksBtn = document.getElementById(
      "pocketQuranImportBookmarksBtn",
    );
    this.pocketQuranImportBookmarksInput = document.getElementById(
      "pocketQuranImportBookmarksInput",
    );
    this.pocketQuranBookmarkStats = document.getElementById(
      "pocketQuranBookmarkStats",
    );

    // Debounced theme slider updates (prevents heavy re-theme on every tick).
    this._themeSliderDebounceTimers = Object.create(null);
  }
}

// Export for use
window.SettingsManager = SettingsManager;

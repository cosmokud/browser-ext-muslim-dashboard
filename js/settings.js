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
    this.headerGreetingGlowEnabled = document.getElementById(
      "headerGreetingGlowEnabled",
    );
    this.headerGreetingGlowColor = document.getElementById(
      "headerGreetingGlowColor",
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
    this.pocketQuranPopupTranslationFontPickerLabel =
      document.getElementById("pocketQuranPopupTranslationFontPickerLabel");
    this.pocketQuranReciterPickerBtn = document.getElementById(
      "pocketQuranReciterPickerBtn",
    );
    this.pocketQuranReciterPickerLabel = document.getElementById(
      "pocketQuranReciterPickerLabel",
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

  /**
   * Initialize settings
   */
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

  /**
   * Load settings into form
   */
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

    const defaultBeforeMinutes = this.clampNumber(
      parseInt(pn.beforeMinutes, 10),
      0,
      180,
      10,
    );
    const defaultAfterMinutes = this.clampNumber(
      parseInt(pn.afterMinutes, 10),
      0,
      180,
      0,
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
              defaultBeforeMinutes,
            )
          : defaultBeforeMinutes;
      const afterMinutes =
        entry && typeof entry === "object"
          ? this.clampNumber(
              parseInt(entry.afterMinutes, 10),
              0,
              180,
              defaultAfterMinutes,
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
        const clamped = this.clampNumber(
          settings.containerWidthCustom,
          20,
          98,
          70,
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
    const pqPopup = settings.pocketQuranPopup || {};

    if (this.pocketQuranArabicSize) {
      const clamped = this.clampNumber(pq.arabicFontSize, 8, 144, 40);
      this.pocketQuranArabicSize.value = String(clamped);
      this.updatePocketQuranArabicSizeLabel();
    }

    if (this.pocketQuranTranslationSize) {
      const clamped = this.clampNumber(pq.translationFontSize, 8, 144, 18);
      this.pocketQuranTranslationSize.value = String(clamped);
      this.updatePocketQuranTranslationSizeLabel();
    }

    if (this.pocketQuranTranslationFontFamily) {
      this.pocketQuranTranslationFontFamily.value =
        this.normalizePocketQuranTranslationFontFamily(
          pq.translationFontFamily,
        );
    }

    if (this.pocketQuranPopupArabicSize) {
      const clamped = this.clampNumber(
        pqPopup.arabicFontSize,
        8,
        144,
        this.clampNumber(pq.arabicFontSize, 8, 144, 40),
      );
      this.pocketQuranPopupArabicSize.value = String(clamped);
      this.updatePocketQuranPopupArabicSizeLabel();
    }

    if (this.pocketQuranPopupTranslationSize) {
      const clamped = this.clampNumber(
        pqPopup.translationFontSize,
        8,
        144,
        this.clampNumber(pq.translationFontSize, 8, 144, 18),
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
      40,
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
      18,
    );
    this.pocketQuranTranslationSize.value = String(clamped);
    this.pocketQuranTranslationSizeValue.textContent = `${clamped}px`;
  }

  updatePocketQuranPopupArabicSizeLabel() {
    if (
      !this.pocketQuranPopupArabicSize ||
      !this.pocketQuranPopupArabicSizeValue
    )
      return;

    const clamped = this.clampNumber(
      parseInt(this.pocketQuranPopupArabicSize.value, 10),
      8,
      144,
      40,
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

    const clamped = this.clampNumber(
      parseInt(this.pocketQuranPopupTranslationSize.value, 10),
      8,
      144,
      18,
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
    const clamped = this.clampNumber(
      parseInt(this.pinnedAppsPerRow.value, 10),
      3,
      20,
      10,
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

    this.updateHeaderGlowTuningUi();
    this.updateHeaderGlowColorLockState();

    this.updateHeaderSurfaceBackgroundsLockState();
  }

  /**
   * Load component visibility settings
   */
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

  /**
   * Load weather settings
   */
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

    // Within days settings
    if (this.fastingDhuAlHijjahWithinDays) {
      const clamped = this.clampNumber(
        fasting.dhuAlHijjahWithinDays,
        7,
        365,
        30,
      );
      this.fastingDhuAlHijjahWithinDays.value = String(clamped);
    }
    if (this.fastingArafahWithinDays) {
      const clamped = this.clampNumber(fasting.arafahWithinDays, 7, 365, 30);
      this.fastingArafahWithinDays.value = String(clamped);
    }
    if (this.fastingAshuraWithinDays) {
      const clamped = this.clampNumber(fasting.ashuraWithinDays, 7, 365, 30);
      this.fastingAshuraWithinDays.value = String(clamped);
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
      "Paste coordinates (e.g., -7.918300911805475, 112.60764545030851)",
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

  normalizeColorHex(value, fallback = "") {
    const raw = String(value || "").trim();
    if (!raw) return fallback;

    const shortHex = raw.match(/^#([0-9a-f]{3})$/i);
    if (shortHex) {
      const expanded = shortHex[1]
        .split("")
        .map((c) => c + c)
        .join("")
        .toLowerCase();
      return `#${expanded}`;
    }

    const fullHex = raw.match(/^#([0-9a-f]{6})$/i);
    if (fullHex) {
      return `#${fullHex[1].toLowerCase()}`;
    }

    return fallback;
  }

  parseCssRgbColor(colorValue) {
    const value = String(colorValue || "").trim();
    const match = value.match(
      /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*[0-9.]+)?\s*\)$/i,
    );
    if (!match) return null;

    return {
      r: Math.max(0, Math.min(255, Math.round(Number(match[1])))),
      g: Math.max(0, Math.min(255, Math.round(Number(match[2])))),
      b: Math.max(0, Math.min(255, Math.round(Number(match[3])))),
    };
  }

  rgbToHex(r, g, b) {
    const toHex = (value) =>
      Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  getAutoHeaderGlowColor(targetSelector, fallback = "#ffffff") {
    if (typeof window.getComputedStyle !== "function") return fallback;

    const target =
      typeof targetSelector === "string"
        ? document.querySelector(targetSelector)
        : targetSelector;

    const source = target || document.body;
    if (!source) return fallback;

    const rgb = this.parseCssRgbColor(window.getComputedStyle(source).color);
    if (!rgb) return fallback;

    return this.rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
  }

  clampHeaderGlowOpacity(value, fallback = 72) {
    return this.clampNumber(parseInt(value, 10), 0, 100, fallback);
  }

  clampHeaderGlowRadius(value, fallback = 14) {
    return this.clampNumber(parseInt(value, 10), 0, 50, fallback);
  }

  getHeaderGlowControlConfigs() {
    return [
      {
        key: "greeting",
        toggle: this.headerGreetingGlowEnabled,
        color: this.headerGreetingGlowColor,
        button: this.headerGreetingGlowPopoverBtn,
        popover: this.headerGreetingGlowPopover,
        opacity: this.headerGreetingGlowOpacity,
        opacityValue: this.headerGreetingGlowOpacityValue,
        radius: this.headerGreetingGlowRadius,
        radiusValue: this.headerGreetingGlowRadiusValue,
      },
      {
        key: "date",
        toggle: this.headerDateGlowEnabled,
        color: this.headerDateGlowColor,
        button: this.headerDateGlowPopoverBtn,
        popover: this.headerDateGlowPopover,
        opacity: this.headerDateGlowOpacity,
        opacityValue: this.headerDateGlowOpacityValue,
        radius: this.headerDateGlowRadius,
        radiusValue: this.headerDateGlowRadiusValue,
      },
      {
        key: "time",
        toggle: this.headerTimeGlowEnabled,
        color: this.headerTimeGlowColor,
        button: this.headerTimeGlowPopoverBtn,
        popover: this.headerTimeGlowPopover,
        opacity: this.headerTimeGlowOpacity,
        opacityValue: this.headerTimeGlowOpacityValue,
        radius: this.headerTimeGlowRadius,
        radiusValue: this.headerTimeGlowRadiusValue,
      },
      {
        key: "nextPrayer",
        toggle: this.headerNextPrayerGlowEnabled,
        color: this.headerNextPrayerGlowColor,
        button: this.headerNextPrayerGlowPopoverBtn,
        popover: this.headerNextPrayerGlowPopover,
        opacity: this.headerNextPrayerGlowOpacity,
        opacityValue: this.headerNextPrayerGlowOpacityValue,
        radius: this.headerNextPrayerGlowRadius,
        radiusValue: this.headerNextPrayerGlowRadiusValue,
      },
      {
        key: "compactWeather",
        toggle: this.headerCompactWeatherGlowEnabled,
        color: this.headerCompactWeatherGlowColor,
        button: this.headerCompactWeatherGlowPopoverBtn,
        popover: this.headerCompactWeatherGlowPopover,
        opacity: this.headerCompactWeatherGlowOpacity,
        opacityValue: this.headerCompactWeatherGlowOpacityValue,
        radius: this.headerCompactWeatherGlowRadius,
        radiusValue: this.headerCompactWeatherGlowRadiusValue,
      },
    ];
  }

  updateHeaderGlowTuningUi() {
    this.getHeaderGlowControlConfigs().forEach((config) => {
      if (config.opacity && config.opacityValue) {
        const opacity = this.clampHeaderGlowOpacity(config.opacity.value, 72);
        config.opacity.value = String(opacity);
        config.opacityValue.textContent = `${opacity}%`;
      }
      if (config.radius && config.radiusValue) {
        const radius = this.clampHeaderGlowRadius(config.radius.value, 14);
        config.radius.value = String(radius);
        config.radiusValue.textContent = `${radius}px`;
      }
    });
  }

  closeAllHeaderGlowPopovers() {
    this.getHeaderGlowControlConfigs().forEach((config) => {
      if (config.popover) {
        config.popover.classList.remove("open");
      }
      if (config.button) {
        config.button.setAttribute("aria-expanded", "false");
      }
    });
  }

  setupHeaderGlowPopoverControls() {
    const configs = this.getHeaderGlowControlConfigs();
    if (!configs.length) return;

    this.updateHeaderGlowTuningUi();

    configs.forEach((config) => {
      if (config.button && config.popover) {
        config.button.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          const willOpen = !config.popover.classList.contains("open");
          this.closeAllHeaderGlowPopovers();

          if (willOpen) {
            config.popover.classList.add("open");
            config.button.setAttribute("aria-expanded", "true");
          }
        });

        config.popover.addEventListener("click", (e) => {
          e.stopPropagation();
        });
      }

      if (config.opacity) {
        config.opacity.addEventListener("input", () => {
          this.updateHeaderGlowTuningUi();
          this.applyHeaderQuickControlsInstantly();
        });
        config.opacity.addEventListener("change", () => {
          this.updateHeaderGlowTuningUi();
          this.applyHeaderQuickControlsInstantly();
        });
      }

      if (config.radius) {
        config.radius.addEventListener("input", () => {
          this.updateHeaderGlowTuningUi();
          this.applyHeaderQuickControlsInstantly();
        });
        config.radius.addEventListener("change", () => {
          this.updateHeaderGlowTuningUi();
          this.applyHeaderQuickControlsInstantly();
        });
      }
    });

    if (this.modal && this.modal.dataset.headerGlowPopoverBound !== "1") {
      this.modal.dataset.headerGlowPopoverBound = "1";
      this.modal.addEventListener("click", () => {
        this.closeAllHeaderGlowPopovers();
      });
    }

    if (document.documentElement.dataset.headerGlowEscBound !== "1") {
      document.documentElement.dataset.headerGlowEscBound = "1";
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          this.closeAllHeaderGlowPopovers();
        }
      });
    }
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
        70,
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
        100,
      );
      this.uiBlurPower.value = String(clamped);
      this.uiBlurPowerValue.textContent = clamped + "%";
    }
  }

  updateBackgroundDimLabel() {
    if (this.bgDimValue && this.bgDim) {
      const clamped = this.normalizeBackgroundDim(this.bgDim.value, 100);
      this.bgDim.value = String(clamped);
      this.bgDimValue.textContent = clamped + "%";
    }
  }

  updateBackgroundBlurLabel() {
    if (this.bgBlurValue && this.bgBlur) {
      const clamped = this.normalizeBackgroundBlur(this.bgBlur.value, 0);
      this.bgBlur.value = String(clamped);
      this.bgBlurValue.textContent = clamped + "px";
    }
  }

  resolveDashboardQualityState(
    performanceModeEnabled,
    highestVisualFidelityEnabled,
    preferredMode = "performance",
  ) {
    let performance = performanceModeEnabled === true;
    let highest = highestVisualFidelityEnabled === true;

    if (performance && highest) {
      if (preferredMode === "highest") {
        performance = false;
      } else {
        highest = false;
      }
    }

    return {
      performanceModeEnabled: performance,
      highestVisualFidelityEnabled: highest,
    };
  }

  isHighestVisualFidelityEnabled() {
    if (typeof window !== "undefined") {
      if (typeof window.__MD_HIGHEST_VISUAL_FIDELITY__ === "boolean") {
        return window.__MD_HIGHEST_VISUAL_FIDELITY__ === true;
      }
    }

    try {
      return (
        this.storage.getSettings()?.theme?.highestVisualFidelityEnabled === true
      );
    } catch (e) {
      return false;
    }
  }

  applyUiBlurPower(powerPercent) {
    const clamped = this.clampNumber(powerPercent, 0, 200, 100);
    const baseMultiplier = clamped / 100;
    const highestVisualFidelityEnabled = this.isHighestVisualFidelityEnabled();
    const effectiveMultiplier = highestVisualFidelityEnabled
      ? baseMultiplier
      : Number((baseMultiplier * 0.72).toFixed(3));

    document.documentElement.style.setProperty(
      "--ui-blur-base-multiplier",
      String(baseMultiplier),
    );
    document.documentElement.style.setProperty(
      "--ui-blur-multiplier",
      String(effectiveMultiplier),
    );

    // Notify components that render UI outside their card's DOM subtree
    // (e.g., portalled dropdowns) to resync blur values.
    try {
      document.dispatchEvent(
        new CustomEvent("md:ui-blur-update", {
          detail: {
            multiplier: effectiveMultiplier,
            baseMultiplier,
            highestVisualFidelityEnabled,
          },
        }),
      );
    } catch (e) {}
  }

  applyHighestVisualFidelity(enabled) {
    const isEnabled = enabled === true;
    const root = document.documentElement;
    const body = document.body;

    if (root) {
      root.dataset.highestVisualFidelity = isEnabled ? "true" : "false";
      root.classList.toggle("highest-visual-fidelity", isEnabled);
    }

    if (body) {
      body.classList.toggle("highest-visual-fidelity", isEnabled);
    }

    window.__MD_HIGHEST_VISUAL_FIDELITY__ = isEnabled;

    try {
      document.dispatchEvent(
        new CustomEvent("md:highest-visual-fidelity-change", {
          detail: { enabled: isEnabled },
        }),
      );
    } catch (e) {}
  }

  applyDashboardQualityState(preferredMode = "performance") {
    const resolved = this.resolveDashboardQualityState(
      this.themePerformanceModeEnabled?.checked === true,
      this.themeHighestVisualFidelityEnabled?.checked === true,
      preferredMode,
    );

    if (this.themePerformanceModeEnabled) {
      this.themePerformanceModeEnabled.checked =
        resolved.performanceModeEnabled;
    }
    if (this.themeHighestVisualFidelityEnabled) {
      this.themeHighestVisualFidelityEnabled.checked =
        resolved.highestVisualFidelityEnabled;
    }

    this.applyHighestVisualFidelity(resolved.highestVisualFidelityEnabled);
    this.applyPerformanceMode(resolved.performanceModeEnabled);
    this.applyUiBlurPower(
      this.themeBlurPower?.value ?? this.storage.getSettings()?.uiBlurPower,
    );

    return resolved;
  }

  applyPerformanceMode(enabled) {
    const isEnabled = enabled === true;
    const root = document.documentElement;
    const body = document.body;

    if (root) {
      root.dataset.performanceMode = isEnabled ? "true" : "false";
      root.classList.toggle("performance-mode", isEnabled);
    }

    if (body) {
      body.classList.toggle("performance-mode", isEnabled);
    }

    window.__MD_PERFORMANCE_MODE__ = isEnabled;

    try {
      document.dispatchEvent(
        new CustomEvent("md:performance-mode-change", {
          detail: { enabled: isEnabled },
        }),
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

  _startRefreshButton(btn, { label = "Refreshing…" } = {}) {
    if (!btn) return () => {};

    const originalText =
      btn.dataset?.mdIconifyOriginal || btn.textContent || "";
    const prevDisabled = btn.disabled === true;

    const iconHtml = `<span class="refresh-cw-icon" aria-hidden="true">${this._getIcon(
      "🔄",
      { size: 16, inline: true },
    )}</span>`;

    btn.classList.add("is-refreshing");
    btn.disabled = true;
    btn.innerHTML = `${iconHtml}<span class="refresh-label">${label}</span>`;

    let finished = false;
    return () => {
      if (finished) return;
      finished = true;
      btn.classList.remove("is-refreshing");
      btn.disabled = prevDisabled;
      btn.textContent = originalText;
      try {
        const iconThemes = window.dashboard?.iconThemes;
        if (iconThemes?.applyDomIconReplacements) {
          // applyDomIconReplacements doesn't process the root element itself,
          // so target the parent (or document) to re-iconify this button.
          iconThemes.applyDomIconReplacements(btn.parentElement || document);
        }
      } catch (e) {}
    };
  }

  /**
   * Setup icon theme picker
   */
  setupIconThemePicker() {
    if (!this.iconThemePicker) return;

    // Load current icon theme setting
    const settings = this.storage.getSettings();
    const currentIconTheme = settings.iconTheme || "monochrome";
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

    // Load glass opacity
    const glassOpacity = this.clampNumber(
      themeSettings.glassOpacity,
      0,
      100,
      window.dashboard?.themes?.getGlassOpacity?.() ?? 50,
    );
    if (this.themeGlassOpacity) {
      this.themeGlassOpacity.value = String(glassOpacity);
    }
    this.updateThemeGlassOpacityLabel();

    // Load main grid component opacity
    const componentOpacity = this.clampNumber(
      themeSettings.componentOpacity,
      0,
      100,
      window.dashboard?.themes?.getMainGridComponentOpacity?.() ?? 0,
    );
    if (this.themeComponentOpacity) {
      this.themeComponentOpacity.value = String(componentOpacity);
    }
    this.updateThemeComponentOpacityLabel();

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
          70,
        );
        this.themeContainerWidthCustom.value = String(clamped);
      }
      this.updateThemeCustomWidthLabel();
    } else {
      this.toggleThemeCustomWidth(false);
    }

    const dashboardQualityState = this.resolveDashboardQualityState(
      settings.performanceModeEnabled === true,
      themeSettings.highestVisualFidelityEnabled === true,
      "performance",
    );

    if (this.themePerformanceModeEnabled) {
      this.themePerformanceModeEnabled.checked =
        dashboardQualityState.performanceModeEnabled;
    }
    if (this.themeHighestVisualFidelityEnabled) {
      this.themeHighestVisualFidelityEnabled.checked =
        dashboardQualityState.highestVisualFidelityEnabled;
    }
    this.applyHighestVisualFidelity(
      dashboardQualityState.highestVisualFidelityEnabled,
    );
    this.applyPerformanceMode(dashboardQualityState.performanceModeEnabled);
    this.applyUiBlurPower(settings.uiBlurPower ?? 100);

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
    const groups = document.querySelectorAll(".theme-blur-group");
    if (groups.length > 0) {
      groups.forEach((group) => {
        group.classList.toggle("disabled", !glassEnabled);
      });
      return;
    }

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
        100,
      );
      this.themeBlurPower.value = String(clamped);
      this.themeBlurPowerValue.textContent = clamped + "%";
    }
  }

  /**
   * Update theme glass opacity label
   */
  updateThemeGlassOpacityLabel() {
    if (this.themeGlassOpacityValue && this.themeGlassOpacity) {
      const clamped = this.clampNumber(
        parseInt(this.themeGlassOpacity.value, 10),
        0,
        100,
        50,
      );
      this.themeGlassOpacity.value = String(clamped);
      this.themeGlassOpacityValue.textContent = clamped + "%";
    }
  }

  /**
   * Update main grid component opacity label
   */
  updateThemeComponentOpacityLabel() {
    if (this.themeComponentOpacityValue && this.themeComponentOpacity) {
      const clamped = this.clampNumber(
        parseInt(this.themeComponentOpacity.value, 10),
        0,
        100,
        0,
      );
      this.themeComponentOpacity.value = String(clamped);
      this.themeComponentOpacityValue.textContent = clamped + "%";
    }
  }

  getSelectedClockStyleValue() {
    const selectedRadio = document.querySelector(
      'input[name="clockStyle"]:checked',
    );
    return selectedRadio?.value || "default";
  }

  isClockSurfaceLockedByStyle(clockStyle) {
    return clockStyle === "boxed" || clockStyle === "pill";
  }

  syncClockSurfaceToggleState(clockStyle = null) {
    if (!this.headerTimeBgEnabled) return;

    const selectedStyle = clockStyle || this.getSelectedClockStyleValue();
    const locked = this.isClockSurfaceLockedByStyle(selectedStyle);

    if (locked) {
      this.headerTimeBgEnabled.checked = false;
    }

    this.headerTimeBgEnabled.disabled = locked;
    this.headerTimeBgEnabled.setAttribute(
      "aria-disabled",
      locked ? "true" : "false",
    );

    const label = this.headerTimeBgEnabled.closest(".header-surface-cell");
    if (label) {
      if (!label.dataset.defaultTitle) {
        label.dataset.defaultTitle = label.getAttribute("title") || "";
      }

      label.classList.toggle("disabled", locked);
      label.setAttribute("aria-disabled", locked ? "true" : "false");
      label.setAttribute(
        "title",
        locked
          ? "Clock Surface is unavailable for Boxed and Pill clock styles"
          : label.dataset.defaultTitle,
      );
    }
  }

  updateHeaderSurfaceBackgroundsLockState() {
    const controls = [
      this.headerGreetingBgEnabled,
      this.headerDateBgEnabled,
      this.headerTimeBgEnabled,
      this.headerNextPrayerBgEnabled,
      this.headerCompactWeatherBgEnabled,
    ];

    controls.forEach((control) => {
      if (!control) return;
      control.disabled = false;
    });

    if (this.headerSurfaceBackgroundsGroup) {
      this.headerSurfaceBackgroundsGroup.classList.remove("disabled");
      this.headerSurfaceBackgroundsGroup.setAttribute("aria-disabled", "false");
    }

    this.syncClockSurfaceToggleState();
  }

  updateHeaderGlowColorLockState() {
    this.getHeaderGlowControlConfigs().forEach((config) => {
      const enabled = config.toggle?.checked === true;

      if (config.color) {
        config.color.disabled = !enabled;
        config.color.setAttribute("aria-disabled", enabled ? "false" : "true");
      }

      if (config.button) {
        config.button.disabled = !enabled;
        config.button.setAttribute("aria-disabled", enabled ? "false" : "true");
      }

      if (config.opacity) {
        config.opacity.disabled = !enabled;
        config.opacity.setAttribute(
          "aria-disabled",
          enabled ? "false" : "true",
        );
      }

      if (config.radius) {
        config.radius.disabled = !enabled;
        config.radius.setAttribute("aria-disabled", enabled ? "false" : "true");
      }

      if (!enabled && config.popover?.classList.contains("open")) {
        config.popover.classList.remove("open");
      }
      if (!enabled && config.button) {
        config.button.setAttribute("aria-expanded", "false");
      }
    });
  }

  applyHeaderQuickControlsInstantly() {
    const dashboard = window.dashboard;
    if (!dashboard || !this.storage) return;

    const settings = this.storage.getSettings();
    settings.heading = settings.heading || {};

    const selectedClockStyle = this.getSelectedClockStyleValue();
    const clockSurfaceLocked =
      this.isClockSurfaceLockedByStyle(selectedClockStyle);

    this.syncClockSurfaceToggleState(selectedClockStyle);

    settings.heading.showGreeting = this.showGreeting?.checked ?? true;
    settings.heading.showClock = this.showClock?.checked ?? true;
    settings.heading.showDate = this.showDate?.checked ?? true;
    settings.heading.showNextPrayer = this.showNextPrayer?.checked === true;
    settings.heading.clockStyle = selectedClockStyle;

    settings.compactWeatherEnabled =
      this.compactWeatherEnabled?.checked ?? false;

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

    settings.heading.greetingGlowEnabled =
      this.headerGreetingGlowEnabled?.checked === true;
    settings.heading.greetingGlowColor = settings.heading.greetingGlowEnabled
      ? this.normalizeColorHex(this.headerGreetingGlowColor?.value, "")
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
      ? this.normalizeColorHex(this.headerDateGlowColor?.value, "")
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
      ? this.normalizeColorHex(this.headerTimeGlowColor?.value, "")
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
      ? this.normalizeColorHex(this.headerNextPrayerGlowColor?.value, "")
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
      ? this.normalizeColorHex(this.headerCompactWeatherGlowColor?.value, "")
      : "";
    settings.heading.compactWeatherGlowOpacity = this.clampHeaderGlowOpacity(
      this.headerCompactWeatherGlowOpacity?.value,
      72,
    );
    settings.heading.compactWeatherGlowRadius = this.clampHeaderGlowRadius(
      this.headerCompactWeatherGlowRadius?.value,
      14,
    );

    this.storage.saveSettings(settings);

    this.toggleClockOptions(settings.heading.showClock !== false);
    this.toggleCompactWeatherOptions(settings.compactWeatherEnabled === true);

    if (typeof dashboard.updateGreeting === "function") {
      dashboard.updateGreeting();
    }
    if (typeof dashboard.updateDate === "function") {
      dashboard.updateDate();
    }
    if (
      dashboard.weather &&
      typeof dashboard.weather.updateCompactWeather === "function"
    ) {
      dashboard.weather.updateCompactWeather();
    }
    if (typeof dashboard.applyHeadingSettings === "function") {
      dashboard.applyHeadingSettings();
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
        70,
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

      // For customizable themes, preview using the saved/custom palette (per theme + mode)
      const palette = isCustomizable
        ? window.dashboard?.themes?.getCustomPalette?.(id, currentMode) ||
          settings.theme?.customPalettes?.[id]?.[currentMode] ||
          null
        : null;

      const previewPrimary = palette?.primary || colors.primary;
      const previewAccent =
        palette?.accentBackground ||
        palette?.accent ||
        colors.accentBackground ||
        colors.accent;
      const previewBg = palette?.bodyBg || colors.bodyBg;

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
                  { size: 16 },
                )}</span></button>`
              : ""
          }
          <div class="theme-card-check">${this._getIcon("✓", {
            size: 16,
          })}</div>
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
      const show = this._isThemePaletteResettable(themeName);
      resetBtn.style.display = show ? "inline-flex" : "none";
    }

    const title = document.getElementById("themePaletteModalTitle");
    if (title) {
      title.textContent = `🎨 Customize ${theme.name} Palette`;
    }

    this._themePaletteHasUnsavedPreview = false;
    this._toggleThemePaletteGlobalFontFields(themeName);

    this.updateThemePaletteModeButtons(this._paletteModalMode);
    this.syncThemePaletteModalInputs();

    overlay.classList.add("active");
    overlay.setAttribute("aria-hidden", "false");
  }

  closeThemePaletteModal() {
    this.flushThemePalettePreviewUpdates(true);

    const overlay = document.getElementById("themePaletteModal");
    if (!overlay) return;
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");

    this._paletteModalTheme = null;
    this._themePaletteHasUnsavedPreview = false;
  }

  _isThemePaletteResettable(themeName) {
    return (
      themeName === "pureWhite" ||
      themeName === "pureBlack" ||
      themeName === "userTheme"
    );
  }

  _isThemeWithGlobalFontPalette(themeName) {
    return (
      themeName === "pureWhite" ||
      themeName === "pureBlack" ||
      themeName === "userTheme"
    );
  }

  _getThemePaletteDefaultGlassTint(themeName, mode = "dark") {
    if (themeName === "pureBlack") return "#000000";
    if (themeName === "pureWhite") return "#ffffff";
    if (themeName === "userTheme") {
      return mode === "light" ? "#000000" : "#ffffff";
    }

    const primary = ThemeManager.THEMES?.[themeName]?.[mode]?.primary;
    return this._normalizeColorInputHex(primary, "#ffffff");
  }

  _getThemePaletteDefaultGlassBackground(themeName, mode = "dark") {
    const fallbackTint = this._getThemePaletteDefaultGlassTint(themeName, mode);
    const glassBg = ThemeManager.THEMES?.[themeName]?.[mode]?.glassBg;
    return this._normalizeColorInputHex(glassBg, fallbackTint);
  }

  _normalizeColorInputHex(value, fallbackHex) {
    if (typeof value !== "string") return fallbackHex;

    const normalized = value.trim().toLowerCase();
    if (/^#[a-f\d]{6}$/i.test(normalized)) return normalized;

    const shortMatch = normalized.match(/^#([a-f\d]{3})$/i);
    if (shortMatch) {
      const [r, g, b] = shortMatch[1].split("");
      return `#${r}${r}${g}${g}${b}${b}`;
    }

    const rgbaMatch = normalized
      .replace(/\s+/g, "")
      .match(/^rgba?\((\d+),(\d+),(\d+)(?:,[0-9.]+)?\)$/i);
    if (rgbaMatch) {
      const toHex = (channel) =>
        Math.max(0, Math.min(255, Number(channel)))
          .toString(16)
          .padStart(2, "0");
      return `#${toHex(rgbaMatch[1])}${toHex(rgbaMatch[2])}${toHex(
        rgbaMatch[3],
      )}`;
    }

    return fallbackHex;
  }

  _toggleThemePaletteGlobalFontFields(themeName) {
    const globalFontFields = document.getElementById(
      "themePaletteGlobalFontFields",
    );
    if (!globalFontFields) return;

    const supportsGlobalFontPalette =
      this._isThemeWithGlobalFontPalette(themeName);
    globalFontFields.classList.toggle("active", supportsGlobalFontPalette);
    globalFontFields.setAttribute(
      "aria-hidden",
      supportsGlobalFontPalette ? "false" : "true",
    );
  }

  scheduleThemePalettePreviewUpdate() {
    if (this._themePalettePreviewRaf) return;

    this._themePalettePreviewRaf = requestAnimationFrame(() => {
      this._themePalettePreviewRaf = null;
      this.applyThemePaletteFromModal(false, false);
      this._themePaletteHasUnsavedPreview = true;
    });
  }

  flushThemePalettePreviewUpdates(save = true) {
    if (this._themePalettePreviewRaf) {
      cancelAnimationFrame(this._themePalettePreviewRaf);
      this._themePalettePreviewRaf = null;
      this.applyThemePaletteFromModal(false, false);
      this._themePaletteHasUnsavedPreview = true;
    }

    if (save && this._themePaletteHasUnsavedPreview) {
      this.applyThemePaletteFromModal(true, true);
      this._themePaletteHasUnsavedPreview = false;
    }
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
    const onPrimaryEl = document.getElementById("themePaletteOnPrimaryText");
    const accentEl = document.getElementById("themePaletteAccent");
    const accentTextEl = document.getElementById("themePaletteAccentText");
    const bgEl = document.getElementById("themePaletteBackground");
    const glassBgEl = document.getElementById("themePaletteGlassBackground");
    const glassTintEl = document.getElementById("themePaletteGlassTint");
    const textPrimaryEl = document.getElementById("themePaletteTextPrimary");
    const textSecondaryEl = document.getElementById(
      "themePaletteTextSecondary",
    );
    const textMutedEl = document.getElementById("themePaletteTextMuted");
    const textPlaceholderEl = document.getElementById(
      "themePaletteTextPlaceholder",
    );
    if (
      !primaryEl ||
      !onPrimaryEl ||
      !accentEl ||
      !accentTextEl ||
      !bgEl ||
      !glassBgEl ||
      !glassTintEl
    )
      return;

    this._toggleThemePaletteGlobalFontFields(themeName);

    const base = ThemeManager.THEMES[themeName]?.[mode];
    if (!base) return;

    const palette =
      window.dashboard?.themes?.getCustomPalette?.(themeName, mode) || null;

    const defaultGlassTint = this._getThemePaletteDefaultGlassTint(
      themeName,
      mode,
    );
    const defaultGlassBackground = this._getThemePaletteDefaultGlassBackground(
      themeName,
      mode,
    );
    const resolvedPrimary = palette?.primary || base.primary;
    const defaultOnPrimaryText =
      palette?.onPrimaryText ||
      base.onPrimaryText ||
      (window.dashboard?.themes?._isDarkColor?.(resolvedPrimary)
        ? "#ffffff"
        : "#1a1a1a");
    const resolvedAccentBackground =
      palette?.accentBackground ||
      base.accentBackground ||
      palette?.accent ||
      base.accent;
    const resolvedAccentText =
      palette?.accentText || palette?.accent || base.accentText || base.accent;

    primaryEl.value = resolvedPrimary;
    onPrimaryEl.value = defaultOnPrimaryText;
    accentEl.value = this._normalizeColorInputHex(
      resolvedAccentBackground,
      base.accentBackground || base.accent,
    );
    accentTextEl.value = this._normalizeColorInputHex(
      resolvedAccentText,
      base.accentText || base.accent,
    );
    bgEl.value = palette?.bodyBg || base.bodyBg;
    glassBgEl.value = this._normalizeColorInputHex(
      palette?.glassBgColor || base.glassBg,
      defaultGlassBackground,
    );
    glassTintEl.value = palette?.glassTint || defaultGlassTint;

    if (
      this._isThemeWithGlobalFontPalette(themeName) &&
      textPrimaryEl &&
      textSecondaryEl &&
      textMutedEl &&
      textPlaceholderEl
    ) {
      const isDarkBackground =
        window.dashboard?.themes?._isDarkColor?.(
          palette?.bodyBg || base.bodyBg,
        ) || false;

      textPrimaryEl.value = this._normalizeColorInputHex(
        palette?.textPrimary || base.textPrimary,
        isDarkBackground ? "#ffffff" : "#1a1a1a",
      );
      textSecondaryEl.value = this._normalizeColorInputHex(
        palette?.textSecondary || base.textSecondary,
        isDarkBackground ? "#d9d9d9" : "#4d4d4d",
      );
      textMutedEl.value = this._normalizeColorInputHex(
        palette?.textMuted || base.textMuted,
        isDarkBackground ? "#9a9a9a" : "#7a7a7a",
      );
      textPlaceholderEl.value = this._normalizeColorInputHex(
        palette?.textPlaceholder ||
          base.textPlaceholder ||
          palette?.textMuted ||
          base.textMuted,
        isDarkBackground ? "#9a9a9a" : "#7a7a7a",
      );
    }
  }

  resetThemePaletteToDefaults(save = true) {
    const themeName = this._paletteModalTheme;
    const mode = this._paletteModalMode || "dark";
    if (!themeName || !window.dashboard?.themes) return;

    if (!this._isThemePaletteResettable(themeName)) return;

    const base = ThemeManager.THEMES?.[themeName]?.[mode];
    if (!base) return;

    const primaryEl = document.getElementById("themePalettePrimary");
    const onPrimaryEl = document.getElementById("themePaletteOnPrimaryText");
    const accentEl = document.getElementById("themePaletteAccent");
    const accentTextEl = document.getElementById("themePaletteAccentText");
    const bgEl = document.getElementById("themePaletteBackground");
    const glassBgEl = document.getElementById("themePaletteGlassBackground");
    const glassTintEl = document.getElementById("themePaletteGlassTint");
    const textPrimaryEl = document.getElementById("themePaletteTextPrimary");
    const textSecondaryEl = document.getElementById(
      "themePaletteTextSecondary",
    );
    const textMutedEl = document.getElementById("themePaletteTextMuted");
    const textPlaceholderEl = document.getElementById(
      "themePaletteTextPlaceholder",
    );
    if (
      !primaryEl ||
      !onPrimaryEl ||
      !accentEl ||
      !accentTextEl ||
      !bgEl ||
      !glassBgEl ||
      !glassTintEl
    )
      return;

    primaryEl.value = base.primary;
    onPrimaryEl.value =
      base.onPrimaryText ||
      (window.dashboard?.themes?._isDarkColor?.(base.primary)
        ? "#ffffff"
        : "#1a1a1a");
    accentEl.value = this._normalizeColorInputHex(
      base.accentBackground || base.accent,
      base.accent,
    );
    accentTextEl.value = this._normalizeColorInputHex(
      base.accentText || base.accent,
      base.accent,
    );
    bgEl.value = base.bodyBg;
    glassBgEl.value = this._getThemePaletteDefaultGlassBackground(
      themeName,
      mode,
    );
    glassTintEl.value = this._getThemePaletteDefaultGlassTint(themeName, mode);

    if (
      this._isThemeWithGlobalFontPalette(themeName) &&
      textPrimaryEl &&
      textSecondaryEl &&
      textMutedEl &&
      textPlaceholderEl
    ) {
      textPrimaryEl.value = this._normalizeColorInputHex(
        base.textPrimary,
        "#ffffff",
      );
      textSecondaryEl.value = this._normalizeColorInputHex(
        base.textSecondary,
        "#d9d9d9",
      );
      textMutedEl.value = this._normalizeColorInputHex(
        base.textMuted,
        "#9a9a9a",
      );
      textPlaceholderEl.value = this._normalizeColorInputHex(
        base.textPlaceholder || base.textMuted,
        "#9a9a9a",
      );
    }

    this.applyThemePaletteFromModal(save);
    this.renderThemePickerGrid();
  }

  applyThemePaletteFromModal(save = true, renderGrid = true) {
    const themeName = this._paletteModalTheme;
    const mode = this._paletteModalMode || "dark";
    if (!themeName || !window.dashboard?.themes) return;

    const primaryEl = document.getElementById("themePalettePrimary");
    const onPrimaryEl = document.getElementById("themePaletteOnPrimaryText");
    const accentEl = document.getElementById("themePaletteAccent");
    const accentTextEl = document.getElementById("themePaletteAccentText");
    const bgEl = document.getElementById("themePaletteBackground");
    const glassBgEl = document.getElementById("themePaletteGlassBackground");
    const glassTintEl = document.getElementById("themePaletteGlassTint");
    const textPrimaryEl = document.getElementById("themePaletteTextPrimary");
    const textSecondaryEl = document.getElementById(
      "themePaletteTextSecondary",
    );
    const textMutedEl = document.getElementById("themePaletteTextMuted");
    const textPlaceholderEl = document.getElementById(
      "themePaletteTextPlaceholder",
    );
    if (
      !primaryEl ||
      !onPrimaryEl ||
      !accentEl ||
      !accentTextEl ||
      !bgEl ||
      !glassBgEl ||
      !glassTintEl
    )
      return;

    const accentBackground = accentEl.value;
    const accentText = accentTextEl.value;

    const palette = {
      primary: primaryEl.value,
      onPrimaryText: onPrimaryEl.value,
      accent: accentText,
      accentText,
      accentBackground,
      bodyBg: bgEl.value,
      glassBgColor: glassBgEl.value,
      glassTint: glassTintEl.value,
    };

    if (
      this._isThemeWithGlobalFontPalette(themeName) &&
      textPrimaryEl &&
      textSecondaryEl &&
      textMutedEl &&
      textPlaceholderEl
    ) {
      palette.textPrimary = textPrimaryEl.value;
      palette.textSecondary = textSecondaryEl.value;
      palette.textMuted = textMutedEl.value;
      palette.textPlaceholder = textPlaceholderEl.value;
    }

    window.dashboard.themes.setCustomPalette(themeName, mode, palette, save);

    if (renderGrid) {
      this.renderThemePickerGrid();
    }
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

        this.scheduleAutoSave(120);
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

    const themeSliderDefaults = {
      blurPower: 100,
      glassOpacity: 50,
      componentOpacity: 0,
    };
    const themeSliderDebounceMs = 120;

    const scheduleThemeSliderUpdate = (key, callback) => {
      if (this._themeSliderDebounceTimers[key]) {
        clearTimeout(this._themeSliderDebounceTimers[key]);
      }
      this._themeSliderDebounceTimers[key] = setTimeout(() => {
        this._themeSliderDebounceTimers[key] = null;
        callback();
      }, themeSliderDebounceMs);
    };

    const flushThemeSliderUpdate = (key, callback) => {
      if (this._themeSliderDebounceTimers[key]) {
        clearTimeout(this._themeSliderDebounceTimers[key]);
        this._themeSliderDebounceTimers[key] = null;
      }
      callback();
    };

    const applyThemeGlassOpacity = (opacity) => {
      if (window.dashboard?.themes?.setGlassOpacity) {
        window.dashboard.themes.setGlassOpacity(opacity, false);
      }

      try {
        document.dispatchEvent(new CustomEvent("md:glass-setting-changed"));
      } catch (e) {}
    };

    const applyThemeComponentOpacity = (opacity) => {
      if (window.dashboard?.themes?.setMainGridComponentOpacity) {
        window.dashboard.themes.setMainGridComponentOpacity(opacity, false);
      }
    };

    // Blur power slider
    if (this.themeBlurPower) {
      this.themeBlurPower.addEventListener("input", () => {
        this.updateThemeBlurPowerLabel();
        const power = parseInt(this.themeBlurPower.value, 10);
        scheduleThemeSliderUpdate("blurPower", () =>
          this.applyUiBlurPower(power),
        );
      });

      this.themeBlurPower.addEventListener("change", () => {
        this.updateThemeBlurPowerLabel();
        const power = parseInt(this.themeBlurPower.value, 10);
        flushThemeSliderUpdate("blurPower", () => this.applyUiBlurPower(power));
      });

      this.themeBlurPower.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        this.themeBlurPower.value = String(themeSliderDefaults.blurPower);
        this.updateThemeBlurPowerLabel();
        const power = parseInt(this.themeBlurPower.value, 10);
        flushThemeSliderUpdate("blurPower", () => this.applyUiBlurPower(power));
        this.scheduleAutoSave(120);
      });
    }

    // Glass opacity slider
    if (this.themeGlassOpacity) {
      this.themeGlassOpacity.addEventListener("input", () => {
        this.updateThemeGlassOpacityLabel();
        const opacity = parseInt(this.themeGlassOpacity.value, 10);
        scheduleThemeSliderUpdate("glassOpacity", () =>
          applyThemeGlassOpacity(opacity),
        );
      });

      this.themeGlassOpacity.addEventListener("change", () => {
        this.updateThemeGlassOpacityLabel();
        const opacity = parseInt(this.themeGlassOpacity.value, 10);
        flushThemeSliderUpdate("glassOpacity", () =>
          applyThemeGlassOpacity(opacity),
        );
      });

      this.themeGlassOpacity.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        this.themeGlassOpacity.value = String(themeSliderDefaults.glassOpacity);
        this.updateThemeGlassOpacityLabel();
        const opacity = parseInt(this.themeGlassOpacity.value, 10);
        flushThemeSliderUpdate("glassOpacity", () =>
          applyThemeGlassOpacity(opacity),
        );
        this.scheduleAutoSave(120);
      });
    }

    // Component-only opacity slider
    if (this.themeComponentOpacity) {
      this.themeComponentOpacity.addEventListener("input", () => {
        this.updateThemeComponentOpacityLabel();
        const opacity = parseInt(this.themeComponentOpacity.value, 10);

        scheduleThemeSliderUpdate("componentOpacity", () =>
          applyThemeComponentOpacity(opacity),
        );
      });

      this.themeComponentOpacity.addEventListener("change", () => {
        this.updateThemeComponentOpacityLabel();
        const opacity = parseInt(this.themeComponentOpacity.value, 10);
        flushThemeSliderUpdate("componentOpacity", () =>
          applyThemeComponentOpacity(opacity),
        );
      });

      this.themeComponentOpacity.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        this.themeComponentOpacity.value = String(
          themeSliderDefaults.componentOpacity,
        );
        this.updateThemeComponentOpacityLabel();
        const opacity = parseInt(this.themeComponentOpacity.value, 10);
        flushThemeSliderUpdate("componentOpacity", () =>
          applyThemeComponentOpacity(opacity),
        );
        this.scheduleAutoSave(120);
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

        this.scheduleAutoSave(120);
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
    const onPrimaryEl = document.getElementById("themePaletteOnPrimaryText");
    const accentEl = document.getElementById("themePaletteAccent");
    const accentTextEl = document.getElementById("themePaletteAccentText");
    const bgEl = document.getElementById("themePaletteBackground");
    const glassBgEl = document.getElementById("themePaletteGlassBackground");
    const glassTintEl = document.getElementById("themePaletteGlassTint");
    const textPrimaryEl = document.getElementById("themePaletteTextPrimary");
    const textSecondaryEl = document.getElementById(
      "themePaletteTextSecondary",
    );
    const textMutedEl = document.getElementById("themePaletteTextMuted");
    const textPlaceholderEl = document.getElementById(
      "themePaletteTextPlaceholder",
    );

    if (paletteOverlay) {
      this._bindOverlayCloseBehavior(paletteOverlay, () =>
        this.closeThemePaletteModal(),
      );
    }
    if (paletteClose) {
      paletteClose.addEventListener("click", () =>
        this.closeThemePaletteModal(),
      );
    }
    if (paletteDone) {
      paletteDone.addEventListener("click", () =>
        this.closeThemePaletteModal(),
      );
    }
    if (paletteReset) {
      paletteReset.addEventListener("click", () =>
        this.resetThemePaletteToDefaults(true),
      );
    }
    if (modeDark) {
      modeDark.addEventListener("click", () => {
        this.flushThemePalettePreviewUpdates(true);
        this._paletteModalMode = "dark";
        this.updateThemePaletteModeButtons("dark");
        this.syncThemePaletteModalInputs();
      });
    }
    if (modeLight) {
      modeLight.addEventListener("click", () => {
        this.flushThemePalettePreviewUpdates(true);
        this._paletteModalMode = "light";
        this.updateThemePaletteModeButtons("light");
        this.syncThemePaletteModalInputs();
      });
    }

    const onPalettePreviewInput = () =>
      this.scheduleThemePalettePreviewUpdate();
    const onPaletteCommit = () => this.flushThemePalettePreviewUpdates(true);

    if (primaryEl) {
      primaryEl.addEventListener("input", onPalettePreviewInput);
      primaryEl.addEventListener("change", onPaletteCommit);
    }
    if (onPrimaryEl) {
      onPrimaryEl.addEventListener("input", onPalettePreviewInput);
      onPrimaryEl.addEventListener("change", onPaletteCommit);
    }
    if (accentEl) {
      accentEl.addEventListener("input", onPalettePreviewInput);
      accentEl.addEventListener("change", onPaletteCommit);
    }
    if (accentTextEl) {
      accentTextEl.addEventListener("input", onPalettePreviewInput);
      accentTextEl.addEventListener("change", onPaletteCommit);
    }
    if (bgEl) {
      bgEl.addEventListener("input", onPalettePreviewInput);
      bgEl.addEventListener("change", onPaletteCommit);
    }
    if (glassBgEl) {
      glassBgEl.addEventListener("input", onPalettePreviewInput);
      glassBgEl.addEventListener("change", onPaletteCommit);
    }
    if (glassTintEl) {
      glassTintEl.addEventListener("input", onPalettePreviewInput);
      glassTintEl.addEventListener("change", onPaletteCommit);
    }
    if (textPrimaryEl) {
      textPrimaryEl.addEventListener("input", onPalettePreviewInput);
      textPrimaryEl.addEventListener("change", onPaletteCommit);
    }
    if (textSecondaryEl) {
      textSecondaryEl.addEventListener("input", onPalettePreviewInput);
      textSecondaryEl.addEventListener("change", onPaletteCommit);
    }
    if (textMutedEl) {
      textMutedEl.addEventListener("input", onPalettePreviewInput);
      textMutedEl.addEventListener("change", onPaletteCommit);
    }
    if (textPlaceholderEl) {
      textPlaceholderEl.addEventListener("input", onPalettePreviewInput);
      textPlaceholderEl.addEventListener("change", onPaletteCommit);
    }

    // Container width (in Themes panel)
    if (this.themeContainerWidth) {
      this.themeContainerWidth.addEventListener("change", (e) => {
        this.toggleThemeCustomWidth(e.target.value === "custom");
        this.applyContainerWidth(
          e.target.value,
          parseInt(this.themeContainerWidthCustom?.value, 10) || 70,
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
          parseInt(this.themeContainerWidthCustom.value, 10),
        );
      });
    }

    if (this.themePerformanceModeEnabled) {
      this.themePerformanceModeEnabled.addEventListener("change", () => {
        this.applyDashboardQualityState("performance");
      });
    }

    if (this.themeHighestVisualFidelityEnabled) {
      this.themeHighestVisualFidelityEnabled.addEventListener("change", () => {
        this.applyDashboardQualityState("highest");
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
    const glassOpacity = this.clampNumber(
      parseInt(this.themeGlassOpacity?.value, 10),
      0,
      100,
      50,
    );
    const componentOpacity = this.clampNumber(
      parseInt(this.themeComponentOpacity?.value, 10),
      0,
      100,
      0,
    );
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
    const dashboardQualityState = this.resolveDashboardQualityState(
      this.themePerformanceModeEnabled?.checked === true,
      this.themeHighestVisualFidelityEnabled?.checked === true,
      "performance",
    );

    if (this.themePerformanceModeEnabled) {
      this.themePerformanceModeEnabled.checked =
        dashboardQualityState.performanceModeEnabled;
    }
    if (this.themeHighestVisualFidelityEnabled) {
      this.themeHighestVisualFidelityEnabled.checked =
        dashboardQualityState.highestVisualFidelityEnabled;
    }

    // Save theme settings
    settings.theme = {
      name: activeTheme,
      mode: mode,
      glassEnabled: glassEnabled,
      glassOpacity: glassOpacity,
      componentOpacity: componentOpacity,
      highestVisualFidelityEnabled:
        dashboardQualityState.highestVisualFidelityEnabled,
      customAccent: customAccent,
      customPalettes: customPalettes,
    };

    // Save blur power (now from Themes panel)
    settings.uiBlurPower = this.clampNumber(
      parseInt(this.themeBlurPower?.value, 10),
      0,
      200,
      100,
    );

    // Save container width only when a width control is present in the UI.
    if (this.themeContainerWidth) {
      settings.containerWidth = this.themeContainerWidth.value || "narrow";
      if (settings.containerWidth === "custom") {
        settings.containerWidthCustom = this.clampNumber(
          parseInt(this.themeContainerWidthCustom?.value, 10),
          20,
          98,
          70,
        );
      }
    }

    settings.performanceModeEnabled =
      dashboardQualityState.performanceModeEnabled;

    // Apply theme manager settings only when values actually changed.
    const themeManager = window.dashboard?.themes;
    if (themeManager) {
      const currentTheme =
        typeof themeManager.getCurrentTheme === "function"
          ? themeManager.getCurrentTheme()
          : null;
      const currentMode =
        typeof themeManager.getCurrentMode === "function"
          ? themeManager.getCurrentMode()
          : null;
      const currentGlassEnabled =
        typeof themeManager.isGlassEnabled === "function"
          ? themeManager.isGlassEnabled()
          : null;
      const currentGlassOpacity =
        typeof themeManager.getGlassOpacity === "function"
          ? themeManager.getGlassOpacity()
          : null;
      const currentComponentOpacity =
        typeof themeManager.getMainGridComponentOpacity === "function"
          ? themeManager.getMainGridComponentOpacity()
          : null;

      if (
        currentTheme !== activeTheme &&
        typeof themeManager.setTheme === "function"
      ) {
        themeManager.setTheme(activeTheme, false);
      }

      if (currentMode !== mode && typeof themeManager.setMode === "function") {
        themeManager.setMode(mode, false);
      }

      if (
        currentGlassEnabled !== glassEnabled &&
        typeof themeManager.setGlassEnabled === "function"
      ) {
        themeManager.setGlassEnabled(glassEnabled, false);
      }

      if (
        currentGlassOpacity !== glassOpacity &&
        typeof themeManager.setGlassOpacity === "function"
      ) {
        themeManager.setGlassOpacity(glassOpacity, false);
      }

      if (
        currentComponentOpacity !== componentOpacity &&
        typeof themeManager.setMainGridComponentOpacity === "function"
      ) {
        themeManager.setMainGridComponentOpacity(componentOpacity, false);
      }

      if (typeof window.dashboard.applyHeadingSettings === "function") {
        window.dashboard.applyHeadingSettings();
      }
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

  normalizeBackgroundImageUrl(url) {
    return String(url || "").trim();
  }

  normalizeBackgroundImageImportUrl(url) {
    const raw = this.normalizeBackgroundImageUrl(url);
    if (!raw) return "";

    let normalized = raw;
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    }

    let parsed = null;
    try {
      parsed = new URL(normalized);
    } catch (e) {
      return "";
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }

    return parsed.href;
  }

  isRemoteBackgroundImageUrl(url) {
    const normalized = this.normalizeBackgroundImageUrl(url);
    return /^https?:\/\//i.test(normalized);
  }

  isValidCustomBackgroundReference(value) {
    const normalized = this.normalizeBackgroundImageUrl(value);
    if (!normalized) return false;

    return (
      this.isCustomBackgroundToken(normalized) ||
      normalized.startsWith("data:image") ||
      this.isRemoteBackgroundImageUrl(normalized)
    );
  }

  normalizeSolidColorHex(value) {
    let raw = String(value || "").trim();
    if (!raw) return "";

    if (raw.toLowerCase().startsWith(this._solidBackgroundUrlPrefix)) {
      raw = raw.slice(this._solidBackgroundUrlPrefix.length);
    }

    if (!raw.startsWith("#")) {
      raw = `#${raw}`;
    }

    const shortMatch = raw.match(/^#([0-9a-fA-F]{3})$/);
    if (shortMatch) {
      const [r, g, b] = shortMatch[1].split("");
      raw = `#${r}${r}${g}${g}${b}${b}`;
    }

    const fullMatch = raw.match(/^#([0-9a-fA-F]{6})$/);
    if (!fullMatch) return "";

    return `#${fullMatch[1].toUpperCase()}`;
  }

  isSolidColorBackgroundUrl(value) {
    const normalized = this.normalizeBackgroundImageUrl(value);
    return normalized.toLowerCase().startsWith(this._solidBackgroundUrlPrefix);
  }

  solidColorHexToBackgroundUrl(value) {
    const hex = this.normalizeSolidColorHex(value);
    if (!hex) return "";
    return `${this._solidBackgroundUrlPrefix}${hex}`;
  }

  solidColorBackgroundUrlToHex(value) {
    const normalized = this.normalizeBackgroundImageUrl(value);
    if (!this.isSolidColorBackgroundUrl(normalized)) {
      return "";
    }

    return this.normalizeSolidColorHex(
      normalized.slice(this._solidBackgroundUrlPrefix.length),
    );
  }

  normalizeBackgroundCategory(category) {
    const normalized = String(category || "").trim();
    if (!normalized) return "all";

    if (
      normalized === "allWithCustom" ||
      normalized === "allNoCustom" ||
      normalized === "all"
    ) {
      return "all";
    }

    return normalized;
  }

  normalizeBackgroundDisplayMode(mode) {
    const normalized = String(mode || "")
      .trim()
      .toLowerCase();
    const allowed = new Set([
      "fill",
      "fit",
      "stretch",
      "tile",
      "center",
      "span",
    ]);
    return allowed.has(normalized) ? normalized : "fill";
  }

  normalizeBackgroundDim(value, fallback = 100) {
    return this.clampNumber(parseInt(value, 10), 0, 100, fallback);
  }

  normalizeBackgroundBlur(value, fallback = 0) {
    return this.clampNumber(parseInt(value, 10), 0, 40, fallback);
  }

  isCustomBackgroundToken(value) {
    const normalized = this.normalizeBackgroundImageUrl(value);
    const prefix = this._customBackgroundTokenPrefix || "mdcbg:id:";
    return normalized.startsWith(prefix) && normalized.length > prefix.length;
  }

  getCustomBackgroundTokenById(id) {
    const normalized = String(id || "").trim();
    if (!/^[a-z0-9_\-]+$/i.test(normalized)) return "";
    const prefix = this._customBackgroundTokenPrefix || "mdcbg:id:";
    return `${prefix}${normalized}`;
  }

  getCustomBackgroundIdFromToken(token) {
    const normalized = this.normalizeBackgroundImageUrl(token);
    if (!this.isCustomBackgroundToken(normalized)) return "";

    const prefix = this._customBackgroundTokenPrefix || "mdcbg:id:";
    return normalized.slice(prefix.length);
  }

  isCustomBackgroundMediaStoreAvailable() {
    return (
      typeof window !== "undefined" && typeof window.indexedDB !== "undefined"
    );
  }

  customBackgroundDbRequestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error || new Error("IndexedDB request failed"));
    });
  }

  customBackgroundTxDonePromise(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () =>
        reject(tx.error || new Error("IndexedDB transaction aborted"));
      tx.onerror = () =>
        reject(tx.error || new Error("IndexedDB transaction failed"));
    });
  }

  openCustomBackgroundMediaDb() {
    if (!this.isCustomBackgroundMediaStoreAvailable()) {
      return Promise.resolve(null);
    }

    if (this._customBackgroundMediaDbPromise) {
      return this._customBackgroundMediaDbPromise;
    }

    this._customBackgroundMediaDbPromise = new Promise((resolve) => {
      const request = window.indexedDB.open(
        this._customBackgroundMediaDbName,
        1,
      );

      request.onupgradeneeded = (event) => {
        const db = event.target?.result;
        if (!db) return;

        if (
          !db.objectStoreNames.contains(this._customBackgroundMediaStoreName)
        ) {
          const store = db.createObjectStore(
            this._customBackgroundMediaStoreName,
            {
              keyPath: "id",
            },
          );
          store.createIndex("updatedAt", "updatedAt", { unique: false });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        if (!db) {
          resolve(null);
          return;
        }

        db.onversionchange = () => {
          try {
            db.close();
          } catch (e) {}
          this._customBackgroundMediaDbPromise = null;
        };

        resolve(db);
      };

      request.onerror = () => {
        this._customBackgroundMediaDbPromise = null;
        resolve(null);
      };
    });

    return this._customBackgroundMediaDbPromise;
  }

  getCustomBackgroundMediaId(imageDataUrl) {
    const normalized = this.normalizeBackgroundImageUrl(imageDataUrl);
    if (!normalized) return "";

    let hash = 2166136261;
    for (let i = 0; i < normalized.length; i += 1) {
      hash ^= normalized.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    const safeHash = Math.abs(hash >>> 0).toString(36);
    return `cbg_${safeHash}_${normalized.length.toString(36)}`;
  }

  async loadCustomBackgroundMediaFromIndexedDb({ force = false } = {}) {
    if (this._customBackgroundMediaLoaded && !force) {
      return this._customBackgroundThumbByImageUrl;
    }

    if (this._customBackgroundMediaLoadPromise && !force) {
      return this._customBackgroundMediaLoadPromise;
    }

    this._customBackgroundMediaLoadPromise = (async () => {
      if (force) {
        this._customBackgroundThumbByImageUrl.clear();
        this._customBackgroundImageByToken.clear();
      }

      const db = await this.openCustomBackgroundMediaDb();
      if (!db) {
        this._customBackgroundMediaLoaded = true;
        return this._customBackgroundThumbByImageUrl;
      }

      try {
        const tx = db.transaction(
          this._customBackgroundMediaStoreName,
          "readonly",
        );
        const store = tx.objectStore(this._customBackgroundMediaStoreName);
        const records = await this.customBackgroundDbRequestToPromise(
          store.getAll(),
        );

        this._customBackgroundThumbByImageUrl.clear();
        this._customBackgroundImageByToken.clear();
        (Array.isArray(records) ? records : []).forEach((record) => {
          const id = String(record?.id || "").trim();
          const token = this.getCustomBackgroundTokenById(id);
          const imageDataUrl = this.normalizeBackgroundImageUrl(
            record?.imageDataUrl,
          );
          const thumbnailDataUrl = this.normalizeBackgroundImageUrl(
            record?.thumbnailDataUrl,
          );

          if (
            !token ||
            !imageDataUrl ||
            !imageDataUrl.startsWith("data:image")
          ) {
            return;
          }

          const resolvedThumb =
            thumbnailDataUrl && thumbnailDataUrl.startsWith("data:image")
              ? thumbnailDataUrl
              : imageDataUrl;

          this._customBackgroundImageByToken.set(token, imageDataUrl);
          this._customBackgroundThumbByImageUrl.set(token, resolvedThumb);
          this._customBackgroundThumbByImageUrl.set(
            imageDataUrl,
            resolvedThumb,
          );
          this._backgroundThumbUrlCache?.set(token, resolvedThumb);
          this._backgroundThumbUrlCache?.set(imageDataUrl, resolvedThumb);
        });

        this._customBackgroundMediaLoaded = true;
      } catch (e) {
        // Ignore IndexedDB read failures and keep graceful fallback.
        this._customBackgroundMediaLoaded = true;
      }

      return this._customBackgroundThumbByImageUrl;
    })().finally(() => {
      this._customBackgroundMediaLoadPromise = null;
    });

    return this._customBackgroundMediaLoadPromise;
  }

  async saveCustomBackgroundMediaToIndexedDb(imageDataUrl, thumbnailDataUrl) {
    const normalizedImage = this.normalizeBackgroundImageUrl(imageDataUrl);
    if (!normalizedImage || !normalizedImage.startsWith("data:image")) {
      return "";
    }

    const normalizedThumb = this.normalizeBackgroundImageUrl(thumbnailDataUrl);
    const resolvedThumb =
      normalizedThumb && normalizedThumb.startsWith("data:image")
        ? normalizedThumb
        : normalizedImage;

    const db = await this.openCustomBackgroundMediaDb();
    const id = this.getCustomBackgroundMediaId(normalizedImage);
    const token = this.getCustomBackgroundTokenById(id);
    if (!id || !token) {
      return "";
    }

    if (!db) {
      this._customBackgroundImageByToken.set(token, normalizedImage);
      this._customBackgroundThumbByImageUrl.set(token, resolvedThumb);
      this._customBackgroundThumbByImageUrl.set(normalizedImage, resolvedThumb);
      this._backgroundThumbUrlCache?.set(token, resolvedThumb);
      this._backgroundThumbUrlCache?.set(normalizedImage, resolvedThumb);
      return token;
    }

    try {
      const tx = db.transaction(
        this._customBackgroundMediaStoreName,
        "readwrite",
      );
      const store = tx.objectStore(this._customBackgroundMediaStoreName);
      const existing = await this.customBackgroundDbRequestToPromise(
        store.get(id),
      ).catch(() => null);
      const now = Date.now();

      store.put({
        id,
        imageDataUrl: normalizedImage,
        thumbnailDataUrl: resolvedThumb,
        createdAt:
          Number.isFinite(existing?.createdAt) && existing.createdAt > 0
            ? existing.createdAt
            : now,
        updatedAt: now,
      });

      await this.customBackgroundTxDonePromise(tx);

      this._customBackgroundImageByToken.set(token, normalizedImage);
      this._customBackgroundThumbByImageUrl.set(token, resolvedThumb);
      this._customBackgroundThumbByImageUrl.set(normalizedImage, resolvedThumb);
      this._backgroundThumbUrlCache?.set(token, resolvedThumb);
      this._backgroundThumbUrlCache?.set(normalizedImage, resolvedThumb);
      return token;
    } catch (e) {
      this._customBackgroundImageByToken.set(token, normalizedImage);
      this._customBackgroundThumbByImageUrl.set(token, resolvedThumb);
      this._customBackgroundThumbByImageUrl.set(normalizedImage, resolvedThumb);
      this._backgroundThumbUrlCache?.set(token, resolvedThumb);
      this._backgroundThumbUrlCache?.set(normalizedImage, resolvedThumb);
      return token;
    }
  }

  async deleteCustomBackgroundMediaByToken(token) {
    const normalizedToken = this.normalizeBackgroundImageUrl(token);
    if (!this.isCustomBackgroundToken(normalizedToken)) {
      return false;
    }

    const mediaId = this.getCustomBackgroundIdFromToken(normalizedToken);
    const mappedImage = this.normalizeBackgroundImageUrl(
      this._customBackgroundImageByToken?.get(normalizedToken),
    );
    const mappedThumb = this.normalizeBackgroundImageUrl(
      this._customBackgroundThumbByImageUrl?.get(normalizedToken),
    );

    this._customBackgroundImageByToken?.delete(normalizedToken);
    this._customBackgroundThumbByImageUrl?.delete(normalizedToken);
    this._backgroundThumbUrlCache?.delete(normalizedToken);

    if (mappedImage) {
      this._customBackgroundThumbByImageUrl?.delete(mappedImage);
      this._backgroundThumbUrlCache?.delete(mappedImage);
    }

    if (mappedThumb) {
      this._backgroundThumbUrlCache?.delete(mappedThumb);
    }

    if (!mediaId) {
      return true;
    }

    const db = await this.openCustomBackgroundMediaDb();
    if (!db) {
      return true;
    }

    try {
      const tx = db.transaction(
        this._customBackgroundMediaStoreName,
        "readwrite",
      );
      const store = tx.objectStore(this._customBackgroundMediaStoreName);
      store.delete(mediaId);
      await this.customBackgroundTxDonePromise(tx);
      return true;
    } catch (e) {
      return false;
    }
  }

  async clearCustomBackgroundMediaIndexedDb() {
    this._customBackgroundThumbByImageUrl.clear();
    this._customBackgroundImageByToken.clear();

    const db = await this.openCustomBackgroundMediaDb();
    if (!db) return;

    try {
      const tx = db.transaction(
        this._customBackgroundMediaStoreName,
        "readwrite",
      );
      const store = tx.objectStore(this._customBackgroundMediaStoreName);
      store.clear();
      await this.customBackgroundTxDonePromise(tx);
    } catch (e) {
      // ignore clear failures
    }
  }

  async buildCustomBackgroundThumbnailDataUrl(imageDataUrl) {
    const normalized = this.normalizeBackgroundImageUrl(imageDataUrl);
    if (!normalized || !normalized.startsWith("data:image")) {
      return "";
    }

    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        try {
          const targetWidth = 320;
          const targetHeight = 200;
          const srcWidth = img.naturalWidth || img.width || targetWidth;
          const srcHeight = img.naturalHeight || img.height || targetHeight;

          const scale = Math.max(
            targetWidth / srcWidth,
            targetHeight / srcHeight,
          );
          const drawWidth = srcWidth * scale;
          const drawHeight = srcHeight * scale;
          const offsetX = Math.round((targetWidth - drawWidth) / 2);
          const offsetY = Math.round((targetHeight - drawHeight) / 2);

          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(normalized);
            return;
          }

          ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
          const thumbDataUrl = canvas.toDataURL("image/jpeg", 0.78);
          resolve(this.normalizeBackgroundImageUrl(thumbDataUrl) || normalized);
        } catch (e) {
          resolve(normalized);
        }
      };

      img.onerror = () => resolve(normalized);
      img.src = normalized;
    });
  }

  async syncCustomBackgroundMediaFromSettings(settings = null) {
    if (this._customBackgroundMediaSyncPromise) {
      return this._customBackgroundMediaSyncPromise;
    }

    const resolvedSettings =
      settings && typeof settings === "object"
        ? settings
        : this.storage.getSettings();

    this._customBackgroundMediaSyncPromise = (async () => {
      await this.loadCustomBackgroundMediaFromIndexedDb();

      const rawEntries = Array.isArray(resolvedSettings?.customBackgrounds)
        ? resolvedSettings.customBackgrounds
        : [];
      const replacementMap = new Map();
      const normalizedRefs = [];
      const seenRefs = new Set();

      for (const entry of rawEntries) {
        const normalizedEntry = this.normalizeBackgroundImageUrl(entry);
        if (!normalizedEntry) continue;

        if (this.isCustomBackgroundToken(normalizedEntry)) {
          if (seenRefs.has(normalizedEntry)) continue;
          seenRefs.add(normalizedEntry);
          normalizedRefs.push(normalizedEntry);
          continue;
        }

        if (this.isRemoteBackgroundImageUrl(normalizedEntry)) {
          if (seenRefs.has(normalizedEntry)) continue;
          seenRefs.add(normalizedEntry);
          normalizedRefs.push(normalizedEntry);
          continue;
        }

        if (!normalizedEntry.startsWith("data:image")) {
          continue;
        }

        const thumbnailDataUrl =
          await this.buildCustomBackgroundThumbnailDataUrl(normalizedEntry);
        const token = await this.saveCustomBackgroundMediaToIndexedDb(
          normalizedEntry,
          thumbnailDataUrl,
        );
        if (!token) continue;

        replacementMap.set(normalizedEntry, token);
        if (seenRefs.has(token)) continue;
        seenRefs.add(token);
        normalizedRefs.push(token);
      }

      const cappedRefs = normalizedRefs.slice(
        0,
        SettingsManager.CUSTOM_BACKGROUND_LIMIT,
      );

      const currentRefs = rawEntries
        .map((entry) => this.normalizeBackgroundImageUrl(entry))
        .filter(Boolean);

      const refsChanged =
        currentRefs.length !== cappedRefs.length ||
        currentRefs.some((value, index) => value !== cappedRefs[index]);

      let settingsChanged = false;
      if (refsChanged) {
        resolvedSettings.customBackgrounds = cappedRefs;
        settingsChanged = true;
      }

      const validCustomRefSet = new Set(cappedRefs);
      const selectionMap =
        this.getBackgroundImageSelectionMap(resolvedSettings);
      let selectionChanged = false;

      Object.keys(selectionMap).forEach((category) => {
        const urls = Array.isArray(selectionMap[category])
          ? selectionMap[category]
          : [];

        const nextUrls = [];
        const seenUrls = new Set();

        urls.forEach((entry) => {
          const normalizedUrl = this.normalizeBackgroundImageUrl(entry);
          if (!normalizedUrl) {
            selectionChanged = true;
            return;
          }

          const replaced = replacementMap.get(normalizedUrl) || normalizedUrl;
          if (
            this.isCustomBackgroundToken(replaced) &&
            !validCustomRefSet.has(replaced)
          ) {
            selectionChanged = true;
            return;
          }

          if (seenUrls.has(replaced)) {
            selectionChanged = true;
            return;
          }

          if (replaced !== normalizedUrl) {
            selectionChanged = true;
          }

          seenUrls.add(replaced);
          nextUrls.push(replaced);
        });

        if (
          nextUrls.length !== urls.length ||
          nextUrls.some((value, index) => value !== urls[index])
        ) {
          selectionMap[category] = nextUrls;
          selectionChanged = true;
        }
      });

      if (selectionChanged) {
        resolvedSettings.backgroundImageSelections = selectionMap;
        settingsChanged = true;
      }

      if (settingsChanged) {
        this.storage.saveSettings(resolvedSettings);
      }

      this.applyCustomBackgroundThumbsToRenderedPool();
    })().finally(() => {
      this._customBackgroundMediaSyncPromise = null;
    });

    return this._customBackgroundMediaSyncPromise;
  }

  getBackgroundThumbnailPlaceholder() {
    return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
  }

  getBackgroundThumbnailUrl(imageUrl) {
    const normalized = this.normalizeBackgroundImageUrl(imageUrl);
    if (!normalized) {
      return this.getBackgroundThumbnailPlaceholder();
    }

    const customThumbFromMap = this.normalizeBackgroundImageUrl(
      this._customBackgroundThumbByImageUrl?.get(normalized),
    );

    const cached = this._backgroundThumbUrlCache?.get(normalized);
    if (cached) {
      if (
        !/^https?:\/\//i.test(normalized) &&
        customThumbFromMap &&
        cached !== customThumbFromMap
      ) {
        this._backgroundThumbUrlCache.set(normalized, customThumbFromMap);
        return customThumbFromMap;
      }
      return cached;
    }

    let thumbUrl = normalized;
    if (!/^https?:\/\//i.test(normalized)) {
      thumbUrl = customThumbFromMap || normalized;
      if (this.isCustomBackgroundToken(normalized) && !customThumbFromMap) {
        thumbUrl = this.getBackgroundThumbnailPlaceholder();
      }
    }

    if (/^https?:\/\//i.test(normalized)) {
      try {
        const parsed = new URL(normalized);
        if (/(^|\.)images\.unsplash\.com$/i.test(parsed.hostname)) {
          parsed.searchParams.set("auto", "format");
          parsed.searchParams.set("fit", "crop");
          parsed.searchParams.set("crop", "entropy");
          parsed.searchParams.set("w", "320");
          parsed.searchParams.set("h", "200");
          parsed.searchParams.set("q", "45");
          thumbUrl = parsed.toString();
        }
      } catch (e) {
        thumbUrl = normalized;
      }
    }

    if (this._backgroundThumbUrlCache) {
      this._backgroundThumbUrlCache.set(normalized, thumbUrl);
    }

    return thumbUrl;
  }

  isBackgroundThumbCacheAvailable() {
    return (
      typeof window !== "undefined" &&
      typeof window.caches !== "undefined" &&
      typeof window.fetch === "function"
    );
  }

  isBackgroundThumbRemoteUrl(url) {
    return /^https?:\/\//i.test(String(url || ""));
  }

  async openBackgroundThumbCache() {
    if (!this.isBackgroundThumbCacheAvailable()) {
      return null;
    }

    try {
      return await window.caches.open(this._backgroundThumbCacheName);
    } catch (e) {
      return null;
    }
  }

  async pruneBackgroundThumbCache(cache) {
    if (!cache) return;

    try {
      const keys = await cache.keys();
      const maxEntries = this._backgroundThumbCacheMaxEntries || 220;
      if (keys.length <= maxEntries) return;

      const excess = keys.length - maxEntries;
      for (let i = 0; i < excess; i += 1) {
        await cache.delete(keys[i]);
      }
    } catch (e) {
      // ignore cache pruning errors
    }
  }

  revokeBackgroundThumbBlobUrl(url) {
    if (!url || typeof url !== "string") return;
    if (!url.startsWith("blob:")) return;

    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      // ignore
    }
  }

  enforceBackgroundThumbBlobUrlLimit() {
    const cache = this._backgroundThumbBlobUrlCache;
    if (!(cache instanceof Map)) return;

    const maxEntries = this._backgroundThumbBlobUrlMaxEntries || 140;
    while (cache.size > maxEntries) {
      const oldestKey = cache.keys().next().value;
      const oldestValue = cache.get(oldestKey);
      cache.delete(oldestKey);
      this.revokeBackgroundThumbBlobUrl(oldestValue);
    }
  }

  clearBackgroundThumbBlobUrlCache() {
    if (this._backgroundThumbBlobUrlCache instanceof Map) {
      this._backgroundThumbBlobUrlCache.forEach((blobUrl) => {
        this.revokeBackgroundThumbBlobUrl(blobUrl);
      });
      this._backgroundThumbBlobUrlCache.clear();
    }

    if (this._backgroundThumbPendingLoads instanceof Map) {
      this._backgroundThumbPendingLoads.clear();
    }
  }

  async resolveBackgroundThumbSrc(thumbSrc) {
    const normalized = this.normalizeBackgroundImageUrl(thumbSrc);
    if (!normalized) {
      return this.getBackgroundThumbnailPlaceholder();
    }

    if (!this.isBackgroundThumbRemoteUrl(normalized)) {
      const customThumb = this.normalizeBackgroundImageUrl(
        this._customBackgroundThumbByImageUrl?.get(normalized),
      );
      if (customThumb) {
        return customThumb;
      }
      if (this.isCustomBackgroundToken(normalized)) {
        return this.getBackgroundThumbnailPlaceholder();
      }
      return normalized;
    }

    const existingBlobUrl = this._backgroundThumbBlobUrlCache?.get(normalized);
    if (existingBlobUrl) {
      return existingBlobUrl;
    }

    const pending = this._backgroundThumbPendingLoads?.get(normalized);
    if (pending) {
      return pending;
    }

    const loadPromise = (async () => {
      const cache = await this.openBackgroundThumbCache();
      if (!cache) {
        return normalized;
      }

      const request = new Request(normalized, {
        mode: "cors",
        credentials: "omit",
      });

      let response = null;
      try {
        response = await cache.match(request);
      } catch (e) {
        response = null;
      }

      if (!response) {
        try {
          response = await fetch(request, { cache: "force-cache" });
          if (response && (response.ok || response.type === "opaque")) {
            try {
              await cache.put(request, response.clone());
              void this.pruneBackgroundThumbCache(cache);
            } catch (e) {
              // ignore cache write failures
            }
          }
        } catch (e) {
          response = null;
        }
      }

      if (!response || response.type === "opaque" || !response.ok) {
        return normalized;
      }

      let blob;
      try {
        blob = await response.blob();
      } catch (e) {
        return normalized;
      }

      if (!blob || blob.size <= 0) {
        return normalized;
      }

      const blobUrl = URL.createObjectURL(blob);
      this._backgroundThumbBlobUrlCache.set(normalized, blobUrl);
      this.enforceBackgroundThumbBlobUrlLimit();
      return blobUrl;
    })()
      .catch(() => normalized)
      .finally(() => {
        this._backgroundThumbPendingLoads?.delete(normalized);
      });

    this._backgroundThumbPendingLoads?.set(normalized, loadPromise);
    return loadPromise;
  }

  loadBackgroundThumbImage(imgEl) {
    if (!(imgEl instanceof HTMLImageElement)) {
      return;
    }

    const thumbSrc = this.normalizeBackgroundImageUrl(imgEl.dataset.thumbSrc);
    if (!thumbSrc || imgEl.dataset.thumbLoaded === "1") {
      return;
    }

    imgEl.dataset.thumbLoaded = "pending";
    void this.resolveBackgroundThumbSrc(thumbSrc)
      .then((resolvedSrc) => {
        if (!imgEl.isConnected) {
          return;
        }

        imgEl.src = resolvedSrc;
        imgEl.dataset.thumbLoaded = "1";
      })
      .catch(() => {
        if (!imgEl.isConnected) return;
        imgEl.src = thumbSrc;
        imgEl.dataset.thumbLoaded = "1";
      });
  }

  applyCustomBackgroundThumbsToRenderedPool() {
    if (!this.customBgList) return;

    const thumbs = this.customBgList.querySelectorAll(
      "img.custom-bg-thumb[data-bg-source-url]",
    );
    thumbs.forEach((thumbEl) => {
      if (!(thumbEl instanceof HTMLImageElement)) return;

      const sourceUrl = this.normalizeBackgroundImageUrl(
        thumbEl.dataset.bgSourceUrl,
      );
      if (!sourceUrl || /^https?:\/\//i.test(sourceUrl)) {
        return;
      }

      const customThumb = this.normalizeBackgroundImageUrl(
        this._customBackgroundThumbByImageUrl?.get(sourceUrl),
      );
      if (!customThumb) return;

      thumbEl.dataset.thumbSrc = customThumb;
      thumbEl.dataset.thumbLoaded = "";
      this.loadBackgroundThumbImage(thumbEl);
    });
  }

  resetBackgroundThumbObserver() {
    if (this._backgroundThumbObserver) {
      this._backgroundThumbObserver.disconnect();
      this._backgroundThumbObserver = null;
    }
  }

  ensureBackgroundThumbObserver() {
    if (this._backgroundThumbObserver) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    this._backgroundThumbObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const img = entry.target;
          this.loadBackgroundThumbImage(img);

          observer.unobserve(img);
        });
      },
      {
        root: this.customBgList || null,
        rootMargin: "120px 0px",
        threshold: 0.01,
      },
    );
  }

  observeBackgroundThumbImage(imgEl) {
    if (!(imgEl instanceof HTMLImageElement)) {
      return;
    }

    this.ensureBackgroundThumbObserver();
    if (this._backgroundThumbObserver) {
      this._backgroundThumbObserver.observe(imgEl);
      return;
    }

    this.loadBackgroundThumbImage(imgEl);
  }

  getBackgroundImageSelectionMap(settings = null) {
    const resolvedSettings =
      settings && typeof settings === "object"
        ? settings
        : this.storage.getSettings();

    const rawMap = resolvedSettings.backgroundImageSelections;
    if (!rawMap || typeof rawMap !== "object" || Array.isArray(rawMap)) {
      return {};
    }

    const normalizedMap = {};
    Object.entries(rawMap).forEach(([category, urls]) => {
      if (!Array.isArray(urls)) return;
      const normalizedCategory = this.normalizeBackgroundCategory(category);

      const dedupedUrls = [];
      const seen = new Set();
      urls.forEach((value) => {
        const normalizedUrl = this.normalizeBackgroundImageUrl(value);
        if (!normalizedUrl || seen.has(normalizedUrl)) return;
        seen.add(normalizedUrl);
        dedupedUrls.push(normalizedUrl);
      });

      const existing = Array.isArray(normalizedMap[normalizedCategory])
        ? normalizedMap[normalizedCategory]
        : [];
      const merged = [];
      const mergedSeen = new Set();
      [...existing, ...dedupedUrls].forEach((url) => {
        if (mergedSeen.has(url)) return;
        mergedSeen.add(url);
        merged.push(url);
      });

      normalizedMap[normalizedCategory] = merged;
    });

    return normalizedMap;
  }

  getAllBackgroundImagesForCategory(category, settings) {
    if (!this.backgrounds) return [];

    if (typeof this.backgrounds.getAllImagesForCategory === "function") {
      return this.backgrounds.getAllImagesForCategory(category, settings);
    }

    if (typeof this.backgrounds.getImagesForCategory === "function") {
      return this.backgrounds.getImagesForCategory(category, settings);
    }

    return [];
  }

  updateBackgroundPoolAddButtonVisibility() {
    const selectedCategory = this.normalizeBackgroundCategory(
      this.bgCategory?.value || "all",
    );

    if (!this.addCustomBgBtn && !this.addCustomBgUrlBtn) {
      this.updateBackgroundPoolModeUi(selectedCategory);
      return;
    }

    const displayValue = selectedCategory === "custom" ? "inline-flex" : "none";
    if (this.addCustomBgBtn) {
      this.addCustomBgBtn.style.display = displayValue;
    }
    if (this.addCustomBgUrlBtn) {
      this.addCustomBgUrlBtn.style.display = displayValue;
    }

    this.updateBackgroundPoolModeUi(selectedCategory);
  }

  updateBackgroundPoolModeUi(category = null) {
    const selectedCategory = this.normalizeBackgroundCategory(
      category || this.bgCategory?.value || "all",
    );
    const isSolid = selectedCategory === "solid";

    if (this.backgroundPoolLabel) {
      this.backgroundPoolLabel.textContent = isSolid
        ? "Solid Color Pool"
        : "Background Image Pool";
    }

    if (this.backgroundPoolHint) {
      this.backgroundPoolHint.textContent = isSolid
        ? "Select which colors are included when the background rotates or refreshes."
        : "Select which images are included when the background rotates or refreshes.";
    }

    if (this.solidColorControls) {
      this.solidColorControls.hidden = !isSolid;
      this.solidColorControls.style.display = isSolid ? "grid" : "none";
    }

    if (isSolid && this.solidColorPicker && this.solidColorHexInput) {
      const pickerValue = this.normalizeSolidColorHex(
        this.solidColorPicker.value || this.solidColorHexInput.value,
      );
      if (pickerValue) {
        this.solidColorPicker.value = pickerValue;
        this.solidColorHexInput.value = pickerValue;
      }
    }
  }

  ensureBackgroundCategorySelectionInitialized(category, allImages, settings) {
    const normalizedCategory = this.normalizeBackgroundCategory(category);
    const resolvedSettings =
      settings && typeof settings === "object"
        ? settings
        : this.storage.getSettings();

    const selectionMap = this.getBackgroundImageSelectionMap(resolvedSettings);
    if (
      Object.prototype.hasOwnProperty.call(selectionMap, normalizedCategory)
    ) {
      return selectionMap[normalizedCategory];
    }

    const allUrls = allImages
      .map((image) => this.normalizeBackgroundImageUrl(image.url))
      .filter(Boolean);

    selectionMap[normalizedCategory] = allUrls;
    resolvedSettings.backgroundImageSelections = selectionMap;
    this.storage.saveSettings(resolvedSettings);
    return allUrls;
  }

  saveBackgroundSelectionForCategory(category, selectedUrls, settings = null) {
    if (!category) return;
    const normalizedCategory = this.normalizeBackgroundCategory(category);

    const resolvedSettings =
      settings && typeof settings === "object"
        ? settings
        : this.storage.getSettings();
    const selectionMap = this.getBackgroundImageSelectionMap(resolvedSettings);

    const dedupedUrls = [];
    const seen = new Set();
    selectedUrls.forEach((value) => {
      const normalizedUrl = this.normalizeBackgroundImageUrl(value);
      if (!normalizedUrl || seen.has(normalizedUrl)) return;
      seen.add(normalizedUrl);
      dedupedUrls.push(normalizedUrl);
    });

    selectionMap[normalizedCategory] = dedupedUrls;
    resolvedSettings.backgroundImageSelections = selectionMap;
    this.storage.saveSettings(resolvedSettings);
  }

  updateBackgroundPoolCount(selectedCount, totalCount) {
    if (this.customBgCount) {
      this.customBgCount.textContent = `${selectedCount}/${totalCount} selected`;
    }

    if (this.selectAllBgPoolBtn) {
      this.selectAllBgPoolBtn.disabled =
        totalCount === 0 || selectedCount === totalCount;
    }

    if (this.deselectAllBgPoolBtn) {
      this.deselectAllBgPoolBtn.disabled =
        totalCount === 0 || selectedCount === 0;
    }
  }

  applyBackgroundPoolSelectionToRenderedItems(selectedSet) {
    if (!(selectedSet instanceof Set)) {
      return;
    }

    const items = this.customBgList?.querySelectorAll(".custom-bg-item") || [];
    let selectedCount = 0;

    items.forEach((item, index) => {
      const url = this.normalizeBackgroundImageUrl(
        this._activeBgPoolImages?.[index]?.url,
      );
      const isSelected = Boolean(url) && selectedSet.has(url);
      if (isSelected) {
        selectedCount += 1;
      }

      item.classList.toggle("is-selected", isSelected);
      item.setAttribute("aria-pressed", isSelected ? "true" : "false");
    });

    this.updateBackgroundPoolCount(
      selectedCount,
      this._activeBgPoolImages.length,
    );
  }

  renderBackgroundImagePool() {
    if (!this.customBgList) return;

    this.resetBackgroundThumbObserver();

    const settings = this.storage.getSettings();
    const selectedCategory = this.normalizeBackgroundCategory(
      this.bgCategory?.value || settings.bgCategory || "all",
    );
    this.updateBackgroundPoolModeUi(selectedCategory);

    const rawImages = this.getAllBackgroundImagesForCategory(
      selectedCategory,
      settings,
    );

    const images = (Array.isArray(rawImages) ? rawImages : [])
      .map((entry) => {
        if (
          this.backgrounds &&
          typeof this.backgrounds.normalizeImage === "function"
        ) {
          const normalized = this.backgrounds.normalizeImage(entry);
          return {
            ...normalized,
            isCustomSolid:
              Boolean(entry?.isCustomSolid) ||
              Boolean(normalized?.isCustomSolid),
          };
        }

        if (typeof entry === "string") {
          return { url: entry, credit: "", href: "", isCustomSolid: false };
        }

        return {
          url: entry?.url || "",
          credit: entry?.credit || "",
          href: entry?.href || "",
          isCustomSolid: entry?.isCustomSolid === true,
        };
      })
      .map((entry) => ({
        ...entry,
        url: this.normalizeBackgroundImageUrl(entry.url),
        isCustomSolid: entry?.isCustomSolid === true,
      }))
      .filter((entry) => Boolean(entry.url));

    const solidCustomTemplateSet = new Set(
      selectedCategory === "solid" &&
        Array.isArray(settings.solidColorTemplates)
        ? settings.solidColorTemplates
            .map((entry) => this.normalizeSolidColorHex(entry))
            .filter(Boolean)
        : [],
    );

    this._activeBgPoolCategory = selectedCategory;
    this._activeBgPoolImages = images;

    if (images.length === 0) {
      const emptyHint = document.createElement("p");
      emptyHint.className = "empty-hint";
      emptyHint.textContent =
        selectedCategory === "custom"
          ? "No custom backgrounds yet. Use Import or URL to create your pool."
          : selectedCategory === "solid"
            ? "No solid colors available yet. Add one with the color selector."
            : "No backgrounds available for this category.";
      this.customBgList.replaceChildren(emptyHint);
      this.updateBackgroundPoolCount(0, 0);
      return;
    }

    const selectedUrls = this.ensureBackgroundCategorySelectionInitialized(
      selectedCategory,
      images,
      settings,
    );
    const selectedSet = new Set(selectedUrls);

    const fragment = document.createDocumentFragment();
    const thumbsToObserve = [];
    let selectedCount = 0;

    images.forEach((entry, index) => {
      const isSelected = selectedSet.has(entry.url);
      if (isSelected) selectedCount += 1;

      const item = document.createElement("button");
      item.type = "button";
      item.className = `custom-bg-item${isSelected ? " is-selected" : ""}`;
      item.dataset.index = String(index);
      item.setAttribute("aria-pressed", isSelected ? "true" : "false");

      let thumb = null;
      let solidHex = "";
      let isCustomSolidTemplate = false;
      if (selectedCategory === "solid") {
        solidHex = this.solidColorBackgroundUrlToHex(entry.url) || "#000000";
        isCustomSolidTemplate =
          entry?.isCustomSolid === true || solidCustomTemplateSet.has(solidHex);
        const swatch = document.createElement("span");
        swatch.className = "custom-bg-color-swatch";
        swatch.style.background = solidHex;

        const code = document.createElement("span");
        code.className = "custom-bg-color-code";
        code.textContent = solidHex;
        code.setAttribute("aria-hidden", "true");

        item.setAttribute("aria-label", `Solid color ${solidHex}`);
        item.appendChild(swatch);
        item.appendChild(code);
      } else {
        thumb = document.createElement("img");
        thumb.src = this.getBackgroundThumbnailPlaceholder();
        thumb.dataset.thumbSrc = this.getBackgroundThumbnailUrl(entry.url);
        thumb.dataset.bgSourceUrl = entry.url;
        thumb.alt = `Background ${index + 1}`;
        thumb.className = "custom-bg-thumb";
        thumb.loading = "lazy";
        thumb.decoding = "async";
        thumb.fetchPriority = "low";
        thumbsToObserve.push(thumb);
      }

      const check = document.createElement("span");
      check.className = "custom-bg-item-check";
      check.textContent = "✓";
      check.setAttribute("aria-hidden", "true");

      const canDeleteCustomBg = selectedCategory === "custom";
      const canDeleteCustomSolid =
        selectedCategory === "solid" && isCustomSolidTemplate;

      if (canDeleteCustomBg || canDeleteCustomSolid) {
        const deleteBtn = document.createElement("span");
        deleteBtn.className = "custom-bg-item-delete";
        deleteBtn.innerHTML = this._getIcon("🗑️", {
          size: 14,
          inline: true,
        });
        deleteBtn.setAttribute("role", "button");
        deleteBtn.setAttribute("tabindex", "0");
        deleteBtn.setAttribute(
          "title",
          canDeleteCustomSolid
            ? "Remove custom solid color"
            : "Remove from custom backgrounds",
        );
        deleteBtn.setAttribute(
          "aria-label",
          canDeleteCustomSolid
            ? `Remove custom solid color ${solidHex || index + 1}`
            : `Remove custom background ${index + 1}`,
        );

        const deleteHandler = (event) => {
          event.preventDefault();
          event.stopPropagation();
          void (async () => {
            const confirmed = await this.openConfirmModal({
              icon: "🗑️",
              title: canDeleteCustomSolid
                ? "Remove Custom Solid Color?"
                : "Remove Background?",
              text: canDeleteCustomSolid
                ? "This custom solid color will be removed from your palette."
                : "This background will be removed from your custom pool.",
              hint: "You can import it again anytime.",
              confirmLabel: "Remove",
              cancelLabel: "Keep",
            });

            if (!confirmed) return;
            if (canDeleteCustomSolid) {
              await this.removeSolidColorTemplate(entry.url);
              return;
            }

            await this.removeCustomBackgroundFromPool(entry.url);
          })();
        };

        deleteBtn.addEventListener("click", deleteHandler);
        deleteBtn.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            deleteHandler(event);
          }
        });

        item.appendChild(deleteBtn);
      }

      if (thumb) {
        item.appendChild(thumb);
      }
      item.appendChild(check);
      item.addEventListener("click", () => {
        this.toggleBackgroundPoolImageSelection(index);
      });

      fragment.appendChild(item);
    });

    this.customBgList.replaceChildren(fragment);
    if (selectedCategory !== "solid") {
      thumbsToObserve.forEach((thumb) => {
        this.observeBackgroundThumbImage(thumb);
      });
      this.applyCustomBackgroundThumbsToRenderedPool();
    }
    this.updateBackgroundPoolCount(selectedCount, images.length);
  }

  toggleBackgroundPoolImageSelection(index) {
    const category = this.normalizeBackgroundCategory(
      this._activeBgPoolCategory || this.bgCategory?.value || "all",
    );
    const entry = this._activeBgPoolImages?.[index];
    const imageUrl = this.normalizeBackgroundImageUrl(entry?.url);
    if (!imageUrl) return;

    const settings = this.storage.getSettings();
    const selectionMap = this.getBackgroundImageSelectionMap(settings);
    const currentSelection = Object.prototype.hasOwnProperty.call(
      selectionMap,
      category,
    )
      ? selectionMap[category]
      : this._activeBgPoolImages
          .map((image) => this.normalizeBackgroundImageUrl(image.url))
          .filter(Boolean);

    const selectedSet = new Set(currentSelection);
    if (selectedSet.has(imageUrl)) selectedSet.delete(imageUrl);
    else selectedSet.add(imageUrl);

    this.saveBackgroundSelectionForCategory(
      category,
      Array.from(selectedSet),
      settings,
    );
    this.applyBackgroundPoolSelectionToRenderedItems(selectedSet);
    this._backgroundSettingsDirty = true;
  }

  selectAllBackgroundPoolImages() {
    const category = this.normalizeBackgroundCategory(
      this._activeBgPoolCategory || this.bgCategory?.value || "all",
    );
    const urls = this._activeBgPoolImages
      .map((image) => this.normalizeBackgroundImageUrl(image.url))
      .filter(Boolean);
    this.saveBackgroundSelectionForCategory(category, urls);
    this.applyBackgroundPoolSelectionToRenderedItems(new Set(urls));
    this._backgroundSettingsDirty = true;
  }

  deselectAllBackgroundPoolImages() {
    const category = this.normalizeBackgroundCategory(
      this._activeBgPoolCategory || this.bgCategory?.value || "all",
    );
    this.saveBackgroundSelectionForCategory(category, []);
    this.applyBackgroundPoolSelectionToRenderedItems(new Set());
    this._backgroundSettingsDirty = true;
  }

  async addSolidColorTemplate(rawColor) {
    const solidHex = this.normalizeSolidColorHex(rawColor);
    if (!solidHex) {
      this.showToast("Please enter a valid hex color.", "error");
      return false;
    }

    const solidUrl = this.solidColorHexToBackgroundUrl(solidHex);
    if (!solidUrl) {
      this.showToast("Failed to build solid color template.", "error");
      return false;
    }

    const settings = this.storage.getSettings();

    const customTemplates = Array.isArray(settings.solidColorTemplates)
      ? settings.solidColorTemplates
          .map((entry) => this.normalizeSolidColorHex(entry))
          .filter(Boolean)
      : [];

    if (!customTemplates.includes(solidHex)) {
      customTemplates.push(solidHex);
    }
    settings.solidColorTemplates = customTemplates;

    const selectionMap = this.getBackgroundImageSelectionMap(settings);
    const solidSelection = Array.isArray(selectionMap.solid)
      ? selectionMap.solid
          .map((entry) => this.normalizeBackgroundImageUrl(entry))
          .filter(Boolean)
      : [];

    if (!solidSelection.includes(solidUrl)) {
      solidSelection.push(solidUrl);
    }
    selectionMap.solid = solidSelection;
    settings.backgroundImageSelections = selectionMap;

    this.storage.saveSettings(settings);
    this.renderBackgroundImagePool();
    this._backgroundSettingsDirty = true;

    if (this.solidColorPicker) {
      this.solidColorPicker.value = solidHex;
    }
    if (this.solidColorHexInput) {
      this.solidColorHexInput.value = solidHex;
    }

    this.showToast("Solid color template added!", "success");
    return true;
  }

  async removeSolidColorTemplate(value) {
    const solidHex = this.normalizeSolidColorHex(value);
    if (!solidHex) {
      return false;
    }

    const settings = this.storage.getSettings();
    const customTemplates = Array.isArray(settings.solidColorTemplates)
      ? settings.solidColorTemplates
          .map((entry) => this.normalizeSolidColorHex(entry))
          .filter(Boolean)
      : [];

    if (!customTemplates.includes(solidHex)) {
      this.showToast("Only custom solid colors can be removed.", "error");
      return false;
    }

    settings.solidColorTemplates = customTemplates.filter(
      (entry) => entry !== solidHex,
    );

    const solidUrl = this.solidColorHexToBackgroundUrl(solidHex);
    const selectionMap = this.getBackgroundImageSelectionMap(settings);
    const currentSolidSelection = Array.isArray(selectionMap.solid)
      ? selectionMap.solid
          .map((entry) => this.normalizeBackgroundImageUrl(entry))
          .filter(Boolean)
      : [];

    if (solidUrl) {
      selectionMap.solid = currentSolidSelection.filter(
        (entry) => entry !== solidUrl,
      );
    } else {
      selectionMap.solid = currentSolidSelection;
    }
    settings.backgroundImageSelections = selectionMap;

    this.storage.saveSettings(settings);
    this.renderBackgroundImagePool();
    this._backgroundSettingsDirty = true;

    const currentBgUrl = this.normalizeBackgroundImageUrl(
      (typeof this.backgrounds?.getCurrentImageUrl === "function"
        ? this.backgrounds.getCurrentImageUrl(settings)
        : this.backgrounds?.currentImageUrl) || "",
    );

    if (solidUrl && currentBgUrl === solidUrl) {
      const availableSolidUrls = new Set(
        (this.getAllBackgroundImagesForCategory("solid", settings) || [])
          .map((entry) =>
            this.normalizeBackgroundImageUrl(
              typeof entry === "string" ? entry : entry?.url,
            ),
          )
          .filter(Boolean),
      );

      if (!availableSolidUrls.has(solidUrl)) {
        this.refreshBackgroundAfterSettingsSave(settings);
      }
    }

    this.showToast("Custom solid color removed.", "success");
    return true;
  }

  async removeCustomBackgroundFromPool(imageUrl) {
    const normalizedUrl = this.normalizeBackgroundImageUrl(imageUrl);
    if (!normalizedUrl) {
      return false;
    }

    const settings = this.storage.getSettings();
    const customBgRefs = Array.isArray(settings.customBackgrounds)
      ? settings.customBackgrounds
          .map((entry) => this.normalizeBackgroundImageUrl(entry))
          .filter((entry) => this.isValidCustomBackgroundReference(entry))
      : [];

    const removalCandidates = new Set([normalizedUrl]);
    const mappedImage = this.normalizeBackgroundImageUrl(
      this._customBackgroundImageByToken?.get(normalizedUrl),
    );
    if (mappedImage) {
      removalCandidates.add(mappedImage);
    }

    const nextRefs = customBgRefs.filter(
      (entry) => !removalCandidates.has(entry),
    );
    if (nextRefs.length === customBgRefs.length) {
      this.showToast("Background not found in pool.", "error");
      return false;
    }

    settings.customBackgrounds = nextRefs.slice(
      0,
      SettingsManager.CUSTOM_BACKGROUND_LIMIT,
    );

    const selectionMap = this.getBackgroundImageSelectionMap(settings);
    Object.keys(selectionMap).forEach((category) => {
      const urls = Array.isArray(selectionMap[category])
        ? selectionMap[category]
        : [];

      selectionMap[category] = urls
        .map((value) => this.normalizeBackgroundImageUrl(value))
        .filter((value) => Boolean(value) && !removalCandidates.has(value));
    });
    settings.backgroundImageSelections = selectionMap;

    this.storage.saveSettings(settings);

    for (const candidate of removalCandidates) {
      this._backgroundThumbUrlCache?.delete(candidate);
      this._backgroundThumbPendingLoads?.delete(candidate);
      const blobThumb = this._backgroundThumbBlobUrlCache?.get(candidate);
      if (blobThumb) {
        this._backgroundThumbBlobUrlCache.delete(candidate);
        this.revokeBackgroundThumbBlobUrl(blobThumb);
      }
    }

    if (this.isCustomBackgroundToken(normalizedUrl)) {
      await this.deleteCustomBackgroundMediaByToken(normalizedUrl);
    }

    void this.syncCustomBackgroundMediaFromSettings(settings);
    this.renderBackgroundImagePool();
    this._backgroundSettingsDirty = true;

    const currentBgUrl = this.normalizeBackgroundImageUrl(
      (typeof this.backgrounds?.getCurrentImageUrl === "function"
        ? this.backgrounds.getCurrentImageUrl(settings)
        : this.backgrounds?.currentImageUrl) || "",
    );
    if (currentBgUrl && removalCandidates.has(currentBgUrl)) {
      this.refreshBackgroundAfterSettingsSave(settings);
    }

    this.showToast("Background removed from pool.", "success");
    return true;
  }

  /**
   * Read a file as a data URL
   */
  readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event?.target?.result || "");
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Add custom background
   */
  async addCustomBackground(file) {
    const settings = this.storage.getSettings();
    const customBgRefs = Array.isArray(settings.customBackgrounds)
      ? settings.customBackgrounds
      : [];

    let base64 = "";
    try {
      base64 = this.normalizeBackgroundImageUrl(
        await this.readFileAsDataUrl(file),
      );
    } catch (e) {
      this.showToast("Failed to read image.", "error");
      return false;
    }

    if (!base64) {
      this.showToast("Failed to read image.", "error");
      return false;
    }

    const thumbnailDataUrl =
      await this.buildCustomBackgroundThumbnailDataUrl(base64);
    const token = await this.saveCustomBackgroundMediaToIndexedDb(
      base64,
      thumbnailDataUrl,
    );
    if (!token) {
      this.showToast("Failed to save background.", "error");
      return false;
    }

    const alreadyExists = customBgRefs.includes(token);
    if (
      !alreadyExists &&
      customBgRefs.length >= SettingsManager.CUSTOM_BACKGROUND_LIMIT
    ) {
      this.showToast(
        `Maximum ${SettingsManager.CUSTOM_BACKGROUND_LIMIT} custom backgrounds allowed`,
        "error",
      );
      return false;
    }

    if (!alreadyExists) {
      customBgRefs.push(token);
    }
    settings.customBackgrounds = customBgRefs.slice(
      0,
      SettingsManager.CUSTOM_BACKGROUND_LIMIT,
    );

    const selectionMap = this.getBackgroundImageSelectionMap(settings);
    const customSelection = Array.isArray(selectionMap.custom)
      ? selectionMap.custom.slice()
      : [];
    if (!customSelection.includes(token)) {
      customSelection.push(token);
    }
    selectionMap.custom = customSelection;
    settings.backgroundImageSelections = selectionMap;

    this.storage.saveSettings(settings);
    void this.syncCustomBackgroundMediaFromSettings(settings);
    this.renderBackgroundImagePool();
    this._backgroundSettingsDirty = true;
    this.showToast(
      alreadyExists ? "Background already in pool." : "Background added!",
      "success",
    );
    return true;
  }

  async addCustomBackgroundFromUrl(imageUrl) {
    const normalizedUrl = this.normalizeBackgroundImageImportUrl(imageUrl);
    if (!normalizedUrl) {
      this.showToast("Please enter a valid HTTP(S) image URL.", "error");
      return false;
    }

    const settings = this.storage.getSettings();
    const customBgRefs = Array.isArray(settings.customBackgrounds)
      ? settings.customBackgrounds
          .map((entry) => this.normalizeBackgroundImageUrl(entry))
          .filter((entry) => this.isValidCustomBackgroundReference(entry))
      : [];

    const alreadyExists = customBgRefs.includes(normalizedUrl);
    if (
      !alreadyExists &&
      customBgRefs.length >= SettingsManager.CUSTOM_BACKGROUND_LIMIT
    ) {
      this.showToast(
        `Maximum ${SettingsManager.CUSTOM_BACKGROUND_LIMIT} custom backgrounds allowed`,
        "error",
      );
      return false;
    }

    if (!alreadyExists) {
      customBgRefs.push(normalizedUrl);
    }
    settings.customBackgrounds = customBgRefs.slice(
      0,
      SettingsManager.CUSTOM_BACKGROUND_LIMIT,
    );

    const selectionMap = this.getBackgroundImageSelectionMap(settings);
    const customSelection = Array.isArray(selectionMap.custom)
      ? selectionMap.custom.slice()
      : [];
    if (!customSelection.includes(normalizedUrl)) {
      customSelection.push(normalizedUrl);
    }
    selectionMap.custom = customSelection;
    settings.backgroundImageSelections = selectionMap;

    this.storage.saveSettings(settings);
    void this.syncCustomBackgroundMediaFromSettings(settings);
    this.renderBackgroundImagePool();
    this._backgroundSettingsDirty = true;
    this.showToast(
      alreadyExists ? "Background already in pool." : "Background URL added!",
      "success",
    );
    return true;
  }

  async promptAndAddCustomBackgroundFromUrl() {
    const imageUrl = await this.openUrlInputModal({
      title: "Import Background by URL",
      description:
        "Paste a direct image URL. Only HTTP(S) image links are supported.",
      label: "Background image URL",
      placeholder: "https://example.com/wallpaper.jpg",
      submitLabel: "Import",
      initialValue: "https://",
      validate: (value) => {
        const normalized = this.normalizeBackgroundImageImportUrl(value);
        if (!normalized) return "";
        return this.isRemoteBackgroundImageUrl(normalized) ? normalized : "";
      },
      invalidMessage: "Please enter a valid HTTP(S) image URL.",
    });

    if (!imageUrl) {
      return false;
    }

    return this.addCustomBackgroundFromUrl(imageUrl);
  }

  /**
   * Export all settings (alias for exportFullExport for backward compatibility)
   */
  exportAllSettings() {
    this.exportFullExport();
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
          "Invalid format: expected an array or { searches: [] }",
        );
      }

      const valid = searches
        .filter(
          (s) =>
            s &&
            typeof s.name === "string" &&
            s.name.trim() !== "" &&
            typeof s.url === "string" &&
            s.url.trim() !== "",
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
    // Complete export of ALL user data and settings
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
      [],
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

    // Custom backgrounds
    const customBackgrounds = Array.isArray(settings.customBackgrounds)
      ? settings.customBackgrounds
      : [];

    // Flashcard sets - export ALL sets (including defaults with user progress)
    const allFlashcardSets = this.flashcards?.getSets
      ? this.flashcards.getSets()
      : this.storage.get("flashcardSets", []);

    const flashcardProtectedIds =
      typeof FlashcardManager !== "undefined" &&
      Array.isArray(FlashcardManager.PROTECTED_SET_IDS)
        ? FlashcardManager.PROTECTED_SET_IDS
        : [
            "default_top300wordforms",
            "default_99names_ar",
            "default_99names_en",
          ];

    // Separate custom sets and protected set references
    const customFlashcardSets = (
      Array.isArray(allFlashcardSets) ? allFlashcardSets : []
    )
      .filter((s) => s && s.id && !flashcardProtectedIds.includes(s.id))
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

    // Flashcard card index positions (remembers which card user was on)
    const flashcardCardIndexBySet = this.storage.get(
      "flashcardCardIndexBySet",
      {},
    );

    // Adhkar sets - export custom sets
    const allAdhkarSets = this.adhkar?.getSets
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

    const customAdhkarSets = (Array.isArray(allAdhkarSets) ? allAdhkarSets : [])
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
                    c.reference),
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

    // Adhkar card index positions
    const adhkarCardIndexBySet = this.storage.get("adhkarCardIndexBySet", {});

    // Hadith sets - export custom sets
    const allHadithSets = this.hadith?.getSets
      ? this.hadith.getSets()
      : this.storage.get("hadithSets", []);

    const hadithProtectedIds =
      typeof HadithManager !== "undefined" &&
      Array.isArray(HadithManager.PROTECTED_SET_IDS)
        ? HadithManager.PROTECTED_SET_IDS
        : ["default_hadith_nawawi40", "default_hadith_random200"];

    const customHadithSets = (Array.isArray(allHadithSets) ? allHadithSets : [])
      .filter((s) => s && s.id && !hadithProtectedIds.includes(s.id))
      .map((s) => ({
        id: String(s.id),
        name: String(s.name || "Imported").slice(0, 40),
        createdAt: s.createdAt || null,
        updatedAt: s.updatedAt || null,
        cards: Array.isArray(s.cards)
          ? s.cards
              .filter((c) => c && (c.text || c.title || c.narrator))
              .map((c) => ({
                title: String(c.title || ""),
                text: String(c.text || ""),
                narrator: String(c.narrator || ""),
                source: String(c.source || ""),
                grade: String(c.grade || ""),
                arabicText: String(c.arabicText || ""),
                reference: String(c.reference || ""),
                book: String(c.book || ""),
                chapter: String(c.chapter || ""),
                number: c.number ?? null,
              }))
          : [],
      }));

    // Hadith card index positions
    const hadithCardIndexBySet = this.storage.get("hadithCardIndexBySet", {});

    const exportData = {
      exportType: "full",
      version: 3,
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

      // Flashcards - custom sets only (defaults are auto-loaded)
      flashcards: {
        activeSetId:
          this.flashcards?.getActiveSetId?.() ||
          settings.flashcards?.activeSetId ||
          null,
        sets: customFlashcardSets,
        cardIndexBySet: flashcardCardIndexBySet,
      },

      // Adhkar - custom sets only (defaults are auto-loaded)
      adhkar: {
        activeSetId:
          this.adhkar?.getActiveSetId?.() ||
          settings.adhkar?.activeSetId ||
          null,
        sets: customAdhkarSets,
        cardIndexBySet: adhkarCardIndexBySet,
      },

      // Hadith - custom sets only (defaults are auto-loaded)
      hadith: {
        activeSetId:
          this.hadith?.getActiveSetId?.() ||
          settings.hadith?.activeSetId ||
          null,
        sets: customHadithSets,
        cardIndexBySet: hadithCardIndexBySet,
      },

      // Custom backgrounds (also in settings.customBackgrounds but kept for clarity)
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

  _importSharedBackupData(data, { includeUserQuotes = false } = {}) {
    if (data.settings) {
      this.storage.saveSettings(data.settings);
    }

    if (data.todos) {
      this.storage.saveTodos(data.todos);
    }

    if (includeUserQuotes && data.userQuotes) {
      this.storage.saveUserQuotes(data.userQuotes);
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
  }

  importFullExport(data) {
    const maxSets =
      typeof FlashcardManager !== "undefined" &&
      typeof FlashcardManager.MAX_SETS === "number"
        ? FlashcardManager.MAX_SETS
        : 10;

    this._importSharedBackupData(data);

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
            String(data.stickyNotes.visible),
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
        .map((x) => this.normalizeBackgroundImageUrl(x))
        .filter((x) => this.isValidCustomBackgroundReference(x))
        .slice(0, SettingsManager.CUSTOM_BACKGROUND_LIMIT);
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

    // Keep only custom sets in storage; protected defaults are loaded from bundled files at runtime.
    this.storage.set("flashcardSets", cleanedCustomSets);

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

    const reservedAdhkarDefaultCount =
      adhkarDefaultDefs.length || adhkarProtectedIds.length;

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
                    c.reference),
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
      .slice(0, Math.max(0, maxAdhkarSets - reservedAdhkarDefaultCount));

    this.storage.set("adhkarSets", cleanedCustomAdhkarSets);

    const incomingAdhkarActiveSetId = data.adhkar?.activeSetId;
    const validActiveAdhkarId =
      typeof incomingAdhkarActiveSetId === "string" &&
      (adhkarProtectedIds.includes(incomingAdhkarActiveSetId) ||
        cleanedCustomAdhkarSets.some(
          (s) => s && s.id === incomingAdhkarActiveSetId,
        ))
        ? incomingAdhkarActiveSetId
        : adhkarDefaultDefs[0]?.id || "default_adhkar_morning";

    settings.adhkar = {
      ...(settings.adhkar || {}),
      activeSetId: validActiveAdhkarId,
    };

    // Hadith (import custom sets; defaults will be restored by HadithManager.ensureDefaultSets on reload)
    const maxHadithSets =
      typeof HadithManager !== "undefined" &&
      typeof HadithManager.MAX_SETS === "number"
        ? HadithManager.MAX_SETS
        : 100;

    const existingHadithSets = this.storage.get("hadithSets", []);

    const hadithProtectedIds =
      typeof HadithManager !== "undefined" &&
      Array.isArray(HadithManager.PROTECTED_SET_IDS)
        ? HadithManager.PROTECTED_SET_IDS
        : ["default_hadith_nawawi40", "default_hadith_random200"];

    const hadithDefaultDefs =
      typeof HadithManager !== "undefined" &&
      Array.isArray(HadithManager.DEFAULT_SETS)
        ? HadithManager.DEFAULT_SETS
        : [];

    const reservedHadithDefaultCount =
      hadithDefaultDefs.length || hadithProtectedIds.length;

    const incomingHadithSetsRaw =
      data.hadith?.sets ||
      data.hadithSets ||
      (Array.isArray(data.hadith) ? data.hadith : []);
    const incomingHadithSets = Array.isArray(incomingHadithSetsRaw)
      ? incomingHadithSetsRaw
      : [];

    const cleanedCustomHadithSets = incomingHadithSets
      .filter((s) => s && s.id && !hadithProtectedIds.includes(s.id))
      .map((s, i) => ({
        id: String(s.id || `set_${Date.now()}_${i}`),
        name: String(s.name || "Imported").slice(0, 40),
        createdAt: s.createdAt || new Date().toISOString(),
        updatedAt: s.updatedAt || null,
        cards: Array.isArray(s.cards)
          ? s.cards
              .filter((c) => c && (c.text || c.title || c.narrator))
              .map((c) => ({
                title: String(c.title || ""),
                text: String(c.text || ""),
                narrator: String(c.narrator || ""),
                source: String(c.source || ""),
                grade: String(c.grade || ""),
                arabicText: String(c.arabicText || ""),
                reference: String(c.reference || ""),
                book: String(c.book || ""),
                chapter: String(c.chapter || ""),
                number: c.number ?? null,
              }))
          : [],
      }))
      .slice(0, Math.max(0, maxHadithSets - reservedHadithDefaultCount));

    this.storage.set("hadithSets", cleanedCustomHadithSets);

    const incomingHadithActiveSetId = data.hadith?.activeSetId;
    const validActiveHadithId =
      typeof incomingHadithActiveSetId === "string" &&
      (hadithProtectedIds.includes(incomingHadithActiveSetId) ||
        cleanedCustomHadithSets.some(
          (s) => s && s.id === incomingHadithActiveSetId,
        ))
        ? incomingHadithActiveSetId
        : hadithDefaultDefs[0]?.id || "default_hadith_nawawi40";

    settings.hadith = {
      ...(settings.hadith || {}),
      activeSetId: validActiveHadithId,
    };

    // Import card index positions (which card user was on in each set)
    if (
      data.flashcards?.cardIndexBySet &&
      typeof data.flashcards.cardIndexBySet === "object"
    ) {
      this.storage.set(
        "flashcardCardIndexBySet",
        data.flashcards.cardIndexBySet,
      );
    }

    if (
      data.adhkar?.cardIndexBySet &&
      typeof data.adhkar.cardIndexBySet === "object"
    ) {
      this.storage.set("adhkarCardIndexBySet", data.adhkar.cardIndexBySet);
    }

    if (
      data.hadith?.cardIndexBySet &&
      typeof data.hadith.cardIndexBySet === "object"
    ) {
      this.storage.set("hadithCardIndexBySet", data.hadith.cardIndexBySet);
    }

    this.storage.saveSettings(settings);
    void this.syncCustomBackgroundMediaFromSettings(settings);
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

      this._importSharedBackupData(data, { includeUserQuotes: true });

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

    const existingBeforeMinutes = this.clampNumber(
      settings.prayerNotifications.beforeMinutes,
      0,
      180,
      10,
    );
    const existingAfterMinutes = this.clampNumber(
      settings.prayerNotifications.afterMinutes,
      0,
      180,
      0,
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
        existingBeforeMinutes,
      );
      const afterMinutes = this.clampNumber(
        parseInt(this.notificationAfterMinutesInputs?.[prayer]?.value, 10),
        0,
        180,
        existingAfterMinutes,
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
    settings.pinnedAppsPerRow = this.clampNumber(
      parseInt(this.pinnedAppsPerRow?.value, 10),
      3,
      20,
      10,
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
        existingPocketQuran.arabicFontSize ?? 40,
      ),
      translationFontSize: this.clampNumber(
        parseInt(this.pocketQuranTranslationSize?.value, 10),
        8,
        144,
        existingPocketQuran.translationFontSize ?? 18,
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
    };

    const existingPocketQuranPopup =
      settings.pocketQuranPopup && typeof settings.pocketQuranPopup === "object"
        ? settings.pocketQuranPopup
        : {};

    settings.pocketQuranPopup = {
      ...existingPocketQuranPopup,
      arabicFontSize: this.clampNumber(
        parseInt(this.pocketQuranPopupArabicSize?.value, 10),
        8,
        144,
        existingPocketQuranPopup.arabicFontSize ??
          existingPocketQuran.arabicFontSize ??
          40,
      ),
      translationFontSize: this.clampNumber(
        parseInt(this.pocketQuranPopupTranslationSize?.value, 10),
        8,
        144,
        existingPocketQuranPopup.translationFontSize ??
          existingPocketQuran.translationFontSize ??
          18,
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

    if (closeModal) {
      this.closeModal();
    }

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

    // Apply changes live
    this.applySettings(settings);

    if (source === "manual" && this._backgroundSettingsDirty) {
      this.refreshBackgroundAfterSettingsSave(settings);
      this._backgroundSettingsDirty = false;
    }

    if (showToast) {
      this.showToast("Settings saved successfully!", "success");
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

  /**
   * Save heading settings
   */
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

    settings.heading.greetingGlowEnabled =
      this.headerGreetingGlowEnabled?.checked === true;
    settings.heading.greetingGlowColor = settings.heading.greetingGlowEnabled
      ? this.normalizeColorHex(this.headerGreetingGlowColor?.value, "")
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
      ? this.normalizeColorHex(this.headerDateGlowColor?.value, "")
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
      ? this.normalizeColorHex(this.headerTimeGlowColor?.value, "")
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
      ? this.normalizeColorHex(this.headerNextPrayerGlowColor?.value, "")
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
      ? this.normalizeColorHex(this.headerCompactWeatherGlowColor?.value, "")
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
      ashuraDays: this.fastingShowAshuraDays?.checked ?? true,
      dhuAlHijjah: this.fastingShowDhuAlHijjah?.checked ?? true,
      arafah: this.fastingShowArafah?.checked ?? true,
      ramadan: this.fastingShowRamadan?.checked ?? true,
    };

    settings.fasting.showRecommendations =
      this.fastingShowRecommendations?.checked ?? true;

    // Within days settings
    settings.fasting.dhuAlHijjahWithinDays = this.clampNumber(
      parseInt(this.fastingDhuAlHijjahWithinDays?.value, 10),
      7,
      365,
      30,
    );
    settings.fasting.arafahWithinDays = this.clampNumber(
      parseInt(this.fastingArafahWithinDays?.value, 10),
      7,
      365,
      30,
    );
    settings.fasting.ashuraWithinDays = this.clampNumber(
      parseInt(this.fastingAshuraWithinDays?.value, 10),
      7,
      365,
      30,
    );

    // Notification settings
    settings.fasting.notifications = {
      enabled: this.fastingNotificationsEnabled?.checked ?? false,
      minutesBefore: this.clampNumber(
        parseInt(this.fastingNotificationMinutesBefore?.value, 10),
        5,
        180,
        60,
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

  /**
   * Apply settings to components
   */
  applySettings(settings) {
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

  /**
   * Apply live updates to all components without page reload
   * This replaces the previous window.location.reload() approach
   */
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

  /**
   * Apply container width setting
   */
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
          const clamped = this.clampNumber(customValue, 20, 98, 70);
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

  /**
   * Debounced sync for responsive media-query emulation based on container width.
   */
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

  /**
   * Ensure viewport-driven updates keep container-width emulation in sync.
   */
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

  /**
   * Apply width-based media rules using container width when it is narrower than viewport.
   */
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

  /**
   * Read and cache width-based media rules from same-origin stylesheets.
   */
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

  /**
   * Recursively collect media rules that depend only on width constraints.
   */
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

  /**
   * Evaluate simple width-based media query text against container width.
   */
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

  /**
   * Remove generated emulation stylesheet when native viewport media queries apply.
   */
  removeContainerWidthMediaEmulation() {
    const styleEl =
      this._containerWidthMediaStyleEl ||
      document.getElementById("md-container-width-media-emulation");

    if (styleEl) {
      styleEl.remove();
    }

    this._containerWidthMediaStyleEl = null;
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

    this.updateDetectedLocationTextVisibility();
  }

  /**
   * Toggle custom angles group
   */
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

  /**
   * Request location permission
   */
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

  bindDetachedEditorViewportRefresh() {
    if (this._detachedEditorViewportHandler) {
      window.removeEventListener("resize", this._detachedEditorViewportHandler);
      window.removeEventListener(
        "orientationchange",
        this._detachedEditorViewportHandler,
      );
      this._detachedEditorViewportHandler = null;
    }

    this._detachedEditorViewportHandler = () => {
      if (this._detachedEditorViewportRaf) return;

      this._detachedEditorViewportRaf = window.requestAnimationFrame(() => {
        this._detachedEditorViewportRaf = 0;
        this.scheduleDetachedEditorLayoutRefresh({ includeWidth: true });
      });
    };

    window.addEventListener("resize", this._detachedEditorViewportHandler);
    window.addEventListener(
      "orientationchange",
      this._detachedEditorViewportHandler,
    );
  }

  isDetachedResizeArtifactNode(node) {
    if (!(node instanceof Element)) return false;
    if (node.classList.contains("editor-col-resize-handle")) return true;
    if (node.classList.contains("editor-resize-colgroup")) return true;
    if (
      node.tagName === "COL" &&
      node.parentElement?.classList?.contains("editor-resize-colgroup")
    ) {
      return true;
    }
    return false;
  }

  bindDetachedEditorMutationRefresh() {
    if (this._detachedEditorMutationObserver) {
      try {
        this._detachedEditorMutationObserver.disconnect();
      } catch (e) {
        // ignore
      }
      this._detachedEditorMutationObserver = null;
    }

    const state = this._detachedEditorState;
    if (!state?.group) return;

    this._detachedEditorMutationObserver = new MutationObserver((mutations) => {
      if (!this._detachedEditorState) return;

      const hasRelevantStructureChange = mutations.some((mutation) => {
        if (mutation.type !== "childList") return false;
        const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
        if (!nodes.length) return false;

        return nodes.some((node) => {
          if (this.isDetachedResizeArtifactNode(node)) return false;
          return true;
        });
      });

      if (!hasRelevantStructureChange) return;
      this.scheduleDetachedEditorLayoutRefresh({ includeWidth: false });
    });

    this._detachedEditorMutationObserver.observe(state.group, {
      childList: true,
      subtree: true,
    });
  }

  getEditorColumnMinWidth(cell, index, totalColumns) {
    const cls = String(cell?.className || "").toLowerCase();
    const label = String(cell?.textContent || "").toLowerCase();

    if (index === 0) return 42;
    if (index === totalColumns - 1) return 34;
    if (cls.includes("col-actions")) return 34;
    if (cls.includes("col-id")) return 48;
    if (cls.includes("text-lang") || label.includes("text")) return 220;
    if (cls.includes("question") || cls.includes("answer")) return 180;
    if (cls.includes("narrator") || cls.includes("reference")) return 120;
    if (cls.includes("title") || label.includes("title")) return 140;
    if (cls.includes("arabic") || cls.includes("romanization")) return 150;
    return 110;
  }

  enableDetachedEditorColumnResize(group) {
    if (!group) return null;
    const cleanups = [];

    const gridHeader = group.querySelector(".flashcard-editor-header");
    if (gridHeader) {
      const cleanup = this.enableDetachedGridColumnResize(gridHeader, group);
      if (typeof cleanup === "function") cleanups.push(cleanup);
    }

    const table = group.querySelector(
      ".hadith-editor-table, .adhkar-editor-table",
    );
    if (table) {
      const cleanup = this.enableDetachedTableColumnResize(table);
      if (typeof cleanup === "function") cleanups.push(cleanup);
    }

    if (!cleanups.length) return null;
    return () => {
      cleanups.forEach((fn) => {
        try {
          fn();
        } catch (e) {
          // ignore
        }
      });
    };
  }

  enableDetachedGridColumnResize(header, group) {
    if (!header || !group) return null;

    const headerCells = Array.from(header.children || []);
    if (headerCells.length < 4) return null;

    let widths = String(getComputedStyle(header).gridTemplateColumns || "")
      .split(/\s+/)
      .map((value) => parseFloat(value))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (widths.length !== headerCells.length) {
      widths = headerCells.map((cell) =>
        Math.max(40, cell.getBoundingClientRect().width),
      );
    }

    const applyTemplate = () => {
      const template = widths.map((w) => `${Math.round(w)}px`).join(" ");
      header.style.gridTemplateColumns = template;
      group.querySelectorAll(".flashcard-row").forEach((row) => {
        row.style.gridTemplateColumns = template;
      });
    };

    applyTemplate();

    const handles = [];
    const listeners = [];

    for (let i = 1; i < headerCells.length - 2; i += 1) {
      const cell = headerCells[i];
      if (!cell) continue;

      const handle = document.createElement("span");
      handle.className = "editor-col-resize-handle";
      handle.setAttribute("role", "separator");
      handle.setAttribute("aria-orientation", "vertical");
      handle.setAttribute("aria-label", "Resize columns");

      const onPointerDown = (event) => {
        event.preventDefault();
        event.stopPropagation();

        const startX = event.clientX;
        const startLeft = widths[i];
        const startRight = widths[i + 1];
        const minLeft = this.getEditorColumnMinWidth(
          headerCells[i],
          i,
          headerCells.length,
        );
        const minRight = this.getEditorColumnMinWidth(
          headerCells[i + 1],
          i + 1,
          headerCells.length,
        );

        handle.classList.add("is-dragging");

        const onPointerMove = (moveEvent) => {
          const deltaX = moveEvent.clientX - startX;
          const total = startLeft + startRight;
          const nextLeft = Math.max(
            minLeft,
            Math.min(startLeft + deltaX, total - minRight),
          );
          const nextRight = total - nextLeft;

          widths[i] = nextLeft;
          widths[i + 1] = nextRight;
          applyTemplate();
        };

        const onPointerUp = () => {
          handle.classList.remove("is-dragging");
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
      };

      handle.addEventListener("pointerdown", onPointerDown);
      listeners.push({ handle, onPointerDown });
      cell.appendChild(handle);
      handles.push(handle);
    }

    return () => {
      listeners.forEach(({ handle, onPointerDown }) => {
        try {
          handle.removeEventListener("pointerdown", onPointerDown);
          handle.remove();
        } catch (e) {
          // ignore
        }
      });

      header.style.removeProperty("grid-template-columns");
      group.querySelectorAll(".flashcard-row").forEach((row) => {
        row.style.removeProperty("grid-template-columns");
      });
    };
  }

  enableDetachedTableColumnResize(table) {
    if (!table) return null;

    const headerCells = Array.from(table.querySelectorAll("thead th"));
    if (headerCells.length < 3) return null;

    const colgroup = document.createElement("colgroup");
    colgroup.className = "editor-resize-colgroup";

    const widths = headerCells.map((cell, index) => {
      const measured = Math.max(
        40,
        Math.round(cell.getBoundingClientRect().width),
      );
      const min = this.getEditorColumnMinWidth(cell, index, headerCells.length);
      return Math.max(min, measured);
    });

    widths.forEach((width) => {
      const col = document.createElement("col");
      col.style.width = `${Math.round(width)}px`;
      colgroup.appendChild(col);
    });

    table.insertBefore(colgroup, table.firstChild);
    const cols = Array.from(colgroup.children);

    const prevLayout = table.style.tableLayout;
    const prevWidth = table.style.width;

    table.style.tableLayout = "fixed";

    const applyWidths = () => {
      cols.forEach((col, index) => {
        col.style.width = `${Math.round(widths[index])}px`;
      });
      table.style.width = `${Math.round(widths.reduce((acc, val) => acc + val, 0))}px`;
    };

    applyWidths();

    const listeners = [];

    for (let i = 1; i < headerCells.length - 1; i += 1) {
      const leftCell = headerCells[i];
      const rightCell = headerCells[i + 1];
      if (!leftCell || !rightCell) continue;
      if (
        String(leftCell.className || "").includes("col-actions") ||
        String(rightCell.className || "").includes("col-actions")
      ) {
        continue;
      }

      const handle = document.createElement("span");
      handle.className = "editor-col-resize-handle";
      handle.setAttribute("role", "separator");
      handle.setAttribute("aria-orientation", "vertical");
      handle.setAttribute("aria-label", "Resize columns");

      const onPointerDown = (event) => {
        event.preventDefault();
        event.stopPropagation();

        const startX = event.clientX;
        const startLeft = widths[i];
        const startRight = widths[i + 1];
        const minLeft = this.getEditorColumnMinWidth(
          leftCell,
          i,
          headerCells.length,
        );
        const minRight = this.getEditorColumnMinWidth(
          rightCell,
          i + 1,
          headerCells.length,
        );

        handle.classList.add("is-dragging");

        const onPointerMove = (moveEvent) => {
          const deltaX = moveEvent.clientX - startX;
          const total = startLeft + startRight;
          const nextLeft = Math.max(
            minLeft,
            Math.min(startLeft + deltaX, total - minRight),
          );
          const nextRight = total - nextLeft;

          widths[i] = nextLeft;
          widths[i + 1] = nextRight;
          applyWidths();
        };

        const onPointerUp = () => {
          handle.classList.remove("is-dragging");
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
      };

      handle.addEventListener("pointerdown", onPointerDown);
      listeners.push({ handle, onPointerDown });
      leftCell.appendChild(handle);
    }

    return () => {
      listeners.forEach(({ handle, onPointerDown }) => {
        try {
          handle.removeEventListener("pointerdown", onPointerDown);
          handle.remove();
        } catch (e) {
          // ignore
        }
      });

      colgroup.remove();
      table.style.tableLayout = prevLayout;
      table.style.width = prevWidth;
    };
  }

  closeDetachedEditorModal({ skipAfterCloseRefresh = false } = {}) {
    if (this.detachedEditorModal) {
      this.detachedEditorModal.classList.remove("active");
    }

    if (!this._detachedEditorState) return;

    if (this._detachedEditorMutationObserver) {
      try {
        this._detachedEditorMutationObserver.disconnect();
      } catch (e) {
        // ignore
      }
      this._detachedEditorMutationObserver = null;
    }

    if (this._detachedEditorRefreshTimer) {
      clearTimeout(this._detachedEditorRefreshTimer);
      this._detachedEditorRefreshTimer = null;
    }
    this._detachedEditorRefreshNeedsWidth = false;

    if (this._detachedEditorViewportRaf) {
      window.cancelAnimationFrame(this._detachedEditorViewportRaf);
      this._detachedEditorViewportRaf = 0;
    }

    if (this._detachedEditorViewportHandler) {
      window.removeEventListener("resize", this._detachedEditorViewportHandler);
      window.removeEventListener(
        "orientationchange",
        this._detachedEditorViewportHandler,
      );
      this._detachedEditorViewportHandler = null;
    }

    const { group, placeholder, onAfterClose, resizeCleanup } =
      this._detachedEditorState;

    if (typeof resizeCleanup === "function") {
      try {
        resizeCleanup();
      } catch (e) {
        // ignore
      }
    }

    if (placeholder?.parentElement && group) {
      placeholder.parentElement.insertBefore(group, placeholder);
      placeholder.remove();
    }

    if (!skipAfterCloseRefresh && typeof onAfterClose === "function") {
      try {
        onAfterClose();
      } catch (e) {
        // ignore
      }
    }

    this._detachedEditorState = null;
  }

  /**
   * Resolve changelog URL in extension/runtime contexts.
   */
  getChangelogResourceUrl() {
    if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
      return chrome.runtime.getURL("data/changelog.txt");
    }

    if (typeof browser !== "undefined" && browser.runtime?.getURL) {
      return browser.runtime.getURL("data/changelog.txt");
    }

    return "data/changelog.txt";
  }

  renderChangelogInlineMarkdown(value) {
    const escaped = this.escapeHtml(value);
    return escaped
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  renderChangelogMarkdown(markdown) {
    const lines = String(markdown || "").split(/\r?\n/);
    const html = [];
    let hasEntry = false;
    let entryOpen = false;
    let listOpen = false;

    const closeList = () => {
      if (!listOpen) return;
      html.push("</ul>");
      listOpen = false;
    };

    const closeEntry = () => {
      closeList();
      if (!entryOpen) return;
      html.push("</section>");
      entryOpen = false;
    };

    const ensureEntry = () => {
      if (entryOpen) return;
      html.push('<section class="changelog-entry">');
      entryOpen = true;
      hasEntry = true;
    };

    lines.forEach((rawLine) => {
      const line = String(rawLine || "").trim();

      if (!line) {
        closeList();
        return;
      }

      if (line.startsWith("## ")) {
        closeEntry();
        ensureEntry();
        html.push(
          `<h3 class="changelog-entry-title">${this.renderChangelogInlineMarkdown(line.slice(3).trim())}</h3>`,
        );
        return;
      }

      if (line.startsWith("### ")) {
        ensureEntry();
        closeList();
        html.push(
          `<h4 class="changelog-entry-subtitle">${this.renderChangelogInlineMarkdown(line.slice(4).trim())}</h4>`,
        );
        return;
      }

      if (line.startsWith("- ")) {
        ensureEntry();
        if (!listOpen) {
          html.push('<ul class="changelog-list">');
          listOpen = true;
        }

        html.push(
          `<li>${this.renderChangelogInlineMarkdown(line.replace(/^-\s+/, ""))}</li>`,
        );
        return;
      }

      ensureEntry();
      closeList();
      html.push(
        `<p class="changelog-text">${this.renderChangelogInlineMarkdown(line)}</p>`,
      );
    });

    closeEntry();

    if (!hasEntry) {
      return '<p class="changelog-empty">No changelog entries found.</p>';
    }

    return html.join("");
  }

  async ensureChangelogContentLoaded() {
    if (!this.changelogContent) {
      return;
    }

    if (this._changelogHtmlCache) {
      this.changelogContent.innerHTML = this._changelogHtmlCache;
      return;
    }

    if (!this._changelogLoadPromise) {
      this.changelogContent.innerHTML =
        '<p class="changelog-empty">Loading changelog...</p>';

      this._changelogLoadPromise = this.fetchTextResource(
        this.getChangelogResourceUrl(),
        { cache: "no-store", label: "Changelog" },
      )
        .then((markdown) => {
          const rendered = this.renderChangelogMarkdown(markdown);
          this._changelogHtmlCache = rendered;
          return rendered;
        })
        .catch((error) => {
          console.warn("Unable to load changelog:", error);
          return '<p class="changelog-empty">Unable to load data/changelog.txt right now.</p>';
        })
        .finally(() => {
          this._changelogLoadPromise = null;
        });
    }

    const rendered = await this._changelogLoadPromise;
    if (this.changelogContent) {
      this.changelogContent.innerHTML = rendered;
    }
  }

  async openChangelogModal() {
    if (!this.changelogModal) {
      return;
    }

    this.changelogModal.classList.add("active");
    this.changelogModal.setAttribute("aria-hidden", "false");
    this.changelogCloseBtn?.focus?.();

    await this.ensureChangelogContentLoaded();
  }

  closeChangelogModal() {
    if (!this.changelogModal) {
      return;
    }

    this.changelogModal.classList.remove("active");
    this.changelogModal.setAttribute("aria-hidden", "true");
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

    this.resetSettingsSearch();

    this.updateSettingsRangeProgress();

    this.updateSettingsTabsMinWidth();
  }

  /**
   * Close modal
   */
  closeModal() {
    this.flushPendingAutoSaveBeforeClose();
    this.closeDetachedEditorModal();
    this.closeChangelogModal();
    this.resetBackgroundThumbObserver();
    this.clearBackgroundThumbBlobUrlCache();

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

    const activeTab = Array.from(this.tabs || []).find(
      (tab) => tab.dataset.tab === tabName,
    );

    // Update tabs
    this.tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === tabName);
    });

    // Keep the active tab visible in the (horizontally scrollable) tab strip.
    activeTab?.scrollIntoView?.({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
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

    const activePanel = document.getElementById(`${tabName}Panel`);
    this.updateSettingsRangeProgress(activePanel);
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

  setDebugDateControlsEnabled(enabled) {
    const next = enabled === true;

    if (this.debugDateControls) {
      this.debugDateControls.classList.toggle("is-disabled", !next);
    }

    [
      this.debugSimDatePicker,
      this.debugSimDateYear,
      this.debugSimDateMonth,
      this.debugSimDateDay,
    ]
      .filter(Boolean)
      .forEach((el) => {
        el.disabled = !next;
      });
  }

  normalizeDebugDateYMD(rawValue) {
    const raw = String(rawValue || "").trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return "";

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);

    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day) ||
      year < 1 ||
      year > 9999 ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return "";
    }

    const probe = new Date(year, month - 1, day);
    if (
      probe.getFullYear() !== year ||
      probe.getMonth() !== month - 1 ||
      probe.getDate() !== day
    ) {
      return "";
    }

    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  getDebugDateFromParts() {
    const yearRaw = String(this.debugSimDateYear?.value || "").trim();
    const monthRaw = String(this.debugSimDateMonth?.value || "").trim();
    const dayRaw = String(this.debugSimDateDay?.value || "").trim();

    if (!yearRaw && !monthRaw && !dayRaw) {
      return "";
    }

    if (!yearRaw || !monthRaw || !dayRaw) {
      return "";
    }

    const year = parseInt(yearRaw, 10);
    const month = parseInt(monthRaw, 10);
    const day = parseInt(dayRaw, 10);

    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day)
    ) {
      return "";
    }

    const combined = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return this.normalizeDebugDateYMD(combined);
  }

  syncDebugDatePartsFromPicker() {
    const normalized = this.normalizeDebugDateYMD(
      this.debugSimDatePicker?.value,
    );

    if (!normalized) {
      if (this.debugSimDateYear) this.debugSimDateYear.value = "";
      if (this.debugSimDateMonth) this.debugSimDateMonth.value = "";
      if (this.debugSimDateDay) this.debugSimDateDay.value = "";
      return;
    }

    const [year, month, day] = normalized.split("-");
    if (this.debugSimDateYear) this.debugSimDateYear.value = year;
    if (this.debugSimDateMonth) this.debugSimDateMonth.value = month;
    if (this.debugSimDateDay) this.debugSimDateDay.value = day;
  }

  syncDebugDatePickerFromParts() {
    const normalized = this.getDebugDateFromParts();

    if (normalized) {
      if (this.debugSimDatePicker) this.debugSimDatePicker.value = normalized;
      return;
    }

    const hasAnyPart =
      String(this.debugSimDateYear?.value || "").trim() ||
      String(this.debugSimDateMonth?.value || "").trim() ||
      String(this.debugSimDateDay?.value || "").trim();

    if (!hasAnyPart && this.debugSimDatePicker) {
      this.debugSimDatePicker.value = "";
    }
  }

  loadDebugSettings(settings) {
    const debug =
      settings && typeof settings.debug === "object" ? settings.debug : {};

    const enabled = debug.simulatedDateEnabled === true;
    const normalized = this.normalizeDebugDateYMD(debug.simulatedDate);

    if (this.debugSimDateEnabled) {
      this.debugSimDateEnabled.checked = enabled;
    }

    if (this.debugSimDatePicker) {
      this.debugSimDatePicker.value = normalized || "";
    }

    if (normalized) {
      const [year, month, day] = normalized.split("-");
      if (this.debugSimDateYear) this.debugSimDateYear.value = year;
      if (this.debugSimDateMonth) this.debugSimDateMonth.value = month;
      if (this.debugSimDateDay) this.debugSimDateDay.value = day;
    } else {
      if (this.debugSimDateYear) this.debugSimDateYear.value = "";
      if (this.debugSimDateMonth) this.debugSimDateMonth.value = "";
      if (this.debugSimDateDay) this.debugSimDateDay.value = "";
    }

    this.setDebugDateControlsEnabled(enabled);
  }

  saveDebugSettings(settings, options = {}) {
    const { showValidationErrors = true } = options;

    settings.debug =
      settings.debug && typeof settings.debug === "object"
        ? settings.debug
        : {};

    const enabled = this.debugSimDateEnabled?.checked === true;
    const fromPicker = this.normalizeDebugDateYMD(
      this.debugSimDatePicker?.value,
    );
    const fromParts = this.getDebugDateFromParts();
    const selectedDate = fromPicker || fromParts;

    if (enabled && !selectedDate) {
      if (showValidationErrors) {
        this.showToast(
          "Please select a valid simulated date (YYYY-MM-DD).",
          "error",
        );
        if (this.debugEnabled) {
          try {
            this.switchTab("debug");
          } catch (e) {}
        }
      }
      return false;
    }

    settings.debug.simulatedDateEnabled = enabled;
    settings.debug.simulatedDate =
      selectedDate || settings.debug.simulatedDate || null;

    return true;
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
    const iconEmoji = type === "success" ? "✓" : type === "error" ? "✗" : "ℹ";
    iconSpan.innerHTML = this._getIcon(iconEmoji, { size: 16 });

    const msgSpan = document.createElement("span");
    msgSpan.textContent = String(message ?? "");

    toast.appendChild(iconSpan);
    toast.appendChild(msgSpan);

    container.appendChild(toast);

    let hideTimer = null;

    const removeToast = () => {
      try {
        toast.remove();
      } catch (e) {
        // ignore
      }
    };

    const hideToast = () => {
      if (toast.classList.contains("toast-hiding")) return;

      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }

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
        { once: true },
      );
    };

    const scheduleHide = (delayMs) => {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
      hideTimer = setTimeout(hideToast, delayMs);
    };

    // If the user hovers over a toast (often near the FAB region), hide it quickly.
    toast.addEventListener(
      "mouseenter",
      () => {
        scheduleHide(120);
      },
      { once: true },
    );

    scheduleHide(2500);
  }

  normalizePocketQuranArabicFontFamily(value) {
    const normalized = String(value || "").trim();
    if (
      SettingsManager.POCKET_QURAN_ARABIC_FONT_FAMILIES.includes(normalized)
    ) {
      return normalized;
    }
    return "KFGQPC Uthman Taha Naskh";
  }

  normalizePocketQuranTranslationFontFamily(value) {
    const normalized = String(value || "").trim();
    if (
      SettingsManager.POCKET_QURAN_POPUP_TRANSLATION_FONT_FAMILIES.includes(
        normalized,
      )
    ) {
      return normalized;
    }
    return "Poppins";
  }

  normalizePocketQuranPopupTranslationFontFamily(value) {
    const normalized = String(value || "").trim();
    if (
      SettingsManager.POCKET_QURAN_POPUP_TRANSLATION_FONT_FAMILIES.includes(
        normalized,
      )
    ) {
      return normalized;
    }
    return "Poppins";
  }

  normalizeNotesCardFontFamily(value) {
    const normalized = String(value || "").trim();
    if (SettingsManager.NOTES_CARD_FONT_FAMILIES.includes(normalized)) {
      return normalized;
    }
    return "Poppins";
  }

  applyNotesCardFontFamily(fontFamily) {
    const normalized = this.normalizeNotesCardFontFamily(fontFamily);
    const notesCard = document.getElementById("notesCard");

    if (!notesCard) return normalized;

    let cssValue = `"${normalized}", var(--font-primary)`;
    if (normalized === "Georgia") {
      cssValue = '"Georgia", serif';
    } else if (normalized === "Courier New") {
      cssValue = '"Courier New", monospace';
    } else if (normalized === "Cascadia Code") {
      cssValue = '"Cascadia Code", "JetBrains Mono", Consolas, monospace';
    }

    notesCard.style.setProperty("--notes-card-font-family", cssValue);

    if (this.notesCardFontFamily) {
      this.notesCardFontFamily.value = normalized;
    }

    return normalized;
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
          existing.map((n) => String(n && n.id ? n.id : "")),
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
          (a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0),
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
          "success",
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
      this.saveBtn.addEventListener("click", (event) => {
        event.preventDefault();
        this.clearScheduledAutoSave();
        this.saveSettings({
          source: "manual",
          showToast: true,
          closeModal: true,
          showValidationErrors: true,
        });
      });
    }

    this._bindOverlayCloseBehavior(this.modal, () => this.closeModal());

    if (
      this.settingsVersionTrigger &&
      this.settingsVersionTrigger.dataset.bound !== "1"
    ) {
      this.settingsVersionTrigger.dataset.bound = "1";
      this.settingsVersionTrigger.addEventListener("click", (event) => {
        event.preventDefault();
        this.openChangelogModal();
      });
    }

    if (
      this.changelogCloseBtn &&
      this.changelogCloseBtn.dataset.bound !== "1"
    ) {
      this.changelogCloseBtn.dataset.bound = "1";
      this.changelogCloseBtn.addEventListener("click", () => {
        this.closeChangelogModal();
      });
    }

    if (
      this.changelogModal &&
      this.changelogModal.dataset.overlayCloseBound !== "1"
    ) {
      this.changelogModal.dataset.overlayCloseBound = "1";
      this._bindOverlayCloseBehavior(this.changelogModal, () =>
        this.closeChangelogModal(),
      );
    }

    // Tabs
    this.tabs.forEach((tab) => {
      tab.addEventListener("click", () => this.switchTab(tab.dataset.tab));
    });

    this.setupSettingsSearchEventListeners();
    this.setupSettingsAutoSaveListeners();
    this.bindDetachedEditorButtons();
    this.bindContentFontPickerButtons();

    // Keep all settings range sliders visually synced with their current value.
    if (this.modal && this.modal.dataset.rangeProgressBound !== "1") {
      this.modal.dataset.rangeProgressBound = "1";
      this.modal.addEventListener("input", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || target.type !== "range") {
          return;
        }
        this.updateRangeProgress(target);
      });
    }

    // Recompute min-width when icon theme changes (emoji vs Lucide sizes differ)
    if (!document.documentElement.dataset.settingsTabsMinWidthBound) {
      document.documentElement.dataset.settingsTabsMinWidthBound = "1";
      document.addEventListener("md:icon-theme-change", () => {
        this.updateSettingsTabsMinWidth();
      });

      window.addEventListener("resize", () => {
        this.updateSettingsTabsMinWidth();
      });

      window.addEventListener("orientationchange", () => {
        this.updateSettingsTabsMinWidth();
      });
    }

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
        this.testBrowserNotification(),
      );
    }

    if (this.debugSimDateEnabled) {
      this.debugSimDateEnabled.addEventListener("change", () => {
        this.setDebugDateControlsEnabled(this.debugSimDateEnabled.checked);
      });
    }

    if (this.debugSimDatePicker) {
      this.debugSimDatePicker.addEventListener("change", () => {
        this.syncDebugDatePartsFromPicker();
      });
      this.debugSimDatePicker.addEventListener("input", () => {
        this.syncDebugDatePartsFromPicker();
      });
    }

    [this.debugSimDateYear, this.debugSimDateMonth, this.debugSimDateDay]
      .filter(Boolean)
      .forEach((el) => {
        el.addEventListener("input", () => this.syncDebugDatePickerFromParts());
      });

    // Notes import/export
    if (this.notesCardFontFamily) {
      this.notesCardFontFamily.addEventListener("change", () => {
        this.applyNotesCardFontFamily(this.notesCardFontFamily.value);
      });
    }

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
        this.handleNotesImport(e),
      );
    }

    // Location method toggle
    this.locationMethodRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        this.toggleManualLocation(radio.value === "manual");
        this.updateDetectedLocationText();
      });
    });

    // Request location permission
    if (this.requestLocationBtn) {
      this.requestLocationBtn.addEventListener("click", () =>
        this.requestLocation({ refreshWeather: true, showToast: true }),
      );
    }

    // Refresh detected location
    if (this.refreshLocationBtn) {
      this.refreshLocationBtn.addEventListener("click", () =>
        this.refreshDetectedLocation(),
      );
    }

    // Search city
    if (this.searchCityBtn) {
      this.searchCityBtn.addEventListener("click", () => this.searchCity());
    }

    // Paste coords (location)
    if (this.pasteCoordsBtn) {
      this.pasteCoordsBtn.addEventListener("click", () =>
        this.pasteLocationCoordinatesFromClipboard(),
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
        this.searchWeatherCity(),
      );
    }

    // Paste coords (weather)
    if (this.weatherPasteCoordsBtn) {
      this.weatherPasteCoordsBtn.addEventListener("click", () =>
        this.pasteWeatherCoordinatesFromClipboard(),
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

    // Background interval change - toggle custom interval field
    if (this.bgInterval) {
      this.bgInterval.addEventListener("change", (e) => {
        this.toggleCustomInterval(e.target.value === "custom");
      });
    }

    if (this.bgCategory) {
      this.bgCategory.addEventListener("change", () => {
        this.updateBackgroundPoolAddButtonVisibility();
        this.renderBackgroundImagePool();
        this._backgroundSettingsDirty = true;
      });
    }

    if (this.solidColorPicker) {
      this.solidColorPicker.addEventListener("input", () => {
        const normalized = this.normalizeSolidColorHex(
          this.solidColorPicker.value,
        );
        if (normalized && this.solidColorHexInput) {
          this.solidColorHexInput.value = normalized;
        }
      });
    }

    if (this.solidColorHexInput) {
      this.solidColorHexInput.addEventListener("input", () => {
        const normalized = this.normalizeSolidColorHex(
          this.solidColorHexInput.value,
        );
        if (normalized && this.solidColorPicker) {
          this.solidColorPicker.value = normalized;
        }
      });

      this.solidColorHexInput.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        void this.addSolidColorTemplate(this.solidColorHexInput.value);
      });
    }

    if (this.addSolidColorBtn) {
      this.addSolidColorBtn.addEventListener("click", () => {
        const value =
          this.solidColorHexInput?.value || this.solidColorPicker?.value;
        void this.addSolidColorTemplate(value);
      });
    }

    if (this.bgDisplayMode) {
      this.bgDisplayMode.addEventListener("change", () => {
        const mode = this.normalizeBackgroundDisplayMode(
          this.bgDisplayMode.value,
        );
        if (this.backgrounds?.updateDisplayMode) {
          this.backgrounds.updateDisplayMode(mode);
        }
        this._backgroundSettingsDirty = true;
      });
    }

    if (this.bgShuffle) {
      this.bgShuffle.addEventListener("change", () => {
        const enabled = this.bgShuffle.checked !== false;
        if (this.backgrounds?.updateShuffleMode) {
          this.backgrounds.updateShuffleMode(enabled);
        }
        this._backgroundSettingsDirty = true;
      });
    }

    if (this.bgDim) {
      this.bgDim.addEventListener("input", () => {
        this.updateBackgroundDimLabel();
        const dim = this.normalizeBackgroundDim(this.bgDim.value, 100);
        if (this.backgrounds?.updateDim) {
          this.backgrounds.updateDim(dim);
        }
        this._backgroundSettingsDirty = true;
      });
    }

    if (this.bgBlur) {
      this.bgBlur.addEventListener("input", () => {
        this.updateBackgroundBlurLabel();
        const blur = this.normalizeBackgroundBlur(this.bgBlur.value, 0);
        if (this.backgrounds?.updateBlur) {
          this.backgrounds.updateBlur(blur);
        }
        this._backgroundSettingsDirty = true;
      });
    }

    // Compact weather toggle
    if (this.compactWeatherEnabled) {
      this.compactWeatherEnabled.addEventListener("change", (e) => {
        this.toggleCompactWeatherOptions(e.target.checked);
        this.applyHeaderQuickControlsInstantly();
      });
    }

    // Container width change - toggle custom width slider and apply preview
    if (this.containerWidth) {
      this.containerWidth.addEventListener("change", (e) => {
        this.toggleCustomWidth(e.target.value === "custom");
        // Apply preview immediately
        this.applyContainerWidth(
          e.target.value,
          parseInt(this.containerWidthCustom?.value, 10) || 70,
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
          parseInt(this.containerWidthCustom.value, 10),
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
    if (this.pocketQuranPopupArabicSize) {
      this.pocketQuranPopupArabicSize.addEventListener("input", () => {
        this.updatePocketQuranPopupArabicSizeLabel();
      });
    }
    if (this.pocketQuranPopupTranslationSize) {
      this.pocketQuranPopupTranslationSize.addEventListener("input", () => {
        this.updatePocketQuranPopupTranslationSizeLabel();
      });
    }

    if (this.pocketQuranTranslationFontFamily) {
      this.pocketQuranTranslationFontFamily.addEventListener("change", () => {
        try {
          if (window.dashboard?.pocketQuran?.applyTranslationFontFamily) {
            window.dashboard.pocketQuran.applyTranslationFontFamily(
              this.pocketQuranTranslationFontFamily.value,
              { persist: false, recalculate: true },
            );
          }
        } catch (e) {
          // ignore
        }
      });
    }

    if (this.pocketQuranTranslationFontPickerBtn) {
      this.pocketQuranTranslationFontPickerBtn.addEventListener("click", () => {
        try {
          if (window.dashboard?.pocketQuran?.openTranslationFontPickerModal) {
            window.dashboard.pocketQuran.openTranslationFontPickerModal();
          }
        } catch (e) {
          // ignore
        }
      });
    }

    if (this.pocketQuranPopupTranslationFontPickerBtn) {
      this.pocketQuranPopupTranslationFontPickerBtn.addEventListener(
        "click",
        () => {
          try {
            if (window.dashboard?.pocketQuran?.openTranslationFontPickerModal) {
              window.dashboard.pocketQuran.openTranslationFontPickerModal({
                target: "popup",
                currentFont: this.normalizePocketQuranPopupTranslationFontFamily(
                  this.pocketQuranPopupTranslationFontFamily?.value,
                ),
              });
            }
          } catch (e) {
            // ignore
          }
        },
      );
    }

    if (this.pocketQuranReciterPickerBtn) {
      this.pocketQuranReciterPickerBtn.addEventListener("click", () => {
        try {
          if (window.dashboard?.pocketQuran?.openReciterModal) {
            window.dashboard.pocketQuran.openReciterModal();
          }
        } catch (e) {
          // ignore
        }
      });
    }

    if (this.pocketQuranArabicFontPickerBtn) {
      this.pocketQuranArabicFontPickerBtn.addEventListener("click", () => {
        try {
          if (window.dashboard?.pocketQuran?.openFontPickerModal) {
            window.dashboard.pocketQuran.openFontPickerModal();
          }
        } catch (e) {
          // ignore
        }
      });
    }

    if (this.pocketQuranPopupArabicFontPickerBtn) {
      this.pocketQuranPopupArabicFontPickerBtn.addEventListener("click", () => {
        try {
          if (window.dashboard?.pocketQuran?.openFontPickerModal) {
            window.dashboard.pocketQuran.openFontPickerModal({
              target: "popup",
              currentFont: this.normalizePocketQuranArabicFontFamily(
                this.pocketQuranPopupArabicFontFamily?.value,
              ),
            });
          }
        } catch (e) {
          // ignore
        }
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
          `option[value="${id}"]`,
        );
        if (has) {
          this.pocketQuranTranslationSelect.value = String(id);
        }
      }

      this.updatePocketQuranTranslationPickerLabel();
    });

    // Keep Settings UI in sync when reciter/font choices change from the card modals.
    document.addEventListener("md:pq-reciter-selected", () => {
      this.updatePocketQuranReciterPickerLabel();
    });

    document.addEventListener("md:pq-arabic-font-selected", () => {
      this.updatePocketQuranArabicFontPickerLabel();
    });

    document.addEventListener("md:pq-popup-arabic-font-selected", (e) => {
      const normalized = this.normalizePocketQuranArabicFontFamily(
        e?.detail?.fontFamily,
      );

      if (this.pocketQuranPopupArabicFontFamily) {
        this.pocketQuranPopupArabicFontFamily.value = normalized;
      }

      this.updatePocketQuranPopupArabicFontPickerLabel();
      this.scheduleAutoSave(120);
    });

    document.addEventListener("md:pq-translation-font-selected", (e) => {
      const normalized = this.normalizePocketQuranTranslationFontFamily(
        e?.detail?.fontFamily,
      );
      if (this.pocketQuranTranslationFontFamily) {
        this.pocketQuranTranslationFontFamily.value = normalized;
      }
      this.updatePocketQuranTranslationFontPickerLabel();
      this.scheduleAutoSave(120);
    });

    document.addEventListener("md:pq-popup-translation-font-selected", (e) => {
      const normalized = this.normalizePocketQuranPopupTranslationFontFamily(
        e?.detail?.fontFamily,
      );
      if (this.pocketQuranPopupTranslationFontFamily) {
        this.pocketQuranPopupTranslationFontFamily.value = normalized;
      }
      this.updatePocketQuranPopupTranslationFontPickerLabel();
      this.scheduleAutoSave(120);
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
    if (this.selectAllBgPoolBtn) {
      this.selectAllBgPoolBtn.addEventListener("click", () => {
        this.selectAllBackgroundPoolImages();
      });
    }

    if (this.deselectAllBgPoolBtn) {
      this.deselectAllBgPoolBtn.addEventListener("click", () => {
        this.deselectAllBackgroundPoolImages();
      });
    }

    if (this.addCustomBgBtn) {
      this.addCustomBgBtn.addEventListener("click", () => {
        this.customBgInput?.click();
      });
    }

    if (this.addCustomBgUrlBtn) {
      this.addCustomBgUrlBtn.addEventListener("click", () => {
        void this.promptAndAddCustomBackgroundFromUrl();
      });
    }

    if (this.customBgInput) {
      this.customBgInput.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (file) {
          await this.addCustomBackground(file);
          e.target.value = ""; // Reset input
        }
      });
    }

    // Reset grid layout button
    const resetGridLayoutBtn = document.getElementById("resetGridLayoutBtn");
    if (resetGridLayoutBtn) {
      resetGridLayoutBtn.addEventListener("click", () => {
        const dashboard = window.dashboard;
        if (dashboard && (dashboard.gridLayout || dashboard.floating)) {
          const stopRefresh = this._startRefreshButton(resetGridLayoutBtn, {
            label: "Resetting…",
          });
          const startedAt = Date.now();

          try {
            if (typeof dashboard.floating?.resetToDefault === "function") {
              dashboard.floating.resetToDefault();
            }

            if (typeof dashboard.gridLayout?.resetToDefault === "function") {
              dashboard.gridLayout.resetToDefault();
            }

            const settings = this.storage.getSettings();
            const defaults = this.storage.getDefaultSettings();
            const defaultComponentVisibility =
              defaults && typeof defaults.componentVisibility === "object"
                ? { ...defaults.componentVisibility }
                : {};

            settings.componentVisibility = defaultComponentVisibility;
            this.storage.saveSettings(settings);
            this.loadVisibilitySettings(settings);

            if (typeof dashboard.applyComponentVisibility === "function") {
              dashboard.applyComponentVisibility();
            } else {
              applyLiveDashboardVisibility();
            }

            this.showToast(
              "Layout and component visibility reset to default!",
              "success",
            );
          } finally {
            const minDuration = 900;
            const elapsed = Date.now() - startedAt;
            const delay = Math.max(0, minDuration - elapsed);
            setTimeout(() => stopRefresh(), delay);
          }
        }
      });
    }

    const resetComponentSizesBtn = document.getElementById(
      "resetComponentSizesBtn",
    );
    if (resetComponentSizesBtn) {
      resetComponentSizesBtn.addEventListener("click", () => {
        if (window.dashboard && window.dashboard.gridLayout) {
          const stopRefresh = this._startRefreshButton(resetComponentSizesBtn, {
            label: "Resetting…",
          });
          const startedAt = Date.now();

          try {
            if (
              typeof window.dashboard.gridLayout
                .resetAllCustomComponentWidths === "function"
            ) {
              window.dashboard.gridLayout.resetAllCustomComponentWidths();
            }
            this.showToast("Component sizes reset to default!", "success");
          } finally {
            const minDuration = 900;
            const elapsed = Date.now() - startedAt;
            const delay = Math.max(0, minDuration - elapsed);
            setTimeout(() => stopRefresh(), delay);
          }
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
        resolveResetNukeConfirm(false),
      );
    }
    if (this.resetNukeConfirmBtn) {
      this.resetNukeConfirmBtn.addEventListener("click", () =>
        resolveResetNukeConfirm(true),
      );
    }
    if (this.resetNukeConfirmModal) {
      this._bindOverlayCloseBehavior(this.resetNukeConfirmModal, () =>
        resolveResetNukeConfirm(false),
      );
    }
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Enter" &&
        this.resetNukeConfirmModal?.classList.contains("active")
      ) {
        e.preventDefault();
        resolveResetNukeConfirm(true);
        return;
      }

      if (e.key !== "Escape") return;
      if (this.resetNukeConfirmModal?.classList.contains("active")) {
        resolveResetNukeConfirm(false);
      }
    });

    const openResetNukeConfirmModal = (opts = {}) => {
      const title = String(opts.title || "Confirm");
      const text = String(opts.text || "");
      const iconEmoji = String(opts.icon || "⚠️");
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
        this.resetNukeConfirmIcon.innerHTML = this._getIcon(iconEmoji, {
          size: 32,
        });
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
        current.customBackgrounds,
      )
        ? current.customBackgrounds
            .map((x) => this.normalizeBackgroundImageUrl(x))
            .filter((x) => this.isValidCustomBackgroundReference(x))
            .slice(0, SettingsManager.CUSTOM_BACKGROUND_LIMIT)
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

      try {
        await this.clearCustomBackgroundMediaIndexedDb();
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

    const applyLiveDashboardVisibility = () => {
      const setPreviewVisibility = (el, shouldShow) => {
        if (!el) return;
        if (shouldShow) {
          if (el.style.getPropertyValue("display")) {
            el.style.removeProperty("display");
          }
        } else {
          el.style.setProperty("display", "none", "important");
        }
        el.setAttribute("aria-hidden", shouldShow ? "false" : "true");
      };

      const componentState = {
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

      const showClock =
        (this.showClock?.checked ?? true) && componentState.header === true;

      setPreviewVisibility(
        document.querySelector(".header"),
        componentState.header,
      );
      setPreviewVisibility(
        document.getElementById("pinnedAppsSection"),
        componentState.quickPins,
      );
      setPreviewVisibility(
        document.getElementById("searchBarSection"),
        componentState.searchBar,
      );
      setPreviewVisibility(
        document.getElementById("quoteSection"),
        componentState.quotes,
      );
      setPreviewVisibility(
        document.getElementById("prayerTimesCard"),
        componentState.prayerTimes,
      );
      setPreviewVisibility(
        document.getElementById("calendarCard"),
        componentState.hijriCalendar,
      );
      setPreviewVisibility(
        document.getElementById("qiblaCard"),
        componentState.qiblaDirection,
      );
      setPreviewVisibility(
        document.getElementById("weatherCard"),
        componentState.weather,
      );
      setPreviewVisibility(
        document.getElementById("lunarPhaseCard"),
        componentState.lunarPhase,
      );
      setPreviewVisibility(
        document.getElementById("fastingCard"),
        componentState.fasting,
      );
      setPreviewVisibility(
        document.getElementById("flashcardCard"),
        componentState.flashcards,
      );
      setPreviewVisibility(
        document.getElementById("adhkarCard"),
        componentState.adhkar,
      );
      setPreviewVisibility(
        document.getElementById("hadithCard"),
        componentState.hadith,
      );
      setPreviewVisibility(
        document.getElementById("todoCard"),
        componentState.todoList,
      );
      setPreviewVisibility(
        document.getElementById("notesCard"),
        componentState.notes,
      );
      setPreviewVisibility(
        document.getElementById("pocketQuranCard"),
        componentState.pocketQuran,
      );

      const timeSection = document.querySelector(".time-section");
      if (timeSection) {
        timeSection.style.display = showClock ? "" : "none";
        timeSection.setAttribute("aria-hidden", showClock ? "false" : "true");
      }

      const setSlotPreview = (slotId, shouldShow) => {
        const slot = document.getElementById(slotId);
        if (!slot) return;
        slot.style.display = shouldShow ? "" : "none";
        slot.setAttribute("aria-hidden", shouldShow ? "false" : "true");
      };

      setSlotPreview("momentPrayerSlot", componentState.prayerTimes);
      setSlotPreview("momentFastingSlot", componentState.fasting);
      setSlotPreview("momentQuoteSlot", componentState.quotes);
      setSlotPreview("momentPinnedAppsSlot", componentState.quickPins);
      setSlotPreview("momentSearchSlot", componentState.searchBar);
      setSlotPreview("momentClockSlot", showClock);

      try {
        document.dispatchEvent(new CustomEvent("md:visibility-changed"));
      } catch (e) {}

      try {
        if (window.dashboard?.floating?.updateAllButtons) {
          window.dashboard.floating.updateAllButtons();
        }
      } catch (e) {}
    };

    const bindMirroredVisibilityCheckboxes = (
      primary,
      mirror,
      onAfterSync = null,
    ) => {
      if (!primary || !mirror) return;

      primary.addEventListener("change", () => {
        mirror.checked = primary.checked;
        if (typeof onAfterSync === "function") onAfterSync();
      });

      mirror.addEventListener("change", () => {
        primary.checked = mirror.checked;
        if (typeof onAfterSync === "function") onAfterSync();
      });
    };

    bindMirroredVisibilityCheckboxes(
      this.visibilityPrayerTimes,
      this.momentVisibilityPrayerTimes,
      applyLiveDashboardVisibility,
    );
    bindMirroredVisibilityCheckboxes(
      this.visibilityFasting,
      this.momentVisibilityFasting,
      applyLiveDashboardVisibility,
    );
    bindMirroredVisibilityCheckboxes(
      this.visibilityQuotes,
      this.momentVisibilityQuotes,
      applyLiveDashboardVisibility,
    );
    bindMirroredVisibilityCheckboxes(
      this.visibilityQuickPins,
      this.momentVisibilityQuickPins,
      applyLiveDashboardVisibility,
    );
    bindMirroredVisibilityCheckboxes(
      this.visibilitySearchBar,
      this.momentVisibilitySearchBar,
      applyLiveDashboardVisibility,
    );
    bindMirroredVisibilityCheckboxes(
      this.showClock,
      this.momentVisibilityClock,
      () => {
        this.toggleClockOptions(this.showClock?.checked === true);
        applyLiveDashboardVisibility();
      },
    );

    [
      this.visibilityHeader,
      this.visibilityQuickPins,
      this.visibilitySearchBar,
      this.visibilityQuotes,
      this.visibilityPrayerTimes,
      this.visibilityHijriCalendar,
      this.visibilityQiblaDirection,
      this.visibilityWeather,
      this.visibilityLunarPhase,
      this.visibilityFasting,
      this.visibilityFlashcards,
      this.visibilityAdhkar,
      this.visibilityHadith,
      this.visibilityTodoList,
      this.visibilityNotes,
      this.visibilityPocketQuran,
    ].forEach((el) => {
      if (!el) return;
      el.addEventListener("change", applyLiveDashboardVisibility);
    });

    // Refresh background now
    if (this.changeBackgroundBtn) {
      this.changeBackgroundBtn.addEventListener("click", async () => {
        const stopRefresh = this._startRefreshButton(this.changeBackgroundBtn, {
          label: "Refreshing…",
        });
        const startedAt = Date.now();

        try {
          const settings = this.storage.getSettings();
          if (this.bgCategory) {
            settings.bgCategory = this.normalizeBackgroundCategory(
              this.bgCategory.value,
            );
          }
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
          this.storage.saveSettings(settings);

          if (this.backgrounds) {
            if (typeof this.backgrounds.updateDisplayMode === "function") {
              this.backgrounds.updateDisplayMode(settings.bgDisplayMode);
            }
            if (typeof this.backgrounds.updateDim === "function") {
              this.backgrounds.updateDim(settings.bgDim);
            }
            if (typeof this.backgrounds.updateBlur === "function") {
              this.backgrounds.updateBlur(settings.bgBlur);
            }
            if (typeof this.backgrounds.updateShuffleMode === "function") {
              this.backgrounds.updateShuffleMode(settings.bgShuffle);
            }
            if (typeof this.backgrounds.updateCategory === "function") {
              this.backgrounds.updateCategory(settings.bgCategory || "all");
            } else if (
              typeof this.backgrounds.changeBackground === "function"
            ) {
              this.backgrounds.changeBackground();
            }
          }

          this.showToast("Background refreshed!", "success");
        } finally {
          const minDuration = 650;
          const elapsed = Date.now() - startedAt;
          const delay = Math.max(0, minDuration - elapsed);
          setTimeout(() => stopRefresh(), delay);
        }
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
        this.applyHeaderQuickControlsInstantly();
      });
    }

    this.setupHeaderGlowPopoverControls();

    [
      this.headerGreetingGlowEnabled,
      this.headerDateGlowEnabled,
      this.headerTimeGlowEnabled,
      this.headerNextPrayerGlowEnabled,
      this.headerCompactWeatherGlowEnabled,
    ].forEach((toggle) => {
      if (!toggle) return;
      toggle.addEventListener("change", () => {
        this.updateHeaderGlowColorLockState();
        this.applyHeaderQuickControlsInstantly();
      });
    });

    [
      this.showGreeting,
      this.showDate,
      this.showNextPrayer,
      this.headerGreetingBgEnabled,
      this.headerDateBgEnabled,
      this.headerTimeBgEnabled,
      this.headerNextPrayerBgEnabled,
      this.headerCompactWeatherBgEnabled,
      this.headerGreetingGlowColor,
      this.headerDateGlowColor,
      this.headerTimeGlowColor,
      this.headerNextPrayerGlowColor,
      this.headerCompactWeatherGlowColor,
    ].forEach((control) => {
      if (!control) return;
      control.addEventListener("change", () => {
        this.applyHeaderQuickControlsInstantly();
      });
    });

    // Heading settings - clock format toggle (show/hide AM/PM option)
    this.clockFormatRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        this.toggleAmPmOption(radio.value === "12h");
      });
    });

    this.clockStyleRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        this.syncClockSurfaceToggleState(radio.value);
        this.applyHeaderQuickControlsInstantly();
      });
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        this.changelogModal?.classList.contains("active")
      ) {
        e.preventDefault();
        this.closeChangelogModal();
        return;
      }

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
              "error",
            );
            return;
          }
          this.showToast(
            `Test notification sent${
              notificationId ? ": " + notificationId : ""
            }.`,
            "success",
          );
        });
        return;
      }

      // Firefox-style promise API
      Promise.resolve(browser.notifications.create("md-debug-test", options))
        .then(() => this.showToast("Test notification sent.", "success"))
        .catch((e) =>
          this.showToast(`Notification failed: ${e?.message || e}`, "error"),
        );
    } catch (e) {
      this.showToast(`Notification failed: ${e?.message || e}`, "error");
    }
  }

  updatePocketQuranReciterPickerLabel() {
    const btn = this.pocketQuranReciterPickerBtn;
    const labelEl = this.pocketQuranReciterPickerLabel;
    if (!btn || !labelEl) return;

    const pq = this.storage.getSettings()?.pocketQuran || {};
    const parsedId = parseInt(pq.reciterId, 10);
    const reciterId = Number.isFinite(parsedId) ? parsedId : 7;

    const cachedReciters = this.storage.get("pocketQuran_reciters_cache", []);
    let label = "";

    if (Array.isArray(cachedReciters)) {
      const reciter = cachedReciters.find((r) => r?.id === reciterId);
      if (reciter) {
        const name = String(reciter.name || "").trim();
        const style = String(reciter.style || "").trim();
        label = style ? `${name} (${style})` : name;
      }
    }

    if (!label) {
      const fallbackNames = {
        1: "Abdul Basit Abdul Samad (Murattal)",
        2: "Abdul Basit Abdul Samad (Mujawwad)",
        3: "Abdur-Rahman as-Sudais",
        4: "Abu Bakr al-Shatri",
        5: "Hani ar-Rifai",
        6: "Mahmoud Khalil Al-Husary",
        7: "Mishary Rashid Alafasy",
      };
      label = fallbackNames[reciterId] || `Reciter #${reciterId}`;
    }

    labelEl.textContent = label;
    btn.title = `Current reciter: ${label}`;
  }

  updatePocketQuranArabicFontPickerLabel() {
    const btn = this.pocketQuranArabicFontPickerBtn;
    const labelEl = this.pocketQuranArabicFontPickerLabel;
    if (!btn || !labelEl) return;

    const pq = this.storage.getSettings()?.pocketQuran || {};
    const font = this.normalizePocketQuranArabicFontFamily(pq.arabicFontFamily);

    labelEl.textContent = font;
    btn.title = `Current Arabic font: ${font}`;
  }

  updatePocketQuranPopupArabicFontPickerLabel() {
    const btn = this.pocketQuranPopupArabicFontPickerBtn;
    const labelEl = this.pocketQuranPopupArabicFontPickerLabel;
    if (!btn || !labelEl) return;

    const settings = this.storage.getSettings() || {};
    const pq = settings.pocketQuran || {};
    const pqPopup = settings.pocketQuranPopup || {};

    const font = this.normalizePocketQuranArabicFontFamily(
      this.pocketQuranPopupArabicFontFamily?.value ||
        pqPopup.arabicFontFamily ||
        pq.arabicFontFamily,
    );

    if (this.pocketQuranPopupArabicFontFamily) {
      this.pocketQuranPopupArabicFontFamily.value = font;
    }

    labelEl.textContent = font;
    btn.title = `Current popup Arabic font: ${font}`;
  }

  getContentFontPickerConfigs() {
    return [
      {
        card: "quotes",
        kind: "arabic",
        btnId: "quotesArabicFontPickerBtn",
        labelId: "quotesArabicFontPickerLabel",
        title: "Aa Quotes Arabic Font",
        manager: this.quotes,
      },
      {
        card: "quotes",
        kind: "translation",
        btnId: "quotesTranslationFontPickerBtn",
        labelId: "quotesTranslationFontPickerLabel",
        title: "Aa Quotes Translation Font",
        manager: this.quotes,
      },
      {
        card: "flashcards",
        kind: "arabic",
        btnId: "flashcardsArabicFontPickerBtn",
        labelId: "flashcardsArabicFontPickerLabel",
        title: "Aa Flashcards Arabic Font",
        manager: this.flashcards,
      },
      {
        card: "flashcards",
        kind: "translation",
        btnId: "flashcardsTranslationFontPickerBtn",
        labelId: "flashcardsTranslationFontPickerLabel",
        title: "Aa Flashcards Translation Font",
        manager: this.flashcards,
      },
      {
        card: "hadith",
        kind: "arabic",
        btnId: "hadithArabicFontPickerBtn",
        labelId: "hadithArabicFontPickerLabel",
        title: "Aa Hadith Arabic Font",
        manager: this.hadith,
      },
      {
        card: "hadith",
        kind: "translation",
        btnId: "hadithTranslationFontPickerBtn",
        labelId: "hadithTranslationFontPickerLabel",
        title: "Aa Hadith Translation Font",
        manager: this.hadith,
      },
      {
        card: "adhkar",
        kind: "arabic",
        btnId: "adhkarArabicFontPickerBtn",
        labelId: "adhkarArabicFontPickerLabel",
        title: "Aa Adhkar Arabic Font",
        manager: this.adhkar,
      },
      {
        card: "adhkar",
        kind: "translation",
        btnId: "adhkarTranslationFontPickerBtn",
        labelId: "adhkarTranslationFontPickerLabel",
        title: "Aa Adhkar Translation Font",
        manager: this.adhkar,
      },
    ];
  }

  getContentFontFamilies(kind) {
    if (kind === "translation") {
      return [
        "Poppins",
        "Noto Naskh Arabic",
        "Amiri",
        "Georgia",
        "Cascadia Code",
        "Courier New",
      ];
    }

    return [
      "Noto Naskh Arabic",
      "Amiri",
      "KFGQPC Uthman Taha Naskh",
      "KFGQPC KSA Regular",
      "KFGQPC Kufi Stylistic Regular",
      "KFGQPC AN Regular",
      "KFGQPC AlJalil Dot",
      "KFGQPC Sindhi Naskh Regular",
    ];
  }

  getContentFontPreviewText(kind) {
    return kind === "translation"
      ? "The quick brown fox jumps over the lazy dog"
      : "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
  }

  resolveContentTranslationFontCssValue(fontFamily) {
    if (fontFamily === "Georgia") return '"Georgia", serif';
    if (fontFamily === "Courier New") return '"Courier New", monospace';
    if (fontFamily === "Cascadia Code") {
      return '"Cascadia Code", "JetBrains Mono", Consolas, monospace';
    }
    return `"${fontFamily}", var(--font-primary)`;
  }

  getContentFontConfig(card, kind) {
    return this.getContentFontPickerConfigs().find(
      (cfg) => cfg.card === card && cfg.kind === kind,
    );
  }

  getCurrentContentFont(cfg) {
    const manager = cfg?.manager;
    const normalizer =
      cfg?.kind === "translation"
        ? manager?.normalizeTranslationFontFamily
        : manager?.normalizeArabicFontFamily;
    const current =
      cfg?.kind === "translation"
        ? manager?._translationFontFamily
        : manager?._arabicFontFamily;
    const fallback = cfg?.kind === "translation" ? "Poppins" : "Noto Naskh Arabic";
    return typeof normalizer === "function"
      ? normalizer.call(manager, current)
      : fallback;
  }

  bindContentFontPickerButtons() {
    this.getContentFontPickerConfigs().forEach((cfg) => {
      const btn = document.getElementById(cfg.btnId);
      if (!btn || btn.dataset.bound === "true") return;
      btn.dataset.bound = "true";
      btn.addEventListener("click", () => this.openContentFontPickerModal(cfg));
    });
  }

  applyStoredContentFontSettings() {
    const settings = this.storage.getSettings() || {};
    const values = {
      quotes: {
        arabic: settings.quoteArabicFontFamily,
        translation: settings.quoteTranslationFontFamily,
      },
      flashcards: {
        arabic: settings.flashcards?.arabicFontFamily,
        translation: settings.flashcards?.translationFontFamily,
      },
      hadith: {
        arabic: settings.hadith?.arabicFontFamily,
        translation: settings.hadith?.translationFontFamily,
      },
      adhkar: {
        arabic: settings.adhkar?.arabicFontFamily,
        translation: settings.adhkar?.translationFontFamily,
      },
    };

    this.getContentFontPickerConfigs().forEach((cfg) => {
      const method =
        cfg.kind === "translation"
          ? "applyTranslationFontFamily"
          : "applyArabicFontFamily";
      const font = values[cfg.card]?.[cfg.kind];
      if (cfg.manager && typeof cfg.manager[method] === "function") {
        cfg.manager[method](font, { persist: false });
      }
    });
  }

  updateContentFontPickerLabels() {
    this.getContentFontPickerConfigs().forEach((cfg) => {
      const btn = document.getElementById(cfg.btnId);
      const label = document.getElementById(cfg.labelId);
      if (!btn || !label) return;
      const font = this.getCurrentContentFont(cfg);
      label.textContent = font;
      btn.title = `Current ${cfg.title.replace(/^Aa /, "").toLowerCase()}: ${font}`;
    });
  }

  ensureContentFontPickerModal() {
    let modal = document.getElementById("settingsContentFontModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "settingsContentFontModal";
    modal.className = "pq-bookmark-modal";
    modal.innerHTML = `
      <div class="pq-bookmark-modal-content pq-translation-modal-content">
        <div class="pq-bookmark-modal-header">
          <h3 class="pq-bookmark-modal-title">Aa Font</h3>
          <button type="button" class="pq-bookmark-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="pq-bookmark-modal-body">
          <div class="pq-bookmark-search">
            <input type="text" class="pq-bookmark-search-input settings-content-font-search" placeholder="Search fonts..." />
          </div>
          <div class="pq-translation-list">
            <div class="pq-translation-items settings-content-font-items"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal
      .querySelector(".pq-bookmark-modal-close")
      ?.addEventListener("click", () => this.closeContentFontPickerModal());
    this._bindOverlayCloseBehavior(modal, () =>
      this.closeContentFontPickerModal(),
    );
    modal
      .querySelector(".settings-content-font-search")
      ?.addEventListener("input", (event) => {
        this.renderContentFontList(event.target?.value || "");
      });
    return modal;
  }

  openContentFontPickerModal(cfg) {
    const modal = this.ensureContentFontPickerModal();
    modal.dataset.card = cfg.card;
    modal.dataset.kind = cfg.kind;
    const title = modal.querySelector(".pq-bookmark-modal-title");
    if (title) title.textContent = cfg.title;
    const search = modal.querySelector(".settings-content-font-search");
    if (search) search.value = "";
    this.renderContentFontList("");
    modal.classList.add("active");
    setTimeout(() => {
      try {
        search?.focus();
      } catch (e) {}
    }, 100);
  }

  closeContentFontPickerModal() {
    document
      .getElementById("settingsContentFontModal")
      ?.classList.remove("active");
  }

  renderContentFontList(query = "") {
    const modal = document.getElementById("settingsContentFontModal");
    const container = modal?.querySelector(".settings-content-font-items");
    if (!modal || !container) return;

    const cfg = this.getContentFontConfig(modal.dataset.card, modal.dataset.kind);
    if (!cfg) return;

    const q = String(query || "").trim().toLowerCase();
    const fonts = this.getContentFontFamilies(cfg.kind).filter((font) =>
      font.toLowerCase().includes(q),
    );
    const current = this.getCurrentContentFont(cfg);
    const previewText = this.getContentFontPreviewText(cfg.kind);
    const isTranslation = cfg.kind === "translation";

    if (!fonts.length) {
      container.innerHTML = `<div class="pq-translation-empty">No fonts found for "${this.escapeHtmlAttr(
        query,
      )}"</div>`;
      return;
    }

    container.innerHTML = fonts
      .map((font) => {
        const active = font === current;
        const previewClass = isTranslation
          ? "pq-font-preview pq-font-preview-translation"
          : "pq-font-preview";
        const langAttrs = isTranslation ? 'lang="en"' : 'lang="ar" dir="rtl"';
        return `<button type="button" class="pq-translation-item ${
          active ? "active" : ""
        }" data-font-family="${this.escapeHtmlAttr(font)}">
          <span class="pq-font-label">
            <span class="pq-translation-name">${this.escapeHtmlAttr(font)}</span>
            <span class="${previewClass}" ${langAttrs}>${previewText}</span>
          </span>
          ${
            active
              ? `<span class="pq-translation-check">${this._getIcon("✓", {
                  size: 14,
                })}</span>`
              : ""
          }
        </button>`;
      })
      .join("");

    container.querySelectorAll(".pq-font-preview").forEach((preview) => {
      const font = preview
        .closest(".pq-translation-item")
        ?.getAttribute("data-font-family");
      if (!font) return;
      preview.style.fontFamily = isTranslation
        ? this.resolveContentTranslationFontCssValue(font)
        : `"${font}", var(--font-arabic)`;
    });

    container.querySelectorAll(".pq-translation-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const font = btn.getAttribute("data-font-family");
        const method =
          cfg.kind === "translation"
            ? "applyTranslationFontFamily"
            : "applyArabicFontFamily";
        if (cfg.manager && typeof cfg.manager[method] === "function") {
          cfg.manager[method](font, { persist: true });
        }
        this.updateContentFontPickerLabels();
        this.closeContentFontPickerModal();
      });
    });
  }

  updatePocketQuranTranslationFontPickerLabel() {
    const btn = this.pocketQuranTranslationFontPickerBtn;
    const labelEl = this.pocketQuranTranslationFontPickerLabel;
    if (!btn || !labelEl) return;

    const pq = this.storage.getSettings()?.pocketQuran || {};
    const font = this.normalizePocketQuranTranslationFontFamily(
      this.pocketQuranTranslationFontFamily?.value ||
        pq.translationFontFamily ||
        "Poppins",
    );

    if (this.pocketQuranTranslationFontFamily) {
      this.pocketQuranTranslationFontFamily.value = font;
    }

    labelEl.textContent = font;
    btn.title = `Current translation font: ${font}`;
  }

  updatePocketQuranPopupTranslationFontPickerLabel() {
    const btn = this.pocketQuranPopupTranslationFontPickerBtn;
    const labelEl = this.pocketQuranPopupTranslationFontPickerLabel;
    if (!btn || !labelEl) return;

    const settings = this.storage.getSettings() || {};
    const pq = settings.pocketQuran || {};
    const pqPopup = settings.pocketQuranPopup || {};
    const font = this.normalizePocketQuranPopupTranslationFontFamily(
      this.pocketQuranPopupTranslationFontFamily?.value ||
        pqPopup.translationFontFamily ||
        pq.translationFontFamily ||
        "Poppins",
    );

    if (this.pocketQuranPopupTranslationFontFamily) {
      this.pocketQuranPopupTranslationFontFamily.value = font;
    }

    labelEl.textContent = font;
    btn.title = `Current popup translation font: ${font}`;
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

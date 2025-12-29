/**
 * Settings Manager
 * Handles settings modal and configuration for all features
 * Supports 25+ calculation methods, visibility settings, quotes import/export, weather, and heading customization
 */

class SettingsManager {
  constructor(storage, prayerTimes, qibla, quotes, backgrounds, weather) {
    this.storage = storage;
    this.prayerTimes = prayerTimes;
    this.qibla = qibla;
    this.quotes = quotes;
    this.backgrounds = backgrounds;
    this.weather = weather;

    // Modal elements
    this.modal = document.getElementById("settingsModal");
    this.settingsBtn = document.getElementById("settingsBtn");
    this.closeBtn = document.getElementById("settingsClose");
    this.saveBtn = document.getElementById("saveSettingsBtn");

    // Tabs
    this.tabs = document.querySelectorAll(".settings-tab");
    this.panels = document.querySelectorAll(".settings-panel");

    // Location elements
    this.locationMethodRadios = document.querySelectorAll(
      'input[name="locationMethod"]'
    );
    this.manualLocationFields = document.getElementById("manualLocationFields");
    this.cityInput = document.getElementById("cityInput");
    this.latitudeInput = document.getElementById("latitudeInput");
    this.longitudeInput = document.getElementById("longitudeInput");
    this.searchCityBtn = document.getElementById("searchCityBtn");
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
    this.importSettingsBtn = document.getElementById("importSettingsBtn");
    this.importSettingsInput = document.getElementById("importSettingsInput");

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
    this.visibilityTodoList = document.getElementById("visibilityTodoList");
    this.weatherUnitRadios = document.querySelectorAll(
      'input[name="weatherUnit"]'
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

    // Pinned Apps tab elements
    this.pinnedAppsPerRow = document.getElementById("pinnedAppsPerRow");
    this.pinnedAppsPerRowValue = document.getElementById(
      "pinnedAppsPerRowValue"
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

    // Apply UI settings immediately (not only after Save)
    const settings = this.storage.getSettings();
    this.applyUiBlurPower(settings.uiBlurPower ?? 100);
  }

  /**
   * Load settings into form
   */
  loadSettings() {
    const settings = this.storage.getSettings();

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

    // Quote settings
    if (this.useDefaultQuotes)
      this.useDefaultQuotes.checked = settings.useDefaultQuotes;
    if (this.useUserQuotes) this.useUserQuotes.checked = settings.useUserQuotes;

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

    // Load heading settings
    this.loadHeadingSettings(settings);

    // Load component visibility settings
    this.loadVisibilitySettings(settings);

    // Load weather settings
    this.loadWeatherSettings(settings);
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
        timeRanges.morning?.text || "Assalamu Alaikum, Good Morning";
    if (this.greetingAfternoon)
      this.greetingAfternoon.value =
        timeRanges.afternoon?.text || "Assalamu Alaikum, Good Afternoon";
    if (this.greetingEvening)
      this.greetingEvening.value =
        timeRanges.evening?.text || "Assalamu Alaikum, Good Evening";
    if (this.greetingNight)
      this.greetingNight.value =
        timeRanges.night?.text || "Assalamu Alaikum, Good Night";

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
    if (this.visibilityTodoList)
      this.visibilityTodoList.checked = visibility.todoList !== false;
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

    if (this.weatherSearchCityBtn) {
      this.weatherSearchCityBtn.textContent = "🔍 Searching...";
      this.weatherSearchCityBtn.disabled = true;
    }

    try {
      const results = await this.prayerTimes.searchCity(cityName);

      if (results && results.length > 0) {
        const result = results[0];
        if (this.weatherCityInput) this.weatherCityInput.value = result.city;
        if (this.weatherLatitudeInput)
          this.weatherLatitudeInput.value = result.latitude.toFixed(4);
        if (this.weatherLongitudeInput)
          this.weatherLongitudeInput.value = result.longitude.toFixed(4);
        this.showToast(`Found: ${result.city}`, "success");
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

    const exportData = {
      version: 1,
      exportDate: new Date().toISOString(),
      settings: settings,
      todos: todos,
      userQuotes: userQuotes,
      pinnedApps: pinnedApps,
      lastLocation: lastLocation,
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
   * Import all settings
   */
  importAllSettings(jsonString) {
    try {
      const data = JSON.parse(jsonString);

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

    // Quote settings
    settings.useDefaultQuotes = this.useDefaultQuotes?.checked ?? true;
    settings.useUserQuotes = this.useUserQuotes?.checked ?? true;

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

    // Container width settings
    settings.containerWidth = this.containerWidth?.value || "narrow";
    if (settings.containerWidth === "custom") {
      settings.containerWidthCustom = this.clampNumber(
        parseInt(this.containerWidthCustom?.value, 10),
        20,
        98,
        70
      );
    }

    // UI blur power
    settings.uiBlurPower = this.clampNumber(
      parseInt(this.uiBlurPower?.value, 10),
      0,
      200,
      100
    );

    // Pinned Apps per-row
    settings.pinnedAppsPerRow = this.clampNumber(
      parseInt(this.pinnedAppsPerRow?.value, 10),
      3,
      20,
      10
    );

    // Save heading settings
    this.saveHeadingSettings(settings);

    // Save component visibility settings
    this.saveVisibilitySettings(settings);

    // Save weather settings
    this.saveWeatherSettings(settings);

    // Save to storage
    this.storage.saveSettings(settings);

    // Apply changes
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
        text: this.greetingMorning?.value || "Assalamu Alaikum, Good Morning",
      },
      afternoon: {
        start: 12,
        end: 15,
        text:
          this.greetingAfternoon?.value || "Assalamu Alaikum, Good Afternoon",
      },
      evening: {
        start: 15,
        end: 18,
        text: this.greetingEvening?.value || "Assalamu Alaikum, Good Evening",
      },
      night: {
        start: 18,
        end: 3,
        text: this.greetingNight?.value || "Assalamu Alaikum, Good Night",
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
      quotes: this.visibilityQuotes?.checked ?? true,
      prayerTimes: this.visibilityPrayerTimes?.checked ?? true,
      hijriCalendar: this.visibilityHijriCalendar?.checked ?? true,
      qiblaDirection: this.visibilityQiblaDirection?.checked ?? true,
      weather: this.visibilityWeather?.checked ?? true,
      todoList: this.visibilityTodoList?.checked ?? true,
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

    // Reload page to apply all settings properly
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }

  /**
   * Apply container width setting
   */
  applyContainerWidth(width, customValue) {
    const mainContainer = document.querySelector(".main-container");

    if (!mainContainer) return;

    // Remove existing width classes
    mainContainer.classList.remove(
      "container-narrow",
      "container-medium",
      "container-wide",
      "container-full",
      "container-custom"
    );
    mainContainer.style.removeProperty("--custom-container-width");

    // Apply new width
    switch (width) {
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

    if (this.searchCityBtn) {
      this.searchCityBtn.textContent = "🔍 Searching...";
      this.searchCityBtn.disabled = true;
    }

    try {
      const results = await this.prayerTimes.searchCity(cityName);

      if (results && results.length > 0) {
        const result = results[0];
        if (this.cityInput) this.cityInput.value = result.city;
        if (this.latitudeInput)
          this.latitudeInput.value = result.latitude.toFixed(4);
        if (this.longitudeInput)
          this.longitudeInput.value = result.longitude.toFixed(4);
        this.showToast(`Found: ${result.city}`, "success");
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
  }

  /**
   * Switch tab
   */
  switchTab(tabName) {
    // Update tabs
    this.tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === tabName);
    });

    // Update panels
    this.panels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === `${tabName}Panel`);
    });
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
    toast.innerHTML = `
      <span>${type === "success" ? "✓" : type === "error" ? "✗" : "ℹ"}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    // Remove after delay
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
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

    // Container width change - toggle custom width slider
    if (this.containerWidth) {
      this.containerWidth.addEventListener("change", (e) => {
        this.toggleCustomWidth(e.target.value === "custom");
      });
    }

    // Container width slider change - update label
    if (this.containerWidthCustom) {
      this.containerWidthCustom.addEventListener("input", () => {
        this.updateCustomWidthLabel();
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

    // Export settings
    if (this.exportSettingsBtn) {
      this.exportSettingsBtn.addEventListener("click", () => {
        this.exportAllSettings();
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
}

// Export for use
window.SettingsManager = SettingsManager;

/**
 * Storage Manager
 * Handles localStorage operations for the Muslim Dashboard
 * Enhanced with settings for visibility, pinned apps, calendar, quotes pagination
 */

class StorageManager {
  constructor() {
    this.prefix = "muslimDashboard_";
  }

  /**
   * Get item from storage
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (e) {
      console.error("Storage get error:", e);
      return defaultValue;
    }
  }

  /**
   * Set item in storage
   */
  set(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error("Storage set error:", e);
      return false;
    }
  }

  /**
   * Remove item from storage
   */
  remove(key) {
    try {
      localStorage.removeItem(this.prefix + key);
      return true;
    } catch (e) {
      console.error("Storage remove error:", e);
      return false;
    }
  }

  /**
   * Notes
   */
  getNotes() {
    const notes = this.get("notes", []);
    return Array.isArray(notes) ? notes : [];
  }

  saveNotes(notes) {
    return this.set("notes", Array.isArray(notes) ? notes : []);
  }

  /**
   * Clear all dashboard storage
   */
  clear() {
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(this.prefix))
        .forEach((key) => localStorage.removeItem(key));
      return true;
    } catch (e) {
      console.error("Storage clear error:", e);
      return false;
    }
  }

  /**
   * Get default settings
   */
  getDefaultSettings() {
    return {
      // Location settings
      locationMethod: "auto",
      city: "",
      latitude: null,
      longitude: null,

      // Prayer settings
      calculationMethod: "MWL",
      asrMethod: "Standard",
      highLatMethod: "None",
      midnightMethod: "Standard",

      // Custom angles (used when calculationMethod is "Custom")
      customFajrAngle: 18,
      customIshaAngle: 17,
      customIshaMinutes: false, // If true, customIshaAngle is minutes after Maghrib

      // Duha settings
      duhaOffset: 20, // minutes after sunrise

      // Time adjustments (in minutes)
      adjustments: {
        fajr: 0,
        sunrise: 0,
        duha: 0,
        dhuhr: 0,
        asr: 0,
        maghrib: 0,
        isha: 0,
        midnight: 0,
        qiyam: 0,
      },

      // Prayer visibility settings
      prayerVisibility: {
        fajr: true,
        sunrise: true,
        duha: false,
        dhuhr: true,
        asr: true,
        maghrib: true,
        isha: true,
        midnight: false,
        qiyam: false,
      },

      // Prayer notifications
      // When enabled, the service worker schedules notifications at each prayer time,
      // plus optional offsets before/after.
      prayerNotifications: {
        enabled: false,
        beforeMinutes: 10,
        afterMinutes: 0,
        perPrayer: {
          fajr: true,
          sunrise: true,
          duha: false,
          dhuhr: true,
          asr: true,
          maghrib: true,
          isha: true,
          midnight: false,
          qiyam: false,
        },
      },

      // Quote settings
      useDefaultQuotes: true,
      useUserQuotes: true,
      quotesPerPage: 10,
      quoteLayoutStyle: "classic", // 'classic', 'minimal', 'elegant', 'card', 'banner'

      // Background settings
      bgInterval: 60, // minutes
      bgIntervalCustom: null, // custom interval in minutes
      bgCategory: "nature",
      lastBgChange: null,
      currentBgIndex: 0,
      customBackgrounds: [], // up to 10 custom backgrounds (base64)

      // Todo settings
      todoPosition: "bottom", // only 'bottom' now (full width)

      // Container width settings
      containerWidth: "narrow", // 'extra-compact', 'compact', 'slim', 'narrow', 'medium', 'wide', 'full', 'custom'
      containerWidthCustom: 70, // percentage for custom width (50-98)

      // Calendar settings
      calendarType: "hijri",
      hijriAdjustment: 0,

      // UI settings
      timeFormat: "24h",
      uiBlurPower: 100, // percentage (100 = current blur, 0 = no blur)

      // Readability: per-card blur settings from card-blur-btn controls
      pocketQuranBlurState: "dashboard",
      pocketQuranBlurPowerEnabled: false,
      pocketQuranBlurPower: 100,
      todoBlurState: "dashboard",
      todoBlurPowerEnabled: false,
      todoBlurPower: 100,
      flashcardBlurState: "dashboard",
      flashcardBlurPowerEnabled: false,
      flashcardBlurPower: 100,
      adhkarBlurState: "dashboard",
      adhkarBlurPowerEnabled: false,
      adhkarBlurPower: 100,
      hadithBlurState: "dashboard",
      hadithBlurPowerEnabled: false,
      hadithBlurPower: 100,
      notesBlurState: "dashboard",
      notesBlurPowerEnabled: false,
      notesBlurPower: 100,

      // Pinned Apps settings
      pinnedApps: [],
      pinnedAppsPerRow: 10,

      // Weather settings
      weatherUnit: "celsius", // 'celsius' or 'fahrenheit'

      // Weather location settings
      // 'dashboard' uses the main dashboard location settings, 'custom' uses the fields below
      weatherLocationMode: "dashboard",
      weatherCity: "",
      weatherLatitude: null,
      weatherLongitude: null,

      // Compact weather settings (displays mini weather in header)
      compactWeatherEnabled: false,
      compactWeatherMode: "simple", // 'simple' or 'detailed'
      compactWeatherShowLocationName: false,

      // Fasting settings
      fasting: {
        // Visibility toggles for each fasting type
        visibility: {
          monday: true,
          thursday: true,
          ayyamAlBeed: true,
          dhuAlHijjah: true,
          arafah: true,
          ramadan: true,
        },
        // Display window settings (how many days before to show countdown)
        dhuAlHijjahWithinDays: 30,
        arafahWithinDays: 30,
        // Suhur notification settings
        notifications: {
          enabled: false,
          minutesBefore: 60, // minutes before Fajr
          // Per-fast notification toggles
          notify: {
            monday: true,
            thursday: true,
            ayyamAlBeed: true,
            dhuAlHijjah: true,
            arafah: true,
            ramadan: true,
          },
        },
      },

      // Component visibility settings
      componentVisibility: {
        header: true,
        quickPins: true,
        searchBar: true,
        quotes: true,
        prayerTimes: true,
        hijriCalendar: true,
        qiblaDirection: true,
        todoList: true,
        weather: true,
        lunarPhase: true,
        flashcards: true,
        adhkar: true,
        hadith: true,
        notes: true,
        pocketQuran: true,
      },

      // Floating mode (detached + draggable + resizable) for select components
      // Stored in pixels relative to viewport (left/top/width/height)
      floating: {
        prayerTimes: {
          enabled: false,
          left: 40,
          top: 120,
          width: 420,
          height: 520,
          z: 10,
        },
        hijriCalendar: {
          enabled: false,
          left: 480,
          top: 120,
          width: 420,
          height: 520,
          z: 10,
        },
        qiblaDirection: {
          enabled: false,
          left: 920,
          top: 120,
          width: 420,
          height: 520,
          z: 10,
        },
        flashcards: {
          enabled: false,
          left: 80,
          top: 680,
          width: 560,
          height: 360,
          z: 10,
        },
        todoList: {
          enabled: false,
          left: 680,
          top: 680,
          width: 560,
          height: 360,
          z: 10,
        },
      },

      // Flashcards settings
      flashcards: {
        activeSetId: null,
        mode: "study", // 'study' or 'test'
        studyAutoAdvanceSeconds: 10,
        autoAdvancePaused: false, // pause/resume auto-advance in study mode
        fontScale: 1,
        arabicFontFamily: "KFGQPC Uthman Taha Naskh",
        questionFontSize: 60,
        answerFontSize: 32,
      },

      // Adhkar settings
      adhkar: {
        activeSetId: null,
        autoAdvanceSeconds: 15,
        autoAdvancePaused: false,
        showRomanization: false,
        fontScale: 1,
        arabicFontFamily: "KFGQPC Uthman Taha Naskh",
        arabicFontSize: 28,
        romanizationFontSize: 18,
        englishFontSize: 18,
      },

      // Hadith settings
      hadith: {
        activeSetId: null,
        autoAdvanceSeconds: 20,
        autoAdvancePaused: false,
        fontScale: 1,
        titleFontSize: 22,
        textFontSize: 18,
        metaFontSize: 14,
        languageBySet: {},
      },

      // Pocket Quran settings
      pocketQuran: {
        arabicFontSize: 32,
        arabicFontFamily: "KFGQPC Uthman Taha Naskh",
        translationFontSize: 18,
        translationResourceId: 85, // M.A.S. Abdel Haleem
        lastSurahNumber: 1,
        lastAyahNumber: 1,
        tajweedMode: false,
        tajweedColors: {
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
        },
      },

      // Debug settings (visible only when ENABLE_DEBUG_MODE is true)
      debug: {
        simulatedDateEnabled: false,
        simulatedDate: null,
      },

      // Heading customization settings
      heading: {
        // Greeting settings
        useCustomGreeting: false,
        customGreeting: "",
        greetingTimeRanges: {
          morning: {
            start: 3,
            end: 12,
            text: "As-salamu alaykum, Good Morning",
          },
          afternoon: {
            start: 12,
            end: 15,
            text: "As-salamu alaykum, Good Afternoon",
          },
          evening: {
            start: 15,
            end: 18,
            text: "As-salamu alaykum, Good Evening",
          },
          night: { start: 18, end: 3, text: "As-salamu alaykum, Good Night" },
        },

        // Clock settings
        showClock: true,
        clockFormat: "24h", // '12h' or '24h'
        showSeconds: true,
        showAmPm: true, // Only applies when clockFormat is '12h'
        showNextPrayer: false,
        clockStyle: "default", // 'default', 'minimal', 'elegant'

        // Date settings
        showDate: true,
        dateFormat: "full-weekday", // 'full-weekday', 'full', 'medium-weekday', 'medium', 'short'
        dateCalendar: "hijri", // 'hijri', 'gregorian', 'both'
        showIslamicEvents: true,
      },
    };
  }

  /**
   * Get settings with defaults
   */
  getSettings() {
    const defaults = this.getDefaultSettings();
    const stored = this.get("settings", {});

    // Deep merge for nested objects
    const merged = { ...defaults };
    for (const key in stored) {
      if (
        typeof stored[key] === "object" &&
        stored[key] !== null &&
        !Array.isArray(stored[key])
      ) {
        merged[key] = { ...defaults[key], ...stored[key] };
      } else {
        merged[key] = stored[key];
      }
    }

    // Normalize blur settings for all supported card-blur-btn components,
    // and migrate legacy override keys when present.
    const blurMappings = [
      {
        stateKey: "pocketQuranBlurState",
        blurPowerEnabledKey: "pocketQuranBlurPowerEnabled",
        blurPowerKey: "pocketQuranBlurPower",
        legacyEnabledKey: "pocketQuranBlurOverrideEnabled",
        legacyPowerKey: "pocketQuranBlurOverridePower",
      },
      {
        stateKey: "todoBlurState",
        blurPowerEnabledKey: "todoBlurPowerEnabled",
        blurPowerKey: "todoBlurPower",
        legacyEnabledKey: "todoBlurOverrideEnabled",
        legacyPowerKey: "todoBlurOverridePower",
      },
      {
        stateKey: "flashcardBlurState",
        blurPowerEnabledKey: "flashcardBlurPowerEnabled",
        blurPowerKey: "flashcardBlurPower",
        legacyEnabledKey: "flashcardBlurOverrideEnabled",
        legacyPowerKey: "flashcardBlurOverridePower",
      },
      {
        stateKey: "adhkarBlurState",
        blurPowerEnabledKey: "adhkarBlurPowerEnabled",
        blurPowerKey: "adhkarBlurPower",
        legacyEnabledKey: "adhkarBlurOverrideEnabled",
        legacyPowerKey: "adhkarBlurOverridePower",
      },
      {
        stateKey: "hadithBlurState",
        blurPowerEnabledKey: "hadithBlurPowerEnabled",
        blurPowerKey: "hadithBlurPower",
      },
      {
        stateKey: "notesBlurState",
        blurPowerEnabledKey: "notesBlurPowerEnabled",
        blurPowerKey: "notesBlurPower",
        legacyEnabledKey: "notesBlurOverrideEnabled",
        legacyPowerKey: "notesBlurOverridePower",
      },
    ];

    blurMappings.forEach((mapping) => {
      const hasStoredState = Object.prototype.hasOwnProperty.call(
        stored,
        mapping.stateKey,
      );
      const hasStoredEnabled = Object.prototype.hasOwnProperty.call(
        stored,
        mapping.blurPowerEnabledKey,
      );
      const hasStoredPower = Object.prototype.hasOwnProperty.call(
        stored,
        mapping.blurPowerKey,
      );

      const rawState = hasStoredState ? stored[mapping.stateKey] : undefined;
      const rawEnabled = hasStoredEnabled
        ? stored[mapping.blurPowerEnabledKey]
        : undefined;
      const rawPower = hasStoredPower
        ? stored[mapping.blurPowerKey]
        : undefined;
      const legacyEnabled = mapping.legacyEnabledKey
        ? stored[mapping.legacyEnabledKey]
        : undefined;
      const legacyPower = mapping.legacyPowerKey
        ? stored[mapping.legacyPowerKey]
        : undefined;

      const state = ["off", "dashboard", "on"].includes(rawState)
        ? rawState
        : typeof legacyEnabled === "boolean"
          ? legacyEnabled
            ? "on"
            : "dashboard"
          : merged[mapping.stateKey];

      let blurPowerEnabled =
        typeof rawEnabled === "boolean"
          ? rawEnabled
          : typeof legacyEnabled === "boolean"
            ? legacyEnabled
            : merged[mapping.blurPowerEnabledKey];

      const parsedPower = Number(rawPower);
      const parsedLegacyPower = Number(legacyPower);
      let blurPower = Number.isFinite(parsedPower)
        ? parsedPower
        : Number.isFinite(parsedLegacyPower)
          ? parsedLegacyPower
          : merged[mapping.blurPowerKey];
      blurPower = Math.min(200, Math.max(0, Math.round(blurPower)));

      if (state === "off") {
        blurPowerEnabled = false;
      }

      merged[mapping.stateKey] = state;
      merged[mapping.blurPowerEnabledKey] = blurPowerEnabled;
      merged[mapping.blurPowerKey] = blurPower;
    });

    return merged;
  }

  /**
   * Save settings
   */
  saveSettings(settings) {
    const ok = this.set("settings", settings);

    // Mirror settings to chrome.storage for MV3 background service worker.
    try {
      if (typeof chrome !== "undefined" && chrome.storage?.local?.set) {
        chrome.storage.local.set({ md_settings: settings });
      }
    } catch (e) {
      // ignore
    }

    return ok;
  }

  /**
   * Get todos
   */
  getTodos() {
    return this.get("todos", []);
  }

  /**
   * Save todos
   */
  saveTodos(todos) {
    return this.set("todos", todos);
  }

  /**
   * Get user quotes
   */
  getUserQuotes() {
    return this.get("userQuotes", []);
  }

  /**
   * Save user quotes
   */
  saveUserQuotes(quotes) {
    return this.set("userQuotes", quotes);
  }

  /**
   * Get last location
   */
  getLastLocation() {
    return this.get("lastLocation", null);
  }

  /**
   * Save last location
   */
  saveLastLocation(location) {
    const ok = this.set("lastLocation", location);

    // Mirror location to chrome.storage for MV3 background service worker.
    try {
      if (typeof chrome !== "undefined" && chrome.storage?.local?.set) {
        chrome.storage.local.set({ md_lastLocation: location });
      }
    } catch (e) {
      // ignore
    }

    return ok;
  }

  /**
   * Get pinned apps
   */
  getPinnedApps() {
    return this.get("pinnedApps", []);
  }

  /**
   * Save pinned apps
   */
  savePinnedApps(apps) {
    return this.set("pinnedApps", apps);
  }

  /**
   * Custom searches (Search Bar)
   */
  getCustomSearches() {
    const searches = this.get("customSearches", []);
    return Array.isArray(searches) ? searches : [];
  }

  saveCustomSearches(searches) {
    return this.set("customSearches", Array.isArray(searches) ? searches : []);
  }

  getLastCustomSearchId() {
    return this.get("customSearchLastId", null);
  }

  saveLastCustomSearchId(id) {
    return this.set("customSearchLastId", id);
  }

  /**
   * Add a pinned app
   */
  addPinnedApp(app) {
    const apps = this.getPinnedApps();
    apps.push({
      id: Date.now(),
      name: app.name,
      url: app.url,
      favicon: app.favicon || null,
      order: apps.length,
    });
    return this.savePinnedApps(apps);
  }

  /**
   * Remove a pinned app
   */
  removePinnedApp(appId) {
    let apps = this.getPinnedApps();
    apps = apps.filter((app) => app.id !== appId);
    // Reorder
    apps.forEach((app, index) => {
      app.order = index;
    });
    return this.savePinnedApps(apps);
  }

  /**
   * Reorder pinned apps
   */
  reorderPinnedApps(orderedIds) {
    const apps = this.getPinnedApps();
    const reordered = orderedIds
      .map((id, index) => {
        const app = apps.find((a) => a.id === id);
        if (app) {
          app.order = index;
          return app;
        }
        return null;
      })
      .filter(Boolean);
    return this.savePinnedApps(reordered);
  }

  /**
   * Export user quotes as JSON
   */
  exportUserQuotes() {
    const quotes = this.getUserQuotes();
    return JSON.stringify(quotes, null, 2);
  }

  /**
   * Import user quotes from JSON
   */
  importUserQuotes(jsonString) {
    try {
      const quotes = JSON.parse(jsonString);
      if (Array.isArray(quotes)) {
        // Validate structure
        const validQuotes = quotes
          .filter((q) => typeof q.text === "string" && q.text.trim() !== "")
          .map((q) => ({
            id: q.id || Date.now() + Math.random(),
            text: q.text,
            source: q.source || "",
            isArabic: q.isArabic || false,
          }));

        // Merge with existing quotes
        const existing = this.getUserQuotes();
        const merged = [...existing, ...validQuotes];
        this.saveUserQuotes(merged);
        return { success: true, count: validQuotes.length };
      }
      return { success: false, error: "Invalid format: expected an array" };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

// Export for use
window.StorageManager = StorageManager;

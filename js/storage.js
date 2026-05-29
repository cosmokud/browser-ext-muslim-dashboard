/**
 * Storage Manager
 * Handles localStorage operations for the Muslim Dashboard
 * Enhanced with settings for visibility, pinned apps, calendar, quotes pagination
 */

class StorageManager {
  constructor() {
    this.prefix = "muslimDashboard_";
  }

  generateCoordinateExample() {
    const samples = [
      { latitude: 40.7128, longitude: -74.006 },
      { latitude: 51.5074, longitude: -0.1278 },
      { latitude: 3.139, longitude: 101.6869 },
      { latitude: -6.2088, longitude: 106.8456 },
      { latitude: 41.0082, longitude: 28.9784 },
    ];
    const sample = samples[Math.floor(Math.random() * samples.length)] || samples[0];
    return {
      latitude: Number(sample.latitude.toFixed(4)),
      longitude: Number(sample.longitude.toFixed(4)),
      text: `${sample.latitude.toFixed(4)}, ${sample.longitude.toFixed(4)}`,
    };
  }

  getCoordinateExample() {
    const existing = this.get("coordinateExample", null);
    if (
      existing &&
      Number.isFinite(Number(existing.latitude)) &&
      Number.isFinite(Number(existing.longitude)) &&
      typeof existing.text === "string"
    ) {
      return existing;
    }

    const generated = this.generateCoordinateExample();
    this.set("coordinateExample", generated);
    return generated;
  }

  isQuotaExceededError(error) {
    if (!error) return false;
    return (
      error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22 ||
      error.code === 1014
    );
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
    let serialized = "";
    try {
      serialized = JSON.stringify(value);

      // Keep single-key writes bounded to reduce quota blowups from accidental large payloads.
      if (serialized.length > 1024 * 1024) {
        console.warn(
          `[Storage] Refusing to persist key "${key}" because payload exceeds 1MB (${serialized.length} bytes).`,
        );
        return false;
      }

      localStorage.setItem(this.prefix + key, serialized);
      return true;
    } catch (e) {
      if (this.isQuotaExceededError(e)) {
        console.error(
          `[Storage] Quota exceeded while saving key "${key}" (${serialized.length} bytes).`,
          e,
        );
        try {
          document.dispatchEvent(
            new CustomEvent("md:storage-full", {
              detail: {
                key,
                bytes: serialized.length,
                message: e?.message || String(e),
              },
            }),
          );
        } catch (dispatchError) {
          console.error("Storage full event dispatch failed:", dispatchError);
        }
      } else {
        console.error("Storage set error:", e);
      }
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
      quoteAutoRotatePaused: false,
      quoteShuffleEnabled: true,

      // Background settings
      bgInterval: 60, // minutes
      bgIntervalCustom: null, // custom interval in minutes
      bgCategory: "all",
      bgDisplayMode: "fill", // fill, fit, stretch, tile, center, span
      bgDim: 100, // background overlay intensity percentage
      bgBlur: 0, // background image blur radius in px
      bgShuffle: true, // true = random order, false = ordered cycling
      lastBgChange: null,
      currentBgIndex: 0,
      customBackgrounds: [], // up to 30 custom background references
      backgroundImageSelections: {}, // per-category selected image URLs
      notesCardFontFamily: "Poppins",

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
      uiBlurPower: 100, // percentage (100 = current blur baseline)
      performanceModeEnabled: false,
      iconTheme: "monochrome",

      // Theme settings
      theme: {
        name: "emerald",
        mode: "dark",
        glassEnabled: true,
        glassOpacity: 50,
        componentOpacity: 0,
        backgroundAwareFontColorEnabled: false,
        highestVisualFidelityEnabled: false,
        customAccent: null,
        customPalettes: {},
      },

      // Readability: per-card blur settings from card-blur-btn controls
      pocketQuranBlurState: "dashboard",
      pocketQuranBlurPowerEnabled: false,
      pocketQuranBlurPower: 100,
      pocketQuranGlassOpacity: null,
      todoBlurState: "dashboard",
      todoBlurPowerEnabled: false,
      todoBlurPower: 100,
      todoGlassOpacity: null,
      flashcardBlurState: "dashboard",
      flashcardBlurPowerEnabled: false,
      flashcardBlurPower: 100,
      flashcardGlassOpacity: null,
      adhkarBlurState: "dashboard",
      adhkarBlurPowerEnabled: false,
      adhkarBlurPower: 100,
      adhkarGlassOpacity: null,
      hadithBlurState: "dashboard",
      hadithBlurPowerEnabled: false,
      hadithBlurPower: 100,
      hadithGlassOpacity: null,
      notesBlurState: "dashboard",
      notesBlurPowerEnabled: false,
      notesBlurPower: 100,
      notesGlassOpacity: null,

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
          ashuraDays: true,
          dhuAlHijjah: true,
          arafah: true,
          ramadan: true,
        },
        showRecommendations: true,
        // Display window settings (how many days before to show countdown)
        dhuAlHijjahWithinDays: 30,
        arafahWithinDays: 30,
        ashuraWithinDays: 30,
        // Suhur notification settings
        notifications: {
          enabled: false,
          minutesBefore: 60, // minutes before Fajr
          // Per-fast notification toggles
          notify: {
            monday: true,
            thursday: true,
            ayyamAlBeed: true,
            ashuraDays: true,
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
        arabicFontFamily: "Noto Naskh Arabic",
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
        arabicFontSize: 40,
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
        arabicFontSize: 40,
        arabicFontFamily: "KFGQPC Uthman Taha Naskh",
        showArabicText: true,
        translationFontSize: 18,
        translationFontFamily: "Poppins",
        showTranslationText: true,
        translationResourceId: 85, // M.A.S. Abdel Haleem
        reciterAutoplay: true,
        reciterAutoplayNextSurah: true,
        reciterHighlighter: true,
        reciterHighlighterDelayMs: 0,
        recitationFloatingEnabled: false,
        recitationAutoDockOnVisible: false,
        recitationFloatingAppearance: "opaque",
        copyIncludeArabic: false,
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

      pocketQuranPopup: {
        arabicFontSize: 40,
        arabicFontFamily: "KFGQPC Uthman Taha Naskh",
        showArabicText: true,
        translationFontSize: 18,
        translationFontFamily: "Poppins",
        showTranslationText: true,
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
        showGreeting: true,
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
        clockStyle: "default", // 'default', 'minimal', 'elegant', 'classic', 'mono', 'boxed', 'pill', 'neon', 'underline', 'shadow', 'hour-focus', 'minute-focus', 'dual-tone', 'split-capsule', 'retro-flip'

        // Date settings
        showDate: true,
        dateFormat: "full-weekday", // 'full-weekday', 'full', 'medium-weekday', 'medium', 'short'
        dateCalendar: "hijri", // 'hijri', 'gregorian', 'both'
        showIslamicEvents: true,

        // Header surface backgrounds
        greetingBackgroundEnabled: false,
        dateBackgroundEnabled: false,
        timeBackgroundEnabled: false,
        nextPrayerBackgroundEnabled: false,
        compactWeatherBackgroundEnabled: false,

        // Header text colors (empty means theme default)
        greetingTextColor: "",
        dateTextColor: "",
        timeTextColor: "",
        nextPrayerTextColor: "",
        compactWeatherTextColor: "",

        // Header glow settings
        greetingGlowEnabled: false,
        greetingGlowColor: "",
        greetingGlowOpacity: 72,
        greetingGlowRadius: 14,
        dateGlowEnabled: false,
        dateGlowColor: "",
        dateGlowOpacity: 72,
        dateGlowRadius: 14,
        timeGlowEnabled: false,
        timeGlowColor: "",
        timeGlowOpacity: 72,
        timeGlowRadius: 14,
        nextPrayerGlowEnabled: false,
        nextPrayerGlowColor: "",
        nextPrayerGlowOpacity: 72,
        nextPrayerGlowRadius: 14,
        compactWeatherGlowEnabled: false,
        compactWeatherGlowColor: "",
        compactWeatherGlowOpacity: 72,
        compactWeatherGlowRadius: 14,
      },
    };
  }

  /**
   * Normalize background image selection map
   */
  normalizeBackgroundImageSelections(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    const normalized = {};
    Object.entries(value).forEach(([category, urls]) => {
      if (!Array.isArray(urls)) return;

      const deduped = [];
      const seen = new Set();
      urls.forEach((entry) => {
        const url = String(entry || "").trim();
        if (!url || seen.has(url)) return;
        seen.add(url);
        deduped.push(url);
      });

      normalized[category] = deduped;
    });

    return normalized;
  }

  /**
   * Get settings with defaults
   */
  getSettings() {
    const defaults = this.getDefaultSettings();
    const storedRaw = this.get("settings", {});
    const stored =
      storedRaw && typeof storedRaw === "object" && !Array.isArray(storedRaw)
        ? { ...storedRaw }
        : {};

    // Hard-reset deprecated dashboard scale setting from persisted storage.
    if (Object.prototype.hasOwnProperty.call(stored, "dashboardScale")) {
      delete stored.dashboardScale;
      this.saveSettings(stored);
    }

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

    merged.backgroundImageSelections = this.normalizeBackgroundImageSelections(
      merged.backgroundImageSelections,
    );

    const allowedBgDisplayModes = new Set([
      "fill",
      "fit",
      "stretch",
      "tile",
      "center",
      "span",
    ]);
    const normalizedBgDisplayMode = String(merged.bgDisplayMode || "").trim();
    merged.bgDisplayMode = allowedBgDisplayModes.has(normalizedBgDisplayMode)
      ? normalizedBgDisplayMode
      : defaults.bgDisplayMode;
    let mergedBgDim = Number(merged.bgDim);
    if (!Number.isFinite(mergedBgDim)) {
      mergedBgDim = defaults.bgDim;
    }
    merged.bgDim = Math.min(100, Math.max(0, Math.round(mergedBgDim)));

    let mergedBgBlur = Number(merged.bgBlur);
    if (!Number.isFinite(mergedBgBlur)) {
      mergedBgBlur = defaults.bgBlur;
    }
    merged.bgBlur = Math.min(40, Math.max(0, Math.round(mergedBgBlur)));

    merged.bgShuffle = merged.bgShuffle !== false;

    merged.quoteAutoRotatePaused = merged.quoteAutoRotatePaused === true;
    merged.quoteShuffleEnabled = merged.quoteShuffleEnabled !== false;

    if (Array.isArray(merged.customBackgrounds)) {
      const dedupedRefs = [];
      const seen = new Set();
      merged.customBackgrounds.forEach((entry) => {
        const normalized = String(entry || "").trim();
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        dedupedRefs.push(normalized);
      });
      merged.customBackgrounds = dedupedRefs.slice(0, 30);
    } else {
      merged.customBackgrounds = [];
    }

    // Normalize blur settings for all supported card-blur-btn components,
    // and migrate legacy override keys when present.
    const blurMappings = [
      {
        stateKey: "pocketQuranBlurState",
        blurPowerEnabledKey: "pocketQuranBlurPowerEnabled",
        blurPowerKey: "pocketQuranBlurPower",
        opacityKey: "pocketQuranGlassOpacity",
        legacyEnabledKey: "pocketQuranBlurOverrideEnabled",
        legacyPowerKey: "pocketQuranBlurOverridePower",
      },
      {
        stateKey: "todoBlurState",
        blurPowerEnabledKey: "todoBlurPowerEnabled",
        blurPowerKey: "todoBlurPower",
        opacityKey: "todoGlassOpacity",
        legacyEnabledKey: "todoBlurOverrideEnabled",
        legacyPowerKey: "todoBlurOverridePower",
      },
      {
        stateKey: "flashcardBlurState",
        blurPowerEnabledKey: "flashcardBlurPowerEnabled",
        blurPowerKey: "flashcardBlurPower",
        opacityKey: "flashcardGlassOpacity",
        legacyEnabledKey: "flashcardBlurOverrideEnabled",
        legacyPowerKey: "flashcardBlurOverridePower",
      },
      {
        stateKey: "adhkarBlurState",
        blurPowerEnabledKey: "adhkarBlurPowerEnabled",
        blurPowerKey: "adhkarBlurPower",
        opacityKey: "adhkarGlassOpacity",
        legacyEnabledKey: "adhkarBlurOverrideEnabled",
        legacyPowerKey: "adhkarBlurOverridePower",
      },
      {
        stateKey: "hadithBlurState",
        blurPowerEnabledKey: "hadithBlurPowerEnabled",
        blurPowerKey: "hadithBlurPower",
        opacityKey: "hadithGlassOpacity",
      },
      {
        stateKey: "notesBlurState",
        blurPowerEnabledKey: "notesBlurPowerEnabled",
        blurPowerKey: "notesBlurPower",
        opacityKey: "notesGlassOpacity",
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
      const hasStoredOpacity = Object.prototype.hasOwnProperty.call(
        stored,
        mapping.opacityKey,
      );

      const rawState = hasStoredState ? stored[mapping.stateKey] : undefined;
      const rawEnabled = hasStoredEnabled
        ? stored[mapping.blurPowerEnabledKey]
        : undefined;
      const rawPower = hasStoredPower
        ? stored[mapping.blurPowerKey]
        : undefined;
      const rawOpacity = hasStoredOpacity
        ? stored[mapping.opacityKey]
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

      const parsedOpacity = Number(rawOpacity);
      let glassOpacity = Number.isFinite(parsedOpacity)
        ? parsedOpacity
        : Number(merged?.theme?.glassOpacity);
      if (!Number.isFinite(glassOpacity)) {
        glassOpacity = 50;
      }
      glassOpacity = Math.min(100, Math.max(0, Math.round(glassOpacity)));

      if (state === "off") {
        blurPowerEnabled = false;
      }

      merged[mapping.stateKey] = state;
      merged[mapping.blurPowerEnabledKey] = blurPowerEnabled;
      merged[mapping.blurPowerKey] = blurPower;
      merged[mapping.opacityKey] = glassOpacity;
    });

    if (
      !merged.theme ||
      typeof merged.theme !== "object" ||
      Array.isArray(merged.theme)
    ) {
      merged.theme = { ...defaults.theme };
    }

    merged.performanceModeEnabled = merged.performanceModeEnabled === true;
    merged.theme.highestVisualFidelityEnabled =
      merged.theme.highestVisualFidelityEnabled === true;

    // Dashboard quality rule: Performance Mode wins if both are true.
    if (
      merged.performanceModeEnabled &&
      merged.theme.highestVisualFidelityEnabled
    ) {
      merged.theme.highestVisualFidelityEnabled = false;
    }

    return merged;
  }

  /**
   * Save settings
   */
  saveSettings(settings) {
    const defaults = this.getDefaultSettings();
    const normalizedSettings =
      settings && typeof settings === "object" && !Array.isArray(settings)
        ? { ...settings }
        : { ...defaults };

    const rawTheme = normalizedSettings.theme;
    normalizedSettings.theme =
      rawTheme && typeof rawTheme === "object" && !Array.isArray(rawTheme)
        ? { ...defaults.theme, ...rawTheme }
        : { ...defaults.theme };

    normalizedSettings.performanceModeEnabled =
      normalizedSettings.performanceModeEnabled === true;
    normalizedSettings.theme.highestVisualFidelityEnabled =
      normalizedSettings.theme.highestVisualFidelityEnabled === true;

    if (
      normalizedSettings.performanceModeEnabled &&
      normalizedSettings.theme.highestVisualFidelityEnabled
    ) {
      normalizedSettings.theme.highestVisualFidelityEnabled = false;
    }

    normalizedSettings.backgroundImageSelections =
      this.normalizeBackgroundImageSelections(
        normalizedSettings.backgroundImageSelections,
      );

    const allowedBgDisplayModes = new Set([
      "fill",
      "fit",
      "stretch",
      "tile",
      "center",
      "span",
    ]);
    const normalizedBgDisplayMode = String(
      normalizedSettings.bgDisplayMode || "",
    ).trim();
    normalizedSettings.bgDisplayMode = allowedBgDisplayModes.has(
      normalizedBgDisplayMode,
    )
      ? normalizedBgDisplayMode
      : defaults.bgDisplayMode;
    let normalizedBgDim = Number(normalizedSettings.bgDim);
    if (!Number.isFinite(normalizedBgDim)) {
      normalizedBgDim = defaults.bgDim;
    }
    normalizedSettings.bgDim = Math.min(
      100,
      Math.max(0, Math.round(normalizedBgDim)),
    );

    let normalizedBgBlur = Number(normalizedSettings.bgBlur);
    if (!Number.isFinite(normalizedBgBlur)) {
      normalizedBgBlur = defaults.bgBlur;
    }
    normalizedSettings.bgBlur = Math.min(
      40,
      Math.max(0, Math.round(normalizedBgBlur)),
    );

    normalizedSettings.bgShuffle = normalizedSettings.bgShuffle !== false;

    normalizedSettings.quoteAutoRotatePaused =
      normalizedSettings.quoteAutoRotatePaused === true;
    normalizedSettings.quoteShuffleEnabled =
      normalizedSettings.quoteShuffleEnabled !== false;

    if (Array.isArray(normalizedSettings.customBackgrounds)) {
      const dedupedRefs = [];
      const seen = new Set();
      normalizedSettings.customBackgrounds.forEach((entry) => {
        const normalized = String(entry || "").trim();
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        dedupedRefs.push(normalized);
      });
      normalizedSettings.customBackgrounds = dedupedRefs.slice(0, 30);
    } else {
      normalizedSettings.customBackgrounds = [];
    }

    const ok = this.set("settings", normalizedSettings);

    // Mirror settings to chrome.storage for MV3 background service worker.
    try {
      if (typeof chrome !== "undefined" && chrome.storage?.local?.set) {
        chrome.storage.local.set({ md_settings: normalizedSettings });
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

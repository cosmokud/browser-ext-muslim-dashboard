/**
 * MuslimDashboard: header glow, colours, greeting and visibility.
 * Part of the class declared in js/app/index.js; load this after it.
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
})(MuslimDashboard.prototype, class {

  normalizeHeadingDateFormat(format, legacyShowWeekday) {
    const normalized = String(format || "").trim();
    const newValues = new Set([
      "full-weekday",
      "full",
      "medium-weekday",
      "medium",
      "short",
    ]);

    if (newValues.has(normalized)) return normalized;

    // Legacy values were: full/long/medium/short + separate showWeekday
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
  }

  normalizeHexColor(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";

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

    return "";
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

  hexToRgb(color) {
    const normalized = this.normalizeHexColor(color);
    if (!normalized) return null;

    return {
      r: parseInt(normalized.slice(1, 3), 16),
      g: parseInt(normalized.slice(3, 5), 16),
      b: parseInt(normalized.slice(5, 7), 16),
    };
  }

  clampHeaderGlowOpacity(value, fallback = 72) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.min(100, Math.round(parsed)));
  }

  clampHeaderGlowRadius(value, fallback = 14) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.min(50, Math.round(parsed)));
  }

  getInverseTextColorHex(sourceEl) {
    const target = sourceEl || document.body;
    if (!target || typeof window.getComputedStyle !== "function") {
      return "#ffffff";
    }

    const rgb = this.parseCssRgbColor(window.getComputedStyle(target).color);
    if (!rgb) return "#ffffff";

    return this.rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
  }

  resolveHeaderGlowColor(preferredColor, sourceEl) {
    const normalized = this.normalizeHexColor(preferredColor);
    if (normalized) return normalized;
    return this.getInverseTextColorHex(sourceEl);
  }

  applyHeaderGlow(el, enabled, glowColor, opacity = 72, radius = 14) {
    if (!el) return;

    if (enabled === true) {
      const safeColor = this.normalizeHexColor(glowColor) || "#ffffff";
      const safeOpacity = this.clampHeaderGlowOpacity(opacity, 72);
      const safeRadius = this.clampHeaderGlowRadius(radius, 14);
      const rgb = this.hexToRgb(safeColor) || { r: 255, g: 255, b: 255 };
      const alpha = Number((safeOpacity / 100).toFixed(3));

      el.classList.add("header-glow-enabled");
      el.style.setProperty(
        "--header-glow-color",
        `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`,
      );
      el.style.setProperty("--header-glow-radius", `${safeRadius}px`);
      return;
    }

    el.classList.remove("header-glow-enabled");
    el.style.removeProperty("--header-glow-color");
    el.style.removeProperty("--header-glow-radius");
  }

  applyHeaderTextColor(targets, preferredColor) {
    const normalized = this.normalizeHexColor(preferredColor);
    const targetList = Array.isArray(targets) ? targets : [targets];

    targetList.filter(Boolean).forEach((target) => {
      if (!normalized) {
        target.style.removeProperty("color");
        return;
      }

      target.style.color = normalized;
    });
  }

  formatGregorianDate(date, format) {
    const options = {};
    const normalized = String(format || "").trim();
    const includeWeekday = normalized.endsWith("-weekday");
    const base = includeWeekday
      ? normalized.replace(/-weekday$/, "")
      : normalized;

    if (includeWeekday) {
      options.weekday = base === "medium" ? "short" : "long";
    }

    switch (base) {
      case "full":
        options.year = "numeric";
        options.month = "long";
        options.day = "numeric";
        break;
      case "medium":
        options.year = "numeric";
        options.month = "short";
        options.day = "numeric";
        break;
      case "short":
        options.year = "numeric";
        options.month = "numeric";
        options.day = "numeric";
        break;
      default:
        options.year = "numeric";
        options.month = "long";
        options.day = "numeric";
    }

    return date.toLocaleDateString("en-US", options);
  }

  updateGreeting() {
    const settings = this.storage.getSettings();
    const headingSettings = settings.heading || {};
    const hour = new Date().getHours();
    let greeting;

    // Check if custom greeting is enabled
    if (headingSettings.useCustomGreeting && headingSettings.customGreeting) {
      greeting = headingSettings.customGreeting;
    } else {
      // Use time-based greetings
      const timeRanges = headingSettings.greetingTimeRanges || {};

      if (hour >= 3 && hour < 12) {
        greeting =
          timeRanges.morning?.text || "As-salamu alaykum, Good Morning";
      } else if (hour >= 12 && hour < 15) {
        greeting =
          timeRanges.afternoon?.text || "As-salamu alaykum, Good Afternoon";
      } else if (hour >= 15 && hour < 18) {
        greeting =
          timeRanges.evening?.text || "As-salamu alaykum, Good Evening";
      } else {
        greeting = timeRanges.night?.text || "As-salamu alaykum, Good Night";
      }
    }

    this.greeting.textContent = greeting;
  }

  applyComponentVisibility() {
    const settings = this.storage.getSettings();
    const visibility = settings.componentVisibility || {};

    let visibilityChanged = false;
    const setVisibility = (el, shouldHide) => {
      if (!el) return;
      const currentDisplay = el.style.getPropertyValue("display");
      const currentDisplayPriority = el.style.getPropertyPriority("display");
      const nextAria = shouldHide ? "true" : "false";

      if (shouldHide) {
        if (
          currentDisplay !== "none" ||
          currentDisplayPriority !== "important"
        ) {
          el.style.setProperty("display", "none", "important");
          visibilityChanged = true;
        }
      } else if (currentDisplay) {
        el.style.removeProperty("display");
        visibilityChanged = true;
      }

      if (el.getAttribute("aria-hidden") !== nextAria) {
        el.setAttribute("aria-hidden", nextAria);
        visibilityChanged = true;
      }
    };

    // Header (greeting, date, clock)
    const header = document.querySelector(".header");
    setVisibility(header, visibility.header === false);

    // Quick Pins
    const pinnedAppsSection = document.getElementById("pinnedAppsSection");
    setVisibility(pinnedAppsSection, visibility.quickPins === false);

    // Search Bar
    const searchBarSection = document.getElementById("searchBarSection");
    setVisibility(searchBarSection, visibility.searchBar === false);

    // Quotes
    const quoteSection = document.getElementById("quoteSection");
    setVisibility(quoteSection, visibility.quotes === false);

    // Prayer Times
    const prayerTimesCard = document.getElementById("prayerTimesCard");
    setVisibility(prayerTimesCard, visibility.prayerTimes === false);

    // Hijri Calendar
    const calendarCard = document.getElementById("calendarCard");
    setVisibility(calendarCard, visibility.hijriCalendar === false);

    // Qibla Direction
    const qiblaCard = document.getElementById("qiblaCard");
    setVisibility(qiblaCard, visibility.qiblaDirection === false);

    // Weather
    const weatherCard = document.getElementById("weatherCard");
    setVisibility(weatherCard, visibility.weather === false);

    // Lunar Phase
    const lunarPhaseCard = document.getElementById("lunarPhaseCard");
    setVisibility(lunarPhaseCard, visibility.lunarPhase === false);

    // Fasting
    const fastingCard = document.getElementById("fastingCard");
    setVisibility(fastingCard, visibility.fasting === false);

    // Flashcards
    const flashcardCard = document.getElementById("flashcardCard");
    setVisibility(flashcardCard, visibility.flashcards === false);

    // Adhkar
    const adhkarCard = document.getElementById("adhkarCard");
    setVisibility(adhkarCard, visibility.adhkar === false);

    // Hadith
    const hadithCard = document.getElementById("hadithCard");
    setVisibility(hadithCard, visibility.hadith === false);

    // Todo
    const todoCard = document.getElementById("todoCard");
    setVisibility(todoCard, visibility.todoList === false);

    // Notes
    const notesCard = document.getElementById("notesCard");
    setVisibility(notesCard, visibility.notes === false);

    // Pocket Quran
    const pocketQuranCard = document.getElementById("pocketQuranCard");
    setVisibility(pocketQuranCard, visibility.pocketQuran === false);

    if (
      this.momentMode &&
      typeof this.momentMode.syncLayoutVisibility === "function"
    ) {
      this.momentMode.syncLayoutVisibility();
    }

    // Apply quote layout style
    if (this.quotes && typeof this.quotes.applyLayoutStyle === "function") {
      this.quotes.applyLayoutStyle();
    }

    // Update compact weather display
    if (
      this.weather &&
      typeof this.weather.updateCompactWeather === "function"
    ) {
      this.weather.updateCompactWeather();
    }

    // Notify grid layout manager to recalculate layout (only when visibility changed)
    if (visibilityChanged) {
      try {
        document.dispatchEvent(new CustomEvent("md:visibility-changed"));
      } catch (e) {
        // Fallback for older browsers
        if (this.gridLayout) {
          this.gridLayout.recalculateLayout();
        }
      }
    }
  }

  applyHeadingSettings() {
    const settings = this.storage.getSettings();
    const headingSettings = settings.heading || {};
    const visibility = settings.componentVisibility || {};
    const timeSection = document.querySelector(".time-section");
    const timeMainRow =
      document.getElementById("timeMainRow") ||
      document.querySelector(".time-main-row");
    const currentSeconds = document.getElementById("currentSeconds");

    if (
      settings.compactWeatherEnabled === true &&
      this.weather &&
      typeof this.weather.ensureCompactWeatherElement === "function"
    ) {
      this.weather.ensureCompactWeatherElement();
    }

    const compactWeather = document.getElementById("compactWeather");
    const header = document.querySelector(".header");
    const wholeComponentSurfaceEnabled =
      headingSettings.wholeComponentSurfaceEnabled === true;
    header?.classList.toggle(
      "header-whole-surface-enabled",
      wholeComponentSurfaceEnabled,
    );
    const toggleHeaderSurface = (el, enabled) => {
      if (!el) return;
      el.classList.toggle("header-surface-enabled", enabled === true);
    };

    const showGreeting =
      headingSettings.showGreeting !== false && visibility.header !== false;
    const showClock =
      headingSettings.showClock !== false && visibility.header !== false;
    const showDate = headingSettings.showDate !== false;
    const showNextPrayer =
      showClock &&
      headingSettings.showNextPrayer === true &&
      visibility.header !== false;

    // Show/hide clock
    if (timeSection) {
      timeSection.style.display = showClock ? "" : "none";
    }

    if (this.greeting) {
      this.greeting.style.display = showGreeting ? "" : "none";
      this.greeting.setAttribute(
        "aria-hidden",
        showGreeting ? "false" : "true",
      );
    }

    // Show/hide seconds
    if (currentSeconds) {
      currentSeconds.style.display =
        headingSettings.showSeconds === false ? "none" : "";
    }

    // Apply clock style
    const clockStyle = headingSettings.clockStyle || "default";
    const clockSurfaceLocked = clockStyle === "boxed" || clockStyle === "pill";
    if (timeSection) {
      [...timeSection.classList]
        .filter((c) => c.startsWith("clock-style-"))
        .forEach((c) => timeSection.classList.remove(c));
      timeSection.classList.add(`clock-style-${clockStyle}`);
    }

    // Show/hide date
    if (this.dateDisplay) {
      this.dateDisplay.style.display = showDate ? "" : "none";
      this.dateDisplay.setAttribute("aria-hidden", showDate ? "false" : "true");
    }

    toggleHeaderSurface(
      this.greeting,
      !wholeComponentSurfaceEnabled &&
        headingSettings.greetingBackgroundEnabled === true,
    );
    toggleHeaderSurface(
      this.dateDisplay,
      !wholeComponentSurfaceEnabled &&
        headingSettings.dateBackgroundEnabled === true,
    );
    toggleHeaderSurface(
      timeMainRow,
      !wholeComponentSurfaceEnabled &&
        !clockSurfaceLocked &&
        headingSettings.timeBackgroundEnabled === true,
    );
    toggleHeaderSurface(
      this.headerNextPrayer,
      !wholeComponentSurfaceEnabled &&
        headingSettings.nextPrayerBackgroundEnabled === true,
    );
    toggleHeaderSurface(
      compactWeather,
      !wholeComponentSurfaceEnabled &&
        headingSettings.compactWeatherBackgroundEnabled === true,
    );

    this.applyHeaderTextColor(this.greeting, headingSettings.greetingTextColor);
    this.applyHeaderTextColor(this.dateDisplay, headingSettings.dateTextColor);
    this.applyHeaderTextColor(
      [this.currentTime || timeMainRow, currentSeconds],
      headingSettings.timeTextColor,
    );
    this.applyHeaderTextColor(
      [
        this.headerNextPrayer,
        this.headerNextPrayerName,
        this.headerNextPrayerCountdown,
      ],
      headingSettings.nextPrayerTextColor,
    );
    this.applyHeaderTextColor(
      compactWeather
        ? [
            compactWeather.querySelector(".compact-weather-temp"),
            compactWeather.querySelector(".compact-weather-desc"),
          ]
        : compactWeather,
      headingSettings.compactWeatherTextColor,
    );

    const greetingGlowColor = this.resolveHeaderGlowColor(
      headingSettings.greetingGlowColor,
      this.greeting,
    );
    const dateGlowColor = this.resolveHeaderGlowColor(
      headingSettings.dateGlowColor,
      this.dateDisplay,
    );
    const timeGlowColor = this.resolveHeaderGlowColor(
      headingSettings.timeGlowColor,
      this.currentTime || timeMainRow,
    );
    const nextPrayerGlowColor = this.resolveHeaderGlowColor(
      headingSettings.nextPrayerGlowColor,
      this.headerNextPrayer,
    );
    const compactWeatherGlowColor = this.resolveHeaderGlowColor(
      headingSettings.compactWeatherGlowColor,
      compactWeather?.querySelector(".compact-weather-temp") || compactWeather,
    );

    const greetingGlowOpacity = this.clampHeaderGlowOpacity(
      headingSettings.greetingGlowOpacity,
      72,
    );
    const greetingGlowRadius = this.clampHeaderGlowRadius(
      headingSettings.greetingGlowRadius,
      14,
    );

    const dateGlowOpacity = this.clampHeaderGlowOpacity(
      headingSettings.dateGlowOpacity,
      72,
    );
    const dateGlowRadius = this.clampHeaderGlowRadius(
      headingSettings.dateGlowRadius,
      14,
    );

    const timeGlowOpacity = this.clampHeaderGlowOpacity(
      headingSettings.timeGlowOpacity,
      72,
    );
    const timeGlowRadius = this.clampHeaderGlowRadius(
      headingSettings.timeGlowRadius,
      14,
    );

    const nextPrayerGlowOpacity = this.clampHeaderGlowOpacity(
      headingSettings.nextPrayerGlowOpacity,
      72,
    );
    const nextPrayerGlowRadius = this.clampHeaderGlowRadius(
      headingSettings.nextPrayerGlowRadius,
      14,
    );

    const compactWeatherGlowOpacity = this.clampHeaderGlowOpacity(
      headingSettings.compactWeatherGlowOpacity,
      72,
    );
    const compactWeatherGlowRadius = this.clampHeaderGlowRadius(
      headingSettings.compactWeatherGlowRadius,
      14,
    );

    this.applyHeaderGlow(
      this.greeting,
      headingSettings.greetingGlowEnabled === true && showGreeting,
      greetingGlowColor,
      greetingGlowOpacity,
      greetingGlowRadius,
    );
    this.applyHeaderGlow(
      this.dateDisplay,
      headingSettings.dateGlowEnabled === true && showDate,
      dateGlowColor,
      dateGlowOpacity,
      dateGlowRadius,
    );
    this.applyHeaderGlow(
      timeMainRow,
      headingSettings.timeGlowEnabled === true && showClock,
      timeGlowColor,
      timeGlowOpacity,
      timeGlowRadius,
    );
    this.applyHeaderGlow(
      this.headerNextPrayer,
      headingSettings.nextPrayerGlowEnabled === true && showNextPrayer,
      nextPrayerGlowColor,
      nextPrayerGlowOpacity,
      nextPrayerGlowRadius,
    );
    this.applyHeaderGlow(
      compactWeather,
      headingSettings.compactWeatherGlowEnabled === true &&
        settings.compactWeatherEnabled === true,
      compactWeatherGlowColor,
      compactWeatherGlowOpacity,
      compactWeatherGlowRadius,
    );

    if (
      this.themes &&
      typeof this.themes.getMainGridComponentOpacity === "function" &&
      typeof this.themes.setMainGridComponentOpacity === "function"
    ) {
      this.themes.setMainGridComponentOpacity(
        this.themes.getMainGridComponentOpacity(),
        false,
      );
    }

    if (
      this.momentMode &&
      typeof this.momentMode.syncLayoutVisibility === "function"
    ) {
      this.momentMode.syncLayoutVisibility();
    }

    this.updateHeaderNextPrayer();
  }
});

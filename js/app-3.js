/**
 * MuslimDashboard, part 3 of 3.
 * Moved out of js/app.js at method boundaries, so no single file carries the
 * whole class. The class itself is declared in js/app.js; load this after it.
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

  initQuranFocusMode() {
    // Nothing is in focus mode until the restore path below says so.
    this.modes.exit("quranFocus");

    const focusBtn = document.getElementById("quranFocusBtn");
    if (!focusBtn) return;

    const getHideableElements = () => {
      return [
        document.querySelector(".header"),
        document.getElementById("pinnedAppsSection"),
        document.getElementById("searchBarSection"),
        document.getElementById("quoteSection"),
        document.getElementById("prayerTimesCard"),
        document.getElementById("calendarCard"),
        document.getElementById("qiblaCard"),
        document.getElementById("weatherCard"),
        document.getElementById("lunarPhaseCard"),
        document.getElementById("fastingCard"),
        document.getElementById("flashcardCard"),
        document.getElementById("adhkarCard"),
        document.getElementById("hadithCard"),
        document.getElementById("todoCard"),
        document.getElementById("notesCard"),
      ].filter(Boolean);
    };

    let focusEnterAnimationClearTimer = null;
    let focusEnterAnimationEndHandler = null;

    const runFocusEnterAnimation = () => {
      const pocketQuranCard = document.getElementById("pocketQuranCard");
      if (!pocketQuranCard) return;

      if (focusEnterAnimationClearTimer) {
        clearTimeout(focusEnterAnimationClearTimer);
        focusEnterAnimationClearTimer = null;
      }
      if (focusEnterAnimationEndHandler) {
        pocketQuranCard.removeEventListener(
          "animationend",
          focusEnterAnimationEndHandler,
        );
        focusEnterAnimationEndHandler = null;
      }

      pocketQuranCard.classList.remove("quran-focus-entering");
      void pocketQuranCard.offsetWidth;
      pocketQuranCard.classList.add("quran-focus-entering");

      const clearEnterClass = () => {
        if (focusEnterAnimationClearTimer) {
          clearTimeout(focusEnterAnimationClearTimer);
          focusEnterAnimationClearTimer = null;
        }
        if (focusEnterAnimationEndHandler) {
          pocketQuranCard.removeEventListener(
            "animationend",
            focusEnterAnimationEndHandler,
          );
          focusEnterAnimationEndHandler = null;
        }
        pocketQuranCard.classList.remove("quran-focus-entering");
      };

      focusEnterAnimationEndHandler = (event) => {
        if (
          event.target !== pocketQuranCard ||
          event.animationName !== "quranFocusEnterFade"
        ) {
          return;
        }
        clearEnterClass();
      };

      pocketQuranCard.addEventListener(
        "animationend",
        focusEnterAnimationEndHandler,
      );

      focusEnterAnimationClearTimer = setTimeout(clearEnterClass, 520);
    };

    const enterFocusMode = (opts = {}) => {
      // Enforce mutual exclusivity: focus mode cannot coexist with sidebar mode.
      // Capture the previous mode so exiting focus can restore it.
      if (!opts.preservePreviousMode) {
        this._dashboardModeBeforeFocus = this.modes.isActive("sidebar")
          ? "sidebar"
          : "normal";
      }

      // Focus takes over the screen: turn off the modes it excludes first.
      this.exitExcludedModes("quranFocus");
      this.modes.enter("quranFocus");
      focusBtn.setAttribute("aria-pressed", "true");
      focusBtn.classList.add("active");

      try {
        const s = this.storage.getSettings();
        s.quranFocusModeEnabled = true;
        // Ensure other modes are off.
        s.sidebarModeEnabled = false;
        s.momentModeEnabled = false;
        s.lastDashboardMode = "quranFocus";
        this.storage.saveSettings(s);
      } catch (e) {}

      // Close the FAB menu if it's open
      const fabMenu = document.getElementById("fabMenu");
      const fabToggle = document.getElementById("fabMenuToggle");
      const fabItems = document.getElementById("fabMenuItems");
      if (fabMenu && fabMenu.classList.contains("open")) {
        fabMenu.classList.remove("open");
        if (fabToggle) {
          fabToggle.setAttribute("aria-expanded", "false");
          fabToggle.setAttribute("aria-label", "Open menu");
        }
        if (fabItems) {
          try {
            const active = document.activeElement;
            if (active && fabItems.contains(active)) {
              try {
                active.blur();
              } catch (e) {}
            }

            fabItems.setAttribute("inert", "");
          } catch (e) {}
          fabItems.setAttribute("aria-hidden", "true");
        }
      }

      // Store current visibility state of Pocket Quran
      const pocketQuranCard = document.getElementById("pocketQuranCard");
      const wasHidden =
        pocketQuranCard && pocketQuranCard.style.display === "none";

      // Force show Pocket Quran if it was hidden
      if (pocketQuranCard && wasHidden) {
        pocketQuranCard.style.display = "";
        pocketQuranCard.setAttribute("aria-hidden", "false");
      }

      // Hide all other elements with !important inline style
      const elements = getHideableElements();
      elements.forEach((el) => {
        el.dataset.focusModeHidden =
          el.style.display === "none" ? "was-hidden" : "visible";
        el.style.setProperty("display", "none", "important");
        el.setAttribute("aria-hidden", "true");
      });

      // Also hide grid-flex-row containers except the one containing pocketQuranCard
      const gridRows = document.querySelectorAll(".grid-flex-row");
      gridRows.forEach((row) => {
        if (!row.contains(pocketQuranCard)) {
          row.dataset.focusModeHidden = "row";
          row.style.setProperty("display", "none", "important");
        }
      });

      // Focus mode uses its own edit-mode state (separate from main layout).
      try {
        if (
          this.gridLayout &&
          typeof this.gridLayout.setQuranFocusModeActive === "function"
        ) {
          this.gridLayout.setQuranFocusModeActive(true);
        }
      } catch (e) {}

      // Switch Pocket Quran sizing to focus-mode width scope so main-layout
      // custom width does not leak into focus mode.
      try {
        if (
          pocketQuranCard &&
          this.gridLayout &&
          typeof this.gridLayout.applySavedMiddleWidthToElement === "function"
        ) {
          this.gridLayout.applySavedMiddleWidthToElement(pocketQuranCard);
        }
      } catch (e) {}

      runFocusEnterAnimation();
    };

    const exitFocusMode = () => {
      this.modes.exit("quranFocus");

      focusBtn.setAttribute("aria-pressed", "false");
      focusBtn.classList.remove("active");

      const pocketQuranCard = document.getElementById("pocketQuranCard");
      pocketQuranCard?.classList.remove("quran-focus-entering");

      const restoreMode =
        this._dashboardModeBeforeFocus === "sidebar" ? "sidebar" : "normal";

      try {
        const s = this.storage.getSettings();
        s.quranFocusModeEnabled = false;
        s.sidebarModeEnabled = restoreMode === "sidebar";

        // Restore the last non-focus mode (captured on entry).
        s.lastDashboardMode = restoreMode;
        this.storage.saveSettings(s);
      } catch (e) {}

      // Return to main-layout edit-mode state after leaving focus mode.
      try {
        if (
          this.gridLayout &&
          typeof this.gridLayout.setQuranFocusModeActive === "function"
        ) {
          this.gridLayout.setQuranFocusModeActive(false);
        }
      } catch (e) {}

      // Undo the temporary, forced focus-mode hiding without reloading the page.
      // This keeps Pocket Quran recitation (audio) running.
      const elements = getHideableElements();
      elements.forEach((el) => {
        try {
          el.style.removeProperty("display");
        } catch (e) {}
        try {
          el.removeAttribute("aria-hidden");
        } catch (e) {}
        try {
          delete el.dataset.focusModeHidden;
        } catch (e) {}
      });

      // Restore grid rows that were hidden in focus mode.
      const gridRows = document.querySelectorAll(".grid-flex-row");
      gridRows.forEach((row) => {
        try {
          row.style.removeProperty("display");
        } catch (e) {}
        try {
          delete row.dataset.focusModeHidden;
        } catch (e) {}
      });

      // Restore the user's saved grid layout (focus mode may temporarily hide
      // most cards which can confuse the responsive repacking logic).
      try {
        if (
          this.gridLayout &&
          typeof this.gridLayout.loadLayoutForMode === "function" &&
          typeof this.gridLayout.applyLayout === "function"
        ) {
          this.gridLayout.loadLayoutForMode(
            this.gridLayout.isSidebarModeEnabled ? "sidebar" : "normal",
          );
          this.gridLayout.applyLayout();

          // Restore main-layout width scope after leaving focus mode.
          if (
            typeof this.gridLayout.applySavedMiddleWidthsFromDOM === "function"
          ) {
            this.gridLayout.applySavedMiddleWidthsFromDOM();
          }
        }
      } catch (e) {}

      // Re-apply visibility + layout (this triggers grid recalculation).
      try {
        this.applyComponentVisibility();
      } catch (e) {}

      // Re-apply container width and nudge layout recalculation.
      try {
        const s = this.storage.getSettings();
        if (
          this.settings &&
          typeof this.settings.applyContainerWidth === "function"
        ) {
          this.settings.applyContainerWidth(
            s.containerWidth || "narrow",
            s.containerWidthCustom || 70,
          );
        }
      } catch (e) {}

      try {
        window.dispatchEvent(new Event("resize"));
      } catch (e) {}

      // If focus was entered from sidebar mode, restore sidebar layout/state.
      // Otherwise keep the existing sync behavior for normal mode.
      let restoredSidebarAfterFocus = false;
      if (
        restoreMode === "sidebar" &&
        typeof this._setSidebarModeEnabled === "function"
      ) {
        try {
          restoredSidebarAfterFocus =
            this._setSidebarModeEnabled(true) === true;
        } catch (e) {
          restoredSidebarAfterFocus = false;
        }
      }

      if (!restoredSidebarAfterFocus) {
        this.syncSidebarModeWithLayoutEditMode();
      }

      // Apply any floating toggles that were changed while focus mode was active.
      try {
        if (
          this.floating &&
          typeof this.floating.applyDeferredFromSettings === "function"
        ) {
          this.floating.applyDeferredFromSettings();
        } else if (
          this.floating &&
          typeof this.floating.applyViewportConstraint === "function"
        ) {
          this.floating.applyViewportConstraint();
        }
      } catch (e) {}

      try {
        if (
          this.floating &&
          typeof this.floating.enforceNonFloatingFromDashboardSettings ===
            "function"
        ) {
          this.floating.enforceNonFloatingFromDashboardSettings();
        }
      } catch (e) {}
    };

    // Expose setter for other modes to call.
    this._setQuranFocusModeEnabled = (enabled) => {
      const next = enabled === true;
      if (next) enterFocusMode();
      else exitFocusMode();
    };
    this.modeSetters.quranFocus = this._setQuranFocusModeEnabled;

    const toggleFocusMode = () => {
      if (this.modes.isActive("quranFocus")) {
        exitFocusMode();
      } else {
        enterFocusMode();
      }
    };

    focusBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFocusMode();

      // Safety reconcile after any focus toggle click.
      // If a floating setting is OFF, component must not remain floating.
      window.setTimeout(() => {
        try {
          if (
            this.floating &&
            typeof this.floating.enforceNonFloatingFromDashboardSettings ===
              "function"
          ) {
            this.floating.enforceNonFloatingFromDashboardSettings();
          }
        } catch (err) {}
      }, 0);
    });

    // Handle Escape key to exit focus mode
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.modes.isActive("quranFocus")) {
        exitFocusMode();
      }
    });

    // Restore last state from settings
    try {
      const s = this.storage.getSettings();
      // Don't restore Quran focus if Moment mode is the last mode
      const momentInitial =
        globalThis.ENABLE_DEBUG_MODE === true &&
        (s.momentModeEnabled === true || s.lastDashboardMode === "moment");
      const initial =
        !momentInitial &&
        (s.quranFocusModeEnabled === true ||
          s.lastDashboardMode === "quranFocus");
      if (initial) {
        // Capture what the user was using before focus (if we have a hint),
        // but do not restore it simultaneously.
        this._dashboardModeBeforeFocus =
          s.sidebarModeEnabled === true ? "sidebar" : "normal";
        try {
          if (typeof this._setSidebarModeEnabled === "function") {
            this._setSidebarModeEnabled(false);
          } else {
            this.modes.exit("sidebar");
            this.gridLayout?.setSidebarModeEnabled?.(false);
          }
        } catch (e) {}

        enterFocusMode({ preservePreviousMode: true });
      }
    } catch (e) {}
  }

  initMomentMode() {
    if (typeof window.MomentModeManager !== "function") return;

    this.momentMode = new window.MomentModeManager(this);
    this.momentMode.init();
  }

  applyPinnedAppsSettings(perRowOverride) {
    const settings = this.storage.getSettings();
    const perRow = SettingsRegistry.coerce(
      "pinnedAppsPerRow",
      Number.isFinite(perRowOverride)
        ? perRowOverride
        : Number(settings.pinnedAppsPerRow),
    );

    const appCount = Array.isArray(this.pinnedApps?.apps)
      ? this.pinnedApps.apps.length
      : 0;
    const needsBuffer = appCount > 0 && appCount % perRow === 0;
    const effectivePerRow = needsBuffer ? perRow + 1 : perRow;

    const grid = document.getElementById("pinnedAppsGrid");
    if (grid) {
      grid.style.setProperty("--pinned-apps-per-row", String(effectivePerRow));
    }
  }

  setCurrentTimeParts(hoursText, minutesText) {
    if (!this.currentTime) return;

    const safeHours = String(hoursText || "00");
    const safeMinutes = String(minutesText || "00");
    const timeText = `${safeHours}:${safeMinutes}`;
    if (this.currentTime.dataset.timeText === timeText) return;
    this.currentTime.dataset.timeText = timeText;

    this.currentTime.innerHTML =
      `<span class="time-hours">${safeHours}</span>` +
      `<span class="time-separator">:</span>` +
      `<span class="time-minutes">${safeMinutes}</span>`;
    this.currentTime.setAttribute("aria-label", timeText);
  }

  updateTime() {
    const now = new Date();
    const settings = this.storage.getSettings();
    const headingSettings = settings.heading || {};
    const clockFormat =
      headingSettings.clockFormat || settings.timeFormat || "24h";
    const is24h = clockFormat === "24h";
    const showAmPm = headingSettings.showAmPm !== false;

    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    if (!is24h) {
      const suffix = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      this.setCurrentTimeParts(String(hours), minutes);

      if (this.currentAmPm) {
        if (showAmPm) {
          this.currentAmPm.textContent = suffix;
          this.currentAmPm.style.display = "";
          this.currentAmPm.setAttribute("aria-hidden", "false");
        } else {
          this.currentAmPm.textContent = "";
          this.currentAmPm.style.display = "none";
          this.currentAmPm.setAttribute("aria-hidden", "true");
        }
      }
    } else {
      this.setCurrentTimeParts(String(hours).padStart(2, "0"), minutes);
      if (this.currentAmPm) {
        this.currentAmPm.textContent = "";
        this.currentAmPm.style.display = "none";
        this.currentAmPm.setAttribute("aria-hidden", "true");
      }
    }

    if (this.currentSeconds) {
      const secondsText = `:${seconds}`;
      if (this.currentSeconds.textContent !== secondsText) {
        this.currentSeconds.textContent = secondsText;
      }
    }

    this.updateHeaderNextPrayer(settings);
  }

  updateHeaderNextPrayer(settings = this.storage.getSettings()) {
    const headingSettings = settings.heading || {};
    const visibility = settings.componentVisibility || {};
    const shouldShow =
      visibility.header !== false &&
      headingSettings.showClock !== false &&
      headingSettings.showNextPrayer === true;

    if (this.headerNextPrayer) {
      const display = shouldShow ? "inline-flex" : "none";
      const ariaHidden = shouldShow ? "false" : "true";
      if (this.headerNextPrayer.style.display !== display) {
        this.headerNextPrayer.style.display = display;
      }
      if (this.headerNextPrayer.getAttribute("aria-hidden") !== ariaHidden) {
        this.headerNextPrayer.setAttribute("aria-hidden", ariaHidden);
      }
    }

    if (!shouldShow) return;

    const nextPrayerInfo =
      this.prayerTimes &&
      typeof this.prayerTimes.getNextPrayerInfo === "function"
        ? this.prayerTimes.getNextPrayerInfo(settings.prayerVisibility)
        : null;

    if (this.headerNextPrayerName) {
      const name = nextPrayerInfo?.name || "Loading...";
      if (this.headerNextPrayerName.textContent !== name) {
        this.headerNextPrayerName.textContent = name;
      }
    }

    if (this.headerNextPrayerCountdown) {
      const countdown = nextPrayerInfo?.countdown || "--:--:--";
      if (this.headerNextPrayerCountdown.textContent !== countdown) {
        this.headerNextPrayerCountdown.textContent = countdown;
      }
    }
  }

  updateDate() {
    const now = new Date();
    const settings = this.storage.getSettings();
    const headingSettings = settings.heading || {};
    const dateCalendar =
      headingSettings.dateCalendar || settings.calendarType || "hijri";
    const legacyShowWeekday = headingSettings.showWeekday;
    const dateFormat = this.normalizeHeadingDateFormat(
      headingSettings.dateFormat || "full",
      legacyShowWeekday,
    );
    const showIslamicEvents = headingSettings.showIslamicEvents !== false;

    let dateText = "";

    if (dateCalendar === "hijri" || dateCalendar === "both") {
      const hijriDate = new IslamicDay(settings).dayFor(now);
      dateText = this.hijri.format(hijriDate, dateFormat, "en");

      // Check for Islamic events
      if (showIslamicEvents) {
        const event = this.hijri.getTodayEvent(hijriDate);
        if (event) {
          dateText += ` • ${event.name}`;
        }
      }

      if (dateCalendar === "both") {
        dateText += " | " + this.formatGregorianDate(now, dateFormat);
      }
    } else {
      dateText = this.formatGregorianDate(now, dateFormat);
    }

    this.dateDisplay.textContent = dateText;
  }

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

  setupLocationUpdates() {
    // Update qibla when prayer times location changes
    const originalUpdate = this.prayerTimes.updatePrayerTimes.bind(
      this.prayerTimes,
    );
    this.prayerTimes.updatePrayerTimes = () => {
      originalUpdate();
      const location = this.prayerTimes.getCurrentLocation();
      if (location) {
        this.qibla.updateLocation(location.latitude, location.longitude);
        if (this.lunarPhase) {
          this.lunarPhase.refresh();
        }
      }
    };
  }

  normalizePrayerSyncSettingsPayload(rawValue) {
    if (!rawValue) return null;

    if (typeof rawValue === "string") {
      try {
        const parsed = JSON.parse(rawValue);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? parsed
          : null;
      } catch (e) {
        return null;
      }
    }

    if (typeof rawValue === "object" && !Array.isArray(rawValue)) {
      return rawValue;
    }

    return null;
  }

  getPrayerSyncDelta(previousSettings, nextSettings) {
    const previous =
      previousSettings &&
      typeof previousSettings === "object" &&
      !Array.isArray(previousSettings)
        ? previousSettings
        : {};
    const next =
      nextSettings &&
      typeof nextSettings === "object" &&
      !Array.isArray(nextSettings)
        ? nextSettings
        : {};

    const prayerRefreshKeys = [
      "calculationMethod",
      "asrMethod",
      "highLatMethod",
      "midnightMethod",
      "duhaOffset",
      "customFajrAngle",
      "customIshaAngle",
      "customIshaMinutes",
      "timeFormat",
      "adjustments",
      "prayerVisibility",
      "prayerNotifications",
    ];
    const locationKeys = ["locationMethod", "latitude", "longitude", "city"];

    const didKeyChange = (key) =>
      JSON.stringify(previous[key]) !== JSON.stringify(next[key]);

    const prayerChanged = prayerRefreshKeys.some((key) => didKeyChange(key));
    const locationChanged = locationKeys.some((key) => didKeyChange(key));

    return {
      shouldRefresh: prayerChanged || locationChanged,
      locationChanged,
    };
  }

  scheduleExternalPrayerRefresh(options = {}) {
    const locationChanged = options.locationChanged === true;
    this._externalPrayerSyncPendingLocationChange =
      this._externalPrayerSyncPendingLocationChange || locationChanged;

    if (this._externalPrayerSyncTimer) {
      clearTimeout(this._externalPrayerSyncTimer);
    }

    this._externalPrayerSyncTimer = setTimeout(() => {
      const shouldUseLocationRefresh =
        this._externalPrayerSyncPendingLocationChange === true;
      this._externalPrayerSyncPendingLocationChange = false;
      this._externalPrayerSyncTimer = null;

      this.refreshPrayerTimesFromExternalSettings({
        locationChanged: shouldUseLocationRefresh,
      });
    }, 80);
  }

  refreshPrayerTimesFromExternalSettings(options = {}) {
    const locationChanged = options.locationChanged === true;

    if (
      !this.prayerTimes ||
      typeof this.prayerTimes.updateSettings !== "function"
    ) {
      return;
    }

    const settings = this.storage.getSettings();
    this.prayerTimes.updateSettings(settings);

    const hasManualCoordinates =
      Number.isFinite(settings.latitude) && Number.isFinite(settings.longitude);

    if (settings.locationMethod === "manual" && hasManualCoordinates) {
      this.prayerTimes.setManualLocation(
        settings.latitude,
        settings.longitude,
        settings.city || "Custom Location",
      );

      if (this.qibla && typeof this.qibla.updateLocation === "function") {
        this.qibla.updateLocation(settings.latitude, settings.longitude);
      }
    } else {
      const lastLocation =
        typeof this.storage.getLastLocation === "function"
          ? this.storage.getLastLocation()
          : null;
      const hasSavedLocation =
        lastLocation &&
        Number.isFinite(Number(lastLocation.latitude)) &&
        Number.isFinite(Number(lastLocation.longitude));

      if (hasSavedLocation) {
        this.prayerTimes.location = {
          latitude: Number(lastLocation.latitude),
          longitude: Number(lastLocation.longitude),
          city: lastLocation.city || "Current Location",
        };
        this.prayerTimes.updatePrayerTimes();
      } else if (
        locationChanged &&
        typeof this.prayerTimes.getLocation === "function" &&
        !this._externalPrayerSyncGettingLocation
      ) {
        this._externalPrayerSyncGettingLocation = true;

        Promise.resolve(this.prayerTimes.getLocation())
          .catch((error) => {
            console.warn("External prayer location refresh failed:", error);
          })
          .finally(() => {
            this._externalPrayerSyncGettingLocation = false;
          });
      }
    }

    this.updateHeaderNextPrayer();
  }

  setupExternalPrayerSettingsSync() {
    const settingsStorageKey = `${this.storage.prefix}settings`;
    const locationStorageKey = `${this.storage.prefix}lastLocation`;

    if (!this._boundExternalPrayerStorageHandler) {
      this._boundExternalPrayerStorageHandler = (event) => {
        const changedKey = event?.key;

        if (changedKey === locationStorageKey) {
          this.scheduleExternalPrayerRefresh({ locationChanged: true });
          return;
        }

        if (changedKey !== settingsStorageKey) {
          return;
        }

        const previousSettings = this.normalizePrayerSyncSettingsPayload(
          event?.oldValue,
        );
        const nextSettings = this.normalizePrayerSyncSettingsPayload(
          event?.newValue,
        );

        if (!previousSettings || !nextSettings) {
          this.scheduleExternalPrayerRefresh({ locationChanged: true });
          return;
        }

        const delta = this.getPrayerSyncDelta(previousSettings, nextSettings);
        if (!delta.shouldRefresh) return;

        this.scheduleExternalPrayerRefresh({
          locationChanged: delta.locationChanged,
        });
      };

      window.addEventListener(
        "storage",
        this._boundExternalPrayerStorageHandler,
      );
    }

    if (
      !this._boundExternalPrayerChromeStorageHandler &&
      typeof chrome !== "undefined" &&
      chrome.storage?.onChanged?.addListener
    ) {
      this._boundExternalPrayerChromeStorageHandler = (changes, areaName) => {
        if (areaName !== "local" || !changes) return;

        if (changes.md_lastLocation) {
          this.scheduleExternalPrayerRefresh({ locationChanged: true });
        }

        if (!changes.md_settings) {
          return;
        }

        const previousSettings = this.normalizePrayerSyncSettingsPayload(
          changes.md_settings.oldValue,
        );
        const nextSettings = this.normalizePrayerSyncSettingsPayload(
          changes.md_settings.newValue,
        );

        if (!previousSettings || !nextSettings) {
          this.scheduleExternalPrayerRefresh({ locationChanged: true });
          return;
        }

        const delta = this.getPrayerSyncDelta(previousSettings, nextSettings);
        if (!delta.shouldRefresh) return;

        this.scheduleExternalPrayerRefresh({
          locationChanged: delta.locationChanged,
        });
      };

      chrome.storage.onChanged.addListener(
        this._boundExternalPrayerChromeStorageHandler,
      );
    }

    if (!this._boundExternalPrayerCleanupHandler) {
      this._boundExternalPrayerCleanupHandler = () => {
        this.cleanupExternalPrayerSettingsSync();
      };

      window.addEventListener(
        "beforeunload",
        this._boundExternalPrayerCleanupHandler,
      );
    }
  }

  cleanupExternalPrayerSettingsSync() {
    if (this._externalPrayerSyncTimer) {
      clearTimeout(this._externalPrayerSyncTimer);
      this._externalPrayerSyncTimer = null;
    }
    this._externalPrayerSyncPendingLocationChange = false;
    this._externalPrayerSyncGettingLocation = false;

    if (this._boundExternalPrayerStorageHandler) {
      window.removeEventListener(
        "storage",
        this._boundExternalPrayerStorageHandler,
      );
      this._boundExternalPrayerStorageHandler = null;
    }

    if (
      this._boundExternalPrayerChromeStorageHandler &&
      typeof chrome !== "undefined" &&
      chrome.storage?.onChanged?.removeListener
    ) {
      chrome.storage.onChanged.removeListener(
        this._boundExternalPrayerChromeStorageHandler,
      );
      this._boundExternalPrayerChromeStorageHandler = null;
    }

    if (this._boundExternalPrayerCleanupHandler) {
      window.removeEventListener(
        "beforeunload",
        this._boundExternalPrayerCleanupHandler,
      );
      this._boundExternalPrayerCleanupHandler = null;
    }
  }

  getSettingsTabFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search || "");
      const raw =
        params.get("settingsTab") || params.get("openSettingsTab") || "";
      const tab = String(raw).trim();
      if (!tab) return "";

      const allowedTabs = new Set(["location", "prayer"]);
      return allowedTabs.has(tab) ? tab : "";
    } catch (e) {
      return "";
    }
  }

  getSettingsTabFromHash() {
    try {
      const hashText = String(window.location.hash || "").replace(/^#/, "");
      if (!hashText) return "";

      const params = new URLSearchParams(hashText);
      const raw =
        params.get("settingsTab") || params.get("openSettingsTab") || "";
      const tab = String(raw).trim();
      if (!tab) return "";

      const allowedTabs = new Set(["location", "prayer"]);
      return allowedTabs.has(tab) ? tab : "";
    } catch (e) {
      return "";
    }
  }

  clearSettingsTabQueryFromUrl() {
    try {
      const url = new URL(window.location.href);
      let changed = false;

      if (
        url.searchParams.has("settingsTab") ||
        url.searchParams.has("openSettingsTab")
      ) {
        url.searchParams.delete("settingsTab");
        url.searchParams.delete("openSettingsTab");
        changed = true;
      }

      const hashText = String(url.hash || "").replace(/^#/, "");
      if (hashText) {
        const hashParams = new URLSearchParams(hashText);
        const hasSettingsTabInHash =
          hashParams.has("settingsTab") || hashParams.has("openSettingsTab");

        if (hasSettingsTabInHash) {
          hashParams.delete("settingsTab");
          hashParams.delete("openSettingsTab");
          changed = true;

          const nextHash = hashParams.toString();
          url.hash = nextHash ? `#${nextHash}` : "";
        }
      }

      if (!changed) return;

      const searchText = url.searchParams.toString();
      const nextUrl = `${url.pathname}${searchText ? `?${searchText}` : ""}${url.hash || ""}`;
      history.replaceState(null, "", nextUrl);
    } catch (e) {
      // ignore
    }
  }

  openSettingsFromUrlIfRequested() {
    const requestedTab =
      this.getSettingsTabFromUrl() || this.getSettingsTabFromHash();
    if (!requestedTab || !this.settings) return;

    try {
      this.settings.openModal();
      this.settings.switchTab(requestedTab);

      if (requestedTab === "location") {
        const locationFocusEl =
          document.getElementById("requestLocationBtn") ||
          document.getElementById("cityInput");
        locationFocusEl?.focus?.();
      } else if (requestedTab === "prayer") {
        const prayerFocusEl =
          document.getElementById("calculationMethod") ||
          document.getElementById("showFajr");
        prayerFocusEl?.focus?.();
      }
    } catch (e) {
      console.warn("Failed to open settings from URL:", e);
    }

    this.clearSettingsTabQueryFromUrl();
  }
});

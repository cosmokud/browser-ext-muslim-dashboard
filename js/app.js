/**
 * Muslim Dashboard - Main Application
 * Orchestrates all modules and initializes the dashboard
 * Enhanced with calendar widget, pinned apps, weather, and more prayer options
 */

class MuslimDashboard {
  constructor() {
    // Initialize storage
    this.storage = new StorageManager();

    // Floating mode manager (detached draggable/resizable cards)
    this.floating = new FloatingModeManager(this.storage);

    // Initialize managers
    this.backgrounds = new BackgroundManager(this.storage);
    this.prayerTimes = new PrayerTimesManager(this.storage);
    this.qibla = new QiblaManager(this.storage);
    this.quotes = new QuotesManager(this.storage);
    this.todos = new TodoManager(this.storage);
    this.pinnedApps = null; // Will be initialized after DOM
    this.calendar = null; // Will be initialized after DOM
    this.stickyNotes = null; // Will be initialized after DOM
    this.weather = null; // Will be initialized after DOM
    this.flashcards = null; // Will be initialized after DOM

    // Settings will be initialized after other managers
    this.settings = null;

    // Hijri date converter
    this.hijri = new HijriDate();

    // UI Elements
    this.greeting = document.getElementById("greeting");
    this.dateDisplay = document.getElementById("dateDisplay");
    this.currentTime = document.getElementById("currentTime");
    this.currentSeconds = document.getElementById("currentSeconds");
    this.currentAmPm = document.getElementById("currentAmPm");
  }

  setupFabMenu() {
    const menu = document.getElementById("fabMenu");
    const toggle = document.getElementById("fabMenuToggle");
    const items = document.getElementById("fabMenuItems");

    if (!menu || !toggle || !items) return;

    // Enable JS-driven autohide mode (graceful: without JS toggle remains visible)
    menu.classList.add("autohide");
    toggle.setAttribute("aria-hidden", "true");

    const setHotVisible = (visible) => {
      menu.classList.toggle("hot-visible", visible);
      try {
        toggle.setAttribute("aria-hidden", visible ? "false" : "true");
      } catch (e) {}
    };

    const setOpen = (open) => {
      menu.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      items.setAttribute("aria-hidden", open ? "false" : "true");
      // keep toggle visible while menu is open
      if (open) setHotVisible(true);
    };

    const isOpen = () => menu.classList.contains("open");

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setOpen(!isOpen());
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (!isOpen()) return;
      if (menu.contains(e.target)) return;
      setOpen(false);
      // hide toggle shortly after closing if user isn't hovering
      setTimeout(() => setHotVisible(false), 300);
    });

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (!isOpen()) return;
      if (e.key === "Escape") {
        setOpen(false);
        setTimeout(() => setHotVisible(false), 300);
      }
    });

    // Close after choosing an action
    items.addEventListener("click", (e) => {
      const button = e.target.closest("button");
      if (!button) return;
      setOpen(false);
    });

    // Autohide behaviour: show toggle when pointer is near bottom-right, or on touch
    const threshold = 120; // px from corner
    const hideDelay = 1500; // ms
    let hideTimer = null;

    const showHot = () => {
      setHotVisible(true);
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    };

    const hideHot = () => {
      if (isOpen()) return; // keep visible if menu is open
      setHotVisible(false);
    };

    // Mouse move detection (desktop)
    document.addEventListener("mousemove", (e) => {
      const dx = window.innerWidth - e.clientX;
      const dy = window.innerHeight - e.clientY;
      if (dx < threshold && dy < threshold) {
        showHot();
      } else {
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(hideHot, hideDelay);
      }
    });

    // Touch fallback (mobile)
    document.addEventListener(
      "touchstart",
      (e) => {
        const t = e.touches[0];
        if (!t) return;
        const dx = window.innerWidth - t.clientX;
        const dy = window.innerHeight - t.clientY;
        if (dx < threshold && dy < threshold) {
          showHot();
          if (hideTimer) clearTimeout(hideTimer);
          hideTimer = setTimeout(hideHot, hideDelay * 3);
        }
      },
      { passive: true }
    );

    // Show on focus (keyboard)
    toggle.addEventListener("focus", () => {
      showHot();
    });
    toggle.addEventListener("blur", () => {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(hideHot, hideDelay);
    });

    // Keyboard hotspot support (focusable invisible target at the corner)
    const hotspot = document.getElementById("fabHotspot");
    if (hotspot) {
      hotspot.addEventListener("focus", () => {
        showHot();
        // Move focus to the toggle so keyboard users can open the menu
        setTimeout(() => toggle.focus(), 0);
      });
      hotspot.addEventListener("blur", () => {
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(hideHot, hideDelay);
      });
    }

    // Ensure initial state
    setHotVisible(false);
    setOpen(false);
  }

  /**
   * Initialize the dashboard
   */
  async init() {
    console.log("🕌 Muslim Dashboard initializing...");

    // Start background first for visual appeal
    this.backgrounds.init();

    // Initialize time display
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);

    // Initialize date display
    this.updateDate();

    // Initialize greeting
    this.updateGreeting();

    // Initialize prayer times
    await this.prayerTimes.init();

    // Initialize qibla after location is available
    const location = this.prayerTimes.getCurrentLocation();
    if (location) {
      this.qibla.init(location.latitude, location.longitude);
    }

    // Initialize quotes
    await this.quotes.init();

    // Initialize todos
    this.todos.init();

    // Initialize pinned apps
    this.pinnedApps = new PinnedAppsManager(this.storage);

    // Initialize calendar
    this.calendar = new CalendarManager(this.storage, this.hijri);
    this.calendar.init();

    // Initialize sticky notes
    this.stickyNotes = new StickyNotesManager(this.storage);

    // Initialize weather
    this.weather = new WeatherManager(this.storage);
    await this.weather.init();

    // Initialize flashcards
    this.flashcards = new FlashcardManager(this.storage);
    await this.flashcards.init();

    // Initialize settings (after all other managers)
    this.settings = new SettingsManager(
      this.storage,
      this.prayerTimes,
      this.qibla,
      this.quotes,
      this.backgrounds,
      this.weather,
      this.flashcards
    );
    this.settings.init();

    // Apply initial container width
    const settings = this.storage.getSettings();
    this.settings.applyContainerWidth(
      settings.containerWidth || "narrow",
      settings.containerWidthCustom || 70
    );

    // Apply floating mode positions/states before visibility + layout calculations
    try {
      this.floating.init();
    } catch (e) {
      console.warn("Floating mode init failed:", e);
    }

    // Apply component visibility
    this.applyComponentVisibility();

    // Apply heading settings
    this.applyHeadingSettings();

    // Apply pinned apps layout settings
    this.applyPinnedAppsSettings();

    // Add global Refresh Background button handler (bottom-right UI)
    const refreshBtn = document.getElementById("refreshBgBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        if (this.backgrounds) {
          this.backgrounds.changeBackground();
        }
        refreshBtn.classList.add("rotate-once");
        setTimeout(() => refreshBtn.classList.remove("rotate-once"), 700);
      });
    }

    // Setup hamburger menu for bottom-right actions
    this.setupFabMenu();

    // Setup location updates
    this.setupLocationUpdates();

    console.log("✅ Muslim Dashboard ready!");
  }

  applyPinnedAppsSettings() {
    const settings = this.storage.getSettings();
    const perRowRaw = Number(settings.pinnedAppsPerRow);
    const perRow = Number.isFinite(perRowRaw)
      ? Math.min(20, Math.max(3, perRowRaw))
      : 10;

    const grid = document.getElementById("pinnedAppsGrid");
    if (grid) {
      grid.style.setProperty("--pinned-apps-per-row", String(perRow));
    }
  }

  /**
   * Update current time display
   */
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
      this.currentTime.textContent = `${hours}:${minutes}`;

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
      this.currentTime.textContent = `${String(hours).padStart(
        2,
        "0"
      )}:${minutes}`;
      if (this.currentAmPm) {
        this.currentAmPm.textContent = "";
        this.currentAmPm.style.display = "none";
        this.currentAmPm.setAttribute("aria-hidden", "true");
      }
    }

    if (this.currentSeconds) {
      this.currentSeconds.textContent = `:${seconds}`;
    }
  }

  /**
   * Update date display
   */
  updateDate() {
    const now = new Date();
    const settings = this.storage.getSettings();
    const headingSettings = settings.heading || {};
    const dateCalendar =
      headingSettings.dateCalendar || settings.calendarType || "hijri";
    const legacyShowWeekday = headingSettings.showWeekday;
    const dateFormat = this.normalizeHeadingDateFormat(
      headingSettings.dateFormat || "full",
      legacyShowWeekday
    );
    const showIslamicEvents = headingSettings.showIslamicEvents !== false;

    let dateText = "";

    if (dateCalendar === "hijri" || dateCalendar === "both") {
      const hijriDate = this.hijri.toHijri(now, settings.hijriAdjustment || 0);
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

  /**
   * Format Gregorian date with options
   */
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

  /**
   * Format Gregorian date based on a combined Date Format value
   */
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

  /**
   * Update greeting based on time and settings
   */
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
        greeting = timeRanges.morning?.text || "Assalamu Alaikum, Good Morning";
      } else if (hour >= 12 && hour < 15) {
        greeting =
          timeRanges.afternoon?.text || "Assalamu Alaikum, Good Afternoon";
      } else if (hour >= 15 && hour < 18) {
        greeting = timeRanges.evening?.text || "Assalamu Alaikum, Good Evening";
      } else {
        greeting = timeRanges.night?.text || "Assalamu Alaikum, Good Night";
      }
    }

    this.greeting.textContent = greeting;
  }

  /**
   * Apply component visibility settings
   */
  applyComponentVisibility() {
    const settings = this.storage.getSettings();
    const visibility = settings.componentVisibility || {};

    // Header (greeting, date, clock)
    const header = document.querySelector(".header");
    if (header) {
      header.style.display = visibility.header === false ? "none" : "";
      header.setAttribute(
        "aria-hidden",
        visibility.header === false ? "true" : "false"
      );
    }

    // Quick Pins
    const pinnedAppsSection = document.getElementById("pinnedAppsSection");
    if (pinnedAppsSection) {
      pinnedAppsSection.style.display =
        visibility.quickPins === false ? "none" : "";
      pinnedAppsSection.setAttribute(
        "aria-hidden",
        visibility.quickPins === false ? "true" : "false"
      );
    }

    // Quotes
    const quoteSection = document.getElementById("quoteSection");
    if (quoteSection) {
      quoteSection.style.display = visibility.quotes === false ? "none" : "";
      quoteSection.setAttribute(
        "aria-hidden",
        visibility.quotes === false ? "true" : "false"
      );
    }

    // Prayer Times
    const prayerTimesCard = document.getElementById("prayerTimesCard");
    if (prayerTimesCard) {
      prayerTimesCard.style.display =
        visibility.prayerTimes === false ? "none" : "";
      prayerTimesCard.setAttribute(
        "aria-hidden",
        visibility.prayerTimes === false ? "true" : "false"
      );
    }

    // Hijri Calendar
    const calendarCard = document.getElementById("calendarCard");
    if (calendarCard) {
      calendarCard.style.display =
        visibility.hijriCalendar === false ? "none" : "";
      calendarCard.setAttribute(
        "aria-hidden",
        visibility.hijriCalendar === false ? "true" : "false"
      );
    }

    // Qibla Direction
    const qiblaCard = document.getElementById("qiblaCard");
    if (qiblaCard) {
      qiblaCard.style.display =
        visibility.qiblaDirection === false ? "none" : "";
      qiblaCard.setAttribute(
        "aria-hidden",
        visibility.qiblaDirection === false ? "true" : "false"
      );
    }

    // Weather
    const weatherCard = document.getElementById("weatherCard");
    if (weatherCard) {
      weatherCard.style.display = visibility.weather === false ? "none" : "";
      weatherCard.setAttribute(
        "aria-hidden",
        visibility.weather === false ? "true" : "false"
      );
    }

    // Flashcards
    const flashcardCard = document.getElementById("flashcardCard");
    if (flashcardCard) {
      flashcardCard.style.display =
        visibility.flashcards === false ? "none" : "";
      flashcardCard.setAttribute(
        "aria-hidden",
        visibility.flashcards === false ? "true" : "false"
      );
    }

    // Todo List
    const todoCard = document.getElementById("todoCard");
    if (todoCard) {
      todoCard.style.display = visibility.todoList === false ? "none" : "";
      todoCard.setAttribute(
        "aria-hidden",
        visibility.todoList === false ? "true" : "false"
      );
    }

    // Update top-features columns based on visible top features (prayer, hijri, qibla)
    const topFeatures = document.querySelector(".top-features");
    if (topFeatures) {
      // Count only cards that are actually still inside the grid (not floating)
      const prayerTimesCard = document.getElementById("prayerTimesCard");
      const calendarCard = document.getElementById("calendarCard");
      const qiblaCard = document.getElementById("qiblaCard");

      const topVisibleCount = [prayerTimesCard, calendarCard, qiblaCard].filter(
        (el) =>
          el &&
          el.parentElement === topFeatures &&
          el.getAttribute("aria-hidden") !== "true" &&
          el.style.display !== "none"
      ).length;

      // clean previously applied classes
      topFeatures.classList.remove(
        "columns-0",
        "columns-1",
        "columns-2",
        "columns-3"
      );
      topFeatures.classList.add(`columns-${topVisibleCount}`);
    }
  }

  /**
   * Apply heading settings (clock, date formatting)
   */
  applyHeadingSettings() {
    const settings = this.storage.getSettings();
    const headingSettings = settings.heading || {};
    const timeSection = document.querySelector(".time-section");
    const currentSeconds = document.getElementById("currentSeconds");

    // Show/hide clock
    if (timeSection) {
      timeSection.style.display =
        headingSettings.showClock === false ? "none" : "";
    }

    // Show/hide seconds
    if (currentSeconds) {
      currentSeconds.style.display =
        headingSettings.showSeconds === false ? "none" : "";
    }

    // Apply clock style
    const clockStyle = headingSettings.clockStyle || "default";
    if (timeSection) {
      [...timeSection.classList]
        .filter((c) => c.startsWith("clock-style-"))
        .forEach((c) => timeSection.classList.remove(c));
      timeSection.classList.add(`clock-style-${clockStyle}`);
    }

    // Show/hide date
    if (this.dateDisplay) {
      this.dateDisplay.style.display =
        headingSettings.showDate === false ? "none" : "";
    }
  }

  /**
   * Setup location updates
   */
  setupLocationUpdates() {
    // Update qibla when prayer times location changes
    const originalUpdate = this.prayerTimes.updatePrayerTimes.bind(
      this.prayerTimes
    );
    this.prayerTimes.updatePrayerTimes = () => {
      originalUpdate();
      const location = this.prayerTimes.getCurrentLocation();
      if (location) {
        this.qibla.updateLocation(location.latitude, location.longitude);
      }
    };
  }
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  const dashboard = new MuslimDashboard();
  // Expose instance for runtime interactions (settings live preview, debugging)
  window.dashboard = dashboard;
  dashboard.init();
});

// Export for debugging
window.MuslimDashboard = MuslimDashboard;

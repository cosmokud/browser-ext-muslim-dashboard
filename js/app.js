/**
 * Muslim Dashboard - Main Application
 * Orchestrates all modules and initializes the dashboard
 * Enhanced with calendar widget, pinned apps, weather, and more prayer options
 */

class MuslimDashboard {
  constructor() {
    // Initialize storage
    this.storage = new StorageManager();

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

    // Settings will be initialized after other managers
    this.settings = null;

    // Hijri date converter
    this.hijri = new HijriDate();

    // UI Elements
    this.greeting = document.getElementById("greeting");
    this.dateDisplay = document.getElementById("dateDisplay");
    this.currentTime = document.getElementById("currentTime");
    this.currentSeconds = document.getElementById("currentSeconds");
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

    // Initialize settings (after all other managers)
    this.settings = new SettingsManager(
      this.storage,
      this.prayerTimes,
      this.qibla,
      this.quotes,
      this.backgrounds,
      this.weather
    );
    this.settings.init();

    // Apply initial container width
    const settings = this.storage.getSettings();
    this.settings.applyContainerWidth(
      settings.containerWidth || "narrow",
      settings.containerWidthCustom || 70
    );

    // Apply component visibility
    this.applyComponentVisibility();

    // Apply heading settings
    this.applyHeadingSettings();

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

    // Setup location updates
    this.setupLocationUpdates();

    console.log("✅ Muslim Dashboard ready!");
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
      if (showAmPm) {
        this.currentTime.textContent = `${hours}:${minutes} ${suffix}`;
      } else {
        this.currentTime.textContent = `${hours}:${minutes}`;
      }
    } else {
      this.currentTime.textContent = `${String(hours).padStart(
        2,
        "0"
      )}:${minutes}`;
    }

    this.currentSeconds.textContent = `:${seconds}`;
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
    const dateFormat = headingSettings.dateFormat || "full";
    const showWeekday = headingSettings.showWeekday !== false;
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
        dateText +=
          " | " + this.formatGregorianDate(now, dateFormat, showWeekday);
      }
    } else {
      dateText = this.formatGregorianDate(now, dateFormat, showWeekday);
    }

    this.dateDisplay.textContent = dateText;
  }

  /**
   * Format Gregorian date with options
   */
  formatGregorianDate(date, format, showWeekday) {
    const options = {};

    switch (format) {
      case "full":
        if (showWeekday) options.weekday = "long";
        options.year = "numeric";
        options.month = "long";
        options.day = "numeric";
        break;
      case "long":
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
        if (showWeekday) options.weekday = "long";
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
    }

    // Quick Pins
    const pinnedAppsSection = document.getElementById("pinnedAppsSection");
    if (pinnedAppsSection) {
      pinnedAppsSection.style.display =
        visibility.quickPins === false ? "none" : "";
    }

    // Quotes
    const quoteSection = document.getElementById("quoteSection");
    if (quoteSection) {
      quoteSection.style.display = visibility.quotes === false ? "none" : "";
    }

    // Prayer Times
    const prayerTimesCard = document.getElementById("prayerTimesCard");
    if (prayerTimesCard) {
      prayerTimesCard.style.display =
        visibility.prayerTimes === false ? "none" : "";
    }

    // Hijri Calendar
    const calendarCard = document.getElementById("calendarCard");
    if (calendarCard) {
      calendarCard.style.display =
        visibility.hijriCalendar === false ? "none" : "";
    }

    // Qibla Direction
    const qiblaCard = document.getElementById("qiblaCard");
    if (qiblaCard) {
      qiblaCard.style.display =
        visibility.qiblaDirection === false ? "none" : "";
    }

    // Weather
    const weatherCard = document.getElementById("weatherCard");
    if (weatherCard) {
      weatherCard.style.display = visibility.weather === false ? "none" : "";
    }

    // Todo List
    const todoCard = document.getElementById("todoCard");
    if (todoCard) {
      todoCard.style.display = visibility.todoList === false ? "none" : "";
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
      timeSection.classList.remove(
        "clock-style-default",
        "clock-style-minimal",
        "clock-style-elegant"
      );
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
  dashboard.init();
});

// Export for debugging
window.MuslimDashboard = MuslimDashboard;

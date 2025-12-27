/**
 * Muslim Dashboard - Main Application
 * Orchestrates all modules and initializes the dashboard
 * Enhanced with calendar widget, pinned apps, and more prayer options
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

    // Initialize settings (after all other managers)
    this.settings = new SettingsManager(
      this.storage,
      this.prayerTimes,
      this.qibla,
      this.quotes,
      this.backgrounds
    );
    this.settings.init();

    // Apply initial container width
    const settings = this.storage.getSettings();
    this.settings.applyContainerWidth(
      settings.containerWidth || "narrow",
      settings.containerWidthCustom || 70
    );

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
    const is24h = settings.timeFormat !== "12h";

    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    if (!is24h) {
      const suffix = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      this.currentTime.textContent = `${hours}:${minutes}`;
      // Could add AM/PM indicator if needed
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
    const showHijri = settings.calendarType !== "gregorian";

    if (showHijri) {
      const hijriDate = this.hijri.toHijri(now, settings.hijriAdjustment || 0);
      let dateText = this.hijri.format(hijriDate, "full", "en");

      // Check for Islamic events
      const event = this.hijri.getTodayEvent(hijriDate);
      if (event) {
        dateText += ` • ${event.name}`;
      }

      this.dateDisplay.textContent = dateText;
    } else {
      this.dateDisplay.textContent = this.hijri.formatGregorian(now, "full");
    }
  }

  /**
   * Update greeting based on time
   */
  updateGreeting() {
    const hour = new Date().getHours();
    let greeting;

    if (hour >= 3 && hour < 12) {
      greeting = "Assalamu Alaikum, Good Morning";
    } else if (hour >= 12 && hour < 15) {
      greeting = "Assalamu Alaikum, Good Afternoon";
    } else if (hour >= 15 && hour < 18) {
      greeting = "Assalamu Alaikum, Good Evening";
    } else {
      greeting = "Assalamu Alaikum, Good Night";
    }

    this.greeting.textContent = greeting;
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

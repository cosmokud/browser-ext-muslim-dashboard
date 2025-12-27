/**
 * Muslim Dashboard - Main Application
 * Orchestrates all modules and initializes the dashboard
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

    // Settings will be initialized after other managers
    this.settings = null;

    // Hijri date converter
    this.hijri = new HijriDate();

    // UI Elements
    this.greeting = document.getElementById("greeting");
    this.dateDisplay = document.getElementById("dateDisplay");
    this.currentTime = document.getElementById("currentTime");
    this.currentSeconds = document.getElementById("currentSeconds");
    this.calendarToggle = document.getElementById("calendarToggle");
    this.calendarType = document.getElementById("calendarType");

    // State
    this.showHijri = true;
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
    const location = this.prayerTimes.getLocation();
    if (location) {
      this.qibla.init(location.latitude, location.longitude);
    }

    // Initialize quotes
    await this.quotes.init();

    // Initialize todos
    this.todos.init();

    // Initialize settings (after all other managers)
    this.settings = new SettingsManager(
      this.storage,
      this.prayerTimes,
      this.qibla,
      this.quotes,
      this.backgrounds
    );
    this.settings.init();

    // Setup calendar toggle
    this.setupCalendarToggle();

    // Listen for location updates
    this.setupLocationUpdates();

    console.log("✅ Muslim Dashboard ready!");
  }

  /**
   * Update current time display
   */
  updateTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    this.currentTime.textContent = `${hours}:${minutes}`;
    this.currentSeconds.textContent = `:${seconds}`;
  }

  /**
   * Update date display
   */
  updateDate() {
    const now = new Date();

    if (this.showHijri) {
      const settings = this.storage.getSettings();
      const hijriDate = this.hijri.toHijri(now, settings.hijriAdjustment || 0);
      this.dateDisplay.textContent = this.hijri.format(hijriDate, "full", "en");

      // Check for Islamic events
      const event = this.hijri.getTodayEvent(hijriDate);
      if (event) {
        this.dateDisplay.textContent += ` • ${event.name}`;
      }
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
   * Setup calendar toggle
   */
  setupCalendarToggle() {
    const settings = this.storage.getSettings();
    this.showHijri = settings.calendarType !== "gregorian";
    this.calendarType.textContent = this.showHijri ? "Hijri" : "Gregorian";

    this.calendarToggle.addEventListener("click", () => {
      this.showHijri = !this.showHijri;
      this.calendarType.textContent = this.showHijri ? "Hijri" : "Gregorian";

      // Save preference
      const settings = this.storage.getSettings();
      settings.calendarType = this.showHijri ? "hijri" : "gregorian";
      this.storage.saveSettings(settings);

      // Update display
      this.updateDate();
    });
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
      const location = this.prayerTimes.getLocation();
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

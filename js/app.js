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

    // Initialize Theme Manager
    this.themes = new ThemeManager(this.storage);

    // Initialize Icon Theme Manager
    this.iconThemes = new IconThemeManager(this.storage);

    // Initialize managers
    this.backgrounds = new BackgroundManager(this.storage);
    this.prayerTimes = new PrayerTimesManager(this.storage);
    this.qibla = new QiblaManager(this.storage);
    this.quotes = new QuotesManager(this.storage);
    this.todos = new TodoManager(this.storage);
    this.pinnedApps = null; // Will be initialized after DOM
    this.searchBar = null; // Will be initialized after DOM
    this.calendar = null; // Will be initialized after DOM
    this.stickyNotes = null; // Will be initialized after DOM
    this.weather = null; // Will be initialized after DOM
    this.lunarPhase = null; // Will be initialized after DOM
    this.flashcards = null; // Will be initialized after DOM
    this.hadith = null; // Will be initialized after DOM
    this.fasting = null; // Will be initialized after DOM
    this.notes = null; // Will be initialized after DOM
    this.pocketQuran = null; // Will be initialized after DOM
    this.momentMode = null; // Will be initialized after DOM

    // Unified content search modal (Quotes / Adhkar / Hadith / Notes / Todo)
    this.contentSearch = null;

    // Grid layout manager for drag-and-drop
    this.gridLayout = null; // Will be initialized after DOM
    this.MIN_SIDEBAR_MODE_WIDTH = 2144;

    // Which presentation modes are on and which exclude which (js/modes.js).
    this.modes = new Modes(this.storage.getSettings());

    // Dashboard mode coordination (ensures modes are mutually exclusive)
    this._setSidebarModeEnabled = null;
    this._setQuranFocusModeEnabled = null;
    this._dashboardModeBeforeFocus = "normal";
    // Mode name -> that mode's own setter, so the exclusion table can call it.
    this.modeSetters = {};

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
    this.headerNextPrayer = document.getElementById("headerNextPrayer");
    this.headerNextPrayerName = document.getElementById("headerNextPrayerName");
    this.headerNextPrayerCountdown = document.getElementById(
      "headerNextPrayerCountdown",
    );

    // Keep a handle to the native Date constructor for debug date simulation.
    this._nativeDateCtor = Date;
    this._debugDateSimulationEnabled = false;
    this._debugSimulatedDateYMD = null;
    this._debugSimulatedTimeHM = null;

    // Cross-context prayer refresh state (popup -> dashboard).
    this._externalPrayerSyncTimer = null;
    this._externalPrayerSyncPendingLocationChange = false;
    this._externalPrayerSyncGettingLocation = false;
    this._boundExternalPrayerStorageHandler = null;
    this._boundExternalPrayerChromeStorageHandler = null;
    this._boundExternalPrayerCleanupHandler = null;
  }
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  // Prevent browser scroll restoration from jumping to a saved (often bottom)
  // scroll position on refresh/startup.
  try {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  } catch (e) {}

  const scrollToTop = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch (e) {
      try {
        window.scrollTo(0, 0);
      } catch (e2) {}
    }
  };

  // Ensure we start at the top even if layout shifts during first paint.
  scrollToTop();
  requestAnimationFrame(scrollToTop);

  const dashboard = new MuslimDashboard();
  // Expose instance for runtime interactions (settings live preview, debugging)
  window.dashboard = dashboard;
  const initPromise = dashboard.init();

  // If any async init (fetches, renders) triggers a late scroll adjustment,
  // re-assert top once init settles.
  if (initPromise && typeof initPromise.finally === "function") {
    initPromise.finally(() => {
      scrollToTop();
      requestAnimationFrame(scrollToTop);
    });
  }
});

// Export for debugging
window.MuslimDashboard = MuslimDashboard;

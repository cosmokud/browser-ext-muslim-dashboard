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
      highLatMethod: "NightMiddle",
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

      // Quote settings
      useDefaultQuotes: true,
      useUserQuotes: true,
      quotesPerPage: 10,

      // Background settings
      bgInterval: 60, // minutes
      bgCategory: "nature",
      lastBgChange: null,
      currentBgIndex: 0,

      // Calendar settings
      calendarType: "hijri",
      hijriAdjustment: 0,

      // UI settings
      timeFormat: "24h",

      // Pinned Apps settings
      pinnedApps: [],
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

    return merged;
  }

  /**
   * Save settings
   */
  saveSettings(settings) {
    return this.set("settings", settings);
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
    return this.set("lastLocation", location);
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

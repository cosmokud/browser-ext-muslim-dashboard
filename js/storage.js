/**
 * Storage Manager
 * Handles localStorage operations for the Muslim Dashboard
 */

class StorageManager {
  constructor() {
    this.prefix = 'muslimDashboard_';
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
      console.error('Storage get error:', e);
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
      console.error('Storage set error:', e);
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
      console.error('Storage remove error:', e);
      return false;
    }
  }

  /**
   * Clear all dashboard storage
   */
  clear() {
    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith(this.prefix))
        .forEach(key => localStorage.removeItem(key));
      return true;
    } catch (e) {
      console.error('Storage clear error:', e);
      return false;
    }
  }

  /**
   * Get default settings
   */
  getDefaultSettings() {
    return {
      // Location settings
      locationMethod: 'auto',
      city: '',
      latitude: null,
      longitude: null,

      // Prayer settings
      calculationMethod: 'MWL',
      asrMethod: 'Standard',
      adjustments: {
        fajr: 0,
        sunrise: 0,
        dhuhr: 0,
        asr: 0,
        maghrib: 0,
        isha: 0
      },

      // Quote settings
      useDefaultQuotes: true,
      useUserQuotes: true,

      // Background settings
      bgInterval: 60, // minutes
      bgCategory: 'nature',
      lastBgChange: null,
      currentBgIndex: 0,

      // Calendar settings
      calendarType: 'hijri',
      hijriAdjustment: 0,

      // UI settings
      timeFormat: '24h'
    };
  }

  /**
   * Get settings with defaults
   */
  getSettings() {
    const defaults = this.getDefaultSettings();
    const stored = this.get('settings', {});
    return { ...defaults, ...stored };
  }

  /**
   * Save settings
   */
  saveSettings(settings) {
    return this.set('settings', settings);
  }

  /**
   * Get todos
   */
  getTodos() {
    return this.get('todos', []);
  }

  /**
   * Save todos
   */
  saveTodos(todos) {
    return this.set('todos', todos);
  }

  /**
   * Get user quotes
   */
  getUserQuotes() {
    return this.get('userQuotes', []);
  }

  /**
   * Save user quotes
   */
  saveUserQuotes(quotes) {
    return this.set('userQuotes', quotes);
  }

  /**
   * Get last location
   */
  getLastLocation() {
    return this.get('lastLocation', null);
  }

  /**
   * Save last location
   */
  saveLastLocation(location) {
    return this.set('lastLocation', location);
  }
}

// Export for use
window.StorageManager = StorageManager;

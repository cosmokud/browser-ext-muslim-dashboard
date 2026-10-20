/**
 * FloatingModeManager: per card floating box storage.
 * Part of the class declared in js/floating/index.js; load this after it.
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
})(FloatingModeManager.prototype, class {

  getBoxStorageKey(key) {
    return `floatingBox_${key}`;
  }

  getStoredBox(key) {
    try {
      return this.storage.get(this.getBoxStorageKey(key), null);
    } catch (e) {
      return null;
    }
  }

  getDefaultFloatingBox(key) {
    const baseFallback = {
      left: 40,
      top: 120,
      width: 420,
      height: 520,
      z: 10,
    };

    const perKeyFallback = {
      quotes: { width: 640, height: 300 },
      lunarPhase: { width: 420, height: 300 },
      fasting: { width: 420, height: 300 },
      flashcards: { width: 560, height: 360 },
      adhkar: { width: 560, height: 420 },
      hadith: { width: 720, height: 480 },
      todoList: { width: 560, height: 360 },
    };

    let defaultsFromStorage = null;
    try {
      if (typeof this.storage?.getDefaultSettings === "function") {
        defaultsFromStorage =
          this.storage.getDefaultSettings()?.floating?.[key];
      }
    } catch (e) {
      defaultsFromStorage = null;
    }

    return {
      ...baseFallback,
      ...(perKeyFallback[key] || {}),
      ...(defaultsFromStorage && typeof defaultsFromStorage === "object"
        ? defaultsFromStorage
        : {}),
    };
  }

  persistBox(key, box) {
    // Persist in two places:
    // 1) settings.floating (for export/import and centralized config)
    // 2) dedicated per-component key (more robust against accidental overwrites)
    try {
      const settings = this.getSettings();
      settings.floating = settings.floating || {};
      settings.floating[key] = {
        ...(settings.floating[key] || {}),
        ...(box || {}),
      };
      this.saveSettings(settings);
    } catch (e) {}

    try {
      this.storage.set(this.getBoxStorageKey(key), box);
    } catch (e) {}
  }
});

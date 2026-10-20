/**
 * FloatingModeManager: settings reads and deferred modes.
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

  getSettings() {
    return this.storage.getSettings();
  }

  saveSettings(settings) {
    this.storage.saveSettings(settings);
  }

  isEnabledDesired(key) {
    const settings = this.getSettings();
    return settings?.floating?.[key]?.enabled === true;
  }

  isQuranFocusModeActive() {
    return window.dashboard?.modes?.isActive?.("quranFocus") === true;
  }

  isMomentModeActive() {
    return window.dashboard?.modes?.isActive?.("moment") === true;
  }

  isRuntimeModeDeferred() {
    return this.isQuranFocusModeActive() || this.isMomentModeActive();
  }

  applyDeferredFromSettings() {
    if (this.isRuntimeModeDeferred()) {
      this.updateAllButtons();
      return;
    }

    this.enforceNonFloatingFromDashboardSettings({
      applyFloatingEnabled: true,
    });
  }
});

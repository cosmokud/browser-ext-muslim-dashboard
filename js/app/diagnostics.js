/**
 * MuslimDashboard: toasts and the debug date clock.
 * Part of the class declared in js/app/index.js; load this after it.
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

  showToast(message, type = "info") {
    try {
      if (this.settings && typeof this.settings.showToast === "function") {
        this.settings.showToast(message, type);
        return;
      }
    } catch (e) {}

    try {
      this.gridLayout?.showToast?.(message, type);
    } catch (e) {}
  }

  normalizeDebugDateYMD(rawValue) {
    return DebugClock.normalizeDateYMD(rawValue, this._nativeDateCtor || Date);
  }

  applyDebugDateSimulationFromSettings(settingsOverride = null) {
    const settings =
      settingsOverride && typeof settingsOverride === "object"
        ? settingsOverride
        : this.storage.getSettings();

    const debugSettings =
      settings && typeof settings.debug === "object" ? settings.debug : {};

    const debugModeEnabled = globalThis.ENABLE_DEBUG_MODE === true;

    const simulationEnabled =
      debugModeEnabled && debugSettings.simulatedDateEnabled === true;
    const simulatedYmd = this.normalizeDebugDateYMD(
      debugSettings.simulatedDate,
    );

    const simulatedTime = DebugClock.normalizeTimeHM(
      debugSettings.simulatedTime,
    );

    const NativeDate = this._nativeDateCtor || Date;

    if (simulationEnabled && simulatedYmd) {
      const getSimulatedNowMs = () =>
        DebugClock.now(simulatedYmd, simulatedTime, NativeDate);

      const SimulatedDate = class extends NativeDate {
        constructor(...args) {
          if (args.length === 0) {
            super(getSimulatedNowMs());
            return;
          }
          super(...args);
        }

        static now() {
          return getSimulatedNowMs();
        }

        static parse(value) {
          return NativeDate.parse(value);
        }

        static UTC(...args) {
          return NativeDate.UTC(...args);
        }
      };

      window.Date = SimulatedDate;
      this._debugDateSimulationEnabled = true;
      this._debugSimulatedDateYMD = simulatedYmd;
      this._debugSimulatedTimeHM = simulatedTime || null;
      return;
    }

    if (window.Date !== NativeDate) {
      window.Date = NativeDate;
    }
    this._debugDateSimulationEnabled = false;
    this._debugSimulatedDateYMD = null;
    this._debugSimulatedTimeHM = null;
  }
});

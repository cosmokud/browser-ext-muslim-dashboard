/**
 * HadithManager: auto advance timing and state.
 * Part of the class declared in js/hadith/index.js; load this after it.
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
})(HadithManager.prototype, class {

  getAutoAdvanceSeconds() {
    const settings = this.getHadithSettings();
    return this.clampNumber(
      parseInt(settings.autoAdvanceSeconds, 10),
      1,
      3600,
      20,
    );
  }

  setAutoAdvanceSeconds(seconds) {
    const clamped = this.clampNumber(parseInt(seconds, 10), 1, 3600, 20);
    this.setHadithSettings({ autoAdvanceSeconds: clamped });
    this.ensureAutoAdvanceState({ reset: true });
  }

  getAutoAdvancePaused() {
    const settings = this.getHadithSettings();
    return !!settings.autoAdvancePaused;
  }

  setAutoAdvancePaused(paused) {
    const next = !!paused;
    this.setHadithSettings({ autoAdvancePaused: next });
    this.renderAutoAdvanceUI();
    this.ensureAutoAdvanceState({ reset: true });
  }

  toggleAutoAdvancePaused() {
    this.setAutoAdvancePaused(!this.getAutoAdvancePaused());
  }

  clearAutoAdvanceTimer() {
    if (this._autoAdvanceTimer) {
      clearTimeout(this._autoAdvanceTimer);
      this._autoAdvanceTimer = null;
    }
  }

  ensureAutoAdvanceState({ reset = false } = {}) {
    const active = this.getActiveSet();
    const items = active?.cards || [];

    this.renderAutoAdvanceUI();

    if (!items.length) {
      this.clearAutoAdvanceTimer();
      return;
    }

    if (this.getAutoAdvancePaused() || this._hoverPauseAutoAdvance) {
      this.clearAutoAdvanceTimer();
      return;
    }

    const seconds = this.getAutoAdvanceSeconds();

    if (reset) {
      this.clearAutoAdvanceTimer();
    }

    if (this._autoAdvanceTimer) return;

    this._autoAdvanceTimer = setTimeout(() => {
      this._autoAdvanceTimer = null;
      this.gotoNextCard();
    }, seconds * 1000);
  }

  renderAutoAdvanceUI() {
    const paused = this.getAutoAdvancePaused();
    const btn = this.autoAdvanceToggleBtn;
    const status = this.autoAdvanceStatusEl;

    if (btn) {
      btn.setAttribute("aria-pressed", paused ? "true" : "false");
      btn.title = paused ? "Resume auto-advance" : "Pause auto-advance";
      btn.setAttribute(
        "aria-label",
        paused ? "Resume auto-advance" : "Pause auto-advance",
      );
      const icon = btn.querySelector(".auto-icon");
      if (icon) icon.textContent = paused ? "▶" : "⏸";
    }

    if (status) {
      status.textContent = paused ? "Paused" : "Auto";
    }
  }
});

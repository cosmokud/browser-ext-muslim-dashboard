/**
 * FlashcardManager: auto advance timing and mode application.
 * Part of the class declared in js/flashcards/index.js; load this after it.
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
})(FlashcardManager.prototype, class {

  getStudyAutoAdvanceSeconds() {
    const settings = this.getFlashcardSettings();
    return this.clampNumber(
      parseInt(settings.studyAutoAdvanceSeconds, 10),
      1,
      3600,
      10,
    );
  }

  setStudyAutoAdvanceSeconds(seconds) {
    const clamped = this.clampNumber(parseInt(seconds, 10), 1, 3600, 10);
    this.setFlashcardSettings({ studyAutoAdvanceSeconds: clamped });
    this.ensureAutoAdvanceState({ reset: true });
    return clamped;
  }

  getAutoAdvancePaused() {
    const settings = this.getFlashcardSettings();
    return !!settings.autoAdvancePaused;
  }

  setAutoAdvancePaused(paused) {
    const next = !!paused;
    this.setFlashcardSettings({ autoAdvancePaused: next });

    if (next) {
      // user paused it — clear any pending timer
      this.clearAutoAdvanceTimer();
    } else {
      // user resumed — start/restart timer
      this.ensureAutoAdvanceState({ reset: true });
    }

    this.updateAutoAdvanceToggleUi();
    return next;
  }

  toggleAutoAdvancePaused() {
    const next = !this.getAutoAdvancePaused();
    this.setAutoAdvancePaused(next);
    this.showToast(
      next ? "Auto-advance paused" : "Auto-advance resumed",
      "info",
    );
  }

  updateAutoAdvanceToggleUi() {
    // Ensure references exist (DOM may have been modified)
    if (!this.autoAdvanceToggleBtn)
      this.autoAdvanceToggleBtn = document.getElementById(
        "flashcardAutoAdvanceToggleBtn",
      );
    if (!this.autoAdvanceStatusEl)
      this.autoAdvanceStatusEl = document.getElementById("flashcardAutoStatus");
    if (!this.autoAdvanceWrapEl)
      this.autoAdvanceWrapEl = document.getElementById("flashcardAutoWrap");

    if (
      !this.autoAdvanceToggleBtn &&
      !this.autoAdvanceStatusEl &&
      !this.autoAdvanceWrapEl
    )
      return;

    const paused = this.getAutoAdvancePaused();
    const cards = this.getActiveSet()?.cards || [];
    const visible = this.isStudyMode() && cards.length > 1;

    // Get icon based on theme
    const pauseIcon = this._getIcon("⏸", { size: 16 });
    const playIcon = this._getIcon("▶", { size: 16 });

    if (this.autoAdvanceToggleBtn) {
      this.autoAdvanceToggleBtn.setAttribute(
        "aria-pressed",
        paused ? "true" : "false",
      );
      this.autoAdvanceToggleBtn.dataset.paused = paused ? "true" : "false";
      this.autoAdvanceToggleBtn.title = paused
        ? "Resume auto-advance"
        : "Pause auto-advance";
      this.autoAdvanceToggleBtn.innerHTML = `<span class="auto-icon" aria-hidden="true">${
        paused ? playIcon : pauseIcon
      }</span>`;

      this.autoAdvanceToggleBtn.disabled = !visible;
      this.autoAdvanceToggleBtn.style.display = visible ? "" : "none";
    }

    if (this.autoAdvanceStatusEl) {
      this.autoAdvanceStatusEl.textContent = paused ? "Paused" : "Auto";
      this.autoAdvanceStatusEl.style.display = visible ? "" : "none";
    }

    if (this.autoAdvanceWrapEl) {
      this.autoAdvanceWrapEl.style.display = visible ? "" : "none";
    }
  }

  applyModeToDashboard() {
    const mode = this.getMode();

    if (this.flipCardEl) {
      this.flipCardEl.classList.toggle(
        "flashcard-mode-study",
        mode === "study",
      );

      if (mode === "study") {
        this.flipCardEl.setAttribute("aria-disabled", "true");
        this.flipCardEl.setAttribute("tabindex", "-1");
        this.flipCardEl.setAttribute("aria-label", "Flashcard (study mode)");
      } else {
        this.flipCardEl.removeAttribute("aria-disabled");
        this.flipCardEl.setAttribute("tabindex", "0");
        this.flipCardEl.setAttribute("aria-label", "Flip flashcard");
      }
    }

    if (this.modeToggleBtn) {
      this.modeToggleBtn.dataset.mode = mode;
      const iconEmoji = mode === "study" ? "📖" : "❓";
      const icon = this._getIcon(iconEmoji, { size: 16 });
      const nextTitle =
        mode === "study" ? "Switch to Quiz mode" : "Switch to Study mode";
      this.modeToggleBtn.innerHTML = `<span class="mode-icon" aria-hidden="true">${icon}</span>`;
      this.modeToggleBtn.title = nextTitle;
      this.modeToggleBtn.setAttribute("aria-label", nextTitle);
      this.modeToggleBtn.setAttribute(
        "aria-pressed",
        mode === "study" ? "true" : "false",
      );
    }

    // Update auto-advance toggle UI to reflect paused state and mode
    this.updateAutoAdvanceToggleUi();
  }

  clearAutoAdvanceTimer() {
    if (this._autoAdvanceTimer) {
      clearTimeout(this._autoAdvanceTimer);
      this._autoAdvanceTimer = null;
    }
  }

  ensureAutoAdvanceState({ reset = false } = {}) {
    const isStudy = this.isStudyMode();
    const activeSet = this.getActiveSet();
    const cards = activeSet?.cards || [];
    const paused = this.getAutoAdvancePaused() || this._hoverPauseAutoAdvance;

    // Do not run auto-advance when not in study mode, only one card exists, or user paused it.
    if (!isStudy || cards.length <= 1 || paused) {
      this.clearAutoAdvanceTimer();
      return;
    }

    const seconds = this.getStudyAutoAdvanceSeconds();

    if (reset) {
      this.clearAutoAdvanceTimer();
    }

    if (this._autoAdvanceTimer) return;

    this._autoAdvanceTimer = setTimeout(() => {
      this._autoAdvanceTimer = null;
      // Uses the same path as manual navigation so timing stays consistent.
      this.gotoNextCard();
    }, seconds * 1000);
  }
});

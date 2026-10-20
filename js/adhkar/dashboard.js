/**
 * AdhkarManager: dashboard rendering and navigation.
 * Part of the class declared in js/adhkar/index.js; load this after it.
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
})(AdhkarManager.prototype, class {

  bindDashboardEvents() {
    if (this.prevBtn) {
      this.prevBtn.addEventListener("click", () => this.gotoPrevCard());
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener("click", () => this.gotoNextCard());
    }

    if (this.scriptToggleBtn) {
      this.scriptToggleBtn.addEventListener("click", () => this.toggleScript());
    }

    if (this.fontFamilyBtn && this.fontFamilyBtn.dataset.bound !== "true") {
      this.fontFamilyBtn.dataset.bound = "true";
      this.fontFamilyBtn.addEventListener("click", () => {
        this.openFontPickerModal();
      });
    }

    if (
      this.fontScaleDecreaseBtn &&
      this.fontScaleDecreaseBtn.dataset.bound !== "true"
    ) {
      this.fontScaleDecreaseBtn.dataset.bound = "true";
      this.fontScaleDecreaseBtn.addEventListener("click", () => {
        this.adjustFontScale(-AdhkarManager.FONT_SCALE_STEP);
      });
    }

    if (
      this.fontScaleIncreaseBtn &&
      this.fontScaleIncreaseBtn.dataset.bound !== "true"
    ) {
      this.fontScaleIncreaseBtn.dataset.bound = "true";
      this.fontScaleIncreaseBtn.addEventListener("click", () => {
        this.adjustFontScale(AdhkarManager.FONT_SCALE_STEP);
      });
    }

    if (this.autoAdvanceToggleBtn) {
      this.autoAdvanceToggleBtn.addEventListener("click", () =>
        this.toggleAutoAdvancePaused(),
      );
    }

    // Jump controls
    if (this.jumpSliderEl) {
      this.jumpSliderEl.addEventListener("input", (e) => {
        const v = parseInt(e.target.value, 10);
        if (!Number.isFinite(v)) return;
        this.setCurrentCardIndex(v - 1);
      });
    }

    if (this.jumpInputEl) {
      this.jumpInputEl.addEventListener("change", (e) => {
        const v = parseInt(e.target.value, 10);
        if (!Number.isFinite(v)) return;
        this.setCurrentCardIndex(v - 1);
      });
    }

    // Keyboard navigation while focused within card
    if (this.cardEl) {
      this.cardEl.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          this.gotoPrevCard();
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          this.gotoNextCard();
        }
      });

      // Allow clicking or pressing Enter/Space on the header text to open the set selector modal
      const headerText = this.cardEl.querySelector("#adhkarHeaderText");
      if (headerText) {
        // Make header text keyboard-focusable and announce it as a button that opens a dialog
        headerText.setAttribute("tabindex", "0");
        headerText.setAttribute("role", "button");
        headerText.setAttribute("aria-haspopup", "dialog");
        headerText.setAttribute("aria-controls", "adhkarSetModal");
        headerText.setAttribute("title", "Select adhkar set");

        headerText.addEventListener("click", (e) => {
          e.preventDefault();
          this.openSetSelectorModal();
        });

        headerText.addEventListener("keydown", (e) => {
          if (
            e.key === "Enter" ||
            e.key === " " ||
            e.key === "Spacebar" ||
            e.key === "Space"
          ) {
            e.preventDefault();
            this.openSetSelectorModal();
          }
        });
      }

      if (this.cardEl.dataset.autoAdvanceHoverBound !== "true") {
        this.cardEl.dataset.autoAdvanceHoverBound = "true";

        this.cardEl.addEventListener("mouseenter", () => {
          this._hoverPauseAutoAdvance = true;
          this.clearAutoAdvanceTimer();
        });

        this.cardEl.addEventListener("mouseleave", () => {
          this._hoverPauseAutoAdvance = false;
          this.ensureAutoAdvanceState({ reset: true });
        });
      }
    }
  }

  prefersReducedMotion() {
    try {
      return (
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    } catch (e) {
      return false;
    }
  }

  cancelDashboardAnimation() {
    if (this._dashboardMidTimer) {
      clearTimeout(this._dashboardMidTimer);
      this._dashboardMidTimer = null;
    }
    if (this._dashboardEndTimer) {
      clearTimeout(this._dashboardEndTimer);
      this._dashboardEndTimer = null;
    }
    if (this.shellEl) {
      this.shellEl.classList.remove("adhkar-anim-next");
      this.shellEl.classList.remove("adhkar-anim-prev");
    }
    this._dashboardAnimating = false;
  }

  animateNavSwap(direction) {
    const activeSet = this.getActiveSet();
    const cards = activeSet?.cards || [];
    if (!cards.length) return;

    const isNext = direction === "next";
    const className = isNext ? "adhkar-anim-next" : "adhkar-anim-prev";

    const advance = () => {
      const nextIndex = isNext
        ? (this.currentCardIndex + 1) % cards.length
        : (this.currentCardIndex - 1 + cards.length) % cards.length;
      this.setCurrentCardIndex(nextIndex, { cancelAnimation: false });
    };

    if (this.prefersReducedMotion() || !this.shellEl) {
      advance();
      return;
    }

    this.cancelDashboardAnimation();
    this._dashboardAnimating = true;

    this.shellEl.classList.add(className);

    this._dashboardMidTimer = setTimeout(
      () => {
        advance();
      },
      Math.floor(AdhkarManager.NAV_ANIM_MS / 2),
    );

    this._dashboardEndTimer = setTimeout(() => {
      if (this.shellEl) this.shellEl.classList.remove(className);
      this._dashboardAnimating = false;
      this._dashboardMidTimer = null;
      this._dashboardEndTimer = null;
    }, AdhkarManager.NAV_ANIM_MS);
  }

  animateScriptToggleSwap() {
    if (this.prefersReducedMotion() || !this.shellEl) return;

    this.shellEl.classList.remove("adhkar-anim-script");
    // Force reflow so the animation restarts
    void this.shellEl.offsetWidth;
    this.shellEl.classList.add("adhkar-anim-script");

    if (this._scriptToggleTimer) clearTimeout(this._scriptToggleTimer);
    this._scriptToggleTimer = setTimeout(() => {
      if (this.shellEl) this.shellEl.classList.remove("adhkar-anim-script");
      this._scriptToggleTimer = null;
    }, AdhkarManager.SCRIPT_TOGGLE_ANIM_MS);
  }

  normalizeCurrentIndex() {
    const activeSet = this.getActiveSet();
    const cards = activeSet?.cards || [];
    const prev = this.currentCardIndex;
    if (!cards.length) {
      this.currentCardIndex = 0;
      if (prev !== this.currentCardIndex) this.persistCurrentCardIndex();
      return;
    }
    if (this.currentCardIndex < 0) this.currentCardIndex = 0;
    if (this.currentCardIndex > cards.length - 1) {
      this.currentCardIndex = cards.length - 1;
    }

    if (prev !== this.currentCardIndex) {
      this.persistCurrentCardIndex();
    }
  }

  updateJumpControls() {
    if (!this.jumpSliderEl || !this.jumpInputEl || !this.jumpLabelEl) return;

    const activeSet = this.getActiveSet();
    const cards = activeSet?.cards || [];
    const updateSliderProgress = () => {
      const min = parseInt(this.jumpSliderEl.min, 10);
      const max = parseInt(this.jumpSliderEl.max, 10);
      const value = parseInt(this.jumpSliderEl.value, 10);

      const safeMin = Number.isFinite(min) ? min : 1;
      const safeMax = Number.isFinite(max) ? max : safeMin + 1;
      const safeValue = Number.isFinite(value) ? value : safeMin;

      const range = Math.max(1, safeMax - safeMin);
      const progress = ((safeValue - safeMin) / range) * 100;
      const clampedProgress = Math.max(0, Math.min(100, progress));

      this.jumpSliderEl.style.setProperty(
        "--jump-progress",
        `${clampedProgress}%`,
      );
    };

    if (!cards.length) {
      this.jumpLabelEl.textContent = "0 / 0";
      this.jumpSliderEl.min = "1";
      this.jumpSliderEl.max = "1";
      this.jumpSliderEl.value = "1";
      this.jumpSliderEl.disabled = true;

      this.jumpInputEl.min = "1";
      this.jumpInputEl.max = "1";
      this.jumpInputEl.value = "1";
      this.jumpInputEl.disabled = true;
      updateSliderProgress();
      return;
    }

    const oneBased = Math.min(this.currentCardIndex + 1, cards.length);

    this.jumpLabelEl.textContent = `${oneBased} / ${cards.length}`;

    this.jumpSliderEl.disabled = cards.length <= 1;
    this.jumpSliderEl.min = "1";
    this.jumpSliderEl.max = String(cards.length);
    this.jumpSliderEl.value = String(oneBased);

    this.jumpInputEl.disabled = cards.length <= 1;
    this.jumpInputEl.min = "1";
    this.jumpInputEl.max = String(cards.length);
    this.jumpInputEl.value = String(oneBased);
    updateSliderProgress();
  }

  gotoNextCard() {
    this.animateNavSwap("next");
    this.ensureAutoAdvanceState({ reset: true });
  }

  gotoPrevCard() {
    this.animateNavSwap("prev");
    this.ensureAutoAdvanceState({ reset: true });
  }

  renderDashboard({ animateScriptToggle = false } = {}) {
    const activeSet = this.getActiveSet();
    const cards = activeSet?.cards || [];

    if (!this.topTextEl || !this.englishEl) return;

    this.normalizeCurrentIndex();

    // Update adhkar card header to show active set name centered in header
    if (this.cardEl) {
      const headerText = this.cardEl.querySelector("#adhkarHeaderText");
      if (headerText) {
        headerText.textContent =
          activeSet && activeSet.name ? String(activeSet.name) : "Adhkar";
      }
    }

    if (!cards.length) {
      this.topTextEl.textContent = "No adhkar yet";
      this.englishEl.textContent = "Add or import a set in Settings → Adhkar";

      if (this.prevBtn) this.prevBtn.disabled = true;
      if (this.nextBtn) this.nextBtn.disabled = true;

      if (this.scriptToggleBtn) {
        this.scriptToggleBtn.disabled = true;
        this.scriptToggleBtn.title = "No items";
        this.scriptToggleBtn.setAttribute("aria-pressed", "false");
        this.scriptToggleBtn.innerHTML =
          '<span class="mode-icon" aria-hidden="true">Aa</span>';
      }

      this.updateAutoAdvanceToggleUi();
      this.updateJumpControls();

      if (this.repeatEl) {
        this.repeatEl.hidden = true;
        this.repeatEl.textContent = "";
      }
      return;
    }

    if (this.prevBtn) this.prevBtn.disabled = false;
    if (this.nextBtn) this.nextBtn.disabled = false;

    const idx = Math.min(this.currentCardIndex, cards.length - 1);
    const card = cards[idx] || {};

    // --- Render Title ---
    if (this.titleEl) {
      this.titleEl.textContent = this.getCardTitle(card);
    }

    // --- Render Repeat badge (bottom-right) ---
    if (this.repeatEl) {
      const parsedRepeat = parseInt(card.repeat, 10);
      const repeat =
        Number.isFinite(parsedRepeat) && parsedRepeat > 0 ? parsedRepeat : 1;
      this.repeatEl.hidden = false;
      this.repeatEl.textContent = `${repeat}x`;
    }

    const showRoman = this.getShowRomanization();

    const topText = showRoman
      ? String(card.romanization || "(no romanization)")
      : String(card.arabic || "(no arabic)");

    // Get the translation based on selected language
    const translationText = this.getCardTranslation(card);

    this.topTextEl.textContent = topText;

    this.englishEl.textContent = translationText;

    const hasReference = !!(card.reference && String(card.reference).trim());
    if (this.referenceDividerEl) this.referenceDividerEl.hidden = !hasReference;
    if (this.referenceEl) {
      this.referenceEl.hidden = !hasReference;
      this.referenceEl.textContent = hasReference ? String(card.reference) : "";
    }

    if (!showRoman) {
      this.topTextEl.setAttribute("lang", "ar");
      this.topTextEl.setAttribute("dir", "rtl");
      this.topTextEl.classList.add("adhkar-top-arabic");
    } else {
      this.topTextEl.removeAttribute("lang");
      this.topTextEl.setAttribute("dir", "ltr");
      this.topTextEl.classList.remove("adhkar-top-arabic");
    }

    this.englishEl.setAttribute("dir", "ltr");

    if (this.scriptToggleBtn) {
      this.scriptToggleBtn.disabled = false;
      this.scriptToggleBtn.dataset.mode = showRoman ? "roman" : "arabic";
      this.scriptToggleBtn.setAttribute(
        "aria-pressed",
        showRoman ? "true" : "false",
      );
      const label = showRoman ? "Show Arabic" : "Show Romanization";
      this.scriptToggleBtn.title = label;
      this.scriptToggleBtn.setAttribute("aria-label", label);
      this.scriptToggleBtn.innerHTML =
        '<span class="mode-icon" aria-hidden="true">Aa</span>';
    }

    if (animateScriptToggle) {
      this.animateScriptToggleSwap();
    }

    this.updateAutoAdvanceToggleUi();
    this.updateJumpControls();
    this.updateLanguageSelectorButton();
  }
});

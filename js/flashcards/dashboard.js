/**
 * FlashcardManager: dashboard flip, navigation and rendering.
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

  bindDashboardEvents() {
    if (this.modeToggleBtn) {
      this.modeToggleBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.toggleMode();
      });
    }

    if (this.fontFamilyBtn && this.fontFamilyBtn.dataset.bound !== "true") {
      this.fontFamilyBtn.dataset.bound = "true";
      this.fontFamilyBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.openFontPickerModal();
      });
    }

    if (
      this.fontScaleDecreaseBtn &&
      this.fontScaleDecreaseBtn.dataset.bound !== "true"
    ) {
      this.fontScaleDecreaseBtn.dataset.bound = "true";
      this.fontScaleDecreaseBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.adjustFontScale(-FlashcardManager.FONT_SCALE_STEP);
      });
    }

    if (
      this.fontScaleIncreaseBtn &&
      this.fontScaleIncreaseBtn.dataset.bound !== "true"
    ) {
      this.fontScaleIncreaseBtn.dataset.bound = "true";
      this.fontScaleIncreaseBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.adjustFontScale(FlashcardManager.FONT_SCALE_STEP);
      });
    }

    if (this.prevBtn) {
      this.prevBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.gotoPrevCard();
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.gotoNextCard();
      });
    }

    const gotoOneBased = (oneBased) => {
      const activeSet = this.getActiveSet();
      const cards = activeSet?.cards || [];
      if (!cards.length) return;

      const n = this.clampNumber(parseInt(oneBased, 10), 1, cards.length, 1);
      this.setCurrentCardIndex(n - 1);
    };

    if (this.jumpSliderEl) {
      this.jumpSliderEl.addEventListener("input", (e) => {
        gotoOneBased(e.target.value);
      });
    }

    if (this.jumpInputEl) {
      const onCommit = () => {
        gotoOneBased(this.jumpInputEl.value);
      };

      this.jumpInputEl.addEventListener("change", onCommit);
      this.jumpInputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onCommit();
        }
      });
    }

    if (this.flipCardEl) {
      this.flipCardEl.addEventListener("click", (e) => {
        // Avoid flipping when clicking nav buttons (they are siblings, but be safe)
        const targetBtn = e.target.closest("button");
        if (targetBtn) return;

        // If the user is selecting/copying text, don't treat it as a flip.
        const selection = window.getSelection?.();
        if (
          selection &&
          !selection.isCollapsed &&
          selection.toString().trim()
        ) {
          return;
        }
        this.toggleFlip();
      });

      this.flipCardEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.toggleFlip();
        }
      });
    }

    // Re-query auto-advance elements (safe if DOM was modified)
    if (!this.autoAdvanceToggleBtn)
      this.autoAdvanceToggleBtn = document.getElementById(
        "flashcardAutoAdvanceToggleBtn",
      );
    if (!this.autoAdvanceStatusEl)
      this.autoAdvanceStatusEl = document.getElementById("flashcardAutoStatus");

    if (this.autoAdvanceToggleBtn) {
      this.autoAdvanceToggleBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.toggleAutoAdvancePaused();
      });

      this.autoAdvanceToggleBtn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.toggleAutoAdvancePaused();
        }
      });
    }

    if (this.cardEl && this.cardEl.dataset.autoAdvanceHoverBound !== "true") {
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

  toggleFlip() {
    if (this.isStudyMode()) return;
    this.animateFlipSwap();
  }

  prefersReducedMotion() {
    try {
      return !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    } catch {
      return false;
    }
  }

  cancelDashboardAnimation() {
    if (this._dashboardMidTimer) clearTimeout(this._dashboardMidTimer);
    if (this._dashboardEndTimer) clearTimeout(this._dashboardEndTimer);
    this._dashboardMidTimer = null;
    this._dashboardEndTimer = null;
    this._dashboardAnimating = false;

    if (this.flipCardEl) {
      this.flipCardEl.classList.remove(
        "flashcard-anim-flip",
        "flashcard-anim-next",
        "flashcard-anim-prev",
      );
    }
  }

  animateFlipSwap() {
    // Vertical flip animation + swap at midpoint.
    if (this.prefersReducedMotion() || !this.flipCardEl) {
      this.isFlipped = !this.isFlipped;
      this.renderDashboard();
      return;
    }

    // Restart cleanly on rapid clicks
    this.cancelDashboardAnimation();
    this._dashboardAnimating = true;

    this.flipCardEl.classList.add("flashcard-anim-flip");

    this._dashboardMidTimer = setTimeout(
      () => {
        this.isFlipped = !this.isFlipped;
        this.renderDashboard();
      },
      Math.floor(FlashcardManager.FLIP_ANIM_MS / 2),
    );

    this._dashboardEndTimer = setTimeout(() => {
      if (this.flipCardEl)
        this.flipCardEl.classList.remove("flashcard-anim-flip");
      this._dashboardAnimating = false;
      this._dashboardMidTimer = null;
      this._dashboardEndTimer = null;
    }, FlashcardManager.FLIP_ANIM_MS);
  }

  animateNavSwap(direction) {
    const activeSet = this.getActiveSet();
    const cards = activeSet?.cards || [];
    if (!cards.length) return;

    const isNext = direction === "next";
    const className = isNext ? "flashcard-anim-next" : "flashcard-anim-prev";

    const advance = () => {
      const nextIndex = isNext
        ? (this.currentCardIndex + 1) % cards.length
        : (this.currentCardIndex - 1 + cards.length) % cards.length;
      // Do not cancel animation while it's in-flight.
      this.setCurrentCardIndex(nextIndex, {
        resetFlip: true,
        cancelAnimation: false,
      });
    };

    if (this.prefersReducedMotion() || !this.flipCardEl) {
      advance();
      return;
    }

    // Restart animation cleanly on rapid clicks
    this.cancelDashboardAnimation();

    // Always start nav animation from the front face to avoid transform conflicts.
    if (this.isFlipped) {
      this.isFlipped = false;
      this.renderDashboard();
    }

    this._dashboardAnimating = true;

    this.flipCardEl.classList.add(className);

    this._dashboardMidTimer = setTimeout(
      () => {
        advance();
      },
      Math.floor(FlashcardManager.NAV_ANIM_MS / 2),
    );

    this._dashboardEndTimer = setTimeout(() => {
      if (this.flipCardEl) this.flipCardEl.classList.remove(className);
      this._dashboardAnimating = false;
      this._dashboardMidTimer = null;
      this._dashboardEndTimer = null;
    }, FlashcardManager.NAV_ANIM_MS);
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

  renderDashboard() {
    const activeSet = this.getActiveSet();
    const cards = activeSet?.cards || [];

    if (!this.questionEl || !this.answerEl) return;

    this.applyModeToDashboard();
    const isStudy = this.isStudyMode();
    if (isStudy) this.isFlipped = false;

    this.normalizeCurrentIndex();

    if (!cards.length) {
      this.questionEl.textContent = "No flashcards yet";
      this.answerEl.textContent = "Import CSV in Settings → Flashcards";
      this.applyTextLanguageStyling(
        this.questionEl,
        this.questionEl.textContent,
      );
      this.applyTextLanguageStyling(this.answerEl, this.answerEl.textContent);
      if (this.prevBtn) this.prevBtn.disabled = true;
      if (this.nextBtn) this.nextBtn.disabled = true;
      if (this.flipCardEl) {
        // Keep the physical card facing forward; we swap text instead.
        this.flipCardEl.classList.remove("is-flipped");
      }

      this.ensureAutoAdvanceState();
      this.updateJumpControls();
      return;
    }

    const idx = Math.min(this.currentCardIndex, cards.length - 1);
    const card = cards[idx];

    if (isStudy) {
      this.questionEl.textContent = card.question || "(empty question)";
      this.answerEl.textContent = card.answer || "(empty answer)";

      this.questionEl.classList.remove("flashcard-answer");
      this.questionEl.classList.add("flashcard-question");
      this.answerEl.classList.remove("flashcard-question");
      this.answerEl.classList.add("flashcard-answer");
    } else {
      const frontText = this.isFlipped ? card.answer : card.question;
      const backText = this.isFlipped ? card.question : card.answer;

      const frontFallback = this.isFlipped
        ? "(empty answer)"
        : "(empty question)";
      const backFallback = this.isFlipped
        ? "(empty question)"
        : "(empty answer)";

      this.questionEl.textContent = frontText || frontFallback;
      this.answerEl.textContent = backText || backFallback;

      // Ensure the visible face uses the correct typography.
      if (this.isFlipped) {
        this.questionEl.classList.remove("flashcard-question");
        this.questionEl.classList.add("flashcard-answer");
        this.answerEl.classList.remove("flashcard-answer");
        this.answerEl.classList.add("flashcard-question");
      } else {
        this.questionEl.classList.remove("flashcard-answer");
        this.questionEl.classList.add("flashcard-question");
        this.answerEl.classList.remove("flashcard-question");
        this.answerEl.classList.add("flashcard-answer");
      }
    }

    this.applyTextLanguageStyling(this.questionEl, this.questionEl.textContent);
    this.applyTextLanguageStyling(this.answerEl, this.answerEl.textContent);

    if (this.prevBtn) this.prevBtn.disabled = cards.length <= 1;
    if (this.nextBtn) this.nextBtn.disabled = cards.length <= 1;

    if (this.flipCardEl) {
      // Keep the physical card facing forward; we swap text instead.
      this.flipCardEl.classList.remove("is-flipped");
    }

    this.ensureAutoAdvanceState();
    this.updateJumpControls();
    this.updateAutoAdvanceToggleUi();
  }
});

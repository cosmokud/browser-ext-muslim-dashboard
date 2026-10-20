/**
 * FlashcardManager, part 2 of 3.
 * Moved out of js/flashcards.js at method boundaries, so no single file carries the
 * whole class. The class itself is declared in js/flashcards.js; load this after it.
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

  async init() {
    await this.ensureDefaultSet();
    this.applyArabicFontFamily(this.getFlashcardSettings().arabicFontFamily, {
      persist: false,
    });
    this.applyTranslationFontFamily(
      this.getFlashcardSettings().translationFontFamily,
      { persist: false },
    );
    this.applyTypography();
    this.createSetSelectorButton();
    this.createSetSelectorModal();
    this.createFontPickerModal();
    this.bindDashboardEvents();
    this.restoreCurrentCardIndexForActiveSet();
    this.applyModeToDashboard();
    this.renderDashboard();
    this.ensureAutoAdvanceState({ reset: true });
  }

  getStoredCustomSets() {
    const stored = this.storage.get("flashcardSets", []);
    if (!Array.isArray(stored)) return [];
    return stored.filter((set) => set && !this.isProtectedSetId(set.id));
  }

  getSets() {
    const defaults = Array.isArray(this.defaultSets) ? this.defaultSets : [];
    const customSets = this.getStoredCustomSets();
    const merged = [...defaults, ...customSets];
    const byId = new Map();

    for (const set of merged) {
      const id = String(set?.id || "");
      if (!id) continue;
      byId.set(id, set);
    }

    return [...byId.values()];
  }

  saveSets(sets) {
    const customSets = Array.isArray(sets)
      ? sets.filter((set) => set && !this.isProtectedSetId(set.id))
      : [];
    return this.storage.set("flashcardSets", customSets);
  }

  getFlashcardSettings() {
    const settings = this.storage.getSettings();
    const flashcards = settings.flashcards || {};
    return flashcards;
  }

  setFlashcardSettings(updates) {
    const settings = this.storage.getSettings();
    const current = settings.flashcards || {};
    settings.flashcards = { ...current, ...updates };
    this.storage.saveSettings(settings);
  }

  getActiveSetId() {
    return this.getFlashcardSettings().activeSetId || null;
  }

  setActiveSetId(setId) {
    this.setFlashcardSettings({ activeSetId: setId });
  }

  getActiveSet() {
    const sets = this.getSets();
    const activeId = this.getActiveSetId();
    if (!sets.length) return null;
    return sets.find((s) => s.id === activeId) || sets[0];
  }

  getCardIndexBySet() {
    const map = this.storage.get("flashcardCardIndexBySet", {});
    return map && typeof map === "object" && !Array.isArray(map) ? map : {};
  }

  saveCardIndexBySet(map) {
    return this.storage.set("flashcardCardIndexBySet", map);
  }

  getSavedCardIndexForSet(setId) {
    if (!setId) return 0;
    const map = this.getCardIndexBySet();
    const raw = map[setId];
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  persistCurrentCardIndex() {
    const active = this.getActiveSet();
    if (!active) return;
    const map = this.getCardIndexBySet();
    map[active.id] = this.currentCardIndex;
    this.saveCardIndexBySet(map);
  }

  clearSavedCardIndexForSet(setId) {
    if (!setId) return;
    const map = this.getCardIndexBySet();
    if (Object.prototype.hasOwnProperty.call(map, setId)) {
      delete map[setId];
      this.saveCardIndexBySet(map);
    }
  }

  restoreCurrentCardIndexForActiveSet() {
    const active = this.getActiveSet();
    if (!active) {
      this.currentCardIndex = 0;
      return;
    }
    this.currentCardIndex = this.getSavedCardIndexForSet(active.id);
    this.normalizeCurrentIndex();
  }

  setCurrentCardIndex(
    nextIndex,
    { resetFlip = true, cancelAnimation = true } = {},
  ) {
    const activeSet = this.getActiveSet();
    const cards = activeSet?.cards || [];

    const prev = this.currentCardIndex;
    if (!cards.length) {
      this.currentCardIndex = 0;
    } else {
      const clamped = this.clampNumber(
        parseInt(nextIndex, 10),
        0,
        cards.length - 1,
        0,
      );
      this.currentCardIndex = clamped;
    }

    if (resetFlip) this.isFlipped = false;
    if (cancelAnimation) this.cancelDashboardAnimation();

    if (this.currentCardIndex !== prev) {
      this.persistCurrentCardIndex();
    }

    this.renderDashboard();
    this.ensureAutoAdvanceState({ reset: true });
  }

  normalizeMode(mode) {
    return mode === "quiz" ? "quiz" : "study";
  }

  getMode() {
    const settings = this.getFlashcardSettings();
    return this.normalizeMode(settings.mode);
  }

  isStudyMode() {
    return this.getMode() === "study";
  }

  setMode(mode) {
    const next = this.normalizeMode(mode);
    this.setFlashcardSettings({ mode: next });

    // Study mode doesn't flip; keep the card in a consistent state.
    this.isFlipped = false;
    this.cancelDashboardAnimation();
    this.applyModeToDashboard();
    this.renderDashboard();
    this.ensureAutoAdvanceState({ reset: true });
  }

  toggleMode() {
    const current = this.getMode();
    this.setMode(current === "study" ? "quiz" : "study");
  }

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

  async ensureDefaultSet() {
    const defs = Array.isArray(FlashcardManager.DEFAULT_SETS)
      ? FlashcardManager.DEFAULT_SETS
      : [
          {
            id: "default_99names_ar",
            name: "99 Names of Allah (Arabic)",
            file: "data/flashcard_99names_ar.csv",
            parser: "pipe",
          },
        ];

    const loadedDefaults = [];
    for (const def of defs) {
      loadedDefaults.push(await this.loadDefaultSet(def));
    }
    this.defaultSets = loadedDefaults;

    // Migration cleanup: remove legacy stored copies of protected default sets.
    const stored = this.storage.get("flashcardSets", []);
    if (Array.isArray(stored)) {
      const cleaned = stored.filter((set) => !this.isProtectedSetId(set?.id));
      if (cleaned.length !== stored.length) {
        this.storage.set("flashcardSets", cleaned);
      }
    }

    const sets = this.getSets();
    if (!sets.length) return;

    // Ensure active set is valid; prefer 99 Names (Arabic) when available.
    const activeId = this.getActiveSetId();
    if (!activeId || !sets.some((s) => s.id === activeId)) {
      const preferredId = "default_99names_ar";
      const preferredExists = sets.some((s) => s.id === preferredId);
      this.setActiveSetId(preferredExists ? preferredId : sets[0]?.id || null);
    }
  }

  async loadDefaultSet(def) {
    const now = new Date().toISOString();
    let cards = [];

    try {
      const text = await this.fetchTextResource(def.file, {
        cache: "no-store",
        label: `Flashcards default set ${def?.id || "unknown"}`,
      });
      cards =
        def.parser === "pipe"
          ? this.parsePipeTwoColumns(text)
          : this.parseCsvTwoColumns(text);
    } catch (e) {
      console.error(`Flashcards: failed to load default set ${def?.id}`, e);
    }

    return {
      id: def.id,
      name: def.name,
      createdAt: now,
      cards,
    };
  }

  async refreshDefaultSets() {
    await this.ensureDefaultSet();
    this.restoreCurrentCardIndexForActiveSet();
    this.renderDashboard();
    this.renderSettings();
    this.ensureAutoAdvanceState({ reset: true });
  }

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

  bindSettingsElements() {
    this.settingsSetSelect = document.getElementById("flashcardsSetSelect");
    this.settingsImportBtn = document.getElementById("flashcardsImportBtn");
    this.settingsExportBtn = document.getElementById("flashcardsExportBtn");
    this.settingsDeleteSetBtn = document.getElementById(
      "flashcardsDeleteSetBtn",
    );
    this.settingsNewSetBtn = document.getElementById("flashcardsNewSetBtn");
    this.settingsImportInput = document.getElementById("flashcardsImportInput");
    this.settingsAddCardBtn = document.getElementById("flashcardsAddCardBtn");
    this.settingsList = document.getElementById("flashcardsEditorList");
    this.settingsPagination = document.getElementById("flashcardsPagination");
    this.settingsMeta = document.getElementById("flashcardsMeta");

    this.settingsModeSelect = document.getElementById("flashcardsModeSelect");
    this.settingsStudyAutoAdvanceSeconds = document.getElementById(
      "flashcardsStudyAutoAdvanceSeconds",
    );

    this.settingsQuestionFontSize = document.getElementById(
      "flashcardsQuestionFontSize",
    );
    this.settingsQuestionFontSizeValue = document.getElementById(
      "flashcardsQuestionFontSizeValue",
    );
    this.settingsAnswerFontSize = document.getElementById(
      "flashcardsAnswerFontSize",
    );
    this.settingsAnswerFontSizeValue = document.getElementById(
      "flashcardsAnswerFontSizeValue",
    );
  }

  ensureSettingsBound() {
    this.bindSettingsElements();

    if (!this.settingsSetSelect || !this.settingsList) return false;

    // Prevent duplicate binding
    if (this.settingsSetSelect.dataset.bound === "true") return true;
    this.settingsSetSelect.dataset.bound = "true";

    this.settingsSetSelect.addEventListener("change", () => {
      const id = this.settingsSetSelect.value;
      this.setActiveSetId(id);
      this.settingsPage = 1;
      this.isFlipped = false;
      this.restoreCurrentCardIndexForActiveSet();
      this.renderSettings();
      this.renderDashboard();
      this.ensureAutoAdvanceState({ reset: true });
    });

    const bindTypography = () => {
      if (!this.settingsQuestionFontSize || !this.settingsAnswerFontSize)
        return;

      if (this.settingsQuestionFontSize.dataset.bound === "true") return;
      this.settingsQuestionFontSize.dataset.bound = "true";

      const onUpdate = () => {
        const q = this.clampNumber(
          parseInt(this.settingsQuestionFontSize.value, 10),
          12,
          144,
          22,
        );
        const a = this.clampNumber(
          parseInt(this.settingsAnswerFontSize.value, 10),
          12,
          144,
          18,
        );
        this.setFlashcardSettings({ questionFontSize: q, answerFontSize: a });
        this.applyTypography();
        this.updateTypographyLabels(q, a);
      };

      this.settingsQuestionFontSize.addEventListener("input", onUpdate);
      this.settingsAnswerFontSize.addEventListener("input", onUpdate);
    };

    bindTypography();

    if (this.settingsModeSelect) {
      this.settingsModeSelect.addEventListener("change", () => {
        const mode = this.normalizeMode(this.settingsModeSelect.value);
        this.setMode(mode);
        this.renderSettings();
      });
    }

    if (this.settingsStudyAutoAdvanceSeconds) {
      this.settingsStudyAutoAdvanceSeconds.addEventListener("change", () => {
        const seconds = this.setStudyAutoAdvanceSeconds(
          this.settingsStudyAutoAdvanceSeconds.value,
        );
        this.settingsStudyAutoAdvanceSeconds.value = String(seconds);
      });
    }

    if (this.settingsImportBtn && this.settingsImportInput) {
      this.settingsImportBtn.addEventListener("click", () => {
        this.settingsImportInput.value = "";
        this.settingsImportInput.click();
      });

      this.settingsImportInput.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await this.importCardsFile(file);
      });
    }

    if (this.settingsExportBtn) {
      this.settingsExportBtn.addEventListener("click", () => {
        this.exportActiveSetCsv();
      });
    }

    if (this.settingsDeleteSetBtn) {
      this.settingsDeleteSetBtn.addEventListener("click", () => {
        this.deleteActiveSet();
      });
    }

    if (this.settingsNewSetBtn) {
      this.settingsNewSetBtn.addEventListener("click", () => {
        this.createNewSet();
      });
    }

    if (this.settingsAddCardBtn) {
      this.settingsAddCardBtn.addEventListener("click", () => {
        this.addCardToActiveSet();
      });
    }

    // Inline editor events (delegation)
    this.settingsList.addEventListener("input", (e) => {
      if (this.isDefaultActiveSet()) return;

      if (e.target && e.target.classList?.contains("flashcard-textarea")) {
        this.autoResizeTextarea(e.target);
      }

      const row = e.target.closest(".flashcard-row");
      if (!row) return;

      const cardIndex = Number(row.dataset.index);
      const field = e.target.dataset.field;
      if (!Number.isFinite(cardIndex) || !field) return;

      this.updateCardField(cardIndex, field, e.target.value);
    });

    this.settingsList.addEventListener("click", (e) => {
      if (this.isDefaultActiveSet()) return;
      const btn = e.target.closest("button");
      if (!btn) return;
      const action = btn.dataset.action;
      if (action !== "delete-card") return;
      const row = btn.closest(".flashcard-row");
      if (!row) return;
      const cardIndex = Number(row.dataset.index);
      if (!Number.isFinite(cardIndex)) return;
      this.deleteCardAtIndex(cardIndex);
    });

    return true;
  }

  renderSettings() {
    if (!this.ensureSettingsBound()) return;

    const sets = this.getSets();
    const active = this.getActiveSet();

    // Populate dropdown
    this.settingsSetSelect.innerHTML = "";
    sets.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = this.isProtectedSetId(s.id)
        ? this._getLockedOptionLabel(s.name)
        : s.name;
      this.settingsSetSelect.appendChild(opt);
    });

    if (active) {
      this.settingsSetSelect.value = active.id;
    }

    this._settingsReadOnly = this.isProtectedSetId(active?.id);

    if (this.settingsDeleteSetBtn) {
      this.settingsDeleteSetBtn.disabled = this._settingsReadOnly;
      this.settingsDeleteSetBtn.title = this._settingsReadOnly
        ? "This default set cannot be deleted"
        : "Delete set";
    }

    if (this.settingsAddCardBtn) {
      this.settingsAddCardBtn.disabled = this._settingsReadOnly;
      this.settingsAddCardBtn.title = this._settingsReadOnly
        ? "This default set cannot be edited"
        : "Add card";
    }

    // Meta
    const totalCards = active?.cards?.length || 0;
    const totalSets = sets.length;
    if (this.settingsMeta) {
      this.settingsMeta.textContent = `${totalCards} cards • ${totalSets}/${FlashcardManager.MAX_SETS} sets`;
    }

    // Typography
    const t = this.getTypography();
    if (this.settingsQuestionFontSize)
      this.settingsQuestionFontSize.value = String(t.question);
    if (this.settingsAnswerFontSize)
      this.settingsAnswerFontSize.value = String(t.answer);
    this.updateTypographyLabels(t.question, t.answer);
    this.applyTypography();

    if (this.settingsModeSelect) {
      this.settingsModeSelect.value = this.getMode();
    }

    if (this.settingsStudyAutoAdvanceSeconds) {
      this.settingsStudyAutoAdvanceSeconds.value = String(
        this.getStudyAutoAdvanceSeconds(),
      );
    }

    this.renderEditorList();
    this.renderPagination();
  }

  renderEditorList() {
    const active = this.getActiveSet();
    const cards = active?.cards || [];
    const isDefault = this.isProtectedSetId(active?.id);
    const readOnly = this._settingsReadOnly || isDefault;

    if (!this.settingsList) return;

    if (isDefault) {
      this.settingsList.innerHTML = `
        <div class="adhkar-default-notice">
          <div class="adhkar-default-notice-icon">${this._getIcon("🔒", {
            size: 24,
          })}</div>
          <div class="adhkar-default-notice-title">Default Flashcard Set</div>
          <div class="adhkar-default-notice-text">
            This is a protected default set and cannot be edited or deleted.
            Create a custom set to add your own flashcards.
          </div>
          <button class="setting-btn adhkar-default-notice-btn" type="button" id="flashcardsCreateCustomBtn">
            ${this._getIcon("➕", { size: 16 })} Create Custom Set
          </button>
        </div>
      `;

      const createBtn = this.settingsList.querySelector(
        "#flashcardsCreateCustomBtn",
      );
      if (createBtn) {
        createBtn.addEventListener("click", () => this.createNewSet());
      }
      return;
    }

    const total = cards.length;
    const pageSize = this.getSettingsPageSize();
    const pages = Math.max(1, Math.ceil(total / pageSize));
    this.settingsPage = Math.min(Math.max(1, this.settingsPage), pages);

    const start = (this.settingsPage - 1) * pageSize;
    const end = Math.min(total, start + pageSize);

    if (!cards.length) {
      this.settingsList.innerHTML = `
        <div class="quotes-empty">
          <div class="quotes-empty-title">No flashcards in this set</div>
          <div class="quotes-empty-hint">Use “Add Card” or import CSV.</div>
        </div>
      `;
      return;
    }

    const rows = [];
    for (let i = start; i < end; i += 1) {
      const c = cards[i] || { question: "", answer: "" };
      rows.push(`
        <div class="flashcard-row" data-index="${i}">
          <div class="flashcard-row-index">${i + 1}</div>
          <textarea
            class="flashcard-cell flashcard-textarea setting-input"
            data-field="question"
            rows="1"
            placeholder="Question"
            maxlength="500"
            ${readOnly ? "disabled" : ""}
          >${this.escapeHtmlAttr(c.question || "")}</textarea>
          <textarea
            class="flashcard-cell flashcard-textarea setting-input"
            data-field="answer"
            rows="1"
            placeholder="Answer"
            maxlength="1000"
            ${readOnly ? "disabled" : ""}
          >${this.escapeHtmlAttr(c.answer || "")}</textarea>
          <button
            class="flashcard-row-delete"
            type="button"
            data-action="delete-card"
            title="Delete"
            aria-label="Delete card"
            ${readOnly ? "disabled" : ""}
          >
            ×
          </button>
        </div>
      `);
    }

    this.settingsList.innerHTML = `
      <div class="flashcard-editor-header">
        <div>#</div>
        <div>Question</div>
        <div>Answer</div>
        <div></div>
      </div>
      <div class="flashcard-editor-body">
        ${rows.join("")}
      </div>
    `;

    this.autoResizeAllTextareas();
  }

  applyTypography() {
    if (!this.cardEl) return;
    const t = this.getTypography();
    const scale = this.getFontScale();
    const question = this.scaleTypographyValue(t.question, scale);
    const answer = this.scaleTypographyValue(t.answer, scale);
    this.cardEl.style.setProperty(
      "--flashcard-question-font-size",
      `${question}px`,
    );
    this.cardEl.style.setProperty(
      "--flashcard-answer-font-size",
      `${answer}px`,
    );
    this.updateFontScaleButtons();
  }

  getTypography() {
    const settings = this.getFlashcardSettings();
    return {
      question: this.clampNumber(
        parseInt(settings.questionFontSize, 10),
        12,
        144,
        22,
      ),
      answer: this.clampNumber(
        parseInt(settings.answerFontSize, 10),
        12,
        144,
        18,
      ),
    };
  }

  getFontScale() {
    const settings = this.getFlashcardSettings();
    const raw = settings.fontScale;
    const parsed = parseFloat(raw);
    const scale = Number.isFinite(parsed) ? parsed : 1;
    return this.clampNumber(
      scale,
      FlashcardManager.FONT_SCALE_MIN,
      FlashcardManager.FONT_SCALE_MAX,
      1,
    );
  }

  normalizeScale(scale) {
    if (!Number.isFinite(scale)) return 1;
    return Math.round(scale * 10) / 10;
  }

  scaleTypographyValue(value, scale) {
    const scaled = value * scale;
    return Math.round(scaled * 10) / 10;
  }

  setFontScale(scale) {
    const normalized = this.clampNumber(
      this.normalizeScale(parseFloat(scale)),
      FlashcardManager.FONT_SCALE_MIN,
      FlashcardManager.FONT_SCALE_MAX,
      1,
    );
    this.setFlashcardSettings({ fontScale: normalized });
    this.applyTypography();
  }

  adjustFontScale(delta) {
    const next = this.getFontScale() + delta;
    this.setFontScale(next);
  }

  updateFontScaleButtons() {
    const scale = this.getFontScale();
    const label = `${scale.toFixed(1)}x`;

    if (this.fontScaleDecreaseBtn) {
      this.fontScaleDecreaseBtn.disabled =
        scale <= FlashcardManager.FONT_SCALE_MIN + 0.001;
      this.fontScaleDecreaseBtn.title = `Decrease font size (${label})`;
      this.fontScaleDecreaseBtn.setAttribute(
        "aria-label",
        `Decrease flashcard font size (${label})`,
      );
    }

    if (this.fontScaleIncreaseBtn) {
      this.fontScaleIncreaseBtn.disabled =
        scale >= FlashcardManager.FONT_SCALE_MAX - 0.001;
      this.fontScaleIncreaseBtn.title = `Increase font size (${label})`;
      this.fontScaleIncreaseBtn.setAttribute(
        "aria-label",
        `Increase flashcard font size (${label})`,
      );
    }
  }

  updateTypographyLabels(question, answer) {
    if (this.settingsQuestionFontSizeValue)
      this.settingsQuestionFontSizeValue.textContent = `${question}px`;
    if (this.settingsAnswerFontSizeValue)
      this.settingsAnswerFontSizeValue.textContent = `${answer}px`;
  }

  containsArabicText(value) {
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(
      String(value || ""),
    );
  }

  applyTextLanguageStyling(element, textValue) {
    if (!element) return;
    const isArabic = this.containsArabicText(textValue);
    element.classList.toggle("flashcard-text-arabic", isArabic);

    if (isArabic) {
      element.setAttribute("lang", "ar");
      element.setAttribute("dir", "rtl");
      return;
    }

    element.removeAttribute("lang");
    element.setAttribute("dir", "auto");
  }

  normalizeArabicFontFamily(value) {
    const v = String(value || "").trim();
    if (FlashcardManager.ARABIC_FONT_FAMILIES.includes(v)) return v;
    return "Noto Naskh Arabic";
  }

  normalizeTranslationFontFamily(value) {
    const v = String(value || "").trim();
    if (FlashcardManager.TRANSLATION_FONT_FAMILIES.includes(v)) return v;
    return "Poppins";
  }

  resolveTranslationFontCssValue(fontFamily) {
    if (fontFamily === "Georgia") return '"Georgia", serif';
    if (fontFamily === "Courier New") return '"Courier New", monospace';
    if (fontFamily === "Cascadia Code") {
      return '"Cascadia Code", "JetBrains Mono", Consolas, monospace';
    }
    return `"${fontFamily}", var(--font-primary)`;
  }

  applyArabicFontFamily(fontFamily, opts = {}) {
    const { persist = false } = opts;
    const normalized = this.normalizeArabicFontFamily(fontFamily);
    this._arabicFontFamily = normalized;

    if (this.cardEl) {
      const cssValue = `"${normalized}", var(--font-arabic)`;
      this.cardEl.style.setProperty("--flashcard-arabic-font-family", cssValue);
    }

    if (this.fontFamilyBtn) {
      const title = `Change Arabic font (current: ${normalized})`;
      this.fontFamilyBtn.title = title;
      this.fontFamilyBtn.setAttribute("aria-label", title);
    }

    if (persist) {
      this.setFlashcardSettings({ arabicFontFamily: normalized });
    }
  }

  applyTranslationFontFamily(fontFamily, opts = {}) {
    const { persist = false } = opts;
    const normalized = this.normalizeTranslationFontFamily(fontFamily);
    this._translationFontFamily = normalized;

    if (this.cardEl) {
      this.cardEl.style.setProperty(
        "--flashcard-translation-font-family",
        this.resolveTranslationFontCssValue(normalized),
      );
    }

    if (persist) {
      this.setFlashcardSettings({ translationFontFamily: normalized });
    }
  }

  createFontPickerModal() {
    if (document.getElementById("flashcardFontModal")) return;

    const modal = document.createElement("div");
    modal.id = "flashcardFontModal";
    modal.className = "pq-bookmark-modal";
    modal.innerHTML = `
      <div class="pq-bookmark-modal-content pq-translation-modal-content">
        <div class="pq-bookmark-modal-header">
          <h3 class="pq-bookmark-modal-title">Arabic Font</h3>
          <button type="button" class="pq-bookmark-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="pq-bookmark-modal-body">
          <div class="pq-bookmark-search">
            <input type="text" class="pq-bookmark-search-input flashcard-font-search" placeholder="Search fonts..." />
          </div>
          <div class="pq-translation-list">
            <div class="pq-translation-items flashcard-font-items"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this._fontModal = modal;

    modal
      .querySelector(".pq-bookmark-modal-close")
      .addEventListener("click", () => this.closeFontPickerModal());

    this._bindOverlayCloseBehavior(modal, () => this.closeFontPickerModal());

    const searchInput = modal.querySelector(".flashcard-font-search");
    searchInput.addEventListener("input", () => {
      this.renderFontList(searchInput.value);
    });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closeFontPickerModal();
    });
  }

  openFontPickerModal() {
    const modal = document.getElementById("flashcardFontModal");
    if (!modal) return;

    const searchInput = modal.querySelector(".flashcard-font-search");
    if (searchInput) searchInput.value = "";

    this.renderFontList("");
    modal.classList.add("active");

    setTimeout(() => {
      try {
        searchInput?.focus();
      } catch (e) {}
    }, 100);
  }

  closeFontPickerModal() {
    const modal = document.getElementById("flashcardFontModal");
    if (modal) modal.classList.remove("active");
  }

  renderFontList(query = "") {
    const modal = document.getElementById("flashcardFontModal");
    if (!modal) return;

    const container = modal.querySelector(".flashcard-font-items");
    if (!container) return;

    const q = String(query || "")
      .toLowerCase()
      .trim();
    const fonts = FlashcardManager.ARABIC_FONT_FAMILIES.filter((f) =>
      f.toLowerCase().includes(q),
    );

    const current = this.normalizeArabicFontFamily(this._arabicFontFamily);
    const arabicPreview = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
    let html = "";
    for (const font of fonts) {
      const isActive = font === current;
      html += `<button type="button" class="pq-translation-item ${
        isActive ? "active" : ""
      }" data-font-family="${this.escapeHtmlAttr(font)}">
        <span class="pq-font-label">
          <span class="pq-translation-name">${this.escapeHtmlAttr(font)}</span>
          <span class="pq-font-preview" lang="ar" dir="rtl">${arabicPreview}</span>
        </span>
        ${
          isActive
            ? `<span class="pq-translation-check">${this._getIcon("✓", {
                size: 14,
              })}</span>`
            : ""
        }
      </button>`;
    }

    if (!html) {
      html = `<div class="pq-translation-empty">No fonts found for "${this.escapeHtmlAttr(
        query,
      )}"</div>`;
      container.innerHTML = html;
      return;
    }

    container.innerHTML = html;
    container.querySelectorAll(".pq-font-preview").forEach((preview) => {
      const font = preview
        .closest(".pq-translation-item")
        ?.getAttribute("data-font-family");
      if (font) preview.style.fontFamily = `"${font}", var(--font-arabic)`;
    });
    container.querySelectorAll(".pq-translation-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const font = btn.getAttribute("data-font-family");
        this.applyArabicFontFamily(font, { persist: true });
        this.closeFontPickerModal();
      });
    });
  }

  autoResizeTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  autoResizeAllTextareas() {
    if (!this.settingsList) return;
    const items = this.settingsList.querySelectorAll(
      "textarea.flashcard-textarea",
    );
    items.forEach((t) => this.autoResizeTextarea(t));
  }

  clampNumber(value, min, max, fallback) {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(min, Math.min(max, value));
  }

  isSettingsEditorDetached() {
    const group = document.getElementById("flashcardsEditorGroup");
    return !!group?.closest(".editor-detach-modal.active");
  }

  getSettingsPageSize() {
    return this.isSettingsEditorDetached()
      ? FlashcardManager.DETACHED_PAGE_SIZE
      : FlashcardManager.PAGE_SIZE;
  }

  renderPagination() {
    if (!this.settingsPagination) return;

    const active = this.getActiveSet();
    const total = active?.cards?.length || 0;
    const pageSize = this.getSettingsPageSize();
    const pages = Math.max(1, Math.ceil(total / pageSize));

    if (pages <= 1) {
      this.settingsPagination.innerHTML = "";
      return;
    }

    const makeBtn = (label, page, disabled, active) => {
      return `
        <button
          class="pagination-btn ${active ? "active" : ""}"
          type="button"
          data-page="${page}"
          ${disabled ? "disabled" : ""}
        >
          ${label}
        </button>
      `;
    };

    // Compact pagination: show first, last, current ±1
    const current = this.settingsPage;
    const wanted = new Set([1, pages, current - 1, current, current + 1]);
    const numbers = [...wanted]
      .filter((n) => n >= 1 && n <= pages)
      .sort((a, b) => a - b);

    let html = makeBtn("Prev", current - 1, current <= 1, false);

    let last = 0;
    for (const n of numbers) {
      if (last && n > last + 1) {
        html += `<span class="pagination-ellipsis">…</span>`;
      }
      html += makeBtn(String(n), n, false, n === current);
      last = n;
    }

    html += makeBtn("Next", current + 1, current >= pages, false);

    this.settingsPagination.innerHTML = html;

    // Bind clicks once
    if (this.settingsPagination.dataset.bound !== "true") {
      this.settingsPagination.dataset.bound = "true";
      this.settingsPagination.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const page = Number(btn.dataset.page);
        if (!Number.isFinite(page)) return;
        this.settingsPage = page;
        this.renderEditorList();
        this.renderPagination();
      });
    }
  }
});

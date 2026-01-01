/**
 * Flashcard Manager
 * - Loads default cards from data/flashcard_default.csv on first run
 * - Supports up to 10 flashcard sets (CSV import)
 * - Dashboard viewer + Settings tab editor (20 cards/page)
 */

class FlashcardManager {
  static MAX_SETS = 10;
  static PAGE_SIZE = 20;

  static FLIP_ANIM_MS = 320;
  static NAV_ANIM_MS = 320;

  constructor(storage) {
    this.storage = storage;

    // Dashboard elements
    this.cardEl = document.getElementById("flashcardCard");
    this.flipCardEl = document.getElementById("flashcardFlipCard");
    this.prevBtn = document.getElementById("flashcardPrevBtn");
    this.nextBtn = document.getElementById("flashcardNextBtn");
    this.questionEl = document.getElementById("flashcardQuestion");
    this.answerEl = document.getElementById("flashcardAnswer");
    this.modeToggleBtn = document.getElementById("flashcardModeToggleBtn");

    // Dashboard jump controls
    this.jumpLabelEl = document.getElementById("flashcardJumpLabel");
    this.jumpSliderEl = document.getElementById("flashcardJumpSlider");
    this.jumpInputEl = document.getElementById("flashcardJumpInput");

    // Settings elements (may not exist until modal opened)
    this.settingsSetSelect = null;
    this.settingsImportBtn = null;
    this.settingsExportBtn = null;
    this.settingsDeleteSetBtn = null;
    this.settingsNewSetBtn = null;
    this.settingsImportInput = null;
    this.settingsAddCardBtn = null;
    this.settingsList = null;
    this.settingsPagination = null;
    this.settingsMeta = null;

    // Mode controls (Settings tab)
    this.settingsModeSelect = null;
    this.settingsStudyAutoAdvanceSeconds = null;

    // Typography controls (Settings tab)
    this.settingsQuestionFontSize = null;
    this.settingsQuestionFontSizeValue = null;
    this.settingsAnswerFontSize = null;
    this.settingsAnswerFontSizeValue = null;

    // State
    this.currentCardIndex = 0;
    this.isFlipped = false;
    this.settingsPage = 1;

    // Settings editor state
    this._settingsReadOnly = false;

    // Debounce timer for editor saves
    this.saveTimer = null;

    // Dashboard animation timers
    this._dashboardAnimating = false;
    this._dashboardMidTimer = null;
    this._dashboardEndTimer = null;

    // Study mode auto-advance timer
    this._autoAdvanceTimer = null;
  }

  async init() {
    await this.ensureDefaultSet();
    this.applyTypography();
    this.bindDashboardEvents();
    this.restoreCurrentCardIndexForActiveSet();
    this.applyModeToDashboard();
    this.renderDashboard();
    this.ensureAutoAdvanceState({ reset: true });
  }

  // ---------- Storage ----------

  getSets() {
    return this.storage.get("flashcardSets", []);
  }

  saveSets(sets) {
    return this.storage.set("flashcardSets", sets);
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

  // ---------- Persisted current card index ----------

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
    { resetFlip = true, cancelAnimation = true } = {}
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
        0
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

  // ---------- Mode + auto-advance ----------

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
      10
    );
  }

  setStudyAutoAdvanceSeconds(seconds) {
    const clamped = this.clampNumber(parseInt(seconds, 10), 1, 3600, 10);
    this.setFlashcardSettings({ studyAutoAdvanceSeconds: clamped });
    this.ensureAutoAdvanceState({ reset: true });
    return clamped;
  }

  applyModeToDashboard() {
    const mode = this.getMode();

    if (this.flipCardEl) {
      this.flipCardEl.classList.toggle(
        "flashcard-mode-study",
        mode === "study"
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
      const icon = mode === "study" ? "📖" : "❓";
      const nextTitle =
        mode === "study" ? "Switch to Quiz mode" : "Switch to Study mode";
      this.modeToggleBtn.innerHTML = `<span class="mode-icon" aria-hidden="true">${icon}</span>`;
      this.modeToggleBtn.title = nextTitle;
      this.modeToggleBtn.setAttribute("aria-label", nextTitle);
      this.modeToggleBtn.setAttribute(
        "aria-pressed",
        mode === "study" ? "true" : "false"
      );
    }
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

    if (!isStudy || cards.length <= 1) {
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

  // ---------- Default bootstrap ----------

  async ensureDefaultSet() {
    const sets = this.getSets();
    if (Array.isArray(sets) && sets.length > 0) {
      // Ensure active set is valid
      const activeId = this.getActiveSetId();
      if (!activeId || !sets.some((s) => s.id === activeId)) {
        this.setActiveSetId(sets[0].id);
      }
      return;
    }

    try {
      const res = await fetch("data/flashcard_default.csv", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Failed to load default CSV: ${res.status}`);
      }
      const text = await res.text();
      const cards = this.parseCsvTwoColumns(text);

      const defaultSet = {
        id: "default",
        name: "Default",
        createdAt: new Date().toISOString(),
        cards,
      };

      this.saveSets([defaultSet]);
      this.setActiveSetId(defaultSet.id);
    } catch (e) {
      console.error("Flashcards: failed to initialize default set", e);
      // Ensure we at least have an empty set to avoid crashing UI
      const fallback = {
        id: "default",
        name: "Default",
        createdAt: new Date().toISOString(),
        cards: [],
      };
      this.saveSets([fallback]);
      this.setActiveSetId(fallback.id);
    }
  }

  // ---------- Dashboard ----------

  bindDashboardEvents() {
    if (this.modeToggleBtn) {
      this.modeToggleBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.toggleMode();
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
        this.toggleFlip();
      });

      this.flipCardEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.toggleFlip();
        }
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
        "flashcard-anim-prev"
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

    this._dashboardMidTimer = setTimeout(() => {
      this.isFlipped = !this.isFlipped;
      this.renderDashboard();
    }, Math.floor(FlashcardManager.FLIP_ANIM_MS / 2));

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

    this._dashboardMidTimer = setTimeout(() => {
      advance();
    }, Math.floor(FlashcardManager.NAV_ANIM_MS / 2));

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
      this.answerEl.textContent = "Import a CSV in Settings → Flashcards";
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

    if (this.prevBtn) this.prevBtn.disabled = cards.length <= 1;
    if (this.nextBtn) this.nextBtn.disabled = cards.length <= 1;

    if (this.flipCardEl) {
      // Keep the physical card facing forward; we swap text instead.
      this.flipCardEl.classList.remove("is-flipped");
    }

    this.ensureAutoAdvanceState();
    this.updateJumpControls();
  }

  // ---------- Settings UI ----------

  bindSettingsElements() {
    this.settingsSetSelect = document.getElementById("flashcardsSetSelect");
    this.settingsImportBtn = document.getElementById("flashcardsImportBtn");
    this.settingsExportBtn = document.getElementById("flashcardsExportBtn");
    this.settingsDeleteSetBtn = document.getElementById(
      "flashcardsDeleteSetBtn"
    );
    this.settingsNewSetBtn = document.getElementById("flashcardsNewSetBtn");
    this.settingsImportInput = document.getElementById("flashcardsImportInput");
    this.settingsAddCardBtn = document.getElementById("flashcardsAddCardBtn");
    this.settingsList = document.getElementById("flashcardsEditorList");
    this.settingsPagination = document.getElementById("flashcardsPagination");
    this.settingsMeta = document.getElementById("flashcardsMeta");

    this.settingsModeSelect = document.getElementById("flashcardsModeSelect");
    this.settingsStudyAutoAdvanceSeconds = document.getElementById(
      "flashcardsStudyAutoAdvanceSeconds"
    );

    this.settingsQuestionFontSize = document.getElementById(
      "flashcardsQuestionFontSize"
    );
    this.settingsQuestionFontSizeValue = document.getElementById(
      "flashcardsQuestionFontSizeValue"
    );
    this.settingsAnswerFontSize = document.getElementById(
      "flashcardsAnswerFontSize"
    );
    this.settingsAnswerFontSizeValue = document.getElementById(
      "flashcardsAnswerFontSizeValue"
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
          72,
          22
        );
        const a = this.clampNumber(
          parseInt(this.settingsAnswerFontSize.value, 10),
          12,
          72,
          18
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
          this.settingsStudyAutoAdvanceSeconds.value
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
        await this.importCsvFile(file);
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
      opt.textContent = s.name;
      this.settingsSetSelect.appendChild(opt);
    });

    if (active) {
      this.settingsSetSelect.value = active.id;
    }

    this._settingsReadOnly = active?.id === "default";

    if (this.settingsDeleteSetBtn) {
      this.settingsDeleteSetBtn.disabled = this._settingsReadOnly;
      this.settingsDeleteSetBtn.title = this._settingsReadOnly
        ? "The default set cannot be deleted"
        : "Delete set";
    }

    if (this.settingsAddCardBtn) {
      this.settingsAddCardBtn.disabled = this._settingsReadOnly;
      this.settingsAddCardBtn.title = this._settingsReadOnly
        ? "The default set cannot be edited"
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
        this.getStudyAutoAdvanceSeconds()
      );
    }

    this.renderEditorList();
    this.renderPagination();
  }

  renderEditorList() {
    const active = this.getActiveSet();
    const cards = active?.cards || [];
    const readOnly = this._settingsReadOnly || active?.id === "default";

    const total = cards.length;
    const pages = Math.max(1, Math.ceil(total / FlashcardManager.PAGE_SIZE));
    this.settingsPage = Math.min(Math.max(1, this.settingsPage), pages);

    const start = (this.settingsPage - 1) * FlashcardManager.PAGE_SIZE;
    const end = Math.min(total, start + FlashcardManager.PAGE_SIZE);

    if (!this.settingsList) return;

    if (!cards.length) {
      this.settingsList.innerHTML = `
        <div class="quotes-empty">
          <div class="quotes-empty-title">No flashcards in this set</div>
          <div class="quotes-empty-hint">Use “Add Card” or import a CSV.</div>
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
    this.cardEl.style.setProperty(
      "--flashcard-question-font-size",
      `${t.question}px`
    );
    this.cardEl.style.setProperty(
      "--flashcard-answer-font-size",
      `${t.answer}px`
    );
  }

  getTypography() {
    const settings = this.getFlashcardSettings();
    return {
      question: this.clampNumber(
        parseInt(settings.questionFontSize, 10),
        12,
        72,
        22
      ),
      answer: this.clampNumber(
        parseInt(settings.answerFontSize, 10),
        12,
        72,
        18
      ),
    };
  }

  updateTypographyLabels(question, answer) {
    if (this.settingsQuestionFontSizeValue)
      this.settingsQuestionFontSizeValue.textContent = `${question}px`;
    if (this.settingsAnswerFontSizeValue)
      this.settingsAnswerFontSizeValue.textContent = `${answer}px`;
  }

  autoResizeTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  autoResizeAllTextareas() {
    if (!this.settingsList) return;
    const items = this.settingsList.querySelectorAll(
      "textarea.flashcard-textarea"
    );
    items.forEach((t) => this.autoResizeTextarea(t));
  }

  clampNumber(value, min, max, fallback) {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(min, Math.min(max, value));
  }

  renderPagination() {
    if (!this.settingsPagination) return;

    const active = this.getActiveSet();
    const total = active?.cards?.length || 0;
    const pages = Math.max(1, Math.ceil(total / FlashcardManager.PAGE_SIZE));

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

  // ---------- Settings actions ----------

  async importCsvFile(file) {
    const name = this.inferSetNameFromFile(file.name);

    const sets = this.getSets();
    let effectiveName = name;
    let existing = sets.find(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    );

    // Never allow replacing the default set; instead create a new set with a unique name.
    if (existing && existing.id === "default") {
      existing = null;
      effectiveName = this.makeUniqueSetName(effectiveName, sets);
    }

    // Enforce set cap
    if (!existing && sets.length >= FlashcardManager.MAX_SETS) {
      this.showToast(
        `You already have ${FlashcardManager.MAX_SETS} sets. Delete one first.`,
        "error"
      );
      return;
    }

    let csvText;
    try {
      csvText = await file.text();
    } catch (e) {
      this.showToast("Could not read the CSV file.", "error");
      return;
    }

    let cards;
    try {
      cards = this.parseCsvTwoColumns(csvText);
    } catch (e) {
      console.error(e);
      this.showToast("Invalid CSV format.", "error");
      return;
    }

    const now = new Date().toISOString();

    if (existing) {
      const ok = confirm(
        `A set named "${existing.name}" already exists. Replace it?`
      );
      if (!ok) return;

      if (existing.id === "default") {
        this.showToast("The default set cannot be replaced.", "error");
        return;
      }

      existing.cards = cards;
      existing.updatedAt = now;
      this.saveSets([...sets]);
      this.setActiveSetId(existing.id);
      this.showToast(`Replaced set: ${existing.name}`, "success");
    } else {
      const newSet = {
        id: `set_${Date.now()}`,
        name: effectiveName,
        createdAt: now,
        cards,
      };
      this.saveSets([...sets, newSet]);
      this.setActiveSetId(newSet.id);
      this.currentCardIndex = 0;
      this.persistCurrentCardIndex();
      this.showToast(`Imported set: ${effectiveName}`, "success");
    }

    this.settingsPage = 1;
    this.renderSettings();
    this.renderDashboard();
  }

  exportActiveSetCsv() {
    const active = this.getActiveSet();
    if (!active) return;

    const csv = this.cardsToCsv(active.cards || []);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${this.slugify(active.name || "flashcards")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  deleteActiveSet() {
    const sets = this.getSets();
    const active = this.getActiveSet();
    if (!active) return;

    if (active.id === "default") {
      this.showToast("The default set cannot be deleted.", "error");
      return;
    }

    if (sets.length <= 1) {
      this.showToast("You must keep at least one set.", "error");
      return;
    }

    const ok = confirm(`Delete the set "${active.name}"?`);
    if (!ok) return;

    const nextSets = sets.filter((s) => s.id !== active.id);
    this.saveSets(nextSets);
    this.setActiveSetId(nextSets[0].id);

    this.clearSavedCardIndexForSet(active.id);
    this.restoreCurrentCardIndexForActiveSet();

    this.settingsPage = 1;
    this.showToast("Set deleted.", "success");
    this.renderSettings();
    this.renderDashboard();
  }

  addCardToActiveSet() {
    const sets = this.getSets();
    const activeId = this.getActiveSetId();
    const active = sets.find((s) => s.id === activeId) || sets[0];
    if (!active) return;

    if (active.id === "default") {
      this.showToast("The default set cannot be edited.", "error");
      return;
    }

    active.cards = Array.isArray(active.cards) ? active.cards : [];
    active.cards.push({ question: "", answer: "" });
    active.updatedAt = new Date().toISOString();
    this.saveSets(sets);

    const total = active.cards.length;
    const pages = Math.max(1, Math.ceil(total / FlashcardManager.PAGE_SIZE));
    this.settingsPage = pages;

    this.renderSettings();
    this.showToast("Card added.", "success");
  }

  updateCardField(globalIndex, field, value) {
    const sets = this.getSets();
    const activeId = this.getActiveSetId();
    const active = sets.find((s) => s.id === activeId) || sets[0];
    if (!active || !active.cards || !active.cards[globalIndex]) return;

    if (active.id === "default") return;

    if (field !== "question" && field !== "answer") return;

    active.cards[globalIndex][field] = value;
    active.updatedAt = new Date().toISOString();

    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveSets(sets);
      this.renderDashboard();
    }, 250);
  }

  deleteCardAtIndex(globalIndex) {
    const sets = this.getSets();
    const activeId = this.getActiveSetId();
    const active = sets.find((s) => s.id === activeId) || sets[0];
    if (!active) return;

    if (active.id === "default") {
      this.showToast("The default set cannot be edited.", "error");
      return;
    }

    active.cards = Array.isArray(active.cards) ? active.cards : [];
    if (globalIndex < 0 || globalIndex >= active.cards.length) return;

    active.cards.splice(globalIndex, 1);
    active.updatedAt = new Date().toISOString();
    this.saveSets(sets);

    // Keep page in range
    const pages = Math.max(
      1,
      Math.ceil((active.cards.length || 0) / FlashcardManager.PAGE_SIZE)
    );
    this.settingsPage = Math.min(this.settingsPage, pages);

    this.renderSettings();
    this.renderDashboard();
    this.showToast("Card deleted.", "success");
  }

  // ---------- CSV utilities ----------

  parseCsvTwoColumns(text) {
    const rows = this.parseCsv(text);

    const cards = [];
    for (const row of rows) {
      if (!row || row.length === 0) continue;

      const question = (row[0] ?? "").trim();
      const answer = (row[1] ?? "").trim();

      // Skip completely empty lines
      if (!question && !answer) continue;

      cards.push({ question, answer });
    }

    return cards;
  }

  parseCsv(text) {
    // RFC4180-ish parser: handles quotes, commas, CRLF
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    const pushField = () => {
      row.push(field);
      field = "";
    };

    const pushRow = () => {
      // Avoid trailing empty row when file ends with newline
      if (row.length === 1 && row[0] === "" && rows.length === 0) {
        // allow empty file
      }
      rows.push(row);
      row = [];
    };

    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          const next = text[i + 1];
          if (next === '"') {
            field += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
        continue;
      }

      if (ch === ",") {
        pushField();
      } else if (ch === "\n") {
        pushField();
        pushRow();
      } else if (ch === "\r") {
        // ignore CR; handle CRLF by skipping
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        field += ch;
      }
    }

    // last field
    pushField();
    // only push if not a trailing empty row
    if (!(row.length === 1 && row[0] === "" && rows.length > 0)) {
      pushRow();
    }

    // Filter out fully empty rows
    return rows.filter((r) => r.some((v) => String(v).trim() !== ""));
  }

  cardsToCsv(cards) {
    const escape = (value) => {
      const s = String(value ?? "");
      if (/[\n\r,"]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    return (cards || [])
      .map((c) => `${escape(c.question)},${escape(c.answer)}`)
      .join("\r\n");
  }

  // ---------- misc ----------

  inferSetNameFromFile(filename) {
    const base = String(filename || "")
      .replace(/\.[^.]+$/, "")
      .trim();
    const safe = base || "Imported";
    return safe.slice(0, 40);
  }

  isDefaultActiveSet() {
    return this.getActiveSet()?.id === "default";
  }

  makeUniqueSetName(baseName, sets) {
    const normalized =
      String(baseName || "New Set")
        .trim()
        .slice(0, 40) || "New Set";
    const lower = normalized.toLowerCase();

    const isTaken = (candidate) =>
      sets.some(
        (s) => String(s.name || "").toLowerCase() === candidate.toLowerCase()
      );

    if (!isTaken(normalized) && lower !== "default") return normalized;

    for (let i = 2; i <= 99; i += 1) {
      const candidate = `${normalized} (${i})`;
      if (!isTaken(candidate) && candidate.toLowerCase() !== "default") {
        return candidate.slice(0, 40);
      }
    }

    return `Set ${Date.now()}`;
  }

  createNewSet() {
    const sets = this.getSets();
    if (sets.length >= FlashcardManager.MAX_SETS) {
      this.showToast(
        `You already have ${FlashcardManager.MAX_SETS} sets. Delete one first.`,
        "error"
      );
      return;
    }

    const rawName = prompt("New set name:", "New Set");
    if (rawName === null) return;
    const trimmed = String(rawName).trim();
    if (!trimmed) {
      this.showToast("Set name cannot be empty.", "error");
      return;
    }

    if (trimmed.toLowerCase() === "default") {
      this.showToast("The name 'Default' is reserved.", "error");
      return;
    }

    const name = this.makeUniqueSetName(trimmed, sets);
    const now = new Date().toISOString();
    const newSet = {
      id: `set_${Date.now()}`,
      name,
      createdAt: now,
      cards: [],
    };

    this.saveSets([...sets, newSet]);
    this.setActiveSetId(newSet.id);
    this.settingsPage = 1;
    this.currentCardIndex = 0;
    this.persistCurrentCardIndex();
    this.renderSettings();
    this.renderDashboard();
    this.showToast(`Created set: ${name}`, "success");
  }

  slugify(name) {
    return String(name || "flashcards")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  }

  escapeHtmlAttr(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  showToast(message, type = "info") {
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${type === "success" ? "✓" : type === "error" ? "✗" : "ℹ"}</span>
      <span>${this.escapeHtmlAttr(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

/**
 * Flashcard Manager
 * - Loads default cards from data/flashcard_default.csv on first run
 * - Supports up to 100 flashcard sets (CSV import)
 * - Dashboard viewer + Settings tab editor (20 cards/page)
 */

class FlashcardManager {
  static MAX_SETS = 100;
  static PAGE_SIZE = 20;

  static FLIP_ANIM_MS = 320;
  static NAV_ANIM_MS = 320;

  // Default sets that are provided read-only to all users.
  // Each entry: { id, name, file, parser } where parser may be 'csv' or 'pipe'.
  static DEFAULT_SETS = [
    {
      id: "default_top300wordforms",
      name: "Top 300 Word Forms in Quran",
      file: "data/flashcard_top300wordforms.csv",
      parser: "csv",
    },
    {
      id: "default_99names_ar",
      name: "99 Names of Allah (Arabic)",
      file: "data/flashcard_99names_ar.csv",
      parser: "pipe",
    },
    {
      id: "default_99names_en",
      name: "99 Names of Allah (English)",
      file: "data/flashcard_99names_en.csv",
      parser: "pipe",
    },
  ];

  // IDs of sets that are protected (cannot be edited or deleted).
  static PROTECTED_SET_IDS = [
    "default_top300wordforms",
    "default_99names_ar",
    "default_99names_en",
  ];

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

    // Auto-advance toggle elements
    this.autoAdvanceToggleBtn = document.getElementById(
      "flashcardAutoAdvanceToggleBtn"
    );
    this.autoAdvanceStatusEl = document.getElementById("flashcardAutoStatus");
    this.autoAdvanceWrapEl = document.getElementById("flashcardAutoWrap");

    // Set selector modal state
    this._setModalPage = 1;
    this._setModalSearchQuery = "";
    this._setModal = null;
  }

  async init() {
    await this.ensureDefaultSet();
    this.applyTypography();
    this.createSetSelectorButton();
    this.createSetSelectorModal();
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

  // ---------- Auto-advance pause controls ----------

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
      "info"
    );
  }

  updateAutoAdvanceToggleUi() {
    // Ensure references exist (DOM may have been modified)
    if (!this.autoAdvanceToggleBtn)
      this.autoAdvanceToggleBtn = document.getElementById(
        "flashcardAutoAdvanceToggleBtn"
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

    if (this.autoAdvanceToggleBtn) {
      this.autoAdvanceToggleBtn.setAttribute(
        "aria-pressed",
        paused ? "true" : "false"
      );
      this.autoAdvanceToggleBtn.dataset.paused = paused ? "true" : "false";
      this.autoAdvanceToggleBtn.title = paused
        ? "Resume auto-advance"
        : "Pause auto-advance";
      this.autoAdvanceToggleBtn.innerHTML = `<span class="auto-icon" aria-hidden="true">${
        paused ? "▶" : "⏸"
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
    const paused = this.getAutoAdvancePaused();

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

  // ---------- Default bootstrap ----------

  async ensureDefaultSet() {
    const sets = this.getSets();
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

    const existingSets = Array.isArray(sets) ? sets : [];

    // Fresh install: create all default sets
    if (existingSets.length === 0) {
      const created = [];
      for (const def of defs) {
        try {
          const res = await fetch(def.file, { cache: "no-store" });
          if (!res.ok)
            throw new Error(`Failed to load default CSV: ${res.status}`);
          const text = await res.text();
          const cards =
            def.parser === "pipe"
              ? this.parsePipeTwoColumns(text)
              : this.parseCsvTwoColumns(text);
          created.push({
            id: def.id,
            name: def.name,
            createdAt: new Date().toISOString(),
            cards,
          });
        } catch (e) {
          console.error(
            `Flashcards: failed to initialize default set ${def.id}`,
            e
          );
          created.push({
            id: def.id,
            name: def.name,
            createdAt: new Date().toISOString(),
            cards: [],
          });
        }
      }
      this.saveSets(created);
      this.setActiveSetId(created[0]?.id || "default");
      return;
    }

    // Upgrade path: ensure each default set exists (do not overwrite existing user sets)
    let changed = false;
    const existingIds = new Set(existingSets.map((s) => s.id));
    for (const def of defs) {
      if (!existingIds.has(def.id)) {
        try {
          const res = await fetch(def.file, { cache: "no-store" });
          let cards = [];
          if (res.ok) {
            const text = await res.text();
            cards =
              def.parser === "pipe"
                ? this.parsePipeTwoColumns(text)
                : this.parseCsvTwoColumns(text);
          } else {
            console.warn(
              `Flashcards: failed to load default CSV (${def.file}): ${res.status}`
            );
          }
          const newSet = {
            id: def.id,
            name: def.name,
            createdAt: new Date().toISOString(),
            cards,
          };
          existingSets.push(newSet);
          changed = true;
        } catch (e) {
          console.error(`Flashcards: failed to fetch default set ${def.id}`, e);
          const newSet = {
            id: def.id,
            name: def.name,
            createdAt: new Date().toISOString(),
            cards: [],
          };
          existingSets.push(newSet);
          changed = true;
        }
      }
    }

    if (changed) this.saveSets(existingSets);

    // Ensure active set is valid
    const activeId = this.getActiveSetId();
    if (!activeId || !existingSets.some((s) => s.id === activeId)) {
      this.setActiveSetId(existingSets[0].id);
    }
  }

  /**
   * Reload default (protected) sets from the bundled files.
   * This updates existing default sets in storage so extension updates can
   * deliver new/updated default content without requiring a full reset.
   */
  async refreshDefaultSets() {
    const defs = Array.isArray(FlashcardManager.DEFAULT_SETS)
      ? FlashcardManager.DEFAULT_SETS
      : [];

    const setsRaw = this.getSets();
    const sets = Array.isArray(setsRaw) ? setsRaw : [];

    let changed = false;
    const byId = new Map(sets.map((s) => [String(s?.id || ""), s]));

    for (const def of defs) {
      if (!def?.id || !def?.file) continue;

      let cards = [];
      try {
        const res = await fetch(def.file, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(
            `Failed to load default set ${def.id}: ${res.status}`
          );
        }
        const text = await res.text();
        cards =
          def.parser === "pipe"
            ? this.parsePipeTwoColumns(text)
            : this.parseCsvTwoColumns(text);
      } catch (e) {
        console.error(`Flashcards: failed to refresh default set ${def.id}`, e);
        cards = [];
      }

      const existing = byId.get(String(def.id));
      if (existing) {
        existing.name = def.name || existing.name;
        existing.cards = cards;
        if (!existing.createdAt) {
          existing.createdAt = new Date().toISOString();
        }
        changed = true;
      } else {
        sets.push({
          id: def.id,
          name: def.name,
          createdAt: new Date().toISOString(),
          cards,
        });
        byId.set(String(def.id), sets[sets.length - 1]);
        changed = true;
      }
    }

    if (changed) {
      this.saveSets(sets);
    }

    // Keep the UI consistent with potentially changed card counts.
    this.restoreCurrentCardIndexForActiveSet();
    this.renderDashboard();
    this.renderSettings();
    this.ensureAutoAdvanceState({ reset: true });
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

    // Re-query auto-advance elements (safe if DOM was modified)
    if (!this.autoAdvanceToggleBtn)
      this.autoAdvanceToggleBtn = document.getElementById(
        "flashcardAutoAdvanceToggleBtn"
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
    this.updateAutoAdvanceToggleUi();
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
          144,
          22
        );
        const a = this.clampNumber(
          parseInt(this.settingsAnswerFontSize.value, 10),
          12,
          144,
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
        this.getStudyAutoAdvanceSeconds()
      );
    }

    this.renderEditorList();
    this.renderPagination();
  }

  renderEditorList() {
    const active = this.getActiveSet();
    const cards = active?.cards || [];
    const readOnly =
      this._settingsReadOnly || this.isProtectedSetId(active?.id);

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
        144,
        22
      ),
      answer: this.clampNumber(
        parseInt(settings.answerFontSize, 10),
        12,
        144,
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

    // Never allow replacing a protected default set; instead create a new set with a unique name.
    if (existing && this.isProtectedSetId(existing.id)) {
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

      if (this.isProtectedSetId(existing.id)) {
        this.showToast("This default set cannot be replaced.", "error");
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

    if (this.isProtectedSetId(active.id)) {
      this.showToast("This default set cannot be deleted.", "error");
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

    if (this.isProtectedSetId(active.id)) {
      this.showToast("This default set cannot be edited.", "error");
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

    if (this.isProtectedSetId(active.id)) return;

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

    if (this.isProtectedSetId(active.id)) {
      this.showToast("This default set cannot be edited.", "error");
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

  parsePipeTwoColumns(text) {
    if (!text) return [];
    const lines = String(text).split(/\r?\n/);
    const cards = [];
    for (const raw of lines) {
      const line = (raw || "").trim();
      if (!line) continue;
      const idx = line.indexOf("|");
      if (idx === -1) {
        // Fallback to CSV parsing for this line if no pipe found
        const rows = this.parseCsv(line);
        for (const row of rows) {
          const question = (row[0] ?? "").trim();
          const answer = (row[1] ?? "").trim();
          if (!question && !answer) continue;
          cards.push({ question, answer });
        }
        continue;
      }
      const question = line.slice(0, idx).trim();
      const answer = line.slice(idx + 1).trim();
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

  isProtectedSetId(id) {
    return (
      Array.isArray(FlashcardManager.PROTECTED_SET_IDS) &&
      FlashcardManager.PROTECTED_SET_IDS.includes(String(id))
    );
  }

  isDefaultActiveSet() {
    return this.isProtectedSetId(this.getActiveSet()?.id);
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

    const protectedNames = Array.isArray(FlashcardManager.DEFAULT_SETS)
      ? FlashcardManager.DEFAULT_SETS.map((d) =>
          String(d.name || "").toLowerCase()
        )
      : ["default"];

    if (!isTaken(normalized) && !protectedNames.includes(lower))
      return normalized;

    for (let i = 2; i <= 99; i += 1) {
      const candidate = `${normalized} (${i})`;
      if (
        !isTaken(candidate) &&
        !protectedNames.includes(candidate.toLowerCase())
      ) {
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

    const protectedNames = Array.isArray(FlashcardManager.DEFAULT_SETS)
      ? FlashcardManager.DEFAULT_SETS.map((d) =>
          String(d.name || "").toLowerCase()
        )
      : ["default"];

    if (protectedNames.includes(trimmed.toLowerCase())) {
      this.showToast(`The name '${trimmed}' is reserved.`, "error");
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

  // ═══════════════════════════════════════════════════════════════════════════
  // FLASHCARD SET SELECTOR (Dashboard component)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create the set selector button in the flashcard card header.
   */
  createSetSelectorButton() {
    const headerActions = this.cardEl?.querySelector(".card-header-actions");
    if (!headerActions) return;

    // Check if button already exists
    if (headerActions.querySelector(".flashcard-set-selector-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "flashcard-set-selector-btn";
    btn.innerHTML = "📚";
    btn.title = "Select flashcard set";
    btn.setAttribute("aria-label", "Select flashcard set");

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      this.openSetSelectorModal();
    });

    // Insert after mode toggle button
    const modeBtn = headerActions.querySelector(".flashcard-mode-toggle-btn");
    if (modeBtn && modeBtn.nextSibling) {
      headerActions.insertBefore(btn, modeBtn.nextSibling);
    } else if (modeBtn) {
      headerActions.appendChild(btn);
    } else {
      headerActions.insertBefore(btn, headerActions.firstChild);
    }
  }

  /**
   * Create the set selector modal.
   */
  createSetSelectorModal() {
    if (document.getElementById("flashcardSetModal")) return;

    const modal = document.createElement("div");
    modal.id = "flashcardSetModal";
    modal.className = "flashcard-set-modal";
    modal.innerHTML = `
      <div class="flashcard-set-modal-content">
        <div class="flashcard-set-modal-header">
          <h3 class="flashcard-set-modal-title">📚 Select Flashcard Set</h3>
          <button type="button" class="flashcard-set-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="flashcard-set-modal-body">
          <div class="flashcard-set-search">
            <input type="text" class="flashcard-set-search-input" placeholder="Search sets..." />
          </div>
          <div class="flashcard-set-list"></div>
          <div class="flashcard-set-pagination"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this._setModal = modal;

    // Event listeners
    modal
      .querySelector(".flashcard-set-modal-close")
      .addEventListener("click", () => {
        this.closeSetSelectorModal();
      });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) this.closeSetSelectorModal();
    });

    modal
      .querySelector(".flashcard-set-search-input")
      .addEventListener("input", (e) => {
        this._setModalSearchQuery = e.target.value;
        this._setModalPage = 1;
        this.renderSetSelectorModal();
      });
  }

  /**
   * Open the set selector modal.
   */
  openSetSelectorModal() {
    this._setModalSearchQuery = "";
    this._setModalPage = 1;

    const modal = document.getElementById("flashcardSetModal");
    if (modal) {
      modal.classList.add("active");
      modal.querySelector(".flashcard-set-search-input").value = "";
      this.renderSetSelectorModal();
    }
  }

  /**
   * Close the set selector modal.
   */
  closeSetSelectorModal() {
    const modal = document.getElementById("flashcardSetModal");
    if (modal) {
      modal.classList.remove("active");
    }
  }

  /**
   * Render the set selector modal content.
   */
  renderSetSelectorModal() {
    const modal = document.getElementById("flashcardSetModal");
    if (!modal) return;

    const listContainer = modal.querySelector(".flashcard-set-list");
    const paginationContainer = modal.querySelector(
      ".flashcard-set-pagination"
    );

    let sets = this.getSets();
    const searchQuery = this._setModalSearchQuery.toLowerCase();
    const activeSetId = this.getActiveSetId();

    if (searchQuery) {
      sets = sets.filter((s) => s.name.toLowerCase().includes(searchQuery));
    }

    const SETS_PER_PAGE = 10;
    const totalPages = Math.ceil(sets.length / SETS_PER_PAGE);
    const start = (this._setModalPage - 1) * SETS_PER_PAGE;
    const pageSets = sets.slice(start, start + SETS_PER_PAGE);

    if (pageSets.length === 0) {
      listContainer.innerHTML = `
        <div class="flashcard-set-empty">
          No flashcard sets found.
        </div>
      `;
    } else {
      listContainer.innerHTML = pageSets
        .map((s) => {
          const cardCount = Array.isArray(s.cards) ? s.cards.length : 0;
          const isActive = s.id === activeSetId;
          return `
            <div class="flashcard-set-item ${
              isActive ? "active" : ""
            }" data-set-id="${s.id}">
              <div class="flashcard-set-item-info">
                <span class="flashcard-set-item-name">${this.escapeHtmlAttr(
                  s.name
                )}</span>
                <span class="flashcard-set-item-meta">${cardCount} card${
            cardCount === 1 ? "" : "s"
          }</span>
              </div>
              ${
                Array.isArray(FlashcardManager.PROTECTED_SET_IDS) &&
                FlashcardManager.PROTECTED_SET_IDS.includes(s.id)
                  ? '<span class="flashcard-set-item-lock" title="Default set — read only">🔒</span>'
                  : ""
              }
              ${
                isActive
                  ? '<span style="color: var(--accent-gold);">✓</span>'
                  : ""
              }
            </div>
          `;
        })
        .join("");

      // Click handlers
      listContainer.querySelectorAll(".flashcard-set-item").forEach((el) => {
        el.addEventListener("click", () => {
          const setId = el.dataset.setId;
          this.setActiveSetId(setId);
          this.isFlipped = false;
          this.restoreCurrentCardIndexForActiveSet();
          this.renderDashboard();
          this.ensureAutoAdvanceState({ reset: true });
          this.closeSetSelectorModal();

          const set = this.getSets().find((s) => s.id === setId);
          if (set) {
            this.showToast(`Switched to: ${set.name}`, "success");
          }
        });
      });
    }

    // Render pagination
    this.renderSetSelectorPagination(paginationContainer, totalPages);
  }

  /**
   * Render pagination for set selector modal.
   */
  renderSetSelectorPagination(container, totalPages) {
    if (!container) return;

    if (totalPages <= 1) {
      container.innerHTML = "";
      return;
    }

    const currentPage = this._setModalPage;
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 2) {
        end = Math.min(totalPages - 1, 4);
      } else if (currentPage >= totalPages - 1) {
        start = Math.max(2, totalPages - 3);
      }

      if (start > 2) pages.push("...");

      for (let i = start; i <= end; i++) pages.push(i);

      if (end < totalPages - 1) pages.push("...");

      pages.push(totalPages);
    }

    container.innerHTML = `
      <button type="button" class="flashcard-set-page-btn" data-page="${
        currentPage - 1
      }" ${currentPage === 1 ? "disabled" : ""}>←</button>
      ${pages
        .map((p) =>
          p === "..."
            ? `<span class="flashcard-set-page-btn" style="cursor: default; border: none;">...</span>`
            : `<button type="button" class="flashcard-set-page-btn ${
                p === currentPage ? "active" : ""
              }" data-page="${p}">${p}</button>`
        )
        .join("")}
      <button type="button" class="flashcard-set-page-btn" data-page="${
        currentPage + 1
      }" ${currentPage === totalPages ? "disabled" : ""}>→</button>
    `;

    container.querySelectorAll("button[data-page]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const page = parseInt(btn.dataset.page, 10);
        if (Number.isFinite(page) && page >= 1 && page <= totalPages) {
          this._setModalPage = page;
          this.renderSetSelectorModal();
        }
      });
    });
  }
}

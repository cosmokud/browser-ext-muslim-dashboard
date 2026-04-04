/**
 * Adhkar Manager
 * - Loads bundled default adhkar sets from data/*.json at runtime
 * - Supports up to 100 adhkar sets (JSON import)
 * - Dashboard reader + Settings tab editor (10 items/page)
 */

class AdhkarManager extends BaseManager {
  static MAX_SETS = 100;
  static PAGE_SIZE = 10;
  static DETACHED_PAGE_SIZE = 10;

  static NAV_ANIM_MS = 320;
  static SCRIPT_TOGGLE_ANIM_MS = 220;
  static FONT_SCALE_MIN = 0.5;
  static FONT_SCALE_MAX = 2.5;
  static FONT_SCALE_STEP = 0.1;
  static ARABIC_FONT_FAMILIES = [
    "Noto Naskh Arabic",
    "Amiri",
    "KFGQPC Uthman Taha Naskh",
    "KFGQPC KSA Regular",
    "KFGQPC Kufi Stylistic Regular",
    "KFGQPC AN Regular",
    "KFGQPC AlJalil Dot",
    "KFGQPC Sindhi Naskh Regular",
  ];

  static DEFAULT_SETS = [
    {
      id: "default_adhkar_morning",
      name: "Morning Adhkar",
      file: "data/adhkar_morning.json",
    },
    {
      id: "default_adhkar_evening",
      name: "Evening Adhkar",
      file: "data/adhkar_evening.json",
    },
    {
      id: "default_adhkar_general",
      name: "General Adhkar",
      file: "data/adhkar_general.json",
    },
    {
      id: "default_adhkar_hisn",
      name: "Hisn al-Muslim",
      file: "data/adhkar_hisn.json",
    },
  ];

  static PROTECTED_SET_IDS = [
    "default_adhkar_morning",
    "default_adhkar_evening",
    "default_adhkar_general",
    "default_adhkar_hisn",
  ];

  constructor(storage) {
    super();
    this.storage = storage;

    // Dashboard elements
    this.cardEl = document.getElementById("adhkarCard");
    this.shellEl = document.getElementById("adhkarCardShell");
    this.prevBtn = document.getElementById("adhkarPrevBtn");
    this.nextBtn = document.getElementById("adhkarNextBtn");
    this.titleEl = document.getElementById("adhkarTitleText");
    this.topTextEl = document.getElementById("adhkarTopText");
    this.englishEl = document.getElementById("adhkarEnglishText");
    this.referenceDividerEl = document.getElementById("adhkarReferenceDivider");
    this.referenceEl = document.getElementById("adhkarReferenceText");
    this.repeatEl = document.getElementById("adhkarRepeatText");
    this.scriptToggleBtn = document.getElementById("adhkarScriptToggleBtn");
    this.fontFamilyBtn = document.getElementById("adhkarFontFamilyBtn");
    this.fontScaleDecreaseBtn = document.getElementById(
      "adhkarFontDecreaseBtn",
    );
    this.fontScaleIncreaseBtn = document.getElementById(
      "adhkarFontIncreaseBtn",
    );

    // Dashboard jump controls
    this.jumpLabelEl = document.getElementById("adhkarJumpLabel");
    this.jumpSliderEl = document.getElementById("adhkarJumpSlider");
    this.jumpInputEl = document.getElementById("adhkarJumpInput");

    // Auto-advance toggle elements
    this.autoAdvanceToggleBtn = document.getElementById(
      "adhkarAutoAdvanceToggleBtn",
    );
    this.autoAdvanceStatusEl = document.getElementById("adhkarAutoStatus");
    this.autoAdvanceWrapEl = document.getElementById("adhkarAutoWrap");

    // Settings elements (may not exist until modal opened)
    this.settingsSetSelect = null;
    this.settingsImportBtn = null;
    this.settingsExportBtn = null;
    this.settingsDeleteSetBtn = null;
    this.settingsNewSetBtn = null;
    this.settingsImportInput = null;
    this.settingsAddItemBtn = null;
    this.settingsLanguagePickerBtn = null;
    this.settingsList = null;
    this.settingsPagination = null;
    this.settingsMeta = null;

    // Settings controls
    this.settingsAutoAdvanceSeconds = null;

    // Typography controls
    this.settingsArabicFontSize = null;
    this.settingsArabicFontSizeValue = null;
    this.settingsRomanizationFontSize = null;
    this.settingsRomanizationFontSizeValue = null;
    this.settingsEnglishFontSize = null;
    this.settingsEnglishFontSizeValue = null;

    // State
    this.currentCardIndex = 0;
    this.settingsPage = 1;

    // Settings editor state
    this._settingsReadOnly = false;

    // Debounce timer for editor saves
    this.saveTimer = null;

    // Dashboard animation timers
    this._dashboardAnimating = false;
    this._dashboardMidTimer = null;
    this._dashboardEndTimer = null;

    // Script toggle animation timer
    this._scriptToggleTimer = null;

    // Auto-advance timer
    this._autoAdvanceTimer = null;
    this._hoverPauseAutoAdvance = false;

    // Set selector modal state
    this._setModalPage = 1;
    this._setModalSearchQuery = "";
    this._setModal = null;

    // Language selector state
    this._langModal = null;
    this._langModalContext = "dashboard";
    this._selectedLangCode = null;

    // Arabic font picker state
    this._arabicFontFamily = "KFGQPC Uthman Taha Naskh";
    this._fontModal = null;
    this.defaultSets = [];

    // Listen for icon theme changes
    document.addEventListener("md:icon-theme-change", () => {
      this._updateSetSelectorIcon();
      this._updateSetModalIcons();
      this.updateLanguageSelectorButton();
      if (this.settingsSetSelect) {
        this.renderSettings();
      }
    });
  }

  /**
   * Update set selector button icon
   */
  _updateSetSelectorIcon() {
    if (this._setModalBtn) {
      this._setModalBtn.innerHTML = this._getIcon("📚", { size: 18 });
    }
  }

  /**
   * Update set modal icons
   */
  _updateSetModalIcons() {
    if (this._setModal) {
      const titleEl = this._setModal.querySelector(".adhkar-set-modal-title");
      if (titleEl) {
        titleEl.innerHTML = `${this._getIcon("📚", {
          size: 20,
        })} Select Adhkar Set`;
      }

      if (this._setModal.classList.contains("active")) {
        this.renderSetSelectorModal();
      }
    }
  }

  async init() {
    await this.ensureDefaultSets();
    this.applyArabicFontFamily(this.getAdhkarSettings().arabicFontFamily, {
      persist: false,
    });
    this.applyTypography();
    this.createSetSelectorButton();
    this.createSetSelectorModal();
    this.createLanguageSelectorButton();
    this.createLanguageSelectorModal();
    this.createFontPickerModal();
    this.bindDashboardEvents();
    this.restoreCurrentCardIndexForActiveSet();
    this.renderDashboard();
    this.ensureAutoAdvanceState({ reset: true });
  }

  // ---------- Storage ----------

  getStoredCustomSets() {
    const stored = this.storage.get("adhkarSets", []);
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
    return this.storage.set("adhkarSets", customSets);
  }

  getAdhkarSettings() {
    const settings = this.storage.getSettings();
    const adhkar = settings.adhkar || {};
    return adhkar;
  }

  setAdhkarSettings(updates) {
    const settings = this.storage.getSettings();
    const current = settings.adhkar || {};
    settings.adhkar = { ...current, ...updates };
    this.storage.saveSettings(settings);
  }

  getActiveSetId() {
    return this.getAdhkarSettings().activeSetId || null;
  }

  setActiveSetId(setId) {
    this.setAdhkarSettings({ activeSetId: setId });
  }

  getActiveSet() {
    const sets = this.getSets();
    const activeId = this.getActiveSetId();
    if (!sets.length) return null;
    return sets.find((s) => s.id === activeId) || sets[0];
  }

  // ---------- Persisted current card index ----------

  getCardIndexBySet() {
    const map = this.storage.get("adhkarCardIndexBySet", {});
    return map && typeof map === "object" && !Array.isArray(map) ? map : {};
  }

  saveCardIndexBySet(map) {
    return this.storage.set("adhkarCardIndexBySet", map);
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

  setCurrentCardIndex(nextIndex, { cancelAnimation = true } = {}) {
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

    if (cancelAnimation) this.cancelDashboardAnimation();

    if (this.currentCardIndex !== prev) {
      this.persistCurrentCardIndex();
    }

    this.renderDashboard();
    this.ensureAutoAdvanceState({ reset: true });
  }

  // ---------- Auto-advance ----------

  getAutoAdvanceSeconds() {
    const settings = this.getAdhkarSettings();
    return this.clampNumber(
      parseInt(settings.autoAdvanceSeconds, 10),
      1,
      3600,
      15,
    );
  }

  setAutoAdvanceSeconds(seconds) {
    const clamped = this.clampNumber(parseInt(seconds, 10), 1, 3600, 15);
    this.setAdhkarSettings({ autoAdvanceSeconds: clamped });
    this.ensureAutoAdvanceState({ reset: true });
    return clamped;
  }

  getAutoAdvancePaused() {
    const settings = this.getAdhkarSettings();
    return !!settings.autoAdvancePaused;
  }

  setAutoAdvancePaused(paused) {
    const next = !!paused;
    this.setAdhkarSettings({ autoAdvancePaused: next });

    if (next) {
      this.clearAutoAdvanceTimer();
    } else {
      this.ensureAutoAdvanceState({ reset: true });
    }

    this.updateAutoAdvanceToggleUi();
    return next;
  }

  toggleAutoAdvancePaused() {
    const next = !this.getAutoAdvancePaused();
    this.setAutoAdvancePaused(next);
  }

  updateAutoAdvanceToggleUi() {
    if (!this.autoAdvanceToggleBtn)
      this.autoAdvanceToggleBtn = document.getElementById(
        "adhkarAutoAdvanceToggleBtn",
      );
    if (!this.autoAdvanceStatusEl)
      this.autoAdvanceStatusEl = document.getElementById("adhkarAutoStatus");
    if (!this.autoAdvanceWrapEl)
      this.autoAdvanceWrapEl = document.getElementById("adhkarAutoWrap");

    if (
      !this.autoAdvanceToggleBtn &&
      !this.autoAdvanceStatusEl &&
      !this.autoAdvanceWrapEl
    )
      return;

    const paused = this.getAutoAdvancePaused();
    const cards = this.getActiveSet()?.cards || [];
    const visible = cards.length > 1;

    if (this.autoAdvanceToggleBtn) {
      this.autoAdvanceToggleBtn.setAttribute(
        "aria-pressed",
        paused ? "true" : "false",
      );
      this.autoAdvanceToggleBtn.dataset.paused = paused ? "true" : "false";
      this.autoAdvanceToggleBtn.title = paused
        ? "Resume auto-advance"
        : "Pause auto-advance";
      this.autoAdvanceToggleBtn.setAttribute(
        "aria-label",
        paused ? "Resume auto-advance" : "Pause auto-advance",
      );
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

  clearAutoAdvanceTimer() {
    if (this._autoAdvanceTimer) {
      clearTimeout(this._autoAdvanceTimer);
      this._autoAdvanceTimer = null;
    }
  }

  ensureAutoAdvanceState({ reset = false } = {}) {
    const activeSet = this.getActiveSet();
    const cards = activeSet?.cards || [];
    const paused = this.getAutoAdvancePaused() || this._hoverPauseAutoAdvance;

    if (cards.length <= 1 || paused) {
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

  // ---------- Script toggle (Arabic vs Romanization) ----------

  getShowRomanization() {
    const settings = this.getAdhkarSettings();
    return !!settings.showRomanization;
  }

  setShowRomanization(show) {
    const next = !!show;
    this.setAdhkarSettings({ showRomanization: next });
    this.renderDashboard({ animateScriptToggle: true });
    return next;
  }

  toggleScript() {
    this.setShowRomanization(!this.getShowRomanization());
  }

  // ---------- Default bootstrap ----------

  async ensureDefaultSets() {
    const defs = Array.isArray(AdhkarManager.DEFAULT_SETS)
      ? AdhkarManager.DEFAULT_SETS
      : [];

    const loadedDefaults = await Promise.all(
      defs.map((def) => this.loadDefaultSet(def)),
    );
    this.defaultSets = loadedDefaults;

    // Migration cleanup: remove legacy stored copies of protected default sets.
    const stored = this.storage.get("adhkarSets", []);
    if (Array.isArray(stored)) {
      const cleaned = stored.filter((set) => !this.isProtectedSetId(set?.id));
      if (cleaned.length !== stored.length) {
        this.storage.set("adhkarSets", cleaned);
      }
    }

    const sets = this.getSets();
    if (!sets.length) return;

    // Ensure active set id exists
    const activeId = this.getActiveSetId();
    if (!activeId || !sets.some((s) => s.id === activeId)) {
      const preferredId = "default_adhkar_morning";
      const preferredExists = sets.some((s) => s.id === preferredId);
      this.setActiveSetId(preferredExists ? preferredId : sets[0]?.id || null);
    }
  }

  async loadDefaultSet(def) {
    const now = new Date().toISOString();

    try {
      const res = await fetch(def.file, { cache: "no-store" });
      if (!res.ok)
        throw new Error(`Failed to load default JSON: ${res.status}`);
      const json = await res.json();
      const cards = this.normalizeImportedCards(json);
      return {
        id: def.id,
        name: def.name,
        createdAt: now,
        cards,
      };
    } catch (e) {
      console.error(`Adhkar: failed to initialize default set ${def.id}`, e);
      return {
        id: def.id,
        name: def.name,
        createdAt: now,
        cards: [],
      };
    }
  }

  /**
   * Backward-compatible refresh entrypoint.
   * Default sets are file-backed and reloaded at runtime.
   */
  async refreshDefaultData() {
    await this.ensureDefaultSets();
    this.restoreCurrentCardIndexForActiveSet();
    this.renderDashboard();
    this.renderSettings();
    this.ensureAutoAdvanceState({ reset: true });
  }

  // ---------- Dashboard events ----------

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

  // ---------- Typography ----------

  applyTypography() {
    if (!this.cardEl) return;
    const t = this.getTypography();
    const scale = this.getFontScale();
    const titleBase = t.romanization * 1.1;
    const titleSize = this.scaleTypographyValue(titleBase, scale);
    const arabic = this.scaleTypographyValue(t.arabic, scale);
    const romanization = this.scaleTypographyValue(t.romanization, scale);
    const english = this.scaleTypographyValue(t.english, scale);
    this.cardEl.style.setProperty("--adhkar-title-font-size", `${titleSize}px`);
    this.cardEl.style.setProperty("--adhkar-arabic-font-size", `${arabic}px`);
    this.cardEl.style.setProperty(
      "--adhkar-romanization-font-size",
      `${romanization}px`,
    );
    this.cardEl.style.setProperty("--adhkar-english-font-size", `${english}px`);
    this.updateFontScaleButtons();
  }

  getTypography() {
    const settings = this.getAdhkarSettings();
    return {
      arabic: this.clampNumber(
        parseInt(settings.arabicFontSize, 10),
        12,
        144,
        40,
      ),
      romanization: this.clampNumber(
        parseInt(settings.romanizationFontSize, 10),
        12,
        144,
        18,
      ),
      english: this.clampNumber(
        parseInt(settings.englishFontSize, 10),
        12,
        144,
        18,
      ),
    };
  }

  getFontScale() {
    const settings = this.getAdhkarSettings();
    const raw = settings.fontScale;
    const parsed = parseFloat(raw);
    const scale = Number.isFinite(parsed) ? parsed : 1;
    return this.clampNumber(
      scale,
      AdhkarManager.FONT_SCALE_MIN,
      AdhkarManager.FONT_SCALE_MAX,
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
      AdhkarManager.FONT_SCALE_MIN,
      AdhkarManager.FONT_SCALE_MAX,
      1,
    );
    this.setAdhkarSettings({ fontScale: normalized });
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
        scale <= AdhkarManager.FONT_SCALE_MIN + 0.001;
      this.fontScaleDecreaseBtn.title = `Decrease font size (${label})`;
      this.fontScaleDecreaseBtn.setAttribute(
        "aria-label",
        `Decrease adhkar font size (${label})`,
      );
    }

    if (this.fontScaleIncreaseBtn) {
      this.fontScaleIncreaseBtn.disabled =
        scale >= AdhkarManager.FONT_SCALE_MAX - 0.001;
      this.fontScaleIncreaseBtn.title = `Increase font size (${label})`;
      this.fontScaleIncreaseBtn.setAttribute(
        "aria-label",
        `Increase adhkar font size (${label})`,
      );
    }
  }

  updateTypographyLabels(arabic, romanization, english) {
    if (this.settingsArabicFontSizeValue)
      this.settingsArabicFontSizeValue.textContent = `${arabic}px`;
    if (this.settingsRomanizationFontSizeValue)
      this.settingsRomanizationFontSizeValue.textContent = `${romanization}px`;
    if (this.settingsEnglishFontSizeValue)
      this.settingsEnglishFontSizeValue.textContent = `${english}px`;
  }

  normalizeArabicFontFamily(value) {
    const v = String(value || "").trim();
    if (AdhkarManager.ARABIC_FONT_FAMILIES.includes(v)) return v;
    return "KFGQPC Uthman Taha Naskh";
  }

  applyArabicFontFamily(fontFamily, opts = {}) {
    const { persist = false } = opts;
    const normalized = this.normalizeArabicFontFamily(fontFamily);
    this._arabicFontFamily = normalized;

    if (this.cardEl) {
      const cssValue = `"${normalized}", var(--font-arabic)`;
      this.cardEl.style.setProperty("--adhkar-arabic-font-family", cssValue);
    }

    if (this.fontFamilyBtn) {
      const title = `Change Arabic font (current: ${normalized})`;
      this.fontFamilyBtn.title = title;
      this.fontFamilyBtn.setAttribute("aria-label", title);
    }

    if (persist) {
      this.setAdhkarSettings({ arabicFontFamily: normalized });
    }
  }

  createFontPickerModal() {
    if (document.getElementById("adhkarFontModal")) return;

    const modal = document.createElement("div");
    modal.id = "adhkarFontModal";
    modal.className = "pq-bookmark-modal";
    modal.innerHTML = `
      <div class="pq-bookmark-modal-content pq-translation-modal-content">
        <div class="pq-bookmark-modal-header">
          <h3 class="pq-bookmark-modal-title">Aa Arabic Font</h3>
          <button type="button" class="pq-bookmark-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="pq-bookmark-modal-body">
          <div class="pq-bookmark-search">
            <input type="text" class="pq-bookmark-search-input adhkar-font-search" placeholder="Search fonts..." />
          </div>
          <div class="pq-translation-list">
            <div class="pq-translation-items adhkar-font-items"></div>
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

    const searchInput = modal.querySelector(".adhkar-font-search");
    searchInput.addEventListener("input", () => {
      this.renderFontList(searchInput.value);
    });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closeFontPickerModal();
    });
  }

  openFontPickerModal() {
    const modal = document.getElementById("adhkarFontModal");
    if (!modal) return;

    const searchInput = modal.querySelector(".adhkar-font-search");
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
    const modal = document.getElementById("adhkarFontModal");
    if (modal) modal.classList.remove("active");
  }

  renderFontList(query = "") {
    const modal = document.getElementById("adhkarFontModal");
    if (!modal) return;

    const container = modal.querySelector(".adhkar-font-items");
    if (!container) return;

    const q = String(query || "")
      .toLowerCase()
      .trim();
    const fonts = AdhkarManager.ARABIC_FONT_FAMILIES.filter((f) =>
      f.toLowerCase().includes(q),
    );

    const current = this.normalizeArabicFontFamily(this._arabicFontFamily);
    let html = "";
    for (const font of fonts) {
      const isActive = font === current;
      html += `<button type="button" class="pq-translation-item ${
        isActive ? "active" : ""
      }" data-font-family="${this.escapeHtmlAttr(font)}">
        <span class="pq-translation-name">${this.escapeHtmlAttr(font)}</span>
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
    container.querySelectorAll(".pq-translation-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const font = btn.getAttribute("data-font-family");
        this.applyArabicFontFamily(font, { persist: true });
        this.closeFontPickerModal();
      });
    });
  }

  // ---------- Language selection ----------

  /**
   * Gets the selected translation language code for the active set.
   * Falls back to 'en' if not set.
   */
  getSelectedLanguageCode() {
    const settings = this.getAdhkarSettings();
    const activeSetId = this.getActiveSetId();
    const langMap = settings.languageBySet || {};
    const raw = langMap[activeSetId];
    const normalized =
      typeof raw === "string" || typeof raw === "number"
        ? String(raw).trim().toLowerCase()
        : "";
    return normalized || "en";
  }

  /**
   * Sets the selected translation language code for the active set.
   */
  setSelectedLanguageCode(langCode) {
    const activeSetId = this.getActiveSetId();
    if (!activeSetId) return;

    const normalized =
      typeof langCode === "string" || typeof langCode === "number"
        ? String(langCode).trim().toLowerCase()
        : "";
    if (!normalized) return;

    const settings = this.getAdhkarSettings();
    const langMap = settings.languageBySet || {};
    langMap[activeSetId] = normalized;
    this.setAdhkarSettings({ languageBySet: langMap });
  }

  /**
   * Extracts available translation language codes from a card set.
   * Looks for keys like 'text_en', 'text_id', etc.
   * Also supports legacy 'translation_*' and 'english' keys.
   */
  normalizeLanguageCode(code) {
    return String(code || "")
      .trim()
      .toLowerCase();
  }

  getKnownLanguageMap() {
    return {
      en: "English",
      id: "Indonesian (Bahasa Indonesia)",
      ar: "Arabic",
      tr: "Turkish",
      ur: "Urdu",
      ms: "Malay",
      fr: "French",
      de: "German",
      es: "Spanish",
      bn: "Bengali",
      fa: "Persian (Farsi)",
      hi: "Hindi",
      pt: "Portuguese",
      ru: "Russian",
      zh: "Chinese",
      ja: "Japanese",
      ko: "Korean",
      nl: "Dutch",
      it: "Italian",
      th: "Thai",
    };
  }

  toSortedLanguageList(langCodes) {
    const langNames = this.getKnownLanguageMap();
    const languages = [...langCodes].filter(Boolean).map((code) => ({
      code,
      name: langNames[code] || code.toUpperCase(),
    }));

    languages.sort((a, b) => {
      if (a.code === "en") return -1;
      if (b.code === "en") return 1;
      return a.name.localeCompare(b.name);
    });

    return languages.length ? languages : [{ code: "en", name: "English" }];
  }

  getAvailableLanguages(set) {
    if (!set || !Array.isArray(set.cards) || !set.cards.length) {
      return [{ code: "en", name: "English" }];
    }

    const langCodes = new Set();
    for (const card of set.cards) {
      if (!card || typeof card !== "object" || Array.isArray(card)) continue;

      for (const rawKey of Object.keys(card)) {
        const key = String(rawKey || "");

        let match = key.match(/^text_(.+)$/i);
        if (match) {
          const code = this.normalizeLanguageCode(match[1]);
          if (code) langCodes.add(code);
          continue;
        }

        match = key.match(/^translation_(.+)$/i);
        if (match) {
          const code = this.normalizeLanguageCode(match[1]);
          if (code) langCodes.add(code);
          continue;
        }

        if (key === "english") {
          langCodes.add("en");
        }
      }
    }

    return this.toSortedLanguageList(langCodes);
  }

  getEditorLanguageOptions(set) {
    const actual = this.getAvailableLanguages(set);
    const langCodes = new Set(
      actual.map((l) => this.normalizeLanguageCode(l.code)),
    );

    Object.keys(this.getKnownLanguageMap()).forEach((code) => {
      const normalized = this.normalizeLanguageCode(code);
      if (normalized) langCodes.add(normalized);
    });

    return this.toSortedLanguageList(langCodes);
  }

  /**
   * Gets the translation text from a card based on selected language.
   */
  getCardTranslation(card) {
    if (!card) return "(no translation)";

    const langCode = this.getSelectedLanguageCode();

    // Try text_<langCode> first (current format)
    const textKey = `text_${langCode}`;
    if (card[textKey]) {
      return String(card[textKey]);
    }

    // Backward compatibility for legacy translation_<langCode>
    const translationKey = `translation_${langCode}`;
    if (card[translationKey]) {
      return String(card[translationKey]);
    }

    // Generic text/translation fields (no language code)
    if (card.text) {
      return String(card.text);
    }
    if (card.translation) {
      return String(card.translation);
    }

    // Fall back to legacy 'english' key for English
    if (langCode === "en" && card.english) {
      return String(card.english);
    }

    // Try text_en as fallback
    if (card.text_en) {
      return String(card.text_en);
    }

    // Backward compatibility fallback
    if (card.translation_en) {
      return String(card.translation_en);
    }

    // Final fallback to english
    if (card.english) {
      return String(card.english);
    }

    return "(no translation)";
  }

  /**
   * Gets the title text from a card based on selected language.
   * Supports both legacy `title` and localized `title_<lang>` fields.
   */
  getCardTitle(card) {
    if (!card) return "";

    const langCode = this.getSelectedLanguageCode();

    const localizedKey = `title_${langCode}`;
    if (card[localizedKey]) {
      return String(card[localizedKey]);
    }

    // Legacy single-field title
    if (card.title) {
      return String(card.title);
    }

    // New English title field
    if (card.title_en) {
      return String(card.title_en);
    }

    return "";
  }

  /**
   * Update language selector button visibility and state.
   */
  updateLanguageSelectorButton() {
    const btn = this.cardEl?.querySelector(".adhkar-lang-selector-btn");
    if (!btn) return;

    const activeSet = this.getActiveSet();
    const languages = this.getAvailableLanguages(activeSet);

    // Show when multiple languages are available
    if (languages.length > 1) {
      btn.style.display = "";
      btn.disabled = false;

      const currentLang = this.getSelectedLanguageCode();
      const langInfo =
        languages.find((l) => l.code === currentLang) || languages[0];
      const langCodeRaw = String(langInfo.code || "en").toLowerCase();
      const langCode = langCodeRaw === "en" ? "US" : langCodeRaw.toUpperCase();
      const langIcon = this._getIcon("🌐", { size: 16 });
      btn.innerHTML = `<span class="lang-icon" aria-hidden="true">${langIcon}</span><span class="lang-label">${langCode}</span>`;
      btn.title = `Translation: ${langInfo.name}`;
      btn.setAttribute("aria-label", `Translation: ${langInfo.name}`);
    } else {
      btn.style.display = "none";
      btn.disabled = true;
    }
  }

  updateSettingsLanguagePickerButton() {
    const btn = this.settingsLanguagePickerBtn;
    if (!btn) return;

    const activeSet = this.getActiveSet();
    const editorOptions = this.getEditorLanguageOptions(activeSet);
    const current = this.normalizeLanguageCode(this.getSelectedLanguageCode());
    const langInfo = editorOptions.find((l) => l.code === current) ||
      editorOptions.find((l) => l.code === "en") ||
      editorOptions[0] || { code: "en", name: "English" };

    btn.innerHTML = `<span>Editor Language: ${this.escapeHtmlAttr(
      `${langInfo.name} (${langInfo.code.toUpperCase()})`,
    )}</span><span aria-hidden="true">▾</span>`;
    btn.title = `Select editor language (${langInfo.name})`;
    btn.setAttribute(
      "aria-label",
      `Select adhkar editor language (${langInfo.name})`,
    );
  }

  /**
   * Get an emoji flag or icon for a language code.
   */
  getLanguageFlag(code) {
    const flags = {
      en: "🇺🇸",
      id: "🇮🇩",
      ar: "🇸🇦",
      tr: "🇹🇷",
      ur: "🇵🇰",
      ms: "🇲🇾",
      fr: "🇫🇷",
      de: "🇩🇪",
      es: "🇪🇸",
      bn: "🇧🇩",
      fa: "🇮🇷",
      hi: "🇮🇳",
      pt: "🇵🇹",
      ru: "🇷🇺",
      zh: "🇨🇳",
      ja: "🇯🇵",
      ko: "🇰🇷",
      nl: "🇳🇱",
      it: "🇮🇹",
      th: "🇹🇭",
    };
    return flags[code] || "🌐";
  }

  // ---------- Settings tab ----------

  ensureSettingsBound() {
    const panel = document.getElementById("adhkarPanel");
    if (!panel) return false;

    if (!this.settingsSetSelect)
      this.settingsSetSelect = document.getElementById("adhkarSetSelect");
    if (!this.settingsImportBtn)
      this.settingsImportBtn = document.getElementById("adhkarImportBtn");
    if (!this.settingsExportBtn)
      this.settingsExportBtn = document.getElementById("adhkarExportBtn");
    if (!this.settingsDeleteSetBtn)
      this.settingsDeleteSetBtn = document.getElementById("adhkarDeleteSetBtn");
    if (!this.settingsNewSetBtn)
      this.settingsNewSetBtn = document.getElementById("adhkarNewSetBtn");
    if (!this.settingsImportInput)
      this.settingsImportInput = document.getElementById("adhkarImportInput");
    if (!this.settingsAddItemBtn)
      this.settingsAddItemBtn = document.getElementById("adhkarAddItemBtn");
    if (!this.settingsLanguagePickerBtn)
      this.settingsLanguagePickerBtn = document.getElementById(
        "adhkarEditorLangPickerBtn",
      );
    if (!this.settingsList)
      this.settingsList = document.getElementById("adhkarEditorList");
    if (!this.settingsPagination)
      this.settingsPagination = document.getElementById("adhkarPagination");
    if (!this.settingsMeta)
      this.settingsMeta = document.getElementById("adhkarMeta");

    if (!this.settingsAutoAdvanceSeconds)
      this.settingsAutoAdvanceSeconds = document.getElementById(
        "adhkarAutoAdvanceSeconds",
      );

    if (!this.settingsArabicFontSize)
      this.settingsArabicFontSize = document.getElementById(
        "adhkarArabicFontSize",
      );
    if (!this.settingsArabicFontSizeValue)
      this.settingsArabicFontSizeValue = document.getElementById(
        "adhkarArabicFontSizeValue",
      );

    if (!this.settingsRomanizationFontSize)
      this.settingsRomanizationFontSize = document.getElementById(
        "adhkarRomanizationFontSize",
      );
    if (!this.settingsRomanizationFontSizeValue)
      this.settingsRomanizationFontSizeValue = document.getElementById(
        "adhkarRomanizationFontSizeValue",
      );

    if (!this.settingsEnglishFontSize)
      this.settingsEnglishFontSize = document.getElementById(
        "adhkarEnglishFontSize",
      );
    if (!this.settingsEnglishFontSizeValue)
      this.settingsEnglishFontSizeValue = document.getElementById(
        "adhkarEnglishFontSizeValue",
      );

    if (
      !this.settingsSetSelect ||
      !this.settingsImportBtn ||
      !this.settingsExportBtn ||
      !this.settingsDeleteSetBtn ||
      !this.settingsNewSetBtn ||
      !this.settingsImportInput ||
      !this.settingsAddItemBtn ||
      !this.settingsList ||
      !this.settingsPagination ||
      !this.settingsMeta
    ) {
      return false;
    }

    if (panel.dataset.bound === "true") return true;
    panel.dataset.bound = "true";

    this.settingsSetSelect.addEventListener("change", () => {
      const setId = this.settingsSetSelect.value;
      this.setActiveSetId(setId);
      this.restoreCurrentCardIndexForActiveSet();
      this.settingsPage = 1;
      this.renderSettings();
      this.renderDashboard();
      this.ensureAutoAdvanceState({ reset: true });
    });

    this.settingsNewSetBtn.addEventListener("click", () => {
      this.createNewSet();
    });

    this.settingsDeleteSetBtn.addEventListener("click", () => {
      this.deleteActiveSet();
    });

    this.settingsAddItemBtn.addEventListener("click", () => {
      this.addItemToActiveSet();
    });

    if (this.settingsLanguagePickerBtn) {
      this.settingsLanguagePickerBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.openLanguageSelectorModal("settingsEditor");
      });
    }

    this.settingsImportBtn.addEventListener("click", () => {
      this.settingsImportInput.click();
    });

    this.settingsImportInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      this.importJsonFile(file);
      e.target.value = "";
    });

    this.settingsExportBtn.addEventListener("click", () => {
      this.exportActiveSetJson();
    });

    if (this.settingsAutoAdvanceSeconds) {
      this.settingsAutoAdvanceSeconds.addEventListener("change", () => {
        const next = this.setAutoAdvanceSeconds(
          this.settingsAutoAdvanceSeconds.value,
        );
        this.settingsAutoAdvanceSeconds.value = String(next);
      });
    }

    const bindFontRange = (rangeEl, valueEl, key) => {
      if (!rangeEl) return;
      rangeEl.addEventListener("input", () => {
        const t = this.getTypography();
        const v = this.clampNumber(
          parseInt(rangeEl.value, 10),
          12,
          144,
          t[key],
        );
        rangeEl.value = String(v);
        this.setAdhkarSettings({ [`${key}FontSize`]: v });
        const nextT = this.getTypography();
        this.updateTypographyLabels(
          nextT.arabic,
          nextT.romanization,
          nextT.english,
        );
        this.applyTypography();
      });
    };

    bindFontRange(
      this.settingsArabicFontSize,
      this.settingsArabicFontSizeValue,
      "arabic",
    );
    bindFontRange(
      this.settingsRomanizationFontSize,
      this.settingsRomanizationFontSizeValue,
      "romanization",
    );
    bindFontRange(
      this.settingsEnglishFontSize,
      this.settingsEnglishFontSizeValue,
      "english",
    );

    // Editor updates (delegated)
    this.settingsList.addEventListener("input", (e) => {
      if (this.isDefaultActiveSet()) return;
      const fieldEl = e.target.closest("textarea, input");
      if (!fieldEl) return;
      const row = fieldEl.closest(".adhkar-editor-row");
      if (!row) return;
      const idx = Number(row.dataset.index);
      const field = fieldEl.dataset.field;
      if (!Number.isFinite(idx)) return;
      this.updateItemField(idx, field, fieldEl.value);

      // Auto-resize textareas for a polished editor UX
      if (fieldEl.tagName === "TEXTAREA") {
        this.autoResizeTextarea(fieldEl);
      }
    });

    this.settingsList.addEventListener("click", (e) => {
      if (this.isDefaultActiveSet()) return;
      const btn = e.target.closest("button");
      if (!btn) return;
      const action = btn.dataset.action;
      if (action !== "delete-item") return;
      const row = btn.closest(".adhkar-editor-row");
      if (!row) return;
      const idx = Number(row.dataset.index);
      if (!Number.isFinite(idx)) return;
      this.deleteItemAtIndex(idx);
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

    if (this.settingsAddItemBtn) {
      this.settingsAddItemBtn.disabled = this._settingsReadOnly;
      this.settingsAddItemBtn.title = this._settingsReadOnly
        ? "This default set cannot be edited"
        : "Add item";
    }

    // Meta
    const totalItems = active?.cards?.length || 0;
    const totalSets = sets.length;
    if (this.settingsMeta) {
      this.settingsMeta.textContent = `${totalItems} items • ${totalSets}/${AdhkarManager.MAX_SETS} sets`;
    }

    // Typography
    const t = this.getTypography();
    if (this.settingsArabicFontSize)
      this.settingsArabicFontSize.value = String(t.arabic);
    if (this.settingsRomanizationFontSize)
      this.settingsRomanizationFontSize.value = String(t.romanization);
    if (this.settingsEnglishFontSize)
      this.settingsEnglishFontSize.value = String(t.english);

    this.updateTypographyLabels(t.arabic, t.romanization, t.english);
    this.applyTypography();

    if (this.settingsAutoAdvanceSeconds) {
      this.settingsAutoAdvanceSeconds.value = String(
        this.getAutoAdvanceSeconds(),
      );
    }

    this.updateSettingsLanguagePickerButton();

    this.renderEditorList();
    this.renderPagination();
  }

  renderEditorList() {
    const active = this.getActiveSet();
    const items = active?.cards || [];
    const isDefault = this.isProtectedSetId(active?.id);

    if (!this.settingsList) return;

    // For default sets, show a message instead of the editor
    if (isDefault) {
      this.settingsList.innerHTML = `
        <div class="adhkar-default-notice">
          <div class="adhkar-default-notice-icon">${this._getIcon("🔒", {
            size: 24,
          })}</div>
          <div class="adhkar-default-notice-title">Default Adhkar Set</div>
          <div class="adhkar-default-notice-text">
            This is a protected default set and cannot be edited. 
            You can still view and recite from it, or create a custom set to add your own adhkar.
          </div>
          <button class="setting-btn adhkar-default-notice-btn" type="button" id="adhkarCreateCustomBtn">
            ${this._getIcon("➕", { size: 16 })} Create Custom Set
          </button>
        </div>
      `;

      // Bind the create custom set button
      const createBtn = this.settingsList.querySelector(
        "#adhkarCreateCustomBtn",
      );
      if (createBtn) {
        createBtn.addEventListener("click", () => this.createNewSet());
      }
      return;
    }

    const total = items.length;
    const pageSize = this.getSettingsPageSize();
    const pages = Math.max(1, Math.ceil(total / pageSize));
    this.settingsPage = Math.min(Math.max(1, this.settingsPage), pages);

    const start = (this.settingsPage - 1) * pageSize;
    const end = Math.min(total, start + pageSize);

    if (!items.length) {
      this.settingsList.innerHTML = `
        <div class="quotes-empty">
          <div class="quotes-empty-title">No adhkar in this set</div>
          <div class="quotes-empty-hint">Use “Add Item” or import a JSON file.</div>
        </div>
      `;
      return;
    }

    const selectedLang =
      this.normalizeLanguageCode(this.getSelectedLanguageCode()) || "en";
    const titleField = `title_${selectedLang}`;
    const textField = `text_${selectedLang}`;
    const langCodeLabel = selectedLang.toUpperCase();

    const rows = [];
    for (let i = start; i < end; i += 1) {
      const c = items[i] || {
        id: "",
        title_en: "",
        repeat: 1,
        reference: "",
        arabic: "",
        romanization: "",
        text_en: "",
      };
      const parsedRepeat = parseInt(c.repeat, 10);
      const repeatValue =
        Number.isFinite(parsedRepeat) && parsedRepeat > 0
          ? String(parsedRepeat)
          : "1";
      const titleValue =
        selectedLang === "en"
          ? (c[titleField] ?? c.title_en ?? c.title ?? "")
          : (c[titleField] ?? "");
      const textValue =
        selectedLang === "en"
          ? (c[textField] ??
            c.translation_en ??
            c.text_en ??
            c.translation ??
            c.text ??
            c.english ??
            "")
          : (c[textField] ?? c[`translation_${selectedLang}`] ?? "");

      rows.push(`
        <tr class="adhkar-editor-row" data-index="${i}">
          <td class="adhkar-col-id">${i + 1}</td>
          <td class="adhkar-col-title-lang">
            <input
              class="adhkar-editor-input setting-input"
              type="text"
              data-field="${this.escapeHtmlAttr(titleField)}"
              placeholder="Title (${this.escapeHtmlAttr(selectedLang)})"
              maxlength="200"
              value="${this.escapeHtmlAttr(titleValue)}"
            />
          </td>
          <td class="adhkar-col-arabic">
            <textarea
              class="adhkar-editor-textarea setting-input"
              data-field="arabic"
              rows="2"
              placeholder="Arabic text"
              maxlength="2000"
            >${this.escapeHtmlAttr(c.arabic || "")}</textarea>
          </td>
          <td class="adhkar-col-romanization">
            <textarea
              class="adhkar-editor-textarea setting-input"
              data-field="romanization"
              rows="2"
              placeholder="Romanization"
              maxlength="2000"
            >${this.escapeHtmlAttr(c.romanization || "")}</textarea>
          </td>
          <td class="adhkar-col-text-lang">
            <textarea
              class="adhkar-editor-textarea setting-input"
              data-field="${this.escapeHtmlAttr(textField)}"
              rows="2"
              placeholder="Text (${this.escapeHtmlAttr(selectedLang)})"
              maxlength="4000"
            >${this.escapeHtmlAttr(textValue)}</textarea>
          </td>
          <td class="adhkar-col-reference">
            <input
              class="adhkar-editor-input setting-input"
              type="text"
              data-field="reference"
              placeholder="Reference"
              maxlength="250"
              value="${this.escapeHtmlAttr(c.reference || "")}" 
            />
          </td>
          <td class="adhkar-col-repeat">
            <input
              class="adhkar-editor-input adhkar-repeat-input setting-input"
              type="number"
              inputmode="numeric"
              min="1"
              max="9999"
              step="1"
              data-field="repeat"
              value="${this.escapeHtmlAttr(repeatValue)}"
            />
          </td>
          <td class="adhkar-col-actions">
            <button
              class="adhkar-row-delete"
              type="button"
              data-action="delete-item"
              title="Delete"
              aria-label="Delete item"
            >
              ×
            </button>
          </td>
        </tr>
      `);
    }

    this.settingsList.innerHTML = `
      <div class="adhkar-editor-table-wrap">
        <table class="adhkar-editor-table">
          <thead>
            <tr>
              <th class="adhkar-col-id">ID</th>
              <th class="adhkar-col-title-lang">Title (${langCodeLabel})</th>
              <th class="adhkar-col-arabic">Arabic</th>
              <th class="adhkar-col-romanization">Romanization</th>
              <th class="adhkar-col-text-lang">Text (${langCodeLabel})</th>
              <th class="adhkar-col-reference">Reference</th>
              <th class="adhkar-col-repeat">Repeat</th>
              <th class="adhkar-col-actions"></th>
            </tr>
          </thead>
          <tbody>
            ${rows.join("")}
          </tbody>
        </table>
      </div>
    `;

    this.autoResizeAllTextareas();
  }

  autoResizeTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  autoResizeAllTextareas() {
    if (!this.settingsList) return;
    const items = this.settingsList.querySelectorAll(
      "textarea.adhkar-editor-textarea",
    );
    items.forEach((t) => this.autoResizeTextarea(t));
  }

  isSettingsEditorDetached() {
    const group = document.getElementById("adhkarEditorGroup");
    return !!group?.closest(".editor-detach-modal.active");
  }

  getSettingsPageSize() {
    return this.isSettingsEditorDetached()
      ? AdhkarManager.DETACHED_PAGE_SIZE
      : AdhkarManager.PAGE_SIZE;
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

  inferSetNameFromFile(filename) {
    const base = String(filename || "")
      .replace(/\.[^.]+$/, "")
      .trim();
    const safe = base || "Imported";
    return safe.slice(0, 40);
  }

  isProtectedSetId(id) {
    return (
      Array.isArray(AdhkarManager.PROTECTED_SET_IDS) &&
      AdhkarManager.PROTECTED_SET_IDS.includes(String(id))
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

    const isTaken = (candidate) =>
      sets.some(
        (s) => String(s.name || "").toLowerCase() === candidate.toLowerCase(),
      );

    const protectedNames = Array.isArray(AdhkarManager.DEFAULT_SETS)
      ? AdhkarManager.DEFAULT_SETS.map((d) =>
          String(d.name || "").toLowerCase(),
        )
      : [];

    if (
      !isTaken(normalized) &&
      !protectedNames.includes(normalized.toLowerCase())
    )
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
    if (sets.length >= AdhkarManager.MAX_SETS) {
      this.showToast(
        `You already have ${AdhkarManager.MAX_SETS} sets. Delete one first.`,
        "error",
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

    const protectedNames = Array.isArray(AdhkarManager.DEFAULT_SETS)
      ? AdhkarManager.DEFAULT_SETS.map((d) =>
          String(d.name || "").toLowerCase(),
        )
      : [];

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

  normalizeImportedCards(data) {
    // Accept shapes:
    // - Array of items: [{arabic, romanization, english, ...}]
    // - Object with cards/items field
    if (Array.isArray(data)) {
      const normalizedCards = data
        .filter((x) => x && typeof x === "object" && !Array.isArray(x))
        .map((x) => {
          const rawId = x.id ?? x.adhkar_id ?? null;
          const parsedIdNum = parseInt(rawId, 10);
          const id = Number.isFinite(parsedIdNum)
            ? parsedIdNum
            : String(rawId || "").trim();

          const rawRepeat = x.repeat ?? x.repeats ?? x.count;
          const parsedRepeat = parseInt(rawRepeat, 10);
          const repeat =
            Number.isFinite(parsedRepeat) && parsedRepeat > 0
              ? parsedRepeat
              : 1;

          const reference = String(x.reference || x.source || "").trim();
          const arabic = String(x.arabic || "").trim();
          const romanization = String(x.romanization || x.roman || "").trim();

          const textFields = {};
          const titleFields = {};

          Object.entries(x || {}).forEach(([rawKey, rawValue]) => {
            if (rawValue == null) return;

            const key = String(rawKey || "");
            const value = String(rawValue).trim();
            if (!value) return;

            let match = key.match(/^text_(.+)$/i);
            if (match) {
              const code = this.normalizeLanguageCode(match[1]);
              if (!code) return;
              textFields[`text_${code}`] = value;
              return;
            }

            match = key.match(/^translation_(.+)$/i);
            if (match) {
              const code = this.normalizeLanguageCode(match[1]);
              if (!code) return;
              if (!textFields[`text_${code}`]) {
                textFields[`text_${code}`] = value;
              }
              return;
            }

            match = key.match(/^title_(.+)$/i);
            if (match) {
              const code = this.normalizeLanguageCode(match[1]);
              if (!code) return;
              titleFields[`title_${code}`] = value;
            }
          });

          const legacyTitle = String(x.title || x.name || "").trim();
          if (legacyTitle && !titleFields.title_en) {
            titleFields.title_en = legacyTitle;
          }

          const legacyText = String(
            x.text || x.translation || x.translation_en || x.english || "",
          ).trim();
          if (legacyText) {
            if (x.isArabic === true) {
              if (!textFields.text_ar) textFields.text_ar = legacyText;
            } else if (!textFields.text_en) {
              textFields.text_en = legacyText;
            }
          }

          const hasText = Object.keys(textFields).length > 0;
          const hasTitle = Object.keys(titleFields).length > 0;
          if (!arabic && !romanization && !reference && !hasText && !hasTitle) {
            return null;
          }

          const normalized = {
            arabic,
            romanization,
            reference,
            repeat,
            ...titleFields,
            ...textFields,
          };

          if (id !== "") normalized.id = id;

          return normalized;
        })
        .filter(Boolean);

      // Keep only unique card payloads (ignoring `id`) to avoid duplicate key/value entries.
      const deduped = [];
      const seen = new Set();
      for (const card of normalizedCards) {
        const cmp = { ...card };
        delete cmp.id;
        const ordered = {};
        Object.keys(cmp)
          .sort()
          .forEach((k) => {
            ordered[k] = cmp[k];
          });
        const key = JSON.stringify(ordered);
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(card);
      }

      return deduped;
    }

    if (data && typeof data === "object") {
      const arr =
        data.cards || data.items || data.adhkar || data.entries || data.data;
      return this.normalizeImportedCards(Array.isArray(arr) ? arr : []);
    }

    return [];
  }

  async importJsonFile(file) {
    const name = this.inferSetNameFromFile(file.name);

    const sets = this.getSets();
    let effectiveName = name;
    let existing = sets.find(
      (s) => String(s.name || "").toLowerCase() === name.toLowerCase(),
    );

    // Never allow replacing a protected default set; create a new set instead.
    if (existing && this.isProtectedSetId(existing.id)) {
      existing = null;
      effectiveName = this.makeUniqueSetName(effectiveName, sets);
    }

    if (!existing && sets.length >= AdhkarManager.MAX_SETS) {
      this.showToast(
        `You already have ${AdhkarManager.MAX_SETS} sets. Delete one first.`,
        "error",
      );
      return;
    }

    let json;
    try {
      const text = await file.text();
      json = JSON.parse(text);
    } catch (e) {
      this.showToast("Could not read the JSON file.", "error");
      return;
    }

    const cards = this.normalizeImportedCards(json);
    if (!cards.length) {
      this.showToast("JSON contains no valid adhkar items.", "error");
      return;
    }

    const now = new Date().toISOString();

    if (existing) {
      const ok = confirm(
        `A set named "${existing.name}" already exists. Replace it?`,
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

  exportActiveSetJson() {
    const active = this.getActiveSet();
    if (!active) return;

    const payload = this.normalizeImportedCards(active.cards || []);
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${this.slugify(active.name || "adhkar")}.json`;
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

  addItemToActiveSet() {
    const sets = this.getSets();
    const activeId = this.getActiveSetId();
    const active = sets.find((s) => s.id === activeId) || sets[0];
    if (!active) return;

    if (this.isProtectedSetId(active.id)) {
      this.showToast("This default set cannot be edited.", "error");
      return;
    }

    active.cards = Array.isArray(active.cards) ? active.cards : [];
    const currentLang =
      this.normalizeLanguageCode(this.getSelectedLanguageCode()) || "en";
    const titleField = `title_${currentLang}`;
    const textField = `text_${currentLang}`;
    const newItem = {
      repeat: 1,
      reference: "",
      arabic: "",
      romanization: "",
      title_en: "",
      text_en: "",
    };
    if (currentLang !== "en") {
      newItem[titleField] = "";
      newItem[textField] = "";
    }
    active.cards.push(newItem);
    active.updatedAt = new Date().toISOString();
    this.saveSets(sets);

    const total = active.cards.length;
    const pageSize = this.getSettingsPageSize();
    const pages = Math.max(1, Math.ceil(total / pageSize));
    this.settingsPage = pages;

    this.renderSettings();
    this.showToast("Item added.", "success");
  }

  updateItemField(globalIndex, field, value) {
    const sets = this.getSets();
    const activeId = this.getActiveSetId();
    const active = sets.find((s) => s.id === activeId) || sets[0];
    if (!active || !active.cards || !active.cards[globalIndex]) return;

    if (this.isProtectedSetId(active.id)) return;

    const normalizedField = String(field || "").trim();
    const baseAllowed = new Set([
      "title",
      "repeat",
      "reference",
      "arabic",
      "romanization",
      "translation",
      "english",
      "text",
    ]);
    const isLocalizedField = /^(title|text)_[a-z0-9-]+$/i.test(normalizedField);
    if (!baseAllowed.has(normalizedField) && !isLocalizedField) return;

    let targetField = normalizedField;
    if (targetField === "title") targetField = "title_en";
    if (
      targetField === "translation" ||
      targetField === "english" ||
      targetField === "text"
    ) {
      targetField = "text_en";
    }

    if (targetField === "repeat") {
      const n = parseInt(value, 10);
      const normalized = Number.isFinite(n) && n > 0 ? Math.min(n, 9999) : 1;
      active.cards[globalIndex][targetField] = normalized;
    } else {
      active.cards[globalIndex][targetField] = String(value ?? "");
    }
    active.updatedAt = new Date().toISOString();

    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveSets(sets);
      this.renderDashboard();
    }, 250);
  }

  deleteItemAtIndex(globalIndex) {
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

    const pages = Math.max(
      1,
      Math.ceil((active.cards.length || 0) / this.getSettingsPageSize()),
    );
    this.settingsPage = Math.min(this.settingsPage, pages);

    this.renderSettings();
    this.renderDashboard();
    this.showToast("Item deleted.", "success");
  }

  // ---------- Set selector modal (Dashboard) ----------

  createSetSelectorButton() {
    const headerActions = this.cardEl?.querySelector(".card-header-actions");
    if (!headerActions) return;

    // Ensure the script toggle button appears first (left-most)
    const scriptBtn =
      this.scriptToggleBtn ||
      headerActions.querySelector("#adhkarScriptToggleBtn");
    if (scriptBtn && headerActions.contains(scriptBtn)) {
      headerActions.insertBefore(scriptBtn, headerActions.firstChild);
    }

    // If selector button already exists, nothing more to do
    if (headerActions.querySelector(".adhkar-set-selector-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "adhkar-set-selector-btn";
    btn.innerHTML = this._getIcon("📚", { size: 18 });
    this._setModalBtn = btn;
    btn.title = "Select adhkar set";
    btn.setAttribute("aria-label", "Select adhkar set");

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      this.openSetSelectorModal();
    });

    // Insert after the script toggle if present, otherwise insert at the start
    if (scriptBtn && headerActions.contains(scriptBtn)) {
      headerActions.insertBefore(btn, scriptBtn.nextSibling);
    } else {
      headerActions.insertBefore(btn, headerActions.firstChild);
    }
  }

  // ---------- Language selector button & modal ----------

  createLanguageSelectorButton() {
    const headerActions = this.cardEl?.querySelector(".card-header-actions");
    if (!headerActions) return;

    // If language selector button already exists, skip
    if (headerActions.querySelector(".adhkar-lang-selector-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "adhkar-lang-selector-btn";
    const langIcon = this._getIcon("🌐", { size: 16 });
    btn.innerHTML = `<span class="lang-icon" aria-hidden="true">${langIcon}</span><span class="lang-label">Lang</span>`;
    btn.title = "Select translation language";
    btn.setAttribute("aria-label", "Select translation language");
    btn.style.display = "none"; // Hidden by default

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      this.openLanguageSelectorModal();
    });

    // Insert at the very start (left of script toggle)
    const scriptBtn = headerActions.querySelector("#adhkarScriptToggleBtn");
    if (scriptBtn) {
      headerActions.insertBefore(btn, scriptBtn);
    } else {
      headerActions.insertBefore(btn, headerActions.firstChild);
    }
  }

  createLanguageSelectorModal() {
    if (document.getElementById("adhkarLangModal")) return;

    const modal = document.createElement("div");
    modal.id = "adhkarLangModal";
    modal.className = "pq-bookmark-modal adhkar-lang-modal";
    modal.innerHTML = `
      <div class="adhkar-lang-modal-content">
        <div class="adhkar-lang-modal-header">
          <div class="adhkar-lang-modal-title">
            <span aria-hidden="true">🌐</span>
            Select Language
          </div>
          <button class="adhkar-lang-modal-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="adhkar-lang-modal-body">
          <div class="adhkar-lang-search">
            <input type="text" class="adhkar-lang-search-input" placeholder="Search languages..." />
          </div>
          <div class="adhkar-lang-list"></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this._langModal = modal;

    const closeBtn = modal.querySelector(".adhkar-lang-modal-close");
    closeBtn?.addEventListener("click", () =>
      this.closeLanguageSelectorModal(),
    );

    this._bindOverlayCloseBehavior(modal, () =>
      this.closeLanguageSelectorModal(),
    );

    const searchInput = modal.querySelector(".adhkar-lang-search-input");
    searchInput?.addEventListener("input", (e) => {
      this.renderLanguageSelectorModal(String(e.target.value || ""));
    });

    this.renderLanguageSelectorModal("");
  }

  openLanguageSelectorModal(context = "dashboard") {
    if (!this._langModal) this.createLanguageSelectorModal();
    if (!this._langModal) return;

    this._langModalContext =
      context === "settingsEditor" ? "settingsEditor" : "dashboard";

    this._langModal.classList.add("active");

    const searchInput = this._langModal.querySelector(
      ".adhkar-lang-search-input",
    );
    if (searchInput) searchInput.value = "";

    this.renderLanguageSelectorModal("");

    setTimeout(() => {
      try {
        searchInput?.focus();
      } catch (e) {}
    }, 50);
  }

  closeLanguageSelectorModal() {
    if (!this._langModal) return;
    this._langModal.classList.remove("active");
  }

  renderLanguageSelectorModal(searchQuery = "") {
    if (!this._langModal) return;

    const activeSet = this.getActiveSet();
    const context =
      this._langModalContext === "settingsEditor"
        ? "settingsEditor"
        : "dashboard";
    const languages =
      context === "settingsEditor"
        ? this.getEditorLanguageOptions(activeSet)
        : this.getAvailableLanguages(activeSet);
    const current = this.normalizeLanguageCode(this.getSelectedLanguageCode());

    const titleEl = this._langModal.querySelector(".adhkar-lang-modal-title");
    if (titleEl) {
      titleEl.innerHTML = `<span aria-hidden="true">🌐</span>${
        context === "settingsEditor"
          ? "Select Editor Language"
          : "Select Language"
      }`;
    }

    const q = String(searchQuery || "")
      .trim()
      .toLowerCase();
    const filtered = q
      ? languages.filter(
          (l) =>
            l.code.toLowerCase().includes(q) ||
            l.name.toLowerCase().includes(q),
        )
      : languages;

    const listEl = this._langModal.querySelector(".adhkar-lang-list");
    if (!listEl) return;

    if (!filtered.length) {
      listEl.innerHTML = `<div class="adhkar-set-empty">No languages found.</div>`;
      return;
    }

    listEl.innerHTML = filtered
      .map((lang) => {
        const isActive = lang.code === current;
        return `
          <div class="adhkar-lang-item ${
            isActive ? "active" : ""
          }" data-lang="${this.escapeHtmlAttr(lang.code)}">
            <span class="flag" aria-hidden="true">${this.getLanguageFlag(
              lang.code,
            )}</span>
            <div class="adhkar-lang-item-info">
              <div class="adhkar-lang-item-name">${this.escapeHtmlAttr(
                lang.name,
              )}</div>
              <div class="adhkar-lang-item-code">${this.escapeHtmlAttr(
                lang.code,
              )}</div>
            </div>
          </div>
        `;
      })
      .join("");

    if (listEl.dataset.bound !== "true") {
      listEl.dataset.bound = "true";
      listEl.addEventListener("click", (e) => {
        const item = e.target.closest(".adhkar-lang-item");
        if (!item) return;
        const code = item.dataset.lang;
        if (!code) return;

        this.setSelectedLanguageCode(code);
        this.renderDashboard();
        this.renderSettings();
        const clickContext =
          this._langModalContext === "settingsEditor"
            ? "settingsEditor"
            : "dashboard";
        const optionsNow =
          clickContext === "settingsEditor"
            ? this.getEditorLanguageOptions(this.getActiveSet())
            : this.getAvailableLanguages(this.getActiveSet());
        const lang = optionsNow.find((l) => l.code === code);
        if (lang) {
          const prefix =
            clickContext === "settingsEditor" ? "Editor language" : "Language";
          this.showToast(`${prefix}: ${lang.name}`, "success");
        }
        this.closeLanguageSelectorModal();
      });
    }
  }

  createSetSelectorModal() {
    if (document.getElementById("adhkarSetModal")) return;

    const modal = document.createElement("div");
    modal.id = "adhkarSetModal";
    modal.className = "adhkar-set-modal";
    modal.innerHTML = `
      <div class="adhkar-set-modal-content">
        <div class="adhkar-set-modal-header">
          <h3 class="adhkar-set-modal-title">${this._getIcon("📚", {
            size: 20,
          })} Select Adhkar Set</h3>
          <button type="button" class="adhkar-set-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="adhkar-set-modal-body">
          <div class="adhkar-set-search">
            <input type="text" class="adhkar-set-search-input" placeholder="Search sets..." />
          </div>
          <div class="adhkar-set-list"></div>
          <div class="adhkar-set-pagination"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this._setModal = modal;
    this._setModal = modal;

    modal
      .querySelector(".adhkar-set-modal-close")
      .addEventListener("click", () => {
        this.closeSetSelectorModal();
      });

    this._bindOverlayCloseBehavior(modal, () => this.closeSetSelectorModal());

    modal
      .querySelector(".adhkar-set-search-input")
      .addEventListener("input", (e) => {
        this._setModalSearchQuery = e.target.value;
        this._setModalPage = 1;
        this.renderSetSelectorModal();
      });
  }

  openSetSelectorModal() {
    this._setModalSearchQuery = "";
    this._setModalPage = 1;

    const modal = document.getElementById("adhkarSetModal");
    if (modal) {
      modal.classList.add("active");

      const searchInput = modal.querySelector(".adhkar-set-search-input");
      if (searchInput) {
        searchInput.value = "";
        // Focus the search input for convenience and accessibility
        setTimeout(() => {
          searchInput.focus();
          if (typeof searchInput.select === "function") searchInput.select();
        }, 0);
      }

      // Update the header to reflect the modal state for assistive tech
      const headerText = this.cardEl?.querySelector("#adhkarHeaderText");
      if (headerText) headerText.setAttribute("aria-expanded", "true");

      this.renderSetSelectorModal();
    }
  }

  closeSetSelectorModal() {
    const modal = document.getElementById("adhkarSetModal");
    if (modal) {
      modal.classList.remove("active");
      // Update header state for assistive tech
      const headerText = this.cardEl?.querySelector("#adhkarHeaderText");
      if (headerText) headerText.setAttribute("aria-expanded", "false");
    }
  }

  renderSetSelectorModal() {
    const modal = document.getElementById("adhkarSetModal");
    if (!modal) return;

    const listContainer = modal.querySelector(".adhkar-set-list");
    const paginationContainer = modal.querySelector(".adhkar-set-pagination");

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
        <div class="adhkar-set-empty">
          No adhkar sets found.
        </div>
      `;
    } else {
      listContainer.innerHTML = pageSets
        .map((s) => {
          const itemCount = Array.isArray(s.cards) ? s.cards.length : 0;
          const isActive = s.id === activeSetId;
          return `
            <div class="adhkar-set-item ${
              isActive ? "active" : ""
            }" data-set-id="${s.id}">
              <div class="adhkar-set-item-info">
                <span class="adhkar-set-item-name">${this.escapeHtmlAttr(
                  s.name,
                )}</span>
                <span class="adhkar-set-item-meta">${itemCount} item${
                  itemCount === 1 ? "" : "s"
                }</span>
              </div>
              ${
                Array.isArray(AdhkarManager.PROTECTED_SET_IDS) &&
                AdhkarManager.PROTECTED_SET_IDS.includes(s.id)
                  ? `<span class="adhkar-set-item-lock" title="Default set — read only">${this._getIcon(
                      "🔒",
                      { size: 14 },
                    )}</span>`
                  : ""
              }
              ${
                isActive
                  ? `<span style="color: var(--accent-gold);">${this._getIcon(
                      "✓",
                      { size: 16 },
                    )}</span>`
                  : ""
              }
            </div>
          `;
        })
        .join("");

      listContainer.querySelectorAll(".adhkar-set-item").forEach((el) => {
        el.addEventListener("click", () => {
          const setId = el.dataset.setId;
          this.setActiveSetId(setId);
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

    this.renderSetSelectorPagination(paginationContainer, totalPages);
  }

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
      <button type="button" class="adhkar-set-page-btn" data-page="${
        currentPage - 1
      }" ${currentPage === 1 ? "disabled" : ""}>${this._getIcon("←", {
        size: 14,
      })}</button>
      ${pages
        .map((p) =>
          p === "..."
            ? `<span class="adhkar-set-page-btn" style="cursor: default; border: none;">...</span>`
            : `<button type="button" class="adhkar-set-page-btn ${
                p === currentPage ? "active" : ""
              }" data-page="${p}">${p}</button>`,
        )
        .join("")}
      <button type="button" class="adhkar-set-page-btn" data-page="${
        currentPage + 1
      }" ${currentPage === totalPages ? "disabled" : ""}>${this._getIcon("→", {
        size: 14,
      })}</button>
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

  slugify(name) {
    return String(name || "adhkar")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  }

  clampNumber(value, min, max, fallback) {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(min, Math.min(max, value));
  }

  escapeHtmlAttr(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  showToast(message, type = "info") {
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const iconEmoji = type === "success" ? "✓" : type === "error" ? "✗" : "ℹ";
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${this._getIcon(iconEmoji, { size: 16 })}</span>
      <span>${this.escapeHtmlAttr(message)}</span>
    `;

    container.appendChild(toast);

    const removeToast = () => {
      try {
        toast.remove();
      } catch (e) {}
    };

    const hideToast = () => {
      toast.classList.add("toast-hiding");

      const fallbackMs = 350;
      const t = setTimeout(removeToast, fallbackMs);

      toast.addEventListener(
        "transitionend",
        (e) => {
          if (e && e.propertyName && e.propertyName !== "opacity") return;
          clearTimeout(t);
          removeToast();
        },
        { once: true },
      );
    };

    setTimeout(hideToast, 3000);
  }
}

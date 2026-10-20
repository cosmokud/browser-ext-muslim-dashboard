/**
 * AdhkarManager, part 2 of 3.
 * Moved out of js/adhkar.js at method boundaries, so no single file carries the
 * whole class. The class itself is declared in js/adhkar.js; load this after it.
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

  _updateSetSelectorIcon() {
    if (this._setModalBtn) {
      this._setModalBtn.innerHTML = this._getIcon("📚", { size: 18 });
    }
  }

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
    this.applyTranslationFontFamily(
      this.getAdhkarSettings().translationFontFamily,
      { persist: false },
    );
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
      const json = await this.fetchJsonResource(def.file, {
        cache: "no-store",
        label: `Adhkar default set ${def.id}`,
      });
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

  async refreshDefaultData() {
    await this.ensureDefaultSets();
    this.restoreCurrentCardIndexForActiveSet();
    this.renderDashboard();
    this.renderSettings();
    this.ensureAutoAdvanceState({ reset: true });
  }

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

  normalizeTranslationFontFamily(value) {
    const v = String(value || "").trim();
    if (AdhkarManager.TRANSLATION_FONT_FAMILIES.includes(v)) return v;
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

  applyTranslationFontFamily(fontFamily, opts = {}) {
    const { persist = false } = opts;
    const normalized = this.normalizeTranslationFontFamily(fontFamily);
    this._translationFontFamily = normalized;

    if (this.cardEl) {
      this.cardEl.style.setProperty(
        "--adhkar-translation-font-family",
        this.resolveTranslationFontCssValue(normalized),
      );
    }

    if (persist) {
      this.setAdhkarSettings({ translationFontFamily: normalized });
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
          <h3 class="pq-bookmark-modal-title">Arabic Font</h3>
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
});

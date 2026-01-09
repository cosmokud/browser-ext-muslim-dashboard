/**
 * Hadith Manager
 * - Loads default hadith sets from data/*.json on first run
 * - Supports up to 100 hadith sets (JSON import)
 * - Dashboard reader + Settings tab editor (20 items/page)
 */

class HadithManager {
  static MAX_SETS = 100;
  static PAGE_SIZE = 20;

  static NAV_ANIM_MS = 320;

  static DEFAULT_SETS = [
    {
      id: "default_hadith_nawawi40",
      name: "Imam Nawawi 40 Hadith",
      file: "data/hadith_nawawi40.json",
    },
    {
      id: "default_hadith_random200",
      name: "Random 200 Hadith",
      file: "data/hadith_random200.json",
    },
  ];

  static PROTECTED_SET_IDS = [
    "default_hadith_nawawi40",
    "default_hadith_random200",
  ];

  constructor(storage) {
    this.storage = storage;

    // Dashboard elements
    this.cardEl = document.getElementById("hadithCard");
    this.shellEl = document.getElementById("hadithCardShell");
    this.prevBtn = document.getElementById("hadithPrevBtn");
    this.nextBtn = document.getElementById("hadithNextBtn");

    this.titleEl = document.getElementById("hadithTitleText");
    this.textEl = document.getElementById("hadithBodyText");
    this.metaDividerEl = document.getElementById("hadithMetaDivider");
    this.metaEl = document.getElementById("hadithMetaText");

    // Dashboard jump controls
    this.jumpLabelEl = document.getElementById("hadithJumpLabel");
    this.jumpSliderEl = document.getElementById("hadithJumpSlider");
    this.jumpInputEl = document.getElementById("hadithJumpInput");

    // Auto-advance toggle elements
    this.autoAdvanceToggleBtn = document.getElementById(
      "hadithAutoAdvanceToggleBtn"
    );
    this.autoAdvanceStatusEl = document.getElementById("hadithAutoStatus");
    this.autoAdvanceWrapEl = document.getElementById("hadithAutoWrap");

    // Settings elements
    this.settingsSetSelect = null;
    this.settingsImportBtn = null;
    this.settingsExportBtn = null;
    this.settingsDeleteSetBtn = null;
    this.settingsNewSetBtn = null;
    this.settingsRenameSetBtn = null;
    this.settingsImportInput = null;
    this.settingsAddItemBtn = null;
    this.settingsList = null;
    this.settingsPagination = null;
    this.settingsMeta = null;

    // Settings controls
    this.settingsAutoAdvanceSeconds = null;

    // Typography controls
    this.settingsTitleFontSize = null;
    this.settingsTitleFontSizeValue = null;
    this.settingsTextFontSize = null;
    this.settingsTextFontSizeValue = null;
    this.settingsMetaFontSize = null;
    this.settingsMetaFontSizeValue = null;

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

    // Auto-advance timer
    this._autoAdvanceTimer = null;

    // Set selector modal state
    this._setModalPage = 1;
    this._setModalSearchQuery = "";
    this._setModal = null;

    // Language selector state
    this._langModal = null;

    // Listen for icon theme changes
    document.addEventListener("md:icon-theme-change", () => {
      this._updateSetSelectorIcon();
      this._updateSetModalIcons();
    });
  }

  /**
   * Get icon based on current icon theme
   */
  _getIcon(emoji, options = {}) {
    if (window.dashboard?.iconThemes) {
      return window.dashboard.iconThemes.getIcon(emoji, options);
    }
    return emoji;
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
      const titleIcon = this._setModal.querySelector(
        ".hadith-set-modal-title span[aria-hidden]"
      );
      if (titleIcon) {
        titleIcon.innerHTML = this._getIcon("📚", { size: 20 });
      }
    }
  }

  async init() {
    await this.ensureDefaultSets();
    this.applyTypography();
    this.createLanguageSelectorButton();
    this.createLanguageSelectorModal();
    this.createSetSelectorButton();
    this.createSetSelectorModal();
    this.bindDashboardEvents();
    this.restoreCurrentCardIndexForActiveSet();
    this.renderDashboard();
    this.ensureAutoAdvanceState({ reset: true });
  }

  // ---------- Storage ----------

  getSets() {
    return this.storage.get("hadithSets", []);
  }

  saveSets(sets) {
    return this.storage.set("hadithSets", sets);
  }

  getHadithSettings() {
    const settings = this.storage.getSettings();
    const hadith = settings.hadith || {};
    return hadith;
  }

  setHadithSettings(updates) {
    const settings = this.storage.getSettings();
    const current = settings.hadith || {};
    settings.hadith = { ...current, ...updates };
    this.storage.saveSettings(settings);
  }

  getActiveSetId() {
    return this.getHadithSettings().activeSetId || null;
  }

  setActiveSetId(setId) {
    this.setHadithSettings({ activeSetId: setId });
  }

  getActiveSet() {
    const sets = this.getSets();
    const activeId = this.getActiveSetId();
    if (!sets.length) return null;
    return sets.find((s) => s.id === activeId) || sets[0];
  }

  // ---------- Persisted current card index ----------

  getCardIndexBySet() {
    const map = this.storage.get("hadithCardIndexBySet", {});
    return map && typeof map === "object" && !Array.isArray(map) ? map : {};
  }

  saveCardIndexBySet(map) {
    return this.storage.set("hadithCardIndexBySet", map);
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
    const items = activeSet?.cards || [];

    const prev = this.currentCardIndex;
    if (!items.length) {
      this.currentCardIndex = 0;
    } else {
      const clamped = this.clampNumber(
        parseInt(nextIndex, 10),
        0,
        items.length - 1,
        0
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

  normalizeCurrentIndex() {
    const activeSet = this.getActiveSet();
    const items = activeSet?.cards || [];
    if (!items.length) {
      this.currentCardIndex = 0;
      return;
    }
    this.currentCardIndex = this.clampNumber(
      this.currentCardIndex,
      0,
      items.length - 1,
      0
    );
  }

  // ---------- Auto-advance ----------

  getAutoAdvanceSeconds() {
    const settings = this.getHadithSettings();
    return this.clampNumber(
      parseInt(settings.autoAdvanceSeconds, 10),
      1,
      3600,
      20
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

    if (this.getAutoAdvancePaused()) {
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
        paused ? "Resume auto-advance" : "Pause auto-advance"
      );
      const icon = btn.querySelector(".auto-icon");
      if (icon) icon.textContent = paused ? "▶" : "⏸";
    }

    if (status) {
      status.textContent = paused ? "Paused" : "Auto";
    }
  }

  // ---------- Default bootstrap ----------

  async ensureDefaultSets() {
    const sets = this.getSets();
    const defs = Array.isArray(HadithManager.DEFAULT_SETS)
      ? HadithManager.DEFAULT_SETS
      : [];

    const existingSets = Array.isArray(sets) ? sets : [];

    // Fresh install: create all default sets
    if (existingSets.length === 0) {
      const created = [];
      for (const def of defs) {
        created.push(await this.loadDefaultSet(def));
      }
      this.saveSets(created);

      const preferredId = "default_hadith_nawawi40";
      const preferred = created.find((s) => s.id === preferredId) || created[0];
      this.setActiveSetId(preferred?.id || preferredId);
      return;
    }

    // Upgrade path: ensure each default set exists (do not overwrite)
    let changed = false;
    const existingIds = new Set(existingSets.map((s) => s.id));
    for (const def of defs) {
      if (!existingIds.has(def.id)) {
        const newSet = await this.loadDefaultSet(def);
        existingSets.push(newSet);
        changed = true;
      }
    }

    if (changed) {
      this.saveSets(existingSets);
      if (!this.getActiveSetId() && existingSets[0]) {
        this.setActiveSetId(existingSets[0].id);
      }
    }

    // Ensure active set id exists
    const activeId = this.getActiveSetId();
    if (activeId && !existingSets.some((s) => s.id === activeId)) {
      this.setActiveSetId(existingSets[0]?.id || "default_hadith_nawawi40");
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
      console.error(`Hadith: failed to initialize default set ${def.id}`, e);
      return {
        id: def.id,
        name: def.name,
        createdAt: now,
        cards: [],
      };
    }
  }

  /**
   * Refreshes the content of default Hadith sets from JSON files
   */
  async refreshDefaultData() {
    const sets = this.getSets();
    const defs = HadithManager.DEFAULT_SETS;
    let changed = false;

    // Load all default sets in parallel
    const freshSets = await Promise.all(
      defs.map((def) => this.loadDefaultSet(def))
    );

    for (const newSet of freshSets) {
      if (!newSet || !Array.isArray(newSet.cards) || newSet.cards.length === 0)
        continue;

      const idx = sets.findIndex((s) => s.id === newSet.id);
      if (idx !== -1) {
        sets[idx].cards = newSet.cards;
        sets[idx].name = newSet.name;
        changed = true;
      } else {
        sets.push(newSet);
        changed = true;
      }
    }

    if (changed) {
      this.saveSets(sets);

      // If active set was one of them, refresh the current view
      const activeId = this.getActiveSetId();
      if (defs.some((d) => d.id === activeId)) {
        this.renderDashboard();
      }
    }
  }

  normalizeImportedCards(json) {
    const items = Array.isArray(json) ? json : [];

    const normalized = [];
    for (const raw of items) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;

      const id = raw.id ?? raw.hadith_id ?? null;
      const parsedId = parseInt(id, 10);

      normalized.push({
        id: Number.isFinite(parsedId) ? parsedId : null,
        ...raw,
      });
    }

    return normalized;
  }

  // ---------- Language selection ----------

  getSelectedLanguageCode() {
    const settings = this.getHadithSettings();
    const activeSetId = this.getActiveSetId();
    const langMap = settings.languageBySet || {};
    return langMap[activeSetId] || "en";
  }

  setSelectedLanguageCode(langCode) {
    const activeSetId = this.getActiveSetId();
    if (!activeSetId) return;

    const settings = this.getHadithSettings();
    const langMap = settings.languageBySet || {};
    langMap[activeSetId] = langCode;
    this.setHadithSettings({ languageBySet: langMap });
  }

  getAvailableLanguages(set) {
    if (!set || !Array.isArray(set.cards) || !set.cards.length) {
      return [{ code: "en", name: "English" }];
    }

    const first = set.cards[0] || {};
    const langCodes = new Set();

    for (const key of Object.keys(first)) {
      if (key.startsWith("title_")) {
        langCodes.add(key.replace("title_", ""));
      }
      if (key.startsWith("text_")) {
        langCodes.add(key.replace("text_", ""));
      }
    }

    if (!langCodes.size) {
      // legacy fallback: treat as English
      langCodes.add("en");
    }

    const langNames = {
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

    const languages = [...langCodes].map((code) => ({
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

  getLanguageFlag(code) {
    const flags = {
      en: "🇬🇧",
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

  getCardTitle(card) {
    if (!card) return "";
    const lang = this.getSelectedLanguageCode();
    const k = `title_${lang}`;
    if (card[k]) return String(card[k]);
    if (card.title_en) return String(card.title_en);
    return "";
  }

  getCardText(card) {
    if (!card) return "";
    const lang = this.getSelectedLanguageCode();
    const k = `text_${lang}`;
    if (card[k]) return String(card[k]);
    if (card.text_en) return String(card.text_en);
    return "";
  }

  updateLanguageSelectorButton() {
    const btn = this.cardEl?.querySelector(".adhkar-lang-selector-btn");
    if (!btn) return;

    const activeSet = this.getActiveSet();
    const languages = this.getAvailableLanguages(activeSet);

    if (languages.length > 1) {
      btn.style.display = "";
      btn.disabled = false;

      const currentLang = this.getSelectedLanguageCode();
      const langInfo =
        languages.find((l) => l.code === currentLang) || languages[0];

      btn.innerHTML = `<span class="lang-icon" aria-hidden="true">${this.getLanguageFlag(
        langInfo.code
      )}</span>`;
      btn.title = `Language: ${langInfo.name}`;
    } else {
      btn.style.display = "none";
      btn.disabled = true;
    }
  }

  // ---------- Dashboard rendering ----------

  cancelDashboardAnimation() {
    if (this._dashboardMidTimer) {
      clearTimeout(this._dashboardMidTimer);
      this._dashboardMidTimer = null;
    }
    if (this._dashboardEndTimer) {
      clearTimeout(this._dashboardEndTimer);
      this._dashboardEndTimer = null;
    }
    this._dashboardAnimating = false;
  }

  animateDashboardSwap(direction) {
    if (!this.shellEl) return;

    this.cancelDashboardAnimation();

    this._dashboardAnimating = true;
    const cls = direction === "prev" ? "hadith-anim-prev" : "hadith-anim-next";

    this.shellEl.classList.remove("hadith-anim-next", "hadith-anim-prev");
    this.shellEl.classList.add(cls);

    this._dashboardEndTimer = setTimeout(() => {
      this._dashboardAnimating = false;
      if (!this.shellEl) return;
      this.shellEl.classList.remove("hadith-anim-next", "hadith-anim-prev");
    }, HadithManager.NAV_ANIM_MS + 30);
  }

  renderJumpControls(total) {
    const totalSafe = Math.max(0, parseInt(total, 10) || 0);
    const currentOneBased = totalSafe ? this.currentCardIndex + 1 : 0;

    if (this.jumpLabelEl) {
      this.jumpLabelEl.textContent = `${currentOneBased} / ${totalSafe}`;
    }

    if (this.jumpSliderEl) {
      this.jumpSliderEl.min = "1";
      this.jumpSliderEl.max = String(Math.max(1, totalSafe || 1));
      this.jumpSliderEl.value = String(Math.max(1, currentOneBased || 1));
      this.jumpSliderEl.disabled = totalSafe <= 1;
    }

    if (this.jumpInputEl) {
      this.jumpInputEl.min = "1";
      this.jumpInputEl.max = String(Math.max(1, totalSafe || 1));
      this.jumpInputEl.value = String(Math.max(1, currentOneBased || 1));
      this.jumpInputEl.disabled = totalSafe <= 1;
    }
  }

  renderDashboard({ animateDirection = null } = {}) {
    const activeSet = this.getActiveSet();
    const items = activeSet?.cards || [];

    this.normalizeCurrentIndex();

    const item = items[this.currentCardIndex] || null;

    if (this.titleEl) {
      this.titleEl.textContent = item ? this.getCardTitle(item) : "Loading...";
    }

    if (this.textEl) {
      this.textEl.textContent = item ? this.getCardText(item) : "";
    }

    const narrator = item?.narrator ? String(item.narrator) : "";
    const reference = item?.reference ? String(item.reference) : "";

    if (this.metaEl) {
      const metaText =
        narrator || reference ? `Narrated by: ${narrator} - ${reference}` : "";
      this.metaEl.textContent = metaText;
      this.metaEl.toggleAttribute("hidden", !metaText);
    }

    if (this.metaDividerEl) {
      const showDivider = !!(narrator || reference);
      this.metaDividerEl.toggleAttribute("hidden", !showDivider);
    }

    this.updateLanguageSelectorButton();
    this.updateHeaderText();
    this.renderJumpControls(items.length);

    if (animateDirection) {
      this.animateDashboardSwap(animateDirection);
    }
  }

  updateHeaderText() {
    const headerText = document.getElementById("hadithHeaderText");
    if (!headerText) return;

    const active = this.getActiveSet();
    headerText.textContent = active?.name || "Hadith";
  }

  gotoNextCard() {
    const activeSet = this.getActiveSet();
    const items = activeSet?.cards || [];
    if (!items.length) return;

    const next = (this.currentCardIndex + 1) % items.length;
    this.setCurrentCardIndex(next, { cancelAnimation: false });
    this.animateDashboardSwap("next");
  }

  gotoPrevCard() {
    const activeSet = this.getActiveSet();
    const items = activeSet?.cards || [];
    if (!items.length) return;

    const prev = (this.currentCardIndex - 1 + items.length) % items.length;
    this.setCurrentCardIndex(prev, { cancelAnimation: false });
    this.animateDashboardSwap("prev");
  }

  // ---------- Dashboard events ----------

  bindDashboardEvents() {
    if (this.prevBtn && !this.prevBtn.dataset.bound) {
      this.prevBtn.dataset.bound = "true";
      this.prevBtn.addEventListener("click", () => this.gotoPrevCard());
    }

    if (this.nextBtn && !this.nextBtn.dataset.bound) {
      this.nextBtn.dataset.bound = "true";
      this.nextBtn.addEventListener("click", () => this.gotoNextCard());
    }

    const headerText = document.getElementById("hadithHeaderText");
    if (headerText && headerText.dataset.bound !== "true") {
      headerText.dataset.bound = "true";
      headerText.addEventListener("click", () => this.openSetSelectorModal());
      headerText.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.openSetSelectorModal();
        }
      });
    }

    // Jump slider and input
    if (this.jumpSliderEl && this.jumpSliderEl.dataset.bound !== "true") {
      this.jumpSliderEl.dataset.bound = "true";
      this.jumpSliderEl.addEventListener("input", (e) => {
        const v = parseInt(e.target.value, 10);
        if (!Number.isFinite(v)) return;
        this.setCurrentCardIndex(v - 1);
      });
    }

    if (this.jumpInputEl && this.jumpInputEl.dataset.bound !== "true") {
      this.jumpInputEl.dataset.bound = "true";
      this.jumpInputEl.addEventListener("change", (e) => {
        const v = parseInt(e.target.value, 10);
        if (!Number.isFinite(v)) return;
        this.setCurrentCardIndex(v - 1);
      });
      this.jumpInputEl.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        const v = parseInt(e.target.value, 10);
        if (!Number.isFinite(v)) return;
        this.setCurrentCardIndex(v - 1);
      });
    }

    if (
      this.autoAdvanceToggleBtn &&
      this.autoAdvanceToggleBtn.dataset.bound !== "true"
    ) {
      this.autoAdvanceToggleBtn.dataset.bound = "true";
      this.autoAdvanceToggleBtn.addEventListener("click", () =>
        this.toggleAutoAdvancePaused()
      );
    }
  }

  // ---------- Typography ----------

  getTypography() {
    const settings = this.getHadithSettings();

    const title = this.clampNumber(
      parseInt(settings.titleFontSize, 10),
      12,
      144,
      22
    );

    const text = this.clampNumber(
      parseInt(settings.textFontSize, 10),
      12,
      144,
      18
    );

    const meta = this.clampNumber(
      parseInt(settings.metaFontSize, 10),
      10,
      96,
      14
    );

    return { title, text, meta };
  }

  setTypography({ title, text, meta }) {
    const next = this.getHadithSettings();

    if (title !== undefined)
      next.titleFontSize = this.clampNumber(parseInt(title, 10), 12, 144, 22);
    if (text !== undefined)
      next.textFontSize = this.clampNumber(parseInt(text, 10), 12, 144, 18);
    if (meta !== undefined)
      next.metaFontSize = this.clampNumber(parseInt(meta, 10), 10, 96, 14);

    this.setHadithSettings(next);
    this.applyTypography();
  }

  applyTypography() {
    if (!this.cardEl) return;
    const t = this.getTypography();
    this.cardEl.style.setProperty("--hadith-title-font-size", `${t.title}px`);
    this.cardEl.style.setProperty("--hadith-text-font-size", `${t.text}px`);
    this.cardEl.style.setProperty("--hadith-meta-font-size", `${t.meta}px`);
  }

  updateTypographyLabels(title, text, meta) {
    if (this.settingsTitleFontSizeValue)
      this.settingsTitleFontSizeValue.textContent = `${title}px`;
    if (this.settingsTextFontSizeValue)
      this.settingsTextFontSizeValue.textContent = `${text}px`;
    if (this.settingsMetaFontSizeValue)
      this.settingsMetaFontSizeValue.textContent = `${meta}px`;
  }

  // ---------- Settings tab ----------

  ensureSettingsBound() {
    const panel = document.getElementById("hadithPanel");
    if (!panel) return false;

    if (!this.settingsSetSelect)
      this.settingsSetSelect = document.getElementById("hadithSetSelect");
    if (!this.settingsImportBtn)
      this.settingsImportBtn = document.getElementById("hadithImportBtn");
    if (!this.settingsExportBtn)
      this.settingsExportBtn = document.getElementById("hadithExportBtn");
    if (!this.settingsDeleteSetBtn)
      this.settingsDeleteSetBtn = document.getElementById("hadithDeleteSetBtn");
    if (!this.settingsNewSetBtn)
      this.settingsNewSetBtn = document.getElementById("hadithNewSetBtn");
    if (!this.settingsRenameSetBtn)
      this.settingsRenameSetBtn = document.getElementById("hadithRenameSetBtn");
    if (!this.settingsImportInput)
      this.settingsImportInput = document.getElementById("hadithImportInput");
    if (!this.settingsAddItemBtn)
      this.settingsAddItemBtn = document.getElementById("hadithAddItemBtn");
    if (!this.settingsList)
      this.settingsList = document.getElementById("hadithEditorList");
    if (!this.settingsPagination)
      this.settingsPagination = document.getElementById("hadithPagination");
    if (!this.settingsMeta)
      this.settingsMeta = document.getElementById("hadithMeta");

    if (!this.settingsAutoAdvanceSeconds)
      this.settingsAutoAdvanceSeconds = document.getElementById(
        "hadithAutoAdvanceSeconds"
      );

    if (!this.settingsTitleFontSize)
      this.settingsTitleFontSize = document.getElementById(
        "hadithTitleFontSize"
      );
    if (!this.settingsTitleFontSizeValue)
      this.settingsTitleFontSizeValue = document.getElementById(
        "hadithTitleFontSizeValue"
      );
    if (!this.settingsTextFontSize)
      this.settingsTextFontSize = document.getElementById("hadithTextFontSize");
    if (!this.settingsTextFontSizeValue)
      this.settingsTextFontSizeValue = document.getElementById(
        "hadithTextFontSizeValue"
      );
    if (!this.settingsMetaFontSize)
      this.settingsMetaFontSize = document.getElementById("hadithMetaFontSize");
    if (!this.settingsMetaFontSizeValue)
      this.settingsMetaFontSizeValue = document.getElementById(
        "hadithMetaFontSizeValue"
      );

    // Bind once
    if (panel.dataset.bound === "true") return true;
    panel.dataset.bound = "true";

    if (this.settingsSetSelect) {
      this.settingsSetSelect.addEventListener("change", (e) => {
        const setId = e.target.value;
        this.setActiveSetId(setId);
        this.restoreCurrentCardIndexForActiveSet();
        this.renderDashboard();
        this.renderSettings();
        this.ensureAutoAdvanceState({ reset: true });
      });
    }

    if (this.settingsNewSetBtn) {
      this.settingsNewSetBtn.addEventListener("click", () =>
        this.createNewSet()
      );
    }

    if (this.settingsRenameSetBtn) {
      this.settingsRenameSetBtn.addEventListener("click", () =>
        this.renameActiveSet()
      );
    }

    if (this.settingsDeleteSetBtn) {
      this.settingsDeleteSetBtn.addEventListener("click", () =>
        this.deleteActiveSet()
      );
    }

    if (this.settingsImportBtn && this.settingsImportInput) {
      this.settingsImportBtn.addEventListener("click", () =>
        this.settingsImportInput.click()
      );

      this.settingsImportInput.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await this.importSetFromFile(file);
        e.target.value = "";
      });
    }

    if (this.settingsExportBtn) {
      this.settingsExportBtn.addEventListener("click", () =>
        this.exportActiveSet()
      );
    }

    if (this.settingsAddItemBtn) {
      this.settingsAddItemBtn.addEventListener("click", () =>
        this.addNewItem()
      );
    }

    if (this.settingsAutoAdvanceSeconds) {
      this.settingsAutoAdvanceSeconds.addEventListener("change", (e) => {
        this.setAutoAdvanceSeconds(e.target.value);
      });
    }

    const bindRange = (rangeEl, onValue) => {
      if (!rangeEl) return;
      rangeEl.addEventListener("input", (e) => {
        const v = parseInt(e.target.value, 10);
        if (!Number.isFinite(v)) return;
        onValue(v);
      });
    };

    bindRange(this.settingsTitleFontSize, (v) => {
      const t = this.getTypography();
      this.setTypography({ title: v });
      this.updateTypographyLabels(v, t.text, t.meta);
    });

    bindRange(this.settingsTextFontSize, (v) => {
      const t = this.getTypography();
      this.setTypography({ text: v });
      this.updateTypographyLabels(t.title, v, t.meta);
    });

    bindRange(this.settingsMetaFontSize, (v) => {
      const t = this.getTypography();
      this.setTypography({ meta: v });
      this.updateTypographyLabels(t.title, t.text, v);
    });

    if (this.settingsList) {
      this.settingsList.addEventListener("input", (e) => {
        const fieldEl = e.target.closest("input,textarea");
        if (!fieldEl) return;
        const row = fieldEl.closest(".hadith-editor-row");
        if (!row) return;
        const idx = Number(row.dataset.index);
        if (!Number.isFinite(idx)) return;

        const field = fieldEl.dataset.field;
        if (!field) return;

        this.scheduleSaveItemField(idx, field, fieldEl.value);

        if (fieldEl.tagName === "TEXTAREA") {
          this.autoResizeTextarea(fieldEl);
        }
      });

      this.settingsList.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        if (btn.dataset.action !== "delete-item") return;
        const row = btn.closest(".hadith-editor-row");
        if (!row) return;
        const idx = Number(row.dataset.index);
        if (!Number.isFinite(idx)) return;
        this.deleteItemAtIndex(idx);
      });
    }

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

    if (this.settingsRenameSetBtn) {
      this.settingsRenameSetBtn.disabled = this._settingsReadOnly;
      this.settingsRenameSetBtn.title = this._settingsReadOnly
        ? "This default set cannot be renamed"
        : "Rename set";
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
      this.settingsMeta.textContent = `${totalItems} items • ${totalSets}/${HadithManager.MAX_SETS} sets`;
    }

    // Typography
    const t = this.getTypography();
    if (this.settingsTitleFontSize)
      this.settingsTitleFontSize.value = String(t.title);
    if (this.settingsTextFontSize)
      this.settingsTextFontSize.value = String(t.text);
    if (this.settingsMetaFontSize)
      this.settingsMetaFontSize.value = String(t.meta);

    this.updateTypographyLabels(t.title, t.text, t.meta);
    this.applyTypography();

    if (this.settingsAutoAdvanceSeconds) {
      this.settingsAutoAdvanceSeconds.value = String(
        this.getAutoAdvanceSeconds()
      );
    }

    this.renderEditorList();
    this.renderPagination();
  }

  renderEditorList() {
    const active = this.getActiveSet();
    const items = active?.cards || [];
    const isDefault = this.isProtectedSetId(active?.id);

    if (!this.settingsList) return;

    if (isDefault) {
      this.settingsList.innerHTML = `
        <div class="adhkar-default-notice">
          <div class="adhkar-default-notice-icon">${this._getIcon("🔒", { size: 24 })}</div>
          <div class="adhkar-default-notice-title">Default Hadith Set</div>
          <div class="adhkar-default-notice-text">
            This is a protected default set and cannot be edited, renamed, or deleted.
            Create a custom set to add your own hadith.
          </div>
          <button class="setting-btn adhkar-default-notice-btn" type="button" id="hadithCreateCustomBtn">
            ${this._getIcon("➕", { size: 16 })} Create Custom Set
          </button>
        </div>
      `;

      const createBtn = this.settingsList.querySelector(
        "#hadithCreateCustomBtn"
      );
      if (createBtn) {
        createBtn.addEventListener("click", () => this.createNewSet());
      }
      return;
    }

    const total = items.length;
    const pages = Math.max(1, Math.ceil(total / HadithManager.PAGE_SIZE));
    this.settingsPage = Math.min(Math.max(1, this.settingsPage), pages);

    const start = (this.settingsPage - 1) * HadithManager.PAGE_SIZE;
    const end = Math.min(total, start + HadithManager.PAGE_SIZE);

    if (!items.length) {
      this.settingsList.innerHTML = `
        <div class="quotes-empty">
          <div class="quotes-empty-title">No hadith in this set</div>
          <div class="quotes-empty-hint">Use “Add Item” or import a JSON file.</div>
        </div>
      `;
      return;
    }

    const rows = [];
    for (let i = start; i < end; i += 1) {
      const c = items[i] || {
        id: "",
        title_en: "",
        text_en: "",
        title_id: "",
        text_id: "",
        narrator: "",
        reference: "",
      };

      rows.push(`
        <tr class="hadith-editor-row" data-index="${i}">
          <td class="hadith-col-id">${i + 1}</td>
          <td class="hadith-col-title-en">
            <input
              class="hadith-editor-input setting-input"
              type="text"
              data-field="title_en"
              placeholder="Title (en)"
              maxlength="200"
              value="${this.escapeHtmlAttr(c.title_en || "")}"
            />
          </td>
          <td class="hadith-col-text-en">
            <textarea
              class="hadith-editor-textarea setting-input"
              data-field="text_en"
              rows="2"
              placeholder="Text (en)"
              maxlength="12000"
            >${this.escapeHtmlAttr(c.text_en || "")}</textarea>
          </td>
          <td class="hadith-col-title-id">
            <input
              class="hadith-editor-input setting-input"
              type="text"
              data-field="title_id"
              placeholder="Title (id)"
              maxlength="200"
              value="${this.escapeHtmlAttr(c.title_id || "")}"
            />
          </td>
          <td class="hadith-col-text-id">
            <textarea
              class="hadith-editor-textarea setting-input"
              data-field="text_id"
              rows="2"
              placeholder="Text (id)"
              maxlength="12000"
            >${this.escapeHtmlAttr(c.text_id || "")}</textarea>
          </td>
          <td class="hadith-col-narrator">
            <input
              class="hadith-editor-input setting-input"
              type="text"
              data-field="narrator"
              placeholder="Narrator"
              maxlength="200"
              value="${this.escapeHtmlAttr(c.narrator || "")}"
            />
          </td>
          <td class="hadith-col-reference">
            <input
              class="hadith-editor-input setting-input"
              type="text"
              data-field="reference"
              placeholder="Reference"
              maxlength="250"
              value="${this.escapeHtmlAttr(c.reference || "")}"
            />
          </td>
          <td class="hadith-col-actions">
            <button
              class="hadith-row-delete"
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
      <div class="hadith-editor-table-wrap">
        <table class="hadith-editor-table">
          <thead>
            <tr>
              <th class="hadith-col-id">ID</th>
              <th class="hadith-col-title-en">Title (en)</th>
              <th class="hadith-col-text-en">Text (en)</th>
              <th class="hadith-col-title-id">Title (id)</th>
              <th class="hadith-col-text-id">Text (id)</th>
              <th class="hadith-col-narrator">Narrator</th>
              <th class="hadith-col-reference">Reference</th>
              <th class="hadith-col-actions"></th>
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
      "textarea.hadith-editor-textarea"
    );
    items.forEach((t) => this.autoResizeTextarea(t));
  }

  renderPagination() {
    if (!this.settingsPagination) return;

    const active = this.getActiveSet();
    const total = active?.cards?.length || 0;
    const pages = Math.max(1, Math.ceil(total / HadithManager.PAGE_SIZE));

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

  scheduleSaveItemField(index, field, value) {
    if (this._settingsReadOnly) return;

    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveItemField(index, field, value);
    }, 250);
  }

  saveItemField(index, field, value) {
    const sets = this.getSets();
    const activeId = this.getActiveSetId();
    const set = sets.find((s) => s.id === activeId);
    if (!set) return;
    if (this.isProtectedSetId(set.id)) return;

    const items = Array.isArray(set.cards) ? set.cards : [];
    if (index < 0 || index >= items.length) return;

    const item = items[index] || {};
    item[field] = value;

    set.cards = items;
    this.saveSets(sets);

    // Keep defaults in sync for the currently edited language fields
    if (field === "title" && item.title_en && !item.title_en.trim()) {
      item.title_en = value;
    }

    this.renderDashboard();
  }

  isProtectedSetId(id) {
    return (
      Array.isArray(HadithManager.PROTECTED_SET_IDS) &&
      HadithManager.PROTECTED_SET_IDS.includes(String(id))
    );
  }

  makeUniqueSetName(baseName, sets) {
    const normalized =
      String(baseName || "New Set")
        .trim()
        .slice(0, 40) || "New Set";

    const isTaken = (candidate) =>
      sets.some(
        (s) => String(s.name || "").toLowerCase() === candidate.toLowerCase()
      );

    const protectedNames = Array.isArray(HadithManager.DEFAULT_SETS)
      ? HadithManager.DEFAULT_SETS.map((d) =>
          String(d.name || "").toLowerCase()
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
    if (sets.length >= HadithManager.MAX_SETS) {
      this.showToast(
        `You already have ${HadithManager.MAX_SETS} sets. Delete one first.`,
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

    const protectedNames = Array.isArray(HadithManager.DEFAULT_SETS)
      ? HadithManager.DEFAULT_SETS.map((d) =>
          String(d.name || "").toLowerCase()
        )
      : [];

    if (protectedNames.includes(trimmed.toLowerCase())) {
      this.showToast(`The name '${trimmed}' is reserved.`, "error");
      return;
    }

    const name = this.makeUniqueSetName(trimmed, sets);
    const now = new Date().toISOString();

    const newSet = {
      id: `hadith_${Date.now()}`,
      name,
      createdAt: now,
      cards: [],
    };

    sets.push(newSet);
    this.saveSets(sets);
    this.setActiveSetId(newSet.id);
    this.currentCardIndex = 0;
    this.persistCurrentCardIndex();

    this.renderDashboard();
    this.renderSettings();

    this.showToast(`Created set: ${name}`, "success");
  }

  renameActiveSet() {
    const active = this.getActiveSet();
    if (!active) return;
    if (this.isProtectedSetId(active.id)) {
      this.showToast("This default set cannot be renamed.", "error");
      return;
    }

    const rawName = prompt("Rename set:", active.name || "New Set");
    if (rawName === null) return;
    const trimmed = String(rawName).trim();
    if (!trimmed) {
      this.showToast("Set name cannot be empty.", "error");
      return;
    }

    const sets = this.getSets();
    const idx = sets.findIndex((s) => s.id === active.id);
    if (idx === -1) return;

    const name = this.makeUniqueSetName(
      trimmed,
      sets.filter((s) => s.id !== active.id)
    );
    sets[idx].name = name;
    this.saveSets(sets);

    this.renderDashboard();
    this.renderSettings();

    this.showToast(`Renamed set: ${name}`, "success");
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

    const ok = confirm(`Delete set "${active.name}"? This cannot be undone.`);
    if (!ok) return;

    const nextSets = sets.filter((s) => s.id !== active.id);
    this.saveSets(nextSets);
    this.clearSavedCardIndexForSet(active.id);

    const nextActive = nextSets[0];
    this.setActiveSetId(nextActive?.id || null);
    this.restoreCurrentCardIndexForActiveSet();

    this.renderDashboard();
    this.renderSettings();

    this.showToast("Set deleted.", "success");
  }

  addNewItem() {
    const active = this.getActiveSet();
    if (!active) return;
    if (this.isProtectedSetId(active.id)) {
      this.showToast("This default set cannot be edited.", "error");
      return;
    }

    const sets = this.getSets();
    const set = sets.find((s) => s.id === active.id);
    if (!set) return;

    const items = Array.isArray(set.cards) ? set.cards : [];

    items.push({
      id: items.length + 1,
      title_en: "",
      text_en: "",
      title_id: "",
      text_id: "",
      narrator: "",
      reference: "",
    });

    set.cards = items;
    this.saveSets(sets);

    const total = items.length;
    const pages = Math.max(1, Math.ceil(total / HadithManager.PAGE_SIZE));
    this.settingsPage = pages;

    this.renderSettings();
    this.renderDashboard();

    this.showToast("Item added.", "success");
  }

  deleteItemAtIndex(index) {
    const active = this.getActiveSet();
    if (!active) return;
    if (this.isProtectedSetId(active.id)) {
      this.showToast("This default set cannot be edited.", "error");
      return;
    }

    const sets = this.getSets();
    const set = sets.find((s) => s.id === active.id);
    if (!set) return;

    const items = Array.isArray(set.cards) ? set.cards : [];
    if (index < 0 || index >= items.length) return;

    items.splice(index, 1);
    set.cards = items;
    this.saveSets(sets);

    const pages = Math.max(
      1,
      Math.ceil(items.length / HadithManager.PAGE_SIZE)
    );
    this.settingsPage = Math.min(this.settingsPage, pages);

    this.normalizeCurrentIndex();
    this.persistCurrentCardIndex();

    this.renderSettings();
    this.renderDashboard();

    this.showToast("Item deleted.", "success");
  }

  inferSetNameFromFile(filename) {
    const base = String(filename || "")
      .replace(/\.[^.]+$/, "")
      .trim();
    const safe = base || "Imported";
    return safe.slice(0, 40);
  }

  async importSetFromFile(file) {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const cards = this.normalizeImportedCards(json);

      if (!cards.length) {
        this.showToast("JSON contains no valid hadith items.", "error");
        return;
      }

      const sets = this.getSets();

      const inferredName = this.inferSetNameFromFile(file.name);
      const effectiveName = this.makeUniqueSetName(inferredName, sets);

      const now = new Date().toISOString();
      const newSet = {
        id: `hadith_${Date.now()}`,
        name: effectiveName,
        createdAt: now,
        cards,
      };

      sets.push(newSet);
      this.saveSets(sets);
      this.setActiveSetId(newSet.id);
      this.currentCardIndex = 0;
      this.persistCurrentCardIndex();

      this.renderDashboard();
      this.renderSettings();

      this.showToast(`Imported set: ${effectiveName}`, "success");
    } catch (e) {
      console.error("Hadith import failed:", e);
      this.showToast("Could not read the JSON file.", "error");
    }
  }

  exportActiveSet() {
    const active = this.getActiveSet();
    if (!active) return;

    const data = JSON.stringify(active.cards || [], null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${(active.name || "hadith").replace(
      /[^a-z0-9_-]+/gi,
      "_"
    )}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 2000);

    this.showToast("Exported JSON.", "success");
  }

  // ---------- Set selector modal (Dashboard) ----------

  createSetSelectorButton() {
    const headerActions = this.cardEl?.querySelector(".card-header-actions");
    if (!headerActions) return;

    if (headerActions.querySelector(".adhkar-set-selector-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "adhkar-set-selector-btn";
    btn.innerHTML = this._getIcon("📚", { size: 18 });
    btn.title = "Select hadith set";
    btn.setAttribute("aria-label", "Select hadith set");
    this._setModalBtn = btn;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      this.openSetSelectorModal();
    });

    // Insert after language selector if present, else at start
    const langBtn = headerActions.querySelector(".adhkar-lang-selector-btn");
    if (langBtn) {
      headerActions.insertBefore(btn, langBtn.nextSibling);
    } else {
      headerActions.insertBefore(btn, headerActions.firstChild);
    }
  }

  createSetSelectorModal() {
    if (document.getElementById("hadithSetModal")) return;

    const modal = document.createElement("div");
    modal.id = "hadithSetModal";
    modal.className = "pq-bookmark-modal adhkar-set-modal";
    modal.innerHTML = `
      <div class="adhkar-set-modal-content">
        <div class="adhkar-set-modal-header">
          <div class="adhkar-set-modal-title">
            <span aria-hidden="true">${this._getIcon("📚", { size: 20 })}</span>
            Select Hadith Set
          </div>
          <button class="adhkar-set-modal-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="adhkar-set-modal-body">
          <div class="adhkar-set-search">
            <input type="text" class="adhkar-set-search-input" placeholder="Search sets..." />
          </div>
          <div class="adhkar-set-list"></div>
          <div class="adhkar-set-pagination" hidden></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this._setModal = modal;

    const closeBtn = modal.querySelector(".adhkar-set-modal-close");
    closeBtn?.addEventListener("click", () => this.closeSetSelectorModal());

    modal.addEventListener("click", (e) => {
      if (e.target === modal) this.closeSetSelectorModal();
    });

    const searchInput = modal.querySelector(".adhkar-set-search-input");
    searchInput?.addEventListener("input", (e) => {
      this._setModalSearchQuery = String(e.target.value || "");
      this._setModalPage = 1;
      this.renderSetSelectorModal();
    });

    this.renderSetSelectorModal();
  }

  openSetSelectorModal() {
    if (!this._setModal) this.createSetSelectorModal();
    if (!this._setModal) return;

    this._setModal.classList.add("active");
    this._setModalPage = 1;
    this._setModalSearchQuery = "";

    const searchInput = this._setModal.querySelector(
      ".adhkar-set-search-input"
    );
    if (searchInput) searchInput.value = "";

    this.renderSetSelectorModal();

    setTimeout(() => {
      try {
        searchInput?.focus();
      } catch (e) {}
    }, 50);
  }

  closeSetSelectorModal() {
    if (!this._setModal) return;
    this._setModal.classList.remove("active");
  }

  renderSetSelectorModal() {
    if (!this._setModal) return;

    const sets = this.getSets();
    const activeId = this.getActiveSetId();

    const q = String(this._setModalSearchQuery || "")
      .trim()
      .toLowerCase();
    const filtered = q
      ? sets.filter((s) =>
          String(s.name || "")
            .toLowerCase()
            .includes(q)
        )
      : sets;

    const listEl = this._setModal.querySelector(".adhkar-set-list");
    const paginationEl = this._setModal.querySelector(".adhkar-set-pagination");

    if (!listEl || !paginationEl) return;

    if (!filtered.length) {
      listEl.innerHTML = `
        <div class="adhkar-set-empty">No sets found.</div>
      `;
      paginationEl.hidden = true;
      return;
    }

    const pageSize = 8;
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    this._setModalPage = this.clampNumber(this._setModalPage, 1, pages, 1);

    const start = (this._setModalPage - 1) * pageSize;
    const end = Math.min(filtered.length, start + pageSize);

    const items = [];
    for (let i = start; i < end; i += 1) {
      const set = filtered[i];
      const isActive = set.id === activeId;
      const locked = this.isProtectedSetId(set.id);
      const count = Array.isArray(set.cards) ? set.cards.length : 0;

      items.push(`
        <div class="adhkar-set-item ${
          isActive ? "active" : ""
        }" data-set-id="${this.escapeHtmlAttr(set.id)}">
          <div class="adhkar-set-item-info">
            <div class="adhkar-set-item-name">
              ${this.escapeHtmlAttr(set.name || "Unnamed")}
              ${
                locked
                  ? '<span class="adhkar-set-item-lock" title="Protected">🔒</span>'
                  : ""
              }
            </div>
            <div class="adhkar-set-item-meta">${count} items</div>
          </div>
        </div>
      `);
    }

    listEl.innerHTML = items.join("");

    if (listEl.dataset.bound !== "true") {
      listEl.dataset.bound = "true";
      listEl.addEventListener("click", (e) => {
        const item = e.target.closest(".adhkar-set-item");
        if (!item) return;
        const setId = item.dataset.setId;
        if (!setId) return;
        this.setActiveSetId(setId);
        this.restoreCurrentCardIndexForActiveSet();
        this.renderDashboard();
        this.renderSettings();
        this.ensureAutoAdvanceState({ reset: true });
        this.closeSetSelectorModal();
        const set = this.getSets().find((s) => s.id === setId);
        if (set) this.showToast(`Switched to: ${set.name}`, "success");
      });
    }

    // Pagination
    if (pages <= 1) {
      paginationEl.hidden = true;
      paginationEl.innerHTML = "";
      return;
    }

    paginationEl.hidden = false;

    const btns = [];
    const makeBtn = (label, page, disabled, active) => {
      return `
        <button
          class="adhkar-set-page-btn ${active ? "active" : ""}"
          type="button"
          data-page="${page}"
          ${disabled ? "disabled" : ""}
        >
          ${label}
        </button>
      `;
    };

    btns.push(
      makeBtn("Prev", this._setModalPage - 1, this._setModalPage <= 1, false)
    );

    for (let p = 1; p <= pages; p += 1) {
      if (p === 1 || p === pages || Math.abs(p - this._setModalPage) <= 1) {
        btns.push(makeBtn(String(p), p, false, p === this._setModalPage));
      }
    }

    btns.push(
      makeBtn(
        "Next",
        this._setModalPage + 1,
        this._setModalPage >= pages,
        false
      )
    );

    paginationEl.innerHTML = btns.join("");

    if (paginationEl.dataset.bound !== "true") {
      paginationEl.dataset.bound = "true";
      paginationEl.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const p = parseInt(btn.dataset.page, 10);
        if (!Number.isFinite(p)) return;
        this._setModalPage = p;
        this.renderSetSelectorModal();
      });
    }
  }

  // ---------- Language selector (Dashboard) ----------

  createLanguageSelectorButton() {
    const headerActions = this.cardEl?.querySelector(".card-header-actions");
    if (!headerActions) return;

    if (headerActions.querySelector(".adhkar-lang-selector-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "adhkar-lang-selector-btn";
    btn.innerHTML = `<span class="lang-icon" aria-hidden="true">🌐</span>`;
    btn.title = "Select language";
    btn.setAttribute("aria-label", "Select language");
    btn.style.display = "none";

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      this.openLanguageSelectorModal();
    });

    headerActions.insertBefore(btn, headerActions.firstChild);
  }

  createLanguageSelectorModal() {
    if (document.getElementById("hadithLangModal")) return;

    const modal = document.createElement("div");
    modal.id = "hadithLangModal";
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
      this.closeLanguageSelectorModal()
    );

    modal.addEventListener("click", (e) => {
      if (e.target === modal) this.closeLanguageSelectorModal();
    });

    const searchInput = modal.querySelector(".adhkar-lang-search-input");
    searchInput?.addEventListener("input", (e) => {
      this.renderLanguageSelectorModal(String(e.target.value || ""));
    });

    this.renderLanguageSelectorModal("");
  }

  openLanguageSelectorModal() {
    if (!this._langModal) this.createLanguageSelectorModal();
    if (!this._langModal) return;

    this._langModal.classList.add("active");

    const searchInput = this._langModal.querySelector(
      ".adhkar-lang-search-input"
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

  renderLanguageSelectorModal(searchQuery) {
    if (!this._langModal) return;

    const activeSet = this.getActiveSet();
    const languages = this.getAvailableLanguages(activeSet);
    const current = this.getSelectedLanguageCode();

    const q = String(searchQuery || "")
      .trim()
      .toLowerCase();
    const filtered = q
      ? languages.filter(
          (l) =>
            l.code.toLowerCase().includes(q) || l.name.toLowerCase().includes(q)
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
              lang.code
            )}</span>
            <div class="adhkar-lang-item-info">
              <div class="adhkar-lang-item-name">${this.escapeHtmlAttr(
                lang.name
              )}</div>
              <div class="adhkar-lang-item-code">${this.escapeHtmlAttr(
                lang.code
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
        const lang = languages.find((l) => l.code === code);
        if (lang) this.showToast(`Language: ${lang.name}`, "success");
        this.closeLanguageSelectorModal();
      });
    }
  }

  // ---------- Helpers ----------

  clampNumber(value, min, max, fallback) {
    if (value === null || value === undefined) return fallback;
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
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
        { once: true }
      );
    };

    setTimeout(hideToast, 3000);
  }
}

/**
 * HadithManager, part 2 of 3.
 * Moved out of js/hadith.js at method boundaries, so no single file carries the
 * whole class. The class itself is declared in js/hadith.js; load this after it.
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

  _updateSetSelectorIcon() {
    if (this._setModalBtn) {
      this._setModalBtn.innerHTML = this._getIcon("📚", { size: 18 });
    }
  }

  _updateSetModalIcons() {
    if (this._setModal) {
      const titleIcon = this._setModal.querySelector(
        ".hadith-set-modal-title span[aria-hidden]",
      );
      if (titleIcon) {
        titleIcon.innerHTML = this._getIcon("📚", { size: 20 });
      }

      if (this._setModal.classList.contains("active")) {
        this.renderSetSelectorModal();
      }
    }
  }

  async init() {
    await this.ensureDefaultSets();
    this.applyArabicFontFamily(this.getHadithSettings().arabicFontFamily, {
      persist: false,
    });
    this.applyTranslationFontFamily(
      this.getHadithSettings().translationFontFamily,
      { persist: false },
    );
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

  getStoredCustomSets() {
    const stored = this.storage.get("hadithSets", []);
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
    return this.storage.set("hadithSets", customSets);
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
      0,
    );
  }

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

  async ensureDefaultSets() {
    const defs = Array.isArray(HadithManager.DEFAULT_SETS)
      ? HadithManager.DEFAULT_SETS
      : [];

    const loadedDefaults = await Promise.all(
      defs.map((def) => this.loadDefaultSet(def)),
    );
    this.defaultSets = loadedDefaults;

    // Migration cleanup: remove legacy stored copies of protected default sets.
    const stored = this.storage.get("hadithSets", []);
    if (Array.isArray(stored)) {
      const cleaned = stored.filter((set) => !this.isProtectedSetId(set?.id));
      if (cleaned.length !== stored.length) {
        this.storage.set("hadithSets", cleaned);
      }
    }

    const sets = this.getSets();
    if (!sets.length) return;

    // Ensure active set id exists
    const activeId = this.getActiveSetId();
    if (!activeId || !sets.some((s) => s.id === activeId)) {
      const preferredId = "default_hadith_nawawi40";
      const preferredExists = sets.some((s) => s.id === preferredId);
      this.setActiveSetId(preferredExists ? preferredId : sets[0]?.id || null);
    }
  }

  async loadDefaultSet(def) {
    const now = new Date().toISOString();

    try {
      const json = await this.fetchJsonResource(def.file, {
        cache: "no-store",
        label: `Hadith default set ${def.id}`,
      });
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

  async refreshDefaultData() {
    await this.ensureDefaultSets();
    this.restoreCurrentCardIndexForActiveSet();
    this.renderDashboard();
    this.renderSettings();
    this.ensureAutoAdvanceState({ reset: true });
  }

  normalizeImportedCards(json) {
    if (json && typeof json === "object" && !Array.isArray(json)) {
      const arr =
        json.cards || json.items || json.hadith || json.entries || json.data;
      return this.normalizeImportedCards(Array.isArray(arr) ? arr : []);
    }

    const items = Array.isArray(json) ? json : [];

    const normalized = items
      .filter((raw) => raw && typeof raw === "object" && !Array.isArray(raw))
      .map((raw) => {
        const id = raw.id ?? raw.hadith_id ?? null;
        const parsedIdNum = parseInt(id, 10);
        const normalizedId = Number.isFinite(parsedIdNum)
          ? parsedIdNum
          : String(id || "").trim();

        const narrator = String(raw.narrator || raw.rawi || "").trim();
        const reference = String(raw.reference || raw.source || "").trim();

        const titleFields = {};
        const textFields = {};

        Object.entries(raw).forEach(([rawKey, rawValue]) => {
          if (rawValue == null) return;
          const key = String(rawKey || "");
          const value = String(rawValue).trim();
          if (!value) return;

          let match = key.match(/^title_(.+)$/i);
          if (match) {
            const code = this.normalizeLanguageCode(match[1]);
            if (!code) return;
            titleFields[`title_${code}`] = value;
            return;
          }

          match = key.match(/^text_(.+)$/i);
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
          }
        });

        const legacyTitle = String(raw.title || raw.name || "").trim();
        if (legacyTitle && !titleFields.title_en) {
          titleFields.title_en = legacyTitle;
        }

        const legacyText = String(raw.text || raw.translation || "").trim();
        if (legacyText && !textFields.text_en) {
          textFields.text_en = legacyText;
        }

        const hasLocalizedTitle = Object.keys(titleFields).length > 0;
        const hasLocalizedText = Object.keys(textFields).length > 0;
        if (
          !narrator &&
          !reference &&
          !hasLocalizedTitle &&
          !hasLocalizedText
        ) {
          return null;
        }

        const normalizedItem = {
          narrator,
          reference,
          ...titleFields,
          ...textFields,
        };
        if (normalizedId !== "") normalizedItem.id = normalizedId;
        return normalizedItem;
      })
      .filter(Boolean);

    // Keep only unique card payloads (ignoring `id`) to avoid duplicate key/value entries.
    const deduped = [];
    const seen = new Set();
    for (const card of normalized) {
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

  getSelectedLanguageCode() {
    const settings = this.getHadithSettings();
    const activeSetId = this.getActiveSetId();
    const langMap = settings.languageBySet || {};
    const normalized = this.normalizeLanguageCode(langMap[activeSetId]);
    return normalized || "en";
  }

  setSelectedLanguageCode(langCode) {
    const activeSetId = this.getActiveSetId();
    if (!activeSetId) return;

    const normalized = this.normalizeLanguageCode(langCode);
    if (!normalized) return;

    const settings = this.getHadithSettings();
    const langMap = settings.languageBySet || {};
    langMap[activeSetId] = normalized;
    this.setHadithSettings({ languageBySet: langMap });
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

        let match = key.match(/^title_(.+)$/i);
        if (match) {
          const code = this.normalizeLanguageCode(match[1]);
          if (code) langCodes.add(code);
        }

        match = key.match(/^text_(.+)$/i);
        if (match) {
          const code = this.normalizeLanguageCode(match[1]);
          if (code) langCodes.add(code);
        }

        match = key.match(/^translation_(.+)$/i);
        if (match) {
          const code = this.normalizeLanguageCode(match[1]);
          if (code) langCodes.add(code);
        }
      }
    }

    if (!langCodes.size) {
      // legacy fallback: treat as English
      langCodes.add("en");
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

  getCardTitle(card) {
    if (!card) return "";
    const lang = this.getSelectedLanguageCode();
    const k = `title_${lang}`;
    if (card[k]) return String(card[k]);
    if (card.title) return String(card.title);
    if (card.title_en) return String(card.title_en);
    return "";
  }

  getCardText(card) {
    if (!card) return "";
    const lang = this.getSelectedLanguageCode();
    const k = `text_${lang}`;
    if (card[k]) return String(card[k]);
    const legacyK = `translation_${lang}`;
    if (card[legacyK]) return String(card[legacyK]);
    if (card.text) return String(card.text);
    if (card.translation) return String(card.translation);
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

      const langCodeRaw = String(langInfo.code || "en").toLowerCase();
      const langCode = langCodeRaw === "en" ? "US" : langCodeRaw.toUpperCase();
      const langIcon = this._getIcon("🌐", { size: 16 });
      btn.innerHTML = `<span class="lang-icon" aria-hidden="true">${langIcon}</span><span class="lang-label">${langCode}</span>`;
      btn.title = `Language: ${langInfo.name}`;
      btn.setAttribute("aria-label", `Language: ${langInfo.name}`);
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
      `Select hadith editor language (${langInfo.name})`,
    );
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
      this.applyTextLanguageStyling(this.titleEl, this.titleEl.textContent);
    }

    if (this.textEl) {
      this.textEl.textContent = item ? this.getCardText(item) : "";
      this.applyTextLanguageStyling(this.textEl, this.textEl.textContent);
    }

    const narrator = item?.narrator ? String(item.narrator) : "";
    const reference = item?.reference ? String(item.reference) : "";

    if (this.metaEl) {
      const metaText =
        narrator || reference ? `Narrated by: ${narrator} - ${reference}` : "";
      this.metaEl.textContent = metaText;
      this.applyTextLanguageStyling(this.metaEl, metaText);
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

  bindDashboardEvents() {
    if (this.prevBtn && !this.prevBtn.dataset.bound) {
      this.prevBtn.dataset.bound = "true";
      this.prevBtn.addEventListener("click", () => this.gotoPrevCard());
    }

    if (this.nextBtn && !this.nextBtn.dataset.bound) {
      this.nextBtn.dataset.bound = "true";
      this.nextBtn.addEventListener("click", () => this.gotoNextCard());
    }

    if (
      this.fontScaleDecreaseBtn &&
      this.fontScaleDecreaseBtn.dataset.bound !== "true"
    ) {
      this.fontScaleDecreaseBtn.dataset.bound = "true";
      this.fontScaleDecreaseBtn.addEventListener("click", () => {
        this.adjustFontScale(-HadithManager.FONT_SCALE_STEP);
      });
    }

    if (
      this.fontScaleIncreaseBtn &&
      this.fontScaleIncreaseBtn.dataset.bound !== "true"
    ) {
      this.fontScaleIncreaseBtn.dataset.bound = "true";
      this.fontScaleIncreaseBtn.addEventListener("click", () => {
        this.adjustFontScale(HadithManager.FONT_SCALE_STEP);
      });
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
        this.toggleAutoAdvancePaused(),
      );
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

  getTypography() {
    const settings = this.getHadithSettings();

    const title = this.clampNumber(
      parseInt(settings.titleFontSize, 10),
      12,
      144,
      22,
    );

    const text = this.clampNumber(
      parseInt(settings.textFontSize, 10),
      12,
      144,
      18,
    );

    const meta = this.clampNumber(
      parseInt(settings.metaFontSize, 10),
      10,
      96,
      14,
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
    const scale = this.getFontScale();
    const title = this.scaleTypographyValue(t.title, scale);
    const text = this.scaleTypographyValue(t.text, scale);
    const meta = this.scaleTypographyValue(t.meta, scale);
    this.cardEl.style.setProperty("--hadith-title-font-size", `${title}px`);
    this.cardEl.style.setProperty("--hadith-text-font-size", `${text}px`);
    this.cardEl.style.setProperty("--hadith-meta-font-size", `${meta}px`);
    this.updateFontScaleButtons();
  }

  normalizeArabicFontFamily(value) {
    const v = String(value || "").trim();
    if (HadithManager.ARABIC_FONT_FAMILIES.includes(v)) return v;
    return "Noto Naskh Arabic";
  }

  normalizeTranslationFontFamily(value) {
    const v = String(value || "").trim();
    if (HadithManager.TRANSLATION_FONT_FAMILIES.includes(v)) return v;
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
      this.cardEl.style.setProperty(
        "--hadith-arabic-font-family",
        `"${normalized}", var(--font-arabic)`,
      );
    }

    if (persist) {
      this.setHadithSettings({ arabicFontFamily: normalized });
    }
  }

  applyTranslationFontFamily(fontFamily, opts = {}) {
    const { persist = false } = opts;
    const normalized = this.normalizeTranslationFontFamily(fontFamily);
    this._translationFontFamily = normalized;

    if (this.cardEl) {
      this.cardEl.style.setProperty(
        "--hadith-translation-font-family",
        this.resolveTranslationFontCssValue(normalized),
      );
    }

    if (persist) {
      this.setHadithSettings({ translationFontFamily: normalized });
    }
  }

  containsArabicText(value) {
    return /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/.test(
      String(value || ""),
    );
  }

  applyTextLanguageStyling(element, textValue) {
    if (!element) return;
    element.classList.toggle("arabic-text", this.containsArabicText(textValue));
  }

  getFontScale() {
    const settings = this.getHadithSettings();
    const raw = settings.fontScale;
    const parsed = parseFloat(raw);
    const scale = Number.isFinite(parsed) ? parsed : 1;
    return this.clampNumber(
      scale,
      HadithManager.FONT_SCALE_MIN,
      HadithManager.FONT_SCALE_MAX,
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
      HadithManager.FONT_SCALE_MIN,
      HadithManager.FONT_SCALE_MAX,
      1,
    );
    this.setHadithSettings({ fontScale: normalized });
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
        scale <= HadithManager.FONT_SCALE_MIN + 0.001;
      this.fontScaleDecreaseBtn.title = `Decrease font size (${label})`;
      this.fontScaleDecreaseBtn.setAttribute(
        "aria-label",
        `Decrease hadith font size (${label})`,
      );
    }

    if (this.fontScaleIncreaseBtn) {
      this.fontScaleIncreaseBtn.disabled =
        scale >= HadithManager.FONT_SCALE_MAX - 0.001;
      this.fontScaleIncreaseBtn.title = `Increase font size (${label})`;
      this.fontScaleIncreaseBtn.setAttribute(
        "aria-label",
        `Increase hadith font size (${label})`,
      );
    }
  }

  updateTypographyLabels(title, text, meta) {
    if (this.settingsTitleFontSizeValue)
      this.settingsTitleFontSizeValue.textContent = `${title}px`;
    if (this.settingsTextFontSizeValue)
      this.settingsTextFontSizeValue.textContent = `${text}px`;
    if (this.settingsMetaFontSizeValue)
      this.settingsMetaFontSizeValue.textContent = `${meta}px`;
  }

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
    if (!this.settingsLanguagePickerBtn)
      this.settingsLanguagePickerBtn = document.getElementById(
        "hadithEditorLangPickerBtn",
      );
    if (!this.settingsList)
      this.settingsList = document.getElementById("hadithEditorList");
    if (!this.settingsPagination)
      this.settingsPagination = document.getElementById("hadithPagination");
    if (!this.settingsMeta)
      this.settingsMeta = document.getElementById("hadithMeta");

    if (!this.settingsAutoAdvanceSeconds)
      this.settingsAutoAdvanceSeconds = document.getElementById(
        "hadithAutoAdvanceSeconds",
      );

    if (!this.settingsTitleFontSize)
      this.settingsTitleFontSize = document.getElementById(
        "hadithTitleFontSize",
      );
    if (!this.settingsTitleFontSizeValue)
      this.settingsTitleFontSizeValue = document.getElementById(
        "hadithTitleFontSizeValue",
      );
    if (!this.settingsTextFontSize)
      this.settingsTextFontSize = document.getElementById("hadithTextFontSize");
    if (!this.settingsTextFontSizeValue)
      this.settingsTextFontSizeValue = document.getElementById(
        "hadithTextFontSizeValue",
      );
    if (!this.settingsMetaFontSize)
      this.settingsMetaFontSize = document.getElementById("hadithMetaFontSize");
    if (!this.settingsMetaFontSizeValue)
      this.settingsMetaFontSizeValue = document.getElementById(
        "hadithMetaFontSizeValue",
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
        this.createNewSet(),
      );
    }

    if (this.settingsRenameSetBtn) {
      this.settingsRenameSetBtn.addEventListener("click", () =>
        this.renameActiveSet(),
      );
    }

    if (this.settingsDeleteSetBtn) {
      this.settingsDeleteSetBtn.addEventListener("click", () =>
        this.deleteActiveSet(),
      );
    }

    if (this.settingsImportBtn && this.settingsImportInput) {
      this.settingsImportBtn.addEventListener("click", () =>
        this.settingsImportInput.click(),
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
        this.exportActiveSet(),
      );
    }

    if (this.settingsAddItemBtn) {
      this.settingsAddItemBtn.addEventListener("click", () =>
        this.addNewItem(),
      );
    }

    if (this.settingsLanguagePickerBtn) {
      this.settingsLanguagePickerBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.openLanguageSelectorModal("settingsEditor");
      });
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

    if (isDefault) {
      this.settingsList.innerHTML = `
        <div class="adhkar-default-notice">
          <div class="adhkar-default-notice-icon">${this._getIcon("🔒", {
            size: 24,
          })}</div>
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
        "#hadithCreateCustomBtn",
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
          <div class="quotes-empty-title">No hadith in this set</div>
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
        text_en: "",
        narrator: "",
        reference: "",
      };

      const titleValue =
        selectedLang === "en"
          ? (c[titleField] ?? c.title_en ?? c.title ?? "")
          : (c[titleField] ?? "");
      const textValue =
        selectedLang === "en"
          ? (c[textField] ??
            c.translation_en ??
            c.text_en ??
            c.text ??
            c.translation ??
            "")
          : (c[textField] ?? c[`translation_${selectedLang}`] ?? "");

      rows.push(`
        <tr class="hadith-editor-row" data-index="${i}">
          <td class="hadith-col-id">${i + 1}</td>
          <td class="hadith-col-title-lang">
            <input
              class="hadith-editor-input setting-input"
              type="text"
              data-field="${this.escapeHtmlAttr(titleField)}"
              placeholder="Title (${this.escapeHtmlAttr(selectedLang)})"
              maxlength="200"
              value="${this.escapeHtmlAttr(titleValue)}"
            />
          </td>
          <td class="hadith-col-text-lang">
            <textarea
              class="hadith-editor-textarea setting-input"
              data-field="${this.escapeHtmlAttr(textField)}"
              rows="2"
              placeholder="Text (${this.escapeHtmlAttr(selectedLang)})"
              maxlength="12000"
            >${this.escapeHtmlAttr(textValue)}</textarea>
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
              <th class="hadith-col-title-lang">Title (${langCodeLabel})</th>
              <th class="hadith-col-text-lang">Text (${langCodeLabel})</th>
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
      "textarea.hadith-editor-textarea",
    );
    items.forEach((t) => this.autoResizeTextarea(t));
  }

  isSettingsEditorDetached() {
    const group = document.getElementById("hadithEditorGroup");
    return !!group?.closest(".editor-detach-modal.active");
  }

  getSettingsPageSize() {
    return this.isSettingsEditorDetached()
      ? HadithManager.DETACHED_PAGE_SIZE
      : HadithManager.PAGE_SIZE;
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
    const normalizedField = String(field || "").trim();
    const baseAllowed = new Set([
      "narrator",
      "reference",
      "title",
      "text",
      "translation",
    ]);
    const isLocalizedField = /^(title|text)_[a-z0-9-]+$/i.test(normalizedField);
    if (!baseAllowed.has(normalizedField) && !isLocalizedField) return;

    let targetField = normalizedField;
    if (targetField === "title") targetField = "title_en";
    if (targetField === "text" || targetField === "translation") {
      targetField = "text_en";
    }

    item[targetField] = String(value ?? "");

    set.cards = items;
    this.saveSets(sets);

    this.renderDashboard();
  }

  isProtectedSetId(id) {
    return (
      Array.isArray(HadithManager.PROTECTED_SET_IDS) &&
      HadithManager.PROTECTED_SET_IDS.includes(String(id))
    );
  }
});

/**
 * Pocket Quran Manager
 * Full-width Quran reader with Surah selector, Ayah navigation, and per-language translations.
 * Data source: https://api.quran.com (public API v4)
 */

class PocketQuranManager {
  static API_BASE = "https://api.quran.com/api/v4";

  // Hard-coded to only free/open translations we verified exist in the Quran.com API.
  static TRANSLATIONS = {
    85: { label: "M.A.S. Abdel Haleem", language: "English" },
    84: { label: "T. Usmani", language: "English" },
    95: { label: "A. Maududi (Tafhim commentary)", language: "English" },
    19: { label: "M. Pickthall", language: "English" },
    22: { label: "A Yusuf Ali", language: "English" },
    20: { label: "Saheeh International", language: "English" },
    203: { label: "Al-Hilali & Khan", language: "English" },
    57: { label: "Transliteration", language: "English" },

    134: { label: "King Fahad Quran Complex", language: "Indonesian" },
    141: { label: "The Sabiq Company", language: "Indonesian" },
    33: {
      label: "Indonesian Islamic Affairs Ministry",
      language: "Indonesian",
    },
  };

  constructor(storage) {
    this.storage = storage;

    // DOM
    this.card = document.getElementById("pocketQuranCard");
    this.headerMeta = document.getElementById("pocketQuranHeaderMeta");

    // Surah selector (combobox)
    this.surahCombobox = document.getElementById("pocketQuranSurahCombobox");
    this.surahInput = document.getElementById("pocketQuranSurahInput");
    this.surahDropdown = document.getElementById("pocketQuranSurahDropdown");
    this.surahListEl = document.getElementById("pocketQuranSurahList");

    this.contentEl = document.getElementById("pocketQuranContent");

    this.ayahPrevBtn = document.getElementById("pocketQuranAyahPrev");
    this.ayahNextBtn = document.getElementById("pocketQuranAyahNext");

    // Ayah selector (combobox)
    this.ayahCombobox = document.getElementById("pocketQuranAyahCombobox");
    this.ayahInput = document.getElementById("pocketQuranAyahInput");
    this.ayahDropdown = document.getElementById("pocketQuranAyahDropdown");
    this.ayahListEl = document.getElementById("pocketQuranAyahList");

    this.arabicSizeRange = document.getElementById(
      "pocketQuranArabicSizeRange"
    );
    this.arabicSizeValue = document.getElementById(
      "pocketQuranArabicSizeValue"
    );
    this.translationSizeRange = document.getElementById(
      "pocketQuranTranslationSizeRange"
    );
    this.translationSizeValue = document.getElementById(
      "pocketQuranTranslationSizeValue"
    );

    if (!this.card || !this.surahListEl || !this.contentEl) {
      // Component is optional depending on markup.
      return;
    }

    this._chapters = [];
    this._activeSurah = 1;
    this._activeAyah = 1;
    this._activeTranslationId = 85;

    this._fetchController = null;
    this._scrollHighlightTimer = null;
    this._ayahJumpTimer = null;
    this._surahQuery = "";

    this.init();
  }

  init() {
    const pq = this.storage.getSettings()?.pocketQuran || {};

    this._activeSurah = this.clampNumber(pq.lastSurahNumber, 1, 114, 1);
    this._activeAyah = this.clampNumber(pq.lastAyahNumber, 1, 286, 1);
    this._activeTranslationId = this.normalizeTranslationId(
      pq.translationResourceId
    );

    const arabicFontSize = this.clampNumber(pq.arabicFontSize, 8, 144, 32);
    const translationFontSize = this.clampNumber(
      pq.translationFontSize,
      8,
      144,
      18
    );

    this.applyFontSizes(arabicFontSize, translationFontSize, {
      syncInputs: true,
      persist: false,
    });

    this.setupEventListeners();

    this.renderLoading("Loading Surah list…");
    this.loadChaptersAndRenderSurahPicker().then(() => {
      this.setActiveSurah(this._activeSurah, {
        preserveAyah: true,
      });
    });
  }

  setupEventListeners() {
    // Surah selection (event delegation)
    this.surahListEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-surah]");
      if (!btn) return;
      const surah = parseInt(btn.dataset.surah, 10);
      if (!Number.isFinite(surah)) return;
      this._surahQuery = "";
      this.setActiveSurah(surah, { preserveAyah: false });
      this.updateSurahInputValue({ force: true });
      this.closeDropdown(this.surahDropdown);
    });

    const openSurahDropdown = () => {
      if (!this.surahDropdown) return;
      this.renderSurahList();
      this.openDropdown(this.surahDropdown);
    };

    if (this.surahInput) {
      this.surahInput.addEventListener("focus", () => {
        this._surahQuery = "";
        try {
          this.surahInput.select();
        } catch (e) {}
        openSurahDropdown();
      });
      this.surahInput.addEventListener("click", () => {
        this._surahQuery = "";
        openSurahDropdown();
      });
      this.surahInput.addEventListener("input", () => {
        this._surahQuery = this.surahInput.value || "";
        openSurahDropdown();
      });
      this.surahInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          this.closeDropdown(this.surahDropdown);
          return;
        }
        if (e.key !== "Enter") return;
        e.preventDefault();
        const match = this.findSurahFromQuery(this.surahInput.value);
        if (!match) return;
        this._surahQuery = "";
        this.setActiveSurah(match.id, { preserveAyah: false });
        this.updateSurahInputValue({ force: true });
        this.closeDropdown(this.surahDropdown);
      });
    }

    // Ayah list click
    this.ayahListEl?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-ayah]");
      if (!btn) return;
      const n = this.clampNumber(
        parseInt(btn.dataset.ayah, 10),
        1,
        this.getActiveSurahAyahCount() || 286,
        1
      );
      if (this.ayahInput) this.ayahInput.value = String(n);
      this.scrollToAyah(n, { persist: true });
      this.closeDropdown(this.ayahDropdown);
    });

    const openAyahDropdown = () => {
      if (!this.ayahDropdown) return;
      this.openDropdown(this.ayahDropdown);
      this.updateAyahDropdownActiveState();
    };

    // Ayah navigation
    const jumpToAyahFromInput = () => {
      const n = this.clampNumber(
        parseInt(this.ayahInput?.value, 10),
        1,
        this.getActiveSurahAyahCount() || 286,
        1
      );
      if (this.ayahInput) this.ayahInput.value = String(n);
      this.scrollToAyah(n, { persist: true });
    };

    if (this.ayahInput) {
      this.ayahInput.addEventListener("focus", openAyahDropdown);
      this.ayahInput.addEventListener("click", openAyahDropdown);
      this.ayahInput.addEventListener("input", () => {
        // debounce so manual typing doesn't aggressively scroll
        if (this._ayahJumpTimer) clearTimeout(this._ayahJumpTimer);
        this._ayahJumpTimer = setTimeout(() => {
          jumpToAyahFromInput();
        }, 250);
      });

      this.ayahInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          this.closeDropdown(this.ayahDropdown);
          return;
        }
        if (e.key !== "Enter") return;
        e.preventDefault();
        if (this._ayahJumpTimer) clearTimeout(this._ayahJumpTimer);
        jumpToAyahFromInput();
        this.closeDropdown(this.ayahDropdown);
      });

      this.ayahInput.addEventListener("change", () => {
        if (this._ayahJumpTimer) clearTimeout(this._ayahJumpTimer);
        jumpToAyahFromInput();
      });
    }

    if (this.ayahPrevBtn) {
      this.ayahPrevBtn.addEventListener("click", () => {
        const max = this.getActiveSurahAyahCount() || 286;
        const current = this.clampNumber(
          parseInt(this.ayahInput?.value, 10),
          1,
          max,
          1
        );
        const next = this.clampNumber(current - 1, 1, max, 1);
        if (this.ayahInput) this.ayahInput.value = String(next);
        this.scrollToAyah(next, { persist: true });
      });
    }

    if (this.ayahNextBtn) {
      this.ayahNextBtn.addEventListener("click", () => {
        const max = this.getActiveSurahAyahCount() || 286;
        const current = this.clampNumber(
          parseInt(this.ayahInput?.value, 10),
          1,
          max,
          1
        );
        const next = this.clampNumber(current + 1, 1, max, max);
        if (this.ayahInput) this.ayahInput.value = String(next);
        this.scrollToAyah(next, { persist: true });
      });
    }

    // Font size controls (component-local but persisted into settings)
    if (this.arabicSizeRange) {
      this.arabicSizeRange.addEventListener("input", () => {
        const a = this.clampNumber(
          parseInt(this.arabicSizeRange.value, 10),
          8,
          144,
          32
        );
        const t = this.clampNumber(
          parseInt(this.translationSizeRange?.value, 10),
          8,
          144,
          18
        );
        this.applyFontSizes(a, t, { syncInputs: true, persist: false });
      });
      this.arabicSizeRange.addEventListener("change", () => {
        this.persistPocketQuranSettings({
          arabicFontSize: this.clampNumber(
            parseInt(this.arabicSizeRange.value, 10),
            8,
            144,
            32
          ),
        });
      });
    }

    if (this.translationSizeRange) {
      this.translationSizeRange.addEventListener("input", () => {
        const a = this.clampNumber(
          parseInt(this.arabicSizeRange?.value, 10),
          8,
          144,
          32
        );
        const t = this.clampNumber(
          parseInt(this.translationSizeRange.value, 10),
          8,
          144,
          18
        );
        this.applyFontSizes(a, t, { syncInputs: true, persist: false });
      });
      this.translationSizeRange.addEventListener("change", () => {
        this.persistPocketQuranSettings({
          translationFontSize: this.clampNumber(
            parseInt(this.translationSizeRange.value, 10),
            8,
            144,
            18
          ),
        });
      });
    }

    // React to settings changes after a save/reload isn't needed, but we do support
    // live changes if the user changes translation in settings and reloads.

    // Close dropdowns when clicking outside
    document.addEventListener("click", (e) => {
      const t = e.target;
      if (this.surahCombobox && !this.surahCombobox.contains(t)) {
        this.closeDropdown(this.surahDropdown);
      }
      if (this.ayahCombobox && !this.ayahCombobox.contains(t)) {
        this.closeDropdown(this.ayahDropdown);
      }
    });
  }

  openDropdown(el) {
    if (!el) return;
    try {
      const combo = el.closest(".pocket-quran-combobox");
      if (combo) combo.classList.add("pq-open");
    } catch (e) {}
    el.hidden = false;
  }

  closeDropdown(el) {
    if (!el) return;
    try {
      const combo = el.closest(".pocket-quran-combobox");
      if (combo) combo.classList.remove("pq-open");
    } catch (e) {}
    el.hidden = true;
  }

  formatSurahLabel(ch) {
    if (!ch) return "";
    const en = ch.name_simple || `Surah ${ch.id}`;
    const ar = ch.name_arabic ? ` ${ch.name_arabic}` : "";
    return `${ch.id}. ${en}${ar}`;
  }

  updateSurahInputValue(opts = {}) {
    const { force = false } = opts;
    if (!this.surahInput) return;
    if (!force && document.activeElement === this.surahInput) return;
    const chapter = this._chapters.find((c) => c.id === this._activeSurah);
    this.surahInput.value = this.formatSurahLabel(chapter);
  }

  getFilteredChapters(query) {
    const q = String(query || "").trim();
    if (!q) return this._chapters;

    const lower = q.toLowerCase();
    const isNumber = /^\d+$/.test(q);

    return this._chapters.filter((c) => {
      if (isNumber) {
        return String(c.id).startsWith(q);
      }
      const en = String(c.name_simple || "").toLowerCase();
      const ar = String(c.name_arabic || "");
      return en.includes(lower) || ar.includes(q);
    });
  }

  findSurahFromQuery(query) {
    const q = String(query || "").trim();
    if (!q) return null;

    const leadingNumber = q.match(/^\s*(\d{1,3})\b/);
    if (leadingNumber) {
      const id = parseInt(leadingNumber[1], 10);
      if (Number.isFinite(id)) {
        const ch = this._chapters.find((c) => c.id === id);
        if (ch) return ch;
      }
    }

    if (/^\d+$/.test(q)) {
      const id = parseInt(q, 10);
      const ch = this._chapters.find((c) => c.id === id);
      return ch || null;
    }

    const lower = q.toLowerCase();
    const exact = this._chapters.find(
      (c) => String(c.name_simple || "").toLowerCase() === lower
    );
    if (exact) return exact;

    const filtered = this.getFilteredChapters(q);
    return filtered.length ? filtered[0] : null;
  }

  normalizeTranslationId(value) {
    const n = parseInt(value, 10);
    if (Number.isFinite(n) && PocketQuranManager.TRANSLATIONS[n]) return n;
    return 85;
  }

  clampNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  persistPocketQuranSettings(patch) {
    const settings = this.storage.getSettings();
    settings.pocketQuran = {
      ...(settings.pocketQuran || {}),
      ...(patch || {}),
    };
    this.storage.saveSettings(settings);
  }

  applyFontSizes(arabicPx, translationPx, opts = {}) {
    const { syncInputs = false, persist = false } = opts;

    const a = this.clampNumber(arabicPx, 8, 144, 32);
    const t = this.clampNumber(translationPx, 8, 144, 18);

    if (this.card) {
      this.card.style.setProperty("--pq-arabic-size", `${a}px`);
      this.card.style.setProperty("--pq-translation-size", `${t}px`);
    }

    if (syncInputs) {
      if (this.arabicSizeRange) this.arabicSizeRange.value = String(a);
      if (this.translationSizeRange)
        this.translationSizeRange.value = String(t);
      if (this.arabicSizeValue) this.arabicSizeValue.textContent = `${a}px`;
      if (this.translationSizeValue)
        this.translationSizeValue.textContent = `${t}px`;
    }

    if (persist) {
      this.persistPocketQuranSettings({
        arabicFontSize: a,
        translationFontSize: t,
      });
    }
  }

  getActiveSurahAyahCount() {
    const chapter = this._chapters.find((c) => c.id === this._activeSurah);
    const count = chapter?.verses_count;
    return Number.isFinite(count) ? count : null;
  }

  async loadChaptersAndRenderSurahPicker() {
    try {
      const cached = this.storage.get("pocketQuran_chapters_cache", null);
      const cachedAt = this.storage.get("pocketQuran_chapters_cache_at", 0);
      const freshEnough =
        Date.now() - (cachedAt || 0) < 1000 * 60 * 60 * 24 * 7; // 7 days

      if (cached && Array.isArray(cached) && freshEnough) {
        this._chapters = cached;
        this.renderSurahList();
        this.updateSurahInputValue({ force: true });
        return;
      }

      const url = `${PocketQuranManager.API_BASE}/chapters?language=en`;
      const data = await this.fetchJson(url, { timeoutMs: 15000 });
      const chapters = Array.isArray(data?.chapters) ? data.chapters : [];

      this._chapters = chapters
        .map((c) => ({
          id: c.id,
          name_simple: c.name_simple,
          name_arabic: c.name_arabic,
          verses_count: c.verses_count,
        }))
        .filter((c) => Number.isFinite(c.id));

      this.storage.set("pocketQuran_chapters_cache", this._chapters);
      this.storage.set("pocketQuran_chapters_cache_at", Date.now());

      this.renderSurahList();
      this.updateSurahInputValue({ force: true });
    } catch (e) {
      console.error("PocketQuran: failed to load chapters", e);
      this._chapters = [];
      this.renderSurahList({ failed: true });
      this.renderError(
        "Could not load Surah list. Check your internet connection."
      );
    }
  }

  renderSurahList(opts = {}) {
    const { failed = false } = opts;

    if (!this.surahListEl) return;
    this.surahListEl.innerHTML = "";

    if (failed) {
      const div = document.createElement("div");
      div.className = "pocket-quran-dropdown-empty";
      div.textContent = "Surah list unavailable";
      this.surahListEl.appendChild(div);
      return;
    }

    const chapters = this.getFilteredChapters(this._surahQuery);

    const frag = document.createDocumentFragment();

    for (const ch of chapters) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pocket-quran-surah-item";
      btn.dataset.surah = String(ch.id);

      const num = document.createElement("span");
      num.className = "pq-surah-num";
      num.textContent = String(ch.id);

      const names = document.createElement("span");
      names.className = "pq-surah-names";

      const en = document.createElement("span");
      en.className = "pq-surah-en";
      en.textContent = ch.name_simple || `Surah ${ch.id}`;

      const ar = document.createElement("span");
      ar.className = "pq-surah-ar";
      ar.setAttribute("dir", "rtl");
      ar.textContent = ch.name_arabic || "";

      names.appendChild(en);
      names.appendChild(ar);
      btn.appendChild(num);
      btn.appendChild(names);

      frag.appendChild(btn);
    }

    this.surahListEl.appendChild(frag);
    this.updateSurahActiveState();
  }

  updateSurahActiveState() {
    if (!this.surahListEl) return;
    for (const btn of this.surahListEl.querySelectorAll(
      ".pocket-quran-surah-item"
    )) {
      const surah = parseInt(btn.dataset.surah, 10);
      btn.classList.toggle("active", surah === this._activeSurah);
      btn.setAttribute(
        "aria-current",
        surah === this._activeSurah ? "true" : "false"
      );
    }
  }

  async setActiveSurah(surahNumber, opts = {}) {
    const { preserveAyah = false } = opts;

    const surah = this.clampNumber(surahNumber, 1, 114, 1);
    if (surah === this._activeSurah && this.contentEl?.children?.length) {
      // still ensure highlight nav works
      this.updateSurahActiveState();
      this.updateSurahInputValue({ force: true });
      return;
    }

    this._activeSurah = surah;
    if (!preserveAyah) this._activeAyah = 1;

    const persistPatch = {
      lastSurahNumber: surah,
      translationResourceId: this._activeTranslationId,
    };
    if (!preserveAyah) persistPatch.lastAyahNumber = 1;
    this.persistPocketQuranSettings(persistPatch);

    this.updateSurahActiveState();
    this.updateSurahInputValue({ force: true });

    await this.loadSurah(surah);
  }

  async loadSurah(surah) {
    const chapter = this._chapters.find((c) => c.id === surah);
    const surahName = chapter?.name_simple || `Surah ${surah}`;
    const surahNameAr = chapter?.name_arabic || "";

    this.renderLoading(`Loading ${surahName}…`);

    // cancel any in-flight request
    try {
      if (this._fetchController) this._fetchController.abort();
    } catch (e) {}

    const controller = new AbortController();
    this._fetchController = controller;

    try {
      const translationId = this.normalizeTranslationId(
        this.storage.getSettings()?.pocketQuran?.translationResourceId
      );
      this._activeTranslationId = translationId;

      const url = `${PocketQuranManager.API_BASE}/verses/by_chapter/${surah}?fields=text_uthmani,verse_number,verse_key&translations=${translationId}&per_page=300`;
      const data = await this.fetchJson(url, {
        signal: controller.signal,
        timeoutMs: 20000,
      });

      const verses = Array.isArray(data?.verses) ? data.verses : [];

      if (!verses.length) {
        this.renderError("No verses returned by the API.");
        return;
      }

      this.renderSurahHeader({
        surah,
        surahName,
        surahNameAr,
        versesCount: verses.length,
      });
      this.renderVerses(verses);
      this.updateAyahControls(verses.length);

      // If we have a stored ayah (e.g., reload), scroll after render.
      const desired = this.clampNumber(
        this.storage.getSettings()?.pocketQuran?.lastAyahNumber,
        1,
        verses.length,
        1
      );
      if (this.ayahInput) this.ayahInput.value = String(desired);
      this.scrollToAyah(desired, { persist: false, smooth: false });
      this.updateAyahDropdownActiveState();
    } catch (e) {
      if (e?.name === "AbortError") return;
      console.error("PocketQuran: failed to load surah", e);
      this.renderError("Could not load this Surah. Please try again.");
    } finally {
      if (this._fetchController === controller) this._fetchController = null;
    }
  }

  renderSurahHeader({ surah, surahName, surahNameAr, versesCount }) {
    if (!this.headerMeta) return;

    const translation =
      PocketQuranManager.TRANSLATIONS[this._activeTranslationId]?.label ||
      "Translation";

    this.headerMeta.textContent = `${surah} · ${surahName}${
      surahNameAr ? ` · ${surahNameAr}` : ""
    } · ${versesCount} ayahs · ${translation}`;
  }

  updateAyahControls(ayahCount) {
    const max = this.clampNumber(ayahCount, 1, 286, 1);
    if (this.ayahInput) {
      if (!this.ayahInput.value) this.ayahInput.value = "1";
    }

    if (this.ayahListEl) {
      this.ayahListEl.innerHTML = "";
      const frag = document.createDocumentFragment();
      for (let i = 1; i <= max; i++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pocket-quran-ayah-option";
        btn.dataset.ayah = String(i);
        btn.textContent = String(i);
        frag.appendChild(btn);
      }
      this.ayahListEl.appendChild(frag);
    }

    this.updateAyahDropdownActiveState();
  }

  updateAyahDropdownActiveState() {
    if (!this.ayahListEl) return;
    const max = this.getActiveSurahAyahCount() || 286;
    const current = this.clampNumber(this._activeAyah, 1, max, 1);
    for (const btn of this.ayahListEl.querySelectorAll(
      ".pocket-quran-ayah-option"
    )) {
      const n = parseInt(btn.dataset.ayah, 10);
      btn.classList.toggle("active", n === current);
      btn.setAttribute("aria-selected", n === current ? "true" : "false");
    }
  }

  renderLoading(message) {
    if (!this.contentEl) return;
    this.contentEl.innerHTML = "";

    const div = document.createElement("div");
    div.className = "pocket-quran-loading";

    const spinner = document.createElement("div");
    spinner.className = "pocket-quran-spinner";

    const text = document.createElement("div");
    text.className = "pocket-quran-loading-text";
    text.textContent = message || "Loading…";

    div.appendChild(spinner);
    div.appendChild(text);
    this.contentEl.appendChild(div);
  }

  renderError(message) {
    if (!this.contentEl) return;
    this.contentEl.innerHTML = "";

    const div = document.createElement("div");
    div.className = "pocket-quran-error";

    const text = document.createElement("div");
    text.className = "pocket-quran-error-text";
    text.textContent = message || "Something went wrong.";

    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "pocket-quran-retry-btn";
    retry.textContent = "Retry";
    retry.addEventListener("click", () => this.loadSurah(this._activeSurah));

    div.appendChild(text);
    div.appendChild(retry);
    this.contentEl.appendChild(div);
  }

  renderVerses(verses) {
    if (!this.contentEl) return;
    this.contentEl.innerHTML = "";

    const frag = document.createDocumentFragment();

    for (const v of verses) {
      const ayahNumber = v.verse_number;
      const ayahEl = document.createElement("div");
      ayahEl.className = "pocket-quran-ayah";
      ayahEl.id = `pocketQuranAyah-${ayahNumber}`;
      ayahEl.dataset.ayah = String(ayahNumber);

      const badge = document.createElement("div");
      badge.className = "pocket-quran-ayah-badge";
      badge.textContent = String(ayahNumber);

      const ar = document.createElement("div");
      ar.className = "pocket-quran-ayah-ar";
      ar.setAttribute("dir", "rtl");
      ar.textContent = v.text_uthmani || "";

      const tr = document.createElement("div");
      tr.className = "pocket-quran-ayah-tr";

      const rawTranslation = Array.isArray(v.translations)
        ? v.translations[0]?.text
        : "";
      tr.textContent = this.stripHtmlToText(rawTranslation || "");

      ayahEl.appendChild(badge);
      ayahEl.appendChild(ar);
      ayahEl.appendChild(tr);

      frag.appendChild(ayahEl);
    }

    this.contentEl.appendChild(frag);
  }

  stripHtmlToText(html) {
    // Quran.com translations may include <sup foot_note="...">...</sup> markup.
    // Convert safely to plain text.
    try {
      const div = document.createElement("div");
      div.innerHTML = String(html || "");
      return (div.textContent || "").replace(/\s+/g, " ").trim();
    } catch (e) {
      return String(html || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  scrollToAyah(ayahNumber, opts = {}) {
    const { persist = true, smooth = true } = opts;

    const max = this.getActiveSurahAyahCount() || 286;
    const n = this.clampNumber(ayahNumber, 1, max, 1);
    this._activeAyah = n;

    const el = document.getElementById(`pocketQuranAyah-${n}`);
    if (!el) return;

    try {
      el.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "start",
      });
    } catch (e) {
      // fallback
      try {
        const y = el.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: y, behavior: smooth ? "smooth" : "auto" });
      } catch (_) {}
    }

    if (this._scrollHighlightTimer) clearTimeout(this._scrollHighlightTimer);
    el.classList.remove("pq-highlight");
    // force reflow so animation restarts
    void el.offsetWidth;
    el.classList.add("pq-highlight");
    this._scrollHighlightTimer = setTimeout(() => {
      el.classList.remove("pq-highlight");
    }, 1400);

    if (persist) {
      this.persistPocketQuranSettings({
        lastAyahNumber: n,
        lastSurahNumber: this._activeSurah,
      });
    }

    this.updateAyahDropdownActiveState();
  }

  async fetchJson(url, opts = {}) {
    const { signal, timeoutMs = 15000 } = opts;

    const controller = !signal ? new AbortController() : null;
    const timer = setTimeout(() => {
      try {
        if (controller) controller.abort();
      } catch (e) {}
    }, timeoutMs);

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: signal || controller.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Quotes Manager
 * Handles Quran and Hadith quotes with pagination and import/export
 */

class QuotesManager extends BaseManager {
  constructor(storage) {
    super();
    this.storage = storage;
    this.defaultQuotes = [];
    this.userQuotes = [];
    this.currentQuote = null;

    // Quote navigation history (for prev/next)
    this._quoteHistory = [];
    this._quoteHistoryIndex = -1;
    this._maxQuoteHistory = 200;
    this.currentPage = 1;
    this.quotesPerPage = 10;

    // Default quotes language selector (applies to bundled default quotes only)
    this._langModal = null;
    this._langModalContext = "default";

    // Debounced persistence timer for inline settings editor
    this._editorSaveTimer = null;

    // Quote auto-rotation
    this.autoRotateMs = 60 * 1000;
    this.autoRotateTimer = null;
    this._hoverPauseAutoRotate = false;

    // Track running animations so we can cancel cleanly
    this._activeAnimations = [];

    // Quote display elements
    this.quoteText = document.getElementById("quoteText");
    this.quoteSource = document.getElementById("quoteSource");
    this.quotePrev = document.getElementById("quotePrev");
    this.quoteNext = document.getElementById("quoteNext");
    this.quoteSection = document.getElementById("quoteSection");

    this.quoteContainer = this.quoteText?.closest(".quote-container") || null;

    // Quotes settings elements
    this.quotesListContainer = document.getElementById("userQuotesList");
    this.paginationContainer = document.getElementById("quotesPagination");
    this.importBtn = document.getElementById("importQuotesBtn");
    this.exportBtn = document.getElementById("exportQuotesBtn");
    this.importInput = document.getElementById("importQuotesInput");
    this.addItemBtn = document.getElementById("quotesAddItemBtn");
    this.editorLangPickerBtn = document.getElementById(
      "quotesEditorLangPickerBtn",
    );

    // Keep language selector icon in sync with icon theme changes.
    document.addEventListener("md:icon-theme-change", () => {
      this.updateLanguageSelectorButton();
      this.updateEditorLanguagePickerButton();
    });
  }

  /**
   * Initialize quotes
   */
  async init() {
    await this.loadDefaultQuotes();
    this.loadUserQuotes();
    this.applyLayoutStyle();

    // Default quotes language selector UI (top-right of quoteSection)
    this.createLanguageSelectorButton();
    this.createLanguageSelectorModal();
    this.updateLanguageSelectorButton();

    this.displayRandomQuote();
    this.setupEventListeners();
    this.renderQuotesList();

    // Auto-rotate quotes using the same animation path as manual refresh
    this.startAutoRotate();
  }

  /**
   * Apply quote layout style based on settings
   */
  applyLayoutStyle() {
    if (!this.quoteContainer) return;
    const settings = this.storage.getSettings();
    const style = settings.quoteLayoutStyle || "classic";

    // Remove all style classes
    this.quoteContainer.classList.remove(
      "quote-style-classic",
      "quote-style-minimal",
      "quote-style-elegant",
      "quote-style-card",
      "quote-style-banner",
    );

    // Add the selected style class
    this.quoteContainer.classList.add(`quote-style-${style}`);
  }

  /**
   * Load default quotes from JSON
   */
  async loadDefaultQuotes() {
    try {
      const response = await fetch("data/quotes_default.json", {
        cache: "no-store",
      });
      if (response.ok) {
        const raw = await response.json();
        this.defaultQuotes = (Array.isArray(raw) ? raw : []).map((q) => ({
          ...(q && typeof q === "object" && !Array.isArray(q) ? q : {}),
          _isDefault: true,
        }));
      }
    } catch (e) {
      console.error("Failed to load default quotes:", e);
      // Fallback quotes
      this.defaultQuotes = [
        {
          text_en: "Indeed, with hardship comes ease.",
          text_id: "Sesungguhnya bersama kesulitan ada kemudahan.",
          source: "Quran 94:6",
          type: "quran",
          _isDefault: true,
        },
        {
          text_en: "And He found you lost and guided you.",
          text_id:
            "Dan Dia mendapatimu dalam keadaan bingung, lalu Dia memberi petunjuk.",
          source: "Quran 93:7",
          type: "quran",
          _isDefault: true,
        },
        {
          text_en: "So remember Me; I will remember you.",
          text_id: "Maka ingatlah Aku, niscaya Aku mengingatmu.",
          source: "Quran 2:152",
          type: "quran",
          _isDefault: true,
        },
      ];
    }

    this.updateLanguageSelectorButton();
  }

  /**
   * Reload the bundled default quotes from the data folder.
   */
  async refreshDefaultQuotes() {
    await this.loadDefaultQuotes();
    // If defaults are enabled (or no other source is enabled), this will
    // immediately reflect the refreshed data.
    this.displayRandomQuote();
  }

  /**
   * Load user quotes from storage
   */
  loadUserQuotes() {
    const stored = this.storage.getUserQuotes();
    this.userQuotes = this.normalizeUserQuotes(stored);
    const settings = this.storage.getSettings();
    this.quotesPerPage = settings.quotesPerPage || 10;

    // Persist migrations from legacy quote schema if needed.
    this.storage.saveUserQuotes(this.userQuotes);
  }

  normalizeLanguageCode(code) {
    return String(code || "")
      .trim()
      .toLowerCase();
  }

  escapeHtmlAttr(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

  getSelectedEditorLanguageCode() {
    const settings = this.storage.getSettings();
    const editor = this.normalizeLanguageCode(settings?.quotesUserLang);
    if (editor) return editor;
    const fallback = this.normalizeLanguageCode(settings?.quotesDefaultLang);
    return fallback || "en";
  }

  setSelectedEditorLanguageCode(langCode) {
    const normalized = this.normalizeLanguageCode(langCode);
    if (!normalized) return;

    const settings = this.storage.getSettings();
    settings.quotesUserLang = normalized;
    this.storage.saveSettings(settings);
  }

  getEditorTextField() {
    return `text_${this.getSelectedEditorLanguageCode()}`;
  }

  getAvailableUserLanguages() {
    if (!Array.isArray(this.userQuotes) || !this.userQuotes.length) {
      return [{ code: "en", name: "English" }];
    }

    const langCodes = new Set();
    this.userQuotes.forEach((quote) => {
      if (!quote || typeof quote !== "object" || Array.isArray(quote)) return;
      Object.keys(quote).forEach((rawKey) => {
        const key = String(rawKey || "");
        const match = key.match(/^text_(.+)$/i);
        if (match) {
          const code = this.normalizeLanguageCode(match[1]);
          if (code) langCodes.add(code);
        }
      });

      if (quote.text && quote.isArabic) {
        langCodes.add("ar");
      } else if (quote.text) {
        langCodes.add("en");
      }
    });

    if (!langCodes.size) langCodes.add("en");
    return this.toSortedLanguageList(langCodes);
  }

  getEditorLanguageOptions() {
    const actual = this.getAvailableUserLanguages();
    const langCodes = new Set(
      actual.map((l) => this.normalizeLanguageCode(l.code)),
    );

    Object.keys(this.getKnownLanguageMap()).forEach((code) => {
      const normalized = this.normalizeLanguageCode(code);
      if (normalized) langCodes.add(normalized);
    });

    return this.toSortedLanguageList(langCodes);
  }

  getQuoteLocalizedText(quote, langCode) {
    if (!quote) return "";
    const normalizedLang = this.normalizeLanguageCode(langCode) || "en";
    const localizedKey = `text_${normalizedLang}`;
    if (typeof quote[localizedKey] === "string" && quote[localizedKey].trim()) {
      return quote[localizedKey].trim();
    }

    const legacyKey = `translation_${normalizedLang}`;
    if (typeof quote[legacyKey] === "string" && quote[legacyKey].trim()) {
      return quote[legacyKey].trim();
    }

    if (
      normalizedLang === "ar" &&
      typeof quote.text === "string" &&
      quote.isArabic
    ) {
      return quote.text.trim();
    }

    if (typeof quote.text_en === "string" && quote.text_en.trim()) {
      return quote.text_en.trim();
    }
    if (typeof quote.text === "string" && quote.text.trim()) {
      return quote.text.trim();
    }

    const firstLocalized = Object.keys(quote).find((k) =>
      /^text_[a-z0-9-]+$/i.test(k),
    );
    if (firstLocalized && typeof quote[firstLocalized] === "string") {
      return quote[firstLocalized].trim();
    }

    return "";
  }

  getQuoteLanguageCode(quote) {
    if (!quote) return "en";

    if (quote._isDefault) {
      return this.getSelectedDefaultLanguageCode();
    }

    const preferred = this.getSelectedEditorLanguageCode();
    if (quote[`text_${preferred}`]) return preferred;

    const localizedKey = Object.keys(quote || {}).find((k) =>
      /^text_[a-z0-9-]+$/i.test(k),
    );
    if (localizedKey) {
      return this.normalizeLanguageCode(localizedKey.replace(/^text_/i, ""));
    }

    if (quote.isArabic) return "ar";
    return "en";
  }

  normalizeQuoteRecord(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

    const source = String(raw.source || "").trim();
    const type = String(raw.type || "user").trim() || "user";
    const textFields = {};

    Object.entries(raw).forEach(([rawKey, rawValue]) => {
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
      }
    });

    const legacyText = String(
      raw.text || raw.translation || raw.english || "",
    ).trim();
    if (legacyText) {
      if (raw.isArabic === true) {
        if (!textFields.text_ar) textFields.text_ar = legacyText;
      } else if (!textFields.text_en) {
        textFields.text_en = legacyText;
      }
    }

    if (!Object.keys(textFields).length) return null;

    const rawId = raw.id;
    const parsedId = Number(rawId);
    const id = Number.isFinite(parsedId)
      ? parsedId
      : Date.now() + Math.floor(Math.random() * 1000000);

    return {
      id,
      source,
      type,
      ...textFields,
    };
  }

  normalizeUserQuotes(quotes) {
    const list = Array.isArray(quotes) ? quotes : [];
    const normalized = list
      .map((q) => this.normalizeQuoteRecord(q))
      .filter(Boolean);

    const deduped = [];
    const seen = new Set();
    normalized.forEach((quote) => {
      const key = JSON.stringify(this.serializeUserQuote(quote));
      if (seen.has(key)) return;
      seen.add(key);
      deduped.push(quote);
    });

    return deduped;
  }

  serializeUserQuote(quote) {
    const out = {};
    Object.keys(quote || {})
      .filter((key) => /^text_[a-z0-9-]+$/i.test(key))
      .sort()
      .forEach((key) => {
        const value = String(quote[key] || "").trim();
        if (value) out[key.toLowerCase()] = value;
      });

    out.source = String(quote?.source || "").trim();
    out.type = String(quote?.type || "user").trim() || "user";
    return out;
  }

  /**
   * Get all available quotes based on settings
   */
  getAvailableQuotes() {
    const settings = this.storage.getSettings();
    let quotes = [];

    if (settings.useDefaultQuotes && this.defaultQuotes.length > 0) {
      quotes = quotes.concat(this.defaultQuotes);
    }

    if (settings.useUserQuotes && this.userQuotes.length > 0) {
      quotes = quotes.concat(this.userQuotes);
    }

    // If both are disabled, use default
    if (quotes.length === 0) {
      quotes = this.defaultQuotes;
    }

    return quotes;
  }

  /**
   * Display random quote
   */
  displayRandomQuote() {
    const quotes = this.getAvailableQuotes();
    if (quotes.length === 0) {
      if (this.quoteText) {
        this.quoteText.textContent = "Add some inspiring quotes in settings!";
      }
      if (this.quoteSource) {
        this.quoteSource.textContent = "";
      }

      this.currentQuote = null;
      this._quoteHistory = [];
      this._quoteHistoryIndex = -1;
      return;
    }

    // Get random quote different from current
    let newQuote;
    if (quotes.length === 1) {
      newQuote = quotes[0];
    } else {
      do {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        newQuote = quotes[randomIndex];
      } while (newQuote === this.currentQuote && quotes.length > 1);
    }

    this.setCurrentQuote(newQuote, { pushToHistory: true });
  }

  setCurrentQuote(quote, { pushToHistory = false } = {}) {
    if (!quote) return;

    if (pushToHistory) {
      this.pushQuoteToHistory(quote);
    }

    this.currentQuote = quote;
    this.animateQuote(quote);
  }

  pushQuoteToHistory(quote) {
    if (!quote) return;

    // If the user previously navigated back, truncate the forward history.
    if (this._quoteHistoryIndex < this._quoteHistory.length - 1) {
      this._quoteHistory = this._quoteHistory.slice(
        0,
        this._quoteHistoryIndex + 1,
      );
    }

    this._quoteHistory.push(quote);
    this._quoteHistoryIndex = this._quoteHistory.length - 1;

    // Cap history size.
    if (this._quoteHistory.length > this._maxQuoteHistory) {
      const overflow = this._quoteHistory.length - this._maxQuoteHistory;
      this._quoteHistory.splice(0, overflow);
      this._quoteHistoryIndex = Math.max(0, this._quoteHistoryIndex - overflow);
    }
  }

  showPreviousQuote() {
    if (this._quoteHistoryIndex > 0) {
      this._quoteHistoryIndex -= 1;
      const q = this._quoteHistory[this._quoteHistoryIndex];
      this.setCurrentQuote(q, { pushToHistory: false });
    }
  }

  showNextQuote() {
    // If we have forward history (user went back), use it.
    if (this._quoteHistoryIndex >= 0) {
      const canForward =
        this._quoteHistoryIndex < this._quoteHistory.length - 1;
      if (canForward) {
        this._quoteHistoryIndex += 1;
        const q = this._quoteHistory[this._quoteHistoryIndex];
        this.setCurrentQuote(q, { pushToHistory: false });
        return;
      }
    }

    // Otherwise, pick a new random quote and extend history.
    this.displayRandomQuote();
  }

  /**
   * Animate quote change
   * Uses a jitter-free approach: measure before and after, then animate with transforms
   */
  animateQuote(quote) {
    if (!this.quoteText || !this.quoteSource) return;

    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;
    const container = this.quoteContainer || this.quoteText.parentElement;

    const quoteText = this.getQuoteText(quote);
    const quoteSource = quote?.source ? `— ${quote.source}` : "";
    const quoteLang = this.getQuoteLanguageCode(quote);
    const isArabic = quoteLang === "ar" || !!quote?.isArabic;

    if (!container || prefersReducedMotion) {
      this.quoteText.textContent = quoteText;
      this.quoteSource.textContent = quoteSource;
      this.quoteText.classList.toggle("arabic-text", isArabic);
      return;
    }

    // Cancel any in-flight animations to avoid stacking/jank
    if (this._activeAnimations.length > 0) {
      this._activeAnimations.forEach((a) => {
        try {
          a.cancel();
        } catch {
          // no-op
        }
      });
      this._activeAnimations = [];
    }

    // FLIP technique: First, measure initial state
    const startRect = container.getBoundingClientRect();
    const startHeight = startRect.height;

    // Lock the container height immediately to prevent layout shift
    container.style.height = `${startHeight}px`;
    container.style.overflow = "hidden";

    const outKeyframes = [
      { opacity: 1, transform: "translateY(0)" },
      { opacity: 0, transform: "translateY(-6px)" },
    ];

    const outOptions = {
      duration: 150,
      easing: "cubic-bezier(0.4, 0, 1, 1)",
      fill: "forwards",
    };

    const outText = this.quoteText.animate(outKeyframes, outOptions);
    const outSource = this.quoteSource.animate(outKeyframes, outOptions);
    this._activeAnimations.push(outText, outSource);

    outText.finished
      .catch(() => {})
      .finally(() => {
        // Skip if animation was cancelled
        if (outText.playState === "idle") return;

        // Swap content while invisible
        this.quoteText.textContent = quoteText;
        this.quoteSource.textContent = quoteSource;
        this.quoteText.classList.toggle("arabic-text", isArabic);

        // Force layout recalc and measure new height
        // Temporarily remove height lock to get natural height
        container.style.height = "auto";
        const endHeight = container.getBoundingClientRect().height;

        // Immediately re-lock at start height (no visual change yet)
        container.style.height = `${startHeight}px`;

        // Use requestAnimationFrame to batch the height transition
        requestAnimationFrame(() => {
          // Animate height using CSS transition for smoother performance
          container.style.transition =
            "height 280ms cubic-bezier(0.4, 0, 0.2, 1)";
          container.style.height = `${endHeight}px`;

          const inKeyframes = [
            { opacity: 0, transform: "translateY(8px)" },
            { opacity: 1, transform: "translateY(0)" },
          ];

          const inOptions = {
            duration: 220,
            delay: 40,
            easing: "cubic-bezier(0, 0, 0.2, 1)",
            fill: "forwards",
          };

          const inText = this.quoteText.animate(inKeyframes, inOptions);
          const inSource = this.quoteSource.animate(inKeyframes, inOptions);
          this._activeAnimations.push(inText, inSource);

          // Clean up after all animations complete
          const cleanup = () => {
            container.style.height = "";
            container.style.overflow = "";
            container.style.transition = "";
            this._activeAnimations = [];
          };

          // Wait for both height transition and fade-in to complete
          const heightTransitionEnd = new Promise((resolve) => {
            const onEnd = (e) => {
              if (e.propertyName === "height") {
                container.removeEventListener("transitionend", onEnd);
                resolve();
              }
            };
            container.addEventListener("transitionend", onEnd);
            // Fallback timeout in case transitionend doesn't fire
            setTimeout(resolve, 320);
          });

          Promise.all([
            heightTransitionEnd,
            inText.finished.catch(() => {}),
            inSource.finished.catch(() => {}),
          ]).then(cleanup);
        });
      });
  }

  /**
   * Start automatic quote rotation
   */
  startAutoRotate() {
    this.stopAutoRotate();
    if (this._hoverPauseAutoRotate) return;
    this.autoRotateTimer = setInterval(() => {
      this.displayRandomQuote();
    }, this.autoRotateMs);
  }

  /**
   * Stop automatic quote rotation
   */
  stopAutoRotate() {
    if (this.autoRotateTimer) {
      clearInterval(this.autoRotateTimer);
      this.autoRotateTimer = null;
    }
  }

  /**
   * Add user quote
   */
  addUserQuote(text, source, languageCode = "en") {
    const normalizedLang = this.normalizeLanguageCode(languageCode) || "en";
    const textField = `text_${normalizedLang}`;
    const quote = {
      id: Date.now() + Math.floor(Math.random() * 1000000),
      source: source.trim(),
      type: "user",
      [textField]: text.trim(),
    };

    this.userQuotes = this.normalizeUserQuotes([...this.userQuotes, quote]);
    this.storage.saveUserQuotes(this.userQuotes);

    // Jump to the last page so the newly added quote is visible
    this.currentPage = Math.max(1, this.getTotalPages());
    this.renderQuotesList();
    return quote;
  }

  addEmptyUserQuote(languageCode = "en") {
    const normalizedLang = this.normalizeLanguageCode(languageCode) || "en";
    const textField = `text_${normalizedLang}`;
    const quote = {
      id: Date.now() + Math.floor(Math.random() * 1000000),
      source: "",
      type: "user",
      [textField]: "",
    };

    this.userQuotes.push(quote);
    this.storage.saveUserQuotes(this.userQuotes);

    this.currentPage = Math.max(1, this.getTotalPages());
    this.renderQuotesList();
    this.focusQuoteEditorTextField(quote.id);

    return quote;
  }

  /**
   * Update an existing user quote
   */
  updateUserQuote(id, { text, source, textField }) {
    const quote = this.userQuotes.find((q) => q.id === id);
    if (!quote) return false;

    const nextText = String(text ?? "").trim();
    const nextSource = String(source ?? "").trim();
    const requestedField = String(textField || "")
      .trim()
      .toLowerCase();
    const targetField = /^text_[a-z0-9-]+$/i.test(requestedField)
      ? requestedField
      : this.getEditorTextField();

    if (!nextText) {
      alert("Quote text cannot be empty");
      return false;
    }
    if (!nextSource) {
      alert("Quote source cannot be empty");
      return false;
    }

    quote[targetField] = nextText;
    quote.source = nextSource;
    delete quote.text;
    delete quote.isArabic;

    this.userQuotes = this.normalizeUserQuotes(this.userQuotes);
    this.storage.saveUserQuotes(this.userQuotes);
    return true;
  }

  updateUserQuoteField(id, field, value, textField) {
    const quote = this.userQuotes.find((q) => q.id === id);
    if (!quote) return;

    if (field === "source") {
      quote.source = String(value ?? "");
    } else if (field === "text") {
      const targetField = /^text_[a-z0-9-]+$/i.test(String(textField || ""))
        ? String(textField).toLowerCase()
        : this.getEditorTextField();
      quote[targetField] = String(value ?? "");
      delete quote.text;
      delete quote.isArabic;
    }

    quote.type = String(quote.type || "user").trim() || "user";
    this.scheduleEditorSave();
  }

  scheduleEditorSave() {
    if (this._editorSaveTimer) {
      clearTimeout(this._editorSaveTimer);
    }

    this._editorSaveTimer = setTimeout(() => {
      this._editorSaveTimer = null;
      this.storage.saveUserQuotes(this.userQuotes);
    }, 250);
  }

  autoResizeEditorTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  focusQuoteEditorTextField(quoteId) {
    if (!this.quotesListContainer) return;

    requestAnimationFrame(() => {
      const row = this.quotesListContainer.querySelector(
        `.quote-editor-row[data-id="${quoteId}"]`,
      );
      const input = row?.querySelector('.quote-editor-text[data-field="text"]');
      if (!input) return;

      input.focus();
      const length = String(input.value || "").length;
      try {
        input.setSelectionRange(length, length);
      } catch (e) {
        // ignore browsers that don't support setSelectionRange for this input type
      }
    });
  }

  /**
   * Delete user quote
   */
  deleteUserQuote(id) {
    this.userQuotes = this.userQuotes.filter((q) => q.id !== id);
    this.storage.saveUserQuotes(this.userQuotes);

    // Adjust current page if needed
    const totalPages = Math.ceil(
      this.userQuotes.length / this.getEditorPageSize(),
    );
    if (this.currentPage > totalPages && totalPages > 0) {
      this.currentPage = totalPages;
    }

    this.renderQuotesList();
  }

  /**
   * Get user quotes
   */
  getUserQuotes() {
    return this.userQuotes;
  }

  /**
   * Get paginated quotes
   */
  getPaginatedQuotes() {
    const pageSize = this.getEditorPageSize();
    const startIndex = (this.currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return this.userQuotes.slice(startIndex, endIndex);
  }

  /**
   * Get total pages
   */
  getTotalPages() {
    return Math.ceil(this.userQuotes.length / this.getEditorPageSize());
  }

  isEditorDetached() {
    const group = document.getElementById("quotesEditorGroup");
    return !!group?.closest(".editor-detach-modal.active");
  }

  getEditorPageSize() {
    return this.isEditorDetached() ? 10 : this.quotesPerPage;
  }

  /**
   * Go to page
   */
  goToPage(page) {
    const totalPages = this.getTotalPages();
    if (page >= 1 && page <= totalPages) {
      this.currentPage = page;
      this.renderQuotesList();
    }
  }

  /**
   * Render quotes list with pagination
   */
  renderQuotesList() {
    if (!this.quotesListContainer) return;

    this.updateEditorLanguagePickerButton();

    const selectedLang = this.getSelectedEditorLanguageCode();
    const textField = `text_${selectedLang}`;
    const langLabel = selectedLang.toUpperCase();

    const totalPages = Math.max(1, this.getTotalPages());
    this.currentPage = Math.min(Math.max(1, this.currentPage), totalPages);
    const pageSize = this.getEditorPageSize();
    const quotes = this.getPaginatedQuotes();

    // Clear container
    this.quotesListContainer.innerHTML = "";
    this.quotesListContainer.dataset.textField = textField;

    if (this.userQuotes.length === 0) {
      this.quotesListContainer.innerHTML = `
        <div class="quotes-empty">
          <p>No custom quotes yet.</p>
          <p class="quotes-empty-hint">Use Add Quote to create your first row, or import from JSON.</p>
        </div>
      `;
    } else {
      const rows = quotes
        .map((quote, index) => {
          const globalIndex = (this.currentPage - 1) * pageSize + index + 1;
          const localizedText = this.getQuoteLocalizedText(quote, selectedLang);
          const quoteLang = this.getQuoteLanguageCode(quote);
          const isArabic = quoteLang === "ar";

          return `
            <div class="flashcard-row quote-editor-row" data-id="${quote.id}">
              <div class="flashcard-row-index">${globalIndex}</div>
              <textarea
                class="flashcard-cell flashcard-textarea setting-input quote-editor-text ${
                  isArabic ? "arabic-text" : ""
                }"
                data-field="text"
                rows="1"
                placeholder="Quote text (${this.escapeHtml(textField)})"
                maxlength="6000"
              >${this.escapeHtml(localizedText)}</textarea>
              <input
                type="text"
                class="flashcard-cell setting-input quote-editor-source"
                data-field="source"
                placeholder="Source"
                maxlength="500"
                value="${this.escapeHtmlAttr(quote.source || "")}"
              />
              <button
                class="flashcard-row-delete"
                type="button"
                data-action="delete-quote"
                title="Delete"
                aria-label="Delete quote"
              >
                ×
              </button>
            </div>
          `;
        })
        .join("");

      this.quotesListContainer.innerHTML = `
        <div class="flashcard-editor-header quotes-editor-header">
          <div>#</div>
          <div>Text (${langLabel})</div>
          <div>Source</div>
          <div></div>
        </div>
        <div class="flashcard-editor-body quotes-editor-body">
          ${rows}
        </div>
      `;

      this.quotesListContainer
        .querySelectorAll("textarea.quote-editor-text")
        .forEach((textarea) => this.autoResizeEditorTextarea(textarea));
    }

    if (this.quotesListContainer.dataset.editorBound !== "true") {
      this.quotesListContainer.dataset.editorBound = "true";

      this.quotesListContainer.addEventListener("input", (e) => {
        const target = e.target;
        if (!target || !target.classList) return;

        const row = target.closest(".quote-editor-row");
        if (!row) return;

        const quoteId = Number(row.dataset.id);
        if (!Number.isFinite(quoteId)) return;

        const field = target.dataset.field;
        if (!field) return;

        const editorTextField =
          this.quotesListContainer?.dataset?.textField ||
          this.getEditorTextField();
        this.updateUserQuoteField(
          quoteId,
          field,
          target.value,
          editorTextField,
        );

        if (target.classList.contains("quote-editor-text")) {
          this.autoResizeEditorTextarea(target);
        }
      });

      this.quotesListContainer.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn || btn.dataset.action !== "delete-quote") return;

        const row = btn.closest(".quote-editor-row");
        if (!row) return;
        const quoteId = Number(row.dataset.id);
        if (!Number.isFinite(quoteId)) return;

        if (confirm("Delete this quote?")) {
          this.deleteUserQuote(quoteId);
        }
      });
    }

    // Render pagination
    this.renderPagination(totalPages);
  }

  /**
   * Render pagination controls
   */
  renderPagination(totalPages) {
    if (!this.paginationContainer) return;

    if (totalPages <= 1) {
      this.paginationContainer.innerHTML = "";
      return;
    }

    let paginationHtml = `
      <button class="pagination-btn" data-page="prev" ${
        this.currentPage === 1 ? "disabled" : ""
      }>
        ‹ Prev
      </button>
      <span class="pagination-info">Page ${
        this.currentPage
      } / ${totalPages}</span>
    `;

    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      paginationHtml += `<button class="pagination-btn" data-page="1">1</button>`;
      if (startPage > 2) {
        paginationHtml += `<span class="pagination-ellipsis">...</span>`;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationHtml += `
        <button class="pagination-btn ${
          i === this.currentPage ? "active" : ""
        }" data-page="${i}">
          ${i}
        </button>
      `;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        paginationHtml += `<span class="pagination-ellipsis">...</span>`;
      }
      paginationHtml += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    paginationHtml += `
      <button class="pagination-btn" data-page="next" ${
        this.currentPage === totalPages ? "disabled" : ""
      }>
        Next ›
      </button>
    `;

    this.paginationContainer.innerHTML = paginationHtml;

    // Bind pagination buttons
    this.paginationContainer
      .querySelectorAll(".pagination-btn")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const page = btn.dataset.page;
          if (page === "prev") {
            this.goToPage(this.currentPage - 1);
          } else if (page === "next") {
            this.goToPage(this.currentPage + 1);
          } else {
            this.goToPage(parseInt(page));
          }
        });
      });
  }

  /**
   * Export quotes as JSON
   */
  exportQuotes() {
    const normalizedQuotes = this.normalizeUserQuotes(this.userQuotes);
    if (normalizedQuotes.length !== this.userQuotes.length) {
      this.userQuotes = normalizedQuotes;
      this.storage.saveUserQuotes(this.userQuotes);
    }

    const payload = normalizedQuotes.map((quote) =>
      this.serializeUserQuote(quote),
    );
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "muslim_dashboard_quotes.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import quotes from JSON file
   */
  importQuotes(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const json = e.target.result;
          const parsed = JSON.parse(json);
          const quotes = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed?.quotes)
              ? parsed.quotes
              : Array.isArray(parsed?.items)
                ? parsed.items
                : null;

          if (!Array.isArray(quotes)) {
            reject(new Error("Invalid format: expected an array"));
            return;
          }

          const before = this.userQuotes.length;
          const incoming = this.normalizeUserQuotes(quotes);
          this.userQuotes = this.normalizeUserQuotes([
            ...this.userQuotes,
            ...incoming,
          ]);
          const addedCount = Math.max(0, this.userQuotes.length - before);

          if (!addedCount) {
            reject(new Error("JSON contains no valid quotes"));
            return;
          }

          this.storage.saveUserQuotes(this.userQuotes);
          this.renderQuotesList();
          resolve(addedCount);
        } catch (e) {
          reject(new Error("Failed to parse JSON: " + e.message));
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Quote navigation buttons
    if (this.quotePrev) {
      this.quotePrev.addEventListener("click", () => {
        this.showPreviousQuote();
      });
    }

    if (this.quoteNext) {
      this.quoteNext.addEventListener("click", () => {
        this.showNextQuote();
      });
    }

    if (
      this.quoteSection &&
      this.quoteSection.dataset.autoRotateHoverBound !== "true"
    ) {
      this.quoteSection.dataset.autoRotateHoverBound = "true";

      this.quoteSection.addEventListener("mouseenter", () => {
        this._hoverPauseAutoRotate = true;
        this.stopAutoRotate();
      });

      this.quoteSection.addEventListener("mouseleave", () => {
        this._hoverPauseAutoRotate = false;
        this.startAutoRotate();
      });
    }

    // Export button
    if (this.exportBtn) {
      this.exportBtn.addEventListener("click", () => {
        if (this.userQuotes.length === 0) {
          alert("No quotes to export");
          return;
        }
        this.exportQuotes();
      });
    }

    // Import button
    if (this.importBtn) {
      this.importBtn.addEventListener("click", () => {
        if (this.importInput) {
          this.importInput.click();
        }
      });
    }

    // Import file input
    if (this.importInput) {
      this.importInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const count = await this.importQuotes(file);
          alert(`Successfully imported ${count} quotes`);
        } catch (error) {
          alert("Import failed: " + error.message);
        }

        // Reset input
        this.importInput.value = "";
      });
    }

    if (this.addItemBtn) {
      this.addItemBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.addEmptyUserQuote(this.getSelectedEditorLanguageCode());
      });
    }

    if (this.editorLangPickerBtn) {
      this.editorLangPickerBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.openLanguageSelectorModal("editor");
      });
    }

    // React to settings changes (e.g., disabling default quotes)
    if (document && typeof document.addEventListener === "function") {
      document.addEventListener("md:settings-applied", () => {
        this.updateLanguageSelectorButton();
        this.updateEditorLanguagePickerButton();
      });
    }
  }

  // ---------- Default quotes language selection ----------

  getSelectedDefaultLanguageCode() {
    const settings = this.storage.getSettings();
    const raw = settings?.quotesDefaultLang;
    const normalized = this.normalizeLanguageCode(raw);
    return normalized || "en";
  }

  setSelectedDefaultLanguageCode(langCode) {
    const normalized = this.normalizeLanguageCode(langCode);
    if (!normalized) return;

    const settings = this.storage.getSettings();
    settings.quotesDefaultLang = normalized;
    this.storage.saveSettings(settings);
  }

  getAvailableDefaultLanguages() {
    if (!Array.isArray(this.defaultQuotes) || !this.defaultQuotes.length) {
      return [{ code: "en", name: "English" }];
    }
    const langCodes = new Set();

    this.defaultQuotes.forEach((quote) => {
      if (!quote || typeof quote !== "object" || Array.isArray(quote)) return;
      Object.keys(quote).forEach((rawKey) => {
        const key = String(rawKey || "");
        const match = key.match(/^text_(.+)$/i);
        if (!match) return;
        const code = this.normalizeLanguageCode(match[1]);
        if (code) langCodes.add(code);
      });
    });

    if (!langCodes.size) {
      // legacy fallback
      langCodes.add("en");
    }

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

  isDefaultQuotesInUse() {
    const settings = this.storage.getSettings();
    const canDefault =
      settings?.useDefaultQuotes !== false &&
      Array.isArray(this.defaultQuotes) &&
      this.defaultQuotes.length > 0;
    const canUser =
      settings?.useUserQuotes !== false &&
      Array.isArray(this.userQuotes) &&
      this.userQuotes.length > 0;

    if (canDefault) return true;

    // Matches getAvailableQuotes() fallback behavior.
    return (
      !canUser &&
      Array.isArray(this.defaultQuotes) &&
      this.defaultQuotes.length > 0
    );
  }

  getQuoteText(quote) {
    if (!quote) return "";

    if (quote._isDefault) {
      return this.getQuoteLocalizedText(
        quote,
        this.getSelectedDefaultLanguageCode(),
      );
    }

    return this.getQuoteLocalizedText(
      quote,
      this.getSelectedEditorLanguageCode(),
    );
  }

  updateEditorLanguagePickerButton() {
    const btn = this.editorLangPickerBtn;
    if (!btn) return;

    const options = this.getEditorLanguageOptions();
    const current = this.getSelectedEditorLanguageCode();
    const langInfo = options.find((l) => l.code === current) ||
      options.find((l) => l.code === "en") ||
      options[0] || { code: "en", name: "English" };

    btn.innerHTML = `<span>Editor Language: ${this.escapeHtml(
      `${langInfo.name} (${langInfo.code.toUpperCase()})`,
    )}</span><span aria-hidden="true">▾</span>`;
    btn.title = `Select editor language (${langInfo.name})`;
    btn.setAttribute(
      "aria-label",
      `Select quote editor language (${langInfo.name})`,
    );
  }

  createLanguageSelectorButton() {
    const container = this.quoteContainer;
    if (!container) return;

    if (container.querySelector(".quote-lang-selector-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "adhkar-lang-selector-btn quote-lang-selector-btn";
    const langIcon = this._getIcon("🌐", { size: 16 });
    btn.innerHTML = `<span class="lang-icon" aria-hidden="true">${langIcon}</span><span class="lang-label">Lang</span>`;
    btn.title = "Select quote language";
    btn.setAttribute("aria-label", "Select quote language");
    btn.style.display = "none";

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      this.openLanguageSelectorModal();
    });

    container.appendChild(btn);
  }

  updateLanguageSelectorButton() {
    const btn = this.quoteContainer?.querySelector(".quote-lang-selector-btn");
    if (!btn) return;

    const languages = this.getAvailableDefaultLanguages();
    const defaultsEnabled = this.isDefaultQuotesInUse();

    if (defaultsEnabled && languages.length > 1) {
      btn.style.display = "";
      btn.disabled = false;

      const current = this.getSelectedDefaultLanguageCode();
      const langInfo =
        languages.find((l) => l.code === current) || languages[0];
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

  createLanguageSelectorModal() {
    if (document.getElementById("quotesLangModal")) {
      this._langModal = document.getElementById("quotesLangModal");
      return;
    }

    const modal = document.createElement("div");
    modal.id = "quotesLangModal";
    modal.className = "pq-bookmark-modal adhkar-lang-modal";
    modal.innerHTML = `
      <div class="adhkar-lang-modal-content">
        <div class="adhkar-lang-modal-header">
          <div class="adhkar-lang-modal-title">
            <span aria-hidden="true">🌐</span>
            Select Quote Language
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

  openLanguageSelectorModal(context = "default") {
    if (!this._langModal) this.createLanguageSelectorModal();
    if (!this._langModal) return;

    this._langModalContext = context === "editor" ? "editor" : "default";

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

  renderLanguageSelectorModal(searchQuery) {
    if (!this._langModal) return;

    const context = this._langModalContext === "editor" ? "editor" : "default";
    const languages =
      context === "editor"
        ? this.getEditorLanguageOptions()
        : this.getAvailableDefaultLanguages();
    const current =
      context === "editor"
        ? this.getSelectedEditorLanguageCode()
        : this.getSelectedDefaultLanguageCode();

    const titleEl = this._langModal.querySelector(".adhkar-lang-modal-title");
    if (titleEl) {
      titleEl.innerHTML = `<span aria-hidden="true">🌐</span>${
        context === "editor"
          ? "Select Editor Language"
          : "Select Quote Language"
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
      listEl.innerHTML = `<div class="adhkar-lang-empty">No languages found.</div>`;
      return;
    }

    listEl.innerHTML = filtered
      .map((lang) => {
        const isActive = lang.code === current;
        return `
          <div class="adhkar-lang-item ${
            isActive ? "active" : ""
          }" data-lang="${this.escapeHtml(lang.code)}">
            <span class="flag" aria-hidden="true">${this.getLanguageFlag(
              lang.code,
            )}</span>
            <div class="adhkar-lang-item-info">
              <div class="adhkar-lang-item-name">${this.escapeHtml(
                lang.name,
              )}</div>
              <div class="adhkar-lang-item-code">${this.escapeHtml(
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

        const clickContext =
          this._langModalContext === "editor" ? "editor" : "default";

        if (clickContext === "editor") {
          this.setSelectedEditorLanguageCode(code);
          this.updateEditorLanguagePickerButton();
          this.renderQuotesList();
          if (this.currentQuote && !this.currentQuote._isDefault) {
            this.animateQuote(this.currentQuote);
          }
        } else {
          this.setSelectedDefaultLanguageCode(code);
          this.updateLanguageSelectorButton();

          if (this.currentQuote && this.currentQuote._isDefault) {
            this.animateQuote(this.currentQuote);
          }
        }

        this.closeLanguageSelectorModal();
      });
    }
  }
}

// Export for use
window.QuotesManager = QuotesManager;

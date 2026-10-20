/**
 * QuotesManager: layout and quote font application.
 * Part of the class declared in js/quotes/index.js; load this after it.
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
})(QuotesManager.prototype, class {

  async init() {
    await this.loadDefaultQuotes();
    this.loadUserQuotes();
    this.applyLayoutStyle();
    this.applyArabicFontFamily(this.storage.getSettings()?.quoteArabicFontFamily, {
      persist: false,
    });
    this.applyTranslationFontFamily(
      this.storage.getSettings()?.quoteTranslationFontFamily,
      { persist: false },
    );
    this.syncQuoteBehaviorFromSettings({ applyTimer: false });

    // Default quotes language selector UI (top-right of quoteSection)
    this.createLanguageSelectorButton();
    this.createQuoteControlButtons();
    this.createLanguageSelectorModal();
    this.updateLanguageSelectorButton();
    this.updateQuoteControlButtons();
    this.resetQuoteShufflePlaylist();

    this.displayRandomQuote();
    this.setupEventListeners();
    this.renderQuotesList();

    // Auto-rotate quotes using the same animation path as manual refresh
    this.startAutoRotate();
  }

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

  normalizeArabicFontFamily(value) {
    const v = String(value || "").trim();
    if (QuotesManager.ARABIC_FONT_FAMILIES.includes(v)) return v;
    return "Noto Naskh Arabic";
  }

  normalizeTranslationFontFamily(value) {
    const v = String(value || "").trim();
    if (QuotesManager.TRANSLATION_FONT_FAMILIES.includes(v)) return v;
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

    if (this.quoteContainer) {
      this.quoteContainer.style.setProperty(
        "--quote-arabic-font-family",
        `"${normalized}", var(--font-arabic)`,
      );
    }

    if (persist) {
      const settings = this.storage.getSettings();
      settings.quoteArabicFontFamily = normalized;
      this.storage.saveSettings(settings);
    }
  }

  applyTranslationFontFamily(fontFamily, opts = {}) {
    const { persist = false } = opts;
    const normalized = this.normalizeTranslationFontFamily(fontFamily);
    this._translationFontFamily = normalized;

    if (this.quoteContainer) {
      this.quoteContainer.style.setProperty(
        "--quote-translation-font-family",
        this.resolveTranslationFontCssValue(normalized),
      );
    }

    if (persist) {
      const settings = this.storage.getSettings();
      settings.quoteTranslationFontFamily = normalized;
      this.storage.saveSettings(settings);
    }
  }

  syncQuoteBehaviorFromSettings({ applyTimer = true } = {}) {
    const settings = this.storage.getSettings();
    this.quoteAutoRotatePaused = settings?.quoteAutoRotatePaused === true;
    this.quoteShuffleEnabled = settings?.quoteShuffleEnabled !== false;

    if (this.quoteShuffleEnabled) {
      this._sequentialQuoteCursor = -1;
      this.resetQuoteShufflePlaylist();
    } else {
      const quotes = this.getAvailableQuotes();
      this._sequentialQuoteCursor = quotes.indexOf(this.currentQuote);
    }

    this.updateQuoteControlButtons();

    if (!applyTimer) return;
    if (this.quoteAutoRotatePaused) {
      this.stopAutoRotate();
    } else {
      this.startAutoRotate();
    }
  }

  persistQuoteBehaviorSettings() {
    const settings = this.storage.getSettings();
    settings.quoteAutoRotatePaused = this.quoteAutoRotatePaused === true;
    settings.quoteShuffleEnabled = this.quoteShuffleEnabled !== false;
    this.storage.saveSettings(settings);
  }
});

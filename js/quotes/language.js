/**
 * QuotesManager: language codes and localized quote text.
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
});

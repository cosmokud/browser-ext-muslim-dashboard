/**
 * AdhkarManager: card language selection and labels.
 * Part of the class declared in js/adhkar/index.js; load this after it.
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
});

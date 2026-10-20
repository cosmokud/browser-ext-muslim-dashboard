/**
 * HadithManager: card language selection and labels.
 * Part of the class declared in js/hadith/index.js; load this after it.
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
});

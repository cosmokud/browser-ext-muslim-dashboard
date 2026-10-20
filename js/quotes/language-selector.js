/**
 * QuotesManager: default language picker modal.
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
    const actionsGroup = this.getQuoteTopActionsContainer();
    if (!actionsGroup) return;

    let btn = this.quoteContainer?.querySelector(".quote-lang-selector-btn");

    if (!btn) {
      btn = document.createElement("button");
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
    }

    if (btn.parentElement !== actionsGroup) {
      actionsGroup.appendChild(btn);
    }
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
});

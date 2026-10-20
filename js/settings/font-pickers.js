/**
 * SettingsManager: content font picker modal and labels.
 * Part of the class declared in js/settings/index.js; load this after it.
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
})(SettingsManager.prototype, class {

  updatePocketQuranReciterPickerLabel() {
    const btn = this.pocketQuranReciterPickerBtn;
    const labelEl = this.pocketQuranReciterPickerLabel;
    if (!btn || !labelEl) return;

    const pq = this.storage.getSettings()?.pocketQuran || {};
    const parsedId = parseInt(pq.reciterId, 10);
    const reciterId = Number.isFinite(parsedId) ? parsedId : 7;

    const cachedReciters = this.storage.get("pocketQuran_reciters_cache", []);
    let label = "";

    if (Array.isArray(cachedReciters)) {
      const reciter = cachedReciters.find((r) => r?.id === reciterId);
      if (reciter) {
        const name = String(reciter.name || "").trim();
        const style = String(reciter.style || "").trim();
        label = style ? `${name} (${style})` : name;
      }
    }

    if (!label) {
      const fallbackNames = {
        1: "Abdul Basit Abdul Samad (Murattal)",
        2: "Abdul Basit Abdul Samad (Mujawwad)",
        3: "Abdur-Rahman as-Sudais",
        4: "Abu Bakr al-Shatri",
        5: "Hani ar-Rifai",
        6: "Mahmoud Khalil Al-Husary",
        7: "Mishary Rashid Alafasy",
      };
      label = fallbackNames[reciterId] || `Reciter #${reciterId}`;
    }

    labelEl.textContent = label;
    btn.title = `Current reciter: ${label}`;
  }

  updatePocketQuranArabicFontPickerLabel() {
    const btn = this.pocketQuranArabicFontPickerBtn;
    const labelEl = this.pocketQuranArabicFontPickerLabel;
    if (!btn || !labelEl) return;

    const pq = this.storage.getSettings()?.pocketQuran || {};
    const font = this.normalizePocketQuranArabicFontFamily(pq.arabicFontFamily);

    labelEl.textContent = font;
    btn.title = `Current Arabic font: ${font}`;
  }

  updatePocketQuranPopupArabicFontPickerLabel() {
    const btn = this.pocketQuranPopupArabicFontPickerBtn;
    const labelEl = this.pocketQuranPopupArabicFontPickerLabel;
    if (!btn || !labelEl) return;

    const settings = this.storage.getSettings() || {};
    const pq = settings.pocketQuran || {};
    const pqPopup = settings.pocketQuranPopup || {};

    const font = this.normalizePocketQuranArabicFontFamily(
      this.pocketQuranPopupArabicFontFamily?.value ||
        pqPopup.arabicFontFamily ||
        pq.arabicFontFamily,
    );

    if (this.pocketQuranPopupArabicFontFamily) {
      this.pocketQuranPopupArabicFontFamily.value = font;
    }

    labelEl.textContent = font;
    btn.title = `Current popup Arabic font: ${font}`;
  }

  getContentFontPickerConfigs() {
    return [
      {
        card: "quotes",
        kind: "arabic",
        btnId: "quotesArabicFontPickerBtn",
        labelId: "quotesArabicFontPickerLabel",
        title: "Quotes Arabic Font",
        manager: this.quotes,
      },
      {
        card: "quotes",
        kind: "translation",
        btnId: "quotesTranslationFontPickerBtn",
        labelId: "quotesTranslationFontPickerLabel",
        title: "Quotes Translation Font",
        manager: this.quotes,
      },
      {
        card: "flashcards",
        kind: "arabic",
        btnId: "flashcardsArabicFontPickerBtn",
        labelId: "flashcardsArabicFontPickerLabel",
        title: "Flashcards Arabic Font",
        manager: this.flashcards,
      },
      {
        card: "flashcards",
        kind: "translation",
        btnId: "flashcardsTranslationFontPickerBtn",
        labelId: "flashcardsTranslationFontPickerLabel",
        title: "Flashcards Translation Font",
        manager: this.flashcards,
      },
      {
        card: "hadith",
        kind: "arabic",
        btnId: "hadithArabicFontPickerBtn",
        labelId: "hadithArabicFontPickerLabel",
        title: "Hadith Arabic Font",
        manager: this.hadith,
      },
      {
        card: "hadith",
        kind: "translation",
        btnId: "hadithTranslationFontPickerBtn",
        labelId: "hadithTranslationFontPickerLabel",
        title: "Hadith Translation Font",
        manager: this.hadith,
      },
      {
        card: "adhkar",
        kind: "arabic",
        btnId: "adhkarArabicFontPickerBtn",
        labelId: "adhkarArabicFontPickerLabel",
        title: "Adhkar Arabic Font",
        manager: this.adhkar,
      },
      {
        card: "adhkar",
        kind: "translation",
        btnId: "adhkarTranslationFontPickerBtn",
        labelId: "adhkarTranslationFontPickerLabel",
        title: "Adhkar Translation Font",
        manager: this.adhkar,
      },
    ];
  }

  getContentFontFamilies(kind) {
    if (kind === "translation") {
      return [
        "Poppins",
        "Noto Naskh Arabic",
        "Amiri",
        "Georgia",
        "Cascadia Code",
        "Courier New",
      ];
    }

    return [
      "Noto Naskh Arabic",
      "Amiri",
      "KFGQPC Uthman Taha Naskh",
      "KFGQPC KSA Regular",
      "KFGQPC Kufi Stylistic Regular",
      "KFGQPC AN Regular",
      "KFGQPC AlJalil Dot",
      "KFGQPC Sindhi Naskh Regular",
    ];
  }

  getContentFontPreviewText(kind) {
    return kind === "translation"
      ? "The quick brown fox jumps over the lazy dog"
      : "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
  }

  resolveContentTranslationFontCssValue(fontFamily) {
    if (fontFamily === "Georgia") return '"Georgia", serif';
    if (fontFamily === "Courier New") return '"Courier New", monospace';
    if (fontFamily === "Cascadia Code") {
      return '"Cascadia Code", "JetBrains Mono", Consolas, monospace';
    }
    return `"${fontFamily}", var(--font-primary)`;
  }

  getContentFontConfig(card, kind) {
    return this.getContentFontPickerConfigs().find(
      (cfg) => cfg.card === card && cfg.kind === kind,
    );
  }

  getCurrentContentFont(cfg) {
    const manager = cfg?.manager;
    const normalizer =
      cfg?.kind === "translation"
        ? manager?.normalizeTranslationFontFamily
        : manager?.normalizeArabicFontFamily;
    const current =
      cfg?.kind === "translation"
        ? manager?._translationFontFamily
        : manager?._arabicFontFamily;
    const fallback =
      cfg?.kind === "translation" ? "Poppins" : "Noto Naskh Arabic";
    return typeof normalizer === "function"
      ? normalizer.call(manager, current)
      : fallback;
  }

  bindContentFontPickerButtons() {
    this.getContentFontPickerConfigs().forEach((cfg) => {
      const btn = document.getElementById(cfg.btnId);
      if (!btn || btn.dataset.bound === "true") return;
      btn.dataset.bound = "true";
      btn.addEventListener("click", () => this.openContentFontPickerModal(cfg));
    });
  }

  applyStoredContentFontSettings() {
    const settings = this.storage.getSettings() || {};
    const values = {
      quotes: {
        arabic: settings.quoteArabicFontFamily,
        translation: settings.quoteTranslationFontFamily,
      },
      flashcards: {
        arabic: settings.flashcards?.arabicFontFamily,
        translation: settings.flashcards?.translationFontFamily,
      },
      hadith: {
        arabic: settings.hadith?.arabicFontFamily,
        translation: settings.hadith?.translationFontFamily,
      },
      adhkar: {
        arabic: settings.adhkar?.arabicFontFamily,
        translation: settings.adhkar?.translationFontFamily,
      },
    };

    this.getContentFontPickerConfigs().forEach((cfg) => {
      const method =
        cfg.kind === "translation"
          ? "applyTranslationFontFamily"
          : "applyArabicFontFamily";
      const font = values[cfg.card]?.[cfg.kind];
      if (cfg.manager && typeof cfg.manager[method] === "function") {
        cfg.manager[method](font, { persist: false });
      }
    });
  }

  updateContentFontPickerLabels() {
    this.getContentFontPickerConfigs().forEach((cfg) => {
      const btn = document.getElementById(cfg.btnId);
      const label = document.getElementById(cfg.labelId);
      if (!btn || !label) return;
      const font = this.getCurrentContentFont(cfg);
      label.textContent = font;
      btn.title = `Current ${cfg.title.replace(/^/, "").toLowerCase()}: ${font}`;
    });
  }

  ensureContentFontPickerModal() {
    let modal = document.getElementById("settingsContentFontModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "settingsContentFontModal";
    modal.className = "pq-bookmark-modal";
    modal.innerHTML = `
      <div class="pq-bookmark-modal-content pq-translation-modal-content">
        <div class="pq-bookmark-modal-header">
          <h3 class="pq-bookmark-modal-title">Font</h3>
          <button type="button" class="pq-bookmark-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="pq-bookmark-modal-body">
          <div class="pq-bookmark-search">
            <input type="text" class="pq-bookmark-search-input settings-content-font-search" placeholder="Search fonts..." />
          </div>
          <div class="pq-translation-list">
            <div class="pq-translation-items settings-content-font-items"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal
      .querySelector(".pq-bookmark-modal-close")
      ?.addEventListener("click", () => this.closeContentFontPickerModal());
    this._bindOverlayCloseBehavior(modal, () =>
      this.closeContentFontPickerModal(),
    );
    modal
      .querySelector(".settings-content-font-search")
      ?.addEventListener("input", (event) => {
        this.renderContentFontList(event.target?.value || "");
      });
    return modal;
  }

  openContentFontPickerModal(cfg) {
    const modal = this.ensureContentFontPickerModal();
    modal.dataset.card = cfg.card;
    modal.dataset.kind = cfg.kind;
    const title = modal.querySelector(".pq-bookmark-modal-title");
    if (title) title.textContent = cfg.title;
    const search = modal.querySelector(".settings-content-font-search");
    if (search) search.value = "";
    this.renderContentFontList("");
    modal.classList.add("active");
    setTimeout(() => {
      try {
        search?.focus();
      } catch (e) {}
    }, 100);
  }

  closeContentFontPickerModal() {
    document
      .getElementById("settingsContentFontModal")
      ?.classList.remove("active");
  }

  renderContentFontList(query = "") {
    const modal = document.getElementById("settingsContentFontModal");
    const container = modal?.querySelector(".settings-content-font-items");
    if (!modal || !container) return;

    const cfg = this.getContentFontConfig(
      modal.dataset.card,
      modal.dataset.kind,
    );
    if (!cfg) return;

    const q = String(query || "")
      .trim()
      .toLowerCase();
    const fonts = this.getContentFontFamilies(cfg.kind).filter((font) =>
      font.toLowerCase().includes(q),
    );
    const current = this.getCurrentContentFont(cfg);
    const previewText = this.getContentFontPreviewText(cfg.kind);
    const isTranslation = cfg.kind === "translation";

    if (!fonts.length) {
      container.innerHTML = `<div class="pq-translation-empty">No fonts found for "${this.escapeHtml(
        query,
      )}"</div>`;
      return;
    }

    container.innerHTML = fonts
      .map((font) => {
        const active = font === current;
        const previewClass = isTranslation
          ? "pq-font-preview pq-font-preview-translation"
          : "pq-font-preview";
        const langAttrs = isTranslation ? 'lang="en"' : 'lang="ar" dir="rtl"';
        return `<button type="button" class="pq-translation-item ${
          active ? "active" : ""
        }" data-font-family="${this.escapeHtml(font)}">
          <span class="pq-font-label">
            <span class="pq-translation-name">${this.escapeHtml(font)}</span>
            <span class="${previewClass}" ${langAttrs}>${previewText}</span>
          </span>
          ${
            active
              ? `<span class="pq-translation-check">${this._getIcon("✓", {
                  size: 14,
                })}</span>`
              : ""
          }
        </button>`;
      })
      .join("");

    container.querySelectorAll(".pq-font-preview").forEach((preview) => {
      const font = preview
        .closest(".pq-translation-item")
        ?.getAttribute("data-font-family");
      if (!font) return;
      preview.style.fontFamily = isTranslation
        ? this.resolveContentTranslationFontCssValue(font)
        : `"${font}", var(--font-arabic)`;
    });

    container.querySelectorAll(".pq-translation-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const font = btn.getAttribute("data-font-family");
        const method =
          cfg.kind === "translation"
            ? "applyTranslationFontFamily"
            : "applyArabicFontFamily";
        if (cfg.manager && typeof cfg.manager[method] === "function") {
          cfg.manager[method](font, { persist: true });
        }
        this.updateContentFontPickerLabels();
        this.closeContentFontPickerModal();
      });
    });
  }

  updatePocketQuranTranslationFontPickerLabel() {
    const btn = this.pocketQuranTranslationFontPickerBtn;
    const labelEl = this.pocketQuranTranslationFontPickerLabel;
    if (!btn || !labelEl) return;

    const pq = this.storage.getSettings()?.pocketQuran || {};
    const font = this.normalizePocketQuranTranslationFontFamily(
      this.pocketQuranTranslationFontFamily?.value ||
        pq.translationFontFamily ||
        "Poppins",
    );

    if (this.pocketQuranTranslationFontFamily) {
      this.pocketQuranTranslationFontFamily.value = font;
    }

    labelEl.textContent = font;
    btn.title = `Current translation font: ${font}`;
  }

  updatePocketQuranPopupTranslationFontPickerLabel() {
    const btn = this.pocketQuranPopupTranslationFontPickerBtn;
    const labelEl = this.pocketQuranPopupTranslationFontPickerLabel;
    if (!btn || !labelEl) return;

    const settings = this.storage.getSettings() || {};
    const pq = settings.pocketQuran || {};
    const pqPopup = settings.pocketQuranPopup || {};
    const font = this.normalizePocketQuranPopupTranslationFontFamily(
      this.pocketQuranPopupTranslationFontFamily?.value ||
        pqPopup.translationFontFamily ||
        pq.translationFontFamily ||
        "Poppins",
    );

    if (this.pocketQuranPopupTranslationFontFamily) {
      this.pocketQuranPopupTranslationFontFamily.value = font;
    }

    labelEl.textContent = font;
    btn.title = `Current popup translation font: ${font}`;
  }

  updatePocketQuranTranslationPickerLabel() {
    const btn = this.pocketQuranTranslationPickerBtn;
    const labelEl = this.pocketQuranTranslationPickerLabel;
    const select = this.pocketQuranTranslationSelect;
    if (!btn || !labelEl || !select) return;

    const opt = select.selectedOptions?.[0] || null;
    const optText = String(opt?.textContent || "").trim();
    const lang = String(opt?.closest?.("optgroup")?.label || "").trim();

    labelEl.textContent =
      lang && optText ? `${lang} · ${optText}` : "Select translation…";
  }
});

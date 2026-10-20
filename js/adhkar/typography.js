/**
 * AdhkarManager: card fonts, scale and font picker.
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

  applyTypography() {
    if (!this.cardEl) return;
    const t = this.getTypography();
    const scale = this.getFontScale();
    const titleBase = t.romanization * 1.1;
    const titleSize = this.scaleTypographyValue(titleBase, scale);
    const arabic = this.scaleTypographyValue(t.arabic, scale);
    const romanization = this.scaleTypographyValue(t.romanization, scale);
    const english = this.scaleTypographyValue(t.english, scale);
    this.cardEl.style.setProperty("--adhkar-title-font-size", `${titleSize}px`);
    this.cardEl.style.setProperty("--adhkar-arabic-font-size", `${arabic}px`);
    this.cardEl.style.setProperty(
      "--adhkar-romanization-font-size",
      `${romanization}px`,
    );
    this.cardEl.style.setProperty("--adhkar-english-font-size", `${english}px`);
    this.updateFontScaleButtons();
  }

  getTypography() {
    const settings = this.getAdhkarSettings();
    return {
      arabic: this.clampNumber(
        parseInt(settings.arabicFontSize, 10),
        12,
        144,
        40,
      ),
      romanization: this.clampNumber(
        parseInt(settings.romanizationFontSize, 10),
        12,
        144,
        18,
      ),
      english: this.clampNumber(
        parseInt(settings.englishFontSize, 10),
        12,
        144,
        18,
      ),
    };
  }

  getFontScale() {
    const settings = this.getAdhkarSettings();
    const raw = settings.fontScale;
    const parsed = parseFloat(raw);
    const scale = Number.isFinite(parsed) ? parsed : 1;
    return this.clampNumber(
      scale,
      AdhkarManager.FONT_SCALE_MIN,
      AdhkarManager.FONT_SCALE_MAX,
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
      AdhkarManager.FONT_SCALE_MIN,
      AdhkarManager.FONT_SCALE_MAX,
      1,
    );
    this.setAdhkarSettings({ fontScale: normalized });
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
        scale <= AdhkarManager.FONT_SCALE_MIN + 0.001;
      this.fontScaleDecreaseBtn.title = `Decrease font size (${label})`;
      this.fontScaleDecreaseBtn.setAttribute(
        "aria-label",
        `Decrease adhkar font size (${label})`,
      );
    }

    if (this.fontScaleIncreaseBtn) {
      this.fontScaleIncreaseBtn.disabled =
        scale >= AdhkarManager.FONT_SCALE_MAX - 0.001;
      this.fontScaleIncreaseBtn.title = `Increase font size (${label})`;
      this.fontScaleIncreaseBtn.setAttribute(
        "aria-label",
        `Increase adhkar font size (${label})`,
      );
    }
  }

  updateTypographyLabels(arabic, romanization, english) {
    if (this.settingsArabicFontSizeValue)
      this.settingsArabicFontSizeValue.textContent = `${arabic}px`;
    if (this.settingsRomanizationFontSizeValue)
      this.settingsRomanizationFontSizeValue.textContent = `${romanization}px`;
    if (this.settingsEnglishFontSizeValue)
      this.settingsEnglishFontSizeValue.textContent = `${english}px`;
  }

  normalizeArabicFontFamily(value) {
    const v = String(value || "").trim();
    if (AdhkarManager.ARABIC_FONT_FAMILIES.includes(v)) return v;
    return "KFGQPC Uthman Taha Naskh";
  }

  normalizeTranslationFontFamily(value) {
    const v = String(value || "").trim();
    if (AdhkarManager.TRANSLATION_FONT_FAMILIES.includes(v)) return v;
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
      const cssValue = `"${normalized}", var(--font-arabic)`;
      this.cardEl.style.setProperty("--adhkar-arabic-font-family", cssValue);
    }

    if (this.fontFamilyBtn) {
      const title = `Change Arabic font (current: ${normalized})`;
      this.fontFamilyBtn.title = title;
      this.fontFamilyBtn.setAttribute("aria-label", title);
    }

    if (persist) {
      this.setAdhkarSettings({ arabicFontFamily: normalized });
    }
  }

  applyTranslationFontFamily(fontFamily, opts = {}) {
    const { persist = false } = opts;
    const normalized = this.normalizeTranslationFontFamily(fontFamily);
    this._translationFontFamily = normalized;

    if (this.cardEl) {
      this.cardEl.style.setProperty(
        "--adhkar-translation-font-family",
        this.resolveTranslationFontCssValue(normalized),
      );
    }

    if (persist) {
      this.setAdhkarSettings({ translationFontFamily: normalized });
    }
  }

  createFontPickerModal() {
    if (document.getElementById("adhkarFontModal")) return;

    const modal = document.createElement("div");
    modal.id = "adhkarFontModal";
    modal.className = "pq-bookmark-modal";
    modal.innerHTML = `
      <div class="pq-bookmark-modal-content pq-translation-modal-content">
        <div class="pq-bookmark-modal-header">
          <h3 class="pq-bookmark-modal-title">Arabic Font</h3>
          <button type="button" class="pq-bookmark-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="pq-bookmark-modal-body">
          <div class="pq-bookmark-search">
            <input type="text" class="pq-bookmark-search-input adhkar-font-search" placeholder="Search fonts..." />
          </div>
          <div class="pq-translation-list">
            <div class="pq-translation-items adhkar-font-items"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this._fontModal = modal;

    modal
      .querySelector(".pq-bookmark-modal-close")
      .addEventListener("click", () => this.closeFontPickerModal());

    this._bindOverlayCloseBehavior(modal, () => this.closeFontPickerModal());

    const searchInput = modal.querySelector(".adhkar-font-search");
    searchInput.addEventListener("input", () => {
      this.renderFontList(searchInput.value);
    });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closeFontPickerModal();
    });
  }

  openFontPickerModal() {
    const modal = document.getElementById("adhkarFontModal");
    if (!modal) return;

    const searchInput = modal.querySelector(".adhkar-font-search");
    if (searchInput) searchInput.value = "";

    this.renderFontList("");
    modal.classList.add("active");

    setTimeout(() => {
      try {
        searchInput?.focus();
      } catch (e) {}
    }, 100);
  }

  closeFontPickerModal() {
    const modal = document.getElementById("adhkarFontModal");
    if (modal) modal.classList.remove("active");
  }

  renderFontList(query = "") {
    const modal = document.getElementById("adhkarFontModal");
    if (!modal) return;

    const container = modal.querySelector(".adhkar-font-items");
    if (!container) return;

    const q = String(query || "")
      .toLowerCase()
      .trim();
    const fonts = AdhkarManager.ARABIC_FONT_FAMILIES.filter((f) =>
      f.toLowerCase().includes(q),
    );

    const current = this.normalizeArabicFontFamily(this._arabicFontFamily);
    const arabicPreview = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
    let html = "";
    for (const font of fonts) {
      const isActive = font === current;
      html += `<button type="button" class="pq-translation-item ${
        isActive ? "active" : ""
      }" data-font-family="${this.escapeHtmlAttr(font)}">
        <span class="pq-font-label">
          <span class="pq-translation-name">${this.escapeHtmlAttr(font)}</span>
          <span class="pq-font-preview" lang="ar" dir="rtl">${arabicPreview}</span>
        </span>
        ${
          isActive
            ? `<span class="pq-translation-check">${this._getIcon("✓", {
                size: 14,
              })}</span>`
            : ""
        }
      </button>`;
    }

    if (!html) {
      html = `<div class="pq-translation-empty">No fonts found for "${this.escapeHtmlAttr(
        query,
      )}"</div>`;
      container.innerHTML = html;
      return;
    }

    container.innerHTML = html;
    container.querySelectorAll(".pq-font-preview").forEach((preview) => {
      const font = preview
        .closest(".pq-translation-item")
        ?.getAttribute("data-font-family");
      if (font) preview.style.fontFamily = `"${font}", var(--font-arabic)`;
    });
    container.querySelectorAll(".pq-translation-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const font = btn.getAttribute("data-font-family");
        this.applyArabicFontFamily(font, { persist: true });
        this.closeFontPickerModal();
      });
    });
  }
});

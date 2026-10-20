/**
 * SettingsManager, part 9 of 9.
 * Moved out of js/settings.js at method boundaries, so no single file carries the
 * whole class. The class itself is declared in js/settings.js; load this after it.
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

/**
 * PocketQuranManager: font picker modal.
 * Part of the class declared in js/pocketquran/index.js; load this after it.
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
})(PocketQuranManager.prototype, class {

  createFontPickerModal() {
    if (document.getElementById("pqFontModal")) return;

    const modal = document.createElement("div");
    modal.id = "pqFontModal";
    modal.className = "pq-bookmark-modal";
    modal.innerHTML = `
      <div class="pq-bookmark-modal-content pq-translation-modal-content">
        <div class="pq-bookmark-modal-header">
          <h3 class="pq-bookmark-modal-title">Arabic Font</h3>
          <button type="button" class="pq-bookmark-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="pq-bookmark-modal-body">
          <div class="pq-bookmark-search">
            <input type="text" class="pq-bookmark-search-input pq-font-search" placeholder="Search fonts..." />
          </div>
          <div class="pq-translation-list">
            <div class="pq-translation-items pq-font-items"></div>
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

    const searchInput = modal.querySelector(".pq-font-search");
    searchInput.addEventListener("input", () => {
      this.renderFontList(searchInput.value);
    });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closeFontPickerModal();
    });
  }

  openFontPickerModal(opts = {}) {
    const modal = document.getElementById("pqFontModal");
    if (!modal) return;

    const target = opts?.target === "popup" ? "popup" : "card";
    const requestedCurrentFont =
      target === "popup" ? opts?.currentFont : this._arabicFontFamily;

    this._fontPickerTarget = target;
    this._fontPickerKind = "arabic";
    this._fontPickerCurrentFont =
      this.normalizeArabicFontFamily(requestedCurrentFont);

    const title = modal.querySelector(".pq-bookmark-modal-title");
    if (title) title.textContent = "Arabic Font";

    const searchInput = modal.querySelector(".pq-font-search");
    if (searchInput) searchInput.value = "";

    this.renderFontList("");
    modal.classList.add("active");

    setTimeout(() => {
      try {
        searchInput?.focus();
      } catch (e) {}
    }, 100);
  }

  openTranslationFontPickerModal(opts = {}) {
    const modal = document.getElementById("pqFontModal");
    if (!modal) return;

    const target = opts?.target === "popup" ? "popup" : "card";
    const requestedCurrentFont =
      target === "popup" ? opts?.currentFont : this._translationFontFamily;

    this._fontPickerTarget = target;
    this._fontPickerKind = "translation";
    this._fontPickerCurrentFont =
      this.normalizeTranslationFontFamily(requestedCurrentFont);

    const title = modal.querySelector(".pq-bookmark-modal-title");
    if (title) title.textContent = "Translation Font";

    const searchInput = modal.querySelector(".pq-font-search");
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
    const modal = document.getElementById("pqFontModal");
    if (modal) modal.classList.remove("active");
    this._fontPickerTarget = "card";
    this._fontPickerKind = "arabic";
    this._fontPickerCurrentFont = null;
  }

  renderFontList(query = "") {
    const modal = document.getElementById("pqFontModal");
    if (!modal) return;

    const container = modal.querySelector(".pq-font-items");
    if (!container) return;

    const q = String(query || "")
      .toLowerCase()
      .trim();
    const isTranslationPicker = this._fontPickerKind === "translation";
    const availableFonts = isTranslationPicker
      ? PocketQuranManager.TRANSLATION_FONT_FAMILIES
      : PocketQuranManager.ARABIC_FONT_FAMILIES;
    const fonts = availableFonts.filter((f) => f.toLowerCase().includes(q));

    const current = isTranslationPicker
      ? this.normalizeTranslationFontFamily(
          this._fontPickerTarget === "popup"
            ? this._fontPickerCurrentFont || this._translationFontFamily
            : this._translationFontFamily,
        )
      : this.normalizeArabicFontFamily(
          this._fontPickerTarget === "popup"
            ? this._fontPickerCurrentFont || this._arabicFontFamily
            : this._arabicFontFamily,
        );
    const previewText = isTranslationPicker
      ? "The quick brown fox jumps over the lazy dog"
      : "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
    const previewClass = isTranslationPicker
      ? "pq-font-preview pq-font-preview-translation"
      : "pq-font-preview";
    let html = "";
    for (const f of fonts) {
      const isActive = f === current;
      html += `<button type="button" class="pq-translation-item ${
        isActive ? "active" : ""
      }" data-font-family="${this.escapeHtml(f)}">
        <span class="pq-font-label">
          <span class="pq-translation-name">${this.escapeHtml(f)}</span>
          <span class="${previewClass}" ${
            isTranslationPicker ? 'lang="en"' : 'lang="ar" dir="rtl"'
          }>${previewText}</span>
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
      html = `<div class="pq-translation-empty">No fonts found for "${this.escapeHtml(
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
      if (!font) return;
      preview.style.fontFamily = isTranslationPicker
        ? this.resolveTranslationFontCssValue(font)
        : `"${font}", var(--font-arabic)`;
    });
    container.querySelectorAll(".pq-translation-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const font = btn.getAttribute("data-font-family");

        if (isTranslationPicker && this._fontPickerTarget === "popup") {
          const normalized = this.normalizeTranslationFontFamily(font);
          this._fontPickerCurrentFont = normalized;
          try {
            document.dispatchEvent(
              new CustomEvent("md:pq-popup-translation-font-selected", {
                detail: { fontFamily: normalized },
              }),
            );
          } catch (e) {}
          this.closeFontPickerModal();
          return;
        }

        if (isTranslationPicker) {
          this.applyTranslationFontFamily(font, {
            persist: false,
            recalculate: true,
          });
          this.closeFontPickerModal();
          return;
        }

        if (this._fontPickerTarget === "popup") {
          const normalized = this.normalizeArabicFontFamily(font);
          this._fontPickerCurrentFont = normalized;
          try {
            document.dispatchEvent(
              new CustomEvent("md:pq-popup-arabic-font-selected", {
                detail: { fontFamily: normalized },
              }),
            );
          } catch (e) {}
          this.closeFontPickerModal();
          return;
        }

        this.applyArabicFontFamily(font, { persist: true, recalculate: true });
        this.closeFontPickerModal();
      });
    });
  }
});

/**
 * PocketQuranManager: translation picker modal.
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

  createTranslationModal() {
    if (document.getElementById("pqTranslationModal")) return;

    const modal = document.createElement("div");
    modal.id = "pqTranslationModal";
    modal.className = "pq-bookmark-modal";
    modal.innerHTML = `
      <div class="pq-bookmark-modal-content pq-translation-modal-content">
        <div class="pq-bookmark-modal-header">
          <h3 class="pq-bookmark-modal-title">🌐 Select Translation</h3>
          <button type="button" class="pq-bookmark-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="pq-bookmark-modal-body">
          <div class="pq-bookmark-search">
            <input type="text" class="pq-bookmark-search-input pq-translation-search" placeholder="Search by language or translator..." />
          </div>
          <div class="pq-translation-list"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this._translationModal = modal;

    // Close button
    modal
      .querySelector(".pq-bookmark-modal-close")
      .addEventListener("click", () => {
        this.closeTranslationModal();
      });

    // Click outside to close
    this._bindOverlayCloseBehavior(modal, () => this.closeTranslationModal());

    // Search input
    const searchInput = modal.querySelector(".pq-translation-search");
    searchInput.addEventListener("input", () => {
      this.renderTranslationList(searchInput.value);
    });

    // Keyboard navigation
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeTranslationModal();
      }
    });

    // Make header meta clickable
    if (this.headerMeta) {
      this.headerMeta.style.cursor = "pointer";
      this.headerMeta.title = "Click to change translation";
      this.headerMeta.addEventListener("click", () => {
        this.openTranslationModal();
      });
    }
  }

  openTranslationModal() {
    const modal = document.getElementById("pqTranslationModal");
    if (!modal) return;

    const searchInput = modal.querySelector(".pq-translation-search");
    if (searchInput) searchInput.value = "";

    this.renderTranslationList("");
    modal.classList.add("active");

    // Focus search input
    setTimeout(() => {
      if (searchInput) searchInput.focus();
    }, 100);
  }

  closeTranslationModal() {
    const modal = document.getElementById("pqTranslationModal");
    if (modal) modal.classList.remove("active");
  }

  renderTranslationList(query = "") {
    const modal = document.getElementById("pqTranslationModal");
    if (!modal) return;

    const container = modal.querySelector(".pq-translation-list");
    if (!container) return;

    const q = String(query || "")
      .toLowerCase()
      .trim();

    // Group translations by language
    const byLanguage = {};
    for (const [id, info] of Object.entries(PocketQuranManager.TRANSLATIONS)) {
      const lang = info.language || "Other";
      if (!byLanguage[lang]) byLanguage[lang] = [];
      byLanguage[lang].push({ id: parseInt(id, 10), ...info });
    }

    // Sort languages alphabetically
    const sortedLanguages = Object.keys(byLanguage).sort((a, b) =>
      a.localeCompare(b),
    );

    // Filter languages and translations by query
    const filteredLanguages = [];
    for (const lang of sortedLanguages) {
      const langMatches = lang.toLowerCase().includes(q);
      const translations = byLanguage[lang].filter(
        (t) => langMatches || t.label.toLowerCase().includes(q),
      );
      if (translations.length > 0) {
        filteredLanguages.push({ language: lang, translations });
      }
    }

    // Build HTML
    let html = "";
    for (const group of filteredLanguages) {
      html += `<div class="pq-translation-group">
        <div class="pq-translation-lang-header">${this.escapeHtml(
          group.language,
        )}</div>
        <div class="pq-translation-items">`;

      for (const t of group.translations) {
        const isActive = t.id === this._activeTranslationId;
        html += `<button type="button" class="pq-translation-item ${
          isActive ? "active" : ""
        }" data-translation-id="${t.id}">
          <span class="pq-translation-name">${this.escapeHtml(t.label)}</span>
          ${
            isActive
              ? `<span class="pq-translation-check">${this._getIcon("✓", {
                  size: 14,
                })}</span>`
              : ""
          }
        </button>`;
      }

      html += `</div></div>`;
    }

    if (!html) {
      html = `<div class="pq-translation-empty">No translations found for "${this.escapeHtml(
        query,
      )}"</div>`;
    }

    container.innerHTML = html;

    // Add click handlers
    container.querySelectorAll(".pq-translation-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.translationId, 10);
        if (Number.isFinite(id)) {
          this.selectTranslation(id);
        }
      });
    });

    // Scroll active translation into view
    const activeItem = container.querySelector(".pq-translation-item.active");
    if (activeItem && !q) {
      setTimeout(() => {
        activeItem.scrollIntoView({ block: "center", behavior: "auto" });
      }, 50);
    }
  }

  selectTranslation(translationId) {
    const id = this.normalizeTranslationId(translationId);

    // Close modal
    this.closeTranslationModal();

    // Notify listeners (e.g. Settings UI) that translation changed
    try {
      document.dispatchEvent(
        new CustomEvent("md:pq-translation-selected", {
          detail: { translationId: id },
        }),
      );
    } catch (e) {}

    // Persist and reload
    this.persistPocketQuranSettings({ translationResourceId: id });
    this.reloadTranslation(id);
  }
});

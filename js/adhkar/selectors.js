/**
 * AdhkarManager: set and language picker modals.
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

  createSetSelectorButton() {
    const headerActions = this.cardEl?.querySelector(".card-header-actions");
    if (!headerActions) return;

    // Ensure the script toggle button appears first (left-most)
    const scriptBtn =
      this.scriptToggleBtn ||
      headerActions.querySelector("#adhkarScriptToggleBtn");
    if (scriptBtn && headerActions.contains(scriptBtn)) {
      headerActions.insertBefore(scriptBtn, headerActions.firstChild);
    }

    // If selector button already exists, nothing more to do
    if (headerActions.querySelector(".adhkar-set-selector-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "adhkar-set-selector-btn";
    btn.innerHTML = this._getIcon("📚", { size: 18 });
    this._setModalBtn = btn;
    btn.title = "Select adhkar set";
    btn.setAttribute("aria-label", "Select adhkar set");

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      this.openSetSelectorModal();
    });

    // Insert after the script toggle if present, otherwise insert at the start
    if (scriptBtn && headerActions.contains(scriptBtn)) {
      headerActions.insertBefore(btn, scriptBtn.nextSibling);
    } else {
      headerActions.insertBefore(btn, headerActions.firstChild);
    }
  }

  createLanguageSelectorButton() {
    const headerActions = this.cardEl?.querySelector(".card-header-actions");
    if (!headerActions) return;

    // If language selector button already exists, skip
    if (headerActions.querySelector(".adhkar-lang-selector-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "adhkar-lang-selector-btn";
    const langIcon = this._getIcon("🌐", { size: 16 });
    btn.innerHTML = `<span class="lang-icon" aria-hidden="true">${langIcon}</span><span class="lang-label">Lang</span>`;
    btn.title = "Select translation language";
    btn.setAttribute("aria-label", "Select translation language");
    btn.style.display = "none"; // Hidden by default

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      this.openLanguageSelectorModal();
    });

    // Insert at the very start (left of script toggle)
    const scriptBtn = headerActions.querySelector("#adhkarScriptToggleBtn");
    if (scriptBtn) {
      headerActions.insertBefore(btn, scriptBtn);
    } else {
      headerActions.insertBefore(btn, headerActions.firstChild);
    }
  }

  createLanguageSelectorModal() {
    if (document.getElementById("adhkarLangModal")) return;

    const modal = document.createElement("div");
    modal.id = "adhkarLangModal";
    modal.className = "pq-bookmark-modal adhkar-lang-modal";
    modal.innerHTML = `
      <div class="adhkar-lang-modal-content">
        <div class="adhkar-lang-modal-header">
          <div class="adhkar-lang-modal-title">
            <span aria-hidden="true">🌐</span>
            Select Language
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

  openLanguageSelectorModal(context = "dashboard") {
    if (!this._langModal) this.createLanguageSelectorModal();
    if (!this._langModal) return;

    this._langModalContext =
      context === "settingsEditor" ? "settingsEditor" : "dashboard";

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

  renderLanguageSelectorModal(searchQuery = "") {
    if (!this._langModal) return;

    const activeSet = this.getActiveSet();
    const context =
      this._langModalContext === "settingsEditor"
        ? "settingsEditor"
        : "dashboard";
    const languages =
      context === "settingsEditor"
        ? this.getEditorLanguageOptions(activeSet)
        : this.getAvailableLanguages(activeSet);
    const current = this.normalizeLanguageCode(this.getSelectedLanguageCode());

    const titleEl = this._langModal.querySelector(".adhkar-lang-modal-title");
    if (titleEl) {
      titleEl.innerHTML = `<span aria-hidden="true">🌐</span>${
        context === "settingsEditor"
          ? "Select Editor Language"
          : "Select Language"
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
      listEl.innerHTML = `<div class="adhkar-set-empty">No languages found.</div>`;
      return;
    }

    listEl.innerHTML = filtered
      .map((lang) => {
        const isActive = lang.code === current;
        return `
          <div class="adhkar-lang-item ${
            isActive ? "active" : ""
          }" data-lang="${this.escapeHtmlAttr(lang.code)}">
            <span class="flag" aria-hidden="true">${this.getLanguageFlag(
              lang.code,
            )}</span>
            <div class="adhkar-lang-item-info">
              <div class="adhkar-lang-item-name">${this.escapeHtmlAttr(
                lang.name,
              )}</div>
              <div class="adhkar-lang-item-code">${this.escapeHtmlAttr(
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

        this.setSelectedLanguageCode(code);
        this.renderDashboard();
        this.renderSettings();
        const clickContext =
          this._langModalContext === "settingsEditor"
            ? "settingsEditor"
            : "dashboard";
        const optionsNow =
          clickContext === "settingsEditor"
            ? this.getEditorLanguageOptions(this.getActiveSet())
            : this.getAvailableLanguages(this.getActiveSet());
        const lang = optionsNow.find((l) => l.code === code);
        if (lang) {
          const prefix =
            clickContext === "settingsEditor" ? "Editor language" : "Language";
          this.showToast(`${prefix}: ${lang.name}`, "success");
        }
        this.closeLanguageSelectorModal();
      });
    }
  }

  createSetSelectorModal() {
    if (document.getElementById("adhkarSetModal")) return;

    const modal = document.createElement("div");
    modal.id = "adhkarSetModal";
    modal.className = "adhkar-set-modal";
    modal.innerHTML = `
      <div class="adhkar-set-modal-content">
        <div class="adhkar-set-modal-header">
          <h3 class="adhkar-set-modal-title">${this._getIcon("📚", {
            size: 20,
          })} Select Adhkar Set</h3>
          <button type="button" class="adhkar-set-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="adhkar-set-modal-body">
          <div class="adhkar-set-search">
            <input type="text" class="adhkar-set-search-input" placeholder="Search sets..." />
          </div>
          <div class="adhkar-set-list"></div>
          <div class="adhkar-set-pagination"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this._setModal = modal;
    this._setModal = modal;

    modal
      .querySelector(".adhkar-set-modal-close")
      .addEventListener("click", () => {
        this.closeSetSelectorModal();
      });

    this._bindOverlayCloseBehavior(modal, () => this.closeSetSelectorModal());

    modal
      .querySelector(".adhkar-set-search-input")
      .addEventListener("input", (e) => {
        this._setModalSearchQuery = e.target.value;
        this._setModalPage = 1;
        this.renderSetSelectorModal();
      });
  }

  openSetSelectorModal() {
    this._setModalSearchQuery = "";
    this._setModalPage = 1;

    const modal = document.getElementById("adhkarSetModal");
    if (modal) {
      modal.classList.add("active");

      const searchInput = modal.querySelector(".adhkar-set-search-input");
      if (searchInput) {
        searchInput.value = "";
        // Focus the search input for convenience and accessibility
        setTimeout(() => {
          searchInput.focus();
          if (typeof searchInput.select === "function") searchInput.select();
        }, 0);
      }

      // Update the header to reflect the modal state for assistive tech
      const headerText = this.cardEl?.querySelector("#adhkarHeaderText");
      if (headerText) headerText.setAttribute("aria-expanded", "true");

      this.renderSetSelectorModal();
    }
  }

  closeSetSelectorModal() {
    const modal = document.getElementById("adhkarSetModal");
    if (modal) {
      modal.classList.remove("active");
      // Update header state for assistive tech
      const headerText = this.cardEl?.querySelector("#adhkarHeaderText");
      if (headerText) headerText.setAttribute("aria-expanded", "false");
    }
  }

  renderSetSelectorModal() {
    const modal = document.getElementById("adhkarSetModal");
    if (!modal) return;

    const listContainer = modal.querySelector(".adhkar-set-list");
    const paginationContainer = modal.querySelector(".adhkar-set-pagination");

    let sets = this.getSets();
    const searchQuery = this._setModalSearchQuery.toLowerCase();
    const activeSetId = this.getActiveSetId();

    if (searchQuery) {
      sets = sets.filter((s) => s.name.toLowerCase().includes(searchQuery));
    }

    const SETS_PER_PAGE = 10;
    const totalPages = Math.ceil(sets.length / SETS_PER_PAGE);
    const start = (this._setModalPage - 1) * SETS_PER_PAGE;
    const pageSets = sets.slice(start, start + SETS_PER_PAGE);

    if (pageSets.length === 0) {
      listContainer.innerHTML = `
        <div class="adhkar-set-empty">
          No adhkar sets found.
        </div>
      `;
    } else {
      listContainer.innerHTML = pageSets
        .map((s) => {
          const itemCount = Array.isArray(s.cards) ? s.cards.length : 0;
          const isActive = s.id === activeSetId;
          return `
            <div class="adhkar-set-item ${
              isActive ? "active" : ""
            }" data-set-id="${s.id}">
              <div class="adhkar-set-item-info">
                <span class="adhkar-set-item-name">${this.escapeHtmlAttr(
                  s.name,
                )}</span>
                <span class="adhkar-set-item-meta">${itemCount} item${
                  itemCount === 1 ? "" : "s"
                }</span>
              </div>
              ${
                Array.isArray(AdhkarManager.PROTECTED_SET_IDS) &&
                AdhkarManager.PROTECTED_SET_IDS.includes(s.id)
                  ? `<span class="adhkar-set-item-lock" title="Default set — read only">${this._getIcon(
                      "🔒",
                      { size: 14 },
                    )}</span>`
                  : ""
              }
              ${
                isActive
                  ? `<span style="color: var(--accent-gold);">${this._getIcon(
                      "✓",
                      { size: 16 },
                    )}</span>`
                  : ""
              }
            </div>
          `;
        })
        .join("");

      listContainer.querySelectorAll(".adhkar-set-item").forEach((el) => {
        el.addEventListener("click", () => {
          const setId = el.dataset.setId;
          this.setActiveSetId(setId);
          this.restoreCurrentCardIndexForActiveSet();
          this.renderDashboard();
          this.ensureAutoAdvanceState({ reset: true });
          this.closeSetSelectorModal();

          const set = this.getSets().find((s) => s.id === setId);
          if (set) {
            this.showToast(`Switched to: ${set.name}`, "success");
          }
        });
      });
    }

    this.renderSetSelectorPagination(paginationContainer, totalPages);
  }

  renderSetSelectorPagination(container, totalPages) {
    if (!container) return;

    if (totalPages <= 1) {
      container.innerHTML = "";
      return;
    }

    const currentPage = this._setModalPage;
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 2) {
        end = Math.min(totalPages - 1, 4);
      } else if (currentPage >= totalPages - 1) {
        start = Math.max(2, totalPages - 3);
      }

      if (start > 2) pages.push("...");

      for (let i = start; i <= end; i++) pages.push(i);

      if (end < totalPages - 1) pages.push("...");

      pages.push(totalPages);
    }

    container.innerHTML = `
      <button type="button" class="adhkar-set-page-btn" data-page="${
        currentPage - 1
      }" ${currentPage === 1 ? "disabled" : ""}>${this._getIcon("←", {
        size: 14,
      })}</button>
      ${pages
        .map((p) =>
          p === "..."
            ? `<span class="adhkar-set-page-btn" style="cursor: default; border: none;">...</span>`
            : `<button type="button" class="adhkar-set-page-btn ${
                p === currentPage ? "active" : ""
              }" data-page="${p}">${p}</button>`,
        )
        .join("")}
      <button type="button" class="adhkar-set-page-btn" data-page="${
        currentPage + 1
      }" ${currentPage === totalPages ? "disabled" : ""}>${this._getIcon("→", {
        size: 14,
      })}</button>
    `;

    container.querySelectorAll("button[data-page]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const page = parseInt(btn.dataset.page, 10);
        if (Number.isFinite(page) && page >= 1 && page <= totalPages) {
          this._setModalPage = page;
          this.renderSetSelectorModal();
        }
      });
    });
  }
});

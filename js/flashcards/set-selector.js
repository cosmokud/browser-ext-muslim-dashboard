/**
 * FlashcardManager: set picker modal.
 * Part of the class declared in js/flashcards/index.js; load this after it.
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
})(FlashcardManager.prototype, class {

  createSetSelectorButton() {
    const headerActions = this.cardEl?.querySelector(".card-header-actions");
    if (!headerActions) return;

    // Check if button already exists
    if (headerActions.querySelector(".flashcard-set-selector-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "flashcard-set-selector-btn";
    btn.innerHTML = this._getIcon("📚", { size: 18 });
    btn.title = "Select flashcard set";
    btn.setAttribute("aria-label", "Select flashcard set");

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      this.openSetSelectorModal();
    });

    // Insert after mode toggle button
    const modeBtn = headerActions.querySelector(".flashcard-mode-toggle-btn");
    if (modeBtn && modeBtn.nextSibling) {
      headerActions.insertBefore(btn, modeBtn.nextSibling);
    } else if (modeBtn) {
      headerActions.appendChild(btn);
    } else {
      headerActions.insertBefore(btn, headerActions.firstChild);
    }
  }

  createSetSelectorModal() {
    if (document.getElementById("flashcardSetModal")) return;

    const libraryIcon = this._getIcon("📚", { size: 20 });
    const modal = document.createElement("div");
    modal.id = "flashcardSetModal";
    modal.className = "flashcard-set-modal";
    modal.innerHTML = `
      <div class="flashcard-set-modal-content">
        <div class="flashcard-set-modal-header">
          <h3 class="flashcard-set-modal-title">${libraryIcon} Select Flashcard Set</h3>
          <button type="button" class="flashcard-set-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="flashcard-set-modal-body">
          <div class="flashcard-set-search">
            <input type="text" class="flashcard-set-search-input" placeholder="Search sets..." />
          </div>
          <div class="flashcard-set-list"></div>
          <div class="flashcard-set-pagination"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this._setModal = modal;

    // Event listeners
    modal
      .querySelector(".flashcard-set-modal-close")
      .addEventListener("click", () => {
        this.closeSetSelectorModal();
      });

    this._bindOverlayCloseBehavior(modal, () => this.closeSetSelectorModal());

    modal
      .querySelector(".flashcard-set-search-input")
      .addEventListener("input", (e) => {
        this._setModalSearchQuery = e.target.value;
        this._setModalPage = 1;
        this.renderSetSelectorModal();
      });
  }

  openSetSelectorModal() {
    this._setModalSearchQuery = "";
    this._setModalPage = 1;

    const modal = document.getElementById("flashcardSetModal");
    if (modal) {
      modal.classList.add("active");
      modal.querySelector(".flashcard-set-search-input").value = "";
      this.renderSetSelectorModal();
    }
  }

  closeSetSelectorModal() {
    const modal = document.getElementById("flashcardSetModal");
    if (modal) {
      modal.classList.remove("active");
    }
  }

  renderSetSelectorModal() {
    const modal = document.getElementById("flashcardSetModal");
    if (!modal) return;

    const listContainer = modal.querySelector(".flashcard-set-list");
    const paginationContainer = modal.querySelector(
      ".flashcard-set-pagination",
    );

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
        <div class="flashcard-set-empty">
          No flashcard sets found.
        </div>
      `;
    } else {
      listContainer.innerHTML = pageSets
        .map((s) => {
          const cardCount = Array.isArray(s.cards) ? s.cards.length : 0;
          const isActive = s.id === activeSetId;
          return `
            <div class="flashcard-set-item ${
              isActive ? "active" : ""
            }" data-set-id="${s.id}">
              <div class="flashcard-set-item-info">
                <span class="flashcard-set-item-name">${this.escapeHtmlAttr(
                  s.name,
                )}</span>
                <span class="flashcard-set-item-meta">${cardCount} card${
                  cardCount === 1 ? "" : "s"
                }</span>
              </div>
              ${
                Array.isArray(FlashcardManager.PROTECTED_SET_IDS) &&
                FlashcardManager.PROTECTED_SET_IDS.includes(s.id)
                  ? `<span class="flashcard-set-item-lock" title="Default set — read only">${this._getIcon(
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

      // Click handlers
      listContainer.querySelectorAll(".flashcard-set-item").forEach((el) => {
        el.addEventListener("click", () => {
          const setId = el.dataset.setId;
          this.setActiveSetId(setId);
          this.isFlipped = false;
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

    // Render pagination
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
      <button type="button" class="flashcard-set-page-btn" data-page="${
        currentPage - 1
      }" ${currentPage === 1 ? "disabled" : ""}>${this._getIcon("←", {
        size: 14,
      })}</button>
      ${pages
        .map((p) =>
          p === "..."
            ? `<span class="flashcard-set-page-btn" style="cursor: default; border: none;">...</span>`
            : `<button type="button" class="flashcard-set-page-btn ${
                p === currentPage ? "active" : ""
              }" data-page="${p}">${p}</button>`,
        )
        .join("")}
      <button type="button" class="flashcard-set-page-btn" data-page="${
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

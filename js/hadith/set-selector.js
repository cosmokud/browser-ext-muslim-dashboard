/**
 * HadithManager: set picker modal.
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

  createSetSelectorButton() {
    const headerActions = this.cardEl?.querySelector(".card-header-actions");
    if (!headerActions) return;

    if (headerActions.querySelector(".adhkar-set-selector-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "adhkar-set-selector-btn";
    btn.innerHTML = this._getIcon("📚", { size: 18 });
    btn.title = "Select hadith set";
    btn.setAttribute("aria-label", "Select hadith set");
    this._setModalBtn = btn;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      this.openSetSelectorModal();
    });

    // Insert after language selector if present, else at start
    const langBtn = headerActions.querySelector(".adhkar-lang-selector-btn");
    if (langBtn) {
      headerActions.insertBefore(btn, langBtn.nextSibling);
    } else {
      headerActions.insertBefore(btn, headerActions.firstChild);
    }
  }

  createSetSelectorModal() {
    if (document.getElementById("hadithSetModal")) return;

    const modal = document.createElement("div");
    modal.id = "hadithSetModal";
    modal.className = "pq-bookmark-modal adhkar-set-modal";
    modal.innerHTML = `
      <div class="adhkar-set-modal-content">
        <div class="adhkar-set-modal-header">
          <div class="adhkar-set-modal-title">
            <span aria-hidden="true">${this._getIcon("📚", { size: 20 })}</span>
            Select Hadith Set
          </div>
          <button class="adhkar-set-modal-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="adhkar-set-modal-body">
          <div class="adhkar-set-search">
            <input type="text" class="adhkar-set-search-input" placeholder="Search sets..." />
          </div>
          <div class="adhkar-set-list"></div>
          <div class="adhkar-set-pagination" hidden></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this._setModal = modal;

    const closeBtn = modal.querySelector(".adhkar-set-modal-close");
    closeBtn?.addEventListener("click", () => this.closeSetSelectorModal());

    this._bindOverlayCloseBehavior(modal, () => this.closeSetSelectorModal());

    const searchInput = modal.querySelector(".adhkar-set-search-input");
    searchInput?.addEventListener("input", (e) => {
      this._setModalSearchQuery = String(e.target.value || "");
      this._setModalPage = 1;
      this.renderSetSelectorModal();
    });

    this.renderSetSelectorModal();
  }

  openSetSelectorModal() {
    if (!this._setModal) this.createSetSelectorModal();
    if (!this._setModal) return;

    this._setModal.classList.add("active");
    this._setModalPage = 1;
    this._setModalSearchQuery = "";

    const searchInput = this._setModal.querySelector(
      ".adhkar-set-search-input",
    );
    if (searchInput) searchInput.value = "";

    this.renderSetSelectorModal();

    setTimeout(() => {
      try {
        searchInput?.focus();
      } catch (e) {}
    }, 50);
  }

  closeSetSelectorModal() {
    if (!this._setModal) return;
    this._setModal.classList.remove("active");
  }

  renderSetSelectorModal() {
    if (!this._setModal) return;

    const sets = this.getSets();
    const activeId = this.getActiveSetId();

    const q = String(this._setModalSearchQuery || "")
      .trim()
      .toLowerCase();
    const filtered = q
      ? sets.filter((s) =>
          String(s.name || "")
            .toLowerCase()
            .includes(q),
        )
      : sets;

    const listEl = this._setModal.querySelector(".adhkar-set-list");
    const paginationEl = this._setModal.querySelector(".adhkar-set-pagination");

    if (!listEl || !paginationEl) return;

    if (!filtered.length) {
      listEl.innerHTML = `
        <div class="adhkar-set-empty">No sets found.</div>
      `;
      paginationEl.hidden = true;
      return;
    }

    const pageSize = 8;
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    this._setModalPage = this.clampNumber(this._setModalPage, 1, pages, 1);

    const start = (this._setModalPage - 1) * pageSize;
    const end = Math.min(filtered.length, start + pageSize);

    const items = [];
    for (let i = start; i < end; i += 1) {
      const set = filtered[i];
      const isActive = set.id === activeId;
      const locked = this.isProtectedSetId(set.id);
      const count = Array.isArray(set.cards) ? set.cards.length : 0;

      items.push(`
        <div class="adhkar-set-item ${
          isActive ? "active" : ""
        }" data-set-id="${this.escapeHtmlAttr(set.id)}">
          <div class="adhkar-set-item-info">
            <div class="adhkar-set-item-name">
              ${this.escapeHtmlAttr(set.name || "Unnamed")}
              ${
                locked
                  ? `<span class="adhkar-set-item-lock" title="Default set — read only">${this._getIcon(
                      "🔒",
                      { size: 14 },
                    )}</span>`
                  : ""
              }
            </div>
            <div class="adhkar-set-item-meta">${count} items</div>
          </div>
        </div>
      `);
    }

    listEl.innerHTML = items.join("");

    if (listEl.dataset.bound !== "true") {
      listEl.dataset.bound = "true";
      listEl.addEventListener("click", (e) => {
        const item = e.target.closest(".adhkar-set-item");
        if (!item) return;
        const setId = item.dataset.setId;
        if (!setId) return;
        this.setActiveSetId(setId);
        this.restoreCurrentCardIndexForActiveSet();
        this.renderDashboard();
        this.renderSettings();
        this.ensureAutoAdvanceState({ reset: true });
        this.closeSetSelectorModal();
        const set = this.getSets().find((s) => s.id === setId);
        if (set) this.showToast(`Switched to: ${set.name}`, "success");
      });
    }

    // Pagination
    if (pages <= 1) {
      paginationEl.hidden = true;
      paginationEl.innerHTML = "";
      return;
    }

    paginationEl.hidden = false;

    const btns = [];
    const makeBtn = (label, page, disabled, active) => {
      return `
        <button
          class="adhkar-set-page-btn ${active ? "active" : ""}"
          type="button"
          data-page="${page}"
          ${disabled ? "disabled" : ""}
        >
          ${label}
        </button>
      `;
    };

    btns.push(
      makeBtn("Prev", this._setModalPage - 1, this._setModalPage <= 1, false),
    );

    for (let p = 1; p <= pages; p += 1) {
      if (p === 1 || p === pages || Math.abs(p - this._setModalPage) <= 1) {
        btns.push(makeBtn(String(p), p, false, p === this._setModalPage));
      }
    }

    btns.push(
      makeBtn(
        "Next",
        this._setModalPage + 1,
        this._setModalPage >= pages,
        false,
      ),
    );

    paginationEl.innerHTML = btns.join("");

    if (paginationEl.dataset.bound !== "true") {
      paginationEl.dataset.bound = "true";
      paginationEl.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const p = parseInt(btn.dataset.page, 10);
        if (!Number.isFinite(p)) return;
        this._setModalPage = p;
        this.renderSetSelectorModal();
      });
    }
  }
});

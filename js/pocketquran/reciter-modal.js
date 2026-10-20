/**
 * PocketQuranManager: reciter picker modal.
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

  createReciterModal() {
    if (document.getElementById("pqReciterModal")) return;

    const modal = document.createElement("div");
    modal.id = "pqReciterModal";
    modal.className = "pq-bookmark-modal";
    modal.innerHTML = `
      <div class="pq-bookmark-modal-content pq-translation-modal-content">
        <div class="pq-bookmark-modal-header">
          <h3 class="pq-bookmark-modal-title">🎙️ Select Reciter</h3>
          <button type="button" class="pq-bookmark-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="pq-bookmark-modal-body">
          <div class="pq-bookmark-search">
            <input type="text" class="pq-bookmark-search-input pq-reciter-search" placeholder="Search reciters..." />
          </div>
          <div class="pq-reciter-list"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this._reciterModal = modal;

    // Close button
    modal
      .querySelector(".pq-bookmark-modal-close")
      .addEventListener("click", () => {
        this.closeReciterModal();
      });

    // Click outside to close
    this._bindOverlayCloseBehavior(modal, () => this.closeReciterModal());

    // Search input
    const searchInput = modal.querySelector(".pq-reciter-search");
    searchInput.addEventListener("input", () => {
      this.renderReciterList(searchInput.value);
    });

    // Keyboard navigation
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeReciterModal();
      }
    });
  }

  openReciterModal() {
    const modal = document.getElementById("pqReciterModal");
    if (!modal) return;

    const searchInput = modal.querySelector(".pq-reciter-search");
    if (searchInput) searchInput.value = "";

    this.renderReciterList("");
    modal.classList.add("active");

    // Focus search input
    setTimeout(() => {
      if (searchInput) searchInput.focus();
    }, 100);
  }

  closeReciterModal() {
    const modal = document.getElementById("pqReciterModal");
    if (modal) modal.classList.remove("active");
  }

  renderReciterList(query = "") {
    const modal = document.getElementById("pqReciterModal");
    if (!modal) return;

    const container = modal.querySelector(".pq-reciter-list");
    if (!container) return;

    const q = String(query || "")
      .toLowerCase()
      .trim();

    // Filter reciters by query
    const filtered = this._reciters.filter((r) => {
      if (!q) return true;
      const name = String(r.name || "").toLowerCase();
      const style = String(r.style || "").toLowerCase();
      return name.includes(q) || style.includes(q);
    });

    // Build HTML
    let html = "";
    for (const r of filtered) {
      const isActive = r.id === this._activeReciterId;
      const displayName = r.style ? `${r.name} (${r.style})` : r.name;
      html += `<button type="button" class="pq-translation-item ${
        isActive ? "active" : ""
      }" data-reciter-id="${r.id}">
        <span class="pq-translation-name">${this.escapeHtml(displayName)}</span>
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
      html = `<div class="pq-translation-empty">No reciters found for "${this.escapeHtml(
        query,
      )}"</div>`;
    }

    container.innerHTML = html;

    // Add click handlers
    container.querySelectorAll(".pq-translation-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.reciterId, 10);
        if (Number.isFinite(id)) {
          this.selectReciter(id);
        }
      });
    });

    // Scroll active reciter into view
    const activeItem = container.querySelector(".pq-translation-item.active");
    if (activeItem && !q) {
      setTimeout(() => {
        activeItem.scrollIntoView({ block: "center", behavior: "auto" });
      }, 50);
    }
  }
});

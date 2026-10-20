/**
 * PocketQuranManager: bookmark button and modals.
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

  createBookmarkButton() {
    const headerActions = this.card?.querySelector(".card-header-actions");
    if (!headerActions) return;

    // Check if button already exists
    if (headerActions.querySelector(".pq-bookmark-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pq-bookmark-btn";
    btn.innerHTML = this._getIcon("📑", { size: 18 });
    btn.title = "View bookmarked ayahs";
    btn.setAttribute("aria-label", "View bookmarked ayahs");

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      this.openBookmarkModal();
    });

    // Insert before the blur menu
    const blurMenu = headerActions.querySelector(".card-blur-menu");
    if (blurMenu) {
      headerActions.insertBefore(btn, blurMenu);
    } else {
      headerActions.appendChild(btn);
    }
  }

  createBookmarkModals() {
    // Main bookmark list modal
    if (!document.getElementById("pqBookmarkModal")) {
      const modal = document.createElement("div");
      modal.id = "pqBookmarkModal";
      modal.className = "pq-bookmark-modal";
      modal.innerHTML = `
        <div class="pq-bookmark-modal-content">
          <div class="pq-bookmark-modal-header">
            <h3 class="pq-bookmark-modal-title">${this._getIcon("📑", {
              size: 20,
            })} Bookmarked Ayahs</h3>
            <button type="button" class="pq-bookmark-modal-close" aria-label="Close">&times;</button>
          </div>
          <div class="pq-bookmark-modal-body">
            <div class="pq-bookmark-search">
              <input type="text" class="pq-bookmark-search-input" placeholder="Search categories..." />
              <button type="button" class="pq-bookmark-add-category" title="Add category">${this._getIcon(
                "➕",
                { size: 16 },
              )}</button>
            </div>
            <div class="pq-bookmark-categories"></div>
            <div class="pq-bookmark-ayahs"></div>
            <div class="pq-bookmark-pagination"></div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      this._bookmarkModal = modal;

      // Event listeners
      modal
        .querySelector(".pq-bookmark-modal-close")
        .addEventListener("click", () => {
          this.closeBookmarkModal();
        });

      this._bindOverlayCloseBehavior(modal, () => this.closeBookmarkModal());

      modal
        .querySelector(".pq-bookmark-search-input")
        .addEventListener("input", (e) => {
          this._bookmarkSearchQuery = e.target.value;
          this._bookmarkCurrentPage = 1;
          this.renderBookmarkModal();
        });

      modal
        .querySelector(".pq-bookmark-add-category")
        .addEventListener("click", () => {
          const name = prompt("Enter category name:");
          if (name) {
            const cat = this.createBookmarkCategory(name);
            if (cat) {
              this.renderBookmarkModal();
            }
          }
        });
    }

    // Category selection modal (for bookmarking an ayah)
    if (!document.getElementById("pqBookmarkCategoryModal")) {
      const modal = document.createElement("div");
      modal.id = "pqBookmarkCategoryModal";
      modal.className = "pq-bookmark-modal";
      modal.innerHTML = `
        <div class="pq-bookmark-modal-content" style="max-width: 450px;">
          <div class="pq-bookmark-modal-header">
            <h3 class="pq-bookmark-modal-title">${this._getIcon("⭐", {
              size: 20,
            })} Bookmark Ayah</h3>
            <button type="button" class="pq-bookmark-modal-close" aria-label="Close">&times;</button>
          </div>
          <div class="pq-bookmark-modal-body">
            <div class="pq-bookmark-search">
              <input type="text" class="pq-bookmark-search-input" placeholder="Search categories..." />
              <button type="button" class="pq-bookmark-add-category" title="Add category">${this._getIcon(
                "➕",
                { size: 16 },
              )}</button>
            </div>
            <div class="pq-bookmark-categories"></div>
            <div class="pq-bookmark-pagination"></div>
          </div>
          <div class="pq-bookmark-modal-footer">
            <button type="button" class="pq-bookmark-modal-btn">Cancel</button>
            <button type="button" class="pq-bookmark-modal-btn primary">Save</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      this._bookmarkCategoryModal = modal;

      // Event listeners
      modal
        .querySelector(".pq-bookmark-modal-close")
        .addEventListener("click", () => {
          this.closeCategorySelectionModal();
        });

      this._bindOverlayCloseBehavior(modal, () =>
        this.closeCategorySelectionModal(),
      );

      modal
        .querySelector(".pq-bookmark-search-input")
        .addEventListener("input", (e) => {
          this._bookmarkCategorySearchQuery = e.target.value;
          this._bookmarkCategoryPage = 1;
          this.renderCategorySelectionModal();
        });

      modal
        .querySelector(".pq-bookmark-add-category")
        .addEventListener("click", () => {
          const name = prompt("Enter category name:");
          if (name) {
            const cat = this.createBookmarkCategory(name);
            if (cat) {
              this.renderCategorySelectionModal();
            }
          }
        });

      const buttons = modal.querySelectorAll(
        ".pq-bookmark-modal-footer .pq-bookmark-modal-btn",
      );
      buttons[0].addEventListener("click", () =>
        this.closeCategorySelectionModal(),
      );
      buttons[1].addEventListener("click", () => this.saveBookmarkSelection());
    }
  }
});

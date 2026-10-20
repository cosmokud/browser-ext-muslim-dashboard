/**
 * SearchBarManager: search bar event binding.
 * Part of the class declared in js/searchbar/index.js; load this after it.
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
})(SearchBarManager.prototype, class {

  bindEvents() {
    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.runSearch();
    });

    if (this.prevBtn) {
      this.prevBtn.addEventListener("click", () => this.scrollBy(-1));
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener("click", () => this.scrollBy(1));
    }

    if (this.addBtn) {
      this.addBtn.addEventListener("click", () => {
        this.showAddModal();
      });
    }

    // Add modal events
    if (this.addModalCloseBtn) {
      this.addModalCloseBtn.addEventListener("click", () =>
        this.hideAddModal(),
      );
    }
    if (this.addModalCancelBtn) {
      this.addModalCancelBtn.addEventListener("click", () =>
        this.hideAddModal(),
      );
    }
    if (this.addModal) {
      this._bindOverlayCloseBehavior(this.addModal, () => this.hideAddModal());
    }
    if (this.addModalForm) {
      this.addModalForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.addCustomSearchFromModal();
      });
    }

    // Edit modal events
    if (this.editModalCloseBtn) {
      this.editModalCloseBtn.addEventListener("click", () =>
        this.hideEditModal(),
      );
    }
    if (this.editModalCancelBtn) {
      this.editModalCancelBtn.addEventListener("click", () =>
        this.hideEditModal(),
      );
    }
    if (this.editModal) {
      this._bindOverlayCloseBehavior(this.editModal, () =>
        this.hideEditModal(),
      );
    }
    if (this.editModalForm) {
      this.editModalForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.updateCustomSearchFromModal();
      });
    }

    // Favicon refresh button
    if (this.editRefreshFaviconBtn) {
      this.editRefreshFaviconBtn.addEventListener("click", () =>
        this.handleRefreshFavicon(),
      );
    }

    // Favicon import button
    if (this.editImportFaviconBtn) {
      this.editImportFaviconBtn.addEventListener("click", () => {
        this.editFaviconFileInput?.click();
      });
    }

    // Favicon import by URL button
    if (this.editImportFaviconUrlBtn) {
      this.editImportFaviconUrlBtn.addEventListener("click", () =>
        this.handleImportFaviconFromUrl(),
      );
    }

    // Favicon file input change
    if (this.editFaviconFileInput) {
      this.editFaviconFileInput.addEventListener("change", (e) =>
        this.handleFaviconFileSelect(e),
      );
    }

    // Delete modal events
    if (this.cancelDeleteBtn) {
      this.cancelDeleteBtn.addEventListener("click", () =>
        this.hideDeleteConfirmation(),
      );
    }
    if (this.confirmDeleteBtn) {
      this.confirmDeleteBtn.addEventListener("click", () =>
        this.confirmDelete(),
      );
    }
    if (this.deleteModal) {
      this._bindOverlayCloseBehavior(this.deleteModal, () =>
        this.hideDeleteConfirmation(),
      );
    }

    // Escape closes context menu + modals
    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && this.deleteModal?.classList.contains("active")) {
        e.preventDefault();
        this.confirmDelete();
        return;
      }

      if (e.key !== "Escape") return;
      this.hideContextMenu();
      this.hideAddModal();
      this.hideEditModal();
      this.hideDeleteConfirmation();
    });
  }
});

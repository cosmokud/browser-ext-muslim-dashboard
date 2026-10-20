/**
 * SearchBarManager: engine delete confirmation.
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

  showDeleteConfirmation(engineId) {
    const engine = this.searches.find((s) => String(s.id) === String(engineId));
    if (!engine || !this.deleteModal) return;

    this.pendingDeleteId = String(engine.id);
    if (this.deleteNameEl) this.deleteNameEl.textContent = engine.name;
    this.deleteModal.classList.add("active");
  }

  hideDeleteConfirmation() {
    if (!this.deleteModal) return;
    this.deleteModal.classList.remove("active");
    this.pendingDeleteId = null;
  }

  confirmDelete() {
    if (!this.pendingDeleteId) return;
    this.deleteEngine(this.pendingDeleteId);
    this.hideDeleteConfirmation();
  }
});

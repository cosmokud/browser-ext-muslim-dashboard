/**
 * StickyNotesManager: delete confirmation modal.
 * Part of the class declared in js/stickynotes/index.js; load this after it.
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
})(StickyNotesManager.prototype, class {

  createDeleteConfirmModal() {
    const existing = document.getElementById("stickyNotesDeleteConfirmModal");
    if (existing) {
      this.deleteModal = existing;
      this.deletePreviewEl = document.getElementById("stickyNotesDeleteName");
      this.confirmDeleteBtn = document.getElementById(
        "confirmStickyNotesDeleteBtn",
      );
      this.cancelDeleteBtn = document.getElementById(
        "cancelStickyNotesDeleteBtn",
      );
      return;
    }

    const modal = document.createElement("div");
    modal.id = "stickyNotesDeleteConfirmModal";
    modal.className = "modal-overlay delete-confirm-modal";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="delete-confirm-content" role="dialog" aria-modal="true" aria-labelledby="stickyNotesDeleteTitle">
        <div class="delete-confirm-icon">⚠️</div>
        <h3 id="stickyNotesDeleteTitle">Delete Sticky Note?</h3>
        <p>
          You are about to permanently delete this sticky note:
          <strong id="stickyNotesDeleteName">(untitled)</strong>
        </p>
        <p class="delete-confirm-hint">
          This action cannot be undone.
        </p>
        <div class="delete-confirm-buttons">
          <button class="delete-confirm-btn cancel" id="cancelStickyNotesDeleteBtn" type="button">
            Cancel
          </button>
          <button class="delete-confirm-btn confirm" id="confirmStickyNotesDeleteBtn" type="button">
            Delete
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    this.deleteModal = modal;
    this.deletePreviewEl = document.getElementById("stickyNotesDeleteName");
    this.confirmDeleteBtn = document.getElementById(
      "confirmStickyNotesDeleteBtn",
    );
    this.cancelDeleteBtn = document.getElementById(
      "cancelStickyNotesDeleteBtn",
    );

    this.confirmDeleteBtn?.addEventListener("click", () =>
      this.confirmDelete(),
    );
    this.cancelDeleteBtn?.addEventListener("click", () =>
      this.hideDeleteConfirmation(),
    );

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.hideDeleteConfirmation();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && this.deleteModal?.classList.contains("active")) {
        e.preventDefault();
        this.confirmDelete();
        return;
      }

      if (
        e.key === "Escape" &&
        this.deleteModal?.classList.contains("active")
      ) {
        this.hideDeleteConfirmation();
      }
    });
  }

  getNotePreviewText(note) {
    if (!note) return "(untitled)";
    const temp = document.createElement("div");
    temp.innerHTML = String(note.content || "");
    const text = String(temp.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
    return text ? text.slice(0, 80) : "(untitled)";
  }

  showDeleteConfirmation(noteId) {
    const note = this.notes.find((n) => n.id === noteId);
    if (!note || !this.deleteModal) return;

    this.pendingDeleteId = noteId;
    if (this.deletePreviewEl) {
      this.deletePreviewEl.textContent = this.getNotePreviewText(note);
    }

    this.deleteModal.classList.add("active");
    this.deleteModal.setAttribute("aria-hidden", "false");
  }

  hideDeleteConfirmation() {
    if (this.deleteModal) {
      this.deleteModal.classList.remove("active");
      this.deleteModal.setAttribute("aria-hidden", "true");
    }
    this.pendingDeleteId = null;
  }

  confirmDelete() {
    const noteId = String(this.pendingDeleteId || "").trim();
    if (!noteId) return;
    this.deleteNote(noteId);
    this.hideDeleteConfirmation();
  }
});

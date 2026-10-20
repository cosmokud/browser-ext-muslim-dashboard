/**
 * StickyNotesManager: note loading and container visibility.
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

  init() {
    this.loadNotes();
    this.createContainer();
    this.createFloatingButtons();
    this.createDeleteConfirmModal();
    // initial render with entrance animation
    this.renderAllNotes(true);
    this.setupGlobalListeners();
    this.applyVisibility();
  }

  loadNotes() {
    try {
      const saved = localStorage.getItem("stickyNotes");
      this.notes = saved ? JSON.parse(saved) : [];
      // Find max z-index
      this.notes.forEach((note) => {
        if (note.zIndex > this.maxZIndex) this.maxZIndex = note.zIndex;
      });
      // Load visibility state
      const visibility = localStorage.getItem("stickyNotesVisible");
      this.isVisible = visibility !== "false";
    } catch (e) {
      console.error("Error loading sticky notes:", e);
      this.notes = [];
    }
  }

  saveNotes() {
    try {
      localStorage.setItem("stickyNotes", JSON.stringify(this.notes));
      localStorage.setItem("stickyNotesVisible", String(this.isVisible));
    } catch (e) {
      console.error("Error saving sticky notes:", e);
    }
  }

  createContainer() {
    this.container = document.createElement("div");
    this.container.id = "stickyNotesContainer";
    this.container.className = "sticky-notes-container";
    document.body.appendChild(this.container);
  }

  createFloatingButtons() {
    const fabHost =
      document.getElementById("fabMenuDynamicItems") || document.body;

    // Add Note Button
    this.addBtn = document.createElement("button");
    this.addBtn.id = "addStickyNoteBtn";
    this.addBtn.className = "sticky-note-fab sticky-note-add-btn";
    this.addBtn.setAttribute("data-tooltip", "Add Sticky Note");
    this.addBtn.setAttribute("aria-label", "Add Sticky Note");
    this.addBtn.removeAttribute("title");
    this.addBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="12" y1="8" x2="12" y2="16"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
      </svg>
    `;
    this.addBtn.addEventListener("click", () => this.createNote());
    fabHost.appendChild(this.addBtn);

    // Toggle Visibility Button
    this.toggleBtn = document.createElement("button");
    this.toggleBtn.id = "toggleStickyNotesBtn";
    this.toggleBtn.className = "sticky-note-fab sticky-note-toggle-btn";
    this.updateToggleButtonIcon();
    this.toggleBtn.addEventListener("click", () => this.toggleVisibility());
    fabHost.appendChild(this.toggleBtn);
  }

  updateToggleButtonIcon() {
    const tooltipText = this.isVisible
      ? "Hide Sticky Notes"
      : "Show Sticky Notes";

    if (this.isVisible) {
      this.toggleBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      `;
    } else {
      this.toggleBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
      `;
    }

    this.toggleBtn.setAttribute("data-tooltip", tooltipText);
    this.toggleBtn.setAttribute("aria-label", tooltipText);
    this.toggleBtn.setAttribute(
      "aria-pressed",
      this.isVisible ? "true" : "false",
    );
    this.toggleBtn.dataset.stickyNotesState = this.isVisible
      ? "visible"
      : "hidden";
    this.toggleBtn.removeAttribute("title");
  }

  toggleVisibility() {
    this.setVisibility(!this.isVisible, { save: true });
  }

  setVisibility(visible, { save = true } = {}) {
    const next = visible === true;
    if (this.isVisible === next) {
      this.updateToggleButtonIcon();
      return false;
    }

    this.isVisible = next;
    this.applyVisibility();
    this.updateToggleButtonIcon();
    if (save) {
      this.saveNotes();
    }

    return true;
  }

  hideAllNotes() {
    this.setVisibility(false, { save: true });
  }

  applyVisibility() {
    if (this.isVisible) {
      this.container.classList.remove("hidden");
      this.addBtn.classList.remove("hidden");
    } else {
      this.container.classList.add("hidden");
      this.addBtn.classList.add("hidden");
    }
  }
});

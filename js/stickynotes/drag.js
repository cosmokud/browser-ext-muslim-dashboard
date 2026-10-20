/**
 * StickyNotesManager: note dragging and stacking.
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

  handleMove(e) {
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    if (this.dragState) {
      e.preventDefault();
      const { noteId, element, offsetX, offsetY } = this.dragState;

      let newX = clientX - offsetX;
      let newY = clientY - offsetY;

      // Constrain to viewport
      newX = Math.max(0, Math.min(newX, window.innerWidth - 100));
      newY = Math.max(0, Math.min(newY, window.innerHeight - 50));

      element.style.left = `${newX}px`;
      element.style.top = `${newY}px`;

      // Update note data
      const note = this.notes.find((n) => n.id === noteId);
      if (note) {
        note.x = newX;
        note.y = newY;
      }
    }

    if (this.resizeState) {
      e.preventDefault();
      const {
        noteId,
        element,
        direction,
        startX,
        startY,
        startWidth,
        startHeight,
        startLeft,
        startTop,
      } = this.resizeState;

      const deltaX = clientX - startX;
      const deltaY = clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startLeft;
      let newY = startTop;

      const minWidth = 200;
      const minHeight = 150;

      // Handle resize based on direction
      if (direction.includes("e")) {
        newWidth = Math.max(minWidth, startWidth + deltaX);
      }
      if (direction.includes("w")) {
        newWidth = Math.max(minWidth, startWidth - deltaX);
        if (newWidth !== startWidth || newWidth > minWidth) {
          newX = startLeft + (startWidth - newWidth);
        }
      }
      if (direction.includes("s")) {
        newHeight = Math.max(minHeight, startHeight + deltaY);
      }
      if (direction.includes("n")) {
        newHeight = Math.max(minHeight, startHeight - deltaY);
        if (newHeight !== startHeight || newHeight > minHeight) {
          newY = startTop + (startHeight - newHeight);
        }
      }

      element.style.width = `${newWidth}px`;
      element.style.height = `${newHeight}px`;
      element.style.left = `${newX}px`;
      element.style.top = `${newY}px`;

      // Update note data
      const note = this.notes.find((n) => n.id === noteId);
      if (note) {
        note.width = newWidth;
        note.height = newHeight;
        note.x = newX;
        note.y = newY;
      }
    }
  }

  handleEnd() {
    if (this.dragState) {
      this.dragState.element.classList.remove("dragging");
      document.body.classList.remove("sticky-note-dragging");
      this.saveNotes();
      this.dragState = null;
    }

    if (this.resizeState) {
      this.resizeState.element.classList.remove("resizing");
      document.body.classList.remove("sticky-note-resizing");
      this.saveNotes();
      this.resizeState = null;
    }
  }

  bringToFront(noteId) {
    this.maxZIndex++;
    const note = this.notes.find((n) => n.id === noteId);
    if (note) {
      note.zIndex = this.maxZIndex;
      const element = document.getElementById(`sticky-note-${noteId}`);
      if (element) {
        element.style.zIndex = this.maxZIndex;
      }
      this.saveNotes();
    }
  }
});

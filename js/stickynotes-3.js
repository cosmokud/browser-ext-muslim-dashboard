/**
 * StickyNotesManager, part 3 of 3.
 * Moved out of js/stickynotes.js at method boundaries, so no single file carries the
 * whole class. The class itself is declared in js/stickynotes.js; load this after it.
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

  setupGlobalListeners() {
    // Mouse move for drag/resize
    document.addEventListener("mousemove", (e) => this.handleMove(e));
    document.addEventListener("touchmove", (e) => this.handleMove(e), {
      passive: false,
    });

    // Mouse up to end drag/resize
    document.addEventListener("mouseup", () => this.handleEnd());
    document.addEventListener("touchend", () => this.handleEnd());

    // Close dropdowns on outside click
    document.addEventListener("click", (e) => {
      if (
        !e.target.closest(".sticky-note-menu-btn") &&
        !e.target.closest(".sticky-note-dropdown") &&
        !e.target.closest(".sticky-note-blur-menu") &&
        !e.target.closest(".sticky-note-blur-popup")
      ) {
        this.closeAllNoteBlurMenus();
        document
          .querySelectorAll(".sticky-note-dropdown.open")
          .forEach((d) => d.classList.remove("open"));
      }
    });

    // Keep dashboard-linked sticky-note blur styles in sync with theme changes.
    document.addEventListener("md:theme-change", () => {
      this.notes.forEach((note) => {
        this.normalizeNoteBlurSettings(note);
        if (note.blurState === "dashboard") {
          this.applyNoteBlurState(note.id, { save: false });
        }
      });
      this.refreshDefaultColorPresetSwatches();
      this.repositionOpenNoteBlurPopups();
    });

    // Sync when dashboard blur power changes.
    document.addEventListener("md:ui-blur-update", () => {
      this.notes.forEach((note) => {
        this.normalizeNoteBlurSettings(note);
        if (note.blurState === "dashboard") {
          this.applyNoteBlurState(note.id, { save: false });
        }
      });
      this.refreshDefaultColorPresetSwatches();
      this.repositionOpenNoteBlurPopups();
    });

    // Handle window resize
    window.addEventListener("resize", () => {
      this.constrainNotesToViewport();
      this.repositionOpenNoteBlurPopups();
    });
    window.addEventListener(
      "scroll",
      () => this.repositionOpenNoteBlurPopups(),
      {
        capture: true,
        passive: true,
      },
    );
  }

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

  updateNoteContent(noteId, content) {
    const note = this.notes.find((n) => n.id === noteId);
    if (note) {
      note.content = content;
      note.updatedAt = Date.now();
      this.saveNotes();
    }
  }

  updateNoteColor(noteId, color, { save = true } = {}) {
    const note = this.notes.find((n) => n.id === noteId);
    if (note) {
      note.color =
        color && typeof color === "object"
          ? { ...color }
          : { ...this.colorPresets[0] };

      // If this preset indicates a glass style, apply blur-menu defaults.
      if (note.color?.glass) {
        note.blurState = "dashboard";
        note.blurPowerEnabled = false;
        note.blurPower = this.clampNumber(
          Math.round((this.clampNumber(note.color.blur, 0, 20, 20) / 20) * 200),
          0,
          200,
          note.blurPower || 100,
        );
        note.glassOpacity = this.clampNumber(
          Math.round(
            this.clampNumber(
              note.color.transparency,
              0.2,
              1,
              note.transparency || 1,
            ) * 100,
          ),
          0,
          100,
          note.glassOpacity || 100,
        );
      }

      this.applyNoteBlurState(noteId, { save: false });
      this.updateColorPresetUI(noteId, note.color);

      if (save) this.saveNotes();
    }
  }

  updateColorPresetUI(noteId, color) {
    const noteEl = document.getElementById(`sticky-note-${noteId}`);
    if (noteEl) {
      const note = this.notes.find((n) => n.id === noteId);
      noteEl.querySelectorAll(".color-preset").forEach((btn) => {
        const index = parseInt(btn.dataset.colorIndex, 10);
        const preset = this.colorPresets[index];
        if (!preset) return;

        btn.classList.toggle("active", preset.name === color?.name);

        if (preset.custom) {
          btn.style.background = this.getColorPresetSwatchBackground(
            preset,
            note,
          );
        }
      });

      const customColorInput = noteEl.querySelector(
        ".color-preset-custom-input",
      );
      if (customColorInput && note) {
        customColorInput.value = this.getNoteCustomColorHex(note);
      }
    }
  }

  updateNoteGlass(noteId, glassEffect) {
    const note = this.notes.find((n) => n.id === noteId);
    if (note) {
      note.blurState = glassEffect ? "on" : "off";
      if (!glassEffect) note.blurPowerEnabled = false;
      this.applyNoteBlurState(noteId, { save: true });
    }
  }

  updateNoteBlur(noteId, blur) {
    const note = this.notes.find((n) => n.id === noteId);
    if (note) {
      note.blurState = "on";
      note.blurPowerEnabled = true;
      note.blurPower = this.clampNumber(
        Math.round((this.clampNumber(blur, 0, 20, 0) / 20) * 200),
        0,
        200,
        100,
      );
      this.applyNoteBlurState(noteId, { save: true });
    }
  }

  updateNoteTransparency(noteId, transparency) {
    const note = this.notes.find((n) => n.id === noteId);
    if (note) {
      note.blurState = "on";
      note.glassOpacity = this.clampNumber(
        Math.round(this.clampNumber(transparency, 0.2, 1, 1) * 100),
        0,
        100,
        100,
      );
      this.applyNoteBlurState(noteId, { save: true });
    }
  }

  refreshNoteStyles(noteId) {
    const note = this.notes.find((n) => n.id === noteId);
    const element = document.getElementById(`sticky-note-${noteId}`);
    if (note && element) {
      element.style.cssText = this.getNoteStyles(note);
    }
  }

  deleteNote(noteId) {
    const id = String(noteId || "").trim();
    if (!id) return;

    this.clearCustomColorPreviewState(id);

    const menu = document.querySelector(
      `.sticky-note-blur-menu[data-note-id="${id}"]`,
    );
    menu?.classList.remove("blur-menu-open");
    menu?.closest(".sticky-note")?.classList.remove("card-blur-popup-open");

    const popup = this.noteBlurPopupByNoteId.get(id);
    if (popup) {
      popup.classList.remove("blur-popup-open");
      popup.remove();
      this.noteBlurPopupByNoteId.delete(id);
    }

    const element = document.getElementById(`sticky-note-${id}`);
    if (element) {
      element.classList.add("deleting");
      setTimeout(() => {
        element.remove();
        this.notes = this.notes.filter((n) => String(n.id) !== id);
        this.saveNotes();
      }, 300);
      return;
    }

    this.notes = this.notes.filter((n) => String(n.id) !== id);
    this.saveNotes();
  }

  constrainNotesToViewport() {
    this.notes.forEach((note) => {
      const element = document.getElementById(`sticky-note-${note.id}`);
      if (element) {
        let needsUpdate = false;

        if (note.x + note.width > window.innerWidth) {
          note.x = Math.max(0, window.innerWidth - note.width);
          needsUpdate = true;
        }
        if (note.y + note.height > window.innerHeight) {
          note.y = Math.max(0, window.innerHeight - note.height);
          needsUpdate = true;
        }

        if (needsUpdate) {
          element.style.left = `${note.x}px`;
          element.style.top = `${note.y}px`;
        }
      }
    });
    this.saveNotes();
  }
});

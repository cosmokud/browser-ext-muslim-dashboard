/**
 * StickyNotesManager: content, colour and glass updates.
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

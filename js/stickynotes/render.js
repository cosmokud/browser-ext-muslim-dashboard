/**
 * StickyNotesManager: note creation and rendering.
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

  createNote(options = {}) {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    this.maxZIndex++;

    // Calculate position - cascade from top-left with offset
    const existingNotes = this.notes.length;
    const offsetX = (existingNotes % 10) * 30 + 50;
    const offsetY = (existingNotes % 10) * 30 + 50;
    const selectedColor = options.color || this.colorPresets[0];
    const inferredBlurState =
      options.blurState ||
      (options.glassEffect === false
        ? "off"
        : selectedColor?.glass === true
          ? "dashboard"
          : "on");

    const note = {
      id,
      content: options.content || "",
      x: options.x || Math.min(offsetX, window.innerWidth - 320),
      y: options.y || Math.min(offsetY, window.innerHeight - 280),
      width: options.width || 280,
      height: options.height || 220,
      zIndex: this.maxZIndex,
      color: selectedColor,
      glassEffect:
        options.glassEffect !== undefined ? options.glassEffect : true,
      blur:
        options.blur !== undefined
          ? options.blur
          : this.colorPresets[0].blur || 20,
      transparency:
        options.transparency !== undefined
          ? options.transparency
          : this.colorPresets[0].transparency || 1,
      // New blur settings model (copied from card blur behavior)
      blurState: inferredBlurState,
      blurPowerEnabled:
        typeof options.blurPowerEnabled === "boolean"
          ? options.blurPowerEnabled
          : inferredBlurState === "on",
      blurPower: this.clampNumber(
        options.blurPower !== undefined
          ? Number(options.blurPower)
          : Math.round((this.clampNumber(options.blur, 0, 20, 20) / 20) * 200),
        0,
        200,
        100,
      ),
      glassOpacity: this.clampNumber(
        options.glassOpacity !== undefined
          ? Number(options.glassOpacity)
          : Math.round(this.clampNumber(options.transparency, 0.2, 1, 1) * 100),
        0,
        100,
        100,
      ),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.notes.push(note);
    this.renderNote(note);
    this.saveNotes();

    // Focus on the new note
    const noteEl = document.getElementById(`sticky-note-${id}`);
    if (noteEl) {
      const content = noteEl.querySelector(".sticky-note-content");
      if (content) content.focus();
    }

    return note;
  }

  renderAllNotes(initial = false) {
    this.container.innerHTML = "";
    this.notes.forEach((note, idx) => this.renderNote(note, idx, initial));
  }

  renderNote(note, index = 0, initial = false) {
    const noteEl = document.createElement("div");
    noteEl.id = `sticky-note-${note.id}`;
    noteEl.className = "sticky-note";
    noteEl.style.cssText = this.getNoteStyles(note);
    noteEl.dataset.noteId = note.id;

    noteEl.innerHTML = `
      <div class="sticky-note-header">
        <div class="sticky-note-drag-handle"></div>
        <button class="sticky-note-menu-btn" title="Note Options">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2"></circle>
            <circle cx="12" cy="12" r="2"></circle>
            <circle cx="12" cy="19" r="2"></circle>
          </svg>
        </button>
        <button
          class="sticky-note-menu-btn sticky-note-hide-all-btn"
          title="Hide Sticky Notes"
          aria-label="Hide Sticky Notes"
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"></path>
            <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        </button>
        <div class="sticky-note-dropdown">
          <div class="sticky-note-dropdown-section">
            <span class="dropdown-label">Colors</span>
            <div class="color-presets">
              ${this.colorPresets
                .map(
                  (c, i) => `
                <button class="color-preset ${
                  note.color.name === c.name ? "active" : ""
                } ${c.custom ? "color-preset-custom" : ""}"
                  data-color-index="${i}"
                        style="background: ${this.getColorPresetSwatchBackground(c, note)}"
                        title="${c.name}"></button>
              `,
                )
                .join("")}
            </div>
            <input
              class="color-preset-custom-input"
              type="color"
              value="${this.getNoteCustomColorHex(note)}"
              aria-label="Pick custom sticky note color"
              tabindex="-1"
            />
          </div>
          <div class="sticky-note-dropdown-divider"></div>
          <div
            class="card-blur-menu sticky-note-blur-menu"
            aria-label="Sticky note blur menu"
            data-note-id="${note.id}"
          >
            <button
              class="card-blur-btn sticky-note-blur-btn"
              type="button"
              aria-label="Open blur settings"
              title="Blur & Glass Settings"
            >
              ${
                note.blurState === "off"
                  ? "⬜"
                  : note.blurState === "dashboard"
                    ? "🔗"
                    : "✨"
              }
            </button>
            <div class="blur-settings-popup sticky-note-blur-popup">
              <div class="blur-popup-header">
                <span class="blur-popup-title">
                  <span class="blur-popup-title-icon">✨</span>
                  Glass Settings
                </span>
                <button class="blur-popup-close" type="button" aria-label="Close">
                  ×
                </button>
              </div>
              <div class="blur-setting-section">
                <span class="blur-setting-label">Glass Effect</span>
                <div class="blur-glass-toggle">
                  <button
                    class="blur-glass-option${note.blurState === "off" ? " active" : ""}"
                    data-glass-value="off"
                    type="button"
                  >
                    <span class="blur-glass-option-icon">⬜</span>
                    <span class="blur-glass-option-label">Off</span>
                  </button>
                  <button
                    class="blur-glass-option${note.blurState === "dashboard" ? " active" : ""}"
                    data-glass-value="dashboard"
                    type="button"
                  >
                    <span class="blur-glass-option-icon">🔗</span>
                    <span class="blur-glass-option-label">Dash</span>
                  </button>
                  <button
                    class="blur-glass-option${note.blurState === "on" ? " active" : ""}"
                    data-glass-value="on"
                    type="button"
                  >
                    <span class="blur-glass-option-icon">✨</span>
                    <span class="blur-glass-option-label">On</span>
                  </button>
                </div>
              </div>
              <div class="blur-setting-section">
                <div class="blur-power-header">
                  <span class="blur-setting-label">Blur Power</span>
                </div>
                <div class="blur-power-slider-wrap disabled">
                  <input
                    type="range"
                    class="blur-power-slider"
                    min="0"
                    max="200"
                    value="${note.blurPower || 100}"
                  />
                  <span class="blur-power-value">${note.blurPower || 100}%</span>
                </div>
              </div>
            </div>
          </div>
          <div class="sticky-note-dropdown-divider"></div>
          <button class="sticky-note-delete-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
            </svg>
            Delete Note
          </button>
        </div>
      </div>
      <div class="sticky-note-content" contenteditable="true" spellcheck="true">${
        note.content
      }</div>
      <div class="sticky-note-toolbar">
        <button class="toolbar-btn" data-command="bold" title="Bold (Ctrl+B)"><b>B</b></button>
        <button class="toolbar-btn" data-command="italic" title="Italic (Ctrl+I)"><i>I</i></button>
        <button class="toolbar-btn" data-command="underline" title="Underline (Ctrl+U)"><u>U</u></button>
        <button class="toolbar-btn" data-command="strikeThrough" title="Strikethrough"><s>S</s></button>
        <span class="toolbar-divider"></span>
        <button class="toolbar-btn" data-command="insertUnorderedList" title="Bullet List">•</button>
        <button class="toolbar-btn" data-command="insertOrderedList" title="Numbered List">1.</button>
        <span class="toolbar-divider"></span>
        <button class="toolbar-btn" data-command="formatBlock" data-value="h1" title="Heading 1">H1</button>
        <button class="toolbar-btn" data-command="formatBlock" data-value="h2" title="Heading 2">H2</button>
        <button class="toolbar-btn" data-command="formatBlock" data-value="h3" title="Heading 3">H3</button>
        <button class="toolbar-btn" data-command="formatBlock" data-value="p" title="Paragraph">P</button>
      </div>
      <!-- Resize handles -->
      <div class="resize-handle resize-n" data-resize="n"></div>
      <div class="resize-handle resize-s" data-resize="s"></div>
      <div class="resize-handle resize-e" data-resize="e"></div>
      <div class="resize-handle resize-w" data-resize="w"></div>
      <div class="resize-handle resize-ne" data-resize="ne"></div>
      <div class="resize-handle resize-nw" data-resize="nw"></div>
      <div class="resize-handle resize-se" data-resize="se"></div>
      <div class="resize-handle resize-sw" data-resize="sw"></div>
    `;

    this.container.appendChild(noteEl);
    this.attachNoteListeners(noteEl, note);

    if (initial) {
      // staggered entrance on first load
      noteEl.style.animationDelay = `${index * 70}ms`;
      noteEl.classList.add("animate-in");
      const onEnd = () => {
        noteEl.classList.remove("animate-in");
        noteEl.classList.add("visible");
        noteEl.removeEventListener("animationend", onEnd);
      };
      noteEl.addEventListener("animationend", onEnd);
    } else {
      // simple pop-in for newly created notes
      requestAnimationFrame(() => {
        noteEl.classList.add("visible");
      });
    }
  }

  getNoteStyles(note) {
    let bg = note.color.bg;

    // Resolve CSS variable background (e.g., var(--glass-bg))
    if (typeof bg === "string" && bg.trim().startsWith("var(")) {
      const match = bg.match(/var\((--[^)]+)\)/);
      if (match) {
        try {
          const computed = getComputedStyle(document.documentElement)
            .getPropertyValue(match[1])
            .trim();
          if (computed) bg = computed;
        } catch (e) {
          // ignore and fallback to original bg
        }
      }
    }

    // Always apply note transparency to keep the opacity slider authoritative,
    // including 100% (alpha 1.0) for palettes with built-in alpha values.
    const normalizedAlpha = this.clampNumber(note.transparency, 0, 1, 1);
    const adjusted = this.adjustAlpha(bg, normalizedAlpha);
    if (adjusted) bg = adjusted;

    let styles = `
      left: ${note.x}px;
      top: ${note.y}px;
      width: ${note.width}px;
      height: ${note.height}px;
      z-index: ${note.zIndex};
      background: ${bg};
      color: ${note.color.text};
    `;

    if (note.glassEffect || note.blur > 0) {
      const legacyBlurPower = Math.round(
        (this.clampNumber(note.blur, 0, 20, 0) / 20) * 200,
      );
      const effectiveBlurPower = this.clampNumber(
        note.blurPower,
        0,
        200,
        legacyBlurPower,
      );
      const blurValue = note.glassEffect
        ? Number(((effectiveBlurPower / 200) * 30).toFixed(2))
        : this.clampNumber(note.blur, 0, 30, 0);
      styles += `backdrop-filter: blur(${blurValue}px); -webkit-backdrop-filter: blur(${blurValue}px);`;
      // Keep the note sleek by avoiding theme-driven borders while preserving depth.
      styles += `box-shadow: var(--glass-shadow), 0 10px 40px rgba(0,0,0,0.3);`;
    }

    return styles;
  }
});

/**
 * Sticky Notes Manager
 * Beautiful, fully animated, interactive sticky notes with WYSIWYG editing
 * Features: infinite notes, local storage, customization, drag/resize, responsive
 */

class StickyNotesManager {
  constructor(storage) {
    this.storage = storage;
    this.notes = [];
    this.maxZIndex = 1000;
    this.isVisible = true;
    this.activeNote = null;
    this.dragState = null;
    this.resizeState = null;

    // Sticky-note blur popup state (mirrors card blur popup behavior)
    this.noteBlurPopupByNoteId = new Map();
    this.noteBlurPopupPortalled = new WeakSet();
    this.noteBlurPopupPositionRaf = null;

    // Delete confirmation modal state
    this.deleteModal = null;
    this.deletePreviewEl = null;
    this.confirmDeleteBtn = null;
    this.cancelDeleteBtn = null;
    this.pendingDeleteId = null;

    // Color presets for notes (top-left remains the dashboard-linked glass default)
    this.colorPresets = [
      {
        name: "Glass (Default)",
        bg: "var(--glass-bg)",
        text: "var(--text-primary)",
        glass: true,
        blur: 20,
        transparency: 1,
      },
      { name: "Neon Rose", bg: "rgba(255, 126, 185, 0.95)", text: "#2b2030" },
      { name: "Candy Pink", bg: "rgba(255, 101, 163, 0.95)", text: "#2b1b2c" },
      { name: "Aqua Pop", bg: "rgba(122, 252, 255, 0.95)", text: "#12363a" },
      {
        name: "Butter Cream",
        bg: "rgba(254, 255, 156, 0.95)",
        text: "#3a3415",
      },
      { name: "Highlighter", bg: "rgba(255, 247, 64, 0.95)", text: "#3a2f07" },
      { name: "Mint Breeze", bg: "rgba(167, 248, 239, 0.95)", text: "#123737" },
      { name: "Lime Glow", bg: "rgba(247, 250, 109, 0.95)", text: "#35320d" },
      { name: "Soft Lilac", bg: "rgba(213, 179, 255, 0.95)", text: "#2e2440" },
      { name: "Sun Gold", bg: "rgba(255, 208, 0, 0.95)", text: "#3b2b00" },
      { name: "Blush Pop", bg: "rgba(240, 134, 190, 0.95)", text: "#3a2333" },
      { name: "Pistachio", bg: "rgba(205, 252, 147, 0.95)", text: "#23370f" },
      { name: "Bubblegum", bg: "rgba(255, 126, 205, 0.95)", text: "#3a2134" },
      { name: "Sky Mist", bg: "rgba(113, 215, 255, 0.95)", text: "#123248" },
      { name: "Orchid Tint", bg: "rgba(206, 129, 255, 0.95)", text: "#2f1f43" },
      { name: "Lemon Tint", bg: "rgba(255, 246, 139, 0.95)", text: "#3a3213" },
      { name: "Tape Mauve", bg: "rgba(219, 150, 185, 0.95)", text: "#332338" },
      { name: "Sticky Blue", bg: "rgba(22, 92, 175, 0.95)", text: "#ffffff" },
      { name: "Graph Teal", bg: "rgba(0, 200, 195, 0.95)", text: "#083534" },
      {
        name: "Custom",
        bg: "linear-gradient(135deg, rgba(255, 126, 185, 0.95), rgba(122, 252, 255, 0.95), rgba(255, 247, 64, 0.95))",
        text: "#2b2030",
        custom: true,
        defaultHex: "#ff7eb9",
      },
    ];

    this.init();
  }

  /**
   * Initialize sticky notes
   */
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

  /**
   * Load notes from storage
   */
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

  /**
   * Save notes to storage
   */
  saveNotes() {
    try {
      localStorage.setItem("stickyNotes", JSON.stringify(this.notes));
      localStorage.setItem("stickyNotesVisible", String(this.isVisible));
    } catch (e) {
      console.error("Error saving sticky notes:", e);
    }
  }

  /**
   * Create notes container
   */
  createContainer() {
    this.container = document.createElement("div");
    this.container.id = "stickyNotesContainer";
    this.container.className = "sticky-notes-container";
    document.body.appendChild(this.container);
  }

  /**
   * Create floating action buttons
   */
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

  /**
   * Update toggle button icon based on visibility
   */
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

  /**
   * Toggle notes visibility
   */
  toggleVisibility() {
    this.isVisible = !this.isVisible;
    this.applyVisibility();
    this.updateToggleButtonIcon();
    this.saveNotes();
  }

  /**
   * Apply visibility state
   */
  applyVisibility() {
    if (this.isVisible) {
      this.container.classList.remove("hidden");
      this.addBtn.classList.remove("hidden");
    } else {
      this.container.classList.add("hidden");
      this.addBtn.classList.add("hidden");
    }
  }

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

  /**
   * Create a new note
   */
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

  /**
   * Render all notes
   */
  renderAllNotes(initial = false) {
    this.container.innerHTML = "";
    this.notes.forEach((note, idx) => this.renderNote(note, idx, initial));
  }

  /**
   * Render a single note
   */
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

  /**
   * Get CSS styles for a note
   */
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

  /**
   * Adjust alpha channel of rgba color
   */
  adjustAlpha(rgba, alpha) {
    const match = rgba.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
    );
    if (match) {
      const [, r, g, b] = match;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return rgba;
  }

  clampNumber(value, min, max, fallback) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(max, Math.max(min, numeric));
  }

  normalizeHexColor(value, fallback = "#ff7eb9") {
    const normalize = (input) => {
      if (typeof input !== "string") return null;
      const match = input.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
      if (!match) return null;

      let raw = match[1].toLowerCase();
      if (raw.length === 3) {
        raw = raw
          .split("")
          .map((ch) => ch + ch)
          .join("");
      }
      return `#${raw}`;
    };

    return normalize(value) || normalize(fallback) || "#ff7eb9";
  }

  extractHexFromColorString(value) {
    if (typeof value !== "string") return null;
    const raw = value.trim();

    const hexMatch = raw.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
    if (hexMatch) {
      return this.normalizeHexColor(raw);
    }

    const rgbMatch = raw.match(
      /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)$/i,
    );
    if (!rgbMatch) return null;

    const toHex = (num) =>
      this.clampNumber(Number(num), 0, 255, 0).toString(16).padStart(2, "0");

    return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
  }

  hexToRgb(hex) {
    const normalized = this.normalizeHexColor(hex);
    const raw = normalized.slice(1);
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16),
    };
  }

  getReadableTextColorForHex(hex) {
    const { r, g, b } = this.hexToRgb(hex);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 150 ? "#1f1f1f" : "#ffffff";
  }

  getNoteCustomColorHex(note) {
    const customPreset = this.colorPresets.find((preset) => preset?.custom);
    const fallbackHex = this.normalizeHexColor(customPreset?.defaultHex);

    if (note?.color?.customHex) {
      return this.normalizeHexColor(note.color.customHex, fallbackHex);
    }

    const derivedHex = this.extractHexFromColorString(note?.color?.bg);
    if (derivedHex) {
      return this.normalizeHexColor(derivedHex, fallbackHex);
    }

    return fallbackHex;
  }

  buildCustomColorPreset(hex) {
    const normalizedHex = this.normalizeHexColor(hex);
    const { r, g, b } = this.hexToRgb(normalizedHex);
    return {
      name: "Custom",
      bg: `rgba(${r}, ${g}, ${b}, 0.95)`,
      text: this.getReadableTextColorForHex(normalizedHex),
      custom: true,
      customHex: normalizedHex,
    };
  }

  getDashboardGlassEnabled() {
    try {
      const themes = window.dashboard?.themes;
      if (themes && typeof themes.isGlassEnabled === "function") {
        return themes.isGlassEnabled();
      }

      const settings = this.storage?.getSettings?.();
      return settings?.theme?.glassEnabled !== false;
    } catch (e) {
      return true;
    }
  }

  getDashboardBlurPower() {
    try {
      const settings = this.storage?.getSettings?.();
      return this.clampNumber(settings?.uiBlurPower, 0, 200, 200);
    } catch (e) {
      return 200;
    }
  }

  getDashboardGlassOpacity() {
    try {
      const themes = window.dashboard?.themes;
      if (themes && typeof themes.getGlassOpacity === "function") {
        return this.clampNumber(themes.getGlassOpacity(), 0, 100, 35);
      }

      const settings = this.storage?.getSettings?.();
      return this.clampNumber(settings?.theme?.glassOpacity, 0, 100, 35);
    } catch (e) {
      return 35;
    }
  }

  getDashboardComponentOpacity() {
    try {
      const themes = window.dashboard?.themes;
      if (themes && typeof themes.getMainGridComponentOpacity === "function") {
        return this.clampNumber(
          themes.getMainGridComponentOpacity(),
          0,
          100,
          0,
        );
      }

      const settings = this.storage?.getSettings?.();
      return this.clampNumber(settings?.theme?.componentOpacity, 0, 100, 0);
    } catch (e) {
      return 0;
    }
  }

  getColorPresetSwatchBackground(color, note = null) {
    if (color?.custom) {
      if (note?.color?.custom === true && note?.color?.bg) {
        return note.color.bg;
      }
      return color?.bg;
    }

    if (!color?.glass) {
      return color?.bg;
    }

    let bg = color.bg;

    if (typeof bg === "string" && bg.trim().startsWith("var(")) {
      const match = bg.match(/var\((--[^)]+)\)/);
      if (match) {
        try {
          const computed = getComputedStyle(document.documentElement)
            .getPropertyValue(match[1])
            .trim();
          if (computed) bg = computed;
        } catch (e) {
          // Keep the original swatch background if computed-style lookup fails.
        }
      }
    }

    if (!this.getDashboardGlassEnabled()) {
      return bg;
    }

    const componentOpacity = this.clampNumber(
      this.getDashboardComponentOpacity(),
      0,
      100,
      0,
    );
    const adjusted = this.adjustAlpha(bg, componentOpacity / 100);
    return adjusted || bg;
  }

  refreshDefaultColorPresetSwatches(noteId = null) {
    const defaultPresetIndex = this.colorPresets.findIndex(
      (preset) => preset?.glass === true,
    );
    if (defaultPresetIndex < 0) return;

    const defaultPreset = this.colorPresets[defaultPresetIndex];
    const background = this.getColorPresetSwatchBackground(defaultPreset);
    const selector = noteId
      ? `#sticky-note-${noteId} .color-preset[data-color-index="${defaultPresetIndex}"]`
      : `.sticky-note .color-preset[data-color-index="${defaultPresetIndex}"]`;

    document.querySelectorAll(selector).forEach((btn) => {
      btn.style.background = background;
    });
  }

  getThemedIcon(emoji, size = 16) {
    if (window.dashboard?.iconThemes) {
      return window.dashboard.iconThemes.getIcon(emoji, { size });
    }
    return emoji;
  }

  normalizeNoteBlurSettings(note) {
    if (!note || typeof note !== "object") return null;

    const isLegacyDefaultGlassState =
      note.color?.glass === true &&
      note.blurState === "on" &&
      this.clampNumber(note.blurPower, 0, 200, 100) === 200 &&
      this.clampNumber(note.glassOpacity, 0, 100, 100) === 100;
    if (isLegacyDefaultGlassState) {
      note.blurState = "dashboard";
    }

    const validStates = new Set(["off", "dashboard", "on"]);
    if (!validStates.has(note.blurState)) {
      note.blurState =
        note.color?.glass === true
          ? "dashboard"
          : note.glassEffect === false
            ? "off"
            : "on";
    }

    const legacyBlurPower = Math.round(
      (this.clampNumber(note.blur, 0, 20, 10) / 20) * 200,
    );
    note.blurPower = this.clampNumber(note.blurPower, 0, 200, legacyBlurPower);
    note.blurPowerEnabled = note.blurState === "on";

    note.glassOpacity = this.clampNumber(
      note.glassOpacity,
      0,
      100,
      Math.round(this.clampNumber(note.transparency, 0, 1, 1) * 100),
    );

    return note;
  }

  applyNoteBlurState(noteId, { save = true } = {}) {
    const id = String(noteId || "").trim();
    if (!id) return;

    const note = this.notes.find((n) => String(n.id) === id);
    if (!note) return;

    this.normalizeNoteBlurSettings(note);

    const state = note.blurState;
    const dashboardGlassEnabled = this.getDashboardGlassEnabled();
    const dashboardBlurPower = this.getDashboardBlurPower();
    const dashboardGlassOpacity = this.getDashboardGlassOpacity();
    const dashboardComponentOpacity = this.getDashboardComponentOpacity();

    let effectiveGlass = false;
    if (state === "on") {
      effectiveGlass = true;
    } else if (state === "dashboard") {
      effectiveGlass = dashboardGlassEnabled;
    }

    const effectiveBlurPower = !effectiveGlass
      ? 0
      : state === "on"
        ? note.blurPower
        : dashboardBlurPower;

    const dashboardLinkedOpacity = note.color?.glass
      ? dashboardComponentOpacity
      : dashboardGlassOpacity;
    const effectiveOpacity =
      state === "on" ? note.glassOpacity : dashboardLinkedOpacity;

    // Keep legacy fields in sync so existing rendering logic remains intact.
    note.glassEffect = effectiveGlass;
    note.blur = effectiveGlass
      ? this.clampNumber(Math.round((effectiveBlurPower / 200) * 20), 0, 20, 10)
      : 0;
    note.transparency = effectiveGlass
      ? this.clampNumber(effectiveOpacity / 100, 0, 1, 1)
      : this.clampNumber(note.transparency, 0.2, 1, 1);

    this.refreshNoteStyles(id);
    this.refreshDefaultColorPresetSwatches(id);
    if (save) this.saveNotes();
  }

  ensureNoteBlurPopupPortal(menu, popup) {
    if (!menu || !popup) return;
    if (this.noteBlurPopupPortalled.has(popup)) return;

    try {
      document.body.appendChild(popup);
      popup.classList.add("blur-popup-portal");
      this.noteBlurPopupPortalled.add(popup);
    } catch (e) {}
  }

  positionNoteBlurPopup(menu, popup) {
    if (!menu || !popup || !popup.classList.contains("blur-popup-open")) {
      return;
    }

    const anchorRect = menu.getBoundingClientRect();
    const viewportPadding = 10;
    const gap = 10;

    const popupWidth = Math.max(220, Math.round(popup.offsetWidth || 280));
    const popupHeight = Math.max(200, Math.round(popup.offsetHeight || 320));

    let left = Math.round(anchorRect.right - popupWidth);
    left = Math.max(
      viewportPadding,
      Math.min(left, window.innerWidth - viewportPadding - popupWidth),
    );

    const belowTop = Math.round(anchorRect.bottom + gap);
    const aboveTop = Math.round(anchorRect.top - gap - popupHeight);
    const canFitBelow =
      belowTop + popupHeight <= window.innerHeight - viewportPadding;
    const canFitAbove = aboveTop >= viewportPadding;

    let top = belowTop;
    if (!canFitBelow && canFitAbove) {
      top = aboveTop;
    } else if (!canFitBelow && !canFitAbove) {
      top = Math.max(
        viewportPadding,
        Math.min(top, window.innerHeight - viewportPadding - popupHeight),
      );
    }

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
    popup.style.right = "auto";
    popup.style.bottom = "auto";
  }

  repositionOpenNoteBlurPopups() {
    if (this.noteBlurPopupPositionRaf) return;

    this.noteBlurPopupPositionRaf = requestAnimationFrame(() => {
      this.noteBlurPopupPositionRaf = null;

      const openMenus = document.querySelectorAll(
        ".sticky-note-blur-menu.blur-menu-open",
      );
      if (!openMenus.length) return;

      openMenus.forEach((menu) => {
        const noteId = String(menu.dataset.noteId || "").trim();
        if (!noteId) return;
        const popup = this.noteBlurPopupByNoteId.get(noteId);
        if (!popup) return;
        this.positionNoteBlurPopup(menu, popup);
      });
    });
  }

  closeAllNoteBlurMenus() {
    if (this.noteBlurPopupPositionRaf) {
      cancelAnimationFrame(this.noteBlurPopupPositionRaf);
      this.noteBlurPopupPositionRaf = null;
    }

    document
      .querySelectorAll(".sticky-note-blur-menu.blur-menu-open")
      .forEach((menu) => {
        menu.classList.remove("blur-menu-open");
        menu.closest(".sticky-note")?.classList.remove("card-blur-popup-open");

        const noteId = String(menu.dataset.noteId || "").trim();
        if (!noteId) return;
        const popup = this.noteBlurPopupByNoteId.get(noteId);
        popup?.classList.remove("blur-popup-open");
      });

    document
      .querySelectorAll(".sticky-note-blur-popup.blur-popup-open")
      .forEach((popup) => {
        popup.classList.remove("blur-popup-open");
      });
  }

  setupStickyNoteBlurMenu(noteEl, note, dropdown) {
    const menu = dropdown.querySelector(".sticky-note-blur-menu");
    const btn = menu?.querySelector(".card-blur-btn");
    const popup = menu?.querySelector(".blur-settings-popup");
    const closeBtn = popup?.querySelector(".blur-popup-close");
    const glassOptions = popup?.querySelectorAll(".blur-glass-option");
    const sliderWrap = popup?.querySelector(".blur-power-slider-wrap");
    const slider = popup?.querySelector(".blur-power-slider");
    const valueDisplay = popup?.querySelector(".blur-power-value");

    if (!menu || !btn || !popup) return;

    this.normalizeNoteBlurSettings(note);

    let opacityWrap = popup.querySelector(".blur-opacity-slider-wrap");
    if (!opacityWrap) {
      const section = document.createElement("div");
      section.className = "blur-setting-section blur-opacity-section";
      section.innerHTML = `
        <span class="blur-setting-label">Opacity</span>
        <div class="blur-power-slider-wrap blur-opacity-slider-wrap disabled">
          <input
            type="range"
            class="blur-power-slider blur-opacity-slider"
            min="0"
            max="100"
            value="${this.clampNumber(note.glassOpacity, 0, 100, 100)}"
            aria-label="Glass opacity"
          />
          <span class="blur-power-value blur-opacity-value">${this.clampNumber(
            note.glassOpacity,
            0,
            100,
            100,
          )}%</span>
        </div>
      `;
      popup.appendChild(section);
      opacityWrap = section.querySelector(".blur-opacity-slider-wrap");
    }

    const opacitySlider = popup.querySelector(".blur-opacity-slider");
    const opacityValueDisplay = popup.querySelector(".blur-opacity-value");

    const noteId = String(note.id);
    this.noteBlurPopupByNoteId.set(noteId, popup);
    this.ensureNoteBlurPopupPortal(menu, popup);

    const syncUI = () => {
      this.normalizeNoteBlurSettings(note);

      const isGlassOff = note.blurState === "off";
      const isDashboardState = note.blurState === "dashboard";

      glassOptions?.forEach((opt) => {
        const val = String(opt.dataset.glassValue || "");
        opt.classList.toggle("active", val === note.blurState);
      });

      const effectiveBlurPower = isDashboardState
        ? this.getDashboardBlurPower()
        : note.blurPower;
      if (sliderWrap) {
        sliderWrap.classList.toggle("disabled", isGlassOff || isDashboardState);
      }
      if (slider) {
        slider.value = String(effectiveBlurPower);
        slider.disabled = isGlassOff || isDashboardState;
      }
      if (valueDisplay) {
        valueDisplay.textContent = `${effectiveBlurPower}%`;
      }

      const effectiveOpacity = isDashboardState
        ? this.getDashboardGlassOpacity()
        : note.glassOpacity;
      if (opacityWrap) {
        opacityWrap.classList.toggle(
          "disabled",
          isGlassOff || isDashboardState,
        );
      }
      if (opacitySlider) {
        opacitySlider.value = String(effectiveOpacity);
        opacitySlider.disabled = isGlassOff || isDashboardState;
      }
      if (opacityValueDisplay) {
        opacityValueDisplay.textContent = `${effectiveOpacity}%`;
      }

      if (note.blurState === "off") {
        btn.innerHTML = this.getThemedIcon("⬜", 16);
      } else if (note.blurState === "on") {
        btn.innerHTML = this.getThemedIcon("✨", 16);
      } else {
        btn.innerHTML = this.getThemedIcon("🔗", 16);
      }
    };

    // Apply initial normalized state and sync controls.
    this.applyNoteBlurState(noteId, { save: false });
    syncUI();

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isOpen = menu.classList.contains("blur-menu-open");
      this.closeAllNoteBlurMenus();

      if (!isOpen) {
        menu.classList.add("blur-menu-open");
        noteEl.classList.add("card-blur-popup-open");
        popup.classList.add("blur-popup-open");
        this.ensureNoteBlurPopupPortal(menu, popup);
        this.positionNoteBlurPopup(menu, popup);
      }
    });

    closeBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      menu.classList.remove("blur-menu-open");
      noteEl.classList.remove("card-blur-popup-open");
      popup.classList.remove("blur-popup-open");
    });

    popup.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    glassOptions?.forEach((opt) => {
      opt.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const newState = String(opt.dataset.glassValue || "dashboard");
        note.blurState = ["off", "dashboard", "on"].includes(newState)
          ? newState
          : "dashboard";
        note.blurPowerEnabled = note.blurState === "on";

        this.applyNoteBlurState(noteId, { save: true });
        syncUI();
      });
    });

    slider?.addEventListener("input", (e) => {
      note.blurPower = this.clampNumber(
        parseInt(e.target.value, 10),
        0,
        200,
        100,
      );

      if (valueDisplay) {
        valueDisplay.textContent = `${note.blurPower}%`;
      }

      if (note.blurState === "on") {
        this.applyNoteBlurState(noteId, { save: true });
      }
    });

    opacitySlider?.addEventListener("input", (e) => {
      note.glassOpacity = this.clampNumber(
        parseInt(e.target.value, 10),
        0,
        100,
        100,
      );

      if (opacityValueDisplay) {
        opacityValueDisplay.textContent = `${note.glassOpacity}%`;
      }

      if (note.blurState === "on") {
        this.applyNoteBlurState(noteId, { save: true });
      }
    });
  }

  /**
   * Attach event listeners to a note
   */
  attachNoteListeners(noteEl, note) {
    const header = noteEl.querySelector(".sticky-note-header");
    const dragHandle = noteEl.querySelector(".sticky-note-drag-handle");
    const menuBtn = noteEl.querySelector(".sticky-note-menu-btn");
    const dropdown = noteEl.querySelector(".sticky-note-dropdown");
    const content = noteEl.querySelector(".sticky-note-content");
    const toolbar = noteEl.querySelector(".sticky-note-toolbar");
    const deleteBtn = noteEl.querySelector(".sticky-note-delete-btn");
    const resizeHandles = noteEl.querySelectorAll(".resize-handle");

    // Bring to front on click
    noteEl.addEventListener("mousedown", (e) => {
      if (!e.target.closest(".sticky-note-dropdown")) {
        this.bringToFront(note.id);
      }
    });

    // Drag functionality
    const startDrag = (e) => {
      // Don't block middle-click autoscroll.
      if (e && e.type === "mousedown" && e.button !== 0) return;

      if (
        e.target.closest(".sticky-note-menu-btn") ||
        e.target.closest(".sticky-note-dropdown") ||
        e.target.closest(".sticky-note-content") ||
        e.target.closest(".sticky-note-toolbar") ||
        e.target.closest(".resize-handle")
      )
        return;

      e.preventDefault();
      const rect = noteEl.getBoundingClientRect();
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);

      this.dragState = {
        noteId: note.id,
        element: noteEl,
        startX: clientX,
        startY: clientY,
        offsetX: clientX - rect.left,
        offsetY: clientY - rect.top,
        initialX: note.x,
        initialY: note.y,
      };

      noteEl.classList.add("dragging");
      document.body.classList.add("sticky-note-dragging");
    };

    header.addEventListener("mousedown", startDrag);
    header.addEventListener("touchstart", startDrag, { passive: false });

    // Menu toggle
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains("open");
      // Close all dropdowns
      document
        .querySelectorAll(".sticky-note-dropdown.open")
        .forEach((d) => d.classList.remove("open"));
      this.closeAllNoteBlurMenus();
      if (!isOpen) {
        dropdown.classList.add("open");
        // focus the first focusable element to improve keyboard UX
        requestAnimationFrame(() => {
          const firstInteractive = dropdown.querySelector(
            'button, input, a, [tabindex]:not([tabindex="-1"])',
          );
          if (firstInteractive) {
            firstInteractive.focus();
          } else {
            dropdown.focus();
          }
        });
      }
    });

    // Make dropdown keyboard accessible (role, tabindex) and close on Escape
    try {
      dropdown.setAttribute("role", "menu");
      dropdown.tabIndex = 0;
      dropdown.setAttribute("aria-label", "Note options menu");

      dropdown.addEventListener("keydown", (e) => {
        if (e.key === "Escape" || e.key === "Esc") {
          dropdown.classList.remove("open");
          this.closeAllNoteBlurMenus();
          menuBtn.focus();
        }
      });
    } catch (err) {
      // Defensive: if dropdown is not focusable in some contexts, ignore
      console.warn("Sticky note dropdown accessibility setup failed", err);
    }

    // Color preset selection
    const customColorInput = dropdown.querySelector(
      ".color-preset-custom-input",
    );
    if (customColorInput) {
      customColorInput.addEventListener("click", (e) => e.stopPropagation());
      customColorInput.addEventListener("change", (e) => {
        e.stopPropagation();
        this.updateNoteColor(
          note.id,
          this.buildCustomColorPreset(e.target.value),
        );
      });
    }

    dropdown.querySelectorAll(".color-preset").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.colorIndex, 10);
        const preset = this.colorPresets[index];
        if (!preset) return;

        if (preset.custom) {
          if (!customColorInput) return;

          const currentNote = this.notes.find((n) => n.id === note.id) || note;
          customColorInput.value = this.getNoteCustomColorHex(currentNote);

          try {
            if (typeof customColorInput.showPicker === "function") {
              customColorInput.showPicker();
            } else {
              customColorInput.click();
            }
          } catch (pickerError) {
            customColorInput.click();
          }
          return;
        }

        this.updateNoteColor(note.id, preset);
      });
    });

    // Sticky note blur menu (same interaction model as card blur popups)
    this.setupStickyNoteBlurMenu(noteEl, note, dropdown);

    // Delete button
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.showDeleteConfirmation(note.id);
    });

    // Content editing
    content.addEventListener("input", () => {
      this.updateNoteContent(note.id, content.innerHTML);
    });

    // URL detection and CTRL+click handling
    content.addEventListener("click", (e) => {
      if (e.ctrlKey || e.metaKey) {
        const selection = window.getSelection();
        const text = selection.toString().trim() || e.target.textContent.trim();
        const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
          window.open(urlMatch[0], "_blank");
        } else if (e.target.tagName === "A") {
          window.open(e.target.href, "_blank");
        }
      }
    });

    // Auto-link URLs on blur
    content.addEventListener("blur", () => {
      this.autoLinkUrls(content);
      this.updateNoteContent(note.id, content.innerHTML);
    });

    // Toolbar buttons
    toolbar.querySelectorAll(".toolbar-btn").forEach((btn) => {
      btn.addEventListener("mousedown", (e) => {
        // Prevent focus loss on left-click, but don't block middle-click autoscroll.
        if (e.button === 0) e.preventDefault();
      });
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const command = btn.dataset.command;
        const value = btn.dataset.value || null;

        // Ensure focus is on content
        content.focus();

        // Execute command
        if (command === "formatBlock" && value) {
          document.execCommand(command, false, `<${value}>`);
        } else {
          document.execCommand(command, false, value);
        }

        this.updateNoteContent(note.id, content.innerHTML);
      });
    });

    // Keyboard shortcuts for formatting
    content.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "b":
            e.preventDefault();
            document.execCommand("bold");
            break;
          case "i":
            e.preventDefault();
            document.execCommand("italic");
            break;
          case "u":
            e.preventDefault();
            document.execCommand("underline");
            break;
        }
      }
    });

    // Resize functionality
    resizeHandles.forEach((handle) => {
      const startResize = (e) => {
        // Don't block middle-click autoscroll.
        if (e && e.type === "mousedown" && e.button !== 0) return;

        e.preventDefault();
        e.stopPropagation();

        const rect = noteEl.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);

        this.resizeState = {
          noteId: note.id,
          element: noteEl,
          direction: handle.dataset.resize,
          startX: clientX,
          startY: clientY,
          startWidth: note.width,
          startHeight: note.height,
          startLeft: note.x,
          startTop: note.y,
        };

        noteEl.classList.add("resizing");
        document.body.classList.add("sticky-note-resizing");
      };

      handle.addEventListener("mousedown", startResize);
      handle.addEventListener("touchstart", startResize, { passive: false });
    });
  }

  /**
   * Auto-link URLs in content
   */
  autoLinkUrls(element) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false,
    );
    const textNodes = [];

    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    const urlRegex = /(https?:\/\/[^\s<]+)/g;

    textNodes.forEach((node) => {
      if (node.parentNode.tagName === "A") return;

      const text = node.textContent;
      if (urlRegex.test(text)) {
        const span = document.createElement("span");
        span.innerHTML = text.replace(
          urlRegex,
          '<a href="$1" class="sticky-note-link" title="Ctrl+Click to open">$1</a>',
        );
        node.parentNode.replaceChild(span, node);
      }
    });
  }

  /**
   * Setup global event listeners
   */
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

  /**
   * Handle mouse/touch move for drag and resize
   */
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

  /**
   * Handle end of drag/resize
   */
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

  /**
   * Bring a note to front
   */
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

  /**
   * Update note content
   */
  updateNoteContent(noteId, content) {
    const note = this.notes.find((n) => n.id === noteId);
    if (note) {
      note.content = content;
      note.updatedAt = Date.now();
      this.saveNotes();
    }
  }

  /**
   * Update note color
   */
  updateNoteColor(noteId, color) {
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

      this.saveNotes();
    }
  }

  /**
   * Update color preset UI
   */
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

  /**
   * Update note glass effect
   */
  updateNoteGlass(noteId, glassEffect) {
    const note = this.notes.find((n) => n.id === noteId);
    if (note) {
      note.blurState = glassEffect ? "on" : "off";
      if (!glassEffect) note.blurPowerEnabled = false;
      this.applyNoteBlurState(noteId, { save: true });
    }
  }

  /**
   * Update note blur
   */
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

  /**
   * Update note transparency
   */
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

  /**
   * Refresh note styles after update
   */
  refreshNoteStyles(noteId) {
    const note = this.notes.find((n) => n.id === noteId);
    const element = document.getElementById(`sticky-note-${noteId}`);
    if (note && element) {
      element.style.cssText = this.getNoteStyles(note);
    }
  }

  /**
   * Delete a note
   */
  deleteNote(noteId) {
    const id = String(noteId || "").trim();
    if (!id) return;

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

  /**
   * Constrain all notes to viewport
   */
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
}

// Export for use
window.StickyNotesManager = StickyNotesManager;

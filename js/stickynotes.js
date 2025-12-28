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

    // Color presets for notes (first item is the default 'Glass' style matching other section cards)
    this.colorPresets = [
      {
        name: "Glass (Default)",
        bg: "var(--glass-bg)",
        text: "var(--text-primary)",
        glass: true,
        blur: 20,
        transparency: 1,
      },
      { name: "Yellow", bg: "rgba(255, 235, 59, 0.95)", text: "#333" },
      { name: "Pink", bg: "rgba(255, 182, 193, 0.95)", text: "#333" },
      { name: "Blue", bg: "rgba(135, 206, 250, 0.95)", text: "#333" },
      { name: "Green", bg: "rgba(144, 238, 144, 0.95)", text: "#333" },
      { name: "Purple", bg: "rgba(221, 160, 221, 0.95)", text: "#333" },
      { name: "Orange", bg: "rgba(255, 200, 124, 0.95)", text: "#333" },
      { name: "Coral", bg: "rgba(255, 127, 80, 0.95)", text: "#fff" },
      { name: "Teal", bg: "rgba(64, 224, 208, 0.95)", text: "#333" },
      { name: "Mint", bg: "rgba(209, 237, 223, 0.95)", text: "#333" },
      { name: "Lavender", bg: "rgba(234, 220, 255, 0.95)", text: "#333" },
      { name: "Midnight", bg: "rgba(12, 16, 30, 0.95)", text: "#fff" },
      { name: "Sand", bg: "rgba(245, 238, 224, 0.95)", text: "#333" },
      { name: "Glass Dark", bg: "rgba(30, 30, 30, 0.85)", text: "#fff" },
      { name: "Glass Light", bg: "rgba(255, 255, 255, 0.25)", text: "#fff" },
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
    // Add Note Button
    this.addBtn = document.createElement("button");
    this.addBtn.id = "addStickyNoteBtn";
    this.addBtn.className = "sticky-note-fab sticky-note-add-btn";
    this.addBtn.title = "Add Sticky Note";
    this.addBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="12" y1="8" x2="12" y2="16"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
      </svg>
    `;
    this.addBtn.addEventListener("click", () => this.createNote());
    document.body.appendChild(this.addBtn);

    // Toggle Visibility Button
    this.toggleBtn = document.createElement("button");
    this.toggleBtn.id = "toggleStickyNotesBtn";
    this.toggleBtn.className = "sticky-note-fab sticky-note-toggle-btn";
    this.toggleBtn.title = "Toggle Sticky Notes";
    this.updateToggleButtonIcon();
    this.toggleBtn.addEventListener("click", () => this.toggleVisibility());
    document.body.appendChild(this.toggleBtn);
  }

  /**
   * Update toggle button icon based on visibility
   */
  updateToggleButtonIcon() {
    if (this.isVisible) {
      this.toggleBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      `;
      this.toggleBtn.title = "Hide Sticky Notes";
    } else {
      this.toggleBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
      `;
      this.toggleBtn.title = "Show Sticky Notes";
    }
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

    const note = {
      id,
      content: options.content || "",
      x: options.x || Math.min(offsetX, window.innerWidth - 320),
      y: options.y || Math.min(offsetY, window.innerHeight - 280),
      width: options.width || 280,
      height: options.height || 220,
      zIndex: this.maxZIndex,
      color: options.color || this.colorPresets[0],
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
                }" 
                        data-color-index="${i}" 
                        style="background: ${c.bg}"
                        title="${c.name}"></button>
              `
                )
                .join("")}
            </div>
          </div>
          <div class="sticky-note-dropdown-section">
            <label class="dropdown-label">
              <span>Glass Effect</span>
              <input type="checkbox" class="glass-toggle" ${
                note.glassEffect ? "checked" : ""
              }>
            </label>
          </div>
          <div class="sticky-note-dropdown-section">
            <label class="dropdown-label">
              <span>Blur: <span class="blur-value">${note.blur}</span>px</span>
              <input type="range" class="blur-slider" min="0" max="20" value="${
                note.blur
              }">
            </label>
          </div>
          <div class="sticky-note-dropdown-section">
            <label class="dropdown-label">
              <span>Opacity: <span class="opacity-value">${Math.round(
                note.transparency * 100
              )}</span>%</span>
              <input type="range" class="opacity-slider" min="20" max="100" value="${Math.round(
                note.transparency * 100
              )}">
            </label>
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

    // Apply transparency (overrides alpha if provided)
    if (note.transparency < 1) {
      const adjusted = this.adjustAlpha(bg, note.transparency);
      if (adjusted) bg = adjusted;
    }

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
      const blurValue = note.glassEffect ? Math.max(note.blur, 10) : note.blur;
      styles += `backdrop-filter: blur(${blurValue}px); -webkit-backdrop-filter: blur(${blurValue}px);`;
      // apply glass border and subtle glass shadow on top of the default note shadow
      styles += `border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow), 0 10px 40px rgba(0,0,0,0.3);`;
    }

    return styles;
  }

  /**
   * Adjust alpha channel of rgba color
   */
  adjustAlpha(rgba, alpha) {
    const match = rgba.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
    );
    if (match) {
      const [, r, g, b] = match;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return rgba;
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
      if (!isOpen) {
        dropdown.classList.add("open");
        // focus the first focusable element to improve keyboard UX
        requestAnimationFrame(() => {
          const firstInteractive = dropdown.querySelector(
            'button, input, a, [tabindex]:not([tabindex="-1"])'
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
          menuBtn.focus();
        }
      });
    } catch (err) {
      // Defensive: if dropdown is not focusable in some contexts, ignore
      console.warn("Sticky note dropdown accessibility setup failed", err);
    }

    // Color preset selection
    dropdown.querySelectorAll(".color-preset").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.colorIndex);
        this.updateNoteColor(note.id, this.colorPresets[index]);
      });
    });

    // Glass effect toggle
    const glassToggle = dropdown.querySelector(".glass-toggle");
    glassToggle.addEventListener("change", (e) => {
      this.updateNoteGlass(note.id, e.target.checked);
    });

    // Blur slider
    const blurSlider = dropdown.querySelector(".blur-slider");
    const blurValue = dropdown.querySelector(".blur-value");
    blurSlider.addEventListener("input", (e) => {
      blurValue.textContent = e.target.value;
      this.updateNoteBlur(note.id, parseInt(e.target.value));
    });

    // Opacity slider
    const opacitySlider = dropdown.querySelector(".opacity-slider");
    const opacityValue = dropdown.querySelector(".opacity-value");
    opacitySlider.addEventListener("input", (e) => {
      opacityValue.textContent = e.target.value;
      this.updateNoteTransparency(note.id, parseInt(e.target.value) / 100);
    });

    // Delete button
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.deleteNote(note.id);
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
        e.preventDefault(); // Prevent focus loss
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
      false
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
          '<a href="$1" class="sticky-note-link" title="Ctrl+Click to open">$1</a>'
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
        !e.target.closest(".sticky-note-dropdown")
      ) {
        document
          .querySelectorAll(".sticky-note-dropdown.open")
          .forEach((d) => d.classList.remove("open"));
      }
    });

    // Handle window resize
    window.addEventListener("resize", () => this.constrainNotesToViewport());
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
      note.color = color;

      // If this preset indicates a glass style, apply glass defaults
      if (color.glass) {
        note.glassEffect = true;
        note.blur = color.blur !== undefined ? color.blur : note.blur || 20;
        note.transparency =
          color.transparency !== undefined
            ? color.transparency
            : note.transparency;
      } else {
        // selecting a solid color removes glass effect by default
        note.glassEffect = false;
        note.blur = color.blur !== undefined ? color.blur : 0;
      }

      this.refreshNoteStyles(noteId);
      this.updateColorPresetUI(noteId, color);

      // Update dropdown UI values if present
      const noteEl = document.getElementById(`sticky-note-${noteId}`);
      if (noteEl) {
        const dropdown = noteEl.querySelector(".sticky-note-dropdown");
        if (dropdown) {
          const blurSlider = dropdown.querySelector(".blur-slider");
          const blurValue = dropdown.querySelector(".blur-value");
          if (blurSlider) {
            blurSlider.value = note.blur;
            if (blurValue) blurValue.textContent = note.blur;
          }
          const opacitySlider = dropdown.querySelector(".opacity-slider");
          const opacityValue = dropdown.querySelector(".opacity-value");
          if (opacitySlider) {
            opacitySlider.value = Math.round(note.transparency * 100);
            if (opacityValue)
              opacityValue.textContent = Math.round(note.transparency * 100);
          }
          const glassToggle = dropdown.querySelector(".glass-toggle");
          if (glassToggle) glassToggle.checked = !!note.glassEffect;
        }
      }

      this.saveNotes();
    }
  }

  /**
   * Update color preset UI
   */
  updateColorPresetUI(noteId, color) {
    const noteEl = document.getElementById(`sticky-note-${noteId}`);
    if (noteEl) {
      noteEl.querySelectorAll(".color-preset").forEach((btn) => {
        const index = parseInt(btn.dataset.colorIndex);
        btn.classList.toggle(
          "active",
          this.colorPresets[index].name === color.name
        );
      });
    }
  }

  /**
   * Update note glass effect
   */
  updateNoteGlass(noteId, glassEffect) {
    const note = this.notes.find((n) => n.id === noteId);
    if (note) {
      note.glassEffect = glassEffect;
      this.refreshNoteStyles(noteId);
      this.saveNotes();
    }
  }

  /**
   * Update note blur
   */
  updateNoteBlur(noteId, blur) {
    const note = this.notes.find((n) => n.id === noteId);
    if (note) {
      note.blur = blur;
      this.refreshNoteStyles(noteId);
      this.saveNotes();
    }
  }

  /**
   * Update note transparency
   */
  updateNoteTransparency(noteId, transparency) {
    const note = this.notes.find((n) => n.id === noteId);
    if (note) {
      note.transparency = transparency;
      this.refreshNoteStyles(noteId);
      this.saveNotes();
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
    const element = document.getElementById(`sticky-note-${noteId}`);
    if (element) {
      element.classList.add("deleting");
      setTimeout(() => {
        element.remove();
        this.notes = this.notes.filter((n) => n.id !== noteId);
        this.saveNotes();
      }, 300);
    }
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

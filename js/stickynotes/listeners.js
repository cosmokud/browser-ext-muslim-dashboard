/**
 * StickyNotesManager: note and global listeners, paste cleaning.
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

  attachNoteListeners(noteEl, note) {
    const header = noteEl.querySelector(".sticky-note-header");
    const dragHandle = noteEl.querySelector(".sticky-note-drag-handle");
    const menuBtn = noteEl.querySelector(".sticky-note-menu-btn");
    const hideAllBtn = noteEl.querySelector(".sticky-note-hide-all-btn");
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

    hideAllBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.closeAllNoteBlurMenus();
      dropdown.classList.remove("open");
      this.hideAllNotes();
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
      customColorInput.addEventListener("input", (e) => {
        e.stopPropagation();
        this.queueCustomColorPreview(note.id, e.target.value);
      });
      customColorInput.addEventListener("change", (e) => {
        e.stopPropagation();
        this.flushCustomColorPreview(note.id, {
          save: true,
          hex: e.target.value,
        });
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

        this.clearCustomColorPreviewState(note.id);
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

    // Force plain-text paste (same behavior as Ctrl+Shift+V).
    content.addEventListener("paste", (e) => {
      this.handlePlainTextPaste(e, content, note.id);
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

  handlePlainTextPaste(event, contentEl, noteId) {
    const clipboard = event.clipboardData || window.clipboardData;
    if (!clipboard) return;

    let plainText = clipboard.getData("text/plain") || "";
    if (!plainText) {
      const html = clipboard.getData("text/html") || "";
      if (html) {
        const container = document.createElement("div");
        container.innerHTML = html;
        plainText = container.textContent || container.innerText || "";
      }
    }

    plainText = plainText.replace(/\r\n?/g, "\n").replace(/\u0000/g, "");
    if (!plainText) return;

    event.preventDefault();
    this.insertPlainTextAtCursor(plainText);
    this.updateNoteContent(noteId, contentEl.innerHTML);
  }

  insertPlainTextAtCursor(text) {
    if (!text) return;

    try {
      if (
        typeof document.queryCommandSupported === "function" &&
        document.queryCommandSupported("insertText") &&
        document.execCommand("insertText", false, text)
      ) {
        return;
      }
    } catch (err) {
      // Fallback to manual range insertion when insertText is unavailable.
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const fragment = document.createDocumentFragment();
    let lastInsertedNode = null;
    text.split("\n").forEach((line, index) => {
      if (index > 0) {
        const br = document.createElement("br");
        fragment.appendChild(br);
        lastInsertedNode = br;
      }
      const textNode = document.createTextNode(line);
      fragment.appendChild(textNode);
      lastInsertedNode = textNode;
    });

    range.insertNode(fragment);

    if (lastInsertedNode) {
      range.setStartAfter(lastInsertedNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

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
});

/**
 * Notes Manager
 * Full-width Notes component with a dual-mode markdown editor.
 * Features: title editing, stackedit-like toolbar, source+preview editing,
 * paginated note selector, and local persistence.
 */

class NotesManager extends BaseManager {
  static STORAGE_KEY = "notes";
  static ITEMS_PER_PAGE = 10;
  static SCALE_MIN = 1;
  static SCALE_MAX = 5;

  static MARKDOWN_PREVIEW_STORAGE_KEY = "notes_markdown_preview";

  constructor(storage) {
    super();
    this.storage = storage;

    this.notes = [];
    this.activeNoteId = null;
    this.currentPage = 1;

    this._saveTimer = null;
    this._normalizeTimer = null;
    this._hasSelectedNote = false;

    this._previewRaf = null;

    this._editorSyncTimer = null;

    this._rawSelection = { start: 0, end: 0, direction: "none" };
    this._previewSelectionOffsets = null;
    this._allowHtmlFallbackOnNextConvert = false;
    this._cursorRecenterTimer = null;

    // Toggle between source markdown textarea and live WYSIWYG preview editor.
    this.isMarkdownPreview = false;

    // DOM
    this.card = document.getElementById("notesCard");
    this.newBtn = document.getElementById("notesNewBtn");
    this.listEl = document.getElementById("notesList");
    this.prevPageBtn = document.getElementById("notesPrevPageBtn");
    this.nextPageBtn = document.getElementById("notesNextPageBtn");
    this.pageInfoEl = document.getElementById("notesPageInfo");

    this.deleteBtn = document.getElementById("notesDeleteBtn");

    // Delete confirmation modal
    this.deleteModal = document.getElementById("notesDeleteConfirmModal");
    this.deleteNameEl = document.getElementById("notesDeleteName");
    this.confirmDeleteBtn = document.getElementById("confirmNotesDeleteBtn");
    this.cancelDeleteBtn = document.getElementById("cancelNotesDeleteBtn");
    this.pendingDeleteId = null;

    this.titleInput = document.getElementById("notesTitleInput");
    this.toolbar = document.getElementById("notesToolbar");
    this.editor = document.getElementById("notesEditor");

    this.rawEditor = document.getElementById("notesRawEditor");
    this.markdownToggleBtn = document.getElementById("notesMarkdownToggleBtn");

    this.scaleRange = document.getElementById("notesScaleRange");
    this.scaleValueEl = document.getElementById("notesScaleValue");

    if (this.deleteBtn) this.deleteBtn.disabled = true;

    if (
      !this.card ||
      !this.listEl ||
      !this.titleInput ||
      !this.toolbar ||
      !this.editor ||
      !this.rawEditor
    ) {
      // Component is optional depending on markup.
      return;
    }

    this.init();
  }

  init() {
    this.load();

    this.isMarkdownPreview = !!this.storage.get(
      NotesManager.MARKDOWN_PREVIEW_STORAGE_KEY,
      true,
    );

    this.configureMarkdownParser();

    if (!this.notes.length) {
      const note = this.createNote();
      this.save();
      this.selectNote(note.id, { skipPersistCurrent: true });
    } else {
      this.selectNote(this.activeNoteId || this.notes[0].id, {
        skipPersistCurrent: true,
      });
    }

    this.setupEventListeners();
  }

  configureMarkdownParser() {
    try {
      if (window.marked && typeof window.marked.setOptions === "function") {
        window.marked.setOptions({
          gfm: true,
          breaks: true,
          headerIds: false,
          mangle: false,
        });
      }
    } catch (e) {
      // ignore
    }
  }

  setupEventListeners() {
    if (this.newBtn) {
      this.newBtn.addEventListener("click", () => {
        // Persist current note before creating a new one.
        this.persistActiveNote({ updateTimestampIfChanged: true });

        const note = this.createNote();
        this.selectNote(note.id, { skipPersistCurrent: true });
      });
    }

    if (this.deleteBtn) {
      this.deleteBtn.addEventListener("click", () => {
        this.showDeleteConfirmation();
      });
    }

    if (this.cancelDeleteBtn) {
      this.cancelDeleteBtn.addEventListener("click", () =>
        this.hideDeleteConfirmation(),
      );
    }
    if (this.confirmDeleteBtn) {
      this.confirmDeleteBtn.addEventListener("click", () =>
        this.confirmDelete(),
      );
    }
    this._bindOverlayCloseBehavior(this.deleteModal, () =>
      this.hideDeleteConfirmation(),
    );

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      this.hideDeleteConfirmation();
    });

    if (this.prevPageBtn) {
      this.prevPageBtn.addEventListener("click", () => {
        this.scrollNotesListBy(-1);
      });
    }

    if (this.nextPageBtn) {
      this.nextPageBtn.addEventListener("click", () => {
        this.scrollNotesListBy(1);
      });
    }

    if (this.listEl) {
      this.listEl.addEventListener("scroll", () => this.updatePaginationUI(), {
        passive: true,
      });

      window.addEventListener("resize", () => this.updatePaginationUI());
    }

    // List click (select note)
    this.listEl.addEventListener("click", (e) => {
      const del = e.target.closest(".notes-list-item-delete");
      if (del) {
        const delId = String(del.dataset.noteId || "").trim();
        if (delId) this.showDeleteConfirmationForNoteId(delId);
        return;
      }

      const item = e.target.closest(".notes-list-item");
      if (!item) return;
      const id = item.dataset.noteId;
      if (!id) return;
      this.selectNote(id);
    });

    this.listEl.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const item = e.target.closest(".notes-list-item");
      if (!item) return;
      e.preventDefault();

      const id = String(item.dataset.noteId || "").trim();
      if (!id) return;
      this.selectNote(id);
    });

    // Title input
    this.titleInput.addEventListener("input", () => {
      const note = this.getActiveNote();
      if (!note) return;
      note.title = String(this.titleInput.value || "").slice(0, 120);
      note.updatedAt = Date.now();
      // Keep ordering consistent with updates
      this.notes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      this.currentPage = this.getPageForNoteId(note.id);
      this.storage.set("notes_page", this.currentPage);
      this.save();
      this.renderList();
    });

    if (this.scaleRange) {
      const onScaleInput = () => {
        const note = this.getActiveNote();
        if (!note) return;

        const scale = this.clampNumber(
          this.scaleRange.value,
          NotesManager.SCALE_MIN,
          NotesManager.SCALE_MAX,
        );
        note.scale = scale;
        this.applyScale(scale);
        this.updateScaleUi(scale);

        // Persist without reordering the list while sliding.
        this.save();
      };

      this.scaleRange.addEventListener("input", onScaleInput);
      this.scaleRange.addEventListener("change", onScaleInput);
    }

    this.toolbar.addEventListener("mousedown", (e) => {
      const btn = e.target.closest("button.notes-tool-btn");
      if (!btn) return;
      if (btn.dataset.cmd === "toggleMarkdown") return;

      // Keep the selection in the active editor instead of moving focus to toolbar button.
      e.preventDefault();
      if (this.isMarkdownPreview) {
        this.restorePreviewSelection();
      } else {
        this.restoreRawSelection();
      }
    });

    // Toolbar
    this.toolbar.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      const cmd = btn.dataset.cmd;
      const block = btn.dataset.block;
      if (!cmd && !block) return;

      e.preventDefault();

      if (cmd === "toggleMarkdown") {
        this.toggleMarkdownPreview();
        return;
      }

      this.applyToolbarAction(cmd, block);

      // Persist post-command.
      this.queueSave();
    });

    const captureRawSelection = () => this.captureRawSelection();
    ["focus", "keyup", "click", "select"].forEach((eventName) => {
      this.rawEditor.addEventListener(eventName, captureRawSelection);
    });

    // Source markdown editor (editable).
    this.rawEditor.addEventListener("input", () => {
      if (this.isMarkdownPreview) return;
      this.syncPreviewFromRawEditor();
      this.captureRawSelection();
      this.queueSave();
    });

    this.rawEditor.addEventListener("blur", () => {
      // Same blur-list-click protection as before.
      this.saveNow({ renderList: false });
      setTimeout(() => {
        try {
          const ae = document.activeElement;
          if (ae && this.listEl && this.listEl.contains(ae)) return;
        } catch (e) {}
        this.renderList();
      }, 0);
    });

    // Preview: Ctrl/Cmd-click links open in new tab; normal click doesn't navigate.
    this.editor.addEventListener("click", (e) => {
      if (!this.isMarkdownPreview) return;
      const a = e.target.closest("a");
      if (!a) return;
      try {
        const href = a.getAttribute("href");
        if (!href) return;
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          window.open(href, "_blank", "noopener");
        } else {
          e.preventDefault();
        }
      } catch (err) {
        // ignore
      }
    });

    // WYSIWYG editing in preview mode.
    this.editor.addEventListener("input", () => {
      if (!this.isMarkdownPreview) return;
      this.capturePreviewSelection();
      this.queueSave();
    });

    const capturePreviewSelection = () => {
      if (!this.isMarkdownPreview) return;
      this.capturePreviewSelection();
    };
    ["focus", "keyup", "mouseup"].forEach((eventName) => {
      this.editor.addEventListener(eventName, capturePreviewSelection);
    });

    this.editor.addEventListener("blur", () => {
      this.capturePreviewSelection();
      // Sanitize in-place on blur to reduce risk from pasted HTML.
      this.sanitizeEditorInPlace();
      this.saveNow({ renderList: false });
    });

    // Internal copy: attach markdown fragment so paste inside this app can preserve markdown formatting.
    this.editor.addEventListener("copy", (e) => {
      if (!this.isMarkdownPreview) return;
      this.writeInternalMarkdownClipboard(e);
    });

    // Paste handling: sanitize HTML fragments.
    this.editor.addEventListener("paste", (e) => {
      if (!this.isMarkdownPreview) return;
      try {
        if (!e.clipboardData) return;
        e.preventDefault();

        const internalHtml =
          e.clipboardData.getData("text/x-notes-editor-html") || "";
        const internalMarkdown =
          e.clipboardData.getData("text/x-notes-markdown") || "";

        if (String(internalHtml || "").trim()) {
          const clean = this.normalizeMarkdownHtmlForEditor(
            this.sanitizeHtml(internalHtml),
          );
          this.insertHtmlAtCursor(clean, { forceRangeInsert: true });
          this._allowHtmlFallbackOnNextConvert = false;
          this.queueSave();
          return;
        }

        if (String(internalMarkdown || "").trim()) {
          if (this.isRichMarkdownFragment(internalMarkdown)) {
            this.insertMarkdownFragmentAtCursor(internalMarkdown);
          } else {
            this.insertPlainTextAtCursor(internalMarkdown);
          }
          this._allowHtmlFallbackOnNextConvert = false;
          this.queueSave();
          return;
        }

        const text = e.clipboardData.getData("text/plain") || "";
        const html = e.clipboardData.getData("text/html") || "";
        const plain = text || this.extractPlainTextFromClipboardHtml(html);

        this.insertPlainTextAtCursor(plain);
        this._allowHtmlFallbackOnNextConvert = false;
        this.queueSave();
      } catch (err) {
        // ignore
      }
    });
  }

  writeInternalMarkdownClipboard(event) {
    try {
      if (!event || !event.clipboardData || !this.editor) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount < 1 || sel.isCollapsed) return;

      const range = sel.getRangeAt(0);
      const root =
        range.commonAncestorContainer?.nodeType === Node.TEXT_NODE
          ? range.commonAncestorContainer.parentNode
          : range.commonAncestorContainer;

      if (!root || !this.editor.contains(root)) return;

      const holder = document.createElement("div");
      holder.appendChild(range.cloneContents());

      const fragmentHtml = this.sanitizeHtml(holder.innerHTML || "");
      const withContext = this.wrapPreviewCopyWithBlockContext(
        range,
        fragmentHtml,
      );
      const markdown = this.stripInternalCursorMarkers(
        this.htmlToMarkdown(withContext),
      );
      const plain = String(sel.toString() || "");

      event.preventDefault();
      event.clipboardData.setData("text/plain", plain);
      if (String(withContext || "").trim()) {
        event.clipboardData.setData("text/x-notes-editor-html", withContext);
      }
      if (String(markdown || "").trim()) {
        event.clipboardData.setData("text/x-notes-markdown", markdown);
      }
    } catch (e) {
      // ignore
    }
  }

  wrapPreviewCopyWithBlockContext(range, fragmentHtml) {
    const html = String(fragmentHtml || "").trim();
    if (!html) return html;
    if (
      /<\s*(h[1-4]|p|blockquote|pre|ul|ol|li|table|thead|tbody|tr|th|td)\b/i.test(
        html,
      )
    ) {
      return html;
    }

    try {
      const startEl =
        range?.startContainer?.nodeType === Node.ELEMENT_NODE
          ? range.startContainer
          : range?.startContainer?.parentElement;
      const endEl =
        range?.endContainer?.nodeType === Node.ELEMENT_NODE
          ? range.endContainer
          : range?.endContainer?.parentElement;

      if (!startEl || !endEl) return html;

      const startBlock = this.findClosestPreviewBlock(startEl);
      const endBlock = this.findClosestPreviewBlock(endEl);
      if (!startBlock || startBlock !== endBlock) return html;

      const tag = String(startBlock.tagName || "").toUpperCase();
      if (tag === "H1" || tag === "H2" || tag === "H3" || tag === "H4") {
        return `<${tag.toLowerCase()}>${html}</${tag.toLowerCase()}>`;
      }

      if (tag === "BLOCKQUOTE") {
        return `<blockquote>${html}</blockquote>`;
      }

      if (tag === "PRE") {
        const text = String(range.toString() || "").trim() || "code";
        return `<pre><code>${this.escapeHtml(text)}</code></pre>`;
      }

      if (tag === "LI") {
        const list = startBlock.closest("ul,ol");
        if (!list) return `<li>${html}</li>`;
        const listTag = String(list.tagName || "UL").toLowerCase();
        const listClass = list.classList.contains("notes-checklist")
          ? ' class="notes-checklist"'
          : "";
        const checkedAttr = startBlock.getAttribute("data-checked");
        const dataChecked = checkedAttr
          ? ` data-checked="${this.escapeHtml(checkedAttr)}"`
          : "";
        return `<${listTag}${listClass}><li${dataChecked}>${html}</li></${listTag}>`;
      }

      if (tag === "P") {
        return `<p>${html}</p>`;
      }
    } catch (e) {
      // ignore
    }

    return html;
  }

  findClosestPreviewBlock(el) {
    if (!el || !this.editor) return null;
    const node = el.nodeType === Node.ELEMENT_NODE ? el : el.parentElement;
    if (!node || !node.closest) return null;
    const block = node.closest("h1,h2,h3,h4,p,blockquote,pre,li");
    if (!block) return null;
    return this.editor.contains(block) ? block : null;
  }

  insertPlainTextAtCursor(text) {
    const plain = String(text || "").replace(/\r\n?/g, "\n");
    if (!plain) return;

    try {
      if (document.execCommand("insertText", false, plain)) return;
    } catch (e) {
      // ignore
    }

    try {
      const safeText = this.escapeHtml(plain).replace(/\n/g, "<br>");
      document.execCommand("insertHTML", false, safeText);
    } catch (e) {
      // ignore
    }
  }

  insertMarkdownFragmentAtCursor(markdown) {
    const md = this.stripInternalCursorMarkers(String(markdown || ""));
    if (!md.trim()) return;

    const html = this.normalizeMarkdownHtmlForEditor(this.renderMarkdown(md));
    try {
      if (document.execCommand("insertHTML", false, html)) return;
    } catch (e) {
      // ignore
    }

    this.insertPlainTextAtCursor(md);
  }

  extractPlainTextFromClipboardHtml(html) {
    const host = document.createElement("div");
    host.innerHTML = String(html || "");
    return String(host.textContent || host.innerText || "").replace(
      /\r\n?/g,
      "\n",
    );
  }

  isRichMarkdownFragment(markdown) {
    const md = String(markdown || "").trim();
    if (!md) return false;

    // Treat as rich only when explicit markdown structure/tokens exist.
    if (/^#{1,6}\s+/m.test(md)) return true;
    if (/^\s*([*+-]|\d+\.)\s+/m.test(md)) return true;
    if (/```|`[^`]+`/.test(md)) return true;
    if (/\*\*[^*]+\*\*|__[^_]+__/.test(md)) return true;
    if (/\*[^*]+\*|_[^_]+_/.test(md)) return true;
    if (/~~[^~]+~~/.test(md)) return true;
    if (/!\[[^\]]*\]\([^\)]+\)/.test(md)) return true;
    if (/\[[^\]]+\]\([^\)]+\)/.test(md)) return true;
    if (/^>\s+/m.test(md)) return true;
    if (/^\|.*\|/m.test(md)) return true;

    return false;
  }

  reloadFromStorage() {
    const prevActive = this.activeNoteId;
    this.load();
    if (!this.notes.length) {
      const note = this.createNote();
      this.save();
      this.selectNote(note.id, { skipPersistCurrent: true });
    } else {
      this.selectNote(
        prevActive && this.notes.some((n) => n.id === prevActive)
          ? prevActive
          : this.notes[0].id,
        { skipPersistCurrent: true },
      );
    }
  }

  load() {
    const saved = this.storage.get(NotesManager.STORAGE_KEY, []);
    const notes = Array.isArray(saved) ? saved : [];

    // Defensive normalization
    this.notes = notes
      .filter((n) => n && typeof n === "object")
      .map((n) => {
        const id = String(n.id || "").trim() || this.generateId();
        const title = String(n.title || "Untitled").slice(0, 120);
        const rawHtml = this.stripInternalCursorMarkers(
          typeof n.html === "string" ? n.html : "",
        );
        const mdRaw =
          typeof n.md === "string"
            ? n.md
            : typeof n.markdown === "string"
              ? n.markdown
              : "";
        const contentMode = this.normalizeContentMode(
          n.contentMode,
          `${mdRaw}\n${rawHtml}`,
        );
        const html = rawHtml
          ? this.stripInternalCursorMarkers(
              this.sanitizeHtml(rawHtml, {
                preserveFormatting: contentMode === "html",
              }),
            )
          : "";
        const md = this.stripInternalCursorMarkers(
          mdRaw ||
            (contentMode === "html"
              ? this.sanitizeHtml(html, { preserveFormatting: true })
              : this.htmlToMarkdown(html)),
        );
        const rawScale =
          typeof n.scale === "number" || typeof n.scale === "string"
            ? parseFloat(n.scale)
            : NotesManager.SCALE_MIN;
        const scale = Number.isNaN(rawScale)
          ? NotesManager.SCALE_MIN
          : Math.max(
              NotesManager.SCALE_MIN,
              Math.min(NotesManager.SCALE_MAX, rawScale),
            );
        const createdAt =
          typeof n.createdAt === "number" ? n.createdAt : Date.now();
        const updatedAt =
          typeof n.updatedAt === "number" ? n.updatedAt : createdAt;
        return {
          id,
          title,
          md,
          html,
          contentMode,
          scale,
          createdAt,
          updatedAt,
        };
      })
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    const lastActive = this.storage.get("notes_active", null);
    this.activeNoteId = typeof lastActive === "string" ? lastActive : null;

    const lastPage = this.storage.get("notes_page", 1);
    this.currentPage = this.clampInt(
      lastPage,
      1,
      Math.max(1, this.getTotalPages()),
    );
  }

  save() {
    this.storage.set(NotesManager.STORAGE_KEY, this.notes);
    if (this.activeNoteId) this.storage.set("notes_active", this.activeNoteId);
    this.storage.set("notes_page", this.currentPage);
  }

  saveNow({ renderList } = {}) {
    const shouldRenderList = renderList !== false;
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }

    const note = this.getActiveNote();
    if (note) {
      const nextTitle = String(this.titleInput.value || "").slice(0, 120);
      let nextMd = "";
      let nextHtml = "";
      let nextContentMode = "markdown";

      if (this.isMarkdownPreview) {
        // Markdown mode: editable rendered view is the source-of-truth.
        const keepHtml = !!this._allowHtmlFallbackOnNextConvert;
        const rawHtml = String(this.editor.innerHTML || "");
        const sanitized = keepHtml
          ? this.sanitizeHtml(rawHtml, { preserveFormatting: true })
          : this.normalizeMarkdownHtmlForEditor(this.sanitizeHtml(rawHtml));
        nextHtml = this.stripInternalCursorMarkers(sanitized);
        nextMd = this.stripInternalCursorMarkers(
          this.htmlToMarkdown(nextHtml, {
            allowFallbackHtml: keepHtml,
          }),
        );
        nextContentMode = keepHtml ? "html" : "markdown";
        this._allowHtmlFallbackOnNextConvert = false;

        // Keep raw viewer in sync.
        if (String(this.rawEditor.value || "") !== nextMd) {
          this.rawEditor.value = nextMd;
        }
      } else {
        // Source mode uses the markdown textarea as source-of-truth.
        this._allowHtmlFallbackOnNextConvert = false;
        nextMd = this.stripInternalCursorMarkers(
          String(this.rawEditor.value || note.md || ""),
        );
        nextContentMode = "markdown";
        nextHtml = this.renderMarkdown(nextMd);
      }

      const changed =
        nextTitle !== String(note.title || "") ||
        nextMd !== String(note.md || "") ||
        nextHtml !== String(note.html || "") ||
        nextContentMode !==
          this.normalizeContentMode(note.contentMode, note.md);

      note.title = nextTitle;
      note.md = nextMd;
      note.html = nextHtml;
      note.contentMode = nextContentMode;
      if (changed) note.updatedAt = Date.now();
    }

    // Keep most-recent-first ordering
    this.notes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    this.currentPage = this.getPageForNoteId(this.activeNoteId);
    this.storage.set("notes_page", this.currentPage);

    this.save();
    if (shouldRenderList) this.renderList();

    // No live re-render: in markdown mode the editor itself is authoritative.
  }

  queueSave() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.saveNow(), 450);
  }

  queueNormalize() {
    if (this._normalizeTimer) clearTimeout(this._normalizeTimer);
    this._normalizeTimer = setTimeout(() => this.normalizeNow(), 650);
  }

  normalizeAndSaveSoon() {
    this.normalizeNow();
    this.queueSave();
  }

  createNote() {
    const id = this.generateId();
    const now = Date.now();

    const note = {
      id,
      title: "Untitled",
      md: "",
      html: "<p></p>",
      contentMode: "markdown",
      scale: NotesManager.SCALE_MIN,
      createdAt: now,
      updatedAt: now,
    };

    this.notes.unshift(note);

    // New notes should be visible (most recent -> page 1)
    this.currentPage = 1;
    this.storage.set("notes_page", 1);

    return note;
  }

  selectNote(id, { skipPersistCurrent } = {}) {
    const note = this.notes.find((n) => n.id === id);
    if (!note) return;

    if (this._hasSelectedNote && this.activeNoteId === id) {
      const s = this.clampNumber(
        typeof note.scale === "number" ? note.scale : 1,
        NotesManager.SCALE_MIN,
        NotesManager.SCALE_MAX,
      );
      this.applyScale(s);
      this.updateScaleUi(s);
      return;
    }

    // Persist current note before switching
    if (!skipPersistCurrent) {
      const changed = this.persistActiveNote({
        updateTimestampIfChanged: true,
      });
      if (changed) {
        this.notes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      }
    }

    this.activeNoteId = id;
    this.storage.set("notes_active", id);

    this.titleInput.value = note.title || "";
    this.rawEditor.value = String(note.md || "");
    this.renderActiveMarkdownPreview();
    this.applyEditorMode();

    const scale = this.clampNumber(
      note.scale,
      NotesManager.SCALE_MIN,
      NotesManager.SCALE_MAX,
    );
    note.scale = scale;
    this.applyScale(scale);
    this.updateScaleUi(scale);

    if (this.deleteBtn) this.deleteBtn.disabled = false;

    if (this.isMarkdownPreview) {
      this.placeCaretAtEnd(this.editor);
      this.capturePreviewSelection();
    } else {
      this.placeCaretAtEndTextArea(this.rawEditor);
      this.captureRawSelection();
    }

    this.currentPage = this.getPageForNoteId(id);
    this.storage.set("notes_page", this.currentPage);
    this.save();
    this.renderList();

    this._hasSelectedNote = true;
  }

  persistActiveNote({ updateTimestampIfChanged } = {}) {
    const current = this.getActiveNote();
    if (!current) return false;

    const nextTitle = String(this.titleInput.value || "").slice(0, 120);
    let nextMd = "";
    let nextHtml = "";
    let nextContentMode = "markdown";

    if (this.isMarkdownPreview) {
      const keepHtml = !!this._allowHtmlFallbackOnNextConvert;
      const rawHtml = String(this.editor.innerHTML || "");
      const sanitized = keepHtml
        ? this.sanitizeHtml(rawHtml, { preserveFormatting: true })
        : this.normalizeMarkdownHtmlForEditor(this.sanitizeHtml(rawHtml));
      nextHtml = this.stripInternalCursorMarkers(sanitized);
      nextMd = this.stripInternalCursorMarkers(
        this.htmlToMarkdown(nextHtml, {
          allowFallbackHtml: keepHtml,
        }),
      );
      nextContentMode = keepHtml ? "html" : "markdown";
      this._allowHtmlFallbackOnNextConvert = false;
      if (String(this.rawEditor.value || "") !== nextMd) {
        this.rawEditor.value = nextMd;
      }
    } else {
      this._allowHtmlFallbackOnNextConvert = false;
      nextMd = this.stripInternalCursorMarkers(
        String(this.rawEditor.value || ""),
      );
      nextContentMode = "markdown";
      nextHtml = this.renderMarkdown(nextMd);
    }

    const changed =
      nextTitle !== String(current.title || "") ||
      nextMd !== String(current.md || "") ||
      nextHtml !== current.html ||
      nextContentMode !==
        this.normalizeContentMode(current.contentMode, current.md);

    current.title = nextTitle;
    current.md = nextMd;
    current.html = nextHtml;
    current.contentMode = nextContentMode;
    if (changed && updateTimestampIfChanged) current.updatedAt = Date.now();
    return changed;
  }

  applyScale(scale) {
    const n = this.clampNumber(
      scale,
      NotesManager.SCALE_MIN,
      NotesManager.SCALE_MAX,
    );
    try {
      this.editor.style.setProperty("--notes-scale", String(n));
      this.rawEditor.style.setProperty("--notes-scale", String(n));
    } catch (e) {
      // ignore
    }
  }

  toggleMarkdownPreview() {
    let targetRawCaret = null;
    let targetPreview = null;

    if (this.isMarkdownPreview) {
      this.capturePreviewSelection();
      targetRawCaret = this.mapPreviewCursorToRawCaret();
    } else {
      this.captureRawSelection();
      targetPreview = this.preparePreviewFromRawCaret();
    }

    // Persist before switching modes so we don't lose edits.
    this.persistActiveNote({ updateTimestampIfChanged: true });

    this.isMarkdownPreview = !this.isMarkdownPreview;
    this.storage.set(
      NotesManager.MARKDOWN_PREVIEW_STORAGE_KEY,
      this.isMarkdownPreview,
    );
    this.applyEditorMode();

    if (this.isMarkdownPreview) {
      if (targetPreview && typeof targetPreview.html === "string") {
        this.editor.innerHTML = targetPreview.html;
      } else {
        this.renderActiveMarkdownPreview();
      }

      try {
        this.editor.focus();
      } catch (e) {
        // ignore
      }

      if (
        targetPreview &&
        typeof targetPreview.offset === "number" &&
        Number.isFinite(targetPreview.offset)
      ) {
        this.restoreSelectionOffsets(this.editor, {
          start: targetPreview.offset,
          end: targetPreview.offset,
        });
      } else {
        this.placeCaretAtEnd(this.editor);
      }

      this.scheduleModeSwitchRecenter("preview");
    } else {
      this.renderActiveMarkdownPreview();

      if (
        typeof targetRawCaret === "number" &&
        Number.isFinite(targetRawCaret)
      ) {
        const caret = Math.max(
          0,
          Math.min(targetRawCaret, String(this.rawEditor.value || "").length),
        );
        try {
          this.rawEditor.focus();
          this.rawEditor.setSelectionRange(caret, caret);
        } catch (e) {}
      } else {
        this.placeCaretAtEndTextArea(this.rawEditor);
      }

      this.scheduleModeSwitchRecenter("source");
    }
  }

  applyEditorMode() {
    // Preview mode = editable rendered markdown. Source mode = editable markdown text.
    const isPreview = !!this.isMarkdownPreview;

    this.rawEditor.classList.toggle("hidden", isPreview);
    this.editor.classList.toggle("hidden", !isPreview);

    try {
      this.rawEditor.readOnly = false;
      this.rawEditor.setAttribute("aria-readonly", "false");
    } catch (e) {}

    this.editor.classList.toggle("notes-md-preview", isPreview);
    this.editor.setAttribute("contenteditable", isPreview ? "true" : "false");

    try {
      if (this.card) {
        this.card.classList.toggle("notes-preview-mode", isPreview);
        this.card.classList.toggle("notes-source-mode", !isPreview);
      }

      if (this.markdownToggleBtn) {
        this.markdownToggleBtn.classList.toggle("active", isPreview);
        this.markdownToggleBtn.dataset.mode = isPreview ? "preview" : "source";
        this.markdownToggleBtn.setAttribute(
          "title",
          isPreview ? "Switch to source mode" : "Switch to preview mode",
        );
        this.markdownToggleBtn.setAttribute(
          "aria-label",
          isPreview ? "Switch to source mode" : "Switch to preview mode",
        );
        this.markdownToggleBtn.setAttribute(
          "aria-pressed",
          isPreview ? "true" : "false",
        );
      }
    } catch (e) {
      // ignore
    }
  }

  renderActiveMarkdownPreview() {
    const note = this.getActiveNote();
    if (!note) return;

    const markdown = this.stripInternalCursorMarkers(
      String(note.md || this.rawEditor.value || ""),
    );
    if (String(this.rawEditor.value || "") !== markdown) {
      this.rawEditor.value = markdown;
    }
    if (String(note.md || "") !== markdown) {
      note.md = markdown;
    }

    const html = this.stripInternalCursorMarkers(
      this.normalizeMarkdownHtmlForEditor(this.renderMarkdown(markdown)),
    );
    if (String(this.editor.innerHTML || "") !== html) {
      this.editor.innerHTML = html;
    }
    if (String(note.html || "") !== html) {
      note.html = html;
    }
  }

  mapPreviewCursorToRawCaret() {
    try {
      const offsets =
        this.getSelectionOffsets(this.editor) || this._previewSelectionOffsets;
      if (!offsets) return null;

      const rawSource = String(this.rawEditor.value || "");
      const active = this.getActiveNote();
      const mode = this.normalizeContentMode(active?.contentMode, rawSource);
      const treatRawAsHtml =
        mode === "html" || this.isRichHtmlDocument(rawSource);

      const marker = "NOTESCURSORRAWTOKENA9F3";
      const htmlWithMarker = this.insertTextMarkerAtPreviewOffset(
        String(this.editor.innerHTML || ""),
        offsets.end,
        marker,
      );
      const mdWithMarker = this.htmlToMarkdown(htmlWithMarker, {
        allowFallbackHtml: treatRawAsHtml,
        preserveCursorMarker: true,
      });
      const idx = String(mdWithMarker || "").indexOf(marker);
      if (idx >= 0) return idx;
    } catch (e) {
      // ignore
    }

    try {
      const raw = String(this.rawEditor.value || "");
      const fallback =
        typeof this._rawSelection?.start === "number"
          ? this._rawSelection.start
          : raw.length;
      return Math.max(0, Math.min(fallback, raw.length));
    } catch (e) {
      return null;
    }
  }

  preparePreviewFromRawCaret() {
    try {
      const raw = String(this.rawEditor.value || "");
      const caret =
        typeof this.rawEditor.selectionStart === "number"
          ? this.rawEditor.selectionStart
          : typeof this._rawSelection?.start === "number"
            ? this._rawSelection.start
            : raw.length;

      const pos = Math.max(0, Math.min(caret, raw.length));
      const marker = "NOTESCURSORPREVIEWTOKENA9F3";
      const mdWithMarker = `${raw.slice(0, pos)}${marker}${raw.slice(pos)}`;
      const htmlWithMarker = this.normalizeMarkdownHtmlForEditor(
        this.renderMarkdown(mdWithMarker),
      );

      const wrapper = document.createElement("div");
      wrapper.innerHTML = htmlWithMarker;

      const offset = this.removeTextMarkerAndGetOffset(wrapper, marker);
      return {
        html: wrapper.innerHTML,
        offset: typeof offset === "number" ? offset : null,
      };
    } catch (e) {
      return null;
    }
  }

  insertTextMarkerAtPreviewOffset(html, offset, marker) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");

    const textOffset = Math.max(0, parseInt(offset, 10) || 0);
    const pos = this.findTextPosition(wrapper, textOffset);

    if (!pos) {
      wrapper.appendChild(document.createTextNode(marker));
      return wrapper.innerHTML;
    }

    const node = pos.node;
    const value = String(node.nodeValue || "");
    const idx = Math.max(0, Math.min(pos.offset, value.length));
    node.nodeValue = `${value.slice(0, idx)}${marker}${value.slice(idx)}`;
    return wrapper.innerHTML;
  }

  removeTextMarkerAndGetOffset(root, marker) {
    const m = String(marker || "");
    if (!root || !m) return null;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = String(node.nodeValue || "");
      const idx = text.indexOf(m);
      if (idx < 0) continue;

      let offset = null;
      try {
        const range = document.createRange();
        range.selectNodeContents(root);
        range.setEnd(node, idx);
        offset = range.toString().length;
      } catch (e) {
        offset = null;
      }

      node.nodeValue = `${text.slice(0, idx)}${text.slice(idx + m.length)}`;
      return offset;
    }

    return null;
  }

  scheduleModeSwitchRecenter(mode) {
    if (this._cursorRecenterTimer) {
      clearTimeout(this._cursorRecenterTimer);
      this._cursorRecenterTimer = null;
    }

    const run = () => {
      const wantsPreview = mode === "preview";
      if (wantsPreview !== !!this.isMarkdownPreview) return;

      if (wantsPreview) {
        this.scrollPreviewSelectionIntoView();
        this.capturePreviewSelection();
      } else {
        this.scrollRawSelectionIntoView();
        this.captureRawSelection();
      }
    };

    run();
    requestAnimationFrame(() => {
      run();
      this._cursorRecenterTimer = setTimeout(() => run(), 90);
    });
  }

  scrollRawSelectionIntoView() {
    if (!this.rawEditor) return;

    try {
      const t = this.rawEditor;
      const raw = String(t.value || "");
      const caret =
        typeof t.selectionStart === "number"
          ? t.selectionStart
          : typeof this._rawSelection?.start === "number"
            ? this._rawSelection.start
            : 0;

      const boundedCaret = Math.max(0, Math.min(caret, raw.length));
      const caretPixel = this.getTextareaCaretPixelPosition(t, boundedCaret);
      const lineHeight = Math.max(12, caretPixel.lineHeight || 20);
      const targetTop = caretPixel.top - (t.clientHeight - lineHeight) / 2;
      const targetLeft = caretPixel.left - t.clientWidth / 2;

      const maxTop = Math.max(0, t.scrollHeight - t.clientHeight);
      const maxLeft = Math.max(0, t.scrollWidth - t.clientWidth);

      t.scrollTop = Math.max(0, Math.min(targetTop, maxTop));
      t.scrollLeft = Math.max(0, Math.min(targetLeft, maxLeft));
    } catch (e) {
      // ignore
    }
  }

  getTextareaCaretPixelPosition(textarea, caretIndex) {
    const t = textarea;
    const value = String(t?.value || "");
    const index = Math.max(0, Math.min(caretIndex, value.length));

    const styles = window.getComputedStyle(t);
    const fallbackLineHeight =
      parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) || 16;

    let mirror = null;
    try {
      mirror = document.createElement("div");
      mirror.setAttribute("aria-hidden", "true");
      mirror.style.position = "absolute";
      mirror.style.left = "-99999px";
      mirror.style.top = "0";
      mirror.style.visibility = "hidden";
      mirror.style.pointerEvents = "none";
      mirror.style.whiteSpace = "pre-wrap";
      mirror.style.wordBreak = "break-word";
      mirror.style.overflowWrap = "anywhere";

      mirror.style.boxSizing = styles.boxSizing;
      mirror.style.width = `${t.offsetWidth}px`;
      mirror.style.height = styles.height;
      mirror.style.padding = styles.padding;
      mirror.style.border = styles.border;
      mirror.style.font = styles.font;
      mirror.style.lineHeight = styles.lineHeight;
      mirror.style.letterSpacing = styles.letterSpacing;
      mirror.style.tabSize = styles.tabSize;
      mirror.style.textTransform = styles.textTransform;
      mirror.style.textIndent = styles.textIndent;

      mirror.textContent = value.slice(0, index);

      const marker = document.createElement("span");
      marker.textContent = "\u200b";
      marker.style.display = "inline-block";
      marker.style.width = "1px";
      marker.style.height = "1em";
      mirror.appendChild(marker);

      document.body.appendChild(mirror);

      return {
        top: marker.offsetTop,
        left: marker.offsetLeft,
        lineHeight: fallbackLineHeight,
      };
    } catch (e) {
      return {
        top: 0,
        left: 0,
        lineHeight: fallbackLineHeight,
      };
    } finally {
      if (mirror && mirror.parentNode) {
        mirror.parentNode.removeChild(mirror);
      }
    }
  }

  scrollPreviewSelectionIntoView() {
    if (!this.editor) return;

    try {
      const offsets =
        this.getSelectionOffsets(this.editor) || this._previewSelectionOffsets;
      if (!offsets) return;

      const pos = this.findTextPosition(this.editor, offsets.end);
      if (!pos) return;

      const range = document.createRange();
      range.setStart(pos.node, pos.offset);
      range.collapse(true);

      const marker = document.createElement("span");
      marker.setAttribute("aria-hidden", "true");
      marker.textContent = "\u200b";
      marker.style.cssText =
        "display:inline-block;width:1px;height:1em;opacity:0;pointer-events:none;";
      range.insertNode(marker);

      const markerRect = marker.getBoundingClientRect();
      const containerRect = this.editor.getBoundingClientRect();
      const absoluteTop =
        markerRect.top -
        containerRect.top +
        this.editor.scrollTop +
        markerRect.height / 2;
      const absoluteLeft =
        markerRect.left -
        containerRect.left +
        this.editor.scrollLeft +
        markerRect.width / 2;

      const targetTop = absoluteTop - this.editor.clientHeight / 2;
      const targetLeft = absoluteLeft - this.editor.clientWidth / 2;

      const maxTop = Math.max(
        0,
        this.editor.scrollHeight - this.editor.clientHeight,
      );
      const maxLeft = Math.max(
        0,
        this.editor.scrollWidth - this.editor.clientWidth,
      );

      this.editor.scrollTop = Math.max(0, Math.min(targetTop, maxTop));
      this.editor.scrollLeft = Math.max(0, Math.min(targetLeft, maxLeft));

      if (marker.parentNode) marker.parentNode.removeChild(marker);
      this.restoreSelectionOffsets(this.editor, offsets);
    } catch (e) {
      // ignore
    }
  }

  syncPreviewFromRawEditor() {
    const markdown = this.stripInternalCursorMarkers(
      String(this.rawEditor.value || ""),
    );
    if (String(this.rawEditor.value || "") !== markdown) {
      this.rawEditor.value = markdown;
    }
    const html = this.normalizeMarkdownHtmlForEditor(
      this.renderMarkdown(markdown),
    );
    if (String(this.editor.innerHTML || "") !== html) {
      this.editor.innerHTML = html;
    }
  }

  queuePreviewRender() {
    if (this._previewRaf) return;
    this._previewRaf = requestAnimationFrame(() => {
      this._previewRaf = null;
      if (!this.isMarkdownPreview) return;
      this.renderActiveMarkdownPreview();
    });
  }

  sanitizeEditorInPlace() {
    if (!this.isMarkdownPreview) return;
    try {
      const offsets = this.getSelectionOffsets(this.editor);
      const keepHtml = !!this._allowHtmlFallbackOnNextConvert;
      const cleanedRaw = this.sanitizeHtml(
        String(this.editor.innerHTML || ""),
        {
          preserveFormatting: keepHtml,
        },
      );
      const cleaned = keepHtml
        ? cleanedRaw
        : this.normalizeMarkdownHtmlForEditor(cleanedRaw);
      if (String(this.editor.innerHTML || "") !== cleaned) {
        this.editor.innerHTML = cleaned;
        this.restoreSelectionOffsets(this.editor, offsets);
      }
    } catch (e) {
      // ignore
    }
  }

  normalizeMarkdownHtmlForEditor(html) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html || "";

    // Convert markdown task lists (marked renders them as <input type=checkbox>)
    // into our checklist representation (UL.notes-checklist + LI[data-checked])
    // so htmlToMarkdown can round-trip accurately.
    const lists = new Set();
    wrapper.querySelectorAll('li > input[type="checkbox"]').forEach((input) => {
      const li = input.closest("li");
      if (!li) return;
      const list = li.closest("ul,ol");
      if (list) lists.add(list);

      const checked =
        input.hasAttribute("checked") ||
        String(input.getAttribute("aria-checked") || "") === "true" ||
        input.checked === true;

      li.setAttribute("data-checked", checked ? "true" : "false");

      try {
        input.remove();
      } catch (e) {
        // ignore
      }

      // Trim any leading whitespace left behind.
      if (li.firstChild && li.firstChild.nodeType === Node.TEXT_NODE) {
        li.firstChild.nodeValue = (li.firstChild.nodeValue || "").replace(
          /^\s+/,
          "",
        );
      }
    });

    lists.forEach((list) => {
      try {
        list.classList.add("notes-checklist");
        list.querySelectorAll("li").forEach((li) => {
          if (!li.getAttribute("data-checked"))
            li.setAttribute("data-checked", "false");
        });
      } catch (e) {
        // ignore
      }
    });

    // Remove any remaining checkbox inputs so the editor stays non-interactive.
    wrapper.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      try {
        input.remove();
      } catch (e) {
        // ignore
      }
    });

    return wrapper.innerHTML;
  }

  renderMarkdown(markdown) {
    const md = String(markdown || "");

    if (this.isRichHtmlDocument(md)) {
      return this.sanitizeHtml(md, { preserveFormatting: true });
    }

    let html = "";
    try {
      if (window.marked && typeof window.marked.parse === "function") {
        html = window.marked.parse(md);
      } else {
        html = this.escapeHtml(md).replace(/\n/g, "<br>");
      }
    } catch (e) {
      html = this.escapeHtml(md).replace(/\n/g, "<br>");
    }

    return this.sanitizeHtml(html);
  }

  placeCaretAtEndTextArea(el) {
    try {
      el.focus();
      const v = String(el.value || "");
      el.setSelectionRange(v.length, v.length);
    } catch (e) {
      // ignore
    }
  }

  applyMarkdownCommand(cmd) {
    const c = String(cmd || "");
    const t = this.rawEditor;
    const inlineWrapCommands = new Set([
      "bold",
      "italic",
      "underline",
      "strikeThrough",
      "inlineCode",
    ]);

    let value = String(t.value || "");
    let start = typeof t.selectionStart === "number" ? t.selectionStart : 0;
    let end = typeof t.selectionEnd === "number" ? t.selectionEnd : start;

    if (start === end && inlineWrapCommands.has(c)) {
      const bounds = this.getWordBoundsAt(value, start);
      if (bounds) {
        start = bounds.start;
        end = bounds.end;
        try {
          t.setSelectionRange(start, end);
        } catch (e) {}
      }
    }

    const toggleWrap = (left, right = left) => {
      const l = String(left);
      const r = String(right);

      value = String(t.value || "");
      const before = value.slice(0, start);
      const selected = value.slice(start, end);
      const after = value.slice(end);

      // Selection: unwrap if already wrapped, else wrap.
      if (start !== end) {
        const hasLeft = value.slice(Math.max(0, start - l.length), start) === l;
        const hasRight = value.slice(end, end + r.length) === r;

        if (hasLeft && hasRight) {
          const next = `${value.slice(
            0,
            start - l.length,
          )}${selected}${value.slice(end + r.length)}`;
          t.value = next;
          const nextStart = start - l.length;
          const nextEnd = nextStart + selected.length;
          t.setSelectionRange(nextStart, nextEnd);
          return;
        }

        const next = `${before}${l}${selected}${r}${after}`;
        t.value = next;
        const nextStart = start + l.length;
        const nextEnd = nextStart + selected.length;
        t.setSelectionRange(nextStart, nextEnd);
        return;
      }

      // No selection: remove surrounding wrap if cursor is inside, else insert.
      const leftStart = start - l.length;
      const rightEnd = end + r.length;
      const hasLeft = leftStart >= 0 && value.slice(leftStart, start) === l;
      const hasRight = value.slice(end, rightEnd) === r;

      if (hasLeft && hasRight) {
        const next = `${value.slice(0, leftStart)}${value.slice(
          start,
          end,
        )}${value.slice(rightEnd)}`;
        t.value = next;
        t.setSelectionRange(leftStart, leftStart);
        return;
      }

      const next = `${before}${l}${r}${after}`;
      t.value = next;
      const cursor = start + l.length;
      t.setSelectionRange(cursor, cursor);
    };

    if (c === "bold") return toggleWrap("**", "**");
    if (c === "italic") return toggleWrap("*", "*");
    if (c === "underline") return toggleWrap("<u>", "</u>");
    if (c === "strikeThrough") return toggleWrap("~~", "~~");
    if (c === "inlineCode") return toggleWrap("`", "`");

    if (c === "insertLink") return this.insertMarkdownLink();
    if (c === "insertImage") return this.insertMarkdownImage();
    if (c === "codeBlock") return this.insertMarkdownCodeBlock();
    if (c === "insertTable") return this.insertMarkdownTable();
    if (c === "insertHr") return this.insertMarkdownHorizontalRule();
    if (c === "quote") return this.toggleLinePrefix("> ");

    // Lists
    if (c === "insertUnorderedList") return this.toggleLinePrefix("- ");
    if (c === "insertOrderedList") return this.toggleNumberedList();
  }

  applyMarkdownChecklist() {
    this.toggleChecklistPrefix();
  }

  applyMarkdownBlock(blockTag) {
    const t = String(blockTag || "").toUpperCase();
    const map = { H1: "# ", H2: "## ", H3: "### ", H4: "#### ", P: "" };
    if (!Object.prototype.hasOwnProperty.call(map, t)) return;

    const prefix = map[t];
    this.applyLineTransform((line) => {
      const trimmed = line.replace(/^\s+/, "");
      const noHeading = trimmed.replace(/^#{1,6}\s+/, "");
      if (!prefix) return noHeading;

      // Toggle: clicking the same heading again removes it.
      if (trimmed.startsWith(prefix)) return noHeading;
      return `${prefix}${noHeading}`;
    });
  }

  insertMarkdownLink() {
    const t = this.rawEditor;
    const value = String(t.value || "");
    const start = typeof t.selectionStart === "number" ? t.selectionStart : 0;
    const end = typeof t.selectionEnd === "number" ? t.selectionEnd : start;

    const selected = value.slice(start, end).trim() || "Link text";
    const nextHref = window.prompt("Enter link URL", "https://");
    if (nextHref == null) return;

    const href = String(nextHref || "").trim();
    if (!href) return;

    const before = value.slice(0, start);
    const after = value.slice(end);
    const token = `[${selected}](${href})`;

    t.value = `${before}${token}${after}`;
    const nextStart = before.length + 1;
    const nextEnd = nextStart + selected.length;
    t.setSelectionRange(nextStart, nextEnd);
  }

  insertMarkdownImage() {
    const t = this.rawEditor;
    const value = String(t.value || "");
    const start = typeof t.selectionStart === "number" ? t.selectionStart : 0;
    const end = typeof t.selectionEnd === "number" ? t.selectionEnd : start;

    const nextSrc = window.prompt("Enter image URL", "https://");
    if (nextSrc == null) return;

    const src = String(nextSrc || "").trim();
    if (!src) return;

    const selected = value.slice(start, end).trim();
    const fallbackAlt = selected || "Image";
    const nextAlt = window.prompt("Enter image description", fallbackAlt);
    const alt =
      String(nextAlt == null ? fallbackAlt : nextAlt).trim() || "Image";

    const before = value.slice(0, start);
    const after = value.slice(end);
    const token = `![${alt}](${src})`;

    t.value = `${before}${token}${after}`;
    const cursor = before.length + token.length;
    t.setSelectionRange(cursor, cursor);
  }

  insertMarkdownCodeBlock() {
    const t = this.rawEditor;
    const value = String(t.value || "");
    const start = typeof t.selectionStart === "number" ? t.selectionStart : 0;
    const end = typeof t.selectionEnd === "number" ? t.selectionEnd : start;

    const before = value.slice(0, start);
    const selected =
      value.slice(start, end).replace(/^\n+|\n+$/g, "") || "code";
    const after = value.slice(end);

    const lead = before && !before.endsWith("\n") ? "\n" : "";
    const trail = after && !after.startsWith("\n") ? "\n" : "";
    const token = `${lead}\`\`\`\n${selected}\n\`\`\`${trail}`;

    t.value = `${before}${token}${after}`;
    const contentStart = before.length + lead.length + 4;
    const contentEnd = contentStart + selected.length;
    t.setSelectionRange(contentStart, contentEnd);
  }

  insertMarkdownTable() {
    this.insertMarkdownBlockSnippet(
      "| Column 1 | Column 2 |\n| --- | --- |\n| Value 1 | Value 2 |",
    );
  }

  insertMarkdownHorizontalRule() {
    this.insertMarkdownBlockSnippet("---");
  }

  insertMarkdownBlockSnippet(snippet) {
    const t = this.rawEditor;
    const value = String(t.value || "");
    const start = typeof t.selectionStart === "number" ? t.selectionStart : 0;
    const end = typeof t.selectionEnd === "number" ? t.selectionEnd : start;

    const before = value.slice(0, start);
    const after = value.slice(end);
    const lead = before && !before.endsWith("\n") ? "\n" : "";
    const trail = after && !after.startsWith("\n") ? "\n" : "";
    const token = `${lead}${snippet}${trail}`;

    t.value = `${before}${token}${after}`;
    const cursor = before.length + token.length;
    t.setSelectionRange(cursor, cursor);
  }

  toggleLinePrefix(prefix) {
    const p = String(prefix || "");
    const pTrim = p.trimEnd();

    this.applyLineTransform(
      (line, ctx) => {
        if (!line.trim()) return line;

        const already = line.trimStart().startsWith(pTrim);
        if (ctx && ctx.allPrefixed) {
          // Remove the prefix only if every selected line has it.
          if (!already) return line;
          return line.replace(
            new RegExp(`^\\s*${this.escapeRegExp(pTrim)}\\s*`),
            "",
          );
        }

        // Add prefix
        if (already) return line;
        return `${p}${line}`;
      },
      { detect: { type: "prefix", prefix: pTrim } },
    );
  }

  toggleChecklistPrefix() {
    const detect = /^\s*-\s+\[( |x|X)\]\s+/;
    this.applyLineTransform(
      (line, ctx) => {
        if (!line.trim()) return line;
        if (ctx && ctx.allChecklist) {
          return line.replace(detect, "");
        }
        if (detect.test(line)) return line;
        return `- [ ] ${line}`;
      },
      { detect: { type: "checklist" } },
    );
  }

  toggleNumberedList() {
    const detect = /^\s*\d+\.\s+/;
    let i = 1;
    this.applyLineTransform(
      (line, ctx) => {
        if (!line.trim()) return line;
        if (ctx && ctx.allNumbered) {
          return line.replace(detect, "");
        }
        const next = `${i}. ${line.replace(detect, "")}`;
        i += 1;
        return next;
      },
      { detect: { type: "numbered" } },
    );
  }

  applyLineTransform(transform, options) {
    const t = this.rawEditor;
    const value = String(t.value || "");
    const start = typeof t.selectionStart === "number" ? t.selectionStart : 0;
    const end = typeof t.selectionEnd === "number" ? t.selectionEnd : start;

    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const lineEndIdx = value.indexOf("\n", end);
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;

    const before = value.slice(0, lineStart);
    const block = value.slice(lineStart, lineEnd);
    const after = value.slice(lineEnd);

    const lines = block.split("\n");
    const detect = options && options.detect ? options.detect : null;

    const nonEmpty = lines.filter((l) => l.trim().length > 0);
    const ctx = {};
    if (detect && detect.type === "prefix") {
      const pref = String(detect.prefix || "");
      ctx.allPrefixed =
        nonEmpty.length > 0 &&
        nonEmpty.every((l) => l.trimStart().startsWith(pref));
    } else if (detect && detect.type === "checklist") {
      const re = /^\s*-\s+\[( |x|X)\]\s+/;
      ctx.allChecklist =
        nonEmpty.length > 0 && nonEmpty.every((l) => re.test(l));
    } else if (detect && detect.type === "numbered") {
      const re = /^\s*\d+\.\s+/;
      ctx.allNumbered =
        nonEmpty.length > 0 && nonEmpty.every((l) => re.test(l));
    }

    const nextBlock = lines.map((l) => transform(l, ctx)).join("\n");

    t.value = `${before}${nextBlock}${after}`;

    // Keep selection on the transformed block (better for toggle workflows).
    const nextStart = lineStart;
    const nextEnd = lineStart + nextBlock.length;
    t.setSelectionRange(nextStart, nextEnd);
  }

  escapeRegExp(s) {
    return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  htmlToMarkdown(html, options = {}) {
    const raw = typeof html === "string" ? html : "";
    if (!raw.trim()) return "";

    const allowFallbackHtml = !!options.allowFallbackHtml;
    const preserveCursorMarker = !!options.preserveCursorMarker;
    if (allowFallbackHtml) {
      const sanitized = this.sanitizeHtml(raw, {
        preserveFormatting: true,
      }).trim();
      return preserveCursorMarker
        ? sanitized
        : this.stripInternalCursorMarkers(sanitized);
    }

    // Use our own sanitizer first to avoid weird nodes.
    const wrapper = document.createElement("div");
    wrapper.innerHTML = this.sanitizeHtml(raw);

    const toInline = (node) => {
      if (!node) return "";
      if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
      if (node.nodeType !== Node.ELEMENT_NODE) return "";

      const el = node;
      const tag = el.tagName;

      if (tag === "BR") return "\n";
      if (tag === "CODE") {
        const text = Array.from(el.childNodes).map(toInline).join("");
        const safe = String(text || "").replace(/`/g, "\\`");
        return safe ? `\`${safe}\`` : "";
      }
      if (tag === "A") {
        const href = (el.getAttribute("href") || "").trim();
        const text = Array.from(el.childNodes).map(toInline).join("") || href;
        return href ? `[${text}](${href})` : text;
      }
      if (tag === "B" || tag === "STRONG")
        return `**${Array.from(el.childNodes).map(toInline).join("")}**`;
      if (tag === "I" || tag === "EM")
        return `*${Array.from(el.childNodes).map(toInline).join("")}*`;
      if (tag === "U")
        return `<u>${Array.from(el.childNodes).map(toInline).join("")}</u>`;
      if (tag === "S" || tag === "STRIKE" || tag === "DEL")
        return `~~${Array.from(el.childNodes).map(toInline).join("")}~~`;

      if (tag === "IMG") {
        const src = (el.getAttribute("src") || "").trim();
        const alt = (el.getAttribute("alt") || "").trim();
        if (!src) return "";
        return `![${alt}](${src})`;
      }

      if (tag === "VIDEO" || tag === "AUDIO" || tag === "IFRAME") {
        return el.outerHTML;
      }

      return Array.from(el.childNodes).map(toInline).join("");
    };

    const toBlock = (node) => {
      if (!node) return "";
      if (node.nodeType === Node.TEXT_NODE)
        return (node.nodeValue || "").trim();
      if (node.nodeType !== Node.ELEMENT_NODE) return "";

      const el = node;
      const tag = el.tagName;
      const blockTags = new Set([
        "P",
        "DIV",
        "H1",
        "H2",
        "H3",
        "H4",
        "UL",
        "OL",
        "PRE",
        "BLOCKQUOTE",
        "TABLE",
        "HR",
        "VIDEO",
        "AUDIO",
        "IFRAME",
      ]);

      if (tag === "HR") return "---\n\n";

      if (tag === "VIDEO" || tag === "AUDIO" || tag === "IFRAME") {
        return `${el.outerHTML}\n\n`;
      }

      if (tag === "PRE") {
        const code = el.querySelector(":scope > code") || el;
        const txt = String(code.textContent || "").replace(/\s+$/g, "");
        if (!txt) return "";
        return `\`\`\`\n${txt}\n\`\`\`\n\n`;
      }

      if (tag === "BLOCKQUOTE") {
        const inner = Array.from(el.childNodes)
          .map((child) => toBlock(child))
          .join("")
          .trim();
        if (!inner) return "";
        const lines = inner.split("\n");
        const quoted = lines
          .map((line) => (line.trim().length ? `> ${line}` : ">"))
          .join("\n");
        return `${quoted}\n\n`;
      }

      if (tag === "P") {
        const txt = Array.from(el.childNodes).map(toInline).join("").trim();
        return txt ? `${txt}\n\n` : "";
      }

      if (tag === "DIV") {
        const hasNestedBlocks = Array.from(el.children).some((child) =>
          blockTags.has(child.tagName),
        );

        if (hasNestedBlocks) {
          let out = "";
          Array.from(el.childNodes).forEach((child) => {
            if (child.nodeType === Node.TEXT_NODE) {
              const txt = String(child.nodeValue || "").trim();
              if (txt) out += `${txt}\n\n`;
              return;
            }
            out += toBlock(child);
          });
          return out;
        }

        const txt = Array.from(el.childNodes).map(toInline).join("").trim();
        return txt ? `${txt}\n\n` : "";
      }

      if (tag === "H1" || tag === "H2" || tag === "H3" || tag === "H4") {
        const level = parseInt(tag.slice(1), 10);
        const hashes = "#".repeat(level);
        const txt = Array.from(el.childNodes).map(toInline).join("").trim();
        return txt ? `${hashes} ${txt}\n\n` : "";
      }

      if (tag === "UL" || tag === "OL") {
        const isChecklist = el.classList.contains("notes-checklist");
        const isOrdered = tag === "OL";
        let idx = 1;
        const lines = [];
        el.querySelectorAll(":scope > li").forEach((li) => {
          const txt = Array.from(li.childNodes)
            .filter(
              (n) => n.nodeType !== Node.ELEMENT_NODE || n.tagName !== "UL",
            )
            .filter(
              (n) => n.nodeType !== Node.ELEMENT_NODE || n.tagName !== "OL",
            )
            .map(toInline)
            .join("")
            .trim();

          const checked =
            String(li.getAttribute("data-checked") || "false") === "true";

          const prefix = isChecklist
            ? `- [${checked ? "x" : " "}] `
            : isOrdered
              ? `${idx}. `
              : "- ";

          if (txt) lines.push(`${prefix}${txt}`);
          idx += 1;
        });

        return lines.length ? `${lines.join("\n")}\n\n` : "";
      }

      if (tag === "TABLE") {
        const rows = Array.from(el.querySelectorAll("tr"));
        if (!rows.length) return "";

        const grid = rows.map((tr) =>
          Array.from(tr.querySelectorAll("th,td")).map((cell) =>
            String(cell.textContent || "")
              .replace(/\s+/g, " ")
              .trim(),
          ),
        );

        const headerRow = grid.findIndex((r, i) => rows[i].querySelector("th"));

        const mkRow = (r) => `| ${r.map((c) => c || " ").join(" | ")} |`;
        const maxCols = Math.max(1, ...grid.map((r) => r.length));

        const normalized = grid.map((r) => {
          const next = r.slice(0);
          while (next.length < maxCols) next.push(" ");
          return next;
        });

        let out = "";
        if (headerRow >= 0) {
          out += `${mkRow(normalized[headerRow])}\n`;
          out += `| ${new Array(maxCols).fill("---").join(" | ")} |\n`;
          normalized.forEach((r, i) => {
            if (i === headerRow) return;
            out += `${mkRow(r)}\n`;
          });
        } else {
          normalized.forEach((r) => {
            out += `${mkRow(r)}\n`;
          });
        }

        return `${out.trim()}\n\n`;
      }

      // Fallback: just inline text
      return `${Array.from(el.childNodes).map(toInline).join("").trim()}\n\n`;
    };

    let out = "";
    Array.from(wrapper.childNodes).forEach((child) => {
      out += toBlock(child);
    });

    const markdown = out.replace(/\n{3,}/g, "\n\n").trim();
    if (!markdown) return "";

    return markdown;
  }

  isMarkdownRoundTripStable(sourceHtml, markdown) {
    try {
      const source = this.extractComparableTextFromHtml(
        this.sanitizeHtml(sourceHtml),
      );
      const rendered = this.extractComparableTextFromHtml(
        this.renderMarkdown(markdown),
      );

      if (!source && !rendered) return true;
      if (!source || !rendered) return false;
      if (source === rendered) return true;

      const sourceLen = source.length;
      const renderedLen = rendered.length;
      const ratio = renderedLen / sourceLen;

      if (ratio < 0.75 || ratio > 1.35) return false;

      const prefixLen = Math.max(60, Math.min(220, sourceLen, renderedLen));
      return source.slice(0, prefixLen) === rendered.slice(0, prefixLen);
    } catch (e) {
      return false;
    }
  }

  extractComparableTextFromHtml(html) {
    const host = document.createElement("div");
    host.innerHTML = String(html || "");

    const blockTags = new Set([
      "P",
      "DIV",
      "H1",
      "H2",
      "H3",
      "H4",
      "UL",
      "OL",
      "LI",
      "PRE",
      "BLOCKQUOTE",
      "TABLE",
      "TR",
      "TD",
      "TH",
      "HR",
      "VIDEO",
      "AUDIO",
      "IFRAME",
    ]);

    const walk = (node) => {
      if (!node) return "";
      if (node.nodeType === Node.TEXT_NODE) return String(node.nodeValue || "");
      if (node.nodeType !== Node.ELEMENT_NODE) return "";

      const tag = node.tagName;
      if (tag === "BR") return "\n";

      let out = "";
      if (blockTags.has(tag)) out += "\n";

      Array.from(node.childNodes).forEach((child) => {
        out += walk(child);
      });

      if (blockTags.has(tag)) out += "\n";
      return out;
    };

    const raw = Array.from(host.childNodes)
      .map((child) => walk(child))
      .join("\n");

    return this.normalizeComparableText(raw);
  }

  normalizeComparableText(text) {
    return String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t\f\v]+/g, " ")
      .replace(/\s*\n\s*/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  stripInternalCursorMarkers(text) {
    return String(text || "")
      .replace(/__NOTES_CURSOR_(PREVIEW|RAW)__/gi, "")
      .replace(/\*\*NOTES_CURSOR_(PREVIEW|RAW)\*\*/gi, "")
      .replace(/NOTES_CURSOR_(PREVIEW|RAW)/gi, "")
      .replace(/NOTESCURSOR(PREVIEW|RAW)TOKEN[A-Z0-9]*/gi, "");
  }

  sanitizeInlineStyle(styleText) {
    const raw = String(styleText || "");
    if (!raw) return "";

    return raw
      .split(";")
      .map((rule) => rule.trim())
      .filter((rule) => rule.includes(":"))
      .filter(
        (rule) =>
          !/(expression\s*\(|javascript:|vbscript:|@import|behavior\s*:)/i.test(
            rule,
          ),
      )
      .slice(0, 80)
      .join("; ");
  }

  isRichHtmlDocument(text) {
    const raw = String(text || "").trim();
    if (!raw) return false;

    if (!/<\/?[a-z][^>]*>/i.test(raw)) return false;

    if (
      /<(table|thead|tbody|tfoot|tr|td|th|colgroup|col|caption|img|video|audio|iframe|font)\b/i.test(
        raw,
      )
    )
      return true;

    if (
      /\s(style|class|colspan|rowspan|cellpadding|cellspacing|bgcolor|align|valign|width|height|srcset|sizes)\s*=/i.test(
        raw,
      )
    )
      return true;

    return false;
  }

  normalizeContentMode(mode, sampleText) {
    const rawMode = String(mode || "").toLowerCase();
    if (rawMode === "html" || rawMode === "markdown") return rawMode;
    return this.isRichHtmlDocument(sampleText) ? "html" : "markdown";
  }

  updateScaleUi(scale) {
    const n = this.clampNumber(
      scale,
      NotesManager.SCALE_MIN,
      NotesManager.SCALE_MAX,
    );

    if (this.scaleRange) {
      // Keep exact-ish value within range; range uses step to constrain.
      this.scaleRange.value = String(n);
    }
    if (this.scaleValueEl) {
      this.scaleValueEl.textContent = `${n.toFixed(2)}x`;
    }
  }

  deleteActiveNote() {
    const note = this.getActiveNote();
    if (!note) return;

    const id = note.id;
    const idx = this.notes.findIndex((n) => n.id === id);
    if (idx < 0) return;

    this.notes.splice(idx, 1);

    if (!this.notes.length) {
      const created = this.createNote();
      this.save();
      this.selectNote(created.id, { skipPersistCurrent: true });
      return;
    }

    const next = this.notes[idx] || this.notes[idx - 1] || this.notes[0];
    this.save();
    this.selectNote(next.id, { skipPersistCurrent: true });
  }

  showDeleteConfirmation() {
    const note = this.getActiveNote();
    if (!note) return;
    this.showDeleteConfirmationForNoteId(note.id);
  }

  showDeleteConfirmationForNoteId(noteId) {
    const id = String(noteId || "").trim();
    if (!id || !this.deleteModal) return;

    const note = this.notes.find((n) => String(n.id) === id);
    if (!note) return;

    this.pendingDeleteId = note.id;
    if (this.deleteNameEl) {
      this.deleteNameEl.textContent = String(note.title || "Untitled");
    }

    this.deleteModal.classList.add("active");
  }

  hideDeleteConfirmation() {
    if (this.deleteModal) {
      this.deleteModal.classList.remove("active");
    }
    this.pendingDeleteId = null;
  }

  confirmDelete() {
    if (!this.pendingDeleteId) return;
    // Ensure we delete the currently-confirmed note.
    if (String(this.activeNoteId) === String(this.pendingDeleteId)) {
      this.deleteActiveNote();
    } else {
      // If active note changed while modal open, reselect then delete.
      this.selectNote(this.pendingDeleteId, { skipPersistCurrent: true });
      this.deleteActiveNote();
    }
    this.hideDeleteConfirmation();
  }

  getPageForNoteId(id) {
    if (!id) return 1;
    const idx = this.notes.findIndex((n) => n.id === id);
    if (idx < 0) return 1;
    return Math.floor(idx / NotesManager.ITEMS_PER_PAGE) + 1;
  }

  getActiveNote() {
    if (!this.activeNoteId) return null;
    return this.notes.find((n) => n.id === this.activeNoteId) || null;
  }

  getSearchItems() {
    if (!Array.isArray(this.notes)) return [];
    return this.notes.slice();
  }

  focusNoteById(id) {
    const noteId = String(id || "").trim();
    if (!noteId) return false;

    const exists = this.notes.some((n) => String(n.id) === noteId);
    if (!exists) return false;

    this.selectNote(noteId);
    this.ensureActiveVisible();

    if (this.listEl) {
      const listItem = Array.from(
        this.listEl.querySelectorAll(".notes-list-item"),
      ).find((el) => String(el.dataset.noteId || "") === noteId);

      if (listItem) {
        try {
          listItem.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } catch (e) {}
      }
    }

    return true;
  }

  renderList() {
    const frag = document.createDocumentFragment();

    this.notes.forEach((note) => {
      const item = document.createElement("div");
      item.className = "notes-list-item";
      item.dataset.noteId = note.id;
      item.tabIndex = 0;
      item.setAttribute("role", "button");
      item.setAttribute("aria-label", `Open note: ${note.title || "Untitled"}`);
      if (note.id === this.activeNoteId) item.classList.add("active");

      const title = document.createElement("div");
      title.className = "notes-list-title";
      title.textContent = note.title || "Untitled";

      const meta = document.createElement("div");
      meta.className = "notes-list-meta";
      meta.textContent = this.formatTimestamp(note.updatedAt || note.createdAt);

      item.appendChild(title);
      item.appendChild(meta);

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "notes-list-item-delete";
      delBtn.dataset.noteId = note.id;
      delBtn.setAttribute(
        "aria-label",
        `Delete note: ${note.title || "Untitled"}`,
      );
      delBtn.setAttribute("title", "Delete note");
      delBtn.textContent = "🗑";

      item.appendChild(delBtn);
      frag.appendChild(item);
    });

    this.listEl.innerHTML = "";
    this.listEl.appendChild(frag);

    this.updatePaginationUI();
  }

  ensureActiveVisible() {
    if (!this.listEl || !this.activeNoteId) return;

    const item = Array.from(
      this.listEl.querySelectorAll(".notes-list-item"),
    ).find(
      (el) => String(el.dataset.noteId || "") === String(this.activeNoteId),
    );
    if (!item) return;

    try {
      item.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    } catch (e) {}
  }

  updatePaginationUI() {
    if (!this.listEl) return;

    const maxLeft = Math.max(
      0,
      this.listEl.scrollWidth - this.listEl.clientWidth,
    );
    const left = this.listEl.scrollLeft;
    const epsilon = 2;

    if (this.prevPageBtn) this.prevPageBtn.disabled = left <= epsilon;
    if (this.nextPageBtn) this.nextPageBtn.disabled = left >= maxLeft - epsilon;
  }

  scrollNotesListBy(direction) {
    if (!this.listEl) return;

    const dir = direction < 0 ? -1 : 1;
    const step = Math.max(160, Math.floor(this.listEl.clientWidth * 0.82));

    try {
      this.listEl.scrollBy({ left: step * dir, behavior: "smooth" });
    } catch (e) {
      this.listEl.scrollLeft += step * dir;
    }

    // Update disabled state after smooth scrolling settles.
    setTimeout(() => this.updatePaginationUI(), 220);
  }

  getTotalPages() {
    return Math.max(
      1,
      Math.ceil(this.notes.length / NotesManager.ITEMS_PER_PAGE),
    );
  }

  applyToolbarAction(cmd, block) {
    if (this.isMarkdownPreview) {
      this.restorePreviewSelection();
      this.applyPreviewToolbarAction(cmd, block);
      this.sanitizeEditorInPlace();
      this.capturePreviewSelection();
      return;
    }

    this.restoreRawSelection();
    this.applySourceToolbarAction(cmd, block);
    this.captureRawSelection();
    this.syncPreviewFromRawEditor();
  }

  applySourceToolbarAction(cmd, block) {
    try {
      this.rawEditor.focus();
      this.restoreRawSelection();
    } catch (e) {}

    if (block) {
      this.applyMarkdownBlock(block);
      return;
    }

    if (cmd === "checklist") {
      this.applyMarkdownChecklist();
      return;
    }

    this.applyMarkdownCommand(cmd);
  }

  applyPreviewToolbarAction(cmd, block) {
    try {
      this.editor.focus();
      this.restorePreviewSelection();
    } catch (e) {}

    if (block) {
      this.execFormatBlock(block);
      return;
    }

    if (cmd === "checklist") {
      this.toggleChecklist();
      return;
    }

    if (cmd === "quote") {
      this.execFormatBlock("BLOCKQUOTE");
      return;
    }

    if (
      cmd === "bold" ||
      cmd === "italic" ||
      cmd === "underline" ||
      cmd === "strikeThrough"
    ) {
      this.expandPreviewSelectionToWord();
      this.execCommand(cmd);
      return;
    }

    if (cmd === "inlineCode") {
      this.expandPreviewSelectionToWord();
      this.insertPreviewInlineCode();
      return;
    }

    if (cmd === "codeBlock") {
      this.insertPreviewCodeBlock();
      return;
    }

    if (cmd === "insertLink") {
      this.insertPreviewLink();
      return;
    }

    if (cmd === "insertImage") {
      this.insertPreviewImage();
      return;
    }

    if (cmd === "insertTable") {
      this.insertPreviewTable();
      return;
    }

    if (cmd === "insertHr") {
      this.execCommand("insertHorizontalRule");
      return;
    }

    this.execCommand(cmd);
  }

  getPreviewSelectionText() {
    try {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return "";
      const range = sel.getRangeAt(0);
      if (!this.editor.contains(range.commonAncestorContainer)) return "";
      return String(sel.toString() || "");
    } catch (e) {
      return "";
    }
  }

  getActivePreviewRange() {
    try {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return null;
      const range = sel.getRangeAt(0);
      if (!this.editor.contains(range.commonAncestorContainer)) return null;
      return range;
    } catch (e) {
      return null;
    }
  }

  insertHtmlAtCursor(html, options = {}) {
    const markup = String(html || "");
    if (!markup) return;

    const forceRangeInsert = !!options.forceRangeInsert;

    if (!forceRangeInsert) {
      try {
        document.execCommand("insertHTML", false, markup);
        return;
      } catch (e) {
        // fallback below
      }
    }

    try {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;

      const range = sel.getRangeAt(0);
      if (!this.editor.contains(range.commonAncestorContainer)) return;

      range.deleteContents();
      const container = document.createElement("div");
      container.innerHTML = markup;

      const frag = document.createDocumentFragment();
      let node;
      let lastNode = null;
      while ((node = container.firstChild)) {
        lastNode = frag.appendChild(node);
      }

      range.insertNode(frag);
      if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } catch (e) {
      // ignore
    }
  }

  insertPreviewInlineCode() {
    const range = this.getActivePreviewRange();
    if (!range) return;

    const startEl =
      range.startContainer.nodeType === Node.ELEMENT_NODE
        ? range.startContainer
        : range.startContainer.parentElement;
    const endEl =
      range.endContainer.nodeType === Node.ELEMENT_NODE
        ? range.endContainer
        : range.endContainer.parentElement;

    const startCode = startEl?.closest ? startEl.closest("code") : null;
    const endCode = endEl?.closest ? endEl.closest("code") : null;

    if (
      startCode &&
      endCode &&
      startCode === endCode &&
      this.editor.contains(startCode) &&
      !startCode.closest("pre")
    ) {
      this.unwrapPreviewInlineCodeElement(startCode);
      return;
    }

    const selected = this.getPreviewSelectionText().trim() || "code";
    this.insertHtmlAtCursor(`<code>${this.escapeHtml(selected)}</code>`);
  }

  insertPreviewCodeBlock() {
    const range = this.getActivePreviewRange();
    if (!range) return;

    const startEl =
      range.startContainer.nodeType === Node.ELEMENT_NODE
        ? range.startContainer
        : range.startContainer.parentElement;
    const endEl =
      range.endContainer.nodeType === Node.ELEMENT_NODE
        ? range.endContainer
        : range.endContainer.parentElement;

    const startPre = startEl?.closest ? startEl.closest("pre") : null;
    const endPre = endEl?.closest ? endEl.closest("pre") : null;

    if (
      startPre &&
      endPre &&
      startPre === endPre &&
      this.editor.contains(startPre)
    ) {
      this.unwrapPreviewCodeBlockElement(startPre);
      return;
    }

    const selected = this.getPreviewSelectionText() || "code";
    this.insertHtmlAtCursor(
      `<pre><code>${this.escapeHtml(String(selected).trim() || "code")}</code></pre>`,
      { forceRangeInsert: true },
    );
  }

  unwrapPreviewInlineCodeElement(codeEl) {
    if (!codeEl || !codeEl.parentNode) return;

    try {
      const textNode = document.createTextNode(
        String(codeEl.textContent || ""),
      );
      codeEl.parentNode.replaceChild(textNode, codeEl);

      const sel = window.getSelection();
      if (sel) {
        const r = document.createRange();
        r.setStart(textNode, textNode.nodeValue.length);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
      }
    } catch (e) {
      // ignore
    }
  }

  unwrapPreviewCodeBlockElement(preEl) {
    if (!preEl || !preEl.parentNode) return;

    try {
      const text = String(preEl.textContent || "");
      const p = document.createElement("p");
      const normalized = text.replace(/\r\n?/g, "\n");
      p.innerHTML = normalized
        ? this.escapeHtml(normalized).replace(/\n/g, "<br>")
        : "<br>";

      preEl.parentNode.replaceChild(p, preEl);

      const sel = window.getSelection();
      if (sel) {
        const r = document.createRange();
        r.selectNodeContents(p);
        r.collapse(false);
        sel.removeAllRanges();
        sel.addRange(r);
      }
    } catch (e) {
      // ignore
    }
  }

  insertPreviewLink() {
    const offsets =
      this.getSelectionOffsets(this.editor) || this._previewSelectionOffsets;
    const selected = this.getPreviewSelectionText().trim() || "Link text";
    const nextHref = window.prompt("Enter link URL", "https://");
    if (nextHref == null) return;

    const href = String(nextHref || "").trim();
    if (!href) return;

    if (offsets) {
      this.restoreSelectionOffsets(this.editor, offsets);
    }

    this.insertHtmlAtCursor(
      `<a href="${this.escapeHtml(href)}">${this.escapeHtml(selected)}</a>`,
    );
  }

  insertPreviewImage() {
    const offsets =
      this.getSelectionOffsets(this.editor) || this._previewSelectionOffsets;
    const nextSrc = window.prompt("Enter image URL", "https://");
    if (nextSrc == null) return;

    const src = String(nextSrc || "").trim();
    if (!src) return;

    const fallbackAlt = this.getPreviewSelectionText().trim() || "Image";
    const nextAlt = window.prompt("Enter image description", fallbackAlt);
    const alt =
      String(nextAlt == null ? fallbackAlt : nextAlt).trim() || "Image";

    if (offsets) {
      this.restoreSelectionOffsets(this.editor, offsets);
    }

    this.insertHtmlAtCursor(
      `<img src="${this.escapeHtml(src)}" alt="${this.escapeHtml(alt)}" title="${this.escapeHtml(alt)}" />`,
    );
  }

  insertPreviewTable() {
    this.insertHtmlAtCursor(
      "<table><thead><tr><th>Column 1</th><th>Column 2</th></tr></thead><tbody><tr><td>Value 1</td><td>Value 2</td></tr></tbody></table>",
    );
  }

  execCommand(cmd) {
    try {
      document.execCommand(cmd, false, null);
    } catch (e) {
      // ignore
    }
  }

  execFormatBlock(blockTag) {
    const t = String(blockTag || "").toUpperCase();
    const allowed = new Set(["P", "H1", "H2", "H3", "H4", "BLOCKQUOTE"]);
    if (!allowed.has(t)) return;

    try {
      document.execCommand("formatBlock", false, t);
    } catch (e) {
      // ignore
    }
  }

  toggleChecklist() {
    // Start with a normal unordered list command, then toggle class on the nearest UL.
    this.execCommand("insertUnorderedList");

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    const el =
      node && node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!el) return;

    const ul = el.closest("ul");
    if (!ul) return;

    ul.classList.toggle("notes-checklist");

    // Ensure list items have data-checked attribute for styling.
    if (ul.classList.contains("notes-checklist")) {
      ul.querySelectorAll("li").forEach((li) => {
        if (!li.getAttribute("data-checked"))
          li.setAttribute("data-checked", "false");
      });
    }
  }

  normalizeNow() {
    // No-op in markdown mode; preview rendering is sanitized on render.
    if (this._normalizeTimer) {
      clearTimeout(this._normalizeTimer);
      this._normalizeTimer = null;
    }
  }

  linkifyHtml(html) {
    // Work on DOM so we avoid double-linking.
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html || "";

    const urlRegex = /\b((https?:\/\/|www\.)[^\s<]+[^\s<\.)\],;:"'!?])\b/gi;

    const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        if (!node || !node.nodeValue) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest("a")) return NodeFilter.FILTER_REJECT;
        urlRegex.lastIndex = 0;
        const has = urlRegex.test(node.nodeValue);
        urlRegex.lastIndex = 0;
        if (!has) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    textNodes.forEach((textNode) => {
      const text = textNode.nodeValue || "";
      urlRegex.lastIndex = 0;
      let match;
      let lastIndex = 0;
      const frag = document.createDocumentFragment();

      while ((match = urlRegex.exec(text))) {
        const urlText = match[1];
        const start = match.index;
        const end = start + urlText.length;

        if (start > lastIndex) {
          frag.appendChild(
            document.createTextNode(text.slice(lastIndex, start)),
          );
        }

        const href = urlText.startsWith("http")
          ? urlText
          : `https://${urlText}`;
        const a = document.createElement("a");
        a.href = href;
        a.textContent = urlText;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        frag.appendChild(a);

        lastIndex = end;
      }

      if (lastIndex < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex)));
      }

      try {
        textNode.parentNode.replaceChild(frag, textNode);
      } catch (e) {
        // ignore
      }
    });

    return wrapper.innerHTML;
  }

  sanitizeHtml(html, options = {}) {
    const preserveFormatting = !!options.preserveFormatting;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html || "";

    const allowedTags = new Set([
      // Markdown basics
      "A",
      "B",
      "STRONG",
      "I",
      "EM",
      "U",
      "S",
      "STRIKE",
      "P",
      "BR",
      "DIV",
      "SPAN",
      "H1",
      "H2",
      "H3",
      "H4",
      "UL",
      "OL",
      "LI",

      // Markdown extensions
      "PRE",
      "CODE",
      "BLOCKQUOTE",
      "HR",
      "IMG",
      "TABLE",
      "THEAD",
      "TBODY",
      "TFOOT",
      "TR",
      "TH",
      "TD",
      "COLGROUP",
      "COL",
      "CAPTION",
      "DEL",
      "INPUT",
      "VIDEO",
      "AUDIO",
      "IFRAME",
      "SOURCE",
      "FONT",
      "SUP",
      "SUB",
    ]);

    const sanitizeNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return;
      if (node.nodeType !== Node.ELEMENT_NODE) {
        node.remove();
        return;
      }

      const el = node;
      const tag = el.tagName;

      // Remove dangerous nodes entirely
      if (!allowedTags.has(tag)) {
        // Replace with its text content to avoid losing content.
        const text = document.createTextNode(el.textContent || "");
        el.replaceWith(text);
        return;
      }

      // Strip attributes
      const attrs = Array.from(el.attributes);
      for (const attr of attrs) {
        const name = attr.name.toLowerCase();

        if (name.startsWith("on")) {
          el.removeAttribute(attr.name);
          continue;
        }

        if (tag === "A") {
          if (
            name === "href" ||
            name === "target" ||
            name === "rel" ||
            (preserveFormatting &&
              (name === "style" || name === "class" || name === "title"))
          )
            continue;
          el.removeAttribute(attr.name);
          continue;
        }

        if (tag === "IMG") {
          if (
            name === "src" ||
            name === "alt" ||
            name === "title" ||
            (preserveFormatting &&
              (name === "style" ||
                name === "class" ||
                name === "width" ||
                name === "height" ||
                name === "srcset" ||
                name === "sizes"))
          )
            continue;
          el.removeAttribute(attr.name);
          continue;
        }

        if (tag === "INPUT") {
          if (name === "type" || name === "checked" || name === "disabled")
            continue;
          el.removeAttribute(attr.name);
          continue;
        }

        if (tag === "VIDEO") {
          if (
            name === "src" ||
            name === "controls" ||
            name === "poster" ||
            name === "width" ||
            name === "height" ||
            (preserveFormatting &&
              (name === "style" || name === "class" || name === "title"))
          )
            continue;
          el.removeAttribute(attr.name);
          continue;
        }

        if (tag === "AUDIO") {
          if (
            name === "src" ||
            name === "controls" ||
            (preserveFormatting &&
              (name === "style" || name === "class" || name === "title"))
          )
            continue;
          el.removeAttribute(attr.name);
          continue;
        }

        if (tag === "IFRAME") {
          if (
            name === "src" ||
            name === "title" ||
            name === "width" ||
            name === "height" ||
            name === "allow" ||
            name === "allowfullscreen" ||
            name === "loading" ||
            (preserveFormatting &&
              (name === "style" || name === "class" || name === "frameborder"))
          )
            continue;
          el.removeAttribute(attr.name);
          continue;
        }

        if (tag === "SOURCE") {
          if (
            name === "src" ||
            name === "type" ||
            (preserveFormatting &&
              (name === "srcset" || name === "sizes" || name === "media"))
          )
            continue;
          el.removeAttribute(attr.name);
          continue;
        }

        if (tag === "UL") {
          if (name === "class") {
            const hasChecklist = el.classList.contains("notes-checklist");
            const safeClass = preserveFormatting
              ? String(el.getAttribute("class") || "")
                  .replace(/[^a-zA-Z0-9_\-\s]/g, " ")
                  .replace(/\s+/g, " ")
                  .trim()
              : "";
            const merged = hasChecklist
              ? ["notes-checklist", safeClass].join(" ").trim()
              : safeClass;
            el.className = merged;
            if (hasChecklist && !el.classList.contains("notes-checklist")) {
              el.classList.add("notes-checklist");
            }
            continue;
          }
          if (preserveFormatting && name === "style") {
            const safeStyle = this.sanitizeInlineStyle(
              String(el.getAttribute("style") || ""),
            );
            if (safeStyle) el.setAttribute("style", safeStyle);
            else el.removeAttribute("style");
            continue;
          }
          el.removeAttribute(attr.name);
          continue;
        }

        if (tag === "LI") {
          if (
            name === "data-checked" ||
            (preserveFormatting &&
              (name === "style" || name === "class" || name === "value"))
          )
            continue;
          el.removeAttribute(attr.name);
          continue;
        }

        if (
          preserveFormatting &&
          (name === "style" ||
            name === "class" ||
            name === "align" ||
            name === "valign" ||
            name === "width" ||
            name === "height" ||
            name === "bgcolor" ||
            name === "border" ||
            name === "cellpadding" ||
            name === "cellspacing" ||
            name === "colspan" ||
            name === "rowspan")
        ) {
          if (name === "style") {
            const safeStyle = this.sanitizeInlineStyle(
              String(el.getAttribute("style") || ""),
            );
            if (safeStyle) el.setAttribute("style", safeStyle);
            else el.removeAttribute("style");
          }
          if (name === "class") {
            const safeClass = String(el.getAttribute("class") || "")
              .replace(/[^a-zA-Z0-9_\-\s]/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            if (safeClass) el.setAttribute("class", safeClass);
            else el.removeAttribute("class");
          }
          continue;
        }

        // Allow no attributes for other tags
        el.removeAttribute(attr.name);
      }

      // Normalize A[href]
      if (tag === "A") {
        const href = (el.getAttribute("href") || "").trim();
        if (!this.isSafeHref(href)) {
          // Replace unsafe links with text
          const text = document.createTextNode(el.textContent || "");
          el.replaceWith(text);
          return;
        }
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }

      if (tag === "IMG") {
        const src = (el.getAttribute("src") || "").trim();
        if (!this.isSafeHref(src)) {
          el.remove();
          return;
        }
        el.setAttribute("loading", "lazy");
        el.setAttribute("referrerpolicy", "no-referrer");
      }

      if (tag === "VIDEO" || tag === "AUDIO" || tag === "IFRAME") {
        const src = (el.getAttribute("src") || "").trim();
        if (!this.isSafeHref(src)) {
          el.remove();
          return;
        }

        if (tag === "VIDEO" || tag === "AUDIO") {
          el.setAttribute("controls", "");
        }

        if (tag === "IFRAME") {
          el.setAttribute("loading", "lazy");
          el.setAttribute("referrerpolicy", "no-referrer");
        }
      }

      if (tag === "SOURCE") {
        const src = (el.getAttribute("src") || "").trim();
        if (!this.isSafeHref(src)) {
          el.remove();
          return;
        }
      }

      if (tag === "INPUT") {
        // Only allow task-list checkboxes.
        const type = String(el.getAttribute("type") || "").toLowerCase();
        if (type !== "checkbox") {
          el.remove();
          return;
        }

        // Force disabled to avoid interactive inputs.
        el.setAttribute("disabled", "");

        // Strip all children.
        while (el.firstChild) el.removeChild(el.firstChild);
      }

      // Normalize checklist LIs
      if (tag === "UL" && el.classList.contains("notes-checklist")) {
        el.querySelectorAll("li").forEach((li) => {
          if (!li.getAttribute("data-checked"))
            li.setAttribute("data-checked", "false");
        });
      }

      // Recurse
      Array.from(el.childNodes).forEach((child) => sanitizeNode(child));
    };

    Array.from(wrapper.childNodes).forEach((child) => sanitizeNode(child));

    // Ensure wrapping paragraph if empty
    const cleaned = wrapper.innerHTML.trim();
    if (!cleaned) return "<p></p>";

    return wrapper.innerHTML;
  }

  isSafeHref(href) {
    if (!href) return false;
    try {
      const u = new URL(href, window.location.origin);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch (e) {
      return false;
    }
  }

  formatTimestamp(ts) {
    try {
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "";
    }
  }

  generateId() {
    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2)
    ).slice(0, 24);
  }

  clampInt(value, min, max) {
    const n = parseInt(value, 10);
    if (Number.isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  clampNumber(value, min, max) {
    const n = typeof value === "number" ? value : parseFloat(value);
    if (Number.isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  captureRawSelection() {
    if (!this.rawEditor) return;
    try {
      this._rawSelection = {
        start:
          typeof this.rawEditor.selectionStart === "number"
            ? this.rawEditor.selectionStart
            : 0,
        end:
          typeof this.rawEditor.selectionEnd === "number"
            ? this.rawEditor.selectionEnd
            : 0,
        direction: this.rawEditor.selectionDirection || "none",
      };
    } catch (e) {
      // ignore
    }
  }

  restoreRawSelection() {
    if (!this.rawEditor || !this._rawSelection) return;
    try {
      const start = Math.max(0, parseInt(this._rawSelection.start, 10) || 0);
      const end = Math.max(
        start,
        parseInt(this._rawSelection.end, 10) || start,
      );
      this.rawEditor.setSelectionRange(
        start,
        end,
        this._rawSelection.direction || "none",
      );
    } catch (e) {
      // ignore
    }
  }

  capturePreviewSelection() {
    if (!this.editor) return;
    const offsets = this.getSelectionOffsets(this.editor);
    if (offsets) {
      this._previewSelectionOffsets = offsets;
    }
  }

  restorePreviewSelection() {
    if (!this.editor || !this._previewSelectionOffsets) return;
    this.restoreSelectionOffsets(this.editor, this._previewSelectionOffsets);
  }

  getWordBoundsAt(text, caretIndex) {
    const value = String(text || "");
    const len = value.length;
    if (!len) return null;

    const isWordChar = (ch) => {
      if (!ch) return false;
      try {
        return /[\p{L}\p{N}_-]/u.test(ch);
      } catch (e) {
        return /[A-Za-z0-9_-]/.test(ch);
      }
    };

    let idx = Number.isFinite(caretIndex) ? Math.trunc(caretIndex) : 0;
    idx = Math.max(0, Math.min(len, idx));
    if (idx === len) idx = len - 1;

    if (!isWordChar(value[idx])) {
      if (idx > 0 && isWordChar(value[idx - 1])) {
        idx -= 1;
      } else if (idx + 1 < len && isWordChar(value[idx + 1])) {
        idx += 1;
      } else {
        return null;
      }
    }

    let start = idx;
    while (start > 0 && isWordChar(value[start - 1])) {
      start -= 1;
    }

    let end = idx + 1;
    while (end < len && isWordChar(value[end])) {
      end += 1;
    }

    if (start >= end) return null;
    return { start, end };
  }

  expandPreviewSelectionToWord() {
    try {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return false;

      const currentRange = sel.getRangeAt(0);
      if (!this.editor.contains(currentRange.startContainer)) return false;
      if (!currentRange.collapsed) return true;

      const offsets = this.getSelectionOffsets(this.editor);
      if (!offsets) return false;

      const bounds = this.getWordBoundsAt(
        this.editor.textContent || "",
        offsets.start,
      );
      if (!bounds) return false;

      const startPos = this.findTextPosition(this.editor, bounds.start);
      const endPos = this.findTextPosition(this.editor, bounds.end);
      if (!startPos || !endPos) return false;

      const nextRange = document.createRange();
      nextRange.setStart(startPos.node, startPos.offset);
      nextRange.setEnd(endPos.node, endPos.offset);

      sel.removeAllRanges();
      sel.addRange(nextRange);
      this._previewSelectionOffsets = { start: bounds.start, end: bounds.end };
      return true;
    } catch (e) {
      return false;
    }
  }

  placeCaretAtEnd(el) {
    try {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (e) {
      // ignore
    }
  }

  getSelectionOffsets(root) {
    try {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return null;
      const range = sel.getRangeAt(0);
      if (
        !root.contains(range.startContainer) ||
        !root.contains(range.endContainer)
      )
        return null;

      const preStart = range.cloneRange();
      preStart.selectNodeContents(root);
      preStart.setEnd(range.startContainer, range.startOffset);
      const start = preStart.toString().length;

      const preEnd = range.cloneRange();
      preEnd.selectNodeContents(root);
      preEnd.setEnd(range.endContainer, range.endOffset);
      const end = preEnd.toString().length;

      return { start, end };
    } catch (e) {
      return null;
    }
  }

  restoreSelectionOffsets(root, offsets) {
    if (!offsets) return;
    try {
      const { start, end } = offsets;
      const range = document.createRange();

      const startPos = this.findTextPosition(root, start);
      const endPos = this.findTextPosition(root, end);
      if (!startPos || !endPos) return;

      range.setStart(startPos.node, startPos.offset);
      range.setEnd(endPos.node, endPos.offset);

      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (e) {
      // ignore
    }
  }

  findTextPosition(root, charOffset) {
    let remaining = Math.max(0, charOffset);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const len = node.nodeValue ? node.nodeValue.length : 0;
      if (remaining <= len) {
        return { node, offset: remaining };
      }
      remaining -= len;
    }

    return null;
  }
}

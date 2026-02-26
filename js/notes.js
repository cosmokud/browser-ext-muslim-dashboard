/**
 * Notes Manager
 * Full-width Notes component with a lightweight WYSIWYG editor.
 * Features: title editing, rich text (B/I/U/S, lists, checklist, H1-H4, P), URL auto-linking,
 * paginated list (10 per page), and local persistence.
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

    // Markdown/raw toggle (raw = textarea editing, markdown = rendered preview)
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
        if (this.currentPage > 1) {
          this.currentPage -= 1;
          this.renderList();
          this.updatePaginationUI();
        }
      });
    }

    if (this.nextPageBtn) {
      this.nextPageBtn.addEventListener("click", () => {
        const totalPages = this.getTotalPages();
        if (this.currentPage < totalPages) {
          this.currentPage += 1;
          this.renderList();
          this.updatePaginationUI();
        }
      });
    }

    // List click (select note)
    this.listEl.addEventListener("click", (e) => {
      const item = e.target.closest(".notes-list-item");
      if (!item) return;
      const id = item.dataset.noteId;
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

      // Markdown mode is now WYSIWYG (editable rendered view). Raw mode is view-only.
      if (!this.isMarkdownPreview) return;

      try {
        this.editor.focus();
      } catch (e) {}

      if (block) {
        this.execFormatBlock(block);
      } else if (cmd === "checklist") {
        this.toggleChecklist();
      } else {
        this.execCommand(cmd);
      }

      // Persist post-command.
      this.queueSave();
    });

    // Raw editor is view-only (no editing).
    this.rawEditor.addEventListener("input", () => {
      // If something programmatically changes it, still persist.
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

    // WYSIWYG editing in markdown mode.
    this.editor.addEventListener("input", () => {
      if (!this.isMarkdownPreview) return;
      this.queueSave();
    });

    this.editor.addEventListener("blur", () => {
      this.saveNow({ renderList: false });
      // Sanitize in-place on blur to reduce risk from pasted HTML.
      this.sanitizeEditorInPlace();
    });

    // Paste handling: sanitize HTML fragments.
    this.editor.addEventListener("paste", (e) => {
      if (!this.isMarkdownPreview) return;
      try {
        if (!e.clipboardData) return;
        e.preventDefault();

        const html = e.clipboardData.getData("text/html") || "";
        const text = e.clipboardData.getData("text/plain") || "";

        if (html.trim()) {
          const clean = this.normalizeMarkdownHtmlForEditor(
            this.sanitizeHtml(String(html)),
          );
          try {
            document.execCommand("insertHTML", false, clean);
          } catch (err) {
            const safeText = this.escapeHtml(text).replace(/\n/g, "<br>");
            document.execCommand("insertHTML", false, safeText);
          }
        } else {
          const safeText = this.escapeHtml(text).replace(/\n/g, "<br>");
          document.execCommand("insertHTML", false, safeText);
        }

        this.queueSave();
      } catch (err) {
        // ignore
      }
    });
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
        const html = typeof n.html === "string" ? n.html : "";
        const mdRaw =
          typeof n.md === "string"
            ? n.md
            : typeof n.markdown === "string"
              ? n.markdown
              : "";
        const md = mdRaw || this.htmlToMarkdown(html);
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
        return { id, title, md, html, scale, createdAt, updatedAt };
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

      if (this.isMarkdownPreview) {
        // Markdown mode: editable rendered view is the source-of-truth.
        const rawHtml = String(this.editor.innerHTML || "");
        const sanitized = this.normalizeMarkdownHtmlForEditor(
          this.sanitizeHtml(rawHtml),
        );
        nextHtml = sanitized;
        nextMd = this.htmlToMarkdown(sanitized);

        // Keep raw viewer in sync.
        if (String(this.rawEditor.value || "") !== nextMd) {
          this.rawEditor.value = nextMd;
        }
      } else {
        // Raw mode is view-only; use whatever markdown we have.
        nextMd = String(this.rawEditor.value || note.md || "");
        nextHtml = this.renderMarkdown(nextMd);
      }

      const changed =
        nextTitle !== String(note.title || "") ||
        nextMd !== String(note.md || "") ||
        nextHtml !== String(note.html || "");

      note.title = nextTitle;
      note.md = nextMd;
      note.html = nextHtml;
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

    if (this.isMarkdownPreview) {
      const rawHtml = String(this.editor.innerHTML || "");
      const sanitized = this.normalizeMarkdownHtmlForEditor(
        this.sanitizeHtml(rawHtml),
      );
      nextHtml = sanitized;
      nextMd = this.htmlToMarkdown(sanitized);
      if (String(this.rawEditor.value || "") !== nextMd) {
        this.rawEditor.value = nextMd;
      }
    } else {
      nextMd = String(this.rawEditor.value || "");
      nextHtml = this.renderMarkdown(nextMd);
    }

    const changed =
      nextTitle !== String(current.title || "") ||
      nextMd !== String(current.md || "") ||
      nextHtml !== current.html;

    current.title = nextTitle;
    current.md = nextMd;
    current.html = nextHtml;
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
    // Persist before switching modes so we don't lose edits.
    this.persistActiveNote({ updateTimestampIfChanged: true });

    this.isMarkdownPreview = !this.isMarkdownPreview;
    this.storage.set(
      NotesManager.MARKDOWN_PREVIEW_STORAGE_KEY,
      this.isMarkdownPreview,
    );
    this.applyEditorMode();
    this.renderActiveMarkdownPreview();
  }

  applyEditorMode() {
    // Markdown mode = WYSIWYG editor; Raw mode = read-only markdown viewer.
    const isPreview = !!this.isMarkdownPreview;

    this.rawEditor.classList.toggle("hidden", isPreview);
    this.editor.classList.toggle("hidden", !isPreview);

    // Raw is view-only.
    try {
      this.rawEditor.readOnly = true;
      this.rawEditor.setAttribute("aria-readonly", "true");
    } catch (e) {}

    // Markdown mode is editable.
    this.editor.classList.toggle("notes-md-preview", isPreview);
    this.editor.setAttribute("contenteditable", isPreview ? "true" : "false");

    // Keep toolbar usable in markdown mode; just highlight the MD button.
    try {
      const buttons = this.toolbar.querySelectorAll("button.notes-tool-btn");
      buttons.forEach((b) => {
        const c = b.dataset.cmd;
        if (c === "toggleMarkdown") {
          b.classList.toggle("active", isPreview);
          return;
        }

        // Only the markdown (WYSIWYG) mode is editable.
        b.disabled = !isPreview;
      });
    } catch (e) {
      // ignore
    }
  }

  renderActiveMarkdownPreview() {
    const note = this.getActiveNote();
    if (!note) return;

    // Keep raw viewer synced from stored markdown.
    this.rawEditor.value = String(note.md || this.rawEditor.value || "");

    // Markdown mode shows rendered content (editable).
    const html = this.normalizeMarkdownHtmlForEditor(
      this.renderMarkdown(String(this.rawEditor.value || "")),
    );
    if (this.isMarkdownPreview) {
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
      const cleaned = this.normalizeMarkdownHtmlForEditor(
        this.sanitizeHtml(String(this.editor.innerHTML || "")),
      );
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
    const value = String(t.value || "");
    const start = typeof t.selectionStart === "number" ? t.selectionStart : 0;
    const end = typeof t.selectionEnd === "number" ? t.selectionEnd : start;

    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);

    const toggleWrap = (left, right = left) => {
      const l = String(left);
      const r = String(right);

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

  htmlToMarkdown(html) {
    const raw = typeof html === "string" ? html : "";
    if (!raw.trim()) return "";

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

      return Array.from(el.childNodes).map(toInline).join("");
    };

    const toBlock = (node) => {
      if (!node) return "";
      if (node.nodeType === Node.TEXT_NODE)
        return (node.nodeValue || "").trim();
      if (node.nodeType !== Node.ELEMENT_NODE) return "";

      const el = node;
      const tag = el.tagName;

      if (tag === "HR") return "---\n\n";

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

      if (tag === "P" || tag === "DIV") {
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

    return out.replace(/\n{3,}/g, "\n\n").trim();
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
    if (!note || !this.deleteModal) return;

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
    const totalPages = this.getTotalPages();
    this.currentPage = this.clampInt(
      this.currentPage,
      1,
      Math.max(1, totalPages),
    );

    const start = (this.currentPage - 1) * NotesManager.ITEMS_PER_PAGE;
    const end = start + NotesManager.ITEMS_PER_PAGE;
    const pageNotes = this.notes.slice(start, end);

    const frag = document.createDocumentFragment();

    pageNotes.forEach((note) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "notes-list-item";
      item.dataset.noteId = note.id;
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
      frag.appendChild(item);
    });

    this.listEl.innerHTML = "";
    this.listEl.appendChild(frag);

    this.updatePaginationUI();
  }

  ensureActiveVisible() {
    const idx = this.notes.findIndex((n) => n.id === this.activeNoteId);
    if (idx < 0) return;

    const page = Math.floor(idx / NotesManager.ITEMS_PER_PAGE) + 1;
    if (page !== this.currentPage) {
      this.currentPage = page;
      this.storage.set("notes_page", page);
      this.renderList();
    }
  }

  updatePaginationUI() {
    const totalPages = this.getTotalPages();
    const page = this.clampInt(this.currentPage, 1, Math.max(1, totalPages));
    this.currentPage = page;

    if (this.pageInfoEl) {
      this.pageInfoEl.textContent = `Page ${page} / ${Math.max(
        1,
        totalPages,
      )} (${this.notes.length})`;
    }

    if (this.prevPageBtn) this.prevPageBtn.disabled = page <= 1;
    if (this.nextPageBtn) this.nextPageBtn.disabled = page >= totalPages;
  }

  getTotalPages() {
    return Math.max(
      1,
      Math.ceil(this.notes.length / NotesManager.ITEMS_PER_PAGE),
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
    const allowed = new Set(["P", "H1", "H2", "H3", "H4"]);
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

  sanitizeHtml(html) {
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
      "TR",
      "TH",
      "TD",
      "DEL",
      "INPUT",
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
        if (tag === "A") {
          if (name === "href" || name === "target" || name === "rel") continue;
          el.removeAttribute(attr.name);
          continue;
        }

        if (tag === "IMG") {
          if (name === "src" || name === "alt" || name === "title") continue;
          el.removeAttribute(attr.name);
          continue;
        }

        if (tag === "INPUT") {
          if (name === "type" || name === "checked" || name === "disabled")
            continue;
          el.removeAttribute(attr.name);
          continue;
        }

        if (tag === "UL") {
          if (name === "class") {
            const keep = el.classList.contains("notes-checklist")
              ? "notes-checklist"
              : "";
            el.className = keep;
            continue;
          }
          el.removeAttribute(attr.name);
          continue;
        }

        if (tag === "LI") {
          if (name === "data-checked") continue;
          el.removeAttribute(attr.name);
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

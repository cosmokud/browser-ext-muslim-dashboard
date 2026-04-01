/**
 * Notes Studio (Milkdown + Markdown)
 * A standalone, theme-aware notes component with CRUD and full markdown toolbar.
 */

class NotesManager extends BaseManager {
  static STORAGE_KEY = "notes";
  static ACTIVE_NOTE_KEY = "notes_active";
  static VIEW_MODE_KEY = "notes_view_mode";
  static DEFAULT_TITLE = "Untitled";

  static DEFAULT_MARKDOWN = [
    "# Notes Studio",
    "",
    "Welcome to your markdown workspace.",
    "",
    "- Switch between Split / WYSIWYG / Markdown",
    "- Use toolbar actions for rich markdown editing",
    "- Notes save automatically",
  ].join("\n");

  constructor(storage) {
    super();
    this.storage = storage;

    this.notes = [];
    this.activeNoteId = null;

    this._milkdown = null;
    this._milkdownReady = false;
    this._suppressMilkdownChange = false;
    this._saveTimer = null;

    this.viewMode = this.readViewMode();

    this.card = document.getElementById("notesCard");
    if (!this.card) return;

    this.mount();
  }

  mount() {
    this.renderShell();
    this.cacheElements();
    this.bindEvents();

    this.notes = this.readNotesFromStorage();
    this.ensureAtLeastOneNote();
    this.selectInitialNote();

    this.renderList();
    this.renderActiveNote();
    this.applyViewMode(this.viewMode, { persist: false, focus: false });

    this.setupMilkdownEditor();
  }

  renderShell() {
    this.card.innerHTML = `
      <div class="mdnotes-shell">
        <div class="mdnotes-shell-header">
          <div class="mdnotes-title-wrap">
            <h2 class="mdnotes-title">Notes Studio</h2>
            <p class="mdnotes-subtitle">Milkdown WYSIWYG + Markdown source with auto-save</p>
          </div>

          <div class="mdnotes-header-actions">
            <button type="button" id="mdnotesNewBtn" class="mdnotes-pill-btn">New</button>
            <button type="button" id="mdnotesDeleteBtn" class="mdnotes-pill-btn danger">Delete</button>
          </div>
        </div>

        <div class="mdnotes-layout">
          <aside class="mdnotes-sidebar" aria-label="Notes list">
            <div class="mdnotes-list" id="mdnotesList" role="list"></div>
          </aside>

          <section class="mdnotes-main" aria-label="Active note editor">
            <div class="mdnotes-main-head">
              <input
                id="mdnotesTitleInput"
                class="mdnotes-title-input"
                type="text"
                maxlength="120"
                placeholder="Note title"
                aria-label="Note title"
              />

              <div class="mdnotes-view-switch" role="group" aria-label="Editor view mode">
                <button type="button" class="mdnotes-view-btn" data-view="split">Split</button>
                <button type="button" class="mdnotes-view-btn" data-view="wysiwyg">WYSIWYG</button>
                <button type="button" class="mdnotes-view-btn" data-view="markdown">Markdown</button>
              </div>
            </div>

            <div class="mdnotes-toolbar" id="mdnotesToolbar" role="toolbar" aria-label="Markdown toolbar">
              ${this.buildToolbarMarkup()}
            </div>

            <div class="mdnotes-editor-body" id="mdnotesEditorBody" data-view="split">
              <div class="mdnotes-pane mdnotes-pane-wysiwyg">
                <div class="mdnotes-pane-label">WYSIWYG</div>
                <div id="mdnotesWysiwyg" class="mdnotes-wysiwyg-host"></div>
              </div>

              <div class="mdnotes-pane mdnotes-pane-source">
                <div class="mdnotes-pane-label">Markdown</div>
                <textarea
                  id="mdnotesSource"
                  class="mdnotes-source"
                  spellcheck="true"
                  aria-label="Markdown source"
                ></textarea>
              </div>
            </div>

            <div class="mdnotes-footer">
              <span id="mdnotesStatus" class="mdnotes-status" data-state="loading">Loading editor...</span>
              <span id="mdnotesUpdated" class="mdnotes-updated"></span>
              <span id="mdnotesCounter" class="mdnotes-counter"></span>
            </div>
          </section>
        </div>
      </div>
    `;
  }

  buildToolbarMarkup() {
    return `
      <button type="button" class="mdnotes-tool-btn" data-cmd="bold" aria-label="Bold" title="Bold"><strong>B</strong></button>
      <button type="button" class="mdnotes-tool-btn" data-cmd="italic" aria-label="Italic" title="Italic"><em>I</em></button>
      <button type="button" class="mdnotes-tool-btn" data-cmd="underline" aria-label="Underline" title="Underline"><span class="u">U</span></button>
      <button type="button" class="mdnotes-tool-btn" data-cmd="strikeThrough" aria-label="Strikethrough" title="Strikethrough"><span class="s">S</span></button>
      <button type="button" class="mdnotes-tool-btn" data-cmd="inlineCode" aria-label="Inline code" title="Inline code">&lt;/&gt;</button>
      <button type="button" class="mdnotes-tool-btn" data-cmd="codeBlock" aria-label="Code block" title="Code block">Code</button>
      <button type="button" class="mdnotes-tool-btn" data-cmd="quote" aria-label="Block quote" title="Block quote">❝</button>

      <span class="mdnotes-tool-sep" aria-hidden="true"></span>

      <button type="button" class="mdnotes-tool-btn" data-cmd="insertUnorderedList" aria-label="Bullet list" title="Bullet list">• List</button>
      <button type="button" class="mdnotes-tool-btn" data-cmd="insertOrderedList" aria-label="Numbered list" title="Numbered list">1. List</button>
      <button type="button" class="mdnotes-tool-btn" data-cmd="checklist" aria-label="Task list" title="Task list">☑ Tasks</button>

      <span class="mdnotes-tool-sep" aria-hidden="true"></span>

      <button type="button" class="mdnotes-tool-btn" data-cmd="insertLink" aria-label="Insert link" title="Insert link">Link</button>
      <button type="button" class="mdnotes-tool-btn" data-cmd="insertImage" aria-label="Insert image" title="Insert image">Image</button>
      <button type="button" class="mdnotes-tool-btn" data-cmd="insertTable" aria-label="Insert table" title="Insert table">Table</button>
      <button type="button" class="mdnotes-tool-btn" data-cmd="insertHr" aria-label="Insert horizontal rule" title="Insert horizontal rule">HR</button>

      <span class="mdnotes-tool-sep" aria-hidden="true"></span>

      <button type="button" class="mdnotes-tool-btn" data-block="H1" aria-label="Heading 1" title="Heading 1">H1</button>
      <button type="button" class="mdnotes-tool-btn" data-block="H2" aria-label="Heading 2" title="Heading 2">H2</button>
      <button type="button" class="mdnotes-tool-btn" data-block="H3" aria-label="Heading 3" title="Heading 3">H3</button>
      <button type="button" class="mdnotes-tool-btn" data-block="H4" aria-label="Heading 4" title="Heading 4">H4</button>
      <button type="button" class="mdnotes-tool-btn" data-block="H5" aria-label="Heading 5" title="Heading 5">H5</button>
      <button type="button" class="mdnotes-tool-btn" data-block="H6" aria-label="Heading 6" title="Heading 6">H6</button>
      <button type="button" class="mdnotes-tool-btn" data-block="P" aria-label="Paragraph" title="Paragraph">P</button>
    `;
  }

  cacheElements() {
    this.newBtn = this.card.querySelector("#mdnotesNewBtn");
    this.deleteBtn = this.card.querySelector("#mdnotesDeleteBtn");

    this.listEl = this.card.querySelector("#mdnotesList");
    this.titleInput = this.card.querySelector("#mdnotesTitleInput");
    this.toolbar = this.card.querySelector("#mdnotesToolbar");

    this.viewBtns = Array.from(
      this.card.querySelectorAll(".mdnotes-view-btn[data-view]"),
    );
    this.editorBody = this.card.querySelector("#mdnotesEditorBody");

    this.sourceEl = this.card.querySelector("#mdnotesSource");
    this.wysiwygHost = this.card.querySelector("#mdnotesWysiwyg");

    this.statusEl = this.card.querySelector("#mdnotesStatus");
    this.updatedEl = this.card.querySelector("#mdnotesUpdated");
    this.counterEl = this.card.querySelector("#mdnotesCounter");
  }

  bindEvents() {
    if (this.newBtn) {
      this.newBtn.addEventListener("click", () => {
        this.persistActiveNote({ markUpdated: true });
        const note = this.createNote();
        this.selectNote(note.id, { skipPersistCurrent: true, focus: true });
        this.saveNow();
      });
    }

    if (this.deleteBtn) {
      this.deleteBtn.addEventListener("click", () => {
        const active = this.getActiveNote();
        if (!active) return;
        this.showDeleteConfirmationForNoteId(active.id);
      });
    }

    if (this.listEl) {
      this.listEl.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const delBtn = target.closest(".mdnotes-list-delete");
        if (delBtn) {
          event.preventDefault();
          event.stopPropagation();
          const noteId = String(
            delBtn.getAttribute("data-note-id") || "",
          ).trim();
          if (noteId) this.showDeleteConfirmationForNoteId(noteId);
          return;
        }

        const item = target.closest(".mdnotes-list-item");
        if (!item) return;
        const noteId = String(item.getAttribute("data-note-id") || "").trim();
        if (!noteId) return;
        this.selectNote(noteId, { focus: true });
      });
    }

    if (this.titleInput) {
      this.titleInput.addEventListener("input", () => {
        const note = this.getActiveNote();
        if (!note) return;

        note.title =
          String(this.titleInput.value || "").trim() ||
          NotesManager.DEFAULT_TITLE;
        note.updatedAt = Date.now();

        this.renderList();
        this.updateMeta(note);
        this.queueSave();
      });
    }

    if (this.sourceEl) {
      this.sourceEl.addEventListener("input", () => {
        const markdown = String(this.sourceEl.value || "");
        this.setActiveNoteMarkdown(markdown, {
          markUpdated: true,
          syncSource: false,
        });

        if (this.isMilkdownEnabled() && this.viewMode !== "markdown") {
          this.setMilkdownMarkdown(markdown, { silent: true });
        }

        this.queueSave();
      });
    }

    if (this.toolbar) {
      this.toolbar.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const btn = target.closest(".mdnotes-tool-btn");
        if (!btn) return;

        const cmd = String(btn.getAttribute("data-cmd") || "").trim();
        const block = String(btn.getAttribute("data-block") || "").trim();
        if (!cmd && !block) return;

        this.applyToolbarAction(cmd, block);
      });
    }

    this.viewBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const view = String(btn.getAttribute("data-view") || "split");
        this.applyViewMode(view, { persist: true, focus: true });
      });
    });
  }

  readViewMode() {
    const fallback = "split";

    try {
      const value = String(
        this.storage?.get?.(NotesManager.VIEW_MODE_KEY, fallback) || fallback,
      );
      if (value === "split" || value === "wysiwyg" || value === "markdown") {
        return value;
      }
    } catch (error) {}

    return fallback;
  }

  writeViewMode() {
    try {
      this.storage?.set?.(NotesManager.VIEW_MODE_KEY, this.viewMode);
    } catch (error) {}
  }

  applyViewMode(view, { persist = true, focus = false } = {}) {
    const requested =
      view === "split" || view === "wysiwyg" || view === "markdown"
        ? view
        : "split";

    if (!this.isMilkdownEnabled() && requested !== "markdown") {
      this.viewMode = "markdown";
    } else {
      this.viewMode = requested;
    }

    if (this.editorBody) {
      this.editorBody.setAttribute("data-view", this.viewMode);
    }

    this.viewBtns.forEach((btn) => {
      const mode = String(btn.getAttribute("data-view") || "split");
      const active = mode === this.viewMode;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      if (mode !== "markdown") {
        btn.disabled = !this.isMilkdownEnabled();
      }
    });

    if (this.viewMode === "markdown") {
      if (this.isMilkdownEnabled()) {
        this.syncSourceFromMilkdown();
      }
      if (focus) this.sourceEl?.focus();
    } else if (this.isMilkdownEnabled()) {
      this.syncMilkdownFromSource();
      if (focus) this._milkdown?.focus?.();
    }

    if (persist) {
      this.writeViewMode();
    }
  }

  ensureAtLeastOneNote() {
    if (Array.isArray(this.notes) && this.notes.length) return;
    this.notes = [this.buildNewNote()];
    this.writeNotes();
  }

  selectInitialNote() {
    const preferredId = String(
      this.storage?.get?.(
        NotesManager.ACTIVE_NOTE_KEY,
        this.notes[0]?.id || "",
      ) ||
        this.notes[0]?.id ||
        "",
    );

    const exists = this.notes.some((note) => String(note.id) === preferredId);
    this.activeNoteId = exists ? preferredId : String(this.notes[0]?.id || "");
  }

  setupMilkdownEditor() {
    if (
      !window.NotesMilkdown ||
      typeof window.NotesMilkdown.create !== "function"
    ) {
      this._milkdown = null;
      this._milkdownReady = false;
      this.updateStatus(
        "Milkdown adapter not available. Markdown mode active.",
        "error",
      );
      this.applyViewMode("markdown", { persist: true, focus: false });
      return;
    }

    const note = this.getActiveNote();
    const seed = String(note?.md || "");

    this.updateStatus("Loading Milkdown...", "loading");

    window.NotesMilkdown.create({
      root: this.wysiwygHost,
      defaultMarkdown: seed,
      onMarkdownChange: (markdown) => this.onMilkdownChange(markdown),
      onBlur: () => this.queueSave({ immediate: true }),
    })
      .then((adapter) => {
        this._milkdown = adapter;
        this._milkdownReady = true;

        this.updateStatus("Ready", "ok");

        this.setMilkdownMarkdown(seed, { silent: true });
        this.applyViewMode(this.viewMode, { persist: false, focus: false });
      })
      .catch((error) => {
        console.warn("Milkdown initialization failed:", error);
        this._milkdown = null;
        this._milkdownReady = false;

        this.updateStatus(
          "Milkdown failed to initialize. Markdown mode active.",
          "error",
        );
        this.applyViewMode("markdown", { persist: true, focus: false });
      });
  }

  isMilkdownEnabled() {
    return !!(this._milkdownReady && this._milkdown);
  }

  onMilkdownChange(markdown) {
    if (!this.isMilkdownEnabled()) return;
    if (this._suppressMilkdownChange) return;

    const next = String(markdown || "");
    this.setActiveNoteMarkdown(next, { markUpdated: true, syncSource: true });
    this.queueSave();
  }

  getMilkdownMarkdown() {
    if (!this.isMilkdownEnabled()) return "";

    try {
      return String(this._milkdown.getMarkdown() || "");
    } catch (error) {
      return "";
    }
  }

  setMilkdownMarkdown(markdown, { silent = true } = {}) {
    if (!this.isMilkdownEnabled()) return;

    const next = String(markdown || "");
    const current = this.getMilkdownMarkdown();
    if (current === next) return;

    this._suppressMilkdownChange = !!silent;

    try {
      this._milkdown.setMarkdown(next, { silent: !!silent });
    } catch (error) {
      // Keep source editor operational even if visual sync fails.
    } finally {
      if (silent) {
        window.setTimeout(() => {
          this._suppressMilkdownChange = false;
        }, 0);
      } else {
        this._suppressMilkdownChange = false;
      }
    }
  }

  syncSourceFromMilkdown() {
    const markdown = this.getMilkdownMarkdown();
    if (!this.sourceEl) return;
    if (this.sourceEl.value === markdown) return;
    this.sourceEl.value = markdown;
  }

  syncMilkdownFromSource() {
    if (!this.sourceEl) return;
    this.setMilkdownMarkdown(this.sourceEl.value || "", { silent: true });
  }

  readNotesFromStorage() {
    const raw = this.storage?.getNotes
      ? this.storage.getNotes()
      : this.storage?.get?.(NotesManager.STORAGE_KEY, []);

    if (!Array.isArray(raw)) return [];

    const now = Date.now();

    return raw
      .map((entry, idx) => this.normalizeNote(entry, idx, now))
      .filter((entry) => !!entry)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  normalizeNote(entry, idx, now) {
    if (!entry || typeof entry !== "object") return null;

    const id = String(entry.id || this.createNoteId()).trim();
    if (!id) return null;

    const title =
      String(entry.title || "").trim() ||
      `${NotesManager.DEFAULT_TITLE} #${idx + 1}`;

    const mdFromHtml = this.htmlToText(entry.html);
    const md = typeof entry.md === "string" ? String(entry.md) : mdFromHtml;

    const createdAt = Number.isFinite(Number(entry.createdAt))
      ? Number(entry.createdAt)
      : now;

    const updatedAt = Number.isFinite(Number(entry.updatedAt))
      ? Number(entry.updatedAt)
      : createdAt;

    return {
      id,
      title,
      md,
      html:
        typeof entry.html === "string" && entry.html.trim()
          ? String(entry.html)
          : this.markdownToHtml(md),
      createdAt,
      updatedAt,
    };
  }

  htmlToText(html) {
    const value = String(html || "");
    if (!value.trim()) return "";

    try {
      const host = document.createElement("div");
      host.innerHTML = value;
      return String(host.textContent || host.innerText || "");
    } catch (error) {
      return value;
    }
  }

  markdownToHtml(markdown) {
    const md = String(markdown || "");
    if (!md.trim()) return "";

    return this.escapeHtml(md)
      .replace(/\n/g, "<br>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
  }

  writeNotes() {
    const payload = Array.isArray(this.notes) ? this.notes : [];

    if (this.storage?.saveNotes) {
      this.storage.saveNotes(payload);
    } else if (this.storage?.set) {
      this.storage.set(NotesManager.STORAGE_KEY, payload);
    }

    try {
      this.storage?.set?.(
        NotesManager.ACTIVE_NOTE_KEY,
        String(this.activeNoteId || ""),
      );
    } catch (error) {}
  }

  buildNewNote() {
    const now = Date.now();
    return {
      id: this.createNoteId(),
      title: NotesManager.DEFAULT_TITLE,
      md: NotesManager.DEFAULT_MARKDOWN,
      html: this.markdownToHtml(NotesManager.DEFAULT_MARKDOWN),
      createdAt: now,
      updatedAt: now,
    };
  }

  createNote() {
    const note = this.buildNewNote();
    this.notes.unshift(note);
    this.activeNoteId = String(note.id);
    return note;
  }

  createNoteId() {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }
    return `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  getActiveNote() {
    return (
      this.notes.find(
        (note) => String(note.id) === String(this.activeNoteId),
      ) || null
    );
  }

  setActiveNoteMarkdown(
    markdown,
    { markUpdated = false, syncSource = false } = {},
  ) {
    const note = this.getActiveNote();
    if (!note) return;

    const next = String(markdown || "");
    if (String(note.md || "") === next && !markUpdated) {
      if (syncSource && this.sourceEl && this.sourceEl.value !== next) {
        this.sourceEl.value = next;
      }
      this.updateCounter(next);
      return;
    }

    note.md = next;
    note.html = this.markdownToHtml(next);
    if (markUpdated) {
      note.updatedAt = Date.now();
      this.updateMeta(note);
    }

    if (syncSource && this.sourceEl && this.sourceEl.value !== next) {
      this.sourceEl.value = next;
    }

    this.updateCounter(next);
    this.renderList();
  }

  persistActiveNote({ markUpdated = false } = {}) {
    const note = this.getActiveNote();
    if (!note) return false;

    const nextTitle =
      String(this.titleInput?.value || "").trim() || NotesManager.DEFAULT_TITLE;

    const nextMarkdown =
      this.viewMode === "markdown" || !this.isMilkdownEnabled()
        ? String(this.sourceEl?.value || "")
        : this.getMilkdownMarkdown();

    const changed =
      String(note.title || "") !== nextTitle ||
      String(note.md || "") !== nextMarkdown;

    note.title = nextTitle;
    note.md = nextMarkdown;
    note.html = this.markdownToHtml(nextMarkdown);

    if (changed && markUpdated) {
      note.updatedAt = Date.now();
    }

    return changed;
  }

  selectNote(id, { skipPersistCurrent = false, focus = false } = {}) {
    const noteId = String(id || "").trim();
    if (!noteId) return;

    const next = this.notes.find((entry) => String(entry.id) === noteId);
    if (!next) return;

    if (!skipPersistCurrent) {
      this.persistActiveNote({ markUpdated: true });
    }

    this.activeNoteId = noteId;
    this.renderActiveNote();
    this.renderList();

    if (focus) {
      this.focusEditor();
    }

    this.writeNotes();
  }

  focusEditor() {
    if (this.viewMode === "markdown") {
      this.sourceEl?.focus();
      return;
    }

    if (
      this.isMilkdownEnabled() &&
      typeof this._milkdown.focus === "function"
    ) {
      try {
        this._milkdown.focus();
        return;
      } catch (error) {}
    }

    this.sourceEl?.focus();
  }

  renderActiveNote() {
    const note = this.getActiveNote();
    if (!note) return;

    if (this.titleInput) {
      this.titleInput.value = String(note.title || NotesManager.DEFAULT_TITLE);
    }

    if (this.sourceEl) {
      this.sourceEl.value = String(note.md || "");
    }

    if (this.isMilkdownEnabled()) {
      this.setMilkdownMarkdown(String(note.md || ""), { silent: true });
    }

    this.updateMeta(note);
    this.updateCounter(String(note.md || ""));

    if (this.deleteBtn) {
      this.deleteBtn.disabled = this.notes.length <= 0;
    }
  }

  renderList() {
    if (!this.listEl) return;

    const prevScrollTop = this.listEl.scrollTop;
    this.listEl.innerHTML = "";

    this.notes.forEach((note) => {
      const item = document.createElement("div");
      item.className = "mdnotes-list-item";
      item.setAttribute("role", "button");
      item.setAttribute("tabindex", "0");
      item.setAttribute("data-note-id", String(note.id));

      if (String(note.id) === String(this.activeNoteId)) {
        item.classList.add("active");
      }

      const title = document.createElement("div");
      title.className = "mdnotes-list-title";
      title.textContent = String(note.title || NotesManager.DEFAULT_TITLE);

      const meta = document.createElement("div");
      meta.className = "mdnotes-list-meta";
      meta.textContent = this.formatUpdatedDate(note.updatedAt);

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "mdnotes-list-delete";
      delBtn.setAttribute("data-note-id", String(note.id));
      delBtn.setAttribute(
        "aria-label",
        `Delete note ${String(note.title || NotesManager.DEFAULT_TITLE)}`,
      );
      delBtn.title = "Delete note";
      delBtn.textContent = "🗑";

      item.appendChild(title);
      item.appendChild(meta);
      item.appendChild(delBtn);

      item.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        this.selectNote(String(note.id), { focus: true });
      });

      this.listEl.appendChild(item);
    });

    this.listEl.scrollTop = prevScrollTop;
  }

  formatUpdatedDate(updatedAt) {
    const ts = Number(updatedAt || 0);
    if (!Number.isFinite(ts) || ts <= 0) return "";

    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) return "";

    return `Updated ${date.toLocaleDateString()}`;
  }

  updateMeta(note) {
    if (!this.updatedEl) return;

    if (!note) {
      this.updatedEl.textContent = "";
      return;
    }

    this.updatedEl.textContent = this.formatUpdatedDate(note.updatedAt);
  }

  updateCounter(markdown) {
    if (!this.counterEl) return;

    const text = String(markdown || "");
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;

    this.counterEl.textContent = `${words} words | ${chars} chars`;
  }

  updateStatus(text, state = "ok") {
    if (!this.statusEl) return;
    this.statusEl.textContent = String(text || "");
    this.statusEl.setAttribute("data-state", state);
  }

  queueSave({ immediate = false } = {}) {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }

    if (immediate) {
      this.saveNow();
      return;
    }

    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this.saveNow();
    }, 240);
  }

  saveNow() {
    this.persistActiveNote({ markUpdated: true });
    this.notes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    if (
      !this.notes.some((note) => String(note.id) === String(this.activeNoteId))
    ) {
      this.activeNoteId = String(this.notes[0]?.id || "");
    }

    this.writeNotes();
    this.renderList();
    this.renderActiveNote();
  }

  deleteNoteById(noteId) {
    const id = String(noteId || "").trim();
    if (!id) return;

    const idx = this.notes.findIndex((note) => String(note.id) === id);
    if (idx < 0) return;

    const wasActive = String(this.activeNoteId) === id;
    this.notes.splice(idx, 1);

    if (!this.notes.length) {
      const created = this.buildNewNote();
      this.notes = [created];
      this.activeNoteId = String(created.id);
    } else if (wasActive) {
      this.activeNoteId = String(this.notes[0].id);
    }

    this.saveNow();
  }

  showDeleteConfirmationForNoteId(noteId) {
    const id = String(noteId || "").trim();
    if (!id) return;

    const note = this.notes.find((entry) => String(entry.id) === id);
    if (!note) return;

    const ok = window.confirm(
      `Delete note \"${String(note.title || NotesManager.DEFAULT_TITLE)}\"?`,
    );
    if (!ok) return;

    this.deleteNoteById(id);
  }

  applyToolbarAction(cmd, block) {
    if (this.viewMode !== "markdown" && this.isMilkdownEnabled()) {
      this._milkdown.focus();

      let applied = false;
      try {
        applied = !!this._milkdown.runToolbarAction(cmd, block);
      } catch (error) {
        applied = false;
      }

      if (applied) {
        const markdown = this.getMilkdownMarkdown();
        this.setActiveNoteMarkdown(markdown, {
          markUpdated: true,
          syncSource: true,
        });
        this.queueSave();
        return;
      }
    }

    this.applyRawToolbarAction(cmd, block);

    const markdown = String(this.sourceEl?.value || "");
    this.setActiveNoteMarkdown(markdown, {
      markUpdated: true,
      syncSource: false,
    });

    if (this.viewMode !== "markdown" && this.isMilkdownEnabled()) {
      this.setMilkdownMarkdown(markdown, { silent: true });
    }

    this.queueSave();
  }

  applyRawToolbarAction(cmd, block) {
    if (!this.sourceEl) return;

    this.sourceEl.focus();

    if (block) {
      const headingMatch = /^H([1-6])$/i.exec(block);
      if (headingMatch) {
        const level = Number.parseInt(headingMatch[1], 10);
        this.prefixSelectedLines("#".repeat(level) + " ", {
          normalizeHeading: true,
        });
        return;
      }

      if (String(block).toUpperCase() === "P") {
        this.prefixSelectedLines("", { removeHeadingOnly: true });
      }
      return;
    }

    switch (cmd) {
      case "bold":
        this.wrapRawSelection("**", "**", "bold text");
        break;
      case "italic":
        this.wrapRawSelection("*", "*", "italic text");
        break;
      case "underline":
        this.wrapRawSelection("<u>", "</u>", "underlined text");
        break;
      case "strikeThrough":
        this.wrapRawSelection("~~", "~~", "strikethrough");
        break;
      case "inlineCode":
        this.wrapRawSelection("`", "`", "code");
        break;
      case "quote":
        this.prefixSelectedLines("> ");
        break;
      case "insertUnorderedList":
        this.prefixSelectedLines("- ");
        break;
      case "insertOrderedList":
        this.prefixSelectedLines("1. ");
        break;
      case "checklist":
        this.prefixSelectedLines("- [ ] ");
        break;
      case "codeBlock":
        this.wrapRawSelection("```\n", "\n```", "code block");
        break;
      case "insertHr":
        this.insertRawText("\n---\n");
        break;
      case "insertLink": {
        const selected = this.getRawSelectedText() || "link text";
        const href = window.prompt("Enter link URL", "https://");
        if (href == null) return;
        const nextHref = String(href || "").trim();
        if (!nextHref) return;
        this.insertRawText(`[${selected}](${nextHref})`);
        break;
      }
      case "insertImage": {
        const src = window.prompt("Enter image URL", "https://");
        if (src == null) return;
        const nextSrc = String(src || "").trim();
        if (!nextSrc) return;

        const altRaw = window.prompt("Enter image alt text", "Image");
        if (altRaw == null) return;

        const alt = String(altRaw || "Image").trim() || "Image";
        this.insertRawText(`![${alt}](${nextSrc})`);
        break;
      }
      case "insertTable":
        this.insertRawText(
          "\n| Column 1 | Column 2 |\n| --- | --- |\n| Value 1 | Value 2 |\n",
        );
        break;
      default:
        break;
    }
  }

  getRawSelectedText() {
    if (!this.sourceEl) return "";

    const start = this.sourceEl.selectionStart || 0;
    const end = this.sourceEl.selectionEnd || 0;
    return String(this.sourceEl.value || "").slice(start, end);
  }

  wrapRawSelection(prefix, suffix, fallbackText) {
    if (!this.sourceEl) return;

    const textarea = this.sourceEl;
    const value = String(textarea.value || "");

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;

    const selected = value.slice(start, end) || String(fallbackText || "");
    const wrapped = `${prefix}${selected}${suffix}`;

    textarea.value = value.slice(0, start) + wrapped + value.slice(end);

    const selStart = start + prefix.length;
    const selEnd = selStart + selected.length;

    textarea.setSelectionRange(selStart, selEnd);
    textarea.focus();
  }

  insertRawText(text) {
    if (!this.sourceEl) return;

    const textarea = this.sourceEl;
    const value = String(textarea.value || "");

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;

    textarea.value = value.slice(0, start) + text + value.slice(end);

    const nextPos = start + String(text).length;
    textarea.setSelectionRange(nextPos, nextPos);
    textarea.focus();
  }

  prefixSelectedLines(prefix, options = {}) {
    if (!this.sourceEl) return;

    const textarea = this.sourceEl;
    const value = String(textarea.value || "");

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;

    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const lineEndIdx = value.indexOf("\n", end);
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;

    const segment = value.slice(lineStart, lineEnd);
    const lines = segment.split("\n");

    const normalized = lines.map((line) => {
      const noHeading = line.replace(/^\s{0,3}#{1,6}\s+/, "");

      if (options.removeHeadingOnly) return noHeading;
      if (options.normalizeHeading) return prefix + noHeading;
      return prefix + line;
    });

    const nextSegment = normalized.join("\n");
    textarea.value =
      value.slice(0, lineStart) + nextSegment + value.slice(lineEnd);

    const nextStart = lineStart;
    const nextEnd = lineStart + nextSegment.length;
    textarea.setSelectionRange(nextStart, nextEnd);
    textarea.focus();
  }

  getSearchItems() {
    return this.notes.slice();
  }

  focusNoteById(id) {
    const noteId = String(id || "").trim();
    if (!noteId) return;

    const exists = this.notes.some((note) => String(note.id) === noteId);
    if (!exists) return;

    this.selectNote(noteId, { focus: true });

    const item = this.listEl?.querySelector(
      `.mdnotes-list-item[data-note-id="${noteId}"]`,
    );

    if (item && typeof item.scrollIntoView === "function") {
      item.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }

  reloadFromStorage() {
    const currentId = String(this.activeNoteId || "").trim();

    this.notes = this.readNotesFromStorage();
    this.ensureAtLeastOneNote();

    const preferredId = this.notes.some((n) => String(n.id) === currentId)
      ? currentId
      : String(this.notes[0].id);

    this.activeNoteId = preferredId;

    this.writeNotes();
    this.renderList();
    this.renderActiveNote();

    if (this.isMilkdownEnabled()) {
      this.syncMilkdownFromSource();
    }
  }
}

window.NotesManager = NotesManager;

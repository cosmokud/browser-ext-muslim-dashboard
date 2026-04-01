/**
 * Notes Manager (TipTap)
 * Rebuild of the Notes component using a live WYSIWYG editor.
 * Preserves CRUD behavior and storage keys used across the dashboard.
 */

class NotesManager extends BaseManager {
  static STORAGE_KEY = "notes";
  static ACTIVE_NOTE_KEY = "notes_active";
  static PAGE_KEY = "notes_page";
  static PREVIEW_KEY = "notes_markdown_preview";

  static ITEMS_PER_PAGE = 10;
  static SCALE_MIN = 1;
  static SCALE_MAX = 5;
  static DEFAULT_TITLE = "Untitled";

  constructor(storage) {
    super();
    this.storage = storage;

    this.notes = [];
    this.activeNoteId = null;
    this.currentPage = 1;

    this._saveTimer = null;
    this._suppressEditorUpdate = false;

    this.editorInstance = null;
    this.isSourceMode = false;

    this.card = document.getElementById("notesCard");
    this.newBtn = document.getElementById("notesNewBtn");
    this.deleteBtn = document.getElementById("notesDeleteBtn");

    this.listEl = document.getElementById("notesList");
    this.prevPageBtn = document.getElementById("notesPrevPageBtn");
    this.nextPageBtn = document.getElementById("notesNextPageBtn");

    this.titleInput = document.getElementById("notesTitleInput");
    this.toolbar = document.getElementById("notesToolbar");

    this.editor = document.getElementById("notesEditor");
    this.rawEditor = document.getElementById("notesRawEditor");
    this.markdownToggleBtn = document.getElementById("notesMarkdownToggleBtn");

    this.scaleRange = document.getElementById("notesScaleRange");
    this.scaleValueEl = document.getElementById("notesScaleValue");

    this.deleteModal = document.getElementById("notesDeleteConfirmModal");
    this.deleteNameEl = document.getElementById("notesDeleteName");
    this.confirmDeleteBtn = document.getElementById("confirmNotesDeleteBtn");
    this.cancelDeleteBtn = document.getElementById("cancelNotesDeleteBtn");
    this.pendingDeleteId = null;

    if (
      !this.card ||
      !this.listEl ||
      !this.titleInput ||
      !this.toolbar ||
      !this.editor ||
      !this.rawEditor
    ) {
      return;
    }

    this.init();
  }

  init() {
    this.loadNotesFromStorage();
    this.isSourceMode = !this.storage.get(NotesManager.PREVIEW_KEY, true);

    this.setupTiptapEditor();
    this.bindEvents();

    this.ensureAtLeastOneNote();

    const preferredId = this.storage.get(NotesManager.ACTIVE_NOTE_KEY, null);
    const initialId = this.notes.some(
      (n) => String(n.id) === String(preferredId),
    )
      ? String(preferredId)
      : String(this.notes[0].id);

    this.selectNote(initialId, {
      skipPersistCurrent: true,
      focusEditor: false,
    });
    this.applyEditorMode();
    this.renderList();
  }

  bindEvents() {
    this.newBtn?.addEventListener("click", () => this.handleCreateNote());
    this.deleteBtn?.addEventListener("click", () =>
      this.showDeleteConfirmation(),
    );

    this.prevPageBtn?.addEventListener("click", () => {
      const next = Math.max(1, this.currentPage - 1);
      if (next === this.currentPage) return;
      this.currentPage = next;
      this.storage.set(NotesManager.PAGE_KEY, this.currentPage);
      this.renderList();
    });

    this.nextPageBtn?.addEventListener("click", () => {
      const totalPages = Math.max(
        1,
        Math.ceil(this.notes.length / NotesManager.ITEMS_PER_PAGE),
      );
      const next = Math.min(totalPages, this.currentPage + 1);
      if (next === this.currentPage) return;
      this.currentPage = next;
      this.storage.set(NotesManager.PAGE_KEY, this.currentPage);
      this.renderList();
    });

    this.titleInput.addEventListener("input", () => this.queueSave());
    this.titleInput.addEventListener("blur", () =>
      this.saveNow({ renderList: true }),
    );

    this.toolbar.addEventListener("click", (event) => {
      const btn = event.target.closest(".notes-tool-btn");
      if (!btn) return;
      this.handleToolbarButton(btn);
    });

    this.rawEditor.addEventListener("input", () => {
      if (!this.isSourceMode) return;
      this.queueSave({ renderList: false });
    });

    this.rawEditor.addEventListener("blur", () => {
      if (!this.isSourceMode) return;
      this.saveNow({ renderList: false });
    });

    this.markdownToggleBtn?.addEventListener("click", () =>
      this.toggleSourceMode(),
    );

    this.scaleRange?.addEventListener("input", () => {
      const next = this.clampScale(parseFloat(this.scaleRange.value));
      this.applyScale(next);
      this.updateScaleUi(next);
      this.queueSave({ renderList: false });
    });

    this.confirmDeleteBtn?.addEventListener("click", () =>
      this.confirmDelete(),
    );
    this.cancelDeleteBtn?.addEventListener("click", () =>
      this.hideDeleteConfirmation(),
    );

    this._bindOverlayCloseBehavior(this.deleteModal, () =>
      this.hideDeleteConfirmation(),
    );
  }

  setupTiptapEditor() {
    const T = window.TiptapNotesBundle;
    if (!T || typeof T.Editor !== "function") {
      // Fallback: keep editor usable if bundle failed to load.
      this.editor.setAttribute("contenteditable", "true");
      this.editor.addEventListener("input", () => {
        this.rawEditor.value = this.sanitizeHtml(this.editor.innerHTML);
        this.queueSave({ renderList: false });
      });
      return;
    }

    this.editor.classList.add("notes-editor-tiptap");

    this.editorInstance = new T.Editor({
      element: this.editor,
      extensions: [
        T.Document,
        T.Text,
        T.Paragraph,
        T.Bold,
        T.Italic,
        T.Strike,
        T.Code,
        T.CodeBlock,
        T.Heading.configure({ levels: [1, 2, 3, 4] }),
        T.Blockquote,
        T.BulletList,
        T.OrderedList,
        T.ListItem,
        T.HardBreak,
        T.HorizontalRule,
        T.History,
        T.Dropcursor,
        T.Gapcursor,
        T.Underline,
        T.Link.configure({
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          HTMLAttributes: {
            rel: "noopener noreferrer nofollow",
            target: "_blank",
          },
        }),
        T.Image,
        T.Table.configure({
          resizable: true,
          allowTableNodeSelection: true,
        }),
        T.TableRow,
        T.TableHeader,
        T.TableCell,
        T.TaskList,
        T.TaskItem.configure({ nested: true }),
        T.Placeholder.configure({
          placeholder: "Start writing your note...",
        }),
      ],
      content: "<p></p>",
      autofocus: false,
      injectCSS: false,
      onUpdate: () => {
        if (this._suppressEditorUpdate) return;
        this.rawEditor.value = this.getEditorHtml();
        this.queueSave({ renderList: false });
        this.updateToolbarState();
      },
      onSelectionUpdate: () => this.updateToolbarState(),
      onFocus: () => this.updateToolbarState(),
      onBlur: () => this.saveNow({ renderList: false }),
    });
  }

  loadNotesFromStorage() {
    const saved = this.storage.get(NotesManager.STORAGE_KEY, []);
    const input = Array.isArray(saved) ? saved : [];

    const seen = new Set();
    this.notes = input
      .filter((note) => note && typeof note === "object")
      .map((note, idx) => this.normalizeNote(note, idx, seen))
      .filter(Boolean)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    const page = parseInt(this.storage.get(NotesManager.PAGE_KEY, 1), 10);
    this.currentPage = Number.isFinite(page) && page > 0 ? page : 1;
  }

  normalizeNote(note, idx, seen) {
    let id = String(note.id || "").trim();
    if (!id || seen.has(id)) {
      id = this.createId();
    }
    seen.add(id);

    const title = String(note.title || NotesManager.DEFAULT_TITLE).slice(
      0,
      120,
    );

    let html = "";
    if (typeof note.html === "string" && note.html.trim()) {
      html = this.sanitizeHtml(note.html);
    } else if (typeof note.md === "string" && note.md.trim()) {
      html = this.markdownToHtml(note.md);
    } else if (typeof note.content === "string" && note.content.trim()) {
      html = this.markdownToHtml(note.content);
    } else {
      html = "<p></p>";
    }

    const rawScale =
      typeof note.scale === "number" || typeof note.scale === "string"
        ? parseFloat(note.scale)
        : NotesManager.SCALE_MIN;

    const createdAt =
      typeof note.createdAt === "number" && Number.isFinite(note.createdAt)
        ? note.createdAt
        : Date.now() - (idx + 1);

    const updatedAt =
      typeof note.updatedAt === "number" && Number.isFinite(note.updatedAt)
        ? note.updatedAt
        : createdAt;

    return {
      id,
      title,
      html,
      md: "",
      scale: this.clampScale(rawScale),
      createdAt,
      updatedAt,
    };
  }

  ensureAtLeastOneNote() {
    if (this.notes.length) return;
    const note = this.createNote();
    this.notes = [note];
    this.activeNoteId = String(note.id);
    this.currentPage = 1;
    this.writeNotes();
  }

  createNote() {
    const now = Date.now();
    return {
      id: this.createId(),
      title: NotesManager.DEFAULT_TITLE,
      html: "<p></p>",
      md: "",
      scale: NotesManager.SCALE_MIN,
      createdAt: now,
      updatedAt: now,
    };
  }

  handleCreateNote() {
    this.persistActiveNote({ updateTimestampIfChanged: true });

    const note = this.createNote();
    this.notes.unshift(note);

    this.activeNoteId = String(note.id);
    this.currentPage = 1;

    this.writeNotes();
    this.selectNote(note.id, { skipPersistCurrent: true, focusEditor: true });
    this.renderList();
  }

  selectNote(id, { skipPersistCurrent = false, focusEditor = true } = {}) {
    const noteId = String(id || "").trim();
    const note = this.notes.find((entry) => String(entry.id) === noteId);
    if (!note) return;

    if (!skipPersistCurrent) {
      this.persistActiveNote({ updateTimestampIfChanged: true });
    }

    this.activeNoteId = noteId;
    this.storage.set(NotesManager.ACTIVE_NOTE_KEY, noteId);

    this.titleInput.value = String(note.title || "");

    const sanitizedHtml = this.sanitizeHtml(String(note.html || "<p></p>"));
    this.rawEditor.value = sanitizedHtml;
    this.setEditorHtml(sanitizedHtml);

    const scale = this.clampScale(note.scale);
    note.scale = scale;
    this.applyScale(scale);
    this.updateScaleUi(scale);

    this.currentPage = this.getPageForNoteId(noteId);
    this.storage.set(NotesManager.PAGE_KEY, this.currentPage);

    if (this.deleteBtn) this.deleteBtn.disabled = false;

    this.applyEditorMode();
    this.renderList();
    this.updateToolbarState();
    this.writeNotes();

    if (focusEditor && !this.isSourceMode) {
      this.focusEditorAtEnd();
    }
  }

  getPageForNoteId(noteId) {
    const idx = this.notes.findIndex(
      (note) => String(note.id) === String(noteId),
    );
    if (idx < 0) return 1;
    return Math.floor(idx / NotesManager.ITEMS_PER_PAGE) + 1;
  }

  getActiveNote() {
    if (!this.activeNoteId) return null;
    return (
      this.notes.find(
        (note) => String(note.id) === String(this.activeNoteId),
      ) || null
    );
  }

  queueSave({ renderList = true } = {}) {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }

    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this.saveNow({ renderList });
    }, 280);
  }

  saveNow({ renderList = true } = {}) {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }

    this.persistActiveNote({ updateTimestampIfChanged: true });
    this.notes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    this.currentPage = this.getPageForNoteId(this.activeNoteId);
    this.storage.set(NotesManager.PAGE_KEY, this.currentPage);

    this.writeNotes();
    if (renderList) this.renderList();
  }

  persistActiveNote({ updateTimestampIfChanged = false } = {}) {
    const note = this.getActiveNote();
    if (!note) return false;

    const nextTitle =
      String(this.titleInput.value || "").slice(0, 120) ||
      NotesManager.DEFAULT_TITLE;

    let nextHtml = "<p></p>";
    if (this.isSourceMode) {
      nextHtml = this.sanitizeHtml(this.rawEditor.value || "<p></p>");
      this.setEditorHtml(nextHtml);
    } else {
      nextHtml = this.getEditorHtml();
      this.rawEditor.value = nextHtml;
    }

    const previousScale = this.clampScale(note.scale);
    const nextScale = this.clampScale(
      this.scaleRange ? parseFloat(this.scaleRange.value) : previousScale,
    );

    const changed =
      nextTitle !== String(note.title || "") ||
      nextHtml !== String(note.html || "") ||
      nextScale !== previousScale;

    note.title = nextTitle;
    note.html = nextHtml;
    note.md = "";
    note.scale = nextScale;
    if (changed && updateTimestampIfChanged) {
      note.updatedAt = Date.now();
    }

    return changed;
  }

  renderList() {
    if (!this.listEl) return;

    const total = this.notes.length;
    const perPage = NotesManager.ITEMS_PER_PAGE;
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    this.currentPage = Math.max(1, Math.min(totalPages, this.currentPage));

    const start = (this.currentPage - 1) * perPage;
    const pageNotes = this.notes.slice(start, start + perPage);

    this.listEl.innerHTML = "";

    for (const note of pageNotes) {
      const item = document.createElement("div");
      item.className = "notes-list-item";
      item.setAttribute("role", "button");
      item.setAttribute("tabindex", "0");
      item.dataset.noteId = String(note.id);
      item.setAttribute(
        "aria-label",
        `Open note ${String(note.title || NotesManager.DEFAULT_TITLE)}`,
      );

      if (String(note.id) === String(this.activeNoteId)) {
        item.classList.add("active");
      }

      const title = document.createElement("div");
      title.className = "notes-list-title";
      title.textContent = String(note.title || NotesManager.DEFAULT_TITLE);

      const meta = document.createElement("div");
      meta.className = "notes-list-meta";
      meta.textContent = this.formatUpdatedAt(note.updatedAt);

      const del = document.createElement("button");
      del.type = "button";
      del.className = "notes-list-item-delete";
      del.setAttribute(
        "aria-label",
        `Delete note ${String(note.title || NotesManager.DEFAULT_TITLE)}`,
      );
      del.title = "Delete note";
      del.textContent = "🗑";

      del.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.showDeleteConfirmationForNoteId(note.id);
      });

      item.appendChild(title);
      item.appendChild(meta);
      item.appendChild(del);

      item.addEventListener("click", () => {
        this.selectNote(note.id, {
          skipPersistCurrent: false,
          focusEditor: true,
        });
      });

      item.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        this.selectNote(note.id, {
          skipPersistCurrent: false,
          focusEditor: true,
        });
      });

      this.listEl.appendChild(item);
    }

    if (this.prevPageBtn) {
      this.prevPageBtn.disabled = this.currentPage <= 1;
    }
    if (this.nextPageBtn) {
      this.nextPageBtn.disabled = this.currentPage >= totalPages;
    }
    if (this.deleteBtn) {
      this.deleteBtn.disabled = !this.getActiveNote();
    }
  }

  handleToolbarButton(btn) {
    if (!btn || btn.disabled) return;

    const cmd = btn.dataset.cmd;
    const block = btn.dataset.block;

    if (cmd === "toggleMarkdown") {
      this.toggleSourceMode();
      return;
    }

    if (this.isSourceMode) {
      return;
    }

    if (block) {
      this.applyBlockCommand(block);
      return;
    }

    if (!cmd) return;

    switch (cmd) {
      case "bold":
        this.editorInstance?.chain().focus().toggleBold().run();
        break;
      case "italic":
        this.editorInstance?.chain().focus().toggleItalic().run();
        break;
      case "underline":
        this.editorInstance?.chain().focus().toggleUnderline().run();
        break;
      case "strikeThrough":
        this.editorInstance?.chain().focus().toggleStrike().run();
        break;
      case "quote":
        this.editorInstance?.chain().focus().toggleBlockquote().run();
        break;
      case "inlineCode":
        this.editorInstance?.chain().focus().toggleCode().run();
        break;
      case "codeBlock":
        this.editorInstance?.chain().focus().toggleCodeBlock().run();
        break;
      case "insertLink":
        this.insertLink();
        break;
      case "insertImage":
        this.insertImage();
        break;
      case "insertTable":
        this.insertTable();
        break;
      case "insertHr":
        this.editorInstance?.chain().focus().setHorizontalRule().run();
        break;
      case "insertUnorderedList":
        this.editorInstance?.chain().focus().toggleBulletList().run();
        break;
      case "insertOrderedList":
        this.editorInstance?.chain().focus().toggleOrderedList().run();
        break;
      case "checklist":
        this.editorInstance?.chain().focus().toggleTaskList().run();
        break;
      default:
        break;
    }

    this.updateToolbarState();
    this.queueSave({ renderList: false });
  }

  applyBlockCommand(block) {
    const editor = this.editorInstance;
    if (!editor) return;

    const value = String(block || "").toUpperCase();

    if (value === "P") {
      editor.chain().focus().setParagraph().run();
      this.updateToolbarState();
      this.queueSave({ renderList: false });
      return;
    }

    const match = /^H([1-6])$/.exec(value);
    if (!match) return;

    const level = parseInt(match[1], 10);
    if (!Number.isFinite(level)) return;

    editor.chain().focus().toggleHeading({ level }).run();
    this.updateToolbarState();
    this.queueSave({ renderList: false });
  }

  insertLink() {
    const editor = this.editorInstance;
    if (!editor) return;

    const previous = editor.getAttributes("link").href || "";
    const input = window.prompt("Enter URL", previous);
    if (input === null) return;

    const href = String(input || "").trim();

    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      this.queueSave({ renderList: false });
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    this.queueSave({ renderList: false });
  }

  insertImage() {
    const editor = this.editorInstance;
    if (!editor) return;

    const src = window.prompt("Image URL");
    if (!src) return;

    editor
      .chain()
      .focus()
      .setImage({ src: String(src).trim() })
      .run();
    this.queueSave({ renderList: false });
  }

  insertTable() {
    const editor = this.editorInstance;
    if (!editor) return;

    const inserted = editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();

    if (!inserted) {
      // Fallback if insertion is blocked by current selection.
      editor
        .chain()
        .focus()
        .setParagraph()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    }

    this.queueSave({ renderList: false });
  }

  toggleSourceMode() {
    if (this.isSourceMode) {
      const html = this.sanitizeHtml(this.rawEditor.value || "<p></p>");
      this.setEditorHtml(html);
      this.isSourceMode = false;
      this.focusEditorAtEnd();
    } else {
      this.rawEditor.value = this.getEditorHtml();
      this.isSourceMode = true;
      this.rawEditor.focus();
      this.rawEditor.setSelectionRange(
        this.rawEditor.value.length,
        this.rawEditor.value.length,
      );
    }

    this.storage.set(NotesManager.PREVIEW_KEY, !this.isSourceMode);
    this.applyEditorMode();
    this.queueSave({ renderList: false });
  }

  applyEditorMode() {
    const source = this.isSourceMode;

    this.rawEditor.classList.toggle("hidden", !source);
    this.editor.classList.toggle("hidden", source);

    if (this.markdownToggleBtn) {
      this.markdownToggleBtn.dataset.mode = source ? "source" : "preview";
      this.markdownToggleBtn.classList.toggle("active", source);
      this.markdownToggleBtn.title = source
        ? "Switch to WYSIWYG editor"
        : "Switch to HTML source";
      this.markdownToggleBtn.setAttribute(
        "aria-label",
        source ? "Switch to WYSIWYG editor" : "Switch to HTML source",
      );
    }

    const commandButtons = Array.from(
      this.toolbar.querySelectorAll(".notes-tool-btn"),
    );
    for (const button of commandButtons) {
      if (button === this.markdownToggleBtn) continue;
      button.disabled = source;
    }

    this.updateToolbarState();
  }

  updateToolbarState() {
    const editor = this.editorInstance;
    if (!editor || this.isSourceMode) {
      this.clearToolbarActiveState();
      return;
    }

    const setActive = (selector, active) => {
      const btn = this.toolbar.querySelector(selector);
      if (!btn) return;
      btn.classList.toggle("active", !!active);
    };

    setActive('[data-cmd="bold"]', editor.isActive("bold"));
    setActive('[data-cmd="italic"]', editor.isActive("italic"));
    setActive('[data-cmd="underline"]', editor.isActive("underline"));
    setActive('[data-cmd="strikeThrough"]', editor.isActive("strike"));
    setActive('[data-cmd="quote"]', editor.isActive("blockquote"));
    setActive('[data-cmd="inlineCode"]', editor.isActive("code"));
    setActive('[data-cmd="codeBlock"]', editor.isActive("codeBlock"));
    setActive(
      '[data-cmd="insertUnorderedList"]',
      editor.isActive("bulletList"),
    );
    setActive('[data-cmd="insertOrderedList"]', editor.isActive("orderedList"));
    setActive('[data-cmd="checklist"]', editor.isActive("taskList"));

    setActive('[data-block="H1"]', editor.isActive("heading", { level: 1 }));
    setActive('[data-block="H2"]', editor.isActive("heading", { level: 2 }));
    setActive('[data-block="H3"]', editor.isActive("heading", { level: 3 }));
    setActive('[data-block="H4"]', editor.isActive("heading", { level: 4 }));
    setActive('[data-block="P"]', editor.isActive("paragraph"));
  }

  clearToolbarActiveState() {
    const activeButtons = this.toolbar.querySelectorAll(
      ".notes-tool-btn.active",
    );
    activeButtons.forEach((btn) => btn.classList.remove("active"));
  }

  deleteNoteById(noteId) {
    const id = String(noteId || "").trim();
    if (!id) return;

    const idx = this.notes.findIndex((n) => String(n.id) === id);
    if (idx < 0) return;

    const wasActive = String(this.activeNoteId) === id;
    this.notes.splice(idx, 1);

    if (!this.notes.length) {
      const created = this.createNote();
      this.notes.push(created);
      this.activeNoteId = String(created.id);
      this.currentPage = 1;
    } else if (wasActive) {
      this.activeNoteId = String(this.notes[0].id);
      this.currentPage = 1;
    }

    this.writeNotes();
    this.selectNote(this.activeNoteId, {
      skipPersistCurrent: true,
      focusEditor: true,
    });
    this.renderList();
  }

  showDeleteConfirmation() {
    const active = this.getActiveNote();
    if (!active) return;
    this.showDeleteConfirmationForNoteId(active.id);
  }

  showDeleteConfirmationForNoteId(noteId) {
    const id = String(noteId || "").trim();
    if (!id) return;

    const note = this.notes.find((entry) => String(entry.id) === id);
    if (!note) return;

    if (!this.deleteModal || !this.confirmDeleteBtn || !this.cancelDeleteBtn) {
      const ok = window.confirm(
        `Delete note "${String(note.title || NotesManager.DEFAULT_TITLE)}"?`,
      );
      if (!ok) return;
      this.deleteNoteById(id);
      return;
    }

    this.pendingDeleteId = id;

    if (this.deleteNameEl) {
      this.deleteNameEl.textContent = String(
        note.title || NotesManager.DEFAULT_TITLE,
      );
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
    const id = String(this.pendingDeleteId || "").trim();
    if (!id) return;

    this.deleteNoteById(id);
    this.hideDeleteConfirmation();
  }

  focusNoteById(id) {
    const noteId = String(id || "").trim();
    if (!noteId) return;

    const exists = this.notes.some((note) => String(note.id) === noteId);
    if (!exists) return;

    this.selectNote(noteId, { skipPersistCurrent: false, focusEditor: true });

    try {
      this.card.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (e) {
      // ignore
    }

    const activeItem = this.listEl.querySelector(".notes-list-item.active");
    if (activeItem) {
      try {
        activeItem.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      } catch (e) {
        // ignore
      }
    }
  }

  reloadFromStorage() {
    const currentId = String(this.activeNoteId || "").trim();

    this.loadNotesFromStorage();
    this.ensureAtLeastOneNote();

    const preferredId = this.notes.some((n) => String(n.id) === currentId)
      ? currentId
      : String(this.notes[0].id);

    this.selectNote(preferredId, {
      skipPersistCurrent: true,
      focusEditor: false,
    });
    this.renderList();
  }

  getSearchItems() {
    return Array.isArray(this.notes) ? this.notes.slice() : [];
  }

  writeNotes() {
    if (this.storage.saveNotes) {
      this.storage.saveNotes(this.notes);
    } else {
      this.storage.set(NotesManager.STORAGE_KEY, this.notes);
    }

    this.storage.set(NotesManager.ACTIVE_NOTE_KEY, this.activeNoteId);
    this.storage.set(NotesManager.PAGE_KEY, this.currentPage);
  }

  setEditorHtml(html) {
    const safeHtml = this.sanitizeHtml(String(html || "<p></p>"));

    if (this.editorInstance) {
      this._suppressEditorUpdate = true;
      this.editorInstance.commands.setContent(safeHtml, false, {
        preserveWhitespace: "full",
      });
      this._suppressEditorUpdate = false;
      return;
    }

    this.editor.innerHTML = safeHtml;
  }

  getEditorHtml() {
    if (this.editorInstance) {
      const html = this.editorInstance.getHTML();
      return this.normalizeHtmlDocument(this.sanitizeHtml(html));
    }

    return this.normalizeHtmlDocument(this.sanitizeHtml(this.editor.innerHTML));
  }

  focusEditorAtEnd() {
    if (this.editorInstance) {
      this.editorInstance.chain().focus("end").run();
      return;
    }

    this.editor.focus();
    try {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(this.editor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (e) {
      // ignore
    }
  }

  sanitizeHtml(input) {
    const host = document.createElement("div");
    host.innerHTML = String(input || "");

    host
      .querySelectorAll(
        "script, style, iframe, object, embed, frame, frameset, base, meta",
      )
      .forEach((el) => el.remove());

    const nodes = host.querySelectorAll("*");
    for (const node of nodes) {
      const attrs = Array.from(node.attributes || []);
      for (const attr of attrs) {
        const name = String(attr.name || "").toLowerCase();
        const value = String(attr.value || "");

        if (name.startsWith("on")) {
          node.removeAttribute(attr.name);
          continue;
        }

        if (
          (name === "href" || name === "src") &&
          /^\s*javascript:/i.test(value)
        ) {
          node.removeAttribute(attr.name);
          continue;
        }
      }
    }

    return this.normalizeHtmlDocument(host.innerHTML);
  }

  normalizeHtmlDocument(html) {
    const value = String(html || "").trim();
    if (!value) return "<p></p>";
    return value;
  }

  textToHtml(value) {
    const raw = String(value || "").trim();
    if (!raw) return "<p></p>";

    const escaped = this.escapeHtml(raw).replace(/\r\n?/g, "\n");
    return `<p>${escaped.replace(/\n/g, "<br>")}</p>`;
  }

  markdownToHtml(value) {
    const raw = String(value || "").trim();
    if (!raw) return "<p></p>";

    try {
      if (window.marked && typeof window.marked.parse === "function") {
        return this.normalizeHtmlDocument(
          this.sanitizeHtml(window.marked.parse(raw)),
        );
      }
    } catch (e) {
      // Fall back to plain text conversion when markdown parsing fails.
    }

    return this.textToHtml(raw);
  }

  formatUpdatedAt(ts) {
    const date = new Date(Number(ts) || Date.now());
    if (Number.isNaN(date.getTime())) return "Edited recently";

    return `Updated ${date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })}`;
  }

  clampScale(value) {
    const n = Number.isFinite(value) ? value : NotesManager.SCALE_MIN;
    return Math.max(
      NotesManager.SCALE_MIN,
      Math.min(NotesManager.SCALE_MAX, n),
    );
  }

  applyScale(scale) {
    const next = this.clampScale(scale);
    this.editor.style.setProperty("--notes-scale", String(next));
    this.rawEditor.style.setProperty("--notes-scale", String(next));
  }

  updateScaleUi(scale) {
    const next = this.clampScale(scale);
    if (this.scaleRange) this.scaleRange.value = String(next);
    if (this.scaleValueEl)
      this.scaleValueEl.textContent = `${next.toFixed(2)}x`;
  }

  createId() {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }

    return `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

window.NotesManager = NotesManager;

/**
 * Notes Manager (Quill rich editor)
 * CRUD notes with localStorage persistence.
 */

class NotesManager extends BaseManager {
  static STORAGE_KEY = "notes";
  static ACTIVE_NOTE_KEY = "notes_active";
  static PAGE_KEY = "notes_page";
  static ITEMS_PER_PAGE = 10;
  static DEFAULT_TITLE = "Untitled";
  static MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

  constructor(storage) {
    super();
    this.storage = storage;

    this.notes = [];
    this.activeNoteId = "";
    this.currentPage = 1;

    this.saveTimer = null;
    this.isSettingContent = false;
    this.editorInstance = null;

    this.card = document.getElementById("notesCard");
    this.newBtn = document.getElementById("notesNewBtn");
    this.deleteBtn = document.getElementById("notesDeleteBtn");

    this.listEl = document.getElementById("notesList");
    this.prevPageBtn = document.getElementById("notesPrevPageBtn");
    this.nextPageBtn = document.getElementById("notesNextPageBtn");

    this.titleInput = document.getElementById("notesTitleInput");
    this.toolbar = document.getElementById("notesToolbar");
    this.editorHost = document.getElementById("notesEditor");
    this.imageInput = document.getElementById("notesImageInput");

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
      !this.editorHost
    ) {
      return;
    }

    this.init();
  }

  init() {
    this.loadNotesFromStorage();
    this.setupEditor();
    this.bindEvents();
    this.ensureAtLeastOneNote();

    const preferredId = String(
      this.storage.get(NotesManager.ACTIVE_NOTE_KEY, "") || "",
    ).trim();

    const initialId = this.notes.some((note) => String(note.id) === preferredId)
      ? preferredId
      : String(this.notes[0].id);

    this.selectNote(initialId, { skipSave: true, focusEditor: false });
    this.renderList();
  }

  setupEditor() {
    const QuillCtor = window.Quill;

    if (typeof QuillCtor === "function") {
      this.editorHost.removeAttribute("contenteditable");
      this.editorHost.classList.add("notes-editor-quill");

      this.toolbar.innerHTML = this.createQuillToolbarMarkup();
      this.imageInput = this.toolbar.querySelector("#notesImageInput");

      this.editorInstance = new QuillCtor(this.editorHost, {
        theme: "snow",
        modules: {
          toolbar: {
            container: this.toolbar,
            handlers: {
              undo: () => {
                this.editorInstance?.history?.undo();
              },
              redo: () => {
                this.editorInstance?.history?.redo();
              },
              image: () => {
                this.imageInput?.click();
              },
              insertImageByUrl: () => {
                this.insertImageByUrl();
              },
            },
          },
          history: {
            delay: 300,
            maxStack: 200,
            userOnly: true,
          },
        },
        placeholder: "Start writing your note...",
      });

      this.editorInstance.on("text-change", (_delta, _oldDelta, source) => {
        if (this.isSettingContent) return;
        if (source === "user") {
          this.queueSave();
        }
      });

      this.editorInstance.on("selection-change", (range) => {
        if (range === null) {
          this.saveNow({ renderList: false });
        }
      });

      return;
    }

    this.editorHost.setAttribute("contenteditable", "true");
    this.editorHost.addEventListener("input", () => this.queueSave());
    this.editorHost.addEventListener("blur", () =>
      this.saveNow({ renderList: false }),
    );
  }

  createQuillToolbarMarkup() {
    return `
      <span class="ql-formats">
        <button class="ql-undo" type="button" aria-label="Undo" title="Undo">↺</button>
        <button class="ql-redo" type="button" aria-label="Redo" title="Redo">↻</button>
      </span>
      <span class="ql-formats">
        <select class="ql-header" aria-label="Heading">
          <option value=""></option>
          <option value="1"></option>
          <option value="2"></option>
          <option value="3"></option>
          <option value="4"></option>
        </select>
      </span>
      <span class="ql-formats">
        <button class="ql-bold" type="button" aria-label="Bold"></button>
        <button class="ql-italic" type="button" aria-label="Italic"></button>
        <button class="ql-underline" type="button" aria-label="Underline"></button>
        <button class="ql-strike" type="button" aria-label="Strike"></button>
        <button class="ql-code" type="button" aria-label="Inline code"></button>
      </span>
      <span class="ql-formats">
        <button class="ql-list" value="ordered" type="button" aria-label="Ordered list"></button>
        <button class="ql-list" value="bullet" type="button" aria-label="Bullet list"></button>
        <button class="ql-list" value="check" type="button" aria-label="Checklist"></button>
      </span>
      <span class="ql-formats">
        <select class="ql-align" aria-label="Align"></select>
        <button class="ql-blockquote" type="button" aria-label="Block quote"></button>
        <button class="ql-code-block" type="button" aria-label="Code block"></button>
      </span>
      <span class="ql-formats">
        <select class="ql-color" aria-label="Text color"></select>
        <select class="ql-background" aria-label="Highlight color"></select>
      </span>
      <span class="ql-formats">
        <button class="ql-link" type="button" aria-label="Link"></button>
        <button class="ql-image" type="button" aria-label="Upload image"></button>
        <input
          class="notes-tool-file-input"
          id="notesImageInput"
          type="file"
          accept="image/*"
          aria-label="Upload image"
          tabindex="-1"
        />
        <button
          class="ql-insertImageByUrl"
          type="button"
          aria-label="Insert image by URL"
          title="Insert image by URL"
        >
          URL
        </button>
        <button class="ql-clean" type="button" aria-label="Clear formatting"></button>
      </span>
    `;
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
      this.writeNotes();
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
      this.writeNotes();
      this.renderList();
    });

    this.titleInput.addEventListener("input", () => this.queueSave());
    this.titleInput.addEventListener("blur", () =>
      this.saveNow({ renderList: true }),
    );

    this.listEl.addEventListener("click", (event) =>
      this.handleListClick(event),
    );
    this.listEl.addEventListener("keydown", (event) =>
      this.handleListKeydown(event),
    );

    this.imageInput?.addEventListener("change", (event) =>
      this.handleImageUpload(event),
    );

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

  handleListClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const deleteBtn = target.closest(".notes-list-item-delete");
    if (deleteBtn) {
      event.preventDefault();
      event.stopPropagation();
      const noteId = String(
        deleteBtn.getAttribute("data-note-id") || "",
      ).trim();
      if (noteId) this.showDeleteConfirmationForNoteId(noteId);
      return;
    }

    const item = target.closest(".notes-list-item");
    if (!item) return;

    const noteId = String(item.getAttribute("data-note-id") || "").trim();
    if (!noteId) return;
    this.selectNote(noteId, { skipSave: false, focusEditor: true });
  }

  handleListKeydown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    const item = target.closest(".notes-list-item");
    if (!item) return;

    event.preventDefault();

    const noteId = String(item.getAttribute("data-note-id") || "").trim();
    if (!noteId) return;

    this.selectNote(noteId, { skipSave: false, focusEditor: true });
  }

  handleCreateNote() {
    this.saveNow({ renderList: false });

    const note = this.createNote();
    this.notes.unshift(note);
    this.activeNoteId = String(note.id);
    this.currentPage = 1;

    this.writeNotes();
    this.selectNote(note.id, { skipSave: true, focusEditor: true });
  }

  selectNote(noteId, { skipSave = false, focusEditor = true } = {}) {
    const id = String(noteId || "").trim();
    if (!id) return;

    if (!skipSave) {
      this.saveNow({ renderList: false });
    }

    const note = this.notes.find((entry) => String(entry.id) === id);
    if (!note) return;

    this.activeNoteId = id;
    this.titleInput.value = String(note.title || NotesManager.DEFAULT_TITLE);

    this.setEditorContent(note);

    this.currentPage = this.getPageForNoteId(id);
    this.writeNotes();
    this.renderList();

    if (focusEditor) {
      this.focusEditorAtEnd();
    }
  }

  setEditorContent(note) {
    if (this.editorInstance) {
      this.isSettingContent = true;
      try {
        if (this.isQuillDelta(note.content)) {
          this.editorInstance.setContents(
            this.cloneContent(note.content),
            "silent",
          );
        } else {
          const html = this.normalizeHtml(
            this.sanitizeHtml(note.html || this.textToHtml(note.md || "")),
          );

          const delta = this.editorInstance.clipboard.convert({ html });
          this.editorInstance.setContents(delta, "silent");
        }
      } catch (_error) {
        this.editorInstance.setText("", "silent");
      } finally {
        this.isSettingContent = false;
      }
      return;
    }

    this.editorHost.innerHTML = this.normalizeHtml(
      this.sanitizeHtml(note.html || this.textToHtml(note.md || "")),
    );
  }

  focusEditorAtEnd() {
    if (this.editorInstance) {
      const end = Math.max(0, this.editorInstance.getLength() - 1);
      this.editorInstance.focus();
      this.editorInstance.setSelection(end, 0, "silent");
      return;
    }

    this.editorHost.focus();
    try {
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(this.editorHost);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (_error) {
      // Ignore selection failures.
    }
  }

  queueSave() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveNow();
    }, 220);
  }

  saveNow({ renderList = true } = {}) {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    const note = this.notes.find(
      (entry) => String(entry.id) === String(this.activeNoteId),
    );
    if (!note) return false;

    const nextTitle =
      String(this.titleInput.value || "").trim() || NotesManager.DEFAULT_TITLE;

    const snapshot = this.getEditorSnapshot();

    const changed =
      nextTitle !== String(note.title || "") ||
      !this.isSameContent(note.content, snapshot.content) ||
      String(note.html || "") !== snapshot.html ||
      String(note.md || "") !== snapshot.md;

    note.title = nextTitle;
    note.content = this.cloneContent(snapshot.content);
    note.html = snapshot.html;
    note.md = snapshot.md;

    if (changed) {
      note.updatedAt = Date.now();
      this.sortNotesByUpdatedAt();
      this.currentPage = this.getPageForNoteId(this.activeNoteId);
    }

    this.writeNotes();
    if (renderList) this.renderList();

    return changed;
  }

  getEditorSnapshot() {
    if (this.editorInstance) {
      const content = this.cloneContent(this.editorInstance.getContents());
      const html = this.normalizeHtml(
        this.sanitizeHtml(this.editorInstance.root.innerHTML),
      );
      const md = String(this.editorInstance.getText() || "").trim();
      return { content, html, md };
    }

    const html = this.normalizeHtml(
      this.sanitizeHtml(this.editorHost.innerHTML),
    );
    return {
      content: html,
      html,
      md: this.htmlToText(html),
    };
  }

  insertImageByUrl() {
    if (!this.editorInstance) return;

    const prompted = window.prompt("Enter image URL", "https://");
    const src = this.normalizeImageUrl(prompted || "");
    if (!src) return;

    this.insertImageAtCursor(src);
  }

  handleImageUpload(event) {
    const input = event?.target;
    if (!(input instanceof HTMLInputElement)) return;

    const file = input.files && input.files[0] ? input.files[0] : null;
    if (!file) return;

    if (!/^image\//i.test(String(file.type || ""))) {
      input.value = "";
      return;
    }

    if (file.size > NotesManager.MAX_IMAGE_SIZE_BYTES) {
      input.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const src = this.normalizeImageUrl(String(reader.result || "").trim());
      if (src) {
        this.insertImageAtCursor(src);
      }
      input.value = "";
    };
    reader.onerror = () => {
      input.value = "";
    };
    reader.readAsDataURL(file);
  }

  insertImageAtCursor(src) {
    if (!this.editorInstance) return;

    const range = this.editorInstance.getSelection(true) || {
      index: Math.max(0, this.editorInstance.getLength() - 1),
      length: 0,
    };

    this.editorInstance.insertEmbed(range.index, "image", src, "user");
    this.editorInstance.setSelection(range.index + 1, 0, "silent");
    this.queueSave();
  }

  loadNotesFromStorage() {
    const seenIds = new Set();

    this.notes = this.readNotesFromStorage()
      .map((note, index) => this.normalizeNote(note, index, seenIds))
      .filter(Boolean);

    this.sortNotesByUpdatedAt();

    const page = parseInt(this.storage.get(NotesManager.PAGE_KEY, 1), 10);
    this.currentPage = Number.isFinite(page) && page > 0 ? page : 1;
  }

  readNotesFromStorage() {
    const notes = this.storage.getNotes
      ? this.storage.getNotes()
      : this.storage.get(NotesManager.STORAGE_KEY, []);

    return Array.isArray(notes) ? notes : [];
  }

  normalizeNote(note, index, seenIds) {
    if (!note || typeof note !== "object") return null;

    let id = String(note.id || "").trim();
    if (!id || seenIds.has(id)) {
      id = this.createId();
    }
    seenIds.add(id);

    const title = String(note.title || NotesManager.DEFAULT_TITLE).slice(
      0,
      120,
    );

    const html = this.extractHtmlFromNote(note);
    const md =
      typeof note.md === "string" && note.md.trim()
        ? String(note.md).trim()
        : this.htmlToText(html);

    const content = this.isQuillDelta(note.content)
      ? this.cloneContent(note.content)
      : this.normalizeHtml(html);

    const rawScale =
      typeof note.scale === "number" || typeof note.scale === "string"
        ? parseFloat(note.scale)
        : 1;
    const scale = Number.isFinite(rawScale)
      ? Math.max(1, Math.min(5, rawScale))
      : 1;

    const now = Date.now();
    const createdAt =
      typeof note.createdAt === "number" && Number.isFinite(note.createdAt)
        ? note.createdAt
        : now - (index + 1);

    const updatedAt =
      typeof note.updatedAt === "number" && Number.isFinite(note.updatedAt)
        ? note.updatedAt
        : createdAt;

    return {
      id,
      title,
      content,
      html,
      md,
      scale,
      createdAt,
      updatedAt,
    };
  }

  extractHtmlFromNote(note) {
    if (typeof note.html === "string" && note.html.trim()) {
      return this.normalizeHtml(this.sanitizeHtml(note.html));
    }

    if (typeof note.content === "string" && note.content.trim()) {
      return this.normalizeHtml(this.sanitizeHtml(note.content));
    }

    if (this.isQuillDelta(note.content)) {
      return this.textToHtml(this.deltaToPlainText(note.content));
    }

    if (note.content && typeof note.content === "object") {
      return this.textToHtml(this.contentToText(note.content));
    }

    if (typeof note.md === "string" && note.md.trim()) {
      return this.markdownToHtml(note.md);
    }

    if (typeof note.text === "string" && note.text.trim()) {
      return this.textToHtml(note.text);
    }

    return "<p><br></p>";
  }

  ensureAtLeastOneNote() {
    if (this.notes.length > 0) return;

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
      content: "<p><br></p>",
      html: "<p><br></p>",
      md: "",
      scale: 1,
      createdAt: now,
      updatedAt: now,
    };
  }

  sortNotesByUpdatedAt() {
    this.notes.sort(
      (a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0),
    );
  }

  getPageForNoteId(noteId) {
    const id = String(noteId || "").trim();
    const index = this.notes.findIndex((note) => String(note.id) === id);
    if (index < 0) return 1;

    return Math.floor(index / NotesManager.ITEMS_PER_PAGE) + 1;
  }

  renderList() {
    const totalPages = Math.max(
      1,
      Math.ceil(this.notes.length / NotesManager.ITEMS_PER_PAGE),
    );

    this.currentPage = Math.max(1, Math.min(totalPages, this.currentPage));

    const start = (this.currentPage - 1) * NotesManager.ITEMS_PER_PAGE;
    const pageItems = this.notes.slice(
      start,
      start + NotesManager.ITEMS_PER_PAGE,
    );

    this.listEl.innerHTML = "";

    pageItems.forEach((note) => {
      const item = document.createElement("div");
      item.className = "notes-list-item";
      item.setAttribute("role", "button");
      item.setAttribute("tabindex", "0");
      item.setAttribute("data-note-id", String(note.id));

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
      del.textContent = "x";
      del.title = "Delete note";
      del.setAttribute("data-note-id", String(note.id));
      del.setAttribute(
        "aria-label",
        `Delete note ${String(note.title || NotesManager.DEFAULT_TITLE)}`,
      );

      item.appendChild(title);
      item.appendChild(meta);
      item.appendChild(del);
      this.listEl.appendChild(item);
    });

    if (this.prevPageBtn) this.prevPageBtn.disabled = this.currentPage <= 1;
    if (this.nextPageBtn)
      this.nextPageBtn.disabled = this.currentPage >= totalPages;
    if (this.deleteBtn) this.deleteBtn.disabled = !this.activeNoteId;
  }

  formatUpdatedAt(value) {
    const date = new Date(Number(value) || Date.now());
    if (Number.isNaN(date.getTime())) return "Updated recently";

    return `Updated ${date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })}`;
  }

  showDeleteConfirmation() {
    const active = this.notes.find(
      (entry) => String(entry.id) === String(this.activeNoteId),
    );
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

  deleteNoteById(noteId) {
    const id = String(noteId || "").trim();
    if (!id) return;

    const index = this.notes.findIndex((note) => String(note.id) === id);
    if (index < 0) return;

    const wasActive = String(this.activeNoteId) === id;
    this.notes.splice(index, 1);

    if (!this.notes.length) {
      const created = this.createNote();
      this.notes = [created];
      this.activeNoteId = String(created.id);
      this.currentPage = 1;
    } else if (wasActive) {
      this.activeNoteId = String(this.notes[0].id);
      this.currentPage = 1;
    }

    this.writeNotes();
    this.selectNote(this.activeNoteId, { skipSave: true, focusEditor: true });
  }

  getSearchItems() {
    return this.notes.map((note) => ({
      ...note,
      md:
        String(note.md || "").trim() ||
        (note.html
          ? this.htmlToText(note.html)
          : this.contentToText(note.content)),
      html:
        String(note.html || "").trim() ||
        this.textToHtml(String(note.md || "").trim()),
    }));
  }

  focusNoteById(noteId) {
    const id = String(noteId || "").trim();
    if (!id) return;

    const exists = this.notes.some((note) => String(note.id) === id);
    if (!exists) return;

    this.selectNote(id, { skipSave: false, focusEditor: true });

    try {
      this.card.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (_error) {
      // Ignore scroll failures.
    }
  }

  reloadFromStorage() {
    const previousId = String(this.activeNoteId || "").trim();
    this.loadNotesFromStorage();
    this.ensureAtLeastOneNote();

    const nextId = this.notes.some((note) => String(note.id) === previousId)
      ? previousId
      : String(this.notes[0].id);

    this.selectNote(nextId, { skipSave: true, focusEditor: false });
    this.renderList();
  }

  writeNotes() {
    const payload = this.notes.map((note) => ({
      id: String(note.id || this.createId()),
      title: String(note.title || NotesManager.DEFAULT_TITLE).slice(0, 120),
      content: this.cloneContent(note.content),
      html: this.normalizeHtml(this.sanitizeHtml(note.html || "<p><br></p>")),
      md: String(note.md || "").trim(),
      scale:
        typeof note.scale === "number"
          ? Math.max(1, Math.min(5, note.scale))
          : 1,
      createdAt: Number(note.createdAt) || Date.now(),
      updatedAt: Number(note.updatedAt) || Date.now(),
    }));

    this.notes = payload;

    if (this.storage.saveNotes) {
      this.storage.saveNotes(payload);
    } else {
      this.storage.set(NotesManager.STORAGE_KEY, payload);
    }

    this.storage.set(
      NotesManager.ACTIVE_NOTE_KEY,
      String(this.activeNoteId || ""),
    );
    this.storage.set(NotesManager.PAGE_KEY, this.currentPage);
  }

  normalizeLinkUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^\s*javascript:/i.test(raw)) return "";

    if (/^(https?:|mailto:|tel:)/i.test(raw)) {
      return raw;
    }

    return `https://${raw.replace(/^\/+/, "")}`;
  }

  normalizeImageUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^\s*javascript:/i.test(raw)) return "";

    if (/^(https?:|data:image\/|blob:)/i.test(raw)) {
      return raw;
    }

    return "";
  }

  isQuillDelta(value) {
    return !!value && typeof value === "object" && Array.isArray(value.ops);
  }

  cloneContent(content) {
    if (typeof content === "string") return String(content);
    if (!content || typeof content !== "object") return "<p><br></p>";

    try {
      return JSON.parse(JSON.stringify(content));
    } catch (_error) {
      return "<p><br></p>";
    }
  }

  isSameContent(a, b) {
    if (typeof a === "string" || typeof b === "string") {
      return String(a || "") === String(b || "");
    }

    try {
      return JSON.stringify(a || null) === JSON.stringify(b || null);
    } catch (_error) {
      return false;
    }
  }

  deltaToPlainText(delta) {
    if (!this.isQuillDelta(delta)) return "";

    return delta.ops
      .map((op) => {
        if (typeof op?.insert === "string") return op.insert;
        return "\n";
      })
      .join("")
      .trim();
  }

  contentToText(content) {
    if (!content) return "";

    if (typeof content === "string") {
      return this.htmlToText(content);
    }

    if (this.isQuillDelta(content)) {
      return this.deltaToPlainText(content);
    }

    if (typeof content !== "object") return "";

    const parts = [];
    const walk = (node) => {
      if (!node || typeof node !== "object") return;

      if (node.type === "text" && typeof node.text === "string") {
        parts.push(node.text);
      }

      if (Array.isArray(node.content)) {
        node.content.forEach((child) => walk(child));
      }

      if (node.type === "paragraph") {
        parts.push("\n");
      }
    };

    walk(content);

    return parts
      .join(" ")
      .replace(/\s+\n/g, "\n")
      .replace(/\n\s+/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{2,}/g, "\n")
      .trim();
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

  normalizeHtml(value) {
    const html = String(value || "").trim();
    return html || "<p><br></p>";
  }

  sanitizeHtml(input) {
    const host = document.createElement("div");
    host.innerHTML = String(input || "");

    host
      .querySelectorAll(
        "script, style, iframe, object, embed, frame, frameset, base, meta",
      )
      .forEach((el) => el.remove());

    host.querySelectorAll("*").forEach((element) => {
      const attrs = Array.from(element.attributes || []);
      attrs.forEach((attr) => {
        const name = String(attr.name || "").toLowerCase();
        const value = String(attr.value || "");

        if (name.startsWith("on")) {
          element.removeAttribute(attr.name);
          return;
        }

        if (
          (name === "href" || name === "src") &&
          /^\s*javascript:/i.test(value)
        ) {
          element.removeAttribute(attr.name);
        }
      });
    });

    return host.innerHTML;
  }

  textToHtml(value) {
    const text = String(value || "").trim();
    if (!text) return "<p><br></p>";

    const escaped = this.escapeHtml(text).replace(/\r\n?/g, "\n");
    return `<p>${escaped.replace(/\n/g, "<br>")}</p>`;
  }

  markdownToHtml(value) {
    const markdown = String(value || "").trim();
    if (!markdown) return "<p><br></p>";

    try {
      if (window.marked && typeof window.marked.parse === "function") {
        return this.normalizeHtml(
          this.sanitizeHtml(window.marked.parse(markdown)),
        );
      }
    } catch (_error) {
      // Fall back to plain text HTML when markdown parsing fails.
    }

    return this.textToHtml(markdown);
  }

  htmlToText(value) {
    const html = String(value || "").trim();
    if (!html) return "";

    try {
      const host = document.createElement("div");
      host.innerHTML = html;
      return String(host.textContent || host.innerText || "").trim();
    } catch (_error) {
      return html;
    }
  }
}

window.NotesManager = NotesManager;

/**
 * Notes Manager (TipTap rich editor)
 * Implements a broad free-extension toolbar similar to TipTap Simple template.
 */

class NotesManager extends BaseManager {
  static STORAGE_KEY = "notes";
  static ACTIVE_NOTE_KEY = "notes_active";
  static PAGE_KEY = "notes_page";
  static ITEMS_PER_PAGE = 10;
  static DEFAULT_TITLE = "Untitled";

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
    this.headingSelect = document.getElementById("notesHeadingSelect");
    this.textColorInput = document.getElementById("notesTextColorInput");
    this.highlightColorInput = document.getElementById(
      "notesHighlightColorInput",
    );
    this.linkInput = document.getElementById("notesLinkInput");
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
    this.migrateLegacyNotes();
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
    const T = window.TiptapNotesBundle;
    if (!T || typeof T.Editor !== "function") {
      this.editorHost.setAttribute("contenteditable", "true");
      this.editorHost.addEventListener("input", () => this.queueSave());
      this.editorHost.addEventListener("blur", () =>
        this.saveNow({ renderList: false }),
      );
      return;
    }

    const extensions = [];
    const pushExtension = (extension, options = null) => {
      if (!extension) return;
      if (options && typeof extension.configure === "function") {
        extensions.push(extension.configure(options));
        return;
      }
      extensions.push(extension);
    };

    pushExtension(T.Document);
    pushExtension(T.Paragraph);
    pushExtension(T.Text);
    pushExtension(T.HardBreak);
    pushExtension(T.Bold);
    pushExtension(T.Italic);
    pushExtension(T.Underline);
    pushExtension(T.Strike);
    pushExtension(T.Code);
    pushExtension(T.Blockquote);
    pushExtension(T.BulletList);
    pushExtension(T.OrderedList);
    pushExtension(T.ListItem);
    pushExtension(T.TaskList);
    pushExtension(T.TaskItem, { nested: true });
    pushExtension(T.Heading, { levels: [1, 2, 3, 4] });
    pushExtension(T.HorizontalRule);
    pushExtension(T.CodeBlock);
    pushExtension(T.TextStyle);
    pushExtension(T.Color);
    pushExtension(T.Highlight, { multicolor: true });
    pushExtension(T.Superscript);
    pushExtension(T.Subscript);
    pushExtension(T.Typography);
    pushExtension(T.TextAlign, { types: ["paragraph", "heading"] });
    pushExtension(T.Link, {
      autolink: true,
      openOnClick: false,
      HTMLAttributes: {
        rel: "noopener noreferrer nofollow",
        target: "_blank",
      },
    });
    pushExtension(T.Image, { allowBase64: true });
    pushExtension(T.History);
    pushExtension(T.Dropcursor);
    pushExtension(T.Gapcursor);
    pushExtension(T.Placeholder, {
      placeholder: "Start writing your note...",
    });

    this.editorHost.classList.add("notes-editor-tiptap");

    this.editorInstance = new T.Editor({
      element: this.editorHost,
      extensions,
      content: this.createEmptyDoc(),
      injectCSS: false,
      autofocus: false,
      onCreate: () => this.updateToolbarState(),
      onUpdate: () => {
        if (this.isSettingContent) return;
        this.updateToolbarState();
        this.queueSave();
      },
      onSelectionUpdate: () => this.updateToolbarState(),
      onBlur: () => this.saveNow({ renderList: false }),
    });
  }

  migrateLegacyNotes() {
    if (!this.editorInstance) return;

    let changed = false;

    this.notes.forEach((note) => {
      if (this.isDocJson(note.content)) {
        if (!String(note.html || "").trim() || !String(note.md || "").trim()) {
          this.isSettingContent = true;
          try {
            this.editorInstance.commands.setContent(note.content, false);
            note.html = this.normalizeHtml(
              this.sanitizeHtml(this.editorInstance.getHTML()),
            );
            note.md = String(
              this.editorInstance.getText({ blockSeparator: "\n" }) || "",
            ).trim();
            changed = true;
          } catch (error) {
            note.content = this.createEmptyDoc();
            note.html = "<p></p>";
            note.md = "";
            changed = true;
          } finally {
            this.isSettingContent = false;
          }
        }
        return;
      }

      const source =
        note.content ||
        note.html ||
        this.markdownToHtml(note.md || note.text || "");

      this.isSettingContent = true;
      try {
        this.editorInstance.commands.setContent(source, false);
        note.content = this.cloneContent(this.editorInstance.getJSON());
        note.html = this.normalizeHtml(
          this.sanitizeHtml(this.editorInstance.getHTML()),
        );
        note.md = String(
          this.editorInstance.getText({ blockSeparator: "\n" }) || "",
        ).trim();
      } catch (error) {
        note.content = this.createEmptyDoc();
        note.html = "<p></p>";
        note.md = "";
      } finally {
        this.isSettingContent = false;
      }

      changed = true;
    });

    if (changed) {
      this.writeNotes();
    }
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

    this.toolbar.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest(".notes-tool-btn");
      if (!button || button.disabled) return;

      const command = String(button.getAttribute("data-cmd") || "").trim();
      const value = String(button.getAttribute("data-value") || "").trim();
      this.runToolbarCommand(command, value);
    });

    this.headingSelect?.addEventListener("change", () =>
      this.runToolbarCommand("heading", this.headingSelect.value),
    );

    this.linkInput?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      this.runToolbarCommand("setLink");
    });

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

  runToolbarCommand(command, value = "") {
    const cmd = String(command || "").trim();
    const rawValue = typeof value === "string" ? value.trim() : value;
    if (!cmd) return;

    if (this.editorInstance) {
      const chain = this.editorInstance.chain().focus();
      let ran = false;

      switch (cmd) {
        case "undo":
          ran = chain.undo().run();
          break;
        case "redo":
          ran = chain.redo().run();
          break;
        case "heading": {
          const token = String(
            rawValue || this.headingSelect?.value || "paragraph",
          ).toLowerCase();

          if (token === "paragraph") {
            ran = chain.setParagraph().run();
            break;
          }

          const match = /^h([1-4])$/.exec(token);
          if (match) {
            ran = chain.setHeading({ level: parseInt(match[1], 10) }).run();
          }
          break;
        }
        case "bold":
          ran = chain.toggleBold().run();
          break;
        case "italic":
          ran = chain.toggleItalic().run();
          break;
        case "underline":
          ran = chain.toggleUnderline().run();
          break;
        case "strike":
          ran = chain.toggleStrike().run();
          break;
        case "code":
          ran = chain.toggleCode().run();
          break;
        case "superscript":
          ran = chain.toggleSuperscript().run();
          break;
        case "subscript":
          ran = chain.toggleSubscript().run();
          break;
        case "bulletList":
          ran = chain.toggleBulletList().run();
          break;
        case "orderedList":
          ran = chain.toggleOrderedList().run();
          break;
        case "taskList":
          ran = chain.toggleTaskList().run();
          break;
        case "align": {
          const align = String(rawValue || "").toLowerCase();
          if (["left", "center", "right", "justify"].includes(align)) {
            ran = chain.setTextAlign(align).run();
          }
          break;
        }
        case "blockquote":
          ran = chain.toggleBlockquote().run();
          break;
        case "codeBlock":
          ran = chain.toggleCodeBlock().run();
          break;
        case "horizontalRule":
          ran = chain.setHorizontalRule().run();
          break;
        case "setTextColor": {
          const color = this.normalizeColorHex(
            rawValue || this.textColorInput?.value || "",
          );
          if (color) {
            ran = chain.setColor(color).run();
          }
          break;
        }
        case "clearTextColor":
          ran = chain.unsetColor().run();
          break;
        case "setHighlight": {
          const color = this.normalizeColorHex(
            rawValue || this.highlightColorInput?.value || "",
          );
          if (color) {
            ran = chain.toggleHighlight({ color }).run();
          }
          break;
        }
        case "clearHighlight":
          ran = chain.unsetHighlight().run();
          break;
        case "setLink": {
          const href = this.normalizeLinkUrl(
            rawValue || this.linkInput?.value || "",
          );
          if (!href) break;
          ran = chain.extendMarkRange("link").setLink({ href }).run();
          if (ran && this.linkInput) {
            this.linkInput.value = href;
          }
          break;
        }
        case "unsetLink":
          ran = chain.extendMarkRange("link").unsetLink().run();
          if (ran && this.linkInput) {
            this.linkInput.value = "";
          }
          break;
        case "imageUpload":
          if (this.imageInput) {
            this.imageInput.click();
          }
          this.updateToolbarState();
          return;
        case "insertImageByUrl": {
          const prompted = window.prompt("Enter image URL", "https://");
          const src = this.normalizeImageUrl(prompted || "");
          if (!src) break;
          ran = chain.setImage({ src }).run();
          break;
        }
        case "insertImage": {
          const src = this.normalizeImageUrl(rawValue || "");
          if (!src) break;
          ran = chain.setImage({ src }).run();
          break;
        }
        default:
          break;
      }

      if (!ran) {
        this.updateToolbarState();
        return;
      }

      this.updateToolbarState();
      this.queueSave();
      return;
    }

    const fallbackExec = {
      bold: "bold",
      italic: "italic",
      underline: "underline",
      strike: "strikeThrough",
      bulletList: "insertUnorderedList",
      orderedList: "insertOrderedList",
      undo: "undo",
      redo: "redo",
    };

    if (!fallbackExec[cmd]) return;

    this.editorHost.focus();
    try {
      document.execCommand(fallbackExec[cmd], false);
    } catch (error) {
      return;
    }

    this.updateToolbarState();
    this.queueSave();
  }

  updateToolbarState() {
    const states = {
      bold: false,
      italic: false,
      underline: false,
      strike: false,
      code: false,
      superscript: false,
      subscript: false,
      bulletList: false,
      orderedList: false,
      taskList: false,
      blockquote: false,
      codeBlock: false,
      link: false,
      highlight: false,
      "align:left": false,
      "align:center": false,
      "align:right": false,
      "align:justify": false,
    };

    let headingValue = "paragraph";
    let linkHref = "";

    if (this.editorInstance) {
      states.bold = this.editorInstance.isActive("bold");
      states.italic = this.editorInstance.isActive("italic");
      states.underline = this.editorInstance.isActive("underline");
      states.strike = this.editorInstance.isActive("strike");
      states.code = this.editorInstance.isActive("code");
      states.superscript = this.editorInstance.isActive("superscript");
      states.subscript = this.editorInstance.isActive("subscript");
      states.bulletList = this.editorInstance.isActive("bulletList");
      states.orderedList = this.editorInstance.isActive("orderedList");
      states.taskList = this.editorInstance.isActive("taskList");
      states.blockquote = this.editorInstance.isActive("blockquote");
      states.codeBlock = this.editorInstance.isActive("codeBlock");
      states.link = this.editorInstance.isActive("link");
      states.highlight = this.editorInstance.isActive("highlight");

      const paragraphAlign = String(
        this.editorInstance.getAttributes("paragraph")?.textAlign || "",
      ).toLowerCase();
      const headingAlign = String(
        this.editorInstance.getAttributes("heading")?.textAlign || "",
      ).toLowerCase();
      const currentAlign =
        headingAlign || paragraphAlign || (this.editorInstance ? "left" : "");

      states["align:left"] = currentAlign === "left";
      states["align:center"] = currentAlign === "center";
      states["align:right"] = currentAlign === "right";
      states["align:justify"] = currentAlign === "justify";

      for (const level of [1, 2, 3, 4]) {
        if (this.editorInstance.isActive("heading", { level })) {
          headingValue = `h${level}`;
          break;
        }
      }

      const textColorAttr =
        this.editorInstance.getAttributes("textStyle")?.color;
      if (this.textColorInput) {
        this.textColorInput.value = this.normalizeColorHex(
          textColorAttr,
          this.textColorInput.value || "#f5f5f5",
        );
      }

      const highlightColorAttr =
        this.editorInstance.getAttributes("highlight")?.color;
      if (this.highlightColorInput) {
        this.highlightColorInput.value = this.normalizeColorHex(
          highlightColorAttr,
          this.highlightColorInput.value || "#ffe066",
        );
      }

      linkHref = String(this.editorInstance.getAttributes("link")?.href || "");

      const undoBtn = this.toolbar.querySelector('[data-cmd="undo"]');
      if (undoBtn) {
        undoBtn.disabled = !this.editorInstance
          .can()
          .chain()
          .focus()
          .undo()
          .run();
      }

      const redoBtn = this.toolbar.querySelector('[data-cmd="redo"]');
      if (redoBtn) {
        redoBtn.disabled = !this.editorInstance
          .can()
          .chain()
          .focus()
          .redo()
          .run();
      }
    }

    if (this.headingSelect) {
      this.headingSelect.value = headingValue;
    }

    if (this.linkInput) {
      this.linkInput.value = linkHref;
    }

    this.toolbar
      .querySelectorAll(".notes-tool-btn[data-cmd]")
      .forEach((btn) => {
        const cmd = String(btn.getAttribute("data-cmd") || "").trim();
        const value = String(btn.getAttribute("data-value") || "")
          .trim()
          .toLowerCase();

        let active = false;

        if (cmd === "align") {
          active = !!states[`align:${value}`];
        } else if (cmd === "setLink" || cmd === "unsetLink") {
          active = !!states.link;
        } else if (cmd === "setHighlight") {
          active = !!states.highlight;
        } else {
          active = !!states[cmd];
        }

        btn.classList.toggle("active", active);
      });
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

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "").trim();
      if (result) {
        this.runToolbarCommand("insertImage", result);
      }
      input.value = "";
    };
    reader.onerror = () => {
      input.value = "";
    };
    reader.readAsDataURL(file);
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

  normalizeColorHex(value, fallback = "") {
    const raw = String(value || "").trim();
    const shortHex = /^#([0-9a-f]{3})$/i.exec(raw);
    if (shortHex) {
      const [r, g, b] = shortHex[1].split("");
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }

    if (/^#[0-9a-f]{6}$/i.test(raw)) {
      return raw.toLowerCase();
    }

    return fallback || "#f5f5f5";
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

    if (this.editorInstance) {
      const source = note.content || note.html || this.createEmptyDoc();
      this.isSettingContent = true;
      try {
        this.editorInstance.commands.setContent(source, false);
      } catch (error) {
        this.editorInstance.commands.setContent(this.createEmptyDoc(), false);
      }
      this.isSettingContent = false;
    } else {
      this.editorHost.innerHTML = this.normalizeHtml(
        this.sanitizeHtml(note.html || this.textToHtml(note.md || "")),
      );
    }

    this.currentPage = this.getPageForNoteId(id);
    this.writeNotes();
    this.renderList();
    this.updateToolbarState();

    if (focusEditor) {
      this.focusEditorAtEnd();
    }
  }

  focusEditorAtEnd() {
    if (this.editorInstance) {
      this.editorInstance.chain().focus("end").run();
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
    } catch (error) {
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
    }, 200);
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
      const content = this.cloneContent(this.editorInstance.getJSON());
      const html = this.normalizeHtml(
        this.sanitizeHtml(this.editorInstance.getHTML()),
      );
      const md = String(
        this.editorInstance.getText({ blockSeparator: "\n" }) || "",
      ).trim();
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

    let content = this.createEmptyDoc();
    if (this.isDocJson(note.content)) {
      content = this.cloneContent(note.content);
    } else if (typeof note.content === "string" && note.content.trim()) {
      content = this.normalizeHtml(this.sanitizeHtml(note.content));
    } else if (typeof note.html === "string" && note.html.trim()) {
      content = this.normalizeHtml(this.sanitizeHtml(note.html));
    } else if (typeof note.md === "string" && note.md.trim()) {
      content = this.markdownToHtml(note.md);
    } else if (typeof note.text === "string" && note.text.trim()) {
      content = this.textToHtml(note.text);
    }

    let html =
      typeof note.html === "string"
        ? this.normalizeHtml(this.sanitizeHtml(note.html))
        : "";
    if (!html && typeof content === "string") {
      html = this.normalizeHtml(content);
    }

    let md = typeof note.md === "string" ? String(note.md) : "";
    if (!md) {
      md = html ? this.htmlToText(html) : this.contentToText(content);
    }

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
      createdAt,
      updatedAt,
    };
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
      content: this.createEmptyDoc(),
      html: "<p></p>",
      md: "",
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
    } catch (error) {
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
      html: this.normalizeHtml(this.sanitizeHtml(note.html || "<p></p>")),
      md: String(note.md || "").trim(),
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

  createEmptyDoc() {
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
  }

  isDocJson(value) {
    return (
      !!value && typeof value === "object" && String(value.type || "") === "doc"
    );
  }

  cloneContent(content) {
    if (typeof content === "string") return String(content);
    if (!content || typeof content !== "object") return this.createEmptyDoc();

    try {
      return JSON.parse(JSON.stringify(content));
    } catch (error) {
      return this.createEmptyDoc();
    }
  }

  isSameContent(a, b) {
    if (typeof a === "string" || typeof b === "string") {
      return String(a || "") === String(b || "");
    }

    try {
      return JSON.stringify(a || null) === JSON.stringify(b || null);
    } catch (error) {
      return false;
    }
  }

  contentToText(content) {
    if (!content) return "";

    if (typeof content === "string") {
      return this.htmlToText(content);
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
    return html || "<p></p>";
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
    if (!text) return "<p></p>";

    const escaped = this.escapeHtml(text).replace(/\r\n?/g, "\n");
    return `<p>${escaped.replace(/\n/g, "<br>")}</p>`;
  }

  markdownToHtml(value) {
    const markdown = String(value || "").trim();
    if (!markdown) return "<p></p>";

    try {
      if (window.marked && typeof window.marked.parse === "function") {
        return this.normalizeHtml(
          this.sanitizeHtml(window.marked.parse(markdown)),
        );
      }
    } catch (error) {
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
    } catch (error) {
      return html;
    }
  }
}

window.NotesManager = NotesManager;

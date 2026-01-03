/**
 * Notes Manager
 * Full-width Notes component with a lightweight WYSIWYG editor.
 * Features: title editing, rich text (B/I/U/S, lists, checklist, H1-H4, P), URL auto-linking,
 * paginated list (10 per page), and local persistence.
 */

class NotesManager {
  static STORAGE_KEY = "notes";
  static ITEMS_PER_PAGE = 10;
  static SCALE_MIN = 1;
  static SCALE_MAX = 5;

  constructor(storage) {
    this.storage = storage;

    this.notes = [];
    this.activeNoteId = null;
    this.currentPage = 1;

    this._saveTimer = null;
    this._normalizeTimer = null;
    this._hasSelectedNote = false;

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

    this.scaleRange = document.getElementById("notesScaleRange");
    this.scaleValueEl = document.getElementById("notesScaleValue");

    if (this.deleteBtn) this.deleteBtn.disabled = true;

    if (
      !this.card ||
      !this.listEl ||
      !this.titleInput ||
      !this.toolbar ||
      !this.editor
    ) {
      // Component is optional depending on markup.
      return;
    }

    this.init();
  }

  init() {
    this.load();

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
        this.hideDeleteConfirmation()
      );
    }
    if (this.confirmDeleteBtn) {
      this.confirmDeleteBtn.addEventListener("click", () =>
        this.confirmDelete()
      );
    }
    if (this.deleteModal) {
      this.deleteModal.addEventListener("click", (e) => {
        if (e.target === this.deleteModal) this.hideDeleteConfirmation();
      });
    }

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
          NotesManager.SCALE_MAX
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

      // Ensure editor has focus
      this.editor.focus();

      if (block) {
        this.execFormatBlock(block);
      } else if (cmd === "checklist") {
        this.toggleChecklist();
      } else {
        this.execCommand(cmd);
      }

      this.normalizeAndSaveSoon();
    });

    // Editor changes
    this.editor.addEventListener("input", () => {
      this.queueSave();
      this.queueNormalize();
    });

    this.editor.addEventListener("blur", () => {
      // IMPORTANT: Avoid rerendering the list synchronously on blur.
      // If the user clicks a note in the list, a synchronous rerender here can
      // replace the clicked DOM node before the click event fires, forcing
      // a second click.
      this.normalizeNow();
      this.saveNow({ renderList: false });

      // If the blur wasn't caused by focusing into the notes list, update list shortly after.
      setTimeout(() => {
        try {
          const ae = document.activeElement;
          if (ae && this.listEl && this.listEl.contains(ae)) return;
        } catch (e) {}
        this.renderList();
      }, 0);
    });

    // Click checklist marker area to toggle checked
    this.editor.addEventListener("click", (e) => {
      const li = e.target.closest("li");
      if (!li) return;
      const ul = li.closest("ul");
      if (!ul || !ul.classList.contains("notes-checklist")) return;

      const rect = li.getBoundingClientRect();
      const markerWidth = 28;
      if (e.clientX - rect.left > markerWidth) return;

      const isChecked =
        String(li.getAttribute("data-checked") || "false") === "true";
      li.setAttribute("data-checked", isChecked ? "false" : "true");
      this.normalizeAndSaveSoon();
    });

    // Make links open in a new tab
    this.editor.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      // In an editor, normal click should place the caret.
      // Open links only on Ctrl/Cmd-click to avoid accidental navigation.
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

    // Basic paste sanitization (keep text + basic formatting when possible)
    this.editor.addEventListener("paste", (e) => {
      // Allow paste, then normalize/sanitize on next tick.
      setTimeout(() => {
        this.normalizeNow();
        this.saveNow();
      }, 0);
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
        { skipPersistCurrent: true }
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
        const rawScale =
          typeof n.scale === "number" || typeof n.scale === "string"
            ? parseFloat(n.scale)
            : NotesManager.SCALE_MIN;
        const scale = Number.isNaN(rawScale)
          ? NotesManager.SCALE_MIN
          : Math.max(
              NotesManager.SCALE_MIN,
              Math.min(NotesManager.SCALE_MAX, rawScale)
            );
        const createdAt =
          typeof n.createdAt === "number" ? n.createdAt : Date.now();
        const updatedAt =
          typeof n.updatedAt === "number" ? n.updatedAt : createdAt;
        return { id, title, html, scale, createdAt, updatedAt };
      })
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    const lastActive = this.storage.get("notes_active", null);
    this.activeNoteId = typeof lastActive === "string" ? lastActive : null;

    const lastPage = this.storage.get("notes_page", 1);
    this.currentPage = this.clampInt(
      lastPage,
      1,
      Math.max(1, this.getTotalPages())
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
      const nextHtml = this.getSanitizedHtmlFromEditor();
      const changed = nextHtml !== note.html;
      note.html = nextHtml;
      if (changed) note.updatedAt = Date.now();
    }

    // Keep most-recent-first ordering
    this.notes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    this.currentPage = this.getPageForNoteId(this.activeNoteId);
    this.storage.set("notes_page", this.currentPage);

    this.save();
    if (shouldRenderList) this.renderList();
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
        NotesManager.SCALE_MAX
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
    this.editor.innerHTML = this.sanitizeHtml(note.html || "");

    const scale = this.clampNumber(
      note.scale,
      NotesManager.SCALE_MIN,
      NotesManager.SCALE_MAX
    );
    note.scale = scale;
    this.applyScale(scale);
    this.updateScaleUi(scale);

    if (this.deleteBtn) this.deleteBtn.disabled = false;

    // Ensure links are present and safe
    this.normalizeNow();

    // Place caret at end
    this.placeCaretAtEnd(this.editor);

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
    const nextHtml = this.getSanitizedHtmlFromEditor();

    const changed =
      nextTitle !== String(current.title || "") || nextHtml !== current.html;

    current.title = nextTitle;
    current.html = nextHtml;
    if (changed && updateTimestampIfChanged) current.updatedAt = Date.now();
    return changed;
  }

  applyScale(scale) {
    const n = this.clampNumber(
      scale,
      NotesManager.SCALE_MIN,
      NotesManager.SCALE_MAX
    );
    try {
      this.editor.style.setProperty("--notes-scale", String(n));
    } catch (e) {
      // ignore
    }
  }

  updateScaleUi(scale) {
    const n = this.clampNumber(
      scale,
      NotesManager.SCALE_MIN,
      NotesManager.SCALE_MAX
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

  renderList() {
    const totalPages = this.getTotalPages();
    this.currentPage = this.clampInt(
      this.currentPage,
      1,
      Math.max(1, totalPages)
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
        totalPages
      )} (${this.notes.length})`;
    }

    if (this.prevPageBtn) this.prevPageBtn.disabled = page <= 1;
    if (this.nextPageBtn) this.nextPageBtn.disabled = page >= totalPages;
  }

  getTotalPages() {
    return Math.max(
      1,
      Math.ceil(this.notes.length / NotesManager.ITEMS_PER_PAGE)
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
    if (this._normalizeTimer) {
      clearTimeout(this._normalizeTimer);
      this._normalizeTimer = null;
    }

    const selectionOffsets = this.getSelectionOffsets(this.editor);

    const sanitized = this.getSanitizedHtmlFromEditor();
    if (this.editor.innerHTML !== sanitized) {
      this.editor.innerHTML = sanitized;
      this.restoreSelectionOffsets(this.editor, selectionOffsets);
    }
  }

  getSanitizedHtmlFromEditor() {
    const raw = this.editor.innerHTML || "";
    return this.sanitizeHtml(this.linkifyHtml(raw));
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
            document.createTextNode(text.slice(lastIndex, start))
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

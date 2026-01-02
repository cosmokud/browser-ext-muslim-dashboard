/**
 * Notes Manager
 * Full-width Notes component with a lightweight WYSIWYG editor.
 * Features: title editing, rich text (B/I/U/S, lists, checklist, H1-H4, P), URL auto-linking,
 * paginated list (10 per page), and local persistence.
 */

class NotesManager {
  static STORAGE_KEY = "notes";
  static ITEMS_PER_PAGE = 10;

  constructor(storage) {
    this.storage = storage;

    this.notes = [];
    this.activeNoteId = null;
    this.currentPage = 1;

    this._saveTimer = null;
    this._normalizeTimer = null;

    // DOM
    this.card = document.getElementById("notesCard");
    this.newBtn = document.getElementById("notesNewBtn");
    this.listEl = document.getElementById("notesList");
    this.prevPageBtn = document.getElementById("notesPrevPageBtn");
    this.nextPageBtn = document.getElementById("notesNextPageBtn");
    this.pageInfoEl = document.getElementById("notesPageInfo");

    this.titleInput = document.getElementById("notesTitleInput");
    this.toolbar = document.getElementById("notesToolbar");
    this.editor = document.getElementById("notesEditor");

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
      const note = this.createNote({ select: true });
      // Ensure initial note is persisted
      this.save();
      this.selectNote(note.id);
    } else {
      this.selectNote(this.activeNoteId || this.notes[0].id);
    }

    this.renderList();
    this.updatePaginationUI();

    this.setupEventListeners();
  }

  setupEventListeners() {
    if (this.newBtn) {
      this.newBtn.addEventListener("click", () => {
        const note = this.createNote({ select: true });
        this.save();
        this.selectNote(note.id);
        this.renderList();
        this.ensureActiveVisible();
      });
    }

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
      this.renderList();
    });

    // Title input
    this.titleInput.addEventListener("input", () => {
      const note = this.getActiveNote();
      if (!note) return;
      note.title = String(this.titleInput.value || "").slice(0, 120);
      note.updatedAt = Date.now();
      this.queueSaveAndRerenderList();
    });

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
      this.normalizeNow();
      this.saveNow();
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
      const note = this.createNote({ select: true });
      this.save();
      this.selectNote(note.id);
    } else {
      this.selectNote(
        prevActive && this.notes.some((n) => n.id === prevActive)
          ? prevActive
          : this.notes[0].id
      );
    }
    this.renderList();
    this.updatePaginationUI();
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
        const createdAt =
          typeof n.createdAt === "number" ? n.createdAt : Date.now();
        const updatedAt =
          typeof n.updatedAt === "number" ? n.updatedAt : createdAt;
        return { id, title, html, createdAt, updatedAt };
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

  saveNow() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }

    const note = this.getActiveNote();
    if (note) {
      note.html = this.getSanitizedHtmlFromEditor();
      note.updatedAt = Date.now();
    }

    // Keep most-recent-first ordering
    this.notes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    this.save();
    this.renderList();
    this.updatePaginationUI();
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

  queueSaveAndRerenderList() {
    this.queueSave();
    this.renderList();
  }

  createNote({ select } = {}) {
    const id = this.generateId();
    const now = Date.now();

    const note = {
      id,
      title: "Untitled",
      html: "<p></p>",
      createdAt: now,
      updatedAt: now,
    };

    this.notes.unshift(note);

    if (select) {
      this.activeNoteId = id;
      this.storage.set("notes_active", id);

      // Ensure page contains new note (most recent -> page 1)
      this.currentPage = 1;
      this.storage.set("notes_page", 1);
    }

    return note;
  }

  selectNote(id) {
    const note = this.notes.find((n) => n.id === id);
    if (!note) return;

    // Persist current note before switching
    const current = this.getActiveNote();
    if (current) {
      current.title = String(this.titleInput.value || "").slice(0, 120);
      current.html = this.getSanitizedHtmlFromEditor();
      current.updatedAt = Date.now();
    }

    this.activeNoteId = id;
    this.storage.set("notes_active", id);

    this.titleInput.value = note.title || "";
    this.editor.innerHTML = this.sanitizeHtml(note.html || "");

    // Ensure links are present and safe
    this.normalizeNow();

    // Place caret at end
    this.placeCaretAtEnd(this.editor);

    // Reorder after selection update
    this.notes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    this.save();

    this.renderList();
    this.updatePaginationUI();
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

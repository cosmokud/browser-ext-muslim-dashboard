/**
 * Notes (Milkdown + Markdown)
 * A standalone, theme-aware notes component with CRUD and full markdown toolbar.
 */

class NotesManager extends BaseManager {
  static STORAGE_KEY = "notes";
  static ACTIVE_NOTE_KEY = "notes_active";
  static VIEW_MODE_KEY = "notes_view_mode";
  static VIEW_MODE_LOCAL_KEY = "mdnotes_view_mode";
  static DEFAULT_TITLE = "Untitled";

  static DEFAULT_MARKDOWN = [
    "# Notes",
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
    this.pendingDeleteId = null;

    this._milkdown = null;
    this._milkdownReady = false;
    this._suppressMilkdownChange = false;
    this._saveTimer = null;
    this._milkdownUiSyncRaf = null;
    this._milkdownUiSyncInstalled = false;
    this._milkdownUiSyncHandler = null;
    this._milkdownUiSyncScrollHost = null;

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
            <h2 class="mdnotes-title">
              <span class="card-icon mdnotes-title-icon" aria-hidden="true">📝</span>
              <span class="mdnotes-title-text">Notes</span>
            </h2>
          </div>

          <div class="mdnotes-header-actions card-header-actions">
            <button
              type="button"
              id="mdnotesSearchBtn"
              class="mdnotes-pill-btn mdnotes-pill-icon content-search-btn-notes"
              aria-label="Search notes"
              title="Search notes"
            >
              <svg class="mdnotes-ui-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <circle cx="11" cy="11" r="7"></circle>
                <path d="m20 20-3.4-3.4"></path>
              </svg>
            </button>
            <button
              type="button"
              id="mdnotesNewBtn"
              class="mdnotes-pill-btn mdnotes-pill-icon"
              aria-label="Create new note"
              title="New note"
            >
              <svg class="mdnotes-ui-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <button
              type="button"
              id="mdnotesDeleteBtn"
              class="mdnotes-pill-btn mdnotes-pill-icon danger"
              aria-label="Delete current note"
              title="Delete note"
            >
              <svg class="mdnotes-ui-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <path d="M4 7h16"></path>
                <path d="M9 7V5h6v2"></path>
                <path d="M8 7v12"></path>
                <path d="M16 7v12"></path>
                <path d="M6 7l1 13h10l1-13"></path>
              </svg>
            </button>

            <div
              class="card-blur-menu"
              aria-label="Notes blur menu"
              data-card-id="notesCard"
            >
              <button
                class="card-blur-btn"
                id="notesBlurMenuBtn"
                type="button"
                aria-label="Open blur settings"
                title="Blur and Glass Settings"
              >
                ✨
              </button>
              <div class="blur-settings-popup">
                <div class="blur-popup-header">
                  <span class="blur-popup-title">
                    <span class="blur-popup-title-icon">✨</span>
                    Glass Settings
                  </span>
                  <button
                    class="blur-popup-close"
                    type="button"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div class="blur-setting-section">
                  <span class="blur-setting-label">Glass Effect</span>
                  <div class="blur-glass-toggle">
                    <button
                      class="blur-glass-option"
                      data-glass-value="off"
                      type="button"
                    >
                      <span class="blur-glass-option-icon">⬜</span>
                      <span class="blur-glass-option-label">Off</span>
                    </button>

                    <button
                      class="blur-glass-option active"
                      data-glass-value="dashboard"
                      type="button"
                    >
                      <span class="blur-glass-option-icon">🔗</span>
                      <span class="blur-glass-option-label">Dash</span>
                    </button>

                    <button
                      class="blur-glass-option"
                      data-glass-value="on"
                      type="button"
                    >
                      <span class="blur-glass-option-icon">✨</span>
                      <span class="blur-glass-option-label">On</span>
                    </button>
                  </div>
                </div>

                <div class="blur-setting-section">
                  <div class="blur-power-header">
                    <span class="blur-setting-label">Blur Power</span>
                    <label class="blur-power-toggle">
                      <input type="checkbox" class="blur-power-checkbox" />
                      <span class="blur-power-switch"></span>
                      <span class="blur-power-toggle-label">Custom</span>
                    </label>
                  </div>

                  <div class="blur-power-slider-wrap disabled">
                    <input
                      type="range"
                      class="blur-power-slider"
                      min="0"
                      max="200"
                      value="100"
                    />
                    <span class="blur-power-value">100%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mdnotes-selector-wrap" aria-label="Notes selector">
          <button
            class="mdnotes-page-btn mdnotes-page-btn-nav"
            id="mdnotesPrevPageBtn"
            type="button"
            aria-label="Scroll notes left"
            title="Previous notes"
          >
            &lt;
          </button>

          <div class="mdnotes-selector-center">
            <div class="mdnotes-list" id="mdnotesList" role="list"></div>
          </div>

          <button
            class="mdnotes-page-btn mdnotes-page-btn-nav"
            id="mdnotesNextPageBtn"
            type="button"
            aria-label="Scroll notes right"
            title="Next notes"
          >
            &gt;
          </button>
        </div>

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
              <button
                type="button"
                class="mdnotes-view-btn"
                data-view="split"
                aria-label="Split mode"
                title="Split mode"
              >
                <svg class="mdnotes-ui-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2"></rect>
                  <path d="M12 5v14"></path>
                </svg>
              </button>
              <button
                type="button"
                class="mdnotes-view-btn"
                data-view="wysiwyg"
                aria-label="WYSIWYG mode"
                title="WYSIWYG mode"
              >
                <svg class="mdnotes-ui-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                  <path d="M3 5h18"></path>
                  <path d="M3 12h18"></path>
                  <path d="M3 19h18"></path>
                  <path d="M8 5v14"></path>
                </svg>
              </button>
              <button
                type="button"
                class="mdnotes-view-btn"
                data-view="markdown"
                aria-label="Markdown mode"
                title="Markdown mode"
              >
                <svg class="mdnotes-ui-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                  <path d="M4 6h16v12H4z"></path>
                  <path d="M8 10v4"></path>
                  <path d="m8 14 2-2 2 2"></path>
                  <path d="m14 10 2 2-2 2"></path>
                </svg>
              </button>
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
    `;
  }

  buildToolbarMarkup() {
    return `
      <button type="button" class="mdnotes-tool-btn" data-cmd="bold" aria-label="Bold" title="Bold">
        <svg class="mdnotes-tool-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M7 4h7a4 4 0 0 1 0 8H7z"></path>
          <path d="M7 12h8a4 4 0 0 1 0 8H7z"></path>
        </svg>
      </button>
      <button type="button" class="mdnotes-tool-btn" data-cmd="italic" aria-label="Italic" title="Italic">
        <svg class="mdnotes-tool-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M11 4h8"></path>
          <path d="M5 20h8"></path>
          <path d="M14 4 10 20"></path>
        </svg>
      </button>
      <button type="button" class="mdnotes-tool-btn" data-cmd="underline" aria-label="Underline" title="Underline">
        <svg class="mdnotes-tool-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M7 4v7a5 5 0 0 0 10 0V4"></path>
          <path d="M5 20h14"></path>
        </svg>
      </button>
      <button type="button" class="mdnotes-tool-btn" data-cmd="strikeThrough" aria-label="Strikethrough" title="Strikethrough">
        <svg class="mdnotes-tool-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M4 12h16"></path>
          <path d="M7 6a3 3 0 0 1 3-2h3a3 3 0 0 1 3 3"></path>
          <path d="M7 18a3 3 0 0 0 3 2h3a3 3 0 0 0 3-3"></path>
        </svg>
      </button>
      <button type="button" class="mdnotes-tool-btn" data-cmd="inlineCode" aria-label="Inline code" title="Inline code">
        <svg class="mdnotes-tool-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="m8 16-4-4 4-4"></path>
          <path d="m16 8 4 4-4 4"></path>
          <path d="m14 4-4 16"></path>
        </svg>
      </button>
      <button type="button" class="mdnotes-tool-btn" data-cmd="codeBlock" aria-label="Code block" title="Code block">
        <svg class="mdnotes-tool-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2"></rect>
          <path d="m9 10-2 2 2 2"></path>
          <path d="m15 10 2 2-2 2"></path>
        </svg>
      </button>
      <button type="button" class="mdnotes-tool-btn" data-cmd="quote" aria-label="Block quote" title="Block quote">
        <svg class="mdnotes-tool-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M6 8h5v5H6z"></path>
          <path d="M6 13c0 2.5-1.6 4.7-4 6"></path>
          <path d="M14 8h5v5h-5z"></path>
          <path d="M14 13c0 2.5-1.6 4.7-4 6"></path>
        </svg>
      </button>

      <span class="mdnotes-tool-sep" aria-hidden="true"></span>

      <button type="button" class="mdnotes-tool-btn" data-cmd="insertUnorderedList" aria-label="Bullet list" title="Bullet list">
        <svg class="mdnotes-tool-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M9 7h11"></path>
          <path d="M9 12h11"></path>
          <path d="M9 17h11"></path>
          <circle cx="5" cy="7" r="1.2"></circle>
          <circle cx="5" cy="12" r="1.2"></circle>
          <circle cx="5" cy="17" r="1.2"></circle>
        </svg>
      </button>
      <button type="button" class="mdnotes-tool-btn" data-cmd="insertOrderedList" aria-label="Numbered list" title="Numbered list">
        <svg class="mdnotes-tool-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M10 7h10"></path>
          <path d="M10 12h10"></path>
          <path d="M10 17h10"></path>
          <path d="M4 6h2v2H4z"></path>
          <path d="M4 11h2v2H4z"></path>
          <path d="M4 16h2v2H4z"></path>
        </svg>
      </button>
      <button type="button" class="mdnotes-tool-btn" data-cmd="checklist" aria-label="Task list" title="Task list">
        <svg class="mdnotes-tool-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <rect x="4" y="5" width="4" height="4" rx="1"></rect>
          <rect x="4" y="10" width="4" height="4" rx="1"></rect>
          <path d="m5 12 1 1 2-2"></path>
          <path d="M10 7h10"></path>
          <path d="M10 12h10"></path>
          <path d="M10 17h10"></path>
        </svg>
      </button>

      <span class="mdnotes-tool-sep" aria-hidden="true"></span>

      <button type="button" class="mdnotes-tool-btn" data-cmd="insertLink" aria-label="Insert link" title="Insert link">
        <svg class="mdnotes-tool-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 1 0-7.07-7.07L10 6"></path>
          <path d="M14 11a5 5 0 0 0-7.07 0L5.5 12.41a5 5 0 0 0 7.07 7.07L14 18"></path>
        </svg>
      </button>
      <button type="button" class="mdnotes-tool-btn" data-cmd="insertImage" aria-label="Insert image" title="Insert image">
        <svg class="mdnotes-tool-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2"></rect>
          <circle cx="9" cy="10" r="1.5"></circle>
          <path d="m21 16-5-5-4 4-2-2-5 5"></path>
        </svg>
      </button>
      <button type="button" class="mdnotes-tool-btn" data-cmd="insertTable" aria-label="Insert table" title="Insert table">
        <svg class="mdnotes-tool-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2"></rect>
          <path d="M3 10h18"></path>
          <path d="M9 5v14"></path>
          <path d="M15 5v14"></path>
        </svg>
      </button>
      <button type="button" class="mdnotes-tool-btn" data-cmd="insertHr" aria-label="Insert horizontal rule" title="Insert horizontal rule">
        <svg class="mdnotes-tool-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M3 12h18"></path>
          <path d="M6 8h1"></path>
          <path d="M17 16h1"></path>
        </svg>
      </button>

      <span class="mdnotes-tool-sep" aria-hidden="true"></span>

      <button type="button" class="mdnotes-tool-btn" data-block="H1" aria-label="Heading 1" title="Heading 1">
        <svg class="mdnotes-tool-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M4 5v14"></path>
          <path d="M10 5v14"></path>
          <path d="M4 12h6"></path>
          <path d="M17 8v8"></path>
          <path d="M15 10h2"></path>
        </svg>
      </button>
      <button type="button" class="mdnotes-tool-btn" data-block="H2" aria-label="Heading 2" title="Heading 2">
        <svg class="mdnotes-tool-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M4 5v14"></path>
          <path d="M10 5v14"></path>
          <path d="M4 12h6"></path>
          <path d="M15 10a2 2 0 0 1 4 0c0 2.2-2.4 3.2-3.6 4.8-.5.6-.4 1.2-.4 1.2H19"></path>
        </svg>
      </button>
      <button type="button" class="mdnotes-tool-btn" data-block="H3" aria-label="Heading 3" title="Heading 3">
        <svg class="mdnotes-tool-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M4 5v14"></path>
          <path d="M10 5v14"></path>
          <path d="M4 12h6"></path>
          <path d="M15 9h4"></path>
          <path d="M15 15h4"></path>
          <path d="M17.5 9a2 2 0 1 1 0 6"></path>
        </svg>
      </button>
      <button type="button" class="mdnotes-tool-btn" data-block="H4" aria-label="Heading 4" title="Heading 4">
        <svg class="mdnotes-tool-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M4 5v14"></path>
          <path d="M10 5v14"></path>
          <path d="M4 12h6"></path>
          <path d="M15 9v6"></path>
          <path d="M19 9v6"></path>
          <path d="M15 12h4"></path>
        </svg>
      </button>
      <button type="button" class="mdnotes-tool-btn" data-block="H5" aria-label="Heading 5" title="Heading 5"><span class="mdnotes-tool-text">H5</span></button>
      <button type="button" class="mdnotes-tool-btn" data-block="H6" aria-label="Heading 6" title="Heading 6"><span class="mdnotes-tool-text">H6</span></button>
      <button type="button" class="mdnotes-tool-btn" data-block="P" aria-label="Paragraph" title="Paragraph">
        <svg class="mdnotes-tool-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M13 4v16"></path>
          <path d="M17 4v16"></path>
          <path d="M9 4a4 4 0 0 0 0 8h8"></path>
        </svg>
      </button>
    `;
  }

  cacheElements() {
    this.searchBtn = this.card.querySelector("#mdnotesSearchBtn");
    this.newBtn = this.card.querySelector("#mdnotesNewBtn");
    this.deleteBtn = this.card.querySelector("#mdnotesDeleteBtn");
    this.prevPageBtn = this.card.querySelector("#mdnotesPrevPageBtn");
    this.nextPageBtn = this.card.querySelector("#mdnotesNextPageBtn");

    this.deleteModal = document.getElementById("notesDeleteConfirmModal");
    this.deleteNameEl = document.getElementById("notesDeleteName");
    this.confirmDeleteBtn = document.getElementById("confirmNotesDeleteBtn");
    this.cancelDeleteBtn = document.getElementById("cancelNotesDeleteBtn");

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
    if (this.searchBtn) {
      this.searchBtn.addEventListener("click", (event) => {
        event.preventDefault();
        this.openNotesSearchModal();
      });
    }

    if (this.newBtn) {
      this.newBtn.addEventListener("click", () => {
        this.persistActiveNote({ markUpdated: true });
        const note = this.createNote();
        this.selectNote(note.id, { skipPersistCurrent: true, focus: true });
        this.saveNow();
        this.refreshMilkdownUiPosition();
        setTimeout(() => this.refreshMilkdownUiPosition(), 100);
      });
    }

    if (this.deleteBtn) {
      this.deleteBtn.addEventListener("click", () => {
        const active = this.getActiveNote();
        if (!active) return;
        this.showDeleteConfirmationForNoteId(active.id);
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

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      this.hideDeleteConfirmation();
    });

    if (this.listEl) {
      this.listEl.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        if (event.pointerType === "touch") return;

        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest(".mdnotes-list-delete")) return;

        const item = target.closest(".mdnotes-list-item");
        if (!item) return;

        const noteId = String(item.getAttribute("data-note-id") || "").trim();
        if (!noteId) return;
        if (String(this.activeNoteId) === noteId) return;

        this.markListItemActive(noteId);
        this.selectNote(noteId, {
          focus: false,
          scrollBehavior: "auto",
          promote: true,
          animateMove: true,
        });
      });

      this.listEl.addEventListener(
        "scroll",
        () => this.updateSelectorNavState(),
        {
          passive: true,
        },
      );

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
        if (String(this.activeNoteId) === noteId) return;

        this.markListItemActive(noteId);
        this.selectNote(noteId, {
          focus: false,
          scrollBehavior: "auto",
          promote: true,
          animateMove: true,
        });
      });
    }

    if (this.prevPageBtn) {
      this.prevPageBtn.addEventListener("click", () =>
        this.scrollSelectorBy(-1),
      );
    }

    if (this.nextPageBtn) {
      this.nextPageBtn.addEventListener("click", () =>
        this.scrollSelectorBy(1),
      );
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

    window.addEventListener("resize", () => this.updateSelectorNavState());
  }

  openNotesSearchModal() {
    try {
      if (window.dashboard?.contentSearch?.open) {
        window.dashboard.contentSearch.open("notes");
        return;
      }
    } catch (error) {
      // continue to fallback
    }

    try {
      const modal = document.getElementById("contentSearchModal");
      const input = document.getElementById("contentSearchInput");
      if (modal) {
        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
      }
      if (input) {
        input.focus();
      }
    } catch (error) {}
  }

  normalizeViewMode(value) {
    const mode = String(value || "")
      .trim()
      .toLowerCase();
    return mode === "split" || mode === "wysiwyg" || mode === "markdown"
      ? mode
      : "";
  }

  readViewMode() {
    const fallback = "split";

    try {
      const storageValue = this.storage?.get?.(NotesManager.VIEW_MODE_KEY, "");
      const normalizedStorage = this.normalizeViewMode(storageValue);
      if (normalizedStorage) return normalizedStorage;
    } catch (error) {}

    try {
      const localValue = window.localStorage?.getItem(
        NotesManager.VIEW_MODE_LOCAL_KEY,
      );
      const normalizedLocal = this.normalizeViewMode(localValue);
      if (normalizedLocal) return normalizedLocal;
    } catch (error) {}

    return fallback;
  }

  writeViewMode() {
    const mode = this.normalizeViewMode(this.viewMode) || "split";

    try {
      this.storage?.set?.(NotesManager.VIEW_MODE_KEY, mode);
    } catch (error) {}

    try {
      window.localStorage?.setItem(NotesManager.VIEW_MODE_LOCAL_KEY, mode);
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
      this.refreshMilkdownUiPosition();
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
      this.teardownMilkdownUiSync();
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

        this.installMilkdownUiSync();
        this.setMilkdownMarkdown(seed, { silent: true });
        this.applyViewMode(this.viewMode, { persist: false, focus: false });
        this.refreshMilkdownUiPosition();
        setTimeout(() => this.refreshMilkdownUiPosition(), 90);
      })
      .catch((error) => {
        console.warn("Milkdown initialization failed:", error);
        this._milkdown = null;
        this._milkdownReady = false;
        this.teardownMilkdownUiSync();

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
    this.scheduleMilkdownUiSync();
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
      this.scheduleMilkdownUiSync();
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
    this.scheduleMilkdownUiSync();
  }

  refreshMilkdownUiPosition() {
    if (!this.isMilkdownEnabled()) return;
    if (this.viewMode === "markdown") return;

    try {
      window.dispatchEvent(new Event("resize"));
    } catch (error) {}

    try {
      const scrollHost = this.wysiwygHost?.querySelector(".milkdown .editor");
      if (scrollHost) {
        scrollHost.dispatchEvent(new Event("scroll"));
      }
    } catch (error) {}

    this.scheduleMilkdownUiSync();
  }

  installMilkdownUiSync() {
    if (!this.isMilkdownEnabled()) return;

    const scrollHost = this.wysiwygHost?.querySelector(".milkdown .editor");
    if (!scrollHost) return;

    if (
      this._milkdownUiSyncInstalled &&
      this._milkdownUiSyncScrollHost === scrollHost
    ) {
      this.scheduleMilkdownUiSync();
      return;
    }

    this.teardownMilkdownUiSync();

    const schedule = () => this.scheduleMilkdownUiSync();
    this._milkdownUiSyncHandler = schedule;
    this._milkdownUiSyncScrollHost = scrollHost;

    scrollHost.addEventListener("scroll", schedule, { passive: true });
    this.wysiwygHost?.addEventListener("pointerup", schedule, true);
    this.wysiwygHost?.addEventListener("keyup", schedule, true);
    document.addEventListener("selectionchange", schedule, true);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);

    this._milkdownUiSyncInstalled = true;
    this.scheduleMilkdownUiSync();
  }

  teardownMilkdownUiSync() {
    if (!this._milkdownUiSyncInstalled || !this._milkdownUiSyncHandler) return;

    try {
      this._milkdownUiSyncScrollHost?.removeEventListener(
        "scroll",
        this._milkdownUiSyncHandler,
      );
      this.wysiwygHost?.removeEventListener(
        "pointerup",
        this._milkdownUiSyncHandler,
        true,
      );
      this.wysiwygHost?.removeEventListener(
        "keyup",
        this._milkdownUiSyncHandler,
        true,
      );
      document.removeEventListener(
        "selectionchange",
        this._milkdownUiSyncHandler,
        true,
      );
      window.removeEventListener("resize", this._milkdownUiSyncHandler);
      window.removeEventListener("scroll", this._milkdownUiSyncHandler, true);
    } catch (error) {}

    this._milkdownUiSyncInstalled = false;
    this._milkdownUiSyncHandler = null;
    this._milkdownUiSyncScrollHost = null;
  }

  scheduleMilkdownUiSync() {
    if (this._milkdownUiSyncRaf) {
      cancelAnimationFrame(this._milkdownUiSyncRaf);
    }

    this._milkdownUiSyncRaf = requestAnimationFrame(() => {
      this._milkdownUiSyncRaf = null;
      this.syncMilkdownFloatingUi();
    });
  }

  syncMilkdownFloatingUi() {
    if (!this.isMilkdownEnabled() || this.viewMode === "markdown") return;

    const scrollHost = this.wysiwygHost?.querySelector(".milkdown .editor");
    const handle = this.wysiwygHost?.querySelector(
      ".milkdown .milkdown-block-handle",
    );

    if (!scrollHost || !handle) return;

    handle.style.left = "0px";
    handle.style.right = "auto";
    handle.style.insetInlineStart = "0px";
    handle.style.insetInlineEnd = "auto";
    handle.style.zIndex = "1400";

    if (handle.getAttribute("data-show") === "false") {
      handle.dataset.notesHidden = "true";
      return;
    }

    handle.dataset.notesHidden = "false";
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

    this.writeActiveNoteId();
  }

  writeActiveNoteId() {
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

  selectNote(
    id,
    {
      skipPersistCurrent = false,
      focus = false,
      scrollBehavior = "auto",
      promote = false,
      animateMove = false,
    } = {},
  ) {
    const noteId = String(id || "").trim();
    if (!noteId) return;

    const next = this.notes.find((entry) => String(entry.id) === noteId);
    if (!next) return;

    let changed = false;
    if (!skipPersistCurrent) {
      changed = this.persistActiveNote({ markUpdated: true });
    }

    const promoted = promote ? this.promoteNoteToFront(noteId) : false;

    this.activeNoteId = noteId;
    this.renderActiveNote();

    if (changed || promoted) {
      this.renderList({ animate: animateMove && promoted });
    } else {
      this.markListItemActive(noteId);
    }

    this.ensureActiveVisible(scrollBehavior);

    if (this.isMilkdownEnabled() && this.viewMode !== "markdown") {
      this.refreshMilkdownUiPosition();
      setTimeout(() => this.refreshMilkdownUiPosition(), 90);
    }

    if (focus) {
      this.focusEditor();
    }

    if (changed || promoted) {
      this.writeNotes();
    } else {
      this.writeActiveNoteId();
    }
  }

  promoteNoteToFront(noteId) {
    const id = String(noteId || "").trim();
    if (!id) return false;

    const index = this.notes.findIndex((entry) => String(entry.id) === id);
    if (index < 0) return false;
    if (index === 0) return false;

    const [note] = this.notes.splice(index, 1);
    if (!note) return false;

    note.updatedAt = Date.now();
    this.notes.unshift(note);
    return true;
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
      this.scheduleMilkdownUiSync();
    }

    this.updateMeta(note);
    this.updateCounter(String(note.md || ""));

    if (this.deleteBtn) {
      this.deleteBtn.disabled = this.notes.length <= 0;
    }
  }

  renderList({ animate = false } = {}) {
    if (!this.listEl) return;

    const prevScrollLeft = this.listEl.scrollLeft;
    const prevRects = new Map();

    if (animate) {
      this.listEl.querySelectorAll(".mdnotes-list-item").forEach((item) => {
        const id = String(item.getAttribute("data-note-id") || "").trim();
        if (!id) return;
        prevRects.set(id, item.getBoundingClientRect());
      });
    }

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
      delBtn.innerHTML = this._getIcon("🗑", { size: 14, inline: true });

      item.appendChild(title);
      item.appendChild(meta);
      item.appendChild(delBtn);

      item.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        this.selectNote(String(note.id), {
          focus: false,
          scrollBehavior: "auto",
          promote: true,
          animateMove: true,
        });
      });

      this.listEl.appendChild(item);
    });

    this.listEl.scrollLeft = prevScrollLeft;
    this.updateSelectorNavState();

    if (animate && prevRects.size) {
      this.animateSelectorReorder(prevRects);
    }
  }

  markListItemActive(noteId) {
    if (!this.listEl) return;

    const activeId = String(noteId || "").trim();

    this.listEl.querySelectorAll(".mdnotes-list-item").forEach((item) => {
      const itemId = String(item.getAttribute("data-note-id") || "").trim();
      item.classList.toggle("active", itemId === activeId);
    });
  }

  animateSelectorReorder(prevRects) {
    if (!this.listEl || !prevRects || !prevRects.size) return;

    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) return;

    this.listEl.querySelectorAll(".mdnotes-list-item").forEach((item) => {
      const id = String(item.getAttribute("data-note-id") || "").trim();
      if (!id) return;

      const previousRect = prevRects.get(id);
      if (!previousRect) return;

      const nextRect = item.getBoundingClientRect();
      const dx = previousRect.left - nextRect.left;
      const dy = previousRect.top - nextRect.top;

      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

      item.animate(
        [
          {
            transform: `translate(${dx}px, ${dy}px) scale(0.98)`,
            opacity: 0.82,
          },
          {
            transform: "translate(0, 0) scale(1)",
            opacity: 1,
          },
        ],
        {
          duration: 360,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        },
      );
    });
  }

  updateSelectorNavState() {
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

  scrollSelectorBy(direction) {
    if (!this.listEl) return;

    const dir = direction < 0 ? -1 : 1;
    const step = Math.max(180, Math.floor(this.listEl.clientWidth * 0.82));

    try {
      this.listEl.scrollBy({ left: step * dir, behavior: "smooth" });
    } catch (error) {
      this.listEl.scrollLeft += step * dir;
    }

    setTimeout(() => this.updateSelectorNavState(), 220);
  }

  ensureActiveVisible(behavior = "auto") {
    if (!this.listEl || !this.activeNoteId) return;

    const item = this.listEl.querySelector(
      `.mdnotes-list-item[data-note-id="${String(this.activeNoteId)}"]`,
    );

    if (!item || typeof item.scrollIntoView !== "function") return;

    try {
      item.scrollIntoView({
        behavior,
        block: "nearest",
        inline: "nearest",
      });
    } catch (error) {}
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
        `Delete note \"${String(note.title || NotesManager.DEFAULT_TITLE)}\"?`,
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

    if (this.deleteModal) {
      this.deleteModal.classList.add("active");
      this.deleteModal.setAttribute("aria-hidden", "false");
    }
  }

  hideDeleteConfirmation() {
    if (this.deleteModal) {
      this.deleteModal.classList.remove("active");
      this.deleteModal.setAttribute("aria-hidden", "true");
    }

    this.pendingDeleteId = null;
  }

  confirmDelete() {
    const pendingId = String(this.pendingDeleteId || "").trim();
    if (!pendingId) return;

    this.deleteNoteById(pendingId);
    this.hideDeleteConfirmation();
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

    this.selectNote(noteId, {
      focus: true,
      scrollBehavior: "smooth",
      promote: true,
      animateMove: true,
    });
    this.ensureActiveVisible("smooth");
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

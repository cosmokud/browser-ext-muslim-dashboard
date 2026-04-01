/**
 * Standalone Milkdown editor component.
 * Intentionally does not wire legacy note list/title/storage behavior.
 */

class NotesManager {
  static DEFAULT_MARKDOWN = [
    "# Markdown Studio",
    "",
    "Type in either pane:",
    "",
    "- Left: Milkdown WYSIWYG editor",
    "- Right: raw Markdown source",
    "",
    "Changes stay synced live.",
    "",
    "> This is a fresh component baseline.",
  ].join("\n");

  constructor(storage) {
    this.storage = storage;

    // Compatibility placeholders for modules that probe the old Notes API.
    this.notes = [];

    this.card = document.getElementById("notesCard");
    this._milkdown = null;
    this._milkdownReady = false;
    this._suppressMilkdownChange = false;

    this._viewMode = "split";
    this._state = {
      markdown: NotesManager.DEFAULT_MARKDOWN,
    };

    if (!this.card) return;
    this.mount();
  }

  mount() {
    this.ensureStyles();
    this.renderShell();
    this.bindUi();

    this.syncSourceFromState();
    this.updateCount();
    this.updateStatus("Loading Milkdown...", "loading");

    this.setupMilkdown();
  }

  ensureStyles() {
    const existing = document.getElementById("mdScratchStyles");
    if (existing) return;

    const style = document.createElement("style");
    style.id = "mdScratchStyles";
    style.textContent = `
#notesCard .md-scratch-root {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 520px;
}

#notesCard .md-scratch-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

#notesCard .md-scratch-title {
  margin: 0;
  font-size: 1.06rem;
  font-weight: 700;
  color: var(--text-primary, #f3f6ff);
}

#notesCard .md-scratch-subtitle {
  margin: 2px 0 0;
  font-size: 0.86rem;
  opacity: 0.85;
  color: var(--text-secondary, #d6deef);
}

#notesCard .md-scratch-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

#notesCard .md-scratch-btn {
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary, #f3f6ff);
  border-radius: 999px;
  padding: 6px 11px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

#notesCard .md-scratch-btn:hover {
  background: rgba(255, 255, 255, 0.14);
}

#notesCard .md-scratch-btn.active {
  background: rgba(255, 255, 255, 0.22);
  border-color: rgba(255, 255, 255, 0.35);
}

#notesCard .md-scratch-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

#notesCard .md-scratch-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  min-height: 420px;
}

#notesCard .md-scratch-body[data-view="wysiwyg"],
#notesCard .md-scratch-body[data-view="markdown"] {
  grid-template-columns: minmax(0, 1fr);
}

#notesCard .md-scratch-body[data-view="wysiwyg"] .md-scratch-pane-source {
  display: none;
}

#notesCard .md-scratch-body[data-view="markdown"] .md-scratch-pane-wysiwyg {
  display: none;
}

#notesCard .md-scratch-pane {
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(8, 12, 20, 0.32);
  overflow: hidden;
}

#notesCard .md-scratch-pane-head {
  padding: 9px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-secondary, #d6deef);
}

#notesCard #mdScratchWysiwyg {
  flex: 1;
  min-height: 320px;
  overflow: auto;
  padding: 12px;
}

#notesCard #mdScratchWysiwyg .milkdown {
  min-height: 100%;
}

#notesCard #mdScratchSource {
  flex: 1;
  min-height: 320px;
  padding: 12px 14px;
  border: 0;
  outline: 0;
  resize: vertical;
  background: transparent;
  color: var(--text-primary, #f3f6ff);
  font: 500 0.94rem/1.55 "JetBrains Mono", "Fira Code", Consolas, monospace;
}

#notesCard .md-scratch-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  font-size: 0.8rem;
}

#notesCard .md-scratch-status {
  opacity: 0.92;
  color: var(--text-secondary, #d6deef);
}

#notesCard .md-scratch-status[data-state="error"] {
  color: #ff8d8d;
}

#notesCard .md-scratch-status[data-state="loading"] {
  color: #ffd599;
}

#notesCard .md-scratch-count {
  opacity: 0.86;
  color: var(--text-secondary, #d6deef);
}

@media (max-width: 900px) {
  #notesCard .md-scratch-body {
    grid-template-columns: minmax(0, 1fr);
  }
}
`;

    document.head.appendChild(style);
  }

  renderShell() {
    this.card.innerHTML = `
      <div class="md-scratch-root">
        <div class="md-scratch-head">
          <div>
            <h2 class="md-scratch-title">Markdown Studio</h2>
            <p class="md-scratch-subtitle">Milkdown WYSIWYG with live markdown source sync</p>
          </div>

          <div class="md-scratch-actions" role="group" aria-label="Editor view modes">
            <button type="button" class="md-scratch-btn active" data-view="split">Split</button>
            <button type="button" class="md-scratch-btn" data-view="wysiwyg">WYSIWYG</button>
            <button type="button" class="md-scratch-btn" data-view="markdown">Markdown</button>
            <button type="button" class="md-scratch-btn" id="mdScratchResetBtn">Reset Sample</button>
          </div>
        </div>

        <div class="md-scratch-body" id="mdScratchBody" data-view="split">
          <section class="md-scratch-pane md-scratch-pane-wysiwyg" aria-label="Milkdown editor pane">
            <div class="md-scratch-pane-head">WYSIWYG</div>
            <div id="mdScratchWysiwyg"></div>
          </section>

          <section class="md-scratch-pane md-scratch-pane-source" aria-label="Markdown source pane">
            <div class="md-scratch-pane-head">Markdown</div>
            <textarea id="mdScratchSource" spellcheck="false" aria-label="Markdown source"></textarea>
          </section>
        </div>

        <div class="md-scratch-foot">
          <span class="md-scratch-status" id="mdScratchStatus" data-state="loading">Loading Milkdown...</span>
          <span class="md-scratch-count" id="mdScratchCount"></span>
        </div>
      </div>
    `;

    this.bodyEl = this.card.querySelector("#mdScratchBody");
    this.wysiwygHost = this.card.querySelector("#mdScratchWysiwyg");
    this.sourceEl = this.card.querySelector("#mdScratchSource");
    this.statusEl = this.card.querySelector("#mdScratchStatus");
    this.countEl = this.card.querySelector("#mdScratchCount");
    this.resetBtn = this.card.querySelector("#mdScratchResetBtn");
    this.viewBtns = Array.from(
      this.card.querySelectorAll(".md-scratch-btn[data-view]"),
    );
  }

  bindUi() {
    if (this.sourceEl) {
      this.sourceEl.addEventListener("input", () => {
        this.setMarkdown(this.sourceEl.value, { origin: "source" });
      });
    }

    this.viewBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const view = String(btn.getAttribute("data-view") || "split");
        this.applyView(view);
      });
    });

    if (this.resetBtn) {
      this.resetBtn.addEventListener("click", () => {
        this.setMarkdown(NotesManager.DEFAULT_MARKDOWN, { origin: "reset" });
        this.focusEditor();
      });
    }
  }

  async setupMilkdown() {
    if (
      !window.NotesMilkdown ||
      typeof window.NotesMilkdown.create !== "function"
    ) {
      this.updateStatus(
        "Milkdown adapter missing. Markdown source mode only.",
        "error",
      );
      this.setMilkdownAvailable(false);
      this.applyView("markdown");
      return;
    }

    try {
      this.wysiwygHost.innerHTML = "";

      const adapter = await window.NotesMilkdown.create({
        root: this.wysiwygHost,
        defaultMarkdown: this._state.markdown,
        onMarkdownChange: (markdown) => this.onMilkdownChange(markdown),
      });

      this._milkdown = adapter;
      this._milkdownReady = true;

      this.updateStatus("Milkdown ready.", "ok");
      this.setMilkdownAvailable(true);
      this.syncMilkdownFromState();
    } catch (error) {
      console.warn("Milkdown initialization failed:", error);
      this._milkdown = null;
      this._milkdownReady = false;

      this.updateStatus(
        "Milkdown failed to initialize. Markdown source mode only.",
        "error",
      );
      this.setMilkdownAvailable(false);
      this.applyView("markdown");
    }
  }

  onMilkdownChange(markdown) {
    if (this._suppressMilkdownChange) return;
    this.setMarkdown(markdown, { origin: "milkdown" });
  }

  setMarkdown(markdown, { origin = "" } = {}) {
    const next = String(markdown || "");
    const prev = this._state.markdown;

    this._state.markdown = next;

    if (origin !== "source") {
      this.syncSourceFromState();
    }

    if (origin !== "milkdown") {
      this.syncMilkdownFromState();
    }

    if (next !== prev) {
      this.updateStatus("Synced live.", "ok");
    }

    this.updateCount();
  }

  syncSourceFromState() {
    if (!this.sourceEl) return;
    if (this.sourceEl.value === this._state.markdown) return;
    this.sourceEl.value = this._state.markdown;
  }

  getMilkdownMarkdown() {
    if (!this._milkdownReady || !this._milkdown) return "";

    try {
      return String(this._milkdown.getMarkdown() || "");
    } catch (error) {
      return "";
    }
  }

  syncMilkdownFromState() {
    if (!this._milkdownReady || !this._milkdown) return;

    const next = this._state.markdown;
    if (this.getMilkdownMarkdown() === next) return;

    this._suppressMilkdownChange = true;

    try {
      this._milkdown.setMarkdown(next, { silent: true });
    } catch (error) {
      // Keep source pane functional even if the visual editor update fails.
    } finally {
      setTimeout(() => {
        this._suppressMilkdownChange = false;
      }, 0);
    }
  }

  applyView(view) {
    const allowed =
      view === "split" || view === "wysiwyg" || view === "markdown";
    const nextView = allowed ? view : "split";

    if (nextView !== "markdown" && !this._milkdownReady) {
      this._viewMode = "markdown";
    } else {
      this._viewMode = nextView;
    }

    if (this.bodyEl) {
      this.bodyEl.setAttribute("data-view", this._viewMode);
    }

    this.viewBtns.forEach((btn) => {
      const btnView = String(btn.getAttribute("data-view") || "split");
      btn.classList.toggle("active", btnView === this._viewMode);
      btn.setAttribute(
        "aria-pressed",
        btnView === this._viewMode ? "true" : "false",
      );
    });
  }

  setMilkdownAvailable(available) {
    this.viewBtns.forEach((btn) => {
      const view = String(btn.getAttribute("data-view") || "split");
      if (view === "markdown") {
        btn.disabled = false;
        return;
      }
      btn.disabled = !available;
    });
  }

  focusEditor() {
    if (
      this._milkdownReady &&
      this._milkdown &&
      typeof this._milkdown.focus === "function"
    ) {
      try {
        this._milkdown.focus();
        return;
      } catch (error) {
        // Fall through to source focus.
      }
    }

    try {
      this.sourceEl?.focus();
    } catch (error) {}
  }

  updateStatus(text, state = "ok") {
    if (!this.statusEl) return;
    this.statusEl.textContent = String(text || "");
    this.statusEl.setAttribute("data-state", state);
  }

  updateCount() {
    if (!this.countEl) return;

    const text = this._state.markdown;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    this.countEl.textContent = `${words} words | ${chars} chars`;
  }

  // Legacy compatibility no-ops to avoid breaking optional integrations.
  getSearchItems() {
    return [];
  }

  focusNoteById() {}

  showDeleteConfirmationForNoteId() {}

  reloadFromStorage() {}

  selectNote() {}
}

window.NotesManager = NotesManager;

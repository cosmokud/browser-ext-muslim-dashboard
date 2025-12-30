/**
 * Flashcard Manager
 * - Loads default cards from data/flashcard_default.csv on first run
 * - Supports up to 10 flashcard sets (CSV import)
 * - Dashboard viewer + Settings tab editor (20 cards/page)
 */

class FlashcardManager {
  static MAX_SETS = 10;
  static PAGE_SIZE = 20;

  constructor(storage) {
    this.storage = storage;

    // Dashboard elements
    this.cardEl = document.getElementById("flashcardCard");
    this.setNameEl = document.getElementById("flashcardSetName");
    this.questionEl = document.getElementById("flashcardQuestion");
    this.answerEl = document.getElementById("flashcardAnswer");
    this.toggleAnswerBtn = document.getElementById("flashcardToggleAnswerBtn");
    this.nextBtn = document.getElementById("flashcardNextBtn");

    // Settings elements (may not exist until modal opened)
    this.settingsSetSelect = null;
    this.settingsImportBtn = null;
    this.settingsExportBtn = null;
    this.settingsDeleteSetBtn = null;
    this.settingsImportInput = null;
    this.settingsAddCardBtn = null;
    this.settingsList = null;
    this.settingsPagination = null;
    this.settingsMeta = null;

    // State
    this.currentCardIndex = 0;
    this.answerVisible = false;
    this.settingsPage = 1;

    // Debounce timer for editor saves
    this.saveTimer = null;
  }

  async init() {
    await this.ensureDefaultSet();
    this.bindDashboardEvents();
    this.renderDashboard();
  }

  // ---------- Storage ----------

  getSets() {
    return this.storage.get("flashcardSets", []);
  }

  saveSets(sets) {
    return this.storage.set("flashcardSets", sets);
  }

  getFlashcardSettings() {
    const settings = this.storage.getSettings();
    const flashcards = settings.flashcards || {};
    return flashcards;
  }

  setFlashcardSettings(updates) {
    const settings = this.storage.getSettings();
    const current = settings.flashcards || {};
    settings.flashcards = { ...current, ...updates };
    this.storage.saveSettings(settings);
  }

  getActiveSetId() {
    return this.getFlashcardSettings().activeSetId || null;
  }

  setActiveSetId(setId) {
    this.setFlashcardSettings({ activeSetId: setId });
  }

  getActiveSet() {
    const sets = this.getSets();
    const activeId = this.getActiveSetId();
    if (!sets.length) return null;
    return sets.find((s) => s.id === activeId) || sets[0];
  }

  // ---------- Default bootstrap ----------

  async ensureDefaultSet() {
    const sets = this.getSets();
    if (Array.isArray(sets) && sets.length > 0) {
      // Ensure active set is valid
      const activeId = this.getActiveSetId();
      if (!activeId || !sets.some((s) => s.id === activeId)) {
        this.setActiveSetId(sets[0].id);
      }
      return;
    }

    try {
      const res = await fetch("data/flashcard_default.csv", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Failed to load default CSV: ${res.status}`);
      }
      const text = await res.text();
      const cards = this.parseCsvTwoColumns(text);

      const defaultSet = {
        id: "default",
        name: "Default",
        createdAt: new Date().toISOString(),
        cards,
      };

      this.saveSets([defaultSet]);
      this.setActiveSetId(defaultSet.id);
    } catch (e) {
      console.error("Flashcards: failed to initialize default set", e);
      // Ensure we at least have an empty set to avoid crashing UI
      const fallback = {
        id: "default",
        name: "Default",
        createdAt: new Date().toISOString(),
        cards: [],
      };
      this.saveSets([fallback]);
      this.setActiveSetId(fallback.id);
    }
  }

  // ---------- Dashboard ----------

  bindDashboardEvents() {
    if (this.toggleAnswerBtn) {
      this.toggleAnswerBtn.addEventListener("click", () => {
        this.answerVisible = !this.answerVisible;
        this.renderDashboard();
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener("click", () => {
        this.pickNextCard();
        this.answerVisible = false;
        this.renderDashboard();
      });
    }
  }

  pickNextCard() {
    const activeSet = this.getActiveSet();
    const cards = activeSet?.cards || [];
    if (cards.length <= 1) {
      this.currentCardIndex = 0;
      return;
    }

    const prev = this.currentCardIndex;
    let next = prev;
    let guard = 0;
    while (next === prev && guard < 10) {
      next = Math.floor(Math.random() * cards.length);
      guard += 1;
    }
    this.currentCardIndex = next;
  }

  renderDashboard() {
    const activeSet = this.getActiveSet();
    const setName = activeSet?.name || "Flashcards";
    const cards = activeSet?.cards || [];

    if (this.setNameEl) this.setNameEl.textContent = setName;

    if (!this.questionEl || !this.answerEl) return;

    if (!cards.length) {
      this.questionEl.textContent = "No flashcards yet";
      this.answerEl.textContent = "Import a CSV in Settings → Flashcards";
      this.answerEl.classList.add("visible");
      if (this.toggleAnswerBtn) this.toggleAnswerBtn.disabled = true;
      if (this.nextBtn) this.nextBtn.disabled = true;
      return;
    }

    if (this.toggleAnswerBtn) this.toggleAnswerBtn.disabled = false;
    if (this.nextBtn) this.nextBtn.disabled = false;

    const idx = Math.min(this.currentCardIndex, cards.length - 1);
    const card = cards[idx];

    this.questionEl.textContent = card.question || "(empty question)";
    this.answerEl.textContent = card.answer || "(empty answer)";

    this.answerEl.classList.toggle("visible", this.answerVisible);

    if (this.toggleAnswerBtn) {
      this.toggleAnswerBtn.textContent = this.answerVisible
        ? "Hide Answer"
        : "Show Answer";
    }
  }

  // ---------- Settings UI ----------

  bindSettingsElements() {
    this.settingsSetSelect = document.getElementById("flashcardsSetSelect");
    this.settingsImportBtn = document.getElementById("flashcardsImportBtn");
    this.settingsExportBtn = document.getElementById("flashcardsExportBtn");
    this.settingsDeleteSetBtn = document.getElementById(
      "flashcardsDeleteSetBtn"
    );
    this.settingsImportInput = document.getElementById("flashcardsImportInput");
    this.settingsAddCardBtn = document.getElementById("flashcardsAddCardBtn");
    this.settingsList = document.getElementById("flashcardsEditorList");
    this.settingsPagination = document.getElementById("flashcardsPagination");
    this.settingsMeta = document.getElementById("flashcardsMeta");
  }

  ensureSettingsBound() {
    this.bindSettingsElements();

    if (!this.settingsSetSelect || !this.settingsList) return false;

    // Prevent duplicate binding
    if (this.settingsSetSelect.dataset.bound === "true") return true;
    this.settingsSetSelect.dataset.bound = "true";

    this.settingsSetSelect.addEventListener("change", () => {
      const id = this.settingsSetSelect.value;
      this.setActiveSetId(id);
      this.settingsPage = 1;
      this.renderSettings();
      this.renderDashboard();
    });

    if (this.settingsImportBtn && this.settingsImportInput) {
      this.settingsImportBtn.addEventListener("click", () => {
        this.settingsImportInput.value = "";
        this.settingsImportInput.click();
      });

      this.settingsImportInput.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await this.importCsvFile(file);
      });
    }

    if (this.settingsExportBtn) {
      this.settingsExportBtn.addEventListener("click", () => {
        this.exportActiveSetCsv();
      });
    }

    if (this.settingsDeleteSetBtn) {
      this.settingsDeleteSetBtn.addEventListener("click", () => {
        this.deleteActiveSet();
      });
    }

    if (this.settingsAddCardBtn) {
      this.settingsAddCardBtn.addEventListener("click", () => {
        this.addCardToActiveSet();
      });
    }

    // Inline editor events (delegation)
    this.settingsList.addEventListener("input", (e) => {
      const row = e.target.closest(".flashcard-row");
      if (!row) return;

      const cardIndex = Number(row.dataset.index);
      const field = e.target.dataset.field;
      if (!Number.isFinite(cardIndex) || !field) return;

      this.updateCardField(cardIndex, field, e.target.value);
    });

    this.settingsList.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const action = btn.dataset.action;
      if (action !== "delete-card") return;
      const row = btn.closest(".flashcard-row");
      if (!row) return;
      const cardIndex = Number(row.dataset.index);
      if (!Number.isFinite(cardIndex)) return;
      this.deleteCardAtIndex(cardIndex);
    });

    return true;
  }

  renderSettings() {
    if (!this.ensureSettingsBound()) return;

    const sets = this.getSets();
    const active = this.getActiveSet();

    // Populate dropdown
    this.settingsSetSelect.innerHTML = "";
    sets.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.name;
      this.settingsSetSelect.appendChild(opt);
    });

    if (active) {
      this.settingsSetSelect.value = active.id;
    }

    // Meta
    const totalCards = active?.cards?.length || 0;
    const totalSets = sets.length;
    if (this.settingsMeta) {
      this.settingsMeta.textContent = `${totalCards} cards • ${totalSets}/${FlashcardManager.MAX_SETS} sets`;
    }

    this.renderEditorList();
    this.renderPagination();
  }

  renderEditorList() {
    const active = this.getActiveSet();
    const cards = active?.cards || [];

    const total = cards.length;
    const pages = Math.max(1, Math.ceil(total / FlashcardManager.PAGE_SIZE));
    this.settingsPage = Math.min(Math.max(1, this.settingsPage), pages);

    const start = (this.settingsPage - 1) * FlashcardManager.PAGE_SIZE;
    const end = Math.min(total, start + FlashcardManager.PAGE_SIZE);

    if (!this.settingsList) return;

    if (!cards.length) {
      this.settingsList.innerHTML = `
        <div class="quotes-empty">
          <div class="quotes-empty-title">No flashcards in this set</div>
          <div class="quotes-empty-hint">Use “Add Card” or import a CSV.</div>
        </div>
      `;
      return;
    }

    const rows = [];
    for (let i = start; i < end; i += 1) {
      const c = cards[i] || { question: "", answer: "" };
      rows.push(`
        <div class="flashcard-row" data-index="${i}">
          <div class="flashcard-row-index">${i + 1}</div>
          <input
            class="flashcard-cell setting-input"
            data-field="question"
            type="text"
            value="${this.escapeHtmlAttr(c.question || "")}"
            placeholder="Question"
            maxlength="500"
          />
          <input
            class="flashcard-cell setting-input"
            data-field="answer"
            type="text"
            value="${this.escapeHtmlAttr(c.answer || "")}"
            placeholder="Answer"
            maxlength="1000"
          />
          <button
            class="flashcard-row-delete"
            type="button"
            data-action="delete-card"
            title="Delete"
            aria-label="Delete card"
          >
            ×
          </button>
        </div>
      `);
    }

    this.settingsList.innerHTML = `
      <div class="flashcard-editor-header">
        <div>#</div>
        <div>Question</div>
        <div>Answer</div>
        <div></div>
      </div>
      <div class="flashcard-editor-body">
        ${rows.join("")}
      </div>
    `;
  }

  renderPagination() {
    if (!this.settingsPagination) return;

    const active = this.getActiveSet();
    const total = active?.cards?.length || 0;
    const pages = Math.max(1, Math.ceil(total / FlashcardManager.PAGE_SIZE));

    if (pages <= 1) {
      this.settingsPagination.innerHTML = "";
      return;
    }

    const makeBtn = (label, page, disabled, active) => {
      return `
        <button
          class="pagination-btn ${active ? "active" : ""}"
          type="button"
          data-page="${page}"
          ${disabled ? "disabled" : ""}
        >
          ${label}
        </button>
      `;
    };

    // Compact pagination: show first, last, current ±1
    const current = this.settingsPage;
    const wanted = new Set([1, pages, current - 1, current, current + 1]);
    const numbers = [...wanted]
      .filter((n) => n >= 1 && n <= pages)
      .sort((a, b) => a - b);

    let html = makeBtn("Prev", current - 1, current <= 1, false);

    let last = 0;
    for (const n of numbers) {
      if (last && n > last + 1) {
        html += `<span class="pagination-ellipsis">…</span>`;
      }
      html += makeBtn(String(n), n, false, n === current);
      last = n;
    }

    html += makeBtn("Next", current + 1, current >= pages, false);

    this.settingsPagination.innerHTML = html;

    // Bind clicks once
    if (this.settingsPagination.dataset.bound !== "true") {
      this.settingsPagination.dataset.bound = "true";
      this.settingsPagination.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const page = Number(btn.dataset.page);
        if (!Number.isFinite(page)) return;
        this.settingsPage = page;
        this.renderEditorList();
        this.renderPagination();
      });
    }
  }

  // ---------- Settings actions ----------

  async importCsvFile(file) {
    const name = this.inferSetNameFromFile(file.name);

    const sets = this.getSets();
    const existing = sets.find(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    );

    // Enforce set cap
    if (!existing && sets.length >= FlashcardManager.MAX_SETS) {
      this.showToast(
        `You already have ${FlashcardManager.MAX_SETS} sets. Delete one first.`,
        "error"
      );
      return;
    }

    let csvText;
    try {
      csvText = await file.text();
    } catch (e) {
      this.showToast("Could not read the CSV file.", "error");
      return;
    }

    let cards;
    try {
      cards = this.parseCsvTwoColumns(csvText);
    } catch (e) {
      console.error(e);
      this.showToast("Invalid CSV format.", "error");
      return;
    }

    const now = new Date().toISOString();

    if (existing) {
      const ok = confirm(
        `A set named "${existing.name}" already exists. Replace it?`
      );
      if (!ok) return;

      existing.cards = cards;
      existing.updatedAt = now;
      this.saveSets([...sets]);
      this.setActiveSetId(existing.id);
      this.showToast(`Replaced set: ${existing.name}`, "success");
    } else {
      const newSet = {
        id: `set_${Date.now()}`,
        name,
        createdAt: now,
        cards,
      };
      this.saveSets([...sets, newSet]);
      this.setActiveSetId(newSet.id);
      this.showToast(`Imported set: ${name}`, "success");
    }

    this.settingsPage = 1;
    this.renderSettings();
    this.renderDashboard();
  }

  exportActiveSetCsv() {
    const active = this.getActiveSet();
    if (!active) return;

    const csv = this.cardsToCsv(active.cards || []);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${this.slugify(active.name || "flashcards")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  deleteActiveSet() {
    const sets = this.getSets();
    const active = this.getActiveSet();
    if (!active) return;

    if (sets.length <= 1) {
      this.showToast("You must keep at least one set.", "error");
      return;
    }

    const ok = confirm(`Delete the set "${active.name}"?`);
    if (!ok) return;

    const nextSets = sets.filter((s) => s.id !== active.id);
    this.saveSets(nextSets);
    this.setActiveSetId(nextSets[0].id);

    this.settingsPage = 1;
    this.showToast("Set deleted.", "success");
    this.renderSettings();
    this.renderDashboard();
  }

  addCardToActiveSet() {
    const sets = this.getSets();
    const activeId = this.getActiveSetId();
    const active = sets.find((s) => s.id === activeId) || sets[0];
    if (!active) return;

    active.cards = Array.isArray(active.cards) ? active.cards : [];
    active.cards.push({ question: "", answer: "" });
    active.updatedAt = new Date().toISOString();
    this.saveSets(sets);

    const total = active.cards.length;
    const pages = Math.max(1, Math.ceil(total / FlashcardManager.PAGE_SIZE));
    this.settingsPage = pages;

    this.renderSettings();
    this.showToast("Card added.", "success");
  }

  updateCardField(globalIndex, field, value) {
    const sets = this.getSets();
    const activeId = this.getActiveSetId();
    const active = sets.find((s) => s.id === activeId) || sets[0];
    if (!active || !active.cards || !active.cards[globalIndex]) return;

    if (field !== "question" && field !== "answer") return;

    active.cards[globalIndex][field] = value;
    active.updatedAt = new Date().toISOString();

    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveSets(sets);
      this.renderDashboard();
    }, 250);
  }

  deleteCardAtIndex(globalIndex) {
    const sets = this.getSets();
    const activeId = this.getActiveSetId();
    const active = sets.find((s) => s.id === activeId) || sets[0];
    if (!active) return;

    active.cards = Array.isArray(active.cards) ? active.cards : [];
    if (globalIndex < 0 || globalIndex >= active.cards.length) return;

    active.cards.splice(globalIndex, 1);
    active.updatedAt = new Date().toISOString();
    this.saveSets(sets);

    // Keep page in range
    const pages = Math.max(
      1,
      Math.ceil((active.cards.length || 0) / FlashcardManager.PAGE_SIZE)
    );
    this.settingsPage = Math.min(this.settingsPage, pages);

    this.renderSettings();
    this.renderDashboard();
    this.showToast("Card deleted.", "success");
  }

  // ---------- CSV utilities ----------

  parseCsvTwoColumns(text) {
    const rows = this.parseCsv(text);

    const cards = [];
    for (const row of rows) {
      if (!row || row.length === 0) continue;

      const question = (row[0] ?? "").trim();
      const answer = (row[1] ?? "").trim();

      // Skip completely empty lines
      if (!question && !answer) continue;

      cards.push({ question, answer });
    }

    return cards;
  }

  parseCsv(text) {
    // RFC4180-ish parser: handles quotes, commas, CRLF
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    const pushField = () => {
      row.push(field);
      field = "";
    };

    const pushRow = () => {
      // Avoid trailing empty row when file ends with newline
      if (row.length === 1 && row[0] === "" && rows.length === 0) {
        // allow empty file
      }
      rows.push(row);
      row = [];
    };

    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          const next = text[i + 1];
          if (next === '"') {
            field += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
        continue;
      }

      if (ch === ",") {
        pushField();
      } else if (ch === "\n") {
        pushField();
        pushRow();
      } else if (ch === "\r") {
        // ignore CR; handle CRLF by skipping
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        field += ch;
      }
    }

    // last field
    pushField();
    // only push if not a trailing empty row
    if (!(row.length === 1 && row[0] === "" && rows.length > 0)) {
      pushRow();
    }

    // Filter out fully empty rows
    return rows.filter((r) => r.some((v) => String(v).trim() !== ""));
  }

  cardsToCsv(cards) {
    const escape = (value) => {
      const s = String(value ?? "");
      if (/[\n\r,"]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    return (cards || [])
      .map((c) => `${escape(c.question)},${escape(c.answer)}`)
      .join("\r\n");
  }

  // ---------- misc ----------

  inferSetNameFromFile(filename) {
    const base = String(filename || "")
      .replace(/\.[^.]+$/, "")
      .trim();
    const safe = base || "Imported";
    return safe.slice(0, 40);
  }

  slugify(name) {
    return String(name || "flashcards")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  }

  escapeHtmlAttr(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  showToast(message, type = "info") {
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${type === "success" ? "✓" : type === "error" ? "✗" : "ℹ"}</span>
      <span>${this.escapeHtmlAttr(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

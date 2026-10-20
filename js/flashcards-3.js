/**
 * FlashcardManager, part 3 of 3.
 * Moved out of js/flashcards.js at method boundaries, so no single file carries the
 * whole class. The class itself is declared in js/flashcards.js; load this after it.
 */
(function (prototype, members) {
  for (const name of Object.getOwnPropertyNames(members.prototype)) {
    if (name === "constructor") continue;
    Object.defineProperty(
      prototype,
      name,
      Object.getOwnPropertyDescriptor(members.prototype, name),
    );
  }
})(FlashcardManager.prototype, class {

  async importCardsFile(file) {
    const name = this.inferSetNameFromFile(file.name);

    const sets = this.getSets();
    let effectiveName = name;
    let existing = sets.find(
      (s) => s.name.toLowerCase() === name.toLowerCase(),
    );

    // Never allow replacing a protected default set; instead create a new set with a unique name.
    if (existing && this.isProtectedSetId(existing.id)) {
      existing = null;
      effectiveName = this.makeUniqueSetName(effectiveName, sets);
    }

    // Enforce set cap
    if (!existing && sets.length >= FlashcardManager.MAX_SETS) {
      this.showToast(
        `You already have ${FlashcardManager.MAX_SETS} sets. Delete one first.`,
        "error",
      );
      return;
    }

    let fileText;
    try {
      fileText = await file.text();
    } catch (e) {
      this.showToast("Could not read the selected file.", "error");
      return;
    }

    let cards;
    try {
      cards = this.parseImportedCardsFile(file, fileText);
    } catch (e) {
      console.error(e);
      this.showToast("Invalid flashcards file format.", "error");
      return;
    }

    if (!cards.length) {
      this.showToast("No valid flashcards found in the file.", "error");
      return;
    }

    const now = new Date().toISOString();

    if (existing) {
      const ok = confirm(
        `A set named "${existing.name}" already exists. Replace it?`,
      );
      if (!ok) return;

      if (this.isProtectedSetId(existing.id)) {
        this.showToast("This default set cannot be replaced.", "error");
        return;
      }

      existing.cards = cards;
      existing.updatedAt = now;
      this.saveSets([...sets]);
      this.setActiveSetId(existing.id);
      this.showToast(`Replaced set: ${existing.name}`, "success");
    } else {
      const newSet = {
        id: `set_${Date.now()}`,
        name: effectiveName,
        createdAt: now,
        cards,
      };
      this.saveSets([...sets, newSet]);
      this.setActiveSetId(newSet.id);
      this.currentCardIndex = 0;
      this.persistCurrentCardIndex();
      this.showToast(`Imported set: ${effectiveName}`, "success");
    }

    this.settingsPage = 1;
    this.renderSettings();
    this.renderDashboard();
  }

  async importCsvFile(file) {
    return this.importCardsFile(file);
  }

  parseImportedCardsFile(file, text) {
    const filename = String(file?.name || "").toLowerCase();
    const content = String(text || "");
    const looksLikeJson =
      filename.endsWith(".json") || /^\s*[\[{]/.test(content);

    if (looksLikeJson) {
      throw new Error("Flashcards import supports CSV files only.");
    }

    return this.parseCsvTwoColumns(content);
  }

  normalizeImportedCards(payload) {
    const items = Array.isArray(payload)
      ? payload
      : payload && typeof payload === "object"
        ? Array.isArray(payload.cards)
          ? payload.cards
          : Array.isArray(payload.items)
            ? payload.items
            : Array.isArray(payload.flashcards)
              ? payload.flashcards
              : Array.isArray(payload.data)
                ? payload.data
                : []
        : [];

    const cards = [];
    const seen = new Set();

    for (const raw of items) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const card = this.normalizeImportedCard(raw);
      if (!card) continue;

      const dedupeKey = `${card.question}\n${card.answer}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      cards.push(card);
    }

    return cards;
  }

  normalizeImportedCard(raw) {
    const toText = (value) => String(value ?? "").trim();

    let question = toText(
      raw.question ?? raw.q ?? raw.front ?? raw.term ?? raw.prompt ?? raw.text,
    );
    let answer = toText(
      raw.answer ??
        raw.a ??
        raw.back ??
        raw.definition ??
        raw.response ??
        raw.translation,
    );

    if (!question) question = this.pickLocalizedField(raw, "question");
    if (!answer) answer = this.pickLocalizedField(raw, "answer");

    // Legacy aliases for localized schemas.
    if (!question) question = this.pickLocalizedField(raw, "text");
    if (!answer) answer = this.pickLocalizedField(raw, "translation");

    if (!question && !answer) return null;
    return { question, answer };
  }

  pickLocalizedField(raw, prefix) {
    const valuesByCode = new Map();
    const preferredOrder = ["en", "id", "ar"];

    Object.entries(raw || {}).forEach(([rawKey, rawValue]) => {
      if (rawValue == null) return;
      const key = String(rawKey || "");
      const match = key.match(new RegExp(`^${prefix}_(.+)$`, "i"));
      if (!match) return;

      const code = String(match[1] || "")
        .trim()
        .toLowerCase();
      const value = String(rawValue).trim();
      if (!code || !value || valuesByCode.has(code)) return;

      valuesByCode.set(code, value);
    });

    for (const code of preferredOrder) {
      if (valuesByCode.has(code)) return valuesByCode.get(code);
    }

    const first = [...valuesByCode.keys()].sort()[0];
    return first ? valuesByCode.get(first) : "";
  }

  exportActiveSetJson() {
    // Backward-compat alias: flashcards export is CSV-only.
    this.exportActiveSetCsv();
  }

  exportActiveSetCsv() {
    const active = this.getActiveSet();
    if (!active) return;

    const cards = (active.cards || []).map((raw) => ({
      question: String(raw?.question ?? ""),
      answer: String(raw?.answer ?? ""),
    }));
    const csv = this.cardsToCsv(cards);
    const csvWithBom = `\uFEFF${csv}`;
    const blob = new Blob([csvWithBom], { type: "text/csv;charset=utf-8" });
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

    if (this.isProtectedSetId(active.id)) {
      this.showToast("This default set cannot be deleted.", "error");
      return;
    }

    if (sets.length <= 1) {
      this.showToast("You must keep at least one set.", "error");
      return;
    }

    const ok = confirm(`Delete the set "${active.name}"?`);
    if (!ok) return;

    const nextSets = sets.filter((s) => s.id !== active.id);
    this.saveSets(nextSets);
    this.setActiveSetId(nextSets[0].id);

    this.clearSavedCardIndexForSet(active.id);
    this.restoreCurrentCardIndexForActiveSet();

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

    if (this.isProtectedSetId(active.id)) {
      this.showToast("This default set cannot be edited.", "error");
      return;
    }

    active.cards = Array.isArray(active.cards) ? active.cards : [];
    active.cards.push({ question: "", answer: "" });
    active.updatedAt = new Date().toISOString();
    this.saveSets(sets);

    const total = active.cards.length;
    const pageSize = this.getSettingsPageSize();
    const pages = Math.max(1, Math.ceil(total / pageSize));
    this.settingsPage = pages;

    this.renderSettings();
    this.showToast("Card added.", "success");
  }

  updateCardField(globalIndex, field, value) {
    const sets = this.getSets();
    const activeId = this.getActiveSetId();
    const active = sets.find((s) => s.id === activeId) || sets[0];
    if (!active || !active.cards || !active.cards[globalIndex]) return;

    if (this.isProtectedSetId(active.id)) return;

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

    if (this.isProtectedSetId(active.id)) {
      this.showToast("This default set cannot be edited.", "error");
      return;
    }

    active.cards = Array.isArray(active.cards) ? active.cards : [];
    if (globalIndex < 0 || globalIndex >= active.cards.length) return;

    active.cards.splice(globalIndex, 1);
    active.updatedAt = new Date().toISOString();
    this.saveSets(sets);

    // Keep page in range
    const pages = Math.max(
      1,
      Math.ceil((active.cards.length || 0) / this.getSettingsPageSize()),
    );
    this.settingsPage = Math.min(this.settingsPage, pages);

    this.renderSettings();
    this.renderDashboard();
    this.showToast("Card deleted.", "success");
  }

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

  parsePipeTwoColumns(text) {
    if (!text) return [];
    const lines = String(text).split(/\r?\n/);
    const cards = [];
    for (const raw of lines) {
      const line = (raw || "").trim();
      if (!line) continue;
      const idx = line.indexOf("|");
      if (idx === -1) {
        // Fallback to CSV parsing for this line if no pipe found
        const rows = this.parseCsv(line);
        for (const row of rows) {
          const question = (row[0] ?? "").trim();
          const answer = (row[1] ?? "").trim();
          if (!question && !answer) continue;
          cards.push({ question, answer });
        }
        continue;
      }
      const question = line.slice(0, idx).trim();
      const answer = line.slice(idx + 1).trim();
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

  inferSetNameFromFile(filename) {
    const base = String(filename || "")
      .replace(/\.[^.]+$/, "")
      .trim();
    const safe = base || "Imported";
    return safe.slice(0, 40);
  }

  isProtectedSetId(id) {
    return (
      Array.isArray(FlashcardManager.PROTECTED_SET_IDS) &&
      FlashcardManager.PROTECTED_SET_IDS.includes(String(id))
    );
  }

  isDefaultActiveSet() {
    return this.isProtectedSetId(this.getActiveSet()?.id);
  }

  makeUniqueSetName(baseName, sets) {
    const normalized =
      String(baseName || "New Set")
        .trim()
        .slice(0, 40) || "New Set";
    const lower = normalized.toLowerCase();

    const isTaken = (candidate) =>
      sets.some(
        (s) => String(s.name || "").toLowerCase() === candidate.toLowerCase(),
      );

    const protectedNames = Array.isArray(FlashcardManager.DEFAULT_SETS)
      ? FlashcardManager.DEFAULT_SETS.map((d) =>
          String(d.name || "").toLowerCase(),
        )
      : ["default"];

    if (!isTaken(normalized) && !protectedNames.includes(lower))
      return normalized;

    for (let i = 2; i <= 99; i += 1) {
      const candidate = `${normalized} (${i})`;
      if (
        !isTaken(candidate) &&
        !protectedNames.includes(candidate.toLowerCase())
      ) {
        return candidate.slice(0, 40);
      }
    }

    return `Set ${Date.now()}`;
  }

  createNewSet() {
    const sets = this.getSets();
    if (sets.length >= FlashcardManager.MAX_SETS) {
      this.showToast(
        `You already have ${FlashcardManager.MAX_SETS} sets. Delete one first.`,
        "error",
      );
      return;
    }

    const rawName = prompt("New set name:", "New Set");
    if (rawName === null) return;
    const trimmed = String(rawName).trim();
    if (!trimmed) {
      this.showToast("Set name cannot be empty.", "error");
      return;
    }

    const protectedNames = Array.isArray(FlashcardManager.DEFAULT_SETS)
      ? FlashcardManager.DEFAULT_SETS.map((d) =>
          String(d.name || "").toLowerCase(),
        )
      : ["default"];

    if (protectedNames.includes(trimmed.toLowerCase())) {
      this.showToast(`The name '${trimmed}' is reserved.`, "error");
      return;
    }

    const name = this.makeUniqueSetName(trimmed, sets);
    const now = new Date().toISOString();
    const newSet = {
      id: `set_${Date.now()}`,
      name,
      createdAt: now,
      cards: [],
    };

    this.saveSets([...sets, newSet]);
    this.setActiveSetId(newSet.id);
    this.settingsPage = 1;
    this.currentCardIndex = 0;
    this.persistCurrentCardIndex();
    this.renderSettings();
    this.renderDashboard();
    this.showToast(`Created set: ${name}`, "success");
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

    const iconEmoji = type === "success" ? "✓" : type === "error" ? "✗" : "ℹ";
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${this._getIcon(iconEmoji, { size: 16 })}</span>
      <span>${this.escapeHtmlAttr(message)}</span>
    `;

    container.appendChild(toast);

    const removeToast = () => {
      try {
        toast.remove();
      } catch (e) {
        // ignore
      }
    };

    const hideToast = () => {
      toast.classList.add("toast-hiding");

      const fallbackMs = 350;
      const t = setTimeout(removeToast, fallbackMs);

      toast.addEventListener(
        "transitionend",
        (e) => {
          if (e && e.propertyName && e.propertyName !== "opacity") return;
          clearTimeout(t);
          removeToast();
        },
        { once: true },
      );
    };

    setTimeout(hideToast, 3000);
  }

  _updateSetSelectorButton() {
    const btn = this.cardEl?.querySelector(".flashcard-set-selector-btn");
    if (btn) {
      btn.innerHTML = this._getIcon("📚", { size: 18 });
    }
  }

  _updateSetModalIcons() {
    if (!this._setModal) return;

    const titleEl = this._setModal.querySelector(".flashcard-set-modal-title");
    if (titleEl) {
      titleEl.innerHTML = `${this._getIcon("📚", {
        size: 20,
      })} Select Flashcard Set`;
    }

    if (this._setModal.classList.contains("active")) {
      this.renderSetSelectorModal();
    }
  }

  createSetSelectorButton() {
    const headerActions = this.cardEl?.querySelector(".card-header-actions");
    if (!headerActions) return;

    // Check if button already exists
    if (headerActions.querySelector(".flashcard-set-selector-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "flashcard-set-selector-btn";
    btn.innerHTML = this._getIcon("📚", { size: 18 });
    btn.title = "Select flashcard set";
    btn.setAttribute("aria-label", "Select flashcard set");

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      this.openSetSelectorModal();
    });

    // Insert after mode toggle button
    const modeBtn = headerActions.querySelector(".flashcard-mode-toggle-btn");
    if (modeBtn && modeBtn.nextSibling) {
      headerActions.insertBefore(btn, modeBtn.nextSibling);
    } else if (modeBtn) {
      headerActions.appendChild(btn);
    } else {
      headerActions.insertBefore(btn, headerActions.firstChild);
    }
  }

  createSetSelectorModal() {
    if (document.getElementById("flashcardSetModal")) return;

    const libraryIcon = this._getIcon("📚", { size: 20 });
    const modal = document.createElement("div");
    modal.id = "flashcardSetModal";
    modal.className = "flashcard-set-modal";
    modal.innerHTML = `
      <div class="flashcard-set-modal-content">
        <div class="flashcard-set-modal-header">
          <h3 class="flashcard-set-modal-title">${libraryIcon} Select Flashcard Set</h3>
          <button type="button" class="flashcard-set-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="flashcard-set-modal-body">
          <div class="flashcard-set-search">
            <input type="text" class="flashcard-set-search-input" placeholder="Search sets..." />
          </div>
          <div class="flashcard-set-list"></div>
          <div class="flashcard-set-pagination"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this._setModal = modal;

    // Event listeners
    modal
      .querySelector(".flashcard-set-modal-close")
      .addEventListener("click", () => {
        this.closeSetSelectorModal();
      });

    this._bindOverlayCloseBehavior(modal, () => this.closeSetSelectorModal());

    modal
      .querySelector(".flashcard-set-search-input")
      .addEventListener("input", (e) => {
        this._setModalSearchQuery = e.target.value;
        this._setModalPage = 1;
        this.renderSetSelectorModal();
      });
  }

  openSetSelectorModal() {
    this._setModalSearchQuery = "";
    this._setModalPage = 1;

    const modal = document.getElementById("flashcardSetModal");
    if (modal) {
      modal.classList.add("active");
      modal.querySelector(".flashcard-set-search-input").value = "";
      this.renderSetSelectorModal();
    }
  }

  closeSetSelectorModal() {
    const modal = document.getElementById("flashcardSetModal");
    if (modal) {
      modal.classList.remove("active");
    }
  }

  renderSetSelectorModal() {
    const modal = document.getElementById("flashcardSetModal");
    if (!modal) return;

    const listContainer = modal.querySelector(".flashcard-set-list");
    const paginationContainer = modal.querySelector(
      ".flashcard-set-pagination",
    );

    let sets = this.getSets();
    const searchQuery = this._setModalSearchQuery.toLowerCase();
    const activeSetId = this.getActiveSetId();

    if (searchQuery) {
      sets = sets.filter((s) => s.name.toLowerCase().includes(searchQuery));
    }

    const SETS_PER_PAGE = 10;
    const totalPages = Math.ceil(sets.length / SETS_PER_PAGE);
    const start = (this._setModalPage - 1) * SETS_PER_PAGE;
    const pageSets = sets.slice(start, start + SETS_PER_PAGE);

    if (pageSets.length === 0) {
      listContainer.innerHTML = `
        <div class="flashcard-set-empty">
          No flashcard sets found.
        </div>
      `;
    } else {
      listContainer.innerHTML = pageSets
        .map((s) => {
          const cardCount = Array.isArray(s.cards) ? s.cards.length : 0;
          const isActive = s.id === activeSetId;
          return `
            <div class="flashcard-set-item ${
              isActive ? "active" : ""
            }" data-set-id="${s.id}">
              <div class="flashcard-set-item-info">
                <span class="flashcard-set-item-name">${this.escapeHtmlAttr(
                  s.name,
                )}</span>
                <span class="flashcard-set-item-meta">${cardCount} card${
                  cardCount === 1 ? "" : "s"
                }</span>
              </div>
              ${
                Array.isArray(FlashcardManager.PROTECTED_SET_IDS) &&
                FlashcardManager.PROTECTED_SET_IDS.includes(s.id)
                  ? `<span class="flashcard-set-item-lock" title="Default set — read only">${this._getIcon(
                      "🔒",
                      { size: 14 },
                    )}</span>`
                  : ""
              }
              ${
                isActive
                  ? `<span style="color: var(--accent-gold);">${this._getIcon(
                      "✓",
                      { size: 16 },
                    )}</span>`
                  : ""
              }
            </div>
          `;
        })
        .join("");

      // Click handlers
      listContainer.querySelectorAll(".flashcard-set-item").forEach((el) => {
        el.addEventListener("click", () => {
          const setId = el.dataset.setId;
          this.setActiveSetId(setId);
          this.isFlipped = false;
          this.restoreCurrentCardIndexForActiveSet();
          this.renderDashboard();
          this.ensureAutoAdvanceState({ reset: true });
          this.closeSetSelectorModal();

          const set = this.getSets().find((s) => s.id === setId);
          if (set) {
            this.showToast(`Switched to: ${set.name}`, "success");
          }
        });
      });
    }

    // Render pagination
    this.renderSetSelectorPagination(paginationContainer, totalPages);
  }

  renderSetSelectorPagination(container, totalPages) {
    if (!container) return;

    if (totalPages <= 1) {
      container.innerHTML = "";
      return;
    }

    const currentPage = this._setModalPage;
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 2) {
        end = Math.min(totalPages - 1, 4);
      } else if (currentPage >= totalPages - 1) {
        start = Math.max(2, totalPages - 3);
      }

      if (start > 2) pages.push("...");

      for (let i = start; i <= end; i++) pages.push(i);

      if (end < totalPages - 1) pages.push("...");

      pages.push(totalPages);
    }

    container.innerHTML = `
      <button type="button" class="flashcard-set-page-btn" data-page="${
        currentPage - 1
      }" ${currentPage === 1 ? "disabled" : ""}>${this._getIcon("←", {
        size: 14,
      })}</button>
      ${pages
        .map((p) =>
          p === "..."
            ? `<span class="flashcard-set-page-btn" style="cursor: default; border: none;">...</span>`
            : `<button type="button" class="flashcard-set-page-btn ${
                p === currentPage ? "active" : ""
              }" data-page="${p}">${p}</button>`,
        )
        .join("")}
      <button type="button" class="flashcard-set-page-btn" data-page="${
        currentPage + 1
      }" ${currentPage === totalPages ? "disabled" : ""}>${this._getIcon("→", {
        size: 14,
      })}</button>
    `;

    container.querySelectorAll("button[data-page]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const page = parseInt(btn.dataset.page, 10);
        if (Number.isFinite(page) && page >= 1 && page <= totalPages) {
          this._setModalPage = page;
          this.renderSetSelectorModal();
        }
      });
    });
  }
});

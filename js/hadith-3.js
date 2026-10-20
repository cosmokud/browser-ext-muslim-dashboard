/**
 * HadithManager, part 3 of 3.
 * Moved out of js/hadith.js at method boundaries, so no single file carries the
 * whole class. The class itself is declared in js/hadith.js; load this after it.
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
})(HadithManager.prototype, class {

  makeUniqueSetName(baseName, sets) {
    const normalized =
      String(baseName || "New Set")
        .trim()
        .slice(0, 40) || "New Set";

    const isTaken = (candidate) =>
      sets.some(
        (s) => String(s.name || "").toLowerCase() === candidate.toLowerCase(),
      );

    const protectedNames = Array.isArray(HadithManager.DEFAULT_SETS)
      ? HadithManager.DEFAULT_SETS.map((d) =>
          String(d.name || "").toLowerCase(),
        )
      : [];

    if (
      !isTaken(normalized) &&
      !protectedNames.includes(normalized.toLowerCase())
    )
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
    if (sets.length >= HadithManager.MAX_SETS) {
      this.showToast(
        `You already have ${HadithManager.MAX_SETS} sets. Delete one first.`,
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

    const protectedNames = Array.isArray(HadithManager.DEFAULT_SETS)
      ? HadithManager.DEFAULT_SETS.map((d) =>
          String(d.name || "").toLowerCase(),
        )
      : [];

    if (protectedNames.includes(trimmed.toLowerCase())) {
      this.showToast(`The name '${trimmed}' is reserved.`, "error");
      return;
    }

    const name = this.makeUniqueSetName(trimmed, sets);
    const now = new Date().toISOString();

    const newSet = {
      id: `hadith_${Date.now()}`,
      name,
      createdAt: now,
      cards: [],
    };

    sets.push(newSet);
    this.saveSets(sets);
    this.setActiveSetId(newSet.id);
    this.currentCardIndex = 0;
    this.persistCurrentCardIndex();

    this.renderDashboard();
    this.renderSettings();

    this.showToast(`Created set: ${name}`, "success");
  }

  renameActiveSet() {
    const active = this.getActiveSet();
    if (!active) return;
    if (this.isProtectedSetId(active.id)) {
      this.showToast("This default set cannot be renamed.", "error");
      return;
    }

    const rawName = prompt("Rename set:", active.name || "New Set");
    if (rawName === null) return;
    const trimmed = String(rawName).trim();
    if (!trimmed) {
      this.showToast("Set name cannot be empty.", "error");
      return;
    }

    const sets = this.getSets();
    const idx = sets.findIndex((s) => s.id === active.id);
    if (idx === -1) return;

    const name = this.makeUniqueSetName(
      trimmed,
      sets.filter((s) => s.id !== active.id),
    );
    sets[idx].name = name;
    this.saveSets(sets);

    this.renderDashboard();
    this.renderSettings();

    this.showToast(`Renamed set: ${name}`, "success");
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

    const ok = confirm(`Delete set "${active.name}"? This cannot be undone.`);
    if (!ok) return;

    const nextSets = sets.filter((s) => s.id !== active.id);
    this.saveSets(nextSets);
    this.clearSavedCardIndexForSet(active.id);

    const nextActive = nextSets[0];
    this.setActiveSetId(nextActive?.id || null);
    this.restoreCurrentCardIndexForActiveSet();

    this.renderDashboard();
    this.renderSettings();

    this.showToast("Set deleted.", "success");
  }

  addNewItem() {
    const active = this.getActiveSet();
    if (!active) return;
    if (this.isProtectedSetId(active.id)) {
      this.showToast("This default set cannot be edited.", "error");
      return;
    }

    const sets = this.getSets();
    const set = sets.find((s) => s.id === active.id);
    if (!set) return;

    const items = Array.isArray(set.cards) ? set.cards : [];

    const currentLang =
      this.normalizeLanguageCode(this.getSelectedLanguageCode()) || "en";
    const titleField = `title_${currentLang}`;
    const textField = `text_${currentLang}`;
    const newItem = {
      id: items.length + 1,
      title_en: "",
      text_en: "",
      narrator: "",
      reference: "",
    };
    if (currentLang !== "en") {
      newItem[titleField] = "";
      newItem[textField] = "";
    }

    items.push(newItem);

    set.cards = items;
    this.saveSets(sets);

    const total = items.length;
    const pageSize = this.getSettingsPageSize();
    const pages = Math.max(1, Math.ceil(total / pageSize));
    this.settingsPage = pages;

    this.renderSettings();
    this.renderDashboard();

    this.showToast("Item added.", "success");
  }

  deleteItemAtIndex(index) {
    const active = this.getActiveSet();
    if (!active) return;
    if (this.isProtectedSetId(active.id)) {
      this.showToast("This default set cannot be edited.", "error");
      return;
    }

    const sets = this.getSets();
    const set = sets.find((s) => s.id === active.id);
    if (!set) return;

    const items = Array.isArray(set.cards) ? set.cards : [];
    if (index < 0 || index >= items.length) return;

    items.splice(index, 1);
    set.cards = items;
    this.saveSets(sets);

    const pages = Math.max(
      1,
      Math.ceil(items.length / this.getSettingsPageSize()),
    );
    this.settingsPage = Math.min(this.settingsPage, pages);

    this.normalizeCurrentIndex();
    this.persistCurrentCardIndex();

    this.renderSettings();
    this.renderDashboard();

    this.showToast("Item deleted.", "success");
  }

  inferSetNameFromFile(filename) {
    const base = String(filename || "")
      .replace(/\.[^.]+$/, "")
      .trim();
    const safe = base || "Imported";
    return safe.slice(0, 40);
  }

  async importSetFromFile(file) {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const cards = this.normalizeImportedCards(json);

      if (!cards.length) {
        this.showToast("JSON contains no valid hadith items.", "error");
        return;
      }

      const sets = this.getSets();

      const inferredName = this.inferSetNameFromFile(file.name);
      const effectiveName = this.makeUniqueSetName(inferredName, sets);

      const now = new Date().toISOString();
      const newSet = {
        id: `hadith_${Date.now()}`,
        name: effectiveName,
        createdAt: now,
        cards,
      };

      sets.push(newSet);
      this.saveSets(sets);
      this.setActiveSetId(newSet.id);
      this.currentCardIndex = 0;
      this.persistCurrentCardIndex();

      this.renderDashboard();
      this.renderSettings();

      this.showToast(`Imported set: ${effectiveName}`, "success");
    } catch (e) {
      console.error("Hadith import failed:", e);
      this.showToast("Could not read the JSON file.", "error");
    }
  }

  exportActiveSet() {
    const active = this.getActiveSet();
    if (!active) return;

    const data = JSON.stringify(
      this.normalizeImportedCards(active.cards || []),
      null,
      2,
    );
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${(active.name || "hadith").replace(
      /[^a-z0-9_-]+/gi,
      "_",
    )}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 2000);

    this.showToast("Exported JSON.", "success");
  }

  createSetSelectorButton() {
    const headerActions = this.cardEl?.querySelector(".card-header-actions");
    if (!headerActions) return;

    if (headerActions.querySelector(".adhkar-set-selector-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "adhkar-set-selector-btn";
    btn.innerHTML = this._getIcon("📚", { size: 18 });
    btn.title = "Select hadith set";
    btn.setAttribute("aria-label", "Select hadith set");
    this._setModalBtn = btn;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      this.openSetSelectorModal();
    });

    // Insert after language selector if present, else at start
    const langBtn = headerActions.querySelector(".adhkar-lang-selector-btn");
    if (langBtn) {
      headerActions.insertBefore(btn, langBtn.nextSibling);
    } else {
      headerActions.insertBefore(btn, headerActions.firstChild);
    }
  }

  createSetSelectorModal() {
    if (document.getElementById("hadithSetModal")) return;

    const modal = document.createElement("div");
    modal.id = "hadithSetModal";
    modal.className = "pq-bookmark-modal adhkar-set-modal";
    modal.innerHTML = `
      <div class="adhkar-set-modal-content">
        <div class="adhkar-set-modal-header">
          <div class="adhkar-set-modal-title">
            <span aria-hidden="true">${this._getIcon("📚", { size: 20 })}</span>
            Select Hadith Set
          </div>
          <button class="adhkar-set-modal-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="adhkar-set-modal-body">
          <div class="adhkar-set-search">
            <input type="text" class="adhkar-set-search-input" placeholder="Search sets..." />
          </div>
          <div class="adhkar-set-list"></div>
          <div class="adhkar-set-pagination" hidden></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this._setModal = modal;

    const closeBtn = modal.querySelector(".adhkar-set-modal-close");
    closeBtn?.addEventListener("click", () => this.closeSetSelectorModal());

    this._bindOverlayCloseBehavior(modal, () => this.closeSetSelectorModal());

    const searchInput = modal.querySelector(".adhkar-set-search-input");
    searchInput?.addEventListener("input", (e) => {
      this._setModalSearchQuery = String(e.target.value || "");
      this._setModalPage = 1;
      this.renderSetSelectorModal();
    });

    this.renderSetSelectorModal();
  }

  openSetSelectorModal() {
    if (!this._setModal) this.createSetSelectorModal();
    if (!this._setModal) return;

    this._setModal.classList.add("active");
    this._setModalPage = 1;
    this._setModalSearchQuery = "";

    const searchInput = this._setModal.querySelector(
      ".adhkar-set-search-input",
    );
    if (searchInput) searchInput.value = "";

    this.renderSetSelectorModal();

    setTimeout(() => {
      try {
        searchInput?.focus();
      } catch (e) {}
    }, 50);
  }

  closeSetSelectorModal() {
    if (!this._setModal) return;
    this._setModal.classList.remove("active");
  }

  renderSetSelectorModal() {
    if (!this._setModal) return;

    const sets = this.getSets();
    const activeId = this.getActiveSetId();

    const q = String(this._setModalSearchQuery || "")
      .trim()
      .toLowerCase();
    const filtered = q
      ? sets.filter((s) =>
          String(s.name || "")
            .toLowerCase()
            .includes(q),
        )
      : sets;

    const listEl = this._setModal.querySelector(".adhkar-set-list");
    const paginationEl = this._setModal.querySelector(".adhkar-set-pagination");

    if (!listEl || !paginationEl) return;

    if (!filtered.length) {
      listEl.innerHTML = `
        <div class="adhkar-set-empty">No sets found.</div>
      `;
      paginationEl.hidden = true;
      return;
    }

    const pageSize = 8;
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    this._setModalPage = this.clampNumber(this._setModalPage, 1, pages, 1);

    const start = (this._setModalPage - 1) * pageSize;
    const end = Math.min(filtered.length, start + pageSize);

    const items = [];
    for (let i = start; i < end; i += 1) {
      const set = filtered[i];
      const isActive = set.id === activeId;
      const locked = this.isProtectedSetId(set.id);
      const count = Array.isArray(set.cards) ? set.cards.length : 0;

      items.push(`
        <div class="adhkar-set-item ${
          isActive ? "active" : ""
        }" data-set-id="${this.escapeHtmlAttr(set.id)}">
          <div class="adhkar-set-item-info">
            <div class="adhkar-set-item-name">
              ${this.escapeHtmlAttr(set.name || "Unnamed")}
              ${
                locked
                  ? `<span class="adhkar-set-item-lock" title="Default set — read only">${this._getIcon(
                      "🔒",
                      { size: 14 },
                    )}</span>`
                  : ""
              }
            </div>
            <div class="adhkar-set-item-meta">${count} items</div>
          </div>
        </div>
      `);
    }

    listEl.innerHTML = items.join("");

    if (listEl.dataset.bound !== "true") {
      listEl.dataset.bound = "true";
      listEl.addEventListener("click", (e) => {
        const item = e.target.closest(".adhkar-set-item");
        if (!item) return;
        const setId = item.dataset.setId;
        if (!setId) return;
        this.setActiveSetId(setId);
        this.restoreCurrentCardIndexForActiveSet();
        this.renderDashboard();
        this.renderSettings();
        this.ensureAutoAdvanceState({ reset: true });
        this.closeSetSelectorModal();
        const set = this.getSets().find((s) => s.id === setId);
        if (set) this.showToast(`Switched to: ${set.name}`, "success");
      });
    }

    // Pagination
    if (pages <= 1) {
      paginationEl.hidden = true;
      paginationEl.innerHTML = "";
      return;
    }

    paginationEl.hidden = false;

    const btns = [];
    const makeBtn = (label, page, disabled, active) => {
      return `
        <button
          class="adhkar-set-page-btn ${active ? "active" : ""}"
          type="button"
          data-page="${page}"
          ${disabled ? "disabled" : ""}
        >
          ${label}
        </button>
      `;
    };

    btns.push(
      makeBtn("Prev", this._setModalPage - 1, this._setModalPage <= 1, false),
    );

    for (let p = 1; p <= pages; p += 1) {
      if (p === 1 || p === pages || Math.abs(p - this._setModalPage) <= 1) {
        btns.push(makeBtn(String(p), p, false, p === this._setModalPage));
      }
    }

    btns.push(
      makeBtn(
        "Next",
        this._setModalPage + 1,
        this._setModalPage >= pages,
        false,
      ),
    );

    paginationEl.innerHTML = btns.join("");

    if (paginationEl.dataset.bound !== "true") {
      paginationEl.dataset.bound = "true";
      paginationEl.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const p = parseInt(btn.dataset.page, 10);
        if (!Number.isFinite(p)) return;
        this._setModalPage = p;
        this.renderSetSelectorModal();
      });
    }
  }

  createLanguageSelectorButton() {
    const headerActions = this.cardEl?.querySelector(".card-header-actions");
    if (!headerActions) return;

    if (headerActions.querySelector(".adhkar-lang-selector-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "adhkar-lang-selector-btn";
    const langIcon = this._getIcon("🌐", { size: 16 });
    btn.innerHTML = `<span class="lang-icon" aria-hidden="true">${langIcon}</span><span class="lang-label">Lang</span>`;
    btn.title = "Select language";
    btn.setAttribute("aria-label", "Select language");
    btn.style.display = "none";

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      this.openLanguageSelectorModal();
    });

    headerActions.insertBefore(btn, headerActions.firstChild);
  }

  createLanguageSelectorModal() {
    if (document.getElementById("hadithLangModal")) return;

    const modal = document.createElement("div");
    modal.id = "hadithLangModal";
    modal.className = "pq-bookmark-modal adhkar-lang-modal";
    modal.innerHTML = `
      <div class="adhkar-lang-modal-content">
        <div class="adhkar-lang-modal-header">
          <div class="adhkar-lang-modal-title">
            <span aria-hidden="true">🌐</span>
            Select Language
          </div>
          <button class="adhkar-lang-modal-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="adhkar-lang-modal-body">
          <div class="adhkar-lang-search">
            <input type="text" class="adhkar-lang-search-input" placeholder="Search languages..." />
          </div>
          <div class="adhkar-lang-list"></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this._langModal = modal;

    const closeBtn = modal.querySelector(".adhkar-lang-modal-close");
    closeBtn?.addEventListener("click", () =>
      this.closeLanguageSelectorModal(),
    );

    this._bindOverlayCloseBehavior(modal, () =>
      this.closeLanguageSelectorModal(),
    );

    const searchInput = modal.querySelector(".adhkar-lang-search-input");
    searchInput?.addEventListener("input", (e) => {
      this.renderLanguageSelectorModal(String(e.target.value || ""));
    });

    this.renderLanguageSelectorModal("");
  }

  openLanguageSelectorModal(context = "dashboard") {
    if (!this._langModal) this.createLanguageSelectorModal();
    if (!this._langModal) return;

    this._langModalContext =
      context === "settingsEditor" ? "settingsEditor" : "dashboard";

    this._langModal.classList.add("active");

    const searchInput = this._langModal.querySelector(
      ".adhkar-lang-search-input",
    );
    if (searchInput) searchInput.value = "";

    this.renderLanguageSelectorModal("");

    setTimeout(() => {
      try {
        searchInput?.focus();
      } catch (e) {}
    }, 50);
  }

  closeLanguageSelectorModal() {
    if (!this._langModal) return;
    this._langModal.classList.remove("active");
  }

  renderLanguageSelectorModal(searchQuery) {
    if (!this._langModal) return;

    const activeSet = this.getActiveSet();
    const context =
      this._langModalContext === "settingsEditor"
        ? "settingsEditor"
        : "dashboard";
    const languages =
      context === "settingsEditor"
        ? this.getEditorLanguageOptions(activeSet)
        : this.getAvailableLanguages(activeSet);
    const current = this.normalizeLanguageCode(this.getSelectedLanguageCode());

    const titleEl = this._langModal.querySelector(".adhkar-lang-modal-title");
    if (titleEl) {
      titleEl.innerHTML = `<span aria-hidden="true">🌐</span>${
        context === "settingsEditor"
          ? "Select Editor Language"
          : "Select Language"
      }`;
    }

    const q = String(searchQuery || "")
      .trim()
      .toLowerCase();
    const filtered = q
      ? languages.filter(
          (l) =>
            l.code.toLowerCase().includes(q) ||
            l.name.toLowerCase().includes(q),
        )
      : languages;

    const listEl = this._langModal.querySelector(".adhkar-lang-list");
    if (!listEl) return;

    if (!filtered.length) {
      listEl.innerHTML = `<div class="adhkar-set-empty">No languages found.</div>`;
      return;
    }

    listEl.innerHTML = filtered
      .map((lang) => {
        const isActive = lang.code === current;
        return `
          <div class="adhkar-lang-item ${
            isActive ? "active" : ""
          }" data-lang="${this.escapeHtmlAttr(lang.code)}">
            <span class="flag" aria-hidden="true">${this.getLanguageFlag(
              lang.code,
            )}</span>
            <div class="adhkar-lang-item-info">
              <div class="adhkar-lang-item-name">${this.escapeHtmlAttr(
                lang.name,
              )}</div>
              <div class="adhkar-lang-item-code">${this.escapeHtmlAttr(
                lang.code,
              )}</div>
            </div>
          </div>
        `;
      })
      .join("");

    if (listEl.dataset.bound !== "true") {
      listEl.dataset.bound = "true";
      listEl.addEventListener("click", (e) => {
        const item = e.target.closest(".adhkar-lang-item");
        if (!item) return;
        const code = item.dataset.lang;
        if (!code) return;

        this.setSelectedLanguageCode(code);
        this.renderDashboard();
        this.renderSettings();
        const clickContext =
          this._langModalContext === "settingsEditor"
            ? "settingsEditor"
            : "dashboard";
        const optionsNow =
          clickContext === "settingsEditor"
            ? this.getEditorLanguageOptions(this.getActiveSet())
            : this.getAvailableLanguages(this.getActiveSet());
        const lang = optionsNow.find((l) => l.code === code);
        if (lang) {
          const prefix =
            clickContext === "settingsEditor" ? "Editor language" : "Language";
          this.showToast(`${prefix}: ${lang.name}`, "success");
        }
        this.closeLanguageSelectorModal();
      });
    }
  }

  clampNumber(value, min, max, fallback) {
    if (value === null || value === undefined) return fallback;
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  escapeHtmlAttr(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
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
      } catch (e) {}
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
});

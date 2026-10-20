/**
 * AdhkarManager, part 3 of 3.
 * Moved out of js/adhkar.js at method boundaries, so no single file carries the
 * whole class. The class itself is declared in js/adhkar.js; load this after it.
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
})(AdhkarManager.prototype, class {

  renderEditorList() {
    const active = this.getActiveSet();
    const items = active?.cards || [];
    const isDefault = this.isProtectedSetId(active?.id);

    if (!this.settingsList) return;

    // For default sets, show a message instead of the editor
    if (isDefault) {
      this.settingsList.innerHTML = `
        <div class="adhkar-default-notice">
          <div class="adhkar-default-notice-icon">${this._getIcon("🔒", {
            size: 24,
          })}</div>
          <div class="adhkar-default-notice-title">Default Adhkar Set</div>
          <div class="adhkar-default-notice-text">
            This is a protected default set and cannot be edited. 
            You can still view and recite from it, or create a custom set to add your own adhkar.
          </div>
          <button class="setting-btn adhkar-default-notice-btn" type="button" id="adhkarCreateCustomBtn">
            ${this._getIcon("➕", { size: 16 })} Create Custom Set
          </button>
        </div>
      `;

      // Bind the create custom set button
      const createBtn = this.settingsList.querySelector(
        "#adhkarCreateCustomBtn",
      );
      if (createBtn) {
        createBtn.addEventListener("click", () => this.createNewSet());
      }
      return;
    }

    const total = items.length;
    const pageSize = this.getSettingsPageSize();
    const pages = Math.max(1, Math.ceil(total / pageSize));
    this.settingsPage = Math.min(Math.max(1, this.settingsPage), pages);

    const start = (this.settingsPage - 1) * pageSize;
    const end = Math.min(total, start + pageSize);

    if (!items.length) {
      this.settingsList.innerHTML = `
        <div class="quotes-empty">
          <div class="quotes-empty-title">No adhkar in this set</div>
          <div class="quotes-empty-hint">Use “Add Item” or import a JSON file.</div>
        </div>
      `;
      return;
    }

    const selectedLang =
      this.normalizeLanguageCode(this.getSelectedLanguageCode()) || "en";
    const titleField = `title_${selectedLang}`;
    const textField = `text_${selectedLang}`;
    const langCodeLabel = selectedLang.toUpperCase();

    const rows = [];
    for (let i = start; i < end; i += 1) {
      const c = items[i] || {
        id: "",
        title_en: "",
        repeat: 1,
        reference: "",
        arabic: "",
        romanization: "",
        text_en: "",
      };
      const parsedRepeat = parseInt(c.repeat, 10);
      const repeatValue =
        Number.isFinite(parsedRepeat) && parsedRepeat > 0
          ? String(parsedRepeat)
          : "1";
      const titleValue =
        selectedLang === "en"
          ? (c[titleField] ?? c.title_en ?? c.title ?? "")
          : (c[titleField] ?? "");
      const textValue =
        selectedLang === "en"
          ? (c[textField] ??
            c.translation_en ??
            c.text_en ??
            c.translation ??
            c.text ??
            c.english ??
            "")
          : (c[textField] ?? c[`translation_${selectedLang}`] ?? "");

      rows.push(`
        <tr class="adhkar-editor-row" data-index="${i}">
          <td class="adhkar-col-id">${i + 1}</td>
          <td class="adhkar-col-title-lang">
            <input
              class="adhkar-editor-input setting-input"
              type="text"
              data-field="${this.escapeHtmlAttr(titleField)}"
              placeholder="Title (${this.escapeHtmlAttr(selectedLang)})"
              maxlength="200"
              value="${this.escapeHtmlAttr(titleValue)}"
            />
          </td>
          <td class="adhkar-col-arabic">
            <textarea
              class="adhkar-editor-textarea setting-input"
              data-field="arabic"
              rows="2"
              placeholder="Arabic text"
              maxlength="2000"
            >${this.escapeHtmlAttr(c.arabic || "")}</textarea>
          </td>
          <td class="adhkar-col-romanization">
            <textarea
              class="adhkar-editor-textarea setting-input"
              data-field="romanization"
              rows="2"
              placeholder="Romanization"
              maxlength="2000"
            >${this.escapeHtmlAttr(c.romanization || "")}</textarea>
          </td>
          <td class="adhkar-col-text-lang">
            <textarea
              class="adhkar-editor-textarea setting-input"
              data-field="${this.escapeHtmlAttr(textField)}"
              rows="2"
              placeholder="Text (${this.escapeHtmlAttr(selectedLang)})"
              maxlength="4000"
            >${this.escapeHtmlAttr(textValue)}</textarea>
          </td>
          <td class="adhkar-col-reference">
            <input
              class="adhkar-editor-input setting-input"
              type="text"
              data-field="reference"
              placeholder="Reference"
              maxlength="250"
              value="${this.escapeHtmlAttr(c.reference || "")}" 
            />
          </td>
          <td class="adhkar-col-repeat">
            <input
              class="adhkar-editor-input adhkar-repeat-input setting-input"
              type="number"
              inputmode="numeric"
              min="1"
              max="9999"
              step="1"
              data-field="repeat"
              value="${this.escapeHtmlAttr(repeatValue)}"
            />
          </td>
          <td class="adhkar-col-actions">
            <button
              class="adhkar-row-delete"
              type="button"
              data-action="delete-item"
              title="Delete"
              aria-label="Delete item"
            >
              ×
            </button>
          </td>
        </tr>
      `);
    }

    this.settingsList.innerHTML = `
      <div class="adhkar-editor-table-wrap">
        <table class="adhkar-editor-table">
          <thead>
            <tr>
              <th class="adhkar-col-id">ID</th>
              <th class="adhkar-col-title-lang">Title (${langCodeLabel})</th>
              <th class="adhkar-col-arabic">Arabic</th>
              <th class="adhkar-col-romanization">Romanization</th>
              <th class="adhkar-col-text-lang">Text (${langCodeLabel})</th>
              <th class="adhkar-col-reference">Reference</th>
              <th class="adhkar-col-repeat">Repeat</th>
              <th class="adhkar-col-actions"></th>
            </tr>
          </thead>
          <tbody>
            ${rows.join("")}
          </tbody>
        </table>
      </div>
    `;

    this.autoResizeAllTextareas();
  }

  autoResizeTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  autoResizeAllTextareas() {
    if (!this.settingsList) return;
    const items = this.settingsList.querySelectorAll(
      "textarea.adhkar-editor-textarea",
    );
    items.forEach((t) => this.autoResizeTextarea(t));
  }

  isSettingsEditorDetached() {
    const group = document.getElementById("adhkarEditorGroup");
    return !!group?.closest(".editor-detach-modal.active");
  }

  getSettingsPageSize() {
    return this.isSettingsEditorDetached()
      ? AdhkarManager.DETACHED_PAGE_SIZE
      : AdhkarManager.PAGE_SIZE;
  }

  renderPagination() {
    if (!this.settingsPagination) return;

    const active = this.getActiveSet();
    const total = active?.cards?.length || 0;
    const pageSize = this.getSettingsPageSize();
    const pages = Math.max(1, Math.ceil(total / pageSize));

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

  inferSetNameFromFile(filename) {
    const base = String(filename || "")
      .replace(/\.[^.]+$/, "")
      .trim();
    const safe = base || "Imported";
    return safe.slice(0, 40);
  }

  isProtectedSetId(id) {
    return (
      Array.isArray(AdhkarManager.PROTECTED_SET_IDS) &&
      AdhkarManager.PROTECTED_SET_IDS.includes(String(id))
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

    const isTaken = (candidate) =>
      sets.some(
        (s) => String(s.name || "").toLowerCase() === candidate.toLowerCase(),
      );

    const protectedNames = Array.isArray(AdhkarManager.DEFAULT_SETS)
      ? AdhkarManager.DEFAULT_SETS.map((d) =>
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
    if (sets.length >= AdhkarManager.MAX_SETS) {
      this.showToast(
        `You already have ${AdhkarManager.MAX_SETS} sets. Delete one first.`,
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

    const protectedNames = Array.isArray(AdhkarManager.DEFAULT_SETS)
      ? AdhkarManager.DEFAULT_SETS.map((d) =>
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

  normalizeImportedCards(data) {
    // Accept shapes:
    // - Array of items: [{arabic, romanization, english, ...}]
    // - Object with cards/items field
    if (Array.isArray(data)) {
      const normalizedCards = data
        .filter((x) => x && typeof x === "object" && !Array.isArray(x))
        .map((x) => {
          const rawId = x.id ?? x.adhkar_id ?? null;
          const parsedIdNum = parseInt(rawId, 10);
          const id = Number.isFinite(parsedIdNum)
            ? parsedIdNum
            : String(rawId || "").trim();

          const rawRepeat = x.repeat ?? x.repeats ?? x.count;
          const parsedRepeat = parseInt(rawRepeat, 10);
          const repeat =
            Number.isFinite(parsedRepeat) && parsedRepeat > 0
              ? parsedRepeat
              : 1;

          const reference = String(x.reference || x.source || "").trim();
          const arabic = String(x.arabic || "").trim();
          const romanization = String(x.romanization || x.roman || "").trim();

          const textFields = {};
          const titleFields = {};

          Object.entries(x || {}).forEach(([rawKey, rawValue]) => {
            if (rawValue == null) return;

            const key = String(rawKey || "");
            const value = String(rawValue).trim();
            if (!value) return;

            let match = key.match(/^text_(.+)$/i);
            if (match) {
              const code = this.normalizeLanguageCode(match[1]);
              if (!code) return;
              textFields[`text_${code}`] = value;
              return;
            }

            match = key.match(/^translation_(.+)$/i);
            if (match) {
              const code = this.normalizeLanguageCode(match[1]);
              if (!code) return;
              if (!textFields[`text_${code}`]) {
                textFields[`text_${code}`] = value;
              }
              return;
            }

            match = key.match(/^title_(.+)$/i);
            if (match) {
              const code = this.normalizeLanguageCode(match[1]);
              if (!code) return;
              titleFields[`title_${code}`] = value;
            }
          });

          const legacyTitle = String(x.title || x.name || "").trim();
          if (legacyTitle && !titleFields.title_en) {
            titleFields.title_en = legacyTitle;
          }

          const legacyText = String(
            x.text || x.translation || x.translation_en || x.english || "",
          ).trim();
          if (legacyText) {
            if (x.isArabic === true) {
              if (!textFields.text_ar) textFields.text_ar = legacyText;
            } else if (!textFields.text_en) {
              textFields.text_en = legacyText;
            }
          }

          const hasText = Object.keys(textFields).length > 0;
          const hasTitle = Object.keys(titleFields).length > 0;
          if (!arabic && !romanization && !reference && !hasText && !hasTitle) {
            return null;
          }

          const normalized = {
            arabic,
            romanization,
            reference,
            repeat,
            ...titleFields,
            ...textFields,
          };

          if (id !== "") normalized.id = id;

          return normalized;
        })
        .filter(Boolean);

      // Keep only unique card payloads (ignoring `id`) to avoid duplicate key/value entries.
      const deduped = [];
      const seen = new Set();
      for (const card of normalizedCards) {
        const cmp = { ...card };
        delete cmp.id;
        const ordered = {};
        Object.keys(cmp)
          .sort()
          .forEach((k) => {
            ordered[k] = cmp[k];
          });
        const key = JSON.stringify(ordered);
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(card);
      }

      return deduped;
    }

    if (data && typeof data === "object") {
      const arr =
        data.cards || data.items || data.adhkar || data.entries || data.data;
      return this.normalizeImportedCards(Array.isArray(arr) ? arr : []);
    }

    return [];
  }

  async importJsonFile(file) {
    const name = this.inferSetNameFromFile(file.name);

    const sets = this.getSets();
    let effectiveName = name;
    let existing = sets.find(
      (s) => String(s.name || "").toLowerCase() === name.toLowerCase(),
    );

    // Never allow replacing a protected default set; create a new set instead.
    if (existing && this.isProtectedSetId(existing.id)) {
      existing = null;
      effectiveName = this.makeUniqueSetName(effectiveName, sets);
    }

    if (!existing && sets.length >= AdhkarManager.MAX_SETS) {
      this.showToast(
        `You already have ${AdhkarManager.MAX_SETS} sets. Delete one first.`,
        "error",
      );
      return;
    }

    let json;
    try {
      const text = await file.text();
      json = JSON.parse(text);
    } catch (e) {
      this.showToast("Could not read the JSON file.", "error");
      return;
    }

    const cards = this.normalizeImportedCards(json);
    if (!cards.length) {
      this.showToast("JSON contains no valid adhkar items.", "error");
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

  exportActiveSetJson() {
    const active = this.getActiveSet();
    if (!active) return;

    const payload = this.normalizeImportedCards(active.cards || []);
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${this.slugify(active.name || "adhkar")}.json`;
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

  addItemToActiveSet() {
    const sets = this.getSets();
    const activeId = this.getActiveSetId();
    const active = sets.find((s) => s.id === activeId) || sets[0];
    if (!active) return;

    if (this.isProtectedSetId(active.id)) {
      this.showToast("This default set cannot be edited.", "error");
      return;
    }

    active.cards = Array.isArray(active.cards) ? active.cards : [];
    const currentLang =
      this.normalizeLanguageCode(this.getSelectedLanguageCode()) || "en";
    const titleField = `title_${currentLang}`;
    const textField = `text_${currentLang}`;
    const newItem = {
      repeat: 1,
      reference: "",
      arabic: "",
      romanization: "",
      title_en: "",
      text_en: "",
    };
    if (currentLang !== "en") {
      newItem[titleField] = "";
      newItem[textField] = "";
    }
    active.cards.push(newItem);
    active.updatedAt = new Date().toISOString();
    this.saveSets(sets);

    const total = active.cards.length;
    const pageSize = this.getSettingsPageSize();
    const pages = Math.max(1, Math.ceil(total / pageSize));
    this.settingsPage = pages;

    this.renderSettings();
    this.showToast("Item added.", "success");
  }

  updateItemField(globalIndex, field, value) {
    const sets = this.getSets();
    const activeId = this.getActiveSetId();
    const active = sets.find((s) => s.id === activeId) || sets[0];
    if (!active || !active.cards || !active.cards[globalIndex]) return;

    if (this.isProtectedSetId(active.id)) return;

    const normalizedField = String(field || "").trim();
    const baseAllowed = new Set([
      "title",
      "repeat",
      "reference",
      "arabic",
      "romanization",
      "translation",
      "english",
      "text",
    ]);
    const isLocalizedField = /^(title|text)_[a-z0-9-]+$/i.test(normalizedField);
    if (!baseAllowed.has(normalizedField) && !isLocalizedField) return;

    let targetField = normalizedField;
    if (targetField === "title") targetField = "title_en";
    if (
      targetField === "translation" ||
      targetField === "english" ||
      targetField === "text"
    ) {
      targetField = "text_en";
    }

    if (targetField === "repeat") {
      const n = parseInt(value, 10);
      const normalized = Number.isFinite(n) && n > 0 ? Math.min(n, 9999) : 1;
      active.cards[globalIndex][targetField] = normalized;
    } else {
      active.cards[globalIndex][targetField] = String(value ?? "");
    }
    active.updatedAt = new Date().toISOString();

    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveSets(sets);
      this.renderDashboard();
    }, 250);
  }

  deleteItemAtIndex(globalIndex) {
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

    const pages = Math.max(
      1,
      Math.ceil((active.cards.length || 0) / this.getSettingsPageSize()),
    );
    this.settingsPage = Math.min(this.settingsPage, pages);

    this.renderSettings();
    this.renderDashboard();
    this.showToast("Item deleted.", "success");
  }

  createSetSelectorButton() {
    const headerActions = this.cardEl?.querySelector(".card-header-actions");
    if (!headerActions) return;

    // Ensure the script toggle button appears first (left-most)
    const scriptBtn =
      this.scriptToggleBtn ||
      headerActions.querySelector("#adhkarScriptToggleBtn");
    if (scriptBtn && headerActions.contains(scriptBtn)) {
      headerActions.insertBefore(scriptBtn, headerActions.firstChild);
    }

    // If selector button already exists, nothing more to do
    if (headerActions.querySelector(".adhkar-set-selector-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "adhkar-set-selector-btn";
    btn.innerHTML = this._getIcon("📚", { size: 18 });
    this._setModalBtn = btn;
    btn.title = "Select adhkar set";
    btn.setAttribute("aria-label", "Select adhkar set");

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      this.openSetSelectorModal();
    });

    // Insert after the script toggle if present, otherwise insert at the start
    if (scriptBtn && headerActions.contains(scriptBtn)) {
      headerActions.insertBefore(btn, scriptBtn.nextSibling);
    } else {
      headerActions.insertBefore(btn, headerActions.firstChild);
    }
  }

  createLanguageSelectorButton() {
    const headerActions = this.cardEl?.querySelector(".card-header-actions");
    if (!headerActions) return;

    // If language selector button already exists, skip
    if (headerActions.querySelector(".adhkar-lang-selector-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "adhkar-lang-selector-btn";
    const langIcon = this._getIcon("🌐", { size: 16 });
    btn.innerHTML = `<span class="lang-icon" aria-hidden="true">${langIcon}</span><span class="lang-label">Lang</span>`;
    btn.title = "Select translation language";
    btn.setAttribute("aria-label", "Select translation language");
    btn.style.display = "none"; // Hidden by default

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      this.openLanguageSelectorModal();
    });

    // Insert at the very start (left of script toggle)
    const scriptBtn = headerActions.querySelector("#adhkarScriptToggleBtn");
    if (scriptBtn) {
      headerActions.insertBefore(btn, scriptBtn);
    } else {
      headerActions.insertBefore(btn, headerActions.firstChild);
    }
  }

  createLanguageSelectorModal() {
    if (document.getElementById("adhkarLangModal")) return;

    const modal = document.createElement("div");
    modal.id = "adhkarLangModal";
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

  renderLanguageSelectorModal(searchQuery = "") {
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

  createSetSelectorModal() {
    if (document.getElementById("adhkarSetModal")) return;

    const modal = document.createElement("div");
    modal.id = "adhkarSetModal";
    modal.className = "adhkar-set-modal";
    modal.innerHTML = `
      <div class="adhkar-set-modal-content">
        <div class="adhkar-set-modal-header">
          <h3 class="adhkar-set-modal-title">${this._getIcon("📚", {
            size: 20,
          })} Select Adhkar Set</h3>
          <button type="button" class="adhkar-set-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="adhkar-set-modal-body">
          <div class="adhkar-set-search">
            <input type="text" class="adhkar-set-search-input" placeholder="Search sets..." />
          </div>
          <div class="adhkar-set-list"></div>
          <div class="adhkar-set-pagination"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this._setModal = modal;
    this._setModal = modal;

    modal
      .querySelector(".adhkar-set-modal-close")
      .addEventListener("click", () => {
        this.closeSetSelectorModal();
      });

    this._bindOverlayCloseBehavior(modal, () => this.closeSetSelectorModal());

    modal
      .querySelector(".adhkar-set-search-input")
      .addEventListener("input", (e) => {
        this._setModalSearchQuery = e.target.value;
        this._setModalPage = 1;
        this.renderSetSelectorModal();
      });
  }

  openSetSelectorModal() {
    this._setModalSearchQuery = "";
    this._setModalPage = 1;

    const modal = document.getElementById("adhkarSetModal");
    if (modal) {
      modal.classList.add("active");

      const searchInput = modal.querySelector(".adhkar-set-search-input");
      if (searchInput) {
        searchInput.value = "";
        // Focus the search input for convenience and accessibility
        setTimeout(() => {
          searchInput.focus();
          if (typeof searchInput.select === "function") searchInput.select();
        }, 0);
      }

      // Update the header to reflect the modal state for assistive tech
      const headerText = this.cardEl?.querySelector("#adhkarHeaderText");
      if (headerText) headerText.setAttribute("aria-expanded", "true");

      this.renderSetSelectorModal();
    }
  }

  closeSetSelectorModal() {
    const modal = document.getElementById("adhkarSetModal");
    if (modal) {
      modal.classList.remove("active");
      // Update header state for assistive tech
      const headerText = this.cardEl?.querySelector("#adhkarHeaderText");
      if (headerText) headerText.setAttribute("aria-expanded", "false");
    }
  }

  renderSetSelectorModal() {
    const modal = document.getElementById("adhkarSetModal");
    if (!modal) return;

    const listContainer = modal.querySelector(".adhkar-set-list");
    const paginationContainer = modal.querySelector(".adhkar-set-pagination");

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
        <div class="adhkar-set-empty">
          No adhkar sets found.
        </div>
      `;
    } else {
      listContainer.innerHTML = pageSets
        .map((s) => {
          const itemCount = Array.isArray(s.cards) ? s.cards.length : 0;
          const isActive = s.id === activeSetId;
          return `
            <div class="adhkar-set-item ${
              isActive ? "active" : ""
            }" data-set-id="${s.id}">
              <div class="adhkar-set-item-info">
                <span class="adhkar-set-item-name">${this.escapeHtmlAttr(
                  s.name,
                )}</span>
                <span class="adhkar-set-item-meta">${itemCount} item${
                  itemCount === 1 ? "" : "s"
                }</span>
              </div>
              ${
                Array.isArray(AdhkarManager.PROTECTED_SET_IDS) &&
                AdhkarManager.PROTECTED_SET_IDS.includes(s.id)
                  ? `<span class="adhkar-set-item-lock" title="Default set — read only">${this._getIcon(
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

      listContainer.querySelectorAll(".adhkar-set-item").forEach((el) => {
        el.addEventListener("click", () => {
          const setId = el.dataset.setId;
          this.setActiveSetId(setId);
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
      <button type="button" class="adhkar-set-page-btn" data-page="${
        currentPage - 1
      }" ${currentPage === 1 ? "disabled" : ""}>${this._getIcon("←", {
        size: 14,
      })}</button>
      ${pages
        .map((p) =>
          p === "..."
            ? `<span class="adhkar-set-page-btn" style="cursor: default; border: none;">...</span>`
            : `<button type="button" class="adhkar-set-page-btn ${
                p === currentPage ? "active" : ""
              }" data-page="${p}">${p}</button>`,
        )
        .join("")}
      <button type="button" class="adhkar-set-page-btn" data-page="${
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

  slugify(name) {
    return String(name || "adhkar")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  }

  clampNumber(value, min, max, fallback) {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(min, Math.min(max, value));
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

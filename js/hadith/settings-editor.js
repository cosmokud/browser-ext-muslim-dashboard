/**
 * HadithManager: settings panel editor and pagination.
 * Part of the class declared in js/hadith/index.js; load this after it.
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

  ensureSettingsBound() {
    const panel = document.getElementById("hadithPanel");
    if (!panel) return false;

    if (!this.settingsSetSelect)
      this.settingsSetSelect = document.getElementById("hadithSetSelect");
    if (!this.settingsImportBtn)
      this.settingsImportBtn = document.getElementById("hadithImportBtn");
    if (!this.settingsExportBtn)
      this.settingsExportBtn = document.getElementById("hadithExportBtn");
    if (!this.settingsDeleteSetBtn)
      this.settingsDeleteSetBtn = document.getElementById("hadithDeleteSetBtn");
    if (!this.settingsNewSetBtn)
      this.settingsNewSetBtn = document.getElementById("hadithNewSetBtn");
    if (!this.settingsRenameSetBtn)
      this.settingsRenameSetBtn = document.getElementById("hadithRenameSetBtn");
    if (!this.settingsImportInput)
      this.settingsImportInput = document.getElementById("hadithImportInput");
    if (!this.settingsAddItemBtn)
      this.settingsAddItemBtn = document.getElementById("hadithAddItemBtn");
    if (!this.settingsLanguagePickerBtn)
      this.settingsLanguagePickerBtn = document.getElementById(
        "hadithEditorLangPickerBtn",
      );
    if (!this.settingsList)
      this.settingsList = document.getElementById("hadithEditorList");
    if (!this.settingsPagination)
      this.settingsPagination = document.getElementById("hadithPagination");
    if (!this.settingsMeta)
      this.settingsMeta = document.getElementById("hadithMeta");

    if (!this.settingsAutoAdvanceSeconds)
      this.settingsAutoAdvanceSeconds = document.getElementById(
        "hadithAutoAdvanceSeconds",
      );

    if (!this.settingsTitleFontSize)
      this.settingsTitleFontSize = document.getElementById(
        "hadithTitleFontSize",
      );
    if (!this.settingsTitleFontSizeValue)
      this.settingsTitleFontSizeValue = document.getElementById(
        "hadithTitleFontSizeValue",
      );
    if (!this.settingsTextFontSize)
      this.settingsTextFontSize = document.getElementById("hadithTextFontSize");
    if (!this.settingsTextFontSizeValue)
      this.settingsTextFontSizeValue = document.getElementById(
        "hadithTextFontSizeValue",
      );
    if (!this.settingsMetaFontSize)
      this.settingsMetaFontSize = document.getElementById("hadithMetaFontSize");
    if (!this.settingsMetaFontSizeValue)
      this.settingsMetaFontSizeValue = document.getElementById(
        "hadithMetaFontSizeValue",
      );

    // Bind once
    if (panel.dataset.bound === "true") return true;
    panel.dataset.bound = "true";

    if (this.settingsSetSelect) {
      this.settingsSetSelect.addEventListener("change", (e) => {
        const setId = e.target.value;
        this.setActiveSetId(setId);
        this.restoreCurrentCardIndexForActiveSet();
        this.renderDashboard();
        this.renderSettings();
        this.ensureAutoAdvanceState({ reset: true });
      });
    }

    if (this.settingsNewSetBtn) {
      this.settingsNewSetBtn.addEventListener("click", () =>
        this.createNewSet(),
      );
    }

    if (this.settingsRenameSetBtn) {
      this.settingsRenameSetBtn.addEventListener("click", () =>
        this.renameActiveSet(),
      );
    }

    if (this.settingsDeleteSetBtn) {
      this.settingsDeleteSetBtn.addEventListener("click", () =>
        this.deleteActiveSet(),
      );
    }

    if (this.settingsImportBtn && this.settingsImportInput) {
      this.settingsImportBtn.addEventListener("click", () =>
        this.settingsImportInput.click(),
      );

      this.settingsImportInput.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await this.importSetFromFile(file);
        e.target.value = "";
      });
    }

    if (this.settingsExportBtn) {
      this.settingsExportBtn.addEventListener("click", () =>
        this.exportActiveSet(),
      );
    }

    if (this.settingsAddItemBtn) {
      this.settingsAddItemBtn.addEventListener("click", () =>
        this.addNewItem(),
      );
    }

    if (this.settingsLanguagePickerBtn) {
      this.settingsLanguagePickerBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.openLanguageSelectorModal("settingsEditor");
      });
    }

    if (this.settingsAutoAdvanceSeconds) {
      this.settingsAutoAdvanceSeconds.addEventListener("change", (e) => {
        this.setAutoAdvanceSeconds(e.target.value);
      });
    }

    const bindRange = (rangeEl, onValue) => {
      if (!rangeEl) return;
      rangeEl.addEventListener("input", (e) => {
        const v = parseInt(e.target.value, 10);
        if (!Number.isFinite(v)) return;
        onValue(v);
      });
    };

    bindRange(this.settingsTitleFontSize, (v) => {
      const t = this.getTypography();
      this.setTypography({ title: v });
      this.updateTypographyLabels(v, t.text, t.meta);
    });

    bindRange(this.settingsTextFontSize, (v) => {
      const t = this.getTypography();
      this.setTypography({ text: v });
      this.updateTypographyLabels(t.title, v, t.meta);
    });

    bindRange(this.settingsMetaFontSize, (v) => {
      const t = this.getTypography();
      this.setTypography({ meta: v });
      this.updateTypographyLabels(t.title, t.text, v);
    });

    if (this.settingsList) {
      this.settingsList.addEventListener("input", (e) => {
        const fieldEl = e.target.closest("input,textarea");
        if (!fieldEl) return;
        const row = fieldEl.closest(".hadith-editor-row");
        if (!row) return;
        const idx = Number(row.dataset.index);
        if (!Number.isFinite(idx)) return;

        const field = fieldEl.dataset.field;
        if (!field) return;

        this.scheduleSaveItemField(idx, field, fieldEl.value);

        if (fieldEl.tagName === "TEXTAREA") {
          this.autoResizeTextarea(fieldEl);
        }
      });

      this.settingsList.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        if (btn.dataset.action !== "delete-item") return;
        const row = btn.closest(".hadith-editor-row");
        if (!row) return;
        const idx = Number(row.dataset.index);
        if (!Number.isFinite(idx)) return;
        this.deleteItemAtIndex(idx);
      });
    }

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
      opt.textContent = this.isProtectedSetId(s.id)
        ? this._getLockedOptionLabel(s.name)
        : s.name;
      this.settingsSetSelect.appendChild(opt);
    });

    if (active) {
      this.settingsSetSelect.value = active.id;
    }

    this._settingsReadOnly = this.isProtectedSetId(active?.id);

    if (this.settingsDeleteSetBtn) {
      this.settingsDeleteSetBtn.disabled = this._settingsReadOnly;
      this.settingsDeleteSetBtn.title = this._settingsReadOnly
        ? "This default set cannot be deleted"
        : "Delete set";
    }

    if (this.settingsRenameSetBtn) {
      this.settingsRenameSetBtn.disabled = this._settingsReadOnly;
      this.settingsRenameSetBtn.title = this._settingsReadOnly
        ? "This default set cannot be renamed"
        : "Rename set";
    }

    if (this.settingsAddItemBtn) {
      this.settingsAddItemBtn.disabled = this._settingsReadOnly;
      this.settingsAddItemBtn.title = this._settingsReadOnly
        ? "This default set cannot be edited"
        : "Add item";
    }

    // Meta
    const totalItems = active?.cards?.length || 0;
    const totalSets = sets.length;
    if (this.settingsMeta) {
      this.settingsMeta.textContent = `${totalItems} items • ${totalSets}/${HadithManager.MAX_SETS} sets`;
    }

    // Typography
    const t = this.getTypography();
    if (this.settingsTitleFontSize)
      this.settingsTitleFontSize.value = String(t.title);
    if (this.settingsTextFontSize)
      this.settingsTextFontSize.value = String(t.text);
    if (this.settingsMetaFontSize)
      this.settingsMetaFontSize.value = String(t.meta);

    this.updateTypographyLabels(t.title, t.text, t.meta);
    this.applyTypography();

    if (this.settingsAutoAdvanceSeconds) {
      this.settingsAutoAdvanceSeconds.value = String(
        this.getAutoAdvanceSeconds(),
      );
    }

    this.updateSettingsLanguagePickerButton();

    this.renderEditorList();
    this.renderPagination();
  }

  renderEditorList() {
    const active = this.getActiveSet();
    const items = active?.cards || [];
    const isDefault = this.isProtectedSetId(active?.id);

    if (!this.settingsList) return;

    if (isDefault) {
      this.settingsList.innerHTML = `
        <div class="adhkar-default-notice">
          <div class="adhkar-default-notice-icon">${this._getIcon("🔒", {
            size: 24,
          })}</div>
          <div class="adhkar-default-notice-title">Default Hadith Set</div>
          <div class="adhkar-default-notice-text">
            This is a protected default set and cannot be edited, renamed, or deleted.
            Create a custom set to add your own hadith.
          </div>
          <button class="setting-btn adhkar-default-notice-btn" type="button" id="hadithCreateCustomBtn">
            ${this._getIcon("➕", { size: 16 })} Create Custom Set
          </button>
        </div>
      `;

      const createBtn = this.settingsList.querySelector(
        "#hadithCreateCustomBtn",
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
          <div class="quotes-empty-title">No hadith in this set</div>
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
        text_en: "",
        narrator: "",
        reference: "",
      };

      const titleValue =
        selectedLang === "en"
          ? (c[titleField] ?? c.title_en ?? c.title ?? "")
          : (c[titleField] ?? "");
      const textValue =
        selectedLang === "en"
          ? (c[textField] ??
            c.translation_en ??
            c.text_en ??
            c.text ??
            c.translation ??
            "")
          : (c[textField] ?? c[`translation_${selectedLang}`] ?? "");

      rows.push(`
        <tr class="hadith-editor-row" data-index="${i}">
          <td class="hadith-col-id">${i + 1}</td>
          <td class="hadith-col-title-lang">
            <input
              class="hadith-editor-input setting-input"
              type="text"
              data-field="${this.escapeHtmlAttr(titleField)}"
              placeholder="Title (${this.escapeHtmlAttr(selectedLang)})"
              maxlength="200"
              value="${this.escapeHtmlAttr(titleValue)}"
            />
          </td>
          <td class="hadith-col-text-lang">
            <textarea
              class="hadith-editor-textarea setting-input"
              data-field="${this.escapeHtmlAttr(textField)}"
              rows="2"
              placeholder="Text (${this.escapeHtmlAttr(selectedLang)})"
              maxlength="12000"
            >${this.escapeHtmlAttr(textValue)}</textarea>
          </td>
          <td class="hadith-col-narrator">
            <input
              class="hadith-editor-input setting-input"
              type="text"
              data-field="narrator"
              placeholder="Narrator"
              maxlength="200"
              value="${this.escapeHtmlAttr(c.narrator || "")}"
            />
          </td>
          <td class="hadith-col-reference">
            <input
              class="hadith-editor-input setting-input"
              type="text"
              data-field="reference"
              placeholder="Reference"
              maxlength="250"
              value="${this.escapeHtmlAttr(c.reference || "")}"
            />
          </td>
          <td class="hadith-col-actions">
            <button
              class="hadith-row-delete"
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
      <div class="hadith-editor-table-wrap">
        <table class="hadith-editor-table">
          <thead>
            <tr>
              <th class="hadith-col-id">ID</th>
              <th class="hadith-col-title-lang">Title (${langCodeLabel})</th>
              <th class="hadith-col-text-lang">Text (${langCodeLabel})</th>
              <th class="hadith-col-narrator">Narrator</th>
              <th class="hadith-col-reference">Reference</th>
              <th class="hadith-col-actions"></th>
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
      "textarea.hadith-editor-textarea",
    );
    items.forEach((t) => this.autoResizeTextarea(t));
  }

  isSettingsEditorDetached() {
    const group = document.getElementById("hadithEditorGroup");
    return !!group?.closest(".editor-detach-modal.active");
  }

  getSettingsPageSize() {
    return this.isSettingsEditorDetached()
      ? HadithManager.DETACHED_PAGE_SIZE
      : HadithManager.PAGE_SIZE;
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
});

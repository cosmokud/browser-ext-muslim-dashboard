/**
 * AdhkarManager: settings panel editor and pagination.
 * Part of the class declared in js/adhkar/index.js; load this after it.
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

  ensureSettingsBound() {
    const panel = document.getElementById("adhkarPanel");
    if (!panel) return false;

    if (!this.settingsSetSelect)
      this.settingsSetSelect = document.getElementById("adhkarSetSelect");
    if (!this.settingsImportBtn)
      this.settingsImportBtn = document.getElementById("adhkarImportBtn");
    if (!this.settingsExportBtn)
      this.settingsExportBtn = document.getElementById("adhkarExportBtn");
    if (!this.settingsDeleteSetBtn)
      this.settingsDeleteSetBtn = document.getElementById("adhkarDeleteSetBtn");
    if (!this.settingsNewSetBtn)
      this.settingsNewSetBtn = document.getElementById("adhkarNewSetBtn");
    if (!this.settingsImportInput)
      this.settingsImportInput = document.getElementById("adhkarImportInput");
    if (!this.settingsAddItemBtn)
      this.settingsAddItemBtn = document.getElementById("adhkarAddItemBtn");
    if (!this.settingsLanguagePickerBtn)
      this.settingsLanguagePickerBtn = document.getElementById(
        "adhkarEditorLangPickerBtn",
      );
    if (!this.settingsList)
      this.settingsList = document.getElementById("adhkarEditorList");
    if (!this.settingsPagination)
      this.settingsPagination = document.getElementById("adhkarPagination");
    if (!this.settingsMeta)
      this.settingsMeta = document.getElementById("adhkarMeta");

    if (!this.settingsAutoAdvanceSeconds)
      this.settingsAutoAdvanceSeconds = document.getElementById(
        "adhkarAutoAdvanceSeconds",
      );

    if (!this.settingsArabicFontSize)
      this.settingsArabicFontSize = document.getElementById(
        "adhkarArabicFontSize",
      );
    if (!this.settingsArabicFontSizeValue)
      this.settingsArabicFontSizeValue = document.getElementById(
        "adhkarArabicFontSizeValue",
      );

    if (!this.settingsRomanizationFontSize)
      this.settingsRomanizationFontSize = document.getElementById(
        "adhkarRomanizationFontSize",
      );
    if (!this.settingsRomanizationFontSizeValue)
      this.settingsRomanizationFontSizeValue = document.getElementById(
        "adhkarRomanizationFontSizeValue",
      );

    if (!this.settingsEnglishFontSize)
      this.settingsEnglishFontSize = document.getElementById(
        "adhkarEnglishFontSize",
      );
    if (!this.settingsEnglishFontSizeValue)
      this.settingsEnglishFontSizeValue = document.getElementById(
        "adhkarEnglishFontSizeValue",
      );

    if (
      !this.settingsSetSelect ||
      !this.settingsImportBtn ||
      !this.settingsExportBtn ||
      !this.settingsDeleteSetBtn ||
      !this.settingsNewSetBtn ||
      !this.settingsImportInput ||
      !this.settingsAddItemBtn ||
      !this.settingsList ||
      !this.settingsPagination ||
      !this.settingsMeta
    ) {
      return false;
    }

    if (panel.dataset.bound === "true") return true;
    panel.dataset.bound = "true";

    this.settingsSetSelect.addEventListener("change", () => {
      const setId = this.settingsSetSelect.value;
      this.setActiveSetId(setId);
      this.restoreCurrentCardIndexForActiveSet();
      this.settingsPage = 1;
      this.renderSettings();
      this.renderDashboard();
      this.ensureAutoAdvanceState({ reset: true });
    });

    this.settingsNewSetBtn.addEventListener("click", () => {
      this.createNewSet();
    });

    this.settingsDeleteSetBtn.addEventListener("click", () => {
      this.deleteActiveSet();
    });

    this.settingsAddItemBtn.addEventListener("click", () => {
      this.addItemToActiveSet();
    });

    if (this.settingsLanguagePickerBtn) {
      this.settingsLanguagePickerBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.openLanguageSelectorModal("settingsEditor");
      });
    }

    this.settingsImportBtn.addEventListener("click", () => {
      this.settingsImportInput.click();
    });

    this.settingsImportInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      this.importJsonFile(file);
      e.target.value = "";
    });

    this.settingsExportBtn.addEventListener("click", () => {
      this.exportActiveSetJson();
    });

    if (this.settingsAutoAdvanceSeconds) {
      this.settingsAutoAdvanceSeconds.addEventListener("change", () => {
        const next = this.setAutoAdvanceSeconds(
          this.settingsAutoAdvanceSeconds.value,
        );
        this.settingsAutoAdvanceSeconds.value = String(next);
      });
    }

    const bindFontRange = (rangeEl, valueEl, key) => {
      if (!rangeEl) return;
      rangeEl.addEventListener("input", () => {
        const t = this.getTypography();
        const v = this.clampNumber(
          parseInt(rangeEl.value, 10),
          12,
          144,
          t[key],
        );
        rangeEl.value = String(v);
        this.setAdhkarSettings({ [`${key}FontSize`]: v });
        const nextT = this.getTypography();
        this.updateTypographyLabels(
          nextT.arabic,
          nextT.romanization,
          nextT.english,
        );
        this.applyTypography();
      });
    };

    bindFontRange(
      this.settingsArabicFontSize,
      this.settingsArabicFontSizeValue,
      "arabic",
    );
    bindFontRange(
      this.settingsRomanizationFontSize,
      this.settingsRomanizationFontSizeValue,
      "romanization",
    );
    bindFontRange(
      this.settingsEnglishFontSize,
      this.settingsEnglishFontSizeValue,
      "english",
    );

    // Editor updates (delegated)
    this.settingsList.addEventListener("input", (e) => {
      if (this.isDefaultActiveSet()) return;
      const fieldEl = e.target.closest("textarea, input");
      if (!fieldEl) return;
      const row = fieldEl.closest(".adhkar-editor-row");
      if (!row) return;
      const idx = Number(row.dataset.index);
      const field = fieldEl.dataset.field;
      if (!Number.isFinite(idx)) return;
      this.updateItemField(idx, field, fieldEl.value);

      // Auto-resize textareas for a polished editor UX
      if (fieldEl.tagName === "TEXTAREA") {
        this.autoResizeTextarea(fieldEl);
      }
    });

    this.settingsList.addEventListener("click", (e) => {
      if (this.isDefaultActiveSet()) return;
      const btn = e.target.closest("button");
      if (!btn) return;
      const action = btn.dataset.action;
      if (action !== "delete-item") return;
      const row = btn.closest(".adhkar-editor-row");
      if (!row) return;
      const idx = Number(row.dataset.index);
      if (!Number.isFinite(idx)) return;
      this.deleteItemAtIndex(idx);
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
      this.settingsMeta.textContent = `${totalItems} items • ${totalSets}/${AdhkarManager.MAX_SETS} sets`;
    }

    // Typography
    const t = this.getTypography();
    if (this.settingsArabicFontSize)
      this.settingsArabicFontSize.value = String(t.arabic);
    if (this.settingsRomanizationFontSize)
      this.settingsRomanizationFontSize.value = String(t.romanization);
    if (this.settingsEnglishFontSize)
      this.settingsEnglishFontSize.value = String(t.english);

    this.updateTypographyLabels(t.arabic, t.romanization, t.english);
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
});

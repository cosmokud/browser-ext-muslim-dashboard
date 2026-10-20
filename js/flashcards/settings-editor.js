/**
 * FlashcardManager: settings panel editor.
 * Part of the class declared in js/flashcards/index.js; load this after it.
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

  bindSettingsElements() {
    this.settingsSetSelect = document.getElementById("flashcardsSetSelect");
    this.settingsImportBtn = document.getElementById("flashcardsImportBtn");
    this.settingsExportBtn = document.getElementById("flashcardsExportBtn");
    this.settingsDeleteSetBtn = document.getElementById(
      "flashcardsDeleteSetBtn",
    );
    this.settingsNewSetBtn = document.getElementById("flashcardsNewSetBtn");
    this.settingsImportInput = document.getElementById("flashcardsImportInput");
    this.settingsAddCardBtn = document.getElementById("flashcardsAddCardBtn");
    this.settingsList = document.getElementById("flashcardsEditorList");
    this.settingsPagination = document.getElementById("flashcardsPagination");
    this.settingsMeta = document.getElementById("flashcardsMeta");

    this.settingsModeSelect = document.getElementById("flashcardsModeSelect");
    this.settingsStudyAutoAdvanceSeconds = document.getElementById(
      "flashcardsStudyAutoAdvanceSeconds",
    );

    this.settingsQuestionFontSize = document.getElementById(
      "flashcardsQuestionFontSize",
    );
    this.settingsQuestionFontSizeValue = document.getElementById(
      "flashcardsQuestionFontSizeValue",
    );
    this.settingsAnswerFontSize = document.getElementById(
      "flashcardsAnswerFontSize",
    );
    this.settingsAnswerFontSizeValue = document.getElementById(
      "flashcardsAnswerFontSizeValue",
    );
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
      this.isFlipped = false;
      this.restoreCurrentCardIndexForActiveSet();
      this.renderSettings();
      this.renderDashboard();
      this.ensureAutoAdvanceState({ reset: true });
    });

    const bindTypography = () => {
      if (!this.settingsQuestionFontSize || !this.settingsAnswerFontSize)
        return;

      if (this.settingsQuestionFontSize.dataset.bound === "true") return;
      this.settingsQuestionFontSize.dataset.bound = "true";

      const onUpdate = () => {
        const q = this.clampNumber(
          parseInt(this.settingsQuestionFontSize.value, 10),
          12,
          144,
          22,
        );
        const a = this.clampNumber(
          parseInt(this.settingsAnswerFontSize.value, 10),
          12,
          144,
          18,
        );
        this.setFlashcardSettings({ questionFontSize: q, answerFontSize: a });
        this.applyTypography();
        this.updateTypographyLabels(q, a);
      };

      this.settingsQuestionFontSize.addEventListener("input", onUpdate);
      this.settingsAnswerFontSize.addEventListener("input", onUpdate);
    };

    bindTypography();

    if (this.settingsModeSelect) {
      this.settingsModeSelect.addEventListener("change", () => {
        const mode = this.normalizeMode(this.settingsModeSelect.value);
        this.setMode(mode);
        this.renderSettings();
      });
    }

    if (this.settingsStudyAutoAdvanceSeconds) {
      this.settingsStudyAutoAdvanceSeconds.addEventListener("change", () => {
        const seconds = this.setStudyAutoAdvanceSeconds(
          this.settingsStudyAutoAdvanceSeconds.value,
        );
        this.settingsStudyAutoAdvanceSeconds.value = String(seconds);
      });
    }

    if (this.settingsImportBtn && this.settingsImportInput) {
      this.settingsImportBtn.addEventListener("click", () => {
        this.settingsImportInput.value = "";
        this.settingsImportInput.click();
      });

      this.settingsImportInput.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await this.importCardsFile(file);
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

    if (this.settingsNewSetBtn) {
      this.settingsNewSetBtn.addEventListener("click", () => {
        this.createNewSet();
      });
    }

    if (this.settingsAddCardBtn) {
      this.settingsAddCardBtn.addEventListener("click", () => {
        this.addCardToActiveSet();
      });
    }

    // Inline editor events (delegation)
    this.settingsList.addEventListener("input", (e) => {
      if (this.isDefaultActiveSet()) return;

      if (e.target && e.target.classList?.contains("flashcard-textarea")) {
        this.autoResizeTextarea(e.target);
      }

      const row = e.target.closest(".flashcard-row");
      if (!row) return;

      const cardIndex = Number(row.dataset.index);
      const field = e.target.dataset.field;
      if (!Number.isFinite(cardIndex) || !field) return;

      this.updateCardField(cardIndex, field, e.target.value);
    });

    this.settingsList.addEventListener("click", (e) => {
      if (this.isDefaultActiveSet()) return;
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

    if (this.settingsAddCardBtn) {
      this.settingsAddCardBtn.disabled = this._settingsReadOnly;
      this.settingsAddCardBtn.title = this._settingsReadOnly
        ? "This default set cannot be edited"
        : "Add card";
    }

    // Meta
    const totalCards = active?.cards?.length || 0;
    const totalSets = sets.length;
    if (this.settingsMeta) {
      this.settingsMeta.textContent = `${totalCards} cards • ${totalSets}/${FlashcardManager.MAX_SETS} sets`;
    }

    // Typography
    const t = this.getTypography();
    if (this.settingsQuestionFontSize)
      this.settingsQuestionFontSize.value = String(t.question);
    if (this.settingsAnswerFontSize)
      this.settingsAnswerFontSize.value = String(t.answer);
    this.updateTypographyLabels(t.question, t.answer);
    this.applyTypography();

    if (this.settingsModeSelect) {
      this.settingsModeSelect.value = this.getMode();
    }

    if (this.settingsStudyAutoAdvanceSeconds) {
      this.settingsStudyAutoAdvanceSeconds.value = String(
        this.getStudyAutoAdvanceSeconds(),
      );
    }

    this.renderEditorList();
    this.renderPagination();
  }

  renderEditorList() {
    const active = this.getActiveSet();
    const cards = active?.cards || [];
    const isDefault = this.isProtectedSetId(active?.id);
    const readOnly = this._settingsReadOnly || isDefault;

    if (!this.settingsList) return;

    if (isDefault) {
      this.settingsList.innerHTML = `
        <div class="adhkar-default-notice">
          <div class="adhkar-default-notice-icon">${this._getIcon("🔒", {
            size: 24,
          })}</div>
          <div class="adhkar-default-notice-title">Default Flashcard Set</div>
          <div class="adhkar-default-notice-text">
            This is a protected default set and cannot be edited or deleted.
            Create a custom set to add your own flashcards.
          </div>
          <button class="setting-btn adhkar-default-notice-btn" type="button" id="flashcardsCreateCustomBtn">
            ${this._getIcon("➕", { size: 16 })} Create Custom Set
          </button>
        </div>
      `;

      const createBtn = this.settingsList.querySelector(
        "#flashcardsCreateCustomBtn",
      );
      if (createBtn) {
        createBtn.addEventListener("click", () => this.createNewSet());
      }
      return;
    }

    const total = cards.length;
    const pageSize = this.getSettingsPageSize();
    const pages = Math.max(1, Math.ceil(total / pageSize));
    this.settingsPage = Math.min(Math.max(1, this.settingsPage), pages);

    const start = (this.settingsPage - 1) * pageSize;
    const end = Math.min(total, start + pageSize);

    if (!cards.length) {
      this.settingsList.innerHTML = `
        <div class="quotes-empty">
          <div class="quotes-empty-title">No flashcards in this set</div>
          <div class="quotes-empty-hint">Use “Add Card” or import CSV.</div>
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
          <textarea
            class="flashcard-cell flashcard-textarea setting-input"
            data-field="question"
            rows="1"
            placeholder="Question"
            maxlength="500"
            ${readOnly ? "disabled" : ""}
          >${this.escapeHtmlAttr(c.question || "")}</textarea>
          <textarea
            class="flashcard-cell flashcard-textarea setting-input"
            data-field="answer"
            rows="1"
            placeholder="Answer"
            maxlength="1000"
            ${readOnly ? "disabled" : ""}
          >${this.escapeHtmlAttr(c.answer || "")}</textarea>
          <button
            class="flashcard-row-delete"
            type="button"
            data-action="delete-card"
            title="Delete"
            aria-label="Delete card"
            ${readOnly ? "disabled" : ""}
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

    this.autoResizeAllTextareas();
  }
});

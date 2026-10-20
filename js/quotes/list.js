/**
 * QuotesManager: quote list and pagination rendering.
 * Part of the class declared in js/quotes/index.js; load this after it.
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
})(QuotesManager.prototype, class {

  renderQuotesList() {
    if (!this.quotesListContainer) return;

    this.updateEditorLanguagePickerButton();

    const selectedLang = this.getSelectedEditorLanguageCode();
    const textField = `text_${selectedLang}`;
    const langLabel = selectedLang.toUpperCase();

    const totalPages = Math.max(1, this.getTotalPages());
    this.currentPage = Math.min(Math.max(1, this.currentPage), totalPages);
    const pageSize = this.getEditorPageSize();
    const quotes = this.getPaginatedQuotes();

    // Clear container
    this.quotesListContainer.innerHTML = "";
    this.quotesListContainer.dataset.textField = textField;

    if (this.userQuotes.length === 0) {
      this.quotesListContainer.innerHTML = `
        <div class="quotes-empty">
          <p>No custom quotes yet.</p>
          <p class="quotes-empty-hint">Use Add Quote to create your first row, or import from JSON.</p>
        </div>
      `;
    } else {
      const rows = quotes
        .map((quote, index) => {
          const globalIndex = (this.currentPage - 1) * pageSize + index + 1;
          const localizedText = this.getQuoteLocalizedText(quote, selectedLang);
          const quoteLang = this.getQuoteLanguageCode(quote);
          const isArabic = quoteLang === "ar";

          return `
            <div class="flashcard-row quote-editor-row" data-id="${quote.id}">
              <div class="flashcard-row-index">${globalIndex}</div>
              <textarea
                class="flashcard-cell flashcard-textarea setting-input quote-editor-text ${
                  isArabic ? "arabic-text" : ""
                }"
                data-field="text"
                rows="1"
                placeholder="Quote text (${this.escapeHtml(textField)})"
                maxlength="6000"
              >${this.escapeHtml(localizedText)}</textarea>
              <input
                type="text"
                class="flashcard-cell setting-input quote-editor-source"
                data-field="source"
                placeholder="Source"
                maxlength="500"
                value="${this.escapeHtmlAttr(quote.source || "")}"
              />
              <button
                class="flashcard-row-delete"
                type="button"
                data-action="delete-quote"
                title="Delete"
                aria-label="Delete quote"
              >
                ×
              </button>
            </div>
          `;
        })
        .join("");

      this.quotesListContainer.innerHTML = `
        <div class="flashcard-editor-header quotes-editor-header">
          <div>#</div>
          <div>Text (${langLabel})</div>
          <div>Source</div>
          <div></div>
        </div>
        <div class="flashcard-editor-body quotes-editor-body">
          ${rows}
        </div>
      `;

      this.quotesListContainer
        .querySelectorAll("textarea.quote-editor-text")
        .forEach((textarea) => this.autoResizeEditorTextarea(textarea));
    }

    if (this.quotesListContainer.dataset.editorBound !== "true") {
      this.quotesListContainer.dataset.editorBound = "true";

      this.quotesListContainer.addEventListener("input", (e) => {
        const target = e.target;
        if (!target || !target.classList) return;

        const row = target.closest(".quote-editor-row");
        if (!row) return;

        const quoteId = Number(row.dataset.id);
        if (!Number.isFinite(quoteId)) return;

        const field = target.dataset.field;
        if (!field) return;

        const editorTextField =
          this.quotesListContainer?.dataset?.textField ||
          this.getEditorTextField();
        this.updateUserQuoteField(
          quoteId,
          field,
          target.value,
          editorTextField,
        );

        if (target.classList.contains("quote-editor-text")) {
          this.autoResizeEditorTextarea(target);
        }
      });

      this.quotesListContainer.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn || btn.dataset.action !== "delete-quote") return;

        const row = btn.closest(".quote-editor-row");
        if (!row) return;
        const quoteId = Number(row.dataset.id);
        if (!Number.isFinite(quoteId)) return;

        if (confirm("Delete this quote?")) {
          this.deleteUserQuote(quoteId);
        }
      });
    }

    // Render pagination
    this.renderPagination(totalPages);
  }

  renderPagination(totalPages) {
    if (!this.paginationContainer) return;

    if (totalPages <= 1) {
      this.paginationContainer.innerHTML = "";
      return;
    }

    let paginationHtml = `
      <button class="pagination-btn" data-page="prev" ${
        this.currentPage === 1 ? "disabled" : ""
      }>
        ‹ Prev
      </button>
      <span class="pagination-info">Page ${
        this.currentPage
      } / ${totalPages}</span>
    `;

    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      paginationHtml += `<button class="pagination-btn" data-page="1">1</button>`;
      if (startPage > 2) {
        paginationHtml += `<span class="pagination-ellipsis">...</span>`;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationHtml += `
        <button class="pagination-btn ${
          i === this.currentPage ? "active" : ""
        }" data-page="${i}">
          ${i}
        </button>
      `;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        paginationHtml += `<span class="pagination-ellipsis">...</span>`;
      }
      paginationHtml += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    paginationHtml += `
      <button class="pagination-btn" data-page="next" ${
        this.currentPage === totalPages ? "disabled" : ""
      }>
        Next ›
      </button>
    `;

    this.paginationContainer.innerHTML = paginationHtml;

    // Bind pagination buttons
    this.paginationContainer
      .querySelectorAll(".pagination-btn")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const page = btn.dataset.page;
          if (page === "prev") {
            this.goToPage(this.currentPage - 1);
          } else if (page === "next") {
            this.goToPage(this.currentPage + 1);
          } else {
            this.goToPage(parseInt(page));
          }
        });
      });
  }
});

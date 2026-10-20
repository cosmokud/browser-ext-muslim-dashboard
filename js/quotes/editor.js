/**
 * QuotesManager: user quote editing and paging.
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

  addUserQuote(text, source, languageCode = "en") {
    const normalizedLang = this.normalizeLanguageCode(languageCode) || "en";
    const textField = `text_${normalizedLang}`;
    const quote = {
      id: Date.now() + Math.floor(Math.random() * 1000000),
      source: source.trim(),
      type: "user",
      [textField]: text.trim(),
    };

    this.userQuotes = this.normalizeUserQuotes([...this.userQuotes, quote]);
    this.storage.saveUserQuotes(this.userQuotes);

    // Jump to the last page so the newly added quote is visible
    this.currentPage = Math.max(1, this.getTotalPages());
    this.renderQuotesList();
    return quote;
  }

  addEmptyUserQuote(languageCode = "en") {
    const normalizedLang = this.normalizeLanguageCode(languageCode) || "en";
    const textField = `text_${normalizedLang}`;
    const quote = {
      id: Date.now() + Math.floor(Math.random() * 1000000),
      source: "",
      type: "user",
      [textField]: "",
    };

    this.userQuotes.push(quote);
    this.storage.saveUserQuotes(this.userQuotes);

    this.currentPage = Math.max(1, this.getTotalPages());
    this.renderQuotesList();
    this.focusQuoteEditorTextField(quote.id);

    return quote;
  }

  updateUserQuote(id, { text, source, textField }) {
    const quote = this.userQuotes.find((q) => q.id === id);
    if (!quote) return false;

    const nextText = String(text ?? "").trim();
    const nextSource = String(source ?? "").trim();
    const requestedField = String(textField || "")
      .trim()
      .toLowerCase();
    const targetField = /^text_[a-z0-9-]+$/i.test(requestedField)
      ? requestedField
      : this.getEditorTextField();

    if (!nextText) {
      alert("Quote text cannot be empty");
      return false;
    }
    if (!nextSource) {
      alert("Quote source cannot be empty");
      return false;
    }

    quote[targetField] = nextText;
    quote.source = nextSource;
    delete quote.text;
    delete quote.isArabic;

    this.userQuotes = this.normalizeUserQuotes(this.userQuotes);
    this.storage.saveUserQuotes(this.userQuotes);
    return true;
  }

  updateUserQuoteField(id, field, value, textField) {
    const quote = this.userQuotes.find((q) => q.id === id);
    if (!quote) return;

    if (field === "source") {
      quote.source = String(value ?? "");
    } else if (field === "text") {
      const targetField = /^text_[a-z0-9-]+$/i.test(String(textField || ""))
        ? String(textField).toLowerCase()
        : this.getEditorTextField();
      quote[targetField] = String(value ?? "");
      delete quote.text;
      delete quote.isArabic;
    }

    quote.type = String(quote.type || "user").trim() || "user";
    this.scheduleEditorSave();
  }

  scheduleEditorSave() {
    if (this._editorSaveTimer) {
      clearTimeout(this._editorSaveTimer);
    }

    this._editorSaveTimer = setTimeout(() => {
      this._editorSaveTimer = null;
      this.storage.saveUserQuotes(this.userQuotes);
    }, 250);
  }

  autoResizeEditorTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  focusQuoteEditorTextField(quoteId) {
    if (!this.quotesListContainer) return;

    requestAnimationFrame(() => {
      const row = this.quotesListContainer.querySelector(
        `.quote-editor-row[data-id="${quoteId}"]`,
      );
      const input = row?.querySelector('.quote-editor-text[data-field="text"]');
      if (!input) return;

      input.focus();
      const length = String(input.value || "").length;
      try {
        input.setSelectionRange(length, length);
      } catch (e) {
        // ignore browsers that don't support setSelectionRange for this input type
      }
    });
  }

  deleteUserQuote(id) {
    this.userQuotes = this.userQuotes.filter((q) => q.id !== id);
    this.storage.saveUserQuotes(this.userQuotes);

    // Adjust current page if needed
    const totalPages = Math.ceil(
      this.userQuotes.length / this.getEditorPageSize(),
    );
    if (this.currentPage > totalPages && totalPages > 0) {
      this.currentPage = totalPages;
    }

    this.renderQuotesList();
  }

  getUserQuotes() {
    return this.userQuotes;
  }

  getPaginatedQuotes() {
    const pageSize = this.getEditorPageSize();
    const startIndex = (this.currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return this.userQuotes.slice(startIndex, endIndex);
  }

  getTotalPages() {
    return Math.ceil(this.userQuotes.length / this.getEditorPageSize());
  }

  isEditorDetached() {
    const group = document.getElementById("quotesEditorGroup");
    return !!group?.closest(".editor-detach-modal.active");
  }

  getEditorPageSize() {
    return 10;
  }

  goToPage(page) {
    const totalPages = this.getTotalPages();
    if (page >= 1 && page <= totalPages) {
      this.currentPage = page;
      this.renderQuotesList();
    }
  }
});

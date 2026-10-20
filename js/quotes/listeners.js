/**
 * QuotesManager: quote event listeners.
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

  setupEventListeners() {
    // Quote navigation buttons
    if (this.quotePrev) {
      this.quotePrev.addEventListener("click", () => {
        this.showPreviousQuote();
      });
    }

    if (this.quoteNext) {
      this.quoteNext.addEventListener("click", () => {
        this.showNextQuote();
      });
    }

    if (
      this.quoteSection &&
      this.quoteSection.dataset.autoRotateHoverBound !== "true"
    ) {
      this.quoteSection.dataset.autoRotateHoverBound = "true";

      this.quoteSection.addEventListener("mouseenter", () => {
        this._hoverPauseAutoRotate = true;
        this.stopAutoRotate();
      });

      this.quoteSection.addEventListener("mouseleave", () => {
        this._hoverPauseAutoRotate = false;
        this.startAutoRotate();
      });
    }

    // Export button
    if (this.exportBtn) {
      this.exportBtn.addEventListener("click", () => {
        if (this.userQuotes.length === 0) {
          alert("No quotes to export");
          return;
        }
        this.exportQuotes();
      });
    }

    // Import button
    if (this.importBtn) {
      this.importBtn.addEventListener("click", () => {
        if (this.importInput) {
          this.importInput.click();
        }
      });
    }

    // Import file input
    if (this.importInput) {
      this.importInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const count = await this.importQuotes(file);
          alert(`Successfully imported ${count} quotes`);
        } catch (error) {
          alert("Import failed: " + error.message);
        }

        // Reset input
        this.importInput.value = "";
      });
    }

    if (this.addItemBtn) {
      this.addItemBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.addEmptyUserQuote(this.getSelectedEditorLanguageCode());
      });
    }

    if (this.editorLangPickerBtn) {
      this.editorLangPickerBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.openLanguageSelectorModal("editor");
      });
    }

    // React to settings changes (e.g., disabling default quotes)
    if (document && typeof document.addEventListener === "function") {
      document.addEventListener("md:settings-applied", () => {
        this.updateLanguageSelectorButton();
        this.updateEditorLanguagePickerButton();
        this.syncQuoteBehaviorFromSettings({ applyTimer: true });
      });
    }
  }
});

/**
 * SettingsManager: tab switching, modal helpers and save state.
 * Part of the class declared in js/settings/index.js; load this after it.
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
})(SettingsManager.prototype, class {

  openModal() {
    this.loadSettings();
    this.resetSaveButtonState();
    if (this.quotes) {
      this.quotes.renderQuotesList();
    }
    if (this.flashcards) {
      this.flashcards.renderSettings();
    }
    if (this.hadith) {
      this.hadith.renderSettings();
    }
    if (this.adhkar) {
      this.adhkar.renderSettings();
    }
    if (this.modal) {
      this.modal.classList.add("active");
    }

    this.resetSettingsSearch();

    this.updateSettingsRangeProgress();

    this.updateSettingsTabsMinWidth();
    this.updateSettingsVisualPreviewMode(this.getActiveSettingsTabName());
  }

  closeModal() {
    if (this._saveSettingsCloseTimer) {
      clearTimeout(this._saveSettingsCloseTimer);
      this._saveSettingsCloseTimer = null;
    }
    this.resetSaveButtonState();
    this.updateSettingsVisualPreviewMode(null);
    this.flushPendingAutoSaveBeforeClose();
    this.closeDetachedEditorModal();
    this.closeChangelogModal();
    this.resetBackgroundThumbObserver();
    this.clearBackgroundThumbBlobUrlCache();

    if (this.modal) {
      this.modal.classList.remove("active");
    }
    // Restore dashboard layout in case user made a live preview
    if (
      window.dashboard &&
      typeof window.dashboard.applyComponentVisibility === "function"
    ) {
      try {
        window.dashboard.applyComponentVisibility();
      } catch (e) {
        // ignore
      }
    }
  }

  switchTab(tabName) {
    if (tabName === "debug" && !this.debugEnabled) return;

    const activeTab = Array.from(this.tabs || []).find(
      (tab) => tab.dataset.tab === tabName,
    );

    // Update tabs
    this.tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === tabName);
    });

    // Keep the active tab visible in the (horizontally scrollable) tab strip.
    activeTab?.scrollIntoView?.({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });

    // Update panels
    this.panels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === `${tabName}Panel`);
    });

    if (tabName === "flashcards" && this.flashcards) {
      this.flashcards.renderSettings();
    }

    if (tabName === "hadith" && this.hadith) {
      this.hadith.renderSettings();
    }

    if (tabName === "adhkar" && this.adhkar) {
      this.adhkar.renderSettings();
    }

    if (tabName === "notes") {
      this.updateNotesCountHint();
    }

    const activePanel = document.getElementById(`${tabName}Panel`);
    this.updateSettingsRangeProgress(activePanel);
    this.updateSettingsVisualPreviewMode(tabName);
  }

  getActiveSettingsTabName() {
    const activeTab = Array.from(this.tabs || []).find((tab) =>
      tab.classList.contains("active"),
    );
    return activeTab?.dataset?.tab || null;
  }

  isVisualPreviewSettingsTab(tabName) {
    return ["background", "heading", "themes"].includes(tabName);
  }

  updateSettingsVisualPreviewMode(tabName) {
    if (!this.modal) return;

    const enabled =
      this.modal.classList.contains("active") &&
      this.isVisualPreviewSettingsTab(tabName);

    this.modal.classList.toggle("settings-visual-preview", enabled);
  }

  resetSaveButtonState() {
    if (!this.saveBtn) return;

    if (this._saveButtonSavedTimer) {
      clearTimeout(this._saveButtonSavedTimer);
      this._saveButtonSavedTimer = null;
    }

    if (!this.saveBtn.dataset.defaultLabel) {
      this.saveBtn.dataset.defaultLabel =
        this.saveBtn.textContent.trim() || "💾 Save Settings";
    }

    this.saveBtn.classList.remove("is-saved");
    this.saveBtn.textContent = this.saveBtn.dataset.defaultLabel;
  }

  showSaveButtonSavedState() {
    if (!this.saveBtn) return;

    if (!this.saveBtn.dataset.defaultLabel) {
      this.saveBtn.dataset.defaultLabel =
        this.saveBtn.textContent.trim() || "💾 Save Settings";
    }

    if (this._saveButtonSavedTimer) {
      clearTimeout(this._saveButtonSavedTimer);
    }

    this.saveBtn.classList.add("is-saved");
    this.saveBtn.textContent = "✓ Saved";
    this.saveBtn.setAttribute("aria-live", "polite");

    this._saveButtonSavedTimer = setTimeout(() => {
      this._saveButtonSavedTimer = null;
      if (!this.modal?.classList.contains("active")) return;
      this.saveBtn.classList.remove("is-saved");
      this.saveBtn.textContent = this.saveBtn.dataset.defaultLabel;
    }, 1600);
  }
});

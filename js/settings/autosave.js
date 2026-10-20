/**
 * SettingsManager: autosave debounce and flush.
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

  isAutoSaveTarget(target) {
    if (!(target instanceof Element)) {
      return false;
    }

    if (!this.modal || !this.modal.contains(target)) {
      return false;
    }

    const isFormControl =
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement;

    if (!isFormControl) {
      return false;
    }

    if (target.id === "settingsSearchInput") {
      return false;
    }

    if (target instanceof HTMLInputElement) {
      const type = String(target.type || "").toLowerCase();
      if (
        type === "button" ||
        type === "submit" ||
        type === "reset" ||
        type === "file" ||
        type === "image"
      ) {
        return false;
      }
    }

    return true;
  }

  runAutoSave() {
    if (this._isAutoSaving) {
      this._autoSaveQueued = true;
      return;
    }

    this._isAutoSaving = true;
    try {
      this.saveSettings({
        source: "auto",
        showToast: false,
        closeModal: false,
        showValidationErrors: false,
      });
    } finally {
      this._isAutoSaving = false;

      if (this._autoSaveQueued) {
        this._autoSaveQueued = false;
        this.scheduleAutoSave(120);
      }
    }
  }

  scheduleAutoSave(delayMs = 280) {
    if (!this.modal?.classList.contains("active")) {
      return;
    }

    if (this._autoSaveTimer) {
      clearTimeout(this._autoSaveTimer);
    }

    const safeDelay = this.clampNumber(delayMs, 0, 5000, 280);
    this._autoSaveTimer = setTimeout(() => {
      this._autoSaveTimer = null;
      this.runAutoSave();
    }, safeDelay);
  }

  clearScheduledAutoSave() {
    if (this._autoSaveTimer) {
      clearTimeout(this._autoSaveTimer);
      this._autoSaveTimer = null;
    }
    this._autoSaveQueued = false;
  }

  flushPendingAutoSaveBeforeClose() {
    const hadScheduledSave = !!this._autoSaveTimer;
    const hadQueuedSave = this._autoSaveQueued === true;

    this.clearScheduledAutoSave();

    if (!this.modal?.classList.contains("active")) {
      return;
    }

    if (!hadScheduledSave && !hadQueuedSave) {
      return;
    }

    if (this._isAutoSaving) {
      return;
    }

    try {
      this.runAutoSave();
    } catch (e) {
      // ignore close-path autosave failures
    }
  }

  setupSettingsAutoSaveListeners() {
    if (!this.modal || this.modal.dataset.autoSaveBound === "1") {
      return;
    }

    this.modal.dataset.autoSaveBound = "1";

    this.modal.addEventListener("input", (event) => {
      const target = event.target;
      if (!this.isAutoSaveTarget(target)) {
        return;
      }

      const delay =
        target instanceof HTMLInputElement &&
        (target.type === "range" || target.type === "number")
          ? 200
          : 380;

      this.scheduleAutoSave(delay);
    });

    this.modal.addEventListener("change", (event) => {
      if (!this.isAutoSaveTarget(event.target)) {
        return;
      }

      this.scheduleAutoSave(120);
    });
  }
});

/**
 * GridLayoutManager: edit mode keys and quran focus flag.
 * Part of the class declared in js/gridlayout/index.js; load this after it.
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
})(GridLayoutManager.prototype, class {

  getMainEditModeStorageKey() {
    return "gridEditModeEnabled";
  }

  getFocusEditModeStorageKey() {
    return "gridEditModeEnabledQuranFocus";
  }

  isQuranFocusModeContextActive() {
    // The app notifies this grid when it switches layouts; the module is the
    // second opinion, so neither side alone has to be trusted.
    return (
      this.isQuranFocusModeContext ||
      this.modes?.isActive?.("quranFocus") === true
    );
  }

  getEditModeStorageKey() {
    return this.isQuranFocusModeContextActive()
      ? this.getFocusEditModeStorageKey()
      : this.getMainEditModeStorageKey();
  }

  setQuranFocusModeActive(active) {
    this.isQuranFocusModeContext = active === true;

    // In focus mode, keep main-container resize state off so only
    // Pocket Quran width handles remain interactive.
    if (this.isQuranFocusModeContext) {
      this.endMiddleLayoutResize();
    }

    if (!this.isQuranFocusModeContext) {
      const pocketQuranCard = document.getElementById("pocketQuranCard");
      this.clearQuranFocusFloatingWidthStyles(pocketQuranCard);
    }

    // Focus mode and main layout keep separate edit-mode state.
    const settings = this.storage.getSettings();
    const editModeStorageKey = this.getEditModeStorageKey();
    if (this.isQuranFocusModeContext) {
      settings[editModeStorageKey] = false;
      this.storage.saveSettings(settings);
      this.modes.exit("edit");
    } else {
      this.modes.set("edit", settings[editModeStorageKey] === true);
    }

    const toggleBtn = document.getElementById("layoutEditBtn");
    this.updateEditModeUI(toggleBtn);
    this.clearSidebarDropTarget();
  }
});

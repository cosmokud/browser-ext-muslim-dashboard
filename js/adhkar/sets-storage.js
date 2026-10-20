/**
 * AdhkarManager: set storage and active set.
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

  _updateSetSelectorIcon() {
    if (this._setModalBtn) {
      this._setModalBtn.innerHTML = this._getIcon("📚", { size: 18 });
    }
  }

  _updateSetModalIcons() {
    if (this._setModal) {
      const titleEl = this._setModal.querySelector(".adhkar-set-modal-title");
      if (titleEl) {
        titleEl.innerHTML = `${this._getIcon("📚", {
          size: 20,
        })} Select Adhkar Set`;
      }

      if (this._setModal.classList.contains("active")) {
        this.renderSetSelectorModal();
      }
    }
  }

  async init() {
    await this.ensureDefaultSets();
    this.applyArabicFontFamily(this.getAdhkarSettings().arabicFontFamily, {
      persist: false,
    });
    this.applyTranslationFontFamily(
      this.getAdhkarSettings().translationFontFamily,
      { persist: false },
    );
    this.applyTypography();
    this.createSetSelectorButton();
    this.createSetSelectorModal();
    this.createLanguageSelectorButton();
    this.createLanguageSelectorModal();
    this.createFontPickerModal();
    this.bindDashboardEvents();
    this.restoreCurrentCardIndexForActiveSet();
    this.renderDashboard();
    this.ensureAutoAdvanceState({ reset: true });
  }

  getStoredCustomSets() {
    const stored = this.storage.get("adhkarSets", []);
    if (!Array.isArray(stored)) return [];
    return stored.filter((set) => set && !this.isProtectedSetId(set.id));
  }

  getSets() {
    const defaults = Array.isArray(this.defaultSets) ? this.defaultSets : [];
    const customSets = this.getStoredCustomSets();
    const merged = [...defaults, ...customSets];
    const byId = new Map();

    for (const set of merged) {
      const id = String(set?.id || "");
      if (!id) continue;
      byId.set(id, set);
    }

    return [...byId.values()];
  }

  saveSets(sets) {
    const customSets = Array.isArray(sets)
      ? sets.filter((set) => set && !this.isProtectedSetId(set.id))
      : [];
    return this.storage.set("adhkarSets", customSets);
  }

  getAdhkarSettings() {
    const settings = this.storage.getSettings();
    const adhkar = settings.adhkar || {};
    return adhkar;
  }

  setAdhkarSettings(updates) {
    const settings = this.storage.getSettings();
    const current = settings.adhkar || {};
    settings.adhkar = { ...current, ...updates };
    this.storage.saveSettings(settings);
  }

  getActiveSetId() {
    return this.getAdhkarSettings().activeSetId || null;
  }

  setActiveSetId(setId) {
    this.setAdhkarSettings({ activeSetId: setId });
  }

  getActiveSet() {
    const sets = this.getSets();
    const activeId = this.getActiveSetId();
    if (!sets.length) return null;
    return sets.find((s) => s.id === activeId) || sets[0];
  }
});

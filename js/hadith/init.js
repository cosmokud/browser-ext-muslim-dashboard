/**
 * HadithManager: set selector icons and boot.
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

  _updateSetSelectorIcon() {
    if (this._setModalBtn) {
      this._setModalBtn.innerHTML = this._getIcon("📚", { size: 18 });
    }
  }

  _updateSetModalIcons() {
    if (this._setModal) {
      const titleIcon = this._setModal.querySelector(
        ".hadith-set-modal-title span[aria-hidden]",
      );
      if (titleIcon) {
        titleIcon.innerHTML = this._getIcon("📚", { size: 20 });
      }

      if (this._setModal.classList.contains("active")) {
        this.renderSetSelectorModal();
      }
    }
  }

  async init() {
    await this.ensureDefaultSets();
    this.applyArabicFontFamily(this.getHadithSettings().arabicFontFamily, {
      persist: false,
    });
    this.applyTranslationFontFamily(
      this.getHadithSettings().translationFontFamily,
      { persist: false },
    );
    this.applyTypography();
    this.createLanguageSelectorButton();
    this.createLanguageSelectorModal();
    this.createSetSelectorButton();
    this.createSetSelectorModal();
    this.bindDashboardEvents();
    this.restoreCurrentCardIndexForActiveSet();
    this.renderDashboard();
    this.ensureAutoAdvanceState({ reset: true });
  }
});

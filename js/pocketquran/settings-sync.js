/**
 * PocketQuranManager: reacting to applied settings.
 * Part of the class declared in js/pocketquran/index.js; load this after it.
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
})(PocketQuranManager.prototype, class {

  handleSettingsApplied(settings) {
    const normalized =
      settings && typeof settings === "object"
        ? settings
        : this.storage.getSettings();
    const pq = normalized?.pocketQuran || {};

    this.applyArabicFontFamily(pq.arabicFontFamily, {
      persist: false,
      recalculate: true,
    });
    this.applyTranslationFontFamily(pq.translationFontFamily, {
      persist: false,
      recalculate: true,
    });
    this.applyTextVisibility(pq.showArabicText, pq.showTranslationText, {
      persist: false,
      recalculate: true,
      allowBothOff: false,
    });

    this._recitationFloatingEnabled = pq.recitationFloatingEnabled === true;
    this._recitationAutoDockOnVisible = pq.recitationAutoDockOnVisible === true;
    this._isRecitationHighlighterEnabled = pq.reciterHighlighter !== false;
    this._recitationWordHighlightLagMs =
      this.normalizeRecitationHighlightDelayMs(pq.reciterHighlighterDelayMs);
    this._recitationFloatingAppearance =
      this.normalizeRecitationFloatingAppearance(
        pq.recitationFloatingAppearance,
      );

    if (!this._recitationFloatingEnabled) {
      this.unwatchRecitationControlsVisibility();
      if (
        this._recitationFloatingMode &&
        this._recitationFloatingModeReason === "auto"
      ) {
        this.disableRecitationFloating({ preserveManualOnly: false });
      }
    } else if (this._headerControlsBox && !this._recitationFloatingMode) {
      this.watchRecitationControlsVisibility();
      this.maybeAutoFloatRecitationControls();
    }

    if (this._recitationFloatingMode && this._recitationAutoDockOnVisible) {
      this.watchRecitationAutoDockVisibility();
    } else {
      this.unwatchRecitationAutoDockVisibility();
    }

    this.syncRecitationFloatingAppearanceClass();
    this.updateRecitationFloatingButtons();
  }
});

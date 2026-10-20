/**
 * PocketQuranManager: pocket quran settings persistence and fonts.
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

  persistPocketQuranSettings(patch) {
    const settings = this.storage.getSettings();
    const nextPocketQuran = {
      ...(settings.pocketQuran || {}),
      ...(patch || {}),
    };

    const normalizedVisibility = this.normalizeTextVisibilityState(
      nextPocketQuran.showArabicText,
      nextPocketQuran.showTranslationText,
      false,
    );
    nextPocketQuran.showArabicText = normalizedVisibility.showArabicText;
    nextPocketQuran.showTranslationText =
      normalizedVisibility.showTranslationText;

    settings.pocketQuran = nextPocketQuran;
    this.storage.saveSettings(settings);
  }

  normalizeCssHexColor(value, fallback) {
    const v = String(value || "").trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) return v;
    if (/^#[0-9a-f]{3}$/i.test(v)) return v;
    return fallback;
  }

  normalizeArabicFontFamily(value) {
    const v = String(value || "").trim();
    if (PocketQuranManager.ARABIC_FONT_FAMILIES.includes(v)) return v;
    return "KFGQPC Uthman Taha Naskh";
  }

  normalizeTranslationFontFamily(value) {
    const v = String(value || "").trim();
    if (PocketQuranManager.TRANSLATION_FONT_FAMILIES.includes(v)) return v;
    return "Poppins";
  }

  resolveTranslationFontCssValue(fontFamily) {
    if (fontFamily === "Georgia") {
      return '"Georgia", serif';
    }
    if (fontFamily === "Courier New") {
      return '"Courier New", monospace';
    }
    if (fontFamily === "Cascadia Code") {
      return '"Cascadia Code", "JetBrains Mono", Consolas, monospace';
    }
    return `"${fontFamily}", var(--font-primary)`;
  }

  applyArabicFontFamily(fontFamily, opts = {}) {
    const { persist = false, recalculate = true } = opts;

    const normalized = this.normalizeArabicFontFamily(fontFamily);
    const previous = this._arabicFontFamily;
    const fontChanged = previous !== normalized;
    this._arabicFontFamily = normalized;

    if (this.card) {
      const cssValue = `"${normalized}", var(--font-arabic)`;
      this.card.style.setProperty("--pq-arabic-font-family", cssValue);
    }

    if (this.fontToggleBtn) {
      this.fontToggleBtn.title = `Change Arabic font (current: ${normalized})`;
    }

    this.syncTajweedAvailabilityForFont();

    if (recalculate && fontChanged) {
      this._ayahHeights.clear();
      this.recalculateVirtualization();
    }

    if (persist) {
      this.persistPocketQuranSettings({ arabicFontFamily: normalized });
    }

    if (fontChanged) {
      try {
        document.dispatchEvent(
          new CustomEvent("md:pq-arabic-font-selected", {
            detail: { fontFamily: normalized },
          }),
        );
      } catch (e) {}
    }
  }

  applyTranslationFontFamily(fontFamily, opts = {}) {
    const { persist = false, recalculate = true } = opts;

    const normalized = this.normalizeTranslationFontFamily(fontFamily);
    const previous = this._translationFontFamily;
    const fontChanged = previous !== normalized;
    this._translationFontFamily = normalized;

    if (this.card) {
      this.card.style.setProperty(
        "--pq-translation-font-family",
        this.resolveTranslationFontCssValue(normalized),
      );
    }

    if (recalculate && fontChanged) {
      this._ayahHeights.clear();
      this.recalculateVirtualization();
    }

    if (persist) {
      this.persistPocketQuranSettings({ translationFontFamily: normalized });
    }

    if (fontChanged) {
      try {
        document.dispatchEvent(
          new CustomEvent("md:pq-translation-font-selected", {
            detail: { fontFamily: normalized },
          }),
        );
      } catch (e) {}
    }
  }
});

/**
 * SettingsManager: quran and notes font families.
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

  normalizePocketQuranArabicFontFamily(value) {
    const normalized = String(value || "").trim();
    if (
      SettingsManager.POCKET_QURAN_ARABIC_FONT_FAMILIES.includes(normalized)
    ) {
      return normalized;
    }
    return "KFGQPC Uthman Taha Naskh";
  }

  normalizePocketQuranTranslationFontFamily(value) {
    const normalized = String(value || "").trim();
    if (
      SettingsManager.POCKET_QURAN_POPUP_TRANSLATION_FONT_FAMILIES.includes(
        normalized,
      )
    ) {
      return normalized;
    }
    return "Poppins";
  }

  normalizePocketQuranPopupTranslationFontFamily(value) {
    const normalized = String(value || "").trim();
    if (
      SettingsManager.POCKET_QURAN_POPUP_TRANSLATION_FONT_FAMILIES.includes(
        normalized,
      )
    ) {
      return normalized;
    }
    return "Poppins";
  }

  normalizeNotesCardFontFamily(value) {
    const normalized = String(value || "").trim();
    if (SettingsManager.NOTES_CARD_FONT_FAMILIES.includes(normalized)) {
      return normalized;
    }
    return "Poppins";
  }

  applyNotesCardFontFamily(fontFamily) {
    const normalized = this.normalizeNotesCardFontFamily(fontFamily);
    const notesCard = document.getElementById("notesCard");

    if (!notesCard) return normalized;

    let cssValue = `"${normalized}", var(--font-primary)`;
    if (normalized === "Georgia") {
      cssValue = '"Georgia", serif';
    } else if (normalized === "Courier New") {
      cssValue = '"Courier New", monospace';
    } else if (normalized === "Cascadia Code") {
      cssValue = '"Cascadia Code", "JetBrains Mono", Consolas, monospace';
    }

    notesCard.style.setProperty("--notes-card-font-family", cssValue);

    if (this.notesCardFontFamily) {
      this.notesCardFontFamily.value = normalized;
    }

    return normalized;
  }
});

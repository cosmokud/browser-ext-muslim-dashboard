/**
 * PocketQuranManager: html stripping and small normalizers.
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

  stripHtmlToText(html) {
    try {
      const div = document.createElement("div");
      div.innerHTML = String(html || "");

      // Remove footnote elements (usually <sup> tags with footnote markers)
      // quran.com API uses <sup foot_note="..."> for footnotes
      const footnotes = div.querySelectorAll(
        "sup[foot_note], sup.foot_note, sup",
      );
      footnotes.forEach((fn) => fn.remove());

      return (div.textContent || "").replace(/\s+/g, " ").trim();
    } catch (e) {
      return String(html || "")
        .replace(/<sup[^>]*>.*?<\/sup>/gi, "") // Remove sup tags and their content
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  normalizeTranslationId(value) {
    const n = parseInt(value, 10);
    if (Number.isFinite(n) && PocketQuranManager.TRANSLATIONS[n]) return n;
    return 85;
  }

  normalizeRecitationFloatingAppearance(value) {
    return value === "theme" ? "theme" : "opaque";
  }

  clampNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  normalizeTextVisibilityState(
    showArabicText,
    showTranslationText,
    allowBothOff = false,
  ) {
    const normalized = {
      showArabicText: showArabicText !== false,
      showTranslationText: showTranslationText !== false,
    };

    if (
      allowBothOff ||
      normalized.showArabicText ||
      normalized.showTranslationText
    ) {
      return normalized;
    }

    return {
      showArabicText: true,
      showTranslationText: false,
    };
  }
});

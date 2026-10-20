/**
 * The text that lands on the clipboard when an ayah is copied.
 *
 * Pure: it takes the parts it needs and returns a string, so the rule can be
 * tested without a reader, a renderer or a settings blob.
 */
(function () {
  "use strict";

  // The outer quotes around the translation are ours, so a quoted word inside
  // it becomes single quotes instead of closing them early.
  function quoteSafe(text) {
    return String(text || "")
      .replace(/"/g, "'")
      .replace(/“/g, "‘")
      .replace(/”/g, "’");
  }

  /**
   * @param {object} ayah
   * @param {string} ayah.arabic - The ayah's own text, copied above when asked.
   * @param {string} ayah.translation - Already stripped of markup.
   * @param {string} ayah.reference - "(Surah name surah:ayah)", written as given.
   * @param {boolean} ayah.includeArabic - Copy the Arabic line as well.
   */
  function ayahText({ arabic, translation, reference, includeArabic } = {}) {
    const translationLine = `"${quoteSafe(String(translation || "").trim())}" ${reference}`;
    const arabicText = String(arabic || "").trim();

    if (includeArabic === true && arabicText) {
      return `${arabicText}\n${translationLine}`;
    }

    return translationLine;
  }

  globalThis.QuranCopy = { quoteSafe, ayahText };
})();

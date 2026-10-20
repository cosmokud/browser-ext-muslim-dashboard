/**
 * The Arabic text rules the reader's word spans and word matching depend on.
 *
 * Pure: strings in, strings out. The reader keeps the DOM and the ayah-number
 * marker rule, which is about digits rather than letters.
 */
(function () {
  "use strict";

  // Bidi marks and the tatweel are invisible; the combining marks and small
  // high marks are vowel signs that word matching must ignore.
  const INVISIBLE = /[\u061c\u200e\u200f]/g;
  const MARKS = /[\u0640\u064b-\u065f\u0670\u06d6-\u06ed]/g;

  /** A word with its harakat and alef variants folded, for comparison. */
  function normalizeWord(text) {
    return String(text || "")
      .normalize("NFKD")
      .replace(INVISIBLE, "")
      .replace(MARKS, "")
      .replace(/[إأآٱٲ]/g, "ا")
      .replace(/\s+/g, "")
      .trim();
  }

  function isCombiningMark(char) {
    return /^[\u064b-\u065f\u0670\u06d6-\u06ed]$/.test(String(char || ""));
  }

  /**
   * Splits text into clusters: a letter with the marks that sit on it. Styled
   * chunks have to be cut on these, never inside them, or a vowel sign ends up
   * in a different word than its letter.
   */
  function clusters(text) {
    const list = [];
    Array.from(String(text || "")).forEach((char) => {
      if (isCombiningMark(char) && list.length) {
        list[list.length - 1] += char;
      } else {
        list.push(char);
      }
    });
    return list;
  }

  globalThis.QuranArabic = { normalizeWord, isCombiningMark, clusters };
})();

/**
 * The recitation highlighter's rules: what the timing data means and which
 * word is being recited right now.
 *
 * Pure: it takes the segments and a time in milliseconds. The reader keeps the
 * audio element, the cache and the DOM.
 */
(function () {
  "use strict";

  const MAX_LAG_MS = 10000;

  /**
   * The API sends a segment as [wordStart, wordEnd, fromMs, toMs]; the cache
   * stores the object form. Both are accepted, and unusable entries dropped.
   */
  function normalizeSegments(segments) {
    if (!Array.isArray(segments)) return [];

    return segments
      .map((segment) => {
        const source = Array.isArray(segment)
          ? {
              wordStart: segment[0],
              wordEnd: segment[1],
              fromMs: segment[2],
              toMs: segment[3],
            }
          : segment;
        if (!source || typeof source !== "object") return null;

        const wordStart = parseInt(source.wordStart, 10);
        const wordEnd = parseInt(source.wordEnd, 10);
        const fromMs = Number(source.fromMs);
        const toMs = Number(source.toMs);

        if (
          !Number.isFinite(wordStart) ||
          !Number.isFinite(wordEnd) ||
          !Number.isFinite(fromMs) ||
          !Number.isFinite(toMs) ||
          wordEnd <= wordStart ||
          toMs < fromMs
        ) {
          return null;
        }

        return { wordStart, wordEnd, fromMs, toMs };
      })
      .filter(Boolean);
  }

  /** A positive lag moves the highlight forward; the clamp keeps it sane. */
  function lagMs(value) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(-MAX_LAG_MS, Math.min(MAX_LAG_MS, parsed));
  }

  /** The segment being recited at this instant, or null between words. */
  function segmentAt(segments, currentMs) {
    return (
      normalizeSegments(segments).find(
        (segment) => currentMs >= segment.fromMs && currentMs <= segment.toMs,
      ) || null
    );
  }

  /**
   * The reader numbers words from 1, and a segment names the word that opens it
   * plus the last word it covers, so the range is (wordStart, wordEnd].
   */
  function coversWord(segment, wordIndex) {
    if (!segment || !Number.isFinite(wordIndex)) return false;
    return wordIndex > segment.wordStart && wordIndex <= segment.wordEnd;
  }

  function keyFor(verseKey, segment) {
    if (!segment) return "";
    return `${verseKey}:${segment.wordStart}-${segment.wordEnd}`;
  }

  globalThis.QuranRecitation = {
    normalizeSegments,
    lagMs,
    segmentAt,
    coversWord,
    keyFor,
  };
})();

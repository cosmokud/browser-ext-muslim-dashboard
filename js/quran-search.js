/**
 * How a search query becomes an API request and how the verses that come back
 * become results.
 *
 * Pure: no network, no DOM, no reader. The reader passes in its cleaner and its
 * API base, so the rules can be checked without either.
 */
(function () {
  "use strict";

  // The API searches within a language, and the reader stores a language name
  // per translation, so the name is what crosses this seam.
  const LANGUAGE_CODES = {
    albanian: "sq",
    amazigh: "zgh",
    arabic: "ar",
    azerbaijani: "az",
    bengali: "bn",
    bosnian: "bs",
    chinese: "zh",
    czech: "cs",
    dutch: "nl",
    english: "en",
    french: "fr",
    german: "de",
    hausa: "ha",
    hindi: "hi",
    indonesian: "id",
    italian: "it",
    japanese: "ja",
    korean: "ko",
    kurdish: "ku",
    malay: "ms",
    persian: "fa",
    portuguese: "pt",
    romanian: "ro",
    russian: "ru",
    spanish: "es",
    swedish: "sv",
    tamil: "ta",
    thai: "th",
    turkish: "tr",
    urdu: "ur",
    uzbek: "uz",
    vietnamese: "vi",
  };

  function languageCode(language) {
    return LANGUAGE_CODES[String(language || "English").toLowerCase()] || "en";
  }

  function normalizeQuery(query) {
    return String(query || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function url(apiBase, { query, translationId, page = 1, language } = {}) {
    const params = new URLSearchParams();
    params.set("q", normalizeQuery(query));
    params.set("size", "100");
    params.set("page", String(Math.max(1, parseInt(page, 10) || 1)));
    params.set("language", language || "en");
    params.set("translations", String(translationId));
    return `${apiBase}/search?${params.toString()}`;
  }

  function defaultCleanHtml(text) {
    return String(text || "")
      .replace(/<sup[^>]*>.*?<\/sup>/gi, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Turns the verses a search returned into results.
   *
   * A response from the search endpoint already matches the query, so it is
   * kept as-is. A scan of the whole downloaded corpus has to apply the query
   * itself: every term must appear in the translation.
   */
  function shape(query, verses, cleanHtml = defaultCleanHtml) {
    const normalizedQuery = normalizeQuery(query);
    if (!normalizedQuery) return [];

    const list = Array.isArray(verses) ? verses : [];
    const terms = normalizedQuery.toLowerCase().split(" ").filter(Boolean);
    const fromSearchApi = list.some(
      (verse) => "verse_id" in Object(verse) && "text" in Object(verse),
    );

    return list
      .map((verse) => {
        const rawTranslation = Array.isArray(verse?.translations)
          ? verse.translations[0]?.text
          : "";
        const translationText = cleanHtml(rawTranslation || "");
        const arabicText = verse?.text_uthmani || verse?.text || "";
        const verseKey = String(verse?.verse_key || "");
        const [keySurah, keyAyah] = verseKey
          .split(":")
          .map((n) => parseInt(n, 10) || 0);
        const surah = verse?.chapter_id || keySurah;
        const ayah = verse?.verse_number || keyAyah;

        return {
          verseKey: verseKey || `${surah}:${ayah}`,
          surah,
          ayah,
          arabicText,
          translationText,
        };
      })
      .filter((result) => {
        if (!result.translationText && !result.arabicText) return false;
        if (fromSearchApi) return true;
        const haystack = result.translationText.toLowerCase();
        return terms.every((term) => haystack.includes(term));
      });
  }

  globalThis.QuranSearch = { languageCode, normalizeQuery, url, shape };
})();

/**
 * PocketQuranManager: quran search requests.
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

  getSearchLanguageCode(translationId) {
    const language =
      PocketQuranManager.TRANSLATIONS[
        this.normalizeTranslationId(translationId)
      ]?.language || "English";
    return QuranSearch.languageCode(language);
  }

  getSearchApiUrl(query, translationId, page = 1) {
    return QuranSearch.url(PocketQuranManager.API_BASE, {
      query,
      translationId: this.normalizeTranslationId(translationId),
      page,
      language: this.getSearchLanguageCode(translationId),
    });
  }

  getFullTranslationApiUrl(translationId) {
    const id = this.normalizeTranslationId(translationId);
    return `${PocketQuranManager.API_BASE}/quran/translations/${id}?fields=verse_key,chapter_id,verse_number,text`;
  }

  getFullArabicApiUrl() {
    return `${PocketQuranManager.API_BASE}/quran/verses/uthmani`;
  }

  async fetchPocketQuranSearchResults(query, translationId) {
    const url = this.getSearchApiUrl(query, translationId, 1);
    const data = await this.fetchJson(url, { timeoutMs: 15000 });
    const search = data?.search || {};
    const results = Array.isArray(search.results) ? [...search.results] : [];
    const totalPages = Number(search.total_pages) || 1;

    for (let page = 2; page <= totalPages; page += 1) {
      const pageData = await this.fetchJson(
        this.getSearchApiUrl(query, translationId, page),
        { timeoutMs: 15000 },
      );
      const pageResults = Array.isArray(pageData?.search?.results)
        ? pageData.search.results
        : [];
      results.push(...pageResults);
    }

    return {
      query: search.query || query,
      totalResults: Number(search.total_results) || 0,
      currentPage: Number(search.current_page) || 1,
      totalPages,
      results,
    };
  }

  async getFallbackTranslationSearchResults(query, translationId) {
    const [translationData, arabicData] = await Promise.all([
      this.fetchJson(this.getFullTranslationApiUrl(translationId), {
        timeoutMs: 20000,
      }),
      this.fetchJson(this.getFullArabicApiUrl(), { timeoutMs: 20000 }),
    ]);
    const arabicByVerse = new Map(
      (Array.isArray(arabicData?.verses) ? arabicData.verses : []).map(
        (verse) => [verse.verse_key, verse.text_uthmani || ""],
      ),
    );
    const translations = Array.isArray(translationData?.translations)
      ? translationData.translations
      : [];
    const normalizedQuery = String(query || "")
      .toLowerCase()
      .trim();
    const terms = normalizedQuery.split(/\s+/).filter(Boolean);

    return translations
      .filter((translation) => {
        const text = this.stripHtmlToText(
          translation?.text || "",
        ).toLowerCase();
        return terms.every((term) => text.includes(term));
      })
      .map((translation) => ({
        verse_key: translation.verse_key,
        chapter_id: translation.chapter_id,
        verse_number: translation.verse_number,
        text_uthmani: arabicByVerse.get(translation.verse_key) || "",
        translations: [{ text: translation.text || "" }],
      }));
  }

  buildPocketQuranSearchResults(query, verses) {
    return QuranSearch.shape(query, verses, (value) =>
      this.stripHtmlToText(value),
    );
  }
});

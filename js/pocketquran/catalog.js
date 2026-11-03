/**
 * The Quran chapter and reciter lists, as one catalog: one fetch, one
 * normalise, one cache, one TTL. The reader, the popup and the offscreen
 * document all read the same two localStorage key pairs, so writing the logic
 * once is what stops the three copies from drifting apart.
 *
 * DOM-free, and independent of PocketQuranManager: offscreen.html does not
 * load js/pocketquran/index.js, so the API base lives here.
 *
 * The caller keeps its own list and its own failure handling; a stale cache is
 * served when the network fails, and the rejection reaches the caller only when
 * there is nothing cached to show.
 */

class PocketQuranCatalog {
  static API_BASE = "https://api.quran.com/api/v4";

  // Upstream adds a reciter now and then; a week of staleness is harmless.
  static TTL_MS = 1000 * 60 * 60 * 24 * 7;

  static CHAPTERS_KEY = "pocketQuran_chapters_cache";
  static CHAPTERS_AT_KEY = "pocketQuran_chapters_cache_at";
  static RECITERS_KEY = "pocketQuran_reciters_cache";
  static RECITERS_AT_KEY = "pocketQuran_reciters_cache_at";

  static REQUEST_TIMEOUT_MS = 15000;

  /**
   * jsonCache is the popup's IndexedDB tier (PocketQuranCacheManager); the
   * dashboard and the offscreen document pass nothing and read localStorage
   * only, as they always did.
   */
  constructor(storage, options = {}) {
    this.storage = storage;
    this.jsonCache = options.jsonCache || null;
  }

  static chaptersUrl() {
    return `${PocketQuranCatalog.API_BASE}/chapters?language=en`;
  }

  static recitersUrl() {
    return `${PocketQuranCatalog.API_BASE}/resources/recitations?language=en`;
  }

  static normalizeChapters(entries) {
    return (Array.isArray(entries) ? entries : [])
      // An id that is not a positive number cannot identify a chapter.
      .filter((chapter) => {
        const id = Number(chapter?.id);
        return id > 0 && Number.isFinite(id);
      })
      .map((chapter) => ({
        id: Math.min(114, Math.max(1, Number(chapter.id))),
        name_simple: String(chapter?.name_simple || "").trim(),
        name_arabic: String(chapter?.name_arabic || "").trim(),
        verses_count: Number.isFinite(Number(chapter?.verses_count))
          ? Math.min(286, Math.max(1, Number(chapter.verses_count)))
          : 286,
      }))
      .filter((chapter) => chapter.name_simple || chapter.name_arabic)
      .sort((left, right) => left.id - right.id);
  }

  static normalizeReciters(entries) {
    return (Array.isArray(entries) ? entries : [])
      .filter((reciter) => {
        const id = Number(reciter?.id);
        return id > 0 && Number.isFinite(id);
      })
      .map((reciter) => ({
        id: Math.min(10000, Math.max(1, Number(reciter.id))),
        name: String(
          reciter?.name ||
            reciter?.formattedName ||
            reciter?.translated_name?.name ||
            reciter?.reciter_name ||
            "",
        ).trim(),
        style: String(reciter?.style || "").trim(),
      }))
      .filter((reciter) => reciter.name);
  }

  async chapters(force = false) {
    const cached = PocketQuranCatalog.normalizeChapters(
      this.storage.get(PocketQuranCatalog.CHAPTERS_KEY, null),
    );

    if (!force && cached.length > 0 && this._isFresh(PocketQuranCatalog.CHAPTERS_AT_KEY)) {
      return cached;
    }

    const url = PocketQuranCatalog.chaptersUrl();

    // The IndexedDB tier holds the raw payload; the popup asked it before the
    // network and this keeps that order.
    if (this.jsonCache) {
      const payload = await this.jsonCache.getJson(url);
      const indexed = PocketQuranCatalog.normalizeChapters(payload?.chapters);
      if (!force && indexed.length > 0) return indexed;
    }

    try {
      const data = await this._fetchJson(url, "Pocket Quran chapters");
      const chapters = PocketQuranCatalog.normalizeChapters(data?.chapters);
      if (!chapters.length) {
        throw new Error("Pocket Quran chapters payload contained no chapters.");
      }

      this._write(
        PocketQuranCatalog.CHAPTERS_KEY,
        PocketQuranCatalog.CHAPTERS_AT_KEY,
        chapters,
      );
      if (this.jsonCache) void this.jsonCache.setJson(url, data, "chapters");
      return chapters;
    } catch (error) {
      if (cached.length > 0) return cached;
      throw error;
    }
  }

  async reciters(force = false) {
    const cached = PocketQuranCatalog.normalizeReciters(
      this.storage.get(PocketQuranCatalog.RECITERS_KEY, null),
    );

    if (!force && cached.length > 0 && this._isFresh(PocketQuranCatalog.RECITERS_AT_KEY)) {
      return cached;
    }

    try {
      const data = await this._fetchJson(
        PocketQuranCatalog.recitersUrl(),
        "Pocket Quran reciters",
      );
      const reciters = PocketQuranCatalog.normalizeReciters(data?.recitations);
      if (!reciters.length) {
        throw new Error("Pocket Quran reciters payload contained no reciters.");
      }

      this._write(
        PocketQuranCatalog.RECITERS_KEY,
        PocketQuranCatalog.RECITERS_AT_KEY,
        reciters,
      );
      return reciters;
    } catch (error) {
      if (cached.length > 0) return cached;
      throw error;
    }
  }

  _isFresh(atKey) {
    const at = this.storage.get(atKey, 0);
    return Date.now() - (at || 0) < PocketQuranCatalog.TTL_MS;
  }

  _write(key, atKey, entries) {
    this.storage.set(key, entries);
    this.storage.set(atKey, Date.now());
  }

  // AbortController rather than an unbounded fetch: a hung API must not hang a
  // caller that has nothing cached to fall back on.
  async _fetchJson(url, label) {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      PocketQuranCatalog.REQUEST_TIMEOUT_MS,
    );

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      if (!response || !response.ok) {
        throw new Error(
          `${label} request failed (HTTP ${response?.status || "unknown"}).`,
        );
      }

      const data = await response.json();
      if (!data || typeof data !== "object") {
        throw new Error(`${label} returned malformed payload.`);
      }

      if (data.error === true) {
        const reason =
          typeof data.reason === "string" && data.reason.trim()
            ? data.reason.trim()
            : `${label} returned an API error.`;
        throw new Error(reason);
      }

      return data;
    } finally {
      clearTimeout(timer);
    }
  }
}

window.PocketQuranCatalog = PocketQuranCatalog;

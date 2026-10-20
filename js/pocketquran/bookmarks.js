/**
 * PocketQuranManager: bookmark categories and import/export.
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

  async fetchJson(url, opts = {}) {
    const { signal, timeoutMs = 15000 } = opts;

    const normalizedUrl = String(url || "").trim();
    const cacheable = this._pqCache?.isCacheableJsonUrl(normalizedUrl) === true;

    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    // If JSON is cached, avoid any API call.
    if (cacheable && this._pqCache) {
      const cached = await this._pqCache.getJson(normalizedUrl);
      if (cached) return cached;
    }

    const controller = !signal ? new AbortController() : null;
    const timer = setTimeout(() => {
      try {
        if (controller) controller.abort();
      } catch (e) {}
    }, timeoutMs);

    try {
      const res = await fetch(normalizedUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: signal || controller.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${normalizedUrl}`);
      }

      const data = await res.json();
      if (cacheable && this._pqCache) {
        // Best-effort: ignore quota/transaction failures.
        await this._pqCache.setJson(normalizedUrl, data, "quran_api");
      }

      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  getBookmarkCategories() {
    return this.storage.get("pocketQuran_bookmarkCategories", []);
  }

  saveBookmarkCategories(categories) {
    this.storage.set("pocketQuran_bookmarkCategories", categories);
  }

  getBookmarks() {
    return this.storage.get("pocketQuran_bookmarks", []);
  }

  saveBookmarks(bookmarks) {
    this.storage.set("pocketQuran_bookmarks", bookmarks);
  }

  ensureDefaultBookmarkCategory() {
    const categories = this.getBookmarkCategories();
    if (!categories.length) {
      this.saveBookmarkCategories([
        {
          id: "default",
          name: "Bookmarked",
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  }

  createBookmarkCategory(name) {
    const categories = this.getBookmarkCategories();
    const trimmed = String(name || "")
      .trim()
      .slice(0, 50);
    if (!trimmed) return null;

    const existing = categories.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) return existing;

    const newCategory = {
      id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: trimmed,
      createdAt: new Date().toISOString(),
    };

    categories.push(newCategory);
    this.saveBookmarkCategories(categories);
    return newCategory;
  }

  renameBookmarkCategory(categoryId, newName) {
    const categories = this.getBookmarkCategories();
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return false;

    const trimmed = String(newName || "")
      .trim()
      .slice(0, 50);
    if (!trimmed) return false;

    category.name = trimmed;
    this.saveBookmarkCategories(categories);
    return true;
  }

  deleteBookmarkCategory(categoryId) {
    if (categoryId === "default") return false;

    let categories = this.getBookmarkCategories();
    categories = categories.filter((c) => c.id !== categoryId);
    this.saveBookmarkCategories(categories);

    let bookmarks = this.getBookmarks();
    bookmarks = bookmarks.filter((b) => b.categoryId !== categoryId);
    this.saveBookmarks(bookmarks);

    return true;
  }

  addBookmark(categoryId, surah, ayah, arabicText, translationText) {
    const bookmarks = this.getBookmarks();

    // Check if already bookmarked in this category
    const existing = bookmarks.find(
      (b) =>
        b.categoryId === categoryId && b.surah === surah && b.ayah === ayah,
    );
    if (existing) return existing;

    const chapter = this._chapters.find((c) => c.id === surah);

    const bookmark = {
      id: `bm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      categoryId,
      surah,
      ayah,
      surahName: chapter?.name_simple || `Surah ${surah}`,
      surahNameAr: chapter?.name_arabic || "",
      arabicText: (arabicText || "").slice(0, 500),
      translationText: (translationText || "").slice(0, 500),
      createdAt: new Date().toISOString(),
    };

    bookmarks.push(bookmark);
    this.saveBookmarks(bookmarks);
    return bookmark;
  }

  removeBookmark(bookmarkId) {
    let bookmarks = this.getBookmarks();
    bookmarks = bookmarks.filter((b) => b.id !== bookmarkId);
    this.saveBookmarks(bookmarks);
  }

  removeBookmarkByAyah(categoryId, surah, ayah) {
    let bookmarks = this.getBookmarks();
    bookmarks = bookmarks.filter(
      (b) =>
        !(b.categoryId === categoryId && b.surah === surah && b.ayah === ayah),
    );
    this.saveBookmarks(bookmarks);
  }

  isAyahBookmarked(surah, ayah) {
    const bookmarks = this.getBookmarks();
    return bookmarks.some((b) => b.surah === surah && b.ayah === ayah);
  }

  isAyahBookmarkedInCategory(categoryId, surah, ayah) {
    const bookmarks = this.getBookmarks();
    return bookmarks.some(
      (b) =>
        b.categoryId === categoryId && b.surah === surah && b.ayah === ayah,
    );
  }

  getBookmarksForCategory(categoryId, searchQuery = "") {
    let bookmarks = this.getBookmarks().filter(
      (b) => b.categoryId === categoryId,
    );

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      bookmarks = bookmarks.filter(
        (b) =>
          b.surahName.toLowerCase().includes(q) ||
          b.surahNameAr.includes(searchQuery) ||
          String(b.surah).includes(q) ||
          String(b.ayah).includes(q) ||
          (b.arabicText || "").includes(searchQuery) ||
          (b.translationText || "").toLowerCase().includes(q),
      );
    }

    return bookmarks.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
  }

  getBookmarkCount(categoryId) {
    return this.getBookmarks().filter((b) => b.categoryId === categoryId)
      .length;
  }

  exportBookmarksJSON() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      categories: this.getBookmarkCategories(),
      bookmarks: this.getBookmarks(),
    };
    return JSON.stringify(data, null, 2);
  }

  importBookmarksJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== "object") {
        throw new Error("Invalid JSON structure");
      }

      const categories = Array.isArray(data.categories) ? data.categories : [];
      const bookmarks = Array.isArray(data.bookmarks) ? data.bookmarks : [];

      // Validate and normalize categories
      const validCategories = categories
        .filter((c) => c && c.id && c.name)
        .map((c) => ({
          id: String(c.id),
          name: String(c.name).slice(0, 50),
          createdAt: c.createdAt || new Date().toISOString(),
        }));

      // Ensure default category exists
      if (!validCategories.find((c) => c.id === "default")) {
        validCategories.unshift({
          id: "default",
          name: "Bookmarked",
          createdAt: new Date().toISOString(),
        });
      }

      // Validate and normalize bookmarks
      const validBookmarks = bookmarks
        .filter(
          (b) =>
            b &&
            b.id &&
            b.categoryId &&
            Number.isFinite(b.surah) &&
            Number.isFinite(b.ayah),
        )
        .map((b) => ({
          id: String(b.id),
          categoryId: String(b.categoryId),
          surah: parseInt(b.surah, 10),
          ayah: parseInt(b.ayah, 10),
          surahName: String(b.surahName || ""),
          surahNameAr: String(b.surahNameAr || ""),
          arabicText: String(b.arabicText || "").slice(0, 500),
          translationText: String(b.translationText || "").slice(0, 500),
          createdAt: b.createdAt || new Date().toISOString(),
        }));

      this.saveBookmarkCategories(validCategories);
      this.saveBookmarks(validBookmarks);

      return {
        success: true,
        categoriesCount: validCategories.length,
        bookmarksCount: validBookmarks.length,
      };
    } catch (e) {
      console.error("Failed to import bookmarks:", e);
      return { success: false, error: e.message };
    }
  }
});

/**
 * SearchBarManager: custom engine creation from the modal.
 * Part of the class declared in js/searchbar/index.js; load this after it.
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
})(SearchBarManager.prototype, class {

  _normalizeAndValidateTemplate(name, url) {
    const cleanName = String(name || "").trim();
    let cleanUrl = String(url || "").trim();

    if (!cleanName || !cleanUrl) return null;
    if (!cleanUrl.includes("%s")) {
      this.notify("URL must include %s where the query goes.", "error");
      return null;
    }

    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = "https://" + cleanUrl;
    }

    try {
      new URL(cleanUrl.split("%s").join("test"));
    } catch (e) {
      this.notify("Please enter a valid URL template.", "error");
      return null;
    }

    return { name: cleanName, url: cleanUrl };
  }

  async addCustomSearchFromModal() {
    const normalized = this._normalizeAndValidateTemplate(
      this.newName?.value,
      this.newUrl?.value,
    );
    if (!normalized) return;

    // Get favicon - fetch fresh for new search engines
    let favicon = this.getFaviconUrlFromTemplate(normalized.url);
    let cachedFavicon = null;

    if (window.faviconCache) {
      // Fetch and cache for new search
      cachedFavicon = await window.faviconCache.fetchAndCache(
        normalized.url,
        "search",
        true,
      );
      if (cachedFavicon) {
        favicon = cachedFavicon;
      }
    }

    const entry = {
      id: Date.now(),
      name: normalized.name,
      url: normalized.url,
      favicon,
      cachedFavicon,
      accentRgb: null,
      accentRgbSource: "favicon",
      faviconDominantRgb: null,
    };

    this.searches.push(entry);
    this.selectedId = entry.id;
    await this._ensureDefaultAccentForEngine(entry, { force: true });
    this.persist();

    this.hideAddModal();
    this.render();
    this.input?.focus();
  }
});

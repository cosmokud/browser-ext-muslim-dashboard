/**
 * SearchBarManager: engine updates and selection.
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

  async updateCustomSearchFromModal() {
    const id = this.editIdInput?.value;
    if (!id) return;

    const normalized = this._normalizeAndValidateTemplate(
      this.editName?.value,
      this.editUrl?.value,
    );
    if (!normalized) return;

    const idx = this.searches.findIndex((s) => String(s.id) === String(id));
    if (idx < 0) return;

    const urlChanged = this.searches[idx].url !== normalized.url;
    const faviconChanged = Boolean(this.pendingFaviconDataUrl) || urlChanged;

    // Handle favicon update
    let favicon = this.searches[idx].favicon;
    let cachedFavicon = this.searches[idx].cachedFavicon;

    if (this.pendingFaviconDataUrl) {
      // User manually set a favicon
      favicon = this.pendingFaviconDataUrl;
      cachedFavicon = this.pendingFaviconDataUrl;
    } else if (urlChanged) {
      // URL changed, fetch new favicon
      if (window.faviconCache) {
        const newCached = await window.faviconCache.fetchAndCache(
          normalized.url,
          "search",
          true,
        );
        if (newCached) {
          favicon = newCached;
          cachedFavicon = newCached;
        } else {
          favicon = this.getFaviconUrlFromTemplate(normalized.url);
          cachedFavicon = null;
        }
      } else {
        favicon = this.getFaviconUrlFromTemplate(normalized.url);
        cachedFavicon = null;
      }
    }

    this.searches[idx] = {
      ...this.searches[idx],
      name: normalized.name,
      url: normalized.url,
      favicon,
      cachedFavicon,
      faviconDominantRgb: this.searches[idx].faviconDominantRgb || null,
    };

    if (this.searches[idx].accentRgbSource !== "custom") {
      this.searches[idx].accentRgb = null;
      this.searches[idx].accentRgbSource = "favicon";
    }

    // Keep selection stable
    this.selectedId = this.searches[idx].id;
    this.persist();

    this.hideEditModal();
    this.render();
    this.input?.focus();
    this._ensureDefaultAccentForEngine(this.searches[idx], {
      force: faviconChanged,
    }).catch(() => {});
  }

  setPlaceholder(text) {
    if (!this.input) return;
    this.input.placeholder = String(text || "Searching...");
  }

  getSelected() {
    if (!this.searches.length) return null;
    return (
      this.searches.find((s) => String(s.id) === String(this.selectedId)) ||
      this.searches[0]
    );
  }

  selectEngine(id) {
    if (!this.searches.length) return;

    const found = this.searches.find((s) => String(s.id) === String(id));
    if (!found) return;

    this.selectedId = found.id;
    this.persist();

    this.ensureSelectionInView();
    this.updateSelectionUi();
    this.applyEngineAccent(found);
  }
});

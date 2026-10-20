/**
 * SearchBarManager: dominant accent colours per engine.
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

  async _ensureDefaultAccentForEngine(engine, { force = false } = {}) {
    if (!engine) return;

    const faviconUrl =
      engine.cachedFavicon ||
      engine.favicon ||
      this.getFaviconUrlFromTemplate(engine.url);
    if (!faviconUrl) return;

    // Ensure favicon is stored for future loads.
    if (!engine.favicon) {
      engine.favicon = faviconUrl;
      this.persist();
    }

    const dominant = await this._getFaviconDominantRgb(faviconUrl, { force });
    if (!dominant) return;

    const normalizedDominant = this._normalizeRgbString(dominant);
    const previousDominant = this._normalizeOptionalRgbString(
      engine.faviconDominantRgb,
    );
    engine.faviconDominantRgb = normalizedDominant;

    if (engine.accentRgbSource === "custom") {
      if (previousDominant !== normalizedDominant) {
        this.persist();
      }
      return;
    }

    if (
      engine.accentRgbSource === "favicon" &&
      this._normalizeRgbString(engine.accentRgb) === normalizedDominant
    ) {
      if (previousDominant !== normalizedDominant) {
        this.persist();
      }
      return;
    }

    // Persist default accent for this engine.
    this.setEngineAccent(engine.id, normalizedDominant, { source: "favicon" });
  }

  async refreshEngineFaviconForDominantColor(engine) {
    if (!engine || !window.faviconCache) return null;

    let refreshedFavicon = null;
    try {
      refreshedFavicon = await window.faviconCache.refreshFromGoogle(
        engine.url,
        "search",
      );
    } catch (e) {
      refreshedFavicon = null;
    }

    if (!refreshedFavicon) return null;

    engine.cachedFavicon = refreshedFavicon;
    engine.favicon = refreshedFavicon;
    this.persist();
    return refreshedFavicon;
  }

  async applyDominantAccentForEngine(
    engineId,
    { force = true, closeMenu = true } = {},
  ) {
    const engine = this.searches.find((s) => String(s.id) === String(engineId));
    if (!engine) return;

    this.selectEngine(engine.id);

    let faviconUrl = await this.refreshEngineFaviconForDominantColor(engine);
    if (!faviconUrl) {
      faviconUrl =
        engine.cachedFavicon ||
        engine.favicon ||
        this.getFaviconUrlFromTemplate(engine.url);
    }
    if (!faviconUrl) {
      this.notify("Could not find a favicon to sample.", "error");
      return;
    }

    const dominant = await this._getFaviconDominantRgb(faviconUrl, { force });
    if (!dominant) {
      this.notify(
        this.faviconDominantFailureReason ||
          "Could not read the favicon dominant color.",
        "error",
      );
      return;
    }

    const normalizedDominant = this._normalizeRgbString(dominant);
    engine.faviconDominantRgb = normalizedDominant;
    this.setEngineAccent(engine.id, normalizedDominant, { source: "favicon" });

    if (closeMenu) {
      this.hideContextMenu();
    }
  }

  getCachedFaviconDominantRgb(faviconUrl) {
    const key = String(faviconUrl || "");
    if (!key) return null;
    return this.faviconDominantCache.get(key) || null;
  }

  _setFaviconDominantFailure(message) {
    this.faviconDominantFailureReason = String(message || "");
    return null;
  }
});

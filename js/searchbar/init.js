/**
 * SearchBarManager: boot, storage load and persist.
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

  _updateContextMenuIcons() {
    if (this.contextMenu) {
      const editIcon = this.contextMenu.querySelector(
        ".context-menu-edit .context-menu-icon",
      );
      const colorIcon = this.contextMenu.querySelector(
        ".context-menu-accent-custom .context-menu-icon",
      );
      const deleteIcon = this.contextMenu.querySelector(
        ".context-menu-delete .context-menu-icon",
      );
      if (editIcon) editIcon.innerHTML = this._getIcon("✏️", { size: 16 });
      if (colorIcon) colorIcon.innerHTML = this._getIcon("🎨", { size: 16 });
      if (deleteIcon) deleteIcon.innerHTML = this._getIcon("🗑️", { size: 16 });
    }
  }

  _attachImageFallback(imgEl, fallbackEl, fallbackDisplay = "flex") {
    if (!imgEl || !fallbackEl) return;

    imgEl.addEventListener("error", () => {
      imgEl.style.display = "none";
      fallbackEl.style.display = fallbackDisplay;
    });
  }

  _renderFaviconPreview(containerEl, faviconUrl) {
    if (!containerEl) return;

    containerEl.innerHTML = "";

    const fallback = document.createElement("span");
    fallback.className = "favicon-fallback";
    fallback.textContent = "?";

    if (!faviconUrl) {
      containerEl.appendChild(fallback);
      return;
    }

    const img = document.createElement("img");
    img.src = faviconUrl;
    img.alt = "Favicon";

    fallback.style.display = "none";
    containerEl.appendChild(img);
    containerEl.appendChild(fallback);
    this._attachImageFallback(img, fallback);
  }

  _captureClickWhileDragging(e) {
    if (!this.blockNextClick) return;
    e.preventDefault();
    e.stopPropagation();
    this.blockNextClick = false;
    if (this.blockNextClickTimer) {
      window.clearTimeout(this.blockNextClickTimer);
      this.blockNextClickTimer = null;
    }
  }

  init() {
    if (
      !this.section ||
      !this.shell ||
      !this.strip ||
      !this.form ||
      !this.input
    )
      return;

    this.loadFromStorage();
    this.bindEvents();
    this.createContextMenu();
    this.render();

    // If empty, nudge user toward adding one.
    if (!this.searches.length) {
      this.setPlaceholder("Add a custom search");
    }
  }

  notify(message, type = "info") {
    try {
      if (window.dashboard?.settings?.showToast) {
        window.dashboard.settings.showToast(String(message), type);
        return;
      }
    } catch (e) {}

    // Minimal fallback.
    if (type === "error") {
      alert(String(message));
    } else {
      console.log(message);
    }
  }

  loadFromStorage() {
    const raw =
      typeof this.storage.getCustomSearches === "function"
        ? this.storage.getCustomSearches()
        : this.storage.get("customSearches", []);

    const list = Array.isArray(raw) ? raw : [];
    let migratedFaviconUrl = false;

    this.searches = list
      .filter(
        (s) => s && typeof s.name === "string" && typeof s.url === "string",
      )
      .map((s) => {
        const id = s.id ?? Date.now() + Math.random();
        const name = String(s.name || "")
          .trim()
          .slice(0, 40);
        const url = String(s.url || "").trim();
        let favicon = typeof s.favicon === "string" ? s.favicon : null;
        const cachedFavicon =
          typeof s.cachedFavicon === "string" ? s.cachedFavicon : null;
        const accentRgb =
          typeof s.accentRgb === "string" ? String(s.accentRgb) : null;
        const accentRgbSource =
          s.accentRgbSource === "custom" ? "custom" : "favicon";
        const faviconDominantRgb = this._normalizeOptionalRgbString(
          s.faviconDominantRgb,
        );

        if (this._isExtensionFaviconUrl(favicon)) {
          const migratedFavicon = this.getFaviconUrlFromTemplate(url);
          // A local host keeps its Chrome-cache URL instead of going to Google.
          if (migratedFavicon && migratedFavicon !== favicon) {
            favicon = migratedFavicon;
            migratedFaviconUrl = true;
          }
        } else if (
          this._isLocalUrl(url) &&
          (!favicon ||
            /^https?:\/\/(www\.)?google\.com\/s2\/favicons/i.test(favicon))
        ) {
          const localFavicon = this.getFaviconUrlFromTemplate(url);
          if (localFavicon && localFavicon !== favicon) {
            favicon = localFavicon;
            migratedFaviconUrl = true;
          }
        }

        return {
          id,
          name,
          url,
          favicon,
          cachedFavicon,
          accentRgb,
          accentRgbSource,
          faviconDominantRgb,
        };
      })
      .filter((s) => s.name && s.url);

    const lastId =
      typeof this.storage.getLastCustomSearchId === "function"
        ? this.storage.getLastCustomSearchId()
        : this.storage.get("customSearchLastId", null);

    const exists = (id) =>
      this.searches.some((s) => String(s.id) === String(id));

    if (lastId != null && exists(lastId)) {
      this.selectedId = lastId;
    } else {
      this.selectedId = this.searches[0]?.id ?? null;
    }

    this.ensureSelectionInView();
    // The sweep saves the migrated favicon and any dropped icons in one write.
    this._dropStaleLocalEngineIcons(migratedFaviconUrl);
  }

  _isLocalUrl(url) {
    return (
      typeof FaviconCacheManager !== "undefined" &&
      FaviconCacheManager.isLocalUrl(url)
    );
  }

  /**
   * Drop a local engine's stored icon unless the user picked it.
   */
  async _dropStaleLocalEngineIcons(migratedFavicon = false) {
    try {
      let changed = migratedFavicon;

      if (window.faviconCache) {
        for (const engine of this.searches) {
          if (!engine?.url || !this._isLocalUrl(engine.url)) continue;
          if (!engine.cachedFavicon) continue;
          if (await window.faviconCache.isCustomFavicon(engine.url, "search")) {
            continue;
          }

          await window.faviconCache.removeCached(engine.url, "search");
          engine.cachedFavicon = null;
          changed = true;
        }
      }

      if (changed) {
        this.persist();
        this.render();
      }
    } catch (e) {}
  }

  persist() {
    if (typeof this.storage.saveCustomSearches === "function") {
      this.storage.saveCustomSearches(this.searches);
    } else {
      this.storage.set("customSearches", this.searches);
    }

    if (typeof this.storage.saveLastCustomSearchId === "function") {
      this.storage.saveLastCustomSearchId(this.selectedId);
    } else {
      this.storage.set("customSearchLastId", this.selectedId);
    }
  }
});

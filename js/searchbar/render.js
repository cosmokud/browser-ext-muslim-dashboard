/**
 * SearchBarManager: search bar rendering and favicon cache.
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

  render() {
    if (!this.strip) return;

    if (this.shell) {
      this.shell.classList.toggle("has-engines", this.searches.length > 0);

      const visible = Math.max(
        1,
        Math.min(SearchBarManager.MAX_VISIBLE, this.searches.length),
      );
      this.shell.style.setProperty("--sb-engine-visible", String(visible));
    }

    // Clear
    this.strip.innerHTML = "";

    const frag = document.createDocumentFragment();

    this.searches.forEach((engine) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "search-bar-engine-tab";
      btn.setAttribute("role", "tab");
      btn.setAttribute("data-id", String(engine.id));
      btn.setAttribute(
        "aria-selected",
        String(engine.id) === String(this.selectedId) ? "true" : "false",
      );
      btn.title = engine.name;

      const icon = document.createElement("span");
      icon.className = "search-bar-engine-icon";

      // Use cached favicon first, then stored favicon, then fetch URL
      const faviconUrl =
        engine.cachedFavicon ||
        engine.favicon ||
        this.getFaviconUrlFromTemplate(engine.url);
      const fallback = document.createElement("span");
      fallback.className = "search-bar-engine-fallback";
      fallback.textContent = engine.name.charAt(0).toUpperCase();

      if (faviconUrl) {
        const img = document.createElement("img");
        img.src = faviconUrl;
        img.alt = engine.name;
        img.draggable = false;
        img.addEventListener("error", () => {
          img.style.display = "none";
          fallback.style.display = "flex";
        });
        icon.appendChild(img);
      }

      icon.appendChild(fallback);
      btn.appendChild(icon);

      // Load cached favicon asynchronously if not already cached
      if (!engine.cachedFavicon && window.faviconCache) {
        this.loadCachedFaviconForEngine(engine, btn);
      }

      btn.addEventListener("click", () => {
        this.selectEngine(engine.id);
      });

      // Mouse-based custom drag (desktop)
      btn.addEventListener("mousedown", (e) =>
        this._handleEngineDragStart(e, engine, btn),
      );

      // Touch-based drag (mobile)
      btn.addEventListener(
        "touchstart",
        (e) => this._handleEngineTouchStart(e, engine, btn),
        { passive: false },
      );

      btn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showContextMenu(e.clientX, e.clientY, engine.id);
      });

      frag.appendChild(btn);
    });

    this.strip.appendChild(frag);

    // Final UI sync.
    this.updateSelectionUi();

    // Apply accent for current selection.
    const selected = this.getSelected();
    if (selected) {
      // Ensure favicon is stored for future loads.
      if (!selected.favicon) {
        selected.favicon = this.getFaviconUrlFromTemplate(selected.url);
        this.persist();
      }
      this.applyEngineAccent(selected);
    } else {
      // Reset to default accent and placeholder when empty.
      if (this.shell) {
        this.shell.style.setProperty("--sb-accent-rgb", "255, 255, 255");
      }
      this.setPlaceholder("Add a custom search");
    }

    // Arrow visibility and transform.
    this.updateStripTransform();
  }

  async loadCachedFaviconForEngine(engine, btnEl) {
    try {
      const cached = await window.faviconCache.getCached(engine.url, "search");
      if (cached) {
        const img = btnEl.querySelector(".search-bar-engine-icon img");
        if (img) {
          img.src = cached;
        }
        // Update engine object
        engine.cachedFavicon = cached;
        if (
          String(this.selectedId) === String(engine.id) &&
          engine.accentRgbSource !== "custom"
        ) {
          this._ensureDefaultAccentForEngine(engine).catch(() => {});
        }
      }
    } catch (e) {
      // Silently fail
    }
  }
});

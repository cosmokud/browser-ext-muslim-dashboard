/**
 * SearchBarManager: engine strip scrolling and search.
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

  ensureSelectionInView() {
    const idx = this.searches.findIndex(
      (s) => String(s.id) === String(this.selectedId),
    );
    if (idx < 0) return;

    const max = SearchBarManager.MAX_VISIBLE;
    if (idx < this.scrollIndex) {
      this.scrollIndex = idx;
    } else if (idx >= this.scrollIndex + max) {
      this.scrollIndex = Math.max(0, idx - max + 1);
    }
  }

  scrollBy(delta) {
    const max = SearchBarManager.MAX_VISIBLE;
    const maxStart = Math.max(0, this.searches.length - max);

    this.scrollIndex = Math.max(
      0,
      Math.min(maxStart, this.scrollIndex + delta),
    );
    this.updateStripTransform();
  }

  getStripStepPx() {
    // Keep in sync with CSS vars.
    const fallback = 34 + 8;
    try {
      const cs = getComputedStyle(this.shell);
      const size = parseFloat(cs.getPropertyValue("--sb-engine-size")) || 34;
      const gap = parseFloat(cs.getPropertyValue("--sb-engine-gap")) || 8;
      return size + gap;
    } catch (e) {
      return fallback;
    }
  }

  updateStripTransform() {
    if (!this.strip) return;
    const step = this.getStripStepPx();
    this.strip.style.transform = `translate3d(${
      -this.scrollIndex * step
    }px, 0, 0)`;

    const shouldShow = this.searches.length > SearchBarManager.MAX_VISIBLE;
    const maxStart = Math.max(
      0,
      this.searches.length - SearchBarManager.MAX_VISIBLE,
    );

    if (this.prevBtn) {
      this.prevBtn.classList.toggle(
        "is-hidden",
        !shouldShow || this.scrollIndex <= 0,
      );
    }
    if (this.nextBtn) {
      this.nextBtn.classList.toggle(
        "is-hidden",
        !shouldShow || this.scrollIndex >= maxStart,
      );
    }
  }

  updateSelectionUi() {
    if (!this.strip) return;

    const selected = this.getSelected();
    this.setPlaceholder(
      selected ? `Searching ${selected.name}` : "Searching...",
    );

    this.strip.querySelectorAll(".search-bar-engine-tab").forEach((btn) => {
      const id = btn.getAttribute("data-id");
      btn.setAttribute(
        "aria-selected",
        selected && String(selected.id) === String(id) ? "true" : "false",
      );
    });

    this.updateStripTransform();
  }

  getFaviconUrlFromTemplate(urlTemplate) {
    const safe = String(urlTemplate || "").trim();
    if (!safe) return null;

    // A local host's icon lives in Chrome's cache, not in Google's service.
    if (
      typeof FaviconCacheManager !== "undefined" &&
      FaviconCacheManager.isLocalUrl(safe)
    ) {
      return FaviconCacheManager.getLocalFaviconUrl(safe);
    }

    // Replace %s with a sentinel so URL parsing works.
    const test = safe.split("%s").join("test");

    try {
      const urlObj = new URL(test);
      const domainBaseUrl = new URL(`${urlObj.origin}/`).href;

      return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(domainBaseUrl)}&sz=256`;
    } catch (e) {
      return null;
    }
  }

  _isExtensionFaviconUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return false;
    return /^chrome-extension:\/\/[^/]+\/_favicon\/\?/i.test(raw);
  }

  runSearch() {
    const engine = this.getSelected();

    if (!engine) {
      this.showAddModal();
      return;
    }

    const q = String(this.input?.value || "").trim();
    if (!q) {
      this.input?.focus();
      return;
    }

    const url = String(engine.url).split("%s").join(encodeURIComponent(q));

    // Remember last used engine.
    this.selectedId = engine.id;
    this.persist();

    try {
      const settings = this.storage.getSettings();
      const openInNewTab = settings.searchBarOpenInNewTab !== false;
      if (openInNewTab) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = url;
      }
      this.input.value = "";
    } catch (e) {
      this.notify("Could not open the search URL.", "error");
    }
  }
});

/**
 * PocketQuranManager: in-reader search modal and results.
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

  createPocketQuranSearchButton() {
    const headerActions = this.card?.querySelector(".card-header-actions");
    if (!headerActions) return;

    if (headerActions.querySelector(".pq-search-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pq-search-btn";
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M9.5 3a6.5 6.5 0 0 1 5.14 10.48l4.44 4.44-1.41 1.41-4.44-4.44A6.5 6.5 0 1 1 9.5 3Zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z"/></svg>';
    btn.title = "Search Quran translation";
    btn.setAttribute("aria-label", "Search Quran translation");

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      this.openPocketQuranSearchModal();
    });

    const bookmarkBtn = headerActions.querySelector(".pq-bookmark-btn");
    const blurMenu = headerActions.querySelector(".card-blur-menu");
    if (bookmarkBtn) {
      headerActions.insertBefore(btn, bookmarkBtn);
    } else if (blurMenu) {
      headerActions.insertBefore(btn, blurMenu);
    } else {
      headerActions.appendChild(btn);
    }
  }

  createPocketQuranSearchModal() {
    if (this._searchModal) return this._searchModal;

    const modal = document.createElement("div");
    modal.className = "pq-bookmark-modal pq-search-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "pqSearchModalTitle");
    modal.innerHTML = `
      <div class="pq-bookmark-modal-content pq-search-modal-content">
        <div class="pq-bookmark-modal-header">
          <h3 class="pq-bookmark-modal-title" id="pqSearchModalTitle">Search Quran</h3>
          <div class="pq-search-header-actions">
            <label class="pq-search-size-control">
              <span>Arabic</span>
              <input type="range" class="pq-search-arabic-size" min="18" max="56" step="1" />
              <output class="pq-search-arabic-size-value"></output>
            </label>
            <label class="pq-search-size-control">
              <span>Translation</span>
              <input type="range" class="pq-search-translation-size" min="12" max="28" step="1" />
              <output class="pq-search-translation-size-value"></output>
            </label>
            <button type="button" class="pq-bookmark-modal-close" aria-label="Close">&times;</button>
          </div>
        </div>
        <form class="pq-search-form">
          <input type="search" class="pq-search-input" placeholder="Search selected translation" autocomplete="off" />
          <button type="submit" class="pq-search-submit-btn">Search</button>
        </form>
        <div class="pq-search-progress" hidden>
          <div class="pq-search-progress-ring" aria-hidden="true"></div>
          <div class="pq-search-progress-text">Preparing search cache...</div>
        </div>
        <div class="pq-search-status" aria-live="polite"></div>
        <div class="pq-search-results" role="list"></div>
        <div class="pq-search-pagination"></div>
      </div>
    `;

    document.body.appendChild(modal);
    this._searchModal = modal;
    this._searchInput = modal.querySelector(".pq-search-input");
    this._searchResultsEl = modal.querySelector(".pq-search-results");
    this._searchPaginationEl = modal.querySelector(".pq-search-pagination");
    this._searchStatusEl = modal.querySelector(".pq-search-status");
    this._searchProgressEl = modal.querySelector(".pq-search-progress");
    this._searchProgressTextEl = modal.querySelector(
      ".pq-search-progress-text",
    );
    this._searchSubmitBtn = modal.querySelector(".pq-search-submit-btn");
    this._searchArabicSizeRange = modal.querySelector(".pq-search-arabic-size");
    this._searchTranslationSizeRange = modal.querySelector(
      ".pq-search-translation-size",
    );
    this._searchArabicSizeValue = modal.querySelector(
      ".pq-search-arabic-size-value",
    );
    this._searchTranslationSizeValue = modal.querySelector(
      ".pq-search-translation-size-value",
    );
    this.syncSearchResultFontControls();

    modal
      .querySelector(".pq-bookmark-modal-close")
      ?.addEventListener("click", () => this.closePocketQuranSearchModal());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) this.closePocketQuranSearchModal();
    });
    modal.querySelector(".pq-search-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.runPocketQuranSearch();
    });
    this._searchArabicSizeRange?.addEventListener("input", () => {
      this.applySearchResultFontSizes(
        this._searchArabicSizeRange.value,
        this._searchTranslationSizeRange?.value,
      );
    });
    this._searchTranslationSizeRange?.addEventListener("input", () => {
      this.applySearchResultFontSizes(
        this._searchArabicSizeRange?.value,
        this._searchTranslationSizeRange.value,
      );
    });

    return modal;
  }

  openPocketQuranSearchModal() {
    const modal = this.createPocketQuranSearchModal();
    modal.classList.add("active");
    this._searchInput?.focus();
  }

  closePocketQuranSearchModal() {
    if (!this._searchModal) return;
    this._searchModal.classList.remove("active");
  }

  getSearchResultFontDefaults() {
    const readPx = (name, fallback) => {
      try {
        const value = getComputedStyle(this.card).getPropertyValue(name);
        const parsed = parseFloat(String(value || "").trim());
        return Number.isFinite(parsed) ? parsed : fallback;
      } catch (e) {
        return fallback;
      }
    };

    return {
      arabic: this.clampNumber(readPx("--pq-arabic-size", 32), 18, 56, 32),
      translation: this.clampNumber(
        readPx("--pq-translation-size", 16),
        12,
        28,
        16,
      ),
    };
  }

  syncSearchResultFontControls() {
    if (!this._searchModal) return;
    const sizes = this.getSearchResultFontDefaults();
    this.applySearchResultFontSizes(sizes.arabic, sizes.translation);
  }

  applySearchResultFontSizes(arabicPx, translationPx) {
    if (!this._searchModal) return;

    const arabic = this.clampNumber(arabicPx, 18, 56, 32);
    const translation = this.clampNumber(translationPx, 12, 28, 16);
    this._searchModal.style.setProperty(
      "--pq-search-arabic-size",
      `${arabic}px`,
    );
    this._searchModal.style.setProperty(
      "--pq-search-translation-size",
      `${translation}px`,
    );

    if (this._searchArabicSizeRange) {
      this._searchArabicSizeRange.value = String(arabic);
      this.updateRangeProgress(this._searchArabicSizeRange);
    }
    if (this._searchTranslationSizeRange) {
      this._searchTranslationSizeRange.value = String(translation);
      this.updateRangeProgress(this._searchTranslationSizeRange);
    }
    if (this._searchArabicSizeValue) {
      this._searchArabicSizeValue.textContent = `${arabic}px`;
    }
    if (this._searchTranslationSizeValue) {
      this._searchTranslationSizeValue.textContent = `${translation}px`;
    }
  }

  setPocketQuranSearchLoading(isLoading, progress = null) {
    this._isSearchLoading = isLoading;
    if (this._searchSubmitBtn) this._searchSubmitBtn.disabled = isLoading;
    if (!this._searchProgressEl) return;

    this._searchProgressEl.hidden = !isLoading;
    if (!isLoading) return;

    const done = Math.max(0, Number(progress?.done) || 0);
    const total = Math.max(1, Number(progress?.total) || 114);
    const percent = Math.min(100, Math.round((done / total) * 100));
    const source = progress?.source === "indexeddb" ? "cache" : "api";
    const ring = this._searchProgressEl.querySelector(
      ".pq-search-progress-ring",
    );
    if (ring) ring.style.setProperty("--pq-search-progress", `${percent}%`);
    if (this._searchProgressTextEl) {
      if (!progress) {
        this._searchProgressTextEl.textContent = "Searching Quran.com...";
      } else {
        this._searchProgressTextEl.textContent =
          progress?.source === "indexeddb" || progress?.source === "memory"
            ? "Loaded from IndexedDB cache"
            : `Loading from ${source}: ${done}/${total}`;
      }
    }
  }

  async runPocketQuranSearch() {
    const query = String(this._searchInput?.value || "").trim();
    if (!query) {
      this.renderPocketQuranSearchMessage("Type a word or phrase to search.");
      return;
    }

    if (this._isSearchLoading) return;

    const translationId = this.normalizeTranslationId(
      this.storage.getSettings()?.pocketQuran?.translationResourceId,
    );
    const translationLabel =
      PocketQuranManager.TRANSLATIONS[translationId]?.label || "Translation";

    this.renderPocketQuranSearchMessage(`Searching ${translationLabel}...`);
    this.setPocketQuranSearchLoading(true);

    try {
      const search = await this.fetchPocketQuranSearchResults(
        query,
        translationId,
      );
      let source = "api";
      let totalResults = search.totalResults;
      let results = this.buildPocketQuranSearchResults(query, search.results);
      if (!totalResults) {
        this.renderPocketQuranSearchMessage(
          "Quran.com direct search had no hits. Checking cached translation...",
        );
        const fallbackResults = await this.getFallbackTranslationSearchResults(
          query,
          translationId,
        );
        results = this.buildPocketQuranSearchResults(query, fallbackResults);
        totalResults = results.length;
        source = "cache";
      }
      this.renderPocketQuranSearchResults({
        query,
        results,
        totalResults,
        source,
        translationLabel,
      });
    } catch (e) {
      console.error("Pocket Quran search failed:", e);
      this.renderPocketQuranSearchMessage(
        "Could not prepare Quran search right now. Please try again.",
      );
    } finally {
      this.setPocketQuranSearchLoading(false);
    }
  }

  renderPocketQuranSearchMessage(message) {
    if (this._searchStatusEl) this._searchStatusEl.textContent = message;
    if (this._searchResultsEl) this._searchResultsEl.innerHTML = "";
    if (this._searchPaginationEl) this._searchPaginationEl.innerHTML = "";
  }

  renderPocketQuranSearchResults({
    query,
    results,
    totalResults,
    source,
    translationLabel,
  }) {
    if (!this._searchResultsEl || !this._searchStatusEl) return;

    const count = Array.isArray(results) ? results.length : 0;
    const total = Math.max(count, Number(totalResults) || 0);
    this._searchRenderedResults = Array.isArray(results) ? results : [];
    this._searchRenderedQuery = query;
    this._searchRenderedTranslationLabel = translationLabel;
    this._searchRenderedSource = source;
    this._searchRenderedTotal = total;
    this._searchResultPage = 1;

    if (!count) {
      this._searchStatusEl.textContent = `No results in ${translationLabel}.`;
      if (this._searchPaginationEl) this._searchPaginationEl.innerHTML = "";
      this._searchResultsEl.innerHTML = "";
      const empty = document.createElement("div");
      empty.className = "pq-search-empty";
      empty.textContent = `No matches for "${query}".`;
      this._searchResultsEl.appendChild(empty);
      return;
    }

    this.renderPocketQuranSearchResultPage(1);
  }

  renderPocketQuranSearchResultPage(page = 1) {
    if (!this._searchResultsEl || !this._searchStatusEl) return;

    const perPage = 100;
    const results = this._searchRenderedResults;
    const count = results.length;
    const totalPages = Math.max(1, Math.ceil(count / perPage));
    const currentPage = this.clampNumber(page, 1, totalPages, 1);
    const start = (currentPage - 1) * perPage;
    const visibleResults = results.slice(start, start + perPage);
    const sourceText =
      this._searchRenderedSource === "api"
        ? "Quran.com search"
        : "Loaded from cache";

    this._searchResultPage = currentPage;
    this._searchStatusEl.textContent = `Showing ${start + 1}-${Math.min(
      start + visibleResults.length,
      count,
    )} of ${this._searchRenderedTotal} result${
      this._searchRenderedTotal === 1 ? "" : "s"
    } in ${this._searchRenderedTranslationLabel}. ${sourceText}.`;
    this._searchResultsEl.innerHTML = "";

    visibleResults.forEach((result) => {
      const item = document.createElement("div");
      item.className = "pq-search-result";
      item.setAttribute("role", "listitem");

      const meta = document.createElement("div");
      meta.className = "pq-search-result-meta";

      const metaText = document.createElement("span");
      metaText.className = "pq-search-result-meta-text";
      metaText.textContent = `${this.getSurahNameSimple(result.surah)} ${result.surah}:${result.ayah}`;

      const metaIcon = document.createElement("button");
      metaIcon.type = "button";
      metaIcon.className = "pq-search-result-meta-icon";
      metaIcon.setAttribute(
        "aria-label",
        `Open ${this.getSurahNameSimple(result.surah)} ${result.surah}:${result.ayah}`,
      );
      metaIcon.title = `Open ${this.getSurahNameSimple(result.surah)} ${result.surah}:${result.ayah}`;
      metaIcon.innerHTML =
        '<svg viewBox="0 0 24 24" width="14" height="14" focusable="false" aria-hidden="true"><path fill="currentColor" d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3zM5 5h6v2H7v10h10v-4h2v6H5V5z"/></svg>';

      const copyButton = document.createElement("button");
      copyButton.type = "button";
      copyButton.className = "pq-search-result-copy";
      copyButton.setAttribute(
        "aria-label",
        `Copy ayah ${result.surah}:${result.ayah}`,
      );
      copyButton.title = `Copy ayah ${result.surah}:${result.ayah}`;
      copyButton.innerHTML =
        '<svg viewBox="0 0 24 24" width="14" height="14" focusable="false" aria-hidden="true"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';

      meta.appendChild(metaText);
      meta.appendChild(metaIcon);
      meta.appendChild(copyButton);

      const arabic = document.createElement("div");
      arabic.className = "pq-search-result-ar";
      arabic.setAttribute("dir", "rtl");
      this.appendHighlightedText(
        arabic,
        result.arabicText,
        this._searchRenderedQuery,
      );

      const translation = document.createElement("div");
      translation.className = "pq-search-result-tr";
      this.appendHighlightedText(
        translation,
        result.translationText,
        this._searchRenderedQuery,
      );

      item.appendChild(meta);
      item.appendChild(arabic);
      item.appendChild(translation);
      metaIcon.addEventListener("click", () =>
        this.goToPocketQuranSearchResult(result),
      );
      copyButton.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const copied = await this.copyPocketQuranAyah(
          {
            text_uthmani: result.arabicText,
            translations: [{ text: result.translationText }],
          },
          result.surah,
          result.ayah,
        );
        if (copied) this.showPocketQuranCopyIndicator(copyButton);
      });
      this._searchResultsEl.appendChild(item);
    });

    this.renderPocketQuranSearchPagination(totalPages, currentPage);
  }

  renderPocketQuranSearchPagination(totalPages, currentPage) {
    if (!this._searchPaginationEl) return;
    this._searchPaginationEl.innerHTML = "";
    if (totalPages <= 1) return;

    this.renderPagination(
      this._searchPaginationEl,
      totalPages,
      currentPage,
      (page) => this.renderPocketQuranSearchResultPage(page),
    );
  }

  async goToPocketQuranSearchResult(result) {
    this.closePocketQuranSearchModal();
    await this.setActiveSurah(result.surah, {
      preserveAyah: false,
      autoScroll: false,
    });
    this.scrollToAyah(result.ayah, { persist: true, smooth: true });
  }

  appendHighlightedText(container, text, query) {
    if (!container) return;
    container.textContent = "";

    const value = String(text || "");
    const terms = String(query || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

    if (!value || !terms.length) {
      container.textContent = value;
      return;
    }

    const regex = new RegExp(`(${terms.join("|")})`, "gi");
    let lastIndex = 0;
    value.replace(regex, (match, _term, offset) => {
      if (offset > lastIndex) {
        container.appendChild(
          document.createTextNode(value.slice(lastIndex, offset)),
        );
      }
      const mark = document.createElement("mark");
      mark.className = "pq-search-highlight";
      mark.textContent = match;
      container.appendChild(mark);
      lastIndex = offset + match.length;
      return match;
    });

    if (lastIndex < value.length) {
      container.appendChild(document.createTextNode(value.slice(lastIndex)));
    }
  }
});

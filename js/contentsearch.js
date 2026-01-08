/**
 * Content Search Manager
 * Provides a shared search modal for Quotes / Adhkar / Hadith.
 *
 * Requirements:
 * - Single input
 * - Search by title, text, reference/source
 * - Use current language setting (EN/ID only for now)
 * - Paginate when results > 5
 */

class ContentSearchManager {
  static RESULTS_PER_PAGE = 5;

  constructor({ storage, quotes, adhkar, hadith }) {
    this.storage = storage;
    this.quotes = quotes;
    this.adhkar = adhkar;
    this.hadith = hadith;

    this.modalEl = null;
    this.closeBtn = null;
    this.titleEl = null;
    this.inputEl = null;
    this.resultsEl = null;
    this.paginationEl = null;

    this._activeContext = null; // 'quotes' | 'adhkar' | 'hadith'
    this._query = "";
    this._page = 1;

    this._bound = false;
  }

  init() {
    this.cacheElements();
    this.bindModalEvents();
    this.createSearchButtons();
  }

  cacheElements() {
    this.modalEl = document.getElementById("contentSearchModal");
    this.closeBtn = document.getElementById("closeContentSearchModal");
    this.titleEl = document.getElementById("contentSearchTitle");
    this.inputEl = document.getElementById("contentSearchInput");
    this.resultsEl = document.getElementById("contentSearchResults");
    this.paginationEl = document.getElementById("contentSearchPagination");
  }

  bindModalEvents() {
    if (this._bound) return;
    this._bound = true;

    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => this.close());
    }

    if (this.modalEl) {
      this.modalEl.addEventListener("click", (e) => {
        if (e.target === this.modalEl) this.close();
      });
    }

    if (this.inputEl) {
      this.inputEl.addEventListener("input", (e) => {
        this._query = String(e.target.value || "");
        this._page = 1;
        this.render();
      });

      // Prevent Enter from submitting anything (even if nested in a form later).
      this.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
        }
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen()) {
        e.preventDefault();
        this.close();
      }
    });
  }

  isOpen() {
    return !!this.modalEl?.classList.contains("active");
  }

  open(context) {
    this.cacheElements();

    if (!this.modalEl || !this.inputEl || !this.resultsEl || !this.titleEl) {
      return;
    }

    this._activeContext = context;
    this._page = 1;

    const title =
      context === "quotes"
        ? "🔎 Search Quotes"
        : context === "adhkar"
        ? "🔎 Search Adhkar"
        : context === "hadith"
        ? "🔎 Search Hadith"
        : "🔎 Search";

    this.titleEl.textContent = title;

    this.modalEl.classList.add("active");
    this.modalEl.setAttribute("aria-hidden", "false");

    this.inputEl.value = "";
    this._query = "";

    this.render();

    setTimeout(() => {
      try {
        this.inputEl.focus();
      } catch (e) {}
    }, 50);
  }

  close() {
    if (!this.modalEl) return;
    this.modalEl.classList.remove("active");
    this.modalEl.setAttribute("aria-hidden", "true");
    this._activeContext = null;
  }

  createSearchButtons() {
    this.createQuoteSearchButton();
    this.createCardSearchButton({ cardId: "adhkarCard", context: "adhkar" });
    this.createCardSearchButton({ cardId: "hadithCard", context: "hadith" });
  }

  createQuoteSearchButton() {
    const container = document.querySelector("#quoteSection .quote-container");
    if (!container) return;

    if (container.querySelector(".quote-search-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "adhkar-set-selector-btn quote-search-btn";
    btn.innerHTML = "🔎︎";
    btn.title = "Search quotes";
    btn.setAttribute("aria-label", "Search quotes");

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      this.open("quotes");
    });

    container.appendChild(btn);
  }

  createCardSearchButton({ cardId, context }) {
    const headerActions = document.querySelector(
      `#${cardId} .card-header-actions`
    );
    if (!headerActions) return;

    const cls = `content-search-btn-${context}`;
    if (headerActions.querySelector(`.${cls}`)) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `adhkar-set-selector-btn content-search-btn ${cls}`;
    btn.innerHTML = "🔎︎";

    const label =
      context === "adhkar"
        ? "Search adhkar"
        : context === "hadith"
        ? "Search hadith"
        : "Search";

    btn.title = label;
    btn.setAttribute("aria-label", label);

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      this.open(context);
    });

    // Append last so it sits at the far top-right.
    headerActions.appendChild(btn);
  }

  // ---------- Search logic ----------

  getActiveLanguageCode() {
    const normalize = (x) =>
      typeof x === "string" || typeof x === "number"
        ? String(x).trim().toLowerCase()
        : "";

    let lang = "en";

    if (this._activeContext === "quotes") {
      lang = normalize(this.quotes?.getSelectedDefaultLanguageCode?.());
    } else if (this._activeContext === "adhkar") {
      lang = normalize(this.adhkar?.getSelectedLanguageCode?.());
    } else if (this._activeContext === "hadith") {
      lang = normalize(this.hadith?.getSelectedLanguageCode?.());
    }

    // EN/ID only for now
    if (lang !== "en" && lang !== "id") lang = "en";
    return lang;
  }

  getContextItems(lang) {
    if (this._activeContext === "quotes") {
      return this.getQuoteItems(lang);
    }
    if (this._activeContext === "adhkar") {
      return this.getAdhkarItems(lang);
    }
    if (this._activeContext === "hadith") {
      return this.getHadithItems(lang);
    }
    return [];
  }

  getQuoteItems(lang) {
    if (!this.quotes?.getAvailableQuotes) return [];

    const quotes = this.quotes.getAvailableQuotes();
    if (!Array.isArray(quotes) || !quotes.length) return [];

    const getTextForLang = (q) => {
      if (!q) return "";
      if (q._isDefault) {
        const k = `text_${lang}`;
        if (q[k]) return String(q[k]);
        if (q.text_en) return String(q.text_en);
        if (q.text) return String(q.text);
        return "";
      }

      if (typeof q.text === "string") return q.text;
      if (typeof q.text_en === "string") return q.text_en;
      return "";
    };

    return quotes.map((q, idx) => {
      const type = typeof q?.type === "string" ? q.type : "quote";
      const title = type
        ? type.charAt(0).toUpperCase() + type.slice(1)
        : "Quote";

      const text = getTextForLang(q);
      const source = typeof q?.source === "string" ? q.source : "";

      return {
        _context: "quotes",
        _raw: q,
        _index: idx,
        title,
        text,
        source,
      };
    });
  }

  getAdhkarItems(lang) {
    const activeSet = this.adhkar?.getActiveSet?.();
    const cards = activeSet?.cards;
    if (!Array.isArray(cards) || !cards.length) return [];

    const titleForLang = (c) => {
      if (!c) return "";
      const k = `title_${lang}`;
      if (c[k]) return String(c[k]);
      if (c.title) return String(c.title);
      if (c.title_en) return String(c.title_en);
      return "";
    };

    const textForLang = (c) => {
      if (!c) return "";
      const k = `translation_${lang}`;
      if (c[k]) return String(c[k]);
      if (c.translation_en) return String(c.translation_en);
      if (c.translation) return String(c.translation);
      if (c.english) return String(c.english);
      return "";
    };

    return cards.map((c, idx) => {
      const title = titleForLang(c);
      const text = textForLang(c);
      const source = typeof c?.reference === "string" ? c.reference : "";

      return {
        _context: "adhkar",
        _raw: c,
        _index: idx,
        title,
        text,
        source,
      };
    });
  }

  getHadithItems(lang) {
    const activeSet = this.hadith?.getActiveSet?.();
    const cards = activeSet?.cards;
    if (!Array.isArray(cards) || !cards.length) return [];

    const titleForLang = (c) => {
      if (!c) return "";
      const k = `title_${lang}`;
      if (c[k]) return String(c[k]);
      if (c.title_en) return String(c.title_en);
      if (c.title) return String(c.title);
      return "";
    };

    const textForLang = (c) => {
      if (!c) return "";
      const k = `text_${lang}`;
      if (c[k]) return String(c[k]);
      if (c.text_en) return String(c.text_en);
      if (c.text) return String(c.text);
      return "";
    };

    const sourceFor = (c) => {
      const parts = [];
      if (typeof c?.reference === "string" && c.reference.trim()) {
        parts.push(String(c.reference));
      }
      if (typeof c?.narrator === "string" && c.narrator.trim()) {
        parts.push(String(c.narrator));
      }
      return parts.join(" • ");
    };

    return cards.map((c, idx) => {
      const title = titleForLang(c);
      const text = textForLang(c);
      const source = sourceFor(c);

      return {
        _context: "hadith",
        _raw: c,
        _index: idx,
        title,
        text,
        source,
      };
    });
  }

  filterItems(items, query) {
    const q = String(query || "")
      .trim()
      .toLowerCase();

    if (!q) return items;

    const tokens = q.split(/\s+/).filter(Boolean);
    if (!tokens.length) return items;

    return items.filter((it) => {
      const hay = `${it.title || ""}\n${it.text || ""}\n${it.source || ""}`
        .toLowerCase()
        .trim();

      return tokens.every((t) => hay.includes(t));
    });
  }

  clampPage(page, totalPages) {
    const p = parseInt(page, 10);
    if (!Number.isFinite(p)) return 1;
    return Math.max(1, Math.min(totalPages, p));
  }

  render() {
    if (!this.resultsEl || !this.paginationEl) return;

    const lang = this.getActiveLanguageCode();
    const all = this.getContextItems(lang);
    const filtered = this.filterItems(all, this._query);

    const total = filtered.length;
    const perPage = ContentSearchManager.RESULTS_PER_PAGE;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    this._page = this.clampPage(this._page, totalPages);

    const start = (this._page - 1) * perPage;
    const pageItems = filtered.slice(start, start + perPage);

    this.renderResults(pageItems, total);
    this.renderPagination(totalPages);
  }

  renderResults(items, total) {
    if (!this.resultsEl) return;

    this.resultsEl.innerHTML = "";

    if (!total) {
      const empty = document.createElement("div");
      empty.className = "content-search-empty";
      empty.textContent = "No results found.";
      this.resultsEl.appendChild(empty);
      return;
    }

    for (const it of items) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "content-search-result";

      const title = document.createElement("div");
      title.className = "content-search-result-title";
      title.textContent = String(it.title || "(Untitled)");

      const snippet = document.createElement("div");
      snippet.className = "content-search-result-snippet";
      snippet.textContent = this.makeSnippet(String(it.text || ""));

      const meta = document.createElement("div");
      meta.className = "content-search-result-meta";

      if (it._context === "adhkar" || it._context === "hadith") {
        const idx = document.createElement("span");
        idx.className = "content-search-result-meta-chip";
        idx.textContent = `#${(it._index ?? 0) + 1}`;
        meta.appendChild(idx);
      }

      if (it.source) {
        const src = document.createElement("span");
        src.className = "content-search-result-meta-chip";
        src.textContent = String(it.source);
        meta.appendChild(src);
      }

      btn.appendChild(title);
      if (snippet.textContent) btn.appendChild(snippet);
      if (meta.childNodes.length) btn.appendChild(meta);

      btn.addEventListener("click", () => {
        this.selectResult(it);
      });

      this.resultsEl.appendChild(btn);
    }
  }

  makeSnippet(text) {
    const t = String(text || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!t) return "";
    const max = 180;
    if (t.length <= max) return t;
    return t.slice(0, max - 1) + "…";
  }

  renderPagination(totalPages) {
    if (!this.paginationEl) return;

    const shouldShow = totalPages > 1;
    this.paginationEl.hidden = !shouldShow;
    if (!shouldShow) {
      this.paginationEl.innerHTML = "";
      return;
    }

    const makeBtn = ({ label, page, disabled, active }) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "adhkar-set-page-btn";
      if (active) b.classList.add("active");
      b.disabled = !!disabled;
      b.textContent = label;
      b.addEventListener("click", () => {
        this._page = page;
        this.render();
      });
      return b;
    };

    const p = this._page;

    this.paginationEl.innerHTML = "";

    this.paginationEl.appendChild(
      makeBtn({
        label: "Prev",
        page: Math.max(1, p - 1),
        disabled: p <= 1,
        active: false,
      })
    );

    const makeEllipsis = () => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "adhkar-set-page-btn";
      b.disabled = true;
      b.textContent = "…";
      return b;
    };

    // Always show first + last page for easier navigation
    const addPageBtn = (i) => {
      this.paginationEl.appendChild(
        makeBtn({
          label: String(i),
          page: i,
          disabled: false,
          active: i === p,
        })
      );
    };

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) addPageBtn(i);
    } else {
      addPageBtn(1);

      // 3-page window around current (bounded away from ends)
      let start = Math.max(2, p - 1);
      let end = Math.min(totalPages - 1, p + 1);

      // Expand window to 3 pages when near the edges
      while (end - start + 1 < 3) {
        if (start > 2) start -= 1;
        else if (end < totalPages - 1) end += 1;
        else break;
      }

      if (start > 2) this.paginationEl.appendChild(makeEllipsis());

      for (let i = start; i <= end; i++) addPageBtn(i);

      if (end < totalPages - 1) this.paginationEl.appendChild(makeEllipsis());

      addPageBtn(totalPages);
    }

    this.paginationEl.appendChild(
      makeBtn({
        label: "Next",
        page: Math.min(totalPages, p + 1),
        disabled: p >= totalPages,
        active: false,
      })
    );
  }

  selectResult(it) {
    if (!it) return;

    if (it._context === "quotes") {
      // Prefer QuotesManager public API.
      if (this.quotes?.setCurrentQuote) {
        try {
          this.quotes.setCurrentQuote(it._raw, { pushToHistory: true });
        } catch (e) {}
      }
    }

    if (it._context === "adhkar") {
      if (this.adhkar?.setCurrentCardIndex) {
        try {
          this.adhkar.setCurrentCardIndex(it._index, { cancelAnimation: true });
        } catch (e) {}
      }
    }

    if (it._context === "hadith") {
      if (this.hadith?.setCurrentCardIndex) {
        try {
          this.hadith.setCurrentCardIndex(it._index, { cancelAnimation: true });
        } catch (e) {}
      }
    }

    this.close();
  }
}

// Export for integration
window.ContentSearchManager = ContentSearchManager;

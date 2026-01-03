/**
 * Pocket Quran Manager
 * Full-width Quran reader with Surah selector, Ayah navigation, and per-language translations.
 * Data source: https://api.quran.com (public API v4)
 *
 * Features a high-performance virtualized infinite scroll that renders only
 * ~20 ayahs at a time while maintaining smooth scrolling and stable positions.
 */

class PocketQuranManager {
  static API_BASE = "https://api.quran.com/api/v4";

  // Hard-coded to only free/open translations we verified exist in the Quran.com API.
  static TRANSLATIONS = {
    85: { label: "M.A.S. Abdel Haleem", language: "English" },
    84: { label: "T. Usmani", language: "English" },
    95: { label: "A. Maududi (Tafhim commentary)", language: "English" },
    19: { label: "M. Pickthall", language: "English" },
    22: { label: "A Yusuf Ali", language: "English" },
    20: { label: "Saheeh International", language: "English" },
    203: { label: "Al-Hilali & Khan", language: "English" },
    57: { label: "Transliteration", language: "English" },

    134: { label: "King Fahad Quran Complex", language: "Indonesian" },
    141: { label: "The Sabiq Company", language: "Indonesian" },
    33: {
      label: "Indonesian Islamic Affairs Ministry",
      language: "Indonesian",
    },
  };

  // Virtualization constants
  static VISIBLE_AYAH_COUNT = 20; // Max ayahs rendered at once
  static ESTIMATED_AYAH_HEIGHT = 180; // Initial estimate, recalculated dynamically
  static BUFFER_AYAHS = 3; // Extra ayahs above/below viewport
  static SCROLL_THROTTLE_MS = 16; // ~60fps throttle

  constructor(storage) {
    this.storage = storage;

    // DOM references
    this.card = document.getElementById("pocketQuranCard");
    this.headerMeta = document.getElementById("pocketQuranHeaderMeta");
    this.surahCombobox = document.getElementById("pocketQuranSurahCombobox");
    this.surahInput = document.getElementById("pocketQuranSurahInput");
    this.surahDropdown = document.getElementById("pocketQuranSurahDropdown");
    this.surahListEl = document.getElementById("pocketQuranSurahList");
    this.contentEl = document.getElementById("pocketQuranContent");
    this.ayahPrevBtn = document.getElementById("pocketQuranAyahPrev");
    this.ayahNextBtn = document.getElementById("pocketQuranAyahNext");
    this.ayahCombobox = document.getElementById("pocketQuranAyahCombobox");
    this.ayahInput = document.getElementById("pocketQuranAyahInput");
    this.ayahDropdown = document.getElementById("pocketQuranAyahDropdown");
    this.ayahListEl = document.getElementById("pocketQuranAyahList");
    this.arabicSizeRange = document.getElementById(
      "pocketQuranArabicSizeRange"
    );
    this.arabicSizeValue = document.getElementById(
      "pocketQuranArabicSizeValue"
    );
    this.translationSizeRange = document.getElementById(
      "pocketQuranTranslationSizeRange"
    );
    this.translationSizeValue = document.getElementById(
      "pocketQuranTranslationSizeValue"
    );

    if (!this.card || !this.surahListEl || !this.contentEl) {
      return;
    }

    // State
    this._chapters = [];
    this._activeSurah = 1;
    this._activeAyah = 1;
    this._activeTranslationId = 85;
    this._fetchController = null;
    this._scrollHighlightTimer = null;
    this._ayahJumpTimer = null;
    this._surahQuery = "";

    // Verse caching
    this._versesCache = new Map();
    this._activeVerses = null;

    // Virtualization state
    this._virtualContainer = null;
    this._virtualSpacer = null;
    this._virtualContent = null;
    this._ayahHeights = new Map(); // Measured heights per ayah
    this._avgAyahHeight = PocketQuranManager.ESTIMATED_AYAH_HEIGHT;
    this._renderedRange = { start: 0, end: 0 };
    this._scrollRAF = null;
    this._isScrolling = false;
    this._lastScrollTop = 0;
    this._scrollDirection = "down";
    this._resizeObserver = null;

    // Dropdown portal state
    this._dropdownPortalled = new WeakSet();
    this._dropdownPositionRaf = null;

    this.init();
  }

  init() {
    const pq = this.storage.getSettings()?.pocketQuran || {};

    this._activeSurah = this.clampNumber(pq.lastSurahNumber, 1, 114, 1);
    this._activeAyah = this.clampNumber(pq.lastAyahNumber, 1, 286, 1);
    this._activeTranslationId = this.normalizeTranslationId(
      pq.translationResourceId
    );

    const arabicFontSize = this.clampNumber(pq.arabicFontSize, 8, 144, 32);
    const translationFontSize = this.clampNumber(
      pq.translationFontSize,
      8,
      144,
      18
    );

    this.applyFontSizes(arabicFontSize, translationFontSize, {
      syncInputs: true,
      persist: false,
    });

    this.setupEventListeners();

    this.renderLoading("Loading Surah list…");
    this.loadChaptersAndRenderSurahPicker().then(() => {
      this.setActiveSurah(this._activeSurah, {
        preserveAyah: true,
        autoScroll: false,
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════

  setupEventListeners() {
    // Surah selection (event delegation)
    this.surahListEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-surah]");
      if (!btn) return;
      const surah = parseInt(btn.dataset.surah, 10);
      if (!Number.isFinite(surah)) return;
      this._surahQuery = "";
      this.setActiveSurah(surah, { preserveAyah: false });
      this.updateSurahInputValue({ force: true });
      this.closeDropdown(this.surahDropdown);
    });

    const openSurahDropdown = () => {
      if (!this.surahDropdown) return;
      this.renderSurahList();
      this.openDropdown(this.surahDropdown);
    };

    if (this.surahInput) {
      this.surahInput.addEventListener("focus", () => {
        this._surahQuery = "";
        try {
          this.surahInput.select();
        } catch (e) {}
        openSurahDropdown();
      });
      this.surahInput.addEventListener("click", () => {
        this._surahQuery = "";
        openSurahDropdown();
      });
      this.surahInput.addEventListener("input", () => {
        this._surahQuery = this.surahInput.value || "";
        openSurahDropdown();
      });
      this.surahInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          this.closeDropdown(this.surahDropdown);
          return;
        }
        if (e.key !== "Enter") return;
        e.preventDefault();
        const match = this.findSurahFromQuery(this.surahInput.value);
        if (!match) return;
        this._surahQuery = "";
        this.setActiveSurah(match.id, { preserveAyah: false });
        this.updateSurahInputValue({ force: true });
        this.closeDropdown(this.surahDropdown);
      });
    }

    // Ayah list click
    this.ayahListEl?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-ayah]");
      if (!btn) return;
      const n = this.clampNumber(
        parseInt(btn.dataset.ayah, 10),
        1,
        this.getActiveSurahAyahCount() || 286,
        1
      );
      if (this.ayahInput) this.ayahInput.value = String(n);
      this.scrollToAyah(n, { persist: true });
      this.closeDropdown(this.ayahDropdown);
    });

    const openAyahDropdown = () => {
      if (!this.ayahDropdown) return;
      this.openDropdown(this.ayahDropdown);
      this.updateAyahDropdownActiveState();
    };

    const jumpToAyahFromInput = () => {
      const n = this.clampNumber(
        parseInt(this.ayahInput?.value, 10),
        1,
        this.getActiveSurahAyahCount() || 286,
        1
      );
      if (this.ayahInput) this.ayahInput.value = String(n);
      this.scrollToAyah(n, { persist: true });
    };

    if (this.ayahInput) {
      this.ayahInput.addEventListener("focus", openAyahDropdown);
      this.ayahInput.addEventListener("click", openAyahDropdown);
      this.ayahInput.addEventListener("input", () => {
        if (this._ayahJumpTimer) clearTimeout(this._ayahJumpTimer);
        this._ayahJumpTimer = setTimeout(() => jumpToAyahFromInput(), 250);
      });
      this.ayahInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          this.closeDropdown(this.ayahDropdown);
          return;
        }
        if (e.key !== "Enter") return;
        e.preventDefault();
        if (this._ayahJumpTimer) clearTimeout(this._ayahJumpTimer);
        jumpToAyahFromInput();
        this.closeDropdown(this.ayahDropdown);
      });
      this.ayahInput.addEventListener("change", () => {
        if (this._ayahJumpTimer) clearTimeout(this._ayahJumpTimer);
        jumpToAyahFromInput();
      });
    }

    if (this.ayahPrevBtn) {
      this.ayahPrevBtn.addEventListener("click", () => {
        const max = this.getActiveSurahAyahCount() || 286;
        const current = this.clampNumber(
          parseInt(this.ayahInput?.value, 10),
          1,
          max,
          1
        );
        const next = this.clampNumber(current - 1, 1, max, 1);
        if (this.ayahInput) this.ayahInput.value = String(next);
        this.scrollToAyah(next, { persist: true });
      });
    }

    if (this.ayahNextBtn) {
      this.ayahNextBtn.addEventListener("click", () => {
        const max = this.getActiveSurahAyahCount() || 286;
        const current = this.clampNumber(
          parseInt(this.ayahInput?.value, 10),
          1,
          max,
          1
        );
        const next = this.clampNumber(current + 1, 1, max, max);
        if (this.ayahInput) this.ayahInput.value = String(next);
        this.scrollToAyah(next, { persist: true });
      });
    }

    // Font size controls
    if (this.arabicSizeRange) {
      this.arabicSizeRange.addEventListener("input", () => {
        const a = this.clampNumber(
          parseInt(this.arabicSizeRange.value, 10),
          8,
          144,
          32
        );
        const t = this.clampNumber(
          parseInt(this.translationSizeRange?.value, 10),
          8,
          144,
          18
        );
        this.applyFontSizes(a, t, { syncInputs: true, persist: false });
        // Invalidate height cache when font size changes
        this._ayahHeights.clear();
        this.recalculateVirtualization();
      });
      this.arabicSizeRange.addEventListener("change", () => {
        this.persistPocketQuranSettings({
          arabicFontSize: this.clampNumber(
            parseInt(this.arabicSizeRange.value, 10),
            8,
            144,
            32
          ),
        });
      });
    }

    if (this.translationSizeRange) {
      this.translationSizeRange.addEventListener("input", () => {
        const a = this.clampNumber(
          parseInt(this.arabicSizeRange?.value, 10),
          8,
          144,
          32
        );
        const t = this.clampNumber(
          parseInt(this.translationSizeRange.value, 10),
          8,
          144,
          18
        );
        this.applyFontSizes(a, t, { syncInputs: true, persist: false });
        // Invalidate height cache when font size changes
        this._ayahHeights.clear();
        this.recalculateVirtualization();
      });
      this.translationSizeRange.addEventListener("change", () => {
        this.persistPocketQuranSettings({
          translationFontSize: this.clampNumber(
            parseInt(this.translationSizeRange.value, 10),
            8,
            144,
            18
          ),
        });
      });
    }

    // Close dropdowns when clicking outside
    document.addEventListener("click", (e) => {
      const t = e.target;
      const inSurahDropdown =
        this.surahDropdown &&
        (this.surahDropdown === t || this.surahDropdown.contains(t));
      const inAyahDropdown =
        this.ayahDropdown &&
        (this.ayahDropdown === t || this.ayahDropdown.contains(t));

      if (
        this.surahCombobox &&
        !this.surahCombobox.contains(t) &&
        !inSurahDropdown
      ) {
        this.closeDropdown(this.surahDropdown);
      }
      if (
        this.ayahCombobox &&
        !this.ayahCombobox.contains(t) &&
        !inAyahDropdown
      ) {
        this.closeDropdown(this.ayahDropdown);
      }
    });

    // Reposition dropdowns on scroll/resize
    const reposition = () => {
      if (this._dropdownPositionRaf)
        cancelAnimationFrame(this._dropdownPositionRaf);
      this._dropdownPositionRaf = requestAnimationFrame(() => {
        this.positionDropdown(this.surahDropdown);
        this.positionDropdown(this.ayahDropdown);
      });
    };

    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);

    // Blur update events
    document.addEventListener("md:card-blur-update", (e) => {
      const cardId = e?.detail?.cardId;
      if (cardId && cardId !== "pocketQuranCard") return;
      this.syncDropdownBlurMultiplier(this.surahDropdown);
      this.syncDropdownBlurMultiplier(this.ayahDropdown);
    });

    document.addEventListener("md:ui-blur-update", () => {
      this.syncDropdownBlurMultiplier(this.surahDropdown);
      this.syncDropdownBlurMultiplier(this.ayahDropdown);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIRTUALIZATION ENGINE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize the virtualized scroll container.
   * Creates a structure with:
   * - A fixed-height scroll container
   * - A spacer div that sets total scrollable height
   * - An absolutely positioned content div for rendered ayahs
   */
  initVirtualization() {
    if (!this.contentEl || !this._activeVerses?.length) return;

    // Clear previous content
    this.contentEl.innerHTML = "";
    this._ayahHeights.clear();
    this._renderedRange = { start: 0, end: 0 };

    // Create virtual scroll container
    this._virtualContainer = document.createElement("div");
    this._virtualContainer.className = "pq-virtual-container";
    this._virtualContainer.style.cssText = `
      position: relative;
      height: 1000px;
      overflow-y: auto;
      overflow-x: hidden;
      border-radius: var(--radius-lg);
    `;

    // Create spacer that determines total scroll height
    this._virtualSpacer = document.createElement("div");
    this._virtualSpacer.className = "pq-virtual-spacer";
    this._virtualSpacer.style.cssText = `
      position: relative;
      width: 100%;
      pointer-events: none;
    `;

    // Create content container for rendered ayahs
    this._virtualContent = document.createElement("div");
    this._virtualContent.className = "pq-virtual-content";
    this._virtualContent.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    `;

    this._virtualSpacer.appendChild(this._virtualContent);
    this._virtualContainer.appendChild(this._virtualSpacer);
    this.contentEl.appendChild(this._virtualContainer);

    // Calculate initial total height
    this.updateTotalHeight();

    // Attach scroll listener with throttling
    this._virtualContainer.addEventListener(
      "scroll",
      this.handleVirtualScroll.bind(this),
      { passive: true }
    );

    // Observe container resize
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    this._resizeObserver = new ResizeObserver(() => {
      this.recalculateVirtualization();
    });
    this._resizeObserver.observe(this._virtualContainer);

    // Initial render
    this.renderVisibleAyahs(0);
  }

  /**
   * Calculate the total scrollable height based on estimated/measured ayah heights.
   */
  updateTotalHeight() {
    if (!this._virtualSpacer || !this._activeVerses?.length) return;

    let totalHeight = 0;
    const total = this._activeVerses.length;
    const gap = 16; // var(--spacing-md) ≈ 16px

    for (let i = 0; i < total; i++) {
      const measuredHeight = this._ayahHeights.get(i);
      totalHeight += (measuredHeight ?? this._avgAyahHeight) + gap;
    }

    this._virtualSpacer.style.height = `${totalHeight}px`;
  }

  /**
   * Get the scroll offset for a specific ayah index.
   */
  getAyahOffset(index) {
    let offset = 0;
    const gap = 16;

    for (let i = 0; i < index; i++) {
      const height = this._ayahHeights.get(i) ?? this._avgAyahHeight;
      offset += height + gap;
    }

    return offset;
  }

  /**
   * Find which ayah index is at a given scroll offset.
   */
  getAyahAtOffset(scrollTop) {
    if (!this._activeVerses?.length) return 0;

    let offset = 0;
    const gap = 16;
    const total = this._activeVerses.length;

    for (let i = 0; i < total; i++) {
      const height = this._ayahHeights.get(i) ?? this._avgAyahHeight;
      if (offset + height + gap > scrollTop) {
        return i;
      }
      offset += height + gap;
    }

    return total - 1;
  }

  /**
   * Handle scroll events with RAF throttling.
   */
  handleVirtualScroll() {
    if (this._scrollRAF) return;

    this._scrollRAF = requestAnimationFrame(() => {
      this._scrollRAF = null;

      if (!this._virtualContainer) return;

      const scrollTop = this._virtualContainer.scrollTop;

      // Track scroll direction
      this._scrollDirection = scrollTop > this._lastScrollTop ? "down" : "up";
      this._lastScrollTop = scrollTop;

      // Find the ayah at current scroll position
      const firstVisibleIndex = this.getAyahAtOffset(scrollTop);

      // Calculate visible range with buffer
      const buffer = PocketQuranManager.BUFFER_AYAHS;
      const visibleCount = PocketQuranManager.VISIBLE_AYAH_COUNT;
      const total = this._activeVerses?.length || 0;

      const start = Math.max(0, firstVisibleIndex - buffer);
      const end = Math.min(
        total - 1,
        firstVisibleIndex + visibleCount + buffer
      );

      // Only re-render if range changed significantly
      if (
        start !== this._renderedRange.start ||
        end !== this._renderedRange.end
      ) {
        this.renderVisibleAyahs(start, end);
      }

      // Update active ayah for UI
      this._activeAyah = firstVisibleIndex + 1;
      if (this.ayahInput && document.activeElement !== this.ayahInput) {
        this.ayahInput.value = String(this._activeAyah);
      }
      this.updateAyahDropdownActiveState();
    });
  }

  /**
   * Render only the visible ayahs within the given range.
   */
  renderVisibleAyahs(start, end) {
    if (!this._virtualContent || !this._activeVerses?.length) return;

    const total = this._activeVerses.length;
    start = Math.max(0, start ?? 0);
    end = Math.min(
      total - 1,
      end ?? start + PocketQuranManager.VISIBLE_AYAH_COUNT - 1
    );

    // Skip if same range
    if (
      start === this._renderedRange.start &&
      end === this._renderedRange.end
    ) {
      return;
    }

    this._renderedRange = { start, end };

    // Calculate top offset for positioning
    const topOffset = this.getAyahOffset(start);
    this._virtualContent.style.transform = `translateY(${topOffset}px)`;

    // Build fragment for new ayahs
    const fragment = document.createDocumentFragment();

    for (let i = start; i <= end; i++) {
      const verse = this._activeVerses[i];
      if (!verse) continue;

      const ayahEl = this.createAyahElement(verse, i);
      fragment.appendChild(ayahEl);
    }

    // Replace content
    this._virtualContent.innerHTML = "";
    this._virtualContent.appendChild(fragment);

    // Measure rendered ayahs and update heights
    requestAnimationFrame(() => {
      this.measureRenderedAyahs();
    });
  }

  /**
   * Measure the actual heights of rendered ayahs and update the cache.
   */
  measureRenderedAyahs() {
    if (!this._virtualContent) return;

    const ayahEls = this._virtualContent.querySelectorAll(".pocket-quran-ayah");
    let totalMeasured = 0;
    let measureCount = 0;

    ayahEls.forEach((el) => {
      const index = parseInt(el.dataset.index, 10);
      if (!Number.isFinite(index)) return;

      const rect = el.getBoundingClientRect();
      const height = rect.height;

      if (height > 0) {
        this._ayahHeights.set(index, height);
        totalMeasured += height;
        measureCount++;
      }
    });

    // Update average height
    if (measureCount > 0) {
      const newAvg = totalMeasured / measureCount;
      // Smooth the average to avoid sudden jumps
      this._avgAyahHeight = this._avgAyahHeight * 0.7 + newAvg * 0.3;
    }

    // Update total height if measurements changed
    this.updateTotalHeight();
  }

  /**
   * Recalculate virtualization after resize or content changes.
   */
  recalculateVirtualization() {
    if (!this._virtualContainer || !this._activeVerses?.length) return;

    const scrollTop = this._virtualContainer.scrollTop;
    const firstVisible = this.getAyahAtOffset(scrollTop);

    this.updateTotalHeight();

    const buffer = PocketQuranManager.BUFFER_AYAHS;
    const visibleCount = PocketQuranManager.VISIBLE_AYAH_COUNT;
    const total = this._activeVerses.length;

    const start = Math.max(0, firstVisible - buffer);
    const end = Math.min(total - 1, firstVisible + visibleCount + buffer);

    // Force re-render
    this._renderedRange = { start: -1, end: -1 };
    this.renderVisibleAyahs(start, end);
  }

  /**
   * Scroll to a specific ayah number (1-indexed).
   */
  scrollToAyah(ayahNumber, opts = {}) {
    const { persist = true, smooth = true, skipScroll = false } = opts;

    const max = this.getActiveSurahAyahCount() || 286;
    const n = this.clampNumber(ayahNumber, 1, max, 1);
    this._activeAyah = n;

    if (this.ayahInput) {
      this.ayahInput.value = String(n);
    }

    if (!skipScroll && this._virtualContainer && this._activeVerses?.length) {
      const index = n - 1; // Convert to 0-indexed
      const offset = this.getAyahOffset(index);

      // Ensure the ayah is rendered first
      const buffer = PocketQuranManager.BUFFER_AYAHS;
      const visibleCount = PocketQuranManager.VISIBLE_AYAH_COUNT;
      const total = this._activeVerses.length;

      const start = Math.max(0, index - buffer);
      const end = Math.min(total - 1, index + visibleCount + buffer);

      this.renderVisibleAyahs(start, end);

      // Scroll to the ayah
      this._virtualContainer.scrollTo({
        top: offset,
        behavior: smooth ? "smooth" : "auto",
      });

      // Highlight the ayah after scroll
      setTimeout(
        () => {
          this.highlightAyah(n);
        },
        smooth ? 300 : 50
      );
    }

    if (persist) {
      this.persistPocketQuranSettings({
        lastAyahNumber: n,
        lastSurahNumber: this._activeSurah,
      });
    }

    this.updateAyahDropdownActiveState();
  }

  /**
   * Apply highlight animation to an ayah.
   */
  highlightAyah(ayahNumber) {
    const el = this._virtualContent?.querySelector(
      `[data-ayah="${ayahNumber}"]`
    );
    if (!el) return;

    if (this._scrollHighlightTimer) clearTimeout(this._scrollHighlightTimer);

    el.classList.remove("pq-highlight");
    void el.offsetWidth; // Force reflow
    el.classList.add("pq-highlight");

    this._scrollHighlightTimer = setTimeout(() => {
      el.classList.remove("pq-highlight");
    }, 1400);
  }

  /**
   * Create an ayah DOM element.
   */
  createAyahElement(verse, index) {
    const ayahNumber = verse?.verse_number;

    const ayahEl = document.createElement("div");
    ayahEl.className = "pocket-quran-ayah";
    ayahEl.id = `pocketQuranAyah-${ayahNumber}`;
    ayahEl.dataset.ayah = String(ayahNumber);
    ayahEl.dataset.index = String(index);

    const badge = document.createElement("div");
    badge.className = "pocket-quran-ayah-badge";
    badge.textContent = String(ayahNumber);

    const ar = document.createElement("div");
    ar.className = "pocket-quran-ayah-ar";
    ar.setAttribute("dir", "rtl");
    ar.textContent = verse?.text_uthmani || "";

    const tr = document.createElement("div");
    tr.className = "pocket-quran-ayah-tr";
    const rawTranslation = Array.isArray(verse?.translations)
      ? verse.translations[0]?.text
      : "";
    tr.textContent = this.stripHtmlToText(rawTranslation || "");

    ayahEl.appendChild(badge);
    ayahEl.appendChild(ar);
    ayahEl.appendChild(tr);

    return ayahEl;
  }

  /**
   * Clean up virtualization resources.
   */
  destroyVirtualization() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._scrollRAF) {
      cancelAnimationFrame(this._scrollRAF);
      this._scrollRAF = null;
    }
    this._virtualContainer = null;
    this._virtualSpacer = null;
    this._virtualContent = null;
    this._ayahHeights.clear();
    this._renderedRange = { start: 0, end: 0 };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DROPDOWN MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  getEffectiveBlurMultiplier() {
    if (this.card) {
      try {
        const inlineVal = this.card.style.getPropertyValue(
          "--ui-blur-multiplier"
        );
        if (inlineVal) {
          const n = parseFloat(String(inlineVal).trim());
          if (Number.isFinite(n) && n >= 0) return n;
        }
      } catch (e) {}
    }

    const readComputed = (el) => {
      if (!el) return null;
      try {
        const raw =
          getComputedStyle(el).getPropertyValue("--ui-blur-multiplier") || "";
        const n = parseFloat(String(raw).trim());
        if (Number.isFinite(n) && n >= 0) return n;
      } catch (e) {}
      return null;
    };

    return (
      readComputed(this.card) ?? readComputed(document.documentElement) ?? 1
    );
  }

  syncDropdownBlurMultiplier(el) {
    if (!el) return;
    const multiplier = this.getEffectiveBlurMultiplier();
    try {
      el.style.setProperty("--ui-blur-multiplier", String(multiplier));
    } catch (e) {}
  }

  ensureDropdownPortal(el) {
    if (!el) return;
    if (this._dropdownPortalled?.has(el)) return;
    try {
      document.body.appendChild(el);
      el.classList.add("pq-portal");
      this._dropdownPortalled.add(el);
    } catch (e) {}
    this.syncDropdownBlurMultiplier(el);
  }

  positionDropdown(el) {
    if (!el || el.hidden) return;

    this.syncDropdownBlurMultiplier(el);

    let anchor = null;
    if (el === this.surahDropdown) anchor = this.surahCombobox;
    if (el === this.ayahDropdown) anchor = this.ayahCombobox;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 10;

    const belowSpace = window.innerHeight - rect.bottom - gap - viewportPadding;
    const aboveSpace = rect.top - gap - viewportPadding;
    const preferAbove = belowSpace < 200 && aboveSpace > belowSpace;

    const left = Math.max(viewportPadding, Math.round(rect.left));
    const width = Math.max(220, Math.round(rect.width));
    const maxListHeight = Math.min(
      420,
      Math.max(180, Math.floor((preferAbove ? aboveSpace : belowSpace) - 10))
    );

    el.style.left = `${left}px`;
    el.style.width = `${width}px`;
    el.style.right = "auto";

    if (preferAbove) {
      const bottom = Math.max(
        viewportPadding,
        Math.round(window.innerHeight - rect.top + gap)
      );
      el.style.top = "auto";
      el.style.bottom = `${bottom}px`;
    } else {
      const top = Math.max(viewportPadding, Math.round(rect.bottom + gap));
      el.style.top = `${top}px`;
      el.style.bottom = "auto";
    }

    const list = el.querySelector(".pocket-quran-dropdown-list");
    if (list) {
      list.style.maxHeight = `${maxListHeight}px`;
    }
  }

  openDropdown(el) {
    if (!el) return;
    this.ensureDropdownPortal(el);
    try {
      if (el === this.surahDropdown && this.surahCombobox)
        this.surahCombobox.classList.add("pq-open");
      if (el === this.ayahDropdown && this.ayahCombobox)
        this.ayahCombobox.classList.add("pq-open");
    } catch (e) {}
    el.hidden = false;
    this.syncDropdownBlurMultiplier(el);
    this.positionDropdown(el);
  }

  closeDropdown(el) {
    if (!el) return;
    try {
      if (el === this.surahDropdown && this.surahCombobox)
        this.surahCombobox.classList.remove("pq-open");
      if (el === this.ayahDropdown && this.ayahCombobox)
        this.ayahCombobox.classList.remove("pq-open");
    } catch (e) {}
    el.hidden = true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SURAH MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  formatSurahLabel(ch) {
    if (!ch) return "";
    const en = ch.name_simple || `Surah ${ch.id}`;
    const ar = ch.name_arabic ? ` ${ch.name_arabic}` : "";
    return `${ch.id}. ${en}${ar}`;
  }

  updateSurahInputValue(opts = {}) {
    const { force = false } = opts;
    if (!this.surahInput) return;
    if (!force && document.activeElement === this.surahInput) return;
    const chapter = this._chapters.find((c) => c.id === this._activeSurah);
    this.surahInput.value = this.formatSurahLabel(chapter);
  }

  getFilteredChapters(query) {
    const q = String(query || "").trim();
    if (!q) return this._chapters;

    const lower = q.toLowerCase();
    const isNumber = /^\d+$/.test(q);

    return this._chapters.filter((c) => {
      if (isNumber) {
        return String(c.id).startsWith(q);
      }
      const en = String(c.name_simple || "").toLowerCase();
      const ar = String(c.name_arabic || "");
      return en.includes(lower) || ar.includes(q);
    });
  }

  findSurahFromQuery(query) {
    const q = String(query || "").trim();
    if (!q) return null;

    const leadingNumber = q.match(/^\s*(\d{1,3})\b/);
    if (leadingNumber) {
      const id = parseInt(leadingNumber[1], 10);
      if (Number.isFinite(id)) {
        const ch = this._chapters.find((c) => c.id === id);
        if (ch) return ch;
      }
    }

    if (/^\d+$/.test(q)) {
      const id = parseInt(q, 10);
      return this._chapters.find((c) => c.id === id) || null;
    }

    const lower = q.toLowerCase();
    const exact = this._chapters.find(
      (c) => String(c.name_simple || "").toLowerCase() === lower
    );
    if (exact) return exact;

    const filtered = this.getFilteredChapters(q);
    return filtered.length ? filtered[0] : null;
  }

  getVersesCacheKey(surah, translationId) {
    return `${surah}|${translationId}`;
  }

  async loadChaptersAndRenderSurahPicker() {
    try {
      const cached = this.storage.get("pocketQuran_chapters_cache", null);
      const cachedAt = this.storage.get("pocketQuran_chapters_cache_at", 0);
      const freshEnough =
        Date.now() - (cachedAt || 0) < 1000 * 60 * 60 * 24 * 7;

      if (cached && Array.isArray(cached) && freshEnough) {
        this._chapters = cached;
        this.renderSurahList();
        this.updateSurahInputValue({ force: true });
        return;
      }

      const url = `${PocketQuranManager.API_BASE}/chapters?language=en`;
      const data = await this.fetchJson(url, { timeoutMs: 15000 });
      const chapters = Array.isArray(data?.chapters) ? data.chapters : [];

      this._chapters = chapters
        .map((c) => ({
          id: c.id,
          name_simple: c.name_simple,
          name_arabic: c.name_arabic,
          verses_count: c.verses_count,
        }))
        .filter((c) => Number.isFinite(c.id));

      this.storage.set("pocketQuran_chapters_cache", this._chapters);
      this.storage.set("pocketQuran_chapters_cache_at", Date.now());

      this.renderSurahList();
      this.updateSurahInputValue({ force: true });
    } catch (e) {
      console.error("PocketQuran: failed to load chapters", e);
      this._chapters = [];
      this.renderSurahList({ failed: true });
      this.renderError(
        "Could not load Surah list. Check your internet connection."
      );
    }
  }

  renderSurahList(opts = {}) {
    const { failed = false } = opts;

    if (!this.surahListEl) return;
    this.surahListEl.innerHTML = "";

    if (failed) {
      const div = document.createElement("div");
      div.className = "pocket-quran-dropdown-empty";
      div.textContent = "Surah list unavailable";
      this.surahListEl.appendChild(div);
      return;
    }

    const chapters = this.getFilteredChapters(this._surahQuery);
    const frag = document.createDocumentFragment();

    for (const ch of chapters) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pocket-quran-surah-item";
      btn.dataset.surah = String(ch.id);

      const num = document.createElement("span");
      num.className = "pq-surah-num";
      num.textContent = String(ch.id);

      const names = document.createElement("span");
      names.className = "pq-surah-names";

      const en = document.createElement("span");
      en.className = "pq-surah-en";
      en.textContent = ch.name_simple || `Surah ${ch.id}`;

      const ar = document.createElement("span");
      ar.className = "pq-surah-ar";
      ar.setAttribute("dir", "rtl");
      ar.textContent = ch.name_arabic || "";

      names.appendChild(en);
      names.appendChild(ar);
      btn.appendChild(num);
      btn.appendChild(names);
      frag.appendChild(btn);
    }

    this.surahListEl.appendChild(frag);
    this.updateSurahActiveState();
  }

  updateSurahActiveState() {
    if (!this.surahListEl) return;
    for (const btn of this.surahListEl.querySelectorAll(
      ".pocket-quran-surah-item"
    )) {
      const surah = parseInt(btn.dataset.surah, 10);
      btn.classList.toggle("active", surah === this._activeSurah);
      btn.setAttribute(
        "aria-current",
        surah === this._activeSurah ? "true" : "false"
      );
    }
  }

  async setActiveSurah(surahNumber, opts = {}) {
    const {
      preserveAyah = false,
      autoScroll = true,
      preserveDashboardScroll = true,
    } = opts;

    const restorePos = preserveDashboardScroll
      ? { x: window.scrollX || 0, y: window.scrollY || 0 }
      : null;

    const surah = this.clampNumber(surahNumber, 1, 114, 1);
    const versesAlreadyRendered = Boolean(
      this.contentEl?.querySelector?.(".pocket-quran-ayah")
    );

    if (surah === this._activeSurah && versesAlreadyRendered) {
      this.updateSurahActiveState();
      this.updateSurahInputValue({ force: true });
      return;
    }

    this._activeSurah = surah;
    if (!preserveAyah) this._activeAyah = 1;

    const persistPatch = {
      lastSurahNumber: surah,
      translationResourceId: this._activeTranslationId,
    };
    if (!preserveAyah) persistPatch.lastAyahNumber = 1;
    this.persistPocketQuranSettings(persistPatch);

    this.updateSurahActiveState();
    this.updateSurahInputValue({ force: true });

    await this.loadSurah(surah, { autoScroll, restorePos });

    if (restorePos) {
      // Double-rAF: wait for layout/paint so we don't fight reflow.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            window.scrollTo(restorePos.x, restorePos.y);
          } catch (e) {}
        });
      });
    }
  }

  async loadSurah(surah, opts = {}) {
    const { autoScroll = true, restorePos = null } = opts;
    const chapter = this._chapters.find((c) => c.id === surah);
    const surahName = chapter?.name_simple || `Surah ${surah}`;
    const surahNameAr = chapter?.name_arabic || "";

    // Clean up previous virtualization
    this.destroyVirtualization();
    this.renderLoading(`Loading ${surahName}…`);

    // Some browsers' scroll anchoring + dynamic card height can cause
    // unexpected dashboard jumps. Restore immediately after we mutate DOM.
    if (restorePos) {
      requestAnimationFrame(() => {
        try {
          window.scrollTo(restorePos.x, restorePos.y);
        } catch (e) {}
      });
    }

    try {
      if (this._fetchController) this._fetchController.abort();
    } catch (e) {}

    const controller = new AbortController();
    this._fetchController = controller;

    try {
      const translationId = this.normalizeTranslationId(
        this.storage.getSettings()?.pocketQuran?.translationResourceId
      );
      this._activeTranslationId = translationId;

      const cacheKey = this.getVersesCacheKey(surah, translationId);
      const cached = this._versesCache.get(cacheKey);
      const hasCached =
        cached && Array.isArray(cached.verses) && cached.verses.length;

      let verses = [];
      if (hasCached) {
        verses = cached.verses;
      } else {
        const url = `${PocketQuranManager.API_BASE}/verses/by_chapter/${surah}?fields=text_uthmani,verse_number,verse_key&translations=${translationId}&per_page=300`;
        const data = await this.fetchJson(url, {
          signal: controller.signal,
          timeoutMs: 20000,
        });
        verses = Array.isArray(data?.verses) ? data.verses : [];
        this._versesCache.set(cacheKey, { verses, fetchedAt: Date.now() });
      }

      if (!verses.length) {
        this.renderError("No verses returned by the API.");
        return;
      }

      this._activeVerses = verses;

      this.renderSurahHeader({
        surah,
        surahName,
        surahNameAr,
        versesCount: verses.length,
      });

      // Initialize virtualized rendering
      this.initVirtualization();

      // Restore again after the main content mounts (covers jumps triggered
      // by height changes between loading state and the virtual container).
      if (restorePos) {
        requestAnimationFrame(() => {
          try {
            window.scrollTo(restorePos.x, restorePos.y);
          } catch (e) {}
        });
      }

      this.updateAyahControls(verses.length);

      const desired = this.clampNumber(
        this.storage.getSettings()?.pocketQuran?.lastAyahNumber,
        1,
        verses.length,
        1
      );

      if (this.ayahInput) this.ayahInput.value = String(desired);

      // Scroll to the desired ayah
      if (autoScroll && desired > 1) {
        setTimeout(() => {
          this.scrollToAyah(desired, { persist: false, smooth: false });
        }, 100);
      }

      this.updateAyahDropdownActiveState();
    } catch (e) {
      if (e?.name === "AbortError") return;
      console.error("PocketQuran: failed to load surah", e);
      this.renderError("Could not load this Surah. Please try again.");
    } finally {
      if (this._fetchController === controller) this._fetchController = null;
    }
  }

  renderSurahHeader({ surah, surahName, surahNameAr, versesCount }) {
    if (!this.headerMeta) return;
    const translation =
      PocketQuranManager.TRANSLATIONS[this._activeTranslationId]?.label ||
      "Translation";
    this.headerMeta.textContent = `${surah}. ${surahName} · ${versesCount} ayahs · ${translation}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AYAH CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════

  updateAyahControls(ayahCount) {
    const max = this.clampNumber(ayahCount, 1, 286, 1);
    if (this.ayahInput && !this.ayahInput.value) {
      this.ayahInput.value = "1";
    }

    if (this.ayahListEl) {
      this.ayahListEl.innerHTML = "";
      const frag = document.createDocumentFragment();
      for (let i = 1; i <= max; i++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pocket-quran-ayah-option";
        btn.dataset.ayah = String(i);
        btn.textContent = String(i);
        frag.appendChild(btn);
      }
      this.ayahListEl.appendChild(frag);
    }

    this.updateAyahDropdownActiveState();
  }

  updateAyahDropdownActiveState() {
    if (!this.ayahListEl) return;
    const max = this.getActiveSurahAyahCount() || 286;
    const current = this.clampNumber(this._activeAyah, 1, max, 1);
    for (const btn of this.ayahListEl.querySelectorAll(
      ".pocket-quran-ayah-option"
    )) {
      const n = parseInt(btn.dataset.ayah, 10);
      btn.classList.toggle("active", n === current);
      btn.setAttribute("aria-selected", n === current ? "true" : "false");
    }
  }

  getActiveSurahAyahCount() {
    const chapter = this._chapters.find((c) => c.id === this._activeSurah);
    const count = chapter?.verses_count;
    return Number.isFinite(count) ? count : null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  renderLoading(message) {
    if (!this.contentEl) return;
    this.destroyVirtualization();
    this.contentEl.innerHTML = "";

    const div = document.createElement("div");
    div.className = "pocket-quran-loading";

    const spinner = document.createElement("div");
    spinner.className = "pocket-quran-spinner";

    const text = document.createElement("div");
    text.className = "pocket-quran-loading-text";
    text.textContent = message || "Loading…";

    div.appendChild(spinner);
    div.appendChild(text);
    this.contentEl.appendChild(div);
  }

  renderError(message) {
    if (!this.contentEl) return;
    this.destroyVirtualization();
    this.contentEl.innerHTML = "";

    const div = document.createElement("div");
    div.className = "pocket-quran-error";

    const text = document.createElement("div");
    text.className = "pocket-quran-error-text";
    text.textContent = message || "Something went wrong.";

    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "pocket-quran-retry-btn";
    retry.textContent = "Retry";
    retry.addEventListener("click", () => this.loadSurah(this._activeSurah));

    div.appendChild(text);
    div.appendChild(retry);
    this.contentEl.appendChild(div);
  }

  stripHtmlToText(html) {
    try {
      const div = document.createElement("div");
      div.innerHTML = String(html || "");
      return (div.textContent || "").replace(/\s+/g, " ").trim();
    } catch (e) {
      return String(html || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeTranslationId(value) {
    const n = parseInt(value, 10);
    if (Number.isFinite(n) && PocketQuranManager.TRANSLATIONS[n]) return n;
    return 85;
  }

  clampNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  persistPocketQuranSettings(patch) {
    const settings = this.storage.getSettings();
    settings.pocketQuran = {
      ...(settings.pocketQuran || {}),
      ...(patch || {}),
    };
    this.storage.saveSettings(settings);
  }

  applyFontSizes(arabicPx, translationPx, opts = {}) {
    const { syncInputs = false, persist = false } = opts;

    const a = this.clampNumber(arabicPx, 8, 144, 32);
    const t = this.clampNumber(translationPx, 8, 144, 18);

    if (this.card) {
      this.card.style.setProperty("--pq-arabic-size", `${a}px`);
      this.card.style.setProperty("--pq-translation-size", `${t}px`);
    }

    if (syncInputs) {
      if (this.arabicSizeRange) this.arabicSizeRange.value = String(a);
      if (this.translationSizeRange)
        this.translationSizeRange.value = String(t);
      if (this.arabicSizeValue) this.arabicSizeValue.textContent = `${a}px`;
      if (this.translationSizeValue)
        this.translationSizeValue.textContent = `${t}px`;
    }

    if (persist) {
      this.persistPocketQuranSettings({
        arabicFontSize: a,
        translationFontSize: t,
      });
    }
  }

  async fetchJson(url, opts = {}) {
    const { signal, timeoutMs = 15000 } = opts;

    const controller = !signal ? new AbortController() : null;
    const timer = setTimeout(() => {
      try {
        if (controller) controller.abort();
      } catch (e) {}
    }, timeoutMs);

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: signal || controller.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }
}

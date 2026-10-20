/**
 * PocketQuranManager, part 2 of 6.
 * Moved out of js/pocketquran.js at method boundaries, so no single file carries the
 * whole class. The class itself is declared in js/pocketquran.js; load this after it.
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

  init() {
    const pq = this.storage.getSettings()?.pocketQuran || {};

    this._activeSurah = this.clampNumber(pq.lastSurahNumber, 1, 114, 1);
    this._activeAyah = this.clampNumber(pq.lastAyahNumber, 1, 286, 1);
    this._activeTranslationId = this.normalizeTranslationId(
      pq.translationResourceId,
    );

    const arabicFontSize = SettingsRegistry.coerce(
      "arabicFontSize",
      pq.arabicFontSize,
    );
    const translationFontSize = SettingsRegistry.coerce(
      "translationFontSize",
      pq.translationFontSize,
    );

    this.applyFontSizes(arabicFontSize, translationFontSize, {
      syncInputs: true,
      persist: false,
    });

    const requestedArabicVisibility = pq.showArabicText !== false;
    const requestedTranslationVisibility = pq.showTranslationText !== false;
    this.applyTextVisibility(
      requestedArabicVisibility,
      requestedTranslationVisibility,
      {
        persist: false,
        recalculate: false,
        allowBothOff: false,
      },
    );
    if (
      this._showArabicText !== requestedArabicVisibility ||
      this._showTranslationText !== requestedTranslationVisibility
    ) {
      this.persistPocketQuranSettings({
        showArabicText: this._showArabicText,
        showTranslationText: this._showTranslationText,
      });
    }

    // Initialize Arabic font family from settings
    this.applyArabicFontFamily(pq.arabicFontFamily, {
      persist: false,
      recalculate: false,
    });

    // Initialize translation font family from settings
    this.applyTranslationFontFamily(pq.translationFontFamily, {
      persist: false,
      recalculate: false,
    });

    // Initialize Tajweed colors from settings
    this.applyTajweedColors(pq.tajweedColors, { persist: false });

    // Initialize Tajweed mode from settings
    this._isTajweedMode = Boolean(pq.tajweedMode);
    this.updateTajweedToggleUI();

    // Ensure Tajweed availability matches the selected font
    this.syncTajweedAvailabilityForFont();

    // Initialize bookmark system
    this.ensureDefaultBookmarkCategory();
    this.createPocketQuranSearchButton();
    this.createBookmarkButton();
    this.createBookmarkModals();
    this.createTranslationModal();
    this.createFontPickerModal();

    // Initialize recitation system
    this.initRecitationSystem();

    this.setupEventListeners();

    this.renderLoading("Loading Surah list…");
    this.loadChaptersAndRenderSurahPicker().then(() => {
      this.setActiveSurah(this._activeSurah, {
        preserveAyah: true,
        autoScroll: true,
      });
    });
  }

  setupEventListeners() {
    const stopSmoothScrollForManualSeek = () => {
      if (!this._virtualContainer) return;

      // Cancel any in-flight smooth scroll immediately.
      if (this._restoreScrollBehaviorTimer) {
        clearTimeout(this._restoreScrollBehaviorTimer);
      }
      this._virtualContainer.style.scrollBehavior = "auto";

      // Restore quickly so other scrolls can still animate.
      this._restoreScrollBehaviorTimer = setTimeout(() => {
        if (!this._virtualContainer) return;
        this._virtualContainer.style.scrollBehavior = "";
      }, 120);
    };

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
      // Scroll to active surah after dropdown is visible
      requestAnimationFrame(() => {
        this.scrollSurahDropdownToActive();
      });
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
        1,
      );
      if (this.ayahInput) this.ayahInput.value = String(n);
      this.scrollToAyah(n, { persist: true });
      this.closeDropdown(this.ayahDropdown);
    });

    const openAyahDropdown = () => {
      if (!this.ayahDropdown) return;
      this.openDropdown(this.ayahDropdown);
      // Use requestAnimationFrame to ensure the dropdown is visible before scrolling
      requestAnimationFrame(() => {
        this.updateAyahDropdownActiveState();
      });
    };

    const jumpToAyahFromInput = () => {
      const n = this.clampNumber(
        parseInt(this.ayahInput?.value, 10),
        1,
        this.getActiveSurahAyahCount() || 286,
        1,
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
      this.ayahPrevBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this._navProcessing) return;
        this._navProcessing = true;

        stopSmoothScrollForManualSeek();

        const max = this.getActiveSurahAyahCount() || 286;
        const current =
          document.activeElement === this.ayahInput
            ? this.clampNumber(parseInt(this.ayahInput?.value, 10), 1, max, 1)
            : this.clampNumber(this._activeAyah, 1, max, 1);
        const next = this.clampNumber(current - 1, 1, max, 1);
        if (this.ayahInput) this.ayahInput.value = String(next);
        this.scrollToAyah(next, { persist: true, smooth: false });

        setTimeout(() => {
          this._navProcessing = false;
        }, 100);
      });
    }

    if (this.ayahNextBtn) {
      this.ayahNextBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this._navProcessing) return;
        this._navProcessing = true;

        stopSmoothScrollForManualSeek();

        const max = this.getActiveSurahAyahCount() || 286;
        const current =
          document.activeElement === this.ayahInput
            ? this.clampNumber(parseInt(this.ayahInput?.value, 10), 1, max, 1)
            : this.clampNumber(this._activeAyah, 1, max, 1);
        const next = this.clampNumber(current + 1, 1, max, max);
        if (this.ayahInput) this.ayahInput.value = String(next);
        this.scrollToAyah(next, { persist: true, smooth: false });

        setTimeout(() => {
          this._navProcessing = false;
        }, 100);
      });
    }

    // Surah navigation buttons
    if (this.surahPrevBtn) {
      this.surahPrevBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this._navProcessing) return;
        this._navProcessing = true;

        const current = this.clampNumber(this._activeSurah, 1, 114, 1);
        const next = this.clampNumber(current - 1, 1, 114, 1);

        if (next !== current) {
          this._surahQuery = "";
          this.setActiveSurah(next, { preserveAyah: false });
          this.updateSurahInputValue({ force: true });
        }

        setTimeout(() => {
          this._navProcessing = false;
        }, 100);
      });
    }

    if (this.surahNextBtn) {
      this.surahNextBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this._navProcessing) return;
        this._navProcessing = true;

        const current = this.clampNumber(this._activeSurah, 1, 114, 1);
        const next = this.clampNumber(current + 1, 1, 114, 114);

        if (next !== current) {
          this._surahQuery = "";
          this.setActiveSurah(next, { preserveAyah: false });
          this.updateSurahInputValue({ force: true });
        }

        setTimeout(() => {
          this._navProcessing = false;
        }, 100);
      });
    }

    const adjustSizeRangeByStep = (rangeEl, direction) => {
      if (!rangeEl) return;

      const stepRaw = parseFloat(rangeEl.step);
      const step = Number.isFinite(stepRaw) && stepRaw > 0 ? stepRaw : 1;
      const min = this.clampNumber(parseFloat(rangeEl.min), 0, 10000, 8);
      const max = this.clampNumber(parseFloat(rangeEl.max), min, 10000, 144);
      const current = this.clampNumber(
        parseFloat(rangeEl.value),
        min,
        max,
        min,
      );
      const next = this.clampNumber(
        current + direction * step,
        min,
        max,
        current,
      );

      if (Math.abs(next - current) < 0.0001) return;

      rangeEl.value = String(next);
      rangeEl.dispatchEvent(new Event("input", { bubbles: true }));
      rangeEl.dispatchEvent(new Event("change", { bubbles: true }));
    };

    // Font size controls
    if (this.arabicSizeRange) {
      this.arabicSizeRange.addEventListener("input", () => {
        const a = SettingsRegistry.coerce(
          "arabicFontSize",
          parseInt(this.arabicSizeRange.value, 10),
          32,
        );
        const t = SettingsRegistry.coerce(
          "translationFontSize",
          parseInt(this.translationSizeRange?.value, 10),
        );
        this.applyFontSizes(a, t, { syncInputs: true, persist: false });
        // Invalidate height cache when font size changes
        this._ayahHeights.clear();
        this.recalculateVirtualization();
      });
      this.arabicSizeRange.addEventListener("change", () => {
        this.persistPocketQuranSettings({
          arabicFontSize: SettingsRegistry.coerce(
            "arabicFontSize",
            parseInt(this.arabicSizeRange.value, 10),
          ),
        });
      });
    }

    if (this.translationSizeRange) {
      this.translationSizeRange.addEventListener("input", () => {
        const a = SettingsRegistry.coerce(
          "arabicFontSize",
          parseInt(this.arabicSizeRange?.value, 10),
        );
        const t = SettingsRegistry.coerce(
          "translationFontSize",
          parseInt(this.translationSizeRange.value, 10),
        );
        this.applyFontSizes(a, t, { syncInputs: true, persist: false });
        // Invalidate height cache when font size changes
        this._ayahHeights.clear();
        this.recalculateVirtualization();
      });
      this.translationSizeRange.addEventListener("change", () => {
        this.persistPocketQuranSettings({
          translationFontSize: SettingsRegistry.coerce(
            "translationFontSize",
            parseInt(this.translationSizeRange.value, 10),
          ),
        });
      });
    }

    if (this.arabicSizeDecreaseBtn) {
      this.arabicSizeDecreaseBtn.addEventListener("click", () => {
        adjustSizeRangeByStep(this.arabicSizeRange, -1);
      });
    }

    if (this.arabicSizeIncreaseBtn) {
      this.arabicSizeIncreaseBtn.addEventListener("click", () => {
        adjustSizeRangeByStep(this.arabicSizeRange, 1);
      });
    }

    if (this.translationSizeDecreaseBtn) {
      this.translationSizeDecreaseBtn.addEventListener("click", () => {
        adjustSizeRangeByStep(this.translationSizeRange, -1);
      });
    }

    if (this.translationSizeIncreaseBtn) {
      this.translationSizeIncreaseBtn.addEventListener("click", () => {
        adjustSizeRangeByStep(this.translationSizeRange, 1);
      });
    }

    // Tajweed toggle button
    if (this.tajweedToggleBtn) {
      this.tajweedToggleBtn.addEventListener("click", () => {
        this.toggleTajweedMode();
      });
    }

    // Arabic font toggle button
    if (this.fontToggleBtn) {
      this.fontToggleBtn.addEventListener("click", () => {
        this.openFontPickerModal();
      });
    }

    if (this.arabicVisibilityToggleBtn) {
      this.arabicVisibilityToggleBtn.addEventListener("click", () => {
        this.applyTextVisibility(
          !this._showArabicText,
          this._showTranslationText,
          {
            persist: true,
            recalculate: true,
            allowBothOff: false,
          },
        );
      });
    }

    if (this.translationVisibilityToggleBtn) {
      this.translationVisibilityToggleBtn.addEventListener("click", () => {
        this.applyTextVisibility(
          this._showArabicText,
          !this._showTranslationText,
          {
            persist: true,
            recalculate: true,
            allowBothOff: false,
          },
        );
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

  initVirtualization() {
    if (!this.contentEl || !this._activeVerses?.length) return;

    if (this._scrollRAF) {
      cancelAnimationFrame(this._scrollRAF);
      this._scrollRAF = null;
    }
    if (this._measureRAF) {
      cancelAnimationFrame(this._measureRAF);
      this._measureRAF = null;
    }
    if (this._scrollIdleTimer) {
      clearTimeout(this._scrollIdleTimer);
      this._scrollIdleTimer = null;
    }
    this._isScrolling = false;
    this._pendingMeasureAfterScroll = false;
    this._lastScrollTop = 0;

    this.contentEl.innerHTML = "";
    this._ayahHeights.clear();
    this._renderedRange = { start: -1, end: -1 };

    this._virtualContainer = document.createElement("div");
    this._virtualContainer.className = "pq-virtual-container";

    this._virtualSpacer = document.createElement("div");
    this._virtualSpacer.className = "pq-virtual-spacer";
    this._virtualSpacer.style.cssText = `
      position: relative;
      width: 100%;
      pointer-events: auto;
    `;

    this._virtualContent = document.createElement("div");
    this._virtualContent.className = "pq-virtual-content";
    this._virtualContent.style.cssText = `
      position: relative;
      top: auto;
      left: auto;
      right: auto;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
      transform: none;
    `;

    this._virtualSpacer.appendChild(this._virtualContent);
    this._virtualContainer.appendChild(this._virtualSpacer);
    this.contentEl.appendChild(this._virtualContainer);

    this._virtualContainer.addEventListener(
      "scroll",
      this.handleVirtualScroll.bind(this),
      { passive: true },
    );

    const cancelProgrammaticScroll = () => {
      this._programmaticScroll = null;
    };
    this._virtualContainer.addEventListener("wheel", cancelProgrammaticScroll, {
      passive: true,
    });
    this._virtualContainer.addEventListener(
      "touchstart",
      cancelProgrammaticScroll,
      { passive: true },
    );
    this._virtualContainer.addEventListener(
      "pointerdown",
      cancelProgrammaticScroll,
      { passive: true },
    );

    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    this._resizeObserver = new ResizeObserver(() => {
      this.scheduleRenderedAyahMeasurement();
    });
    this._resizeObserver.observe(this._virtualContainer);

    this.renderVisibleAyahs();
  }

  updateTotalHeight() {
    if (!this._virtualSpacer) return;

    this._virtualSpacer.style.height = "";
  }

  getAyahOffset(index) {
    let offset = 0;
    const gap = 16;

    for (let i = 0; i < index; i++) {
      const height = this._ayahHeights.get(i) ?? this._avgAyahHeight;
      offset += height + gap;
    }

    return offset;
  }

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

  getFirstVisibleRenderedAyahIndex(scrollTop = null) {
    if (!this._activeVerses?.length) return null;

    const ayahEls = this._virtualContent?.querySelectorAll(
      ".pocket-quran-ayah",
    );
    if (ayahEls?.length && this._virtualContainer) {
      const containerRect = this._virtualContainer.getBoundingClientRect();
      const thresholdY =
        containerRect.top +
        Math.max(0, PocketQuranManager.ACTIVE_AYAH_VISIBILITY_PX);

      for (const el of ayahEls) {
        const rect = el.getBoundingClientRect();
        if (rect.bottom > thresholdY) {
          const index = parseInt(el.dataset.index, 10);
          return Number.isFinite(index) ? index : null;
        }
      }

      const lastEl = ayahEls[ayahEls.length - 1];
      const lastIndex = parseInt(lastEl?.dataset.index, 10);
      return Number.isFinite(lastIndex) ? lastIndex : null;
    }

    const resolvedScrollTop = Number.isFinite(scrollTop)
      ? scrollTop
      : (this._virtualContainer?.scrollTop ?? 0);

    return this.getAyahAtOffset(resolvedScrollTop);
  }

  markVirtualScrollActivity() {
    this._isScrolling = true;
    if (this._scrollIdleTimer) {
      clearTimeout(this._scrollIdleTimer);
    }

    this._scrollIdleTimer = setTimeout(() => {
      this._scrollIdleTimer = null;
      this._isScrolling = false;

      if (!this._pendingMeasureAfterScroll) return;

      this._pendingMeasureAfterScroll = false;
      this.scheduleRenderedAyahMeasurement();
    }, PocketQuranManager.SCROLL_IDLE_COMMIT_MS);
  }

  scheduleRenderedAyahMeasurement() {
    if (this._isScrolling) {
      this._pendingMeasureAfterScroll = true;
      return;
    }

    if (this._measureRAF) return;

    this._measureRAF = requestAnimationFrame(() => {
      this._measureRAF = null;
      this.measureRenderedAyahs();
    });
  }

  handleVirtualScroll() {
    this.markVirtualScrollActivity();

    if (this._scrollRAF) return;

    this._scrollRAF = requestAnimationFrame(() => {
      this._scrollRAF = null;

      if (!this._virtualContainer) return;

      const scrollTop = this._virtualContainer.scrollTop;

      this._scrollDirection = scrollTop > this._lastScrollTop ? "down" : "up";
      this._lastScrollTop = scrollTop;

      if (this._programmaticScroll) {
        const now =
          typeof performance !== "undefined" && performance.now
            ? performance.now()
            : Date.now();
        const { targetOffset, targetAyah, startedAt } =
          this._programmaticScroll;

        const delta = Math.abs(scrollTop - targetOffset);
        const timedOut = now - startedAt > 2000;

        const activeAyahChanged = this._activeAyah !== targetAyah;
        this._activeAyah = targetAyah;
        if (
          this.ayahInput &&
          document.activeElement !== this.ayahInput &&
          this.ayahInput.value !== String(targetAyah)
        ) {
          this.ayahInput.value = String(targetAyah);
        }
        if (activeAyahChanged) {
          this.updateAyahDropdownActiveState();
        }

        if (delta < 2 || timedOut) {
          this._programmaticScroll = null;
        }
        return;
      }

      const visibleIndex = this.getFirstVisibleRenderedAyahIndex(scrollTop);
      const activeIndex = Number.isFinite(visibleIndex)
        ? visibleIndex
        : this.getAyahAtOffset(scrollTop);

      const nextActiveAyah = activeIndex + 1;
      const activeAyahChanged = this._activeAyah !== nextActiveAyah;
      this._activeAyah = nextActiveAyah;

      if (
        this.ayahInput &&
        document.activeElement !== this.ayahInput &&
        this.ayahInput.value !== String(nextActiveAyah)
      ) {
        this.ayahInput.value = String(nextActiveAyah);
      }

      if (activeAyahChanged) {
        this.updateAyahDropdownActiveState();
      }
    });
  }

  renderVisibleAyahs(opts = {}) {
    if (!this._virtualContent || !this._activeVerses?.length) return;

    const force = opts?.force === true;
    const total = this._activeVerses.length;
    if (
      !force &&
      this._renderedRange.start === 0 &&
      this._renderedRange.end === total - 1 &&
      this._virtualContent.childElementCount === total
    ) {
      return;
    }

    this._renderedRange = { start: 0, end: total - 1 };
    this._virtualContent.style.transform = "none";

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < total; i++) {
      const verse = this._activeVerses[i];
      if (!verse) continue;

      const ayahEl = this.createAyahElement(verse, i);
      fragment.appendChild(ayahEl);
    }

    this._virtualContent.innerHTML = "";
    this._virtualContent.appendChild(fragment);

    this.scheduleRenderedAyahMeasurement();
    this.syncActiveRecitationWord();
  }

  refreshRenderedAyahs({ preserveScroll = true } = {}) {
    if (!this._activeVerses?.length) return;

    const scrollTop = this._virtualContainer?.scrollTop || 0;
    this._ayahHeights.clear();
    this.renderVisibleAyahs({ force: true });

    if (preserveScroll) {
      requestAnimationFrame(() => {
        if (this._virtualContainer) {
          this._virtualContainer.scrollTop = scrollTop;
        }
      });
    }
  }

  measureRenderedAyahs() {
    if (!this._virtualContent) return;

    const ayahEls = this._virtualContent.querySelectorAll(".pocket-quran-ayah");
    let totalMeasured = 0;
    let measureCount = 0;
    let heightsChanged = false;

    ayahEls.forEach((el) => {
      const index = parseInt(el.dataset.index, 10);
      if (!Number.isFinite(index)) return;

      const rect = el.getBoundingClientRect();
      const height = rect.height;

      if (height > 0) {
        const previousHeight = this._ayahHeights.get(index);
        if (
          !Number.isFinite(previousHeight) ||
          Math.abs(previousHeight - height) > 0.5
        ) {
          this._ayahHeights.set(index, height);
          heightsChanged = true;
        }
        totalMeasured += height;
        measureCount++;
      }
    });

    if (measureCount > 0 && heightsChanged) {
      this._avgAyahHeight = totalMeasured / measureCount;
    }
  }

  isAyahNumberMarkerText(text) {
    const normalized = String(text || "")
      .replace(/[\u061c\u200e\u200f]/g, "")
      .trim();
    if (!normalized) return false;

    return /^[\s\u06dd\u06de\u06e9\u06fd\u06fe\ufd3c-\ufd3f()[\]{}<>﴾﴿۝]*[\u0660-\u0669\u06F0-\u06F90-9]+[\s\u06dd\u06de\u06e9\u06fd\u06fe\ufd3c-\ufd3f()[\]{}<>﴾﴿۝]*$/.test(
      normalized,
    );
  }

  appendAyahNumberMarker(container, content) {
    if (!container) return;

    const marker = document.createElement("span");
    marker.className = "pq-ayah-number-marker";

    if (content && typeof content.cloneNode === "function") {
      marker.appendChild(content.cloneNode(true));
    } else {
      marker.textContent = String(content || "");
    }

    container.appendChild(marker);
  }

  normalizeArabicWordForRecitation(text) {
    return QuranArabic.normalizeWord(text);
  }

  getPlainArabicRecitationWords(text) {
    return String(text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .filter((word) => !this.isAyahNumberMarkerText(word))
      .map((word) => ({
        text: word,
        normalized: this.normalizeArabicWordForRecitation(word),
      }))
      .filter((word) => word.normalized.length > 0);
  }

  isArabicCombiningMark(char) {
    return QuranArabic.isCombiningMark(char);
  }

  splitArabicTextClusters(text) {
    return QuranArabic.clusters(text);
  }

  appendTajweedClusterToWord(wordEl, cluster, ancestors = []) {
    if (!wordEl || !cluster) return;

    if (!ancestors.length) {
      wordEl.appendChild(document.createTextNode(cluster));
      return;
    }

    let parent = wordEl;
    ancestors.forEach((ancestor) => {
      const clone = ancestor.cloneNode(false);
      parent.appendChild(clone);
      parent = clone;
    });
    parent.appendChild(document.createTextNode(cluster));
  }

  appendTajweedNodeToRecitationWords(node, state, ancestors = []) {
    if (!node || !state) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (this.isAyahNumberMarkerText(text)) {
        state.closeWord();
        state.appendMarker(text);
        return;
      }

      this.splitArabicTextClusters(text).forEach((cluster) => {
        if (!cluster || /^\s+$/.test(cluster)) return;

        if (this.isAyahNumberMarkerText(cluster)) {
          state.closeWord();
          state.appendMarker(cluster);
          return;
        }

        const normalized = this.normalizeArabicWordForRecitation(cluster);
        if (!normalized && !state.currentWordEl) return;

        const wordEl = state.ensureWordEl();
        if (!wordEl) {
          if (normalized || this.isAyahNumberMarkerText(cluster)) {
            state.appendMarker(cluster);
          }
          return;
        }

        this.appendTajweedClusterToWord(wordEl, cluster, ancestors);
        if (!normalized) return;

        const targetWord = state.plainWords[state.currentWordIndex - 1];
        const currentWordNormalized =
          (state.currentWordNormalized || "") + normalized;
        state.currentWordNormalized = currentWordNormalized;

        if (
          targetWord &&
          currentWordNormalized.length >= targetWord.normalized.length
        ) {
          state.closeWord();
        }
      });
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    if (this.isAyahNumberMarkerText(node.textContent)) {
      state.closeWord();
      state.appendMarker(node);
      return;
    }

    const nextAncestors = [...ancestors, node];
    node.childNodes.forEach((child) => {
      this.appendTajweedNodeToRecitationWords(child, state, nextAncestors);
    });
  }

  renderArabicWordSpans(container, text, verseKey) {
    if (!container) return;

    container.textContent = "";
    const words = String(text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!words.length) return;

    let wordIndex = 0;
    words.forEach((word, index) => {
      if (index > 0) {
        container.appendChild(document.createTextNode(" "));
      }

      if (this.isAyahNumberMarkerText(word)) {
        this.appendAyahNumberMarker(container, word);
        return;
      }

      wordIndex += 1;
      const wordEl = document.createElement("span");
      wordEl.className = "pq-recitation-word";
      wordEl.dataset.verseKey = verseKey;
      wordEl.dataset.wordIndex = String(wordIndex);
      wordEl.dataset.recitationKey = `${verseKey}:${wordIndex}`;
      wordEl.textContent = word;
      container.appendChild(wordEl);
    });
  }

  renderTajweedWordSpans(container, html, verseKey, plainText = "") {
    if (!container) return;

    const plainWords = this.getPlainArabicRecitationWords(plainText);
    const template = document.createElement("template");
    template.innerHTML = html;
    container.textContent = "";

    let wordIndex = 0;
    let currentWordEl = null;

    const closeWord = () => {
      currentWordEl = null;
      state.currentWordEl = null;
      state.currentWordNormalized = "";
    };

    const appendMarker = (content) => {
      if (wordIndex > 0) {
        container.appendChild(document.createTextNode(" "));
      }
      this.appendAyahNumberMarker(container, content);
    };

    const ensureWordEl = () => {
      if (currentWordEl) return currentWordEl;
      if (plainWords.length && wordIndex >= plainWords.length) return null;

      wordIndex += 1;
      if (wordIndex > 1) {
        container.appendChild(document.createTextNode(" "));
      }

      currentWordEl = document.createElement("span");
      currentWordEl.className = "pq-recitation-word";
      currentWordEl.dataset.verseKey = verseKey;
      currentWordEl.dataset.wordIndex = String(wordIndex);
      currentWordEl.dataset.recitationKey = `${verseKey}:${wordIndex}`;
      container.appendChild(currentWordEl);
      state.currentWordEl = currentWordEl;
      state.currentWordIndex = wordIndex;
      state.currentWordNormalized = "";
      return currentWordEl;
    };
    const state = {
      container,
      plainWords,
      currentWordEl: null,
      currentWordIndex: 0,
      currentWordNormalized: "",
      ensureWordEl,
      closeWord,
      appendMarker,
    };

    const appendText = (text) => {
      if (plainWords.length) {
        const node = document.createTextNode(text);
        this.appendTajweedNodeToRecitationWords(node, state);
        return;
      }

      String(text || "")
        .split(/(\s+)/)
        .filter((part) => part.length > 0)
        .forEach((part) => {
          if (/^\s+$/.test(part)) {
            container.appendChild(document.createTextNode(part));
            closeWord();
            return;
          }

          if (this.isAyahNumberMarkerText(part)) {
            this.appendAyahNumberMarker(container, part);
            closeWord();
            return;
          }

          ensureWordEl().appendChild(document.createTextNode(part));
        });
    };

    template.content.childNodes.forEach((node) => {
      if (plainWords.length) {
        this.appendTajweedNodeToRecitationWords(node, state);
        return;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        appendText(node.textContent);
        return;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        if (this.isAyahNumberMarkerText(node.textContent)) {
          if (plainWords.length && wordIndex > 0) {
            container.appendChild(document.createTextNode(" "));
          }
          this.appendAyahNumberMarker(container, node);
          closeWord();
          return;
        }

        const clone = node.cloneNode(true);
        const wordEl = ensureWordEl();
        if (!wordEl) return;
        wordEl.appendChild(clone);

        if (plainWords.length) {
          const targetWord = plainWords[ensureWordEl.currentWordIndex - 1];
          const normalized = this.normalizeArabicWordForRecitation(
            node.textContent,
          );
          const currentWordNormalized =
            (ensureWordEl.currentWordNormalized || "") + normalized;
          ensureWordEl.currentWordNormalized = currentWordNormalized;

          if (
            targetWord &&
            currentWordNormalized.length >= targetWord.normalized.length
          ) {
            closeWord();
          }
        }
      }
    });
  }

  recalculateVirtualization() {
    if (!this._virtualContainer || !this._activeVerses?.length) return;

    this.scheduleRenderedAyahMeasurement();
    this.handleVirtualScroll();
  }

  refreshPocketQuranContentArea(opts = {}) {
    const { keepScrollPosition = true } = opts;

    if (!this._activeVerses?.length) return;

    if (this._contentRefreshRestoreRaf) {
      cancelAnimationFrame(this._contentRefreshRestoreRaf);
      this._contentRefreshRestoreRaf = null;
    }

    const previousScrollTop = this._virtualContainer?.scrollTop || 0;

    this._programmaticScroll = null;
    this._ayahHeights.clear();
    this._avgAyahHeight = PocketQuranManager.ESTIMATED_AYAH_HEIGHT;

    // Rebuild only the virtualized Quran content region.
    this.initVirtualization();

    if (!keepScrollPosition) return;

    const currentContainer = this._virtualContainer;
    if (!currentContainer) return;

    let canceledByUserInput = false;
    const useCapture = true;

    let detachCancelListeners = () => {};
    const cancelPendingRestoreForUserInput = () => {
      canceledByUserInput = true;
      detachCancelListeners();

      if (this._contentRefreshRestoreRaf) {
        cancelAnimationFrame(this._contentRefreshRestoreRaf);
        this._contentRefreshRestoreRaf = null;
      }

      if (this._virtualContainer === currentContainer) {
        this._lastScrollTop = currentContainer.scrollTop;
      }
    };

    currentContainer.addEventListener(
      "wheel",
      cancelPendingRestoreForUserInput,
      {
        passive: true,
        capture: useCapture,
      },
    );
    currentContainer.addEventListener(
      "touchstart",
      cancelPendingRestoreForUserInput,
      {
        passive: true,
        capture: useCapture,
      },
    );
    currentContainer.addEventListener(
      "pointerdown",
      cancelPendingRestoreForUserInput,
      {
        passive: true,
        capture: useCapture,
      },
    );

    detachCancelListeners = () => {
      currentContainer.removeEventListener(
        "wheel",
        cancelPendingRestoreForUserInput,
        useCapture,
      );
      currentContainer.removeEventListener(
        "touchstart",
        cancelPendingRestoreForUserInput,
        useCapture,
      );
      currentContainer.removeEventListener(
        "pointerdown",
        cancelPendingRestoreForUserInput,
        useCapture,
      );
    };

    this._contentRefreshRestoreRaf = requestAnimationFrame(() => {
      this._contentRefreshRestoreRaf = null;
      detachCancelListeners();

      if (canceledByUserInput) return;
      if (
        !this._virtualContainer ||
        this._virtualContainer !== currentContainer
      )
        return;

      const maxScrollTop = Math.max(
        0,
        currentContainer.scrollHeight - currentContainer.clientHeight,
      );

      currentContainer.scrollTop = Math.min(previousScrollTop, maxScrollTop);
      this._lastScrollTop = currentContainer.scrollTop;
      this.handleVirtualScroll();
    });
  }

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
      const buffer = PocketQuranManager.BUFFER_AYAHS;
      const visibleCount = PocketQuranManager.VISIBLE_AYAH_COUNT;
      const total = this._activeVerses.length;

      const start = Math.max(0, index - buffer);
      const end = Math.min(total - 1, index + visibleCount + buffer);

      // First pass: render ayahs from the beginning up to and including the target
      // This ensures we measure all previous ayahs for accurate offset calculation
      const measureEnd = Math.min(total - 1, index + visibleCount + buffer);

      // We need to render ayahs to get accurate measurements.
      // Render a range that includes the target ayah.
      this.renderVisibleAyahs(start, end);

      // Use requestAnimationFrame to wait for layout/paint, then measure and scroll
      requestAnimationFrame(() => {
        // Measure the rendered ayahs
        this.measureRenderedAyahs();

        // Now use DOM-based offset calculation for accuracy
        // Find the target ayah element and get its actual position
        const targetEl = this._virtualContent?.querySelector(
          `[data-ayah="${n}"]`,
        );

        let offset;
        if (targetEl) {
          // Get the transform offset of the virtual content
          const transformMatch = this._virtualContent?.style.transform?.match(
            /translateY\((\d+(?:\.\d+)?)px\)/,
          );
          const contentOffset = transformMatch
            ? parseFloat(transformMatch[1])
            : 0;

          // Calculate actual offset: content transform offset + element's position within content
          offset = contentOffset + targetEl.offsetTop;
        } else {
          // Fallback to calculated offset
          offset = this.getAyahOffset(index);
        }

        // Apply a small upward offset when auto-scrolling during recitation playback.
        // This nudges the view by -RECITATION_AUTOSCROLL_OFFSET_PX so the playing ayah
        // sits slightly lower for readability.
        if (
          this._isAutoScroll &&
          this._playingAyah &&
          this._playingAyah.surah === this._activeSurah &&
          this._playingAyah.ayah === n
        ) {
          offset = Math.max(
            0,
            offset - PocketQuranManager.RECITATION_AUTOSCROLL_OFFSET_PX,
          );
        }

        // Prevent scroll handler from overwriting the active ayah mid smooth-scroll.
        const now =
          typeof performance !== "undefined" && performance.now
            ? performance.now()
            : Date.now();
        this._programmaticScroll = {
          targetOffset: offset,
          targetAyah: n,
          startedAt: now,
        };

        // Update total height with new measurements
        this.updateTotalHeight();

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
          smooth ? 300 : 50,
        );
      });
    }

    if (persist) {
      this.persistPocketQuranSettings({
        lastAyahNumber: n,
        lastSurahNumber: this._activeSurah,
      });
    }

    this.updateAyahDropdownActiveState();
    this.publishPopupSyncState();
  }

  highlightAyah(ayahNumber) {
    const el = this._virtualContent?.querySelector(
      `[data-ayah="${ayahNumber}"]`,
    );
    if (!el) return;

    if (this._scrollHighlightTimer) clearTimeout(this._scrollHighlightTimer);

    el.classList.remove("pq-highlight");
    void el.offsetWidth; // Force reflow
    el.classList.add("pq-highlight");

    this._scrollHighlightTimer = setTimeout(() => {
      el.classList.remove("pq-highlight");
    }, 2100);
  }

  createAyahElement(verse, index) {
    const ayahNumber = verse?.verse_number;
    const surah = this._activeSurah;

    const ayahEl = document.createElement("div");
    ayahEl.className = "pocket-quran-ayah";
    ayahEl.id = `pocketQuranAyah-${ayahNumber}`;
    ayahEl.dataset.ayah = String(ayahNumber);
    ayahEl.dataset.index = String(index);

    // Star button for bookmarking
    const starBtn = document.createElement("button");
    starBtn.type = "button";
    starBtn.className = "pocket-quran-ayah-star";
    const isBookmarked = this.isAyahBookmarked(surah, ayahNumber);
    if (isBookmarked) {
      starBtn.classList.add("bookmarked");
    }
    starBtn.innerHTML = isBookmarked
      ? this._getIcon("⭐", { size: 18 })
      : this._getIcon("☆", { size: 18 });
    starBtn.title = isBookmarked ? "Manage bookmark" : "Bookmark this ayah";
    starBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openCategorySelectionModal(surah, ayahNumber, verse);
    });

    const badge = document.createElement("div");
    badge.className = "pocket-quran-ayah-badge";
    badge.textContent = `${surah}:${ayahNumber}`;

    const copyBadge = document.createElement("button");
    copyBadge.type = "button";
    copyBadge.className = "pocket-quran-ayah-copy-badge";
    copyBadge.setAttribute("aria-label", `Copy ayah ${surah}:${ayahNumber}`);
    copyBadge.title = `Copy ayah ${surah}:${ayahNumber}`;

    const copyBadgeIcon = document.createElement("span");
    copyBadgeIcon.className = "pocket-quran-ayah-copy-badge-icon";
    copyBadgeIcon.setAttribute("aria-hidden", "true");
    copyBadgeIcon.innerHTML =
      '<svg viewBox="0 0 24 24" width="14" height="14" focusable="false"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';

    copyBadge.appendChild(copyBadgeIcon);
    copyBadge.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const copied = await this.copyPocketQuranAyah(verse, surah, ayahNumber);
      if (copied) this.showPocketQuranCopyIndicator(copyBadge);
    });

    const ar = document.createElement("div");
    ar.className = "pocket-quran-ayah-ar";
    ar.setAttribute("dir", "rtl");

    // Check if Tajweed mode is enabled and we have Tajweed text
    const verseKey = verse?.verse_key || `${surah}:${ayahNumber}`;
    if (this._isTajweedMode) {
      const tajweedText = this.getTajweedTextForVerse(ayahNumber);
      if (tajweedText) {
        ar.classList.add("tajweed-mode");
        this.renderTajweedWordSpans(
          ar,
          tajweedText,
          verseKey,
          verse?.text_uthmani || "",
        );
      } else {
        // Fallback to plain text if Tajweed not available
        this.renderArabicWordSpans(ar, verse?.text_uthmani || "", verseKey);
      }
    } else {
      this.renderArabicWordSpans(ar, verse?.text_uthmani || "", verseKey);
    }

    const tr = document.createElement("div");
    tr.className = "pocket-quran-ayah-tr";
    const rawTranslation = Array.isArray(verse?.translations)
      ? verse.translations[0]?.text
      : "";
    tr.textContent = this.stripHtmlToText(rawTranslation || "");

    // Play button for recitation
    const isThisAyahPlaying =
      this._isPlaying &&
      this._playingAyah?.surah === surah &&
      this._playingAyah?.ayah === ayahNumber;

    const playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.className = `pq-ayah-play-btn ${
      isThisAyahPlaying ? "playing" : ""
    }`;
    playBtn.title = isThisAyahPlaying ? "Pause" : "Play recitation";
    playBtn.innerHTML = isThisAyahPlaying
      ? '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
      : '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
    playBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.togglePlayPause(surah, ayahNumber);
    });

    // Bottom-left stacked controls (top-to-bottom): star, play
    const controlsStack = document.createElement("div");
    controlsStack.className = "pq-ayah-controls-stack";
    controlsStack.appendChild(starBtn);
    controlsStack.appendChild(playBtn);
    controlsStack.appendChild(copyBadge);

    ayahEl.appendChild(controlsStack);
    ayahEl.appendChild(badge);
    ayahEl.appendChild(ar);
    ayahEl.appendChild(tr);

    return ayahEl;
  }

  formatPocketQuranAyahCopy(verse, surah, ayahNumber) {
    const settings = this.storage?.getSettings ? this.storage.getSettings() : {};
    const rawTranslation = Array.isArray(verse?.translations)
      ? verse.translations[0]?.text
      : "";

    return QuranCopy.ayahText({
      arabic: verse?.text_uthmani,
      translation: this.stripHtmlToText(rawTranslation || ""),
      reference: `(${this.getSurahNameSimple(surah)} ${surah}:${ayahNumber})`,
      includeArabic: settings?.pocketQuran?.copyIncludeArabic === true,
    });
  }

  async copyPocketQuranAyah(verse, surah, ayahNumber) {
    const text = this.formatPocketQuranAyahCopy(verse, surah, ayahNumber);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }

      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      return copied === true;
    } catch (error) {
      console.warn("Failed to copy Pocket Quran ayah", error);
      return false;
    }
  }

  showPocketQuranCopyIndicator(copyButton) {
    if (!copyButton) return;

    copyButton.classList.add("copied");

    if (copyButton._pocketQuranCopyTimer) {
      clearTimeout(copyButton._pocketQuranCopyTimer);
    }

    copyButton._pocketQuranCopyTimer = setTimeout(() => {
      copyButton.classList.remove("copied");
      copyButton._pocketQuranCopyTimer = null;
    }, 1100);
  }

  destroyVirtualization() {
    this.snapshotVirtualLayout();
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._scrollRAF) {
      cancelAnimationFrame(this._scrollRAF);
      this._scrollRAF = null;
    }
    if (this._measureRAF) {
      cancelAnimationFrame(this._measureRAF);
      this._measureRAF = null;
    }
    if (this._scrollIdleTimer) {
      clearTimeout(this._scrollIdleTimer);
      this._scrollIdleTimer = null;
    }
    this._isScrolling = false;
    this._pendingMeasureAfterScroll = false;
    this._virtualContainer = null;
    this._virtualSpacer = null;
    this._virtualContent = null;
    this._ayahHeights.clear();
    this._renderedRange = { start: 0, end: 0 };
  }

  snapshotVirtualLayout() {
    try {
      if (this._virtualContainer) {
        const h = Math.round(
          this._virtualContainer.getBoundingClientRect().height,
        );
        if (Number.isFinite(h) && h > 0) this._lastVirtualContainerHeightPx = h;
      }
      if (this._virtualSpacer) {
        const h = Math.round(
          this._virtualSpacer.getBoundingClientRect().height,
        );
        if (Number.isFinite(h) && h > 0) this._lastVirtualSpacerHeightPx = h;
      }
      if (this._virtualContent) {
        const h = Math.round(
          this._virtualContent.getBoundingClientRect().height,
        );
        if (Number.isFinite(h) && h > 0) this._lastVirtualContentHeightPx = h;
      }
    } catch (e) {}
  }

  getEffectiveBlurMultiplier() {
    if (this.card) {
      try {
        const inlineVal = this.card.style.getPropertyValue(
          "--ui-blur-multiplier",
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
      const sourceStyle = this.card ? getComputedStyle(this.card) : null;
      [
        "--glass-bg",
        "--glass-bg-hover",
        "--glass-bg-subtle",
        "--glass-border",
        "--glass-shadow",
      ].forEach((prop) => {
        const value = sourceStyle?.getPropertyValue(prop);
        if (value) el.style.setProperty(prop, value.trim());
      });
      if (this.card?.dataset.glassEnabled) {
        el.dataset.glassEnabled = this.card.dataset.glassEnabled;
      } else {
        delete el.dataset.glassEnabled;
      }
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
});

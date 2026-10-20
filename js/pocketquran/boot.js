/**
 * PocketQuranManager: boot and event listeners.
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
});

/**
 * PocketQuranManager: surah load and header.
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
      this.contentEl?.querySelector?.(".pocket-quran-ayah"),
    );

    if (surah === this._activeSurah && versesAlreadyRendered) {
      this.updateSurahActiveState();
      this.updateSurahInputValue({ force: true });
      this.publishPopupSyncState();
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

    this.publishPopupSyncState();
  }

  async loadSurah(surah, opts = {}) {
    const { autoScroll = true, restorePos = null } = opts;
    const chapter = this._chapters.find((c) => c.id === surah);
    const surahName = chapter?.name_simple || `Surah ${surah}`;
    const surahNameAr = chapter?.name_arabic || "";

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
        this.storage.getSettings()?.pocketQuran?.translationResourceId,
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

      // Preload Tajweed verses if Tajweed mode is enabled
      if (this._isTajweedMode) {
        await this.preloadTajweedVerses(surah);
      }

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
        1,
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
    const tajweedIndicator = this._isTajweedMode ? " · Tajweed" : "";
    this.headerMeta.textContent = `${surah}. ${surahName} · ${versesCount} ayahs · ${translation}${tajweedIndicator}`;
  }

  refreshSurahHeaderMeta() {
    const chapter = this._chapters.find((c) => c.id === this._activeSurah);
    if (!chapter) return;

    this.renderSurahHeader({
      surah: this._activeSurah,
      surahName: chapter.name_simple || `Surah ${this._activeSurah}`,
      surahNameAr: chapter.name_arabic || "",
      versesCount: this._activeVerses?.length || 0,
    });
  }

  reloadTranslation(newTranslationId) {
    const id = this.normalizeTranslationId(newTranslationId);
    if (id === this._activeTranslationId) return;

    this._activeTranslationId = id;

    // Clear the cache for this surah so we fetch fresh data with new translation
    const cacheKey = this.getVersesCacheKey(this._activeSurah, id);
    this._versesCache.delete(cacheKey);

    // Reload the current surah
    this.loadSurah(this._activeSurah, { autoScroll: false });
  }
});

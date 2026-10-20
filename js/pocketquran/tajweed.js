/**
 * PocketQuranManager: tajweed mode and data.
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

  async toggleTajweedMode() {
    if (!this.isTajweedAllowedForFont(this._arabicFontFamily)) {
      this.disableTajweedMode();
      this.syncTajweedAvailabilityForFont();
      return;
    }

    this._isTajweedMode = !this._isTajweedMode;
    this.persistPocketQuranSettings({ tajweedMode: this._isTajweedMode });
    this.updateTajweedToggleUI();

    if (this._isTajweedMode && this._activeSurah) {
      await this.preloadTajweedVerses(this._activeSurah);
      if (!this.isTajweedAllowedForFont(this._arabicFontFamily)) {
        this.disableTajweedMode();
        this.syncTajweedAvailabilityForFont();
        return;
      }
    }

    this.refreshRenderedAyahs({ preserveScroll: true });
    this.refreshSurahHeaderMeta();
  }

  updateTajweedToggleUI() {
    if (!this.tajweedToggleBtn) return;
    this.tajweedToggleBtn.classList.toggle("active", this._isTajweedMode);
    this.tajweedToggleBtn.setAttribute(
      "aria-pressed",
      this._isTajweedMode ? "true" : "false",
    );
  }

  updateTextVisibilityToggleUI({ allowBothOff = false } = {}) {
    const canDisableArabic = allowBothOff || this._showTranslationText;
    const canDisableTranslation = allowBothOff || this._showArabicText;

    if (this.arabicVisibilityToggleBtn) {
      const isActive = this._showArabicText === true;
      this.arabicVisibilityToggleBtn.classList.toggle("active", isActive);
      this.arabicVisibilityToggleBtn.setAttribute(
        "aria-pressed",
        isActive ? "true" : "false",
      );
      this.arabicVisibilityToggleBtn.disabled = isActive && !canDisableArabic;
      this.arabicVisibilityToggleBtn.title = isActive
        ? "Hide Arabic text"
        : "Show Arabic text";
    }

    if (this.translationVisibilityToggleBtn) {
      const isActive = this._showTranslationText === true;
      this.translationVisibilityToggleBtn.classList.toggle("active", isActive);
      this.translationVisibilityToggleBtn.setAttribute(
        "aria-pressed",
        isActive ? "true" : "false",
      );
      this.translationVisibilityToggleBtn.disabled =
        isActive && !canDisableTranslation;
      this.translationVisibilityToggleBtn.title = isActive
        ? "Hide translation text"
        : "Show translation text";
    }
  }

  applyTextVisibility(showArabicText, showTranslationText, opts = {}) {
    const { persist = false, recalculate = true, allowBothOff = false } = opts;

    const normalized = this.normalizeTextVisibilityState(
      showArabicText,
      showTranslationText,
      allowBothOff,
    );

    const changed =
      this._showArabicText !== normalized.showArabicText ||
      this._showTranslationText !== normalized.showTranslationText;

    this._showArabicText = normalized.showArabicText;
    this._showTranslationText = normalized.showTranslationText;

    if (this.card) {
      this.card.classList.toggle("pq-hide-arabic-text", !this._showArabicText);
      this.card.classList.toggle(
        "pq-hide-translation-text",
        !this._showTranslationText,
      );
    }

    this.updateTextVisibilityToggleUI({ allowBothOff });

    if (changed && recalculate) {
      this.refreshPocketQuranContentArea({ keepScrollPosition: true });
    }

    if (persist) {
      this.persistPocketQuranSettings({
        showArabicText: this._showArabicText,
        showTranslationText: this._showTranslationText,
      });
    }

    if (changed) {
      this.publishPopupSyncState();
    }

    return changed;
  }

  isTajweedAllowedForFont(fontFamily) {
    const f = this.normalizeArabicFontFamily(fontFamily);
    return f.startsWith("KFGQPC ");
  }

  syncTajweedAvailabilityForFont() {
    const allowed = this.isTajweedAllowedForFont(this._arabicFontFamily);

    if (this.tajweedToggleBtn) {
      this.tajweedToggleBtn.disabled = !allowed;
      this.tajweedToggleBtn.setAttribute(
        "aria-disabled",
        allowed ? "false" : "true",
      );
      this.tajweedToggleBtn.title = allowed
        ? "Toggle Tajweed color-coded Arabic text"
        : "Tajweed disabled for this font";
    }

    if (!allowed) {
      this.disableTajweedMode();
    }
  }

  disableTajweedMode() {
    const wasEnabled = this._isTajweedMode === true;

    this._isTajweedMode = false;
    this.persistPocketQuranSettings({ tajweedMode: false });
    this.updateTajweedToggleUI();

    if (wasEnabled) {
      this.refreshRenderedAyahs({ preserveScroll: true });
      this.refreshSurahHeaderMeta();
    }
  }

  getTajweedCacheKey(surah) {
    return `tajweed|${surah}`;
  }

  async fetchTajweedVerses(surah) {
    const cacheKey = this.getTajweedCacheKey(surah);
    const cached = this._tajweedVersesCache.get(cacheKey);

    if (cached && Array.isArray(cached.verses) && cached.verses.length) {
      return cached.verses;
    }

    try {
      const url = `${PocketQuranManager.TAJWEED_API_BASE}?chapter_number=${surah}`;
      const data = await this.fetchJson(url, { timeoutMs: 20000 });
      const verses = Array.isArray(data?.verses) ? data.verses : [];

      if (verses.length) {
        this._tajweedVersesCache.set(cacheKey, {
          verses,
          fetchedAt: Date.now(),
        });
      }

      return verses;
    } catch (e) {
      console.error("PocketQuran: failed to fetch Tajweed verses", e);
      return [];
    }
  }

  parseTajweedHtml(tajweedText) {
    if (!tajweedText) return null;

    // Convert <tajweed class=xxx> to <span class="xxx">
    // The API returns class names without quotes, e.g., <tajweed class=ham_wasl>
    let html = tajweedText
      .replace(/<tajweed\s+class=([^>]+)>/gi, (match, className) => {
        // Clean the class name and add quotes
        const cleanClass = className.trim();
        return `<span class="${cleanClass}">`;
      })
      .replace(/<\/tajweed>/gi, "</span>");

    return html;
  }

  getTajweedTextForVerse(verseNumber) {
    const cacheKey = this.getTajweedCacheKey(this._activeSurah);
    const cached = this._tajweedVersesCache.get(cacheKey);

    if (!cached?.verses?.length) return null;

    // The API returns verse_key like "1:1", "1:2", etc.
    // We need to find the verse matching our surah:ayah pattern
    const verseKey = `${this._activeSurah}:${verseNumber}`;
    const verse = cached.verses.find((v) => v.verse_key === verseKey);
    if (!verse?.text_uthmani_tajweed) return null;

    // Parse and convert the Tajweed HTML
    return this.parseTajweedHtml(verse.text_uthmani_tajweed);
  }

  async preloadTajweedVerses(surah) {
    if (!this._isTajweedMode) return;

    const cacheKey = this.getTajweedCacheKey(surah);
    if (this._tajweedVersesCache.has(cacheKey)) return;

    await this.fetchTajweedVerses(surah);
  }
});

/**
 * PocketQuranManager, part 3 of 6.
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
      Math.max(180, Math.floor((preferAbove ? aboveSpace : belowSpace) - 10)),
    );

    el.style.left = `${left}px`;
    el.style.width = `${width}px`;
    el.style.right = "auto";

    if (preferAbove) {
      const bottom = Math.max(
        viewportPadding,
        Math.round(window.innerHeight - rect.top + gap),
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
      (c) => String(c.name_simple || "").toLowerCase() === lower,
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
        this.publishPopupSyncState();
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
      this.publishPopupSyncState();
    } catch (e) {
      console.error("PocketQuran: failed to load chapters", e);
      this._chapters = [];
      this.renderSurahList({ failed: true });
      this.renderError(
        "Could not load Surah list. Check your internet connection.",
      );
      this.publishPopupSyncState();
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
      ".pocket-quran-surah-item",
    )) {
      const surah = parseInt(btn.dataset.surah, 10);
      btn.classList.toggle("active", surah === this._activeSurah);
      btn.setAttribute(
        "aria-current",
        surah === this._activeSurah ? "true" : "false",
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

  getSearchLanguageCode(translationId) {
    const language =
      PocketQuranManager.TRANSLATIONS[
        this.normalizeTranslationId(translationId)
      ]?.language || "English";
    return QuranSearch.languageCode(language);
  }

  getSearchApiUrl(query, translationId, page = 1) {
    return QuranSearch.url(PocketQuranManager.API_BASE, {
      query,
      translationId: this.normalizeTranslationId(translationId),
      page,
      language: this.getSearchLanguageCode(translationId),
    });
  }

  getFullTranslationApiUrl(translationId) {
    const id = this.normalizeTranslationId(translationId);
    return `${PocketQuranManager.API_BASE}/quran/translations/${id}?fields=verse_key,chapter_id,verse_number,text`;
  }

  getFullArabicApiUrl() {
    return `${PocketQuranManager.API_BASE}/quran/verses/uthmani`;
  }

  async fetchPocketQuranSearchResults(query, translationId) {
    const url = this.getSearchApiUrl(query, translationId, 1);
    const data = await this.fetchJson(url, { timeoutMs: 15000 });
    const search = data?.search || {};
    const results = Array.isArray(search.results) ? [...search.results] : [];
    const totalPages = Number(search.total_pages) || 1;

    for (let page = 2; page <= totalPages; page += 1) {
      const pageData = await this.fetchJson(
        this.getSearchApiUrl(query, translationId, page),
        { timeoutMs: 15000 },
      );
      const pageResults = Array.isArray(pageData?.search?.results)
        ? pageData.search.results
        : [];
      results.push(...pageResults);
    }

    return {
      query: search.query || query,
      totalResults: Number(search.total_results) || 0,
      currentPage: Number(search.current_page) || 1,
      totalPages,
      results,
    };
  }

  async getFallbackTranslationSearchResults(query, translationId) {
    const [translationData, arabicData] = await Promise.all([
      this.fetchJson(this.getFullTranslationApiUrl(translationId), {
        timeoutMs: 20000,
      }),
      this.fetchJson(this.getFullArabicApiUrl(), { timeoutMs: 20000 }),
    ]);
    const arabicByVerse = new Map(
      (Array.isArray(arabicData?.verses) ? arabicData.verses : []).map(
        (verse) => [verse.verse_key, verse.text_uthmani || ""],
      ),
    );
    const translations = Array.isArray(translationData?.translations)
      ? translationData.translations
      : [];
    const normalizedQuery = String(query || "")
      .toLowerCase()
      .trim();
    const terms = normalizedQuery.split(/\s+/).filter(Boolean);

    return translations
      .filter((translation) => {
        const text = this.stripHtmlToText(
          translation?.text || "",
        ).toLowerCase();
        return terms.every((term) => text.includes(term));
      })
      .map((translation) => ({
        verse_key: translation.verse_key,
        chapter_id: translation.chapter_id,
        verse_number: translation.verse_number,
        text_uthmani: arabicByVerse.get(translation.verse_key) || "",
        translations: [{ text: translation.text || "" }],
      }));
  }

  buildPocketQuranSearchResults(query, verses) {
    return QuranSearch.shape(query, verses, (value) =>
      this.stripHtmlToText(value),
    );
  }

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

    let activeBtn = null;
    for (const btn of this.ayahListEl.querySelectorAll(
      ".pocket-quran-ayah-option",
    )) {
      const n = parseInt(btn.dataset.ayah, 10);
      const isActive = n === current;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
      if (isActive) {
        activeBtn = btn;
      }
    }

    // Scroll the dropdown list to show the active ayah at the top
    if (activeBtn && !this.ayahDropdown?.hidden) {
      this.scrollAyahDropdownToActive(activeBtn);
    }
  }

  scrollAyahDropdownToActive(activeBtn) {
    if (!activeBtn || !this.ayahListEl) return;

    // Get the scroll container (the dropdown list itself)
    const scrollContainer = this.ayahListEl;

    // Calculate the offset of the active button relative to the scroll container
    const btnOffsetTop = activeBtn.offsetTop;

    // Scroll so the active ayah is at the top of the visible area
    // Use a small offset (e.g., 4px) for visual padding
    const targetScrollTop = Math.max(0, btnOffsetTop - 4);

    scrollContainer.scrollTop = targetScrollTop;
  }

  scrollSurahDropdownToActive() {
    if (!this.surahListEl) return;

    // Find the active surah button
    const activeBtn = this.surahListEl.querySelector(
      `.pocket-quran-surah-item[data-surah="${this._activeSurah}"]`,
    );
    if (!activeBtn) return;

    // Get the scroll container (the dropdown list itself)
    const scrollContainer = this.surahListEl;

    // Calculate the offset of the active button relative to the scroll container
    const btnOffsetTop = activeBtn.offsetTop;

    // Scroll so the active surah is at the top of the visible area
    // Use a small offset (e.g., 4px) for visual padding
    const targetScrollTop = Math.max(0, btnOffsetTop - 4);

    scrollContainer.scrollTop = targetScrollTop;
  }

  getActiveSurahAyahCount() {
    return this.getSurahAyahCount(this._activeSurah);
  }

  getSurahAyahCount(surah) {
    const surahNumber = this.clampNumber(surah, 1, 114, null);
    const chapter = this._chapters.find((c) => c.id === surahNumber);
    const count = chapter?.verses_count;
    return Number.isFinite(count) ? count : null;
  }

  initRecitationSystem() {
    // Load saved settings
    const pq = this.storage.getSettings()?.pocketQuran || {};
    this._activeReciterId = pq.reciterId || 7; // Default: Mishary Rashid Alafasy
    this._volume = this.clampNumber(pq.reciterVolume, 0, 1, 1);
    this._isLooping = pq.reciterLoop || false;
    this._isSurahLooping = pq.reciterSurahLoop || false;
    this._isAutoplay = pq.reciterAutoplay || false;
    this._isAutoplayNextSurah = pq.reciterAutoplayNextSurah === true;
    this._isAutoScroll = pq.reciterAutoScroll || false;
    this._isRecitationHighlighterEnabled = pq.reciterHighlighter !== false;
    this._recitationWordHighlightLagMs =
      this.normalizeRecitationHighlightDelayMs(pq.reciterHighlighterDelayMs);
    this._recitationFloatingEnabled = pq.recitationFloatingEnabled === true;
    this._recitationAutoDockOnVisible = pq.recitationAutoDockOnVisible === true;
    this._recitationFloatingAppearance =
      this.normalizeRecitationFloatingAppearance(
        pq.recitationFloatingAppearance,
      );
    this._recitationFloatingManualOnly = false;

    // Small caches to smooth autoplay transitions.
    // Src cache avoids repeating the /by_ayah metadata request + blob URL setup.
    // Preload cache warms media buffering for the next few ayahs.
    this._audioSrcCache = new Map();
    this._audioBlobUrlCache = new Map();
    this._preloadedAudios = new Map();
    this._prefetchAheadCount = 3;

    // Store handlers so we can re-attach if we swap audio elements.
    this._onAudioEnded = () => this.handleAudioEnded();
    this._onAudioError = (e) => {
      console.error("PocketQuran: Audio error", e);
      this._isPlaying = false;
      this.clearActiveRecitationWordHighlight();
      this.updatePlaybackUI();
    };
    this._onAudioPlaying = (event) => {
      this.enforceSingleRecitationAudioOwner();
      this._isPlaying = true;
      this.syncActiveRecitationWord();
      this.updatePlaybackUI();
    };
    this._onAudioPause = (event) => {
      const sourceAudio = event?.currentTarget || event?.target || null;
      this.clearRecitationAudioOwnerIfCurrent(
        sourceAudio || this._audioElement,
      );
      this._isPlaying = false;
      this.clearActiveRecitationWordHighlight();
      this.updatePlaybackUI();
    };
    this._onAudioTimeUpdate = () => this.syncActiveRecitationWord();

    // Create audio element
    this._audioElement = new Audio();
    this._audioElement.volume = this._volume;
    this._audioElement.preload = "auto";

    this.attachAudioListeners(this._audioElement);

    // Load reciters list
    this.loadReciters();

    // Create reciter modal
    this.createReciterModal();
    this.publishPopupSyncState();
  }

  attachAudioListeners(audio) {
    if (!audio) return;
    audio.addEventListener("ended", this._onAudioEnded);
    audio.addEventListener("error", this._onAudioError);
    audio.addEventListener("playing", this._onAudioPlaying);
    audio.addEventListener("pause", this._onAudioPause);
    audio.addEventListener("timeupdate", this._onAudioTimeUpdate);
  }

  detachAudioListeners(audio) {
    if (!audio) return;
    audio.removeEventListener("ended", this._onAudioEnded);
    audio.removeEventListener("error", this._onAudioError);
    audio.removeEventListener("playing", this._onAudioPlaying);
    audio.removeEventListener("pause", this._onAudioPause);
    audio.removeEventListener("timeupdate", this._onAudioTimeUpdate);
  }

  setActiveAudioElement(audio) {
    if (!audio || audio === this._audioElement) return;
    try {
      if (this._audioElement) {
        this.detachAudioListeners(this._audioElement);
        this._audioElement.pause();
      }
    } catch (e) {}

    this._audioElement = audio;
    this._audioElement.preload = "auto";
    this._audioElement.volume = this._volume;
    this.attachAudioListeners(this._audioElement);
  }

  enforceSingleRecitationAudioOwner() {
    if (typeof window === "undefined") return;
    const ownerKey = "__MD_PQ_ACTIVE_AUDIO__";
    const activeAudio = window[ownerKey];

    if (activeAudio && activeAudio !== this._audioElement) {
      try {
        activeAudio.pause();
      } catch (e) {}
      try {
        activeAudio.currentTime = 0;
      } catch (e) {}
    }

    window[ownerKey] = this._audioElement;
  }

  clearRecitationAudioOwnerIfCurrent(audio = this._audioElement) {
    if (typeof window === "undefined") return;
    const ownerKey = "__MD_PQ_ACTIVE_AUDIO__";
    if (window[ownerKey] === audio) {
      window[ownerKey] = null;
    }
  }

  buildRecitationCacheKey(surah, ayah) {
    return `${this._activeReciterId}:${surah}:${ayah}`;
  }

  getRecitationTimingCacheKey(surah, reciterId = this._activeReciterId) {
    return `${reciterId}:${surah}`;
  }

  getRecitationTimingUrl(surah, reciterId = this._activeReciterId) {
    return `${PocketQuranManager.API_BASE}/recitations/${reciterId}/by_chapter/${surah}?fields=segments,duration&per_page=50`;
  }

  normalizeRecitationHighlightDelayMs(value) {
    return QuranRecitation.lagMs(value);
  }

  normalizeRecitationSegments(segments) {
    return QuranRecitation.normalizeSegments(segments);
  }

  async fetchRecitationTimingsForSurah(surah) {
    const chapter = this.clampNumber(surah, 1, 114, null);
    if (!chapter || !Number.isFinite(this._activeReciterId)) return null;

    const reciterId = this._activeReciterId;
    const cacheKey = this.getRecitationTimingCacheKey(chapter, reciterId);
    const cached = this._recitationTimingsCache?.get(cacheKey);
    if (
      cached &&
      (cached.failed !== true ||
        Date.now() < (Number(cached.retryAfter) || 0))
    ) {
      return cached;
    }

    const pending = this._recitationTimingFetches?.get(cacheKey);
    if (pending) return pending;

    const request = (async () => {
      try {
        const url = this.getRecitationTimingUrl(chapter, reciterId);
        const data = await this.fetchJson(url, { timeoutMs: 15000 });
        const audioFiles = Array.isArray(data?.audio_files)
          ? data.audio_files
          : [];
        const timings = new Map();

        audioFiles.forEach((audioFile) => {
          const verseKey = String(audioFile?.verse_key || "");
          const segments = this.normalizeRecitationSegments(
            audioFile?.segments,
          );
          if (!verseKey || !segments.length) return;

          timings.set(verseKey, {
            verseKey,
            duration: Number(audioFile?.duration) || null,
            segments,
          });
        });

        const result =
          timings.size > 0
            ? { fetchedAt: Date.now(), failed: false, timings }
            : {
                fetchedAt: Date.now(),
                failed: true,
                retryAfter:
                  Date.now() +
                  PocketQuranManager.RECITATION_TIMING_RETRY_COOLDOWN_MS,
                timings,
              };
        this._recitationTimingsCache.set(cacheKey, result);
        return result;
      } catch (e) {
        console.warn("PocketQuran: failed to fetch recitation timings", e);
        const result = {
          fetchedAt: Date.now(),
          failed: true,
          retryAfter:
            Date.now() +
            PocketQuranManager.RECITATION_TIMING_RETRY_COOLDOWN_MS,
          timings: new Map(),
        };
        this._recitationTimingsCache.set(cacheKey, result);
        return result;
      } finally {
        this._recitationTimingFetches.delete(cacheKey);
      }
    })();

    this._recitationTimingFetches.set(cacheKey, request);
    return request;
  }

  getCachedRecitationTimingForAyah(surah, ayah) {
    const cacheKey = this.getRecitationTimingCacheKey(surah);
    const cached = this._recitationTimingsCache?.get(cacheKey);
    if (cached?.failed === true) return null;
    return cached?.timings?.get(`${surah}:${ayah}`) || null;
  }

  primeRecitationTimingsForPlayback(surah, ayah) {
    const reciterId = this._activeReciterId;
    this.fetchRecitationTimingsForSurah(surah).then((result) => {
      if (
        result &&
        result.failed !== true &&
        this._activeReciterId === reciterId &&
        result.timings?.has(`${surah}:${ayah}`) &&
        this._playingAyah?.surah === surah &&
        this._playingAyah?.ayah === ayah
      ) {
        this.syncActiveRecitationWord();
      }
    });
  }

  clearActiveRecitationWordHighlight() {
    const root = this.card || document;
    root
      ?.querySelectorAll?.("[data-recitation-key].is-reciting")
      ?.forEach((el) => {
        el.classList.remove("is-reciting");
        el.removeAttribute("aria-current");
      });
    this._activeRecitationWordKey = null;
  }

  syncActiveRecitationWord() {
    if (
      !this._audioElement ||
      !this._playingAyah ||
      !this._isPlaying ||
      !this._isRecitationHighlighterEnabled ||
      this._isRecitationWordSyncDisabled
    ) {
      this.clearActiveRecitationWordHighlight();
      return;
    }

    const { surah, ayah } = this._playingAyah;
    const timing = this.getCachedRecitationTimingForAyah(surah, ayah);

    if (!timing) {
      void this.fetchRecitationTimingsForSurah(surah);
      return;
    }

    const currentMs = Math.max(
      0,
      this._audioElement.currentTime * 1000 -
        this._recitationWordHighlightLagMs,
    );
    const activeSegment = QuranRecitation.segmentAt(
      timing.segments,
      currentMs,
    );

    if (!activeSegment) {
      this.clearActiveRecitationWordHighlight();
      return;
    }

    const verseKey = `${surah}:${ayah}`;
    const recitationKey = QuranRecitation.keyFor(verseKey, activeSegment);
    if (this._activeRecitationWordKey === recitationKey) return;

    this.clearActiveRecitationWordHighlight();

    const ayahEl = this._virtualContent?.querySelector(
      `.pocket-quran-ayah[data-ayah="${ayah}"]`,
    );
    if (!ayahEl) return;

    ayahEl.querySelectorAll("[data-recitation-key]").forEach((wordEl) => {
      if (wordEl.dataset.verseKey !== verseKey) return;
      if (this.isAyahNumberMarkerText(wordEl.textContent)) return;

      const wordIndex = parseInt(wordEl.dataset.wordIndex, 10);
      if (QuranRecitation.coversWord(activeSegment, wordIndex)) {
        wordEl.classList.add("is-reciting");
        wordEl.setAttribute("aria-current", "true");
      }
    });

    this._activeRecitationWordKey = recitationKey;
  }

  _revokeAllRecitationBlobUrls() {
    if (!this._audioBlobUrlCache) return;
    for (const url of this._audioBlobUrlCache.values()) {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {}
    }
    this._audioBlobUrlCache.clear();
  }

  _getOrCreateRecitationBlobUrl(cacheKey, blob) {
    if (!cacheKey || !blob) return null;
    const existing = this._audioBlobUrlCache?.get(cacheKey);
    if (existing) return existing;
    try {
      const url = URL.createObjectURL(blob);
      this._audioBlobUrlCache?.set(cacheKey, url);
      return url;
    } catch (e) {
      return null;
    }
  }

  extractAudioUrlFromRecitationResponse(data) {
    const audioFiles = data?.audio_files;
    let audioUrl = null;

    if (Array.isArray(audioFiles) && audioFiles.length > 0) {
      audioUrl = audioFiles[0]?.url;
    } else if (data?.audio_file?.url) {
      audioUrl = data.audio_file.url;
    } else if (data?.audio_file?.audio_url) {
      audioUrl = data.audio_file.audio_url;
    }

    return this.resolveRecitationAudioUrl(audioUrl);
  }

  async getOrFetchAyahAudioSrc(surah, ayah, { timeoutMs = 10000 } = {}) {
    const key = this.buildRecitationCacheKey(surah, ayah);

    const cachedSrc = this._audioSrcCache?.get(key);
    if (cachedSrc) return cachedSrc;

    // 1) If MP3 is cached, avoid both metadata and MP3 network requests.
    if (this._pqCache) {
      const rec = await this._pqCache.getAudio(key);
      if (rec?.blob) {
        const blobUrl = this._getOrCreateRecitationBlobUrl(key, rec.blob);
        if (blobUrl) {
          this._audioSrcCache?.set(key, blobUrl);
          return blobUrl;
        }
      }
    }

    // 2) Resolve the actual MP3 URL (fetchJson itself is JSON-cached).
    const metaUrl = this.getAudioUrl(surah, ayah);
    const data = await this.fetchJson(metaUrl, { timeoutMs });
    const audioUrl = this.extractAudioUrlFromRecitationResponse(data);
    if (!audioUrl) return null;

    // 3) Fetch MP3 and cache it.
    let blob = null;
    let mimeType = "audio/mpeg";
    try {
      const controller = new AbortController();
      let timer = null;
      try {
        timer = setTimeout(
          () => {
            try {
              controller.abort();
            } catch (e) {}
          },
          Math.max(5000, timeoutMs),
        );

        const res = await fetch(audioUrl, {
          method: "GET",
          signal: controller.signal,
        });

        if (!res.ok) {
          // Still allow playback via remote URL if caching fails.
          this._audioSrcCache?.set(key, audioUrl);
          return audioUrl;
        }

        mimeType = res.headers.get("content-type") || mimeType;
        blob = await res.blob();
      } finally {
        if (timer) {
          clearTimeout(timer);
        }
      }
    } catch (e) {
      this._audioSrcCache?.set(key, audioUrl);
      return audioUrl;
    }

    const blobUrl = this._getOrCreateRecitationBlobUrl(key, blob);
    const finalSrc = blobUrl || audioUrl;
    this._audioSrcCache?.set(key, finalSrc);

    if (this._pqCache && blob) {
      await this._pqCache.setAudio({
        key,
        reciterId: this._activeReciterId,
        surah,
        ayah,
        audioUrl,
        mimeType,
        size: Number.isFinite(blob.size) ? blob.size : null,
        blob,
      });
    }

    return finalSrc;
  }

  trimPreloadedAudios(max = 6) {
    if (!this._preloadedAudios) return;
    while (this._preloadedAudios.size > max) {
      const firstKey = this._preloadedAudios.keys().next().value;
      const firstAudio = this._preloadedAudios.get(firstKey);
      try {
        if (firstAudio) {
          firstAudio.pause();
          firstAudio.src = "";
        }
      } catch (e) {}
      this._preloadedAudios.delete(firstKey);
    }
  }

  async ensurePreloadedAyahAudio(surah, ayah) {
    const key = this.buildRecitationCacheKey(surah, ayah);
    if (this._preloadedAudios?.has(key)) return this._preloadedAudios.get(key);

    let audioSrc = null;
    try {
      audioSrc = await this.getOrFetchAyahAudioSrc(surah, ayah, {
        timeoutMs: 10000,
      });
    } catch (e) {
      return null;
    }

    if (!audioSrc) return null;

    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = this._volume;
    audio.src = audioSrc;
    try {
      audio.load();
    } catch (e) {}

    this._preloadedAudios.set(key, audio);
    this.trimPreloadedAudios(6);
    return audio;
  }

  async prefetchNextAyahs(surah, fromAyah, count) {
    const max = this.getActiveSurahAyahCount() || 286;
    const capped = Math.max(0, Math.min(5, parseInt(count, 10) || 0));

    const tasks = [];
    for (let i = 1; i <= capped; i++) {
      const nextAyah = fromAyah + i;
      if (nextAyah > max) break;
      tasks.push(this.ensurePreloadedAyahAudio(surah, nextAyah));
    }

    if (tasks.length) {
      await Promise.allSettled(tasks);
    }
  }

  resetRecitationCaches() {
    try {
      if (this._preloadedAudios) {
        for (const a of this._preloadedAudios.values()) {
          try {
            a.pause();
            a.src = "";
          } catch (e) {}
        }
      }
    } catch (e) {}

    this._revokeAllRecitationBlobUrls();
    this.clearActiveRecitationWordHighlight();
    this._audioSrcCache = new Map();
    this._preloadedAudios = new Map();
    this._recitationTimingFetches = new Map();
  }

  tryPlayAyahImmediateFromCache(surah, ayah) {
    if (!this._audioElement) return false;

    const cacheKey = this.buildRecitationCacheKey(surah, ayah);

    // Prefer a preloaded audio element for the fastest possible start.
    const preloaded = this._preloadedAudios?.get(cacheKey);
    if (preloaded) {
      this._preloadedAudios.delete(cacheKey);
      this.setActiveAudioElement(preloaded);

      this._playingAyah = { surah, ayah };
      this._isRecitationWordSyncDisabled = false;
      this.primeRecitationTimingsForPlayback(surah, ayah);
      this._audioElement.volume = this._volume;

      try {
        this.enforceSingleRecitationAudioOwner();
        this._audioElement.currentTime = 0;
      } catch (e) {}

      try {
        this.enforceSingleRecitationAudioOwner();
        this._audioElement.play();
      } catch (e) {}

      if (!this._headerControlsBox) {
        this.showHeaderControls();
      }
      this.updatePlaybackUI();

      if (this._isAutoplay) {
        this.prefetchNextAyahs(surah, ayah, this._prefetchAheadCount);
      }

      // Only auto-scroll if viewing the same surah that's playing
      if (this._isAutoScroll && this._activeSurah === surah) {
        this.scrollToAyah(ayah, { persist: false, smooth: true });
      }

      return true;
    }

    // Next best: cached src (blob URL or remote URL).
    const cachedSrc = this._audioSrcCache?.get(cacheKey);
    if (cachedSrc) {
      this._playingAyah = { surah, ayah };
      this._isRecitationWordSyncDisabled = false;
      this.primeRecitationTimingsForPlayback(surah, ayah);
      this._audioElement.volume = this._volume;
      if (this._audioElement.src !== cachedSrc) {
        this._audioElement.src = cachedSrc;
      }

      try {
        this.enforceSingleRecitationAudioOwner();
        this._audioElement.play();
      } catch (e) {}

      if (!this._headerControlsBox) {
        this.showHeaderControls();
      }
      this.updatePlaybackUI();

      if (this._isAutoplay) {
        this.prefetchNextAyahs(surah, ayah, this._prefetchAheadCount);
      }

      // Only auto-scroll if viewing the same surah that's playing
      if (this._isAutoScroll && this._activeSurah === surah) {
        this.scrollToAyah(ayah, { persist: false, smooth: true });
      }

      return true;
    }

    return false;
  }

  async loadReciters() {
    try {
      const cached = this.storage.get("pocketQuran_reciters_cache", null);
      const cachedAt = this.storage.get("pocketQuran_reciters_cache_at", 0);
      const freshEnough =
        Date.now() - (cachedAt || 0) < 1000 * 60 * 60 * 24 * 7;

      if (cached && Array.isArray(cached) && freshEnough) {
        this._reciters = cached;
        return;
      }

      const url = `${PocketQuranManager.API_BASE}/resources/recitations`;
      const data = await this.fetchJson(url, { timeoutMs: 15000 });
      const recitations = Array.isArray(data?.recitations)
        ? data.recitations
        : [];

      this._reciters = recitations
        .map((r) => ({
          id: r.id,
          name: r.reciter_name || r.translated_name?.name || `Reciter ${r.id}`,
          style: r.style || null,
        }))
        .filter((r) => Number.isFinite(r.id));

      this.storage.set("pocketQuran_reciters_cache", this._reciters);
      this.storage.set("pocketQuran_reciters_cache_at", Date.now());
    } catch (e) {
      console.error("PocketQuran: failed to load reciters", e);
      // Provide a fallback list of common reciters
      this._reciters = [
        { id: 7, name: "Mishary Rashid Alafasy", style: null },
        { id: 1, name: "Abdul Basit Abdul Samad", style: "Murattal" },
        { id: 2, name: "Abdul Basit Abdul Samad", style: "Mujawwad" },
        { id: 3, name: "Abdur-Rahman as-Sudais", style: null },
        { id: 4, name: "Abu Bakr al-Shatri", style: null },
        { id: 5, name: "Hani ar-Rifai", style: null },
        { id: 6, name: "Mahmoud Khalil Al-Husary", style: null },
      ];
    }
  }

  getAudioUrl(surah, ayah) {
    // Format: https://api.quran.com/api/v4/recitations/{reciter_id}/by_ayah/{surah}:{ayah}
    // This returns audio_file info, but we can use verses.media CDN directly
    // CDN pattern: https://verses.quran.com/{reciter_relative_path}
    // Or use: https://api.quran.com/api/v4/chapter_recitations/{reciter_id}/{chapter_id}
    // For per-ayah audio, we use: /recitations/{reciter_id}/by_ayah/{verse_key}

    return `${PocketQuranManager.API_BASE}/recitations/${this._activeReciterId}/by_ayah/${surah}:${ayah}`;
  }

  resolveRecitationAudioUrl(url) {
    const raw = String(url || "").trim();
    if (!raw) return null;

    // Already absolute.
    if (/^https?:\/\//i.test(raw)) return raw;

    // Protocol-relative.
    if (raw.startsWith("//")) return `https:${raw}`;

    // Quran.com per-ayah endpoint returns relative paths hosted on verses.quran.com.
    const path = raw.replace(/^\/+/, "");
    return `https://verses.quran.com/${path}`;
  }

  async getChapterRecitationAudioUrl(surah) {
    const url = `${PocketQuranManager.API_BASE}/chapter_recitations/${this._activeReciterId}/${surah}`;
    const data = await this.fetchJson(url, { timeoutMs: 15000 });
    const audioUrl = data?.audio_file?.audio_url || data?.audio_file?.url;
    return this.resolveRecitationAudioUrl(audioUrl);
  }

  async playAyah(surah, ayah, { forceRestart = false } = {}) {
    if (!this._audioElement) return;

    this.stopOffscreenPlaybackBestEffort();

    const cacheKey = this.buildRecitationCacheKey(surah, ayah);
    const expectedCachedSrc = this._audioSrcCache?.get(cacheKey);
    const currentAudioSrc = String(
      this._audioElement.currentSrc || this._audioElement.src || "",
    );
    const canResumeRequestedAyah =
      !forceRestart &&
      this._playingAyah?.surah === surah &&
      this._playingAyah?.ayah === ayah &&
      this._audioElement.paused &&
      Boolean(expectedCachedSrc) &&
      currentAudioSrc === expectedCachedSrc;

    // If same ayah is playing, just resume if paused
    if (canResumeRequestedAyah) {
      this.enforceSingleRecitationAudioOwner();
      this._audioElement.play();
      return;
    }

    try {
      // If we already preloaded this ayah, swap to that audio element.
      const preloaded = this._preloadedAudios?.get(cacheKey);
      if (preloaded) {
        this._preloadedAudios.delete(cacheKey);
        this.setActiveAudioElement(preloaded);
      }

      const audioUrl = await this.getOrFetchAyahAudioSrc(surah, ayah, {
        timeoutMs: 10000,
      });

      if (!audioUrl) {
        console.error("PocketQuran: No audio file found for ayah", surah, ayah);
        return;
      }

      // Set up playback
      this._playingAyah = { surah, ayah };
      this._isRecitationWordSyncDisabled = false;
      this.primeRecitationTimingsForPlayback(surah, ayah);
      this._audioElement.volume = this._volume;
      if (this._audioElement.src !== audioUrl) {
        this._audioElement.src = audioUrl;
      }

      // Start warming the next ayahs immediately (don't await).
      // This reduces the chance of a buffer gap at the transition.
      if (this._isAutoplay) {
        this.prefetchNextAyahs(surah, ayah, this._prefetchAheadCount);
      }

      try {
        this.enforceSingleRecitationAudioOwner();
        await this._audioElement.play();
      } catch (e) {
        // Fallback: chapter recitation URL (usually download.quranicaudio.com)
        const chapterUrl = await this.getChapterRecitationAudioUrl(surah);
        if (chapterUrl) {
          this._isRecitationWordSyncDisabled = true;
          this.clearActiveRecitationWordHighlight();
          this._audioElement.src = chapterUrl;
          this.enforceSingleRecitationAudioOwner();
          await this._audioElement.play();
        } else {
          throw e;
        }
      }

      // Show header controls
      this.showHeaderControls();
      this.updatePlaybackUI();

      // Scroll to the playing ayah if auto-scroll is enabled and viewing the same surah
      // Only scroll if the currently viewed surah matches the surah being played
      if (this._activeSurah === surah) {
        if (this._isAutoScroll || this._activeAyah !== ayah) {
          this.scrollToAyah(ayah, { persist: false, smooth: true });
        }
      }
    } catch (e) {
      console.error("PocketQuran: Failed to play ayah", e);
      this._isPlaying = false;
      this.updatePlaybackUI();
    }
  }

  togglePlayPause(surah, ayah) {
    if (!this._audioElement) return;

    this.markPocketQuranControlInteraction();

    if (
      this._isPlaying &&
      this._playingAyah?.surah === surah &&
      this._playingAyah?.ayah === ayah
    ) {
      this._audioElement.pause();
    } else {
      this.enableAutoplayOnFirstPlayIfNeeded();
      this.playAyah(surah, ayah);
    }
  }

  enableAutoplayOnFirstPlayIfNeeded() {
    // If this extension is being used for the first time (no persisted autoplay
    // preference yet), enable autoplay by default on the first play.
    try {
      const pq = this.storage.getSettings()?.pocketQuran || {};
      const hasExplicitAutoplay = Object.prototype.hasOwnProperty.call(
        pq,
        "reciterAutoplay",
      );
      if (hasExplicitAutoplay) return;
      if (this._isAutoplay) return;

      this._isAutoplay = true;
      this.persistPocketQuranSettings({ reciterAutoplay: true });
      this.updatePlaybackUI();
    } catch (e) {}
  }

  stopPlayback() {
    if (!this._audioElement) return;

    this.markPocketQuranControlInteraction();
    this.stopOffscreenPlaybackBestEffort();

    this._audioElement.pause();
    this._audioElement.currentTime = 0;
    this.clearRecitationAudioOwnerIfCurrent(this._audioElement);
    this._isPlaying = false;
    this._playingAyah = null;
    this._isAutoplay = false;

    this.resetRecitationCaches();

    if (
      this._recitationFloatingMode &&
      this._recitationFloatingModeReason === "auto"
    ) {
      this.disableRecitationFloating({ preserveManualOnly: true });
    }
    this._recitationFloatingManualOnly = false;

    this.updatePlaybackUI();
  }
});

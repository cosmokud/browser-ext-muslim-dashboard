/**
 * PocketQuranManager: ayah scrolling, highlight, copy and teardown.
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
});

/**
 * PocketQuranManager: rendered ayah window.
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
});

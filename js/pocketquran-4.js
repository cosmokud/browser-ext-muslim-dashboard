/**
 * PocketQuranManager, part 4 of 6.
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

  finishPlaybackAtSurahEnd() {
    if (!this._audioElement) return;

    this._audioElement.pause();
    this._audioElement.currentTime = 0;
    this.clearRecitationAudioOwnerIfCurrent(this._audioElement);
    this._isPlaying = false;
    this._playingAyah = null;
    // Intentionally do NOT change this._isAutoplay: keep user's autoplay setting.
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

  handleAudioEnded() {
    if (this._isLooping && this._playingAyah) {
      // Loop: replay the same ayah
      this._audioElement.currentTime = 0;
      this.enforceSingleRecitationAudioOwner();
      this._audioElement.play();
      return;
    }

    if (this._isAutoplay && this._playingAyah) {
      // Autoplay: move to next ayah
      const { surah, ayah } = this._playingAyah;
      const chapter = this._chapters.find((c) => c.id === surah);
      const max =
        (Number.isFinite(chapter?.verses_count) && chapter.verses_count) || 286;

      if (ayah < max) {
        const nextAyah = ayah + 1;

        // Fast path: start the next ayah immediately from preload/cache.
        if (this.tryPlayAyahImmediateFromCache(surah, nextAyah)) {
          return;
        }

        // Fallback: normal async path (fetches metadata if needed)
        this.playAyah(surah, nextAyah);
      } else {
        if (this._isSurahLooping) {
          this.playAyah(surah, 1, { forceRestart: true });
          return;
        }

        if (this._isAutoplayNextSurah) {
          void this.playNextSurahFromAutoplay(surah);
          return;
        }

        // End of surah — stop audio but keep autoplay preference enabled.
        this.finishPlaybackAtSurahEnd();
      }
      return;
    }

    // Normal end
    this._isPlaying = false;
    this._playingAyah = null;

    if (
      this._recitationFloatingMode &&
      this._recitationFloatingModeReason === "auto"
    ) {
      this.disableRecitationFloating({ preserveManualOnly: true });
    }
    this._recitationFloatingManualOnly = false;

    this.updatePlaybackUI();
  }

  async playPreviousAyah({
    desiredIsPlaying = this._isPlaying === true,
    targetSurah = null,
    targetAyah = null,
  } = {}) {
    this.markPocketQuranControlInteraction();

    const fallbackTarget = this.getRecitationControlTargetAyah();
    const surah = this.clampNumber(targetSurah, 1, 114, fallbackTarget.surah);
    const maxAyah = this.getSurahAyahCount(surah) || 286;
    const ayah = this.clampNumber(targetAyah, 1, maxAyah, fallbackTarget.ayah);
    const previousAyah = this.clampNumber(ayah - 1, 1, maxAyah, ayah);

    if (ayah <= 1 && this._isAutoplayNextSurah) {
      const previousSurah = this.getPreviousSurahNumber(surah);
      if (!Number.isFinite(previousSurah)) {
        return;
      }

      const previousSurahMaxAyah = this.getSurahAyahCount(previousSurah) || 286;
      this.stopOffscreenPlaybackBestEffort();
      await this.activateRecitationTargetSurah(previousSurah);

      if (desiredIsPlaying) {
        await this.playAyah(previousSurah, previousSurahMaxAyah, {
          forceRestart: true,
        });
        return;
      }

      this.setPausedRecitationTarget(previousSurah, previousSurahMaxAyah);
      return;
    }

    if (previousAyah === ayah) {
      return;
    }

    this.stopOffscreenPlaybackBestEffort();

    if (desiredIsPlaying) {
      await this.playAyah(surah, previousAyah);
      return;
    }

    this.setPausedRecitationTarget(surah, previousAyah);
  }

  async playNextAyah({
    desiredIsPlaying = this._isPlaying === true,
    targetSurah = null,
    targetAyah = null,
  } = {}) {
    this.markPocketQuranControlInteraction();

    const fallbackTarget = this.getRecitationControlTargetAyah();
    const surah = this.clampNumber(targetSurah, 1, 114, fallbackTarget.surah);
    const max = this.getSurahAyahCount(surah) || 286;
    const ayah = this.clampNumber(targetAyah, 1, max, fallbackTarget.ayah);

    const nextAyah = this.clampNumber(ayah + 1, 1, max, ayah);
    if (nextAyah === ayah && this._isAutoplayNextSurah) {
      const nextSurah = this.getNextSurahNumber(surah);
      if (!Number.isFinite(nextSurah)) {
        return;
      }

      this.stopOffscreenPlaybackBestEffort();
      await this.activateRecitationTargetSurah(nextSurah);

      if (desiredIsPlaying) {
        await this.playAyah(nextSurah, 1, { forceRestart: true });
        return;
      }

      this.setPausedRecitationTarget(nextSurah, 1);
      return;
    }

    if (nextAyah === ayah) {
      return;
    }

    this.stopOffscreenPlaybackBestEffort();

    if (desiredIsPlaying) {
      await this.playAyah(surah, nextAyah);
      return;
    }

    this.setPausedRecitationTarget(surah, nextAyah);
  }

  getPreviousSurahNumber(currentSurah) {
    const surah = this.clampNumber(currentSurah, 1, 114, 1);

    if (Array.isArray(this._chapters) && this._chapters.length > 0) {
      const currentIndex = this._chapters.findIndex((chapter) => {
        return this.clampNumber(chapter?.id, 1, 114, NaN) === surah;
      });

      if (currentIndex > 0) {
        return this.clampNumber(
          this._chapters[currentIndex - 1]?.id,
          1,
          114,
          null,
        );
      }
    }

    return surah > 1 ? surah - 1 : null;
  }

  async activateRecitationTargetSurah(surah) {
    const targetSurah = this.clampNumber(surah, 1, 114, this._activeSurah);
    const versesAlreadyRendered = Boolean(
      this.contentEl?.querySelector?.(".pocket-quran-ayah"),
    );

    if (targetSurah === this._activeSurah && versesAlreadyRendered) {
      return;
    }

    await this.setActiveSurah(targetSurah, {
      preserveAyah: false,
      autoScroll: false,
      preserveDashboardScroll: true,
    });
  }

  getNextSurahNumber(currentSurah) {
    const surah = this.clampNumber(currentSurah, 1, 114, 1);

    if (Array.isArray(this._chapters) && this._chapters.length > 0) {
      const currentIndex = this._chapters.findIndex((chapter) => {
        return this.clampNumber(chapter?.id, 1, 114, NaN) === surah;
      });

      if (currentIndex >= 0 && currentIndex < this._chapters.length - 1) {
        return this.clampNumber(
          this._chapters[currentIndex + 1]?.id,
          1,
          114,
          null,
        );
      }
    }

    return surah < 114 ? surah + 1 : null;
  }

  async playNextSurahFromAutoplay(currentSurah) {
    const nextSurah = this.getNextSurahNumber(currentSurah);
    if (!Number.isFinite(nextSurah)) {
      this.finishPlaybackAtSurahEnd();
      return;
    }

    try {
      if (this._activeSurah !== nextSurah) {
        await this.setActiveSurah(nextSurah, {
          preserveAyah: false,
          autoScroll: false,
          preserveDashboardScroll: true,
        });
      }

      await this.playAyah(nextSurah, 1, { forceRestart: true });
    } catch (e) {
      console.error("PocketQuran: failed to autoplay next surah", e);
      this.finishPlaybackAtSurahEnd();
    }
  }

  setVolume(value) {
    this._volume = this.clampNumber(value, 0, 1, 1);
    if (this._audioElement) {
      this._audioElement.volume = this._volume;
    }
    this.persistPocketQuranSettings({ reciterVolume: this._volume });
  }

  toggleLoop() {
    this._isLooping = !this._isLooping;
    this.persistPocketQuranSettings({ reciterLoop: this._isLooping });
    this.updatePlaybackUI();
  }

  toggleSurahLoop() {
    this._isSurahLooping = !this._isSurahLooping;
    this.persistPocketQuranSettings({ reciterSurahLoop: this._isSurahLooping });
    this.updatePlaybackUI();
  }

  toggleAutoplay() {
    this._isAutoplay = !this._isAutoplay;
    this.persistPocketQuranSettings({ reciterAutoplay: this._isAutoplay });
    this.updatePlaybackUI();

    // If turning on autoplay and not currently playing, start playback
    if (this._isAutoplay && !this._isPlaying) {
      this.playAyah(this._activeSurah, this._activeAyah);
    } else if (this._isAutoplay && this._playingAyah) {
      this.prefetchNextAyahs(
        this._playingAyah.surah,
        this._playingAyah.ayah,
        this._prefetchAheadCount,
      );
    }
  }

  toggleAutoplayNextSurah() {
    this._isAutoplayNextSurah = !this._isAutoplayNextSurah;
    this.persistPocketQuranSettings({
      reciterAutoplayNextSurah: this._isAutoplayNextSurah,
    });
    this.updatePlaybackUI();
  }

  toggleAutoScroll() {
    this._isAutoScroll = !this._isAutoScroll;
    this.persistPocketQuranSettings({ reciterAutoScroll: this._isAutoScroll });
    this.updatePlaybackUI();

    // If enabling auto-scroll while playing, scroll to the currently playing ayah
    if (
      this._isAutoScroll &&
      this._playingAyah &&
      this._activeSurah === this._playingAyah.surah
    ) {
      this.scrollToAyah(this._playingAyah.ayah, {
        persist: false,
        smooth: true,
      });
    }
  }

  toggleRecitationHighlighter() {
    this._isRecitationHighlighterEnabled =
      !this._isRecitationHighlighterEnabled;
    this.persistPocketQuranSettings({
      reciterHighlighter: this._isRecitationHighlighterEnabled,
    });

    if (!this._isRecitationHighlighterEnabled) {
      this.clearActiveRecitationWordHighlight();
    } else {
      this.syncActiveRecitationWord();
    }

    this.updatePlaybackUI();
  }

  handleSettingsApplied(settings) {
    const normalized =
      settings && typeof settings === "object"
        ? settings
        : this.storage.getSettings();
    const pq = normalized?.pocketQuran || {};

    this.applyArabicFontFamily(pq.arabicFontFamily, {
      persist: false,
      recalculate: true,
    });
    this.applyTranslationFontFamily(pq.translationFontFamily, {
      persist: false,
      recalculate: true,
    });
    this.applyTextVisibility(pq.showArabicText, pq.showTranslationText, {
      persist: false,
      recalculate: true,
      allowBothOff: false,
    });

    this._recitationFloatingEnabled = pq.recitationFloatingEnabled === true;
    this._recitationAutoDockOnVisible = pq.recitationAutoDockOnVisible === true;
    this._isRecitationHighlighterEnabled = pq.reciterHighlighter !== false;
    this._recitationWordHighlightLagMs =
      this.normalizeRecitationHighlightDelayMs(pq.reciterHighlighterDelayMs);
    this._recitationFloatingAppearance =
      this.normalizeRecitationFloatingAppearance(
        pq.recitationFloatingAppearance,
      );

    if (!this._recitationFloatingEnabled) {
      this.unwatchRecitationControlsVisibility();
      if (
        this._recitationFloatingMode &&
        this._recitationFloatingModeReason === "auto"
      ) {
        this.disableRecitationFloating({ preserveManualOnly: false });
      }
    } else if (this._headerControlsBox && !this._recitationFloatingMode) {
      this.watchRecitationControlsVisibility();
      this.maybeAutoFloatRecitationControls();
    }

    if (this._recitationFloatingMode && this._recitationAutoDockOnVisible) {
      this.watchRecitationAutoDockVisibility();
    } else {
      this.unwatchRecitationAutoDockVisibility();
    }

    this.syncRecitationFloatingAppearanceClass();
    this.updateRecitationFloatingButtons();
  }

  shouldAutoFloatRecitationControls() {
    return (
      this._recitationFloatingEnabled &&
      this._isPlaying &&
      !this._recitationFloatingManualOnly
    );
  }

  isElementMeaningfullyVisible(element) {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    const width = Math.max(0, rect.width);
    const height = Math.max(0, rect.height);
    if (!width || !height) return false;

    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight || 0;

    const visibleWidth =
      Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0);
    const visibleHeight =
      Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);

    if (visibleWidth <= 0 || visibleHeight <= 0) return false;

    const visibleArea = visibleWidth * visibleHeight;
    const totalArea = width * height;
    return visibleArea / totalArea >= 0.2;
  }

  ensureRecitationVisibilityObserver() {
    if (this._recitationVisibilityObserver) return;
    if (typeof IntersectionObserver !== "function") return;

    this._recitationVisibilityObserver = new IntersectionObserver(
      (entries) => {
        const entry = Array.isArray(entries) ? entries[0] : null;
        if (
          !entry ||
          !this._headerControlsBox ||
          this._recitationFloatingMode
        ) {
          return;
        }

        const isVisible =
          entry.isIntersecting === true && entry.intersectionRatio >= 0.2;
        if (!isVisible) {
          this.maybeAutoFloatRecitationControls();
        }
      },
      {
        threshold: [0, 0.2, 0.4, 0.6, 1],
      },
    );
  }

  watchRecitationControlsVisibility() {
    if (
      !this._headerControlsBox ||
      this._recitationFloatingMode ||
      !this._recitationFloatingEnabled
    ) {
      return;
    }

    this.ensureRecitationVisibilityObserver();
    if (!this._recitationVisibilityObserver) return;

    this._recitationVisibilityObserver.disconnect();
    this._recitationVisibilityObserver.observe(this._headerControlsBox);
  }

  unwatchRecitationControlsVisibility() {
    if (this._recitationVisibilityObserver) {
      this._recitationVisibilityObserver.disconnect();
    }
  }

  ensureRecitationAutoDockObserver() {
    if (this._recitationAutoDockObserver) return;
    if (typeof IntersectionObserver !== "function") return;

    this._recitationAutoDockObserver = new IntersectionObserver(
      (entries) => {
        const entry = Array.isArray(entries) ? entries[0] : null;
        if (
          !entry ||
          !this._headerControlsBox ||
          !this._recitationFloatingMode
        ) {
          return;
        }

        const isVisible =
          entry.isIntersecting === true && entry.intersectionRatio >= 0.2;

        if (!isVisible) {
          this._recitationAutoDockAwaitingReturn = true;
          return;
        }

        if (
          this._recitationAutoDockOnVisible &&
          this._recitationAutoDockAwaitingReturn
        ) {
          this.disableRecitationFloating({ preserveManualOnly: true });
        }
      },
      {
        threshold: [0, 0.2, 0.4, 0.6, 1],
      },
    );
  }

  watchRecitationAutoDockVisibility() {
    if (!this._recitationFloatingMode || !this._recitationAutoDockOnVisible) {
      return;
    }

    const target =
      this.card?.querySelector(".pocket-quran-header") || this.card;
    if (!target) return;

    this.ensureRecitationAutoDockObserver();
    if (!this._recitationAutoDockObserver) return;

    this._recitationAutoDockObserver.disconnect();
    this._recitationAutoDockObserver.observe(target);

    this._recitationAutoDockAwaitingReturn =
      !this.isElementMeaningfullyVisible(target);
  }

  unwatchRecitationAutoDockVisibility() {
    if (this._recitationAutoDockObserver) {
      this._recitationAutoDockObserver.disconnect();
    }
    this._recitationAutoDockAwaitingReturn = false;
  }

  maybeAutoFloatRecitationControls() {
    if (!this.shouldAutoFloatRecitationControls()) return;
    if (!this._headerControlsBox || this._recitationFloatingMode) return;
    if (this.isElementMeaningfullyVisible(this._headerControlsBox)) return;

    this.enableRecitationFloating({ source: "auto" });
  }

  ensureRecitationControlsAttachedToHeader() {
    const header = this.card?.querySelector(".pocket-quran-header");
    if (!header || !this._headerControlsBox) return false;

    const actions = header.querySelector(".card-header-actions");
    const title = header.querySelector(".card-title");
    if (actions) {
      actions.after(this._headerControlsBox);
    } else if (title) {
      title.after(this._headerControlsBox);
    } else {
      header.appendChild(this._headerControlsBox);
    }

    header.classList.add("pq-has-recitation-controls");
    return true;
  }

  positionRecitationFloatingPanel() {
    if (!this._headerControlsBox || !this._recitationFloatingMode) return;

    const box = this._headerControlsBox;
    const margin = 12;

    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight || 0;

    const rect = box.getBoundingClientRect();
    const panelWidth = Math.max(
      260,
      Math.round(rect.width || box.offsetWidth || 360),
    );
    const panelHeight = Math.max(
      80,
      Math.round(rect.height || box.offsetHeight || 90),
    );

    const hasStoredPosition =
      Number.isFinite(this._recitationFloatingPosition?.left) &&
      Number.isFinite(this._recitationFloatingPosition?.top);

    let left = hasStoredPosition
      ? this._recitationFloatingPosition.left
      : margin;
    let top = hasStoredPosition
      ? this._recitationFloatingPosition.top
      : Math.max(margin, viewportHeight - panelHeight - margin);

    if (!hasStoredPosition) {
      const attribution = document.getElementById("bg-attribution");
      if (attribution) {
        const attrRect = attribution.getBoundingClientRect();
        const overlapsHoriz =
          left < attrRect.right + margin &&
          left + panelWidth > attrRect.left - margin;
        const overlapsVert =
          top < attrRect.bottom + margin &&
          top + panelHeight > attrRect.top - margin;

        if (overlapsHoriz && overlapsVert) {
          top = Math.max(margin, attrRect.top - panelHeight - margin);
        }
      }
    }

    left = Math.max(
      margin,
      Math.min(left, viewportWidth - panelWidth - margin),
    );
    top = Math.max(
      margin,
      Math.min(top, viewportHeight - panelHeight - margin),
    );

    this._recitationFloatingPosition = {
      left: Math.round(left),
      top: Math.round(top),
    };

    box.style.left = `${this._recitationFloatingPosition.left}px`;
    box.style.top = `${this._recitationFloatingPosition.top}px`;
  }

  startRecitationFloatingDrag(event) {
    if (!this._headerControlsBox || !this._recitationFloatingMode) return;

    const box = this._headerControlsBox;
    if (!(event instanceof PointerEvent)) return;

    if (
      event.button !== 0 &&
      event.pointerType !== "touch" &&
      event.pointerType !== "pen"
    ) {
      return;
    }

    const interactiveTarget = event.target?.closest?.(
      "button, input, select, textarea, a, label, [role='button'], .pq-recitation-ayah, .pq-recitation-reciter, .pq-volume-control",
    );
    if (interactiveTarget) return;

    const boxRect = box.getBoundingClientRect();
    const parsedLeft = Number.parseFloat(box.style.left);
    const parsedTop = Number.parseFloat(box.style.top);
    const startLeft = Number.isFinite(parsedLeft) ? parsedLeft : boxRect.left;
    const startTop = Number.isFinite(parsedTop) ? parsedTop : boxRect.top;

    this.stopRecitationFloatingDrag();

    const dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft,
      startTop,
      onPointerMove: null,
      onPointerUp: null,
    };

    dragState.onPointerMove = (moveEvent) => {
      if (moveEvent.pointerId !== dragState.pointerId) return;
      if (!this._headerControlsBox || !this._recitationFloatingMode) {
        this.stopRecitationFloatingDrag();
        return;
      }

      const deltaX = moveEvent.clientX - dragState.startX;
      const deltaY = moveEvent.clientY - dragState.startY;

      this._recitationFloatingPosition = {
        left: dragState.startLeft + deltaX,
        top: dragState.startTop + deltaY,
      };
      this.positionRecitationFloatingPanel();
    };

    dragState.onPointerUp = (upEvent) => {
      if (upEvent.pointerId !== dragState.pointerId) return;
      this.stopRecitationFloatingDrag();
    };

    this._recitationFloatingDrag = dragState;
    box.classList.add("pq-recitation-controls-dragging");

    if (typeof box.setPointerCapture === "function") {
      try {
        box.setPointerCapture(event.pointerId);
      } catch (err) {
        // Ignore unsupported capture failures.
      }
    }

    window.addEventListener("pointermove", dragState.onPointerMove, {
      passive: true,
    });
    window.addEventListener("pointerup", dragState.onPointerUp);
    window.addEventListener("pointercancel", dragState.onPointerUp);

    event.preventDefault();
  }

  stopRecitationFloatingDrag() {
    const dragState = this._recitationFloatingDrag;
    if (!dragState) return;

    window.removeEventListener("pointermove", dragState.onPointerMove);
    window.removeEventListener("pointerup", dragState.onPointerUp);
    window.removeEventListener("pointercancel", dragState.onPointerUp);

    const box = this._headerControlsBox;
    if (box) {
      box.classList.remove("pq-recitation-controls-dragging");
      if (typeof box.releasePointerCapture === "function") {
        try {
          box.releasePointerCapture(dragState.pointerId);
        } catch (err) {
          // Ignore unsupported release failures.
        }
      }
    }

    this._recitationFloatingDrag = null;
  }

  syncRecitationFloatingAppearanceClass() {
    if (!this._headerControlsBox) return;

    const useOpaqueMode =
      this._recitationFloatingMode &&
      this._recitationFloatingAppearance === "opaque";

    this._headerControlsBox.classList.toggle(
      "pq-recitation-controls-floating-opaque",
      useOpaqueMode,
    );
  }

  enableRecitationFloating({ source = "manual" } = {}) {
    if (source !== "manual" && !this._recitationFloatingEnabled) return;

    if (!this._headerControlsBox) {
      this.showHeaderControls();
    }
    if (!this._headerControlsBox) return;

    if (this._recitationFloatingMode) {
      this._recitationFloatingModeReason = source;
      this.syncRecitationFloatingAppearanceClass();
      this.positionRecitationFloatingPanel();
      if (this._recitationAutoDockOnVisible) {
        this.watchRecitationAutoDockVisibility();
      }
      this.updateRecitationFloatingButtons();
      return;
    }

    this.unwatchRecitationControlsVisibility();

    const header = this.card?.querySelector(".pocket-quran-header");
    if (header) {
      header.classList.remove("pq-has-recitation-controls");
    }

    document.body.appendChild(this._headerControlsBox);
    this._headerControlsBox.classList.add("pq-recitation-controls-floating");

    this._recitationFloatingMode = true;
    this._recitationFloatingModeReason = source;

    this.syncRecitationFloatingAppearanceClass();
    this.positionRecitationFloatingPanel();
    if (this._recitationAutoDockOnVisible) {
      this.watchRecitationAutoDockVisibility();
    } else {
      this.unwatchRecitationAutoDockVisibility();
    }
    this.updateRecitationFloatingButtons();
  }

  disableRecitationFloating({ preserveManualOnly = false } = {}) {
    if (!this._headerControlsBox) return;

    this.stopRecitationFloatingDrag();
    this._headerControlsBox.classList.remove("pq-recitation-controls-floating");
    this._headerControlsBox.classList.remove(
      "pq-recitation-controls-floating-opaque",
    );
    this._headerControlsBox.style.removeProperty("left");
    this._headerControlsBox.style.removeProperty("top");
    this.unwatchRecitationAutoDockVisibility();

    this._recitationFloatingMode = false;
    this._recitationFloatingModeReason = null;
    if (!preserveManualOnly) {
      this._recitationFloatingManualOnly = false;
    }

    this.ensureRecitationControlsAttachedToHeader();

    if (this._recitationFloatingEnabled) {
      this.watchRecitationControlsVisibility();
      this.maybeAutoFloatRecitationControls();
    }

    this.updateRecitationFloatingButtons();
  }

  minimizeRecitationFloating() {
    this._recitationFloatingManualOnly = true;
    this.disableRecitationFloating({ preserveManualOnly: true });
  }

  toggleRecitationFloating() {
    if (this._recitationFloatingMode) {
      this.disableRecitationFloating({ preserveManualOnly: true });
      return;
    }

    this.enableRecitationFloating({ source: "manual" });
  }

  updateRecitationFloatingButtons() {
    if (!this._headerControlsBox) return;

    const floatToggleBtn = this._headerControlsBox.querySelector(
      ".pq-recitation-float-toggle-btn",
    );

    if (floatToggleBtn) {
      const label = this._recitationFloatingMode
        ? "Dock recitation controls"
        : "Detach recitation controls";

      floatToggleBtn.innerHTML = this._recitationFloatingMode
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-picture-in-picture2-icon lucide-picture-in-picture-2" aria-hidden="true" focusable="false"><path d="M21 9V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h4"/><rect width="10" height="7" x="12" y="13" rx="2"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-picture-in-picture-icon lucide-picture-in-picture" aria-hidden="true" focusable="false"><path d="M2 10h6V4"/><path d="m2 4 6 6"/><path d="M21 10V7a2 2 0 0 0-2-2h-7"/><path d="M3 14v2a2 2 0 0 0 2 2h3"/><rect x="12" y="14" width="10" height="7" rx="1"/></svg>';
      floatToggleBtn.title = label;
      floatToggleBtn.setAttribute("aria-label", label);
      floatToggleBtn.setAttribute(
        "aria-pressed",
        this._recitationFloatingMode ? "true" : "false",
      );
    }

    this._headerControlsBox.classList.toggle(
      "pq-recitation-controls-manual-only",
      this._recitationFloatingManualOnly,
    );
  }

  getSurahNameSimple(surah) {
    const id = parseInt(surah, 10);
    const chapter = this._chapters?.find((c) => c.id === id);
    return (
      chapter?.name_simple || `Surah ${Number.isFinite(id) ? id : ""}`.trim()
    );
  }

  formatRecitationAyahLabel(surah, ayah) {
    const s = parseInt(surah, 10);
    const a = parseInt(ayah, 10);
    const surahName = this.getSurahNameSimple(s);
    const surahPrefix = Number.isFinite(s) ? `${s}. ` : "";
    const ayahPart = Number.isFinite(a) ? `Ayah ${a}` : "Ayah";
    return `${surahPrefix}${surahName} · ${ayahPart}`;
  }

  isDashboardRecitationActivelyPlaying() {
    return (
      this._isPlaying === true ||
      (this._audioElement &&
        this._audioElement.paused === false &&
        this._audioElement.ended === false)
    );
  }

  hasUsableSyncedRecitationTarget(state) {
    if (!state || typeof state !== "object") return false;

    const target =
      state?.recitationAyah && typeof state.recitationAyah === "object"
        ? state.recitationAyah
        : null;
    if (!target) return false;

    const surah = Number(target.surah);
    const ayah = Number(target.ayah);
    if (!Number.isFinite(surah) || !Number.isFinite(ayah)) return false;

    const normalizedSurah = this.clampNumber(surah, 1, 114, NaN);
    if (!Number.isFinite(normalizedSurah)) return false;

    const chapter = this._chapters?.find((c) => c.id === normalizedSurah);
    const maxAyah =
      (Number.isFinite(chapter?.verses_count) && chapter.verses_count) || 286;

    return ayah >= 1 && ayah <= maxAyah;
  }

  getRecitationControlTargetAyah() {
    const activeSurah = this.clampNumber(this._activeSurah, 1, 114, 1);
    const activeChapter = this._chapters?.find((c) => c.id === activeSurah);
    const activeMaxAyah =
      (Number.isFinite(activeChapter?.verses_count) &&
        activeChapter.verses_count) ||
      286;
    const activeAyah = this.clampNumber(
      this._activeAyah,
      1,
      activeMaxAyah,
      1,
    );

    const normalizeTarget = (target) => {
      if (!target || typeof target !== "object") return null;

      const surah = this.clampNumber(target.surah, 1, 114, activeSurah);
      const chapter = this._chapters?.find((c) => c.id === surah);
      const maxAyah =
        (Number.isFinite(chapter?.verses_count) && chapter.verses_count) ||
        286;
      const ayah = this.clampNumber(target.ayah, 1, maxAyah, activeAyah);

      return { surah, ayah };
    };

    try {
      const syncState = this.storage?.get(this._popupSyncStateKey, null);
      const syncedTarget = normalizeTarget(syncState?.recitationAyah);
      if (
        syncedTarget &&
        syncState?.isPlaying === true &&
        !this.isDashboardRecitationActivelyPlaying()
      ) {
        return syncedTarget;
      }

      const localTarget = normalizeTarget(this._playingAyah);
      if (localTarget) return localTarget;

      if (
        syncedTarget &&
        syncState?.source &&
        syncState.source !== "dashboard"
      ) {
        return syncedTarget;
      }
    } catch (e) {
      // no-op
    }

    const localTarget = normalizeTarget(this._playingAyah);
    if (localTarget) return localTarget;

    return { surah: activeSurah, ayah: activeAyah };
  }

  buildPopupSyncState() {
    const activeSurah = this.clampNumber(this._activeSurah, 1, 114, 1);
    const chapter = this._chapters?.find((c) => c.id === activeSurah);
    const maxAyah =
      (Number.isFinite(chapter?.verses_count) && chapter.verses_count) || 286;
    const activeAyah = this.clampNumber(this._activeAyah, 1, maxAyah, 1);

    const recitationTarget = this.getRecitationControlTargetAyah();
    const recitationSurah = this.clampNumber(
      recitationTarget?.surah,
      1,
      114,
      activeSurah,
    );
    const recitationChapter = this._chapters?.find(
      (c) => c.id === recitationSurah,
    );
    const recitationMaxAyah =
      (Number.isFinite(recitationChapter?.verses_count) &&
        recitationChapter.verses_count) ||
      286;
    const recitationAyah = this.clampNumber(
      recitationTarget?.ayah,
      1,
      recitationMaxAyah,
      activeAyah,
    );

    return {
      source: "dashboard",
      updatedAt: Date.now(),
      controllerInteractionAt: this._lastPocketQuranControlAt || 0,
      activeSurah,
      activeAyah,
      recitationAyah: {
        surah: recitationSurah,
        ayah: recitationAyah,
      },
      isPlaying: this._isPlaying === true,
      reciterId: this._activeReciterId,
      reciterName: this.getActiveReciterName(),
      volume: this.clampNumber(this._volume, 0, 1, 1),
      isLooping: this._isLooping === true,
      isSurahLooping: this._isSurahLooping === true,
      isAutoplay: this._isAutoplay === true,
      isAutoplayNextSurah: this._isAutoplayNextSurah === true,
      isAutoScroll: this._isAutoScroll === true,
      isTajweedMode: this._isTajweedMode === true,
      showArabicText: this._showArabicText === true,
      showTranslationText: this._showTranslationText === true,
      translationResourceId: this.normalizeTranslationId(
        this._activeTranslationId,
      ),
    };
  }

  publishPopupSyncState() {
    if (!this.storage) return;

    if (this._lastPocketQuranControlAt <= 0 && this._isPlaying !== true) {
      try {
        const existingState = this.storage.get(this._popupSyncStateKey, null);
        if (
          existingState &&
          typeof existingState === "object" &&
          ((existingState.source === "offscreen" &&
            existingState.isPlaying === true) ||
            this.hasUsableSyncedRecitationTarget(existingState))
        ) {
          return;
        }
      } catch (e) {
        // no-op
      }
    }

    try {
      this.storage.set(this._popupSyncStateKey, this.buildPopupSyncState());
    } catch (e) {
      // no-op
    }
  }

  stopOffscreenPlaybackBestEffort({ force = false } = {}) {
    const now = Date.now();
    if (!force && now - this._lastOffscreenStopSignalAt < 700) {
      return;
    }
    this._lastOffscreenStopSignalAt = now;

    if (typeof chrome === "undefined") return;
    if (typeof chrome.runtime?.sendMessage !== "function") return;

    try {
      chrome.runtime.sendMessage({ type: "md_pq_offscreen_stop" }, () => {
        // no-op
      });
    } catch (e) {
      // no-op
    }
  }

  markPocketQuranControlInteraction() {
    const now = Date.now();
    const last = Number(this._lastPocketQuranControlAt) || 0;
    this._lastPocketQuranControlAt = now > last ? now : last + 1;
  }

  hasDashboardControlOwnership() {
    return Number(this._lastPocketQuranControlAt) > 0;
  }

  setPausedRecitationTarget(surah, ayah) {
    const targetSurah = this.clampNumber(surah, 1, 114, this._activeSurah);
    const chapter = this._chapters.find((c) => c.id === targetSurah);
    const maxAyah =
      (Number.isFinite(chapter?.verses_count) && chapter.verses_count) || 286;
    const targetAyah = this.clampNumber(ayah, 1, maxAyah, this._activeAyah);

    if (this._audioElement) {
      try {
        this._audioElement.pause();
        this._audioElement.currentTime = 0;
      } catch (e) {
        // no-op
      }
      this.clearRecitationAudioOwnerIfCurrent(this._audioElement);
    }

    this._isPlaying = false;
    this._activeSurah = targetSurah;
    this._activeAyah = targetAyah;
    this._playingAyah = { surah: targetSurah, ayah: targetAyah };

    this.persistPocketQuranSettings({
      lastSurahNumber: targetSurah,
      lastAyahNumber: targetAyah,
    });

    this.showHeaderControls();

    if (this._activeSurah === targetSurah) {
      this.scrollToAyah(targetAyah, { persist: false, smooth: true });
    }

    this.updatePlaybackUI();
  }

  async primePopupSelectionAudioTarget(surah, ayah) {
    if (!this._audioElement) return;

    try {
      this._audioElement.pause();
      this._audioElement.currentTime = 0;
    } catch (e) {
      // no-op
    }

    this.clearRecitationAudioOwnerIfCurrent(this._audioElement);

    try {
      this._audioElement.removeAttribute("src");
      this._audioElement.src = "";
      this._audioElement.load();
    } catch (e) {
      // no-op
    }

    try {
      const selectedSrc = await this.getOrFetchAyahAudioSrc(surah, ayah, {
        timeoutMs: 10000,
      });
      if (selectedSrc) {
        this._audioElement.src = selectedSrc;
        this._audioElement.load();
      }
    } catch (e) {
      // no-op
    }
  }

  async applyPopupAyahSelection(surahNumber, ayahNumber) {
    const targetSurah = this.clampNumber(
      surahNumber,
      1,
      114,
      this._activeSurah,
    );

    if (targetSurah !== this._activeSurah) {
      await this.setActiveSurah(targetSurah, {
        preserveAyah: false,
        autoScroll: false,
        preserveDashboardScroll: true,
      });
    }

    const targetAyah = this.clampNumber(
      ayahNumber,
      1,
      this.getActiveSurahAyahCount() || 286,
      this._activeAyah,
    );

    const isActivelyPlaying =
      this._isPlaying === true ||
      (this._audioElement &&
        this._audioElement.paused === false &&
        this._audioElement.ended === false);

    this.scrollToAyah(targetAyah, { persist: true, smooth: true });

    if (!this._headerControlsBox) {
      this.showHeaderControls();
    }

    if (isActivelyPlaying) {
      try {
        if (this._audioElement) {
          this._audioElement.pause();
          this._audioElement.currentTime = 0;
        }
      } catch (e) {
        // no-op
      }

      await this.playAyah(targetSurah, targetAyah, { forceRestart: true });
      return;
    }

    await this.primePopupSelectionAudioTarget(targetSurah, targetAyah);

    this._playingAyah = { surah: targetSurah, ayah: targetAyah };
    this._isPlaying = false;
    this.updatePlaybackUI();
  }

  handlePopupCommandStorageEvent(event) {
    if (!event || (event.storageArea && event.storageArea !== localStorage)) {
      return;
    }

    const commandStorageKey = `${this.storage.prefix}${this._popupSyncCommandKey}`;
    if (event.key !== commandStorageKey || !event.newValue) return;

    let command = null;
    try {
      command = JSON.parse(event.newValue);
    } catch (e) {
      return;
    }

    if (!command || typeof command !== "object") return;

    if (!this.hasDashboardControlOwnership()) return;

    const commandId = command.id == null ? "" : String(command.id);
    if (commandId && commandId === this._lastPopupCommandId) return;

    this._lastPopupCommandId = commandId || null;
    void this.handlePopupCommand(command);
  }

  async handlePopupCommand(command) {
    if (!command || typeof command !== "object") return;

    const action = String(command.action || "").trim();
    const payload =
      command.payload && typeof command.payload === "object"
        ? command.payload
        : {};

    if (!action) return;

    this.markPocketQuranControlInteraction();
    this.stopOffscreenPlaybackBestEffort();

    try {
      switch (action) {
        case "togglePlayPause": {
          const fallbackTarget =
            this._isPlaying && this._playingAyah
              ? this._playingAyah
              : {
                  surah: this._activeSurah,
                  ayah: this._activeAyah,
                };
          const targetSurah = this.clampNumber(
            payload.surah,
            1,
            114,
            fallbackTarget.surah,
          );
          const targetMaxAyah = this.getSurahAyahCount(targetSurah) || 286;
          const targetAyah = this.clampNumber(
            payload.ayah,
            1,
            targetMaxAyah,
            fallbackTarget.ayah,
          );
          const desiredIsPlaying =
            typeof payload.desiredIsPlaying === "boolean"
              ? payload.desiredIsPlaying
              : null;

          if (desiredIsPlaying === true) {
            this.enableAutoplayOnFirstPlayIfNeeded();
            await this.activateRecitationTargetSurah(targetSurah);
            await this.playAyah(targetSurah, targetAyah);
            break;
          }

          if (desiredIsPlaying === false) {
            await this.activateRecitationTargetSurah(targetSurah);
            this.setPausedRecitationTarget(targetSurah, targetAyah);
            break;
          }

          await this.activateRecitationTargetSurah(targetSurah);
          await this.togglePlayPause(targetSurah, targetAyah);
          break;
        }
        case "playPreviousAyah": {
          const fallbackTarget =
            this._isPlaying && this._playingAyah
              ? this._playingAyah
              : {
                  surah: this._activeSurah,
                  ayah: this._activeAyah,
                };
          const targetSurah = this.clampNumber(
            payload.surah,
            1,
            114,
            fallbackTarget.surah,
          );
          const targetMaxAyah = this.getSurahAyahCount(targetSurah) || 286;
          const explicitAyah = this.clampNumber(
            payload.ayah,
            1,
            targetMaxAyah,
            NaN,
          );
          const desiredIsPlaying =
            typeof payload.desiredIsPlaying === "boolean"
              ? payload.desiredIsPlaying
              : this._isPlaying === true;

          if (Number.isFinite(explicitAyah)) {
            await this.activateRecitationTargetSurah(targetSurah);
            if (desiredIsPlaying) {
              await this.playAyah(targetSurah, explicitAyah);
            } else {
              this.setPausedRecitationTarget(targetSurah, explicitAyah);
            }
          } else {
            await this.playPreviousAyah({ desiredIsPlaying });
          }
          break;
        }
        case "playNextAyah": {
          const fallbackTarget =
            this._isPlaying && this._playingAyah
              ? this._playingAyah
              : {
                  surah: this._activeSurah,
                  ayah: this._activeAyah,
                };
          const targetSurah = this.clampNumber(
            payload.surah,
            1,
            114,
            fallbackTarget.surah,
          );
          const targetMaxAyah = this.getSurahAyahCount(targetSurah) || 286;
          const explicitAyah = this.clampNumber(
            payload.ayah,
            1,
            targetMaxAyah,
            NaN,
          );
          const desiredIsPlaying =
            typeof payload.desiredIsPlaying === "boolean"
              ? payload.desiredIsPlaying
              : this._isPlaying === true;

          if (Number.isFinite(explicitAyah)) {
            await this.activateRecitationTargetSurah(targetSurah);
            if (desiredIsPlaying) {
              await this.playAyah(targetSurah, explicitAyah);
            } else {
              this.setPausedRecitationTarget(targetSurah, explicitAyah);
            }
          } else {
            await this.playNextAyah({ desiredIsPlaying });
          }
          break;
        }
        case "stopPlayback":
          this.stopPlayback();
          break;
        case "setVolume":
          this.setVolume(this.clampNumber(payload.volume, 0, 1, this._volume));
          break;
        case "toggleLoopAyah":
          this.toggleLoop();
          break;
        case "toggleLoopSurah":
          this.toggleSurahLoop();
          break;
        case "toggleAutoplay":
          this.toggleAutoplay();
          break;
        case "toggleAutoplayNextSurah":
          this.toggleAutoplayNextSurah();
          break;
        case "toggleAutoScroll":
          this.toggleAutoScroll();
          break;
        case "toggleTajweed": {
          const desiredTajweedMode =
            typeof payload.desiredIsTajweedMode === "boolean"
              ? payload.desiredIsTajweedMode
              : null;

          if (
            desiredTajweedMode == null ||
            desiredTajweedMode !== (this._isTajweedMode === true)
          ) {
            await this.toggleTajweedMode();
          }
          break;
        }
        case "selectAyah":
          await this.applyPopupAyahSelection(payload.surah, payload.ayah);
          break;
        case "selectReciter":
          this.selectReciter(payload.reciterId);
          break;
        case "selectTranslation":
          this.selectTranslation(
            payload.translationResourceId ?? payload.translationId,
          );
          break;
        default:
          return;
      }
    } finally {
      this.publishPopupSyncState();
    }
  }

  selectReciter(reciterId) {
    const id = parseInt(reciterId, 10);
    if (!Number.isFinite(id)) return;

    this._activeReciterId = id;
    this.persistPocketQuranSettings({ reciterId: id });

    try {
      document.dispatchEvent(
        new CustomEvent("md:pq-reciter-selected", {
          detail: { reciterId: id },
        }),
      );
    } catch (e) {}

    this.resetRecitationCaches();

    const isActivelyPlaying =
      this._isPlaying ||
      (this._audioElement &&
        this._audioElement.paused === false &&
        this._audioElement.ended === false);

    const targetAyah = this._playingAyah || {
      surah: this._activeSurah,
      ayah: this._activeAyah,
    };

    if (
      isActivelyPlaying &&
      Number.isFinite(targetAyah?.surah) &&
      Number.isFinite(targetAyah?.ayah)
    ) {
      try {
        this._audioElement.pause();
        this._audioElement.currentTime = 0;
      } catch (e) {
        // no-op
      }
      this.playAyah(targetAyah.surah, targetAyah.ayah, {
        forceRestart: true,
      });
    }

    this.closeReciterModal();
    this.updatePlaybackUI();
  }

  showHeaderControls() {
    const header = this.card?.querySelector(".pocket-quran-header");
    if (!header) return;

    // Keep DOM stable: if controls already exist, just refresh state.
    if (this._headerControlsBox) {
      if (
        this._recitationFloatingMode ||
        header.contains(this._headerControlsBox)
      ) {
        if (!this._recitationFloatingMode) {
          header.classList.add("pq-has-recitation-controls");
        }
        this.updateRecitationFloatingButtons();
        this.updatePlaybackUI();
        return;
      }

      this.hideHeaderControls();
    }

    const controlsBox = document.createElement("div");
    controlsBox.className = "pq-recitation-controls";
    controlsBox.innerHTML = `
      <div class="pq-recitation-info">
        <span class="pq-recitation-ayah">${this.formatRecitationAyahLabel(
          this._playingAyah?.surah ?? this._activeSurah,
          this._playingAyah?.ayah ?? this._activeAyah ?? 1,
        )}</span>
        <span class="pq-recitation-reciter">${this.getActiveReciterName()}</span>
      </div>
      <div class="pq-recitation-buttons">
        <button type="button" class="pq-recitation-btn pq-prev-btn" title="Previous ayah">
          <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
        </button>
        <button type="button" class="pq-recitation-btn pq-play-pause-btn ${
          this._isPlaying ? "active" : ""
        }" title="Play/Pause" aria-pressed="${this._isPlaying ? "true" : "false"}">
          ${
            this._isPlaying
              ? '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
              : '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>'
          }
        </button>
        <button type="button" class="pq-recitation-btn pq-next-btn" title="Next ayah">
          <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
        </button>
        <button type="button" class="pq-recitation-btn pq-stop-btn" title="Stop">
          <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 6h12v12H6z"/></svg>
        </button>
      </div>
      <div class="pq-volume-control">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
        <input type="range" class="pq-volume-slider" min="0" max="100" value="${Math.round(
          this._volume * 100,
        )}" />
      </div>
      <div class="pq-recitation-options">
        <button type="button" class="pq-recitation-btn pq-loop-btn pq-loop-ayah-btn ${
          this._isLooping ? "active" : ""
        }" title="Loop current ayah">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-repeat1-icon lucide-repeat-1" aria-hidden="true" focusable="false"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/><path d="M11 10h1v4"/></svg>
        </button>
        <button type="button" class="pq-recitation-btn pq-loop-btn pq-loop-surah-btn ${
          this._isSurahLooping ? "active" : ""
        }" title="Loop surah">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-repeat2-icon lucide-repeat-2" aria-hidden="true" focusable="false"><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg>
        </button>
        <button type="button" class="pq-recitation-btn pq-autoplay-btn ${
          this._isAutoplay ? "active" : ""
        }" title="Autoplay through surah">
          <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>
        </button>
        <button type="button" class="pq-recitation-btn pq-autoplay-next-surah-btn ${
          this._isAutoplayNextSurah ? "active" : ""
        }" title="Across Surahs" aria-pressed="${
          this._isAutoplayNextSurah ? "true" : "false"
        }">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-up2-icon lucide-book-up-2" aria-hidden="true" focusable="false"><path d="M12 13V7"/><path d="M18 2h1a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2"/><path d="m9 10 3-3 3 3"/><path d="m9 5 3-3 3 3"/></svg>
        </button>
        <button type="button" class="pq-recitation-btn pq-autoscroll-btn ${
          this._isAutoScroll ? "active" : ""
        }" title="Auto-scroll to next ayah" aria-pressed="${
          this._isAutoScroll ? "true" : "false"
        }">
          <svg viewBox="0 -0.5 25 25" width="21" height="21" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M10.7452 16.2194C10.995 15.889 10.9298 15.4186 10.5994 15.1688C10.269 14.919 9.79864 14.9842 9.54879 15.3146L10.7452 16.2194ZM6.72579 19.0476C6.47595 19.378 6.54124 19.8484 6.87162 20.0982C7.202 20.3481 7.67236 20.2828 7.92221 19.9524L6.72579 19.0476ZM6.574 19.5C6.574 19.9142 6.90979 20.25 7.324 20.25C7.73821 20.25 8.074 19.9142 8.074 19.5H6.574ZM8.074 5.5C8.074 5.08579 7.73821 4.75 7.324 4.75C6.90979 4.75 6.574 5.08579 6.574 5.5H8.074ZM6.72587 19.9525C6.97577 20.2828 7.44614 20.348 7.77648 20.0981C8.10682 19.8482 8.17203 19.3779 7.92213 19.0475L6.72587 19.9525ZM5.09813 15.3145C4.84823 14.9842 4.37786 14.919 4.04752 15.1689C3.71718 15.4188 3.65197 15.8891 3.90187 16.2195L5.09813 15.3145ZM11.088 4.75C10.6738 4.75 10.338 5.08579 10.338 5.5C10.338 5.91421 10.6738 6.25 11.088 6.25V4.75ZM20.5 6.25C20.9142 6.25 21.25 5.91421 21.25 5.5C21.25 5.08579 20.9142 4.75 20.5 4.75V6.25ZM11.088 7.55C10.6738 7.55 10.338 7.88579 10.338 8.3C10.338 8.71421 10.6738 9.05 11.088 9.05V7.55ZM18.617 9.05C19.0312 9.05 19.367 8.71421 19.367 8.3C19.367 7.88579 19.0312 7.55 18.617 7.55V9.05ZM11.088 10.35C10.6738 10.35 10.338 10.6858 10.338 11.1C10.338 11.5142 10.6738 11.85 11.088 11.85V10.35ZM16.735 11.85C17.1492 11.85 17.485 11.5142 17.485 11.1C17.485 10.6858 17.1492 10.35 16.735 10.35V11.85ZM9.54879 15.3146L6.72579 19.0476L7.92221 19.9524L10.7452 16.2194L9.54879 15.3146ZM8.074 19.5V5.5H6.574V19.5H8.074ZM7.92213 19.0475L5.09813 15.3145L3.90187 16.2195L6.72587 19.9525L7.92213 19.0475ZM11.088 6.25H20.5V4.75H11.088V6.25ZM11.088 9.05H18.617V7.55H11.088V9.05ZM11.088 11.85H16.735V10.35H11.088V11.85Z" fill="currentColor"></path> </g></svg>
        </button>
        <button type="button" class="pq-recitation-btn pq-highlighter-btn ${
          this._isRecitationHighlighterEnabled ? "active" : ""
        }" title="Highlighter" aria-pressed="${
          this._isRecitationHighlighterEnabled ? "true" : "false"
        }">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-highlighter-icon lucide-highlighter"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>
        </button>
        <button type="button" class="pq-recitation-btn pq-loop-btn pq-loop-surah-btn pq-floating-inline-btn pq-recitation-float-toggle-btn" title="Detach recitation controls" aria-label="Detach recitation controls" aria-pressed="false">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-picture-in-picture-icon lucide-picture-in-picture" aria-hidden="true" focusable="false"><path d="M2 10h6V4"/><path d="m2 4 6 6"/><path d="M21 10V7a2 2 0 0 0-2-2h-7"/><path d="M3 14v2a2 2 0 0 0 2 2h3"/><rect x="12" y="14" width="10" height="7" rx="1"/></svg>
        </button>
        <button type="button" class="pq-recitation-btn pq-loop-btn pq-loop-surah-btn pq-floating-inline-btn pq-recitation-close-btn" title="Close" aria-label="Close recitation controls">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </div>
    `;

    this._headerControlsBox = controlsBox;
    this.ensureRecitationControlsAttachedToHeader();

    controlsBox.addEventListener("pointerdown", (event) => {
      this.startRecitationFloatingDrag(event);
    });

    // Add event listeners
    controlsBox
      .querySelector(".pq-prev-btn")
      .addEventListener("click", () => {
        const target = this.getRecitationControlTargetAyah();
        this.playPreviousAyah({
          targetSurah: target.surah,
          targetAyah: target.ayah,
        });
      });
    controlsBox
      .querySelector(".pq-next-btn")
      .addEventListener("click", () => {
        const target = this.getRecitationControlTargetAyah();
        this.playNextAyah({
          targetSurah: target.surah,
          targetAyah: target.ayah,
        });
      });
    controlsBox
      .querySelector(".pq-play-pause-btn")
      .addEventListener("click", () => {
        const target = this.getRecitationControlTargetAyah();
        this.togglePlayPause(target.surah, target.ayah);
      });
    controlsBox
      .querySelector(".pq-recitation-buttons .pq-stop-btn")
      .addEventListener("click", () => this.stopPlayback());
    controlsBox
      .querySelector(".pq-loop-ayah-btn")
      .addEventListener("click", () => this.toggleLoop());
    controlsBox
      .querySelector(".pq-loop-surah-btn")
      .addEventListener("click", () => this.toggleSurahLoop());
    controlsBox
      .querySelector(".pq-autoplay-btn")
      .addEventListener("click", () => this.toggleAutoplay());
    controlsBox
      .querySelector(".pq-autoplay-next-surah-btn")
      .addEventListener("click", () => this.toggleAutoplayNextSurah());
    controlsBox
      .querySelector(".pq-autoscroll-btn")
      .addEventListener("click", () => this.toggleAutoScroll());
    controlsBox
      .querySelector(".pq-highlighter-btn")
      .addEventListener("click", () => this.toggleRecitationHighlighter());
    const reciterBtn = controlsBox.querySelector(".pq-reciter-btn");
    if (reciterBtn) {
      reciterBtn.addEventListener("click", () => this.openReciterModal());
    }
    controlsBox
      .querySelector(".pq-recitation-reciter")
      .addEventListener("click", () => this.openReciterModal());

    const floatToggleBtn = controlsBox.querySelector(
      ".pq-recitation-float-toggle-btn",
    );
    if (floatToggleBtn) {
      floatToggleBtn.addEventListener("click", () => {
        this.toggleRecitationFloating();
      });
    }

    const ayahInfoEl = controlsBox.querySelector(".pq-recitation-ayah");
    if (ayahInfoEl) {
      ayahInfoEl.addEventListener("click", async () => {
        const target = this._playingAyah;
        if (!target) return;

        try {
          if (this._activeSurah !== target.surah) {
            await this.setActiveSurah(target.surah, {
              preserveAyah: false,
              autoScroll: false,
              preserveDashboardScroll: true,
            });
          }

          this.scrollToAyah(target.ayah, { persist: true, smooth: true });
        } catch (e) {
          // no-op
        }
      });
    }

    controlsBox
      .querySelector(".pq-recitation-close-btn")
      .addEventListener("click", () => {
        // Ensure playback stops when user closes the recitation controls
        this.stopPlayback();
        this.hideHeaderControls();
      });

    const volumeSlider = controlsBox.querySelector(".pq-volume-slider");
    volumeSlider.addEventListener("input", (e) => {
      this.setVolume(parseInt(e.target.value, 10) / 100);
    });

    this.updateRecitationFloatingButtons();
    this.watchRecitationControlsVisibility();
    this.maybeAutoFloatRecitationControls();
  }
});

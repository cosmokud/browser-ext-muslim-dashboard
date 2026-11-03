/**
 * PocketQuranManager: ayah and surah playback.
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
      // Swapping the source/element pauses the current audio; hold the playing
      // UI so the play/pause button does not flicker mid-sequence.
      if (this._isPlaying === true) {
        this.beginRecitationTransitionHold();
      }

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
      this.endRecitationTransitionHold();
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
      this.endRecitationTransitionHold();
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

    this.endRecitationTransitionHold();
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

  finishPlaybackAtSurahEnd() {
    if (!this._audioElement) return;

    this.endRecitationTransitionHold();
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
    this.endRecitationTransitionHold();
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
});

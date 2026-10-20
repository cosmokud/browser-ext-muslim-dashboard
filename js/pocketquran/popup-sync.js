/**
 * PocketQuranManager: sync with the popup player.
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
});

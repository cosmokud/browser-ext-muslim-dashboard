/**
 * PocketQuranManager: recitation setup, timings and word highlight.
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

    // While a continuation (autoplay / loop) is swapping the audio source or
    // element, the old audio fires a "pause" event. Hold the playing UI so the
    // play/pause button keeps showing the pause (playing) icon instead of
    // flickering pause -> play -> pause between ayahs.
    this._recitationTransitionHold = false;
    this._recitationTransitionHoldTimer = null;

    // Store handlers so we can re-attach if we swap audio elements.
    this._onAudioEnded = () => {
      // The browser may fire a "pause" event as playback reaches the end; hold
      // the playing UI right away so the pause icon does not blink when a
      // continuation (autoplay / loop) is expected.
      if (
        this._isPlaying === true &&
        (this._isLooping === true || this._isAutoplay === true)
      ) {
        this.beginRecitationTransitionHold();
      }
      this.handleAudioEnded();
    };
    this._onAudioError = (e) => {
      console.error("PocketQuran: Audio error", e);
      this.endRecitationTransitionHold();
      this._isPlaying = false;
      this.clearActiveRecitationWordHighlight();
      this.updatePlaybackUI();
    };
    this._onAudioPlaying = (event) => {
      this.endRecitationTransitionHold();
      this.enforceSingleRecitationAudioOwner();
      this._isPlaying = true;
      this.syncActiveRecitationWord();
      this.updatePlaybackUI();
    };
    this._onAudioPause = (event) => {
      const sourceAudio = event?.currentTarget || event?.target || null;

      if (this._recitationTransitionHold) {
        // Continuation in flight: ignore the pause caused by the source swap.
        return;
      }

      const pausedElement = sourceAudio || this._audioElement;
      if (
        pausedElement?.ended === true &&
        this._isPlaying === true &&
        (this._isLooping === true || this._isAutoplay === true)
      ) {
        // Pause emitted at the natural end of an ayah that is about to be
        // followed by the next one: keep the playing UI.
        return;
      }

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

  beginRecitationTransitionHold() {
    if (this._recitationTransitionHoldTimer) {
      clearTimeout(this._recitationTransitionHoldTimer);
    }

    this._recitationTransitionHold = true;
    this._recitationTransitionHoldTimer = setTimeout(() => {
      this._recitationTransitionHoldTimer = null;
      this._recitationTransitionHold = false;
    }, 3000);
  }

  endRecitationTransitionHold() {
    if (this._recitationTransitionHoldTimer) {
      clearTimeout(this._recitationTransitionHoldTimer);
      this._recitationTransitionHoldTimer = null;
    }
    this._recitationTransitionHold = false;
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
});

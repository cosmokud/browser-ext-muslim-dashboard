/**
 * PocketQuranManager: ayah audio preloading and cache.
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

    const isContinuation =
      this._isPlaying === true &&
      (this._playingAyah?.surah !== surah || this._playingAyah?.ayah !== ayah);

    if (isContinuation) {
      // Chained playback swaps the source, which fires a pause event; hold the
      // playing UI so the play/pause button stays on the pause icon.
      this.beginRecitationTransitionHold();
    }

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
});

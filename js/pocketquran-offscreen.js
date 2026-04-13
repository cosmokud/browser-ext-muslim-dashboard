(function () {
  "use strict";

  const storage = new StorageManager();

  const pocketQuranPopupStateKey = "pocketQuran_popupState";
  const pocketQuranApiBase = "https://api.quran.com/api/v4";
  const pocketQuranStateSourceDashboard = "dashboard";
  const pocketQuranStateSourceOffscreen = "offscreen";

  const pocketQuranCommandTypes = {
    togglePlayPause: "togglePlayPause",
    toggleTajweed: "toggleTajweed",
    playPreviousAyah: "playPreviousAyah",
    playNextAyah: "playNextAyah",
    stopPlayback: "stopPlayback",
    setVolume: "setVolume",
    toggleLoopAyah: "toggleLoopAyah",
    toggleLoopSurah: "toggleLoopSurah",
    toggleAutoplay: "toggleAutoplay",
    toggleAutoplayNextSurah: "toggleAutoplayNextSurah",
    toggleAutoScroll: "toggleAutoScroll",
    selectAyah: "selectAyah",
    selectReciter: "selectReciter",
    selectTranslation: "selectTranslation",
  };

  let pocketQuranState = null;
  let pocketQuranChapters = [];
  let pocketQuranReciters = [];
  let pocketQuranAudio = null;
  let pocketQuranCommandQueue = Promise.resolve();
  const pocketQuranAudioUrlCache = new Map();

  function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function getPocketQuranChapterById(surah) {
    const id = clampNumber(surah, 1, 114, 1);
    return pocketQuranChapters.find((chapter) => chapter.id === id) || null;
  }

  function getPocketQuranSurahMaxAyah(surah) {
    const chapter = getPocketQuranChapterById(surah);
    return clampNumber(chapter && chapter.verses_count, 1, 286, 286);
  }

  function getPocketQuranNextSurahId(surah) {
    const currentSurah = clampNumber(surah, 1, 114, 1);

    if (Array.isArray(pocketQuranChapters) && pocketQuranChapters.length > 0) {
      const currentIndex = pocketQuranChapters.findIndex((chapter) => {
        return clampNumber(chapter && chapter.id, 1, 114, NaN) === currentSurah;
      });

      if (currentIndex >= 0 && currentIndex < pocketQuranChapters.length - 1) {
        return clampNumber(
          pocketQuranChapters[currentIndex + 1] &&
            pocketQuranChapters[currentIndex + 1].id,
          1,
          114,
          null,
        );
      }
    }

    return currentSurah < 114 ? currentSurah + 1 : null;
  }

  function buildPocketQuranFallbackState(settings = storage.getSettings()) {
    const pqSettings = (settings && settings.pocketQuran) || {};
    const activeSurah = clampNumber(pqSettings.lastSurahNumber, 1, 114, 1);
    const activeAyah = clampNumber(
      pqSettings.lastAyahNumber,
      1,
      getPocketQuranSurahMaxAyah(activeSurah),
      1,
    );

    return {
      activeSurah,
      activeAyah,
      recitationAyah: {
        surah: activeSurah,
        ayah: activeAyah,
      },
      isPlaying: false,
      reciterId: pqSettings.reciterId || 7,
      reciterName: "Loading reciter...",
      volume: clampNumber(pqSettings.reciterVolume, 0, 1, 1),
      isLooping: pqSettings.reciterLoop === true,
      isSurahLooping: pqSettings.reciterSurahLoop === true,
      isAutoplay: pqSettings.reciterAutoplay === true,
      isAutoplayNextSurah: pqSettings.reciterAutoplayNextSurah === true,
      isAutoScroll: pqSettings.reciterAutoScroll === true,
      isTajweedMode: pqSettings.tajweedMode === true,
      showArabicText: pqSettings.showArabicText !== false,
      showTranslationText: pqSettings.showTranslationText !== false,
      translationResourceId: clampNumber(
        pqSettings.translationResourceId,
        1,
        10000,
        85,
      ),
    };
  }

  function normalizePocketQuranState(
    rawState,
    settings = storage.getSettings(),
  ) {
    const fallback = buildPocketQuranFallbackState(settings);
    if (!rawState || typeof rawState !== "object") return fallback;

    const activeSurah = clampNumber(
      rawState.activeSurah,
      1,
      114,
      fallback.activeSurah,
    );
    const activeAyah = clampNumber(
      rawState.activeAyah,
      1,
      getPocketQuranSurahMaxAyah(activeSurah),
      fallback.activeAyah,
    );

    const recitationSource =
      rawState.recitationAyah && typeof rawState.recitationAyah === "object"
        ? rawState.recitationAyah
        : fallback.recitationAyah;
    const recitationSurah = clampNumber(
      recitationSource.surah,
      1,
      114,
      activeSurah,
    );
    const recitationAyah = clampNumber(
      recitationSource.ayah,
      1,
      getPocketQuranSurahMaxAyah(recitationSurah),
      activeAyah,
    );

    return {
      activeSurah,
      activeAyah,
      recitationAyah: {
        surah: recitationSurah,
        ayah: recitationAyah,
      },
      isPlaying: rawState.isPlaying === true,
      reciterId: clampNumber(rawState.reciterId, 1, 10000, fallback.reciterId),
      reciterName:
        typeof rawState.reciterName === "string" && rawState.reciterName.trim()
          ? rawState.reciterName.trim()
          : fallback.reciterName,
      volume: clampNumber(rawState.volume, 0, 1, fallback.volume),
      isLooping: rawState.isLooping === true,
      isSurahLooping: rawState.isSurahLooping === true,
      isAutoplay: rawState.isAutoplay === true,
      isAutoplayNextSurah: rawState.isAutoplayNextSurah === true,
      isAutoScroll: rawState.isAutoScroll === true,
      isTajweedMode:
        typeof rawState.isTajweedMode === "boolean"
          ? rawState.isTajweedMode
          : fallback.isTajweedMode,
      showArabicText:
        typeof rawState.showArabicText === "boolean"
          ? rawState.showArabicText
          : fallback.showArabicText,
      showTranslationText:
        typeof rawState.showTranslationText === "boolean"
          ? rawState.showTranslationText
          : fallback.showTranslationText,
      translationResourceId: clampNumber(
        rawState.translationResourceId,
        1,
        10000,
        fallback.translationResourceId,
      ),
    };
  }

  function getPocketQuranCurrentTargetAyah(state = pocketQuranState) {
    const activeSurah = clampNumber(state && state.activeSurah, 1, 114, 1);
    const activeAyah = clampNumber(
      state && state.activeAyah,
      1,
      getPocketQuranSurahMaxAyah(activeSurah),
      1,
    );

    const recitationSource =
      state && state.recitationAyah && typeof state.recitationAyah === "object"
        ? state.recitationAyah
        : null;

    if (recitationSource) {
      const surah = clampNumber(recitationSource.surah, 1, 114, activeSurah);
      const ayah = clampNumber(
        recitationSource.ayah,
        1,
        getPocketQuranSurahMaxAyah(surah),
        activeAyah,
      );
      return { surah, ayah };
    }

    return { surah: activeSurah, ayah: activeAyah };
  }

  function getPocketQuranActiveState() {
    if (pocketQuranState && typeof pocketQuranState === "object") {
      return pocketQuranState;
    }

    const rawState = storage.get(pocketQuranPopupStateKey, null);
    pocketQuranState = normalizePocketQuranState(
      rawState,
      storage.getSettings(),
    );
    return pocketQuranState;
  }

  function persistPocketQuranSettingsPatch(patch = {}) {
    if (!patch || typeof patch !== "object") return;

    const settings = storage.getSettings();
    settings.pocketQuran = {
      ...(settings.pocketQuran || {}),
      ...patch,
    };
    storage.saveSettings(settings);
  }

  function publishPocketQuranState(state) {
    if (!state || typeof state !== "object") return;

    const normalized = normalizePocketQuranState(state, storage.getSettings());
    storage.set(pocketQuranPopupStateKey, {
      ...normalized,
      source: pocketQuranStateSourceOffscreen,
      updatedAt: Date.now(),
    });
    pocketQuranState = normalized;
  }

  async function parsePocketQuranJsonResponse(response, sourceLabel) {
    if (!response || !response.ok) {
      throw new Error(
        `${sourceLabel} request failed (HTTP ${response && response.status ? response.status : "unknown"}).`,
      );
    }

    let data;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error(`${sourceLabel} returned invalid JSON.`);
    }

    if (!data || typeof data !== "object") {
      throw new Error(`${sourceLabel} returned malformed payload.`);
    }

    if (data.error === true) {
      const reason =
        typeof data.reason === "string" && data.reason.trim()
          ? data.reason.trim()
          : `${sourceLabel} returned an API error.`;
      throw new Error(reason);
    }

    return data;
  }

  function normalizePocketQuranChapterEntries(entries) {
    return (Array.isArray(entries) ? entries : [])
      .map((chapter) => ({
        id: clampNumber(chapter && chapter.id, 1, 114, 1),
        name_simple: String((chapter && chapter.name_simple) || "").trim(),
        name_arabic: String((chapter && chapter.name_arabic) || "").trim(),
        verses_count: clampNumber(chapter && chapter.verses_count, 1, 286, 286),
      }))
      .filter((chapter) => chapter.name_simple || chapter.name_arabic)
      .sort((left, right) => left.id - right.id);
  }

  async function ensurePocketQuranChaptersLoaded(forceFetch = false) {
    if (!forceFetch && pocketQuranChapters.length > 0) {
      return pocketQuranChapters;
    }

    const cached = storage.get("pocketQuran_chapters_cache", null);
    const cachedAt = storage.get("pocketQuran_chapters_cache_at", 0);
    const freshEnough = Date.now() - (cachedAt || 0) < 1000 * 60 * 60 * 24 * 7;
    const cachedChapters = normalizePocketQuranChapterEntries(cached);

    if (!forceFetch && freshEnough && cachedChapters.length > 0) {
      pocketQuranChapters = cachedChapters;
      return pocketQuranChapters;
    }

    try {
      const response = await fetch(
        `${pocketQuranApiBase}/chapters?language=en`,
      );
      const data = await parsePocketQuranJsonResponse(
        response,
        "Pocket Quran chapters",
      );
      const chapters = normalizePocketQuranChapterEntries(
        data && data.chapters,
      );
      if (!chapters.length) {
        throw new Error("Pocket Quran chapters payload contained no chapters.");
      }

      pocketQuranChapters = chapters;
      storage.set("pocketQuran_chapters_cache", pocketQuranChapters);
      storage.set("pocketQuran_chapters_cache_at", Date.now());
    } catch (error) {
      if (cachedChapters.length > 0) {
        pocketQuranChapters = cachedChapters;
      } else {
        pocketQuranChapters = [];
      }
    }

    return pocketQuranChapters;
  }

  function normalizePocketQuranReciterEntries(entries) {
    return (Array.isArray(entries) ? entries : [])
      .map((reciter) => ({
        id: clampNumber(reciter && reciter.id, 1, 10000, 7),
        name: String(
          (reciter && reciter.name) ||
            (reciter && reciter.formattedName) ||
            (reciter &&
              reciter.translated_name &&
              reciter.translated_name.name) ||
            (reciter && reciter.reciter_name) ||
            "",
        ).trim(),
      }))
      .filter((reciter) => reciter.name);
  }

  async function ensurePocketQuranRecitersLoaded(forceFetch = false) {
    if (!forceFetch && pocketQuranReciters.length > 0) {
      return pocketQuranReciters;
    }

    const cached = storage.get("pocketQuran_reciters_cache", null);
    const cachedAt = storage.get("pocketQuran_reciters_cache_at", 0);
    const cacheIsFresh = Date.now() - (cachedAt || 0) < 1000 * 60 * 60 * 24 * 7;
    const cachedReciters = normalizePocketQuranReciterEntries(cached);

    if (!forceFetch && cacheIsFresh && cachedReciters.length > 0) {
      pocketQuranReciters = cachedReciters;
      return pocketQuranReciters;
    }

    try {
      const response = await fetch(
        `${pocketQuranApiBase}/resources/recitations?language=en`,
      );
      const data = await parsePocketQuranJsonResponse(
        response,
        "Pocket Quran reciters",
      );
      pocketQuranReciters = normalizePocketQuranReciterEntries(
        data && data.recitations,
      );
      if (!pocketQuranReciters.length) {
        throw new Error("Pocket Quran reciters payload contained no reciters.");
      }

      storage.set("pocketQuran_reciters_cache", pocketQuranReciters);
      storage.set("pocketQuran_reciters_cache_at", Date.now());
    } catch (error) {
      if (cachedReciters.length > 0) {
        pocketQuranReciters = cachedReciters;
      } else {
        pocketQuranReciters = [];
      }
    }

    return pocketQuranReciters;
  }

  function resolvePocketQuranReciterName(reciterId, fallbackName = "") {
    const id = clampNumber(reciterId, 1, 10000, NaN);

    if (Number.isFinite(id)) {
      const reciter = pocketQuranReciters.find((entry) => entry.id === id);
      if (reciter && reciter.name) return reciter.name;
    }

    const fallback = String(fallbackName || "").trim();
    if (fallback) return fallback;
    if (Number.isFinite(id)) return `Reciter ${id}`;
    return "Unknown Reciter";
  }

  function resolvePocketQuranAudioUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;

    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith("//")) return `https:${raw}`;

    const normalizedPath = raw.replace(/^\/+/, "");
    return normalizedPath ? `https://verses.quran.com/${normalizedPath}` : null;
  }

  function getPocketQuranAudioCacheKey(reciterId, surah, ayah) {
    return `${reciterId}:${surah}:${ayah}`;
  }

  async function fetchPocketQuranAyahAudioUrl(reciterId, surah, ayah) {
    const cacheKey = getPocketQuranAudioCacheKey(reciterId, surah, ayah);
    const cached = pocketQuranAudioUrlCache.get(cacheKey);
    if (cached) return cached;

    const endpoint = `${pocketQuranApiBase}/recitations/${reciterId}/by_ayah/${surah}:${ayah}`;
    const response = await fetch(endpoint);
    const data = await parsePocketQuranJsonResponse(
      response,
      "Pocket Quran audio",
    );

    const audioUrl = resolvePocketQuranAudioUrl(
      (data &&
        data.audio_files &&
        data.audio_files[0] &&
        data.audio_files[0].url) ||
        (data && data.audio_file && data.audio_file.url) ||
        (data && data.audio_file && data.audio_file.audio_url),
    );

    if (!audioUrl) {
      throw new Error("Pocket Quran audio URL not found in API response.");
    }

    pocketQuranAudioUrlCache.set(cacheKey, audioUrl);
    return audioUrl;
  }

  function ensurePocketQuranAudio() {
    if (pocketQuranAudio) return pocketQuranAudio;

    const audio = new Audio();
    audio.preload = "auto";

    audio.addEventListener("ended", () => {
      void handlePocketQuranAudioEnded();
    });

    audio.addEventListener("error", () => {
      const activeState = getPocketQuranActiveState();
      publishPocketQuranState({
        ...activeState,
        isPlaying: false,
      });
    });

    pocketQuranAudio = audio;
    return pocketQuranAudio;
  }

  function pausePocketQuranPlayback({
    resetTime = false,
    clearAutoplay = false,
  } = {}) {
    const audio = ensurePocketQuranAudio();

    try {
      audio.pause();
      if (resetTime) {
        audio.currentTime = 0;
      }
    } catch (error) {
      // no-op
    }

    const activeState = getPocketQuranActiveState();
    publishPocketQuranState({
      ...activeState,
      isPlaying: false,
      ...(clearAutoplay ? { isAutoplay: false } : {}),
    });

    if (clearAutoplay) {
      persistPocketQuranSettingsPatch({ reciterAutoplay: false });
    }
  }

  function pausePocketQuranAudioSilently({ resetTime = false } = {}) {
    if (!pocketQuranAudio) return;

    try {
      pocketQuranAudio.pause();
      if (resetTime) {
        pocketQuranAudio.currentTime = 0;
      }
    } catch (error) {
      // no-op
    }
  }

  async function playPocketQuranAyah(
    surah,
    ayah,
    { forceRestart = false } = {},
  ) {
    await ensurePocketQuranChaptersLoaded();
    await ensurePocketQuranRecitersLoaded();

    const activeState = getPocketQuranActiveState();
    const normalizedSurah = clampNumber(surah, 1, 114, activeState.activeSurah);
    const normalizedAyah = clampNumber(
      ayah,
      1,
      getPocketQuranSurahMaxAyah(normalizedSurah),
      activeState.activeAyah,
    );

    const reciterId = clampNumber(activeState.reciterId, 1, 10000, 7);
    const audio = ensurePocketQuranAudio();

    try {
      const audioUrl = await fetchPocketQuranAyahAudioUrl(
        reciterId,
        normalizedSurah,
        normalizedAyah,
      );

      audio.volume = clampNumber(activeState.volume, 0, 1, 1);

      if (forceRestart || audio.src !== audioUrl) {
        audio.src = audioUrl;
      }

      if (forceRestart) {
        try {
          audio.currentTime = 0;
        } catch (error) {
          // no-op
        }
      }

      await audio.play();

      publishPocketQuranState({
        ...activeState,
        activeSurah: normalizedSurah,
        activeAyah: normalizedAyah,
        recitationAyah: {
          surah: normalizedSurah,
          ayah: normalizedAyah,
        },
        reciterId,
        reciterName: resolvePocketQuranReciterName(
          reciterId,
          activeState.reciterName,
        ),
        isPlaying: true,
      });

      persistPocketQuranSettingsPatch({
        lastSurahNumber: normalizedSurah,
        lastAyahNumber: normalizedAyah,
        reciterId,
      });

      return true;
    } catch (error) {
      publishPocketQuranState({
        ...activeState,
        isPlaying: false,
      });
      return false;
    }
  }

  async function handlePocketQuranAudioEnded() {
    await ensurePocketQuranChaptersLoaded();

    const activeState = getPocketQuranActiveState();
    const target = getPocketQuranCurrentTargetAyah(activeState);

    if (activeState.isLooping === true) {
      await playPocketQuranAyah(target.surah, target.ayah, {
        forceRestart: true,
      });
      return;
    }

    if (activeState.isAutoplay === true) {
      const maxAyah = getPocketQuranSurahMaxAyah(target.surah);

      if (target.ayah < maxAyah) {
        await playPocketQuranAyah(target.surah, target.ayah + 1);
        return;
      }

      if (activeState.isSurahLooping === true) {
        await playPocketQuranAyah(target.surah, 1, {
          forceRestart: true,
        });
        return;
      }

      if (activeState.isAutoplayNextSurah === true) {
        const nextSurah = getPocketQuranNextSurahId(target.surah);
        if (Number.isFinite(nextSurah)) {
          await playPocketQuranAyah(nextSurah, 1, {
            forceRestart: true,
          });
          return;
        }
      }
    }

    publishPocketQuranState({
      ...activeState,
      isPlaying: false,
    });
  }

  async function executePocketQuranCommand(command) {
    if (!command || typeof command !== "object") return;

    const action = String(command.action || "").trim();
    const payload =
      command.payload && typeof command.payload === "object"
        ? command.payload
        : {};

    await ensurePocketQuranChaptersLoaded();
    await ensurePocketQuranRecitersLoaded();

    const activeState = getPocketQuranActiveState();
    const currentTarget = getPocketQuranCurrentTargetAyah(activeState);

    switch (action) {
      case pocketQuranCommandTypes.togglePlayPause: {
        const desiredIsPlaying =
          typeof payload.desiredIsPlaying === "boolean"
            ? payload.desiredIsPlaying
            : !(activeState.isPlaying === true);
        const targetSurah = clampNumber(
          payload.surah,
          1,
          114,
          currentTarget.surah,
        );
        const targetAyah = clampNumber(
          payload.ayah,
          1,
          getPocketQuranSurahMaxAyah(targetSurah),
          currentTarget.ayah,
        );

        if (desiredIsPlaying) {
          await playPocketQuranAyah(targetSurah, targetAyah);
        } else {
          pausePocketQuranPlayback();
        }
        break;
      }

      case pocketQuranCommandTypes.playPreviousAyah: {
        const targetSurah = clampNumber(
          payload.surah,
          1,
          114,
          currentTarget.surah,
        );
        const explicitAyah = clampNumber(
          payload.ayah,
          1,
          getPocketQuranSurahMaxAyah(targetSurah),
          NaN,
        );
        const targetAyah = Number.isFinite(explicitAyah)
          ? explicitAyah
          : clampNumber(
              currentTarget.ayah - 1,
              1,
              getPocketQuranSurahMaxAyah(targetSurah),
              currentTarget.ayah,
            );

        if (
          targetAyah !== currentTarget.ayah ||
          Number.isFinite(explicitAyah)
        ) {
          await playPocketQuranAyah(targetSurah, targetAyah);
        }
        break;
      }

      case pocketQuranCommandTypes.playNextAyah: {
        const targetSurah = clampNumber(
          payload.surah,
          1,
          114,
          currentTarget.surah,
        );
        const explicitAyah = clampNumber(
          payload.ayah,
          1,
          getPocketQuranSurahMaxAyah(targetSurah),
          NaN,
        );
        const targetAyah = Number.isFinite(explicitAyah)
          ? explicitAyah
          : clampNumber(
              currentTarget.ayah + 1,
              1,
              getPocketQuranSurahMaxAyah(targetSurah),
              currentTarget.ayah,
            );

        if (
          targetAyah !== currentTarget.ayah ||
          Number.isFinite(explicitAyah)
        ) {
          await playPocketQuranAyah(targetSurah, targetAyah);
        }
        break;
      }

      case pocketQuranCommandTypes.stopPlayback:
        pausePocketQuranPlayback({
          resetTime: true,
          clearAutoplay: true,
        });
        break;

      case pocketQuranCommandTypes.setVolume: {
        const volume = clampNumber(payload.volume, 0, 1, activeState.volume);
        const audio = ensurePocketQuranAudio();
        audio.volume = volume;

        publishPocketQuranState({
          ...activeState,
          volume,
        });
        persistPocketQuranSettingsPatch({ reciterVolume: volume });
        break;
      }

      case pocketQuranCommandTypes.toggleLoopAyah: {
        const nextLoop =
          typeof payload.desiredIsLooping === "boolean"
            ? payload.desiredIsLooping
            : !(activeState.isLooping === true);

        publishPocketQuranState({
          ...activeState,
          isLooping: nextLoop,
        });
        persistPocketQuranSettingsPatch({ reciterLoop: nextLoop });
        break;
      }

      case pocketQuranCommandTypes.toggleLoopSurah: {
        const nextLoopSurah =
          typeof payload.desiredIsSurahLooping === "boolean"
            ? payload.desiredIsSurahLooping
            : !(activeState.isSurahLooping === true);

        publishPocketQuranState({
          ...activeState,
          isSurahLooping: nextLoopSurah,
        });
        persistPocketQuranSettingsPatch({ reciterSurahLoop: nextLoopSurah });
        break;
      }

      case pocketQuranCommandTypes.toggleAutoplay: {
        const nextAutoplay =
          typeof payload.desiredIsAutoplay === "boolean"
            ? payload.desiredIsAutoplay
            : !(activeState.isAutoplay === true);

        publishPocketQuranState({
          ...activeState,
          isAutoplay: nextAutoplay,
        });
        persistPocketQuranSettingsPatch({ reciterAutoplay: nextAutoplay });

        if (nextAutoplay && activeState.isPlaying !== true) {
          const target = getPocketQuranCurrentTargetAyah(
            getPocketQuranActiveState(),
          );
          await playPocketQuranAyah(target.surah, target.ayah);
        }
        break;
      }

      case pocketQuranCommandTypes.toggleAutoplayNextSurah: {
        const nextAutoplayNextSurah =
          typeof payload.desiredIsAutoplayNextSurah === "boolean"
            ? payload.desiredIsAutoplayNextSurah
            : !(activeState.isAutoplayNextSurah === true);

        publishPocketQuranState({
          ...activeState,
          isAutoplayNextSurah: nextAutoplayNextSurah,
        });
        persistPocketQuranSettingsPatch({
          reciterAutoplayNextSurah: nextAutoplayNextSurah,
        });
        break;
      }

      case pocketQuranCommandTypes.toggleAutoScroll: {
        const nextAutoScroll =
          typeof payload.desiredIsAutoScroll === "boolean"
            ? payload.desiredIsAutoScroll
            : !(activeState.isAutoScroll === true);

        publishPocketQuranState({
          ...activeState,
          isAutoScroll: nextAutoScroll,
        });
        persistPocketQuranSettingsPatch({ reciterAutoScroll: nextAutoScroll });
        break;
      }

      case pocketQuranCommandTypes.toggleTajweed: {
        const nextTajweedMode =
          typeof payload.desiredIsTajweedMode === "boolean"
            ? payload.desiredIsTajweedMode
            : !(activeState.isTajweedMode === true);

        publishPocketQuranState({
          ...activeState,
          isTajweedMode: nextTajweedMode,
        });
        persistPocketQuranSettingsPatch({ tajweedMode: nextTajweedMode });
        break;
      }

      case pocketQuranCommandTypes.selectTranslation: {
        const translationId = clampNumber(
          payload.translationResourceId || payload.translationId,
          1,
          10000,
          activeState.translationResourceId,
        );

        publishPocketQuranState({
          ...activeState,
          translationResourceId: translationId,
        });
        persistPocketQuranSettingsPatch({
          translationResourceId: translationId,
        });
        break;
      }

      case pocketQuranCommandTypes.selectAyah: {
        const targetSurah = clampNumber(
          payload.surah,
          1,
          114,
          currentTarget.surah,
        );
        const targetAyah = clampNumber(
          payload.ayah,
          1,
          getPocketQuranSurahMaxAyah(targetSurah),
          currentTarget.ayah,
        );

        persistPocketQuranSettingsPatch({
          lastSurahNumber: targetSurah,
          lastAyahNumber: targetAyah,
        });

        const audio = ensurePocketQuranAudio();
        const isActivelyPlaying =
          activeState.isPlaying === true ||
          (audio && audio.paused === false && audio.ended === false);

        if (isActivelyPlaying) {
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch (error) {
            // no-op
          }

          await playPocketQuranAyah(targetSurah, targetAyah, {
            forceRestart: true,
          });
          break;
        }

        publishPocketQuranState({
          ...activeState,
          activeSurah: targetSurah,
          activeAyah: targetAyah,
          recitationAyah: {
            surah: targetSurah,
            ayah: targetAyah,
          },
          isPlaying: false,
        });
        break;
      }

      case pocketQuranCommandTypes.selectReciter: {
        const reciterId = clampNumber(
          payload.reciterId,
          1,
          10000,
          activeState.reciterId,
        );
        const reciterName = resolvePocketQuranReciterName(
          reciterId,
          activeState.reciterName,
        );

        publishPocketQuranState({
          ...activeState,
          reciterId,
          reciterName,
        });
        persistPocketQuranSettingsPatch({ reciterId });

        if (activeState.isPlaying === true) {
          const target = getPocketQuranCurrentTargetAyah(
            getPocketQuranActiveState(),
          );
          await playPocketQuranAyah(target.surah, target.ayah, {
            forceRestart: true,
          });
        }
        break;
      }

      default:
        break;
    }
  }

  function queuePocketQuranCommand(command) {
    pocketQuranCommandQueue = pocketQuranCommandQueue
      .then(() => executePocketQuranCommand(command))
      .catch(() => {
        // Keep queue alive even if one command fails.
      });

    return pocketQuranCommandQueue;
  }

  function handleDashboardPopupStateStorageEvent(event) {
    if (!event || (event.storageArea && event.storageArea !== localStorage)) {
      return;
    }

    const stateStorageEventKey = `${storage.prefix || ""}${pocketQuranPopupStateKey}`;
    if (event.key !== stateStorageEventKey || !event.newValue) {
      return;
    }

    let rawState = null;
    try {
      rawState = JSON.parse(event.newValue);
    } catch (error) {
      return;
    }

    if (!rawState || typeof rawState !== "object") return;
    if (rawState.source !== pocketQuranStateSourceDashboard) return;

    pocketQuranState = normalizePocketQuranState(
      rawState,
      storage.getSettings(),
    );

    if (pocketQuranAudio && pocketQuranAudio.paused === false) {
      pausePocketQuranAudioSilently({ resetTime: true });
    }
  }

  window.addEventListener("storage", handleDashboardPopupStateStorageEvent);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || typeof message !== "object") {
      return;
    }

    if (message.type === "md_pq_offscreen_execute_internal") {
      void queuePocketQuranCommand(message.command)
        .then(() => {
          sendResponse({
            ok: true,
            state: getPocketQuranActiveState(),
          });
        })
        .catch((error) => {
          sendResponse({
            ok: false,
            error: error && error.message ? error.message : String(error),
          });
        });
      return true;
    }

    if (message.type === "md_pq_offscreen_stop_internal") {
      try {
        pausePocketQuranPlayback();
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error && error.message ? error.message : String(error),
        });
      }
      return true;
    }

    if (message.type === "md_pq_offscreen_ping_internal") {
      sendResponse({ ok: true });
      return true;
    }
  });
})();

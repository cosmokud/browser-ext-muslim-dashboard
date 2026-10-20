/**
 * PocketQuranManager: header player controls and ui.
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

  hideHeaderControls() {
    this.unwatchRecitationControlsVisibility();
    this.unwatchRecitationAutoDockVisibility();
    this.stopRecitationFloatingDrag();

    if (this._headerControlsBox) {
      this._headerControlsBox.classList.remove(
        "pq-recitation-controls-floating",
      );
      this._headerControlsBox.classList.remove(
        "pq-recitation-controls-floating-opaque",
      );
      this._headerControlsBox.style.removeProperty("left");
      this._headerControlsBox.style.removeProperty("top");
      this._headerControlsBox.remove();
      this._headerControlsBox = null;
    }

    this._recitationFloatingMode = false;
    this._recitationFloatingModeReason = null;
    this._recitationFloatingManualOnly = false;

    const header = this.card?.querySelector(".pocket-quran-header");
    if (header) {
      header.classList.remove("pq-has-recitation-controls");
    }
  }

  updatePlaybackUI() {
    // Update header controls
    if (this._headerControlsBox) {
      const playPauseBtn =
        this._headerControlsBox.querySelector(".pq-play-pause-btn");
      if (playPauseBtn) {
        playPauseBtn.innerHTML = this._isPlaying
          ? '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
          : '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
        playPauseBtn.classList.toggle("active", this._isPlaying);
        playPauseBtn.setAttribute(
          "aria-pressed",
          this._isPlaying ? "true" : "false",
        );
      }

      const loopAyahBtn =
        this._headerControlsBox.querySelector(".pq-loop-ayah-btn");
      if (loopAyahBtn) {
        loopAyahBtn.classList.toggle("active", this._isLooping);
      }

      const loopSurahBtn =
        this._headerControlsBox.querySelector(".pq-loop-surah-btn");
      if (loopSurahBtn) {
        loopSurahBtn.classList.toggle("active", this._isSurahLooping);
      }

      const autoplayBtn =
        this._headerControlsBox.querySelector(".pq-autoplay-btn");
      if (autoplayBtn) {
        autoplayBtn.classList.toggle("active", this._isAutoplay);
      }

      const autoplayNextSurahBtn = this._headerControlsBox.querySelector(
        ".pq-autoplay-next-surah-btn",
      );
      if (autoplayNextSurahBtn) {
        autoplayNextSurahBtn.classList.toggle(
          "active",
          this._isAutoplayNextSurah,
        );
        autoplayNextSurahBtn.setAttribute(
          "aria-pressed",
          this._isAutoplayNextSurah ? "true" : "false",
        );
      }

      const autoscrollBtn =
        this._headerControlsBox.querySelector(".pq-autoscroll-btn");
      if (autoscrollBtn) {
        autoscrollBtn.classList.toggle("active", this._isAutoScroll);
        autoscrollBtn.setAttribute(
          "aria-pressed",
          this._isAutoScroll ? "true" : "false",
        );
      }

      const highlighterBtn =
        this._headerControlsBox.querySelector(".pq-highlighter-btn");
      if (highlighterBtn) {
        highlighterBtn.classList.toggle("active", this._isRecitationHighlighterEnabled);
        highlighterBtn.setAttribute(
          "aria-pressed",
          this._isRecitationHighlighterEnabled ? "true" : "false",
        );
      }

      const ayahInfo = this._headerControlsBox.querySelector(
        ".pq-recitation-ayah",
      );
      if (ayahInfo) {
        const fallback = { surah: this._activeSurah, ayah: this._activeAyah };
        const target = this._playingAyah || fallback;
        ayahInfo.textContent = this.formatRecitationAyahLabel(
          target?.surah,
          target?.ayah,
        );
      }

      const reciterInfo = this._headerControlsBox.querySelector(
        ".pq-recitation-reciter",
      );
      if (reciterInfo) {
        reciterInfo.textContent = this.getActiveReciterName();
      }

      this.updateRecitationFloatingButtons();

      if (this._recitationFloatingMode) {
        this.positionRecitationFloatingPanel();
      } else if (this._recitationFloatingEnabled) {
        this.watchRecitationControlsVisibility();
        this.maybeAutoFloatRecitationControls();
      }
    }

    // Update ayah play buttons
    this.updateAyahPlayButtons();

    this.publishPopupSyncState();
  }

  updateAyahPlayButtons() {
    if (!this._virtualContent) return;

    const playButtons =
      this._virtualContent.querySelectorAll(".pq-ayah-play-btn");
    playButtons.forEach((btn) => {
      const ayahEl = btn.closest(".pocket-quran-ayah");
      if (!ayahEl) return;

      const ayahNumber = parseInt(ayahEl.dataset.ayah, 10);
      const isThisAyahPlaying =
        this._isPlaying &&
        this._playingAyah?.surah === this._activeSurah &&
        this._playingAyah?.ayah === ayahNumber;

      btn.classList.toggle("playing", isThisAyahPlaying);
      btn.innerHTML = isThisAyahPlaying
        ? '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
        : '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
      btn.title = isThisAyahPlaying ? "Pause" : "Play recitation";
    });
  }

  getActiveReciterName() {
    const reciter = this._reciters.find((r) => r.id === this._activeReciterId);
    if (reciter) {
      return reciter.style
        ? `${reciter.name} (${reciter.style})`
        : reciter.name;
    }
    return "Unknown Reciter";
  }
});

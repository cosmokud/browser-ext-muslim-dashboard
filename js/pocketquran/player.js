/**
 * The one Quran audio player. The offscreen document and the popup each hold an
 * instance, so the element, the volume and the restart-at-zero rule exist once
 * instead of twice.
 *
 * The element is built on the first play, never in the constructor: the popup
 * boots in a document where nothing may start audio, and a player that never
 * played should cost nothing.
 *
 * DOM-free and state-free. The caller resolves the source, decides what plays
 * next and keeps its own state; the player only reports what the element did.
 * One element per instance, owned by the player alone.
 */

class PocketQuranPlayer {
  static clampVolume(level, fallback) {
    const value = Number(level);
    if (!Number.isFinite(value)) return fallback;
    return Math.min(1, Math.max(0, value));
  }

  constructor(options = {}) {
    this.onEnded =
      typeof options.onEnded === "function" ? options.onEnded : null;
    this.onError =
      typeof options.onError === "function" ? options.onError : null;
    this._volume = PocketQuranPlayer.clampVolume(options.volume, 1);
    this._audio = null;
    this._target = null;
    this._isPlaying = false;
  }

  get isPlaying() {
    return this._isPlaying;
  }

  // The source the player was last asked to play; null before the first play
  // and after stop().
  get currentTarget() {
    return this._target;
  }

  get volume() {
    return this._volume;
  }

  setVolume(level) {
    this._volume = PocketQuranPlayer.clampVolume(level, this._volume);
    if (this._audio) this._audio.volume = this._volume;
    return this._volume;
  }

  async play(src, { forceRestart = false } = {}) {
    const audio = this._ensureAudio();

    // Assigning src reloads the element, which seeks to zero by itself; the
    // explicit seek is what restarts a source that is already loaded.
    if (forceRestart || audio.src !== src) audio.src = src;
    if (forceRestart) {
      try {
        audio.currentTime = 0;
      } catch (error) {
        // no-op: an element with no loaded source refuses the seek
      }
    }

    this._target = src;
    await audio.play();
    this._isPlaying = true;
  }

  // No element, nothing to pause: pausing before the first play must not build
  // one.
  pause({ resetTime = false } = {}) {
    if (!this._audio) return;

    try {
      this._audio.pause();
      if (resetTime) this._audio.currentTime = 0;
    } catch (error) {
      // no-op
    }

    this._isPlaying = false;
  }

  stop() {
    if (this._audio) {
      try {
        this._audio.pause();
        this._audio.currentTime = 0;
        this._audio.src = "";
      } catch (error) {
        // no-op
      }
    }

    this._isPlaying = false;
    this._target = null;
  }

  _ensureAudio() {
    if (this._audio) return this._audio;

    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = this._volume;

    audio.addEventListener("ended", () => {
      // One ayah ended; the caller decides whether anything follows.
      this._isPlaying = false;
      if (this.onEnded) this.onEnded();
    });

    audio.addEventListener("error", () => {
      this._isPlaying = false;
      if (this.onError) this.onError();
    });

    this._audio = audio;
    return audio;
  }
}

window.PocketQuranPlayer = PocketQuranPlayer;

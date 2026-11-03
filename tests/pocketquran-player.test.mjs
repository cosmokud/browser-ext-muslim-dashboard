/**
 * The shared Quran player, driven by a fake element: what it owns (the element,
 * the volume, the restart-at-zero rule) without a DOM.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { loadSandbox } from "./harness.mjs";

function makeAudio() {
  const created = [];

  class FakeAudio {
    constructor() {
      this.src = "";
      this.currentTime = 0;
      this.volume = 1;
      this.preload = "";
      this.paused = true;
      this.listeners = new Map();
      created.push(this);
    }

    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    }

    play() {
      this.paused = false;
      return Promise.resolve();
    }

    pause() {
      this.paused = true;
    }

    emit(type) {
      this.listeners.get(type)?.();
    }
  }

  return { FakeAudio, created };
}

function makePlayer(options = {}) {
  const { FakeAudio, created } = makeAudio();
  const sandbox = loadSandbox(["js/pocketquran/player.js"], {
    globals: { Audio: FakeAudio },
  });
  return { player: new sandbox.PocketQuranPlayer(options), created };
}

test("the player builds no audio element before it plays", () => {
  const { player, created } = makePlayer({ onEnded() {} });

  player.pause({ resetTime: true });

  assert.equal(created.length, 0, "a paused player never played, so it built nothing");
  assert.equal(player.isPlaying, false);
  assert.equal(player.currentTarget, null);
  assert.equal(player.volume, 1);
});

test("play loads the source into one element and reports playing", async () => {
  const { player, created } = makePlayer();
  const src = "https://verses.quran.com/7/2/255.mp3";

  await player.play(src);

  assert.equal(created.length, 1);
  assert.equal(created[0].src, src);
  assert.equal(created[0].preload, "auto");
  assert.equal(player.isPlaying, true);
  assert.equal(player.currentTarget, src);

  await player.play(src);
  assert.equal(created.length, 1, "the player reuses its element");
});

test("pause keeps the target and only seeks when asked to", async () => {
  const { player, created } = makePlayer();
  const src = "https://verses.quran.com/7/2/255.mp3";
  await player.play(src);
  created[0].currentTime = 12;

  player.pause();
  assert.equal(player.isPlaying, false);
  assert.equal(player.currentTarget, src);
  assert.equal(created[0].currentTime, 12);

  player.pause({ resetTime: true });
  assert.equal(created[0].currentTime, 0);
});

test("stop clears the target and the element", async () => {
  const { player, created } = makePlayer();
  await player.play("https://verses.quran.com/7/2/255.mp3");

  player.stop();

  assert.equal(player.isPlaying, false);
  assert.equal(player.currentTarget, null);
  assert.equal(created[0].src, "");
  assert.equal(created[0].currentTime, 0);
  assert.equal(created[0].paused, true);
});

test("a restart request seeks back to zero, a plain replay does not", async () => {
  const { player, created } = makePlayer();
  const src = "https://verses.quran.com/7/2/255.mp3";

  await player.play(src);
  created[0].currentTime = 42;

  await player.play(src);
  assert.equal(created[0].currentTime, 42, "same source, no restart");

  await player.play(src, { forceRestart: true });
  assert.equal(created[0].currentTime, 0);
  assert.equal(player.isPlaying, true);
});

test("setVolume clamps to 0..1 and reaches the element", async () => {
  const { player, created } = makePlayer();

  player.setVolume(0.4);
  assert.equal(player.volume, 0.4);

  await player.play("https://verses.quran.com/7/2/255.mp3");
  assert.equal(created[0].volume, 0.4, "the stored level is applied on creation");

  assert.equal(player.setVolume(2), 1);
  assert.equal(player.setVolume(-1), 0);
  assert.equal(player.setVolume("loud"), 0, "a non-number keeps the last level");
  assert.equal(created[0].volume, 0);
});

test("the ended event reaches the caller once", async () => {
  let ended = 0;
  const { player, created } = makePlayer({ onEnded: () => (ended += 1) });
  const src = "https://verses.quran.com/7/2/255.mp3";

  await player.play(src);
  await player.play(src);
  created[0].emit("ended");

  assert.equal(ended, 1, "one element, one listener");
  assert.equal(player.isPlaying, false);
});

test("an element error stops the player and reaches the caller", async () => {
  let errors = 0;
  const { player, created } = makePlayer({ onError: () => (errors += 1) });

  await player.play("https://verses.quran.com/7/2/255.mp3");
  created[0].emit("error");

  assert.equal(errors, 1);
  assert.equal(player.isPlaying, false);
});

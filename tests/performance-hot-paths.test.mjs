/**
 * The hot paths a page pays for on every animation frame.
 *
 * A background change and a burst of added DOM both cost one pass per frame
 * instead of one per event, and the clock tick only touches nodes whose text
 * actually changed. Each case counts writes with a fake requestAnimationFrame
 * so the assertion is about what the page did, not about how it is written.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadPageDom, loadSandbox, makePage, repoRoot, withParts } from "./harness.mjs";

/** Frames handed out by the fake scheduler; nothing runs until runFrame(). */
function fakeFrames(window) {
  const pending = [];
  window.requestAnimationFrame = (callback) => pending.push(callback);
  return {
    pending,
    runFrame() {
      pending.splice(0).forEach((callback) => callback(0));
    },
  };
}

/** Writes to the root's CSS variables, so a theme pass can be counted. */
function countingRoot(document) {
  const writes = [];
  const style = document.documentElement.style;
  const setProperty = style.setProperty.bind(style);
  style.setProperty = (name, value) => {
    writes.push(name);
    setProperty(name, value);
  };
  return {
    writes,
    countOf: (name) => writes.filter((written) => written === name).length,
  };
}

function bootThemes() {
  const document = loadPageDom("index.html");
  const window = document.defaultView;
  const frames = fakeFrames(window);
  const root = countingRoot(document);
  for (const relPath of withParts([
    "js/settings-registry.js",
    "js/theme-tokens.js",
    "js/base-manager.js",
    "js/themes.js",
  ])) {
    window.eval(fs.readFileSync(path.join(repoRoot, relPath), "utf8"));
  }
  const themes = new window.ThemeManager({
    getSettings: () => ({ theme: {} }),
    saveSettings() {},
  });
  themes.setBackgroundAwareFontColorEnabled(true, false);
  root.writes.length = 0;
  const change = () =>
    document.dispatchEvent(new window.CustomEvent("md:background-visual-change"));
  return { document, window, themes, frames, root, change };
}

async function bootIcons() {
  const document = loadPageDom("index.html");
  const window = document.defaultView;
  const frames = fakeFrames(window);
  const observers = [];
  window.MutationObserver = class {
    constructor(callback) {
      observers.push(callback);
    }
    observe() {}
    disconnect() {}
  };
  for (const relPath of withParts([
    "js/settings-registry.js",
    "js/base-manager.js",
    "js/iconthemes.js",
  ])) {
    window.eval(fs.readFileSync(path.join(repoRoot, relPath), "utf8"));
  }
  const icons = new window.IconThemeManager({
    getSettings: () => ({}),
    saveSettings() {},
  });
  // The observer attaches when the document finishes loading, on a listener the
  // manager registered first, so one added after it runs after the setup.
  if (!icons._domIconObserver) {
    await new Promise((resolve) =>
      document.addEventListener("DOMContentLoaded", resolve, { once: true }),
    );
  }

  const applied = [];
  const iconify = icons.applyDomIconReplacements.bind(icons);
  icons.applyDomIconReplacements = (root) => {
    applied.push(root);
    iconify(root);
  };
  applied.length = 0;
  return {
    document,
    window,
    icons,
    frames,
    applied,
    notify: (addedNodes) => observers[0]([{ addedNodes }]),
  };
}

/** An element that counts the writes the clock path makes to it. */
function countingElement() {
  const counts = { innerHTML: 0, textContent: 0, setAttribute: 0, display: 0 };
  const attributes = {};
  const state = { html: "", text: "", display: "" };
  const style = {};
  Object.defineProperty(style, "display", {
    get: () => state.display,
    set: (value) => {
      counts.display += 1;
      state.display = value;
    },
  });
  const element = {
    counts,
    dataset: {},
    style,
    getAttribute: (name) => (name in attributes ? attributes[name] : null),
    setAttribute: (name, value) => {
      counts.setAttribute += 1;
      attributes[name] = value;
    },
  };
  Object.defineProperty(element, "innerHTML", {
    get: () => state.html,
    set: (value) => {
      counts.innerHTML += 1;
      state.html = value;
    },
  });
  Object.defineProperty(element, "textContent", {
    get: () => state.text,
    set: (value) => {
      counts.textContent += 1;
      state.text = value;
    },
  });
  return element;
}

const total = (...elements) =>
  elements.reduce(
    (sum, element) =>
      sum + Object.values(element.counts).reduce((all, count) => all + count, 0),
    0,
  );

const NEXT_PRAYER = { name: "Fajr", countdown: "01:02:03" };

/** A dashboard clock driven to one fixed local minute. */
function bootClock() {
  const settings = {
    heading: { clockFormat: "24h", showNextPrayer: true },
    componentVisibility: { header: true },
  };
  let reads = 0;
  const sandbox = loadSandbox(withParts(["js/base-manager.js", "js/app.js"]), {
    globals: { ...makePage() },
    now: new Date(2026, 2, 20, 9, 5, 0),
  });
  const clock = Object.assign(Object.create(sandbox.MuslimDashboard.prototype), {
    currentTime: countingElement(),
    currentSeconds: countingElement(),
    currentAmPm: countingElement(),
    headerNextPrayer: countingElement(),
    headerNextPrayerName: countingElement(),
    headerNextPrayerCountdown: countingElement(),
    prayerTimes: { getNextPrayerInfo: () => NEXT_PRAYER },
    storage: {
      getSettings: () => {
        reads += 1;
        return settings;
      },
    },
  });
  const nextPrayerWrites = () =>
    total(
      clock.headerNextPrayer,
      clock.headerNextPrayerName,
      clock.headerNextPrayerCountdown,
    );
  return { clock, settings, nextPrayerWrites, reads: () => reads };
}

test("a burst of background changes costs one theme pass per frame", () => {
  const { frames, root, change } = bootThemes();

  change();
  change();

  assert.equal(frames.pending.length, 1);
  assert.equal(root.countOf("--text-primary"), 0);

  frames.runFrame();
  assert.equal(root.countOf("--text-primary"), 1);

  // The queue reopens for the next frame instead of dropping later changes.
  change();
  assert.equal(frames.pending.length, 1);
  frames.runFrame();
  assert.equal(root.countOf("--text-primary"), 2);
});

test("a queued icon root is iconified once per frame", async () => {
  const { document, icons, frames, applied } = await bootIcons();
  const first = document.createElement("div");
  const second = document.createElement("div");

  icons._queueDomIconify(first);
  icons._queueDomIconify(first);
  icons._queueDomIconify(second);

  assert.deepEqual(applied, []);
  frames.runFrame();
  assert.deepEqual(applied, [first, second]);
});

test("added DOM is queued for the next frame, not rescanned at once", async () => {
  const { document, frames, applied, notify } = await bootIcons();
  const root = document.createElement("span");

  notify([root, document.createTextNode("text")]);

  assert.deepEqual(applied, []);
  frames.runFrame();
  // The text node is not an element, so only the added element is iconified.
  assert.deepEqual(applied, [root]);
});

test("the clock skips hours and minutes that did not change", () => {
  const { clock } = bootClock();

  clock.setCurrentTimeParts("09", "05");
  const written = total(clock.currentTime);
  assert.ok(written > 0);

  clock.setCurrentTimeParts("09", "05");
  assert.equal(total(clock.currentTime), written);

  clock.setCurrentTimeParts("09", "06");
  assert.ok(total(clock.currentTime) > written);
});

test("next-prayer rendering skips unchanged DOM writes", () => {
  const { clock, settings, nextPrayerWrites } = bootClock();

  clock.updateHeaderNextPrayer(settings);
  const written = nextPrayerWrites();
  assert.ok(written > 0);

  clock.updateHeaderNextPrayer(settings);
  assert.equal(nextPrayerWrites(), written);

  clock.prayerTimes = {
    getNextPrayerInfo: () => ({ ...NEXT_PRAYER, countdown: "00:00:01" }),
  };
  clock.updateHeaderNextPrayer(settings);
  assert.equal(clock.headerNextPrayerCountdown.counts.textContent, 2);
  assert.equal(clock.headerNextPrayerName.counts.textContent, 1);
});

test("the next-prayer refresh takes a snapshot instead of reading storage", () => {
  const { clock, settings, reads } = bootClock();

  clock.updateHeaderNextPrayer(settings);

  assert.equal(reads(), 0);
});

test("a clock tick reads the settings once for both halves of the header", () => {
  const { clock, nextPrayerWrites, reads } = bootClock();

  clock.updateTime();
  assert.equal(reads(), 1);

  const currentTime = total(clock.currentTime, clock.currentSeconds);
  const nextPrayer = nextPrayerWrites();
  clock.updateTime();

  // Nothing changed in this minute, so the tick wrote nothing and asked
  // storage once, not once per rendered part.
  assert.equal(reads(), 2);
  assert.equal(total(clock.currentTime, clock.currentSeconds), currentTime);
  assert.equal(nextPrayerWrites(), nextPrayer);
});

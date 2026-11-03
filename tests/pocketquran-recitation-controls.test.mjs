/**
 * The dashboard's recitation controls: which ayah an arrow acts on, how a
 * cross-surah move lands, and the buttons the player renders.
 *
 * Replaces tests/pocketquran-recitation-controls.test.ps1, which matched the
 * source text. Target resolution is driven through the popup state the popup
 * really writes, on the reader's own class; the buttons are read from the DOM
 * the reader builds on index.html, and the popup's own side is driven on
 * popup.html.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { JSDOM, VirtualConsole } from "jsdom";
import {
  loadPageDom,
  makeChrome,
  repoRoot,
  scriptSrcs,
  withParts,
} from "./harness.mjs";

const SCRIPTS = withParts([
  "js/settings-registry.js",
  "js/quran-recitation.js",
  "js/quran-arabic.js",
  "js/base-manager.js",
  "js/pocketquran.js",
]);

const CHAPTERS = [
  { id: 1, name_simple: "Al-Fatihah", verses_count: 7 },
  { id: 2, name_simple: "Al-Baqarah", verses_count: 286 },
  { id: 3, name_simple: "Ali Imran", verses_count: 200 },
];

// The key the popup publishes its player state under; both sides read it.
const SYNC_KEY = "pocketQuran_popupState";

function page(source = "index.html") {
  const dom = new JSDOM(fs.readFileSync(path.join(repoRoot, source), "utf8"), {
    url: `https://localhost/${source}`,
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole: new VirtualConsole(),
  });
  // The network is not this test's business: an empty answer keeps boot quiet.
  dom.window.fetch = async () => ({ ok: true, json: async () => [] });
  return dom;
}

/**
 * The reader on the dashboard's own markup, with the popup state it would find
 * in storage and the local playback state a test chooses.
 */
function boot({
  synced = null,
  settings = {},
  activeSurah = 2,
  activeAyah = 5,
  playingAyah = null,
  isPlaying = false,
  audioElement = null,
} = {}) {
  const dom = page();
  const context = dom.getInternalVMContext();
  for (const relPath of SCRIPTS) {
    vm.runInContext(fs.readFileSync(path.join(repoRoot, relPath), "utf8"), context, {
      filename: relPath,
    });
  }

  const PocketQuran = vm.runInContext("PocketQuranManager", context);
  const document = dom.window.document;
  const reader = Object.create(PocketQuran.prototype);
  const writes = [];
  const saved = [];

  const settingsState = { pocketQuran: { ...settings } };
  reader.storage = {
    prefix: "muslimDashboard_",
    get: (key, fallback) => (key === SYNC_KEY && synced ? synced : fallback),
    set: (key, value) => writes.push({ key, value }),
    getSettings: () => settingsState,
    saveSettings: (next) => {
      saved.push(JSON.parse(JSON.stringify(next)));
      settingsState.pocketQuran = next.pocketQuran;
    },
    setSettings() {},
  };
  reader._popupSyncStateKey = SYNC_KEY;
  reader.card = document.getElementById("pocketQuranCard");
  reader._chapters = CHAPTERS;
  reader._reciters = [{ id: 7, name: "Mishary Rashid Alafasy" }];
  reader._activeReciterId = 7;
  reader._activeSurah = activeSurah;
  reader._activeAyah = activeAyah;
  reader._lastPocketQuranControlAt = 0;
  reader._isRecitationHighlighterEnabled = true;
  reader._playingAyah = playingAyah;
  reader._isPlaying = isPlaying;
  reader._audioElement = audioElement;
  reader._volume = 1;

  return { dom, document, reader, writes, saved };
}

/** Records what a control asked the player to do, instead of playing it. */
function record(reader, names) {
  const calls = {};
  for (const name of names) {
    calls[name] = [];
    reader[name] = async (...args) => {
      // Copied out of the sandbox, so the values compare as plain data.
      calls[name].push(JSON.parse(JSON.stringify(args)));
    };
  }
  reader.stopOffscreenPlaybackBestEffort = () => {};
  return calls;
}

const target = (reader) => ({ ...reader.getRecitationControlTargetAyah() });

test("a playing popup target outranks the dashboard's own position", () => {
  const { reader } = boot({
    synced: { source: "popup", isPlaying: true, recitationAyah: { surah: 3, ayah: 9 } },
  });

  assert.deepEqual(target(reader), { surah: 3, ayah: 9 });
});

test("the dashboard's own playback outranks a synced target", () => {
  const synced = { source: "popup", isPlaying: true, recitationAyah: { surah: 3, ayah: 9 } };

  const local = boot({ synced, isPlaying: true, playingAyah: { surah: 5, ayah: 2 } });
  assert.deepEqual(target(local.reader), { surah: 5, ayah: 2 }, "a playing reader");

  // An element that reports itself playing counts even before the flag is set.
  const element = boot({
    synced,
    playingAyah: { surah: 5, ayah: 2 },
    audioElement: { paused: false, ended: false },
  });
  assert.deepEqual(target(element.reader), { surah: 5, ayah: 2 }, "a live element");

  // A silent dashboard still follows a target another surface is reciting.
  const silent = boot({ synced, activeSurah: 2, activeAyah: 5 });
  assert.deepEqual(target(silent.reader), { surah: 3, ayah: 9 }, "another surface reciting");

  // And with nothing synced the reader falls back to where it stands.
  const alone = boot({ activeSurah: 4, activeAyah: 3 });
  assert.deepEqual(target(alone.reader), { surah: 4, ayah: 3 });
});

test("a synced target is clamped to its surah's ayah count", () => {
  const { reader } = boot({
    synced: { source: "popup", isPlaying: true, recitationAyah: { surah: 3, ayah: 999 } },
  });

  assert.deepEqual(target(reader), { surah: 3, ayah: 200 });
});

test("the sync guard accepts only an ayah that exists", () => {
  const { reader } = boot();

  assert.equal(reader.hasUsableSyncedRecitationTarget(null), false);
  assert.equal(reader.hasUsableSyncedRecitationTarget({}), false);
  assert.equal(reader.hasUsableSyncedRecitationTarget({ recitationAyah: null }), false);
  assert.equal(
    reader.hasUsableSyncedRecitationTarget({ recitationAyah: { surah: 2 } }),
    false,
    "an ayah number is required",
  );
  assert.equal(
    reader.hasUsableSyncedRecitationTarget({ recitationAyah: { surah: 2, ayah: 287 } }),
    false,
    "past the last ayah of Al-Baqarah",
  );
  assert.equal(
    reader.hasUsableSyncedRecitationTarget({ recitationAyah: { surah: 2, ayah: 255 } }),
    true,
  );
});

test("a passive start leaves the paused target another surface saved", () => {
  const paused = {
    source: "popup",
    isPlaying: false,
    recitationAyah: { surah: 3, ayah: 9 },
  };
  const { reader, writes } = boot({ synced: paused });

  reader.publishPopupSyncState();
  assert.equal(writes.length, 0, "no state was overwritten");

  const empty = boot();
  empty.reader.publishPopupSyncState();
  assert.equal(empty.writes.length, 1);
  assert.equal(empty.writes[0].key, SYNC_KEY);
  assert.equal(empty.writes[0].value.source, "dashboard");
  assert.deepEqual({ ...empty.writes[0].value.recitationAyah }, { surah: 2, ayah: 5 });
});

test("an arrow with no readable ayah acts on the synced target", async () => {
  // The step falls back to the target the reader resolves, not to ayah 1.
  const synced = { source: "popup", isPlaying: true, recitationAyah: { surah: 3, ayah: 9 } };

  const playing = boot({ synced, isPlaying: true });
  const playingCalls = record(playing.reader, ["playAyah", "setPausedRecitationTarget"]);
  await playing.reader.playPreviousAyah({ targetSurah: "n/a", targetAyah: "n/a" });
  assert.deepEqual(playingCalls.playAyah[0], [3, 8]);

  const paused = boot({ synced });
  const pausedCalls = record(paused.reader, ["playAyah", "setPausedRecitationTarget"]);
  await paused.reader.playPreviousAyah({ targetSurah: "n/a", targetAyah: "n/a" });
  assert.deepEqual(pausedCalls.setPausedRecitationTarget[0], [3, 8]);
  assert.equal(pausedCalls.playAyah.length, 0);

  const forward = boot({ synced });
  const forwardCalls = record(forward.reader, ["playAyah", "setPausedRecitationTarget"]);
  await forward.reader.playNextAyah({ targetSurah: "n/a", targetAyah: "n/a" });
  assert.deepEqual(forwardCalls.setPausedRecitationTarget[0], [3, 10]);
});

test("the header arrows pass the resolved target to the player", async () => {
  const { reader } = boot({
    synced: { source: "popup", isPlaying: true, recitationAyah: { surah: 3, ayah: 9 } },
  });
  const calls = record(reader, ["playPreviousAyah", "playNextAyah"]);

  reader.showHeaderControls();
  const box = reader._headerControlsBox;
  box.querySelector(".pq-prev-btn").click();
  box.querySelector(".pq-next-btn").click();

  assert.deepEqual(calls.playPreviousAyah[0], [{ targetSurah: 3, targetAyah: 9 }]);
  assert.deepEqual(calls.playNextAyah[0], [{ targetSurah: 3, targetAyah: 9 }]);
});

test("previous crosses into the previous surah's last ayah", async () => {
  const { reader } = boot({ activeSurah: 2 });
  reader._isAutoplayNextSurah = true;
  const calls = record(reader, [
    "activateRecitationTargetSurah",
    "playAyah",
    "setPausedRecitationTarget",
  ]);

  await reader.playPreviousAyah({ targetSurah: 2, targetAyah: 1, desiredIsPlaying: true });

  assert.deepEqual(calls.activateRecitationTargetSurah[0], [1]);
  assert.deepEqual(calls.playAyah[0], [1, 7, { forceRestart: true }]);

  const paused = boot({ activeSurah: 2 });
  paused.reader._isAutoplayNextSurah = true;
  const pausedCalls = record(paused.reader, [
    "activateRecitationTargetSurah",
    "playAyah",
    "setPausedRecitationTarget",
  ]);
  await paused.reader.playPreviousAyah({ targetSurah: 2, targetAyah: 1 });

  assert.deepEqual(pausedCalls.setPausedRecitationTarget[0], [1, 7]);
});

test("next crosses into the next surah's first ayah", async () => {
  const { reader } = boot({ activeSurah: 2 });
  reader._isAutoplayNextSurah = true;
  const calls = record(reader, [
    "activateRecitationTargetSurah",
    "playAyah",
    "setPausedRecitationTarget",
  ]);

  await reader.playNextAyah({ targetSurah: 2, targetAyah: 286, desiredIsPlaying: true });

  assert.deepEqual(calls.activateRecitationTargetSurah[0], [3]);
  assert.deepEqual(calls.playAyah[0], [3, 1, { forceRestart: true }]);
});

test("the surah resolvers read the chapter list, then the number", () => {
  const { reader } = boot();

  assert.equal(reader.getPreviousSurahNumber(2), 1);
  assert.equal(reader.getPreviousSurahNumber(1), null, "nothing before Al-Fatihah");
  assert.equal(reader.getSurahAyahCount(2), 286);
  assert.equal(reader.getSurahAyahCount(99), null, "no chapter, no count");

  reader._chapters = [];
  assert.equal(reader.getPreviousSurahNumber(5), 4, "without a list, count down");
});

test("a cross-surah move switches the layout but not the scroll position", async () => {
  const { reader } = boot({ activeSurah: 2 });
  const calls = record(reader, ["setActiveSurah"]);

  await reader.activateRecitationTargetSurah(3);

  assert.deepEqual(calls.setActiveSurah[0], [
    3,
    { preserveAyah: false, autoScroll: false, preserveDashboardScroll: true },
  ]);
});

test("a popup arrow command loads the target surah before playing it", async () => {
  const { reader } = boot({ activeSurah: 2 });
  const calls = record(reader, [
    "activateRecitationTargetSurah",
    "playAyah",
    "setPausedRecitationTarget",
    "playPreviousAyah",
    "playNextAyah",
  ]);

  await reader.handlePopupCommand({
    action: "playPreviousAyah",
    payload: { surah: 3, ayah: 9, desiredIsPlaying: true },
  });
  assert.deepEqual(calls.activateRecitationTargetSurah[0], [3]);
  assert.deepEqual(calls.playAyah[0], [3, 9]);

  await reader.handlePopupCommand({
    action: "playNextAyah",
    payload: { surah: 3, ayah: 9, desiredIsPlaying: false },
  });
  assert.deepEqual(calls.activateRecitationTargetSurah[1], [3]);
  assert.deepEqual(calls.setPausedRecitationTarget[0], [3, 9]);

  // Without an ayah the command is the same step the dashboard's own arrow takes.
  await reader.handlePopupCommand({
    action: "playNextAyah",
    payload: { surah: 3, desiredIsPlaying: false },
  });
  assert.deepEqual(calls.playNextAyah[0], [{ desiredIsPlaying: false }]);
});

test("the icons are Lucide's, in the player's own order", () => {
  const { reader } = boot();
  reader.showHeaderControls();
  const box = reader._headerControlsBox;

  const icon = (selector) => {
    const button = box.querySelector(selector);
    assert.ok(button, `no ${selector}`);
    const svg = button.querySelector("svg");
    return {
      classes: svg.getAttribute("class"),
      paths: [...svg.querySelectorAll("path")].map((path) => path.getAttribute("d")),
      title: button.title,
    };
  };

  const ayahLoop = icon(".pq-loop-ayah-btn");
  assert.match(ayahLoop.classes, /lucide-repeat-1/);
  assert.ok(ayahLoop.paths.includes("M11 10h1v4"), "repeat once, not repeat twice");

  const surahLoop = icon(".pq-loop-surah-btn.pq-recitation-btn:not(.pq-recitation-float-toggle-btn)");
  assert.match(surahLoop.classes, /lucide-repeat-2/);
  assert.ok(surahLoop.paths.includes("M13 18H7a2 2 0 0 1-2-2V6"));

  const across = icon(".pq-autoplay-next-surah-btn");
  assert.match(across.classes, /lucide-book-up-2/);
  assert.equal(across.title, "Across Surahs");

  const order = [...box.querySelectorAll("button")].map((button) => button.className);
  const at = (needle) => order.findIndex((name) => name.includes(needle));
  assert.ok(at("pq-loop-ayah-btn") < at("pq-loop-surah-btn"));
  assert.ok(at("pq-loop-surah-btn") < at("pq-autoplay-next-surah-btn"));
});

test("the highlighter button follows auto-scroll and shows its switch", () => {
  const { reader } = boot();
  reader.showHeaderControls();
  const box = reader._headerControlsBox;

  const buttons = [...box.querySelectorAll("button")].map((button) => button.className);
  const autoscroll = buttons.findIndex((name) => name.includes("pq-autoscroll-btn"));
  const highlighter = buttons.findIndex((name) => name.includes("pq-highlighter-btn"));
  assert.equal(highlighter, autoscroll + 1, "highlighter sits right after auto-scroll");

  const button = box.querySelector(".pq-highlighter-btn");
  const svg = button.querySelector("svg");
  assert.match(svg.getAttribute("class"), /lucide-highlighter/);
  assert.ok(
    [...svg.querySelectorAll("path")].some((path) => path.getAttribute("d") === "m9 11-6 6v3h9l3-3"),
  );

  assert.equal(button.classList.contains("active"), true, "on for a fresh install");
  assert.equal(button.getAttribute("aria-pressed"), "true");

  reader._isRecitationHighlighterEnabled = false;
  reader.updatePlaybackUI();
  assert.equal(button.classList.contains("active"), false);
  assert.equal(button.getAttribute("aria-pressed"), "false");
});

test("the highlighter button switches the highlighting it advertises", () => {
  const { reader, saved } = boot();
  let cleared = 0;
  let synced = 0;
  reader.clearActiveRecitationWordHighlight = () => {
    cleared += 1;
  };
  reader.syncActiveRecitationWord = () => {
    synced += 1;
  };

  reader.showHeaderControls();
  const button = reader._headerControlsBox.querySelector(".pq-highlighter-btn");
  button.click();
  assert.equal(reader._isRecitationHighlighterEnabled, false);
  assert.equal(cleared, 1, "turning it off drops the marked word");
  assert.equal(saved.at(-1).pocketQuran.reciterHighlighter, false, "and it is saved");

  button.click();
  assert.equal(reader._isRecitationHighlighterEnabled, true);
  assert.equal(synced, 1, "turning it back on re-marks the word");
  assert.equal(saved.at(-1).pocketQuran.reciterHighlighter, true);
});

test("the highlighter ships on, and a missing legacy setting keeps it on", () => {
  const document = loadPageDom("index.html");
  const window = document.defaultView;
  window.eval(fs.readFileSync(path.join(repoRoot, "js/settings-registry.js"), "utf8"));
  window.eval(fs.readFileSync(path.join(repoRoot, "js/storage.js"), "utf8"));
  const defaults = window.StorageManager.prototype.getDefaultSettings.call({});
  assert.equal(defaults.pocketQuran.reciterHighlighter, true);

  const fresh = boot();
  fresh.reader.initRecitationSystem();
  assert.equal(fresh.reader._isRecitationHighlighterEnabled, true, "absent means on");

  const legacy = boot({ settings: { reciterHighlighter: false } });
  legacy.reader.initRecitationSystem();
  assert.equal(legacy.reader._isRecitationHighlighterEnabled, false);
});

test("the popup player has no highlighter button of its own", () => {
  const document = loadPageDom("popup.html");

  assert.equal(document.querySelector(".pq-highlighter-btn"), null);
  assert.equal(
    [...document.querySelectorAll('[title="Highlighter"]')].length,
    0,
    "not even an unclassed one",
  );

  const boxes = [...document.querySelectorAll(
    ".pq-loop-ayah-btn, .pq-loop-surah-btn:not(.pq-floating-inline-btn), .pq-autoplay-next-surah-btn",
  )];
  const classes = boxes.map((button) => button.querySelector("svg").getAttribute("class"));
  assert.match(classes[0], /lucide-repeat-1/);
  assert.match(classes[1], /lucide-repeat-2/);
  assert.match(classes[2], /lucide-book-up-2/);
});

test("the detach button swaps Lucide's detach icon for the dock icon", () => {
  const { reader } = boot();
  reader.showHeaderControls();
  const button = reader._headerControlsBox.querySelector(".pq-recitation-float-toggle-btn");

  const classes = () => button.querySelector("svg").getAttribute("class");
  assert.match(classes(), /lucide-picture-in-picture(?!-2)/);
  assert.equal(button.title, "Detach recitation controls");

  reader._recitationFloatingMode = true;
  reader.updateRecitationFloatingButtons();
  assert.match(classes(), /lucide-picture-in-picture-2/);
  assert.equal(button.title, "Dock recitation controls");
  assert.equal(button.getAttribute("aria-pressed"), "true");

  reader._recitationFloatingMode = false;
  reader.updateRecitationFloatingButtons();
  assert.match(classes(), /lucide-picture-in-picture(?!-2)/);
  assert.equal(button.getAttribute("aria-pressed"), "false");
});

/** The rule for one selector, as the browser parsed the shipped stylesheet. */
function ruleFor(selector) {
  const css = fs.readFileSync(path.join(repoRoot, "css/styles.css"), "utf8");
  const dom = new JSDOM(`<style>${css}</style>`, { url: "https://localhost/" });
  const sheet = dom.window.document.styleSheets[0];
  const rule = [...sheet.cssRules].find((candidate) => candidate.selectorText === selector);
  assert.ok(rule, `no ${selector} rule`);
  return rule.style;
}

test("the recitation info reads as text, while its two labels stay clickable", () => {
  const info = ruleFor(".pq-recitation-info");
  assert.equal(info.getPropertyValue("user-select"), "none");
  assert.equal(info.getPropertyValue("-webkit-user-select"), "none");

  assert.equal(ruleFor(".pq-recitation-ayah").getPropertyValue("cursor"), "pointer");
  assert.equal(ruleFor(".pq-recitation-reciter").getPropertyValue("cursor"), "pointer");
});

/** The popup booted over the state and settings the dashboard would leave. */
async function bootPopup(state) {
  const dom = page("popup.html");
  const context = dom.getInternalVMContext();
  dom.window.chrome = makeChrome().chrome;
  dom.window.localStorage.setItem(
    "muslimDashboard_settings",
    JSON.stringify({ pocketQuran: { lastSurahNumber: state.activeSurah } }),
  );
  dom.window.localStorage.setItem(
    `muslimDashboard_${SYNC_KEY}`,
    JSON.stringify({ ...state, source: "dashboard", updatedAt: Date.now() }),
  );

  for (const src of scriptSrcs("popup.html")) {
    if (src.includes("/vendor/")) continue;
    context.eval(fs.readFileSync(path.join(repoRoot, src), "utf8"));
  }
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));

  const label = dom.window.document.querySelector(".pq-recitation-ayah");
  for (let i = 0; i < 200; i += 1) {
    if (label.textContent.includes(`Ayah ${state.activeAyah}`)) break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.match(label.textContent, new RegExp(`Ayah ${state.activeAyah}$`), "the popup never showed the state");

  return dom;
}

function sentCommand(dom) {
  const raw = dom.window.localStorage.getItem("muslimDashboard_pocketQuran_popupCommand");
  assert.ok(raw, "no command was written");
  const command = JSON.parse(raw);
  return { action: command.action, payload: command.payload };
}

test("the popup's previous arrow sends the previous surah's last ayah", async () => {
  const dom = await bootPopup({
    activeSurah: 3,
    activeAyah: 1,
    recitationAyah: { surah: 3, ayah: 1 },
    isAutoplayNextSurah: true,
  });

  try {
    dom.window.document.getElementById("popupPqPrevBtn").click();

    const command = sentCommand(dom);
    assert.equal(command.action, "playPreviousAyah");
    assert.deepEqual(
      { surah: command.payload.surah, ayah: command.payload.ayah },
      { surah: 2, ayah: 286 },
      "back to Al-Baqarah's last ayah, resolved from the chapter list",
    );
    assert.match(
      dom.window.document.querySelector(".pq-recitation-ayah").textContent,
      /^2\. .*Ayah 286$/,
    );
  } finally {
    dom.window.close();
  }
});

test("the popup's next arrow sends the next surah's first ayah", async () => {
  const dom = await bootPopup({
    activeSurah: 2,
    activeAyah: 286,
    recitationAyah: { surah: 2, ayah: 286 },
    isAutoplayNextSurah: true,
  });

  try {
    dom.window.document.getElementById("popupPqNextBtn").click();

    const command = sentCommand(dom);
    assert.equal(command.action, "playNextAyah");
    assert.deepEqual(
      { surah: command.payload.surah, ayah: command.payload.ayah },
      { surah: 3, ayah: 1 },
    );
  } finally {
    dom.window.close();
  }
});

test("without Across Surahs the popup arrows stay inside the surah", async () => {
  const dom = await bootPopup({
    activeSurah: 2,
    activeAyah: 1,
    recitationAyah: { surah: 2, ayah: 1 },
    isAutoplayNextSurah: false,
  });

  try {
    dom.window.document.getElementById("popupPqPrevBtn").click();
    const command = sentCommand(dom);
    assert.deepEqual(
      { surah: command.payload.surah, ayah: command.payload.ayah },
      { surah: 2, ayah: 1 },
      "the first ayah has nowhere to go",
    );
  } finally {
    dom.window.close();
  }
});

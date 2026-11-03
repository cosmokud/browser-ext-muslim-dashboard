/**
 * The recitation highlighter: the spans an ayah is rendered into, and which of
 * them is being recited.
 *
 * Replaces tests/pocketquran-word-highlight.test.ps1, which asserted the shape
 * of the source; these cases assert the DOM the reader produces and the values
 * its timers read.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { JSDOM, VirtualConsole } from "jsdom";
import { loadPageDom, loadSandbox, repoRoot, withParts } from "./harness.mjs";

const SCRIPTS = withParts([
  "js/settings-registry.js",
  "js/quran-recitation.js",
  "js/quran-arabic.js",
  "js/base-manager.js",
  "js/pocketquran.js",
]);

const PAGE = `<!doctype html><html><body><div id="pocketQuranCard"></div></body></html>`;

/** The reader on a page, with the caches and clock state its timers read. */
function sandbox() {
  const dom = new JSDOM(PAGE, {
    url: "https://localhost/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole: new VirtualConsole(),
  });
  const context = dom.getInternalVMContext();
  for (const relPath of SCRIPTS) {
    vm.runInContext(fs.readFileSync(path.join(repoRoot, relPath), "utf8"), context, {
      filename: relPath,
    });
  }

  const PocketQuran = vm.runInContext("PocketQuranManager", context);
  const document = dom.window.document;
  const reader = Object.create(PocketQuran.prototype);
  reader.card = document.getElementById("pocketQuranCard");
  reader._activeReciterId = 7;
  reader._recitationTimingsCache = new Map();
  reader._recitationTimingFetches = new Map();
  reader._virtualContent = document.createElement("div");
  // On the page, so clearing a highlight finds the rendered words.
  reader.card.appendChild(reader._virtualContent);

  return { dom, context, document, reader, PocketQuran };
}

/** One rendered ayah in the reader's virtual content, words addressable. */
function renderedAyah({ document, reader }, surah, ayah, text) {
  const el = document.createElement("div");
  el.className = "pocket-quran-ayah";
  el.dataset.ayah = String(ayah);
  const arabic = document.createElement("div");
  reader.renderArabicWordSpans(arabic, text, `${surah}:${ayah}`);
  el.appendChild(arabic);
  reader._virtualContent.appendChild(el);
  return el;
}

function cacheTiming(reader, verseKey, segments) {
  reader._recitationTimingsCache.set(
    `${reader._activeReciterId}:${verseKey.split(":")[0]}`,
    {
      fetchedAt: 0,
      failed: false,
      timings: new Map([
        [
          verseKey,
          {
            verseKey,
            duration: 30,
            segments: reader.normalizeRecitationSegments(segments),
          },
        ],
      ]),
    },
  );
}

/** Playing an ayah, with the highlighter on. */
function playing(reader, ayah, currentTime) {
  reader._audioElement = { currentTime };
  reader._playingAyah = { surah: 2, ayah };
  reader._isPlaying = true;
  reader._isRecitationHighlighterEnabled = true;
  reader._recitationWordHighlightLagMs = 0;
}

function recitingWords(reader) {
  return [
    ...reader._virtualContent.querySelectorAll("[data-recitation-key].is-reciting"),
  ].map((el) => el.dataset.wordIndex);
}

const BISMILLAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ";

test("the timing request asks Quran.com for the surah's segments and duration", () => {
  const { reader, PocketQuran } = sandbox();

  assert.equal(
    reader.getRecitationTimingUrl(2),
    `${PocketQuran.API_BASE}/recitations/7/by_chapter/2?fields=segments,duration&per_page=50`,
    "the active reciter, the whole surah, and only the fields the highlighter uses",
  );
  assert.equal(
    reader.getRecitationTimingUrl(2, 3),
    `${PocketQuran.API_BASE}/recitations/3/by_chapter/2?fields=segments,duration&per_page=50`,
  );
});

test("a surah's timings are fetched once, kept by verse, and reused", async () => {
  const { reader } = sandbox();
  const urls = [];
  reader.fetchJson = async (url) => {
    urls.push(url);
    return {
      audio_files: [
        { verse_key: "2:255", duration: 12, segments: [[0, 2, 0, 900]] },
        { verse_key: "2:256", duration: 9, segments: [] },
      ],
    };
  };

  const first = await reader.fetchRecitationTimingsForSurah(2);
  const second = await reader.fetchRecitationTimingsForSurah(2);

  assert.equal(urls.length, 1, "the second read is served from the cache");
  assert.equal(first, second);
  assert.deepEqual([...first.timings.keys()], ["2:255"], "a verse without segments is not kept");
  assert.deepEqual(
    { ...first.timings.get("2:255").segments[0] },
    { wordStart: 0, wordEnd: 2, fromMs: 0, toMs: 900 },
  );
  assert.equal(reader.getCachedRecitationTimingForAyah(2, 255).verseKey, "2:255");
});

test("an empty answer is cached for the cooldown instead of refetched", async () => {
  const { reader, PocketQuran } = sandbox();
  let fetches = 0;
  reader.fetchJson = async () => {
    fetches += 1;
    return { audio_files: [] };
  };

  const result = await reader.fetchRecitationTimingsForSurah(2);

  assert.equal(result.failed, true);
  assert.equal(
    result.retryAfter - result.fetchedAt,
    PocketQuran.RECITATION_TIMING_RETRY_COOLDOWN_MS,
    "the retry is held back for the cooldown",
  );
  await reader.fetchRecitationTimingsForSurah(2);
  assert.equal(fetches, 1, "a failed answer inside the cooldown is not asked for again");
});

test("a missing timing fetches the surah once and waits for the next tick", () => {
  const { reader } = sandbox();
  renderedAyah({ document: reader.card.ownerDocument, reader }, 2, 255, BISMILLAH);
  playing(reader, 255, 1.2);
  const asked = [];
  reader.fetchRecitationTimingsForSurah = (surah) => {
    asked.push(surah);
    return Promise.resolve(null);
  };

  reader.syncActiveRecitationWord();

  assert.deepEqual(asked, [2], "one request, not a recursive resync");
  assert.deepEqual(recitingWords(reader), []);
});

test("words become addressable spans and the ayah number stays a marker", () => {
  const { document, reader } = sandbox();
  const container = document.createElement("div");

  reader.renderArabicWordSpans(container, `${BISMILLAH} ١`, "1:1");

  const words = [...container.querySelectorAll(".pq-recitation-word")];
  assert.deepEqual(
    words.map((word) => word.dataset.wordIndex),
    ["1", "2", "3"],
  );
  assert.deepEqual(
    [...new Set(words.map((word) => word.dataset.verseKey))],
    ["1:1"],
  );
  assert.equal(words[0].classList.contains("pq-recitation-word"), true);
  assert.equal(words[0].dataset.recitationKey, "1:1:1");

  const marker = container.querySelector(".pq-ayah-number-marker");
  assert.equal(marker.textContent, "١", "the trailing number is kept as text");
  assert.equal(
    marker.closest(".pq-recitation-word"),
    null,
    "the trailing number is not a recitation word",
  );
});

test("a Tajweed chunk that covers two words splits, keeping its colour", () => {
  const { document, reader } = sandbox();
  const container = document.createElement("div");

  reader.renderTajweedWordSpans(
    container,
    '<span class="tj tj-ham_wasl">بِسْمِ ٱللَّهِ</span> <span class="tj tj-ghunnah">ٱلرَّحْمَٰنِ</span>',
    "1:1",
    BISMILLAH,
  );

  const words = [...container.querySelectorAll(".pq-recitation-word")];
  assert.equal(words.length, 3, "boundaries come from the plain text, not the API's spacing");
  assert.deepEqual(
    words.map((word) => word.textContent),
    ["بِسْمِ", "ٱللَّهِ", "ٱلرَّحْمَٰنِ"],
  );
  assert.deepEqual(
    words.map((word) => word.querySelector(".tj")?.className),
    ["tj tj-ham_wasl", "tj tj-ham_wasl", "tj tj-ghunnah"],
    "each word carries its own copy of the styling",
  );
  assert.deepEqual(
    words.map((word) => word.dataset.recitationKey),
    ["1:1:1", "1:1:2", "1:1:3"],
  );
});

test("Tajweed mode keeps the ayah number out of the words too", () => {
  const { document, reader } = sandbox();
  const container = document.createElement("div");

  reader.renderTajweedWordSpans(
    container,
    `<span class="tj">${BISMILLAH}</span> ١`,
    "1:1",
    `${BISMILLAH} ١`,
  );

  assert.equal(container.querySelectorAll(".pq-recitation-word").length, 3);
  const marker = container.querySelector(".pq-ayah-number-marker");
  assert.equal(marker.textContent.trim(), "١");
  assert.equal(marker.closest(".pq-recitation-word"), null);
});

test("Tajweed mode renders word spans instead of the raw markup", () => {
  const { reader } = sandbox();
  reader._activeSurah = 1;
  reader._isTajweedMode = true;
  reader.isAyahBookmarked = () => false;
  reader._getIcon = (glyph) => String(glyph);
  reader.getTajweedTextForVerse = () =>
    '<span class="tj tj-ham_wasl">بِسْمِ ٱللَّهِ</span>';

  const el = reader.createAyahElement(
    {
      verse_number: 1,
      verse_key: "1:1",
      text_uthmani: "بِسْمِ ٱللَّهِ",
      translations: [{ text: "In the name of Allah" }],
    },
    0,
  );

  const arabic = el.querySelector(".pocket-quran-ayah-ar");
  assert.equal(arabic.classList.contains("tajweed-mode"), true);
  assert.equal(arabic.querySelectorAll(".pq-recitation-word").length, 2);
  assert.equal(arabic.querySelector(".tj-ham_wasl") !== null, true, "the colour survives");
});

test("the recited word follows the audio clock and the user's delay", () => {
  const { document, reader } = sandbox();
  const ayah = renderedAyah({ document, reader }, 2, 255, BISMILLAH);
  cacheTiming(reader, "2:255", [
    [0, 1, 0, 900],
    [1, 2, 900, 1800],
    [2, 3, 1800, 2600],
  ]);
  playing(reader, 255, 0.5);

  reader.syncActiveRecitationWord();
  assert.deepEqual(recitingWords(reader), ["1"]);

  reader._audioElement.currentTime = 2;
  reader.syncActiveRecitationWord();
  assert.deepEqual(recitingWords(reader), ["3"], "the earlier word is released");
  assert.equal(
    ayah.querySelector('[data-word-index="3"]').getAttribute("aria-current"),
    "true",
  );

  reader._recitationWordHighlightLagMs = 2000;
  reader._audioElement.currentTime = 2.5;
  reader.syncActiveRecitationWord();
  assert.deepEqual(
    recitingWords(reader),
    ["1"],
    "the delay pulls the clock back before the segment is looked up",
  );
});

test("an ayah number is never marked as the recited word", () => {
  const { document, reader } = sandbox();
  const ayah = renderedAyah({ document, reader }, 2, 255, BISMILLAH);
  const marker = document.createElement("span");
  marker.className = "pq-recitation-word";
  marker.dataset.verseKey = "2:255";
  marker.dataset.wordIndex = "1";
  marker.dataset.recitationKey = "2:255:1";
  marker.textContent = "١";
  ayah.appendChild(marker);
  cacheTiming(reader, "2:255", [[0, 1, 0, 900]]);
  playing(reader, 255, 0.5);

  reader.syncActiveRecitationWord();

  assert.equal(marker.classList.contains("is-reciting"), false);
});

test("stopping playback clears the highlight", () => {
  const { document, reader } = sandbox();
  renderedAyah({ document, reader }, 2, 255, BISMILLAH);
  cacheTiming(reader, "2:255", [[0, 1, 0, 900]]);
  playing(reader, 255, 0.5);
  reader.syncActiveRecitationWord();
  assert.deepEqual(recitingWords(reader), ["1"]);

  reader._isPlaying = false;
  reader.syncActiveRecitationWord();

  assert.deepEqual(recitingWords(reader), []);
  assert.equal(
    reader._virtualContent.querySelector("[aria-current]"),
    null,
    "the marker of the current word goes with it",
  );
});

test("the highlighter delay is read from the settings", () => {
  const { reader } = sandbox();
  for (const name of [
    "applyArabicFontFamily",
    "applyTranslationFontFamily",
    "applyTextVisibility",
    "unwatchRecitationControlsVisibility",
    "unwatchRecitationAutoDockVisibility",
    "syncRecitationFloatingAppearanceClass",
    "updateRecitationFloatingButtons",
  ]) {
    reader[name] = () => {};
  }

  reader.handleSettingsApplied({ pocketQuran: { reciterHighlighterDelayMs: 250 } });
  assert.equal(reader._recitationWordHighlightLagMs, 250);

  reader.handleSettingsApplied({ pocketQuran: { reciterHighlighterDelayMs: -40000 } });
  assert.equal(reader._recitationWordHighlightLagMs, -10000, "kept inside the rule's range");
});

test("the timeupdate listener moves with the audio element", () => {
  const { reader } = sandbox();

  const audio = () => {
    const listeners = new Map();
    return {
      listeners,
      preload: "",
      volume: 1,
      pause() {},
      addEventListener: (type, listener) => listeners.set(type, listener),
      removeEventListener: (type, listener) => listeners.delete(type),
    };
  };
  const first = audio();
  const second = audio();
  reader._volume = 1;
  reader._onAudioTimeUpdate = () => reader.syncActiveRecitationWord();
  reader._audioElement = first;
  reader.attachAudioListeners(first);

  reader.setActiveAudioElement(second);

  assert.equal(first.listeners.has("timeupdate"), false, "the old element is detached");
  assert.equal(second.listeners.get("timeupdate"), reader._onAudioTimeUpdate);
});

test("a reciter change drops the pending timing fetches", () => {
  const { reader } = sandbox();
  reader._revokeAllRecitationBlobUrls = () => {};
  reader._preloadedAudios = new Map();
  reader._audioSrcCache = new Map();
  reader._recitationTimingFetches.set("7:2", Promise.resolve());

  reader.resetRecitationCaches();

  assert.equal(reader._recitationTimingFetches.size, 0);
});

test("the delay defaults to zero and the dashboard offers it in milliseconds", () => {
  const sandbox = loadSandbox(["js/settings-registry.js", "js/storage.js"], {
    globals: { localStorage: { getItem: () => null, setItem() {}, removeItem() {} } },
  });
  const saved = vm.runInContext(
    "new StorageManager().getSettings().pocketQuran",
    sandbox,
  );
  assert.equal(saved.reciterHighlighterDelayMs, 0);

  const input = loadPageDom("index.html").getElementById("pocketQuranHighlighterDelay");
  assert.equal(input.type, "number");
  assert.equal(input.min, "-10000");
  assert.equal(input.max, "10000");
  assert.equal(input.step, "25");
});

test("the recited word is visibly marked", () => {
  const rules = stylesheetRules();
  const reciting = rules.find((rule) => rule.selectorText === ".pq-recitation-word.is-reciting");
  assert.ok(reciting, "no rule for the recited word");
  assert.match(reciting.cssText, /background:/, "it paints behind the word");
  assert.match(reciting.cssText, /color:/, "and changes the word's colour");

  const word = rules.find((rule) => rule.selectorText === ".pq-recitation-word");
  assert.match(word.cssText, /border-radius:/, "the mark has a rounded shape");
});

/** Every rule of the shipped stylesheet, nested ones included. */
function stylesheetRules() {
  const css = fs.readFileSync(path.join(repoRoot, "css/styles.css"), "utf8");
  const dom = new JSDOM(`<style>${css}</style>`, { url: "https://localhost/" });
  const walk = (rules) =>
    [...rules].flatMap((rule) => [rule, ...(rule.cssRules ? walk(rule.cssRules) : [])]);
  return walk(dom.window.document.styleSheets[0].cssRules);
}

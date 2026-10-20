/**
 * The recitation highlighter: when a word is being recited, and which words a
 * segment covers.
 *
 * The reader's own normaliser is exercised too, so a change that stops using
 * the module is caught here.
 */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { loadSandbox } from "./harness.mjs";

const FILES = [
  "js/quran-recitation.js",
  "js/base-manager.js",
  "js/pocketquran.js",
];

function recitation() {
  const sandbox = loadSandbox(FILES, {
    globals: { document: { getElementById: () => null } },
  });

  return {
    module: vm.runInContext("QuranRecitation", sandbox),
    PocketQuran: vm.runInContext("PocketQuranManager", sandbox),
  };
}

test("the API's array form and the cached object form read the same", () => {
  const { module } = recitation();

  const fromApi = module.normalizeSegments([[0, 2, 0, 900]]);
  const fromCache = module.normalizeSegments([
    { wordStart: 0, wordEnd: 2, fromMs: 0, toMs: 900 },
  ]);

  assert.deepEqual(
    { ...fromApi[0] },
    { wordStart: 0, wordEnd: 2, fromMs: 0, toMs: 900 },
  );
  assert.deepEqual({ ...fromApi[0] }, { ...fromCache[0] });
});

test("unusable segments are dropped, not passed on", () => {
  const { module } = recitation();

  const kept = module.normalizeSegments([
    [0, 2, 0, 900],
    [3, 3, 900, 1200],
    [4, 5, 1500, 1200],
    [6, 7, NaN, 2000],
    "not a segment",
    null,
  ]);

  assert.deepEqual(
    [...kept].map((s) => s.wordStart),
    [0],
    "equal words, backwards times and non-numbers are dropped",
  );
});

test("the segment at an instant is the one whose window contains it", () => {
  const { module } = recitation();
  const segments = [
    [0, 2, 0, 900],
    [2, 4, 900, 1800],
  ];

  assert.equal(module.segmentAt(segments, 0).wordStart, 0, "the first instant");
  assert.equal(
    module.segmentAt(segments, 900).wordStart,
    0,
    "both windows include the boundary instant; the earlier one wins",
  );
  assert.equal(module.segmentAt(segments, 901).wordStart, 2);
  assert.equal(module.segmentAt(segments, 500).wordStart, 0);
  assert.equal(module.segmentAt(segments, 5000), null, "silence after the end");
});

test("a word belongs to the segment that covers it, one-based", () => {
  const { module } = recitation();
  const segment = { wordStart: 1, wordEnd: 3, fromMs: 0, toMs: 900 };

  assert.equal(module.coversWord(segment, 1), false, "the opening word is not re-marked");
  assert.equal(module.coversWord(segment, 2), true);
  assert.equal(module.coversWord(segment, 3), true);
  assert.equal(module.coversWord(segment, 4), false);
  assert.equal(module.coversWord(null, 2), false);
  assert.equal(module.coversWord(segment, NaN), false);
});

test("the highlight key names the verse and the word range", () => {
  const { module } = recitation();

  assert.equal(
    module.keyFor("2:255", { wordStart: 4, wordEnd: 6 }),
    "2:255:4-6",
  );
  assert.equal(module.keyFor("2:255", null), "");
});

test("the highlight lag is clamped to ten seconds either way", () => {
  const { module } = recitation();

  assert.equal(module.lagMs(250), 250);
  assert.equal(module.lagMs(-250), -250);
  assert.equal(module.lagMs(999999), 10000);
  assert.equal(module.lagMs(-999999), -10000);
  assert.equal(module.lagMs("nonsense"), 0);
});

test("the reader reads its segments and lag through the module", () => {
  const { module, PocketQuran } = recitation();
  const instance = Object.create(PocketQuran.prototype);

  assert.deepEqual(
    [...instance.normalizeRecitationSegments([[0, 2, 0, 900]])].map((s) => ({
      ...s,
    })),
    [...module.normalizeSegments([[0, 2, 0, 900]])].map((s) => ({ ...s })),
  );
  assert.equal(instance.normalizeRecitationHighlightDelayMs(999999), 10000);
});

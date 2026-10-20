/**
 * Building the reader without a page.
 *
 * The constructor looks its elements up and, if the card, the surah list or the
 * content area is missing, returns before setting up any state or binding any
 * listener. That is what makes the reader safe to construct in a sandbox - and
 * it is the whole reason the rest of it cannot be exercised there, since every
 * method lives behind that guard.
 */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { loadSandbox } from "./harness.mjs";

const FILES = [
  "js/settings-registry.js",
  "js/quran-copy.js",
  "js/quran-search.js",
  "js/quran-recitation.js",
  "js/quran-arabic.js",
  "js/base-manager.js",
  "js/pocketquran.js",
];

/** A document whose elements are the ones this test chooses to provide. */
function pageWith(elementIds = []) {
  const provided = new Set(elementIds);
  const listeners = [];
  const requested = [];

  return {
    listeners,
    requested,
    document: {
      getElementById: (id) => {
        requested.push(id);
        return provided.has(id) ? stubElement() : null;
      },
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: (type) => listeners.push(type),
      removeEventListener: () => {},
    },
    window: {
      addEventListener: (type) => listeners.push(type),
    },
  };
}

function stubElement() {
  return {
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    style: {},
    dataset: {},
    children: [],
    appendChild() {},
    addEventListener() {},
    setAttribute() {},
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}

function reader(page) {
  const sandbox = loadSandbox(FILES, {
    globals: { document: page.document, window: page.window },
  });
  const PocketQuran = vm.runInContext("PocketQuranManager", sandbox);

  return new PocketQuran({
    getSettings: () => ({ pocketQuran: { lastSurahNumber: 18 } }),
  });
}

test("without its card the reader keeps its storage and sets up nothing", () => {
  const page = pageWith();
  const instance = reader(page);

  assert.equal(typeof instance.storage.getSettings, "function");
  assert.equal(
    instance._activeSurah,
    undefined,
    "no restored position, no state block",
  );
  assert.equal(
    instance._pqCache,
    undefined,
    "no cache is opened",
  );
  assert.deepEqual(page.listeners, [], "no listener is bound");
});

test("the guard is about three elements, asked for by name", () => {
  const page = pageWith();
  reader(page);

  for (const id of [
    "pocketQuranCard",
    "pocketQuranSurahList",
    "pocketQuranContent",
  ]) {
    assert.ok(
      page.requested.includes(id),
      `${id} is one of the elements booting depends on`,
    );
  }
});

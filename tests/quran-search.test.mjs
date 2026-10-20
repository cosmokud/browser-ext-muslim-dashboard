/**
 * The reader's search rules: query → API request, verses → results.
 *
 * Drives the real reader methods through a stub `this`, so the wiring is
 * covered as well as the rules.
 */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { loadSandbox } from "./harness.mjs";

const FILES = [
  "js/quran-search.js",
  "js/base-manager.js",
  "js/pocketquran.js",
];

function reader() {
  const sandbox = loadSandbox(FILES, {
    globals: {
      document: { getElementById: () => null },
      URLSearchParams,
    },
  });
  const PocketQuran = vm.runInContext("PocketQuranManager", sandbox);
  const QuranSearch = vm.runInContext("QuranSearch", sandbox);

  // The real prototype, so one method may call another, with only the two
  // things a search needs stubbed out.
  const instance = Object.create(PocketQuran.prototype);
  instance.normalizeTranslationId = (id) => (id ? Number(id) : 20);
  instance.stripHtmlToText = (html) =>
    String(html || "")
      .replace(/<sup[^>]*>.*?<\/sup>/gi, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  return {
    QuranSearch,
    PocketQuran,
    call: (method, ...args) => instance[method](...args),
  };
}

test("a translation's language decides the search language", () => {
  const { call } = reader();

  assert.equal(call("getSearchLanguageCode", 33), "id", "Indonesian");
  assert.equal(call("getSearchLanguageCode", 20), "en", "English");
});

test("the search request carries the query, page and translation", () => {
  const { call } = reader();

  const url = new URL(call("getSearchApiUrl", "  ar rahman  ", 33, 2));

  assert.equal(url.pathname, "/api/v4/search");
  assert.equal(url.searchParams.get("q"), "ar rahman", "spaces collapsed");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("size"), "100");
  assert.equal(url.searchParams.get("language"), "id");
  assert.equal(url.searchParams.get("translations"), "33");
});

test("a page below one is asked for as page one", () => {
  const { call } = reader();

  assert.equal(
    new URL(call("getSearchApiUrl", "mercy", 20, 0)).searchParams.get("page"),
    "1",
  );
});

test("search API verses are kept, since the endpoint already matched them", () => {
  const { call } = reader();

  const results = call("buildPocketQuranSearchResults", "mercy", [
    { verse_id: 7, text: "and mercy", verse_key: "1:7", translations: [] },
  ]);

  assert.equal(results.length, 1);
  assert.deepEqual(
    { ...results[0] },
    {
      verseKey: "1:7",
      surah: 1,
      ayah: 7,
      arabicText: "and mercy",
      translationText: "",
    },
  );
});

test("a scan of the whole corpus keeps only verses with every term", () => {
  const { call } = reader();

  const results = call("buildPocketQuranSearchResults", "mercy  most", [
    { verse_key: "1:1", translations: [{ text: "His mercy is most wide" }] },
    { verse_key: "1:2", translations: [{ text: "His mercy" }] },
    { verse_key: "1:3", translations: [{ text: "Most high" }] },
  ]);

  assert.deepEqual(
    [...results].map((r) => r.verseKey),
    ["1:1"],
    "both terms, in any order",
  );
});

test("a result with no text at all is dropped", () => {
  const { call } = reader();

  const results = call("buildPocketQuranSearchResults", "mercy", [
    { verse_key: "1:1", verse_id: 1, text: "", translations: [] },
    { verse_key: "1:2", verse_id: 2, text: "mercy", translations: [] },
  ]);

  assert.deepEqual(
    [...results].map((r) => r.verseKey),
    ["1:2"],
  );
});

test("markup and footnotes are stripped from the translation", () => {
  const { call } = reader();

  const [result] = call("buildPocketQuranSearchResults", "most", [
    {
      verse_key: "1:1",
      translations: [{ text: "Most<br><sup>1</sup> Merciful" }],
    },
  ]);

  assert.equal(result.translationText, "Most Merciful");
});

test("an empty query finds nothing", () => {
  const { call } = reader();

  assert.deepEqual([...call("buildPocketQuranSearchResults", "   ", [{ verse_key: "1:1", text_uthmani: "x" }])], []);
});

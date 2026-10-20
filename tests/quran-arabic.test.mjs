/**
 * The Arabic text rules behind word matching and tajweed word spans.
 *
 * The reader's own methods are driven too, so a reader that stops delegating
 * fails here.
 */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { loadSandbox } from "./harness.mjs";

const FILES = [
  "js/quran-arabic.js",
  "js/base-manager.js",
  "js/pocketquran.js",
];

function arabic() {
  const sandbox = loadSandbox(FILES, {
    globals: { document: { getElementById: () => null } },
  });

  return {
    module: vm.runInContext("QuranArabic", sandbox),
    PocketQuran: vm.runInContext("PocketQuranManager", sandbox),
  };
}

test("harakat and the tatweel fall away when words are compared", () => {
  const { module } = arabic();

  assert.equal(
    module.normalizeWord("ٱلرَّحْمَـٰنِ"),
    "الرحمن",
    "alef wasla folds to alef, marks and tatweel go",
  );
});

test("alef variants compare equal to a plain alef", () => {
  const { module } = arabic();

  for (const word of ["إسلام", "أسلام", "آسلام", "ٱسلام", "اسلام"]) {
    assert.equal(module.normalizeWord(word), "اسلام", word);
  }
});

test("bidi marks and whitespace never count as part of a word", () => {
  const { module } = arabic();

  assert.equal(module.normalizeWord("\u200fبِسْمِ\u200e"), "بسم");
  assert.equal(module.normalizeWord("  بِسْمِ  "), "بسم");
});

test("combining marks are told apart from letters", () => {
  const { module } = arabic();

  assert.equal(module.isCombiningMark("َ"), true, "fatha");
  assert.equal(module.isCombiningMark("ّ"), true, "shadda");
  assert.equal(module.isCombiningMark("ب"), false);
  assert.equal(module.isCombiningMark(" "), false);
  assert.equal(module.isCombiningMark(""), false);
});

test("a cluster is a letter with the marks that sit on it", () => {
  const { module } = arabic();

  assert.deepEqual([...module.clusters("بِسْمِ")], ["بِ", "سْ", "مِ"]);
  assert.deepEqual([...module.clusters("بَتَ")], ["بَ", "تَ"]);
  assert.deepEqual([...module.clusters("ب")], ["ب"]);
  assert.deepEqual([...module.clusters("")], []);
});

test("a text that starts with a mark keeps the mark as its own cluster", () => {
  const { module } = arabic();

  assert.deepEqual(
    [...module.clusters("َب")],
    ["َ", "ب"],
    "nothing to attach it to",
  );
});

test("the reader reads its Arabic rules through the module", () => {
  const { PocketQuran } = arabic();
  const instance = Object.create(PocketQuran.prototype);

  assert.equal(instance.normalizeArabicWordForRecitation("ٱلرَّحْمَـٰنِ"), "الرحمن");
  assert.equal(instance.isArabicCombiningMark("ّ"), true);
  assert.deepEqual([...instance.splitArabicTextClusters("بِسْمِ")], [
    "بِ",
    "سْ",
    "مِ",
  ]);
});

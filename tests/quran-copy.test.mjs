/**
 * What the reader puts on the clipboard, and that the reader's copy path is the
 * one using it.
 *
 * Replaces tests/pocketquran-copy-format.test.ps1, which asserted the shape of
 * the source instead of the text it produces.
 */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { loadSandbox } from "./harness.mjs";

const FILES = ["js/quran-copy.js", "js/base-manager.js", "js/pocketquran.js"];

function reader(settings = {}) {
  const sandbox = loadSandbox(FILES, {
    globals: { document: { getElementById: () => null } },
  });
  const QuranCopy = vm.runInContext("QuranCopy", sandbox);
  const PocketQuran = vm.runInContext("PocketQuranManager", sandbox);

  // Only what the copy path touches, so the test stays a copy test.
  const instance = {
    storage: { getSettings: () => ({ pocketQuran: settings }) },
    getSurahNameSimple: () => "Al-Baqarah",
    stripHtmlToText: (html) => String(html || "").replace(/<[^>]*>/g, ""),
  };

  const copy = (verse, surah, ayah) =>
    PocketQuran.prototype.formatPocketQuranAyahCopy.call(
      instance,
      verse,
      surah,
      ayah,
    );

  return { QuranCopy, copy };
}

const VERSE = {
  text_uthmani: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ",
  translations: [{ text: "<p>Allah - there is no deity except Him</p>" }],
};

test("an ayah is copied as a quoted translation and its reference", () => {
  const { copy } = reader();

  assert.equal(
    copy(VERSE, 2, 255),
    '"Allah - there is no deity except Him" (Al-Baqarah 2:255)',
  );
});

test("the Arabic line comes first only when the setting asks for it", () => {
  const { copy } = reader({ copyIncludeArabic: true });

  assert.equal(
    copy(VERSE, 2, 255),
    'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ\n"Allah - there is no deity except Him" (Al-Baqarah 2:255)',
  );
});

test("a quote inside the translation cannot close our outer quotes", () => {
  const { copy } = reader();

  const text = copy(
    { text_uthmani: "", translations: [{ text: 'He said "read" and “recite”' }] },
    96,
    1,
  );

  assert.equal(text, `"He said 'read' and ‘recite’" (Al-Baqarah 96:1)`);
});

test("an ayah with no translation still copies its reference", () => {
  const { copy } = reader();

  assert.equal(copy({ text_uthmani: "" }, 1, 1), '"" (Al-Baqarah 1:1)');
});

test("whitespace is trimmed off both lines", () => {
  const { copy } = reader({ copyIncludeArabic: true });

  assert.equal(
    copy(
      { text_uthmani: "  نص  ", translations: [{ text: "  text  " }] },
      1,
      1,
    ),
    'نص\n"text" (Al-Baqarah 1:1)',
  );
});

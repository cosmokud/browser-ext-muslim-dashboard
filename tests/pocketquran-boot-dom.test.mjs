/**
 * The reader on a real page.
 *
 * With its three elements present the constructor boots for real: it restores
 * the saved position, applies the font sizes and writes them to the card as CSS
 * variables. That path used to be untestable because it needs `HTMLInputElement`
 * and a live element tree - jsdom supplies both, so this is the assertion that
 * the reader's own boot still works end to end.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { JSDOM } from "jsdom";

const SCRIPTS = [
  "js/settings-registry.js",
  "js/quran-copy.js",
  "js/quran-search.js",
  "js/quran-recitation.js",
  "js/quran-arabic.js",
  "js/base-manager.js",
  "js/pocketquran.js",
];

const CARD_HTML = `<!doctype html><html><body>
  <div id="pocketQuranCard">
    <div id="pocketQuranSurahList"></div>
    <div id="pocketQuranContent"></div>
  </div>
</body></html>`;

/** Boot the reader against a page and the settings it is given. */
function boot(pocketQuran) {
  const dom = new JSDOM(CARD_HTML, {
    url: "https://localhost/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  // The network is not this test's business: an empty answer keeps the boot quiet.
  dom.window.fetch = async () => ({ ok: true, json: async () => [] });

  const context = dom.getInternalVMContext();
  for (const path of SCRIPTS) {
    vm.runInContext(fs.readFileSync(path, "utf8"), context, { filename: path });
  }

  const manager = vm.runInContext("PocketQuranManager", context);
  const storage = {
    get: (key, fallback) => fallback,
    set: () => {},
    remove: () => {},
    getSettings: () => ({ pocketQuran }),
    saveSettings: () => {},
    setSettings: () => {},
  };

  return {
    dom,
    card: dom.window.document.getElementById("pocketQuranCard"),
    reader: new manager(storage),
  };
}

test("the reader restores its place and its sizes on a real page", (t) => {
  const { dom, card, reader } = boot({
    lastSurahNumber: 18,
    lastAyahNumber: 10,
    arabicFontSize: 32,
    translationFontSize: 20,
  });

  assert.equal(reader._activeSurah, 18);
  assert.equal(reader._activeAyah, 10);
  assert.equal(card.style.getPropertyValue("--pq-arabic-size"), "32px");
  assert.equal(card.style.getPropertyValue("--pq-translation-size"), "20px");

  t.after(() => dom.window.close());
});

test("a stored size outside the rule comes back inside it", (t) => {
  const { dom, card } = boot({
    lastSurahNumber: 1,
    lastAyahNumber: 1,
    arabicFontSize: 500,
    translationFontSize: 2,
  });

  assert.equal(card.style.getPropertyValue("--pq-arabic-size"), "144px");
  assert.equal(card.style.getPropertyValue("--pq-translation-size"), "8px");

  t.after(() => dom.window.close());
});

/**
 * The popup's first seam: popup.html and its scripts boot on a real DOM.
 *
 * popup.js is one DOMContentLoaded closure holding 283 captured bindings, which
 * is why it is the one file allowed past the size limit: it cannot be split by
 * moving text. This test is what a future extraction has to keep green — the
 * popup has no other coverage, so a broken capture shows up here or not at all.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM, VirtualConsole } from "jsdom";
import { makeChrome, repoRoot } from "./harness.mjs";
import path from "node:path";

const SCRIPTS = [...fs.readFileSync(path.join(repoRoot, "popup.html"), "utf8").matchAll(
  /<script src="([^"]+)"><\/script>/g,
)].map((match) => match[1]);

test("the popup page boots without throwing", () => {
  const dom = new JSDOM(fs.readFileSync(path.join(repoRoot, "popup.html"), "utf8"), {
    url: "https://localhost/popup.html",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    // The popup logs its own tolerated failures (no network here); not this test's business.
    virtualConsole: new VirtualConsole(),
  });
  const context = dom.getInternalVMContext();
  dom.window.chrome = makeChrome().chrome;
  dom.window.fetch = async () => ({ ok: true, json: async () => [] });

  for (const src of SCRIPTS) {
    if (src.includes("/vendor/")) continue;
    const source = fs.readFileSync(path.join(repoRoot, src), "utf8");
    assert.doesNotThrow(
      () => context.eval(source),
      `${src} throws while loading`,
    );
  }

  assert.doesNotThrow(
    () => dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded")),
    "popup.js throws while wiring the page",
  );

  dom.window.close();
});

test("the popup reads and writes the reader's Quran cache", () => {
  const source = fs.readFileSync(path.join(repoRoot, "js/popup.js"), "utf8");

  assert.match(
    source,
    /indexedDB\.open\("MuslimDashboardPocketQuranCache"\)/,
    "the popup opens the schema the reader owns, without a version",
  );
  assert.match(
    source,
    /store\.put\(\{\s*key: String\(key\),\s*size: Number\(record\.size\) \|\| 0,/,
    "a popup play touches the LRU index the reader evicts from",
  );
  assert.match(
    source,
    /key: cacheKey,\s*reciterId,\s*surah,\s*ayah,\s*audioUrl,/,
    "the popup stores ayah audio under the reader's key",
  );
  assert.doesNotMatch(
    source,
    /cache: "no-store"/,
    "no packaged or API request bypasses the cache",
  );
});

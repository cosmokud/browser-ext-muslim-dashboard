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

/**
 * The prayer method panel, opened the way a reader opens it, shown the values
 * it would save back. The panel's markup is the dashboard's own.
 */
async function openPrayerMethodPanel(settings = {}) {
  const dom = new JSDOM(fs.readFileSync(path.join(repoRoot, "popup.html"), "utf8"), {
    url: "https://localhost/popup.html",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole: new VirtualConsole(),
  });
  const context = dom.getInternalVMContext();
  dom.window.chrome = makeChrome().chrome;
  dom.window.localStorage.setItem(
    "muslimDashboard_settings",
    JSON.stringify(settings),
  );
  const dashboard = fs.readFileSync(path.join(repoRoot, "index.html"), "utf8");
  dom.window.fetch = async () => ({
    ok: true,
    json: async () => [],
    text: async () => dashboard,
  });

  for (const src of SCRIPTS) {
    if (src.includes("/vendor/")) continue;
    context.eval(fs.readFileSync(path.join(repoRoot, src), "utf8"));
  }
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
  dom.window.document.getElementById("popupOpenPrayerSettingsBtn").click();

  const panel = await waitFor(() => {
    const host = dom.window.document.getElementById("popupPrayerMethodPanelHost");
    return host?.querySelector("#calculationMethod") ? host : null;
  });

  const value = (selector) => {
    const element = panel.querySelector(selector);
    if (!element) return undefined;
    return element.type === "checkbox" ? element.checked : element.value;
  };

  const values = {
    calculationMethod: value("#calculationMethod"),
    asrMethod: value("#asrMethod"),
    highLatMethod: value("#highLatMethod"),
    midnightMethod: value("#midnightMethod"),
    duhaOffset: value("#duhaOffset"),
    customFajrAngle: value("#customFajrAngle"),
    customIshaAngle: value("#customIshaAngle"),
    customIshaMinutes: value("#customIshaMinutes"),
    adjustFajr: value("#adjustFajr"),
    showFajr: value("#showFajr"),
  };

  dom.window.close();
  return values;
}

async function waitFor(read, attempts = 200) {
  for (let i = 0; i < attempts; i += 1) {
    const found = read();
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("the prayer method panel never filled");
}

test("the prayer panel shows the calculator configuration, not a second copy", async () => {
  const values = await openPrayerMethodPanel({
    calculationMethod: "Custom",
    customFajrAngle: 20,
    customIshaAngle: 15,
    customIshaMinutes: true,
    asrMethod: "Hanafi",
    highLatMethod: "AngleBased",
    midnightMethod: "Jafari",
    duhaOffset: 25,
    adjustments: { fajr: 3 },
    prayerVisibility: { fajr: false },
  });

  assert.deepEqual(values, {
    calculationMethod: "Custom",
    asrMethod: "Hanafi",
    highLatMethod: "AngleBased",
    midnightMethod: "Jafari",
    duhaOffset: "25",
    customFajrAngle: "20",
    customIshaAngle: "15",
    customIshaMinutes: true,
    adjustFajr: "3",
    showFajr: false,
  });
});

test("an unset prayer panel shows the calculator's defaults", async () => {
  const values = await openPrayerMethodPanel({});

  assert.deepEqual(values, {
    calculationMethod: "MWL",
    asrMethod: "Standard",
    highLatMethod: "None",
    midnightMethod: "Standard",
    duhaOffset: "20",
    customFajrAngle: "18",
    customIshaAngle: "17",
    customIshaMinutes: false,
    adjustFajr: "0",
    showFajr: true,
  });
});

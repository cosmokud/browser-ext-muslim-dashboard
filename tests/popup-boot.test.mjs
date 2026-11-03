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
import { makeChrome, repoRoot, scriptSrcs } from "./harness.mjs";
import path from "node:path";

const SCRIPTS = scriptSrcs("popup.html");

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

/**
 * Just enough IndexedDB for the popup's cache: stores created on upgrade, one
 * request per call, and every open recorded so the schema is observable.
 */
function makeIndexedDb() {
  const stores = new Map();
  const opens = [];

  const request = (result) => {
    const req = { result };
    setTimeout(() => req.onsuccess?.(), 0);
    return req;
  };

  const store = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const records = stores.get(name);
    return {
      get: (key) => request(records.get(key)),
      put: (record) => {
        records.set(record.key, record);
        return request(record.key);
      },
      getAll: () => request([...records.values()]),
      createIndex() {},
    };
  };

  const db = {
    objectStoreNames: { contains: (name) => stores.has(name) },
    createObjectStore: (name) => {
      stores.set(name, new Map());
      return store(name);
    },
    transaction: () => {
      const tx = { objectStore: (name) => store(name) };
      setTimeout(() => tx.oncomplete?.(), 10);
      return tx;
    },
  };

  return {
    stores,
    opens,
    open: (name, version) => {
      opens.push([name, version]);
      const req = { result: db };
      setTimeout(() => {
        req.onupgradeneeded?.({ target: { result: db } });
        req.onsuccess?.();
      }, 0);
      return req;
    },
  };
}

test("the popup reads and writes the reader's Quran cache", async () => {
  const indexedDb = makeIndexedDb();
  const dom = new JSDOM(fs.readFileSync(path.join(repoRoot, "popup.html"), "utf8"), {
    url: "https://localhost/popup.html",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole: new VirtualConsole(),
  });
  const context = dom.getInternalVMContext();
  dom.window.chrome = makeChrome().chrome;
  dom.window.indexedDB = indexedDb;
  dom.window.fetch = async () => ({ ok: true, json: async () => [] });

  try {
    for (const src of SCRIPTS) {
      if (src.includes("/vendor/")) continue;
      context.eval(fs.readFileSync(path.join(repoRoot, src), "utf8"));
    }
    dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
    await new Promise((resolve) => setTimeout(resolve, 20));

    // jsdom fires its own DOMContentLoaded as well, so the schema is asserted
    // once rather than the number of boots.
    assert.deepEqual(
      [...new Set(indexedDb.opens.map(([name, version]) => `${name}@${version}`))],
      ["MuslimDashboardPocketQuranCache@2"],
      "booting the popup opens the reader's database, at the reader's version",
    );
    assert.deepEqual(
      [...indexedDb.stores.keys()].sort(),
      ["audio", "audioIndex", "json"],
      "the reader's three stores, none added by the popup",
    );

    // The class the popup booted, over the database it opened: one record shape.
    const cache = context.eval("new PocketQuranCacheManager()");
    const url = "https://api.quran.com/api/v4/chapters";
    await cache.setJson(url, "payload", "chapters");
    assert.equal(await cache.getJson(url), "payload");

    // An ayah played in the popup lands under the reader's key, in both stores.
    await cache.setAudio({ key: "7:2:255", size: 3, blob: { size: 3 } });
    assert.ok(indexedDb.stores.get("audio").has("7:2:255"));
    assert.ok(
      indexedDb.stores.get("audioIndex").has("7:2:255"),
      "the LRU entry the reader evicts by",
    );

    const source = fs.readFileSync(path.join(repoRoot, "js/popup.js"), "utf8");
    assert.doesNotMatch(
      source,
      /indexedDB\.open|createObjectStore/,
      "the popup declares no cache schema of its own",
    );
    assert.doesNotMatch(
      source,
      /cache: "no-store"/,
      "no packaged or API request bypasses the cache",
    );
  } finally {
    dom.window.close();
  }
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

async function waitFor(read, message = "the prayer method panel never filled", attempts = 200) {
  for (let i = 0; i < attempts; i += 1) {
    const found = read();
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(message);
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

/**
 * The popup booted over settings the dashboard already saved, and over any
 * other storage key a test seeds. Returns the window so a test can drive it.
 */
async function bootPopup(settings, { storage = {} } = {}) {
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
  for (const [key, value] of Object.entries(storage)) {
    dom.window.localStorage.setItem(
      `muslimDashboard_${key}`,
      JSON.stringify(value),
    );
  }
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
  return dom;
}

/** Settings as the popup itself left them saved. */
function savedSettings(dom) {
  return JSON.parse(dom.window.localStorage.getItem("muslimDashboard_settings"));
}

/**
 * Tajweed is coloured Arabic text, so it exists only for the fonts that carry
 * it; the popup has to gate the toggle and its own state on the chosen font,
 * not trust what was saved.
 */
test("Tajweed is offered only for the fonts that render it", async () => {
  const withoutFont = await bootPopup({
    pocketQuran: { tajweedMode: true },
    pocketQuranPopup: { arabicFontFamily: "Amiri" },
  });
  const toggle = withoutFont.window.document.getElementById(
    "popupPqMiniTajweedToggle",
  );

  try {
    await waitFor(
      () => toggle.disabled,
      "the Tajweed toggle never heard about the font",
    );
    assert.equal(
      toggle.getAttribute("aria-pressed"),
      "false",
      "the popup state carries Tajweed off for a font that cannot render it",
    );
    assert.equal(toggle.getAttribute("aria-disabled"), "true");
    assert.match(toggle.title, /disabled/i);
    assert.equal(
      savedSettings(withoutFont).pocketQuran.tajweedMode,
      true,
      "only the popup state was off; the saved setting is what the toggle must override",
    );

    // jsdom drops .click() on a disabled button, so the click is dispatched:
    // the page's own gate is what has to keep Tajweed off here.
    toggle.dispatchEvent(new withoutFont.window.MouseEvent("click", { bubbles: true }));
    assert.equal(
      toggle.getAttribute("aria-pressed"),
      "false",
      "clicking the toggle cannot turn Tajweed on for this font",
    );
    assert.equal(toggle.classList.contains("active"), false);
  } finally {
    withoutFont.window.close();
  }

  const withFont = await bootPopup({
    pocketQuran: { tajweedMode: true },
    pocketQuranPopup: { arabicFontFamily: "KFGQPC KSA Regular" },
  });
  const allowed = withFont.window.document.getElementById(
    "popupPqMiniTajweedToggle",
  );

  try {
    await waitFor(
      () => allowed.getAttribute("aria-pressed") === "true",
      "the KFGQPC font never got its Tajweed state back",
    );
    assert.equal(allowed.disabled, false);
    assert.equal(allowed.classList.contains("active"), true);
  } finally {
    withFont.window.close();
  }
});

/**
 * A reader can switch the Arabic font at any time, so a font that cannot render
 * Tajweed has to take the saved Tajweed setting down with it.
 */
test("choosing a font that cannot render Tajweed saves it off", async () => {
  const dom = await bootPopup({
    pocketQuran: { tajweedMode: true },
    pocketQuranPopup: { arabicFontFamily: "KFGQPC KSA Regular" },
  });
  const doc = dom.window.document;
  const toggle = doc.getElementById("popupPqMiniTajweedToggle");

  try {
    await waitFor(
      () => toggle.getAttribute("aria-pressed") === "true",
      "the popup never showed Tajweed on for the seeded font",
    );

    doc.getElementById("popupPqArabicSizeLabel").click();
    const option = doc.querySelector(
      '#popupPqFontList [data-popup-pq-font="Amiri"]',
    );
    assert.ok(option, "the font panel offers a font that cannot render Tajweed");
    option.click();

    const saved = savedSettings(dom);
    assert.equal(
      saved.pocketQuran.tajweedMode,
      false,
      "picking that font saved Tajweed off",
    );
    assert.equal(saved.pocketQuranPopup.arabicFontFamily, "Amiri");
    assert.equal(toggle.disabled, true, "the toggle is disabled in the same pass");
  } finally {
    dom.window.close();
  }
});

/**
 * The paste fallback asks for coordinates with an example, and that example is
 * the random one storage handed out, never a string baked into the popup.
 */
test("the coordinate paste prompt offers the example storage picked", async () => {
  const dom = await bootPopup(
    {},
    {
      storage: {
        coordinateExample: {
          latitude: 12.3456,
          longitude: 78.9012,
          text: "12.3456, 78.9012",
        },
      },
    },
  );
  const doc = dom.window.document;
  const prompts = [];
  dom.window.prompt = (message) => {
    prompts.push(message);
    return "";
  };

  try {
    doc.getElementById("popupOpenPrayerSettingsBtn").click();
    const pasteButton = await waitFor(
      () => doc.querySelector("#popupPrayerLocationPanelHost #pasteCoordsBtn"),
      "the location panel never loaded",
    );
    pasteButton.click();

    await waitFor(
      () => prompts.length,
      "the paste button never prompted for coordinates",
    );
    assert.match(prompts[0], /12\.3456, 78\.9012/);
    assert.doesNotMatch(
      prompts[0],
      /40\.7128/,
      "the popup prints no example of its own",
    );
  } finally {
    dom.window.close();
  }
});

/**
 * The search bar's per-engine accent: which icon the colour is read from, when
 * it is recomputed, and where the dominant swatch sits.
 *
 * Replaces tests/search-bar-engine-accent.test.ps1. The manager runs on the
 * dashboard's own markup, the colour scanner is driven through a fake canvas,
 * and the manifest, the boot step and the two stylesheet rules are read as
 * parsed data instead of matched as text.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { JSDOM } from "jsdom";
import { loadPageDom, loadSandbox, repoRoot, withParts } from "./harness.mjs";

const SCRIPTS = withParts([
  "js/theme-tokens.js",
  "js/base-manager.js",
  "js/searchbar.js",
]);

const PAGE_URL = "https://example.com/search?q=%s";
const GOOGLE_ICON =
  "https://www.google.com/s2/favicons?domain_url=https%3A%2F%2Fexample.com%2F&sz=256";
const CACHED_ICON = "data:image/png;base64,Y2FjaGVk";
const DOMINANT = "1, 2, 3";

/** One custom search engine, as the manager stores it. */
function engine(overrides = {}) {
  return {
    id: "web",
    name: "Web",
    url: PAGE_URL,
    favicon: GOOGLE_ICON,
    cachedFavicon: CACHED_ICON,
    accentRgb: null,
    accentRgbSource: "favicon",
    faviconDominantRgb: null,
    ...overrides,
  };
}

/**
 * The manager on the dashboard's markup, over the engines a test seeds.
 * `install` runs before the constructor boots, because the boot itself starts a
 * scan for the selected engine.
 */
function boot(searches = [], install = () => {}) {
  const document = loadPageDom("index.html");
  const window = document.defaultView;
  for (const relPath of SCRIPTS) {
    window.eval(fs.readFileSync(path.join(repoRoot, relPath), "utf8"));
  }
  const browser = install({ document, window }) || {};

  const storage = {
    list: searches.map((record) => ({ ...record })),
    saves: [],
    getCustomSearches() {
      return this.list;
    },
    saveCustomSearches(saved) {
      this.saves.push(JSON.parse(JSON.stringify(saved)));
      this.list = JSON.parse(JSON.stringify(saved));
    },
    getLastCustomSearchId: () => null,
    saveLastCustomSearchId() {},
  };

  const bar = new window.SearchBarManager(storage);
  return { document, window, storage, bar, browser };
}

/** Every icon the manager asked the scanner about, in order. */
function sampledColours(bar, answer = DOMINANT) {
  const samples = [];
  bar._getFaviconDominantRgb = async (url, options = {}) => {
    samples.push({ url, force: options.force === true });
    return typeof answer === "function" ? answer(url) : answer;
  };
  return samples;
}

/** Waits for a condition the manager reaches asynchronously. */
async function settled(condition) {
  for (let i = 0; i < 200; i += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.fail("the manager never settled");
}

/** The last swatch of the open palette, and its label. */
function lastSwatch(bar) {
  const swatches = [...bar.contextMenu.querySelectorAll(".context-menu-swatch")];
  return swatches[swatches.length - 1];
}

/**
 * The icons the scanner sees, through a fake browser: fetch hands back bytes,
 * two Image decodes fire whichever way the test asks, and the canvas returns
 * the pixels it is told to. Everything the scanner did is recorded.
 */
function installBrowser(document, window, options = {}) {
  const {
    pixel = [200, 40, 30, 255],
    decode = "ok",
    canvas = true,
    read = "ok",
    fetch = "ok",
  } = options;
  const calls = { fetch: [], blobTypes: [], imageSrc: [], canvases: 0 };
  let objectUrl = 0;

  window.URL.createObjectURL = () => {
    objectUrl += 1;
    return `blob:sample-${objectUrl}`;
  };
  window.URL.revokeObjectURL = () => {};

  window.fetch = async (url, fetchOptions = {}) => {
    calls.fetch.push({ url: String(url), cache: fetchOptions.cache });
    if (fetch === "throw") throw new Error("no network");
    return { ok: true, status: 200, blob: async () => ({ size: 3 }) };
  };

  window.Image = class {
    set src(value) {
      calls.imageSrc.push(value);
      setTimeout(() => (decode === "ok" ? this.onload?.() : this.onerror?.()), 0);
    }
  };

  const createElement = document.createElement.bind(document);
  document.createElement = (tag, ...rest) => {
    if (String(tag).toLowerCase() !== "canvas") return createElement(tag, ...rest);
    calls.canvases += 1;
    return {
      width: 0,
      height: 0,
      getContext: () =>
        canvas
          ? {
              clearRect() {},
              drawImage() {},
              getImageData: () => {
                if (read === "throw") throw new Error("tainted canvas");
                return { data: new Uint8ClampedArray(pixel) };
              },
            }
          : null,
      toBlob(callback, type) {
        calls.blobTypes.push(type);
        setTimeout(() => callback({ size: 3 }), 0);
      },
    };
  };

  return calls;
}

test("the accent is read from the icon the strip shows", async () => {
  const withCached = boot([engine()]);
  const cachedSamples = sampledColours(withCached.bar);
  await withCached.bar._ensureDefaultAccentForEngine(withCached.bar.searches[0]);
  assert.equal(cachedSamples.at(-1).url, CACHED_ICON, "the downloaded bytes, not Google");

  const withFavicon = boot([engine({ cachedFavicon: null })]);
  const faviconSamples = sampledColours(withFavicon.bar);
  await withFavicon.bar._ensureDefaultAccentForEngine(withFavicon.bar.searches[0]);
  assert.equal(faviconSamples.at(-1).url, GOOGLE_ICON, "the icon it would display");

  const bare = boot([engine({ cachedFavicon: null, favicon: null })], (page) =>
    installBrowser(page.document, page.window),
  );
  const templateSamples = sampledColours(bare.bar);
  await bare.bar._ensureDefaultAccentForEngine(bare.bar.searches[0]);
  assert.match(templateSamples.at(-1).url, /^https:\/\/www\.google\.com\/s2\/favicons\?/);

  // The swatch is sampled from the same icon, so the colour cannot disagree.
  templateSamples.length = 0;
  bare.bar.showContextMenu(10, 10, bare.bar.searches[0].id);
  await settled(() => templateSamples.length > 0);
  assert.match(templateSamples.at(-1).url, /^https:\/\/www\.google\.com\/s2\/favicons\?/);
});

test("a scan records the colour without overwriting a chosen accent", async () => {
  const env = boot([engine({ accentRgb: "9, 9, 9", accentRgbSource: "custom" })]);
  sampledColours(env.bar);

  await env.bar._ensureDefaultAccentForEngine(env.bar.searches[0]);

  assert.equal(env.bar.searches[0].faviconDominantRgb, DOMINANT, "kept for the swatch");
  assert.equal(env.bar.searches[0].accentRgb, "9, 9, 9", "the user's colour stands");
  assert.equal(env.bar.searches[0].accentRgbSource, "custom");
});

test("a scanned colour becomes the engine's accent and the shell variable", async () => {
  const env = boot([engine()]);
  sampledColours(env.bar);

  await env.bar._ensureDefaultAccentForEngine(env.bar.searches[0]);

  assert.equal(env.bar.searches[0].accentRgb, DOMINANT);
  assert.equal(env.bar.searches[0].accentRgbSource, "favicon");
  assert.equal(env.bar.shell.style.getPropertyValue("--sb-accent-rgb"), DOMINANT);
});

test("a manual colour is remembered as custom, a scanned one as favicon", () => {
  const env = boot([engine()]);

  env.bar.setEngineAccent("web", "3, 4, 5");
  assert.equal(env.bar.searches[0].accentRgbSource, "custom");

  env.bar.setEngineAccent("web", "3, 4, 5", { source: "favicon" });
  assert.equal(env.bar.searches[0].accentRgbSource, "favicon");
});

test("the chosen accent and the favicon colour survive a reload separately", () => {
  const env = boot([
    engine({ accentRgb: "10, 20, 30", accentRgbSource: "custom", faviconDominantRgb: "40, 50, 60" }),
  ]);

  const [loaded] = env.bar.searches;
  assert.equal(loaded.accentRgb, "10, 20, 30");
  assert.equal(loaded.faviconDominantRgb, "40, 50, 60", "not the selected accent");
});

test("the accent menu offers Dominant color directly under Custom color", () => {
  const env = boot([engine()]);
  const custom = env.bar.contextMenu.querySelector(".context-menu-accent-custom");
  const dominant = env.bar.contextMenu.querySelector(".context-menu-accent-dominant");

  assert.ok(custom && dominant, "both entries exist");
  const label = (entry) => entry.lastElementChild.textContent.trim();
  assert.equal(label(custom), "Custom color…");
  assert.equal(label(dominant), "Dominant color");
  assert.equal(
    custom.compareDocumentPosition(dominant) & env.document.defaultView.Node.DOCUMENT_POSITION_FOLLOWING,
    env.document.defaultView.Node.DOCUMENT_POSITION_FOLLOWING,
    "Dominant color comes after Custom color",
  );
});

test("the Dominant color entry refreshes the icon and applies its colour", async () => {
  const env = boot([engine()], (page) => installBrowser(page.document, page.window));
  const refreshed = "data:image/png;base64,cmVmcmVzaGVk";
  const refreshedUrls = [];
  env.window.faviconCache = {
    refreshFromGoogle: async (url, type) => {
      refreshedUrls.push({ url, type });
      return refreshed;
    },
  };
  const samples = sampledColours(env.bar, "7, 8, 9");
  env.bar.showContextMenu(10, 10, "web");
  // Opening the menu already refreshes the same icon; the click's own refresh follows.
  await settled(() => samples.length > 1);
  refreshedUrls.length = 0;
  samples.length = 0;

  env.bar.contextMenu.querySelector(".context-menu-accent-dominant").click();
  await settled(() =>
    samples.some((sample) => sample.url === refreshed && sample.force === true),
  );

  assert.deepEqual(refreshedUrls, [{ url: PAGE_URL, type: "search" }], "the icon is fetched first");
  assert.equal(env.bar.searches[0].cachedFavicon, refreshed, "and kept for the strip");
  const scan = samples.find((sample) => sample.url === refreshed && sample.force);
  assert.ok(scan, "the refreshed icon was scanned with a forced read");
  assert.equal(env.bar.searches[0].accentRgb, "7, 8, 9");
  assert.equal(env.bar.searches[0].accentRgbSource, "favicon");
  assert.equal(env.bar.contextMenu.classList.contains("active"), false, "the menu closed");
});

test("a remembered favicon colour fills the last swatch while the refresh runs", async () => {
  const env = boot(
    [engine({ accentRgb: "9, 9, 9", accentRgbSource: "custom", faviconDominantRgb: DOMINANT })],
    (page) => installBrowser(page.document, page.window),
  );
  // Never resolves: the palette is read before the fresh scan lands.
  env.bar._getFaviconDominantRgb = () => new Promise(() => {});

  env.bar.showContextMenu(10, 10, "web");

  const swatches = [...env.bar.contextMenu.querySelectorAll(".context-menu-swatch")];
  assert.equal(swatches.length, 30, "a full palette plus the dominant one");
  assert.equal(swatches.at(-1).dataset.rgb, DOMINANT);
  assert.equal(swatches.at(-1).getAttribute("title"), "Dominant favicon color");
  assert.deepEqual(
    swatches.slice(0, -1).map((swatch) => swatch.getAttribute("title")),
    Array(29).fill(""),
    "only the bottom-right swatch claims to be the favicon's",
  );
});

test("without a favicon colour the palette has no dominant swatch", async () => {
  const env = boot([engine()], (page) => installBrowser(page.document, page.window));
  env.bar._getFaviconDominantRgb = () => new Promise(() => {});

  env.bar.showContextMenu(10, 10, "web");

  const swatches = [...env.bar.contextMenu.querySelectorAll(".context-menu-swatch")];
  assert.equal(swatches.length, 29, "the generated row only");
  assert.equal(env.bar.contextMenu.querySelector('[title="Dominant favicon color"]'), null);
});

test("a fresh scan puts its colour in the last swatch and keeps it", async () => {
  const env = boot([engine()], (page) => installBrowser(page.document, page.window));
  sampledColours(env.bar, "4, 5, 6");

  env.bar.showContextMenu(10, 10, "web");
  await settled(() => lastSwatch(env.bar).dataset.rgb === "4, 5, 6");

  assert.equal(
    [...env.bar.contextMenu.querySelectorAll(".context-menu-swatch")].length,
    30,
    "the scanned colour replaced the plain row",
  );
  assert.equal(env.bar.searches[0].faviconDominantRgb, "4, 5, 6");
  assert.equal(env.bar.searches[0].accentRgb, "4, 5, 6", "promoted as the engine accent");
});

test("a cached icon refreshes the selected engine's accent, never a chosen one", async () => {
  const env = boot([engine()], (page) => installBrowser(page.document, page.window));
  const cached = "data:image/png;base64,bGF0ZXI=";
  env.window.faviconCache = { getCached: async () => cached };
  const ensures = [];
  env.bar._ensureDefaultAccentForEngine = async (target) => ensures.push(target.id);

  await env.bar.loadCachedFaviconForEngine(env.bar.searches[0], {
    querySelector: () => null,
  });
  assert.equal(env.bar.searches[0].cachedFavicon, cached);
  assert.deepEqual(ensures, ["web"]);

  const custom = boot([engine({ cachedFavicon: null, accentRgbSource: "custom" })], (page) =>
    installBrowser(page.document, page.window),
  );
  custom.window.faviconCache = { getCached: async () => cached };
  const customEnsures = [];
  custom.bar._ensureDefaultAccentForEngine = async (target) => customEnsures.push(target.id);
  await custom.bar.loadCachedFaviconForEngine(custom.bar.searches[0], {
    querySelector: () => null,
  });
  assert.deepEqual(customEnsures, [], "a chosen colour is not re-derived");
});

test("applying an accent writes the variable and re-derives a stale colour", () => {
  const env = boot([engine()], (page) => installBrowser(page.document, page.window));
  const ensures = [];
  env.bar._ensureDefaultAccentForEngine = async (target) => ensures.push(target.id);

  env.bar.applyEngineAccent({ ...env.bar.searches[0], accentRgb: "999, 2, 3" });
  assert.equal(
    env.bar.shell.style.getPropertyValue("--sb-accent-rgb"),
    "255, 2, 3",
    "out-of-range channels are clamped",
  );
  assert.deepEqual(ensures, ["web"]);

  env.bar.applyEngineAccent({ ...env.bar.searches[0], accentRgbSource: "custom" });
  assert.deepEqual(ensures, ["web"], "a chosen colour is left alone");
});

test("a new engine has its colour before the final render", async () => {
  const env = boot([], (page) => installBrowser(page.document, page.window));
  const icon = "data:image/png;base64,bmV3";
  env.window.faviconCache = { fetchAndCache: async () => icon };
  const order = [];
  env.bar._ensureDefaultAccentForEngine = async (target, options) => {
    order.push({ step: "accent", id: target.id, force: options?.force === true });
  };
  env.bar.render = () => order.push({ step: "render" });
  env.bar.hideAddModal = () => {};
  env.bar.newName.value = "Mine";
  env.bar.newUrl.value = "https://mine.example/?q=%s";

  await env.bar.addCustomSearchFromModal();

  assert.deepEqual(
    order.map((entry) => entry.step),
    ["accent", "render"],
    "the colour is known before the strip is drawn",
  );
  assert.equal(order[0].force, true, "a new engine is scanned fresh");
  assert.equal(env.bar.searches[0].cachedFavicon, icon);
  assert.equal(env.bar.selectedId, env.bar.searches[0].id);
});

test("saving an edit rescans only when the icon changed", async () => {
  const withIcon = boot([engine()], (page) => installBrowser(page.document, page.window));
  const scans = [];
  withIcon.bar._ensureDefaultAccentForEngine = async (target, options) =>
    scans.push(options?.force === true);
  withIcon.bar.render = () => {};
  withIcon.bar.hideEditModal = () => {};
  withIcon.bar.editIdInput.value = "web";
  withIcon.bar.editName.value = "Web";
  withIcon.bar.editUrl.value = PAGE_URL;
  withIcon.bar.pendingFaviconDataUrl = "data:image/png;base64,bWluZQ==";

  await withIcon.bar.updateCustomSearchFromModal();
  assert.deepEqual(scans, [true], "a new icon is scanned fresh");

  const sameIcon = boot([engine()], (page) => installBrowser(page.document, page.window));
  const sameScans = [];
  sameIcon.bar._ensureDefaultAccentForEngine = async (target, options) =>
    sameScans.push(options?.force === true);
  sameIcon.bar.render = () => {};
  sameIcon.bar.hideEditModal = () => {};
  sameIcon.bar.editIdInput.value = "web";
  sameIcon.bar.editName.value = "Web";
  sameIcon.bar.editUrl.value = PAGE_URL;

  await sameIcon.bar.updateCustomSearchFromModal();
  assert.deepEqual(sameScans, [false], "the remembered colour is reused");
});

test("opening the accent menu forces a fresh colour for that engine", () => {
  const env = boot([engine()], (page) => installBrowser(page.document, page.window));
  const renders = [];
  env.bar._renderAccentPaletteForEngine = (engineId, options) =>
    renders.push(JSON.parse(JSON.stringify({ engineId, options })));

  env.bar.showContextMenu(10, 10, "web");

  assert.deepEqual(renders, [
    { engineId: "web", options: { refreshDominant: true, applyDominant: true } },
  ]);
});

test("a forced scan skips both remembered colours and the browser cache", async () => {
  const env = boot([], (page) =>
    installBrowser(page.document, page.window, { pixel: [11, 22, 33, 255] }),
  );
  const manager = env.bar;
  manager.faviconDominantCache.set(GOOGLE_ICON, "1, 1, 1");

  assert.equal(await manager._getFaviconDominantRgb(GOOGLE_ICON), "1, 1, 1");
  assert.equal(env.browser.fetch.length, 0, "the remembered colour needs no bytes");

  assert.equal(await manager._getFaviconDominantRgb(GOOGLE_ICON, { force: true }), "11, 22, 33");
  assert.equal(manager.faviconDominantCache.get(GOOGLE_ICON), "11, 22, 33", "and is replaced");
  assert.equal(env.browser.fetch.length, 1);
  assert.match(
    env.browser.fetch[0].url,
    /_sb_favicon_color_refresh=\d+$/,
    "a URL the browser cannot answer from its cache",
  );
  assert.equal(env.browser.fetch[0].cache, "reload", "and a reload, not the browser copy");
});

test("a favicon is decoded onto a canvas and re-exported as PNG before it is sampled", async () => {
  const env = boot([], (page) =>
    installBrowser(page.document, page.window, { pixel: [90, 80, 70, 255] }),
  );
  const calls = env.browser;

  const rgb = await env.bar._getFaviconDominantRgb(GOOGLE_ICON);

  assert.equal(rgb, "90, 80, 70", "the pixels of the decoded image");
  assert.deepEqual(calls.blobTypes, ["image/png"], "exactly one PNG export");
  assert.equal(calls.canvases, 2, "one canvas to normalise, one to read");
  assert.equal(calls.imageSrc.length, 2, "the raw bytes, then the PNG");
  assert.match(calls.imageSrc[0], /^blob:/);
  assert.match(calls.imageSrc[1], /^blob:/);
  assert.notEqual(calls.imageSrc[0], calls.imageSrc[1]);
});

test("the scanner buckets its pixels and ignores the background", () => {
  const env = boot([], (page) => installBrowser(page.document, page.window));
  const bar = env.bar;
  const pixels = (list) => ({ data: new Uint8ClampedArray(list.flat()) });
  const white = [250, 250, 250, 255];
  const green = [20, 190, 60, 255];

  assert.deepEqual(
    [...bar._getDominantFaviconRgbFromImageData(pixels([white, white, green, white]))],
    [20, 190, 60],
  );
  assert.equal(
    bar._getDominantFaviconRgbFromImageData(pixels([[200, 20, 20, 0]])),
    null,
    "a transparent pixel is not a colour",
  );
  assert.deepEqual(
    [...bar._getDominantFaviconRgbFromImageData(pixels([[20, 190, 60, 10]]))],
    [20, 190, 60],
    "a faint pixel is only picked by the last, unfiltered pass",
  );
  assert.deepEqual(
    [...bar._getDominantFaviconRgbFromImageData(pixels([white, white]))],
    [250, 250, 250],
    "an image that is all background still answers instead of failing",
  );

  // The strict pass drops background and blacks; the loose pass keeps them.
  assert.equal(
    bar._pickDominantFaviconRgb(new Uint8ClampedArray(white), { minAlpha: 24 }),
    null,
    "one all-white pixel, background filter on",
  );
  assert.deepEqual(
    [
      ...bar._pickDominantFaviconRgb(new Uint8ClampedArray([0, 0, 0, 255]), {
        ignoreNearBlack: false,
      }),
    ],
    [0, 0, 0],
  );
});

test("each way a scan can fail names its own reason", async () => {
  const cases = [
    ["fetch", { fetch: "throw" }, "Favicon dominant color failed: favicon fetch failed."],
    ["decode", { decode: "fail" }, "Favicon dominant color failed: favicon image decode failed."],
    ["canvas", { canvas: false }, "Favicon dominant color failed: canvas is unavailable."],
    ["read", { read: "throw" }, "Favicon dominant color failed: canvas pixel read failed."],
    [
      "blank",
      { pixel: [0, 0, 0, 0] },
      "Favicon dominant color failed: favicon has no visible pixels.",
    ],
  ];

  for (const [name, options, reason] of cases) {
    const env = boot([], (page) => installBrowser(page.document, page.window, options));
    assert.equal(await env.bar._getFaviconDominantRgb(GOOGLE_ICON), null, name);
    assert.equal(env.bar.faviconDominantFailureReason, reason, name);
  }

  // A scan that works leaves the last failure behind.
  const ok = boot([], (page) => installBrowser(page.document, page.window));
  ok.bar.faviconDominantFailureReason = "stale";
  assert.equal(await ok.bar._getFaviconDominantRgb(GOOGLE_ICON), "200, 40, 30");
  assert.equal(ok.bar.faviconDominantFailureReason, null);
});

test("a failed dominant-color request tells the user which step failed", async () => {
  const env = boot(
    [engine({ cachedFavicon: null })],
    (page) => installBrowser(page.document, page.window, { fetch: "throw" }),
  );
  const notices = [];
  env.bar.notify = (message, type) => notices.push({ message, type });

  await env.bar.applyDominantAccentForEngine("web");

  assert.deepEqual(notices, [
    {
      message: "Favicon dominant color failed: favicon fetch failed.",
      type: "error",
    },
  ]);
});

test("no vendor colour library ships with the dashboard", () => {
  const document = loadPageDom("index.html");
  const srcs = [...document.querySelectorAll("script[src]")].map((script) =>
    script.getAttribute("src"),
  );

  assert.deepEqual(
    srcs.filter((src) => /color-thief|fast-average-color/.test(src)),
    [],
    "the page loads neither adapter",
  );
  for (const name of ["color-thief", "fast-average-color"]) {
    assert.equal(
      fs.existsSync(path.join(repoRoot, "js/vendor", `${name}.js`)),
      false,
      `${name} is gone from js/vendor`,
    );
  }
});

test("the manifest lets the redirected favicon host be read", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "manifest.json"), "utf8"),
  );

  assert.ok(
    manifest.host_permissions.includes("https://*.gstatic.com/*"),
    "Google serves the icon bytes from a gstatic host",
  );
  assert.ok(manifest.host_permissions.includes("https://www.google.com/s2/*"));
});

test("startup caches every pinned app and search engine icon", async () => {
  // Boot order is data: the step is read, not the boot it belongs to.
  const sandbox = loadSandbox(["js/app/index.js", "js/app/boot.js"], {
    globals: { document: { addEventListener() {} } },
  });
  const steps = vm.runInContext("BOOT_STEPS", sandbox);
  const step = steps.find((candidate) => candidate.name === "favicons");
  assert.ok(step, "no favicons boot step");
  assert.deepEqual([...step.needs], ["pinnedApps", "searchBar"], "it runs after both exist");

  const calls = [];
  sandbox.faviconCache = {
    initializeAll: async (apps, searches) => calls.push({ apps, searches }),
  };
  const apps = [{ url: "https://app.example/" }];
  const searches = [{ url: PAGE_URL }];
  step.run.call({ pinnedApps: { apps }, searchBar: { searches } });

  assert.deepEqual(calls, [{ apps, searches }]);
});

/** The rule for one selector, as the browser parsed the shipped stylesheet. */
function ruleFor(selector) {
  const css = fs.readFileSync(path.join(repoRoot, "css/styles.css"), "utf8");
  const dom = new JSDOM(`<style>${css}</style>`, { url: "https://localhost/" });
  const sheet = dom.window.document.styleSheets[0];
  const rule = [...sheet.cssRules].find((candidate) => candidate.selectorText === selector);
  assert.ok(rule, `no ${selector} rule`);
  return rule.style;
}

test("the caret and the button glow follow the selected accent", () => {
  assert.equal(
    ruleFor(".search-bar-input").getPropertyValue("caret-color"),
    "rgb(var(--sb-accent-rgb))",
    "typing shows the engine's colour",
  );

  assert.match(
    ruleFor(".search-bar-btn").getPropertyValue("transition"),
    /box-shadow var\(--transition-fast\)/,
    "the glow animates in",
  );
  assert.match(
    ruleFor(".search-bar-btn:hover").getPropertyValue("box-shadow"),
    /^0 0 0 3px rgba\(var\(--sb-accent-rgb\), 0\.\d+\)$/,
    "and it is the accent's colour",
  );
});

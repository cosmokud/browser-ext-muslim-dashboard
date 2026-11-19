/**
 * Theme Token Integrity: enforces canonical semantic color tokens, prevents
 * broken/undefined CSS custom properties and invalid rgba(var(...)) channel
 * usage, guards against default emerald/gold palette leaks, verifies single
 * source of truth for the Tajweed palette, checks themed SW badge resolution,
 * weather canvas light/dark token wiring, and Lunar Phase SVG clipPath IDs.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {
  assertRootDeclaration,
  assertRule,
  jsFiles,
  loadSandbox,
  localDay,
  makeChrome,
  makePage,
  repoRoot,
  ruleFor,
  scriptSrcs,
} from "./harness.mjs";

const STYLES_CSS = fs.readFileSync(
  path.join(repoRoot, "css/styles.css"),
  "utf8",
);
const POPUP_CSS = fs.readFileSync(
  path.join(repoRoot, "css/popup.css"),
  "utf8",
);
const CSS_FILES = [
  ["css/styles.css", STYLES_CSS],
  ["css/popup.css", POPUP_CSS],
];

function collectDefinedCssVars() {
  const defined = new Set();

  // 1. All CSS custom property declarations in css/styles.css and css/popup.css
  for (const [, source] of CSS_FILES) {
    for (const match of source.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)) {
      defined.add(match[1]);
    }
  }

  // 2. All CSS custom property names written by JS files
  for (const relPath of jsFiles()) {
    const source = fs.readFileSync(path.join(repoRoot, relPath), "utf8");
    for (const match of source.matchAll(/["'`](--[a-zA-Z0-9_-]+)["'`]/g)) {
      defined.add(match[1]);
    }
  }

  // 3. Dynamic --pq-tajweed-<rule> hooks written by PocketQuran text-styling.js
  const tokensSandbox = loadSandbox([
    "js/settings-registry.js",
    "js/theme-tokens.js",
  ]);
  const tajweedKeys = Object.keys(
    tokensSandbox.ThemeTokens.DEFAULT_TAJWEED_COLORS,
  );
  for (const key of tajweedKeys) {
    defined.add(`--pq-tajweed-${key}`);
  }

  return defined;
}

test("canonical semantic status, elevation, and channel tokens are declared on :root and light mode", () => {
  const rootExpectations = {
    "--color-danger": "#ff6b6b",
    "--color-danger-text": "#ff9a9a",
    "--color-danger-bg": "rgba(255, 107, 107, 0.18)",
    "--color-danger-border": "rgba(255, 107, 107, 0.48)",
    "--color-success": "#4ade80",
    "--color-success-text": "#86efac",
    "--color-success-bg": "rgba(74, 222, 128, 0.18)",
    "--color-success-border": "rgba(74, 222, 128, 0.48)",
    "--color-warning": "#f59e0b",
    "--color-warning-text": "#fcd34d",
    "--color-warning-bg": "rgba(245, 158, 11, 0.32)",
    "--color-warning-border": "rgba(245, 158, 11, 0.52)",
    "--color-info": "#60a5fa",
    "--color-info-text": "#93c5fd",
    "--color-info-bg": "rgba(96, 165, 250, 0.18)",
    "--color-info-border": "rgba(96, 165, 250, 0.48)",
    "--shadow-lg": "0 24px 60px rgba(0, 0, 0, 0.42)",
    "--primary-rgb": "26, 95, 74",
    "--primary-light-rgb": "45, 138, 110",
    "--primary-dark-rgb": "13, 61, 46",
    "--accent-gold-rgb": "212, 175, 55",
    "--accent-bg-rgb": "212, 175, 55",
  };

  for (const [token, value] of Object.entries(rootExpectations)) {
    assertRootDeclaration(token, value);
  }

  const lightRule = ruleFor('[data-theme-mode="light"]');
  assert.ok(lightRule, "light mode root rule exists");
  for (const token of [
    "--color-danger",
    "--color-danger-text",
    "--color-danger-bg",
    "--color-danger-border",
    "--color-success",
    "--color-success-text",
    "--color-success-bg",
    "--color-success-border",
    "--color-warning",
    "--color-warning-text",
    "--color-warning-bg",
    "--color-warning-border",
    "--color-info",
    "--color-info-text",
    "--color-info-bg",
    "--color-info-border",
    "--shadow-lg",
  ]) {
    assert.ok(
      lightRule.style.getPropertyValue(token).trim().length > 0,
      `[data-theme-mode="light"] defines ${token}`,
    );
  }
});

test("zero broken or undefined var(--...) references exist in css/styles.css and css/popup.css", () => {
  const defined = collectDefinedCssVars();
  const undefinedRefs = [];

  for (const [relPath, source] of CSS_FILES) {
    const lines = source.split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const match of line.matchAll(
        /var\(\s*(--[a-zA-Z0-9_-]+)(\s*,[^)]*)?\)/g,
      )) {
        const name = match[1];
        if (!defined.has(name)) {
          undefinedRefs.push(`${relPath}:${index + 1} uses undefined ${name}`);
        }
      }
    });
  }

  assert.deepEqual(
    undefinedRefs,
    [],
    "every var(--...) in css/styles.css and css/popup.css must resolve to a defined CSS or JS token",
  );

  for (const legacyBroken of [
    "--error-color",
    "--success-color",
    "--action-btn-hover-color",
    "--action-btn-hover-border",
    "--accent-gold-light-",
    "--card-bg",
  ]) {
    for (const [relPath, source] of CSS_FILES) {
      assert.equal(
        source.includes(legacyBroken),
        false,
        `legacy broken variable ${legacyBroken} must not remain in ${relPath}`,
      );
    }
  }
});

test("zero invalid rgba(var(--...)) calls reference non-*-rgb tokens in css/styles.css and css/popup.css", () => {
  const invalid = [];
  for (const [relPath, source] of CSS_FILES) {
    source.split(/\r?\n/).forEach((line, index) => {
      for (const match of line.matchAll(/rgba\(\s*var\(\s*(--[a-zA-Z0-9_-]+)/g)) {
        if (!match[1].endsWith("-rgb")) {
          invalid.push(`${relPath}:${index + 1}: rgba(var(${match[1]}))`);
        }
      }
    });
  }

  assert.deepEqual(
    invalid,
    [],
    "rgba(var(...)) must only reference *-rgb channel triplet tokens",
  );
});

test("zero hardcoded default emerald/gold rgba leaks remain in css/styles.css and css/popup.css", () => {
  const leaks = [];
  const leakPattern = /rgba\(\s*(26\s*,\s*95\s*,\s*74|212\s*,\s*175\s*,\s*55)/;

  for (const [relPath, source] of CSS_FILES) {
    source.split(/\r?\n/).forEach((line, index) => {
      if (leakPattern.test(line)) {
        leaks.push(`${relPath}:${index + 1}: ${line.trim()}`);
      }
    });
  }

  assert.deepEqual(
    leaks,
    [],
    "use rgba(var(--primary-rgb), ...) and rgba(var(--accent-gold-rgb), ...) instead of literal emerald/gold rgba values",
  );
});

test("every nonzero backdrop-filter blur() in css/styles.css and css/popup.css scales by var(--ui-blur-multiplier)", () => {
  const unscaled = [];
  const declPattern = /(-webkit-)?backdrop-filter\s*:\s*([^;]+);/gi;

  for (const [relPath, source] of CSS_FILES) {
    for (const match of source.matchAll(declPattern)) {
      const value = match[2].replace(/\s+/g, " ").trim();
      if (!/blur\(/i.test(value)) continue;
      if (/^blur\(\s*0(?:px)?\s*\)$/i.test(value)) continue;
      if (!/var\(--ui-blur-multiplier\b/.test(value)) {
        const line = source.slice(0, match.index).split(/\r?\n/).length;
        unscaled.push(
          `${relPath}:${line}: ${match[1] ?? ""}backdrop-filter: ${value}`,
        );
      }
    }
  }

  assert.deepEqual(
    unscaled,
    [],
    "every nonzero backdrop-filter blur(...) must multiply by var(--ui-blur-multiplier)",
  );
});

test("weather chart tabs read --weather-metric-* tokens and canvas reads computed theme tokens", () => {
  const expectedBgMix = {
    temperature: "color-mix(in srgb, var(--weather-metric-temperature) 10%, transparent)",
    humidity: "color-mix(in srgb, var(--weather-metric-humidity) 10%, transparent)",
    precipitation: "color-mix(in srgb, var(--weather-metric-precipitation) 12%, transparent)",
    wind: "color-mix(in srgb, var(--weather-metric-wind) 10%, transparent)",
  };

  for (const [metric, bg] of Object.entries(expectedBgMix)) {
    assertRule(`.weather-chart-tab[data-metric="${metric}"].active`, {
      "border-color": `var(--weather-metric-${metric})`,
      background: bg,
    });
    assertRule(`.weather-chart-tab[data-metric="${metric}"]:not(.active):hover`, {
      "border-color": `color-mix(in srgb, var(--weather-metric-${metric}) 45%, transparent)`,
    });
  }

  const hourlySource = fs.readFileSync(
    path.join(repoRoot, "js/weather/hourly-chart.js"),
    "utf8",
  );
  assert.equal(/\bbarColor\b/.test(hourlySource), false, "dead barColor variable removed");
  for (const cssVar of [
    "--text-primary",
    "--text-muted",
    "--glass-bg",
    "--glass-border",
  ]) {
    assert.ok(
      hourlySource.includes(cssVar),
      `js/weather/hourly-chart.js resolves ${cssVar}`,
    );
  }
});

test("ThemeTokens.DEFAULT_TAJWEED_COLORS is the single source shared by StorageManager and PocketQuranManager", () => {
  for (const page of ["index.html", "popup.html"]) {
    const srcs = scriptSrcs(page);
    const tokensIdx = srcs.indexOf("js/theme-tokens.js");
    const storageIdx = srcs.indexOf("js/storage.js");
    const pqIdx = srcs.indexOf("js/pocketquran/index.js");
    assert.ok(tokensIdx >= 0, `${page} loads js/theme-tokens.js`);
    assert.ok(
      tokensIdx < storageIdx,
      `${page} loads js/theme-tokens.js before js/storage.js`,
    );
    assert.ok(
      tokensIdx < pqIdx,
      `${page} loads js/theme-tokens.js before js/pocketquran/index.js`,
    );
  }

  const sandbox = loadSandbox(
    [
      "js/settings-registry.js",
      "js/theme-tokens.js",
      "js/storage.js",
      "js/base-manager.js",
      "js/pocketquran/index.js",
    ],
    {
      globals: {
        localStorage: {
          getItem: () => null,
          setItem() {},
          removeItem() {},
          clear() {},
          key: () => null,
          length: 0,
        },
      },
    },
  );

  const storage = new sandbox.StorageManager();
  const defaults = storage.getDefaultSettings().pocketQuran.tajweedColors;
  const canonical = sandbox.ThemeTokens.DEFAULT_TAJWEED_COLORS;
  const PocketQuranManager = vm.runInContext("PocketQuranManager", sandbox);
  const pqDefaults = PocketQuranManager.DEFAULT_TAJWEED_COLORS;

  assert.equal(Object.keys(canonical).length, 16);
  assert.equal(pqDefaults, canonical);
  assert.deepEqual(defaults, canonical);
  assert.notEqual(
    defaults,
    canonical,
    "StorageManager returns a fresh clone so callers cannot mutate the canonical table",
  );
});

test("ThemeManager persists active badge colors and service worker applies them instead of hardcoded emerald", async () => {
  const page = makePage();
  const store = new Map();
  const localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    key: (idx) => [...store.keys()][idx] ?? null,
    get length() {
      return store.size;
    },
  };

  const pageSandbox = loadSandbox(
    [
      "js/settings-registry.js",
      "js/theme-tokens.js",
      "js/storage.js",
      "js/themes.js",
    ],
    {
      globals: {
        ...page,
        localStorage,
        CustomEvent: globalThis.CustomEvent,
      },
    },
  );

  const storage = new pageSandbox.StorageManager();
  const themes = new pageSandbox.ThemeManager(storage);
  themes.setTheme("sapphire", true);

  const persisted = storage.getSettings();
  assert.equal(persisted.theme.badgeBg, "#0e2a4f");
  assert.equal(persisted.theme.badgeText, "#ffffff");

  const { chrome, calls } = makeChrome({
    stored: {
      md_settings: {
        ...persisted,
        showExtensionBadgeCountdown: true,
        locationMethod: "manual",
        latitude: -6.2,
        longitude: 106.8,
        city: "Jakarta",
      },
      md_lastLocation: null,
    },
  });

  const worker = loadSandbox(["js/service-worker.js"], {
    window: false,
    now: localDay(2026, 2, 18, 9, 0),
    globals: { chrome },
  });

  await worker.updateActionPrayerCountdownBadge();
  assert.equal(calls.badgeBackgroundColors.at(-1)?.color, "#0e2a4f");
  assert.equal(calls.badgeTextColors.at(-1)?.color, "#ffffff");
});

test("lunar phase SVG clip-path references match defined <clipPath> IDs", () => {
  const sandbox = loadSandbox(["js/base-manager.js", "js/lunarphase.js"]);
  const LunarPhaseManager = vm.runInContext("LunarPhaseManager", sandbox);
  const instance = Object.create(LunarPhaseManager.prototype);

  for (const phaseFraction of [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.9]) {
    const svg = instance._renderMoonSvg({
      illumination: 0.5,
      positionAngle: 0.4,
      diskRotation: 0.1,
      phaseFraction,
    });

    const definedIds = new Set(
      [...svg.matchAll(/<clipPath\s+[^>]*id="([^"]+)"/g)].map((m) => m[1]),
    );
    const referencedIds = [
      ...svg.matchAll(/clip-path="url\(#([^)]+)\)"/g),
    ].map((m) => m[1]);

    assert.ok(
      referencedIds.length >= 2,
      `expected disk and terminator clip-path references for phase ${phaseFraction}`,
    );
    for (const id of referencedIds) {
      assert.ok(
        definedIds.has(id),
        `clip-path="url(#${id})" must match a defined <clipPath id="${id}"> for phase ${phaseFraction}`,
      );
    }
  }
});

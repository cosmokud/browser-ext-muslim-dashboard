/**
 * A setting's rule is declared once: the registry holds the default and the
 * coercion, and the settings blob and the loader read it from there. The
 * defaults asserted below are the values the code shipped before the registry,
 * so a mistake in a rule shows up as a changed default.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { loadSandbox } from "./harness.mjs";

const FILES = ["js/settings-registry.js", "js/storage.js"];

function makeLocalStorage(stored = {}) {
  const map = new Map(
    Object.entries(stored).map(([key, value]) => [key, JSON.stringify(value)]),
  );

  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear(),
    key: (index) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  };
}

function load(stored) {
  const sandbox = loadSandbox(FILES, {
    globals: { localStorage: makeLocalStorage(stored) },
  });
  return {
    registry: sandbox.SettingsRegistry,
    storage: new sandbox.StorageManager(),
  };
}

test("a rule coerces on its own, without a panel or a blob", () => {
  const { registry } = load();

  assert.equal(registry.coerce("bgDim", 999), 100, "over the top");
  assert.equal(registry.coerce("bgDim", -5), 0, "under the bottom");
  assert.equal(registry.coerce("bgDim", 42.6), 43, "the loader rounded this one");
  assert.equal(registry.coerce("bgDim", "nonsense"), 100, "junk becomes the default");
  assert.equal(registry.coerce("bgBlur", 99), 40);
  assert.equal(registry.coerce("glassOpacity", 150), 100);
  assert.equal(registry.coerce("blurPower", -1), 0);
  assert.equal(registry.coerce("blurPower", 5000), 200);

  assert.equal(registry.coerce("pinnedAppsPerRow", 99), 20);
  assert.equal(registry.coerce("pinnedAppsPerRow", 1), 3);
  assert.equal(
    registry.coerce("pinnedAppsPerRow", 3.4),
    3.4,
    "a per-row count was never rounded",
  );
  assert.equal(
    registry.coerce("pinnedAppsPerRow", null),
    3,
    "null counts as 0, as the old clamp did",
  );

  assert.equal(registry.coerce("arabicFontSize", 7), 8);
  assert.equal(registry.coerce("arabicFontSize", 400), 144);
  assert.equal(registry.coerce("translationFontSize", undefined), 18);

  assert.equal(
    registry.coerce("notARegisteredKey", "whatever"),
    "whatever",
    "a key without a rule is left alone",
  );
});

test("a caller's own fallback wins over the declared default", () => {
  const { registry } = load();

  assert.equal(
    registry.coerce("arabicFontSize", "junk", 96),
    96,
    "the popup size falls back to the reader's size",
  );
  assert.equal(registry.coerce("arabicFontSize", 300, 96), 144, "and is still clamped");
});

test("the settings blob ships the defaults the registry declares", () => {
  const { registry, storage } = load();
  const defaults = storage.getDefaultSettings();

  const declared = {
    bgDim: defaults.bgDim,
    bgBlur: defaults.bgBlur,
    pinnedAppsPerRow: defaults.pinnedAppsPerRow,
    arabicFontSize: defaults.pocketQuran.arabicFontSize,
    translationFontSize: defaults.pocketQuran.translationFontSize,
    glassOpacity: defaults.theme.glassOpacity,
  };

  assert.deepEqual(declared, {
    bgDim: 100,
    bgBlur: 0,
    pinnedAppsPerRow: 10,
    arabicFontSize: 40,
    translationFontSize: 18,
    glassOpacity: 50,
  });

  for (const [name, value] of Object.entries(declared)) {
    assert.equal(value, registry.defaultOf(name), `${name} comes from its rule`);
  }
});

test("the loader fixes an out-of-range stored value in one place", () => {
  const { storage } = load({
    muslimDashboard_settings: {
      bgDim: 999,
      bgBlur: -12,
      pinnedAppsPerRow: 40,
      pocketQuran: { arabicFontSize: 500 },
      pocketQuranBlurPower: 5000,
      pocketQuranGlassOpacity: 400,
    },
  });
  const settings = storage.getSettings();

  assert.equal(settings.bgDim, 100);
  assert.equal(settings.bgBlur, 0);
  assert.equal(settings.pocketQuranBlurPower, 200, "the per-component blur rule");
  assert.equal(settings.pocketQuranGlassOpacity, 100);
  assert.equal(
    settings.pinnedAppsPerRow,
    40,
    "the apps grid clamps this one where it reads it, not at load",
  );
  assert.equal(
    settings.pocketQuran.arabicFontSize,
    500,
    "and the pocket Quran panel clamps this one when it shows it",
  );
});

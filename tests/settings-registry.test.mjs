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

test("a dotted rule names a key inside the settings blob", () => {
  const { registry, storage } = load();

  const settings = storage.getDefaultSettings();

  assert.equal(settings.fasting.showRecommendations, true);
  assert.equal(settings.fasting.dhuAlHijjahWithinDays, 30);
  assert.equal(
    Object.prototype.hasOwnProperty.call(settings, "fasting.showRecommendations"),
    false,
    "a nested rule never leaks into the top level",
  );
});

test("a boolean rule is off only when explicitly switched off", () => {
  const { registry } = load();

  assert.equal(registry.coerce("fasting.showRecommendations"), true);
  assert.equal(
    registry.coerce("fasting.showRecommendations", false),
    false,
  );
  assert.equal(
    registry.coerce("fasting.showRecommendations", 0),
    true,
    "the card has always treated a stray value as on",
  );
});

test("the fasting window is a whole number of days inside its range", () => {
  const { registry } = load();

  assert.equal(registry.coerce("fasting.arafahWithinDays", 12.6), 13);
  assert.equal(registry.coerce("fasting.arafahWithinDays", 1000), 365);
  assert.equal(registry.coerce("fasting.arafahWithinDays", 1), 7);
  assert.equal(registry.coerce("fasting.arafahWithinDays", "x"), 30);
});

test("the suhur reminder's lead time is the rule the worker and the panel read", () => {
  const { registry } = load();

  assert.equal(registry.defaultOf("fasting.notifications.minutesBefore"), 60);
  assert.equal(
    registry.coerce("fasting.notifications.minutesBefore", 15),
    15,
    "the value the reminder has always used",
  );
  assert.equal(registry.coerce("fasting.notifications.minutesBefore", 0), 5);
  assert.equal(registry.coerce("fasting.notifications.minutesBefore", 1000), 180);
});

test("glass power, container width and the highlighter delay read one rule each", () => {
  const { registry, storage } = load();
  const settings = storage.getDefaultSettings();

  assert.equal(settings.uiBlurPower, 100);
  assert.equal(settings.containerWidthCustom, 70);
  assert.equal(registry.coerce("uiBlurPower", 500), 200);
  assert.equal(registry.coerce("containerWidthCustom", 5), 20);
  assert.equal(
    registry.coerce("containerWidthCustom", 66.4),
    66.4,
    "a width percentage has never been rounded",
  );
  assert.equal(registry.coerce("quran.reciterHighlighterDelayMs", -4000), -4000);
  assert.equal(registry.coerce("quran.reciterHighlighterDelayMs", -99999), -10000);
  assert.equal(
    registry.coerce("quran.reciterHighlighterDelayMs", NaN, 250),
    250,
    "the caller's own fallback still wins",
  );
});

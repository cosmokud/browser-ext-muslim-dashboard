/**
 * Background-aware font colour recolours text from the background the page
 * actually has, so a dashboard behind a dark photo keeps readable text.
 *
 * The settings panel that used to expose a switch is gone; the page must not
 * carry it back. What is left is the stored default, the bindings the settings
 * manager keeps for the value, and the colour choice ThemeTokens makes. The
 * panel is absent from index.html on purpose, so the checkbox cases build the
 * element the manager binds to and the page cases assert it is not there.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadPageDom, loadSandbox, repoRoot } from "./harness.mjs";

const SCRIPTS = [
  "js/settings-registry.js",
  "js/theme-tokens.js",
  "js/base-manager.js",
  "js/settings/index.js",
  "js/settings/theme-panel.js",
  "js/settings/theme-listeners.js",
  "js/settings/debug-panel.js",
  "js/settings/quality-panel.js",
  "js/themes.js",
  "js/backgrounds.js",
];

const CHECKBOX_ID = "themeBackgroundAwareFontColorEnabled";
/** Mid grey: white text clears neither contrast metric, dark text wins both. */
const MID_GREY = "#808080";

/** index.html parsed, the settings and theme scripts evaluated into it. */
function boot({ stored = { theme: {} }, toggle = false } = {}) {
  const document = loadPageDom("index.html");
  const window = document.defaultView;
  const frames = [];
  window.requestAnimationFrame = (callback) => frames.push(callback);
  for (const relPath of SCRIPTS) {
    window.eval(fs.readFileSync(path.join(repoRoot, relPath), "utf8"));
  }
  if (toggle) {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<input type="checkbox" id="${CHECKBOX_ID}">`,
    );
  }
  const saved = [];
  const storage = {
    getSettings: () => stored,
    saveSettings: (settings) => saved.push(settings),
  };
  /** Theme writes, so a refresh can be counted instead of inferred. */
  const writes = [];
  const style = document.documentElement.style;
  const setProperty = style.setProperty.bind(style);
  style.setProperty = (name, value) => {
    writes.push(name);
    setProperty(name, value);
  };
  return {
    document,
    window,
    storage,
    saved,
    writes,
    frames,
    runFrame: () => frames.splice(0).forEach((callback) => callback(0)),
    textPrimary: () => style.getPropertyValue("--text-primary"),
  };
}

test("the settings panel does not offer a background-aware font colour switch", () => {
  const { document, window, storage } = boot();

  assert.equal(document.getElementById(CHECKBOX_ID), null);
  assert.equal(document.querySelector(".theme-background-aware-toggle"), null);
  assert.doesNotMatch(document.body.textContent, /Background Aware Font Color/);

  // Nothing on the page binds it either, so the manager holds no element.
  const settings = new window.SettingsManager({ storage });
  assert.equal(settings.themeBackgroundAwareFontColorEnabled, null);
});

test("a fresh profile stores background-aware font colour off", () => {
  const localStorage = {
    getItem: () => null,
    setItem() {},
    removeItem() {},
  };
  const sandbox = loadSandbox(["js/settings-registry.js", "js/storage.js"], {
    globals: { localStorage },
  });

  const settings = new sandbox.StorageManager().getSettings();
  assert.equal(settings.theme.backgroundAwareFontColorEnabled, false);
});

test("the settings manager loads the checkbox state and saves it back", () => {
  const { document, window, storage } = boot({
    stored: { theme: { backgroundAwareFontColorEnabled: true } },
    toggle: true,
  });
  const checkbox = document.getElementById(CHECKBOX_ID);
  const settings = new window.SettingsManager({ storage });

  assert.equal(settings.themeBackgroundAwareFontColorEnabled, checkbox);

  settings.loadThemePanelSettings();
  assert.equal(checkbox.checked, true);

  checkbox.checked = false;
  const next = { theme: {} };
  settings.saveThemeSettings(next);
  assert.equal(next.theme.backgroundAwareFontColorEnabled, false);
});

test("a page without the checkbox saves the same value unchecked", () => {
  const { window, storage } = boot({
    stored: { theme: { backgroundAwareFontColorEnabled: true } },
  });
  const settings = new window.SettingsManager({ storage });
  assert.equal(settings.themeBackgroundAwareFontColorEnabled, null);

  const next = { theme: {} };
  settings.saveThemeSettings(next);
  assert.equal(next.theme.backgroundAwareFontColorEnabled, false);
});

test("a change on the checkbox reaches the theme manager unpersisted", () => {
  const { document, window, storage } = boot({ toggle: true });
  const calls = [];
  window.dashboard = {
    themes: {
      setBackgroundAwareFontColorEnabled: (...args) => calls.push(args),
    },
  };
  const settings = new window.SettingsManager({ storage });
  assert.equal(settings.themeBackgroundAwareFontColorEnabled, document.getElementById(CHECKBOX_ID));
  const checkbox = document.getElementById(CHECKBOX_ID);
  // The change listener binds with the themes panel, not with the constructor.
  settings.initThemesPanel();

  checkbox.checked = true;
  checkbox.dispatchEvent(new window.Event("change"));
  checkbox.checked = false;
  checkbox.dispatchEvent(new window.Event("change"));

  // Second argument false: the settings save is what persists the value.
  assert.deepEqual(calls, [
    [true, false],
    [false, false],
  ]);
});

test("the stored flag alone decides whether text follows the background", () => {
  const palette = { pureBlack: { dark: { bodyBg: MID_GREY } } };
  const off = boot({
    stored: { theme: { name: "pureBlack", customPalettes: palette } },
  });
  new off.window.ThemeManager(off.storage);
  assert.notEqual(off.textPrimary(), "#111827");

  const on = boot({
    stored: {
      theme: {
        name: "pureBlack",
        backgroundAwareFontColorEnabled: true,
        customPalettes: palette,
      },
    },
  });
  new on.window.ThemeManager(on.storage);
  assert.equal(on.textPrimary(), "#111827");
});

test("the setter applies the colours immediately and saves the flag", () => {
  const { document, window, storage, saved, textPrimary } = boot();
  const themes = new window.ThemeManager(storage);
  themes.setTheme("pureBlack", false);
  themes.setCustomPalette("pureBlack", "dark", { bodyBg: MID_GREY }, false);
  assert.notEqual(textPrimary(), "#111827");

  themes.setBackgroundAwareFontColorEnabled(true);

  assert.equal(textPrimary(), "#111827");
  assert.equal(saved.at(-1).theme.backgroundAwareFontColorEnabled, true);
  assert.equal(document.documentElement.style.getPropertyValue("--text-primary"), "#111827");
});

test("a background visual change regenerates the text colours on the next frame", () => {
  const { window, storage, frames, writes, runFrame, textPrimary } = boot();
  const themes = new window.ThemeManager(storage);
  themes.setTheme("pureBlack", false);
  themes.setCustomPalette("pureBlack", "dark", { bodyBg: MID_GREY }, false);
  themes.setBackgroundAwareFontColorEnabled(true, false);
  assert.equal(textPrimary(), "#111827");

  const backgrounds = Object.assign(
    Object.create(window.BackgroundManager.prototype),
    { backgroundDim: 20, backgroundBlur: 0, backgroundOverlayEl: null, bg1: null, bg2: null },
  );

  // Flag off: a background change asks the theme manager for nothing.
  const idle = boot();
  new idle.window.ThemeManager(idle.storage);
  idle.document.dispatchEvent(
    new idle.window.CustomEvent("md:background-visual-change"),
  );
  assert.equal(idle.frames.length, 0);

  writes.length = 0;
  backgrounds.applyBackgroundVisualEffects({ dim: 35, blur: 2 });
  assert.equal(frames.length, 1);
  assert.deepEqual(writes, []);

  runFrame();
  assert.ok(writes.includes("--text-primary"));
  assert.equal(textPrimary(), "#111827");
});

test("the background manager announces dim and blur changes", () => {
  const { window } = boot();
  const backgrounds = Object.assign(
    Object.create(window.BackgroundManager.prototype),
    { backgroundDim: 20, backgroundBlur: 0, backgroundOverlayEl: null, bg1: null, bg2: null },
  );
  const seen = [];
  const document = window.document;
  const dispatchEvent = document.dispatchEvent.bind(document);
  document.dispatchEvent = (event) => {
    seen.push(event.type);
    return dispatchEvent(event);
  };

  backgrounds.updateDim(40);
  backgrounds.updateBlur(6);

  assert.deepEqual(seen, [
    "md:background-visual-change",
    "md:background-visual-change",
  ]);
});

test("the resolution answers from APCA, WCAG and the effective background", () => {
  const tokens = loadSandbox([
    "js/settings-registry.js",
    "js/theme-tokens.js",
  ]).ThemeTokens;

  for (const bodyBg of ["#000000", "#202020", MID_GREY, "#f5f5f5", "#ffffff"]) {
    const resolved = tokens.resolveBackgroundAwareTextColors({ bodyBg });
    const apcaLight = tokens.calculateApcaContrast("#ffffff", bodyBg);
    const wcagLight = tokens.calculateWcagContrastRatio("#ffffff", bodyBg);
    const background = tokens.estimateEffectiveTextBackgroundColor({ bodyBg });
    const wcagDark = tokens.calculateWcagContrastRatio("#111827", background);
    assert.equal(
      resolved.textPrimary === "#ffffff",
      apcaLight >= 45 || wcagLight >= wcagDark,
      bodyBg,
    );
  }

  // Without a background colour it falls back to the mode's own black or white.
  assert.equal(tokens.estimateEffectiveTextBackgroundColor({}, "light"), "#ffffff");
  assert.equal(tokens.estimateEffectiveTextBackgroundColor({}, "dark"), "#000000");

  // The clamp the background-aware path shares: out of range or unreadable
  // values come back inside the bounds instead of NaN.
  assert.equal(tokens.clampNumber(150, 0, 100, 50), 100);
  assert.equal(tokens.clampNumber(-4, 0, 100, 50), 0);
  assert.equal(tokens.clampNumber("nope", 0, 100, 50), 50);
});

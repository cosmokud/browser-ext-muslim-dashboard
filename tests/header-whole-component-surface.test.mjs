/**
 * Whole Component Surface: one header checkbox that paints the shared glass on
 * the whole header and greys the five per-item surface toggles, so a single
 * surface choice cannot fight five older ones. Read from the real index.html:
 * the stub DOM answers getElementById for any id.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadPageDom, repoRoot } from "./harness.mjs";

const SETTINGS_SCRIPTS = [
  "js/settings-registry.js",
  "js/base-manager.js",
  "js/settings/index.js",
  "js/settings/theme-panel.js",
];
const THEME_SCRIPTS = ["js/settings-registry.js", "js/theme-tokens.js", "js/themes.js"];

const SURFACE_IDS = [
  "headerGreetingBgEnabled",
  "headerDateBgEnabled",
  "headerTimeBgEnabled",
  "headerNextPrayerBgEnabled",
  "headerCompactWeatherBgEnabled",
];

function boot(scripts) {
  const document = loadPageDom("index.html");
  const window = document.defaultView;
  for (const relPath of scripts) {
    window.eval(fs.readFileSync(path.join(repoRoot, relPath), "utf8"));
  }
  return { document, window };
}

/**
 * A SettingsManager over the real controls. Only the surface group is bound,
 * and there is no storage, so the instant preview returns instead of writing.
 */
function settingsPanel(document, window) {
  const self = Object.create(window.SettingsManager.prototype);
  self.headerWholeComponentSurfaceEnabled = document.getElementById(
    "headerWholeComponentSurfaceEnabled",
  );
  self.headerSurfaceBackgroundsGroup = document.getElementById(
    "headerSurfaceBackgroundsGroup",
  );
  for (const id of SURFACE_IDS) self[id] = document.getElementById(id);
  return self;
}

test("the header carries the checkbox, unchecked, next to its label", () => {
  const { document } = boot([]);
  const checkbox = document.getElementById("headerWholeComponentSurfaceEnabled");

  assert.equal(checkbox.type, "checkbox");
  assert.equal(checkbox.checked, false);
  assert.equal(
    checkbox.closest("label").textContent.trim(),
    "Whole Component Surface",
  );
  assert.ok(document.getElementById("header").classList.contains("header"));
});

test("the default is off, so a fresh install shows per-item surfaces", () => {
  const { window } = boot(["js/settings-registry.js", "js/storage.js"]);
  const defaults = window.StorageManager.prototype.getDefaultSettings.call({});

  assert.equal(defaults.heading.wholeComponentSurfaceEnabled, false);
});

test("checking it disables the five surface cells and keeps their values", () => {
  const { document, window } = boot(SETTINGS_SCRIPTS);
  const panel = settingsPanel(document, window);
  const controls = SURFACE_IDS.map((id) => document.getElementById(id));
  const cells = controls.map((control) => control.closest(".header-surface-cell"));
  // Non-default, so locking cannot keep the value by leaving it alone.
  controls[0].checked = true;
  const checked = controls.map((control) => control.checked);

  panel.headerWholeComponentSurfaceEnabled.checked = true;
  panel.updateHeaderSurfaceBackgroundsLockState();

  assert.deepEqual(
    controls.map((control) => control.disabled),
    [true, true, true, true, true],
  );
  assert.deepEqual(
    cells.map((cell) => cell.classList.contains("disabled")),
    [true, true, true, true, true],
  );
  assert.deepEqual(
    controls.map((control) => control.checked),
    checked,
    "a locked surface must keep the value it had",
  );

  panel.headerWholeComponentSurfaceEnabled.checked = false;
  panel.updateHeaderSurfaceBackgroundsLockState();
  assert.deepEqual(
    controls.map((control) => control.disabled),
    [false, false, false, false, false],
  );
});

test("the header is a themed component and has its own glass rule", () => {
  const { window } = boot(THEME_SCRIPTS);
  assert.ok(window.ThemeManager.MAIN_GRID_COMPONENT_IDS.includes("header"));

  const css = fs.readFileSync(path.join(repoRoot, "css/styles.css"), "utf8");
  const rule = [...css.matchAll(/(^|\n)\.([^\n{]+)\{([^}]*)\}/g)].find(
    (candidate) => `.${candidate[2].trim()}` === ".header.header-whole-surface-enabled",
  );
  assert.ok(rule, "no rule paints the whole header surface");
  assert.match(rule[3], /background:\s*var\(--glass-bg\);/);
  assert.match(rule[3], /border:\s*1px solid var\(--glass-border\);/);
  assert.match(
    rule[3],
    /backdrop-filter:\s*blur\(calc\(10px \* var\(--ui-blur-multiplier\)\)\);/,
  );
});

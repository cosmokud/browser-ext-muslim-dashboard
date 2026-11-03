/**
 * Header Quick Controls: one row of Show/Surface/Text/Glow toggles per header
 * item, and a reset button per colour that must draw the rotate-ccw icon and
 * hand the colour back to the active theme. Read from the real index.html: the
 * stub DOM answers getElementById for any id, so it proves neither the icon nor
 * the order the page declares.
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
  "js/settings/header-colors.js",
  "js/settings/theme-panel.js",
];
const APP_SCRIPTS = ["js/app/index.js", "js/app/header-appearance.js"];

const ITEMS = ["Greeting", "Date", "Time", "NextPrayer", "CompactWeather"];

const TEXT_COLOR_IDS = ITEMS.map((item) => `header${item}TextColor`);
const RESET_IDS = ITEMS.flatMap((item) => [
  `header${item}TextColorReset`,
  `header${item}GlowColorReset`,
]);

const ROTATE_CCW_PATHS = [
  "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",
  "M3 3v5h5",
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
 * A SettingsManager these tests can call: its own methods, the page's controls
 * copied onto it as the constructor would, and no storage (the instant preview
 * needs a dashboard, so it returns early instead of writing).
 */
function settingsPanel(document, window) {
  const elements = {};
  for (const item of ITEMS) {
    elements[`header${item}TextColor`] = document.getElementById(
      `header${item}TextColor`,
    );
    elements[`header${item}TextColorReset`] = document.getElementById(
      `header${item}TextColorReset`,
    );
  }
  return Object.assign(
    Object.create(window.SettingsManager.prototype),
    elements,
  );
}

test("the grid heads its columns Show, Surface, Text, Glow after the item", () => {
  const { document } = boot([]);
  const head = document.querySelector(".header-control-row.is-head");
  const cells = [...head.children];

  assert.deepEqual(
    cells.map((cell) => cell.textContent.trim()),
    ["Item", "Show", "Surface", "Text", "Glow"],
  );
  assert.ok(
    cells.slice(1).every((cell) => cell.classList.contains("center")),
    "the four control columns are centred",
  );
});

test("every header colour reset draws the rotate-ccw icon", () => {
  const { document } = boot([]);

  for (const id of RESET_IDS) {
    const button = document.getElementById(id);
    assert.ok(button, `${id} is missing`);
    assert.ok(button.classList.contains("header-color-reset-btn"), `${id} is not a reset button`);

    const svg = button.querySelector("svg");
    assert.ok(svg, `${id} has no icon`);
    assert.ok(
      svg.getAttribute("class").includes("lucide-rotate-ccw"),
      `${id} does not draw rotate-ccw`,
    );
    assert.deepEqual(
      [...svg.querySelectorAll("path")].map((path) => path.getAttribute("d")),
      ROTATE_CCW_PATHS,
      `${id} draws a different glyph`,
    );
  }
});

test("the five header text colours are colour pickers", () => {
  const { document } = boot([]);

  for (const id of TEXT_COLOR_IDS) {
    const picker = document.getElementById(id);
    assert.equal(picker.type, "color", `${id} is not a colour picker`);
    assert.ok(picker.classList.contains("header-text-color"), `${id} is not a header text colour`);
  }
});

test("the panel finds those controls under their storage keys", () => {
  const { document, window } = boot(SETTINGS_SCRIPTS);
  const panel = settingsPanel(document, window);
  const configs = panel.getHeaderTextColorControlConfigs();

  assert.deepEqual(
    [...configs.map((config) => config.settingKey)],
    [
      "greetingTextColor",
      "dateTextColor",
      "timeTextColor",
      "nextPrayerTextColor",
      "compactWeatherTextColor",
    ],
  );
  assert.deepEqual(
    [...configs.map((config) => config.input?.id)],
    TEXT_COLOR_IDS,
  );
  assert.deepEqual(
    [...configs.map((config) => config.reset?.id)],
    ITEMS.map((item) => `header${item}TextColorReset`),
  );
});

test("a theme-aware colour saves empty, a customised one saves its hex", () => {
  const { document, window } = boot(SETTINGS_SCRIPTS);
  const panel = settingsPanel(document, window);
  const config = panel.getHeaderTextColorControlConfigs()[0];

  panel.loadHeaderColorControlValue(config, "#123456");
  assert.equal(config.input.dataset.themeDefault, "false");
  assert.equal(panel.getHeaderColorControlSaveValue(config.input), "#123456");

  panel.loadHeaderColorControlValue(config, "");
  assert.equal(config.input.dataset.themeDefault, "true");
  assert.equal(panel.getHeaderColorControlSaveValue(config.input), "");
  assert.match(config.input.value, /^#[0-9a-f]{6}$/);
});

test("reset hands the colour back to the theme", () => {
  const { document, window } = boot(SETTINGS_SCRIPTS);
  const panel = settingsPanel(document, window);
  const config = panel.getHeaderTextColorControlConfigs()[0];

  panel.loadHeaderColorControlValue(config, "#123456");
  panel.resetHeaderColorControlToTheme(config);

  assert.equal(config.input.dataset.themeDefault, "true");
  assert.match(config.input.value, /^#[0-9a-f]{6}$/);
});

test("a theme change refreshes the theme-aware colours only", () => {
  const { document, window } = boot(SETTINGS_SCRIPTS);
  const panel = settingsPanel(document, window);
  // The panel render and wiring a theme change has no business running here.
  for (const name of [
    "renderThemePickerGrid",
    "loadThemePanelSettings",
    "setupThemePanelEventListeners",
    "setupIconThemePicker",
  ]) {
    panel[name] = () => {};
  }

  const [greeting, date] = panel.getHeaderTextColorControlConfigs();
  greeting.input.value = "#123456";
  greeting.input.dataset.themeDefault = "true";
  date.input.value = "#654321";
  date.input.dataset.themeDefault = "false";

  panel.initThemesPanel();
  document.dispatchEvent(new window.Event("md:theme-change"));

  assert.notEqual(greeting.input.value, "#123456");
  assert.equal(greeting.input.dataset.themeDefault, "true");
  assert.equal(date.input.value, "#654321");
});

test("the dashboard applies a header text colour and clears it", () => {
  const { document, window } = boot(APP_SCRIPTS);
  const dashboard = Object.create(window.MuslimDashboard.prototype);
  const target = document.getElementById("greeting");

  dashboard.applyHeaderTextColor([target], "#123456");
  assert.equal(target.style.color, "rgb(18, 52, 86)");

  dashboard.applyHeaderTextColor([target], "");
  assert.equal(target.style.color, "");
});

test("the colour columns stay compact and their reset sits inside the row", () => {
  const css = fs.readFileSync(path.join(repoRoot, "css/styles.css"), "utf8");
  const rule = (selector) => {
    const match = [...css.matchAll(/(^|\n)\.([^\n{]+)\{([^}]*)\}/g)].find(
      (candidate) => `.${candidate[2].trim()}` === selector,
    );
    assert.ok(match, `${selector} has no rule`);
    return match[3];
  };

  assert.match(rule(".header-control-row"), /minmax\(176px, max-content\)/);
  const button = rule(".header-color-reset-btn");
  assert.match(button, /width:\s*18px;/);
  assert.match(button, /height:\s*18px;/);
  assert.match(button, /border:\s*1px solid var\(--glass-border\);/);
  assert.match(rule(".header-color-reset-btn svg"), /width:\s*11px;/);
});

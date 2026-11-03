/**
 * Settings save and the visual-preview backdrop.
 *
 * A manual save must snapshot the settings before the panel writes over them,
 * show the saved indicator and then close the modal; the backdrop drops its
 * blur and lightens while a visual tab is open. Both are driven through the
 * real SettingsManager on the real settings markup, and the two stylesheet
 * rules are read from the parsed CSSOM instead of the file's text.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { loadPageDom, repoRoot, withParts } from "./harness.mjs";

const SCRIPTS = withParts([
  "js/settings-registry.js",
  "js/theme-tokens.js",
  "js/base-manager.js",
  "js/debug-clock.js",
  "js/settings.js",
]);

const VISUAL_TABS = ["background", "heading", "themes"];
const PLAIN_TABS = ["general", "prayer", "quotes", "pocketquran", null];

function boot(stored = { theme: {} }) {
  const document = loadPageDom("index.html");
  const window = document.defaultView;
  window.requestAnimationFrame = () => 0;
  for (const relPath of SCRIPTS) {
    window.eval(fs.readFileSync(path.join(repoRoot, relPath), "utf8"));
  }
  const storage = { getSettings: () => stored, saveSettings() {} };
  const settings = new window.SettingsManager({ storage });
  /** Applying settings is another part's job; this test only reads the calls. */
  const calls = [];
  settings.applySettings = () => calls.push("applySettings");
  settings.dispatchSettingsApplied = () => calls.push("dispatchSettingsApplied");
  return { document, window, storage, settings, calls };
}

/** The rule for one selector, as the browser parsed it. */
function ruleFor(selector) {
  const css = fs.readFileSync(path.join(repoRoot, "css/styles.css"), "utf8");
  const dom = new JSDOM(`<style>${css}</style>`, { url: "https://localhost/" });
  const sheet = dom.window.document.styleSheets[0];
  return [...sheet.cssRules].find((rule) => rule.selectorText === selector);
}

test("a manual save shows the saved state and closes the modal after it", async () => {
  const { settings } = boot();
  settings.modal.classList.add("active");

  assert.equal(settings.saveSettings(), true);

  assert.equal(settings.saveBtn.classList.contains("is-saved"), true);
  assert.equal(settings.modal.classList.contains("active"), true);

  await new Promise((resolve) => setTimeout(resolve, 500));

  assert.equal(settings.modal.classList.contains("active"), false);
});

test("the previous settings are captured before the panel mutates them", () => {
  const { settings, storage, calls } = boot({
    pocketQuran: { reciterHighlighterDelayMs: 100 },
  });

  // First save writes the panel's own values, so the second save differs from
  // it in the highlighter delay alone.
  settings.saveSettings({ closeModal: false });
  calls.length = 0;
  settings.pocketQuranHighlighterDelay.value = "300";

  assert.equal(settings.saveSettings({ closeModal: false }), true);

  // A snapshot taken after the mutation would look unchanged, and the save
  // would take the full apply path instead.
  assert.deepEqual(calls, ["dispatchSettingsApplied"]);
  assert.equal(storage.getSettings().pocketQuran.reciterHighlighterDelayMs, 300);
});

test("preview mode belongs to the dashboard's own tabs", () => {
  const { settings } = boot();

  for (const tabName of VISUAL_TABS) {
    assert.equal(settings.isVisualPreviewSettingsTab(tabName), true, tabName);
  }
  for (const tabName of PLAIN_TABS) {
    assert.equal(settings.isVisualPreviewSettingsTab(tabName), false, `${tabName}`);
  }
});

test("switching tabs turns the preview backdrop on and off", () => {
  const { settings } = boot();
  const modal = settings.modal;
  modal.classList.add("active");

  settings.switchTab("themes");
  assert.equal(modal.classList.contains("settings-visual-preview"), true);

  settings.switchTab("general");
  assert.equal(modal.classList.contains("settings-visual-preview"), false);

  // A closed modal never carries the backdrop, whatever tab it was left on.
  modal.classList.remove("active");
  settings.switchTab("heading");
  assert.equal(modal.classList.contains("settings-visual-preview"), false);
});

test("the preview rule drops the blur and lightens the backdrop", () => {
  const rule = ruleFor("#settingsModal.modal-overlay.settings-visual-preview");
  assert.ok(rule, "no #settingsModal.modal-overlay.settings-visual-preview rule");

  assert.equal(rule.style.background, "rgba(0, 0, 0, 0.18)");
  assert.equal(rule.style.getPropertyValue("backdrop-filter"), "blur(0)");
  // jsdom's CSSOM drops the prefixed declaration, so the file's text is the
  // only place that copy can be read.
  const css = fs.readFileSync(path.join(repoRoot, "css/styles.css"), "utf8");
  assert.match(
    css,
    /#settingsModal\.modal-overlay\.settings-visual-preview\s*\{[^}]*-webkit-backdrop-filter:\s*blur\(0\);/,
  );
});

test("the save button's saved state is a visible gradient", () => {
  const rule = ruleFor(".save-btn.is-saved");
  assert.ok(rule, "no .save-btn.is-saved rule");

  const background = rule.style.background;
  assert.match(background, /^linear-gradient\(/);
  assert.match(background, /var\(--accent-bg\)/);
  assert.match(background, /var\(--primary-light\)/);
});

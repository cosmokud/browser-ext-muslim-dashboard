/**
 * Modal Opacity: the theme panel slider that moves modal panels only. It sits
 * directly under Component Opacity, starts at 97%, and reaches the page as the
 * --modal-opacity alpha alone, so the backdrop a modal floats over stays put.
 * Read from the real index.html: the stub DOM answers getElementById for every
 * id, so it cannot show what the page actually declares.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadPageDom, repoRoot } from "./harness.mjs";

const SCRIPTS = [
  "js/settings-registry.js",
  "js/theme-tokens.js",
  "js/base-manager.js",
  "js/settings/index.js",
  "js/settings/theme-panel.js",
  "js/themes.js",
];

/** index.html parsed, then the scripts these assertions drive evaluated into it. */
function bootPage(theme = {}) {
  const document = loadPageDom("index.html");
  const window = document.defaultView;
  for (const relPath of SCRIPTS) {
    window.eval(fs.readFileSync(path.join(repoRoot, relPath), "utf8"));
  }
  const saved = [];
  const themes = new window.ThemeManager({
    getSettings: () => ({ theme }),
    saveSettings: (settings) => saved.push(settings),
  });
  return { document, window, themes, saved };
}

test("the Modal Opacity group follows the Component Opacity group, at 97%", () => {
  const { document } = bootPage();
  const modalGroup = document.getElementById("themeModalOpacityGroup");

  assert.equal(
    modalGroup.previousElementSibling,
    document.getElementById("themeComponentOpacityGroup"),
  );
  assert.equal(
    modalGroup.querySelector(".setting-label").textContent.trim(),
    "Modal Opacity",
  );

  const slider = document.getElementById("themeModalOpacity");
  assert.equal(slider.type, "range");
  assert.equal(slider.value, "97");
  assert.equal(slider.closest(".setting-group"), modalGroup);
  assert.equal(
    document.getElementById("themeModalOpacityValue").textContent.trim(),
    "97%",
  );
});

test("the theme manager starts at 97 and a saved value wins", () => {
  assert.equal(bootPage().themes.getModalOpacity(), 97);
  assert.equal(bootPage({ modalOpacity: 55 }).themes.getModalOpacity(), 55);
});

test("setting modal opacity writes the root alpha, clamps, and saves", () => {
  const { window, themes, saved } = bootPage();
  const root = window.document.documentElement;

  themes.setModalOpacity(42);
  assert.equal(themes.getModalOpacity(), 42);
  assert.equal(root.style.getPropertyValue("--modal-opacity"), "42%");
  assert.equal(saved.at(-1).theme.modalOpacity, 42);

  themes.setModalOpacity(150);
  assert.equal(themes.getModalOpacity(), 100);
  assert.equal(root.style.getPropertyValue("--modal-opacity"), "100%");
});

test("modal opacity leaves the overlay backdrop alone", () => {
  const { document, themes } = bootPage();
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  document.body.appendChild(overlay);

  themes.setModalOpacity(30);
  assert.equal(overlay.getAttribute("style"), null);
});

test("the panel clamps the slider and writes its readout", () => {
  const { document, window } = bootPage();
  const self = {
    themeModalOpacity: document.getElementById("themeModalOpacity"),
    themeModalOpacityValue: document.getElementById("themeModalOpacityValue"),
  };

  self.themeModalOpacity.value = "150";
  window.SettingsManager.prototype.updateThemeModalOpacityLabel.call(self);
  assert.equal(self.themeModalOpacity.value, "100");
  assert.equal(self.themeModalOpacityValue.textContent, "100%");
});

test("modal panels and the blur popup take their surface from modal opacity", () => {
  const css = fs.readFileSync(path.join(repoRoot, "css/styles.css"), "utf8");
  assert.match(css, /--modal-opacity:\s*97%;/);
  assert.match(css, /--modal-gradient-start-opacity:\s*var\(--modal-opacity\);/);
  assert.match(
    css,
    /--modal-gradient-end-opacity:\s*min\(100%, calc\(var\(--modal-opacity\) \+ 3%\)\);/,
  );
  assert.match(css, /--modal-surface-bg:[^;]*var\(--modal-opacity\)/);

  // One rule each: the panel must not fall back to a fixed background.
  for (const selector of [
    ".blur-settings-popup",
    ".pq-bookmark-modal-content",
    ".flashcard-set-modal-content",
    ".adhkar-set-modal-content",
    ".adhkar-lang-modal-content",
  ]) {
    const rules = [...css.matchAll(/(^|\n)\.([^\n{]+)\{([^}]*)\}/g)].filter(
      (match) => `.${match[2].trim()}` === selector,
    );
    assert.ok(
      rules.some((match) => /background:\s*var\(--modal-surface-bg\);/.test(match[3])),
      `${selector} does not use var(--modal-surface-bg)`,
    );
  }
});

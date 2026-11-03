/**
 * Component Opacity: the theme panel slider that moves the main grid and both
 * sidebars. Each placed component carries its own copy of the primary
 * highlight variables at that alpha, and portaled surfaces read the root copies,
 * so a dropdown lifted to <body> cannot fall back to a solid palette colour.
 * The stylesheet half is read through jsdom's CSSOM: the browser's own parse, so
 * a selector or declaration that no longer exists fails here.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  assertRootDeclaration,
  assertRule,
  loadPageDom,
  repoRoot,
} from "./harness.mjs";

const THEME_SCRIPTS = ["js/settings-registry.js", "js/theme-tokens.js", "js/themes.js"];
const HIGHLIGHT_VARIABLES = [
  "--theme-highlight-bg-hover",
  "--theme-highlight-active-bg",
  "--theme-highlight-border",
  "--theme-highlight-light-bg",
];
const ROOT_VARIABLES = [
  "--component-highlight-bg-hover",
  "--component-highlight-active-bg",
  "--component-highlight-border",
  "--component-highlight-shadow",
];

/** The real index.html, with the theme manager over it and no storage. */
function bootThemes() {
  const document = loadPageDom("index.html");
  const window = document.defaultView;
  for (const relPath of THEME_SCRIPTS) {
    window.eval(fs.readFileSync(path.join(repoRoot, relPath), "utf8"));
  }
  const themes = new window.ThemeManager({
    getSettings: () => ({ theme: {} }),
    saveSettings() {},
  });
  return { document, window, themes };
}

const valuesOf = (element, variables) =>
  variables.map((variable) => element.style.getPropertyValue(variable));

test("a component placed in a sidebar carries the component opacity highlights", () => {
  const { document, themes } = bootThemes();
  const card = document.getElementById("prayerTimesCard");
  document.getElementById("sidebarLeft").appendChild(card);

  themes.setMainGridComponentOpacity(35);

  // The root copies are written from the same expression, so they are the
  // expected value of the component copies.
  assert.deepEqual(
    valuesOf(card, HIGHLIGHT_VARIABLES.slice(0, 3)),
    valuesOf(document.documentElement, ROOT_VARIABLES.slice(0, 3)),
  );

  // The lighter copy is the border's palette colour at the hover alpha, so it
  // follows the slider without naming the theme's hex.
  const [lightBg] = valuesOf(card, ["--theme-highlight-light-bg"]);
  const [border] = valuesOf(document.documentElement, ["--component-highlight-border"]);
  assert.equal(lightBg.slice(0, lightBg.lastIndexOf(",")), border.slice(0, border.lastIndexOf(",")));
  assert.equal(lightBg.slice(lightBg.lastIndexOf(",")), ", 0.45)");
});

test("a component outside the layout, the sidebars and the floating cards is left alone", () => {
  const { document, themes } = bootThemes();
  const card = document.createElement("div");
  card.id = "todoCard";
  document.body.appendChild(card);

  themes.setMainGridComponentOpacity(35);

  assert.equal(card.getAttribute("style"), null);
});

test("turning glass off removes the component and the root highlight copies", () => {
  const { document, themes } = bootThemes();
  const card = document.getElementById("prayerTimesCard");

  themes.setMainGridComponentOpacity(35);
  themes.setGlassEnabled(false);

  assert.deepEqual(valuesOf(card, HIGHLIGHT_VARIABLES), ["", "", "", ""]);
  assert.deepEqual(valuesOf(document.documentElement, ROOT_VARIABLES), ["", "", "", ""]);
});

test("the stylesheet falls back to the theme highlights until the manager writes", () => {
  assertRootDeclaration("--component-highlight-active-bg", "var(--theme-highlight-active-bg)");
});

const PORTAL_COMPONENT_RULES = [
  ["#pocketQuranSurahList, #pocketQuranAyahList", {
    background: "var(--component-highlight-active-bg)",
    color: "var(--on-primary-text)",
  }],
  [".pq-translation-item:hover, .pq-translation-item:focus-visible", {
    background: "var(--component-highlight-bg-hover)",
    "border-color": "var(--component-highlight-border)",
    color: "var(--on-primary-text)",
  }],
  [".pq-translation-item.active", {
    background: "var(--component-highlight-active-bg)",
    "border-color": "var(--component-highlight-border)",
    color: "var(--on-primary-text)",
  }],
  [".pq-bookmark-category:hover", {
    background: "var(--component-highlight-bg-hover)",
    "border-color": "var(--component-highlight-border)",
    color: "var(--on-primary-text)",
  }],
  [".pq-bookmark-category.active", {
    background: "var(--component-highlight-active-bg)",
    "border-color": "var(--component-highlight-border)",
    color: "var(--on-primary-text)",
  }],
  [".adhkar-set-item:hover", {
    background: "var(--component-highlight-bg-hover)",
    "border-color": "var(--component-highlight-border)",
    color: "var(--on-primary-text)",
  }],
  [".adhkar-set-item.active", {
    background: "var(--component-highlight-active-bg)",
    "border-color": "var(--component-highlight-border)",
    color: "var(--on-primary-text)",
  }],
  [".flashcard-set-item:hover", {
    background: "var(--component-highlight-bg-hover)",
    "border-color": "var(--component-highlight-border)",
    color: "var(--on-primary-text)",
  }],
  [".flashcard-set-item.active", {
    background: "var(--component-highlight-active-bg)",
    "border-color": "var(--component-highlight-border)",
    color: "var(--on-primary-text)",
  }],
  [".adhkar-lang-item:hover", {
    background: "var(--component-highlight-bg-hover)",
    "border-color": "var(--component-highlight-border)",
    color: "var(--on-primary-text)",
  }],
  [".adhkar-lang-item.active", {
    background: "var(--component-highlight-active-bg)",
    "border-color": "var(--component-highlight-border)",
    color: "var(--on-primary-text)",
  }],
  [".content-search-result:hover, .content-search-result:focus-within", {
    background: "var(--component-highlight-bg-hover)",
    "border-color": "var(--component-highlight-border)",
    color: "var(--on-primary-text)",
  }],
  [".pq-search-input", {
    background: "var(--component-highlight-bg-hover)",
    border: "1px solid var(--component-highlight-border)",
    color: "var(--on-primary-text)",
  }],
  [".pq-search-input::placeholder", {
    color: "var(--on-primary-text)",
    opacity: "0.78",
  }],
  [".pq-search-input:hover, .pq-search-input:focus-visible", {
    background: "var(--component-highlight-bg-hover)",
    "border-color": "var(--component-highlight-border)",
    color: "var(--on-primary-text)",
    "box-shadow": "0 0 0 2px var(--component-highlight-border), var(--component-highlight-shadow)",
  }],
  [".pq-search-submit-btn", {
    background: "var(--component-highlight-active-bg)",
    border: "1px solid var(--component-highlight-border)",
    color: "var(--on-primary-text)",
  }],
  [".pq-search-submit-btn:hover:not(:disabled), .pq-search-submit-btn:focus-visible", {
    background: "var(--component-highlight-bg-hover)",
    "border-color": "var(--component-highlight-border)",
    color: "var(--on-primary-text)",
    "box-shadow": "var(--component-highlight-shadow)",
  }],
  [".pq-search-submit-btn:active:not(:disabled)", {
    background: "var(--component-highlight-active-bg)",
    "border-color": "var(--component-highlight-border)",
    color: "var(--on-primary-text)",
    "box-shadow": "var(--component-highlight-shadow)",
  }],
  [".adhkar-set-page-btn:hover:not(:disabled), .adhkar-set-page-btn:focus-visible", {
    background: "var(--component-highlight-bg-hover)",
    "border-color": "var(--component-highlight-border)",
    color: "var(--on-primary-text)",
    "box-shadow": "var(--component-highlight-shadow)",
  }],
  [".adhkar-set-page-btn.active", {
    background: "var(--component-highlight-active-bg)",
    "border-color": "var(--component-highlight-border)",
    color: "var(--on-primary-text)",
    "box-shadow": "var(--component-highlight-shadow)",
  }],
  [".pq-bookmark-page-btn:hover:not(:disabled), .pq-bookmark-page-btn:focus-visible", {
    background: "var(--component-highlight-bg-hover)",
    "border-color": "var(--component-highlight-border)",
    color: "var(--on-primary-text)",
    "box-shadow": "var(--component-highlight-shadow)",
  }],
  [".pq-bookmark-page-btn.active", {
    background: "var(--component-highlight-active-bg)",
    "border-color": "var(--component-highlight-border)",
    color: "var(--on-primary-text)",
    "box-shadow": "var(--component-highlight-shadow)",
  }],
];

test("portaled surfaces read the root component opacity highlights", () => {
  for (const [selector, declarations] of PORTAL_COMPONENT_RULES) {
    assertRule(selector, declarations);
  }
});

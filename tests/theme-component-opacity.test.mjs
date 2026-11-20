/**
 * Component Opacity: the theme panel slider that moves all resting dashboard
 * panels, nested sub-surfaces, borders, and backdrop blurs through one :root
 * + CSS surface-token seam without inline-stamping individual component IDs.
 * At 0%, resting surfaces and blurs drop to 0 while primary hover/active
 * highlights stay legible. Portaled surfaces read the same :root copies.
 * The stylesheet half is read through jsdom's CSSOM: the browser's own parse,
 * so a selector or declaration that no longer exists fails here.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  assertRootDeclaration,
  assertRule,
  collapse,
  loadPageDom,
  repoRoot,
  ruleFor,
  stylesheetRules,
} from "./harness.mjs";

const THEME_SCRIPTS = ["js/settings-registry.js", "js/theme-tokens.js", "js/themes.js"];
const HIGHLIGHT_VARIABLES = [
  "--theme-highlight-bg-hover",
  "--theme-highlight-active-bg",
  "--theme-highlight-border",
  "--theme-highlight-light-bg",
  "--theme-highlight-light-subtle-bg",
  "--theme-highlight-shadow",
];
const COMPONENT_ROOT_VARIABLES = [
  "--component-opacity-factor",
  "--component-blur-factor",
  "--component-glass-bg",
  "--component-glass-bg-hover",
  "--component-glass-border",
  "--component-glass-bg-subtle",
  "--component-highlight-bg-hover",
  "--component-highlight-active-bg",
  "--component-highlight-border",
  "--component-highlight-light-bg",
  "--component-highlight-light-subtle-bg",
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

test("componentOpacity = 0 drops resting surfaces and blur to 0 on :root while highlights follow unified accentOpacity", () => {
  const { document, themes } = bootThemes();
  const root = document.documentElement;
  const card = document.getElementById("prayerTimesCard");

  themes.setMainGridComponentOpacity(0);

  assert.equal(root.style.getPropertyValue("--component-opacity-factor"), "0");
  assert.equal(root.style.getPropertyValue("--component-blur-factor"), "0");
  assert.match(root.style.getPropertyValue("--component-glass-bg"), /,\s*0\)$/);
  assert.match(root.style.getPropertyValue("--component-glass-bg-hover"), /,\s*0\)$/);
  assert.match(root.style.getPropertyValue("--component-glass-border"), /,\s*0\)$/);
  assert.equal(
    root.style.getPropertyValue("--component-glass-bg-subtle"),
    "rgba(255, 255, 255, 0)",
  );

  // Active/hover primary highlights follow unified accentOpacity (default 75%) on both :root and component mirrors.
  const activeBg = root.style.getPropertyValue("--component-highlight-active-bg");
  const hoverBg = root.style.getPropertyValue("--component-highlight-bg-hover");
  const border = root.style.getPropertyValue("--component-highlight-border");
  assert.equal(activeBg, root.style.getPropertyValue("--theme-highlight-active-bg"));
  assert.equal(hoverBg, root.style.getPropertyValue("--theme-highlight-bg-hover"));
  assert.equal(border, root.style.getPropertyValue("--theme-highlight-border"));
  assert.equal(root.style.getPropertyValue("--accent-opacity"), "0.75");
  assert.match(activeBg, /rgba\([^)]+,\s*0\.75\)/);
  assert.match(hoverBg, /rgba\([^)]+,\s*0\.862\)/);
  assert.match(border, /rgba\([^)]+,\s*0\.863\)/);

  // No 21-ID inline variable stamping on individual dashboard panels.
  assert.equal(card.style.getPropertyValue("--glass-bg"), "");
  assert.equal(card.style.getPropertyValue("--surface-opacity"), "");
  assert.deepEqual(valuesOf(card, HIGHLIGHT_VARIABLES), ["", "", "", "", "", ""]);
});

test("componentOpacity = 35 writes scaled surface tokens on :root while highlights stay unified with accentOpacity", () => {
  const { document, themes } = bootThemes();
  const root = document.documentElement;
  const card = document.getElementById("prayerTimesCard");
  document.getElementById("sidebarLeft").appendChild(card);

  themes.setMainGridComponentOpacity(35);

  assert.equal(root.style.getPropertyValue("--component-opacity-factor"), "0.35");
  assert.equal(root.style.getPropertyValue("--component-blur-factor"), "1");
  assert.match(root.style.getPropertyValue("--component-glass-bg"), /,\s*0\.35\)$/);
  assert.match(root.style.getPropertyValue("--component-glass-bg-hover"), /,\s*0\.45\)$/);
  assert.match(root.style.getPropertyValue("--component-glass-border"), /,\s*0\.4\)$/);
  assert.equal(
    root.style.getPropertyValue("--component-glass-bg-subtle"),
    "rgba(255, 255, 255, 0.021)",
  );

  // Highlight tokens mirror unified accentOpacity (default 75%) regardless of componentOpacity.
  const lightBg = root.style.getPropertyValue("--component-highlight-light-bg");
  const border = root.style.getPropertyValue("--component-highlight-border");
  assert.equal(
    lightBg.slice(0, lightBg.lastIndexOf(",")),
    border.slice(0, border.lastIndexOf(",")),
  );
  assert.equal(lightBg.slice(lightBg.lastIndexOf(",")), ", 0.862)");
  assert.equal(
    root.style.getPropertyValue("--component-highlight-active-bg"),
    root.style.getPropertyValue("--theme-highlight-active-bg"),
  );

  // Theme RGB channel tokens and global glass opacity factor are published on :root.
  assert.ok(root.style.getPropertyValue("--primary-rgb").length > 0);
  assert.ok(root.style.getPropertyValue("--primary-light-rgb").length > 0);
  assert.ok(root.style.getPropertyValue("--primary-dark-rgb").length > 0);
  assert.ok(root.style.getPropertyValue("--accent-gold-rgb").length > 0);
  assert.ok(root.style.getPropertyValue("--accent-bg-rgb").length > 0);
  assert.equal(
    root.style.getPropertyValue("--glass-opacity-factor"),
    root.style.getPropertyValue("--surface-opacity"),
  );

  // Individual components stay free of inline opacity/highlight stamping.
  assert.equal(card.getAttribute("style"), null);

  // Light mode flips subtle surface tint to dark slate RGB channels.
  themes.setMode("light");
  assert.equal(root.style.getPropertyValue("--surface-tint-rgb"), "15, 23, 42");
  assert.equal(
    root.style.getPropertyValue("--component-glass-bg-subtle"),
    "rgba(15, 23, 42, 0.021)",
  );
});

test("accentOpacity slider UI, Chrome & Controls Opacity label, and 0%/75%/100% accent token scaling", () => {
  const { document, themes } = bootThemes();
  const root = document.documentElement;

  const chromeGroup = document.getElementById("themeGlassOpacityGroup");
  assert.equal(
    chromeGroup.querySelector(".setting-label").textContent.trim(),
    "Chrome & Controls Opacity",
  );
  assert.match(
    chromeGroup.querySelector(".setting-hint").textContent,
    /modal inner controls,\s*FAB menu,\s*toasts,\s*and popup/i,
  );

  const accentGroup = document.getElementById("themeAccentOpacityGroup");
  assert.equal(
    accentGroup.previousElementSibling,
    document.getElementById("themeModalOpacityGroup"),
  );
  assert.equal(
    accentGroup.querySelector(".setting-label").textContent.trim(),
    "Accent & Active Opacity",
  );
  const accentSlider = document.getElementById("themeAccentOpacity");
  assert.equal(accentSlider.type, "range");
  assert.equal(accentSlider.min, "0");
  assert.equal(accentSlider.max, "100");
  assert.equal(accentSlider.step, "1");
  assert.equal(accentSlider.value, "75");
  assert.equal(
    document.getElementById("themeAccentOpacityValue").textContent.trim(),
    "75%",
  );

  // 0%: transparent fills, no shadow, crisp border, mode-readable text
  themes.setAccentOpacity(0, false);
  assert.equal(themes.getAccentOpacity(), 0);
  assert.equal(root.style.getPropertyValue("--accent-opacity"), "0");
  assert.match(root.style.getPropertyValue("--accent-surface-bg"), /,\s*0\)/);
  assert.match(root.style.getPropertyValue("--theme-highlight-active-bg"), /,\s*0\)/);
  assert.equal(root.style.getPropertyValue("--accent-surface-shadow"), "none");
  assert.match(root.style.getPropertyValue("--accent-surface-border"), /,\s*0\.45\)$/);
  assert.equal(root.style.getPropertyValue("--accent-surface-text"), "#ffffff");

  themes.setMode("light", false);
  assert.equal(
    root.style.getPropertyValue("--accent-surface-text"),
    root.style.getPropertyValue("--text-primary"),
  );

  // 100%: solid fills and on-primary text
  themes.setAccentOpacity(100, false);
  assert.equal(root.style.getPropertyValue("--accent-opacity"), "1");
  assert.match(root.style.getPropertyValue("--accent-surface-bg"), /,\s*1\)/);
  assert.match(root.style.getPropertyValue("--accent-surface-border"), /,\s*1\)$/);
  assert.equal(
    root.style.getPropertyValue("--accent-surface-text"),
    root.style.getPropertyValue("--on-primary-text"),
  );
});

test("turning glass off removes all component vars and sets surface blur factor to 0", () => {
  const { document, themes } = bootThemes();
  const root = document.documentElement;

  themes.setMainGridComponentOpacity(35);
  themes.setGlassEnabled(false);

  assert.deepEqual(
    valuesOf(root, COMPONENT_ROOT_VARIABLES),
    Array(COMPONENT_ROOT_VARIABLES.length).fill(""),
  );
  assert.equal(root.style.getPropertyValue("--surface-blur-factor"), "0");
  assert.equal(root.style.getPropertyValue("--surface-opacity"), "1");
});

test("the stylesheet declares tiered surface defaults and dashboard + per-card local scopes", () => {
  assertRootDeclaration("--surface-opacity", "0.5");
  assertRootDeclaration("--surface-blur-factor", "1");
  assertRootDeclaration("--surface-tint-rgb", "255, 255, 255");
  assertRootDeclaration("--glass-bg-subtle", "var(--surface-inset)");
  assertRootDeclaration("--component-highlight-active-bg", "var(--theme-highlight-active-bg)");

  assertRule('[data-theme-mode="light"]', {
    "--surface-tint-rgb": "15, 23, 42",
  });
  assertRule('html[data-glass-enabled="false"], [data-glass-enabled="false"]', {
    "--surface-blur-factor": "0",
  });

  const scopeRule = stylesheetRules().find(
    (rule) =>
      rule.selectorText &&
      rule.style.getPropertyValue("--surface-opacity").trim() === "var(--component-opacity-factor)" &&
      rule.style.getPropertyValue("--glass-bg").trim() === "var(--component-glass-bg)",
  );
  assert.ok(scopeRule, "missing Dashboard Surface Scope CSS rule");
  const scopeSelector = collapse(scopeRule.selectorText);
  for (const needle of [
    ".main-container",
    "#sidebarLeft",
    "#sidebarRight",
    "#momentModeLayout",
    ".floating-card",
    ":not([data-glass-enabled])",
    'html:not([data-glass-enabled="false"])',
  ]) {
    assert.ok(
      scopeSelector.includes(needle),
      `Dashboard Surface Scope must cover ${needle}`,
    );
  }
  assert.equal(
    collapse(scopeRule.style.getPropertyValue("--surface-blur-factor")),
    "var(--component-blur-factor)",
  );
  assert.equal(
    collapse(scopeRule.style.getPropertyValue("--theme-highlight-bg-hover")),
    "var(--component-highlight-bg-hover)",
  );

  const localDerivationRule = stylesheetRules().find(
    (rule) =>
      rule.selectorText &&
      rule.selectorText.includes("[data-glass-enabled]") &&
      !rule.selectorText.includes(":root") &&
      rule.style.getPropertyValue("--surface-inset").trim().length > 0 &&
      rule.style.getPropertyValue("--action-btn-bg").trim().length > 0 &&
      rule.style.getPropertyValue("--scrollbar-track").trim().length > 0,
  );
  assert.ok(localDerivationRule, "missing Local Tiered Derivation CSS rule");
  const localSel = collapse(localDerivationRule.selectorText);
  for (const needle of [
    ".main-container",
    "#sidebarLeft",
    "#sidebarRight",
    "#momentModeLayout",
    ".floating-card",
    "[data-glass-enabled]",
  ]) {
    assert.ok(localSel.includes(needle), `Local Tiered Derivation must cover ${needle}`);
  }
  for (const token of [
    "--surface-inset",
    "--surface-inset-strong",
    "--surface-inset-hover",
    "--surface-control",
    "--surface-control-hover",
    "--surface-border-subtle",
    "--surface-border",
    "--surface-scrim",
    "--action-btn-bg",
    "--action-btn-bg-hover",
    "--scrollbar-track",
    "--scrollbar-track-strong",
  ]) {
    assert.ok(
      localDerivationRule.style.getPropertyValue(token).trim().length > 0,
      `Local Tiered Derivation must recompute ${token}`,
    );
  }
});

test("all 6 reported opaque widget selectors read surface-opacity and surface-blur-factor tokens", () => {
  // 1. Fasting bar + badge + track
  assertRule(".fasting-bar", {
    background: "var(--surface-inset)",
    border: "1px solid var(--surface-border-subtle)",
  });
  assertRule(".fasting-bar__badge", {
    background: "var(--surface-inset)",
    border: "1px solid var(--surface-border-subtle)",
  });
  assertRule(".fasting-bar__track", {
    background: "var(--surface-inset)",
    border: "1px solid var(--surface-border-subtle)",
  });

  // 2. Search bar input (resting scales by --surface-opacity; focus remains visible)
  const searchInput = ruleFor(".search-bar-input");
  assert.ok(searchInput, "no .search-bar-input rule");
  assert.match(searchInput.style.getPropertyValue("background"), /var\(--surface-opacity\)/);
  assert.match(searchInput.style.getPropertyValue("border"), /var\(--surface-opacity\)/);

  // 3. Search bar buttons
  const searchBtn = ruleFor(".search-bar-btn");
  assert.ok(searchBtn, "no .search-bar-btn rule");
  assert.equal(collapse(searchBtn.style.getPropertyValue("background")), "var(--surface-control)");
  assert.match(searchBtn.style.getPropertyValue("border"), /var\(--surface-opacity\)/);

  // 4. Flashcard flip/study card
  const flashcard = ruleFor(".flashcard-flip-card");
  assert.ok(flashcard, "no .flashcard-flip-card rule");
  assert.equal(collapse(flashcard.style.getPropertyValue("background")), "var(--surface-inset)");
  assert.equal(
    collapse(flashcard.style.getPropertyValue("border-color")),
    "var(--surface-border-subtle)",
  );
  assert.match(
    flashcard.style.getPropertyValue("backdrop-filter"),
    /var\(--surface-blur-factor,\s*1\)/,
  );

  // 5. Pocket Quran size controls, controls bar, and main wrapper
  assertRule(".pocket-quran-size-controls", {
    background: "var(--surface-control)",
  });
  const pqControlsRules = stylesheetRules().filter(
    (rule) => rule.selectorText && collapse(rule.selectorText) === ".pocket-quran-controls",
  );
  const pqControls = pqControlsRules.find(
    (rule) => rule.style.getPropertyValue("background").trim().length > 0,
  );
  assert.ok(pqControls, "no .pocket-quran-controls surface rule");
  assert.equal(
    collapse(pqControls.style.getPropertyValue("background")),
    "var(--surface-inset-strong)",
  );
  assert.match(
    pqControls.style.getPropertyValue("backdrop-filter"),
    /var\(--surface-blur-factor,\s*1\)/,
  );
  const pqMain = ruleFor(".pocket-quran-main");
  assert.ok(pqMain, "no .pocket-quran-main rule");
  assert.equal(collapse(pqMain.style.getPropertyValue("background")), "transparent");
  assert.match(
    pqMain.style.getPropertyValue("backdrop-filter"),
    /var\(--surface-blur-factor,\s*1\)/,
  );

  // 6. Pocket Quran ayah & content
  const pqContent = ruleFor(".pocket-quran-content");
  assert.ok(pqContent, "no .pocket-quran-content rule");
  assert.match(
    pqContent.style.getPropertyValue("backdrop-filter"),
    /var\(--surface-blur-factor,\s*1\)/,
  );
  const pqAyah = ruleFor(".pocket-quran-ayah");
  assert.ok(pqAyah, "no .pocket-quran-ayah rule");
  assert.equal(
    collapse(pqAyah.style.getPropertyValue("background")),
    "var(--surface-inset-strong)",
  );
  assert.match(
    pqAyah.style.getPropertyValue("backdrop-filter"),
    /var\(--surface-blur-factor,\s*1\)/,
  );
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

/**
 * Primary Highlights: the hover, active and pressed surfaces of the dashboard
 * are the theme's primary palette at the component's own alpha, never a glass
 * tint, so text stays readable when the component opacity slider is low.
 * Read through jsdom's CSSOM: the browser's own parse, so a selector or a
 * declaration that no longer exists fails here.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  assertRootDeclaration,
  assertRule,
  collapse,
  stylesheetRules,
} from "./harness.mjs";

const HOVER = {
  background: "var(--theme-highlight-bg-hover)",
  "border-color": "var(--theme-highlight-border)",
  color: "var(--on-primary-text)",
};

const ACTIVE = {
  background: "var(--theme-highlight-active-bg)",
  "border-color": "var(--theme-highlight-border)",
  color: "var(--on-primary-text)",
};

const LIGHT = {
  background: "var(--theme-highlight-light-bg)",
  "border-color": "var(--theme-highlight-border)",
  color: "var(--on-primary-text)",
};

/** The primary gradient at the pressed alphas, with its lighter border. */
const PRESSED = {
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--primary-dark) 84%, transparent), color-mix(in srgb, var(--primary-color) 88%, transparent))",
  "border-color": "color-mix(in srgb, var(--primary-light) 82%, var(--on-primary-text) 18%)",
  color: "var(--on-primary-text)",
};

/**
 * The controls the header and quote cards share. Their background must stay on
 * one surface colour while hovered, so the list is asserted, not just the rule.
 */
const ACTION_BUTTONS = [
  ".card-header-actions > button",
  ".card-header-actions > .notes-header-actions > button",
  ".card-header-actions > .card-blur-menu > .card-blur-btn",
  ".quote-search-btn",
  ".quote-lang-selector-btn",
  ".quote-pause-btn",
  ".quote-shuffle-btn",
  ".pocket-quran-toggle-group > button",
];

/** Chips, tool buttons and tabs that share one hover and one selected rule. */
const COMMON_CONTROLS = [
  ".card-header-actions > button",
  ".setting-btn",
  ".theme-mode-btn",
  ".calendar-toggle",
  ".quote-nav-btn",
  ".quote-refresh",
  ".quote-lang-selector-btn",
  ".quote-pause-btn",
  ".quote-shuffle-btn",
  ".pocket-quran-header-meta",
  ".adhkar-set-selector-btn",
  ".adhkar-lang-selector-btn",
  ".flashcard-set-selector-btn",
  ".flashcard-lang-selector-btn",
  ".hadith-set-selector-btn",
  ".pocket-quran-combobox-nav-btn",
  ".pq-search-btn",
  ".pq-recitation-control-btn",
  ".pq-mini-action-btn",
  ".notes-tool-btn",
  ".notes-mode-chip",
  ".notes-page-btn",
  ".mdnotes-pill-btn",
  ".mdnotes-page-btn-nav",
  ".mdnotes-view-btn",
  ".mdnotes-tool-btn",
  ".todo-page-btn",
  ".todo-action-btn:not(.delete)",
  ".calendar-day:not(.empty)",
  ".weather-forecast-day",
  ".search-bar-engine-tab",
];

const SELECTED_CONTROLS = [
  ".theme-mode-btn.active",
  '.quote-pause-btn[aria-pressed="true"]',
  '.quote-shuffle-btn[aria-pressed="true"]',
  ".adhkar-set-selector-btn.active",
  ".adhkar-lang-selector-btn.active",
  ".flashcard-set-selector-btn.active",
  ".flashcard-lang-selector-btn.active",
  ".hadith-set-selector-btn.active",
  ".calendar-day.selected",
  ".notes-tool-btn.active",
  ".mdnotes-view-btn.active",
  ".todo-page-btn.active",
  ".weather-forecast-day.selected",
  '.search-bar-engine-tab[aria-selected="true"]',
];

const actionButtons = (suffix = "") => `:where(${ACTION_BUTTONS.join(", ")})${suffix}`;
const commonControls = (suffix = "") => `:where(${COMMON_CONTROLS.join(", ")})${suffix}`;

test("the theme highlight tokens are the primary gradient, not a glass tint", () => {
  // Declared once each, so no later :root can mix the glass hover colour back in.
  assertRootDeclaration(
    "--theme-highlight-bg-hover",
    "linear-gradient(135deg, var(--primary-dark), var(--primary-color))",
  );
  assertRootDeclaration(
    "--theme-highlight-active-bg",
    "linear-gradient(135deg, var(--primary-dark), var(--primary-color))",
  );
});

test("the shared chip groups hover and select on the primary highlights", () => {
  assertRule(commonControls(":hover:not(:disabled)"), {
    background: "var(--theme-highlight-bg-hover)",
    "border-color": "var(--theme-highlight-border)",
    color: "var(--on-primary-text)",
  });
  assertRule(`:where(${SELECTED_CONTROLS.join(", ")})`, {
    background: "var(--theme-highlight-active-bg)",
    "border-color": "var(--theme-highlight-border)",
    color: "var(--on-primary-text)",
  });
});

test("header and quote action buttons keep one surface colour and never fade", () => {
  // The transition list is exact: a background, opacity, filter or
  // backdrop-filter transition here re-renders on every theme slider move.
  assertRule(actionButtons(), {
    background: "var(--action-btn-bg)",
    border: "1px solid var(--action-btn-border-color)",
    color: "var(--action-btn-color)",
    "box-shadow": "var(--action-btn-shadow)",
    transition:
      "transform var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast), color var(--transition-fast)",
    animation: "none",
  });
  assertRule(actionButtons(":hover:not(:disabled)"), {
    background: "var(--action-btn-bg-hover)",
    "box-shadow": "var(--action-btn-shadow-hover)",
  });

  const hovered = {
    background: "var(--action-btn-bg)",
    "border-color": "var(--theme-highlight-border)",
    color: "var(--on-primary-text)",
    "box-shadow": "var(--action-btn-shadow-hover)",
    important: ["background", "border-color", "color", "box-shadow"],
  };
  assertRule(
    ".card-header-actions > button:hover:not(:disabled), .card-header-actions > .notes-header-actions > button:hover:not(:disabled), .card-blur-menu .card-blur-btn:hover:not(:disabled), .card-header-actions > .card-blur-menu > .card-blur-btn:hover:not(:disabled)",
    hovered,
  );
  assertRule(".quote-top-actions > button:hover:not(:disabled)", hovered);

  // Hover must not paint an overlay pseudo-element over the button.
  const overlays = stylesheetRules().filter(
    (rule) =>
      rule.selectorText &&
      /::before/.test(rule.selectorText) &&
      /quote-top-actions|card-header-actions|card-blur-btn/.test(rule.selectorText),
  );
  assert.deepEqual(overlays.map((rule) => rule.selectorText), []);
});

test("quote top actions stay hidden until the quote component is hovered", () => {
  assertRule(".quote-top-actions", {
    opacity: "0",
    visibility: "hidden",
    "pointer-events": "none",
    transition: "opacity var(--transition-normal), transform var(--transition-fast)",
  });
  assertRule(".quote-section:hover .quote-top-actions", {
    opacity: "1",
    visibility: "visible",
    "pointer-events": "auto",
  });

  // They are not part of the card header reveal group, so a pointer-fine
  // browser cannot show them before the quote itself is hovered.
  const pointerFine = stylesheetRules().filter(
    (rule) => rule.media && rule.media.mediaText === "(hover: hover) and (pointer: fine)",
  );
  const folded = pointerFine.flatMap((rule) =>
    [...rule.cssRules]
      .map((inner) => inner.selectorText ?? "")
      .filter((selector) => selector.includes(".quote-section .quote-top-actions")),
  );
  assert.deepEqual(folded, []);
});

const STABLE_RULES = [
  [
    ".quote-pause-btn[aria-pressed=\"true\"], .quote-shuffle-btn[aria-pressed=\"true\"]",
    PRESSED,
  ],
  [".pq-ayah-play-btn.playing", PRESSED],
  [".pq-recitation-btn.active", PRESSED],
];

const HOVER_RULES = [
  [".pq-tajweed-toggle:not(.active):not(:disabled):hover, .pq-tajweed-toggle[aria-pressed=\"false\"]:not(:disabled):hover", HOVER],
  [".pq-ayah-play-btn:hover", HOVER],
  [".pq-recitation-btn:hover", HOVER],
  [".pocket-quran-combobox-with-nav:is(:focus-within, .pq-open)", HOVER],
  [".pocket-quran-nav-btn:hover", HOVER],
  [".todo-item:hover", HOVER],
  [".notes-list-item:hover", HOVER],
  [".prayer-item:hover", HOVER],
  [".flashcard-nav:hover", HOVER],
  [".calendar-nav-btn:hover", HOVER],
  [".pocket-quran-size-step-btn:hover", HOVER],
  [".flashcard-auto-toggle-btn:hover", HOVER],
  [".todo-input:focus", HOVER],
  [".notes-title-input:focus", HOVER],
];

const SELECTED_RULES = [
  [".pq-tajweed-toggle.active, .pq-tajweed-toggle[aria-pressed=\"true\"]", ACTIVE],
  ['#pocketQuranTajweedToggle[aria-pressed="true"]:not(:disabled)', ACTIVE],
  ['#adhkarScriptToggleBtn[aria-pressed="true"]:not(:disabled)', ACTIVE],
  ['.todo-item:is(.active, .selected, [aria-selected="true"])', ACTIVE],
  [".notes-list-item.active", ACTIVE],
  [".prayer-item.active", ACTIVE],
  ['.flashcard-auto-toggle-btn:is(:active, [data-paused="true"], [aria-pressed="true"])', ACTIVE],
  [".next-prayer", { background: "var(--theme-highlight-active-bg)" }],
  [".weather-forecast-day.selected", {
    "border-color": "var(--theme-highlight-border)",
    background: "var(--theme-highlight-active-bg)",
  }],
  [".notes-toolbar.ql-toolbar.ql-snow", {
    border: "1px solid var(--theme-highlight-border)",
    background: "var(--theme-highlight-active-bg)",
  }],
];

test("every primary surface reads the theme highlight variables", () => {
  for (const [selector, declarations] of [...STABLE_RULES, ...HOVER_RULES, ...SELECTED_RULES]) {
    assertRule(selector, declarations);
  }
});

test("pocket quran option rows and inline nav use the lighter palette colour", () => {
  assertRule(".pocket-quran-surah-item:hover, .pocket-quran-ayah-option:hover", LIGHT);
  assertRule(
    ".pocket-quran-surah-item.active, .pocket-quran-ayah-option.active",
    LIGHT,
  );
  assertRule(".pocket-quran-inline-nav-btn:hover, .pocket-quran-inline-nav-btn:focus-visible", {
    background: "var(--theme-highlight-bg-hover)",
    color: "var(--on-primary-text)",
  });
  assertRule(".pocket-quran-size-step-btn:focus-visible", {
    outline: "2px solid var(--theme-highlight-border)",
    background: "var(--theme-highlight-bg-hover)",
    color: "var(--on-primary-text)",
  });
  assertRule(".flashcard-auto-toggle-btn", {
    border: "1px solid var(--theme-highlight-border)",
    background: "var(--theme-highlight-active-bg)",
    color: "var(--on-primary-text)",
  });
  assertRule(".flashcard-auto-toggle-btn:focus-visible", {
    outline: "3px solid var(--theme-highlight-border)",
    background: "var(--theme-highlight-bg-hover)",
    color: "var(--on-primary-text)",
  });
  assertRule('#pocketQuranTajweedToggle[aria-pressed="true"] .pq-tajweed-toggle-icon', {
    "text-shadow":
      "0 0 12px color-mix(in srgb, var(--theme-highlight-light-bg) 58%, transparent 42%)",
  });
});

test("the playing ayah pulse keeps the stable palette at zero component opacity", () => {
  const pulse = stylesheetRules().find((rule) => rule.name === "pqPulse");
  assert.ok(pulse, "no pqPulse keyframes");
  assert.deepEqual(
    [...pulse.cssRules].map((frame) => frame.keyText),
    ["0%, 100%", "50%"],
  );

  // Palette colours, not highlight variables: the pulse has to stay visible
  // when the component opacity slider is at zero.
  const [rest] = pulse.cssRules;
  assert.equal(
    collapse(rest.style.getPropertyValue("box-shadow")),
    collapse(
      "inset 0 0 0 1px color-mix(in srgb, var(--on-primary-text) 18%, transparent), 0 0 0 2px color-mix(in srgb, var(--primary-light) 28%, transparent), 0 8px 18px color-mix(in srgb, var(--primary-dark) 36%, transparent)",
    ),
  );
});

/**
 * FAB menu theme: the floating action menu shares one themed surface across the
 * toggle and every button it grows, keeps the primary highlight while open, and
 * drops blur when the dashboard glass is off. Read through jsdom's CSSOM: the
 * browser's own parse, so a selector or declaration that no longer exists fails
 * here.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { assertRule, repoRoot, ruleFor, stylesheetRules } from "./harness.mjs";

const CONTROLS = [
  ".fab-menu-toggle",
  ".fab-menu-items button",
  ".sticky-note-fab",
  ".moment-mode-btn",
  ".quran-focus-btn",
  ".layout-edit-btn",
  ".refresh-bg-btn",
  ".settings-btn",
];

/** The one consolidated group every FAB control is styled through. */
const fabGroup = (suffix = "") =>
  `.fab-menu :is(${CONTROLS.join(", ")})${suffix}`;

test("every FAB control shares one glass surface", () => {
  assertRule(fabGroup(":where(:not(.active):not(.is-locked))"), {
    background: "var(--glass-bg)",
    border: "1px solid var(--glass-border)",
    color: "var(--text-primary)",
    "box-shadow": "var(--glass-shadow)",
    "backdrop-filter": "blur(calc(10px * var(--ui-blur-multiplier)))",
  });
});

test("a hovered FAB control takes the primary highlight without !important", () => {
  const hoverSelector = fabGroup(":not(.is-locked):hover");
  assertRule(hoverSelector, {
    background: "var(--theme-highlight-bg-hover)",
    "border-color": "var(--theme-highlight-border)",
    color: "var(--on-primary-text)",
    "box-shadow": "var(--theme-highlight-shadow)",
  });
  const hoverRule = ruleFor(hoverSelector);
  for (const prop of ["background", "border-color", "color", "box-shadow"]) {
    assert.equal(
      hoverRule.style.getPropertyPriority(prop),
      "",
      `FAB hover ${prop} should win via clean specificity instead of !important`,
    );
  }
});

test("open menu toggle shows the active highlight without !important", () => {
  const toggleSelector = ".fab-menu.open .fab-menu-toggle";
  assertRule(toggleSelector, {
    background: "var(--theme-highlight-active-bg)",
    "border-color": "var(--theme-highlight-border)",
    color: "var(--on-primary-text)",
    "box-shadow": "var(--theme-highlight-shadow)",
  });
  const toggleRule = ruleFor(toggleSelector);
  for (const prop of ["background", "border-color", "color", "box-shadow"]) {
    assert.equal(toggleRule.style.getPropertyPriority(prop), "");
  }
});

test("an open menu paints the toggled controls with a subtle primary glow", () => {
  assertRule(
    '.fab-menu.open :is(.layout-edit-btn.active, .layout-edit-btn[aria-pressed="true"]:not(.is-locked))',
    {
      background:
        "linear-gradient(135deg, color-mix(in srgb, var(--primary-dark) 88%, transparent), color-mix(in srgb, var(--accent-bg) 68%, var(--primary-color) 32%))",
      "box-shadow":
        "inset 0 0 0 1px color-mix(in srgb, var(--on-primary-text) 18%, transparent), 0 0 0 2px color-mix(in srgb, var(--primary-light) 24%, transparent), 0 8px 18px color-mix(in srgb, var(--primary-dark) 34%, transparent)",
      animation: "none",
    },
  );
  assertRule(
    '.fab-menu.open :is(.quran-focus-btn.active, .quran-focus-btn[aria-pressed="true"])',
    {
      background:
        "linear-gradient(135deg, color-mix(in srgb, var(--primary-dark) 88%, transparent), color-mix(in srgb, var(--accent-bg) 68%, var(--primary-color) 32%))",
      "box-shadow":
        "inset 0 0 0 1px color-mix(in srgb, var(--on-primary-text) 18%, transparent), 0 0 0 2px color-mix(in srgb, var(--accent-bg) 24%, transparent), 0 8px 18px color-mix(in srgb, var(--primary-dark) 34%, transparent)",
    },
  );
  assertRule(
    '.fab-menu.open :is(.sticky-note-toggle-btn[aria-pressed="true"], .sticky-note-toggle-btn[data-sticky-notes-state="visible"])',
    {
      background:
        "linear-gradient(135deg, color-mix(in srgb, var(--primary-dark) 88%, transparent), color-mix(in srgb, var(--accent-bg) 58%, var(--primary-color) 42%))",
      "box-shadow":
        "inset 0 0 0 1px color-mix(in srgb, var(--on-primary-text) 18%, transparent), 0 0 0 2px color-mix(in srgb, var(--accent-bg) 22%, transparent), 0 8px 18px color-mix(in srgb, var(--primary-dark) 34%, transparent)",
    },
  );

  // Guard against reintroducing !important wars on FAB surface/state rules.
  const importantFabRules = stylesheetRules().filter(
    (rule) =>
      rule.selectorText &&
      rule.selectorText.includes(".fab-menu") &&
      rule.parentRule?.conditionText !== "(prefers-reduced-motion: reduce)" &&
      ["background", "border-color", "color", "box-shadow", "animation"].some(
        (prop) => rule.style.getPropertyPriority(prop) === "important",
      ),
  );
  assert.deepEqual(
    importantFabRules.map((rule) => rule.selectorText),
    [],
    "consolidated .fab-menu rules must not rely on !important",
  );
});

test("turning glass off removes the FAB blur", () => {
  const selector = `[data-glass-enabled="false"] ${fabGroup()}`;
  assertRule(selector, { "backdrop-filter": "none" });

  // jsdom drops the vendor-prefixed half of the rule, so that one property is
  // read from the CSS text; a browser without unprefixed backdrop-filter needs it.
  const css = fs.readFileSync(path.join(repoRoot, "css/styles.css"), "utf8");
  const prefixed = /\[data-glass-enabled="false"\]\s+\.fab-menu\s+:is\([^}]*?\)\s*\{[^}]*-webkit-backdrop-filter:\s*none;/;
  assert.match(css, prefixed);
  assert.ok(ruleFor(selector), "no glass-disabled FAB rule");
});

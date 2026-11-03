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
import { assertRule, repoRoot, ruleFor } from "./harness.mjs";

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

/** The one group every FAB control is styled through, in all its states. */
const fabGroup = (suffix = "", open = false) =>
  `${open ? ".fab-menu.open" : ".fab-menu"} :is(${CONTROLS.join(", ")})${suffix}`;

test("every FAB control shares one glass surface", () => {
  assertRule(fabGroup(), {
    background: "var(--glass-bg)",
    border: "1px solid var(--glass-border)",
    color: "var(--text-primary)",
    "box-shadow": "var(--glass-shadow)",
  });
});

test("a hovered FAB control takes the primary highlight", () => {
  assertRule(fabGroup(":hover"), {
    background: "var(--theme-highlight-bg-hover)",
    "border-color": "var(--theme-highlight-border)",
    color: "var(--on-primary-text)",
    "box-shadow": "var(--theme-highlight-shadow)",
  });

  // Inactive controls, the closed toggle among them. Only the surface changes
  // here: the border stays the base glass one, so this rule sets no border-color.
  assertRule(fabGroup(":not(.active):not(.is-locked):hover"), {
    background: "var(--theme-highlight-bg-hover)",
    color: "var(--on-primary-text)",
    "box-shadow": "var(--theme-highlight-shadow)",
  });
});

test("controls in an open menu keep the primary hover after their own rules", () => {
  assertRule(fabGroup(":hover", true), {
    background: "var(--theme-highlight-bg-hover)",
    color: "var(--on-primary-text)",
    "box-shadow": "var(--theme-highlight-shadow)",
    important: ["background", "color", "box-shadow"],
  });
  // The open toggle shows the active highlight even when it is not hovered.
  assertRule(".fab-menu.open .fab-menu-toggle", {
    background: "var(--theme-highlight-active-bg)",
    color: "var(--on-primary-text)",
    "box-shadow": "var(--theme-highlight-shadow)",
    important: ["background", "color", "box-shadow"],
  });
});

test("an open menu paints the toggled controls with a subtle primary glow", () => {
  assertRule(
    ".fab-menu.open :is(.layout-edit-btn.active, .layout-edit-btn[aria-pressed=\"true\"]:not(.is-locked))",
    {
      background:
        "linear-gradient(135deg, color-mix(in srgb, var(--primary-dark) 88%, transparent), color-mix(in srgb, var(--accent-bg) 68%, var(--primary-color) 32%))",
      "box-shadow":
        "inset 0 0 0 1px color-mix(in srgb, var(--on-primary-text) 18%, transparent), 0 0 0 2px color-mix(in srgb, var(--primary-light) 24%, transparent), 0 8px 18px color-mix(in srgb, var(--primary-dark) 34%, transparent)",
      animation: "none",
      important: ["background", "box-shadow", "animation"],
    },
  );
  assertRule(
    ".fab-menu.open :is(.quran-focus-btn.active, .quran-focus-btn[aria-pressed=\"true\"])",
    {
      background:
        "linear-gradient(135deg, color-mix(in srgb, var(--primary-dark) 88%, transparent), color-mix(in srgb, var(--accent-bg) 68%, var(--primary-color) 32%))",
      "box-shadow":
        "inset 0 0 0 1px color-mix(in srgb, var(--on-primary-text) 18%, transparent), 0 0 0 2px color-mix(in srgb, var(--accent-bg) 24%, transparent), 0 8px 18px color-mix(in srgb, var(--primary-dark) 34%, transparent)",
      important: ["background", "box-shadow"],
    },
  );
  assertRule(
    ".fab-menu.open :is(.sticky-note-toggle-btn[aria-pressed=\"true\"], .sticky-note-toggle-btn[data-sticky-notes-state=\"visible\"])",
    {
      background:
        "linear-gradient(135deg, color-mix(in srgb, var(--primary-dark) 88%, transparent), color-mix(in srgb, var(--accent-bg) 58%, var(--primary-color) 42%))",
      "box-shadow":
        "inset 0 0 0 1px color-mix(in srgb, var(--on-primary-text) 18%, transparent), 0 0 0 2px color-mix(in srgb, var(--accent-bg) 22%, transparent), 0 8px 18px color-mix(in srgb, var(--primary-dark) 34%, transparent)",
      important: ["background", "box-shadow"],
    },
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

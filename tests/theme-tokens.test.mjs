/**
 * ThemeTokens is the colour math of ThemeManager without the palette table, so
 * these assert numbers a stylesheet cannot answer. Every expected value here is
 * the one the code produced before the split.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { loadSandbox } from "./harness.mjs";

const FILES = ["js/settings-registry.js", "js/theme-tokens.js"];

function load() {
  return loadSandbox(FILES).ThemeTokens;
}

test("contrast ratio runs 21 for black on white and 1 for a colour on itself", () => {
  const tokens = load();

  assert.equal(tokens.calculateWcagContrastRatio("#000000", "#ffffff"), 21);
  assert.equal(tokens.calculateWcagContrastRatio("#ffffff", "#000000"), 21);
  assert.equal(tokens.calculateWcagContrastRatio("#1a5f4a", "#1a5f4a"), 1);
});

test("APCA keeps the sign convention the theme manager already had", () => {
  const tokens = load();

  // Ten times the WCAG ratio, so both directions are positive.
  assert.equal(
    tokens.calculateApcaContrast("#ffffff", "#0b0b0b"),
    tokens.calculateWcagContrastRatio("#ffffff", "#0b0b0b") * 10,
  );
  assert.equal(
    tokens.calculateApcaContrast("#111827", "#ffffff"),
    tokens.calculateWcagContrastRatio("#111827", "#ffffff") * 10,
  );
  assert.ok(tokens.calculateApcaContrast("#ffffff", "#0b0b0b") > 0);
  assert.ok(tokens.calculateApcaContrast("#111827", "#ffffff") > 0);
});

test("glass alpha endpoints are the same at 0 and 100, and out-of-range clamps", () => {
  const tokens = load();

  // Spread first: a value from the sandbox has that context's Object.prototype.
  assert.deepEqual({ ...tokens.glassAlphas(0) }, { bg: 0, hover: 0, border: 0 });
  assert.deepEqual({ ...tokens.glassAlphas(100) }, { bg: 1, hover: 1, border: 1 });
  assert.deepEqual({ ...tokens.glassAlphas(150) }, { ...tokens.glassAlphas(100) });
  assert.deepEqual({ ...tokens.glassAlphas(-20) }, { ...tokens.glassAlphas(0) });
  assert.deepEqual({ ...tokens.glassAlphas(35) }, {
    bg: 0.35,
    hover: 0.45,
    border: 0.4,
  });
});

test("background-aware text colours follow the background, not the mode", () => {
  const tokens = load();

  const onDark = tokens.resolveBackgroundAwareTextColors({
    bodyBg: "#0b0b0b",
    textPrimary: "#123456",
  });
  assert.equal(onDark.textPrimary, "#ffffff");
  assert.equal(onDark.textSecondary, "rgba(255, 255, 255, 0.84)");
  assert.equal(onDark.textMuted, "rgba(255, 255, 255, 0.62)");
  assert.equal(onDark.textPlaceholder, "rgba(255, 255, 255, 0.5)");
  // Other palette keys survive the override.
  assert.equal(onDark.bodyBg, "#0b0b0b");

  const onLight = tokens.resolveBackgroundAwareTextColors({
    bodyBg: "#ffffff",
    textPrimary: "#123456",
  });
  assert.equal(onLight.textPrimary, "#111827");
  assert.equal(onLight.textSecondary, "rgba(17, 24, 39, 0.78)");
  assert.equal(onLight.textMuted, "rgba(17, 24, 39, 0.58)");
  assert.equal(onLight.textPlaceholder, "rgba(17, 24, 39, 0.48)");

  // A palette with no body background falls back to the mode's own black.
  assert.equal(tokens.estimateEffectiveTextBackgroundColor({ bodyBg: "#123456" }), "#123456");
  assert.equal(tokens.estimateEffectiveTextBackgroundColor({}, "light"), "#ffffff");
  assert.equal(tokens.estimateEffectiveTextBackgroundColor({}, "dark"), "#000000");
});

test("setColorAlpha keeps the RGB channels and replaces the alpha", () => {
  const tokens = load();

  assert.equal(tokens.setColorAlpha("rgba(26, 95, 74, 0.35)", 0.5), "rgba(26, 95, 74, 0.5)");
  assert.equal(tokens.setColorAlpha("#1a5f4a", 0.1234), "rgba(26, 95, 74, 0.123)");
  assert.equal(tokens.setColorAlpha("#1a5f4a", 4), "rgba(26, 95, 74, 1)");
  // A value it cannot read comes back untouched.
  assert.equal(tokens.setColorAlpha("currentColor", 0.5), "currentColor");
});

test("hexToRgb round-trips through colorToHex", () => {
  const tokens = load();

  for (const hex of ["#1a5f4a", "#ffffff", "#000000", "#d4af37"]) {
    const rgb = tokens.hexToRgb(hex);
    assert.equal(tokens.colorToHex(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`), hex);
  }
  assert.deepEqual({ ...tokens.hexToRgb("#1a5f4a") }, { r: 26, g: 95, b: 74 });
  // Unreadable values are what the callers already fall back on.
  assert.equal(tokens.hexToRgb("nope"), null);
  assert.equal(tokens.colorToHex("nope", "#ffffff"), "#ffffff");
});

test("mixHexToRgb returns its own two inputs at the ends of the weight", () => {
  const tokens = load();

  assert.equal(tokens.mixHexToRgb("#000000", "#ffffff", 0), "rgb(0, 0, 0)");
  assert.equal(tokens.mixHexToRgb("#000000", "#ffffff", 1), "rgb(255, 255, 255)");
  assert.equal(tokens.mixHexToRgb("#000000", "#ffffff", 0.5), "rgb(128, 128, 128)");
});

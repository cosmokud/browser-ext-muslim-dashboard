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

test("toRgbChannelString, rgbToHex, and hslToHex convert canonical color formats", () => {
  const tokens = load();

  assert.equal(tokens.toRgbChannelString("#1a5f4a"), "26, 95, 74");
  assert.equal(tokens.toRgbChannelString("#abc"), "170, 187, 204");
  assert.equal(tokens.toRgbChannelString("rgba(10, 20, 30, 0.5)"), "10, 20, 30");
  assert.equal(tokens.toRgbChannelString("  5 , 300 , 12 "), "5, 255, 12");
  assert.equal(tokens.toRgbChannelString({ r: 12.6, g: -4, b: 260 }), "13, 0, 255");
  assert.equal(tokens.toRgbChannelString("not-a-color", "15, 23, 42"), "15, 23, 42");

  assert.equal(tokens.rgbToHex(26, 95, 74), "#1a5f4a");
  assert.equal(tokens.rgbToHex(-10, 300, 15.6), "#00ff10");

  assert.equal(tokens.hslToHex(0, 100, 50), "#ff0000");
  assert.equal(tokens.hslToHex(120, 100, 50), "#00ff00");
  assert.equal(tokens.hslToHex(240, 100, 50), "#0000ff");
  assert.equal(tokens.hslToHex(360, 0, 100), "#ffffff");
});

test("resolveSurfaceTokens handles glass 0%, 35%, 50%, 100% and rule defaults", () => {
  const tokens = load();
  const palette = {
    primary: "#1a5f4a",
    primaryLight: "#2e8b6f",
    primaryDark: "#0f3d2e",
    bodyBg: "#0a1f18",
    glassBg: "rgba(26, 95, 74, 0.35)",
    glassBgHover: "rgba(26, 95, 74, 0.45)",
    glassBorder: "rgba(26, 95, 74, 0.4)",
  };

  // 0%: strictly zero subtle alpha and blurFactor 0
  const zeroDark = tokens.resolveSurfaceTokens(palette, {
    glassEnabled: true,
    opacity: 0,
    mode: "dark",
  });
  assert.equal(zeroDark.opacityRatio, 0);
  assert.equal(zeroDark.blurFactor, 0);
  assert.equal(zeroDark.glassBg, "rgba(26, 95, 74, 0)");
  assert.equal(zeroDark.glassBgHover, "rgba(26, 95, 74, 0)");
  assert.equal(zeroDark.glassBorder, "rgba(26, 95, 74, 0)");
  assert.equal(zeroDark.glassBgSubtle, "rgba(255, 255, 255, 0)");
  assert.equal(zeroDark.surfaceTintRgb, "255, 255, 255");
  assert.equal(zeroDark.surfaceRgb, "26, 95, 74");

  const zeroLight = tokens.resolveSurfaceTokens(palette, {
    glassEnabled: true,
    opacity: 0,
    mode: "light",
  });
  assert.equal(zeroLight.blurFactor, 0);
  assert.equal(zeroLight.surfaceTintRgb, "15, 23, 42");
  assert.equal(zeroLight.glassBgSubtle, "rgba(15, 23, 42, 0)");

  // 35%
  const thirtyFive = tokens.resolveSurfaceTokens(palette, {
    glassEnabled: true,
    opacity: 35,
    mode: "dark",
  });
  assert.equal(thirtyFive.opacityRatio, 0.35);
  assert.equal(thirtyFive.blurFactor, 1);
  assert.equal(thirtyFive.glassBg, "rgba(26, 95, 74, 0.35)");
  assert.equal(thirtyFive.glassBgHover, "rgba(26, 95, 74, 0.45)");
  assert.equal(thirtyFive.glassBorder, "rgba(26, 95, 74, 0.4)");
  assert.equal(thirtyFive.glassBgSubtle, "rgba(255, 255, 255, 0.021)");

  // Default glassOpacity rule coerces undefined to 50%; componentOpacity coerces undefined to 0%
  const defaultGlass = tokens.resolveSurfaceTokens(palette, {
    glassEnabled: true,
    mode: "dark",
  });
  assert.equal(defaultGlass.opacityRatio, 0.5);
  assert.equal(defaultGlass.blurFactor, 1);
  assert.equal(defaultGlass.glassBg, "rgba(26, 95, 74, 0.5)");
  assert.equal(defaultGlass.glassBgSubtle, "rgba(255, 255, 255, 0.03)");

  const defaultComponent = tokens.resolveSurfaceTokens(palette, {
    glassEnabled: true,
    mode: "dark",
    opacityRule: "componentOpacity",
  });
  assert.equal(defaultComponent.opacityRatio, 0);
  assert.equal(defaultComponent.blurFactor, 0);
  assert.equal(defaultComponent.glassBgSubtle, "rgba(255, 255, 255, 0)");

  // 100%
  const full = tokens.resolveSurfaceTokens(palette, {
    glassEnabled: true,
    opacity: 100,
    mode: "dark",
  });
  assert.equal(full.opacityRatio, 1);
  assert.equal(full.blurFactor, 1);
  assert.equal(full.glassBg, "rgba(26, 95, 74, 1)");
  assert.equal(full.glassBgHover, "rgba(26, 95, 74, 1)");
  assert.equal(full.glassBorder, "rgba(26, 95, 74, 1)");
  assert.equal(full.glassBgSubtle, "rgba(255, 255, 255, 0.06)");
});

test("resolveSurfaceTokens resolves solid light and dark surfaces with safe fallbacks", () => {
  const tokens = load();

  const solidDark = tokens.resolveSurfaceTokens(
    { primary: "#1a5f4a", primaryLight: "#2e8b6f" },
    { glassEnabled: false, mode: "dark" },
  );
  assert.equal(solidDark.opacityRatio, 1);
  assert.equal(solidDark.blurFactor, 0);
  assert.equal(
    solidDark.glassBg,
    tokens.mixHexToRgb(tokens.SOLID_BASE_HEX.dark, "#1a5f4a", tokens.SOLID_MIX_WEIGHTS.dark.bg),
  );
  assert.equal(
    solidDark.glassBgHover,
    tokens.mixHexToRgb(tokens.SOLID_BASE_HEX.dark, "#1a5f4a", tokens.SOLID_MIX_WEIGHTS.dark.hover),
  );
  assert.equal(
    solidDark.glassBorder,
    tokens.mixHexToRgb(tokens.SOLID_BASE_HEX.dark, "#2e8b6f", tokens.SOLID_MIX_WEIGHTS.dark.border),
  );
  assert.equal(solidDark.glassBgSubtle, "rgba(255, 255, 255, 0.06)");
  assert.equal(solidDark.surfaceRgb, tokens.toRgbChannelString(solidDark.glassBg));

  const solidLight = tokens.resolveSurfaceTokens(
    { primary: "#1a5f4a", primaryLight: "#2e8b6f" },
    { glassEnabled: false, mode: "light" },
  );
  assert.equal(solidLight.opacityRatio, 1);
  assert.equal(solidLight.blurFactor, 0);
  assert.equal(
    solidLight.glassBg,
    tokens.mixHexToRgb(tokens.SOLID_BASE_HEX.light, "#1a5f4a", tokens.SOLID_MIX_WEIGHTS.light.bg),
  );
  assert.equal(solidLight.glassBgSubtle, "rgba(15, 23, 42, 0.05)");

  // Invalid colors fall back safely instead of producing null/NaN
  const fallbackDark = tokens.resolveSurfaceTokens({}, { glassEnabled: false, mode: "dark" });
  assert.equal(fallbackDark.glassBg, "rgb(30, 30, 50)");
  assert.equal(fallbackDark.surfaceRgb, "30, 30, 50");

  const fallbackLight = tokens.resolveSurfaceTokens({}, { glassEnabled: false, mode: "light" });
  assert.equal(fallbackLight.glassBg, "rgb(255, 255, 255)");
  assert.equal(fallbackLight.surfaceRgb, "255, 255, 255");
});

test("resolveHighlightTokens, applySurfaceTokens, and clearSurfaceTokens stay symmetric without a hidden 30% floor", () => {
  const tokens = load();
  assert.equal(tokens.HIGHLIGHT_MIN_OPACITY, undefined);

  const darkPalette = {
    primary: "#1a5f4a",
    primaryLight: "#2e8b6f",
    primaryDark: "#0f3d2e",
    onPrimaryText: "#ffffff",
    textPrimary: "#ffffff",
    glassBg: "rgba(26, 95, 74, 0.35)",
    glassBgHover: "rgba(26, 95, 74, 0.45)",
    glassBorder: "rgba(26, 95, 74, 0.4)",
  };
  const lightPalette = {
    ...darkPalette,
    textPrimary: "#1a1a2e",
  };

  // Default accentOpacity rule coerces undefined to 75%
  const defaultAccent = tokens.resolveHighlightTokens(darkPalette, {
    glassEnabled: true,
  });
  assert.equal(defaultAccent.opacityRatio, 0.75);
  assert.equal(defaultAccent.accentOpacity, "0.75");
  assert.equal(
    defaultAccent.accentBg,
    "linear-gradient(135deg, rgba(26, 95, 74, 0.75), rgba(46, 139, 111, 0.75))",
  );
  assert.equal(
    defaultAccent.activeBg,
    "linear-gradient(135deg, rgba(15, 61, 46, 0.75), rgba(26, 95, 74, 0.75))",
  );
  assert.equal(
    defaultAccent.bgHover,
    "linear-gradient(135deg, rgba(15, 61, 46, 0.862), rgba(26, 95, 74, 0.862))",
  );
  assert.equal(defaultAccent.border, "rgba(46, 139, 111, 0.863)");
  assert.equal(defaultAccent.accentBorder, "rgba(46, 139, 111, 0.863)");
  assert.equal(defaultAccent.lightBg, "rgba(46, 139, 111, 0.862)");
  assert.equal(defaultAccent.lightSubtleBg, "rgba(46, 139, 111, 0.105)");
  assert.equal(defaultAccent.shadow, "0 8px 18px rgba(15, 61, 46, 0.24)");
  assert.equal(defaultAccent.accentText, "#ffffff");

  // 0%: strictly zero fill/shadow alpha, crisp 0.45 border, readable text in light and dark modes
  const zeroDark = tokens.resolveHighlightTokens(darkPalette, {
    glassEnabled: true,
    opacity: 0,
  });
  assert.equal(zeroDark.opacityRatio, 0);
  assert.equal(zeroDark.accentOpacity, "0");
  assert.equal(
    zeroDark.accentBg,
    "linear-gradient(135deg, rgba(26, 95, 74, 0), rgba(46, 139, 111, 0))",
  );
  assert.equal(
    zeroDark.activeBg,
    "linear-gradient(135deg, rgba(15, 61, 46, 0), rgba(26, 95, 74, 0))",
  );
  assert.equal(
    zeroDark.bgHover,
    "linear-gradient(135deg, rgba(15, 61, 46, 0), rgba(26, 95, 74, 0))",
  );
  assert.equal(zeroDark.lightBg, "rgba(46, 139, 111, 0)");
  assert.equal(zeroDark.lightSubtleBg, "rgba(46, 139, 111, 0)");
  assert.equal(zeroDark.border, "rgba(46, 139, 111, 0.45)");
  assert.equal(zeroDark.accentBorder, "rgba(46, 139, 111, 0.45)");
  assert.equal(zeroDark.shadow, "none");
  assert.equal(zeroDark.accentShadow, "none");
  assert.equal(zeroDark.accentText, "#ffffff");

  const zeroLight = tokens.resolveHighlightTokens(lightPalette, {
    glassEnabled: true,
    opacity: 0,
  });
  assert.equal(zeroLight.accentText, "#1a1a2e");

  // 100% glass and solid mode both produce full solid fills and borders
  const fullGlass = tokens.resolveHighlightTokens(lightPalette, {
    glassEnabled: true,
    opacity: 100,
  });
  assert.equal(fullGlass.opacityRatio, 1);
  assert.equal(
    fullGlass.accentBg,
    "linear-gradient(135deg, rgba(26, 95, 74, 1), rgba(46, 139, 111, 1))",
  );
  assert.equal(fullGlass.border, "rgba(46, 139, 111, 1)");
  assert.equal(fullGlass.accentText, "#ffffff");
  assert.equal(fullGlass.shadow, "0 8px 18px rgba(15, 61, 46, 0.32)");

  const solidHighlights = tokens.resolveHighlightTokens(lightPalette, {
    glassEnabled: false,
    opacity: 0,
  });
  assert.equal(
    solidHighlights.activeBg,
    "linear-gradient(135deg, rgba(15, 61, 46, 1), rgba(26, 95, 74, 1))",
  );
  assert.equal(solidHighlights.border, "rgba(46, 139, 111, 1)");
  assert.equal(solidHighlights.lightSubtleBg, "rgba(46, 139, 111, 0.14)");
  assert.equal(solidHighlights.shadow, "0 8px 18px rgba(15, 61, 46, 0.32)");
  assert.equal(solidHighlights.accentText, "#ffffff");

  const props = new Map();
  const fakeEl = {
    style: {
      setProperty: (k, v) => props.set(k, v),
      removeProperty: (k) => props.delete(k),
      getPropertyValue: (k) => props.get(k) || "",
    },
  };
  const surface = tokens.resolveSurfaceTokens(darkPalette, {
    glassEnabled: true,
    opacity: 50,
    mode: "dark",
  });

  tokens.applySurfaceTokens(fakeEl, surface, defaultAccent);
  for (const name of [
    ...tokens.SURFACE_CSS_VARS,
    ...tokens.ACCENT_SURFACE_CSS_VARS,
    ...tokens.HIGHLIGHT_CSS_VARS,
  ]) {
    assert.ok(props.has(name), `applySurfaceTokens should write ${name}`);
  }
  assert.equal(props.get("--surface-opacity"), "0.5");
  assert.equal(props.get("--surface-blur-factor"), "1");
  assert.equal(props.get("--surface-tint-rgb"), "255, 255, 255");
  assert.equal(props.get("--surface-rgb"), "26, 95, 74");
  assert.equal(props.get("--accent-opacity"), "0.75");

  tokens.clearSurfaceTokens(fakeEl);
  assert.equal(
    props.size,
    0,
    "clearSurfaceTokens should remove every surface, accent, and highlight var",
  );

  tokens.applyComponentSurfaceTokens(fakeEl, surface, defaultAccent);
  for (const name of tokens.COMPONENT_SURFACE_CSS_VARS) {
    assert.ok(props.has(name), `applyComponentSurfaceTokens should write ${name}`);
  }
  assert.equal(props.get("--component-opacity-factor"), "0.5");
  assert.equal(props.get("--component-blur-factor"), "1");
  tokens.clearComponentSurfaceTokens(fakeEl);
  assert.equal(props.size, 0, "clearComponentSurfaceTokens should remove every component var");
});

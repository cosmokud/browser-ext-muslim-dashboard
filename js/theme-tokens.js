/**
 * Colour math for ThemeManager, callable without a page. Every method is a
 * static that answers from its arguments alone, so a value can be asserted
 * instead of a stylesheet's text. The palette table stays in js/themes.js:
 * these functions take colours, they never look one up.
 *
 * Loaded before js/themes.js; ThemeManager delegates here. glassOpacity rules
 * come from SettingsRegistry, which both pages load first.
 */
class ThemeTokens {
  static clampNumber(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }

  static estimateEffectiveTextBackgroundColor(colors, mode = "dark") {
    return colors?.bodyBg || (mode === "light" ? "#ffffff" : "#000000");
  }

  static calculateWcagContrastRatio(foreground, background) {
    const fg = ThemeTokens.hexToRgb(ThemeTokens.colorToHex(foreground, "#ffffff"));
    const bg = ThemeTokens.hexToRgb(ThemeTokens.colorToHex(background, "#000000"));
    if (!fg || !bg) return 1;

    const luminance = ({ r, g, b }) => {
      const channels = [r, g, b].map((channel) => {
        const value = channel / 255;
        return value <= 0.03928
          ? value / 12.92
          : Math.pow((value + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };

    const l1 = luminance(fg);
    const l2 = luminance(bg);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  static calculateApcaContrast(foreground, background) {
    return ThemeTokens.calculateWcagContrastRatio(foreground, background) * 10;
  }

  static resolveBackgroundAwareTextColors(colors, mode = "dark") {
    const apcaLight = ThemeTokens.calculateApcaContrast("#ffffff", colors.bodyBg);
    const wcagLight = ThemeTokens.calculateWcagContrastRatio("#ffffff", colors.bodyBg);
    const background = ThemeTokens.estimateEffectiveTextBackgroundColor(colors, mode);
    const wcagDark = ThemeTokens.calculateWcagContrastRatio("#111827", background);
    const useLight = apcaLight >= 45 || wcagLight >= wcagDark;

    return {
      ...colors,
      textPrimary: useLight ? "#ffffff" : "#111827",
      textSecondary: useLight
        ? "rgba(255, 255, 255, 0.84)"
        : "rgba(17, 24, 39, 0.78)",
      textMuted: useLight
        ? "rgba(255, 255, 255, 0.62)"
        : "rgba(17, 24, 39, 0.58)",
      textPlaceholder: useLight
        ? "rgba(255, 255, 255, 0.5)"
        : "rgba(17, 24, 39, 0.48)",
    };
  }

  static clampOpacity(value, fallback = 50) {
    return SettingsRegistry.coerce("glassOpacity", value, fallback);
  }

  static glassAlphas(percent) {
    const bgAlpha = ThemeTokens.clampOpacity(percent, 50) / 100;
    const hoverRatio = 0.45 / 0.35;
    const borderRatio = 0.4 / 0.35;
    const clampAlpha = (alpha) => {
      const bounded = Math.min(1, Math.max(0, alpha));
      return Number(bounded.toFixed(3));
    };

    return {
      bg: clampAlpha(bgAlpha),
      hover: clampAlpha(bgAlpha * hoverRatio),
      border: clampAlpha(bgAlpha * borderRatio),
    };
  }

  static extractRgbChannels(value) {
    if (typeof value !== "string") return null;
    const normalizedHex = ThemeTokens.normalizeHexColor(value);
    if (normalizedHex) {
      return {
        r: parseInt(normalizedHex.slice(1, 3), 16),
        g: parseInt(normalizedHex.slice(3, 5), 16),
        b: parseInt(normalizedHex.slice(5, 7), 16),
      };
    }

    const match = value
      .replace(/\s+/g, "")
      .match(/^rgba?\((\d+),(\d+),(\d+)(?:,[0-9.]+)?\)$/i);
    if (!match) return null;

    return {
      r: Number(match[1]),
      g: Number(match[2]),
      b: Number(match[3]),
    };
  }

  static setColorAlpha(value, alpha) {
    const rgb = ThemeTokens.extractRgbChannels(value);
    if (!rgb) return value;
    const bounded = Math.min(1, Math.max(0, Number(alpha)));
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Number(bounded.toFixed(3))})`;
  }

  static normalizeHexColor(value) {
    if (typeof value !== "string") return null;
    const hex = value.trim().toLowerCase();
    if (/^#([a-f\d]{6})$/i.test(hex)) return hex;

    const short = /^#([a-f\d]{3})$/i.exec(hex);
    if (!short) return null;

    const [r, g, b] = short[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  static colorToHex(value, fallback = null) {
    const normalizedHex = ThemeTokens.normalizeHexColor(value);
    if (normalizedHex) return normalizedHex;

    const rgb = ThemeTokens.extractRgbChannels(value);
    if (!rgb) return fallback;

    const toHex = (channel) =>
      Math.max(0, Math.min(255, Number(channel)))
        .toString(16)
        .padStart(2, "0");

    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }

  static resolveOnPrimaryText(candidateHex, primaryHex) {
    const normalizedCandidate = ThemeTokens.normalizeHexColor(candidateHex);
    if (normalizedCandidate) return normalizedCandidate;

    const normalizedPrimary = ThemeTokens.normalizeHexColor(primaryHex) || "#1a5f4a";
    return ThemeTokens.isDark(normalizedPrimary) ? "#ffffff" : "#1a1a1a";
  }

  static resolveAccentTextColor(candidateHex, accentBackgroundHex, mode = "dark") {
    const normalizedCandidate = ThemeTokens.normalizeHexColor(candidateHex);
    if (normalizedCandidate) return normalizedCandidate;

    const normalizedAccent =
      ThemeTokens.normalizeHexColor(accentBackgroundHex) || "#d4af37";
    const prefersLightText =
      ThemeTokens.isDark(normalizedAccent) || mode === "dark";

    return prefersLightText
      ? ThemeTokens.lighten(normalizedAccent, 48)
      : ThemeTokens.darken(normalizedAccent, 45);
  }

  static applyGlassOpacityToThemeColors(colors, percent) {
    if (!colors || typeof colors !== "object") return colors;

    const alphas = ThemeTokens.glassAlphas(percent);
    return {
      ...colors,
      glassBg: ThemeTokens.setColorAlpha(colors.glassBg, alphas.bg),
      glassBgHover: ThemeTokens.setColorAlpha(colors.glassBgHover, alphas.hover),
      glassBorder: ThemeTokens.setColorAlpha(colors.glassBorder, alphas.border),
    };
  }

  /**
   * Lighten a hex color by a percentage
   */
  static lighten(hex, percent) {
    const rgb = ThemeTokens.hexToRgb(hex);
    if (!rgb) return hex;

    const lighten = (c) =>
      Math.min(255, Math.round(c + (255 - c) * (percent / 100)));
    const r = lighten(rgb.r);
    const g = lighten(rgb.g);
    const b = lighten(rgb.b);

    return `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  /**
   * Darken a hex color by a percentage
   */
  static darken(hex, percent) {
    const rgb = ThemeTokens.hexToRgb(hex);
    if (!rgb) return hex;

    const darken = (c) => Math.max(0, Math.round(c * (1 - percent / 100)));
    const r = darken(rgb.r);
    const g = darken(rgb.g);
    const b = darken(rgb.b);

    return `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  static isDark(hex) {
    const rgb = ThemeTokens.hexToRgb(hex);
    if (!rgb) return false;
    // relative luminance approximation
    const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
    return luminance < 0.5;
  }

  static parseRgbaAlpha(value) {
    if (typeof value !== "string") return null;
    const match = value
      .replace(/\s+/g, "")
      .match(/^rgba\((\d+),(\d+),(\d+),([0-9.]+)\)$/i);
    if (!match) return null;
    const alpha = Number(match[4]);
    return Number.isFinite(alpha) ? alpha : null;
  }

  /**
   * Mix two hex colors and return an opaque rgb() string.
   * @param {string} baseHex
   * @param {string} mixHex
   * @param {number} mixWeight 0..1 amount of mixHex
   */
  static mixHexToRgb(baseHex, mixHex, mixWeight) {
    const base = ThemeTokens.hexToRgb(baseHex);
    const mix = ThemeTokens.hexToRgb(mixHex);
    if (!base || !mix) return null;

    const w = Math.max(0, Math.min(1, Number(mixWeight)));
    const blend = (a, b) => Math.round(a * (1 - w) + b * w);

    return `rgb(${blend(base.r, mix.r)}, ${blend(base.g, mix.g)}, ${blend(
      base.b,
      mix.b,
    )})`;
  }

  /**
   * Convert hex color to RGB object
   */
  static hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }
}

window.ThemeTokens = ThemeTokens;

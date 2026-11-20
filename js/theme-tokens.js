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
  static SOLID_MIX_WEIGHTS = {
    light: { bg: 0.12, hover: 0.18, border: 0.25 },
    dark: { bg: 0.38, hover: 0.48, border: 0.58 },
  };

  static SOLID_BASE_HEX = {
    light: "#ffffff",
    dark: "#1e1e32",
  };

  static DEFAULT_TAJWEED_COLORS = Object.freeze({
    ham_wasl: "#aaaaaa",
    slnt: "#aaaaaa",
    laam_shamsiyah: "#aaaaaa",
    madda_normal: "#537fff",
    madda_permissible: "#4050ff",
    madda_necessary: "#000ebc",
    qlq: "#db393f",
    madda_obligatory: "#2144c1",
    ikhf_shfw: "#cf43bd",
    ikhf: "#993ca5",
    idghm_shfw: "#58b800",
    iqlb: "#26bffd",
    idgh_ghn: "#169777",
    idgh_w_ghn: "#169200",
    idgh_mus: "#a1a1a1",
    ghn: "#ff7e1e",
  });

  static defaultTajweedColors() {
    return { ...ThemeTokens.DEFAULT_TAJWEED_COLORS };
  }

  static SURFACE_CSS_VARS = [
    "--glass-bg",
    "--glass-bg-hover",
    "--glass-border",
    "--glass-bg-subtle",
    "--glass-shadow",
    "--surface-opacity",
    "--surface-blur-factor",
    "--surface-tint-rgb",
    "--surface-rgb",
    "--glass-opacity-factor",
  ];

  static ACCENT_SURFACE_CSS_VARS = [
    "--accent-opacity",
    "--accent-surface-bg",
    "--accent-surface-bg-hover",
    "--accent-surface-border",
    "--accent-surface-text",
    "--accent-surface-shadow",
  ];

  static HIGHLIGHT_CSS_VARS = [
    "--theme-highlight-bg-hover",
    "--theme-highlight-active-bg",
    "--theme-highlight-border",
    "--theme-highlight-light-bg",
    "--theme-highlight-light-subtle-bg",
    "--theme-highlight-shadow",
  ];

  static COMPONENT_SURFACE_CSS_VARS = [
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
      .match(/^rgba?\(([0-9.]+),([0-9.]+),([0-9.]+)(?:,[0-9.]+)?\)$/i);
    if (!match) return null;

    const r = Number(match[1]);
    const g = Number(match[2]);
    const b = Number(match[3]);
    if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
      return null;
    }

    const clampChannel = (n) => Math.max(0, Math.min(255, Math.round(n)));
    return {
      r: clampChannel(r),
      g: clampChannel(g),
      b: clampChannel(b),
    };
  }

  static toRgbChannelString(value, fallback = "255, 255, 255") {
    if (value && typeof value === "object") {
      const r = Number(value.r);
      const g = Number(value.g);
      const b = Number(value.b);
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
        const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
        return `${clamp(r)}, ${clamp(g)}, ${clamp(b)}`;
      }
      return fallback;
    }

    if (typeof value !== "string") return fallback;

    const extracted = ThemeTokens.extractRgbChannels(value);
    if (extracted) {
      return `${extracted.r}, ${extracted.g}, ${extracted.b}`;
    }

    const bareMatch = value
      .trim()
      .match(/^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/);
    if (!bareMatch) return fallback;

    const clamp = (n) => Math.max(0, Math.min(255, parseInt(n, 10)));
    return `${clamp(bareMatch[1])}, ${clamp(bareMatch[2])}, ${clamp(bareMatch[3])}`;
  }

  static rgbToHex(r, g, b) {
    const toHex = (channel) =>
      Math.max(0, Math.min(255, Math.round(Number(channel) || 0)))
        .toString(16)
        .padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  static hslToRgb(h, s, l) {
    const hh = (((Number(h) || 0) % 360) + 360) % 360;
    const ss = Math.max(0, Math.min(100, Number(s) || 0)) / 100;
    const ll = Math.max(0, Math.min(100, Number(l) || 0)) / 100;

    const c = (1 - Math.abs(2 * ll - 1)) * ss;
    const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
    const m = ll - c / 2;

    let r1 = 0;
    let g1 = 0;
    let b1 = 0;

    if (hh < 60) {
      r1 = c;
      g1 = x;
    } else if (hh < 120) {
      r1 = x;
      g1 = c;
    } else if (hh < 180) {
      g1 = c;
      b1 = x;
    } else if (hh < 240) {
      g1 = x;
      b1 = c;
    } else if (hh < 300) {
      r1 = x;
      b1 = c;
    } else {
      r1 = c;
      b1 = x;
    }

    return {
      r: Math.round((r1 + m) * 255),
      g: Math.round((g1 + m) * 255),
      b: Math.round((b1 + m) * 255),
    };
  }

  static hslToHex(h, s, l) {
    const { r, g, b } = ThemeTokens.hslToRgb(h, s, l);
    return ThemeTokens.rgbToHex(r, g, b);
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

    return ThemeTokens.rgbToHex(rgb.r, rgb.g, rgb.b);
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

  static resolveSurfaceTokens(
    colors,
    {
      glassEnabled = true,
      opacity,
      mode = "dark",
      opacityRule = "glassOpacity",
    } = {},
  ) {
    const normalizedMode = mode === "light" ? "light" : "dark";
    const isLight = normalizedMode === "light";
    const surfaceTintRgb = isLight ? "15, 23, 42" : "255, 255, 255";
    const surfaceRgbFallback = isLight ? "255, 255, 255" : "15, 23, 42";

    if (glassEnabled !== false) {
      const coerced = SettingsRegistry.coerce(opacityRule, opacity);
      const opacityRatio = Number((coerced / 100).toFixed(3));
      const blurFactor = opacityRatio > 0 ? 1 : 0;
      const alphas = ThemeTokens.glassAlphas(coerced);
      const glassBg = ThemeTokens.setColorAlpha(colors?.glassBg, alphas.bg);
      const glassBgHover = ThemeTokens.setColorAlpha(
        colors?.glassBgHover,
        alphas.hover,
      );
      const glassBorder = ThemeTokens.setColorAlpha(
        colors?.glassBorder,
        alphas.border,
      );
      const glassBgSubtle = `rgba(${surfaceTintRgb}, ${Number(
        (0.06 * opacityRatio).toFixed(3),
      )})`;

      return {
        glassBg,
        glassBgHover,
        glassBorder,
        glassBgSubtle,
        glassShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        opacityRatio,
        blurFactor,
        surfaceTintRgb,
        surfaceRgb: ThemeTokens.toRgbChannelString(glassBg, surfaceRgbFallback),
      };
    }

    const weights = ThemeTokens.SOLID_MIX_WEIGHTS[normalizedMode];
    const baseHex =
      ThemeTokens.colorToHex(colors?.bodyBg) ||
      ThemeTokens.SOLID_BASE_HEX[normalizedMode];
    const glassBg =
      ThemeTokens.mixHexToRgb(baseHex, colors?.primary, weights.bg) ||
      (isLight ? "rgb(255, 255, 255)" : "rgb(30, 30, 50)");
    const glassBgHover =
      ThemeTokens.mixHexToRgb(baseHex, colors?.primary, weights.hover) ||
      (isLight ? "rgb(245, 245, 245)" : "rgb(40, 40, 60)");
    const glassBorder =
      ThemeTokens.mixHexToRgb(
        baseHex,
        colors?.primaryLight || colors?.primary,
        weights.border,
      ) || (isLight ? "rgb(220, 220, 220)" : "rgb(90, 90, 110)");

    return {
      glassBg,
      glassBgHover,
      glassBorder,
      glassBgSubtle: `rgba(${surfaceTintRgb}, ${isLight ? 0.05 : 0.06})`,
      glassShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
      opacityRatio: 1,
      blurFactor: 0,
      surfaceTintRgb,
      surfaceRgb: ThemeTokens.toRgbChannelString(glassBg, surfaceRgbFallback),
    };
  }

  static resolveHighlightTokens(
    colors,
    { glassEnabled = true, opacity, opacityRule = "accentOpacity" } = {},
  ) {
    const isGlass = glassEnabled !== false;
    const coerced = SettingsRegistry.coerce(opacityRule, opacity);
    const opacityRatio = isGlass ? Number((coerced / 100).toFixed(3)) : 1;
    const hoverAlpha = !isGlass
      ? 1
      : opacityRatio === 0
        ? 0
        : Math.min(1, Number((opacityRatio * 1.15).toFixed(3)));
    const borderAlpha = !isGlass
      ? 1
      : Number((0.45 + 0.55 * opacityRatio).toFixed(3));
    const lightSubtleAlpha = Number((opacityRatio * 0.14).toFixed(3));
    const shadowAlpha = Number((opacityRatio * 0.32).toFixed(3));

    const primary = colors?.primary;
    const primaryDark = colors?.primaryDark || primary;
    const primaryLight = colors?.primaryLight || primary;

    const accentBg = `linear-gradient(135deg, ${ThemeTokens.setColorAlpha(
      primary,
      opacityRatio,
    )}, ${ThemeTokens.setColorAlpha(primaryLight, opacityRatio)})`;
    const highlightDarkBg = ThemeTokens.setColorAlpha(primaryDark, opacityRatio);
    const highlightPrimaryBg = ThemeTokens.setColorAlpha(primary, opacityRatio);
    const highlightDarkHover = ThemeTokens.setColorAlpha(
      primaryDark,
      hoverAlpha,
    );
    const highlightPrimaryHover = ThemeTokens.setColorAlpha(
      primary,
      hoverAlpha,
    );
    const bgHover = `linear-gradient(135deg, ${highlightDarkHover}, ${highlightPrimaryHover})`;
    const activeBg = `linear-gradient(135deg, ${highlightDarkBg}, ${highlightPrimaryBg})`;
    const border = ThemeTokens.setColorAlpha(primaryLight, borderAlpha);
    const lightBg = ThemeTokens.setColorAlpha(primaryLight, hoverAlpha);
    const lightSubtleBg = ThemeTokens.setColorAlpha(
      primaryLight,
      lightSubtleAlpha,
    );
    const shadow =
      opacityRatio === 0
        ? "none"
        : `0 8px 18px ${ThemeTokens.setColorAlpha(primaryDark, shadowAlpha)}`;
    const onPrimaryText = ThemeTokens.resolveOnPrimaryText(
      colors?.onPrimaryText,
      primary,
    );
    const accentText =
      !isGlass || coerced >= 25
        ? onPrimaryText
        : colors?.textPrimary || onPrimaryText;

    return {
      opacityRatio,
      accentOpacity: String(opacityRatio),
      accentBg,
      accentBgHover: bgHover,
      accentBorder: border,
      accentText,
      accentShadow: shadow,
      bgHover,
      activeBg,
      border,
      lightBg,
      lightSubtleBg,
      shadow,
    };
  }

  static applyAccentSurfaceTokens(element, tokens) {
    if (!element?.style || !tokens) return;
    if (tokens.accentOpacity !== undefined) {
      element.style.setProperty("--accent-opacity", String(tokens.accentOpacity));
    }
    if (tokens.accentBg !== undefined) {
      element.style.setProperty("--accent-surface-bg", tokens.accentBg);
    }
    if (tokens.accentBgHover !== undefined) {
      element.style.setProperty(
        "--accent-surface-bg-hover",
        tokens.accentBgHover,
      );
    }
    if (tokens.accentBorder !== undefined) {
      element.style.setProperty("--accent-surface-border", tokens.accentBorder);
    }
    if (tokens.accentText !== undefined) {
      element.style.setProperty("--accent-surface-text", tokens.accentText);
    }
    if (tokens.accentShadow !== undefined) {
      element.style.setProperty("--accent-surface-shadow", tokens.accentShadow);
    }
  }

  static applyHighlightTokens(element, highlightTokens) {
    if (!element?.style || !highlightTokens) return;
    ThemeTokens.applyAccentSurfaceTokens(element, highlightTokens);
    if (highlightTokens.bgHover !== undefined) {
      element.style.setProperty(
        "--theme-highlight-bg-hover",
        highlightTokens.bgHover,
      );
    }
    if (highlightTokens.activeBg !== undefined) {
      element.style.setProperty(
        "--theme-highlight-active-bg",
        highlightTokens.activeBg,
      );
    }
    if (highlightTokens.border !== undefined) {
      element.style.setProperty(
        "--theme-highlight-border",
        highlightTokens.border,
      );
    }
    if (highlightTokens.lightBg !== undefined) {
      element.style.setProperty(
        "--theme-highlight-light-bg",
        highlightTokens.lightBg,
      );
    }
    if (highlightTokens.lightSubtleBg !== undefined) {
      element.style.setProperty(
        "--theme-highlight-light-subtle-bg",
        highlightTokens.lightSubtleBg,
      );
    }
    if (highlightTokens.shadow !== undefined) {
      element.style.setProperty(
        "--theme-highlight-shadow",
        highlightTokens.shadow,
      );
    }
  }

  static applySurfaceTokens(
    element,
    surfaceTokens,
    highlightTokens = null,
    { includeShadow = true } = {},
  ) {
    if (!element?.style) return;

    if (surfaceTokens) {
      if (surfaceTokens.glassBg !== undefined) {
        element.style.setProperty("--glass-bg", surfaceTokens.glassBg);
      }
      if (surfaceTokens.glassBgHover !== undefined) {
        element.style.setProperty(
          "--glass-bg-hover",
          surfaceTokens.glassBgHover,
        );
      }
      if (surfaceTokens.glassBorder !== undefined) {
        element.style.setProperty("--glass-border", surfaceTokens.glassBorder);
      }
      if (surfaceTokens.glassBgSubtle !== undefined) {
        element.style.setProperty(
          "--glass-bg-subtle",
          surfaceTokens.glassBgSubtle,
        );
      }
      if (includeShadow && surfaceTokens.glassShadow !== undefined) {
        element.style.setProperty("--glass-shadow", surfaceTokens.glassShadow);
      }
      if (surfaceTokens.opacityRatio !== undefined) {
        const opacityStr = String(surfaceTokens.opacityRatio);
        element.style.setProperty("--surface-opacity", opacityStr);
        element.style.setProperty("--glass-opacity-factor", opacityStr);
      }
      if (surfaceTokens.blurFactor !== undefined) {
        element.style.setProperty(
          "--surface-blur-factor",
          String(surfaceTokens.blurFactor),
        );
      }
      if (surfaceTokens.surfaceTintRgb !== undefined) {
        element.style.setProperty(
          "--surface-tint-rgb",
          surfaceTokens.surfaceTintRgb,
        );
      }
      if (surfaceTokens.surfaceRgb !== undefined) {
        element.style.setProperty("--surface-rgb", surfaceTokens.surfaceRgb);
      }
    }

    if (highlightTokens) {
      ThemeTokens.applyHighlightTokens(element, highlightTokens);
    }
  }

  static clearSurfaceTokens(element) {
    if (!element?.style) return;
    for (const prop of ThemeTokens.SURFACE_CSS_VARS) {
      element.style.removeProperty(prop);
    }
    for (const prop of ThemeTokens.ACCENT_SURFACE_CSS_VARS) {
      element.style.removeProperty(prop);
    }
    for (const prop of ThemeTokens.HIGHLIGHT_CSS_VARS) {
      element.style.removeProperty(prop);
    }
  }

  static applyComponentSurfaceTokens(root, surfaceTokens, highlightTokens = null) {
    if (!root?.style) return;

    if (surfaceTokens) {
      if (surfaceTokens.opacityRatio !== undefined) {
        root.style.setProperty(
          "--component-opacity-factor",
          String(surfaceTokens.opacityRatio),
        );
      }
      if (surfaceTokens.blurFactor !== undefined) {
        root.style.setProperty(
          "--component-blur-factor",
          String(surfaceTokens.blurFactor),
        );
      }
      if (surfaceTokens.glassBg !== undefined) {
        root.style.setProperty("--component-glass-bg", surfaceTokens.glassBg);
      }
      if (surfaceTokens.glassBgHover !== undefined) {
        root.style.setProperty(
          "--component-glass-bg-hover",
          surfaceTokens.glassBgHover,
        );
      }
      if (surfaceTokens.glassBorder !== undefined) {
        root.style.setProperty(
          "--component-glass-border",
          surfaceTokens.glassBorder,
        );
      }
      if (surfaceTokens.glassBgSubtle !== undefined) {
        root.style.setProperty(
          "--component-glass-bg-subtle",
          surfaceTokens.glassBgSubtle,
        );
      }
    }

    if (highlightTokens) {
      root.style.setProperty(
        "--component-highlight-bg-hover",
        highlightTokens.bgHover,
      );
      root.style.setProperty(
        "--component-highlight-active-bg",
        highlightTokens.activeBg,
      );
      root.style.setProperty(
        "--component-highlight-border",
        highlightTokens.border,
      );
      root.style.setProperty(
        "--component-highlight-light-bg",
        highlightTokens.lightBg,
      );
      root.style.setProperty(
        "--component-highlight-light-subtle-bg",
        highlightTokens.lightSubtleBg,
      );
      root.style.setProperty(
        "--component-highlight-shadow",
        highlightTokens.shadow,
      );
    }
  }

  static clearComponentSurfaceTokens(root) {
    if (!root?.style) return;
    for (const prop of ThemeTokens.COMPONENT_SURFACE_CSS_VARS) {
      root.style.removeProperty(prop);
    }
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
    return ThemeTokens.rgbToHex(lighten(rgb.r), lighten(rgb.g), lighten(rgb.b));
  }

  /**
   * Darken a hex color by a percentage
   */
  static darken(hex, percent) {
    const rgb = ThemeTokens.hexToRgb(hex);
    if (!rgb) return hex;

    const darken = (c) => Math.max(0, Math.round(c * (1 - percent / 100)));
    return ThemeTokens.rgbToHex(darken(rgb.r), darken(rgb.g), darken(rgb.b));
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
    if (typeof hex !== "string") return null;
    const trimmed = hex.trim();
    const normalized = ThemeTokens.normalizeHexColor(
      trimmed.startsWith("#") ? trimmed : `#${trimmed}`,
    );
    if (!normalized) return null;
    return {
      r: parseInt(normalized.slice(1, 3), 16),
      g: parseInt(normalized.slice(3, 5), 16),
      b: parseInt(normalized.slice(5, 7), 16),
    };
  }
}

globalThis.ThemeTokens = ThemeTokens;

/**
 * Popup Prayer Times
 * Reuses dashboard prayer calculations/settings so popup and grid stay in sync.
 */

document.addEventListener("DOMContentLoaded", () => {
  const storage = new StorageManager();
  const themes = new ThemeManager(storage);
  const iconThemes = new IconThemeManager(storage);

  // Expose icon theme manager for PrayerTimesManager.getIconHtml()
  window.dashboard = {
    iconThemes,
  };

  const prayerTimes = new PrayerTimesManager(storage);

  const prayerCard = document.getElementById("prayerTimesCard");
  const hiddenCard = document.getElementById("popupPrayerHiddenState");
  const openDashboardButton = document.getElementById("popupOpenDashboardBtn");
  const openLocationSettingsIcon = document.getElementById(
    "popupOpenLocationSettingsIcon",
  );
  const openPrayerSettingsButton = document.getElementById(
    "popupOpenPrayerSettingsBtn",
  );
  const popupBlurMenu = document.getElementById("popupBlurMenu");
  const popupBlurMenuButton = document.getElementById("popupBlurMenuBtn");
  const popupBlurModal = document.getElementById("popupBlurModal");
  const popupBlurCloseBtn = document.getElementById("popupBlurClose");
  const popupBlurResetBtn = document.getElementById("popupBlurResetBtn");
  const popupBlurPowerWrap = document.getElementById("popupBlurPowerWrap");
  const popupBlurPowerSlider = document.getElementById("popupBlurPowerSlider");
  const popupBlurPowerValue = document.getElementById("popupBlurPowerValue");
  const popupUseCustomColorsToggle = document.getElementById(
    "popupUseCustomColors",
  );
  const popupColorSourceText = document.getElementById("popupColorSourceText");
  const popupPaletteFields = document.getElementById("popupPaletteFields");
  const popupBlurPrimaryInput = document.getElementById(
    "popupBlurPrimaryColor",
  );
  const popupBlurAccentInput = document.getElementById("popupBlurAccentColor");
  const popupBlurBackgroundInput = document.getElementById(
    "popupBlurBackgroundColor",
  );
  const popupBlurTintInput = document.getElementById("popupBlurTintColor");
  const popupGlassStateButtons = Array.from(
    document.querySelectorAll("[data-popup-glass-state]"),
  );
  const popupBlurColorResetButtons = Array.from(
    document.querySelectorAll("[data-popup-reset-color]"),
  );

  const settingsStorageKey = `${storage.prefix}settings`;
  const locationStorageKey = `${storage.prefix}lastLocation`;
  const popupBlurStorageKey = "popupBlurSettings";
  const popupBlurDefaults = {
    glassState: "dashboard",
    customBlurEnabled: false,
    customBlurPower: 100,
    colorSource: "follow",
    palette: {
      primary: "#1a5f4a",
      accent: "#d4af37",
      background: "#1a1a2e",
      glassTint: "#1a5f4a",
    },
  };

  let prayerInitialized = false;
  let resyncIntervalId = null;
  let popupBlurSettings = null;
  let popupBlurPortalled = false;
  let popupBlurPositionRaf = null;

  function getDashboardUrl(pathWithQuery = "index.html") {
    return typeof chrome !== "undefined" && chrome.runtime?.getURL
      ? chrome.runtime.getURL(pathWithQuery)
      : pathWithQuery;
  }

  function closePopup() {
    try {
      window.close();
    } catch (e) {
      // ignore
    }
  }

  function openUrlInCurrentTab(url) {
    if (!url) return;

    const fallbackNavigate = () => {
      try {
        window.location.assign(url);
      } catch (error) {
        console.warn("Could not navigate to dashboard URL:", error);
      }
    };

    const updateTabAndClose = (tabId = null) => {
      if (!(typeof chrome !== "undefined" && chrome.tabs?.update)) {
        fallbackNavigate();
        return;
      }

      const onUpdated = () => {
        const lastError = chrome.runtime?.lastError;
        if (lastError) {
          console.warn("Could not update active tab:", lastError.message);
          fallbackNavigate();
          return;
        }

        closePopup();
      };

      if (typeof tabId === "number") {
        chrome.tabs.update(tabId, { url }, onUpdated);
        return;
      }

      chrome.tabs.update({ url }, onUpdated);
    };

    try {
      if (
        typeof chrome !== "undefined" &&
        chrome.tabs?.query &&
        chrome.tabs?.update
      ) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const queryError = chrome.runtime?.lastError;
          if (queryError) {
            console.warn("Could not query active tab:", queryError.message);
            updateTabAndClose(null);
            return;
          }

          const activeTab = Array.isArray(tabs) ? tabs[0] : null;
          const activeTabId =
            activeTab && typeof activeTab.id === "number" ? activeTab.id : null;

          updateTabAndClose(activeTabId);
        });
        return;
      }
    } catch (error) {
      console.warn("Could not route to dashboard in current tab:", error);
    }

    fallbackNavigate();
  }

  function openDashboardTab() {
    openUrlInCurrentTab(getDashboardUrl("index.html"));
  }

  function openDashboardSettingsTab(tabName) {
    if (!tabName) {
      openDashboardTab();
      return;
    }

    const allowedTabs = new Set(["location", "prayer"]);
    const normalizedTab = String(tabName).trim();

    if (!allowedTabs.has(normalizedTab)) {
      openDashboardTab();
      return;
    }

    const targetUrl = getDashboardUrl(
      `index.html?settingsTab=${encodeURIComponent(normalizedTab)}`,
    );
    openUrlInCurrentTab(targetUrl);
  }

  function syncActionIcons() {
    const applyIcon = (element, emoji, size = 16) => {
      if (!element) return;
      element.innerHTML = iconThemes.getIcon(emoji, {
        size,
        className: "popup-action-icon",
        inline: true,
      });
    };

    const blurState = ensurePopupBlurSettings().glassState;
    const blurEmoji =
      blurState === "off" ? "⬜" : blurState === "on" ? "✨" : "🔗";

    applyIcon(openPrayerSettingsButton, "⚙️", 17);
    applyIcon(openDashboardButton, "⚙️", 18);
    applyIcon(openLocationSettingsIcon, "📍", 17);
    applyIcon(popupBlurMenuButton, blurEmoji, 17);
  }

  function bindShortcut(element, handler) {
    if (!element) return;
    if (typeof handler !== "function") return;

    element.addEventListener("click", () => {
      handler();
    });

    element.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      handler();
    });
  }

  function clampNumber(value, min, max, fallback) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return fallback;
    return Math.min(max, Math.max(min, numericValue));
  }

  function normalizeHexColor(
    value,
    fallback = popupBlurDefaults.palette.primary,
  ) {
    const source = String(value || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(source)) {
      return source.toLowerCase();
    }
    return fallback;
  }

  function ensurePopupBlurPortal() {
    if (!popupBlurModal || popupBlurPortalled) return;

    try {
      document.body.appendChild(popupBlurModal);
      popupBlurModal.classList.add("blur-popup-portal");
      popupBlurPortalled = true;
    } catch (e) {
      popupBlurPortalled = false;
    }
  }

  function positionPopupBlurModal() {
    if (
      !popupBlurMenu ||
      !popupBlurModal ||
      !popupBlurModal.classList.contains("blur-popup-open")
    ) {
      return;
    }

    const anchorRect = popupBlurMenu.getBoundingClientRect();
    const viewportPadding = 8;
    const gap = 8;

    const popupWidth = Math.max(
      220,
      Math.round(popupBlurModal.offsetWidth || 320),
    );
    const popupHeight = Math.max(
      220,
      Math.round(popupBlurModal.offsetHeight || 420),
    );

    let left = Math.round(anchorRect.right - popupWidth);
    left = Math.max(
      viewportPadding,
      Math.min(left, window.innerWidth - viewportPadding - popupWidth),
    );

    const belowTop = Math.round(anchorRect.bottom + gap);
    const aboveTop = Math.round(anchorRect.top - gap - popupHeight);
    const canFitBelow =
      belowTop + popupHeight <= window.innerHeight - viewportPadding;
    const canFitAbove = aboveTop >= viewportPadding;

    let top = belowTop;
    if (!canFitBelow && canFitAbove) {
      top = aboveTop;
    } else if (!canFitBelow && !canFitAbove) {
      top = Math.max(
        viewportPadding,
        Math.min(top, window.innerHeight - viewportPadding - popupHeight),
      );
    }

    popupBlurModal.style.left = `${left}px`;
    popupBlurModal.style.top = `${top}px`;
    popupBlurModal.style.right = "auto";
    popupBlurModal.style.bottom = "auto";
  }

  function schedulePopupBlurPosition() {
    if (popupBlurPositionRaf) {
      cancelAnimationFrame(popupBlurPositionRaf);
    }

    popupBlurPositionRaf = requestAnimationFrame(() => {
      positionPopupBlurModal();
    });
  }

  function normalizePopupPalette(palette, fallbackPalette) {
    const fallback = fallbackPalette || popupBlurDefaults.palette;

    return {
      primary: normalizeHexColor(palette?.primary, fallback.primary),
      accent: normalizeHexColor(palette?.accent, fallback.accent),
      background: normalizeHexColor(
        palette?.background ?? palette?.bodyBg,
        fallback.background,
      ),
      glassTint: normalizeHexColor(
        palette?.glassTint ?? palette?.tintColor,
        fallback.glassTint,
      ),
    };
  }

  function hexToRgb(hexColor) {
    const normalized = normalizeHexColor(hexColor);
    const red = parseInt(normalized.slice(1, 3), 16);
    const green = parseInt(normalized.slice(3, 5), 16);
    const blue = parseInt(normalized.slice(5, 7), 16);
    return { r: red, g: green, b: blue, red, green, blue };
  }

  function getCurrentThemeContext() {
    const settings = storage.getSettings();
    const settingsTheme = settings?.theme || {};

    const themeName =
      settingsTheme.name ||
      themes?.getCurrentTheme?.() ||
      ThemeManager.DEFAULT_THEME ||
      "pureWhite";
    const mode =
      (settingsTheme.mode || themes?.getCurrentMode?.() || "dark") === "light"
        ? "light"
        : "dark";

    const theme =
      ThemeManager.THEMES?.[themeName] ||
      ThemeManager.THEMES?.[ThemeManager.DEFAULT_THEME] ||
      ThemeManager.THEMES?.emerald;

    const fallbackBase = ThemeManager.THEMES?.emerald?.[mode] || {
      primary: popupBlurDefaults.palette.primary,
      accent: popupBlurDefaults.palette.accent,
      bodyBg: popupBlurDefaults.palette.background,
    };

    const isPureTheme = themeName === "pureWhite" || themeName === "pureBlack";
    const base = theme?.[mode] || fallbackBase;

    return {
      settings,
      themeName,
      mode,
      theme,
      base,
      isPureTheme,
    };
  }

  function getDashboardThemePalette() {
    const context = getCurrentThemeContext();
    const settingsPalette =
      context.settings?.theme?.customPalettes?.[context.themeName]?.[
        context.mode
      ] || null;
    const runtimePalette = themes?.getCustomPalette?.(
      context.themeName,
      context.mode,
    );
    const activePalette = settingsPalette || runtimePalette || null;

    const defaultGlassTint = context.isPureTheme
      ? context.themeName === "pureBlack"
        ? "#000000"
        : "#ffffff"
      : activePalette?.primary || context.base?.primary;

    return normalizePopupPalette(
      {
        primary: activePalette?.primary || context.base?.primary,
        accent: activePalette?.accent || context.base?.accent,
        background: activePalette?.bodyBg || context.base?.bodyBg,
        glassTint: context.isPureTheme
          ? activePalette?.glassTint || defaultGlassTint
          : activePalette?.primary || context.base?.primary,
      },
      popupBlurDefaults.palette,
    );
  }

  function getDashboardGlassOpacityPercent() {
    const settings = storage.getSettings();
    return clampNumber(settings?.theme?.glassOpacity, 0, 100, 0);
  }

  function getGlassOpacityAlphas(opacityPercent) {
    const baseAlpha = clampNumber(opacityPercent, 0, 100, 35) / 100;
    const hoverRatio = 0.45 / 0.35;
    const borderRatio = 0.4 / 0.35;
    const clampAlpha = (alpha) =>
      Number(Math.min(1, Math.max(0, alpha)).toFixed(3));

    return {
      bg: clampAlpha(baseAlpha),
      hover: clampAlpha(baseAlpha * hoverRatio),
      border: clampAlpha(baseAlpha * borderRatio),
    };
  }

  function setColorAlpha(value, alpha) {
    if (typeof value !== "string") return value;

    const match = value
      .replace(/\s+/g, "")
      .match(/^rgba?\((\d+),(\d+),(\d+)(?:,[0-9.]+)?\)$/i);
    if (!match) return value;

    const bounded = Number(Math.min(1, Math.max(0, Number(alpha))).toFixed(3));
    return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${bounded})`;
  }

  function applyGlassOpacityToColors(colors) {
    if (!colors) return colors;

    const alphas = getGlassOpacityAlphas(getDashboardGlassOpacityPercent());
    return {
      ...colors,
      glassBg: setColorAlpha(colors.glassBg, alphas.bg),
      glassBgHover: setColorAlpha(colors.glassBgHover, alphas.hover),
      glassBorder: setColorAlpha(colors.glassBorder, alphas.border),
    };
  }

  function buildThemeColorsFromPopupPalette(inputPalette) {
    const context = getCurrentThemeContext();
    const themeByMode = context.isPureTheme
      ? context.base
      : context.theme?.[context.mode] || context.base;
    const colors = { ...themeByMode };
    const palette = normalizePopupPalette(
      inputPalette,
      getDashboardThemePalette(),
    );

    if (palette.primary) {
      colors.primary = palette.primary;
      colors.primaryLight =
        typeof themes._lightenColor === "function"
          ? themes._lightenColor(palette.primary, 18)
          : palette.primary;
      colors.primaryDark =
        typeof themes._darkenColor === "function"
          ? themes._darkenColor(palette.primary, 18)
          : palette.primary;
    }

    if (palette.accent) {
      const lighten =
        typeof themes._lightenColor === "function"
          ? themes._lightenColor.bind(themes)
          : (hex) => hex;
      colors.accent = palette.accent;
      colors.accentLight = lighten(palette.accent, 18);
      colors.accentBlue = lighten(palette.accent, 10);
      colors.settingsColor = palette.accent;
      colors.settingsLight = lighten(palette.accent, 25);
    }

    if (palette.background) {
      colors.bodyBg = palette.background;

      const isDarkBg =
        typeof themes._isDarkColor === "function"
          ? themes._isDarkColor(palette.background)
          : true;

      const lightTextPrimary = context.isPureTheme ? "#1a1a1a" : "#1a1a2e";
      colors.textPrimary = isDarkBg ? "#ffffff" : lightTextPrimary;
      colors.textSecondary = isDarkBg
        ? "rgba(255, 255, 255, 0.85)"
        : "rgba(0, 0, 0, 0.75)";
      colors.textMuted = isDarkBg
        ? "rgba(255, 255, 255, 0.6)"
        : "rgba(0, 0, 0, 0.55)";
    }

    if (context.isPureTheme) {
      const defaultGlassTint =
        context.themeName === "pureBlack" ? "#000000" : "#ffffff";
      const glassTintHex = palette?.glassTint || defaultGlassTint;
      const tintRgb =
        typeof themes.hexToRgb === "function"
          ? themes.hexToRgb(glassTintHex)
          : hexToRgb(glassTintHex);

      if (tintRgb) {
        colors.glassBg = `rgba(${tintRgb.r}, ${tintRgb.g}, ${tintRgb.b}, 0.12)`;
        colors.glassBgHover = `rgba(${tintRgb.r}, ${tintRgb.g}, ${tintRgb.b}, 0.18)`;
        colors.glassBorder = `rgba(${tintRgb.r}, ${tintRgb.g}, ${tintRgb.b}, 0.2)`;
      }
    } else if (palette?.primary) {
      const primaryRgb =
        typeof themes.hexToRgb === "function"
          ? themes.hexToRgb(colors.primary)
          : hexToRgb(colors.primary);

      if (primaryRgb) {
        const base = context.theme?.[context.mode] || context.base;
        const parseAlpha = (value, fallback) => {
          const parsed =
            typeof themes._parseRgbaAlpha === "function"
              ? themes._parseRgbaAlpha(value)
              : null;
          return Number.isFinite(parsed) ? parsed : fallback;
        };

        const aBg = parseAlpha(
          base?.glassBg,
          context.mode === "light" ? 0.2 : 0.35,
        );
        const aHover = parseAlpha(
          base?.glassBgHover,
          context.mode === "light" ? 0.28 : 0.45,
        );
        const aBorder = parseAlpha(
          base?.glassBorder,
          context.mode === "light" ? 0.25 : 0.4,
        );

        colors.glassBg = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${aBg})`;
        colors.glassBgHover = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${aHover})`;
        colors.glassBorder = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${aBorder})`;
      }
    }

    return applyGlassOpacityToColors(colors);
  }

  function isDashboardGlassEnabled() {
    const settings = storage.getSettings();
    return settings?.theme?.glassEnabled !== false;
  }

  function getDashboardBlurPower() {
    const settings = storage.getSettings();
    return clampNumber(
      settings?.uiBlurPower,
      0,
      200,
      popupBlurDefaults.customBlurPower,
    );
  }

  function mixHexToRgb(baseHex, mixHex, mixWeight) {
    const base =
      typeof themes.hexToRgb === "function"
        ? themes.hexToRgb(baseHex)
        : hexToRgb(baseHex);
    const mix =
      typeof themes.hexToRgb === "function"
        ? themes.hexToRgb(mixHex)
        : hexToRgb(mixHex);
    if (!base || !mix) return null;

    const weight = Math.max(0, Math.min(1, Number(mixWeight)));
    const blend = (channelA, channelB) =>
      Math.round(channelA * (1 - weight) + channelB * weight);

    return `rgb(${blend(base.r, mix.r)}, ${blend(base.g, mix.g)}, ${blend(
      base.b,
      mix.b,
    )})`;
  }

  function getPopupGlassVars(colors, glassEnabled) {
    if (!colors) return null;

    if (glassEnabled) {
      return {
        glassBg: colors.glassBg,
        glassBgHover: colors.glassBgHover,
        glassBorder: colors.glassBorder,
        glassShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
      };
    }

    const mode = getCurrentThemeContext().mode;
    const isLight = mode === "light";

    const bgMix = isLight ? 0.12 : 0.38;
    const bgHoverMix = isLight ? 0.18 : 0.48;
    const borderMix = isLight ? 0.25 : 0.58;

    const solidBg =
      mixHexToRgb(colors.bodyBg, colors.primary, bgMix) ||
      (isLight ? "rgb(255, 255, 255)" : "rgb(30, 30, 50)");
    const solidHover =
      mixHexToRgb(colors.bodyBg, colors.primary, bgHoverMix) ||
      (isLight ? "rgb(245, 245, 245)" : "rgb(40, 40, 60)");
    const solidBorder =
      mixHexToRgb(colors.bodyBg, colors.primaryLight, borderMix) ||
      (isLight ? "rgb(220, 220, 220)" : "rgb(90, 90, 110)");

    return {
      glassBg: solidBg,
      glassBgHover: solidHover,
      glassBorder: solidBorder,
      glassShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
    };
  }

  function applyPopupGlassVars(colors, glassEnabled) {
    const vars = getPopupGlassVars(colors, glassEnabled);
    if (!vars) return;

    const root = document.documentElement;
    root.style.setProperty("--glass-bg", vars.glassBg);
    root.style.setProperty("--glass-bg-hover", vars.glassBgHover);
    root.style.setProperty("--glass-border", vars.glassBorder);
    root.style.setProperty("--glass-shadow", vars.glassShadow);
    root.dataset.glassEnabled = glassEnabled ? "true" : "false";
  }

  function readPopupBlurSettings() {
    const dashboardPalette = getDashboardThemePalette();
    const stored = storage.get(popupBlurStorageKey, {});

    const hasLegacyPaletteData =
      stored?.colorSource == null &&
      (stored?.palette ||
        stored?.tintColor ||
        stored?.primary ||
        stored?.accent ||
        stored?.background ||
        stored?.bodyBg);

    const storedPalette = stored?.palette || {
      primary: stored?.primary,
      accent: stored?.accent,
      background: stored?.background ?? stored?.bodyBg,
      glassTint: stored?.glassTint ?? stored?.tintColor,
    };

    const palette = normalizePopupPalette(storedPalette, dashboardPalette);

    const paletteMatchesDashboard =
      palette.primary === dashboardPalette.primary &&
      palette.accent === dashboardPalette.accent &&
      palette.background === dashboardPalette.background &&
      palette.glassTint === dashboardPalette.glassTint;

    let colorSource = "follow";
    if (stored?.colorSource === "custom" || stored?.colorSource === "follow") {
      colorSource = stored.colorSource;
    } else if (hasLegacyPaletteData && !paletteMatchesDashboard) {
      colorSource = "custom";
    }

    let glassState = stored?.glassState;
    if (!["off", "dashboard", "on"].includes(glassState)) {
      if (stored?.mode === "off") {
        glassState = "off";
      } else {
        glassState = popupBlurDefaults.glassState;
      }
    }

    const customBlurEnabled = glassState === "on";

    const customBlurPower = clampNumber(
      stored?.customBlurPower ?? stored?.power,
      0,
      200,
      popupBlurDefaults.customBlurPower,
    );

    return {
      glassState,
      customBlurEnabled,
      customBlurPower,
      colorSource,
      palette,
    };
  }

  function ensurePopupBlurSettings() {
    if (!popupBlurSettings) {
      popupBlurSettings = readPopupBlurSettings();
    }
    return popupBlurSettings;
  }

  function writePopupBlurSettings() {
    if (!popupBlurSettings) return;
    storage.set(popupBlurStorageKey, {
      ...popupBlurSettings,
      tintColor: popupBlurSettings.palette?.glassTint,
    });
  }

  function applyThemeColorsToPopup(colors) {
    if (!colors) return;

    const root = document.documentElement;
    root.style.setProperty("--primary-color", colors.primary);
    root.style.setProperty("--primary-light", colors.primaryLight);
    root.style.setProperty("--primary-dark", colors.primaryDark);
    root.style.setProperty("--accent-gold", colors.accent);
    root.style.setProperty("--accent-gold-light", colors.accentLight);
    root.style.setProperty("--accent-blue", colors.accentBlue);
    root.style.setProperty("--settings-color", colors.settingsColor);
    root.style.setProperty("--settings-light", colors.settingsLight);
    root.style.setProperty("--text-primary", colors.textPrimary);
    root.style.setProperty("--text-secondary", colors.textSecondary);
    root.style.setProperty("--text-muted", colors.textMuted);
    root.style.setProperty(
      "--surface-base-bg",
      colors.bodyBg || popupBlurDefaults.palette.background,
    );

    const settingsRgb =
      typeof themes.hexToRgb === "function"
        ? themes.hexToRgb(colors.settingsColor)
        : hexToRgb(colors.settingsColor);

    if (settingsRgb) {
      root.style.setProperty(
        "--settings-shadow",
        `0 4px 20px rgba(${settingsRgb.r}, ${settingsRgb.g}, ${settingsRgb.b}, 0.45)`,
      );
    }
  }

  function applyPopupBackdropFromColors(colors) {
    const { isPureTheme } = getCurrentThemeContext();

    const backdropColor = (() => {
      if (isPureTheme) {
        return normalizeHexColor(
          colors?.bodyBg,
          popupBlurDefaults.palette.background,
        );
      }

      const primaryHex = normalizeHexColor(
        colors?.primary,
        popupBlurDefaults.palette.primary,
      );

      return mixHexToRgb(primaryHex, "#000000", 0.75) || "rgb(5, 17, 13)";
    })();

    document.documentElement.style.setProperty(
      "--popup-backdrop-color",
      backdropColor,
    );
    document.documentElement.style.background = backdropColor;
    document.documentElement.style.backgroundColor = backdropColor;
    document.body.style.background = backdropColor;
    document.body.style.backgroundColor = backdropColor;
  }

  function syncPopupBlurModalUi() {
    const current = ensurePopupBlurSettings();
    const dashboardPalette = getDashboardThemePalette();
    const usingCustomColors = current.colorSource === "custom";
    const palette = usingCustomColors ? current.palette : dashboardPalette;
    const isGlassOff = current.glassState === "off";
    const isDashboardState = current.glassState === "dashboard";
    const effectiveBlurPower = isDashboardState
      ? getDashboardBlurPower()
      : current.customBlurPower;

    popupGlassStateButtons.forEach((button) => {
      const isActive = button.dataset.popupGlassState === current.glassState;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    if (popupBlurPowerSlider) {
      popupBlurPowerSlider.value = String(effectiveBlurPower);
      popupBlurPowerSlider.disabled = isGlassOff || isDashboardState;
    }

    if (popupBlurPowerWrap) {
      popupBlurPowerWrap.classList.toggle(
        "disabled",
        isGlassOff || isDashboardState,
      );
    }

    if (popupBlurPowerValue) {
      popupBlurPowerValue.textContent = `${effectiveBlurPower}%`;
    }

    if (popupUseCustomColorsToggle) {
      popupUseCustomColorsToggle.checked = usingCustomColors;
    }

    if (popupColorSourceText) {
      popupColorSourceText.textContent = usingCustomColors
        ? "Custom Colors"
        : "Follow Dashboard";
    }

    if (popupPaletteFields) {
      popupPaletteFields.classList.toggle(
        "popup-palette-disabled",
        !usingCustomColors,
      );
    }

    const paletteControls = [
      popupBlurPrimaryInput,
      popupBlurAccentInput,
      popupBlurBackgroundInput,
      popupBlurTintInput,
      ...popupBlurColorResetButtons,
    ];

    paletteControls.forEach((el) => {
      if (!el) return;
      el.disabled = !usingCustomColors;
    });

    if (popupBlurPrimaryInput) {
      popupBlurPrimaryInput.value = palette.primary;
    }

    if (popupBlurAccentInput) {
      popupBlurAccentInput.value = palette.accent;
    }

    if (popupBlurBackgroundInput) {
      popupBlurBackgroundInput.value = palette.background;
    }

    if (popupBlurTintInput) {
      popupBlurTintInput.value = palette.glassTint;
    }
  }

  function applyPopupBlurStyles() {
    const current = ensurePopupBlurSettings();
    const dashboardGlassEnabled = isDashboardGlassEnabled();
    const effectiveGlass =
      current.glassState === "on"
        ? true
        : current.glassState === "off"
          ? false
          : dashboardGlassEnabled;

    const effectiveBlurPower = !effectiveGlass
      ? 0
      : current.glassState === "on"
        ? current.customBlurPower
        : getDashboardBlurPower();

    if (current.colorSource === "custom") {
      const colors = buildThemeColorsFromPopupPalette(current.palette);
      if (colors) {
        applyThemeColorsToPopup(colors);
        applyPopupGlassVars(colors, effectiveGlass);
        applyPopupBackdropFromColors(colors);
      }
    } else {
      try {
        themes.loadThemeSettings();
        themes.applyTheme();
      } catch (error) {
        console.warn("Popup theme sync failed:", error);
      }

      const dashboardColors = themes.getThemeColors?.();
      if (dashboardColors) {
        applyPopupGlassVars(dashboardColors, effectiveGlass);
        applyPopupBackdropFromColors(dashboardColors);
      }
    }

    document.documentElement.style.setProperty(
      "--ui-blur-multiplier",
      String(clampNumber(effectiveBlurPower, 0, 200, 100) / 100),
    );

    syncPopupBlurModalUi();
    syncActionIcons();
  }

  function updatePopupBlurSettings(patch) {
    const dashboardPalette = getDashboardThemePalette();
    const current = ensurePopupBlurSettings();
    const currentPalette = current.palette || dashboardPalette;

    const patchPalette = patch?.palette || {};
    if (patch?.tintColor) {
      patchPalette.glassTint = patch.tintColor;
    }

    const next = {
      ...current,
      ...patch,
      palette: {
        ...currentPalette,
        ...patchPalette,
      },
    };

    const nextGlassState = ["off", "dashboard", "on"].includes(next.glassState)
      ? next.glassState
      : popupBlurDefaults.glassState;

    const nextCustomBlurEnabled = nextGlassState === "on";

    popupBlurSettings = {
      glassState: nextGlassState,
      customBlurEnabled: nextCustomBlurEnabled,
      customBlurPower: clampNumber(
        next.customBlurPower,
        0,
        200,
        popupBlurDefaults.customBlurPower,
      ),
      colorSource: next.colorSource === "custom" ? "custom" : "follow",
      palette: normalizePopupPalette(next.palette, dashboardPalette),
    };

    writePopupBlurSettings();
    applyPopupBlurStyles();
  }

  function openPopupBlurModal() {
    if (!popupBlurMenu || !popupBlurModal) return;
    ensurePopupBlurPortal();
    syncPopupBlurModalUi();
    popupBlurMenu.classList.add("blur-menu-open");
    prayerCard?.classList.add("card-blur-popup-open");
    popupBlurModal.classList.add("blur-popup-open");
    schedulePopupBlurPosition();
  }

  function closePopupBlurModal() {
    if (!popupBlurMenu || !popupBlurModal) return;
    popupBlurMenu.classList.remove("blur-menu-open");
    prayerCard?.classList.remove("card-blur-popup-open");
    popupBlurModal.classList.remove("blur-popup-open");
  }

  function setupPopupBlurModal() {
    ensurePopupBlurSettings();
    applyPopupBlurStyles();

    if (popupBlurMenuButton) {
      popupBlurMenuButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (popupBlurMenu?.classList.contains("blur-menu-open")) {
          closePopupBlurModal();
        } else {
          openPopupBlurModal();
        }
      });
    }

    popupBlurCloseBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closePopupBlurModal();
    });

    popupBlurResetBtn?.addEventListener("click", () => {
      popupBlurSettings = {
        glassState: popupBlurDefaults.glassState,
        customBlurEnabled: popupBlurDefaults.customBlurEnabled,
        customBlurPower: popupBlurDefaults.customBlurPower,
        colorSource: popupBlurDefaults.colorSource,
        palette: getDashboardThemePalette(),
      };
      writePopupBlurSettings();
      applyPopupBlurStyles();
    });

    popupGlassStateButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        updatePopupBlurSettings({
          glassState: button.dataset.popupGlassState,
        });
      });
    });

    popupUseCustomColorsToggle?.addEventListener("change", () => {
      if (popupUseCustomColorsToggle.checked) {
        updatePopupBlurSettings({
          colorSource: "custom",
          palette: getDashboardThemePalette(),
        });
        return;
      }

      updatePopupBlurSettings({ colorSource: "follow" });
    });

    popupBlurPowerSlider?.addEventListener("input", () => {
      if (ensurePopupBlurSettings().glassState !== "on") return;
      updatePopupBlurSettings({ customBlurPower: popupBlurPowerSlider.value });
    });

    popupBlurPrimaryInput?.addEventListener("input", () => {
      updatePopupBlurSettings({
        palette: { primary: popupBlurPrimaryInput.value },
      });
    });

    popupBlurAccentInput?.addEventListener("input", () => {
      updatePopupBlurSettings({
        palette: { accent: popupBlurAccentInput.value },
      });
    });

    popupBlurBackgroundInput?.addEventListener("input", () => {
      updatePopupBlurSettings({
        palette: { background: popupBlurBackgroundInput.value },
      });
    });

    popupBlurTintInput?.addEventListener("input", () => {
      updatePopupBlurSettings({
        palette: { glassTint: popupBlurTintInput.value },
      });
    });

    popupBlurColorResetButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const colorKey = button.dataset.popupResetColor;
        if (!colorKey) return;

        const dashboardPalette = getDashboardThemePalette();
        const resetValue = dashboardPalette[colorKey];
        if (!resetValue) return;

        updatePopupBlurSettings({
          palette: {
            [colorKey]: resetValue,
          },
        });
      });
    });

    popupBlurModal?.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    document.addEventListener("click", (event) => {
      const clickedInsideMenu = popupBlurMenu?.contains(event.target);
      const clickedInsidePopup = popupBlurModal?.contains(event.target);

      if (!clickedInsideMenu && !clickedInsidePopup) {
        closePopupBlurModal();
      }
    });

    window.addEventListener("resize", schedulePopupBlurPosition);
    window.addEventListener("scroll", schedulePopupBlurPosition, true);

    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        popupBlurMenu?.classList.contains("blur-menu-open")
      ) {
        closePopupBlurModal();
      }
    });
  }

  function isFiniteNumber(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue);
  }

  function normalizeLocation(rawLocation, fallbackCity = "Current Location") {
    if (
      !rawLocation ||
      !isFiniteNumber(rawLocation.latitude) ||
      !isFiniteNumber(rawLocation.longitude)
    ) {
      return null;
    }

    const cityName =
      typeof rawLocation.city === "string" && rawLocation.city.trim()
        ? rawLocation.city.trim()
        : fallbackCity;

    return {
      latitude: Number(rawLocation.latitude),
      longitude: Number(rawLocation.longitude),
      city: cityName,
    };
  }

  function setPopupVisibility(isPrayerVisible) {
    if (prayerCard) {
      prayerCard.hidden = !isPrayerVisible;
    }

    if (hiddenCard) {
      hiddenCard.hidden = isPrayerVisible;
    }
  }

  function applyThemeAndIconSettings() {
    try {
      themes.loadThemeSettings();
      themes.applyTheme();
    } catch (error) {
      console.warn("Popup theme sync failed:", error);
    }

    applyPopupBlurStyles();

    try {
      iconThemes.loadSettings();
      iconThemes.applyIconTheme();
      document.dispatchEvent(
        new CustomEvent("md:icon-theme-change", {
          detail: {
            theme: iconThemes.getCurrentTheme(),
          },
        }),
      );
      syncActionIcons();
    } catch (error) {
      console.warn("Popup icon theme sync failed:", error);
    }
  }

  async function ensurePrayerManagerInitialized() {
    if (prayerInitialized) return;
    prayerInitialized = true;
    await prayerTimes.init();
  }

  function syncLocation(settings) {
    if (!prayerInitialized) return;

    if (settings.locationMethod === "manual") {
      const manualLocation = normalizeLocation(
        {
          latitude: settings.latitude,
          longitude: settings.longitude,
          city: settings.city || "Custom Location",
        },
        "Custom Location",
      );

      if (manualLocation) {
        prayerTimes.location = manualLocation;
        prayerTimes.updatePrayerTimes();
      }
      return;
    }

    const lastLocation = normalizeLocation(storage.getLastLocation());
    if (lastLocation) {
      prayerTimes.location = lastLocation;
      prayerTimes.updatePrayerTimes();
    }
  }

  async function refreshPopupState() {
    const settings = storage.getSettings();

    applyThemeAndIconSettings();

    const isPrayerVisible = settings.componentVisibility?.prayerTimes !== false;
    setPopupVisibility(isPrayerVisible);

    if (!isPrayerVisible) return;

    await ensurePrayerManagerInitialized();
    prayerTimes.updateSettings(settings);
    syncLocation(settings);
  }

  function handleStorageChange(event) {
    const changedKey = event?.key;

    if (
      changedKey === null ||
      changedKey === settingsStorageKey ||
      changedKey === locationStorageKey
    ) {
      void refreshPopupState();
    }
  }

  function handleChromeStorageChange(changes, areaName) {
    if (areaName !== "local") return;
    if (changes?.md_settings || changes?.md_lastLocation) {
      void refreshPopupState();
    }
  }

  function startSoftResync() {
    if (resyncIntervalId) {
      clearInterval(resyncIntervalId);
    }

    resyncIntervalId = setInterval(() => {
      void refreshPopupState();
    }, 30000);
  }

  function stopSoftResync() {
    if (!resyncIntervalId) return;
    clearInterval(resyncIntervalId);
    resyncIntervalId = null;
  }

  setupPopupBlurModal();

  bindShortcut(openDashboardButton, () => openDashboardSettingsTab("prayer"));
  bindShortcut(openLocationSettingsIcon, () =>
    openDashboardSettingsTab("location"),
  );
  bindShortcut(openPrayerSettingsButton, () =>
    openDashboardSettingsTab("prayer"),
  );

  window.addEventListener("storage", handleStorageChange);

  if (typeof chrome !== "undefined" && chrome.storage?.onChanged?.addListener) {
    chrome.storage.onChanged.addListener(handleChromeStorageChange);
  }

  window.addEventListener("beforeunload", () => {
    stopSoftResync();
    if (
      typeof chrome !== "undefined" &&
      chrome.storage?.onChanged?.removeListener
    ) {
      chrome.storage.onChanged.removeListener(handleChromeStorageChange);
    }
  });

  void refreshPopupState().finally(() => {
    startSoftResync();
  });
});

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
  const popupBlurMenuButton = document.getElementById("popupBlurMenuBtn");
  const popupBlurModal = document.getElementById("popupBlurModal");
  const popupBlurCloseBtn = document.getElementById("popupBlurClose");
  const popupBlurDoneBtn = document.getElementById("popupBlurDoneBtn");
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
  const popupBlurModeButtons = Array.from(
    document.querySelectorAll("[data-popup-blur-mode]"),
  );
  const popupBlurColorResetButtons = Array.from(
    document.querySelectorAll("[data-popup-reset-color]"),
  );

  const settingsStorageKey = `${storage.prefix}settings`;
  const locationStorageKey = `${storage.prefix}lastLocation`;
  const popupBlurStorageKey = "popupBlurSettings";
  const popupBlurDefaults = {
    mode: "on",
    power: 100,
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

    const blurMode = ensurePopupBlurSettings().mode;
    const blurEmoji = blurMode === "off" ? "⬜" : "✨";

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
      "emerald";
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
    const base = isPureTheme
      ? ThemeManager.THEMES?.emerald?.[mode] || theme?.[mode] || fallbackBase
      : theme?.[mode] || fallbackBase;

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

      colors.textPrimary = isDarkBg ? "#ffffff" : "#1a1a2e";
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

    return colors;
  }

  function readPopupBlurSettings() {
    const dashboardPalette = getDashboardThemePalette();
    const stored = storage.get(popupBlurStorageKey, {});
    const mode = stored?.mode === "off" ? "off" : "on";
    const power = clampNumber(stored?.power, 0, 200, popupBlurDefaults.power);

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

    return { mode, power, colorSource, palette };
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

    root.style.setProperty("--glass-bg", colors.glassBg);
    root.style.setProperty("--glass-bg-hover", colors.glassBgHover);
    root.style.setProperty("--glass-border", colors.glassBorder);
    root.style.setProperty("--glass-shadow", "0 8px 32px rgba(0, 0, 0, 0.3)");

    document.body.style.background = colors.bodyBg;
    document.body.style.backgroundColor = colors.bodyBg;

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

  function syncPopupBlurModalUi() {
    const current = ensurePopupBlurSettings();
    const dashboardPalette = getDashboardThemePalette();
    const usingCustomColors = current.colorSource === "custom";
    const palette = usingCustomColors ? current.palette : dashboardPalette;

    popupBlurModeButtons.forEach((button) => {
      const isActive = button.dataset.popupBlurMode === current.mode;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    if (popupBlurPowerSlider) {
      popupBlurPowerSlider.value = String(current.power);
      popupBlurPowerSlider.disabled = current.mode === "off";
    }

    if (popupBlurPowerWrap) {
      popupBlurPowerWrap.classList.toggle("disabled", current.mode === "off");
    }

    if (popupBlurPowerValue) {
      popupBlurPowerValue.textContent = `${current.power}%`;
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
    const usingCustomColors = current.colorSource === "custom";
    const colors = usingCustomColors
      ? buildThemeColorsFromPopupPalette(current.palette)
      : themes.getThemeColors();

    if (!colors) return;

    applyThemeColorsToPopup(colors);

    const blurMultiplier =
      current.mode === "off"
        ? 0
        : clampNumber(current.power, 0, 200, 100) / 100;
    document.documentElement.style.setProperty(
      "--ui-blur-multiplier",
      String(blurMultiplier),
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

    popupBlurSettings = {
      mode: next.mode === "off" ? "off" : "on",
      power: clampNumber(next.power, 0, 200, popupBlurDefaults.power),
      colorSource: next.colorSource === "custom" ? "custom" : "follow",
      palette: normalizePopupPalette(next.palette, dashboardPalette),
    };

    writePopupBlurSettings();
    applyPopupBlurStyles();
  }

  function openPopupBlurModal() {
    if (!popupBlurModal) return;
    syncPopupBlurModalUi();
    popupBlurModal.classList.add("active");
    popupBlurModal.setAttribute("aria-hidden", "false");
  }

  function closePopupBlurModal() {
    if (!popupBlurModal) return;
    popupBlurModal.classList.remove("active");
    popupBlurModal.setAttribute("aria-hidden", "true");
  }

  function setupPopupBlurModal() {
    ensurePopupBlurSettings();
    applyPopupBlurStyles();

    if (popupBlurMenuButton) {
      popupBlurMenuButton.addEventListener("click", (event) => {
        event.preventDefault();
        openPopupBlurModal();
      });
    }

    popupBlurCloseBtn?.addEventListener("click", () => closePopupBlurModal());
    popupBlurDoneBtn?.addEventListener("click", () => closePopupBlurModal());

    popupBlurResetBtn?.addEventListener("click", () => {
      popupBlurSettings = {
        mode: popupBlurDefaults.mode,
        power: popupBlurDefaults.power,
        colorSource: popupBlurDefaults.colorSource,
        palette: getDashboardThemePalette(),
      };
      writePopupBlurSettings();
      applyPopupBlurStyles();
    });

    popupBlurModeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        updatePopupBlurSettings({ mode: button.dataset.popupBlurMode });
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
      updatePopupBlurSettings({ power: popupBlurPowerSlider.value });
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
      if (event.target === popupBlurModal) {
        closePopupBlurModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        popupBlurModal?.classList.contains("active")
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

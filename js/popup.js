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

  function hexToRgb(hexColor) {
    const normalized = normalizeHexColor(hexColor);
    const red = parseInt(normalized.slice(1, 3), 16);
    const green = parseInt(normalized.slice(3, 5), 16);
    const blue = parseInt(normalized.slice(5, 7), 16);
    return { red, green, blue };
  }

  function adjustHexColor(hexColor, percent = 0) {
    const { red, green, blue } = hexToRgb(hexColor);
    const adjustment = clampNumber(percent, -100, 100, 0) / 100;

    const blendChannel = (channel) => {
      if (adjustment >= 0) {
        return Math.round(channel + (255 - channel) * adjustment);
      }
      return Math.round(channel * (1 + adjustment));
    };

    const toHex = (channel) =>
      clampNumber(channel, 0, 255, 0).toString(16).padStart(2, "0");

    return `#${toHex(blendChannel(red))}${toHex(blendChannel(green))}${toHex(blendChannel(blue))}`;
  }

  function rgbaFromHex(hexColor, alpha, fallback) {
    try {
      const { red, green, blue } = hexToRgb(hexColor);
      const normalizedAlpha = clampNumber(alpha, 0, 1, 0.35);
      return `rgba(${red}, ${green}, ${blue}, ${normalizedAlpha})`;
    } catch (e) {
      return fallback;
    }
  }

  function getDashboardThemePalette() {
    const fallback = popupBlurDefaults.palette;
    const colors = themes?.getThemeColors?.() || {};

    return {
      primary: normalizeHexColor(colors?.primary, fallback.primary),
      accent: normalizeHexColor(colors?.accent, fallback.accent),
      background: normalizeHexColor(colors?.bodyBg, fallback.background),
      glassTint: normalizeHexColor(colors?.primary, fallback.glassTint),
    };
  }

  function readPopupBlurSettings() {
    const dashboardPalette = getDashboardThemePalette();
    const stored = storage.get(popupBlurStorageKey, {});
    const mode = stored?.mode === "off" ? "off" : "on";
    const power = clampNumber(stored?.power, 0, 200, popupBlurDefaults.power);
    const storedPalette = stored?.palette || {};
    const legacyTintColor = stored?.tintColor;

    const palette = {
      primary: normalizeHexColor(
        storedPalette?.primary,
        dashboardPalette.primary,
      ),
      accent: normalizeHexColor(storedPalette?.accent, dashboardPalette.accent),
      background: normalizeHexColor(
        storedPalette?.background,
        dashboardPalette.background,
      ),
      glassTint: normalizeHexColor(
        storedPalette?.glassTint ?? legacyTintColor,
        dashboardPalette.glassTint,
      ),
    };

    return { mode, power, palette };
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

  function syncPopupBlurModalUi() {
    const current = ensurePopupBlurSettings();
    const palette = current.palette || getDashboardThemePalette();

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
    const palette = current.palette || getDashboardThemePalette();
    const root = document.documentElement;
    const modeOff = current.mode === "off";
    const blurMultiplier = modeOff ? 0 : current.power / 100;

    const primary = normalizeHexColor(
      palette.primary,
      popupBlurDefaults.palette.primary,
    );
    const accent = normalizeHexColor(
      palette.accent,
      popupBlurDefaults.palette.accent,
    );
    const background = normalizeHexColor(
      palette.background,
      popupBlurDefaults.palette.background,
    );
    const glassTint = normalizeHexColor(
      palette.glassTint,
      popupBlurDefaults.palette.glassTint,
    );

    root.style.setProperty("--primary-color", primary);
    root.style.setProperty("--primary-light", adjustHexColor(primary, 20));
    root.style.setProperty("--primary-dark", adjustHexColor(primary, -28));
    root.style.setProperty("--accent-gold", accent);
    root.style.setProperty("--accent-gold-light", adjustHexColor(accent, 18));

    document.body.style.background = `linear-gradient(150deg, ${adjustHexColor(background, -18)}, ${background})`;

    root.style.setProperty(
      "--glass-bg",
      rgbaFromHex(
        glassTint,
        modeOff ? 0.92 : 0.34,
        modeOff ? "rgba(26, 95, 74, 0.92)" : "rgba(26, 95, 74, 0.34)",
      ),
    );

    root.style.setProperty(
      "--glass-bg-hover",
      rgbaFromHex(
        glassTint,
        modeOff ? 0.96 : 0.46,
        modeOff ? "rgba(26, 95, 74, 0.96)" : "rgba(26, 95, 74, 0.46)",
      ),
    );

    root.style.setProperty(
      "--glass-border",
      rgbaFromHex(
        glassTint,
        modeOff ? 0.38 : 0.42,
        modeOff ? "rgba(26, 95, 74, 0.38)" : "rgba(26, 95, 74, 0.42)",
      ),
    );

    root.style.setProperty("--ui-blur-multiplier", String(blurMultiplier));

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
      palette: {
        primary: normalizeHexColor(
          next.palette?.primary,
          dashboardPalette.primary,
        ),
        accent: normalizeHexColor(
          next.palette?.accent,
          dashboardPalette.accent,
        ),
        background: normalizeHexColor(
          next.palette?.background,
          dashboardPalette.background,
        ),
        glassTint: normalizeHexColor(
          next.palette?.glassTint,
          dashboardPalette.glassTint,
        ),
      },
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

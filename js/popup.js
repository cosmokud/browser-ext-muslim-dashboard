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

  const popupTabButtons = Array.from(
    document.querySelectorAll("[data-popup-tab]"),
  );
  const popupTabPanels = Array.from(
    document.querySelectorAll("[data-popup-tab-panel]"),
  );

  const popupPqRecitationAyah = document.getElementById(
    "popupPqRecitationAyah",
  );
  const popupPqRecitationReciter = document.getElementById(
    "popupPqRecitationReciter",
  );
  const popupPocketQuranCard = document.getElementById("popupPocketQuranCard");
  const popupPqPlayPauseBtn = document.getElementById("popupPqPlayPauseBtn");
  const popupPqPrevBtn = document.getElementById("popupPqPrevBtn");
  const popupPqNextBtn = document.getElementById("popupPqNextBtn");
  const popupPqStopBtn = document.getElementById("popupPqStopBtn");
  const popupPqVolumeSlider = document.getElementById("popupPqVolumeSlider");
  const popupPqLoopSurahBtn = document.getElementById("popupPqLoopSurahBtn");
  const popupPqLoopAyahBtn = document.getElementById("popupPqLoopAyahBtn");
  const popupPqAutoplayBtn = document.getElementById("popupPqAutoplayBtn");
  const popupPqAutoplayNextSurahBtn = document.getElementById(
    "popupPqAutoplayNextSurahBtn",
  );
  const popupPqAutoscrollBtn = document.getElementById("popupPqAutoscrollBtn");
  const popupPqAyahSnippet = document.getElementById("popupPqAyahSnippet");
  const popupPqAyahArabic = document.getElementById("popupPqAyahArabic");
  const popupPqAyahTranslation = document.getElementById(
    "popupPqAyahTranslation",
  );
  const popupPqArabicVisibleToggle = document.getElementById(
    "popupPqArabicVisibleToggle",
  );
  const popupPqTranslationVisibleToggle = document.getElementById(
    "popupPqTranslationVisibleToggle",
  );
  const popupPqArabicSizeRange = document.getElementById(
    "popupPqArabicSizeRange",
  );
  const popupPqArabicSizeValue = document.getElementById(
    "popupPqArabicSizeValue",
  );
  const popupPqArabicSizeDecreaseBtn = document.getElementById(
    "popupPqArabicSizeDecreaseBtn",
  );
  const popupPqArabicSizeIncreaseBtn = document.getElementById(
    "popupPqArabicSizeIncreaseBtn",
  );
  const popupPqArabicSizeLabel = document.getElementById(
    "popupPqArabicSizeLabel",
  );
  const popupPqMiniTajweedToggle = document.getElementById(
    "popupPqMiniTajweedToggle",
  );
  const popupPqTranslationSizeRange = document.getElementById(
    "popupPqTranslationSizeRange",
  );
  const popupPqTranslationSizeValue = document.getElementById(
    "popupPqTranslationSizeValue",
  );
  const popupPqTranslationSizeDecreaseBtn = document.getElementById(
    "popupPqTranslationSizeDecreaseBtn",
  );
  const popupPqTranslationSizeIncreaseBtn = document.getElementById(
    "popupPqTranslationSizeIncreaseBtn",
  );
  const popupPqTranslationSizeLabel = document.getElementById(
    "popupPqTranslationSizeLabel",
  );

  const popupPqAyahPanel = document.getElementById("popupPqAyahPanel");
  const popupPqAyahPanelClose = document.getElementById(
    "popupPqAyahPanelClose",
  );
  const popupPqSurahSearchInput = document.getElementById(
    "popupPqSurahSearchInput",
  );
  const popupPqSurahToolbar = document.getElementById("popupPqSurahToolbar");
  const popupPqAyahBackBtn = document.getElementById("popupPqAyahBackBtn");
  const popupPqAyahModeLabel = document.getElementById("popupPqAyahModeLabel");
  const popupPqSurahListWrap = document.getElementById("popupPqSurahListWrap");
  const popupPqSurahList = document.getElementById("popupPqSurahList");
  const popupPqAyahList = document.getElementById("popupPqAyahList");
  const popupPqReciterPanel = document.getElementById("popupPqReciterPanel");
  const popupPqReciterPanelClose = document.getElementById(
    "popupPqReciterPanelClose",
  );
  const popupPqReciterSearchInput = document.getElementById(
    "popupPqReciterSearchInput",
  );
  const popupPqReciterList = document.getElementById("popupPqReciterList");
  const popupPqTranslationPanel = document.getElementById(
    "popupPqTranslationPanel",
  );
  const popupPqTranslationPanelClose = document.getElementById(
    "popupPqTranslationPanelClose",
  );
  const popupPqTranslationSearchInput = document.getElementById(
    "popupPqTranslationSearchInput",
  );
  const popupPqTranslationList = document.getElementById(
    "popupPqTranslationList",
  );
  const popupPqFontPanel = document.getElementById("popupPqFontPanel");
  const popupPqFontPanelClose = document.getElementById(
    "popupPqFontPanelClose",
  );
  const popupPqFontSearchInput = document.getElementById(
    "popupPqFontSearchInput",
  );
  const popupPqFontList = document.getElementById("popupPqFontList");

  const settingsStorageKey = `${storage.prefix}settings`;
  const locationStorageKey = `${storage.prefix}lastLocation`;
  const popupBlurStorageKey = "popupBlurSettings";
  const popupTabStorageKey = "popupActiveTab";
  const pocketQuranPopupStateKey = "pocketQuran_popupState";
  const pocketQuranPopupCommandKey = "pocketQuran_popupCommand";
  const pocketQuranStateSourceDashboard = "dashboard";
  const pocketQuranStateSourcePopup = "popup";
  const pocketQuranApiBase = "https://api.quran.com/api/v4";
  const pocketQuranArabicFontFamilies = [
    "Noto Naskh Arabic",
    "Amiri",
    "KFGQPC Uthman Taha Naskh",
    "KFGQPC KSA Regular",
    "KFGQPC Kufi Stylistic Regular",
    "KFGQPC AN Regular",
    "KFGQPC AlJalil Dot",
    "KFGQPC Sindhi Naskh Regular",
  ];
  const pocketQuranPopupTranslationFontFamilies = [
    "Poppins",
    "Noto Naskh Arabic",
    "Amiri",
    "Georgia",
    "Cascadia Code",
    "Courier New",
  ];
  const pocketQuranFallbackTranslations = [
    { id: 85, label: "M.A.S. Abdel Haleem", language: "English" },
    { id: 20, label: "Saheeh International", language: "English" },
    {
      id: 57,
      label: "Muhammad Taqi-ud-Din al-Hilali & Khan",
      language: "English",
    },
    { id: 131, label: "Rachid Maach", language: "French" },
    { id: 149, label: "Muhammad Hamidullah", language: "French" },
    { id: 168, label: "Bubenheim/Elyas", language: "German" },
    { id: 171, label: "Sofian S. Siregar", language: "Indonesian" },
    { id: 33, label: "Mahmoud Y. Zayid", language: "Spanish" },
  ];
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
  let pocketQuranState = null;
  let pocketQuranChapters = [];
  let pocketQuranReciters = [];
  let pocketQuranTranslations = [];
  let pocketQuranLocalAudio = null;
  let pocketQuranLocalPlaybackActive = false;
  let pocketQuranLastDashboardStateAt = 0;
  let pocketQuranLocalCommandQueue = Promise.resolve();
  const pocketQuranLocalAudioUrlCache = new Map();
  const pocketQuranVersesCache = new Map();
  const pocketQuranTajweedVersesCache = new Map();
  let pocketQuranSnippetRequestId = 0;
  let pocketQuranSnippetRenderedKey = "";
  let pocketQuranSnippetInFlightKey = "";
  let pocketQuranResyncTimeoutIds = [];
  let pocketQuranPendingAyahSelection = null;
  let pocketQuranAyahSelectionLoadTimeoutId = null;
  const popupPqSelectionState = {
    selectedSurah: null,
    selectedAyah: null,
    selectorMode: "surah",
    ayahPopoverSurah: null,
    ayahPopoverAnchorEl: null,
  };
  let popupPqTypographyState = null;

  function getDashboardUrl(pathWithQuery = "index.html") {
    return typeof chrome !== "undefined" && chrome.runtime?.getURL
      ? chrome.runtime.getURL(pathWithQuery)
      : pathWithQuery;
  }

  function isDashboardIndexUrl(candidateUrl) {
    if (!candidateUrl) return false;

    try {
      const candidate = new URL(candidateUrl);
      const dashboardIndex = new URL(getDashboardUrl("index.html"));
      return (
        candidate.origin === dashboardIndex.origin &&
        candidate.pathname === dashboardIndex.pathname
      );
    } catch (e) {
      return false;
    }
  }

  function closePopup() {
    try {
      window.close();
    } catch (e) {
      // ignore
    }
  }

  function openUrlInCurrentTab(url, options = {}) {
    if (!url) return;

    const fallbackNavigate = () => {
      try {
        window.location.assign(url);
      } catch (error) {
        console.warn("Could not navigate to dashboard URL:", error);
      }
    };

    const updateTabAndClose = (tabId = null, currentTabUrl = "") => {
      if (!(typeof chrome !== "undefined" && chrome.tabs?.update)) {
        fallbackNavigate();
        return;
      }

      const dashboardHashUrl =
        typeof options.dashboardHashUrl === "string"
          ? options.dashboardHashUrl
          : "";

      let targetUrl = url;
      if (
        dashboardHashUrl &&
        isDashboardIndexUrl(url) &&
        isDashboardIndexUrl(currentTabUrl)
      ) {
        targetUrl = dashboardHashUrl;
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
        chrome.tabs.update(tabId, { url: targetUrl }, onUpdated);
        return;
      }

      chrome.tabs.update({ url: targetUrl }, onUpdated);
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
            updateTabAndClose(null, "");
            return;
          }

          const activeTab = Array.isArray(tabs) ? tabs[0] : null;
          const activeTabId =
            activeTab && typeof activeTab.id === "number" ? activeTab.id : null;

          updateTabAndClose(activeTabId, activeTab?.url || "");
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
    const inPlaceTargetUrl = getDashboardUrl(
      `index.html#openSettingsTab=${encodeURIComponent(normalizedTab)}`,
    );

    openUrlInCurrentTab(targetUrl, {
      dashboardHashUrl: inPlaceTargetUrl,
    });
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

  function getEventTargetElement(target) {
    if (target instanceof Element) return target;
    if (target instanceof Node) return target.parentElement;
    return null;
  }

  function clampNumber(value, min, max, fallback) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return fallback;
    return Math.min(max, Math.max(min, numericValue));
  }

  function normalizePocketQuranArabicFontFamily(value) {
    const normalized = String(value || "").trim();
    if (pocketQuranArabicFontFamilies.includes(normalized)) {
      return normalized;
    }
    return "KFGQPC Uthman Taha Naskh";
  }

  function normalizePocketQuranTranslationFontFamily(value) {
    const normalized = String(value || "").trim();
    if (pocketQuranPopupTranslationFontFamilies.includes(normalized)) {
      return normalized;
    }
    return "Poppins";
  }

  function resolvePocketQuranPopupTypography(
    settings = storage.getSettings(),
    patch = null,
  ) {
    const mainTypography =
      settings?.pocketQuran && typeof settings.pocketQuran === "object"
        ? settings.pocketQuran
        : {};
    const popupTypography =
      settings?.pocketQuranPopup &&
      typeof settings.pocketQuranPopup === "object"
        ? settings.pocketQuranPopup
        : {};

    const merged = {
      ...popupTypography,
      ...(patch && typeof patch === "object" ? patch : {}),
    };

    return {
      arabicFontSize: clampNumber(
        merged.arabicFontSize,
        8,
        144,
        clampNumber(mainTypography.arabicFontSize, 8, 144, 40),
      ),
      translationFontSize: clampNumber(
        merged.translationFontSize,
        8,
        144,
        clampNumber(mainTypography.translationFontSize, 8, 144, 18),
      ),
      arabicFontFamily: normalizePocketQuranArabicFontFamily(
        merged.arabicFontFamily || mainTypography.arabicFontFamily,
      ),
      translationFontFamily: normalizePocketQuranTranslationFontFamily(
        merged.translationFontFamily,
      ),
      showArabicText: merged.showArabicText !== false,
      showTranslationText: merged.showTranslationText !== false,
    };
  }

  function updatePopupRangeProgress(rangeEl) {
    if (!(rangeEl instanceof HTMLInputElement) || rangeEl.type !== "range") {
      return;
    }

    const min = parseInt(rangeEl.min, 10);
    const max = parseInt(rangeEl.max, 10);
    const value = parseInt(rangeEl.value, 10);

    const safeMin = Number.isFinite(min) ? min : 0;
    const safeMax = Number.isFinite(max) ? max : safeMin + 1;
    const safeValue = Number.isFinite(value) ? value : safeMin;
    const span = Math.max(1, safeMax - safeMin);
    const progress = ((safeValue - safeMin) / span) * 100;

    rangeEl.style.setProperty(
      "--jump-progress",
      `${Math.max(0, Math.min(100, progress))}%`,
    );
  }

  function applyPocketQuranPopupAyahVisibility(
    typography = popupPqTypographyState,
  ) {
    const showArabic = typography?.showArabicText !== false;
    const showTranslation = typography?.showTranslationText !== false;

    if (popupPqAyahArabic) {
      popupPqAyahArabic.hidden = !showArabic;
    }
    if (popupPqAyahTranslation) {
      popupPqAyahTranslation.hidden = !showTranslation;
    }
    if (popupPqAyahSnippet) {
      popupPqAyahSnippet.hidden = !showArabic && !showTranslation;
    }
  }

  function applyPocketQuranPopupTypography(settings = storage.getSettings()) {
    const typography = resolvePocketQuranPopupTypography(settings);
    popupPqTypographyState = typography;

    if (popupPocketQuranCard) {
      popupPocketQuranCard.style.setProperty(
        "--popup-pq-arabic-size",
        `${typography.arabicFontSize}px`,
      );
      popupPocketQuranCard.style.setProperty(
        "--popup-pq-translation-size",
        `${typography.translationFontSize}px`,
      );

      let arabicCss = `"${typography.arabicFontFamily}", var(--font-arabic)`;
      if (typography.arabicFontFamily === "Noto Naskh Arabic") {
        arabicCss = '"Noto Naskh Arabic", var(--font-arabic)';
      }
      popupPocketQuranCard.style.setProperty(
        "--popup-pq-arabic-font-family",
        arabicCss,
      );

      let translationCss = `"${typography.translationFontFamily}", var(--font-primary)`;
      if (typography.translationFontFamily === "Georgia") {
        translationCss = '"Georgia", serif';
      } else if (typography.translationFontFamily === "Courier New") {
        translationCss = '"Courier New", monospace';
      } else if (typography.translationFontFamily === "Cascadia Code") {
        translationCss =
          '"Cascadia Code", "JetBrains Mono", Consolas, monospace';
      }
      popupPocketQuranCard.style.setProperty(
        "--popup-pq-translation-font-family",
        translationCss,
      );
    }

    if (popupPqArabicSizeRange) {
      popupPqArabicSizeRange.value = String(typography.arabicFontSize);
      updatePopupRangeProgress(popupPqArabicSizeRange);
    }
    if (popupPqTranslationSizeRange) {
      popupPqTranslationSizeRange.value = String(
        typography.translationFontSize,
      );
      updatePopupRangeProgress(popupPqTranslationSizeRange);
    }
    if (popupPqArabicSizeValue) {
      popupPqArabicSizeValue.textContent = `${typography.arabicFontSize}px`;
    }
    if (popupPqTranslationSizeValue) {
      popupPqTranslationSizeValue.textContent = `${typography.translationFontSize}px`;
    }
    if (popupPqArabicVisibleToggle) {
      popupPqArabicVisibleToggle.checked = typography.showArabicText !== false;
    }
    if (popupPqTranslationVisibleToggle) {
      popupPqTranslationVisibleToggle.checked =
        typography.showTranslationText !== false;
    }

    applyPocketQuranPopupAyahVisibility(typography);

    updatePopupViewportForTab("pocketQuran");
  }

  function persistPocketQuranPopupTypography(patch) {
    if (!patch || typeof patch !== "object") return;

    const settings = storage.getSettings();
    const typography = resolvePocketQuranPopupTypography(settings, patch);
    settings.pocketQuranPopup = {
      ...(settings.pocketQuranPopup || {}),
      ...typography,
    };
    storage.saveSettings(settings);
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
    let left = Math.round(anchorRect.right - popupWidth);
    left = Math.max(
      viewportPadding,
      Math.min(left, window.innerWidth - viewportPadding - popupWidth),
    );

    const availableBelow = Math.max(
      0,
      Math.floor(
        window.innerHeight - viewportPadding - (anchorRect.bottom + gap),
      ),
    );
    const availableAbove = Math.max(
      0,
      Math.floor(anchorRect.top - gap - viewportPadding),
    );

    const minPreferredHeight = 220;
    const canFitBelow = availableBelow >= minPreferredHeight;
    const canFitAbove = availableAbove >= minPreferredHeight;

    const shouldPlaceAbove =
      !canFitBelow && (canFitAbove || availableAbove > availableBelow);

    const availableHeight = shouldPlaceAbove ? availableAbove : availableBelow;
    const constrainedMaxHeight = Math.max(
      160,
      Math.min(
        460,
        availableHeight || window.innerHeight - viewportPadding * 2,
      ),
    );

    popupBlurModal.style.maxHeight = `${constrainedMaxHeight}px`;

    const popupHeight = Math.max(
      160,
      Math.round(popupBlurModal.offsetHeight || constrainedMaxHeight),
    );

    let top = shouldPlaceAbove
      ? Math.round(anchorRect.top - gap - popupHeight)
      : Math.round(anchorRect.bottom + gap);

    top = Math.max(
      viewportPadding,
      Math.min(top, window.innerHeight - viewportPadding - popupHeight),
    );

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
      colors.accentText = palette.accent;
      colors.accentBackground = palette.accent;
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
    const accentBackground = colors.accentBackground || colors.accent;
    const accentText = colors.accentText || colors.accent;
    root.style.setProperty("--primary-color", colors.primary);
    root.style.setProperty("--primary-light", colors.primaryLight);
    root.style.setProperty("--primary-dark", colors.primaryDark);
    root.style.setProperty("--accent-gold", accentText);
    root.style.setProperty("--accent-bg", accentBackground);
    root.style.setProperty("--accent-text", accentText);
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

  const pocketQuranCommandTypes = {
    togglePlayPause: "togglePlayPause",
    toggleTajweed: "toggleTajweed",
    playPreviousAyah: "playPreviousAyah",
    playNextAyah: "playNextAyah",
    stopPlayback: "stopPlayback",
    setVolume: "setVolume",
    toggleLoopAyah: "toggleLoopAyah",
    toggleLoopSurah: "toggleLoopSurah",
    toggleAutoplay: "toggleAutoplay",
    toggleAutoplayNextSurah: "toggleAutoplayNextSurah",
    toggleAutoScroll: "toggleAutoScroll",
    selectAyah: "selectAyah",
    selectReciter: "selectReciter",
    selectTranslation: "selectTranslation",
  };

  function updatePopupViewportForTab(tabName) {
    const normalizedTab = tabName === "pocketQuran" ? "pocketQuran" : "prayer";
    const activePanel = popupTabPanels.find(
      (panel) =>
        panel &&
        panel.dataset.popupTabPanel === normalizedTab &&
        panel.hidden === false,
    );
    if (!activePanel) return;

    requestAnimationFrame(() => {
      const shell = document.querySelector(".popup-shell");
      const contentHeight = Math.ceil(
        Math.max(
          shell?.scrollHeight || 0,
          document.body?.scrollHeight || 0,
          activePanel.scrollHeight || 0,
        ),
      );

      if (!Number.isFinite(contentHeight) || contentHeight <= 0) return;

      const heightPx = `${contentHeight}px`;
      document.documentElement.style.height = "auto";
      document.body.style.height = "auto";
      document.documentElement.style.height = heightPx;
      document.body.style.height = heightPx;
    });
  }

  function setActivePopupTab(tabName, opts = {}) {
    const { persist = true } = opts;
    const normalizedTab = tabName === "pocketQuran" ? "pocketQuran" : "prayer";

    popupTabButtons.forEach((button) => {
      if (!button) return;
      const isActive = button.dataset.popupTab === normalizedTab;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
      button.tabIndex = isActive ? 0 : -1;
    });

    popupTabPanels.forEach((panel) => {
      if (!panel) return;
      const isActive = panel.dataset.popupTabPanel === normalizedTab;
      panel.classList.toggle("active", isActive);
      panel.hidden = !isActive;
    });

    if (normalizedTab !== "pocketQuran") {
      closePocketQuranAyahPanel();
      closePocketQuranReciterPanel();
      closePocketQuranTranslationPanel();
      closePocketQuranFontPanel();
    }

    updatePopupViewportForTab(normalizedTab);

    if (persist) {
      storage.set(popupTabStorageKey, normalizedTab);
    }
  }

  function setupPopupTabs() {
    if (!popupTabButtons.length || !popupTabPanels.length) return;

    const savedTab = storage.get(popupTabStorageKey, "prayer");
    setActivePopupTab(savedTab, { persist: false });

    popupTabButtons.forEach((button, index) => {
      button.addEventListener("click", () => {
        setActivePopupTab(button.dataset.popupTab, { persist: true });
      });

      button.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();

        const direction = event.key === "ArrowRight" ? 1 : -1;
        const nextIndex =
          (index + direction + popupTabButtons.length) % popupTabButtons.length;
        const nextButton = popupTabButtons[nextIndex];
        if (!nextButton) return;
        nextButton.focus();
        setActivePopupTab(nextButton.dataset.popupTab, { persist: true });
      });
    });
  }

  function getPocketQuranChapterById(surah) {
    const id = clampNumber(surah, 1, 114, 1);
    return pocketQuranChapters.find((chapter) => chapter.id === id) || null;
  }

  function getPocketQuranSurahMaxAyah(surah) {
    const chapter = getPocketQuranChapterById(surah);
    return clampNumber(chapter?.verses_count, 1, 286, 286);
  }

  function getPocketQuranNextSurahId(surah) {
    const currentSurah = clampNumber(surah, 1, 114, 1);

    if (Array.isArray(pocketQuranChapters) && pocketQuranChapters.length > 0) {
      const currentIndex = pocketQuranChapters.findIndex((chapter) => {
        return clampNumber(chapter?.id, 1, 114, NaN) === currentSurah;
      });

      if (currentIndex >= 0 && currentIndex < pocketQuranChapters.length - 1) {
        return clampNumber(
          pocketQuranChapters[currentIndex + 1]?.id,
          1,
          114,
          null,
        );
      }
    }

    return currentSurah < 114 ? currentSurah + 1 : null;
  }

  function buildPocketQuranFallbackState(settings = storage.getSettings()) {
    const pqSettings = settings?.pocketQuran || {};
    const activeSurah = clampNumber(pqSettings.lastSurahNumber, 1, 114, 1);
    const activeAyah = clampNumber(
      pqSettings.lastAyahNumber,
      1,
      getPocketQuranSurahMaxAyah(activeSurah),
      1,
    );

    return {
      activeSurah,
      activeAyah,
      recitationAyah: {
        surah: activeSurah,
        ayah: activeAyah,
      },
      isPlaying: false,
      reciterId: pqSettings.reciterId || 7,
      reciterName: "Loading reciter...",
      volume: clampNumber(pqSettings.reciterVolume, 0, 1, 1),
      isLooping: pqSettings.reciterLoop === true,
      isSurahLooping: pqSettings.reciterSurahLoop === true,
      isAutoplay: pqSettings.reciterAutoplay === true,
      isAutoplayNextSurah: pqSettings.reciterAutoplayNextSurah === true,
      isAutoScroll: pqSettings.reciterAutoScroll === true,
      isTajweedMode: pqSettings.tajweedMode === true,
      showArabicText: pqSettings.showArabicText !== false,
      showTranslationText: pqSettings.showTranslationText !== false,
      translationResourceId: clampNumber(
        pqSettings.translationResourceId,
        1,
        10000,
        85,
      ),
    };
  }

  function normalizePocketQuranState(
    rawState,
    settings = storage.getSettings(),
  ) {
    const fallback = buildPocketQuranFallbackState(settings);
    if (!rawState || typeof rawState !== "object") return fallback;

    const activeSurah = clampNumber(
      rawState.activeSurah,
      1,
      114,
      fallback.activeSurah,
    );
    const activeAyah = clampNumber(
      rawState.activeAyah,
      1,
      getPocketQuranSurahMaxAyah(activeSurah),
      fallback.activeAyah,
    );

    const recitationSource =
      rawState.recitationAyah && typeof rawState.recitationAyah === "object"
        ? rawState.recitationAyah
        : fallback.recitationAyah;
    const recitationSurah = clampNumber(
      recitationSource.surah,
      1,
      114,
      activeSurah,
    );
    const recitationAyah = clampNumber(
      recitationSource.ayah,
      1,
      getPocketQuranSurahMaxAyah(recitationSurah),
      activeAyah,
    );

    return {
      activeSurah,
      activeAyah,
      recitationAyah: {
        surah: recitationSurah,
        ayah: recitationAyah,
      },
      isPlaying: rawState.isPlaying === true,
      reciterId: clampNumber(rawState.reciterId, 1, 10000, fallback.reciterId),
      reciterName:
        typeof rawState.reciterName === "string" && rawState.reciterName.trim()
          ? rawState.reciterName.trim()
          : fallback.reciterName,
      volume: clampNumber(rawState.volume, 0, 1, fallback.volume),
      isLooping: rawState.isLooping === true,
      isSurahLooping: rawState.isSurahLooping === true,
      isAutoplay: rawState.isAutoplay === true,
      isAutoplayNextSurah: rawState.isAutoplayNextSurah === true,
      isAutoScroll: rawState.isAutoScroll === true,
      isTajweedMode:
        typeof rawState.isTajweedMode === "boolean"
          ? rawState.isTajweedMode
          : fallback.isTajweedMode,
      showArabicText:
        typeof rawState.showArabicText === "boolean"
          ? rawState.showArabicText
          : fallback.showArabicText,
      showTranslationText:
        typeof rawState.showTranslationText === "boolean"
          ? rawState.showTranslationText
          : fallback.showTranslationText,
      translationResourceId: clampNumber(
        rawState.translationResourceId,
        1,
        10000,
        fallback.translationResourceId,
      ),
    };
  }

  function getPocketQuranCurrentTargetAyah(state = pocketQuranState) {
    const activeSurah = clampNumber(state?.activeSurah, 1, 114, 1);
    const activeAyah = clampNumber(
      state?.activeAyah,
      1,
      getPocketQuranSurahMaxAyah(activeSurah),
      1,
    );

    const recitationSource =
      state?.recitationAyah && typeof state.recitationAyah === "object"
        ? state.recitationAyah
        : null;

    if (recitationSource) {
      const surah = clampNumber(recitationSource.surah, 1, 114, activeSurah);
      const ayah = clampNumber(
        recitationSource.ayah,
        1,
        getPocketQuranSurahMaxAyah(surah),
        activeAyah,
      );
      return { surah, ayah };
    }

    return { surah: activeSurah, ayah: activeAyah };
  }

  function formatPocketQuranAyahLabel(surah, ayah) {
    const chapter = getPocketQuranChapterById(surah);
    const surahName = chapter?.name_simple || `Surah ${surah}`;
    return `${surah}. ${surahName} · Ayah ${ayah}`;
  }

  function decodeHtmlString(value) {
    const source = String(value || "").trim();
    if (!source) return "";
    try {
      const parser = document.createElement("div");
      parser.innerHTML = source;

      // Keep popup snippet behavior consistent with the main Pocket Quran card.
      const footnotes = parser.querySelectorAll(
        "sup[foot_note], sup.foot_note, sup",
      );
      footnotes.forEach((fn) => fn.remove());

      return (parser.textContent || "").replace(/\s+/g, " ").trim();
    } catch (e) {
      return source
        .replace(/<sup[^>]*>.*?<\/sup>/gi, "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function ensurePocketQuranChaptersLoaded(forceFetch = false) {
    if (!forceFetch && pocketQuranChapters.length > 0)
      return pocketQuranChapters;

    const cached = storage.get("pocketQuran_chapters_cache", null);
    const cachedAt = storage.get("pocketQuran_chapters_cache_at", 0);
    const freshEnough = Date.now() - (cachedAt || 0) < 1000 * 60 * 60 * 24 * 7;

    if (
      !forceFetch &&
      freshEnough &&
      Array.isArray(cached) &&
      cached.length > 0
    ) {
      pocketQuranChapters = cached
        .map((chapter) => ({
          id: clampNumber(chapter?.id, 1, 114, 1),
          name_simple: String(chapter?.name_simple || "").trim(),
          name_arabic: String(chapter?.name_arabic || "").trim(),
          verses_count: clampNumber(chapter?.verses_count, 1, 286, 286),
        }))
        .sort((left, right) => left.id - right.id);
      return pocketQuranChapters;
    }

    try {
      const response = await fetch(
        `${pocketQuranApiBase}/chapters?language=en`,
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const chapters = Array.isArray(data?.chapters) ? data.chapters : [];

      pocketQuranChapters = chapters
        .map((chapter) => ({
          id: clampNumber(chapter?.id, 1, 114, 1),
          name_simple: String(chapter?.name_simple || "").trim(),
          name_arabic: String(chapter?.name_arabic || "").trim(),
          verses_count: clampNumber(chapter?.verses_count, 1, 286, 286),
        }))
        .sort((left, right) => left.id - right.id);

      if (pocketQuranChapters.length > 0) {
        storage.set("pocketQuran_chapters_cache", pocketQuranChapters);
        storage.set("pocketQuran_chapters_cache_at", Date.now());
      }
    } catch (error) {
      if (!Array.isArray(cached) || cached.length === 0) {
        pocketQuranChapters = [];
      }
    }

    return pocketQuranChapters;
  }

  async function fetchPocketQuranSurahVerses(surah, translationId) {
    const surahId = clampNumber(surah, 1, 114, 1);
    const tid = clampNumber(translationId, 1, 10000, 85);
    const cacheKey = `${surahId}|${tid}`;

    if (pocketQuranVersesCache.has(cacheKey)) {
      return pocketQuranVersesCache.get(cacheKey);
    }

    const url = `${pocketQuranApiBase}/verses/by_chapter/${surahId}?fields=text_uthmani,verse_number,verse_key&translations=${tid}&per_page=300`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const verses = Array.isArray(data?.verses) ? data.verses : [];
    pocketQuranVersesCache.set(cacheKey, verses);
    return verses;
  }

  function parsePocketQuranTajweedHtml(tajweedText) {
    const source = String(tajweedText || "").trim();
    if (!source) return "";

    return source
      .replace(/<tajweed\s+class=([^>]+)>/gi, (match, className) => {
        const cleaned = String(className || "")
          .trim()
          .replace(/^['\"]|['\"]$/g, "")
          .replace(/[^a-zA-Z0-9_-]/g, "");

        return cleaned ? `<span class="${cleaned}">` : "<span>";
      })
      .replace(/<\/tajweed>/gi, "</span>");
  }

  async function fetchPocketQuranSurahTajweedVerses(surah) {
    const surahId = clampNumber(surah, 1, 114, 1);

    if (pocketQuranTajweedVersesCache.has(surahId)) {
      return pocketQuranTajweedVersesCache.get(surahId);
    }

    const url = `${pocketQuranApiBase}/quran/verses/uthmani_tajweed?chapter_number=${surahId}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const verses = Array.isArray(data?.verses) ? data.verses : [];
    pocketQuranTajweedVersesCache.set(surahId, verses);
    return verses;
  }

  function getPocketQuranTajweedHtmlForAyah(tajweedVerses, surah, ayah) {
    if (!Array.isArray(tajweedVerses) || !tajweedVerses.length) return "";

    const verseKey = `${clampNumber(surah, 1, 114, 1)}:${clampNumber(ayah, 1, 286, 1)}`;
    const verse = tajweedVerses.find((entry) => {
      return String(entry?.verse_key || "") === verseKey;
    });

    return parsePocketQuranTajweedHtml(verse?.text_uthmani_tajweed);
  }

  async function ensurePocketQuranRecitersLoaded(forceFetch = false) {
    if (!forceFetch && pocketQuranReciters.length > 0) {
      return pocketQuranReciters;
    }

    const cached = storage.get("pocketQuran_reciters_cache", null);
    const cachedAt = storage.get("pocketQuran_reciters_cache_at", 0);
    const cacheIsFresh = Date.now() - (cachedAt || 0) < 1000 * 60 * 60 * 24 * 7;

    if (
      !forceFetch &&
      cacheIsFresh &&
      Array.isArray(cached) &&
      cached.length > 0
    ) {
      pocketQuranReciters = cached
        .map((reciter) => ({
          id: clampNumber(reciter?.id, 1, 10000, 7),
          name: String(
            reciter?.name ||
              reciter?.formattedName ||
              reciter?.reciter_name ||
              "",
          ).trim(),
          style: String(reciter?.style || "").trim(),
        }))
        .filter((reciter) => reciter.name);

      return pocketQuranReciters;
    }

    try {
      const response = await fetch(
        `${pocketQuranApiBase}/resources/recitations?language=en`,
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const recitations = Array.isArray(data?.recitations)
        ? data.recitations
        : [];
      pocketQuranReciters = recitations
        .map((reciter) => ({
          id: clampNumber(reciter?.id, 1, 10000, 7),
          name: String(
            reciter?.translated_name?.name || reciter?.reciter_name || "",
          ).trim(),
          style: String(reciter?.style || "").trim(),
        }))
        .filter((reciter) => reciter.name);

      if (pocketQuranReciters.length > 0) {
        storage.set("pocketQuran_reciters_cache", pocketQuranReciters);
        storage.set("pocketQuran_reciters_cache_at", Date.now());
      }
    } catch (error) {
      if (!Array.isArray(cached) || cached.length === 0) {
        pocketQuranReciters = [];
      }
    }

    return pocketQuranReciters;
  }

  function normalizePocketQuranTranslationEntry(entry) {
    const id = clampNumber(entry?.id, 1, 10000, NaN);
    if (!Number.isFinite(id)) return null;

    const language = String(
      entry?.language_name ||
        entry?.language ||
        entry?.translated_name?.language_name ||
        "Other",
    ).trim();

    const baseName = String(
      entry?.name || entry?.translated_name?.name || "",
    ).trim();
    const author = String(entry?.author_name || entry?.author || "").trim();

    let label = baseName || author || `Translation ${id}`;
    if (
      author &&
      baseName &&
      !baseName.toLowerCase().includes(author.toLowerCase())
    ) {
      label = `${baseName} — ${author}`;
    }

    return {
      id,
      label,
      language: language || "Other",
    };
  }

  async function ensurePocketQuranTranslationsLoaded(forceFetch = false) {
    if (!forceFetch && pocketQuranTranslations.length > 0) {
      return pocketQuranTranslations;
    }

    const cached = storage.get("pocketQuran_translations_cache", null);
    const cachedAt = storage.get("pocketQuran_translations_cache_at", 0);
    const cacheIsFresh = Date.now() - (cachedAt || 0) < 1000 * 60 * 60 * 24 * 7;

    if (
      !forceFetch &&
      cacheIsFresh &&
      Array.isArray(cached) &&
      cached.length > 0
    ) {
      pocketQuranTranslations = cached
        .map((entry) => normalizePocketQuranTranslationEntry(entry))
        .filter(Boolean)
        .sort((left, right) => {
          const langOrder = left.language.localeCompare(right.language);
          if (langOrder !== 0) return langOrder;
          return left.label.localeCompare(right.label);
        });
      return pocketQuranTranslations;
    }

    try {
      const collected = [];
      const perPage = 100;
      const maxPages = 8;

      for (let page = 1; page <= maxPages; page += 1) {
        const response = await fetch(
          `${pocketQuranApiBase}/resources/translations?language=en&page=${page}&per_page=${perPage}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const batch = Array.isArray(data?.translations)
          ? data.translations
          : [];
        if (!batch.length) {
          break;
        }

        collected.push(...batch);

        const totalPages = clampNumber(
          data?.pagination?.total_pages,
          1,
          100,
          page,
        );
        if (page >= totalPages) {
          break;
        }
      }

      const deduped = new Map();
      collected.forEach((entry) => {
        const normalized = normalizePocketQuranTranslationEntry(entry);
        if (!normalized) return;
        deduped.set(normalized.id, normalized);
      });

      pocketQuranTranslations = Array.from(deduped.values()).sort(
        (left, right) => {
          const langOrder = left.language.localeCompare(right.language);
          if (langOrder !== 0) return langOrder;
          return left.label.localeCompare(right.label);
        },
      );

      if (pocketQuranTranslations.length > 0) {
        storage.set("pocketQuran_translations_cache", pocketQuranTranslations);
        storage.set("pocketQuran_translations_cache_at", Date.now());
      }
    } catch (error) {
      if (Array.isArray(cached) && cached.length > 0) {
        pocketQuranTranslations = cached
          .map((entry) => normalizePocketQuranTranslationEntry(entry))
          .filter(Boolean);
      }
    }

    if (!pocketQuranTranslations.length) {
      pocketQuranTranslations = pocketQuranFallbackTranslations.map(
        (entry) => ({
          ...entry,
        }),
      );
    }

    return pocketQuranTranslations;
  }

  function setPocketQuranPlayPauseIcon(isPlaying) {
    if (!popupPqPlayPauseBtn) return;

    popupPqPlayPauseBtn.innerHTML = isPlaying
      ? '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
      : '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
  }

  async function updatePocketQuranAyahSnippet() {
    if (!popupPqAyahArabic || !popupPqAyahTranslation || !pocketQuranState)
      return;

    const requestId = ++pocketQuranSnippetRequestId;
    const target = getPocketQuranCurrentTargetAyah();
    const translationId = clampNumber(
      pocketQuranState.translationResourceId,
      1,
      10000,
      85,
    );
    const isTajweedMode = pocketQuranState.isTajweedMode === true;
    const snippetKey = `${target.surah}:${target.ayah}:${translationId}:${isTajweedMode ? "1" : "0"}`;

    if (
      snippetKey === pocketQuranSnippetRenderedKey ||
      snippetKey === pocketQuranSnippetInFlightKey
    ) {
      return;
    }

    pocketQuranSnippetInFlightKey = snippetKey;
    const shouldShowLoadingPlaceholder = !pocketQuranSnippetRenderedKey;

    if (shouldShowLoadingPlaceholder) {
      popupPqAyahArabic.classList.remove("tajweed-mode");
      popupPqAyahArabic.textContent = "Loading current ayah...";
      popupPqAyahTranslation.textContent = "Loading translation...";
      updatePopupViewportForTab("pocketQuran");
    }

    try {
      const verses = await fetchPocketQuranSurahVerses(
        target.surah,
        translationId,
      );
      if (requestId !== pocketQuranSnippetRequestId) {
        pocketQuranSnippetInFlightKey = "";
        return;
      }

      const verse = verses.find(
        (entry) => clampNumber(entry?.verse_number, 1, 286, 1) === target.ayah,
      );

      const arabic = String(verse?.text_uthmani || "").trim();
      const translation = decodeHtmlString(verse?.translations?.[0]?.text);

      let renderedTajweedHtml = "";
      if (isTajweedMode) {
        try {
          const tajweedVerses = await fetchPocketQuranSurahTajweedVerses(
            target.surah,
          );
          if (requestId !== pocketQuranSnippetRequestId) {
            pocketQuranSnippetInFlightKey = "";
            return;
          }
          renderedTajweedHtml = getPocketQuranTajweedHtmlForAyah(
            tajweedVerses,
            target.surah,
            target.ayah,
          );
        } catch (e) {
          renderedTajweedHtml = "";
        }
      }

      popupPqAyahArabic.classList.toggle(
        "tajweed-mode",
        Boolean(renderedTajweedHtml),
      );

      if (renderedTajweedHtml) {
        popupPqAyahArabic.innerHTML = renderedTajweedHtml;
      } else {
        popupPqAyahArabic.textContent = arabic || "Arabic text unavailable.";
      }

      popupPqAyahTranslation.textContent =
        translation || "Translation unavailable for this ayah.";
      pocketQuranSnippetRenderedKey = snippetKey;
      pocketQuranSnippetInFlightKey = "";
      updatePopupViewportForTab("pocketQuran");
    } catch (error) {
      if (requestId !== pocketQuranSnippetRequestId) {
        pocketQuranSnippetInFlightKey = "";
        return;
      }
      pocketQuranSnippetInFlightKey = "";
      popupPqAyahArabic.classList.remove("tajweed-mode");
      popupPqAyahArabic.textContent = "Unable to load Arabic ayah text.";
      popupPqAyahTranslation.textContent = "Unable to load ayah translation.";
      updatePopupViewportForTab("pocketQuran");
    }
  }

  function renderPocketQuranControls() {
    if (!popupPqRecitationAyah || !pocketQuranState) return;

    const target = getPocketQuranCurrentTargetAyah();
    const isPlaying = pocketQuranState.isPlaying === true;

    popupPqRecitationAyah.textContent = formatPocketQuranAyahLabel(
      target.surah,
      target.ayah,
    );

    if (popupPqRecitationReciter) {
      popupPqRecitationReciter.textContent =
        pocketQuranState.reciterName || "Unknown Reciter";
      popupPqRecitationReciter.setAttribute(
        "aria-label",
        `Reciter: ${popupPqRecitationReciter.textContent}. Click to change reciter`,
      );
    }

    setPocketQuranPlayPauseIcon(isPlaying);

    if (popupPqVolumeSlider) {
      popupPqVolumeSlider.value = String(
        Math.round(clampNumber(pocketQuranState.volume, 0, 1, 1) * 100),
      );
    }

    popupPqLoopAyahBtn?.classList.toggle(
      "active",
      pocketQuranState.isLooping === true,
    );
    popupPqLoopSurahBtn?.classList.toggle(
      "active",
      pocketQuranState.isSurahLooping === true,
    );
    popupPqAutoplayBtn?.classList.toggle(
      "active",
      pocketQuranState.isAutoplay === true,
    );
    popupPqAutoplayNextSurahBtn?.classList.toggle(
      "active",
      pocketQuranState.isAutoplayNextSurah === true,
    );
    popupPqAutoplayNextSurahBtn?.setAttribute(
      "aria-pressed",
      pocketQuranState.isAutoplayNextSurah === true ? "true" : "false",
    );
    popupPqAutoscrollBtn?.classList.toggle(
      "active",
      pocketQuranState.isAutoScroll === true,
    );
    popupPqAutoscrollBtn?.setAttribute(
      "aria-pressed",
      pocketQuranState.isAutoScroll === true ? "true" : "false",
    );

    popupPqMiniTajweedToggle?.classList.toggle(
      "active",
      pocketQuranState.isTajweedMode === true,
    );
    popupPqMiniTajweedToggle?.setAttribute(
      "aria-pressed",
      pocketQuranState.isTajweedMode === true ? "true" : "false",
    );

    if (!popupPqTranslationPanel?.hidden) {
      renderPocketQuranTranslationOptions();
    }
    if (!popupPqFontPanel?.hidden) {
      renderPocketQuranFontOptions();
    }

    void updatePocketQuranAyahSnippet();
  }

  function clearPocketQuranResyncTimers() {
    if (!pocketQuranResyncTimeoutIds.length) return;
    pocketQuranResyncTimeoutIds.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    pocketQuranResyncTimeoutIds = [];
  }

  function clearPocketQuranAyahSelectionLoadTimeout() {
    if (!pocketQuranAyahSelectionLoadTimeoutId) return;
    clearTimeout(pocketQuranAyahSelectionLoadTimeoutId);
    pocketQuranAyahSelectionLoadTimeoutId = null;
  }

  function setPocketQuranPopupControlsLoading(isLoading) {
    if (!popupPocketQuranCard) return;

    popupPocketQuranCard.classList.toggle(
      "popup-pq-controls-locked",
      isLoading,
    );
    popupPocketQuranCard.setAttribute(
      "aria-busy",
      isLoading ? "true" : "false",
    );

    try {
      if ("inert" in popupPocketQuranCard) {
        popupPocketQuranCard.inert = isLoading;
      }
    } catch (e) {
      // no-op
    }
  }

  function finishPocketQuranAyahSelectionLoading() {
    pocketQuranPendingAyahSelection = null;
    clearPocketQuranAyahSelectionLoadTimeout();
    setPocketQuranPopupControlsLoading(false);
  }

  function startPocketQuranAyahSelectionLoading(surah, ayah, command = null) {
    const targetSurah = clampNumber(surah, 1, 114, 1);
    const targetAyah = clampNumber(
      ayah,
      1,
      getPocketQuranSurahMaxAyah(targetSurah),
      1,
    );

    pocketQuranPendingAyahSelection = {
      surah: targetSurah,
      ayah: targetAyah,
      issuedAt: Number(command?.issuedAt) || Date.now(),
    };

    clearPocketQuranAyahSelectionLoadTimeout();
    setPocketQuranPopupControlsLoading(true);

    pocketQuranAyahSelectionLoadTimeoutId = setTimeout(() => {
      finishPocketQuranAyahSelectionLoading();
    }, 12000);
  }

  function maybeCompletePocketQuranAyahSelectionLoading(rawState) {
    if (!pocketQuranPendingAyahSelection) return;

    const updatedAt = Number(rawState?.updatedAt);
    if (!Number.isFinite(updatedAt)) return;
    if (updatedAt < pocketQuranPendingAyahSelection.issuedAt) return;

    const pendingSurah = pocketQuranPendingAyahSelection.surah;
    const pendingAyah = pocketQuranPendingAyahSelection.ayah;

    const activeSurah = clampNumber(
      rawState?.activeSurah,
      1,
      114,
      pendingSurah,
    );
    const activeAyah = clampNumber(
      rawState?.activeAyah,
      1,
      getPocketQuranSurahMaxAyah(activeSurah),
      pendingAyah,
    );

    const recitationSource =
      rawState?.recitationAyah && typeof rawState.recitationAyah === "object"
        ? rawState.recitationAyah
        : {};

    const recitationSurah = clampNumber(
      recitationSource.surah,
      1,
      114,
      activeSurah,
    );
    const recitationAyah = clampNumber(
      recitationSource.ayah,
      1,
      getPocketQuranSurahMaxAyah(recitationSurah),
      activeAyah,
    );

    if (recitationSurah !== pendingSurah || recitationAyah !== pendingAyah) {
      return;
    }

    finishPocketQuranAyahSelectionLoading();
  }

  function schedulePocketQuranStateReconcile() {
    clearPocketQuranResyncTimers();

    [180, 720].forEach((delayMs) => {
      const timeoutId = setTimeout(() => {
        pocketQuranResyncTimeoutIds = pocketQuranResyncTimeoutIds.filter(
          (id) => id !== timeoutId,
        );
        void refreshPocketQuranState();
      }, delayMs);

      pocketQuranResyncTimeoutIds.push(timeoutId);
    });
  }

  function setLocalPocketQuranTargetAyah(surah, ayah) {
    const normalizedSurah = clampNumber(surah, 1, 114, 1);
    const normalizedAyah = clampNumber(
      ayah,
      1,
      getPocketQuranSurahMaxAyah(normalizedSurah),
      1,
    );

    const sourceState =
      pocketQuranState || buildPocketQuranFallbackState(storage.getSettings());

    pocketQuranState = normalizePocketQuranState(
      {
        ...sourceState,
        activeSurah: normalizedSurah,
        activeAyah: normalizedAyah,
        recitationAyah: {
          surah: normalizedSurah,
          ayah: normalizedAyah,
        },
      },
      storage.getSettings(),
    );

    renderPocketQuranControls();
  }

  function persistPocketQuranSettingsPatch(patch = {}) {
    if (!patch || typeof patch !== "object") return;

    const settings = storage.getSettings();
    settings.pocketQuran = {
      ...(settings.pocketQuran || {}),
      ...patch,
    };
    storage.saveSettings(settings);
  }

  function resolvePocketQuranReciterName(reciterId, fallbackName = "") {
    const id = clampNumber(reciterId, 1, 10000, NaN);

    if (Number.isFinite(id)) {
      const reciter = pocketQuranReciters.find((entry) => entry.id === id);
      if (reciter?.name) return reciter.name;
    }

    const fallback = String(fallbackName || "").trim();
    if (fallback) return fallback;
    if (Number.isFinite(id)) return `Reciter ${id}`;
    return "Unknown Reciter";
  }

  function publishPocketQuranPopupState(
    state,
    source = pocketQuranStateSourcePopup,
  ) {
    if (!state || typeof state !== "object") return;

    const normalized = normalizePocketQuranState(state, storage.getSettings());
    storage.set(pocketQuranPopupStateKey, {
      ...normalized,
      source,
      updatedAt: Date.now(),
    });
  }

  function resolvePocketQuranAudioUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;

    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith("//")) return `https:${raw}`;

    const normalizedPath = raw.replace(/^\/+/, "");
    return normalizedPath ? `https://verses.quran.com/${normalizedPath}` : null;
  }

  function getPocketQuranLocalAudioCacheKey(reciterId, surah, ayah) {
    return `${reciterId}:${surah}:${ayah}`;
  }

  async function fetchPocketQuranAyahAudioUrl(reciterId, surah, ayah) {
    const cacheKey = getPocketQuranLocalAudioCacheKey(reciterId, surah, ayah);
    const cached = pocketQuranLocalAudioUrlCache.get(cacheKey);
    if (cached) return cached;

    const endpoint = `${pocketQuranApiBase}/recitations/${reciterId}/by_ayah/${surah}:${ayah}`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(
        `Pocket Quran audio request failed: HTTP ${response.status}`,
      );
    }

    const data = await response.json();
    const audioUrl = resolvePocketQuranAudioUrl(
      data?.audio_files?.[0]?.url ||
        data?.audio_file?.url ||
        data?.audio_file?.audio_url,
    );

    if (!audioUrl) {
      throw new Error("Pocket Quran audio URL not found in API response.");
    }

    pocketQuranLocalAudioUrlCache.set(cacheKey, audioUrl);
    return audioUrl;
  }

  function ensurePocketQuranLocalAudio() {
    if (pocketQuranLocalAudio) return pocketQuranLocalAudio;

    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = clampNumber(pocketQuranState?.volume, 0, 1, 1);

    audio.addEventListener("ended", () => {
      void handlePocketQuranLocalAudioEnded();
    });

    audio.addEventListener("error", () => {
      pocketQuranState = normalizePocketQuranState(
        {
          ...(pocketQuranState ||
            buildPocketQuranFallbackState(storage.getSettings())),
          isPlaying: false,
        },
        storage.getSettings(),
      );
      renderPocketQuranControls();
      publishPocketQuranPopupState(
        pocketQuranState,
        pocketQuranStateSourcePopup,
      );
    });

    pocketQuranLocalAudio = audio;
    return pocketQuranLocalAudio;
  }

  function deactivatePocketQuranLocalPlayback({
    publishStoppedState = false,
  } = {}) {
    if (pocketQuranLocalAudio) {
      try {
        pocketQuranLocalAudio.pause();
        pocketQuranLocalAudio.currentTime = 0;
        pocketQuranLocalAudio.src = "";
      } catch (e) {
        // no-op
      }
    }

    if (publishStoppedState && pocketQuranState?.isPlaying === true) {
      pocketQuranState = normalizePocketQuranState(
        {
          ...pocketQuranState,
          isPlaying: false,
        },
        storage.getSettings(),
      );
      publishPocketQuranPopupState(
        pocketQuranState,
        pocketQuranStateSourcePopup,
      );
    }

    pocketQuranLocalPlaybackActive = false;
  }

  function pausePocketQuranLocalPlayback({
    resetTime = false,
    clearAutoplay = false,
  } = {}) {
    if (pocketQuranLocalAudio) {
      try {
        pocketQuranLocalAudio.pause();
        if (resetTime) {
          pocketQuranLocalAudio.currentTime = 0;
        }
      } catch (e) {
        // no-op
      }
    }

    const baseState =
      pocketQuranState || buildPocketQuranFallbackState(storage.getSettings());

    pocketQuranState = normalizePocketQuranState(
      {
        ...baseState,
        isPlaying: false,
        ...(clearAutoplay ? { isAutoplay: false } : {}),
      },
      storage.getSettings(),
    );

    renderPocketQuranControls();
    publishPocketQuranPopupState(pocketQuranState, pocketQuranStateSourcePopup);

    if (clearAutoplay) {
      persistPocketQuranSettingsPatch({ reciterAutoplay: false });
    }
  }

  async function playPocketQuranAyahLocally(
    surah,
    ayah,
    { forceRestart = false } = {},
  ) {
    const baseState =
      pocketQuranState || buildPocketQuranFallbackState(storage.getSettings());
    const normalizedSurah = clampNumber(surah, 1, 114, baseState.activeSurah);
    const normalizedAyah = clampNumber(
      ayah,
      1,
      getPocketQuranSurahMaxAyah(normalizedSurah),
      baseState.activeAyah,
    );

    const reciterId = clampNumber(baseState.reciterId, 1, 10000, 7);
    const audio = ensurePocketQuranLocalAudio();
    pocketQuranLocalPlaybackActive = true;

    try {
      const audioUrl = await fetchPocketQuranAyahAudioUrl(
        reciterId,
        normalizedSurah,
        normalizedAyah,
      );

      audio.volume = clampNumber(baseState.volume, 0, 1, 1);

      if (forceRestart || audio.src !== audioUrl) {
        audio.src = audioUrl;
      }

      if (forceRestart) {
        try {
          audio.currentTime = 0;
        } catch (e) {
          // no-op
        }
      }

      await audio.play();

      pocketQuranState = normalizePocketQuranState(
        {
          ...baseState,
          activeSurah: normalizedSurah,
          activeAyah: normalizedAyah,
          recitationAyah: {
            surah: normalizedSurah,
            ayah: normalizedAyah,
          },
          reciterId,
          reciterName: resolvePocketQuranReciterName(
            reciterId,
            baseState.reciterName,
          ),
          isPlaying: true,
        },
        storage.getSettings(),
      );

      renderPocketQuranControls();
      publishPocketQuranPopupState(
        pocketQuranState,
        pocketQuranStateSourcePopup,
      );

      persistPocketQuranSettingsPatch({
        lastSurahNumber: normalizedSurah,
        lastAyahNumber: normalizedAyah,
        reciterId,
      });

      return true;
    } catch (error) {
      pocketQuranState = normalizePocketQuranState(
        {
          ...baseState,
          isPlaying: false,
        },
        storage.getSettings(),
      );
      renderPocketQuranControls();
      publishPocketQuranPopupState(
        pocketQuranState,
        pocketQuranStateSourcePopup,
      );
      return false;
    }
  }

  async function handlePocketQuranLocalAudioEnded() {
    const state =
      pocketQuranState || buildPocketQuranFallbackState(storage.getSettings());
    const target = getPocketQuranCurrentTargetAyah(state);

    if (state.isLooping === true) {
      await playPocketQuranAyahLocally(target.surah, target.ayah, {
        forceRestart: true,
      });
      return;
    }

    if (state.isAutoplay === true) {
      const maxAyah = getPocketQuranSurahMaxAyah(target.surah);

      if (target.ayah < maxAyah) {
        await playPocketQuranAyahLocally(target.surah, target.ayah + 1);
        return;
      }

      if (state.isSurahLooping === true) {
        await playPocketQuranAyahLocally(target.surah, 1, {
          forceRestart: true,
        });
        return;
      }

      if (state.isAutoplayNextSurah === true) {
        const nextSurah = getPocketQuranNextSurahId(target.surah);
        if (Number.isFinite(nextSurah)) {
          await playPocketQuranAyahLocally(nextSurah, 1, {
            forceRestart: true,
          });
          return;
        }
      }
    }

    pocketQuranState = normalizePocketQuranState(
      {
        ...state,
        isPlaying: false,
      },
      storage.getSettings(),
    );
    renderPocketQuranControls();
    publishPocketQuranPopupState(pocketQuranState, pocketQuranStateSourcePopup);
  }

  async function executePocketQuranCommandLocally(command) {
    if (!command || typeof command !== "object") return;

    const action = String(command.action || "").trim();
    const payload =
      command.payload && typeof command.payload === "object"
        ? command.payload
        : {};

    const state =
      pocketQuranState || buildPocketQuranFallbackState(storage.getSettings());
    const currentTarget = getPocketQuranCurrentTargetAyah(state);

    switch (action) {
      case pocketQuranCommandTypes.togglePlayPause: {
        const desiredIsPlaying =
          typeof payload.desiredIsPlaying === "boolean"
            ? payload.desiredIsPlaying
            : !(state.isPlaying === true);
        const targetSurah = clampNumber(
          payload.surah,
          1,
          114,
          currentTarget.surah,
        );
        const targetAyah = clampNumber(
          payload.ayah,
          1,
          getPocketQuranSurahMaxAyah(targetSurah),
          currentTarget.ayah,
        );

        if (desiredIsPlaying) {
          await playPocketQuranAyahLocally(targetSurah, targetAyah);
        } else {
          pausePocketQuranLocalPlayback();
        }
        break;
      }

      case pocketQuranCommandTypes.playPreviousAyah: {
        const targetSurah = clampNumber(
          payload.surah,
          1,
          114,
          currentTarget.surah,
        );
        const explicitAyah = clampNumber(
          payload.ayah,
          1,
          getPocketQuranSurahMaxAyah(targetSurah),
          NaN,
        );
        const targetAyah = Number.isFinite(explicitAyah)
          ? explicitAyah
          : clampNumber(
              currentTarget.ayah - 1,
              1,
              getPocketQuranSurahMaxAyah(targetSurah),
              currentTarget.ayah,
            );

        if (
          targetAyah !== currentTarget.ayah ||
          Number.isFinite(explicitAyah)
        ) {
          await playPocketQuranAyahLocally(targetSurah, targetAyah);
        }
        break;
      }

      case pocketQuranCommandTypes.playNextAyah: {
        const targetSurah = clampNumber(
          payload.surah,
          1,
          114,
          currentTarget.surah,
        );
        const explicitAyah = clampNumber(
          payload.ayah,
          1,
          getPocketQuranSurahMaxAyah(targetSurah),
          NaN,
        );
        const targetAyah = Number.isFinite(explicitAyah)
          ? explicitAyah
          : clampNumber(
              currentTarget.ayah + 1,
              1,
              getPocketQuranSurahMaxAyah(targetSurah),
              currentTarget.ayah,
            );

        if (
          targetAyah !== currentTarget.ayah ||
          Number.isFinite(explicitAyah)
        ) {
          await playPocketQuranAyahLocally(targetSurah, targetAyah);
        }
        break;
      }

      case pocketQuranCommandTypes.stopPlayback:
        pausePocketQuranLocalPlayback({
          resetTime: true,
          clearAutoplay: true,
        });
        break;

      case pocketQuranCommandTypes.setVolume: {
        const volume = clampNumber(payload.volume, 0, 1, state.volume);
        if (pocketQuranLocalAudio) {
          pocketQuranLocalAudio.volume = volume;
        }

        pocketQuranState = normalizePocketQuranState(
          {
            ...state,
            volume,
          },
          storage.getSettings(),
        );
        renderPocketQuranControls();
        publishPocketQuranPopupState(
          pocketQuranState,
          pocketQuranStateSourcePopup,
        );
        persistPocketQuranSettingsPatch({ reciterVolume: volume });
        break;
      }

      case pocketQuranCommandTypes.toggleLoopAyah: {
        const nextLoop =
          typeof payload.desiredIsLooping === "boolean"
            ? payload.desiredIsLooping
            : !(state.isLooping === true);

        pocketQuranState = normalizePocketQuranState(
          {
            ...state,
            isLooping: nextLoop,
          },
          storage.getSettings(),
        );
        renderPocketQuranControls();
        publishPocketQuranPopupState(
          pocketQuranState,
          pocketQuranStateSourcePopup,
        );
        persistPocketQuranSettingsPatch({ reciterLoop: nextLoop });
        break;
      }

      case pocketQuranCommandTypes.toggleLoopSurah: {
        const nextLoopSurah =
          typeof payload.desiredIsSurahLooping === "boolean"
            ? payload.desiredIsSurahLooping
            : !(state.isSurahLooping === true);

        pocketQuranState = normalizePocketQuranState(
          {
            ...state,
            isSurahLooping: nextLoopSurah,
          },
          storage.getSettings(),
        );
        renderPocketQuranControls();
        publishPocketQuranPopupState(
          pocketQuranState,
          pocketQuranStateSourcePopup,
        );
        persistPocketQuranSettingsPatch({ reciterSurahLoop: nextLoopSurah });
        break;
      }

      case pocketQuranCommandTypes.toggleAutoplay: {
        const nextAutoplay =
          typeof payload.desiredIsAutoplay === "boolean"
            ? payload.desiredIsAutoplay
            : !(state.isAutoplay === true);

        pocketQuranState = normalizePocketQuranState(
          {
            ...state,
            isAutoplay: nextAutoplay,
          },
          storage.getSettings(),
        );
        renderPocketQuranControls();
        publishPocketQuranPopupState(
          pocketQuranState,
          pocketQuranStateSourcePopup,
        );
        persistPocketQuranSettingsPatch({ reciterAutoplay: nextAutoplay });

        if (nextAutoplay && state.isPlaying !== true) {
          const target = getPocketQuranCurrentTargetAyah(pocketQuranState);
          await playPocketQuranAyahLocally(target.surah, target.ayah);
        }
        break;
      }

      case pocketQuranCommandTypes.toggleAutoplayNextSurah: {
        const nextAutoplayNextSurah =
          typeof payload.desiredIsAutoplayNextSurah === "boolean"
            ? payload.desiredIsAutoplayNextSurah
            : !(state.isAutoplayNextSurah === true);

        pocketQuranState = normalizePocketQuranState(
          {
            ...state,
            isAutoplayNextSurah: nextAutoplayNextSurah,
          },
          storage.getSettings(),
        );
        renderPocketQuranControls();
        publishPocketQuranPopupState(
          pocketQuranState,
          pocketQuranStateSourcePopup,
        );
        persistPocketQuranSettingsPatch({
          reciterAutoplayNextSurah: nextAutoplayNextSurah,
        });
        break;
      }

      case pocketQuranCommandTypes.toggleAutoScroll: {
        const nextAutoScroll =
          typeof payload.desiredIsAutoScroll === "boolean"
            ? payload.desiredIsAutoScroll
            : !(state.isAutoScroll === true);

        pocketQuranState = normalizePocketQuranState(
          {
            ...state,
            isAutoScroll: nextAutoScroll,
          },
          storage.getSettings(),
        );
        renderPocketQuranControls();
        publishPocketQuranPopupState(
          pocketQuranState,
          pocketQuranStateSourcePopup,
        );
        persistPocketQuranSettingsPatch({ reciterAutoScroll: nextAutoScroll });
        break;
      }

      case pocketQuranCommandTypes.toggleTajweed: {
        const nextTajweedMode =
          typeof payload.desiredIsTajweedMode === "boolean"
            ? payload.desiredIsTajweedMode
            : !(state.isTajweedMode === true);

        pocketQuranState = normalizePocketQuranState(
          {
            ...state,
            isTajweedMode: nextTajweedMode,
          },
          storage.getSettings(),
        );
        renderPocketQuranControls();
        publishPocketQuranPopupState(
          pocketQuranState,
          pocketQuranStateSourcePopup,
        );
        persistPocketQuranSettingsPatch({ tajweedMode: nextTajweedMode });
        break;
      }

      case pocketQuranCommandTypes.selectTranslation: {
        const translationId = clampNumber(
          payload.translationResourceId ?? payload.translationId,
          1,
          10000,
          state.translationResourceId,
        );

        pocketQuranVersesCache.clear();
        pocketQuranState = normalizePocketQuranState(
          {
            ...state,
            translationResourceId: translationId,
          },
          storage.getSettings(),
        );
        renderPocketQuranControls();
        publishPocketQuranPopupState(
          pocketQuranState,
          pocketQuranStateSourcePopup,
        );
        persistPocketQuranSettingsPatch({
          translationResourceId: translationId,
        });
        break;
      }

      case pocketQuranCommandTypes.selectAyah: {
        const targetSurah = clampNumber(
          payload.surah,
          1,
          114,
          currentTarget.surah,
        );
        const targetAyah = clampNumber(
          payload.ayah,
          1,
          getPocketQuranSurahMaxAyah(targetSurah),
          currentTarget.ayah,
        );

        persistPocketQuranSettingsPatch({
          lastSurahNumber: targetSurah,
          lastAyahNumber: targetAyah,
        });

        const isActivelyPlaying =
          state.isPlaying === true ||
          (pocketQuranLocalAudio &&
            pocketQuranLocalAudio.paused === false &&
            pocketQuranLocalAudio.ended === false);

        if (isActivelyPlaying) {
          if (pocketQuranLocalAudio) {
            try {
              pocketQuranLocalAudio.pause();
              pocketQuranLocalAudio.currentTime = 0;
            } catch (e) {
              // no-op
            }
          }

          await playPocketQuranAyahLocally(targetSurah, targetAyah, {
            forceRestart: true,
          });
          break;
        }

        if (pocketQuranLocalAudio) {
          try {
            pocketQuranLocalAudio.pause();
            pocketQuranLocalAudio.currentTime = 0;
          } catch (e) {
            // no-op
          }
        }

        pocketQuranState = normalizePocketQuranState(
          {
            ...state,
            activeSurah: targetSurah,
            activeAyah: targetAyah,
            recitationAyah: {
              surah: targetSurah,
              ayah: targetAyah,
            },
            isPlaying: false,
          },
          storage.getSettings(),
        );
        renderPocketQuranControls();
        publishPocketQuranPopupState(
          pocketQuranState,
          pocketQuranStateSourcePopup,
        );
        break;
      }

      case pocketQuranCommandTypes.selectReciter: {
        const reciterId = clampNumber(
          payload.reciterId,
          1,
          10000,
          state.reciterId,
        );
        const reciterName = resolvePocketQuranReciterName(
          reciterId,
          state.reciterName,
        );

        pocketQuranState = normalizePocketQuranState(
          {
            ...state,
            reciterId,
            reciterName,
          },
          storage.getSettings(),
        );
        renderPocketQuranControls();
        publishPocketQuranPopupState(
          pocketQuranState,
          pocketQuranStateSourcePopup,
        );
        persistPocketQuranSettingsPatch({ reciterId });

        if (state.isPlaying === true) {
          const target = getPocketQuranCurrentTargetAyah(pocketQuranState);
          await playPocketQuranAyahLocally(target.surah, target.ayah, {
            forceRestart: true,
          });
        }
        break;
      }

      default:
        break;
    }
  }

  function queuePocketQuranLocalCommand(command) {
    pocketQuranLocalCommandQueue = pocketQuranLocalCommandQueue
      .then(() => executePocketQuranCommandLocally(command))
      .catch((error) => {
        console.warn("Pocket Quran popup local command failed:", error);
      });
  }

  async function hasDashboardPocketQuranController() {
    if (typeof chrome === "undefined") return false;
    let hasDetectionCapability = false;

    try {
      if (typeof chrome.runtime?.getContexts === "function") {
        hasDetectionCapability = true;
        const contexts = await chrome.runtime.getContexts({
          contextTypes: ["TAB"],
        });
        if (
          Array.isArray(contexts) &&
          contexts.some((context) =>
            isDashboardIndexUrl(String(context?.documentUrl || "")),
          )
        ) {
          return true;
        }
      }
    } catch (error) {
      // ignore
    }

    try {
      if (typeof chrome.extension?.getViews === "function") {
        hasDetectionCapability = true;
        const views = chrome.extension.getViews();
        if (
          Array.isArray(views) &&
          views.some((view) =>
            isDashboardIndexUrl(String(view?.location?.href || "")),
          )
        ) {
          return true;
        }
      }
    } catch (error) {
      // ignore
    }

    if (!hasDetectionCapability) {
      return Date.now() - pocketQuranLastDashboardStateAt < 3000;
    }

    return false;
  }

  async function dispatchPocketQuranCommandWithFallback(command) {
    const dashboardAvailable = await hasDashboardPocketQuranController();

    if (dashboardAvailable) {
      if (pocketQuranLocalPlaybackActive) {
        deactivatePocketQuranLocalPlayback({ publishStoppedState: false });
      }
      return;
    }

    queuePocketQuranLocalCommand(command);
  }

  function sendPocketQuranCommand(action, payload = {}) {
    const command = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
      action,
      payload,
      issuedAt: Date.now(),
    };

    storage.set(pocketQuranPopupCommandKey, command);
    schedulePocketQuranStateReconcile();
    void dispatchPocketQuranCommandWithFallback(command);
    return command;
  }

  async function refreshPocketQuranState(settings = storage.getSettings()) {
    await ensurePocketQuranChaptersLoaded();
    void ensurePocketQuranRecitersLoaded();
    const rawState = storage.get(pocketQuranPopupStateKey, null);
    maybeCompletePocketQuranAyahSelectionLoading(rawState);

    const stateSource =
      rawState && typeof rawState.source === "string" ? rawState.source : "";

    if (stateSource === pocketQuranStateSourceDashboard) {
      const updatedAt = Number(rawState.updatedAt);
      pocketQuranLastDashboardStateAt = Number.isFinite(updatedAt)
        ? Math.max(pocketQuranLastDashboardStateAt, updatedAt)
        : Date.now();

      if (pocketQuranLocalPlaybackActive) {
        deactivatePocketQuranLocalPlayback({ publishStoppedState: false });
      }
    }

    pocketQuranState = normalizePocketQuranState(rawState, settings);

    if (
      stateSource === pocketQuranStateSourcePopup &&
      pocketQuranState.isPlaying === true &&
      !pocketQuranLocalPlaybackActive
    ) {
      pocketQuranState = normalizePocketQuranState(
        {
          ...pocketQuranState,
          isPlaying: false,
        },
        settings,
      );
      publishPocketQuranPopupState(
        pocketQuranState,
        pocketQuranStateSourcePopup,
      );
    }

    renderPocketQuranControls();
    applyPocketQuranPopupTypography(settings);
  }

  function updatePocketQuranSelectorMode() {
    const ayahPanelOpen = popupPqAyahPanel?.hidden === false;
    const reciterPanelOpen = popupPqReciterPanel?.hidden === false;
    const translationPanelOpen = popupPqTranslationPanel?.hidden === false;
    const fontPanelOpen = popupPqFontPanel?.hidden === false;
    const selectorOpen =
      ayahPanelOpen ||
      reciterPanelOpen ||
      translationPanelOpen ||
      fontPanelOpen;

    popupPocketQuranCard?.classList.toggle(
      "popup-pq-selector-open",
      selectorOpen,
    );
    popupPocketQuranCard?.classList.toggle(
      "popup-pq-selector-ayah-open",
      ayahPanelOpen,
    );
    popupPocketQuranCard?.classList.toggle(
      "popup-pq-selector-reciter-open",
      reciterPanelOpen,
    );
    popupPocketQuranCard?.classList.toggle(
      "popup-pq-selector-translation-open",
      translationPanelOpen,
    );
    popupPocketQuranCard?.classList.toggle(
      "popup-pq-selector-font-open",
      fontPanelOpen,
    );
  }

  function updatePocketQuranAyahSelectorToolbar() {
    const ayahMode = popupPqSelectionState.selectorMode === "ayah";
    const surah = clampNumber(
      popupPqSelectionState.ayahPopoverSurah,
      1,
      114,
      NaN,
    );
    const chapter = Number.isFinite(surah)
      ? getPocketQuranChapterById(surah)
      : null;

    if (popupPqSurahToolbar) {
      popupPqSurahToolbar.hidden = !ayahMode;
    }
    if (popupPqAyahBackBtn) {
      popupPqAyahBackBtn.hidden = !ayahMode;
    }
    if (popupPqAyahModeLabel) {
      popupPqAyahModeLabel.hidden = !ayahMode;
      popupPqAyahModeLabel.textContent = ayahMode
        ? `Ayahs of ${chapter?.name_simple || `Surah ${surah}`}`
        : "";
    }

    if (popupPqSurahSearchInput) {
      popupPqSurahSearchInput.placeholder = ayahMode
        ? "Search ayah number"
        : "Search by number, English, or Arabic name";
    }
  }

  function setPocketQuranAyahSelectorMode(mode, surah = null) {
    const normalizedMode = mode === "ayah" ? "ayah" : "surah";
    popupPqSelectionState.selectorMode = normalizedMode;

    if (normalizedMode === "ayah") {
      const nextSurah = clampNumber(
        surah,
        1,
        114,
        clampNumber(popupPqSelectionState.selectedSurah, 1, 114, NaN),
      );
      if (Number.isFinite(nextSurah)) {
        popupPqSelectionState.ayahPopoverSurah = nextSurah;
      }
    } else {
      popupPqSelectionState.ayahPopoverSurah = null;
      popupPqSelectionState.ayahPopoverAnchorEl = null;
    }

    if (popupPqSurahList) {
      popupPqSurahList.hidden = normalizedMode === "ayah";
      popupPqSurahList.classList.remove("popup-pq-ayah-list-mode");
    }

    if (popupPqAyahList) {
      popupPqAyahList.hidden = normalizedMode !== "ayah";
      popupPqAyahList.classList.toggle(
        "popup-pq-ayah-list-mode",
        normalizedMode === "ayah",
      );
    }

    popupPqSurahListWrap?.classList.toggle(
      "popup-pq-surah-list-wrap-ayah-mode",
      normalizedMode === "ayah",
    );
    updatePocketQuranAyahSelectorToolbar();
  }

  function hidePocketQuranAyahPopover() {
    setPocketQuranAyahSelectorMode("surah");
  }

  function positionPocketQuranAyahPopover() {
    // Popover mode has been retired in favor of in-container Ayah list mode.
  }

  function renderPocketQuranAyahOptions() {
    if (!popupPqAyahList) return;

    const surah = clampNumber(
      popupPqSelectionState.ayahPopoverSurah,
      1,
      114,
      NaN,
    );
    if (!Number.isFinite(surah)) {
      popupPqAyahList.innerHTML =
        '<div class="popup-pq-reciter-empty">Select a surah to view ayahs.</div>';
      return;
    }

    const maxAyah = getPocketQuranSurahMaxAyah(surah);
    const target = getPocketQuranCurrentTargetAyah();
    const selectedAyah = clampNumber(
      popupPqSelectionState.selectedSurah === surah
        ? popupPqSelectionState.selectedAyah
        : target.surah === surah
          ? target.ayah
          : 1,
      1,
      maxAyah,
      target.surah === surah ? target.ayah : 1,
    );

    popupPqSelectionState.selectedSurah = surah;
    popupPqSelectionState.selectedAyah = selectedAyah;

    const query = String(popupPqSurahSearchInput?.value || "")
      .trim()
      .toLowerCase();
    const buttons = [];
    for (let ayah = 1; ayah <= maxAyah; ayah += 1) {
      if (query && !String(ayah).includes(query)) continue;
      const isActive = ayah === selectedAyah;
      buttons.push(
        `<button type="button" class="pocket-quran-ayah-option popup-pq-ayah-option ${isActive ? "active" : ""}" data-popup-pq-ayah="${ayah}" aria-label="Select ayah ${ayah}">Ayah ${ayah}</button>`,
      );
    }

    popupPqAyahList.innerHTML =
      buttons.join("") ||
      '<div class="popup-pq-reciter-empty">No matching ayah found.</div>';
  }

  function showPocketQuranAyahPopoverForSurah(surah) {
    const normalizedSurah = clampNumber(surah, 1, 114, NaN);
    if (!Number.isFinite(normalizedSurah)) return;

    popupPqSelectionState.selectedSurah = normalizedSurah;
    popupPqSelectionState.selectedAyah = clampNumber(
      popupPqSelectionState.selectedAyah,
      1,
      getPocketQuranSurahMaxAyah(normalizedSurah),
      1,
    );

    setPocketQuranAyahSelectorMode("ayah", normalizedSurah);
    renderPocketQuranAyahOptions();
  }

  function renderPocketQuranSurahOptions() {
    if (!popupPqSurahList) return;

    const query = String(popupPqSurahSearchInput?.value || "")
      .trim()
      .toLowerCase();

    const filtered = !query
      ? pocketQuranChapters
      : pocketQuranChapters.filter((chapter) => {
          const idText = String(chapter.id);
          const english = String(chapter.name_simple || "").toLowerCase();
          const arabic = String(chapter.name_arabic || "");
          return (
            idText.includes(query) ||
            english.includes(query) ||
            arabic.includes(query)
          );
        });

    if (!filtered.length) {
      popupPqSurahList.innerHTML =
        '<div class="popup-pq-reciter-empty">No matching surah found.</div>';
      hidePocketQuranAyahPopover();
      return;
    }

    const currentTarget = getPocketQuranCurrentTargetAyah();
    const selectedSurah = clampNumber(
      popupPqSelectionState.selectedSurah,
      1,
      114,
      currentTarget.surah,
    );

    popupPqSelectionState.selectedSurah = selectedSurah;

    popupPqSurahList.innerHTML = filtered
      .map((chapter) => {
        const isSelected = chapter.id === selectedSurah;
        const isCurrent = chapter.id === currentTarget.surah;
        const classes = ["pocket-quran-surah-item", "popup-pq-surah-item"];
        if (isSelected) classes.push("active");
        if (isCurrent) classes.push("current");

        return `
          <button
            type="button"
            class="${classes.join(" ")}"
            data-popup-pq-surah="${chapter.id}"
            aria-label="Select surah ${chapter.id} ${chapter.name_simple}"
          >
            <span class="popup-pq-surah-title">${chapter.id}. ${chapter.name_simple} ${chapter.name_arabic}</span>
            <span class="popup-pq-surah-meta">${chapter.verses_count} Ayahs</span>
          </button>
        `;
      })
      .join("");

    updatePocketQuranAyahSelectorToolbar();
  }

  async function openPocketQuranAyahPanel() {
    if (!popupPqAyahPanel) return;

    await ensurePocketQuranChaptersLoaded();

    const target = getPocketQuranCurrentTargetAyah();
    popupPqSelectionState.selectedSurah = target.surah;
    popupPqSelectionState.selectedAyah = target.ayah;

    if (popupPqSurahSearchInput) {
      popupPqSurahSearchInput.value = "";
    }

    closePocketQuranReciterPanel();
    setPocketQuranAyahSelectorMode("surah");
    renderPocketQuranSurahOptions();
    popupPqAyahPanel.hidden = false;
    updatePocketQuranSelectorMode();

    requestAnimationFrame(() => {
      popupPqSurahSearchInput?.focus();
    });
  }

  function closePocketQuranAyahPanel() {
    if (!popupPqAyahPanel) return;
    setPocketQuranAyahSelectorMode("surah");
    popupPqAyahPanel.hidden = true;
    updatePocketQuranSelectorMode();
  }

  function renderPocketQuranReciterOptions() {
    if (!popupPqReciterList) return;

    const query = String(popupPqReciterSearchInput?.value || "")
      .trim()
      .toLowerCase();
    const currentReciterId = clampNumber(
      pocketQuranState?.reciterId,
      1,
      10000,
      7,
    );

    const filtered = !query
      ? pocketQuranReciters
      : pocketQuranReciters.filter((reciter) => {
          const name = String(reciter.name || "").toLowerCase();
          const style = String(reciter.style || "").toLowerCase();
          return name.includes(query) || style.includes(query);
        });

    if (!filtered.length) {
      popupPqReciterList.innerHTML =
        '<div class="popup-pq-reciter-empty">No matching reciter found.</div>';
      return;
    }

    popupPqReciterList.innerHTML = filtered
      .map((reciter) => {
        const isActive = reciter.id === currentReciterId;
        return `
          <button
            type="button"
            class="pq-translation-item popup-pq-reciter-option ${isActive ? "active" : ""}"
            data-popup-pq-reciter="${reciter.id}"
            aria-label="Select reciter ${reciter.name}"
          >
            <span class="popup-pq-reciter-option-name">${reciter.name}</span>
            ${reciter.style ? `<span class="popup-pq-reciter-option-style">${reciter.style}</span>` : ""}
          </button>
        `;
      })
      .join("");
  }

  async function openPocketQuranReciterPanel() {
    if (!popupPqReciterPanel) return;
    await ensurePocketQuranRecitersLoaded();

    if (popupPqReciterSearchInput) {
      popupPqReciterSearchInput.value = "";
    }

    closePocketQuranAyahPanel();
    renderPocketQuranReciterOptions();
    popupPqReciterPanel.hidden = false;
    updatePocketQuranSelectorMode();

    requestAnimationFrame(() => {
      popupPqReciterSearchInput?.focus();
    });
  }

  function closePocketQuranReciterPanel() {
    if (!popupPqReciterPanel) return;
    popupPqReciterPanel.hidden = true;
    updatePocketQuranSelectorMode();
  }

  function renderPocketQuranTranslationOptions() {
    if (!popupPqTranslationList) return;

    const query = String(popupPqTranslationSearchInput?.value || "")
      .trim()
      .toLowerCase();
    const currentTranslationId = clampNumber(
      pocketQuranState?.translationResourceId,
      1,
      10000,
      85,
    );

    const filtered = !query
      ? pocketQuranTranslations
      : pocketQuranTranslations.filter((translation) => {
          const label = String(translation.label || "").toLowerCase();
          const language = String(translation.language || "").toLowerCase();
          return label.includes(query) || language.includes(query);
        });

    if (!filtered.length) {
      popupPqTranslationList.innerHTML =
        '<div class="popup-pq-reciter-empty">No matching translation found.</div>';
      return;
    }

    const grouped = new Map();
    filtered.forEach((translation) => {
      const language = translation.language || "Other";
      if (!grouped.has(language)) {
        grouped.set(language, []);
      }
      grouped.get(language).push(translation);
    });

    const sortedLanguages = Array.from(grouped.keys()).sort((left, right) =>
      left.localeCompare(right),
    );

    popupPqTranslationList.innerHTML = sortedLanguages
      .map((language) => {
        const translations = grouped
          .get(language)
          .slice()
          .sort((left, right) => left.label.localeCompare(right.label));

        const translationRows = translations
          .map((translation) => {
            const isActive = translation.id === currentTranslationId;
            return `
              <button
                type="button"
                class="pq-translation-item ${isActive ? "active" : ""}"
                data-popup-pq-translation="${translation.id}"
                aria-label="Select translation ${escapeHtml(translation.label)}"
              >
                <span class="pq-translation-name">${escapeHtml(translation.label)}</span>
              </button>
            `;
          })
          .join("");

        return `
          <div class="pq-translation-group">
            <div class="pq-translation-lang-header">${escapeHtml(language)}</div>
            <div class="pq-translation-items">${translationRows}</div>
          </div>
        `;
      })
      .join("");

    const activeItem = popupPqTranslationList.querySelector(
      ".pq-translation-item.active",
    );
    if (activeItem && !query) {
      setTimeout(() => {
        activeItem.scrollIntoView({ block: "center", behavior: "auto" });
      }, 40);
    }
  }

  async function openPocketQuranTranslationPanel() {
    if (!popupPqTranslationPanel) return;
    await ensurePocketQuranTranslationsLoaded();

    if (popupPqTranslationSearchInput) {
      popupPqTranslationSearchInput.value = "";
    }

    closePocketQuranAyahPanel();
    closePocketQuranReciterPanel();
    closePocketQuranFontPanel();
    renderPocketQuranTranslationOptions();
    popupPqTranslationPanel.hidden = false;
    updatePocketQuranSelectorMode();

    requestAnimationFrame(() => {
      popupPqTranslationSearchInput?.focus();
    });
  }

  function closePocketQuranTranslationPanel() {
    if (!popupPqTranslationPanel) return;
    popupPqTranslationPanel.hidden = true;
    updatePocketQuranSelectorMode();
  }

  function renderPocketQuranFontOptions() {
    if (!popupPqFontList) return;

    const query = String(popupPqFontSearchInput?.value || "")
      .trim()
      .toLowerCase();
    const currentFont = normalizePocketQuranArabicFontFamily(
      popupPqTypographyState?.arabicFontFamily,
    );

    const filteredFonts = pocketQuranArabicFontFamilies.filter((fontFamily) =>
      fontFamily.toLowerCase().includes(query),
    );

    if (!filteredFonts.length) {
      popupPqFontList.innerHTML =
        '<div class="popup-pq-reciter-empty">No matching Arabic font found.</div>';
      return;
    }

    popupPqFontList.innerHTML = filteredFonts
      .map((fontFamily) => {
        const isActive = fontFamily === currentFont;
        return `
          <button
            type="button"
            class="pq-translation-item ${isActive ? "active" : ""}"
            data-popup-pq-font="${escapeHtml(fontFamily)}"
            aria-label="Select Arabic font ${escapeHtml(fontFamily)}"
          >
            <span class="pq-translation-name">${escapeHtml(fontFamily)}</span>
          </button>
        `;
      })
      .join("");

    const activeItem = popupPqFontList.querySelector(
      ".pq-translation-item.active",
    );
    if (activeItem && !query) {
      setTimeout(() => {
        activeItem.scrollIntoView({ block: "center", behavior: "auto" });
      }, 40);
    }
  }

  function openPocketQuranFontPanel() {
    if (!popupPqFontPanel) return;

    if (popupPqFontSearchInput) {
      popupPqFontSearchInput.value = "";
    }

    closePocketQuranAyahPanel();
    closePocketQuranReciterPanel();
    closePocketQuranTranslationPanel();
    renderPocketQuranFontOptions();
    popupPqFontPanel.hidden = false;
    updatePocketQuranSelectorMode();

    requestAnimationFrame(() => {
      popupPqFontSearchInput?.focus();
    });
  }

  function closePocketQuranFontPanel() {
    if (!popupPqFontPanel) return;
    popupPqFontPanel.hidden = true;
    updatePocketQuranSelectorMode();
  }

  function setupPocketQuranSelectors() {
    popupPqAyahPanelClose?.addEventListener("click", () => {
      closePocketQuranAyahPanel();
    });

    popupPqReciterPanelClose?.addEventListener("click", () => {
      closePocketQuranReciterPanel();
    });

    popupPqTranslationPanelClose?.addEventListener("click", () => {
      closePocketQuranTranslationPanel();
    });

    popupPqFontPanelClose?.addEventListener("click", () => {
      closePocketQuranFontPanel();
    });

    popupPqAyahBackBtn?.addEventListener("click", () => {
      if (popupPqSelectionState.selectorMode !== "ayah") return;
      if (popupPqSurahSearchInput) {
        popupPqSurahSearchInput.value = "";
      }
      setPocketQuranAyahSelectorMode("surah");
      renderPocketQuranSurahOptions();
      popupPqSurahSearchInput?.focus();
    });

    popupPqSurahSearchInput?.addEventListener("input", () => {
      if (popupPqSelectionState.selectorMode === "ayah") {
        renderPocketQuranAyahOptions();
        return;
      }
      renderPocketQuranSurahOptions();
    });

    popupPqReciterSearchInput?.addEventListener("input", () => {
      renderPocketQuranReciterOptions();
    });

    popupPqTranslationSearchInput?.addEventListener("input", () => {
      renderPocketQuranTranslationOptions();
    });

    popupPqFontSearchInput?.addEventListener("input", () => {
      renderPocketQuranFontOptions();
    });

    popupPqSurahList?.addEventListener("click", (event) => {
      const target = getEventTargetElement(event.target);
      const surahTrigger = target?.closest("[data-popup-pq-surah]");
      if (!surahTrigger) return;

      const surah = clampNumber(surahTrigger.dataset.popupPqSurah, 1, 114, NaN);
      if (!Number.isFinite(surah)) return;

      popupPqSelectionState.selectedSurah = surah;
      popupPqSelectionState.selectedAyah = 1;
      if (popupPqSurahSearchInput) {
        popupPqSurahSearchInput.value = "";
      }
      showPocketQuranAyahPopoverForSurah(surah);
    });

    popupPqAyahList?.addEventListener("click", (event) => {
      const target = getEventTargetElement(event.target);
      const ayahTrigger = target?.closest("[data-popup-pq-ayah]");
      if (!ayahTrigger) return;

      const surah = clampNumber(
        popupPqSelectionState.ayahPopoverSurah,
        1,
        114,
        NaN,
      );
      const ayah = clampNumber(ayahTrigger.dataset.popupPqAyah, 1, 286, NaN);
      if (!Number.isFinite(surah) || !Number.isFinite(ayah)) return;

      popupPqSelectionState.selectedSurah = surah;
      popupPqSelectionState.selectedAyah = ayah;

      setLocalPocketQuranTargetAyah(surah, ayah);
      const selectAyahCommand = sendPocketQuranCommand(
        pocketQuranCommandTypes.selectAyah,
        {
          surah,
          ayah,
        },
      );
      closePocketQuranAyahPanel();
      startPocketQuranAyahSelectionLoading(surah, ayah, selectAyahCommand);

      if (!selectAyahCommand) {
        finishPocketQuranAyahSelectionLoading();
      }
    });

    popupPqReciterList?.addEventListener("click", (event) => {
      const trigger = event.target?.closest?.("[data-popup-pq-reciter]");
      if (!trigger) return;

      const reciterId = clampNumber(
        trigger.dataset.popupPqReciter,
        1,
        10000,
        NaN,
      );
      if (!Number.isFinite(reciterId)) return;

      const reciter = pocketQuranReciters.find((item) => item.id === reciterId);
      if (!reciter) return;

      pocketQuranState = normalizePocketQuranState(
        {
          ...(pocketQuranState ||
            buildPocketQuranFallbackState(storage.getSettings())),
          reciterId: reciter.id,
          reciterName: reciter.name,
        },
        storage.getSettings(),
      );

      renderPocketQuranControls();
      sendPocketQuranCommand(pocketQuranCommandTypes.selectReciter, {
        reciterId: reciter.id,
      });
      closePocketQuranReciterPanel();
    });

    popupPqTranslationList?.addEventListener("click", (event) => {
      const trigger = event.target?.closest?.("[data-popup-pq-translation]");
      if (!trigger) return;

      const translationId = clampNumber(
        trigger.dataset.popupPqTranslation,
        1,
        10000,
        NaN,
      );
      if (!Number.isFinite(translationId)) return;

      pocketQuranVersesCache.clear();
      pocketQuranState = normalizePocketQuranState(
        {
          ...(pocketQuranState ||
            buildPocketQuranFallbackState(storage.getSettings())),
          translationResourceId: translationId,
        },
        storage.getSettings(),
      );

      renderPocketQuranControls();
      persistPocketQuranSettingsPatch({ translationResourceId: translationId });
      sendPocketQuranCommand(pocketQuranCommandTypes.selectTranslation, {
        translationResourceId: translationId,
      });
      closePocketQuranTranslationPanel();
    });

    popupPqFontList?.addEventListener("click", (event) => {
      const trigger = event.target?.closest?.("[data-popup-pq-font]");
      if (!trigger) return;

      const selectedFont = normalizePocketQuranArabicFontFamily(
        trigger.dataset.popupPqFont,
      );
      persistPocketQuranPopupTypography({ arabicFontFamily: selectedFont });
      applyPocketQuranPopupTypography(storage.getSettings());
      closePocketQuranFontPanel();
    });

    const handleArabicLabelActivate = (event) => {
      event.preventDefault();
      event.stopPropagation();
      openPocketQuranFontPanel();
    };

    popupPqArabicSizeLabel?.addEventListener(
      "click",
      handleArabicLabelActivate,
    );
    popupPqArabicSizeLabel?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      handleArabicLabelActivate(event);
    });

    const handleTranslationLabelActivate = (event) => {
      event.preventDefault();
      event.stopPropagation();
      void openPocketQuranTranslationPanel();
    };

    popupPqTranslationSizeLabel?.addEventListener(
      "click",
      handleTranslationLabelActivate,
    );
    popupPqTranslationSizeLabel?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      handleTranslationLabelActivate(event);
    });

    if (popupPqSurahListWrap) {
      popupPqSurahListWrap.addEventListener("scroll", () => {
        if (popupPqSelectionState.selectorMode === "ayah") {
          positionPocketQuranAyahPopover();
        }
      });
    }

    document.addEventListener("click", (event) => {
      const target = event.target;
      const clickedAyahTrigger = popupPqRecitationAyah?.contains(target);
      const clickedReciterTrigger = popupPqRecitationReciter?.contains(target);
      const clickedTranslationTrigger =
        popupPqTranslationSizeLabel?.contains(target);
      const clickedFontTrigger =
        popupPqArabicSizeLabel?.contains(target) ||
        popupPqMiniTajweedToggle?.contains(target);

      if (
        !popupPqAyahPanel?.hidden &&
        popupPqAyahPanel &&
        !popupPqAyahPanel.contains(target) &&
        !clickedAyahTrigger
      ) {
        closePocketQuranAyahPanel();
      }

      if (
        !popupPqReciterPanel?.hidden &&
        popupPqReciterPanel &&
        !popupPqReciterPanel.contains(target) &&
        !clickedReciterTrigger
      ) {
        closePocketQuranReciterPanel();
      }

      if (
        !popupPqTranslationPanel?.hidden &&
        popupPqTranslationPanel &&
        !popupPqTranslationPanel.contains(target) &&
        !clickedTranslationTrigger
      ) {
        closePocketQuranTranslationPanel();
      }

      if (
        !popupPqFontPanel?.hidden &&
        popupPqFontPanel &&
        !popupPqFontPanel.contains(target) &&
        !clickedFontTrigger
      ) {
        closePocketQuranFontPanel();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;

      if (
        !popupPqAyahPanel?.hidden &&
        popupPqSelectionState.selectorMode === "ayah"
      ) {
        setPocketQuranAyahSelectorMode("surah");
        renderPocketQuranSurahOptions();
        return;
      }

      if (!popupPqAyahPanel?.hidden) {
        closePocketQuranAyahPanel();
        return;
      }

      if (!popupPqReciterPanel?.hidden) {
        closePocketQuranReciterPanel();
        return;
      }

      if (!popupPqTranslationPanel?.hidden) {
        closePocketQuranTranslationPanel();
        return;
      }

      if (!popupPqFontPanel?.hidden) {
        closePocketQuranFontPanel();
      }
    });

    window.addEventListener("resize", () => {
      if (popupPqSelectionState.selectorMode === "ayah") {
        positionPocketQuranAyahPopover();
      }
    });

    bindShortcut(popupPqRecitationAyah, () => {
      void openPocketQuranAyahPanel();
    });

    bindShortcut(popupPqRecitationReciter, () => {
      void openPocketQuranReciterPanel();
    });
  }

  function setupPocketQuranControls() {
    if (!popupPqPlayPauseBtn) return;

    popupPqPlayPauseBtn.addEventListener("click", () => {
      const nextPlaying = !(pocketQuranState?.isPlaying === true);
      pocketQuranState = normalizePocketQuranState(
        {
          ...(pocketQuranState ||
            buildPocketQuranFallbackState(storage.getSettings())),
          isPlaying: nextPlaying,
        },
        storage.getSettings(),
      );
      renderPocketQuranControls();
      const target = getPocketQuranCurrentTargetAyah();
      sendPocketQuranCommand(pocketQuranCommandTypes.togglePlayPause, {
        desiredIsPlaying: nextPlaying,
        surah: target.surah,
        ayah: target.ayah,
      });
    });

    popupPqPrevBtn?.addEventListener("click", () => {
      const target = getPocketQuranCurrentTargetAyah();
      const previousAyah = clampNumber(
        target.ayah - 1,
        1,
        getPocketQuranSurahMaxAyah(target.surah),
        target.ayah,
      );
      setLocalPocketQuranTargetAyah(target.surah, previousAyah);
      sendPocketQuranCommand(pocketQuranCommandTypes.playPreviousAyah, {
        surah: target.surah,
        ayah: previousAyah,
      });
    });

    popupPqNextBtn?.addEventListener("click", () => {
      const target = getPocketQuranCurrentTargetAyah();
      const nextAyah = clampNumber(
        target.ayah + 1,
        1,
        getPocketQuranSurahMaxAyah(target.surah),
        target.ayah,
      );
      setLocalPocketQuranTargetAyah(target.surah, nextAyah);
      sendPocketQuranCommand(pocketQuranCommandTypes.playNextAyah, {
        surah: target.surah,
        ayah: nextAyah,
      });
    });

    popupPqStopBtn?.addEventListener("click", () => {
      pocketQuranState = normalizePocketQuranState(
        {
          ...(pocketQuranState ||
            buildPocketQuranFallbackState(storage.getSettings())),
          isPlaying: false,
        },
        storage.getSettings(),
      );
      renderPocketQuranControls();
      sendPocketQuranCommand(pocketQuranCommandTypes.stopPlayback);
    });

    popupPqVolumeSlider?.addEventListener("input", () => {
      const volume = clampNumber(
        parseInt(popupPqVolumeSlider.value, 10) / 100,
        0,
        1,
        1,
      );
      pocketQuranState = normalizePocketQuranState(
        {
          ...(pocketQuranState ||
            buildPocketQuranFallbackState(storage.getSettings())),
          volume,
        },
        storage.getSettings(),
      );
      renderPocketQuranControls();
      sendPocketQuranCommand(pocketQuranCommandTypes.setVolume, { volume });
    });

    popupPqLoopAyahBtn?.addEventListener("click", () => {
      const nextLoop = !(pocketQuranState?.isLooping === true);
      pocketQuranState = normalizePocketQuranState(
        {
          ...(pocketQuranState ||
            buildPocketQuranFallbackState(storage.getSettings())),
          isLooping: nextLoop,
        },
        storage.getSettings(),
      );
      renderPocketQuranControls();
      sendPocketQuranCommand(pocketQuranCommandTypes.toggleLoopAyah, {
        desiredIsLooping: nextLoop,
      });
    });

    popupPqLoopSurahBtn?.addEventListener("click", () => {
      const nextLoop = !(pocketQuranState?.isSurahLooping === true);
      pocketQuranState = normalizePocketQuranState(
        {
          ...(pocketQuranState ||
            buildPocketQuranFallbackState(storage.getSettings())),
          isSurahLooping: nextLoop,
        },
        storage.getSettings(),
      );
      renderPocketQuranControls();
      sendPocketQuranCommand(pocketQuranCommandTypes.toggleLoopSurah, {
        desiredIsSurahLooping: nextLoop,
      });
    });

    popupPqAutoplayBtn?.addEventListener("click", () => {
      const nextAutoplay = !(pocketQuranState?.isAutoplay === true);
      pocketQuranState = normalizePocketQuranState(
        {
          ...(pocketQuranState ||
            buildPocketQuranFallbackState(storage.getSettings())),
          isAutoplay: nextAutoplay,
        },
        storage.getSettings(),
      );
      renderPocketQuranControls();
      sendPocketQuranCommand(pocketQuranCommandTypes.toggleAutoplay, {
        desiredIsAutoplay: nextAutoplay,
      });
    });

    popupPqAutoplayNextSurahBtn?.addEventListener("click", () => {
      const nextAutoplayNextSurah = !(
        pocketQuranState?.isAutoplayNextSurah === true
      );
      pocketQuranState = normalizePocketQuranState(
        {
          ...(pocketQuranState ||
            buildPocketQuranFallbackState(storage.getSettings())),
          isAutoplayNextSurah: nextAutoplayNextSurah,
        },
        storage.getSettings(),
      );
      renderPocketQuranControls();
      sendPocketQuranCommand(pocketQuranCommandTypes.toggleAutoplayNextSurah, {
        desiredIsAutoplayNextSurah: nextAutoplayNextSurah,
      });
    });

    popupPqAutoscrollBtn?.addEventListener("click", () => {
      const nextAutoScroll = !(pocketQuranState?.isAutoScroll === true);
      pocketQuranState = normalizePocketQuranState(
        {
          ...(pocketQuranState ||
            buildPocketQuranFallbackState(storage.getSettings())),
          isAutoScroll: nextAutoScroll,
        },
        storage.getSettings(),
      );
      renderPocketQuranControls();
      sendPocketQuranCommand(pocketQuranCommandTypes.toggleAutoScroll, {
        desiredIsAutoScroll: nextAutoScroll,
      });
    });

    popupPqMiniTajweedToggle?.addEventListener("click", () => {
      const nextTajweedMode = !(pocketQuranState?.isTajweedMode === true);
      pocketQuranState = normalizePocketQuranState(
        {
          ...(pocketQuranState ||
            buildPocketQuranFallbackState(storage.getSettings())),
          isTajweedMode: nextTajweedMode,
        },
        storage.getSettings(),
      );
      renderPocketQuranControls();
      sendPocketQuranCommand(pocketQuranCommandTypes.toggleTajweed, {
        desiredIsTajweedMode: nextTajweedMode,
      });
    });

    const syncArabicSizeFromSlider = () => {
      const nextValue = clampNumber(
        parseInt(popupPqArabicSizeRange?.value, 10),
        8,
        144,
        popupPqTypographyState?.arabicFontSize || 40,
      );
      persistPocketQuranPopupTypography({ arabicFontSize: nextValue });
      applyPocketQuranPopupTypography(storage.getSettings());
    };

    const syncTranslationSizeFromSlider = () => {
      const nextValue = clampNumber(
        parseInt(popupPqTranslationSizeRange?.value, 10),
        8,
        144,
        popupPqTypographyState?.translationFontSize || 18,
      );
      persistPocketQuranPopupTypography({ translationFontSize: nextValue });
      applyPocketQuranPopupTypography(storage.getSettings());
    };

    popupPqArabicSizeRange?.addEventListener("input", syncArabicSizeFromSlider);
    popupPqTranslationSizeRange?.addEventListener(
      "input",
      syncTranslationSizeFromSlider,
    );

    popupPqArabicSizeDecreaseBtn?.addEventListener("click", () => {
      const current = popupPqTypographyState?.arabicFontSize || 40;
      persistPocketQuranPopupTypography({
        arabicFontSize: clampNumber(current - 1, 8, 144, current),
      });
      applyPocketQuranPopupTypography(storage.getSettings());
    });

    popupPqArabicSizeIncreaseBtn?.addEventListener("click", () => {
      const current = popupPqTypographyState?.arabicFontSize || 40;
      persistPocketQuranPopupTypography({
        arabicFontSize: clampNumber(current + 1, 8, 144, current),
      });
      applyPocketQuranPopupTypography(storage.getSettings());
    });

    popupPqTranslationSizeDecreaseBtn?.addEventListener("click", () => {
      const current = popupPqTypographyState?.translationFontSize || 18;
      persistPocketQuranPopupTypography({
        translationFontSize: clampNumber(current - 1, 8, 144, current),
      });
      applyPocketQuranPopupTypography(storage.getSettings());
    });

    popupPqTranslationSizeIncreaseBtn?.addEventListener("click", () => {
      const current = popupPqTypographyState?.translationFontSize || 18;
      persistPocketQuranPopupTypography({
        translationFontSize: clampNumber(current + 1, 8, 144, current),
      });
      applyPocketQuranPopupTypography(storage.getSettings());
    });

    popupPqArabicVisibleToggle?.addEventListener("change", () => {
      persistPocketQuranPopupTypography({
        showArabicText: popupPqArabicVisibleToggle.checked === true,
      });
      applyPocketQuranPopupTypography(storage.getSettings());
    });

    popupPqTranslationVisibleToggle?.addEventListener("change", () => {
      persistPocketQuranPopupTypography({
        showTranslationText: popupPqTranslationVisibleToggle.checked === true,
      });
      applyPocketQuranPopupTypography(storage.getSettings());
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

  function applyPerformanceModeState(settings = storage.getSettings()) {
    const enabled = settings?.performanceModeEnabled === true;
    const root = document.documentElement;

    if (root) {
      root.dataset.performanceMode = enabled ? "true" : "false";
      root.classList.toggle("performance-mode", enabled);
    }

    document.body?.classList.toggle("performance-mode", enabled);
    window.__MD_PERFORMANCE_MODE__ = enabled;

    try {
      document.dispatchEvent(
        new CustomEvent("md:performance-mode-change", {
          detail: { enabled },
        }),
      );
    } catch (e) {}
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

    applyPerformanceModeState(settings);

    applyThemeAndIconSettings();

    await refreshPocketQuranState(settings);

    const isPrayerVisible = settings.componentVisibility?.prayerTimes !== false;
    setPopupVisibility(isPrayerVisible);

    if (!isPrayerVisible) return;

    await ensurePrayerManagerInitialized();
    prayerTimes.updateSettings(settings);
    syncLocation(settings);
  }

  function handleStorageChange(event) {
    const changedKey = event?.key;
    const pocketQuranStateStorageEventKey = `${storage.prefix}${pocketQuranPopupStateKey}`;

    if (changedKey === pocketQuranStateStorageEventKey) {
      void refreshPocketQuranState();
      return;
    }

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

  setupPopupTabs();
  setupPocketQuranControls();
  setupPocketQuranSelectors();
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
    clearPocketQuranResyncTimers();
    deactivatePocketQuranLocalPlayback({ publishStoppedState: true });
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

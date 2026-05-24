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
  const popupPrayerSettingsPanel = document.getElementById(
    "popupPrayerSettingsPanel",
  );
  const popupPrayerLocationPanel = document.getElementById(
    "popupPrayerLocationPanel",
  );
  const popupPrayerLocationPanelClose = document.getElementById(
    "popupPrayerLocationPanelClose",
  );
  const popupPrayerLocationPanelHost = document.getElementById(
    "popupPrayerLocationPanelHost",
  );
  const popupPrayerLocationStatus = document.getElementById(
    "popupPrayerLocationStatus",
  );
  const popupPrayerMethodPanel = document.getElementById(
    "popupPrayerMethodPanel",
  );
  const popupPrayerMethodPanelClose = document.getElementById(
    "popupPrayerMethodPanelClose",
  );
  const popupPrayerMethodPanelHost = document.getElementById(
    "popupPrayerMethodPanelHost",
  );
  const popupPrayerMethodStatus = document.getElementById(
    "popupPrayerMethodStatus",
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
  const pocketQuranStateSourceOffscreen = "offscreen";
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
  const pocketQuranFallbackTranslations = {
    88: { label: "Hasan Efendi Nahi", language: "Albanian" },
    47: { label: "Albanian", language: "Albanian" },
    89: { label: "Albanian Translation (Sherif Ahmeti)", language: "Albanian" },
    236: { label: "Ramdane At Mansour", language: "Amazigh" },
    87: { label: "Sadiq and Sani", language: "Amharic" },
    120: { label: "Shaykh Rafeequl Islam Habibur-Rahman", language: "Assamese" },
    75: { label: "Alikhan Musayev", language: "Azeri" },
    23: { label: "Azerbaijani", language: "Azeri" },
    795: { label: "Suliman Kanti", language: "Bambara" },
    796: { label: "Baba Mamady Jani", language: "Bambara" },
    161: { label: "Taisirul Quran", language: "Bengali" },
    163: { label: "Sheikh Mujibur Rahman", language: "Bengali" },
    162: { label: "Rawai Al-bayan", language: "Bengali" },
    213: { label: "Dr. Abu Bakr Muhammad Zakaria", language: "Bengali" },
    214: { label: "Dar Al-Salam Center", language: "Bosnian" },
    25: { label: "Muhamed Mehanović", language: "Bosnian" },
    126: { label: "Besim Korkut", language: "Bosnian" },
    237: { label: "Tzvetan Theophanov", language: "Bulgarian" },
    128: { label: "Cambodian Muslim Community Development", language: "Central Khmer" },
    106: { label: "Magomed Magomedov", language: "Chechen" },
    56: { label: "Chinese Translation (Simplified) - Ma Jian", language: "Chinese" },
    109: { label: "Muhammad Makin", language: "Chinese" },
    26: { label: "Czech", language: "Czech" },
    785: { label: "Mawlawi Muhammad Anwar Badkhashani", language: "Dari" },
    86: { label: "Office of the President of Maldives", language: "Divehi" },
    840: { label: "Abu Bakr Ibrahim Ali (Bakurube)", language: "Divehi" },
    235: { label: "Malak Faris Abdalsalaam", language: "Dutch" },
    144: { label: "Sofian S. Siregar", language: "Dutch" },
    85: { label: "M.A.S. Abdel Haleem", language: "English" },
    149: { label: "Fadel Soliman, Bridges' translation", language: "English" },
    84: { label: "T. Usmani", language: "English" },
    95: { label: "A. Maududi (Tafhim commentary)", language: "English" },
    19: { label: "M. Pickthall", language: "English" },
    22: { label: "A. Yusuf Ali", language: "English" },
    20: { label: "Saheeh International", language: "English" },
    203: { label: "Al-Hilali & Khan", language: "English" },
    57: { label: "Transliteration", language: "English" },
    30: { label: "Finnish", language: "Finnish" },
    136: { label: "Montada Islamic Foundation", language: "French" },
    31: { label: "Muhammad Hamidullah", language: "French" },
    779: { label: "Rashid Maash", language: "French" },
    232: { label: "African Development Foundation", language: "Ganda" },
    208: { label: "Abu Reda Muhammad ibn Ahmad", language: "German" },
    27: { label: "Frank Bubenheim and Nadeem", language: "German" },
    225: { label: "Rabila Al-Umry", language: "Gujarati" },
    32: { label: "Hausa Translation (Abubakar Gumi)", language: "Hausa" },
    115: { label: "Abubakar Mahmood Jummi", language: "Hausa" },
    233: { label: "Dar Al-Salam Center", language: "Hebrew" },
    122: { label: "Maulana Azizul Haque al-Umari", language: "Hindi" },
    134: { label: "King Fahad Quran Complex", language: "Indonesian" },
    141: { label: "The Sabiq Company", language: "Indonesian" },
    33: { label: "Indonesian Islamic Affairs Ministry", language: "Indonesian" },
    153: { label: "Hamza Roberto Piccardo", language: "Italian" },
    209: { label: "Othman al-Sharif", language: "Italian" },
    35: { label: "Ryoichi Mita", language: "Japanese" },
    218: { label: "Saeed Sato", language: "Japanese" },
    771: { label: "Kannada Translation", language: "Kannada" },
    222: { label: "Khalifa Altay", language: "Kazakh" },
    113: { label: "Khalifah Altai", language: "Kazakh" },
    774: { label: "The Rwanda Muslims Association team", language: "Kinyarwanda" },
    36: { label: "Korean", language: "Korean" },
    219: { label: "Hamed Choi", language: "Korean" },
    81: { label: "Burhan Muhammad-Amin", language: "Kurdish" },
    143: { label: "Muhammad Saleh Bamoki", language: "Kurdish" },
    39: { label: "Abdullah Muhammad Basmeih", language: "Malay" },
    80: { label: "Muhammad Karakunnu and Vanidas Elayavoor", language: "Malayalam" },
    224: { label: "Abdul-Hamid Haidar & Kanhi Muhammad", language: "Malayalam" },
    37: { label: "Malayalam Translation (Abdul Hameed and Kunhi)", language: "Malayalam" },
    38: { label: "Maranao", language: "Maranao" },
    226: { label: "Muhammad Shafi'i Ansari", language: "Marathi" },
    108: { label: "Ahl Al-Hadith Central Society of Nepal", language: "Nepali" },
    41: { label: "Norwegian", language: "Norwegian" },
    111: { label: "Ghali Apapur Apaghuna", language: "Oromo" },
    118: { label: "Zakaria Abulsalam", language: "Pashto" },
    135: { label: "IslamHouse.com", language: "Persian" },
    29: { label: "Hussein Taji Kal Dari", language: "Persian" },
    42: { label: "Józef Bielawski", language: "Polish" },
    103: { label: "Helmi Nasr", language: "Portuguese" },
    43: { label: "Portuguese Translation (Samir)", language: "Portuguese" },
    44: { label: "Grigore", language: "Romanian" },
    782: { label: "Islamic and Cultural League", language: "Romanian" },
    78: { label: "Ministry of Awqaf, Egypt", language: "Russian" },
    79: { label: "Abu Adel", language: "Russian" },
    45: { label: "Russian Translation (Elmir Kuliev)", language: "Russian" },
    238: { label: "Taj Mehmood Amroti", language: "Sindhi" },
    228: { label: "Ruwwad Center", language: "Sinhala" },
    46: { label: "Mahmud Muhammad Abduh", language: "Somali" },
    83: { label: "Sheikh Isa Garcia", language: "Spanish" },
    140: { label: "Montada Islamic Foundation", language: "Spanish" },
    199: { label: "Noor International Center", language: "Spanish" },
    231: { label: "Dr. Abdullah Muhammad Abu Bakr and Sheikh Nasir Khamis", language: "Swahili" },
    49: { label: "Ali Muhsin Al-Barwani", language: "Swahili" },
    48: { label: "Knut Bernström", language: "Swedish" },
    211: { label: "Dar Al-Salam Center", language: "Tagalog" },
    139: { label: "Khawaja Mirof & Khawaja Mir", language: "Tajik" },
    74: { label: "Tajik (AbdolMohammad Ayati)", language: "Tajik" },
    223: { label: "Pioneers of Translation Center", language: "Tajik" },
    229: { label: "Sheikh Omar Sharif bin Abdul Salam", language: "Tamil" },
    50: { label: "Jan Trust Foundation", language: "Tamil" },
    133: { label: "Abdul Hameed Baqavi", language: "Tamil" },
    53: { label: "Tatar", language: "Tatar" },
    227: { label: "Maulana Abder-Rahim ibn Muhammad", language: "Telugu" },
    230: { label: "Society of Institutes and Universities", language: "Thai" },
    51: { label: "Thai Translation (King Fahad Quran Complex)", language: "Thai" },
    210: { label: "Dar Al-Salam Center", language: "Turkish" },
    77: { label: "Turkish Translation (Diyanet)", language: "Turkish" },
    124: { label: "Muslim Shahin", language: "Turkish" },
    112: { label: "Shaban Britch", language: "Turkish" },
    52: { label: "Elmalili Hamdi Yazir", language: "Turkish" },
    76: { label: "Muhammad Saleh", language: "Uighur" },
    217: { label: "Dr. Mikhailo Yaqubovic", language: "Ukrainian" },
    234: { label: "Fatah Muhammad Jalandhari", language: "Urdu" },
    54: { label: "Maulana Muhammad Junagarhi", language: "Urdu" },
    156: { label: "Fe Zilal al-Qur'an (Sayyid Qutb)", language: "Urdu" },
    151: { label: "Shaykh al-Hind Mahmud al-Hasan (with Tafsir E Usmani)", language: "Urdu" },
    158: { label: "Bayan-ul-Quran (Dr. Israr Ahmad)", language: "Urdu" },
    97: { label: "Tafheem e Qur'an - Syed Abu Ali Maududi", language: "Urdu" },
    831: { label: "Abul Ala Maududi (Roman Urdu)", language: "Urdu" },
    819: { label: "Maulana Wahiduddin Khan", language: "Urdu" },
    55: { label: "Muhammad Sodiq Muhammad Yusuf (Latin)", language: "Uzbek" },
    101: { label: "Alauddin Mansour", language: "Uzbek" },
    127: { label: "Muhammad Sodik Muhammad Yusuf", language: "Uzbek" },
    220: { label: "Ruwwad Center", language: "Vietnamese" },
    221: { label: "Hasan Abdul-Karim", language: "Vietnamese" },
    798: { label: "Abdul Hamid Silika", language: "Yau" },
    125: { label: "Shaykh Abu Rahimah Mikael Aykyuni", language: "Yoruba" },
  };
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
  let pocketQuranPendingCommandIssuedAt = 0;
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
  let popupPrayerLocationPanelRoot = null;
  let popupPrayerMethodPanelRoot = null;
  let popupPrayerSettingsPanelsLoaded = false;
  let popupPrayerLocationAutoSaveTimer = null;
  let popupPrayerMethodAutoSaveTimer = null;
  let popupPrayerLocationAutoSaveShowValidation = false;
  const popupPrayerAutoSaveDelayMs = 220;
  const popupPrayerKeys = [
    "fajr",
    "sunrise",
    "duha",
    "dhuhr",
    "asr",
    "maghrib",
    "isha",
    "midnight",
    "qiyam",
  ];
  const popupPrayerIdSuffixByKey = {
    fajr: "Fajr",
    sunrise: "Sunrise",
    duha: "Duha",
    dhuhr: "Dhuhr",
    asr: "Asr",
    maghrib: "Maghrib",
    isha: "Isha",
    midnight: "Midnight",
    qiyam: "Qiyam",
  };

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

  function normalizePopupPrayerSettingsTab(tabName) {
    const normalized = String(tabName || "").trim();
    if (normalized === "location" || normalized === "prayer") {
      return normalized;
    }
    return "prayer";
  }

  function updatePopupPrayerSettingsMode() {
    const panelOpen = popupPrayerSettingsPanel?.hidden === false;
    prayerCard?.classList.toggle("popup-prayer-settings-open", panelOpen);

    if (!panelOpen) {
      popupPrayerSettingsPanel?.setAttribute("aria-hidden", "true");
    } else {
      popupPrayerSettingsPanel?.removeAttribute("aria-hidden");
    }

    updatePopupViewportForTab("prayer");
  }

  function setPopupPrayerSettingsStatus(
    statusElement,
    message,
    isError = false,
  ) {
    if (!statusElement) return;

    const text = String(message || "").trim();
    statusElement.textContent = text;
    statusElement.classList.toggle("error", Boolean(text) && isError);
  }

  function getPopupPanelElement(panelRoot, selector) {
    if (!(panelRoot instanceof Element)) return null;
    return panelRoot.querySelector(selector);
  }

  function formatPopupCoordinateValue(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return "";
    return String(Math.round(numericValue * 1000000) / 1000000);
  }

  function getPopupDetectedLocationText() {
    const locationTextEl = document.getElementById("locationText");
    const locationText = String(locationTextEl?.textContent || "")
      .replace(/\s+/g, " ")
      .trim();

    if (locationText) {
      const lowered = locationText.toLowerCase();
      const isTransientText =
        lowered.includes("detecting") ||
        lowered.includes("requesting permission") ||
        lowered.includes("loading");
      if (!isTransientText) {
        return locationText;
      }
    }

    const lastLocation = storage.getLastLocation();
    const lastCity = String(lastLocation?.city || "").trim();
    if (lastCity) {
      return lastCity;
    }
    return "Not detected yet";
  }

  function togglePopupManualLocation(panelRoot, show) {
    const manualLocationFields = getPopupPanelElement(
      panelRoot,
      "#manualLocationFields",
    );

    if (manualLocationFields) {
      if (show) {
        manualLocationFields.classList.add("active");
      } else {
        manualLocationFields.classList.remove("active");
      }
    }

    updatePopupDetectedLocationText(panelRoot);
  }

  function updatePopupDetectedLocationText(panelRoot) {
    const detectedLocationText = getPopupPanelElement(
      panelRoot,
      "#detectedLocationText",
    );
    if (!detectedLocationText) return;

    const selectedRadio = panelRoot.querySelector(
      'input[name="locationMethod"]:checked',
    );
    const isManual = selectedRadio?.value === "manual";

    const text = getPopupDetectedLocationText();
    detectedLocationText.textContent = text;
    detectedLocationText.title = text;
    detectedLocationText.hidden = isManual;
  }

  function clearPopupCitySearchResults(container) {
    if (!(container instanceof Element)) return;
    container.innerHTML = "";
    container.classList.remove("active");
  }

  function renderPopupCitySearchResults(container, results, onPick) {
    if (!(container instanceof Element)) return;

    clearPopupCitySearchResults(container);

    const list = Array.isArray(results) ? results : [];
    if (!list.length) return;

    const fragment = document.createDocumentFragment();
    list.forEach((result, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "city-result-item";

      const title = String(result.fullName || result.city || "").trim();
      const lat = Number(result.latitude);
      const lon = Number(result.longitude);

      const primary = document.createElement("div");
      primary.className = "city-result-primary";
      primary.textContent = title || "Unknown";

      const secondary = document.createElement("div");
      secondary.className = "city-result-secondary";
      secondary.textContent =
        Number.isFinite(lat) && Number.isFinite(lon)
          ? `${lat.toFixed(4)}, ${lon.toFixed(4)}`
          : "";

      button.dataset.shortcut = String(index + 1);
      button.appendChild(primary);
      button.appendChild(secondary);
      button.addEventListener("click", () => {
        try {
          if (typeof onPick === "function") onPick(result);
        } finally {
          clearPopupCitySearchResults(container);
        }
      });

      fragment.appendChild(button);
    });

    container.appendChild(fragment);
    container.classList.add("active");
  }

  function safeDecodePopupUriComponent(value) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  function normalizePopupLatLng(latText, lngText) {
    const latNumber = Number(latText);
    const lngNumber = Number(lngText);
    if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) {
      return null;
    }

    let latitude = latNumber;
    let longitude = lngNumber;
    if (Math.abs(latitude) > 90 && Math.abs(longitude) <= 90) {
      [latitude, longitude] = [longitude, latitude];
    }

    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      return null;
    }

    return {
      latitude: String(latitude),
      longitude: String(longitude),
    };
  }

  function parsePopupLatLngFromText(text) {
    const raw = String(text || "").trim();
    if (!raw) return null;

    const candidates = [raw, safeDecodePopupUriComponent(raw)];
    for (const candidate of candidates) {
      const atMatch = candidate.match(
        /@\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/,
      );
      if (atMatch) {
        const normalized = normalizePopupLatLng(atMatch[1], atMatch[2]);
        if (normalized) return normalized;
      }

      const pairMatch = candidate.match(
        /(-?\d+(?:\.\d+)?)(?:\s*,\s*|\s+)(-?\d+(?:\.\d+)?)/,
      );
      if (pairMatch) {
        const normalized = normalizePopupLatLng(pairMatch[1], pairMatch[2]);
        if (normalized) return normalized;
      }
    }

    return null;
  }

  function schedulePopupPrayerLocationAutoSave(options = {}) {
    const immediate = options.immediate === true;
    const showValidationErrors = options.showValidationErrors === true;

    popupPrayerLocationAutoSaveShowValidation =
      popupPrayerLocationAutoSaveShowValidation || showValidationErrors;

    const runAutoSave = () => {
      const shouldShowValidation = popupPrayerLocationAutoSaveShowValidation;
      popupPrayerLocationAutoSaveShowValidation = false;
      popupPrayerLocationAutoSaveTimer = null;
      applyPopupPrayerLocationSettings({
        showValidationErrors: shouldShowValidation,
      });
    };

    if (popupPrayerLocationAutoSaveTimer) {
      clearTimeout(popupPrayerLocationAutoSaveTimer);
      popupPrayerLocationAutoSaveTimer = null;
    }

    if (immediate) {
      runAutoSave();
      return;
    }

    popupPrayerLocationAutoSaveTimer = setTimeout(
      runAutoSave,
      popupPrayerAutoSaveDelayMs,
    );
  }

  function schedulePopupPrayerMethodAutoSave(options = {}) {
    const immediate = options.immediate === true;

    const runAutoSave = () => {
      popupPrayerMethodAutoSaveTimer = null;
      applyPopupPrayerMethodSettings();
    };

    if (popupPrayerMethodAutoSaveTimer) {
      clearTimeout(popupPrayerMethodAutoSaveTimer);
      popupPrayerMethodAutoSaveTimer = null;
    }

    if (immediate) {
      runAutoSave();
      return;
    }

    popupPrayerMethodAutoSaveTimer = setTimeout(
      runAutoSave,
      popupPrayerAutoSaveDelayMs,
    );
  }

  async function readPopupClipboardTextWithFallback() {
    try {
      if (navigator.clipboard?.readText) {
        return await navigator.clipboard.readText();
      }
    } catch {
      // ignored: prompt fallback below
    }

    return (
      window.prompt(
        "Paste coordinates (e.g., -2.0104945156119673, 120.13398946553744)",
      ) || ""
    );
  }

  function applyPopupLatLngToInputs(panelRoot, latLng) {
    const latitudeInput = getPopupPanelElement(panelRoot, "#latitudeInput");
    const longitudeInput = getPopupPanelElement(panelRoot, "#longitudeInput");
    if (!(latitudeInput instanceof HTMLInputElement)) return;
    if (!(longitudeInput instanceof HTMLInputElement)) return;

    latitudeInput.value = latLng.latitude;
    longitudeInput.value = latLng.longitude;
  }

  async function pastePopupLocationCoordinates(panelRoot) {
    const text = await readPopupClipboardTextWithFallback();
    const latLng = parsePopupLatLngFromText(text);
    if (!latLng) {
      setPopupPrayerSettingsStatus(
        popupPrayerLocationStatus,
        "Could not parse coordinates.",
        true,
      );
      return;
    }

    applyPopupLatLngToInputs(panelRoot, latLng);
    setPopupPrayerSettingsStatus(
      popupPrayerLocationStatus,
      "Coordinates pasted.",
      false,
    );
    schedulePopupPrayerLocationAutoSave({
      immediate: true,
      showValidationErrors: true,
    });
  }

  async function searchPopupLocationCity(panelRoot) {
    const cityInput = getPopupPanelElement(panelRoot, "#cityInput");
    const searchButton = getPopupPanelElement(panelRoot, "#searchCityBtn");
    const citySearchResults = getPopupPanelElement(
      panelRoot,
      "#citySearchResults",
    );

    const cityName = String(cityInput?.value || "").trim();
    if (!cityName) {
      setPopupPrayerSettingsStatus(
        popupPrayerLocationStatus,
        "Please enter a city name.",
        true,
      );
      return;
    }

    clearPopupCitySearchResults(citySearchResults);

    const previousButtonHtml = searchButton?.innerHTML || "";
    if (searchButton) {
      searchButton.disabled = true;
      searchButton.textContent = "Searching...";
    }

    try {
      await ensurePrayerManagerInitialized();
      const results = await prayerTimes.searchCity(cityName);
      if (!Array.isArray(results) || !results.length) {
        setPopupPrayerSettingsStatus(
          popupPrayerLocationStatus,
          "City not found.",
          true,
        );
        return;
      }

      renderPopupCitySearchResults(citySearchResults, results, (result) => {
        if (cityInput instanceof HTMLInputElement) {
          cityInput.value = String(result.city || "");
        }
        applyPopupLatLngToInputs(panelRoot, {
          latitude: Number(result.latitude).toFixed(4),
          longitude: Number(result.longitude).toFixed(4),
        });

        setPopupPrayerSettingsStatus(
          popupPrayerLocationStatus,
          "City selected.",
          false,
        );

        schedulePopupPrayerLocationAutoSave({
          immediate: true,
          showValidationErrors: true,
        });
      });

      setPopupPrayerSettingsStatus(
        popupPrayerLocationStatus,
        "Select a city from the list.",
        false,
      );
    } catch (error) {
      console.warn("Popup city search failed:", error);
      setPopupPrayerSettingsStatus(
        popupPrayerLocationStatus,
        "Search failed. Try again.",
        true,
      );
    } finally {
      if (searchButton) {
        searchButton.disabled = false;
        searchButton.innerHTML = previousButtonHtml || "Search City";
      }
    }
  }

  function updatePopupPrayerMethodAnglesDisplay(panelRoot) {
    const calculationMethod = getPopupPanelElement(
      panelRoot,
      "#calculationMethod",
    );
    const methodAnglesInfo = getPopupPanelElement(
      panelRoot,
      "#methodAnglesInfo",
    );
    const methodFajrAngle = getPopupPanelElement(panelRoot, "#methodFajrAngle");
    const methodIshaAngle = getPopupPanelElement(panelRoot, "#methodIshaAngle");
    const customAnglesGroup = getPopupPanelElement(
      panelRoot,
      "#customAnglesGroup",
    );

    const selectedMethod = String(calculationMethod?.value || "MWL");
    const showCustom = selectedMethod === "Custom";

    if (customAnglesGroup) {
      customAnglesGroup.style.display = showCustom ? "block" : "none";
    }

    if (showCustom) {
      if (methodAnglesInfo) {
        methodAnglesInfo.style.display = "none";
      }
      return;
    }

    const methodParams =
      prayerTimes?.prayTimes?.methods?.[selectedMethod]?.params;
    const fajrAngle = methodParams?.fajr ?? 18;
    const ishaAngle = methodParams?.isha ?? 17;

    if (methodFajrAngle) {
      methodFajrAngle.textContent = `${fajrAngle}\u00b0`;
    }
    if (methodIshaAngle) {
      methodIshaAngle.textContent =
        typeof ishaAngle === "string" ? ishaAngle : `${ishaAngle}\u00b0`;
    }
    if (methodAnglesInfo) {
      methodAnglesInfo.style.display = "block";
    }
  }

  function bindPopupPrayerLocationPanelEvents(panelRoot) {
    if (!(panelRoot instanceof Element)) return;
    if (panelRoot.dataset.popupBound === "1") return;

    const requestLocationButton = getPopupPanelElement(
      panelRoot,
      "#requestLocationBtn",
    );
    const refreshLocationButton = getPopupPanelElement(
      panelRoot,
      "#refreshLocationBtn",
    );
    const searchCityButton = getPopupPanelElement(panelRoot, "#searchCityBtn");
    const pasteCoordsButton = getPopupPanelElement(
      panelRoot,
      "#pasteCoordsBtn",
    );
    const cityInput = getPopupPanelElement(panelRoot, "#cityInput");

    panelRoot.addEventListener("change", (event) => {
      const target = getEventTargetElement(event.target);
      if (
        !(target instanceof HTMLInputElement) &&
        !(target instanceof HTMLSelectElement)
      ) {
        return;
      }

      if (
        target instanceof HTMLInputElement &&
        target.name === "locationMethod"
      ) {
        togglePopupManualLocation(panelRoot, target.value === "manual");
        setPopupPrayerSettingsStatus(popupPrayerLocationStatus, "");
      }

      schedulePopupPrayerLocationAutoSave({ showValidationErrors: true });
    });

    panelRoot.addEventListener("input", (event) => {
      const target = getEventTargetElement(event.target);
      if (!(target instanceof HTMLInputElement)) return;
      schedulePopupPrayerLocationAutoSave();
    });

    requestLocationButton?.addEventListener("click", () => {
      void requestPopupPrayerCurrentLocation(panelRoot);
    });

    refreshLocationButton?.addEventListener("click", () => {
      void requestPopupPrayerCurrentLocation(panelRoot);
    });

    searchCityButton?.addEventListener("click", () => {
      void searchPopupLocationCity(panelRoot);
    });

    pasteCoordsButton?.addEventListener("click", () => {
      void pastePopupLocationCoordinates(panelRoot);
    });

    cityInput?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      void searchPopupLocationCity(panelRoot);
    });

    panelRoot.dataset.popupBound = "1";
  }

  function bindPopupPrayerMethodPanelEvents(panelRoot) {
    if (!(panelRoot instanceof Element)) return;
    if (panelRoot.dataset.popupBound === "1") return;

    panelRoot.addEventListener("change", (event) => {
      const target = getEventTargetElement(event.target);
      if (!(target instanceof Element)) return;

      if (
        target.id === "calculationMethod" ||
        target.id === "customIshaMinutes" ||
        target.id === "customFajrAngle" ||
        target.id === "customIshaAngle"
      ) {
        updatePopupPrayerMethodAnglesDisplay(panelRoot);
      }

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement
      ) {
        schedulePopupPrayerMethodAutoSave({ immediate: true });
      }
    });

    panelRoot.addEventListener("input", (event) => {
      const target = getEventTargetElement(event.target);
      if (!(target instanceof HTMLInputElement)) return;
      schedulePopupPrayerMethodAutoSave();
    });

    panelRoot.dataset.popupBound = "1";
  }

  async function ensurePopupPrayerSettingsPanelsLoaded() {
    if (
      popupPrayerSettingsPanelsLoaded &&
      popupPrayerLocationPanelRoot &&
      popupPrayerMethodPanelRoot
    ) {
      return true;
    }

    if (!popupPrayerLocationPanelHost || !popupPrayerMethodPanelHost) {
      return false;
    }

    try {
      const response = await fetch(getDashboardUrl("index.html"), {
        cache: "no-store",
      });
      if (!response.ok) {
        return false;
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const locationPanelTemplate = doc.getElementById("locationPanel");
      const prayerPanelTemplate = doc.getElementById("prayerPanel");
      if (!locationPanelTemplate || !prayerPanelTemplate) {
        return false;
      }

      popupPrayerLocationPanelRoot = locationPanelTemplate.cloneNode(true);
      popupPrayerLocationPanelRoot.classList.add("active");
      popupPrayerLocationPanelHost.replaceChildren(
        popupPrayerLocationPanelRoot,
      );

      popupPrayerMethodPanelRoot = prayerPanelTemplate.cloneNode(true);
      popupPrayerMethodPanelRoot.classList.add("active");
      popupPrayerMethodPanelHost.replaceChildren(popupPrayerMethodPanelRoot);

      bindPopupPrayerLocationPanelEvents(popupPrayerLocationPanelRoot);
      bindPopupPrayerMethodPanelEvents(popupPrayerMethodPanelRoot);
      popupPrayerSettingsPanelsLoaded = true;

      try {
        iconThemes.applyIconTheme();
      } catch (error) {
        console.warn(
          "Could not apply icon theme to popup settings panel:",
          error,
        );
      }

      return true;
    } catch (error) {
      console.warn(
        "Could not load dashboard settings panels for popup:",
        error,
      );
      return false;
    }
  }

  function fillPopupPrayerLocationSettings(settings = storage.getSettings()) {
    const panelRoot = popupPrayerLocationPanelRoot;
    if (!(panelRoot instanceof Element)) return;

    const locationMethod =
      settings?.locationMethod === "manual" ? "manual" : "auto";
    const locationRadio = panelRoot.querySelector(
      `input[name="locationMethod"][value="${locationMethod}"]`,
    );

    if (locationRadio instanceof HTMLInputElement) {
      locationRadio.checked = true;
    }

    const cityInput = getPopupPanelElement(panelRoot, "#cityInput");
    if (cityInput instanceof HTMLInputElement) {
      cityInput.value = String(settings?.city || "");
    }

    const latitudeInput = getPopupPanelElement(panelRoot, "#latitudeInput");
    if (latitudeInput instanceof HTMLInputElement) {
      latitudeInput.value = formatPopupCoordinateValue(settings?.latitude);
    }

    const longitudeInput = getPopupPanelElement(panelRoot, "#longitudeInput");
    if (longitudeInput instanceof HTMLInputElement) {
      longitudeInput.value = formatPopupCoordinateValue(settings?.longitude);
    }

    togglePopupManualLocation(panelRoot, locationMethod === "manual");
    updatePopupDetectedLocationText(panelRoot);
    clearPopupCitySearchResults(
      getPopupPanelElement(panelRoot, "#citySearchResults"),
    );
    setPopupPrayerSettingsStatus(popupPrayerLocationStatus, "");
  }

  function fillPopupPrayerMethodSettings(settings = storage.getSettings()) {
    const panelRoot = popupPrayerMethodPanelRoot;
    if (!(panelRoot instanceof Element)) return;

    const setInputValue = (id, value, fallback = "") => {
      const element = getPopupPanelElement(panelRoot, `#${id}`);
      if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement
      ) {
        element.value = String(value ?? fallback);
      }
    };

    setInputValue(
      "calculationMethod",
      settings.calculationMethod || "MWL",
      "MWL",
    );
    setInputValue("asrMethod", settings.asrMethod || "Standard", "Standard");
    setInputValue("highLatMethod", settings.highLatMethod || "None", "None");
    setInputValue(
      "midnightMethod",
      settings.midnightMethod || "Standard",
      "Standard",
    );
    setInputValue("duhaOffset", settings.duhaOffset || 20, 20);
    setInputValue("customFajrAngle", settings.customFajrAngle || 18, 18);
    setInputValue("customIshaAngle", settings.customIshaAngle || 17, 17);

    const customIshaMinutes = getPopupPanelElement(
      panelRoot,
      "#customIshaMinutes",
    );
    if (customIshaMinutes instanceof HTMLInputElement) {
      customIshaMinutes.checked = settings.customIshaMinutes === true;
    }

    const prayerVisibility =
      settings.prayerVisibility && typeof settings.prayerVisibility === "object"
        ? settings.prayerVisibility
        : {};
    const adjustments =
      settings.adjustments && typeof settings.adjustments === "object"
        ? settings.adjustments
        : {};

    popupPrayerKeys.forEach((key) => {
      const suffix = popupPrayerIdSuffixByKey[key];
      if (!suffix) return;

      const showInput = getPopupPanelElement(panelRoot, `#show${suffix}`);
      if (showInput instanceof HTMLInputElement) {
        showInput.checked = prayerVisibility[key] !== false;
      }

      const adjustInput = getPopupPanelElement(panelRoot, `#adjust${suffix}`);
      if (adjustInput instanceof HTMLInputElement) {
        adjustInput.value = String(parseInt(adjustments[key], 10) || 0);
      }
    });

    const prayerNotifications =
      settings.prayerNotifications &&
      typeof settings.prayerNotifications === "object"
        ? settings.prayerNotifications
        : {};

    const enablePrayerNotifications = getPopupPanelElement(
      panelRoot,
      "#enablePrayerNotifications",
    );
    if (enablePrayerNotifications instanceof HTMLInputElement) {
      enablePrayerNotifications.checked = prayerNotifications.enabled === true;
    }

    const defaultBeforeMinutes = clampNumber(
      parseInt(prayerNotifications.beforeMinutes, 10),
      0,
      180,
      10,
    );
    const defaultAfterMinutes = clampNumber(
      parseInt(prayerNotifications.afterMinutes, 10),
      0,
      180,
      0,
    );

    const perPrayerRaw =
      prayerNotifications.perPrayer &&
      typeof prayerNotifications.perPrayer === "object"
        ? prayerNotifications.perPrayer
        : null;

    popupPrayerKeys.forEach((key) => {
      const suffix = popupPrayerIdSuffixByKey[key];
      if (!suffix) return;

      const entry = perPrayerRaw ? perPrayerRaw[key] : null;
      const enabled =
        entry && typeof entry === "object"
          ? entry.enabled === true
          : typeof entry === "boolean"
            ? entry === true
            : prayerVisibility[key] === true;

      const notifyInput = getPopupPanelElement(panelRoot, `#notify${suffix}`);
      if (notifyInput instanceof HTMLInputElement) {
        notifyInput.checked = enabled;
      }

      const beforeInput = getPopupPanelElement(
        panelRoot,
        `#notify${suffix}BeforeMinutes`,
      );
      if (beforeInput instanceof HTMLInputElement) {
        const beforeMinutes =
          entry && typeof entry === "object"
            ? clampNumber(
                parseInt(entry.beforeMinutes, 10),
                0,
                180,
                defaultBeforeMinutes,
              )
            : defaultBeforeMinutes;
        beforeInput.value = String(beforeMinutes);
      }

      const afterInput = getPopupPanelElement(
        panelRoot,
        `#notify${suffix}AfterMinutes`,
      );
      if (afterInput instanceof HTMLInputElement) {
        const afterMinutes =
          entry && typeof entry === "object"
            ? clampNumber(
                parseInt(entry.afterMinutes, 10),
                0,
                180,
                defaultAfterMinutes,
              )
            : defaultAfterMinutes;
        afterInput.value = String(afterMinutes);
      }
    });

    updatePopupPrayerMethodAnglesDisplay(panelRoot);
    setPopupPrayerSettingsStatus(popupPrayerMethodStatus, "");
  }

  function applyPopupPrayerLocationSettings(options = {}) {
    const panelRoot = popupPrayerLocationPanelRoot;
    if (!(panelRoot instanceof Element)) return;
    const showValidationErrors = options.showValidationErrors === true;

    const settings = storage.getSettings();
    const selectedLocationMethod = panelRoot.querySelector(
      'input[name="locationMethod"]:checked',
    );
    const locationMethod =
      selectedLocationMethod instanceof HTMLInputElement
        ? selectedLocationMethod.value
        : "auto";

    const cityInput = getPopupPanelElement(panelRoot, "#cityInput");
    const latitudeInput = getPopupPanelElement(panelRoot, "#latitudeInput");
    const longitudeInput = getPopupPanelElement(panelRoot, "#longitudeInput");

    const city = String(cityInput?.value || "").trim();
    const parsedLatitude = parseFloat(latitudeInput?.value);
    const parsedLongitude = parseFloat(longitudeInput?.value);

    settings.locationMethod = locationMethod === "manual" ? "manual" : "auto";
    settings.city = city;
    settings.latitude = Number.isFinite(parsedLatitude) ? parsedLatitude : null;
    settings.longitude = Number.isFinite(parsedLongitude)
      ? parsedLongitude
      : null;

    if (settings.locationMethod === "manual") {
      if (
        !Number.isFinite(settings.latitude) ||
        settings.latitude < -90 ||
        settings.latitude > 90
      ) {
        if (showValidationErrors) {
          setPopupPrayerSettingsStatus(
            popupPrayerLocationStatus,
            "Latitude must be between -90 and 90.",
            true,
          );
          latitudeInput?.focus();
        }
        return;
      }

      if (
        !Number.isFinite(settings.longitude) ||
        settings.longitude < -180 ||
        settings.longitude > 180
      ) {
        if (showValidationErrors) {
          setPopupPrayerSettingsStatus(
            popupPrayerLocationStatus,
            "Longitude must be between -180 and 180.",
            true,
          );
          longitudeInput?.focus();
        }
        return;
      }

      if (!settings.city) {
        settings.city = "Custom Location";
      }

      storage.saveLastLocation({
        latitude: settings.latitude,
        longitude: settings.longitude,
        city: settings.city,
      });
    }

    storage.saveSettings(settings);
    setPopupPrayerSettingsStatus(popupPrayerLocationStatus, "Location saved.");
    void refreshPopupState();
  }

  async function requestPopupPrayerCurrentLocation(panelRoot) {
    if (!(panelRoot instanceof Element)) return;

    const requestLocationButton = getPopupPanelElement(
      panelRoot,
      "#requestLocationBtn",
    );
    const refreshLocationButton = getPopupPanelElement(
      panelRoot,
      "#refreshLocationBtn",
    );

    setPopupPrayerSettingsStatus(
      popupPrayerLocationStatus,
      "Requesting current location...",
      false,
    );

    if (requestLocationButton instanceof HTMLButtonElement) {
      requestLocationButton.disabled = true;
    }
    if (refreshLocationButton instanceof HTMLButtonElement) {
      refreshLocationButton.disabled = true;
    }

    try {
      await ensurePrayerManagerInitialized();
      await prayerTimes.requestLocation();
      updatePopupDetectedLocationText(panelRoot);
      setPopupPrayerSettingsStatus(
        popupPrayerLocationStatus,
        "Location updated.",
        false,
      );
      void refreshPopupState();
    } catch (error) {
      console.warn("Popup location request failed:", error);
      setPopupPrayerSettingsStatus(
        popupPrayerLocationStatus,
        "Could not refresh location.",
        true,
      );
    } finally {
      if (requestLocationButton instanceof HTMLButtonElement) {
        requestLocationButton.disabled = false;
      }
      if (refreshLocationButton instanceof HTMLButtonElement) {
        refreshLocationButton.disabled = false;
      }
    }
  }

  function applyPopupPrayerMethodSettings() {
    const panelRoot = popupPrayerMethodPanelRoot;
    if (!(panelRoot instanceof Element)) return;

    const settings = storage.getSettings();

    const calculationMethod = getPopupPanelElement(
      panelRoot,
      "#calculationMethod",
    );
    const asrMethod = getPopupPanelElement(panelRoot, "#asrMethod");
    const highLatMethod = getPopupPanelElement(panelRoot, "#highLatMethod");
    const midnightMethod = getPopupPanelElement(panelRoot, "#midnightMethod");
    const duhaOffset = getPopupPanelElement(panelRoot, "#duhaOffset");
    const customFajrAngle = getPopupPanelElement(panelRoot, "#customFajrAngle");
    const customIshaAngle = getPopupPanelElement(panelRoot, "#customIshaAngle");
    const customIshaMinutes = getPopupPanelElement(
      panelRoot,
      "#customIshaMinutes",
    );
    const enablePrayerNotifications = getPopupPanelElement(
      panelRoot,
      "#enablePrayerNotifications",
    );

    settings.calculationMethod =
      String(calculationMethod?.value || "").trim() || "MWL";
    settings.asrMethod = String(asrMethod?.value || "").trim() || "Standard";
    settings.highLatMethod =
      String(highLatMethod?.value || "").trim() || "None";
    settings.midnightMethod =
      String(midnightMethod?.value || "").trim() || "Standard";
    settings.duhaOffset = clampNumber(
      parseInt(duhaOffset?.value, 10),
      10,
      60,
      20,
    );
    settings.customFajrAngle = clampNumber(
      parseFloat(customFajrAngle?.value),
      10,
      25,
      18,
    );
    settings.customIshaAngle = clampNumber(
      parseFloat(customIshaAngle?.value),
      10,
      25,
      17,
    );
    settings.customIshaMinutes =
      customIshaMinutes instanceof HTMLInputElement &&
      customIshaMinutes.checked === true;

    settings.prayerVisibility = {};
    settings.adjustments = {};

    popupPrayerKeys.forEach((key) => {
      const suffix = popupPrayerIdSuffixByKey[key];
      if (!suffix) return;

      const showInput = getPopupPanelElement(panelRoot, `#show${suffix}`);
      settings.prayerVisibility[key] =
        showInput instanceof HTMLInputElement && showInput.checked === true;

      const adjustInput = getPopupPanelElement(panelRoot, `#adjust${suffix}`);
      settings.adjustments[key] =
        clampNumber(parseInt(adjustInput?.value, 10), -60, 60, 0) || 0;
    });

    settings.prayerNotifications = settings.prayerNotifications || {};
    settings.prayerNotifications.enabled =
      enablePrayerNotifications instanceof HTMLInputElement &&
      enablePrayerNotifications.checked === true;

    const existingBeforeMinutes = clampNumber(
      parseInt(settings.prayerNotifications.beforeMinutes, 10),
      0,
      180,
      10,
    );
    const existingAfterMinutes = clampNumber(
      parseInt(settings.prayerNotifications.afterMinutes, 10),
      0,
      180,
      0,
    );

    settings.prayerNotifications.beforeMinutes = existingBeforeMinutes;
    settings.prayerNotifications.afterMinutes = existingAfterMinutes;
    settings.prayerNotifications.perPrayer = {};

    popupPrayerKeys.forEach((key) => {
      const suffix = popupPrayerIdSuffixByKey[key];
      if (!suffix) return;

      const notifyInput = getPopupPanelElement(panelRoot, `#notify${suffix}`);
      const beforeInput = getPopupPanelElement(
        panelRoot,
        `#notify${suffix}BeforeMinutes`,
      );
      const afterInput = getPopupPanelElement(
        panelRoot,
        `#notify${suffix}AfterMinutes`,
      );

      settings.prayerNotifications.perPrayer[key] = {
        enabled:
          notifyInput instanceof HTMLInputElement &&
          notifyInput.checked === true,
        beforeMinutes: clampNumber(
          parseInt(beforeInput?.value, 10),
          0,
          180,
          existingBeforeMinutes,
        ),
        afterMinutes: clampNumber(
          parseInt(afterInput?.value, 10),
          0,
          180,
          existingAfterMinutes,
        ),
      };
    });

    storage.saveSettings(settings);
    setPopupPrayerSettingsStatus(
      popupPrayerMethodStatus,
      "Prayer settings saved.",
      false,
    );
    void refreshPopupState();
  }

  function closePopupPrayerSettingsPanel() {
    if (!popupPrayerSettingsPanel) return;

    if (popupPrayerLocationPanel) {
      popupPrayerLocationPanel.hidden = true;
    }
    if (popupPrayerMethodPanel) {
      popupPrayerMethodPanel.hidden = true;
    }

    popupPrayerSettingsPanel.hidden = true;
    updatePopupPrayerSettingsMode();
  }

  async function openPopupPrayerSettingsPanel(tabName) {
    const normalizedTab = normalizePopupPrayerSettingsTab(tabName);

    if (
      !popupPrayerSettingsPanel ||
      !popupPrayerLocationPanel ||
      !popupPrayerMethodPanel
    ) {
      console.warn("Popup prayer settings panel containers are missing.");
      return;
    }

    const loaded = await ensurePopupPrayerSettingsPanelsLoaded();
    if (!loaded) {
      const fallbackStatus =
        normalizedTab === "location"
          ? popupPrayerLocationStatus
          : popupPrayerMethodStatus;

      setPopupPrayerSettingsStatus(
        fallbackStatus,
        "Could not load settings panel.",
        true,
      );
      return;
    }

    const settings = storage.getSettings();

    if (normalizedTab === "location") {
      fillPopupPrayerLocationSettings(settings);
      popupPrayerLocationPanel.hidden = false;
      popupPrayerMethodPanel.hidden = true;
    } else {
      fillPopupPrayerMethodSettings(settings);
      popupPrayerMethodPanel.hidden = false;
      popupPrayerLocationPanel.hidden = true;
    }

    popupPrayerSettingsPanel.hidden = false;
    updatePopupPrayerSettingsMode();

    requestAnimationFrame(() => {
      const firstControl =
        normalizedTab === "location"
          ? popupPrayerLocationPanelRoot?.querySelector(
              'input[name="locationMethod"]',
            )
          : popupPrayerMethodPanelRoot?.querySelector("#calculationMethod");
      firstControl?.focus?.();
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

  function isPocketQuranTajweedAllowedForFont(fontFamily) {
    return normalizePocketQuranArabicFontFamily(fontFamily).startsWith(
      "KFGQPC ",
    );
  }

  function isPocketQuranPopupTajweedAllowed(settings = storage.getSettings()) {
    return isPocketQuranTajweedAllowedForFont(
      resolvePocketQuranPopupTypography(settings).arabicFontFamily,
    );
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

    if (normalizedTab !== "prayer") {
      closePopupPrayerSettingsPanel();
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

  function setupPopupPrayerSettingsPanel() {
    popupPrayerLocationPanelClose?.addEventListener("click", () => {
      closePopupPrayerSettingsPanel();
    });

    popupPrayerMethodPanelClose?.addEventListener("click", () => {
      closePopupPrayerSettingsPanel();
    });

    popupPrayerSettingsPanel?.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    document.addEventListener("click", (event) => {
      if (popupPrayerSettingsPanel?.hidden !== false) return;

      const target = getEventTargetElement(event.target);
      if (!target) return;

      const clickedInsidePanel = popupPrayerSettingsPanel.contains(target);
      const clickedLocationTrigger =
        openLocationSettingsIcon?.contains(target) === true;
      const clickedPrayerTrigger =
        openPrayerSettingsButton?.contains(target) === true;

      if (
        clickedInsidePanel ||
        clickedLocationTrigger ||
        clickedPrayerTrigger
      ) {
        return;
      }

      closePopupPrayerSettingsPanel();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (popupPrayerSettingsPanel?.hidden !== false) return;

      closePopupPrayerSettingsPanel();
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
    const isTajweedAllowed = isPocketQuranPopupTajweedAllowed(settings);
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
      isTajweedMode: pqSettings.tajweedMode === true && isTajweedAllowed,
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
    const isTajweedAllowed = isPocketQuranPopupTajweedAllowed(settings);

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
        isTajweedAllowed && typeof rawState.isTajweedMode === "boolean"
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

  function logPocketQuranFetchWarning(scope, error) {
    const message = error?.message || String(error);
    console.warn(`[Pocket Quran Popup] ${scope}: ${message}`);
  }

  async function parsePocketQuranJsonResponse(response, sourceLabel) {
    if (!response || !response.ok) {
      throw new Error(
        `${sourceLabel} request failed (HTTP ${response?.status || "unknown"}).`,
      );
    }

    let data;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error(`${sourceLabel} returned invalid JSON.`);
    }

    if (!data || typeof data !== "object") {
      throw new Error(`${sourceLabel} returned malformed payload.`);
    }

    if (data.error === true) {
      const reason =
        typeof data.reason === "string" && data.reason.trim()
          ? data.reason.trim()
          : `${sourceLabel} returned an API error.`;
      throw new Error(reason);
    }

    return data;
  }

  function normalizePocketQuranChapterEntries(entries) {
    return (Array.isArray(entries) ? entries : [])
      .map((chapter) => ({
        id: clampNumber(chapter?.id, 1, 114, 1),
        name_simple: String(chapter?.name_simple || "").trim(),
        name_arabic: String(chapter?.name_arabic || "").trim(),
        verses_count: clampNumber(chapter?.verses_count, 1, 286, 286),
      }))
      .filter((chapter) => chapter.name_simple || chapter.name_arabic)
      .sort((left, right) => left.id - right.id);
  }

  function normalizePocketQuranReciterEntries(entries) {
    return (Array.isArray(entries) ? entries : [])
      .map((reciter) => ({
        id: clampNumber(reciter?.id, 1, 10000, 7),
        name: String(
          reciter?.name ||
            reciter?.formattedName ||
            reciter?.translated_name?.name ||
            reciter?.reciter_name ||
            "",
        ).trim(),
        style: String(reciter?.style || "").trim(),
      }))
      .filter((reciter) => reciter.name);
  }

  async function ensurePocketQuranChaptersLoaded(forceFetch = false) {
    if (!forceFetch && pocketQuranChapters.length > 0)
      return pocketQuranChapters;

    const cached = storage.get("pocketQuran_chapters_cache", null);
    const cachedAt = storage.get("pocketQuran_chapters_cache_at", 0);
    const freshEnough = Date.now() - (cachedAt || 0) < 1000 * 60 * 60 * 24 * 7;
    const cachedChapters = normalizePocketQuranChapterEntries(cached);

    if (!forceFetch && freshEnough && cachedChapters.length > 0) {
      pocketQuranChapters = cachedChapters;
      return pocketQuranChapters;
    }

    try {
      const response = await fetch(
        `${pocketQuranApiBase}/chapters?language=en`,
      );
      const data = await parsePocketQuranJsonResponse(
        response,
        "Pocket Quran chapters",
      );
      const chapters = normalizePocketQuranChapterEntries(data?.chapters);
      if (!chapters.length) {
        throw new Error("Pocket Quran chapters payload contained no chapters.");
      }

      pocketQuranChapters = chapters;

      if (pocketQuranChapters.length > 0) {
        storage.set("pocketQuran_chapters_cache", pocketQuranChapters);
        storage.set("pocketQuran_chapters_cache_at", Date.now());
      }
    } catch (error) {
      logPocketQuranFetchWarning("load chapters failed", error);
      if (cachedChapters.length > 0) {
        pocketQuranChapters = cachedChapters;
      } else {
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
    const data = await parsePocketQuranJsonResponse(
      response,
      "Pocket Quran verses",
    );
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
    const data = await parsePocketQuranJsonResponse(
      response,
      "Pocket Quran tajweed verses",
    );
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
    const cachedReciters = normalizePocketQuranReciterEntries(cached);

    if (!forceFetch && cacheIsFresh && cachedReciters.length > 0) {
      pocketQuranReciters = cachedReciters;
      return pocketQuranReciters;
    }

    try {
      const response = await fetch(
        `${pocketQuranApiBase}/resources/recitations?language=en`,
      );
      const data = await parsePocketQuranJsonResponse(
        response,
        "Pocket Quran reciters",
      );
      pocketQuranReciters = normalizePocketQuranReciterEntries(
        data?.recitations,
      );
      if (!pocketQuranReciters.length) {
        throw new Error("Pocket Quran reciters payload contained no reciters.");
      }

      if (pocketQuranReciters.length > 0) {
        storage.set("pocketQuran_reciters_cache", pocketQuranReciters);
        storage.set("pocketQuran_reciters_cache_at", Date.now());
      }
    } catch (error) {
      logPocketQuranFetchWarning("load reciters failed", error);
      if (cachedReciters.length > 0) {
        pocketQuranReciters = cachedReciters;
      } else {
        pocketQuranReciters = [];
      }
    }

    return pocketQuranReciters;
  }

  function normalizePocketQuranTranslationEntry(entry) {
    const id = clampNumber(entry?.id, 1, 10000, NaN);
    if (!Number.isFinite(id)) return null;

    if (pocketQuranFallbackTranslations[id]) {
      return {
        id,
        ...pocketQuranFallbackTranslations[id],
      };
    }

    const language = String(
      entry?.language_name ||
        entry?.language ||
        entry?.translated_name?.language_name ||
        "Other",
    ).trim();

    const baseName = String(
      entry?.name ||
        entry?.translated_name?.name ||
        entry?.title ||
        entry?.text ||
        "",
    ).trim();
    const author = String(
      entry?.author_name ||
        entry?.author ||
        entry?.translated_name?.name ||
        entry?.writer ||
        "",
    ).trim();

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
    const cachedTranslations = Array.isArray(cached)
      ? cached
          .map((entry) => normalizePocketQuranTranslationEntry(entry))
          .filter(Boolean)
          .sort((left, right) => {
            const langOrder = left.language.localeCompare(right.language);
            if (langOrder !== 0) return langOrder;
            return left.label.localeCompare(right.label);
          })
      : [];

    if (!forceFetch && cacheIsFresh && cachedTranslations.length > 0) {
      pocketQuranTranslations = cachedTranslations;
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

        const data = await parsePocketQuranJsonResponse(
          response,
          "Pocket Quran translations",
        );
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
      logPocketQuranFetchWarning("load translations failed", error);
      if (cachedTranslations.length > 0) {
        pocketQuranTranslations = cachedTranslations;
      }
    }

    if (!pocketQuranTranslations.length) {
      pocketQuranTranslations = Object.values(pocketQuranFallbackTranslations);
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
    const isTajweedMode =
      isPocketQuranPopupTajweedAllowed(storage.getSettings()) &&
      pocketQuranState.isTajweedMode === true;
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

    const isTajweedAllowed = isPocketQuranPopupTajweedAllowed(
      storage.getSettings(),
    );
    popupPqMiniTajweedToggle?.classList.toggle(
      "active",
      isTajweedAllowed && pocketQuranState.isTajweedMode === true,
    );
    popupPqMiniTajweedToggle?.setAttribute(
      "aria-pressed",
      isTajweedAllowed && pocketQuranState.isTajweedMode === true
        ? "true"
        : "false",
    );
    if (popupPqMiniTajweedToggle) {
      popupPqMiniTajweedToggle.disabled = !isTajweedAllowed;
      popupPqMiniTajweedToggle.setAttribute(
        "aria-disabled",
        isTajweedAllowed ? "false" : "true",
      );
      popupPqMiniTajweedToggle.title = isTajweedAllowed
        ? "Toggle Tajweed color-coded Arabic text"
        : "Tajweed disabled for this font";
    }

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
    const data = await parsePocketQuranJsonResponse(
      response,
      "Pocket Quran audio",
    );
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
        const desiredIsPlaying =
          typeof payload.desiredIsPlaying === "boolean"
            ? payload.desiredIsPlaying
            : state.isPlaying === true;
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
          if (desiredIsPlaying) {
            await playPocketQuranAyahLocally(targetSurah, targetAyah);
          } else {
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
            persistPocketQuranSettingsPatch({
              lastSurahNumber: targetSurah,
              lastAyahNumber: targetAyah,
            });
          }
        }
        break;
      }

      case pocketQuranCommandTypes.playNextAyah: {
        const desiredIsPlaying =
          typeof payload.desiredIsPlaying === "boolean"
            ? payload.desiredIsPlaying
            : state.isPlaying === true;
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
          if (desiredIsPlaying) {
            await playPocketQuranAyahLocally(targetSurah, targetAyah);
          } else {
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
            persistPocketQuranSettingsPatch({
              lastSurahNumber: targetSurah,
              lastAyahNumber: targetAyah,
            });
          }
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
        const isTajweedAllowed = isPocketQuranPopupTajweedAllowed(
          storage.getSettings(),
        );
        const nextTajweedMode =
          isTajweedAllowed && typeof payload.desiredIsTajweedMode === "boolean"
            ? payload.desiredIsTajweedMode
            : isTajweedAllowed && !(state.isTajweedMode === true);

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

  function buildPocketQuranCommand(action, payload = {}) {
    return {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
      action,
      payload,
      issuedAt: Date.now(),
    };
  }

  function writePocketQuranCommand(command) {
    if (!command || typeof command !== "object") return;

    const issuedAt = Number(command.issuedAt);
    if (Number.isFinite(issuedAt)) {
      pocketQuranPendingCommandIssuedAt = Math.max(
        pocketQuranPendingCommandIssuedAt,
        issuedAt,
      );
    }

    storage.set(pocketQuranPopupCommandKey, command);
  }

  function isDashboardPocketQuranAckState(rawState, command) {
    if (!rawState || typeof rawState !== "object") return false;
    if (rawState.source !== pocketQuranStateSourceDashboard) return false;

    const updatedAt = Number(rawState.updatedAt);
    const issuedAt = Number(command?.issuedAt);
    const controllerInteractionAt = Number(rawState.controllerInteractionAt);

    if (
      !Number.isFinite(updatedAt) ||
      !Number.isFinite(issuedAt) ||
      !Number.isFinite(controllerInteractionAt)
    ) {
      return false;
    }

    if (controllerInteractionAt <= 0) {
      return false;
    }

    return updatedAt >= issuedAt;
  }

  async function waitForDashboardPocketQuranCommandAck(
    command,
    timeoutMs = 900,
  ) {
    if (!command || typeof command !== "object") return false;

    const stateStorageEventKey = `${storage.prefix}${pocketQuranPopupStateKey}`;
    const currentState = storage.get(pocketQuranPopupStateKey, null);
    if (isDashboardPocketQuranAckState(currentState, command)) {
      return true;
    }

    return await new Promise((resolve) => {
      let settled = false;

      const finish = (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        window.removeEventListener("storage", onStorage);
        resolve(result);
      };

      const onStorage = (event) => {
        if (!event || event.key !== stateStorageEventKey || !event.newValue) {
          return;
        }

        let parsed = null;
        try {
          parsed = JSON.parse(event.newValue);
        } catch (error) {
          return;
        }

        if (isDashboardPocketQuranAckState(parsed, command)) {
          finish(true);
        }
      };

      const timeoutId = setTimeout(
        () => {
          finish(false);
        },
        Math.max(150, timeoutMs),
      );

      window.addEventListener("storage", onStorage);

      // Close the race between adding the listener and timeout setup.
      const latestState = storage.get(pocketQuranPopupStateKey, null);
      if (isDashboardPocketQuranAckState(latestState, command)) {
        finish(true);
      }
    });
  }

  async function hasDashboardPocketQuranController() {
    if (typeof chrome === "undefined") return false;
    let hasDetectionCapability = false;

    try {
      if (typeof chrome.runtime?.getContexts === "function") {
        const contexts = await chrome.runtime.getContexts({
          contextTypes: ["TAB"],
        });
        hasDetectionCapability = true;
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
        const views = chrome.extension.getViews();
        hasDetectionCapability = true;
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
      return null;
    }

    return false;
  }

  function hasRecentDashboardPocketQuranState() {
    const rawState = storage.get(pocketQuranPopupStateKey, null);
    if (!rawState || typeof rawState !== "object") {
      return false;
    }

    if (rawState.source !== pocketQuranStateSourceDashboard) {
      return false;
    }

    const controllerInteractionAt = Number(rawState.controllerInteractionAt);
    if (!Number.isFinite(controllerInteractionAt)) {
      return false;
    }

    if (controllerInteractionAt <= 0) {
      return false;
    }

    const referenceAt = controllerInteractionAt;

    pocketQuranLastDashboardStateAt = Math.max(
      pocketQuranLastDashboardStateAt,
      referenceAt,
    );

    return true;
  }

  function doesPocketQuranCommandRequireOffscreenPlayback(command) {
    if (!command || typeof command !== "object") return false;

    const action = String(command.action || "").trim();
    const payload =
      command.payload && typeof command.payload === "object"
        ? command.payload
        : {};
    const state =
      pocketQuranState || buildPocketQuranFallbackState(storage.getSettings());

    switch (action) {
      case pocketQuranCommandTypes.togglePlayPause:
        if (typeof payload.desiredIsPlaying === "boolean") {
          return payload.desiredIsPlaying;
        }
        return state.isPlaying !== true;

      case pocketQuranCommandTypes.playPreviousAyah:
      case pocketQuranCommandTypes.playNextAyah:
        if (typeof payload.desiredIsPlaying === "boolean") {
          return payload.desiredIsPlaying;
        }
        return state.isPlaying === true;

      case pocketQuranCommandTypes.selectAyah:
      case pocketQuranCommandTypes.selectReciter:
        return state.isPlaying === true;

      case pocketQuranCommandTypes.toggleAutoplay: {
        const desiredAutoplay =
          typeof payload.desiredIsAutoplay === "boolean"
            ? payload.desiredIsAutoplay
            : !(state.isAutoplay === true);
        return desiredAutoplay && state.isPlaying !== true;
      }

      default:
        return false;
    }
  }

  async function dispatchPocketQuranCommandToOffscreen(command) {
    if (!command || typeof command !== "object") {
      return { ok: false, error: "invalid-command" };
    }
    if (typeof chrome === "undefined") {
      return { ok: false, error: "chrome-unavailable" };
    }
    if (typeof chrome.runtime?.sendMessage !== "function") {
      return { ok: false, error: "runtime-sendMessage-unavailable" };
    }

    const playbackRequired =
      doesPocketQuranCommandRequireOffscreenPlayback(command);

    return await new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(
          {
            type: "md_pq_offscreen_execute",
            command,
          },
          (response) => {
            const runtimeError = chrome.runtime?.lastError;
            if (runtimeError) {
              resolve({
                ok: false,
                playbackRequired,
                error: runtimeError.message || String(runtimeError),
              });
              return;
            }

            const responseObject =
              response && typeof response === "object"
                ? response
                : { ok: false };
            const playbackSatisfied =
              !playbackRequired ||
              responseObject.skippedDueToDashboardOwner === true ||
              responseObject.state?.isPlaying === true;

            resolve({
              ...responseObject,
              ok: responseObject.ok === true && playbackSatisfied,
              playbackRequired,
              ...(playbackSatisfied
                ? {}
                : { error: "offscreen-playback-not-active" }),
            });
          },
        );
      } catch (error) {
        resolve({
          ok: false,
          playbackRequired,
          error: error?.message || String(error),
        });
      }
    });
  }

  function stopPocketQuranOffscreenPlaybackBestEffort() {
    if (typeof chrome === "undefined") return;
    if (typeof chrome.runtime?.sendMessage !== "function") return;

    try {
      chrome.runtime.sendMessage({ type: "md_pq_offscreen_stop" }, () => {
        // no-op
      });
    } catch (error) {
      // no-op
    }
  }

  async function dispatchPocketQuranCommandWithFallback(command) {
    const recentDashboardState = hasRecentDashboardPocketQuranState();
    let dashboardAvailability = false;

    if (recentDashboardState) {
      dashboardAvailability = await hasDashboardPocketQuranController();
    }

    const shouldAttemptDashboardAck =
      recentDashboardState && dashboardAvailability !== false;

    if (shouldAttemptDashboardAck) {
      const ackWaitMs = dashboardAvailability === null ? 1100 : 700;
      const dashboardAcknowledged = await waitForDashboardPocketQuranCommandAck(
        command,
        ackWaitMs,
      );

      if (dashboardAcknowledged) {
        pocketQuranPendingCommandIssuedAt = 0;
        stopPocketQuranOffscreenPlaybackBestEffort();
        if (pocketQuranLocalPlaybackActive) {
          deactivatePocketQuranLocalPlayback({ publishStoppedState: false });
        }
        return;
      }
    }

    const offscreenResult =
      await dispatchPocketQuranCommandToOffscreen(command);
    const offscreenHandled = offscreenResult?.ok === true;

    if (offscreenHandled) {
      pocketQuranPendingCommandIssuedAt = 0;
      if (pocketQuranLocalPlaybackActive) {
        deactivatePocketQuranLocalPlayback({ publishStoppedState: false });
      }
      return;
    }

    pocketQuranPendingCommandIssuedAt = 0;
    stopPocketQuranOffscreenPlaybackBestEffort();
    queuePocketQuranLocalCommand(command);
  }

  function sendPocketQuranCommand(action, payload = {}) {
    const command = buildPocketQuranCommand(action, payload);

    writePocketQuranCommand(command);
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
    const rawUpdatedAt = Number(rawState?.updatedAt);

    if (
      stateSource === pocketQuranStateSourceDashboard &&
      Number.isFinite(rawUpdatedAt) &&
      rawUpdatedAt < pocketQuranPendingCommandIssuedAt
    ) {
      return;
    }

    if (stateSource === pocketQuranStateSourceDashboard) {
      pocketQuranLastDashboardStateAt = Number.isFinite(rawUpdatedAt)
        ? Math.max(pocketQuranLastDashboardStateAt, rawUpdatedAt)
        : Date.now();
    }

    if (
      stateSource === pocketQuranStateSourceDashboard ||
      stateSource === pocketQuranStateSourceOffscreen
    ) {
      if (
        Number.isFinite(rawUpdatedAt) &&
        rawUpdatedAt >= pocketQuranPendingCommandIssuedAt
      ) {
        pocketQuranPendingCommandIssuedAt = 0;
      }

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
      if (!isPocketQuranTajweedAllowedForFont(selectedFont)) {
        persistPocketQuranSettingsPatch({ tajweedMode: false });
        pocketQuranState = normalizePocketQuranState(
          {
            ...(pocketQuranState ||
              buildPocketQuranFallbackState(storage.getSettings())),
            isTajweedMode: false,
          },
          storage.getSettings(),
        );
        sendPocketQuranCommand(pocketQuranCommandTypes.toggleTajweed, {
          desiredIsTajweedMode: false,
        });
      }
      applyPocketQuranPopupTypography(storage.getSettings());
      renderPocketQuranControls();
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
        desiredIsPlaying: pocketQuranState?.isPlaying === true,
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
        desiredIsPlaying: pocketQuranState?.isPlaying === true,
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
      const isTajweedAllowed = isPocketQuranPopupTajweedAllowed(
        storage.getSettings(),
      );
      const nextTajweedMode =
        isTajweedAllowed && !(pocketQuranState?.isTajweedMode === true);
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

    if (!isPrayerVisible) {
      closePopupPrayerSettingsPanel();
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
  setupPopupPrayerSettingsPanel();
  setupPocketQuranControls();
  setupPocketQuranSelectors();
  setupPopupBlurModal();

  bindShortcut(openDashboardButton, () => openDashboardSettingsTab("prayer"));
  bindShortcut(openLocationSettingsIcon, () =>
    openPopupPrayerSettingsPanel("location"),
  );
  bindShortcut(openPrayerSettingsButton, () =>
    openPopupPrayerSettingsPanel("prayer"),
  );

  window.addEventListener("storage", handleStorageChange);

  if (typeof chrome !== "undefined" && chrome.storage?.onChanged?.addListener) {
    chrome.storage.onChanged.addListener(handleChromeStorageChange);
  }

  window.addEventListener("beforeunload", () => {
    stopSoftResync();
    clearPocketQuranResyncTimers();
    deactivatePocketQuranLocalPlayback({
      publishStoppedState: pocketQuranLocalPlaybackActive,
    });
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

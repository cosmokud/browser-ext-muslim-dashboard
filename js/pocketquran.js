/**
 * Pocket Quran Manager
 * Full-width Quran reader with Surah selector, Ayah navigation, and per-language translations.
 * Data source: https://api.quran.com (public API v4)
 *
 * Features a high-performance virtualized infinite scroll that renders only
 * ~20 ayahs at a time while maintaining smooth scrolling and stable positions.
 *
 * Bookmark system: Supports multiple bookmark categories with full CRUD operations.
 */

class PocketQuranCacheManager {
  static DB_NAME = "MuslimDashboardPocketQuranCache";
  static DB_VERSION = 1;
  static JSON_STORE = "json";
  static AUDIO_STORE = "audio";

  constructor() {
    this.db = null;
    this.dbReady = this._initDB();
  }

  async _initDB() {
    if (!("indexedDB" in window)) {
      throw new Error("IndexedDB not available");
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(
        PocketQuranCacheManager.DB_NAME,
        PocketQuranCacheManager.DB_VERSION,
      );

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(PocketQuranCacheManager.JSON_STORE)) {
          const store = db.createObjectStore(
            PocketQuranCacheManager.JSON_STORE,
            {
              keyPath: "key",
            },
          );
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("type", "type", { unique: false });
        }

        if (
          !db.objectStoreNames.contains(PocketQuranCacheManager.AUDIO_STORE)
        ) {
          const store = db.createObjectStore(
            PocketQuranCacheManager.AUDIO_STORE,
            { keyPath: "key" },
          );
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("reciterId", "reciterId", { unique: false });
          store.createIndex("surah", "surah", { unique: false });
        }
      };
    });
  }

  async _ensureDB() {
    if (!this.db) await this.dbReady;
    return this.db;
  }

  isCacheableJsonUrl(url) {
    const raw = String(url || "");
    if (!/^https?:\/\//i.test(raw)) return false;
    if (!raw.includes("api.quran.com/api/v4")) return false;

    return (
      raw.includes("/chapters") ||
      raw.includes("/verses/by_chapter/") ||
      raw.includes("/quran/verses/uthmani_tajweed") ||
      raw.includes("/resources/recitations") ||
      raw.includes("/recitations/") ||
      raw.includes("/chapter_recitations/")
    );
  }

  async getJson(url) {
    try {
      const db = await this._ensureDB();
      const key = String(url || "");
      return await new Promise((resolve) => {
        const tx = db.transaction(
          PocketQuranCacheManager.JSON_STORE,
          "readonly",
        );
        const store = tx.objectStore(PocketQuranCacheManager.JSON_STORE);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result?.data ?? null);
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  }

  async setJson(url, data, type = "json") {
    try {
      const db = await this._ensureDB();
      const key = String(url || "");
      const record = { key, url: key, type, data, timestamp: Date.now() };
      return await new Promise((resolve) => {
        const tx = db.transaction(
          PocketQuranCacheManager.JSON_STORE,
          "readwrite",
        );
        const store = tx.objectStore(PocketQuranCacheManager.JSON_STORE);
        const req = store.put(record);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch (e) {
      return false;
    }
  }

  async getAudio(key) {
    try {
      const db = await this._ensureDB();
      const k = String(key || "");
      return await new Promise((resolve) => {
        const tx = db.transaction(
          PocketQuranCacheManager.AUDIO_STORE,
          "readonly",
        );
        const store = tx.objectStore(PocketQuranCacheManager.AUDIO_STORE);
        const req = store.get(k);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  }

  async setAudio(record) {
    try {
      const db = await this._ensureDB();
      const rec = {
        ...record,
        key: String(record?.key || ""),
        timestamp: Date.now(),
      };

      return await new Promise((resolve) => {
        const tx = db.transaction(
          PocketQuranCacheManager.AUDIO_STORE,
          "readwrite",
        );
        const store = tx.objectStore(PocketQuranCacheManager.AUDIO_STORE);
        const req = store.put(rec);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch (e) {
      return false;
    }
  }
}

class PocketQuranManager extends BaseManager {
  static API_BASE = "https://api.quran.com/api/v4";
  static TAJWEED_API_BASE =
    "https://api.quran.com/api/v4/quran/verses/uthmani_tajweed";

  // Tajweed CSS class mapping from API class names to our CSS classes
  static TAJWEED_CLASS_MAP = {
    ham_wasl: "ham_wasl",
    slnt: "slnt",
    laam_shamsiyah: "laam_shamsiyah",
    madda_normal: "madda_normal",
    madda_permissible: "madda_permissible",
    madda_necessary: "madda_necessary",
    qlq: "qlq",
    madda_obligatory: "madda_obligatory",
    ikhf_shfw: "ikhf_shfw",
    ikhf: "ikhf",
    idghm_shfw: "idghm_shfw",
    iqlb: "iqlb",
    idgh_ghn: "idgh_ghn",
    idgh_w_ghn: "idgh_w_ghn",
    idgh_mus: "idgh_mus",
    ghn: "ghn",
  };

  static ARABIC_FONT_FAMILIES = [
    "Noto Naskh Arabic",
    "Amiri",
    "KFGQPC Uthman Taha Naskh",
    "KFGQPC KSA Regular",
    "KFGQPC Kufi Stylistic Regular",
    "KFGQPC AN Regular",
    "KFGQPC AlJalil Dot",
    "KFGQPC Sindhi Naskh Regular",
  ];

  static DEFAULT_TAJWEED_COLORS = {
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
  };

  // All translations available from the Quran.com API, organized by language.
  // Source: https://api.quran.com/api/v4/resources/translations
  static TRANSLATIONS = {
    // Albanian
    88: { label: "Hasan Efendi Nahi", language: "Albanian" },
    47: { label: "Albanian", language: "Albanian" },
    89: { label: "Albanian Translation (Sherif Ahmeti)", language: "Albanian" },

    // Amazigh
    236: { label: "Ramdane At Mansour", language: "Amazigh" },

    // Amharic
    87: { label: "Sadiq and Sani", language: "Amharic" },

    // Assamese
    120: {
      label: "Shaykh Rafeequl Islam Habibur-Rahman",
      language: "Assamese",
    },

    // Azeri
    75: { label: "Alikhan Musayev", language: "Azeri" },
    23: { label: "Azerbaijani", language: "Azeri" },

    // Bambara
    795: { label: "Suliman Kanti", language: "Bambara" },
    796: { label: "Baba Mamady Jani", language: "Bambara" },

    // Bengali
    161: { label: "Taisirul Quran", language: "Bengali" },
    163: { label: "Sheikh Mujibur Rahman", language: "Bengali" },
    162: { label: "Rawai Al-bayan", language: "Bengali" },
    213: { label: "Dr. Abu Bakr Muhammad Zakaria", language: "Bengali" },

    // Bosnian
    214: { label: "Dar Al-Salam Center", language: "Bosnian" },
    25: { label: "Muhamed Mehanović", language: "Bosnian" },
    126: { label: "Besim Korkut", language: "Bosnian" },

    // Bulgarian
    237: { label: "Tzvetan Theophanov", language: "Bulgarian" },

    // Central Khmer
    128: {
      label: "Cambodian Muslim Community Development",
      language: "Central Khmer",
    },

    // Chechen
    106: { label: "Magomed Magomedov", language: "Chechen" },

    // Chinese
    56: {
      label: "Chinese Translation (Simplified) - Ma Jian",
      language: "Chinese",
    },
    109: { label: "Muhammad Makin", language: "Chinese" },

    // Czech
    26: { label: "Czech", language: "Czech" },

    // Dari
    785: { label: "Mawlawi Muhammad Anwar Badkhashani", language: "Dari" },

    // Divehi (Maldivian)
    86: { label: "Office of the President of Maldives", language: "Divehi" },
    840: { label: "Abu Bakr Ibrahim Ali (Bakurube)", language: "Divehi" },

    // Dutch
    235: { label: "Malak Faris Abdalsalaam", language: "Dutch" },
    144: { label: "Sofian S. Siregar", language: "Dutch" },

    // English
    85: { label: "M.A.S. Abdel Haleem", language: "English" },
    149: { label: "Fadel Soliman, Bridges' translation", language: "English" },
    84: { label: "T. Usmani", language: "English" },
    95: { label: "A. Maududi (Tafhim commentary)", language: "English" },
    19: { label: "M. Pickthall", language: "English" },
    22: { label: "A. Yusuf Ali", language: "English" },
    20: { label: "Saheeh International", language: "English" },
    203: { label: "Al-Hilali & Khan", language: "English" },
    57: { label: "Transliteration", language: "English" },

    // Finnish
    30: { label: "Finnish", language: "Finnish" },

    // French
    136: { label: "Montada Islamic Foundation", language: "French" },
    31: { label: "Muhammad Hamidullah", language: "French" },
    779: { label: "Rashid Maash", language: "French" },

    // Ganda (Luganda)
    232: { label: "African Development Foundation", language: "Ganda" },

    // German
    208: { label: "Abu Reda Muhammad ibn Ahmad", language: "German" },
    27: { label: "Frank Bubenheim and Nadeem", language: "German" },

    // Gujarati
    225: { label: "Rabila Al-Umry", language: "Gujarati" },

    // Hausa
    32: { label: "Hausa Translation (Abubakar Gumi)", language: "Hausa" },
    115: { label: "Abubakar Mahmood Jummi", language: "Hausa" },

    // Hebrew
    233: { label: "Dar Al-Salam Center", language: "Hebrew" },

    // Hindi
    122: { label: "Maulana Azizul Haque al-Umari", language: "Hindi" },

    // Indonesian
    134: { label: "King Fahad Quran Complex", language: "Indonesian" },
    141: { label: "The Sabiq Company", language: "Indonesian" },
    33: {
      label: "Indonesian Islamic Affairs Ministry",
      language: "Indonesian",
    },

    // Italian
    153: { label: "Hamza Roberto Piccardo", language: "Italian" },
    209: { label: "Othman al-Sharif", language: "Italian" },

    // Japanese
    35: { label: "Ryoichi Mita", language: "Japanese" },
    218: { label: "Saeed Sato", language: "Japanese" },

    // Kannada
    771: { label: "Kannada Translation", language: "Kannada" },

    // Kazakh
    222: { label: "Khalifa Altay", language: "Kazakh" },
    113: { label: "Khalifah Altai", language: "Kazakh" },

    // Kinyarwanda
    774: {
      label: "The Rwanda Muslims Association team",
      language: "Kinyarwanda",
    },

    // Korean
    36: { label: "Korean", language: "Korean" },
    219: { label: "Hamed Choi", language: "Korean" },

    // Kurdish
    81: { label: "Burhan Muhammad-Amin", language: "Kurdish" },
    143: { label: "Muhammad Saleh Bamoki", language: "Kurdish" },

    // Malay
    39: { label: "Abdullah Muhammad Basmeih", language: "Malay" },

    // Malayalam
    80: {
      label: "Muhammad Karakunnu and Vanidas Elayavoor",
      language: "Malayalam",
    },
    224: {
      label: "Abdul-Hamid Haidar & Kanhi Muhammad",
      language: "Malayalam",
    },
    37: {
      label: "Malayalam Translation (Abdul Hameed and Kunhi)",
      language: "Malayalam",
    },

    // Maranao
    38: { label: "Maranao", language: "Maranao" },

    // Marathi
    226: { label: "Muhammad Shafi'i Ansari", language: "Marathi" },

    // Nepali
    108: {
      label: "Ahl Al-Hadith Central Society of Nepal",
      language: "Nepali",
    },

    // Norwegian
    41: { label: "Norwegian", language: "Norwegian" },

    // Oromo
    111: { label: "Ghali Apapur Apaghuna", language: "Oromo" },

    // Pashto
    118: { label: "Zakaria Abulsalam", language: "Pashto" },

    // Persian
    135: { label: "IslamHouse.com", language: "Persian" },
    29: { label: "Hussein Taji Kal Dari", language: "Persian" },

    // Polish
    42: { label: "Józef Bielawski", language: "Polish" },

    // Portuguese
    103: { label: "Helmi Nasr", language: "Portuguese" },
    43: { label: "Portuguese Translation (Samir)", language: "Portuguese" },

    // Romanian
    44: { label: "Grigore", language: "Romanian" },
    782: { label: "Islamic and Cultural League", language: "Romanian" },

    // Russian
    78: { label: "Ministry of Awqaf, Egypt", language: "Russian" },
    79: { label: "Abu Adel", language: "Russian" },
    45: { label: "Russian Translation (Elmir Kuliev)", language: "Russian" },

    // Sindhi
    238: { label: "Taj Mehmood Amroti", language: "Sindhi" },

    // Sinhala
    228: { label: "Ruwwad Center", language: "Sinhala" },

    // Somali
    46: { label: "Mahmud Muhammad Abduh", language: "Somali" },

    // Spanish
    83: { label: "Sheikh Isa Garcia", language: "Spanish" },
    140: { label: "Montada Islamic Foundation", language: "Spanish" },
    199: { label: "Noor International Center", language: "Spanish" },

    // Swahili
    231: {
      label: "Dr. Abdullah Muhammad Abu Bakr and Sheikh Nasir Khamis",
      language: "Swahili",
    },
    49: { label: "Ali Muhsin Al-Barwani", language: "Swahili" },

    // Swedish
    48: { label: "Knut Bernström", language: "Swedish" },

    // Tagalog
    211: { label: "Dar Al-Salam Center", language: "Tagalog" },

    // Tajik
    139: { label: "Khawaja Mirof & Khawaja Mir", language: "Tajik" },
    74: { label: "Tajik (AbdolMohammad Ayati)", language: "Tajik" },
    223: { label: "Pioneers of Translation Center", language: "Tajik" },

    // Tamil
    229: { label: "Sheikh Omar Sharif bin Abdul Salam", language: "Tamil" },
    50: { label: "Jan Trust Foundation", language: "Tamil" },
    133: { label: "Abdul Hameed Baqavi", language: "Tamil" },

    // Tatar
    53: { label: "Tatar", language: "Tatar" },

    // Telugu
    227: { label: "Maulana Abder-Rahim ibn Muhammad", language: "Telugu" },

    // Thai
    230: { label: "Society of Institutes and Universities", language: "Thai" },
    51: {
      label: "Thai Translation (King Fahad Quran Complex)",
      language: "Thai",
    },

    // Turkish
    210: { label: "Dar Al-Salam Center", language: "Turkish" },
    77: { label: "Turkish Translation (Diyanet)", language: "Turkish" },
    124: { label: "Muslim Shahin", language: "Turkish" },
    112: { label: "Shaban Britch", language: "Turkish" },
    52: { label: "Elmalili Hamdi Yazir", language: "Turkish" },

    // Uighur (Uyghur)
    76: { label: "Muhammad Saleh", language: "Uighur" },

    // Ukrainian
    217: { label: "Dr. Mikhailo Yaqubovic", language: "Ukrainian" },

    // Urdu
    234: { label: "Fatah Muhammad Jalandhari", language: "Urdu" },
    54: { label: "Maulana Muhammad Junagarhi", language: "Urdu" },
    156: { label: "Fe Zilal al-Qur'an (Sayyid Qutb)", language: "Urdu" },
    151: {
      label: "Shaykh al-Hind Mahmud al-Hasan (with Tafsir E Usmani)",
      language: "Urdu",
    },
    158: { label: "Bayan-ul-Quran (Dr. Israr Ahmad)", language: "Urdu" },
    97: { label: "Tafheem e Qur'an - Syed Abu Ali Maududi", language: "Urdu" },
    831: { label: "Abul Ala Maududi (Roman Urdu)", language: "Urdu" },
    819: { label: "Maulana Wahiduddin Khan", language: "Urdu" },

    // Uzbek
    55: { label: "Muhammad Sodiq Muhammad Yusuf (Latin)", language: "Uzbek" },
    101: { label: "Alauddin Mansour", language: "Uzbek" },
    127: { label: "Muhammad Sodik Muhammad Yusuf", language: "Uzbek" },

    // Vietnamese
    220: { label: "Ruwwad Center", language: "Vietnamese" },
    221: { label: "Hasan Abdul-Karim", language: "Vietnamese" },

    // Yau/Yuw
    798: { label: "Abdul Hamid Silika", language: "Yau" },

    // Yoruba
    125: { label: "Shaykh Abu Rahimah Mikael Aykyuni", language: "Yoruba" },
  };

  // Virtualization constants
  static VISIBLE_AYAH_COUNT = 20; // Max ayahs rendered at once
  static ESTIMATED_AYAH_HEIGHT = 180; // Initial estimate, recalculated dynamically
  static BUFFER_AYAHS = 3; // Extra ayahs above/below viewport
  static SCROLL_THROTTLE_MS = 16; // ~60fps throttle

  // How many pixels of an ayah should be visible before we consider it "active".
  // Increasing this makes the active-ayah detection less "tight".
  static ACTIVE_AYAH_VISIBILITY_PX = 48;

  // Vertical offset applied while auto-scrolling during recitation playback (in px).
  // A small negative offset (e.g., -10px) nudges the view so the playing ayah sits
  // slightly lower for better readability during recitation.
  static RECITATION_AUTOSCROLL_OFFSET_PX = 10;

  // Bookmark constants
  static BOOKMARKS_PER_PAGE = 10;
  static CATEGORIES_PER_PAGE = 10;

  constructor(storage) {
    super();
    this.storage = storage;

    // DOM references
    this.card = document.getElementById("pocketQuranCard");
    this.headerMeta = document.getElementById("pocketQuranHeaderMeta");
    this.surahCombobox = document.getElementById("pocketQuranSurahCombobox");
    this.surahInput = document.getElementById("pocketQuranSurahInput");
    this.surahDropdown = document.getElementById("pocketQuranSurahDropdown");
    this.surahListEl = document.getElementById("pocketQuranSurahList");
    this.surahPrevBtn = document.getElementById("pocketQuranSurahPrev");
    this.surahNextBtn = document.getElementById("pocketQuranSurahNext");
    this.contentEl = document.getElementById("pocketQuranContent");
    this.ayahPrevBtn = document.getElementById("pocketQuranAyahPrev");
    this.ayahNextBtn = document.getElementById("pocketQuranAyahNext");
    this.ayahCombobox = document.getElementById("pocketQuranAyahCombobox");
    this.ayahInput = document.getElementById("pocketQuranAyahInput");
    this.ayahDropdown = document.getElementById("pocketQuranAyahDropdown");
    this.ayahListEl = document.getElementById("pocketQuranAyahList");
    this.arabicSizeRange = document.getElementById(
      "pocketQuranArabicSizeRange",
    );
    this.arabicSizeValue = document.getElementById(
      "pocketQuranArabicSizeValue",
    );
    this.translationSizeRange = document.getElementById(
      "pocketQuranTranslationSizeRange",
    );
    this.translationSizeValue = document.getElementById(
      "pocketQuranTranslationSizeValue",
    );
    this.arabicSizeDecreaseBtn = document.getElementById(
      "pocketQuranArabicSizeDecreaseBtn",
    );
    this.arabicSizeIncreaseBtn = document.getElementById(
      "pocketQuranArabicSizeIncreaseBtn",
    );
    this.translationSizeDecreaseBtn = document.getElementById(
      "pocketQuranTranslationSizeDecreaseBtn",
    );
    this.translationSizeIncreaseBtn = document.getElementById(
      "pocketQuranTranslationSizeIncreaseBtn",
    );
    this.tajweedToggleBtn = document.getElementById("pocketQuranTajweedToggle");

    this.fontToggleBtn = document.getElementById("pocketQuranFontToggle");

    if (!this.card || !this.surahListEl || !this.contentEl) {
      return;
    }

    // Persistent caches (IndexedDB). Best-effort: continue without it.
    this._pqCache = null;
    try {
      this._pqCache = new PocketQuranCacheManager();
    } catch (e) {
      this._pqCache = null;
    }

    // State
    this._chapters = [];
    this._activeSurah = 1;
    this._activeAyah = 1;
    this._activeTranslationId = 85;
    this._fetchController = null;
    this._scrollHighlightTimer = null;
    this._ayahJumpTimer = null;
    this._surahQuery = "";

    // Tajweed mode state
    this._isTajweedMode = false;
    this._tajweedVersesCache = new Map();

    // Arabic font state
    this._arabicFontFamily = "KFGQPC Uthman Taha Naskh";

    // Font picker modal
    this._fontModal = null;

    // Verse caching
    this._versesCache = new Map();
    this._activeVerses = null;

    // Virtualization state
    this._virtualContainer = null;
    this._virtualSpacer = null;
    this._virtualContent = null;
    this._ayahHeights = new Map(); // Measured heights per ayah
    this._avgAyahHeight = PocketQuranManager.ESTIMATED_AYAH_HEIGHT;
    this._renderedRange = { start: 0, end: 0 };
    this._scrollRAF = null;
    this._isScrolling = false;
    this._lastScrollTop = 0;
    this._scrollDirection = "down";
    this._resizeObserver = null;

    // Dropdown portal state
    this._dropdownPortalled = new WeakSet();
    this._dropdownPositionRaf = null;

    // Bookmark system state
    this._bookmarkModal = null;
    this._bookmarkCategoryModal = null;
    this._bookmarkCurrentPage = 1;
    this._bookmarkCategoryPage = 1;
    this._bookmarkSearchQuery = "";
    this._bookmarkCategorySearchQuery = "";
    this._selectedCategoryId = null;
    this._pendingBookmarkAyah = null;

    // Programmatic scroll lock (prevents scroll handler from overriding active ayah)
    this._programmaticScroll = null;

    // Timer for restoring scroll-behavior after manual seeks
    this._restoreScrollBehaviorTimer = null;

    // Navigation debounce flags
    this._navProcessing = false;

    // Recitation system state
    this._reciters = [];
    this._activeReciterId = null;
    this._audioElement = null;
    this._isPlaying = false;
    this._isAutoplay = false;
    this._isAutoScroll = false;
    this._isLooping = false;
    this._isSurahLooping = false;
    this._volume = 1;
    this._playingAyah = null;
    this._reciterModal = null;
    this._headerControlsBox = null;
    this._recitationFloatingEnabled = true;
    this._recitationAutoDockOnVisible = true;
    this._recitationFloatingAppearance = "opaque";
    this._recitationFloatingMode = false;
    this._recitationFloatingModeReason = null;
    this._recitationFloatingManualOnly = false;
    this._recitationVisibilityObserver = null;
    this._recitationAutoDockObserver = null;
    this._recitationAutoDockAwaitingReturn = false;
    this._recitationFloatingPosition = null;
    this._recitationFloatingDrag = null;

    this._popupSyncStateKey = "pocketQuran_popupState";
    this._popupSyncCommandKey = "pocketQuran_popupCommand";
    this._lastPopupCommandId = null;
    this._onPopupCommandStorage = (event) => {
      this.handlePopupCommandStorageEvent(event);
    };

    this.init();

    window.addEventListener("storage", this._onPopupCommandStorage);

    document.addEventListener("md:settings-applied", (event) => {
      this.handleSettingsApplied(event?.detail?.settings);
    });

    window.addEventListener("resize", () => {
      if (this._recitationFloatingMode) {
        this.positionRecitationFloatingPanel();
      }
    });

    // Listen for icon theme changes
    document.addEventListener("md:icon-theme-change", () => {
      if (this._bookmarkModal && document.body.contains(this._bookmarkModal)) {
        this.renderBookmarkModal();
      }
    });
  }

  init() {
    const pq = this.storage.getSettings()?.pocketQuran || {};

    this._activeSurah = this.clampNumber(pq.lastSurahNumber, 1, 114, 1);
    this._activeAyah = this.clampNumber(pq.lastAyahNumber, 1, 286, 1);
    this._activeTranslationId = this.normalizeTranslationId(
      pq.translationResourceId,
    );

    const arabicFontSize = this.clampNumber(pq.arabicFontSize, 8, 144, 40);
    const translationFontSize = this.clampNumber(
      pq.translationFontSize,
      8,
      144,
      18,
    );

    this.applyFontSizes(arabicFontSize, translationFontSize, {
      syncInputs: true,
      persist: false,
    });

    // Initialize Arabic font family from settings
    this.applyArabicFontFamily(pq.arabicFontFamily, {
      persist: false,
      recalculate: false,
    });

    // Initialize Tajweed colors from settings
    this.applyTajweedColors(pq.tajweedColors, { persist: false });

    // Initialize Tajweed mode from settings
    this._isTajweedMode = Boolean(pq.tajweedMode);
    this.updateTajweedToggleUI();

    // Ensure Tajweed availability matches the selected font
    this.syncTajweedAvailabilityForFont();

    // Initialize bookmark system
    this.ensureDefaultBookmarkCategory();
    this.createBookmarkButton();
    this.createBookmarkModals();
    this.createTranslationModal();
    this.createFontPickerModal();

    // Initialize recitation system
    this.initRecitationSystem();

    this.setupEventListeners();

    this.renderLoading("Loading Surah list…");
    this.loadChaptersAndRenderSurahPicker().then(() => {
      this.setActiveSurah(this._activeSurah, {
        preserveAyah: true,
        autoScroll: true,
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════

  setupEventListeners() {
    const stopSmoothScrollForManualSeek = () => {
      if (!this._virtualContainer) return;

      // Cancel any in-flight smooth scroll immediately.
      if (this._restoreScrollBehaviorTimer) {
        clearTimeout(this._restoreScrollBehaviorTimer);
      }
      this._virtualContainer.style.scrollBehavior = "auto";

      // Restore quickly so other scrolls can still animate.
      this._restoreScrollBehaviorTimer = setTimeout(() => {
        if (!this._virtualContainer) return;
        this._virtualContainer.style.scrollBehavior = "";
      }, 120);
    };

    // Surah selection (event delegation)
    this.surahListEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-surah]");
      if (!btn) return;
      const surah = parseInt(btn.dataset.surah, 10);
      if (!Number.isFinite(surah)) return;
      this._surahQuery = "";
      this.setActiveSurah(surah, { preserveAyah: false });
      this.updateSurahInputValue({ force: true });
      this.closeDropdown(this.surahDropdown);
    });

    const openSurahDropdown = () => {
      if (!this.surahDropdown) return;
      this.renderSurahList();
      this.openDropdown(this.surahDropdown);
      // Scroll to active surah after dropdown is visible
      requestAnimationFrame(() => {
        this.scrollSurahDropdownToActive();
      });
    };

    if (this.surahInput) {
      this.surahInput.addEventListener("focus", () => {
        this._surahQuery = "";
        try {
          this.surahInput.select();
        } catch (e) {}
        openSurahDropdown();
      });
      this.surahInput.addEventListener("click", () => {
        this._surahQuery = "";
        openSurahDropdown();
      });
      this.surahInput.addEventListener("input", () => {
        this._surahQuery = this.surahInput.value || "";
        openSurahDropdown();
      });
      this.surahInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          this.closeDropdown(this.surahDropdown);
          return;
        }
        if (e.key !== "Enter") return;
        e.preventDefault();
        const match = this.findSurahFromQuery(this.surahInput.value);
        if (!match) return;
        this._surahQuery = "";
        this.setActiveSurah(match.id, { preserveAyah: false });
        this.updateSurahInputValue({ force: true });
        this.closeDropdown(this.surahDropdown);
      });
    }

    // Ayah list click
    this.ayahListEl?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-ayah]");
      if (!btn) return;
      const n = this.clampNumber(
        parseInt(btn.dataset.ayah, 10),
        1,
        this.getActiveSurahAyahCount() || 286,
        1,
      );
      if (this.ayahInput) this.ayahInput.value = String(n);
      this.scrollToAyah(n, { persist: true });
      this.closeDropdown(this.ayahDropdown);
    });

    const openAyahDropdown = () => {
      if (!this.ayahDropdown) return;
      this.openDropdown(this.ayahDropdown);
      // Use requestAnimationFrame to ensure the dropdown is visible before scrolling
      requestAnimationFrame(() => {
        this.updateAyahDropdownActiveState();
      });
    };

    const jumpToAyahFromInput = () => {
      const n = this.clampNumber(
        parseInt(this.ayahInput?.value, 10),
        1,
        this.getActiveSurahAyahCount() || 286,
        1,
      );
      if (this.ayahInput) this.ayahInput.value = String(n);
      this.scrollToAyah(n, { persist: true });
    };

    if (this.ayahInput) {
      this.ayahInput.addEventListener("focus", openAyahDropdown);
      this.ayahInput.addEventListener("click", openAyahDropdown);
      this.ayahInput.addEventListener("input", () => {
        if (this._ayahJumpTimer) clearTimeout(this._ayahJumpTimer);
        this._ayahJumpTimer = setTimeout(() => jumpToAyahFromInput(), 250);
      });
      this.ayahInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          this.closeDropdown(this.ayahDropdown);
          return;
        }
        if (e.key !== "Enter") return;
        e.preventDefault();
        if (this._ayahJumpTimer) clearTimeout(this._ayahJumpTimer);
        jumpToAyahFromInput();
        this.closeDropdown(this.ayahDropdown);
      });
      this.ayahInput.addEventListener("change", () => {
        if (this._ayahJumpTimer) clearTimeout(this._ayahJumpTimer);
        jumpToAyahFromInput();
      });
    }

    if (this.ayahPrevBtn) {
      this.ayahPrevBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this._navProcessing) return;
        this._navProcessing = true;

        stopSmoothScrollForManualSeek();

        const max = this.getActiveSurahAyahCount() || 286;
        const current =
          document.activeElement === this.ayahInput
            ? this.clampNumber(parseInt(this.ayahInput?.value, 10), 1, max, 1)
            : this.clampNumber(this._activeAyah, 1, max, 1);
        const next = this.clampNumber(current - 1, 1, max, 1);
        if (this.ayahInput) this.ayahInput.value = String(next);
        this.scrollToAyah(next, { persist: true, smooth: false });

        setTimeout(() => {
          this._navProcessing = false;
        }, 100);
      });
    }

    if (this.ayahNextBtn) {
      this.ayahNextBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this._navProcessing) return;
        this._navProcessing = true;

        stopSmoothScrollForManualSeek();

        const max = this.getActiveSurahAyahCount() || 286;
        const current =
          document.activeElement === this.ayahInput
            ? this.clampNumber(parseInt(this.ayahInput?.value, 10), 1, max, 1)
            : this.clampNumber(this._activeAyah, 1, max, 1);
        const next = this.clampNumber(current + 1, 1, max, max);
        if (this.ayahInput) this.ayahInput.value = String(next);
        this.scrollToAyah(next, { persist: true, smooth: false });

        setTimeout(() => {
          this._navProcessing = false;
        }, 100);
      });
    }

    // Surah navigation buttons
    if (this.surahPrevBtn) {
      this.surahPrevBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this._navProcessing) return;
        this._navProcessing = true;

        const current = this.clampNumber(this._activeSurah, 1, 114, 1);
        const next = this.clampNumber(current - 1, 1, 114, 1);

        if (next !== current) {
          this._surahQuery = "";
          this.setActiveSurah(next, { preserveAyah: false });
          this.updateSurahInputValue({ force: true });
        }

        setTimeout(() => {
          this._navProcessing = false;
        }, 100);
      });
    }

    if (this.surahNextBtn) {
      this.surahNextBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this._navProcessing) return;
        this._navProcessing = true;

        const current = this.clampNumber(this._activeSurah, 1, 114, 1);
        const next = this.clampNumber(current + 1, 1, 114, 114);

        if (next !== current) {
          this._surahQuery = "";
          this.setActiveSurah(next, { preserveAyah: false });
          this.updateSurahInputValue({ force: true });
        }

        setTimeout(() => {
          this._navProcessing = false;
        }, 100);
      });
    }

    const adjustSizeRangeByStep = (rangeEl, direction) => {
      if (!rangeEl) return;

      const stepRaw = parseFloat(rangeEl.step);
      const step = Number.isFinite(stepRaw) && stepRaw > 0 ? stepRaw : 1;
      const min = this.clampNumber(parseFloat(rangeEl.min), 0, 10000, 8);
      const max = this.clampNumber(parseFloat(rangeEl.max), min, 10000, 144);
      const current = this.clampNumber(
        parseFloat(rangeEl.value),
        min,
        max,
        min,
      );
      const next = this.clampNumber(
        current + direction * step,
        min,
        max,
        current,
      );

      if (Math.abs(next - current) < 0.0001) return;

      rangeEl.value = String(next);
      rangeEl.dispatchEvent(new Event("input", { bubbles: true }));
      rangeEl.dispatchEvent(new Event("change", { bubbles: true }));
    };

    // Font size controls
    if (this.arabicSizeRange) {
      this.arabicSizeRange.addEventListener("input", () => {
        const a = this.clampNumber(
          parseInt(this.arabicSizeRange.value, 10),
          8,
          144,
          32,
        );
        const t = this.clampNumber(
          parseInt(this.translationSizeRange?.value, 10),
          8,
          144,
          18,
        );
        this.applyFontSizes(a, t, { syncInputs: true, persist: false });
        // Invalidate height cache when font size changes
        this._ayahHeights.clear();
        this.recalculateVirtualization();
      });
      this.arabicSizeRange.addEventListener("change", () => {
        this.persistPocketQuranSettings({
          arabicFontSize: this.clampNumber(
            parseInt(this.arabicSizeRange.value, 10),
            8,
            144,
            40,
          ),
        });
      });
    }

    if (this.translationSizeRange) {
      this.translationSizeRange.addEventListener("input", () => {
        const a = this.clampNumber(
          parseInt(this.arabicSizeRange?.value, 10),
          8,
          144,
          40,
        );
        const t = this.clampNumber(
          parseInt(this.translationSizeRange.value, 10),
          8,
          144,
          18,
        );
        this.applyFontSizes(a, t, { syncInputs: true, persist: false });
        // Invalidate height cache when font size changes
        this._ayahHeights.clear();
        this.recalculateVirtualization();
      });
      this.translationSizeRange.addEventListener("change", () => {
        this.persistPocketQuranSettings({
          translationFontSize: this.clampNumber(
            parseInt(this.translationSizeRange.value, 10),
            8,
            144,
            18,
          ),
        });
      });
    }

    if (this.arabicSizeDecreaseBtn) {
      this.arabicSizeDecreaseBtn.addEventListener("click", () => {
        adjustSizeRangeByStep(this.arabicSizeRange, -1);
      });
    }

    if (this.arabicSizeIncreaseBtn) {
      this.arabicSizeIncreaseBtn.addEventListener("click", () => {
        adjustSizeRangeByStep(this.arabicSizeRange, 1);
      });
    }

    if (this.translationSizeDecreaseBtn) {
      this.translationSizeDecreaseBtn.addEventListener("click", () => {
        adjustSizeRangeByStep(this.translationSizeRange, -1);
      });
    }

    if (this.translationSizeIncreaseBtn) {
      this.translationSizeIncreaseBtn.addEventListener("click", () => {
        adjustSizeRangeByStep(this.translationSizeRange, 1);
      });
    }

    // Tajweed toggle button
    if (this.tajweedToggleBtn) {
      this.tajweedToggleBtn.addEventListener("click", () => {
        this.toggleTajweedMode();
      });
    }

    // Arabic font toggle button
    if (this.fontToggleBtn) {
      this.fontToggleBtn.addEventListener("click", () => {
        this.openFontPickerModal();
      });
    }

    // Close dropdowns when clicking outside
    document.addEventListener("click", (e) => {
      const t = e.target;
      const inSurahDropdown =
        this.surahDropdown &&
        (this.surahDropdown === t || this.surahDropdown.contains(t));
      const inAyahDropdown =
        this.ayahDropdown &&
        (this.ayahDropdown === t || this.ayahDropdown.contains(t));

      if (
        this.surahCombobox &&
        !this.surahCombobox.contains(t) &&
        !inSurahDropdown
      ) {
        this.closeDropdown(this.surahDropdown);
      }
      if (
        this.ayahCombobox &&
        !this.ayahCombobox.contains(t) &&
        !inAyahDropdown
      ) {
        this.closeDropdown(this.ayahDropdown);
      }
    });

    // Reposition dropdowns on scroll/resize
    const reposition = () => {
      if (this._dropdownPositionRaf)
        cancelAnimationFrame(this._dropdownPositionRaf);
      this._dropdownPositionRaf = requestAnimationFrame(() => {
        this.positionDropdown(this.surahDropdown);
        this.positionDropdown(this.ayahDropdown);
      });
    };

    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);

    // Blur update events
    document.addEventListener("md:card-blur-update", (e) => {
      const cardId = e?.detail?.cardId;
      if (cardId && cardId !== "pocketQuranCard") return;
      this.syncDropdownBlurMultiplier(this.surahDropdown);
      this.syncDropdownBlurMultiplier(this.ayahDropdown);
    });

    document.addEventListener("md:ui-blur-update", () => {
      this.syncDropdownBlurMultiplier(this.surahDropdown);
      this.syncDropdownBlurMultiplier(this.ayahDropdown);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIRTUALIZATION ENGINE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize the virtualized scroll container.
   * Creates a structure with:
   * - A fixed-height scroll container (CSS handles responsive breakpoints)
   * - A spacer div that sets total scrollable height
   * - An absolutely positioned content div for rendered ayahs
   * Note: In Quran Focus Mode, CSS overrides make the container fill available height
   */
  initVirtualization() {
    if (!this.contentEl || !this._activeVerses?.length) return;

    // Clear previous content
    this.contentEl.innerHTML = "";
    this._ayahHeights.clear();
    this._renderedRange = { start: 0, end: 0 };

    // Create virtual scroll container (CSS handles height - fixed in normal mode, flex in focus mode)
    this._virtualContainer = document.createElement("div");
    this._virtualContainer.className = "pq-virtual-container";

    // Create spacer that determines total scroll height
    this._virtualSpacer = document.createElement("div");
    this._virtualSpacer.className = "pq-virtual-spacer";
    this._virtualSpacer.style.cssText = `
      position: relative;
      width: 100%;
      pointer-events: none;
    `;

    // Create content container for rendered ayahs
    this._virtualContent = document.createElement("div");
    this._virtualContent.className = "pq-virtual-content";
    this._virtualContent.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    `;

    this._virtualSpacer.appendChild(this._virtualContent);
    this._virtualContainer.appendChild(this._virtualSpacer);
    this.contentEl.appendChild(this._virtualContainer);

    // Calculate initial total height
    this.updateTotalHeight();

    // Attach scroll listener with throttling
    this._virtualContainer.addEventListener(
      "scroll",
      this.handleVirtualScroll.bind(this),
      { passive: true },
    );

    // If the user starts interacting, cancel any programmatic scroll lock
    const cancelProgrammaticScroll = () => {
      this._programmaticScroll = null;
    };
    this._virtualContainer.addEventListener("wheel", cancelProgrammaticScroll, {
      passive: true,
    });
    this._virtualContainer.addEventListener(
      "touchstart",
      cancelProgrammaticScroll,
      { passive: true },
    );
    this._virtualContainer.addEventListener(
      "pointerdown",
      cancelProgrammaticScroll,
      { passive: true },
    );

    // Observe container resize
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    this._resizeObserver = new ResizeObserver(() => {
      this.recalculateVirtualization();
    });
    this._resizeObserver.observe(this._virtualContainer);

    // Initial render
    this.renderVisibleAyahs(0);
  }

  /**
   * Calculate the total scrollable height based on estimated/measured ayah heights.
   */
  updateTotalHeight() {
    if (!this._virtualSpacer || !this._activeVerses?.length) return;

    let totalHeight = 0;
    const total = this._activeVerses.length;
    const gap = 16; // var(--spacing-md) ≈ 16px

    for (let i = 0; i < total; i++) {
      const measuredHeight = this._ayahHeights.get(i);
      totalHeight += (measuredHeight ?? this._avgAyahHeight) + gap;
    }

    this._virtualSpacer.style.height = `${totalHeight}px`;
  }

  /**
   * Get the scroll offset for a specific ayah index.
   */
  getAyahOffset(index) {
    let offset = 0;
    const gap = 16;

    for (let i = 0; i < index; i++) {
      const height = this._ayahHeights.get(i) ?? this._avgAyahHeight;
      offset += height + gap;
    }

    return offset;
  }

  /**
   * Find which ayah index is at a given scroll offset.
   */
  getAyahAtOffset(scrollTop) {
    if (!this._activeVerses?.length) return 0;

    let offset = 0;
    const gap = 16;
    const total = this._activeVerses.length;

    for (let i = 0; i < total; i++) {
      const height = this._ayahHeights.get(i) ?? this._avgAyahHeight;
      if (offset + height + gap > scrollTop) {
        return i;
      }
      offset += height + gap;
    }

    return total - 1;
  }

  /**
   * Find the first rendered ayah that is meaningfully visible in the viewport.
   * This uses DOM geometry (more accurate than height estimates), and applies
   * a visibility threshold so we don't count an ayah that's basically gone.
   */
  getFirstVisibleRenderedAyahIndex() {
    if (!this._virtualContainer || !this._virtualContent) return null;

    const containerRect = this._virtualContainer.getBoundingClientRect();
    const threshold = PocketQuranManager.ACTIVE_AYAH_VISIBILITY_PX;
    const minBottom = containerRect.top + threshold;

    const ayahEls = this._virtualContent.querySelectorAll(
      ".pocket-quran-ayah[data-index]",
    );

    for (const el of ayahEls) {
      const rect = el.getBoundingClientRect();
      if (rect.bottom <= minBottom) continue;
      const index = parseInt(el.dataset.index, 10);
      if (Number.isFinite(index)) return index;
    }

    return null;
  }

  /**
   * Handle scroll events with RAF throttling.
   */
  handleVirtualScroll() {
    if (this._scrollRAF) return;

    this._scrollRAF = requestAnimationFrame(() => {
      this._scrollRAF = null;

      if (!this._virtualContainer) return;

      const scrollTop = this._virtualContainer.scrollTop;

      // Track scroll direction
      this._scrollDirection = scrollTop > this._lastScrollTop ? "down" : "up";
      this._lastScrollTop = scrollTop;

      // Find the ayah at current scroll position
      const firstVisibleIndex = this.getAyahAtOffset(scrollTop);

      // Calculate visible range with buffer
      const buffer = PocketQuranManager.BUFFER_AYAHS;
      const visibleCount = PocketQuranManager.VISIBLE_AYAH_COUNT;
      const total = this._activeVerses?.length || 0;

      const start = Math.max(0, firstVisibleIndex - buffer);
      const end = Math.min(
        total - 1,
        firstVisibleIndex + visibleCount + buffer,
      );

      // Only re-render if range changed significantly
      if (
        start !== this._renderedRange.start ||
        end !== this._renderedRange.end
      ) {
        this.renderVisibleAyahs(start, end);
      }

      // During programmatic smooth scroll, keep the active ayah pinned so
      // nav buttons don't read a scroll-updated value mid-animation.
      if (this._programmaticScroll) {
        const now =
          typeof performance !== "undefined" && performance.now
            ? performance.now()
            : Date.now();
        const { targetOffset, targetAyah, startedAt } =
          this._programmaticScroll;

        const delta = Math.abs(scrollTop - targetOffset);
        const timedOut = now - startedAt > 2000;

        // Always pin UI to the requested ayah while the lock exists, and do
        // not fall through to scroll-derived updates in the same RAF tick.
        this._activeAyah = targetAyah;
        if (this.ayahInput && document.activeElement !== this.ayahInput) {
          this.ayahInput.value = String(targetAyah);
        }
        this.updateAyahDropdownActiveState();

        if (delta < 2 || timedOut) {
          this._programmaticScroll = null;
        }
        return;
      }

      // Update active ayah for UI
      const domVisibleIndex = this.getFirstVisibleRenderedAyahIndex();
      const activeIndex = Number.isFinite(domVisibleIndex)
        ? domVisibleIndex
        : firstVisibleIndex;

      this._activeAyah = activeIndex + 1;
      if (this.ayahInput && document.activeElement !== this.ayahInput) {
        this.ayahInput.value = String(this._activeAyah);
      }
      this.updateAyahDropdownActiveState();
    });
  }

  /**
   * Render only the visible ayahs within the given range.
   */
  renderVisibleAyahs(start, end) {
    if (!this._virtualContent || !this._activeVerses?.length) return;

    const total = this._activeVerses.length;
    start = Math.max(0, start ?? 0);
    end = Math.min(
      total - 1,
      end ?? start + PocketQuranManager.VISIBLE_AYAH_COUNT - 1,
    );

    // Skip if same range
    if (
      start === this._renderedRange.start &&
      end === this._renderedRange.end
    ) {
      return;
    }

    this._renderedRange = { start, end };

    // Calculate top offset for positioning
    const topOffset = this.getAyahOffset(start);
    this._virtualContent.style.transform = `translateY(${topOffset}px)`;

    // Build fragment for new ayahs
    const fragment = document.createDocumentFragment();

    for (let i = start; i <= end; i++) {
      const verse = this._activeVerses[i];
      if (!verse) continue;

      const ayahEl = this.createAyahElement(verse, i);
      fragment.appendChild(ayahEl);
    }

    // Replace content
    this._virtualContent.innerHTML = "";
    this._virtualContent.appendChild(fragment);

    // Measure rendered ayahs and update heights
    requestAnimationFrame(() => {
      this.measureRenderedAyahs();
    });
  }

  /**
   * Measure the actual heights of rendered ayahs and update the cache.
   */
  measureRenderedAyahs() {
    if (!this._virtualContent) return;

    const ayahEls = this._virtualContent.querySelectorAll(".pocket-quran-ayah");
    let totalMeasured = 0;
    let measureCount = 0;

    ayahEls.forEach((el) => {
      const index = parseInt(el.dataset.index, 10);
      if (!Number.isFinite(index)) return;

      const rect = el.getBoundingClientRect();
      const height = rect.height;

      if (height > 0) {
        this._ayahHeights.set(index, height);
        totalMeasured += height;
        measureCount++;
      }
    });

    // Update average height
    if (measureCount > 0) {
      const newAvg = totalMeasured / measureCount;
      // Smooth the average to avoid sudden jumps
      this._avgAyahHeight = this._avgAyahHeight * 0.7 + newAvg * 0.3;
    }

    // Update total height if measurements changed
    this.updateTotalHeight();
  }

  /**
   * Recalculate virtualization after resize or content changes.
   */
  recalculateVirtualization() {
    if (!this._virtualContainer || !this._activeVerses?.length) return;

    const scrollTop = this._virtualContainer.scrollTop;
    const firstVisible = this.getAyahAtOffset(scrollTop);

    this.updateTotalHeight();

    const buffer = PocketQuranManager.BUFFER_AYAHS;
    const visibleCount = PocketQuranManager.VISIBLE_AYAH_COUNT;
    const total = this._activeVerses.length;

    const start = Math.max(0, firstVisible - buffer);
    const end = Math.min(total - 1, firstVisible + visibleCount + buffer);

    // Force re-render
    this._renderedRange = { start: -1, end: -1 };
    this.renderVisibleAyahs(start, end);
  }

  /**
   * Scroll to a specific ayah number (1-indexed).
   * Uses a two-pass approach: first render the ayahs, measure them,
   * then scroll to the accurately calculated position.
   */
  scrollToAyah(ayahNumber, opts = {}) {
    const { persist = true, smooth = true, skipScroll = false } = opts;

    const max = this.getActiveSurahAyahCount() || 286;
    const n = this.clampNumber(ayahNumber, 1, max, 1);
    this._activeAyah = n;

    if (this.ayahInput) {
      this.ayahInput.value = String(n);
    }

    if (!skipScroll && this._virtualContainer && this._activeVerses?.length) {
      const index = n - 1; // Convert to 0-indexed
      const buffer = PocketQuranManager.BUFFER_AYAHS;
      const visibleCount = PocketQuranManager.VISIBLE_AYAH_COUNT;
      const total = this._activeVerses.length;

      const start = Math.max(0, index - buffer);
      const end = Math.min(total - 1, index + visibleCount + buffer);

      // First pass: render ayahs from the beginning up to and including the target
      // This ensures we measure all previous ayahs for accurate offset calculation
      const measureEnd = Math.min(total - 1, index + visibleCount + buffer);

      // We need to render ayahs to get accurate measurements.
      // Render a range that includes the target ayah.
      this.renderVisibleAyahs(start, end);

      // Use requestAnimationFrame to wait for layout/paint, then measure and scroll
      requestAnimationFrame(() => {
        // Measure the rendered ayahs
        this.measureRenderedAyahs();

        // Now use DOM-based offset calculation for accuracy
        // Find the target ayah element and get its actual position
        const targetEl = this._virtualContent?.querySelector(
          `[data-ayah="${n}"]`,
        );

        let offset;
        if (targetEl) {
          // Get the transform offset of the virtual content
          const transformMatch = this._virtualContent?.style.transform?.match(
            /translateY\((\d+(?:\.\d+)?)px\)/,
          );
          const contentOffset = transformMatch
            ? parseFloat(transformMatch[1])
            : 0;

          // Calculate actual offset: content transform offset + element's position within content
          offset = contentOffset + targetEl.offsetTop;
        } else {
          // Fallback to calculated offset
          offset = this.getAyahOffset(index);
        }

        // Apply a small upward offset when auto-scrolling during recitation playback.
        // This nudges the view by -RECITATION_AUTOSCROLL_OFFSET_PX so the playing ayah
        // sits slightly lower for readability.
        if (
          this._isAutoScroll &&
          this._playingAyah &&
          this._playingAyah.surah === this._activeSurah &&
          this._playingAyah.ayah === n
        ) {
          offset = Math.max(
            0,
            offset - PocketQuranManager.RECITATION_AUTOSCROLL_OFFSET_PX,
          );
        }

        // Prevent scroll handler from overwriting the active ayah mid smooth-scroll.
        const now =
          typeof performance !== "undefined" && performance.now
            ? performance.now()
            : Date.now();
        this._programmaticScroll = {
          targetOffset: offset,
          targetAyah: n,
          startedAt: now,
        };

        // Update total height with new measurements
        this.updateTotalHeight();

        // Scroll to the ayah
        this._virtualContainer.scrollTo({
          top: offset,
          behavior: smooth ? "smooth" : "auto",
        });

        // Highlight the ayah after scroll
        setTimeout(
          () => {
            this.highlightAyah(n);
          },
          smooth ? 300 : 50,
        );
      });
    }

    if (persist) {
      this.persistPocketQuranSettings({
        lastAyahNumber: n,
        lastSurahNumber: this._activeSurah,
      });
    }

    this.updateAyahDropdownActiveState();
    this.publishPopupSyncState();
  }

  /**
   * Apply highlight animation to an ayah.
   */
  highlightAyah(ayahNumber) {
    const el = this._virtualContent?.querySelector(
      `[data-ayah="${ayahNumber}"]`,
    );
    if (!el) return;

    if (this._scrollHighlightTimer) clearTimeout(this._scrollHighlightTimer);

    el.classList.remove("pq-highlight");
    void el.offsetWidth; // Force reflow
    el.classList.add("pq-highlight");

    this._scrollHighlightTimer = setTimeout(() => {
      el.classList.remove("pq-highlight");
    }, 2100);
  }

  /**
   * Create an ayah DOM element.
   */
  createAyahElement(verse, index) {
    const ayahNumber = verse?.verse_number;
    const surah = this._activeSurah;

    const ayahEl = document.createElement("div");
    ayahEl.className = "pocket-quran-ayah";
    ayahEl.id = `pocketQuranAyah-${ayahNumber}`;
    ayahEl.dataset.ayah = String(ayahNumber);
    ayahEl.dataset.index = String(index);

    // Star button for bookmarking
    const starBtn = document.createElement("button");
    starBtn.type = "button";
    starBtn.className = "pocket-quran-ayah-star";
    const isBookmarked = this.isAyahBookmarked(surah, ayahNumber);
    if (isBookmarked) {
      starBtn.classList.add("bookmarked");
    }
    starBtn.innerHTML = isBookmarked
      ? this._getIcon("⭐", { size: 18 })
      : this._getIcon("☆", { size: 18 });
    starBtn.title = isBookmarked ? "Manage bookmark" : "Bookmark this ayah";
    starBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openCategorySelectionModal(surah, ayahNumber, verse);
    });

    const badge = document.createElement("div");
    badge.className = "pocket-quran-ayah-badge";
    badge.textContent = String(ayahNumber);

    const ar = document.createElement("div");
    ar.className = "pocket-quran-ayah-ar";
    ar.setAttribute("dir", "rtl");

    // Check if Tajweed mode is enabled and we have Tajweed text
    if (this._isTajweedMode) {
      const tajweedText = this.getTajweedTextForVerse(ayahNumber);
      if (tajweedText) {
        ar.classList.add("tajweed-mode");
        ar.innerHTML = tajweedText;
      } else {
        // Fallback to plain text if Tajweed not available
        ar.textContent = verse?.text_uthmani || "";
      }
    } else {
      ar.textContent = verse?.text_uthmani || "";
    }

    const tr = document.createElement("div");
    tr.className = "pocket-quran-ayah-tr";
    const rawTranslation = Array.isArray(verse?.translations)
      ? verse.translations[0]?.text
      : "";
    tr.textContent = this.stripHtmlToText(rawTranslation || "");

    // Play button for recitation
    const isThisAyahPlaying =
      this._isPlaying &&
      this._playingAyah?.surah === surah &&
      this._playingAyah?.ayah === ayahNumber;

    const playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.className = `pq-ayah-play-btn ${
      isThisAyahPlaying ? "playing" : ""
    }`;
    playBtn.title = isThisAyahPlaying ? "Pause" : "Play recitation";
    playBtn.innerHTML = isThisAyahPlaying
      ? '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
      : '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
    playBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.togglePlayPause(surah, ayahNumber);
    });

    // Bottom-left stacked controls (top-to-bottom): star, play, badge
    const controlsStack = document.createElement("div");
    controlsStack.className = "pq-ayah-controls-stack";
    controlsStack.appendChild(starBtn);
    controlsStack.appendChild(playBtn);
    controlsStack.appendChild(badge);

    ayahEl.appendChild(controlsStack);
    ayahEl.appendChild(ar);
    ayahEl.appendChild(tr);

    return ayahEl;
  }

  /**
   * Clean up virtualization resources.
   */
  destroyVirtualization() {
    this.snapshotVirtualLayout();
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._scrollRAF) {
      cancelAnimationFrame(this._scrollRAF);
      this._scrollRAF = null;
    }
    this._virtualContainer = null;
    this._virtualSpacer = null;
    this._virtualContent = null;
    this._ayahHeights.clear();
    this._renderedRange = { start: 0, end: 0 };
  }

  snapshotVirtualLayout() {
    try {
      if (this._virtualContainer) {
        const h = Math.round(
          this._virtualContainer.getBoundingClientRect().height,
        );
        if (Number.isFinite(h) && h > 0) this._lastVirtualContainerHeightPx = h;
      }
      if (this._virtualSpacer) {
        const h = Math.round(
          this._virtualSpacer.getBoundingClientRect().height,
        );
        if (Number.isFinite(h) && h > 0) this._lastVirtualSpacerHeightPx = h;
      }
      if (this._virtualContent) {
        const h = Math.round(
          this._virtualContent.getBoundingClientRect().height,
        );
        if (Number.isFinite(h) && h > 0) this._lastVirtualContentHeightPx = h;
      }
    } catch (e) {}
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DROPDOWN MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  getEffectiveBlurMultiplier() {
    if (this.card) {
      try {
        const inlineVal = this.card.style.getPropertyValue(
          "--ui-blur-multiplier",
        );
        if (inlineVal) {
          const n = parseFloat(String(inlineVal).trim());
          if (Number.isFinite(n) && n >= 0) return n;
        }
      } catch (e) {}
    }

    const readComputed = (el) => {
      if (!el) return null;
      try {
        const raw =
          getComputedStyle(el).getPropertyValue("--ui-blur-multiplier") || "";
        const n = parseFloat(String(raw).trim());
        if (Number.isFinite(n) && n >= 0) return n;
      } catch (e) {}
      return null;
    };

    return (
      readComputed(this.card) ?? readComputed(document.documentElement) ?? 1
    );
  }

  syncDropdownBlurMultiplier(el) {
    if (!el) return;
    const multiplier = this.getEffectiveBlurMultiplier();
    try {
      el.style.setProperty("--ui-blur-multiplier", String(multiplier));
    } catch (e) {}
  }

  ensureDropdownPortal(el) {
    if (!el) return;
    if (this._dropdownPortalled?.has(el)) return;
    try {
      document.body.appendChild(el);
      el.classList.add("pq-portal");
      this._dropdownPortalled.add(el);
    } catch (e) {}
    this.syncDropdownBlurMultiplier(el);
  }

  positionDropdown(el) {
    if (!el || el.hidden) return;

    this.syncDropdownBlurMultiplier(el);

    let anchor = null;
    if (el === this.surahDropdown) anchor = this.surahCombobox;
    if (el === this.ayahDropdown) anchor = this.ayahCombobox;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 10;

    const belowSpace = window.innerHeight - rect.bottom - gap - viewportPadding;
    const aboveSpace = rect.top - gap - viewportPadding;
    const preferAbove = belowSpace < 200 && aboveSpace > belowSpace;

    const left = Math.max(viewportPadding, Math.round(rect.left));
    const width = Math.max(220, Math.round(rect.width));
    const maxListHeight = Math.min(
      420,
      Math.max(180, Math.floor((preferAbove ? aboveSpace : belowSpace) - 10)),
    );

    el.style.left = `${left}px`;
    el.style.width = `${width}px`;
    el.style.right = "auto";

    if (preferAbove) {
      const bottom = Math.max(
        viewportPadding,
        Math.round(window.innerHeight - rect.top + gap),
      );
      el.style.top = "auto";
      el.style.bottom = `${bottom}px`;
    } else {
      const top = Math.max(viewportPadding, Math.round(rect.bottom + gap));
      el.style.top = `${top}px`;
      el.style.bottom = "auto";
    }

    const list = el.querySelector(".pocket-quran-dropdown-list");
    if (list) {
      list.style.maxHeight = `${maxListHeight}px`;
    }
  }

  openDropdown(el) {
    if (!el) return;
    this.ensureDropdownPortal(el);
    try {
      if (el === this.surahDropdown && this.surahCombobox)
        this.surahCombobox.classList.add("pq-open");
      if (el === this.ayahDropdown && this.ayahCombobox)
        this.ayahCombobox.classList.add("pq-open");
    } catch (e) {}
    el.hidden = false;
    this.syncDropdownBlurMultiplier(el);
    this.positionDropdown(el);
  }

  closeDropdown(el) {
    if (!el) return;
    try {
      if (el === this.surahDropdown && this.surahCombobox)
        this.surahCombobox.classList.remove("pq-open");
      if (el === this.ayahDropdown && this.ayahCombobox)
        this.ayahCombobox.classList.remove("pq-open");
    } catch (e) {}
    el.hidden = true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SURAH MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  formatSurahLabel(ch) {
    if (!ch) return "";
    const en = ch.name_simple || `Surah ${ch.id}`;
    const ar = ch.name_arabic ? ` ${ch.name_arabic}` : "";
    return `${ch.id}. ${en}${ar}`;
  }

  updateSurahInputValue(opts = {}) {
    const { force = false } = opts;
    if (!this.surahInput) return;
    if (!force && document.activeElement === this.surahInput) return;
    const chapter = this._chapters.find((c) => c.id === this._activeSurah);
    this.surahInput.value = this.formatSurahLabel(chapter);
  }

  getFilteredChapters(query) {
    const q = String(query || "").trim();
    if (!q) return this._chapters;

    const lower = q.toLowerCase();
    const isNumber = /^\d+$/.test(q);

    return this._chapters.filter((c) => {
      if (isNumber) {
        return String(c.id).startsWith(q);
      }
      const en = String(c.name_simple || "").toLowerCase();
      const ar = String(c.name_arabic || "");
      return en.includes(lower) || ar.includes(q);
    });
  }

  findSurahFromQuery(query) {
    const q = String(query || "").trim();
    if (!q) return null;

    const leadingNumber = q.match(/^\s*(\d{1,3})\b/);
    if (leadingNumber) {
      const id = parseInt(leadingNumber[1], 10);
      if (Number.isFinite(id)) {
        const ch = this._chapters.find((c) => c.id === id);
        if (ch) return ch;
      }
    }

    if (/^\d+$/.test(q)) {
      const id = parseInt(q, 10);
      return this._chapters.find((c) => c.id === id) || null;
    }

    const lower = q.toLowerCase();
    const exact = this._chapters.find(
      (c) => String(c.name_simple || "").toLowerCase() === lower,
    );
    if (exact) return exact;

    const filtered = this.getFilteredChapters(q);
    return filtered.length ? filtered[0] : null;
  }

  getVersesCacheKey(surah, translationId) {
    return `${surah}|${translationId}`;
  }

  async loadChaptersAndRenderSurahPicker() {
    try {
      const cached = this.storage.get("pocketQuran_chapters_cache", null);
      const cachedAt = this.storage.get("pocketQuran_chapters_cache_at", 0);
      const freshEnough =
        Date.now() - (cachedAt || 0) < 1000 * 60 * 60 * 24 * 7;

      if (cached && Array.isArray(cached) && freshEnough) {
        this._chapters = cached;
        this.renderSurahList();
        this.updateSurahInputValue({ force: true });
        this.publishPopupSyncState();
        return;
      }

      const url = `${PocketQuranManager.API_BASE}/chapters?language=en`;
      const data = await this.fetchJson(url, { timeoutMs: 15000 });
      const chapters = Array.isArray(data?.chapters) ? data.chapters : [];

      this._chapters = chapters
        .map((c) => ({
          id: c.id,
          name_simple: c.name_simple,
          name_arabic: c.name_arabic,
          verses_count: c.verses_count,
        }))
        .filter((c) => Number.isFinite(c.id));

      this.storage.set("pocketQuran_chapters_cache", this._chapters);
      this.storage.set("pocketQuran_chapters_cache_at", Date.now());

      this.renderSurahList();
      this.updateSurahInputValue({ force: true });
      this.publishPopupSyncState();
    } catch (e) {
      console.error("PocketQuran: failed to load chapters", e);
      this._chapters = [];
      this.renderSurahList({ failed: true });
      this.renderError(
        "Could not load Surah list. Check your internet connection.",
      );
      this.publishPopupSyncState();
    }
  }

  renderSurahList(opts = {}) {
    const { failed = false } = opts;

    if (!this.surahListEl) return;
    this.surahListEl.innerHTML = "";

    if (failed) {
      const div = document.createElement("div");
      div.className = "pocket-quran-dropdown-empty";
      div.textContent = "Surah list unavailable";
      this.surahListEl.appendChild(div);
      return;
    }

    const chapters = this.getFilteredChapters(this._surahQuery);
    const frag = document.createDocumentFragment();

    for (const ch of chapters) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pocket-quran-surah-item";
      btn.dataset.surah = String(ch.id);

      const num = document.createElement("span");
      num.className = "pq-surah-num";
      num.textContent = String(ch.id);

      const names = document.createElement("span");
      names.className = "pq-surah-names";

      const en = document.createElement("span");
      en.className = "pq-surah-en";
      en.textContent = ch.name_simple || `Surah ${ch.id}`;

      const ar = document.createElement("span");
      ar.className = "pq-surah-ar";
      ar.setAttribute("dir", "rtl");
      ar.textContent = ch.name_arabic || "";

      names.appendChild(en);
      names.appendChild(ar);
      btn.appendChild(num);
      btn.appendChild(names);
      frag.appendChild(btn);
    }

    this.surahListEl.appendChild(frag);
    this.updateSurahActiveState();
  }

  updateSurahActiveState() {
    if (!this.surahListEl) return;
    for (const btn of this.surahListEl.querySelectorAll(
      ".pocket-quran-surah-item",
    )) {
      const surah = parseInt(btn.dataset.surah, 10);
      btn.classList.toggle("active", surah === this._activeSurah);
      btn.setAttribute(
        "aria-current",
        surah === this._activeSurah ? "true" : "false",
      );
    }
  }

  async setActiveSurah(surahNumber, opts = {}) {
    const {
      preserveAyah = false,
      autoScroll = true,
      preserveDashboardScroll = true,
    } = opts;

    const restorePos = preserveDashboardScroll
      ? { x: window.scrollX || 0, y: window.scrollY || 0 }
      : null;

    const surah = this.clampNumber(surahNumber, 1, 114, 1);
    const versesAlreadyRendered = Boolean(
      this.contentEl?.querySelector?.(".pocket-quran-ayah"),
    );

    if (surah === this._activeSurah && versesAlreadyRendered) {
      this.updateSurahActiveState();
      this.updateSurahInputValue({ force: true });
      this.publishPopupSyncState();
      return;
    }

    this._activeSurah = surah;
    if (!preserveAyah) this._activeAyah = 1;

    const persistPatch = {
      lastSurahNumber: surah,
      translationResourceId: this._activeTranslationId,
    };
    if (!preserveAyah) persistPatch.lastAyahNumber = 1;
    this.persistPocketQuranSettings(persistPatch);

    this.updateSurahActiveState();
    this.updateSurahInputValue({ force: true });

    await this.loadSurah(surah, { autoScroll, restorePos });

    if (restorePos) {
      // Double-rAF: wait for layout/paint so we don't fight reflow.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            window.scrollTo(restorePos.x, restorePos.y);
          } catch (e) {}
        });
      });
    }

    this.publishPopupSyncState();
  }

  async loadSurah(surah, opts = {}) {
    const { autoScroll = true, restorePos = null } = opts;
    const chapter = this._chapters.find((c) => c.id === surah);
    const surahName = chapter?.name_simple || `Surah ${surah}`;
    const surahNameAr = chapter?.name_arabic || "";

    this.renderLoading(`Loading ${surahName}…`);

    // Some browsers' scroll anchoring + dynamic card height can cause
    // unexpected dashboard jumps. Restore immediately after we mutate DOM.
    if (restorePos) {
      requestAnimationFrame(() => {
        try {
          window.scrollTo(restorePos.x, restorePos.y);
        } catch (e) {}
      });
    }

    try {
      if (this._fetchController) this._fetchController.abort();
    } catch (e) {}

    const controller = new AbortController();
    this._fetchController = controller;

    try {
      const translationId = this.normalizeTranslationId(
        this.storage.getSettings()?.pocketQuran?.translationResourceId,
      );
      this._activeTranslationId = translationId;

      const cacheKey = this.getVersesCacheKey(surah, translationId);
      const cached = this._versesCache.get(cacheKey);
      const hasCached =
        cached && Array.isArray(cached.verses) && cached.verses.length;

      let verses = [];
      if (hasCached) {
        verses = cached.verses;
      } else {
        const url = `${PocketQuranManager.API_BASE}/verses/by_chapter/${surah}?fields=text_uthmani,verse_number,verse_key&translations=${translationId}&per_page=300`;
        const data = await this.fetchJson(url, {
          signal: controller.signal,
          timeoutMs: 20000,
        });
        verses = Array.isArray(data?.verses) ? data.verses : [];
        this._versesCache.set(cacheKey, { verses, fetchedAt: Date.now() });
      }

      if (!verses.length) {
        this.renderError("No verses returned by the API.");
        return;
      }

      this._activeVerses = verses;

      // Preload Tajweed verses if Tajweed mode is enabled
      if (this._isTajweedMode) {
        await this.preloadTajweedVerses(surah);
      }

      this.renderSurahHeader({
        surah,
        surahName,
        surahNameAr,
        versesCount: verses.length,
      });

      // Initialize virtualized rendering
      this.initVirtualization();

      // Restore again after the main content mounts (covers jumps triggered
      // by height changes between loading state and the virtual container).
      if (restorePos) {
        requestAnimationFrame(() => {
          try {
            window.scrollTo(restorePos.x, restorePos.y);
          } catch (e) {}
        });
      }

      this.updateAyahControls(verses.length);

      const desired = this.clampNumber(
        this.storage.getSettings()?.pocketQuran?.lastAyahNumber,
        1,
        verses.length,
        1,
      );

      if (this.ayahInput) this.ayahInput.value = String(desired);

      // Scroll to the desired ayah
      if (autoScroll && desired > 1) {
        setTimeout(() => {
          this.scrollToAyah(desired, { persist: false, smooth: false });
        }, 100);
      }

      this.updateAyahDropdownActiveState();
    } catch (e) {
      if (e?.name === "AbortError") return;
      console.error("PocketQuran: failed to load surah", e);
      this.renderError("Could not load this Surah. Please try again.");
    } finally {
      if (this._fetchController === controller) this._fetchController = null;
    }
  }

  renderSurahHeader({ surah, surahName, surahNameAr, versesCount }) {
    if (!this.headerMeta) return;
    const translation =
      PocketQuranManager.TRANSLATIONS[this._activeTranslationId]?.label ||
      "Translation";
    const tajweedIndicator = this._isTajweedMode ? " · Tajweed" : "";
    this.headerMeta.textContent = `${surah}. ${surahName} · ${versesCount} ayahs · ${translation}${tajweedIndicator}`;
  }

  /**
   * Reload the current surah with a new translation.
   * Called when user changes translation from settings or modal.
   */
  reloadTranslation(newTranslationId) {
    const id = this.normalizeTranslationId(newTranslationId);
    if (id === this._activeTranslationId) return;

    this._activeTranslationId = id;

    // Clear the cache for this surah so we fetch fresh data with new translation
    const cacheKey = this.getVersesCacheKey(this._activeSurah, id);
    this._versesCache.delete(cacheKey);

    // Reload the current surah
    this.loadSurah(this._activeSurah, { autoScroll: false });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TAJWEED MODE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Toggle Tajweed mode on/off.
   * When enabled, fetches color-coded Tajweed text from the API.
   */
  async toggleTajweedMode() {
    if (!this.isTajweedAllowedForFont(this._arabicFontFamily)) {
      // Enforce off when not allowed
      this.disableTajweedMode();
      this.syncTajweedAvailabilityForFont();
      return;
    }

    this._isTajweedMode = !this._isTajweedMode;
    this.persistPocketQuranSettings({ tajweedMode: this._isTajweedMode });
    this.updateTajweedToggleUI();

    // Re-render the current surah with or without Tajweed
    const scrollTop = this._virtualContainer?.scrollTop || 0;
    const currentAyah = this._activeAyah;

    // Preload Tajweed verses if enabling Tajweed mode
    if (this._isTajweedMode && this._activeSurah) {
      await this.preloadTajweedVerses(this._activeSurah);
    }

    // Invalidate height cache since Tajweed font may have different sizing
    this._ayahHeights.clear();

    // Re-render visible ayahs
    if (this._activeVerses?.length) {
      this.recalculateVirtualization();

      // Restore scroll position
      requestAnimationFrame(() => {
        if (this._virtualContainer) {
          this._virtualContainer.scrollTop = scrollTop;
        }
      });
    }

    // Update header to show Tajweed indicator
    const chapter = this._chapters.find((c) => c.id === this._activeSurah);
    if (chapter) {
      this.renderSurahHeader({
        surah: this._activeSurah,
        surahName: chapter.name_simple || `Surah ${this._activeSurah}`,
        surahNameAr: chapter.name_arabic || "",
        versesCount: this._activeVerses?.length || 0,
      });
    }
  }

  /**
   * Update the Tajweed toggle button UI to reflect current state.
   */
  updateTajweedToggleUI() {
    if (!this.tajweedToggleBtn) return;
    this.tajweedToggleBtn.classList.toggle("active", this._isTajweedMode);
    this.tajweedToggleBtn.setAttribute(
      "aria-pressed",
      this._isTajweedMode ? "true" : "false",
    );
  }

  isTajweedAllowedForFont(fontFamily) {
    const f = this.normalizeArabicFontFamily(fontFamily);
    return !(f === "Noto Naskh Arabic" || f === "Amiri");
  }

  syncTajweedAvailabilityForFont() {
    const allowed = this.isTajweedAllowedForFont(this._arabicFontFamily);

    if (this.tajweedToggleBtn) {
      this.tajweedToggleBtn.disabled = !allowed;
      this.tajweedToggleBtn.setAttribute(
        "aria-disabled",
        allowed ? "false" : "true",
      );
      this.tajweedToggleBtn.title = allowed
        ? "Toggle Tajweed color-coded Arabic text"
        : "Tajweed disabled for this font";
    }

    if (!allowed) {
      this.disableTajweedMode();
    }
  }

  disableTajweedMode() {
    if (!this._isTajweedMode) {
      this.persistPocketQuranSettings({ tajweedMode: false });
      this.updateTajweedToggleUI();
      return;
    }

    this._isTajweedMode = false;
    this.persistPocketQuranSettings({ tajweedMode: false });
    this.updateTajweedToggleUI();

    const scrollTop = this._virtualContainer?.scrollTop || 0;

    this._ayahHeights.clear();
    if (this._activeVerses?.length) {
      this.recalculateVirtualization();
      requestAnimationFrame(() => {
        if (this._virtualContainer) {
          this._virtualContainer.scrollTop = scrollTop;
        }
      });
    }

    const chapter = this._chapters.find((c) => c.id === this._activeSurah);
    if (chapter) {
      this.renderSurahHeader({
        surah: this._activeSurah,
        surahName: chapter.name_simple || `Surah ${this._activeSurah}`,
        surahNameAr: chapter.name_arabic || "",
        versesCount: this._activeVerses?.length || 0,
      });
    }
  }

  /**
   * Get cache key for Tajweed verses.
   */
  getTajweedCacheKey(surah) {
    return `tajweed|${surah}`;
  }

  /**
   * Fetch Tajweed verses for a surah from the Quran.com API.
   * Returns an array of verses with text_uthmani_tajweed field.
   */
  async fetchTajweedVerses(surah) {
    const cacheKey = this.getTajweedCacheKey(surah);
    const cached = this._tajweedVersesCache.get(cacheKey);

    if (cached && Array.isArray(cached.verses) && cached.verses.length) {
      return cached.verses;
    }

    try {
      const url = `${PocketQuranManager.TAJWEED_API_BASE}?chapter_number=${surah}`;
      const data = await this.fetchJson(url, { timeoutMs: 20000 });
      const verses = Array.isArray(data?.verses) ? data.verses : [];

      if (verses.length) {
        this._tajweedVersesCache.set(cacheKey, {
          verses,
          fetchedAt: Date.now(),
        });
      }

      return verses;
    } catch (e) {
      console.error("PocketQuran: failed to fetch Tajweed verses", e);
      return [];
    }
  }

  /**
   * Convert Tajweed API response to valid HTML.
   * The API returns <tajweed class=xxx> tags which need to be converted to <span class="xxx">.
   */
  parseTajweedHtml(tajweedText) {
    if (!tajweedText) return null;

    // Convert <tajweed class=xxx> to <span class="xxx">
    // The API returns class names without quotes, e.g., <tajweed class=ham_wasl>
    let html = tajweedText
      .replace(/<tajweed\s+class=([^>]+)>/gi, (match, className) => {
        // Clean the class name and add quotes
        const cleanClass = className.trim();
        return `<span class="${cleanClass}">`;
      })
      .replace(/<\/tajweed>/gi, "</span>");

    return html;
  }

  /**
   * Get Tajweed HTML for a specific verse.
   * The API returns HTML with class attributes for Tajweed rules.
   * We parse and convert them to proper HTML with CSS classes.
   */
  getTajweedTextForVerse(verseNumber) {
    const cacheKey = this.getTajweedCacheKey(this._activeSurah);
    const cached = this._tajweedVersesCache.get(cacheKey);

    if (!cached?.verses?.length) return null;

    // The API returns verse_key like "1:1", "1:2", etc.
    // We need to find the verse matching our surah:ayah pattern
    const verseKey = `${this._activeSurah}:${verseNumber}`;
    const verse = cached.verses.find((v) => v.verse_key === verseKey);
    if (!verse?.text_uthmani_tajweed) return null;

    // Parse and convert the Tajweed HTML
    return this.parseTajweedHtml(verse.text_uthmani_tajweed);
  }

  /**
   * Preload Tajweed verses for the active surah.
   * Called when Tajweed mode is enabled or when switching surahs.
   */
  async preloadTajweedVerses(surah) {
    if (!this._isTajweedMode) return;

    const cacheKey = this.getTajweedCacheKey(surah);
    if (this._tajweedVersesCache.has(cacheKey)) return;

    await this.fetchTajweedVerses(surah);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AYAH CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════

  updateAyahControls(ayahCount) {
    const max = this.clampNumber(ayahCount, 1, 286, 1);
    if (this.ayahInput && !this.ayahInput.value) {
      this.ayahInput.value = "1";
    }

    if (this.ayahListEl) {
      this.ayahListEl.innerHTML = "";
      const frag = document.createDocumentFragment();
      for (let i = 1; i <= max; i++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pocket-quran-ayah-option";
        btn.dataset.ayah = String(i);
        btn.textContent = String(i);
        frag.appendChild(btn);
      }
      this.ayahListEl.appendChild(frag);
    }

    this.updateAyahDropdownActiveState();
  }

  updateAyahDropdownActiveState() {
    if (!this.ayahListEl) return;
    const max = this.getActiveSurahAyahCount() || 286;
    const current = this.clampNumber(this._activeAyah, 1, max, 1);

    let activeBtn = null;
    for (const btn of this.ayahListEl.querySelectorAll(
      ".pocket-quran-ayah-option",
    )) {
      const n = parseInt(btn.dataset.ayah, 10);
      const isActive = n === current;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
      if (isActive) {
        activeBtn = btn;
      }
    }

    // Scroll the dropdown list to show the active ayah at the top
    if (activeBtn && !this.ayahDropdown?.hidden) {
      this.scrollAyahDropdownToActive(activeBtn);
    }
  }

  /**
   * Scroll the ayah dropdown list so the active button is positioned at the top.
   */
  scrollAyahDropdownToActive(activeBtn) {
    if (!activeBtn || !this.ayahListEl) return;

    // Get the scroll container (the dropdown list itself)
    const scrollContainer = this.ayahListEl;

    // Calculate the offset of the active button relative to the scroll container
    const btnOffsetTop = activeBtn.offsetTop;

    // Scroll so the active ayah is at the top of the visible area
    // Use a small offset (e.g., 4px) for visual padding
    const targetScrollTop = Math.max(0, btnOffsetTop - 4);

    scrollContainer.scrollTop = targetScrollTop;
  }

  /**
   * Scroll the surah dropdown list so the active surah is positioned at the top.
   */
  scrollSurahDropdownToActive() {
    if (!this.surahListEl) return;

    // Find the active surah button
    const activeBtn = this.surahListEl.querySelector(
      `.pocket-quran-surah-item[data-surah="${this._activeSurah}"]`,
    );
    if (!activeBtn) return;

    // Get the scroll container (the dropdown list itself)
    const scrollContainer = this.surahListEl;

    // Calculate the offset of the active button relative to the scroll container
    const btnOffsetTop = activeBtn.offsetTop;

    // Scroll so the active surah is at the top of the visible area
    // Use a small offset (e.g., 4px) for visual padding
    const targetScrollTop = Math.max(0, btnOffsetTop - 4);

    scrollContainer.scrollTop = targetScrollTop;
  }

  getActiveSurahAyahCount() {
    const chapter = this._chapters.find((c) => c.id === this._activeSurah);
    const count = chapter?.verses_count;
    return Number.isFinite(count) ? count : null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RECITATION SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize the recitation system.
   */
  initRecitationSystem() {
    // Load saved settings
    const pq = this.storage.getSettings()?.pocketQuran || {};
    this._activeReciterId = pq.reciterId || 7; // Default: Mishary Rashid Alafasy
    this._volume = this.clampNumber(pq.reciterVolume, 0, 1, 1);
    this._isLooping = pq.reciterLoop || false;
    this._isSurahLooping = pq.reciterSurahLoop || false;
    this._isAutoplay = pq.reciterAutoplay || false;
    this._isAutoScroll = pq.reciterAutoScroll || false;
    this._recitationFloatingEnabled = pq.recitationFloatingEnabled !== false;
    this._recitationAutoDockOnVisible =
      pq.recitationAutoDockOnVisible !== false;
    this._recitationFloatingAppearance =
      this.normalizeRecitationFloatingAppearance(
        pq.recitationFloatingAppearance,
      );
    this._recitationFloatingManualOnly = false;

    // Small caches to smooth autoplay transitions.
    // Src cache avoids repeating the /by_ayah metadata request + blob URL setup.
    // Preload cache warms media buffering for the next few ayahs.
    this._audioSrcCache = new Map();
    this._audioBlobUrlCache = new Map();
    this._preloadedAudios = new Map();
    this._prefetchAheadCount = 3;

    // Store handlers so we can re-attach if we swap audio elements.
    this._onAudioEnded = () => this.handleAudioEnded();
    this._onAudioError = (e) => {
      console.error("PocketQuran: Audio error", e);
      this._isPlaying = false;
      this.updatePlaybackUI();
    };
    this._onAudioPlaying = (event) => {
      this.enforceSingleRecitationAudioOwner();
      this._isPlaying = true;
      this.updatePlaybackUI();
    };
    this._onAudioPause = (event) => {
      const sourceAudio = event?.currentTarget || event?.target || null;
      this.clearRecitationAudioOwnerIfCurrent(
        sourceAudio || this._audioElement,
      );
      this._isPlaying = false;
      this.updatePlaybackUI();
    };

    // Create audio element
    this._audioElement = new Audio();
    this._audioElement.volume = this._volume;
    this._audioElement.preload = "auto";

    this.attachAudioListeners(this._audioElement);

    // Load reciters list
    this.loadReciters();

    // Create reciter modal
    this.createReciterModal();
    this.publishPopupSyncState();
  }

  attachAudioListeners(audio) {
    if (!audio) return;
    audio.addEventListener("ended", this._onAudioEnded);
    audio.addEventListener("error", this._onAudioError);
    audio.addEventListener("playing", this._onAudioPlaying);
    audio.addEventListener("pause", this._onAudioPause);
  }

  detachAudioListeners(audio) {
    if (!audio) return;
    audio.removeEventListener("ended", this._onAudioEnded);
    audio.removeEventListener("error", this._onAudioError);
    audio.removeEventListener("playing", this._onAudioPlaying);
    audio.removeEventListener("pause", this._onAudioPause);
  }

  setActiveAudioElement(audio) {
    if (!audio || audio === this._audioElement) return;
    try {
      if (this._audioElement) {
        this.detachAudioListeners(this._audioElement);
        this._audioElement.pause();
      }
    } catch (e) {}

    this._audioElement = audio;
    this._audioElement.preload = "auto";
    this._audioElement.volume = this._volume;
    this.attachAudioListeners(this._audioElement);
  }

  enforceSingleRecitationAudioOwner() {
    if (typeof window === "undefined") return;
    const ownerKey = "__MD_PQ_ACTIVE_AUDIO__";
    const activeAudio = window[ownerKey];

    if (activeAudio && activeAudio !== this._audioElement) {
      try {
        activeAudio.pause();
      } catch (e) {}
      try {
        activeAudio.currentTime = 0;
      } catch (e) {}
    }

    window[ownerKey] = this._audioElement;
  }

  clearRecitationAudioOwnerIfCurrent(audio = this._audioElement) {
    if (typeof window === "undefined") return;
    const ownerKey = "__MD_PQ_ACTIVE_AUDIO__";
    if (window[ownerKey] === audio) {
      window[ownerKey] = null;
    }
  }

  buildRecitationCacheKey(surah, ayah) {
    return `${this._activeReciterId}:${surah}:${ayah}`;
  }

  _revokeAllRecitationBlobUrls() {
    if (!this._audioBlobUrlCache) return;
    for (const url of this._audioBlobUrlCache.values()) {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {}
    }
    this._audioBlobUrlCache.clear();
  }

  _getOrCreateRecitationBlobUrl(cacheKey, blob) {
    if (!cacheKey || !blob) return null;
    const existing = this._audioBlobUrlCache?.get(cacheKey);
    if (existing) return existing;
    try {
      const url = URL.createObjectURL(blob);
      this._audioBlobUrlCache?.set(cacheKey, url);
      return url;
    } catch (e) {
      return null;
    }
  }

  extractAudioUrlFromRecitationResponse(data) {
    const audioFiles = data?.audio_files;
    let audioUrl = null;

    if (Array.isArray(audioFiles) && audioFiles.length > 0) {
      audioUrl = audioFiles[0]?.url;
    } else if (data?.audio_file?.url) {
      audioUrl = data.audio_file.url;
    } else if (data?.audio_file?.audio_url) {
      audioUrl = data.audio_file.audio_url;
    }

    return this.resolveRecitationAudioUrl(audioUrl);
  }

  async getOrFetchAyahAudioSrc(surah, ayah, { timeoutMs = 10000 } = {}) {
    const key = this.buildRecitationCacheKey(surah, ayah);

    const cachedSrc = this._audioSrcCache?.get(key);
    if (cachedSrc) return cachedSrc;

    // 1) If MP3 is cached, avoid both metadata and MP3 network requests.
    if (this._pqCache) {
      const rec = await this._pqCache.getAudio(key);
      if (rec?.blob) {
        const blobUrl = this._getOrCreateRecitationBlobUrl(key, rec.blob);
        if (blobUrl) {
          this._audioSrcCache?.set(key, blobUrl);
          return blobUrl;
        }
      }
    }

    // 2) Resolve the actual MP3 URL (fetchJson itself is JSON-cached).
    const metaUrl = this.getAudioUrl(surah, ayah);
    const data = await this.fetchJson(metaUrl, { timeoutMs });
    const audioUrl = this.extractAudioUrlFromRecitationResponse(data);
    if (!audioUrl) return null;

    // 3) Fetch MP3 and cache it.
    let blob = null;
    let mimeType = "audio/mpeg";
    try {
      const controller = new AbortController();
      let timer = null;
      try {
        timer = setTimeout(
          () => {
            try {
              controller.abort();
            } catch (e) {}
          },
          Math.max(5000, timeoutMs),
        );

        const res = await fetch(audioUrl, {
          method: "GET",
          signal: controller.signal,
        });

        if (!res.ok) {
          // Still allow playback via remote URL if caching fails.
          this._audioSrcCache?.set(key, audioUrl);
          return audioUrl;
        }

        mimeType = res.headers.get("content-type") || mimeType;
        blob = await res.blob();
      } finally {
        if (timer) {
          clearTimeout(timer);
        }
      }
    } catch (e) {
      this._audioSrcCache?.set(key, audioUrl);
      return audioUrl;
    }

    const blobUrl = this._getOrCreateRecitationBlobUrl(key, blob);
    const finalSrc = blobUrl || audioUrl;
    this._audioSrcCache?.set(key, finalSrc);

    if (this._pqCache && blob) {
      await this._pqCache.setAudio({
        key,
        reciterId: this._activeReciterId,
        surah,
        ayah,
        audioUrl,
        mimeType,
        size: Number.isFinite(blob.size) ? blob.size : null,
        blob,
      });
    }

    return finalSrc;
  }

  trimPreloadedAudios(max = 6) {
    if (!this._preloadedAudios) return;
    while (this._preloadedAudios.size > max) {
      const firstKey = this._preloadedAudios.keys().next().value;
      const firstAudio = this._preloadedAudios.get(firstKey);
      try {
        if (firstAudio) {
          firstAudio.pause();
          firstAudio.src = "";
        }
      } catch (e) {}
      this._preloadedAudios.delete(firstKey);
    }
  }

  async ensurePreloadedAyahAudio(surah, ayah) {
    const key = this.buildRecitationCacheKey(surah, ayah);
    if (this._preloadedAudios?.has(key)) return this._preloadedAudios.get(key);

    let audioSrc = null;
    try {
      audioSrc = await this.getOrFetchAyahAudioSrc(surah, ayah, {
        timeoutMs: 10000,
      });
    } catch (e) {
      return null;
    }

    if (!audioSrc) return null;

    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = this._volume;
    audio.src = audioSrc;
    try {
      audio.load();
    } catch (e) {}

    this._preloadedAudios.set(key, audio);
    this.trimPreloadedAudios(6);
    return audio;
  }

  async prefetchNextAyahs(surah, fromAyah, count) {
    const max = this.getActiveSurahAyahCount() || 286;
    const capped = Math.max(0, Math.min(5, parseInt(count, 10) || 0));

    const tasks = [];
    for (let i = 1; i <= capped; i++) {
      const nextAyah = fromAyah + i;
      if (nextAyah > max) break;
      tasks.push(this.ensurePreloadedAyahAudio(surah, nextAyah));
    }

    if (tasks.length) {
      await Promise.allSettled(tasks);
    }
  }

  resetRecitationCaches() {
    try {
      if (this._preloadedAudios) {
        for (const a of this._preloadedAudios.values()) {
          try {
            a.pause();
            a.src = "";
          } catch (e) {}
        }
      }
    } catch (e) {}

    this._revokeAllRecitationBlobUrls();
    this._audioSrcCache = new Map();
    this._preloadedAudios = new Map();
  }

  tryPlayAyahImmediateFromCache(surah, ayah) {
    if (!this._audioElement) return false;

    const cacheKey = this.buildRecitationCacheKey(surah, ayah);

    // Prefer a preloaded audio element for the fastest possible start.
    const preloaded = this._preloadedAudios?.get(cacheKey);
    if (preloaded) {
      this._preloadedAudios.delete(cacheKey);
      this.setActiveAudioElement(preloaded);

      this._playingAyah = { surah, ayah };
      this._audioElement.volume = this._volume;

      try {
        this.enforceSingleRecitationAudioOwner();
        this._audioElement.currentTime = 0;
      } catch (e) {}

      try {
        this.enforceSingleRecitationAudioOwner();
        this._audioElement.play();
      } catch (e) {}

      if (!this._headerControlsBox) {
        this.showHeaderControls();
      }
      this.updatePlaybackUI();

      if (this._isAutoplay) {
        this.prefetchNextAyahs(surah, ayah, this._prefetchAheadCount);
      }

      // Only auto-scroll if viewing the same surah that's playing
      if (this._isAutoScroll && this._activeSurah === surah) {
        this.scrollToAyah(ayah, { persist: false, smooth: true });
      }

      return true;
    }

    // Next best: cached src (blob URL or remote URL).
    const cachedSrc = this._audioSrcCache?.get(cacheKey);
    if (cachedSrc) {
      this._playingAyah = { surah, ayah };
      this._audioElement.volume = this._volume;
      if (this._audioElement.src !== cachedSrc) {
        this._audioElement.src = cachedSrc;
      }

      try {
        this.enforceSingleRecitationAudioOwner();
        this._audioElement.play();
      } catch (e) {}

      if (!this._headerControlsBox) {
        this.showHeaderControls();
      }
      this.updatePlaybackUI();

      if (this._isAutoplay) {
        this.prefetchNextAyahs(surah, ayah, this._prefetchAheadCount);
      }

      // Only auto-scroll if viewing the same surah that's playing
      if (this._isAutoScroll && this._activeSurah === surah) {
        this.scrollToAyah(ayah, { persist: false, smooth: true });
      }

      return true;
    }

    return false;
  }

  /**
   * Load all available reciters from the API.
   */
  async loadReciters() {
    try {
      const cached = this.storage.get("pocketQuran_reciters_cache", null);
      const cachedAt = this.storage.get("pocketQuran_reciters_cache_at", 0);
      const freshEnough =
        Date.now() - (cachedAt || 0) < 1000 * 60 * 60 * 24 * 7;

      if (cached && Array.isArray(cached) && freshEnough) {
        this._reciters = cached;
        return;
      }

      const url = `${PocketQuranManager.API_BASE}/resources/recitations`;
      const data = await this.fetchJson(url, { timeoutMs: 15000 });
      const recitations = Array.isArray(data?.recitations)
        ? data.recitations
        : [];

      this._reciters = recitations
        .map((r) => ({
          id: r.id,
          name: r.reciter_name || r.translated_name?.name || `Reciter ${r.id}`,
          style: r.style || null,
        }))
        .filter((r) => Number.isFinite(r.id));

      this.storage.set("pocketQuran_reciters_cache", this._reciters);
      this.storage.set("pocketQuran_reciters_cache_at", Date.now());
    } catch (e) {
      console.error("PocketQuran: failed to load reciters", e);
      // Provide a fallback list of common reciters
      this._reciters = [
        { id: 7, name: "Mishary Rashid Alafasy", style: null },
        { id: 1, name: "Abdul Basit Abdul Samad", style: "Murattal" },
        { id: 2, name: "Abdul Basit Abdul Samad", style: "Mujawwad" },
        { id: 3, name: "Abdur-Rahman as-Sudais", style: null },
        { id: 4, name: "Abu Bakr al-Shatri", style: null },
        { id: 5, name: "Hani ar-Rifai", style: null },
        { id: 6, name: "Mahmoud Khalil Al-Husary", style: null },
      ];
    }
  }

  /**
   * Get the audio URL for a specific ayah.
   */
  getAudioUrl(surah, ayah) {
    // Format: https://api.quran.com/api/v4/recitations/{reciter_id}/by_ayah/{surah}:{ayah}
    // This returns audio_file info, but we can use verses.media CDN directly
    // CDN pattern: https://verses.quran.com/{reciter_relative_path}
    // Or use: https://api.quran.com/api/v4/chapter_recitations/{reciter_id}/{chapter_id}
    // For per-ayah audio, we use: /recitations/{reciter_id}/by_ayah/{verse_key}

    return `${PocketQuranManager.API_BASE}/recitations/${this._activeReciterId}/by_ayah/${surah}:${ayah}`;
  }

  resolveRecitationAudioUrl(url) {
    const raw = String(url || "").trim();
    if (!raw) return null;

    // Already absolute.
    if (/^https?:\/\//i.test(raw)) return raw;

    // Protocol-relative.
    if (raw.startsWith("//")) return `https:${raw}`;

    // Quran.com per-ayah endpoint returns relative paths hosted on verses.quran.com.
    const path = raw.replace(/^\/+/, "");
    return `https://verses.quran.com/${path}`;
  }

  async getChapterRecitationAudioUrl(surah) {
    const url = `${PocketQuranManager.API_BASE}/chapter_recitations/${this._activeReciterId}/${surah}`;
    const data = await this.fetchJson(url, { timeoutMs: 15000 });
    const audioUrl = data?.audio_file?.audio_url || data?.audio_file?.url;
    return this.resolveRecitationAudioUrl(audioUrl);
  }

  /**
   * Play recitation for a specific ayah.
   */
  async playAyah(surah, ayah, { forceRestart = false } = {}) {
    if (!this._audioElement) return;

    // If same ayah is playing, just resume if paused
    if (
      !forceRestart &&
      this._playingAyah?.surah === surah &&
      this._playingAyah?.ayah === ayah &&
      this._audioElement.paused
    ) {
      this.enforceSingleRecitationAudioOwner();
      this._audioElement.play();
      return;
    }

    try {
      const cacheKey = this.buildRecitationCacheKey(surah, ayah);

      // If we already preloaded this ayah, swap to that audio element.
      const preloaded = this._preloadedAudios?.get(cacheKey);
      if (preloaded) {
        this._preloadedAudios.delete(cacheKey);
        this.setActiveAudioElement(preloaded);
      }

      const audioUrl = await this.getOrFetchAyahAudioSrc(surah, ayah, {
        timeoutMs: 10000,
      });

      if (!audioUrl) {
        console.error("PocketQuran: No audio file found for ayah", surah, ayah);
        return;
      }

      // Set up playback
      this._playingAyah = { surah, ayah };
      this._audioElement.volume = this._volume;
      if (this._audioElement.src !== audioUrl) {
        this._audioElement.src = audioUrl;
      }

      // Start warming the next ayahs immediately (don't await).
      // This reduces the chance of a buffer gap at the transition.
      if (this._isAutoplay) {
        this.prefetchNextAyahs(surah, ayah, this._prefetchAheadCount);
      }

      try {
        this.enforceSingleRecitationAudioOwner();
        await this._audioElement.play();
      } catch (e) {
        // Fallback: chapter recitation URL (usually download.quranicaudio.com)
        const chapterUrl = await this.getChapterRecitationAudioUrl(surah);
        if (chapterUrl) {
          this._audioElement.src = chapterUrl;
          this.enforceSingleRecitationAudioOwner();
          await this._audioElement.play();
        } else {
          throw e;
        }
      }

      // Show header controls
      this.showHeaderControls();
      this.updatePlaybackUI();

      // Scroll to the playing ayah if auto-scroll is enabled and viewing the same surah
      // Only scroll if the currently viewed surah matches the surah being played
      if (this._activeSurah === surah) {
        if (this._isAutoScroll || this._activeAyah !== ayah) {
          this.scrollToAyah(ayah, { persist: false, smooth: true });
        }
      }
    } catch (e) {
      console.error("PocketQuran: Failed to play ayah", e);
      this._isPlaying = false;
      this.updatePlaybackUI();
    }
  }

  /**
   * Toggle play/pause for the current or specified ayah.
   */
  togglePlayPause(surah, ayah) {
    if (!this._audioElement) return;

    if (
      this._isPlaying &&
      this._playingAyah?.surah === surah &&
      this._playingAyah?.ayah === ayah
    ) {
      this._audioElement.pause();
    } else {
      this.enableAutoplayOnFirstPlayIfNeeded();
      this.playAyah(surah, ayah);
    }
  }

  enableAutoplayOnFirstPlayIfNeeded() {
    // If this extension is being used for the first time (no persisted autoplay
    // preference yet), enable autoplay by default on the first play.
    try {
      const pq = this.storage.getSettings()?.pocketQuran || {};
      const hasExplicitAutoplay = Object.prototype.hasOwnProperty.call(
        pq,
        "reciterAutoplay",
      );
      if (hasExplicitAutoplay) return;
      if (this._isAutoplay) return;

      this._isAutoplay = true;
      this.persistPocketQuranSettings({ reciterAutoplay: true });
      this.updatePlaybackUI();
    } catch (e) {}
  }

  /**
   * Stop playback completely.
   */
  stopPlayback() {
    if (!this._audioElement) return;

    this._audioElement.pause();
    this._audioElement.currentTime = 0;
    this.clearRecitationAudioOwnerIfCurrent(this._audioElement);
    this._isPlaying = false;
    this._playingAyah = null;
    this._isAutoplay = false;

    this.resetRecitationCaches();

    if (
      this._recitationFloatingMode &&
      this._recitationFloatingModeReason === "auto"
    ) {
      this.disableRecitationFloating({ preserveManualOnly: true });
    }
    this._recitationFloatingManualOnly = false;

    this.updatePlaybackUI();
  }

  /**
   * Pause playback at the end of a surah but preserve the autoplay preference.
   * This prevents the UI's autoplay toggle from being cleared when a surah finishes.
   */
  finishPlaybackAtSurahEnd() {
    if (!this._audioElement) return;

    this._audioElement.pause();
    this._audioElement.currentTime = 0;
    this.clearRecitationAudioOwnerIfCurrent(this._audioElement);
    this._isPlaying = false;
    this._playingAyah = null;
    // Intentionally do NOT change this._isAutoplay: keep user's autoplay setting.
    this.resetRecitationCaches();

    if (
      this._recitationFloatingMode &&
      this._recitationFloatingModeReason === "auto"
    ) {
      this.disableRecitationFloating({ preserveManualOnly: true });
    }
    this._recitationFloatingManualOnly = false;

    this.updatePlaybackUI();
  }

  /**
   * Handle audio ended event.
   */
  handleAudioEnded() {
    if (this._isLooping && this._playingAyah) {
      // Loop: replay the same ayah
      this._audioElement.currentTime = 0;
      this.enforceSingleRecitationAudioOwner();
      this._audioElement.play();
      return;
    }

    if (this._isAutoplay && this._playingAyah) {
      // Autoplay: move to next ayah
      const { surah, ayah } = this._playingAyah;
      const chapter = this._chapters.find((c) => c.id === surah);
      const max =
        (Number.isFinite(chapter?.verses_count) && chapter.verses_count) || 286;

      if (ayah < max) {
        const nextAyah = ayah + 1;

        // Fast path: start the next ayah immediately from preload/cache.
        if (this.tryPlayAyahImmediateFromCache(surah, nextAyah)) {
          return;
        }

        // Fallback: normal async path (fetches metadata if needed)
        this.playAyah(surah, nextAyah);
      } else {
        if (this._isSurahLooping) {
          this.playAyah(surah, 1, { forceRestart: true });
          return;
        }

        // End of surah — stop audio but keep autoplay preference enabled.
        this.finishPlaybackAtSurahEnd();
      }
      return;
    }

    // Normal end
    this._isPlaying = false;
    this._playingAyah = null;

    if (
      this._recitationFloatingMode &&
      this._recitationFloatingModeReason === "auto"
    ) {
      this.disableRecitationFloating({ preserveManualOnly: true });
    }
    this._recitationFloatingManualOnly = false;

    this.updatePlaybackUI();
  }

  /**
   * Go to previous ayah in playback.
   */
  playPreviousAyah() {
    const fallback = { surah: this._activeSurah, ayah: this._activeAyah };
    const { surah, ayah } = this._playingAyah || fallback;
    if (ayah > 1) {
      this.playAyah(surah, ayah - 1);
    }
  }

  /**
   * Go to next ayah in playback.
   */
  playNextAyah() {
    const fallback = { surah: this._activeSurah, ayah: this._activeAyah };
    const { surah, ayah } = this._playingAyah || fallback;
    const chapter = this._chapters.find((c) => c.id === surah);
    const max =
      (Number.isFinite(chapter?.verses_count) && chapter.verses_count) || 286;

    if (ayah < max) {
      this.playAyah(surah, ayah + 1);
    }
  }

  /**
   * Set volume for audio playback.
   */
  setVolume(value) {
    this._volume = this.clampNumber(value, 0, 1, 1);
    if (this._audioElement) {
      this._audioElement.volume = this._volume;
    }
    this.persistPocketQuranSettings({ reciterVolume: this._volume });
  }

  /**
   * Toggle loop mode.
   */
  toggleLoop() {
    this._isLooping = !this._isLooping;
    this.persistPocketQuranSettings({ reciterLoop: this._isLooping });
    this.updatePlaybackUI();
  }

  /**
   * Toggle surah loop mode.
   */
  toggleSurahLoop() {
    this._isSurahLooping = !this._isSurahLooping;
    this.persistPocketQuranSettings({ reciterSurahLoop: this._isSurahLooping });
    this.updatePlaybackUI();
  }

  /**
   * Toggle autoplay mode.
   */
  toggleAutoplay() {
    this._isAutoplay = !this._isAutoplay;
    this.persistPocketQuranSettings({ reciterAutoplay: this._isAutoplay });
    this.updatePlaybackUI();

    // If turning on autoplay and not currently playing, start playback
    if (this._isAutoplay && !this._isPlaying) {
      this.playAyah(this._activeSurah, this._activeAyah);
    } else if (this._isAutoplay && this._playingAyah) {
      this.prefetchNextAyahs(
        this._playingAyah.surah,
        this._playingAyah.ayah,
        this._prefetchAheadCount,
      );
    }
  }

  /**
   * Toggle auto-scroll mode.
   */
  toggleAutoScroll() {
    this._isAutoScroll = !this._isAutoScroll;
    this.persistPocketQuranSettings({ reciterAutoScroll: this._isAutoScroll });
    this.updatePlaybackUI();

    // If enabling auto-scroll while playing, scroll to the currently playing ayah
    if (
      this._isAutoScroll &&
      this._playingAyah &&
      this._activeSurah === this._playingAyah.surah
    ) {
      this.scrollToAyah(this._playingAyah.ayah, {
        persist: false,
        smooth: true,
      });
    }
  }

  handleSettingsApplied(settings) {
    const normalized =
      settings && typeof settings === "object"
        ? settings
        : this.storage.getSettings();
    const pq = normalized?.pocketQuran || {};

    this._recitationFloatingEnabled = pq.recitationFloatingEnabled !== false;
    this._recitationAutoDockOnVisible =
      pq.recitationAutoDockOnVisible !== false;
    this._recitationFloatingAppearance =
      this.normalizeRecitationFloatingAppearance(
        pq.recitationFloatingAppearance,
      );

    if (!this._recitationFloatingEnabled) {
      this.unwatchRecitationControlsVisibility();
      if (this._recitationFloatingMode) {
        this.disableRecitationFloating({ preserveManualOnly: false });
      }
    } else if (this._headerControlsBox && !this._recitationFloatingMode) {
      this.watchRecitationControlsVisibility();
      this.maybeAutoFloatRecitationControls();
    }

    if (this._recitationFloatingMode && this._recitationAutoDockOnVisible) {
      this.watchRecitationAutoDockVisibility();
    } else {
      this.unwatchRecitationAutoDockVisibility();
    }

    this.syncRecitationFloatingAppearanceClass();
    this.updateRecitationFloatingButtons();
  }

  shouldAutoFloatRecitationControls() {
    return (
      this._recitationFloatingEnabled &&
      this._isPlaying &&
      !this._recitationFloatingManualOnly
    );
  }

  isElementMeaningfullyVisible(element) {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    const width = Math.max(0, rect.width);
    const height = Math.max(0, rect.height);
    if (!width || !height) return false;

    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight || 0;

    const visibleWidth =
      Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0);
    const visibleHeight =
      Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);

    if (visibleWidth <= 0 || visibleHeight <= 0) return false;

    const visibleArea = visibleWidth * visibleHeight;
    const totalArea = width * height;
    return visibleArea / totalArea >= 0.2;
  }

  ensureRecitationVisibilityObserver() {
    if (this._recitationVisibilityObserver) return;
    if (typeof IntersectionObserver !== "function") return;

    this._recitationVisibilityObserver = new IntersectionObserver(
      (entries) => {
        const entry = Array.isArray(entries) ? entries[0] : null;
        if (
          !entry ||
          !this._headerControlsBox ||
          this._recitationFloatingMode
        ) {
          return;
        }

        const isVisible =
          entry.isIntersecting === true && entry.intersectionRatio >= 0.2;
        if (!isVisible) {
          this.maybeAutoFloatRecitationControls();
        }
      },
      {
        threshold: [0, 0.2, 0.4, 0.6, 1],
      },
    );
  }

  watchRecitationControlsVisibility() {
    if (
      !this._headerControlsBox ||
      this._recitationFloatingMode ||
      !this._recitationFloatingEnabled
    ) {
      return;
    }

    this.ensureRecitationVisibilityObserver();
    if (!this._recitationVisibilityObserver) return;

    this._recitationVisibilityObserver.disconnect();
    this._recitationVisibilityObserver.observe(this._headerControlsBox);
  }

  unwatchRecitationControlsVisibility() {
    if (this._recitationVisibilityObserver) {
      this._recitationVisibilityObserver.disconnect();
    }
  }

  ensureRecitationAutoDockObserver() {
    if (this._recitationAutoDockObserver) return;
    if (typeof IntersectionObserver !== "function") return;

    this._recitationAutoDockObserver = new IntersectionObserver(
      (entries) => {
        const entry = Array.isArray(entries) ? entries[0] : null;
        if (
          !entry ||
          !this._headerControlsBox ||
          !this._recitationFloatingMode
        ) {
          return;
        }

        const isVisible =
          entry.isIntersecting === true && entry.intersectionRatio >= 0.2;

        if (!isVisible) {
          this._recitationAutoDockAwaitingReturn = true;
          return;
        }

        if (
          this._recitationAutoDockOnVisible &&
          this._recitationAutoDockAwaitingReturn
        ) {
          this.disableRecitationFloating({ preserveManualOnly: true });
        }
      },
      {
        threshold: [0, 0.2, 0.4, 0.6, 1],
      },
    );
  }

  watchRecitationAutoDockVisibility() {
    if (!this._recitationFloatingMode || !this._recitationAutoDockOnVisible) {
      return;
    }

    const target =
      this.card?.querySelector(".pocket-quran-header") || this.card;
    if (!target) return;

    this.ensureRecitationAutoDockObserver();
    if (!this._recitationAutoDockObserver) return;

    this._recitationAutoDockObserver.disconnect();
    this._recitationAutoDockObserver.observe(target);

    this._recitationAutoDockAwaitingReturn =
      !this.isElementMeaningfullyVisible(target);
  }

  unwatchRecitationAutoDockVisibility() {
    if (this._recitationAutoDockObserver) {
      this._recitationAutoDockObserver.disconnect();
    }
    this._recitationAutoDockAwaitingReturn = false;
  }

  maybeAutoFloatRecitationControls() {
    if (!this.shouldAutoFloatRecitationControls()) return;
    if (!this._headerControlsBox || this._recitationFloatingMode) return;
    if (this.isElementMeaningfullyVisible(this._headerControlsBox)) return;

    this.enableRecitationFloating({ source: "auto" });
  }

  ensureRecitationControlsAttachedToHeader() {
    const header = this.card?.querySelector(".pocket-quran-header");
    if (!header || !this._headerControlsBox) return false;

    const title = header.querySelector(".card-title");
    if (title) {
      title.after(this._headerControlsBox);
    } else {
      header.appendChild(this._headerControlsBox);
    }

    header.classList.add("pq-has-recitation-controls");
    return true;
  }

  positionRecitationFloatingPanel() {
    if (!this._headerControlsBox || !this._recitationFloatingMode) return;

    const box = this._headerControlsBox;
    const margin = 12;

    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight || 0;

    const rect = box.getBoundingClientRect();
    const panelWidth = Math.max(
      260,
      Math.round(rect.width || box.offsetWidth || 360),
    );
    const panelHeight = Math.max(
      80,
      Math.round(rect.height || box.offsetHeight || 90),
    );

    const hasStoredPosition =
      Number.isFinite(this._recitationFloatingPosition?.left) &&
      Number.isFinite(this._recitationFloatingPosition?.top);

    let left = hasStoredPosition
      ? this._recitationFloatingPosition.left
      : margin;
    let top = hasStoredPosition
      ? this._recitationFloatingPosition.top
      : Math.max(margin, viewportHeight - panelHeight - margin);

    if (!hasStoredPosition) {
      const attribution = document.getElementById("bg-attribution");
      if (attribution) {
        const attrRect = attribution.getBoundingClientRect();
        const overlapsHoriz =
          left < attrRect.right + margin &&
          left + panelWidth > attrRect.left - margin;
        const overlapsVert =
          top < attrRect.bottom + margin &&
          top + panelHeight > attrRect.top - margin;

        if (overlapsHoriz && overlapsVert) {
          top = Math.max(margin, attrRect.top - panelHeight - margin);
        }
      }
    }

    left = Math.max(
      margin,
      Math.min(left, viewportWidth - panelWidth - margin),
    );
    top = Math.max(
      margin,
      Math.min(top, viewportHeight - panelHeight - margin),
    );

    this._recitationFloatingPosition = {
      left: Math.round(left),
      top: Math.round(top),
    };

    box.style.left = `${this._recitationFloatingPosition.left}px`;
    box.style.top = `${this._recitationFloatingPosition.top}px`;
  }

  startRecitationFloatingDrag(event) {
    if (!this._headerControlsBox || !this._recitationFloatingMode) return;

    const box = this._headerControlsBox;
    if (!(event instanceof PointerEvent)) return;

    if (
      event.button !== 0 &&
      event.pointerType !== "touch" &&
      event.pointerType !== "pen"
    ) {
      return;
    }

    const interactiveTarget = event.target?.closest?.(
      "button, input, select, textarea, a, label, [role='button'], .pq-recitation-ayah, .pq-recitation-reciter, .pq-volume-control",
    );
    if (interactiveTarget) return;

    const boxRect = box.getBoundingClientRect();
    const parsedLeft = Number.parseFloat(box.style.left);
    const parsedTop = Number.parseFloat(box.style.top);
    const startLeft = Number.isFinite(parsedLeft) ? parsedLeft : boxRect.left;
    const startTop = Number.isFinite(parsedTop) ? parsedTop : boxRect.top;

    this.stopRecitationFloatingDrag();

    const dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft,
      startTop,
      onPointerMove: null,
      onPointerUp: null,
    };

    dragState.onPointerMove = (moveEvent) => {
      if (moveEvent.pointerId !== dragState.pointerId) return;
      if (!this._headerControlsBox || !this._recitationFloatingMode) {
        this.stopRecitationFloatingDrag();
        return;
      }

      const deltaX = moveEvent.clientX - dragState.startX;
      const deltaY = moveEvent.clientY - dragState.startY;

      this._recitationFloatingPosition = {
        left: dragState.startLeft + deltaX,
        top: dragState.startTop + deltaY,
      };
      this.positionRecitationFloatingPanel();
    };

    dragState.onPointerUp = (upEvent) => {
      if (upEvent.pointerId !== dragState.pointerId) return;
      this.stopRecitationFloatingDrag();
    };

    this._recitationFloatingDrag = dragState;
    box.classList.add("pq-recitation-controls-dragging");

    if (typeof box.setPointerCapture === "function") {
      try {
        box.setPointerCapture(event.pointerId);
      } catch (err) {
        // Ignore unsupported capture failures.
      }
    }

    window.addEventListener("pointermove", dragState.onPointerMove, {
      passive: true,
    });
    window.addEventListener("pointerup", dragState.onPointerUp);
    window.addEventListener("pointercancel", dragState.onPointerUp);

    event.preventDefault();
  }

  stopRecitationFloatingDrag() {
    const dragState = this._recitationFloatingDrag;
    if (!dragState) return;

    window.removeEventListener("pointermove", dragState.onPointerMove);
    window.removeEventListener("pointerup", dragState.onPointerUp);
    window.removeEventListener("pointercancel", dragState.onPointerUp);

    const box = this._headerControlsBox;
    if (box) {
      box.classList.remove("pq-recitation-controls-dragging");
      if (typeof box.releasePointerCapture === "function") {
        try {
          box.releasePointerCapture(dragState.pointerId);
        } catch (err) {
          // Ignore unsupported release failures.
        }
      }
    }

    this._recitationFloatingDrag = null;
  }

  syncRecitationFloatingAppearanceClass() {
    if (!this._headerControlsBox) return;

    const useOpaqueMode =
      this._recitationFloatingMode &&
      this._recitationFloatingAppearance === "opaque";

    this._headerControlsBox.classList.toggle(
      "pq-recitation-controls-floating-opaque",
      useOpaqueMode,
    );
  }

  enableRecitationFloating({ source = "manual" } = {}) {
    if (!this._recitationFloatingEnabled) return;

    if (!this._headerControlsBox) {
      this.showHeaderControls();
    }
    if (!this._headerControlsBox) return;

    if (this._recitationFloatingMode) {
      this._recitationFloatingModeReason = source;
      this.syncRecitationFloatingAppearanceClass();
      this.positionRecitationFloatingPanel();
      if (this._recitationAutoDockOnVisible) {
        this.watchRecitationAutoDockVisibility();
      }
      this.updateRecitationFloatingButtons();
      return;
    }

    this.unwatchRecitationControlsVisibility();

    const header = this.card?.querySelector(".pocket-quran-header");
    if (header) {
      header.classList.remove("pq-has-recitation-controls");
    }

    document.body.appendChild(this._headerControlsBox);
    this._headerControlsBox.classList.add("pq-recitation-controls-floating");

    this._recitationFloatingMode = true;
    this._recitationFloatingModeReason = source;

    this.syncRecitationFloatingAppearanceClass();
    this.positionRecitationFloatingPanel();
    if (this._recitationAutoDockOnVisible) {
      this.watchRecitationAutoDockVisibility();
    } else {
      this.unwatchRecitationAutoDockVisibility();
    }
    this.updateRecitationFloatingButtons();
  }

  disableRecitationFloating({ preserveManualOnly = false } = {}) {
    if (!this._headerControlsBox) return;

    this.stopRecitationFloatingDrag();
    this._headerControlsBox.classList.remove("pq-recitation-controls-floating");
    this._headerControlsBox.classList.remove(
      "pq-recitation-controls-floating-opaque",
    );
    this._headerControlsBox.style.removeProperty("left");
    this._headerControlsBox.style.removeProperty("top");
    this.unwatchRecitationAutoDockVisibility();

    this._recitationFloatingMode = false;
    this._recitationFloatingModeReason = null;
    if (!preserveManualOnly) {
      this._recitationFloatingManualOnly = false;
    }

    this.ensureRecitationControlsAttachedToHeader();

    if (this._recitationFloatingEnabled) {
      this.watchRecitationControlsVisibility();
      this.maybeAutoFloatRecitationControls();
    }

    this.updateRecitationFloatingButtons();
  }

  minimizeRecitationFloating() {
    this._recitationFloatingManualOnly = true;
    this.disableRecitationFloating({ preserveManualOnly: true });
  }

  toggleRecitationFloating() {
    if (!this._recitationFloatingEnabled) return;

    if (this._recitationFloatingMode) {
      this.disableRecitationFloating({ preserveManualOnly: true });
      return;
    }

    this.enableRecitationFloating({ source: "manual" });
  }

  updateRecitationFloatingButtons() {
    if (!this._headerControlsBox) return;

    const floatToggleBtn = this._headerControlsBox.querySelector(
      ".pq-recitation-float-toggle-btn",
    );

    if (floatToggleBtn) {
      const label = this._recitationFloatingMode
        ? "Dock recitation controls"
        : "Detach recitation controls";

      floatToggleBtn.hidden = !this._recitationFloatingEnabled;
      floatToggleBtn.disabled = !this._recitationFloatingEnabled;
      floatToggleBtn.textContent = this._recitationFloatingMode ? "↙" : "↗";
      floatToggleBtn.title = label;
      floatToggleBtn.setAttribute("aria-label", label);
      floatToggleBtn.setAttribute(
        "aria-pressed",
        this._recitationFloatingMode ? "true" : "false",
      );
    }

    this._headerControlsBox.classList.toggle(
      "pq-recitation-controls-manual-only",
      this._recitationFloatingManualOnly,
    );
  }

  getSurahNameSimple(surah) {
    const id = parseInt(surah, 10);
    const chapter = this._chapters?.find((c) => c.id === id);
    return (
      chapter?.name_simple || `Surah ${Number.isFinite(id) ? id : ""}`.trim()
    );
  }

  formatRecitationAyahLabel(surah, ayah) {
    const s = parseInt(surah, 10);
    const a = parseInt(ayah, 10);
    const surahName = this.getSurahNameSimple(s);
    const surahPrefix = Number.isFinite(s) ? `${s}. ` : "";
    const ayahPart = Number.isFinite(a) ? `Ayah ${a}` : "Ayah";
    return `${surahPrefix}${surahName} · ${ayahPart}`;
  }

  buildPopupSyncState() {
    const activeSurah = this.clampNumber(this._activeSurah, 1, 114, 1);
    const chapter = this._chapters?.find((c) => c.id === activeSurah);
    const maxAyah =
      (Number.isFinite(chapter?.verses_count) && chapter.verses_count) || 286;
    const activeAyah = this.clampNumber(this._activeAyah, 1, maxAyah, 1);

    const recitationTarget = this._playingAyah || {
      surah: activeSurah,
      ayah: activeAyah,
    };
    const recitationSurah = this.clampNumber(
      recitationTarget?.surah,
      1,
      114,
      activeSurah,
    );
    const recitationChapter = this._chapters?.find(
      (c) => c.id === recitationSurah,
    );
    const recitationMaxAyah =
      (Number.isFinite(recitationChapter?.verses_count) &&
        recitationChapter.verses_count) ||
      286;
    const recitationAyah = this.clampNumber(
      recitationTarget?.ayah,
      1,
      recitationMaxAyah,
      activeAyah,
    );

    return {
      source: "dashboard",
      updatedAt: Date.now(),
      activeSurah,
      activeAyah,
      recitationAyah: {
        surah: recitationSurah,
        ayah: recitationAyah,
      },
      isPlaying: this._isPlaying === true,
      reciterId: this._activeReciterId,
      reciterName: this.getActiveReciterName(),
      volume: this.clampNumber(this._volume, 0, 1, 1),
      isLooping: this._isLooping === true,
      isSurahLooping: this._isSurahLooping === true,
      isAutoplay: this._isAutoplay === true,
      isAutoScroll: this._isAutoScroll === true,
      translationResourceId: this.normalizeTranslationId(
        this._activeTranslationId,
      ),
    };
  }

  publishPopupSyncState() {
    if (!this.storage) return;

    try {
      this.storage.set(this._popupSyncStateKey, this.buildPopupSyncState());
    } catch (e) {
      // no-op
    }
  }

  async applyPopupAyahSelection(surahNumber, ayahNumber) {
    const targetSurah = this.clampNumber(
      surahNumber,
      1,
      114,
      this._activeSurah,
    );

    if (targetSurah !== this._activeSurah) {
      await this.setActiveSurah(targetSurah, {
        preserveAyah: false,
        autoScroll: false,
        preserveDashboardScroll: true,
      });
    }

    const targetAyah = this.clampNumber(
      ayahNumber,
      1,
      this.getActiveSurahAyahCount() || 286,
      this._activeAyah,
    );

    const wasPlaying = this._isPlaying === true;

    this.scrollToAyah(targetAyah, { persist: true, smooth: true });
    this._playingAyah = { surah: targetSurah, ayah: targetAyah };

    if (!this._headerControlsBox) {
      this.showHeaderControls();
    }

    if (wasPlaying) {
      await this.playAyah(targetSurah, targetAyah, { forceRestart: true });
      return;
    }

    try {
      if (this._audioElement) {
        this._audioElement.pause();
        this._audioElement.currentTime = 0;
      }
    } catch (e) {
      // no-op
    }

    this._isPlaying = false;
    this.updatePlaybackUI();
  }

  handlePopupCommandStorageEvent(event) {
    if (!event || (event.storageArea && event.storageArea !== localStorage)) {
      return;
    }

    const commandStorageKey = `${this.storage.prefix}${this._popupSyncCommandKey}`;
    if (event.key !== commandStorageKey || !event.newValue) return;

    let command = null;
    try {
      command = JSON.parse(event.newValue);
    } catch (e) {
      return;
    }

    if (!command || typeof command !== "object") return;

    const commandId = command.id == null ? "" : String(command.id);
    if (commandId && commandId === this._lastPopupCommandId) return;

    this._lastPopupCommandId = commandId || null;
    void this.handlePopupCommand(command);
  }

  async handlePopupCommand(command) {
    if (!command || typeof command !== "object") return;

    const action = String(command.action || "").trim();
    const payload =
      command.payload && typeof command.payload === "object"
        ? command.payload
        : {};

    if (!action) return;

    try {
      switch (action) {
        case "togglePlayPause": {
          const target = this._playingAyah || {
            surah: this._activeSurah,
            ayah: this._activeAyah,
          };
          this.togglePlayPause(target.surah, target.ayah);
          break;
        }
        case "playPreviousAyah":
          this.playPreviousAyah();
          break;
        case "playNextAyah":
          this.playNextAyah();
          break;
        case "stopPlayback":
          this.stopPlayback();
          break;
        case "setVolume":
          this.setVolume(this.clampNumber(payload.volume, 0, 1, this._volume));
          break;
        case "toggleLoopAyah":
          this.toggleLoop();
          break;
        case "toggleLoopSurah":
          this.toggleSurahLoop();
          break;
        case "toggleAutoplay":
          this.toggleAutoplay();
          break;
        case "toggleAutoScroll":
          this.toggleAutoScroll();
          break;
        case "selectAyah":
          await this.applyPopupAyahSelection(payload.surah, payload.ayah);
          break;
        case "selectReciter":
          this.selectReciter(payload.reciterId);
          break;
        default:
          return;
      }
    } finally {
      this.publishPopupSyncState();
    }
  }

  /**
   * Select a reciter.
   */
  selectReciter(reciterId) {
    const id = parseInt(reciterId, 10);
    if (!Number.isFinite(id)) return;

    this._activeReciterId = id;
    this.persistPocketQuranSettings({ reciterId: id });

    this.resetRecitationCaches();

    const isActivelyPlaying =
      this._isPlaying ||
      (this._audioElement &&
        this._audioElement.paused === false &&
        this._audioElement.ended === false);

    const targetAyah = this._playingAyah || {
      surah: this._activeSurah,
      ayah: this._activeAyah,
    };

    if (
      isActivelyPlaying &&
      Number.isFinite(targetAyah?.surah) &&
      Number.isFinite(targetAyah?.ayah)
    ) {
      try {
        this._audioElement.pause();
        this._audioElement.currentTime = 0;
      } catch (e) {
        // no-op
      }
      this.playAyah(targetAyah.surah, targetAyah.ayah, {
        forceRestart: true,
      });
    }

    this.closeReciterModal();
    this.updatePlaybackUI();
  }

  /**
   * Create the header controls box.
   */
  showHeaderControls() {
    const header = this.card?.querySelector(".pocket-quran-header");
    if (!header) return;

    // Keep DOM stable: if controls already exist, just refresh state.
    if (this._headerControlsBox) {
      if (
        this._recitationFloatingMode ||
        header.contains(this._headerControlsBox)
      ) {
        if (!this._recitationFloatingMode) {
          header.classList.add("pq-has-recitation-controls");
        }
        this.updateRecitationFloatingButtons();
        this.updatePlaybackUI();
        return;
      }

      this.hideHeaderControls();
    }

    const controlsBox = document.createElement("div");
    controlsBox.className = "pq-recitation-controls";
    controlsBox.innerHTML = `
      <div class="pq-recitation-info">
        <span class="pq-recitation-ayah">${this.formatRecitationAyahLabel(
          this._playingAyah?.surah ?? this._activeSurah,
          this._playingAyah?.ayah ?? this._activeAyah ?? 1,
        )}</span>
        <span class="pq-recitation-reciter">${this.getActiveReciterName()}</span>
      </div>
      <div class="pq-recitation-buttons">
        <button type="button" class="pq-recitation-btn pq-prev-btn" title="Previous ayah">
          <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
        </button>
        <button type="button" class="pq-recitation-btn pq-play-pause-btn" title="Play/Pause">
          ${
            this._isPlaying
              ? '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
              : '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>'
          }
        </button>
        <button type="button" class="pq-recitation-btn pq-next-btn" title="Next ayah">
          <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
        </button>
        <button type="button" class="pq-recitation-btn pq-stop-btn" title="Stop">
          <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 6h12v12H6z"/></svg>
        </button>
      </div>
      <div class="pq-recitation-options">
        <div class="pq-volume-control">
          <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
          <input type="range" class="pq-volume-slider" min="0" max="100" value="${Math.round(
            this._volume * 100,
          )}" />
        </div>
        <button type="button" class="pq-recitation-btn pq-loop-btn pq-loop-surah-btn ${
          this._isSurahLooping ? "active" : ""
        }" title="Loop surah">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/><path fill="currentColor" d="M17.4 3.2h3.4v1.6H19v1.8h-1.6z"/></svg>
        </button>
        <button type="button" class="pq-recitation-btn pq-loop-btn pq-loop-ayah-btn ${
          this._isLooping ? "active" : ""
        }" title="Loop current ayah">
          <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
        </button>
        <button type="button" class="pq-recitation-btn pq-autoplay-btn ${
          this._isAutoplay ? "active" : ""
        }" title="Autoplay through surah">
          <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>
        </button>
        <button type="button" class="pq-recitation-btn pq-autoscroll-btn ${
          this._isAutoScroll ? "active" : ""
        }" title="Auto-scroll to next ayah" aria-pressed="${
          this._isAutoScroll ? "true" : "false"
        }">
          <svg viewBox="0 -0.5 25 25" width="21" height="21" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M10.7452 16.2194C10.995 15.889 10.9298 15.4186 10.5994 15.1688C10.269 14.919 9.79864 14.9842 9.54879 15.3146L10.7452 16.2194ZM6.72579 19.0476C6.47595 19.378 6.54124 19.8484 6.87162 20.0982C7.202 20.3481 7.67236 20.2828 7.92221 19.9524L6.72579 19.0476ZM6.574 19.5C6.574 19.9142 6.90979 20.25 7.324 20.25C7.73821 20.25 8.074 19.9142 8.074 19.5H6.574ZM8.074 5.5C8.074 5.08579 7.73821 4.75 7.324 4.75C6.90979 4.75 6.574 5.08579 6.574 5.5H8.074ZM6.72587 19.9525C6.97577 20.2828 7.44614 20.348 7.77648 20.0981C8.10682 19.8482 8.17203 19.3779 7.92213 19.0475L6.72587 19.9525ZM5.09813 15.3145C4.84823 14.9842 4.37786 14.919 4.04752 15.1689C3.71718 15.4188 3.65197 15.8891 3.90187 16.2195L5.09813 15.3145ZM11.088 4.75C10.6738 4.75 10.338 5.08579 10.338 5.5C10.338 5.91421 10.6738 6.25 11.088 6.25V4.75ZM20.5 6.25C20.9142 6.25 21.25 5.91421 21.25 5.5C21.25 5.08579 20.9142 4.75 20.5 4.75V6.25ZM11.088 7.55C10.6738 7.55 10.338 7.88579 10.338 8.3C10.338 8.71421 10.6738 9.05 11.088 9.05V7.55ZM18.617 9.05C19.0312 9.05 19.367 8.71421 19.367 8.3C19.367 7.88579 19.0312 7.55 18.617 7.55V9.05ZM11.088 10.35C10.6738 10.35 10.338 10.6858 10.338 11.1C10.338 11.5142 10.6738 11.85 11.088 11.85V10.35ZM16.735 11.85C17.1492 11.85 17.485 11.5142 17.485 11.1C17.485 10.6858 17.1492 10.35 16.735 10.35V11.85ZM9.54879 15.3146L6.72579 19.0476L7.92221 19.9524L10.7452 16.2194L9.54879 15.3146ZM8.074 19.5V5.5H6.574V19.5H8.074ZM7.92213 19.0475L5.09813 15.3145L3.90187 16.2195L6.72587 19.9525L7.92213 19.0475ZM11.088 6.25H20.5V4.75H11.088V6.25ZM11.088 9.05H18.617V7.55H11.088V9.05ZM11.088 11.85H16.735V10.35H11.088V11.85Z" fill="currentColor"></path> </g></svg>
        </button>
        <button type="button" class="pq-recitation-btn pq-autoscroll-btn active pq-floating-inline-btn pq-recitation-float-toggle-btn" title="Detach recitation controls" aria-label="Detach recitation controls" aria-pressed="false">↗</button>
        <button type="button" class="pq-recitation-btn pq-autoscroll-btn active pq-floating-inline-btn pq-recitation-close-btn" title="Close" aria-label="Close recitation controls">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </div>
    `;

    this._headerControlsBox = controlsBox;
    this.ensureRecitationControlsAttachedToHeader();

    controlsBox.addEventListener("pointerdown", (event) => {
      this.startRecitationFloatingDrag(event);
    });

    // Add event listeners
    controlsBox
      .querySelector(".pq-prev-btn")
      .addEventListener("click", () => this.playPreviousAyah());
    controlsBox
      .querySelector(".pq-next-btn")
      .addEventListener("click", () => this.playNextAyah());
    controlsBox
      .querySelector(".pq-play-pause-btn")
      .addEventListener("click", () => {
        const target = this._playingAyah || {
          surah: this._activeSurah,
          ayah: this._activeAyah,
        };
        this.togglePlayPause(target.surah, target.ayah);
      });
    controlsBox
      .querySelector(".pq-recitation-buttons .pq-stop-btn")
      .addEventListener("click", () => this.stopPlayback());
    controlsBox
      .querySelector(".pq-loop-ayah-btn")
      .addEventListener("click", () => this.toggleLoop());
    controlsBox
      .querySelector(".pq-loop-surah-btn")
      .addEventListener("click", () => this.toggleSurahLoop());
    controlsBox
      .querySelector(".pq-autoplay-btn")
      .addEventListener("click", () => this.toggleAutoplay());
    controlsBox
      .querySelector(".pq-autoscroll-btn")
      .addEventListener("click", () => this.toggleAutoScroll());
    const reciterBtn = controlsBox.querySelector(".pq-reciter-btn");
    if (reciterBtn) {
      reciterBtn.addEventListener("click", () => this.openReciterModal());
    }
    controlsBox
      .querySelector(".pq-recitation-reciter")
      .addEventListener("click", () => this.openReciterModal());

    const floatToggleBtn = controlsBox.querySelector(
      ".pq-recitation-float-toggle-btn",
    );
    if (floatToggleBtn) {
      floatToggleBtn.addEventListener("click", () => {
        this.toggleRecitationFloating();
      });
    }

    const ayahInfoEl = controlsBox.querySelector(".pq-recitation-ayah");
    if (ayahInfoEl) {
      ayahInfoEl.addEventListener("click", async () => {
        const target = this._playingAyah;
        if (!target) return;

        try {
          if (this._activeSurah !== target.surah) {
            await this.setActiveSurah(target.surah, {
              preserveAyah: false,
              autoScroll: false,
              preserveDashboardScroll: true,
            });
          }

          this.scrollToAyah(target.ayah, { persist: true, smooth: true });
        } catch (e) {
          // no-op
        }
      });
    }

    controlsBox
      .querySelector(".pq-recitation-close-btn")
      .addEventListener("click", () => {
        // Ensure playback stops when user closes the recitation controls
        this.stopPlayback();
        this.hideHeaderControls();
      });

    const volumeSlider = controlsBox.querySelector(".pq-volume-slider");
    volumeSlider.addEventListener("input", (e) => {
      this.setVolume(parseInt(e.target.value, 10) / 100);
    });

    this.updateRecitationFloatingButtons();
    this.watchRecitationControlsVisibility();
    this.maybeAutoFloatRecitationControls();
  }

  /**
   * Hide the header controls box.
   */
  hideHeaderControls() {
    this.unwatchRecitationControlsVisibility();
    this.unwatchRecitationAutoDockVisibility();
    this.stopRecitationFloatingDrag();

    if (this._headerControlsBox) {
      this._headerControlsBox.classList.remove(
        "pq-recitation-controls-floating",
      );
      this._headerControlsBox.classList.remove(
        "pq-recitation-controls-floating-opaque",
      );
      this._headerControlsBox.style.removeProperty("left");
      this._headerControlsBox.style.removeProperty("top");
      this._headerControlsBox.remove();
      this._headerControlsBox = null;
    }

    this._recitationFloatingMode = false;
    this._recitationFloatingModeReason = null;
    this._recitationFloatingManualOnly = false;

    const header = this.card?.querySelector(".pocket-quran-header");
    if (header) {
      header.classList.remove("pq-has-recitation-controls");
    }
  }

  /**
   * Update the playback UI elements.
   */
  updatePlaybackUI() {
    // Update header controls
    if (this._headerControlsBox) {
      const playPauseBtn =
        this._headerControlsBox.querySelector(".pq-play-pause-btn");
      if (playPauseBtn) {
        playPauseBtn.innerHTML = this._isPlaying
          ? '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
          : '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
      }

      const loopAyahBtn =
        this._headerControlsBox.querySelector(".pq-loop-ayah-btn");
      if (loopAyahBtn) {
        loopAyahBtn.classList.toggle("active", this._isLooping);
      }

      const loopSurahBtn =
        this._headerControlsBox.querySelector(".pq-loop-surah-btn");
      if (loopSurahBtn) {
        loopSurahBtn.classList.toggle("active", this._isSurahLooping);
      }

      const autoplayBtn =
        this._headerControlsBox.querySelector(".pq-autoplay-btn");
      if (autoplayBtn) {
        autoplayBtn.classList.toggle("active", this._isAutoplay);
      }

      const autoscrollBtn =
        this._headerControlsBox.querySelector(".pq-autoscroll-btn");
      if (autoscrollBtn) {
        autoscrollBtn.classList.toggle("active", this._isAutoScroll);
        autoscrollBtn.setAttribute(
          "aria-pressed",
          this._isAutoScroll ? "true" : "false",
        );
      }

      const ayahInfo = this._headerControlsBox.querySelector(
        ".pq-recitation-ayah",
      );
      if (ayahInfo) {
        const fallback = { surah: this._activeSurah, ayah: this._activeAyah };
        const target = this._playingAyah || fallback;
        ayahInfo.textContent = this.formatRecitationAyahLabel(
          target?.surah,
          target?.ayah,
        );
      }

      const reciterInfo = this._headerControlsBox.querySelector(
        ".pq-recitation-reciter",
      );
      if (reciterInfo) {
        reciterInfo.textContent = this.getActiveReciterName();
      }

      this.updateRecitationFloatingButtons();

      if (this._recitationFloatingMode) {
        this.positionRecitationFloatingPanel();
      } else if (this._recitationFloatingEnabled) {
        this.watchRecitationControlsVisibility();
        this.maybeAutoFloatRecitationControls();
      }
    }

    // Update ayah play buttons
    this.updateAyahPlayButtons();

    this.publishPopupSyncState();
  }

  /**
   * Update play buttons on rendered ayahs.
   */
  updateAyahPlayButtons() {
    if (!this._virtualContent) return;

    const playButtons =
      this._virtualContent.querySelectorAll(".pq-ayah-play-btn");
    playButtons.forEach((btn) => {
      const ayahEl = btn.closest(".pocket-quran-ayah");
      if (!ayahEl) return;

      const ayahNumber = parseInt(ayahEl.dataset.ayah, 10);
      const isThisAyahPlaying =
        this._isPlaying &&
        this._playingAyah?.surah === this._activeSurah &&
        this._playingAyah?.ayah === ayahNumber;

      btn.classList.toggle("playing", isThisAyahPlaying);
      btn.innerHTML = isThisAyahPlaying
        ? '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
        : '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
      btn.title = isThisAyahPlaying ? "Pause" : "Play recitation";
    });
  }

  /**
   * Get the active reciter's name.
   */
  getActiveReciterName() {
    const reciter = this._reciters.find((r) => r.id === this._activeReciterId);
    if (reciter) {
      return reciter.style
        ? `${reciter.name} (${reciter.style})`
        : reciter.name;
    }
    return "Unknown Reciter";
  }

  /**
   * Create the reciter selection modal.
   */
  createReciterModal() {
    if (document.getElementById("pqReciterModal")) return;

    const modal = document.createElement("div");
    modal.id = "pqReciterModal";
    modal.className = "pq-bookmark-modal";
    modal.innerHTML = `
      <div class="pq-bookmark-modal-content pq-translation-modal-content">
        <div class="pq-bookmark-modal-header">
          <h3 class="pq-bookmark-modal-title">🎙️ Select Reciter</h3>
          <button type="button" class="pq-bookmark-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="pq-bookmark-modal-body">
          <div class="pq-bookmark-search">
            <input type="text" class="pq-bookmark-search-input pq-reciter-search" placeholder="Search reciters..." />
          </div>
          <div class="pq-reciter-list"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this._reciterModal = modal;

    // Close button
    modal
      .querySelector(".pq-bookmark-modal-close")
      .addEventListener("click", () => {
        this.closeReciterModal();
      });

    // Click outside to close
    this._bindOverlayCloseBehavior(modal, () => this.closeReciterModal());

    // Search input
    const searchInput = modal.querySelector(".pq-reciter-search");
    searchInput.addEventListener("input", () => {
      this.renderReciterList(searchInput.value);
    });

    // Keyboard navigation
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeReciterModal();
      }
    });
  }

  /**
   * Open the reciter selection modal.
   */
  openReciterModal() {
    const modal = document.getElementById("pqReciterModal");
    if (!modal) return;

    const searchInput = modal.querySelector(".pq-reciter-search");
    if (searchInput) searchInput.value = "";

    this.renderReciterList("");
    modal.classList.add("active");

    // Focus search input
    setTimeout(() => {
      if (searchInput) searchInput.focus();
    }, 100);
  }

  /**
   * Close the reciter selection modal.
   */
  closeReciterModal() {
    const modal = document.getElementById("pqReciterModal");
    if (modal) modal.classList.remove("active");
  }

  /**
   * Render the reciter list in the modal.
   */
  renderReciterList(query = "") {
    const modal = document.getElementById("pqReciterModal");
    if (!modal) return;

    const container = modal.querySelector(".pq-reciter-list");
    if (!container) return;

    const q = String(query || "")
      .toLowerCase()
      .trim();

    // Filter reciters by query
    const filtered = this._reciters.filter((r) => {
      if (!q) return true;
      const name = String(r.name || "").toLowerCase();
      const style = String(r.style || "").toLowerCase();
      return name.includes(q) || style.includes(q);
    });

    // Build HTML
    let html = "";
    for (const r of filtered) {
      const isActive = r.id === this._activeReciterId;
      const displayName = r.style ? `${r.name} (${r.style})` : r.name;
      html += `<button type="button" class="pq-translation-item ${
        isActive ? "active" : ""
      }" data-reciter-id="${r.id}">
        <span class="pq-translation-name">${this.escapeHtml(displayName)}</span>
        ${
          isActive
            ? `<span class="pq-translation-check">${this._getIcon("✓", {
                size: 14,
              })}</span>`
            : ""
        }
      </button>`;
    }

    if (!html) {
      html = `<div class="pq-translation-empty">No reciters found for "${this.escapeHtml(
        query,
      )}"</div>`;
    }

    container.innerHTML = html;

    // Add click handlers
    container.querySelectorAll(".pq-translation-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.reciterId, 10);
        if (Number.isFinite(id)) {
          this.selectReciter(id);
        }
      });
    });

    // Scroll active reciter into view
    const activeItem = container.querySelector(".pq-translation-item.active");
    if (activeItem && !q) {
      setTimeout(() => {
        activeItem.scrollIntoView({ block: "center", behavior: "auto" });
      }, 50);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  renderLoading(message) {
    if (!this.contentEl) return;
    this.destroyVirtualization();
    this.contentEl.innerHTML = "";

    const containerHeight =
      this._lastVirtualContainerHeightPx &&
      this._lastVirtualContainerHeightPx > 0
        ? this._lastVirtualContainerHeightPx
        : 1000;

    const contentMinHeight =
      this._lastVirtualContentHeightPx && this._lastVirtualContentHeightPx > 0
        ? this._lastVirtualContentHeightPx
        : Math.max(320, containerHeight - 120);

    const spacerHeight =
      this._lastVirtualSpacerHeightPx && this._lastVirtualSpacerHeightPx > 0
        ? this._lastVirtualSpacerHeightPx
        : Math.max(1400, containerHeight * 2);

    const virtualContainer = document.createElement("div");
    virtualContainer.className = "pq-virtual-container";
    virtualContainer.style.height = `${containerHeight}px`;

    const spacer = document.createElement("div");
    spacer.className = "pq-virtual-spacer";
    spacer.style.height = `${spacerHeight}px`;

    const content = document.createElement("div");
    content.className = "pq-virtual-content pq-virtual-content-loading";
    content.style.transform = "translateY(0px)";
    content.style.minHeight = `${contentMinHeight}px`;

    const label = document.createElement("div");
    label.className = "pq-loading-label";

    const spinner = document.createElement("div");
    spinner.className = "pocket-quran-spinner";
    spinner.setAttribute("aria-hidden", "true");

    const text = document.createElement("div");
    text.className = "pocket-quran-loading-text";
    text.textContent = message || "Loading…";

    label.appendChild(spinner);
    label.appendChild(text);
    content.appendChild(label);

    const stack = document.createElement("div");
    stack.className = "pq-skeleton-stack";

    const widths = [
      { ar: "88%", tr: "66%" },
      { ar: "92%", tr: "58%" },
      { ar: "84%", tr: "72%" },
      { ar: "90%", tr: "62%" },
      { ar: "86%", tr: "70%" },
      { ar: "94%", tr: "54%" },
    ];

    for (let i = 0; i < widths.length; i++) {
      const card = document.createElement("div");
      card.className = "pq-skeleton-ayah";

      const ar = document.createElement("div");
      ar.className = "pq-skeleton-line pq-skel-ar";
      ar.style.width = widths[i].ar;

      const tr = document.createElement("div");
      tr.className = "pq-skeleton-line pq-skel-tr";
      tr.style.width = widths[i].tr;

      card.appendChild(ar);
      card.appendChild(tr);
      stack.appendChild(card);
    }

    content.appendChild(stack);
    spacer.appendChild(content);
    virtualContainer.appendChild(spacer);
    this.contentEl.appendChild(virtualContainer);
  }

  renderError(message) {
    if (!this.contentEl) return;
    this.destroyVirtualization();
    this.contentEl.innerHTML = "";

    const div = document.createElement("div");
    div.className = "pocket-quran-error";

    const text = document.createElement("div");
    text.className = "pocket-quran-error-text";
    text.textContent = message || "Something went wrong.";

    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "pocket-quran-retry-btn";
    retry.textContent = "Retry";
    retry.addEventListener("click", () => this.loadSurah(this._activeSurah));

    div.appendChild(text);
    div.appendChild(retry);
    this.contentEl.appendChild(div);
  }

  stripHtmlToText(html) {
    try {
      const div = document.createElement("div");
      div.innerHTML = String(html || "");

      // Remove footnote elements (usually <sup> tags with footnote markers)
      // quran.com API uses <sup foot_note="..."> for footnotes
      const footnotes = div.querySelectorAll(
        "sup[foot_note], sup.foot_note, sup",
      );
      footnotes.forEach((fn) => fn.remove());

      return (div.textContent || "").replace(/\s+/g, " ").trim();
    } catch (e) {
      return String(html || "")
        .replace(/<sup[^>]*>.*?<\/sup>/gi, "") // Remove sup tags and their content
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeTranslationId(value) {
    const n = parseInt(value, 10);
    if (Number.isFinite(n) && PocketQuranManager.TRANSLATIONS[n]) return n;
    return 85;
  }

  normalizeRecitationFloatingAppearance(value) {
    return value === "theme" ? "theme" : "opaque";
  }

  clampNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  persistPocketQuranSettings(patch) {
    const settings = this.storage.getSettings();
    settings.pocketQuran = {
      ...(settings.pocketQuran || {}),
      ...(patch || {}),
    };
    this.storage.saveSettings(settings);
  }

  normalizeCssHexColor(value, fallback) {
    const v = String(value || "").trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) return v;
    if (/^#[0-9a-f]{3}$/i.test(v)) return v;
    return fallback;
  }

  normalizeArabicFontFamily(value) {
    const v = String(value || "").trim();
    if (PocketQuranManager.ARABIC_FONT_FAMILIES.includes(v)) return v;
    return "KFGQPC Uthman Taha Naskh";
  }

  applyArabicFontFamily(fontFamily, opts = {}) {
    const { persist = false, recalculate = true } = opts;

    const normalized = this.normalizeArabicFontFamily(fontFamily);
    this._arabicFontFamily = normalized;

    if (this.card) {
      const cssValue = `"${normalized}", var(--font-arabic)`;
      this.card.style.setProperty("--pq-arabic-font-family", cssValue);
    }

    if (this.fontToggleBtn) {
      this.fontToggleBtn.title = `Change Arabic font (current: ${normalized})`;
    }

    this.syncTajweedAvailabilityForFont();

    if (recalculate) {
      this._ayahHeights.clear();
      this.recalculateVirtualization();
    }

    if (persist) {
      this.persistPocketQuranSettings({ arabicFontFamily: normalized });
    }
  }

  createFontPickerModal() {
    if (document.getElementById("pqFontModal")) return;

    const modal = document.createElement("div");
    modal.id = "pqFontModal";
    modal.className = "pq-bookmark-modal";
    modal.innerHTML = `
      <div class="pq-bookmark-modal-content pq-translation-modal-content">
        <div class="pq-bookmark-modal-header">
          <h3 class="pq-bookmark-modal-title">Aa Arabic Font</h3>
          <button type="button" class="pq-bookmark-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="pq-bookmark-modal-body">
          <div class="pq-bookmark-search">
            <input type="text" class="pq-bookmark-search-input pq-font-search" placeholder="Search fonts..." />
          </div>
          <div class="pq-translation-list">
            <div class="pq-translation-items pq-font-items"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this._fontModal = modal;

    modal
      .querySelector(".pq-bookmark-modal-close")
      .addEventListener("click", () => this.closeFontPickerModal());

    this._bindOverlayCloseBehavior(modal, () => this.closeFontPickerModal());

    const searchInput = modal.querySelector(".pq-font-search");
    searchInput.addEventListener("input", () => {
      this.renderFontList(searchInput.value);
    });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closeFontPickerModal();
    });
  }

  openFontPickerModal() {
    const modal = document.getElementById("pqFontModal");
    if (!modal) return;

    const searchInput = modal.querySelector(".pq-font-search");
    if (searchInput) searchInput.value = "";

    this.renderFontList("");
    modal.classList.add("active");

    setTimeout(() => {
      try {
        searchInput?.focus();
      } catch (e) {}
    }, 100);
  }

  closeFontPickerModal() {
    const modal = document.getElementById("pqFontModal");
    if (modal) modal.classList.remove("active");
  }

  renderFontList(query = "") {
    const modal = document.getElementById("pqFontModal");
    if (!modal) return;

    const container = modal.querySelector(".pq-font-items");
    if (!container) return;

    const q = String(query || "")
      .toLowerCase()
      .trim();
    const fonts = PocketQuranManager.ARABIC_FONT_FAMILIES.filter((f) =>
      f.toLowerCase().includes(q),
    );

    const current = this.normalizeArabicFontFamily(this._arabicFontFamily);
    let html = "";
    for (const f of fonts) {
      const isActive = f === current;
      html += `<button type="button" class="pq-translation-item ${
        isActive ? "active" : ""
      }" data-font-family="${this.escapeHtml(f)}">
        <span class="pq-translation-name">${this.escapeHtml(f)}</span>
        ${
          isActive
            ? `<span class="pq-translation-check">${this._getIcon("✓", {
                size: 14,
              })}</span>`
            : ""
        }
      </button>`;
    }

    if (!html) {
      html = `<div class="pq-translation-empty">No fonts found for "${this.escapeHtml(
        query,
      )}"</div>`;
      container.innerHTML = html;
      return;
    }

    container.innerHTML = html;
    container.querySelectorAll(".pq-translation-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const font = btn.getAttribute("data-font-family");
        this.applyArabicFontFamily(font, { persist: true, recalculate: true });
        this.closeFontPickerModal();
      });
    });
  }

  applyTajweedColors(colors, opts = {}) {
    const { persist = false } = opts;
    if (!this.card) return;

    const defaults = PocketQuranManager.DEFAULT_TAJWEED_COLORS;
    const input = colors && typeof colors === "object" ? colors : {};
    const merged = { ...defaults, ...input };

    for (const key of Object.keys(defaults)) {
      const normalized = this.normalizeCssHexColor(merged[key], defaults[key]);
      this.card.style.setProperty(`--pq-tajweed-${key}`, normalized);
    }

    if (persist) {
      this.persistPocketQuranSettings({ tajweedColors: merged });
    }
  }

  updateRangeProgress(rangeEl) {
    if (!(rangeEl instanceof HTMLInputElement)) return;

    const min = parseInt(rangeEl.min, 10);
    const max = parseInt(rangeEl.max, 10);
    const value = parseInt(rangeEl.value, 10);

    const safeMin = Number.isFinite(min) ? min : 1;
    const safeMax = Number.isFinite(max) ? max : safeMin + 1;
    const safeValue = Number.isFinite(value) ? value : safeMin;

    const range = Math.max(1, safeMax - safeMin);
    const progress = ((safeValue - safeMin) / range) * 100;
    const clampedProgress = Math.max(0, Math.min(100, progress));

    rangeEl.style.setProperty("--jump-progress", `${clampedProgress}%`);
  }

  applyFontSizes(arabicPx, translationPx, opts = {}) {
    const { syncInputs = false, persist = false } = opts;

    const a = this.clampNumber(arabicPx, 8, 144, 40);
    const t = this.clampNumber(translationPx, 8, 144, 18);

    if (this.card) {
      this.card.style.setProperty("--pq-arabic-size", `${a}px`);
      this.card.style.setProperty("--pq-translation-size", `${t}px`);
    }

    if (syncInputs) {
      if (this.arabicSizeRange) this.arabicSizeRange.value = String(a);
      if (this.translationSizeRange)
        this.translationSizeRange.value = String(t);
      if (this.arabicSizeValue) this.arabicSizeValue.textContent = `${a}px`;
      if (this.translationSizeValue)
        this.translationSizeValue.textContent = `${t}px`;
    }

    this.updateRangeProgress(this.arabicSizeRange);
    this.updateRangeProgress(this.translationSizeRange);

    if (persist) {
      this.persistPocketQuranSettings({
        arabicFontSize: a,
        translationFontSize: t,
      });
    }
  }

  async fetchJson(url, opts = {}) {
    const { signal, timeoutMs = 15000 } = opts;

    const normalizedUrl = String(url || "").trim();
    const cacheable = this._pqCache?.isCacheableJsonUrl(normalizedUrl) === true;

    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    // If JSON is cached, avoid any API call.
    if (cacheable && this._pqCache) {
      const cached = await this._pqCache.getJson(normalizedUrl);
      if (cached) return cached;
    }

    const controller = !signal ? new AbortController() : null;
    const timer = setTimeout(() => {
      try {
        if (controller) controller.abort();
      } catch (e) {}
    }, timeoutMs);

    try {
      const res = await fetch(normalizedUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: signal || controller.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${normalizedUrl}`);
      }

      const data = await res.json();
      if (cacheable && this._pqCache) {
        // Best-effort: ignore quota/transaction failures.
        await this._pqCache.setJson(normalizedUrl, data, "quran_api");
      }

      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BOOKMARK SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get all bookmark categories from storage.
   */
  getBookmarkCategories() {
    return this.storage.get("pocketQuran_bookmarkCategories", []);
  }

  /**
   * Save bookmark categories to storage.
   */
  saveBookmarkCategories(categories) {
    this.storage.set("pocketQuran_bookmarkCategories", categories);
  }

  /**
   * Get all bookmarks from storage.
   */
  getBookmarks() {
    return this.storage.get("pocketQuran_bookmarks", []);
  }

  /**
   * Save bookmarks to storage.
   */
  saveBookmarks(bookmarks) {
    this.storage.set("pocketQuran_bookmarks", bookmarks);
  }

  /**
   * Ensure at least the default "Bookmarked" category exists.
   */
  ensureDefaultBookmarkCategory() {
    const categories = this.getBookmarkCategories();
    if (!categories.length) {
      this.saveBookmarkCategories([
        {
          id: "default",
          name: "Bookmarked",
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  }

  /**
   * Create a new bookmark category.
   */
  createBookmarkCategory(name) {
    const categories = this.getBookmarkCategories();
    const trimmed = String(name || "")
      .trim()
      .slice(0, 50);
    if (!trimmed) return null;

    const existing = categories.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) return existing;

    const newCategory = {
      id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: trimmed,
      createdAt: new Date().toISOString(),
    };

    categories.push(newCategory);
    this.saveBookmarkCategories(categories);
    return newCategory;
  }

  /**
   * Rename a bookmark category.
   */
  renameBookmarkCategory(categoryId, newName) {
    const categories = this.getBookmarkCategories();
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return false;

    const trimmed = String(newName || "")
      .trim()
      .slice(0, 50);
    if (!trimmed) return false;

    category.name = trimmed;
    this.saveBookmarkCategories(categories);
    return true;
  }

  /**
   * Delete a bookmark category and all its bookmarks.
   */
  deleteBookmarkCategory(categoryId) {
    if (categoryId === "default") return false;

    let categories = this.getBookmarkCategories();
    categories = categories.filter((c) => c.id !== categoryId);
    this.saveBookmarkCategories(categories);

    let bookmarks = this.getBookmarks();
    bookmarks = bookmarks.filter((b) => b.categoryId !== categoryId);
    this.saveBookmarks(bookmarks);

    return true;
  }

  /**
   * Add a bookmark to a category.
   */
  addBookmark(categoryId, surah, ayah, arabicText, translationText) {
    const bookmarks = this.getBookmarks();

    // Check if already bookmarked in this category
    const existing = bookmarks.find(
      (b) =>
        b.categoryId === categoryId && b.surah === surah && b.ayah === ayah,
    );
    if (existing) return existing;

    const chapter = this._chapters.find((c) => c.id === surah);

    const bookmark = {
      id: `bm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      categoryId,
      surah,
      ayah,
      surahName: chapter?.name_simple || `Surah ${surah}`,
      surahNameAr: chapter?.name_arabic || "",
      arabicText: (arabicText || "").slice(0, 500),
      translationText: (translationText || "").slice(0, 500),
      createdAt: new Date().toISOString(),
    };

    bookmarks.push(bookmark);
    this.saveBookmarks(bookmarks);
    return bookmark;
  }

  /**
   * Remove a bookmark.
   */
  removeBookmark(bookmarkId) {
    let bookmarks = this.getBookmarks();
    bookmarks = bookmarks.filter((b) => b.id !== bookmarkId);
    this.saveBookmarks(bookmarks);
  }

  /**
   * Remove bookmark by category, surah, and ayah.
   */
  removeBookmarkByAyah(categoryId, surah, ayah) {
    let bookmarks = this.getBookmarks();
    bookmarks = bookmarks.filter(
      (b) =>
        !(b.categoryId === categoryId && b.surah === surah && b.ayah === ayah),
    );
    this.saveBookmarks(bookmarks);
  }

  /**
   * Check if an ayah is bookmarked in any category.
   */
  isAyahBookmarked(surah, ayah) {
    const bookmarks = this.getBookmarks();
    return bookmarks.some((b) => b.surah === surah && b.ayah === ayah);
  }

  /**
   * Check if an ayah is bookmarked in a specific category.
   */
  isAyahBookmarkedInCategory(categoryId, surah, ayah) {
    const bookmarks = this.getBookmarks();
    return bookmarks.some(
      (b) =>
        b.categoryId === categoryId && b.surah === surah && b.ayah === ayah,
    );
  }

  /**
   * Get bookmarks for a category.
   */
  getBookmarksForCategory(categoryId, searchQuery = "") {
    let bookmarks = this.getBookmarks().filter(
      (b) => b.categoryId === categoryId,
    );

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      bookmarks = bookmarks.filter(
        (b) =>
          b.surahName.toLowerCase().includes(q) ||
          b.surahNameAr.includes(searchQuery) ||
          String(b.surah).includes(q) ||
          String(b.ayah).includes(q) ||
          (b.arabicText || "").includes(searchQuery) ||
          (b.translationText || "").toLowerCase().includes(q),
      );
    }

    return bookmarks.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
  }

  /**
   * Get bookmark count for a category.
   */
  getBookmarkCount(categoryId) {
    return this.getBookmarks().filter((b) => b.categoryId === categoryId)
      .length;
  }

  /**
   * Export bookmarks as JSON.
   */
  exportBookmarksJSON() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      categories: this.getBookmarkCategories(),
      bookmarks: this.getBookmarks(),
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import bookmarks from JSON.
   */
  importBookmarksJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== "object") {
        throw new Error("Invalid JSON structure");
      }

      const categories = Array.isArray(data.categories) ? data.categories : [];
      const bookmarks = Array.isArray(data.bookmarks) ? data.bookmarks : [];

      // Validate and normalize categories
      const validCategories = categories
        .filter((c) => c && c.id && c.name)
        .map((c) => ({
          id: String(c.id),
          name: String(c.name).slice(0, 50),
          createdAt: c.createdAt || new Date().toISOString(),
        }));

      // Ensure default category exists
      if (!validCategories.find((c) => c.id === "default")) {
        validCategories.unshift({
          id: "default",
          name: "Bookmarked",
          createdAt: new Date().toISOString(),
        });
      }

      // Validate and normalize bookmarks
      const validBookmarks = bookmarks
        .filter(
          (b) =>
            b &&
            b.id &&
            b.categoryId &&
            Number.isFinite(b.surah) &&
            Number.isFinite(b.ayah),
        )
        .map((b) => ({
          id: String(b.id),
          categoryId: String(b.categoryId),
          surah: parseInt(b.surah, 10),
          ayah: parseInt(b.ayah, 10),
          surahName: String(b.surahName || ""),
          surahNameAr: String(b.surahNameAr || ""),
          arabicText: String(b.arabicText || "").slice(0, 500),
          translationText: String(b.translationText || "").slice(0, 500),
          createdAt: b.createdAt || new Date().toISOString(),
        }));

      this.saveBookmarkCategories(validCategories);
      this.saveBookmarks(validBookmarks);

      return {
        success: true,
        categoriesCount: validCategories.length,
        bookmarksCount: validBookmarks.length,
      };
    } catch (e) {
      console.error("Failed to import bookmarks:", e);
      return { success: false, error: e.message };
    }
  }

  /**
   * Create the bookmark button in the header.
   */
  createBookmarkButton() {
    const headerActions = this.card?.querySelector(".card-header-actions");
    if (!headerActions) return;

    // Check if button already exists
    if (headerActions.querySelector(".pq-bookmark-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pq-bookmark-btn";
    btn.innerHTML = this._getIcon("📑", { size: 18 });
    btn.title = "View bookmarked ayahs";
    btn.setAttribute("aria-label", "View bookmarked ayahs");

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      this.openBookmarkModal();
    });

    // Insert before the blur menu
    const blurMenu = headerActions.querySelector(".card-blur-menu");
    if (blurMenu) {
      headerActions.insertBefore(btn, blurMenu);
    } else {
      headerActions.appendChild(btn);
    }
  }

  /**
   * Create bookmark modals.
   */
  createBookmarkModals() {
    // Main bookmark list modal
    if (!document.getElementById("pqBookmarkModal")) {
      const modal = document.createElement("div");
      modal.id = "pqBookmarkModal";
      modal.className = "pq-bookmark-modal";
      modal.innerHTML = `
        <div class="pq-bookmark-modal-content">
          <div class="pq-bookmark-modal-header">
            <h3 class="pq-bookmark-modal-title">${this._getIcon("📑", {
              size: 20,
            })} Bookmarked Ayahs</h3>
            <button type="button" class="pq-bookmark-modal-close" aria-label="Close">&times;</button>
          </div>
          <div class="pq-bookmark-modal-body">
            <div class="pq-bookmark-search">
              <input type="text" class="pq-bookmark-search-input" placeholder="Search categories..." />
              <button type="button" class="pq-bookmark-add-category" title="Add category">${this._getIcon(
                "➕",
                { size: 16 },
              )}</button>
            </div>
            <div class="pq-bookmark-categories"></div>
            <div class="pq-bookmark-ayahs"></div>
            <div class="pq-bookmark-pagination"></div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      this._bookmarkModal = modal;

      // Event listeners
      modal
        .querySelector(".pq-bookmark-modal-close")
        .addEventListener("click", () => {
          this.closeBookmarkModal();
        });

      this._bindOverlayCloseBehavior(modal, () => this.closeBookmarkModal());

      modal
        .querySelector(".pq-bookmark-search-input")
        .addEventListener("input", (e) => {
          this._bookmarkSearchQuery = e.target.value;
          this._bookmarkCurrentPage = 1;
          this.renderBookmarkModal();
        });

      modal
        .querySelector(".pq-bookmark-add-category")
        .addEventListener("click", () => {
          const name = prompt("Enter category name:");
          if (name) {
            const cat = this.createBookmarkCategory(name);
            if (cat) {
              this.renderBookmarkModal();
            }
          }
        });
    }

    // Category selection modal (for bookmarking an ayah)
    if (!document.getElementById("pqBookmarkCategoryModal")) {
      const modal = document.createElement("div");
      modal.id = "pqBookmarkCategoryModal";
      modal.className = "pq-bookmark-modal";
      modal.innerHTML = `
        <div class="pq-bookmark-modal-content" style="max-width: 450px;">
          <div class="pq-bookmark-modal-header">
            <h3 class="pq-bookmark-modal-title">${this._getIcon("⭐", {
              size: 20,
            })} Bookmark Ayah</h3>
            <button type="button" class="pq-bookmark-modal-close" aria-label="Close">&times;</button>
          </div>
          <div class="pq-bookmark-modal-body">
            <div class="pq-bookmark-search">
              <input type="text" class="pq-bookmark-search-input" placeholder="Search categories..." />
              <button type="button" class="pq-bookmark-add-category" title="Add category">${this._getIcon(
                "➕",
                { size: 16 },
              )}</button>
            </div>
            <div class="pq-bookmark-categories"></div>
            <div class="pq-bookmark-pagination"></div>
          </div>
          <div class="pq-bookmark-modal-footer">
            <button type="button" class="pq-bookmark-modal-btn">Cancel</button>
            <button type="button" class="pq-bookmark-modal-btn primary">Save</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      this._bookmarkCategoryModal = modal;

      // Event listeners
      modal
        .querySelector(".pq-bookmark-modal-close")
        .addEventListener("click", () => {
          this.closeCategorySelectionModal();
        });

      this._bindOverlayCloseBehavior(modal, () =>
        this.closeCategorySelectionModal(),
      );

      modal
        .querySelector(".pq-bookmark-search-input")
        .addEventListener("input", (e) => {
          this._bookmarkCategorySearchQuery = e.target.value;
          this._bookmarkCategoryPage = 1;
          this.renderCategorySelectionModal();
        });

      modal
        .querySelector(".pq-bookmark-add-category")
        .addEventListener("click", () => {
          const name = prompt("Enter category name:");
          if (name) {
            const cat = this.createBookmarkCategory(name);
            if (cat) {
              this.renderCategorySelectionModal();
            }
          }
        });

      const buttons = modal.querySelectorAll(
        ".pq-bookmark-modal-footer .pq-bookmark-modal-btn",
      );
      buttons[0].addEventListener("click", () =>
        this.closeCategorySelectionModal(),
      );
      buttons[1].addEventListener("click", () => this.saveBookmarkSelection());
    }
  }

  /**
   * Create the translation selection modal.
   */
  createTranslationModal() {
    if (document.getElementById("pqTranslationModal")) return;

    const modal = document.createElement("div");
    modal.id = "pqTranslationModal";
    modal.className = "pq-bookmark-modal";
    modal.innerHTML = `
      <div class="pq-bookmark-modal-content pq-translation-modal-content">
        <div class="pq-bookmark-modal-header">
          <h3 class="pq-bookmark-modal-title">🌐 Select Translation</h3>
          <button type="button" class="pq-bookmark-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="pq-bookmark-modal-body">
          <div class="pq-bookmark-search">
            <input type="text" class="pq-bookmark-search-input pq-translation-search" placeholder="Search by language or translator..." />
          </div>
          <div class="pq-translation-list"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this._translationModal = modal;

    // Close button
    modal
      .querySelector(".pq-bookmark-modal-close")
      .addEventListener("click", () => {
        this.closeTranslationModal();
      });

    // Click outside to close
    this._bindOverlayCloseBehavior(modal, () => this.closeTranslationModal());

    // Search input
    const searchInput = modal.querySelector(".pq-translation-search");
    searchInput.addEventListener("input", () => {
      this.renderTranslationList(searchInput.value);
    });

    // Keyboard navigation
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeTranslationModal();
      }
    });

    // Make header meta clickable
    if (this.headerMeta) {
      this.headerMeta.style.cursor = "pointer";
      this.headerMeta.title = "Click to change translation";
      this.headerMeta.addEventListener("click", () => {
        this.openTranslationModal();
      });
    }
  }

  /**
   * Open the translation selection modal.
   */
  openTranslationModal() {
    const modal = document.getElementById("pqTranslationModal");
    if (!modal) return;

    const searchInput = modal.querySelector(".pq-translation-search");
    if (searchInput) searchInput.value = "";

    this.renderTranslationList("");
    modal.classList.add("active");

    // Focus search input
    setTimeout(() => {
      if (searchInput) searchInput.focus();
    }, 100);
  }

  /**
   * Close the translation selection modal.
   */
  closeTranslationModal() {
    const modal = document.getElementById("pqTranslationModal");
    if (modal) modal.classList.remove("active");
  }

  /**
   * Render the translation list in the modal.
   */
  renderTranslationList(query = "") {
    const modal = document.getElementById("pqTranslationModal");
    if (!modal) return;

    const container = modal.querySelector(".pq-translation-list");
    if (!container) return;

    const q = String(query || "")
      .toLowerCase()
      .trim();

    // Group translations by language
    const byLanguage = {};
    for (const [id, info] of Object.entries(PocketQuranManager.TRANSLATIONS)) {
      const lang = info.language || "Other";
      if (!byLanguage[lang]) byLanguage[lang] = [];
      byLanguage[lang].push({ id: parseInt(id, 10), ...info });
    }

    // Sort languages alphabetically
    const sortedLanguages = Object.keys(byLanguage).sort((a, b) =>
      a.localeCompare(b),
    );

    // Filter languages and translations by query
    const filteredLanguages = [];
    for (const lang of sortedLanguages) {
      const langMatches = lang.toLowerCase().includes(q);
      const translations = byLanguage[lang].filter(
        (t) => langMatches || t.label.toLowerCase().includes(q),
      );
      if (translations.length > 0) {
        filteredLanguages.push({ language: lang, translations });
      }
    }

    // Build HTML
    let html = "";
    for (const group of filteredLanguages) {
      html += `<div class="pq-translation-group">
        <div class="pq-translation-lang-header">${this.escapeHtml(
          group.language,
        )}</div>
        <div class="pq-translation-items">`;

      for (const t of group.translations) {
        const isActive = t.id === this._activeTranslationId;
        html += `<button type="button" class="pq-translation-item ${
          isActive ? "active" : ""
        }" data-translation-id="${t.id}">
          <span class="pq-translation-name">${this.escapeHtml(t.label)}</span>
          ${
            isActive
              ? `<span class="pq-translation-check">${this._getIcon("✓", {
                  size: 14,
                })}</span>`
              : ""
          }
        </button>`;
      }

      html += `</div></div>`;
    }

    if (!html) {
      html = `<div class="pq-translation-empty">No translations found for "${this.escapeHtml(
        query,
      )}"</div>`;
    }

    container.innerHTML = html;

    // Add click handlers
    container.querySelectorAll(".pq-translation-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.translationId, 10);
        if (Number.isFinite(id)) {
          this.selectTranslation(id);
        }
      });
    });

    // Scroll active translation into view
    const activeItem = container.querySelector(".pq-translation-item.active");
    if (activeItem && !q) {
      setTimeout(() => {
        activeItem.scrollIntoView({ block: "center", behavior: "auto" });
      }, 50);
    }
  }

  /**
   * Select a translation from the modal.
   */
  selectTranslation(translationId) {
    const id = this.normalizeTranslationId(translationId);

    // Close modal
    this.closeTranslationModal();

    // Notify listeners (e.g. Settings UI) that translation changed
    try {
      document.dispatchEvent(
        new CustomEvent("md:pq-translation-selected", {
          detail: { translationId: id },
        }),
      );
    } catch (e) {}

    // Persist and reload
    this.persistPocketQuranSettings({ translationResourceId: id });
    this.reloadTranslation(id);
  }

  /**
   * Open the main bookmark modal.
   */
  openBookmarkModal() {
    this._bookmarkSearchQuery = "";
    this._bookmarkCurrentPage = 1;
    this._selectedCategoryId = null;

    const modal = document.getElementById("pqBookmarkModal");
    if (modal) {
      modal.classList.add("active");
      modal.querySelector(".pq-bookmark-search-input").value = "";
      this.renderBookmarkModal();
    }
  }

  /**
   * Close the main bookmark modal.
   */
  closeBookmarkModal() {
    const modal = document.getElementById("pqBookmarkModal");
    if (modal) {
      modal.classList.remove("active");
    }
  }

  /**
   * Render the main bookmark modal content.
   */
  renderBookmarkModal() {
    const modal = document.getElementById("pqBookmarkModal");
    if (!modal) return;

    const categoriesContainer = modal.querySelector(".pq-bookmark-categories");
    const ayahsContainer = modal.querySelector(".pq-bookmark-ayahs");
    const paginationContainer = modal.querySelector(".pq-bookmark-pagination");

    let categories = this.getBookmarkCategories();
    const searchQuery = this._bookmarkSearchQuery.toLowerCase();

    if (searchQuery) {
      categories = categories.filter((c) =>
        c.name.toLowerCase().includes(searchQuery),
      );
    }

    // If a category is selected, show its bookmarks
    if (this._selectedCategoryId) {
      const category = categories.find(
        (c) => c.id === this._selectedCategoryId,
      );
      if (category) {
        categoriesContainer.innerHTML = `
          <div class="pq-bookmark-category active">
            <div class="pq-bookmark-category-info">
              <button type="button" class="pq-bookmark-category-btn back" title="Back to categories">${this._getIcon(
                "←",
                { size: 14 },
              )}</button>
              <span class="pq-bookmark-category-name">${this.escapeHtml(
                category.name,
              )}</span>
              <span class="pq-bookmark-category-count">(${this.getBookmarkCount(
                category.id,
              )} ayahs)</span>
            </div>
          </div>
        `;

        categoriesContainer
          .querySelector(".back")
          .addEventListener("click", () => {
            this._selectedCategoryId = null;
            this._bookmarkCurrentPage = 1;
            this.renderBookmarkModal();
          });

        // Render bookmarks
        const bookmarks = this.getBookmarksForCategory(
          this._selectedCategoryId,
          this._bookmarkSearchQuery,
        );
        const totalPages = Math.ceil(
          bookmarks.length / PocketQuranManager.BOOKMARKS_PER_PAGE,
        );
        const start =
          (this._bookmarkCurrentPage - 1) *
          PocketQuranManager.BOOKMARKS_PER_PAGE;
        const pageBookmarks = bookmarks.slice(
          start,
          start + PocketQuranManager.BOOKMARKS_PER_PAGE,
        );

        if (pageBookmarks.length === 0) {
          ayahsContainer.innerHTML = `
            <div class="pq-bookmark-empty">
              <div class="pq-bookmark-empty-icon">📭</div>
              <div>No bookmarks in this category</div>
            </div>
          `;
        } else {
          ayahsContainer.innerHTML = pageBookmarks
            .map(
              (b) => `
            <div class="pq-bookmark-ayah" data-bookmark-id="${
              b.id
            }" data-surah="${b.surah}" data-ayah="${b.ayah}">
              <div class="pq-bookmark-ayah-badge">${b.surah}:${b.ayah}</div>
              <div class="pq-bookmark-ayah-text">
                <div class="pq-bookmark-ayah-arabic">${this.escapeHtml(
                  b.arabicText || "",
                ).slice(0, 100)}${
                  (b.arabicText || "").length > 100 ? "..." : ""
                }</div>
                <div class="pq-bookmark-ayah-translation">${this.escapeHtml(
                  b.translationText || "",
                ).slice(0, 150)}${
                  (b.translationText || "").length > 150 ? "..." : ""
                }</div>
              </div>
              <button type="button" class="pq-bookmark-ayah-remove" title="Remove bookmark">${this._getIcon(
                "🗑️",
                { size: 16 },
              )}</button>
            </div>
          `,
            )
            .join("");

          // Click handlers for ayahs
          ayahsContainer.querySelectorAll(".pq-bookmark-ayah").forEach((el) => {
            el.addEventListener("click", (e) => {
              if (e.target.closest(".pq-bookmark-ayah-remove")) return;
              const surah = parseInt(el.dataset.surah, 10);
              const ayah = parseInt(el.dataset.ayah, 10);
              this.closeBookmarkModal();
              this.goToBookmarkedAyah(surah, ayah);
            });
          });

          ayahsContainer
            .querySelectorAll(".pq-bookmark-ayah-remove")
            .forEach((btn) => {
              btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const ayahEl = btn.closest(".pq-bookmark-ayah");
                const bookmarkId = ayahEl.dataset.bookmarkId;
                if (confirm("Remove this bookmark?")) {
                  this.removeBookmark(bookmarkId);
                  this.renderBookmarkModal();
                  this.refreshAyahStars();
                }
              });
            });
        }

        // Render pagination
        this.renderPagination(
          paginationContainer,
          totalPages,
          this._bookmarkCurrentPage,
          (page) => {
            this._bookmarkCurrentPage = page;
            this.renderBookmarkModal();
          },
        );
      }
    } else {
      // Show categories list
      ayahsContainer.innerHTML = "";

      const totalPages = Math.ceil(
        categories.length / PocketQuranManager.CATEGORIES_PER_PAGE,
      );
      const start =
        (this._bookmarkCurrentPage - 1) *
        PocketQuranManager.CATEGORIES_PER_PAGE;
      const pageCategories = categories.slice(
        start,
        start + PocketQuranManager.CATEGORIES_PER_PAGE,
      );

      if (pageCategories.length === 0) {
        categoriesContainer.innerHTML = `
          <div class="pq-bookmark-empty">
            <div class="pq-bookmark-empty-icon">${this._getIcon("📁", {
              size: 32,
            })}</div>
            <div>No categories found</div>
          </div>
        `;
      } else {
        categoriesContainer.innerHTML = pageCategories
          .map(
            (c) => `
          <div class="pq-bookmark-category" data-category-id="${c.id}">
            <div class="pq-bookmark-category-info">
              <span class="pq-bookmark-category-name">${this.escapeHtml(
                c.name,
              )}</span>
              <span class="pq-bookmark-category-count">(${this.getBookmarkCount(
                c.id,
              )} ayahs)</span>
            </div>
            <div class="pq-bookmark-category-actions">
              ${
                c.id !== "default"
                  ? `<button type="button" class="pq-bookmark-category-btn rename" title="Rename">${this._getIcon(
                      "✏️",
                      { size: 16 },
                    )}</button>`
                  : ""
              }
              ${
                c.id !== "default"
                  ? `<button type="button" class="pq-bookmark-category-btn delete" title="Delete">${this._getIcon(
                      "🗑️",
                      { size: 16 },
                    )}</button>`
                  : ""
              }
            </div>
          </div>
        `,
          )
          .join("");

        // Click handlers
        categoriesContainer
          .querySelectorAll(".pq-bookmark-category")
          .forEach((el) => {
            el.addEventListener("click", (e) => {
              if (e.target.closest(".pq-bookmark-category-btn")) return;
              this._selectedCategoryId = el.dataset.categoryId;
              this._bookmarkCurrentPage = 1;
              this.renderBookmarkModal();
            });
          });

        categoriesContainer.querySelectorAll(".rename").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const categoryEl = btn.closest(".pq-bookmark-category");
            const categoryId = categoryEl.dataset.categoryId;
            const category = this.getBookmarkCategories().find(
              (c) => c.id === categoryId,
            );
            const newName = prompt("Enter new name:", category?.name);
            if (newName) {
              this.renameBookmarkCategory(categoryId, newName);
              this.renderBookmarkModal();
            }
          });
        });

        categoriesContainer.querySelectorAll(".delete").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const categoryEl = btn.closest(".pq-bookmark-category");
            const categoryId = categoryEl.dataset.categoryId;
            if (confirm("Delete this category and all its bookmarks?")) {
              this.deleteBookmarkCategory(categoryId);
              this.renderBookmarkModal();
              this.refreshAyahStars();
            }
          });
        });
      }

      this.renderPagination(
        paginationContainer,
        totalPages,
        this._bookmarkCurrentPage,
        (page) => {
          this._bookmarkCurrentPage = page;
          this.renderBookmarkModal();
        },
      );
    }
  }

  /**
   * Open category selection modal for bookmarking an ayah.
   */
  openCategorySelectionModal(surah, ayah, verse) {
    this._pendingBookmarkAyah = {
      surah,
      ayah,
      arabicText: verse?.text_uthmani || "",
      translationText: this.stripHtmlToText(
        Array.isArray(verse?.translations) ? verse.translations[0]?.text : "",
      ),
    };
    this._bookmarkCategorySearchQuery = "";
    this._bookmarkCategoryPage = 1;

    const modal = document.getElementById("pqBookmarkCategoryModal");
    if (modal) {
      modal.classList.add("active");
      modal.querySelector(".pq-bookmark-search-input").value = "";
      this.renderCategorySelectionModal();
    }
  }

  /**
   * Close category selection modal.
   */
  closeCategorySelectionModal() {
    const modal = document.getElementById("pqBookmarkCategoryModal");
    if (modal) {
      modal.classList.remove("active");
    }
    this._pendingBookmarkAyah = null;
  }

  /**
   * Render category selection modal content.
   */
  renderCategorySelectionModal() {
    const modal = document.getElementById("pqBookmarkCategoryModal");
    if (!modal || !this._pendingBookmarkAyah) return;

    const categoriesContainer = modal.querySelector(".pq-bookmark-categories");
    const paginationContainer = modal.querySelector(".pq-bookmark-pagination");

    let categories = this.getBookmarkCategories();
    const searchQuery = this._bookmarkCategorySearchQuery.toLowerCase();

    if (searchQuery) {
      categories = categories.filter((c) =>
        c.name.toLowerCase().includes(searchQuery),
      );
    }

    const totalPages = Math.ceil(
      categories.length / PocketQuranManager.CATEGORIES_PER_PAGE,
    );
    const start =
      (this._bookmarkCategoryPage - 1) * PocketQuranManager.CATEGORIES_PER_PAGE;
    const pageCategories = categories.slice(
      start,
      start + PocketQuranManager.CATEGORIES_PER_PAGE,
    );

    const { surah, ayah } = this._pendingBookmarkAyah;

    if (pageCategories.length === 0) {
      categoriesContainer.innerHTML = `
        <div class="pq-bookmark-empty">
          <div class="pq-bookmark-empty-icon">${this._getIcon("📁", {
            size: 32,
          })}</div>
          <div>No categories found</div>
        </div>
      `;
    } else {
      categoriesContainer.innerHTML = pageCategories
        .map((c) => {
          const isChecked = this.isAyahBookmarkedInCategory(c.id, surah, ayah);
          return `
            <div class="pq-bookmark-category ${
              isChecked ? "active" : ""
            }" data-category-id="${c.id}">
              <div class="pq-bookmark-category-info">
                <div class="pq-bookmark-checkbox ${
                  isChecked ? "checked" : ""
                }"></div>
                <span class="pq-bookmark-category-name">${this.escapeHtml(
                  c.name,
                )}</span>
              </div>
            </div>
          `;
        })
        .join("");

      // Click handlers
      categoriesContainer
        .querySelectorAll(".pq-bookmark-category")
        .forEach((el) => {
          el.addEventListener("click", () => {
            const categoryId = el.dataset.categoryId;
            const checkbox = el.querySelector(".pq-bookmark-checkbox");
            const isCurrentlyChecked = checkbox.classList.contains("checked");

            if (isCurrentlyChecked) {
              this.removeBookmarkByAyah(categoryId, surah, ayah);
              checkbox.classList.remove("checked");
              el.classList.remove("active");
            } else {
              const { arabicText, translationText } = this._pendingBookmarkAyah;
              this.addBookmark(
                categoryId,
                surah,
                ayah,
                arabicText,
                translationText,
              );
              checkbox.classList.add("checked");
              el.classList.add("active");
            }
          });
        });
    }

    this.renderPagination(
      paginationContainer,
      totalPages,
      this._bookmarkCategoryPage,
      (page) => {
        this._bookmarkCategoryPage = page;
        this.renderCategorySelectionModal();
      },
    );
  }

  /**
   * Save bookmark selection and close modal.
   */
  saveBookmarkSelection() {
    this.closeCategorySelectionModal();
    this.refreshAyahStars();
  }

  /**
   * Navigate to a bookmarked ayah.
   */
  goToBookmarkedAyah(surah, ayah) {
    if (surah !== this._activeSurah) {
      this.setActiveSurah(surah, { preserveAyah: false }).then(() => {
        setTimeout(() => {
          this.scrollToAyah(ayah, { persist: true, smooth: true });
        }, 300);
      });
    } else {
      this.scrollToAyah(ayah, { persist: true, smooth: true });
    }
  }

  /**
   * Refresh star buttons on currently rendered ayahs.
   */
  refreshAyahStars() {
    if (!this._virtualContent) return;

    const starButtons = this._virtualContent.querySelectorAll(
      ".pocket-quran-ayah-star",
    );
    starButtons.forEach((btn) => {
      const ayahEl = btn.closest(".pocket-quran-ayah");
      if (!ayahEl) return;

      const ayahNumber = parseInt(ayahEl.dataset.ayah, 10);
      const isBookmarked = this.isAyahBookmarked(this._activeSurah, ayahNumber);

      btn.classList.toggle("bookmarked", isBookmarked);
      btn.innerHTML = isBookmarked
        ? this._getIcon("⭐", { size: 18 })
        : this._getIcon("☆", { size: 18 });
      btn.title = isBookmarked ? "Manage bookmark" : "Bookmark this ayah";
    });
  }

  /**
   * Render pagination buttons.
   */
  renderPagination(container, totalPages, currentPage, onPageChange) {
    if (!container) return;

    if (totalPages <= 1) {
      container.innerHTML = "";
      return;
    }

    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 2) {
        end = Math.min(totalPages - 1, 4);
      } else if (currentPage >= totalPages - 1) {
        start = Math.max(2, totalPages - 3);
      }

      if (start > 2) pages.push("...");

      for (let i = start; i <= end; i++) pages.push(i);

      if (end < totalPages - 1) pages.push("...");

      pages.push(totalPages);
    }

    container.innerHTML = `
      <button type="button" class="pq-bookmark-page-btn" data-page="${
        currentPage - 1
      }" ${currentPage === 1 ? "disabled" : ""}>${this._getIcon("←", {
        size: 14,
      })}</button>
      ${pages
        .map((p) =>
          p === "..."
            ? `<span class="pq-bookmark-page-btn" style="cursor: default; border: none;">...</span>`
            : `<button type="button" class="pq-bookmark-page-btn ${
                p === currentPage ? "active" : ""
              }" data-page="${p}">${p}</button>`,
        )
        .join("")}
      <button type="button" class="pq-bookmark-page-btn" data-page="${
        currentPage + 1
      }" ${currentPage === totalPages ? "disabled" : ""}>${this._getIcon("→", {
        size: 14,
      })}</button>
    `;

    container.querySelectorAll("button[data-page]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const page = parseInt(btn.dataset.page, 10);
        if (Number.isFinite(page) && page >= 1 && page <= totalPages) {
          onPageChange(page);
        }
      });
    });
  }
}

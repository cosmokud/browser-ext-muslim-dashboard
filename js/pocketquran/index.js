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
  static DB_VERSION = 2;
  static JSON_STORE = "json";
  static AUDIO_STORE = "audio";
  // Ayah blobs are never rewritten just to touch them: size and last access
  // live in their own store, keyed the same way. Schema owner for the popup's
  // copy of these stores.
  static AUDIO_INDEX_STORE = "audioIndex";
  static AUDIO_CAP_BYTES = 500 * 1024 * 1024;

  constructor() {
    this.db = null;
    // Audio bytes held by the store; null until the index is summed once.
    this.audioBytes = null;
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
        // Ask once for a durable quota; a refusal is not an error.
        navigator.storage?.persist?.().catch(() => {});
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

        if (
          !db.objectStoreNames.contains(
            PocketQuranCacheManager.AUDIO_INDEX_STORE,
          )
        ) {
          db.createObjectStore(PocketQuranCacheManager.AUDIO_INDEX_STORE, {
            keyPath: "key",
          });
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
      raw.includes("/search") ||
      raw.includes("/quran/translations/") ||
      raw.includes("/quran/verses/uthmani") ||
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

  /** One request against one store; any failure reads as "nothing". */
  async _request(storeName, mode, run) {
    try {
      const db = await this._ensureDB();
      return await new Promise((resolve) => {
        const req = run(db.transaction(storeName, mode).objectStore(storeName));
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  }

  /** One transaction over the blob store and its index, with the outcome kept. */
  async _writeAudio(run) {
    try {
      const db = await this._ensureDB();
      return await new Promise((resolve) => {
        const tx = db.transaction(
          [
            PocketQuranCacheManager.AUDIO_STORE,
            PocketQuranCacheManager.AUDIO_INDEX_STORE,
          ],
          "readwrite",
        );
        run(
          tx.objectStore(PocketQuranCacheManager.AUDIO_STORE),
          tx.objectStore(PocketQuranCacheManager.AUDIO_INDEX_STORE),
        );
        tx.oncomplete = () => resolve(true);
        tx.onabort = tx.onerror = () => resolve(false);
      });
    } catch (e) {
      return false;
    }
  }

  async _readAudioIndex() {
    const entries = await this._request(
      PocketQuranCacheManager.AUDIO_INDEX_STORE,
      "readonly",
      (store) => store.getAll(),
    );
    return Array.isArray(entries) ? entries : [];
  }

  async _getAudioBytes() {
    if (this.audioBytes === null) {
      const entries = await this._readAudioIndex();
      this.audioBytes = entries.reduce(
        (sum, entry) => sum + (Number(entry.size) || 0),
        0,
      );
    }
    return this.audioBytes;
  }

  async getAudio(key) {
    const k = String(key || "");
    const record = await this._request(
      PocketQuranCacheManager.AUDIO_STORE,
      "readonly",
      (store) => store.get(k),
    );

    // A hit is an access, and the LRU needs to know it. One tiny record write.
    if (record) {
      void this._request(
        PocketQuranCacheManager.AUDIO_INDEX_STORE,
        "readwrite",
        (store) =>
          store.put({
            key: k,
            size: Number(record.size) || 0,
            lastAccessed: Date.now(),
          }),
      );
    }

    return record;
  }

  async setAudio(record) {
    const key = String(record?.key || "");
    const size = Number(record?.size) || 0;
    const previous = Number(
      (
        await this._request(
          PocketQuranCacheManager.AUDIO_INDEX_STORE,
          "readonly",
          (store) => store.get(key),
        )
      )?.size,
    ) || 0;
    await this._getAudioBytes();

    const now = Date.now();
    const stored = await this._writeAudio((audio, index) => {
      audio.put({ ...record, key, timestamp: now });
      index.put({ key, size, lastAccessed: now });
    });

    if (!stored) {
      // Silence here is why a full store re-downloaded the same ayah every tab.
      console.debug("PocketQuran: ayah audio was not cached", key);
      return false;
    }

    this.audioBytes += size - previous;
    await this._evictAudioOverCap(key);
    return true;
  }

  /**
   * Keep the audio store under its cap by dropping the ayahs nobody played for
   * longest. `keep` is the ayah being written now and is never a candidate.
   */
  async _evictAudioOverCap(keep) {
    const cap = PocketQuranCacheManager.AUDIO_CAP_BYTES;
    if ((await this._getAudioBytes()) <= cap) return 0;

    const entries = (await this._readAudioIndex()).sort(
      (a, b) => (Number(a.lastAccessed) || 0) - (Number(b.lastAccessed) || 0),
    );
    const target = cap * 0.9;
    const doomed = [];

    for (const entry of entries) {
      if (this.audioBytes <= target) break;
      if (entry.key === keep) continue;
      doomed.push(entry.key);
      this.audioBytes -= Number(entry.size) || 0;
    }

    if (!doomed.length) return 0;

    const dropped = await this._writeAudio((audio, index) => {
      for (const key of doomed) {
        audio.delete(key);
        index.delete(key);
      }
    });

    if (!dropped) {
      // The aborted deletes left the store as it was: re-sum on the next check.
      this.audioBytes = null;
      console.debug("PocketQuran: ayah audio could not be evicted");
    }
    return dropped ? doomed.length : 0;
  }
}

class PocketQuranManager extends BaseManager {

  static API_BASE = "https://api.quran.com/api/v4";

  static TAJWEED_API_BASE =
    "https://api.quran.com/api/v4/quran/verses/uthmani_tajweed";

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

  static TRANSLATION_FONT_FAMILIES = [
    "Poppins",
    "Noto Naskh Arabic",
    "Amiri",
    "Georgia",
    "Cascadia Code",
    "Courier New",
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

  static VISIBLE_AYAH_COUNT = 20;

  static ESTIMATED_AYAH_HEIGHT = 180;

  static BUFFER_AYAHS = 3;

  static SCROLL_THROTTLE_MS = 16;

  static SCROLL_IDLE_COMMIT_MS = 140;

  static BOTTOM_LOCK_THRESHOLD_PX = 3;

  static ACTIVE_AYAH_VISIBILITY_PX = 48;

  static RECITATION_AUTOSCROLL_OFFSET_PX = 10;

  static RECITATION_TIMING_RETRY_COOLDOWN_MS = 30000;

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
    this.arabicVisibilityToggleBtn = document.getElementById(
      "pocketQuranArabicVisibilityToggle",
    );
    this.translationVisibilityToggleBtn = document.getElementById(
      "pocketQuranTranslationVisibilityToggle",
    );

    if (!this.card || !this.surahListEl || !this.contentEl) {
      return;
    }

    // Persistent caches (IndexedDB). Best-effort: continue without it.
    this._pqCache = null;
    try {
      this._pqCache = new PocketQuranCacheManager();
      // A failed open is not a broken reader: drop the cache, keep going.
      this._pqCache.dbReady.catch(() => {
        this._pqCache = null;
      });
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
    this._translationFontFamily = "Poppins";
    this._showArabicText = true;
    this._showTranslationText = true;

    // Font picker modal
    this._fontModal = null;
    this._fontPickerTarget = "card";
    this._fontPickerKind = "arabic";
    this._fontPickerCurrentFont = null;

    // Verse caching
    this._versesCache = new Map();
    this._activeVerses = null;
    this._searchModal = null;
    this._searchInput = null;
    this._searchResultsEl = null;
    this._searchPaginationEl = null;
    this._searchStatusEl = null;
    this._searchProgressEl = null;
    this._searchProgressTextEl = null;
    this._searchSubmitBtn = null;
    this._searchArabicSizeRange = null;
    this._searchTranslationSizeRange = null;
    this._searchArabicSizeValue = null;
    this._searchTranslationSizeValue = null;
    this._isSearchLoading = false;
    this._searchRenderedResults = [];
    this._searchRenderedQuery = "";
    this._searchRenderedTranslationLabel = "";
    this._searchRenderedSource = "";
    this._searchRenderedTotal = 0;
    this._searchResultPage = 1;

    // Virtualization state
    this._virtualContainer = null;
    this._virtualSpacer = null;
    this._virtualContent = null;
    this._ayahHeights = new Map(); // Measured heights per ayah
    this._avgAyahHeight = PocketQuranManager.ESTIMATED_AYAH_HEIGHT;
    this._renderedRange = { start: 0, end: 0 };
    this._scrollRAF = null;
    this._isScrolling = false;
    this._scrollIdleTimer = null;
    this._measureRAF = null;
    this._pendingMeasureAfterScroll = false;
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

    // Pending rAF for post-refresh scroll restoration in content-only refresh flow
    this._contentRefreshRestoreRaf = null;

    // Navigation debounce flags
    this._navProcessing = false;

    // Recitation system state
    this._reciters = [];
    this._activeReciterId = null;
    this._audioElement = null;
    this._isPlaying = false;
    this._isAutoplay = false;
    this._isAutoplayNextSurah = false;
    this._isAutoScroll = false;
    this._isLooping = false;
    this._isSurahLooping = false;
    this._volume = 1;
    this._playingAyah = null;
    this._recitationTimingsCache = new Map();
    this._recitationTimingFetches = new Map();
    this._activeRecitationWordKey = null;
    this._isRecitationHighlighterEnabled = true;
    this._recitationWordHighlightLagMs = 0;
    this._isRecitationWordSyncDisabled = false;
    this._reciterModal = null;
    this._headerControlsBox = null;
    this._recitationFloatingEnabled = false;
    this._recitationAutoDockOnVisible = false;
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
    this._lastPocketQuranControlAt = 0;
    this._lastOffscreenStopSignalAt = 0;
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
}

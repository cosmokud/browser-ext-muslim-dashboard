/**
 * Adhkar Manager
 * - Loads bundled default adhkar sets from data/*.json at runtime
 * - Supports up to 100 adhkar sets (JSON import)
 * - Dashboard reader + Settings tab editor (10 items/page)
 */

class AdhkarManager extends BaseManager {

  static MAX_SETS = 100;

  static PAGE_SIZE = 10;

  static DETACHED_PAGE_SIZE = 10;

  static NAV_ANIM_MS = 320;

  static SCRIPT_TOGGLE_ANIM_MS = 220;

  static FONT_SCALE_MIN = 0.5;

  static FONT_SCALE_MAX = 2.5;

  static FONT_SCALE_STEP = 0.1;

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

  static DEFAULT_SETS = [
    {
      id: "default_adhkar_morning",
      name: "Morning Adhkar",
      file: "data/adhkar_morning.json",
    },
    {
      id: "default_adhkar_evening",
      name: "Evening Adhkar",
      file: "data/adhkar_evening.json",
    },
    {
      id: "default_adhkar_general",
      name: "General Adhkar",
      file: "data/adhkar_general.json",
    },
    {
      id: "default_adhkar_hisn",
      name: "Hisn al-Muslim",
      file: "data/adhkar_hisn.json",
    },
  ];

  static PROTECTED_SET_IDS = [
    "default_adhkar_morning",
    "default_adhkar_evening",
    "default_adhkar_general",
    "default_adhkar_hisn",
  ];

  constructor(storage) {
    super();
    this.storage = storage;

    // Dashboard elements
    this.cardEl = document.getElementById("adhkarCard");
    this.shellEl = document.getElementById("adhkarCardShell");
    this.prevBtn = document.getElementById("adhkarPrevBtn");
    this.nextBtn = document.getElementById("adhkarNextBtn");
    this.titleEl = document.getElementById("adhkarTitleText");
    this.topTextEl = document.getElementById("adhkarTopText");
    this.englishEl = document.getElementById("adhkarEnglishText");
    this.referenceDividerEl = document.getElementById("adhkarReferenceDivider");
    this.referenceEl = document.getElementById("adhkarReferenceText");
    this.repeatEl = document.getElementById("adhkarRepeatText");
    this.scriptToggleBtn = document.getElementById("adhkarScriptToggleBtn");
    this.fontFamilyBtn = document.getElementById("adhkarFontFamilyBtn");
    this.fontScaleDecreaseBtn = document.getElementById(
      "adhkarFontDecreaseBtn",
    );
    this.fontScaleIncreaseBtn = document.getElementById(
      "adhkarFontIncreaseBtn",
    );

    // Dashboard jump controls
    this.jumpLabelEl = document.getElementById("adhkarJumpLabel");
    this.jumpSliderEl = document.getElementById("adhkarJumpSlider");
    this.jumpInputEl = document.getElementById("adhkarJumpInput");

    // Auto-advance toggle elements
    this.autoAdvanceToggleBtn = document.getElementById(
      "adhkarAutoAdvanceToggleBtn",
    );
    this.autoAdvanceStatusEl = document.getElementById("adhkarAutoStatus");
    this.autoAdvanceWrapEl = document.getElementById("adhkarAutoWrap");

    // Settings elements (may not exist until modal opened)
    this.settingsSetSelect = null;
    this.settingsImportBtn = null;
    this.settingsExportBtn = null;
    this.settingsDeleteSetBtn = null;
    this.settingsNewSetBtn = null;
    this.settingsImportInput = null;
    this.settingsAddItemBtn = null;
    this.settingsLanguagePickerBtn = null;
    this.settingsList = null;
    this.settingsPagination = null;
    this.settingsMeta = null;

    // Settings controls
    this.settingsAutoAdvanceSeconds = null;

    // Typography controls
    this.settingsArabicFontSize = null;
    this.settingsArabicFontSizeValue = null;
    this.settingsRomanizationFontSize = null;
    this.settingsRomanizationFontSizeValue = null;
    this.settingsEnglishFontSize = null;
    this.settingsEnglishFontSizeValue = null;

    // State
    this.currentCardIndex = 0;
    this.settingsPage = 1;

    // Settings editor state
    this._settingsReadOnly = false;

    // Debounce timer for editor saves
    this.saveTimer = null;

    // Dashboard animation timers
    this._dashboardAnimating = false;
    this._dashboardMidTimer = null;
    this._dashboardEndTimer = null;

    // Script toggle animation timer
    this._scriptToggleTimer = null;

    // Auto-advance timer
    this._autoAdvanceTimer = null;
    this._hoverPauseAutoAdvance = false;

    // Set selector modal state
    this._setModalPage = 1;
    this._setModalSearchQuery = "";
    this._setModal = null;

    // Language selector state
    this._langModal = null;
    this._langModalContext = "dashboard";
    this._selectedLangCode = null;

    // Arabic font picker state
    this._arabicFontFamily = "KFGQPC Uthman Taha Naskh";
    this._translationFontFamily = "Poppins";
    this._fontModal = null;
    this.defaultSets = [];

    // Listen for icon theme changes
    document.addEventListener("md:icon-theme-change", () => {
      this._updateSetSelectorIcon();
      this._updateSetModalIcons();
      this.updateLanguageSelectorButton();
      if (this.settingsSetSelect) {
        this.renderSettings();
      }
    });
  }
}

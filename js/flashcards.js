/**
 * Flashcard Manager
 * - Loads bundled default cards from data/*.csv at runtime
 * - Supports up to 100 flashcard sets (CSV import/export)
 * - Dashboard viewer + Settings tab editor (10 cards/page)
 */

class FlashcardManager extends BaseManager {

  static MAX_SETS = 100;

  static PAGE_SIZE = 10;

  static DETACHED_PAGE_SIZE = 10;

  static FLIP_ANIM_MS = 320;

  static NAV_ANIM_MS = 320;

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
      id: "default_top300wordforms",
      name: "Top 300 Word Forms in Quran",
      file: "data/flashcard_top300wordforms.csv",
      parser: "csv",
    },
    {
      id: "default_99names_ar",
      name: "99 Names of Allah (al-Tirmidhi - Arabic)",
      file: "data/flashcard_99names_ar.csv",
      parser: "pipe",
    },
    {
      id: "default_99names_en",
      name: "99 Names of Allah (al-Tirmidhi - English)",
      file: "data/flashcard_99names_en.csv",
      parser: "pipe",
    },
  ];

  static PROTECTED_SET_IDS = [
    "default_top300wordforms",
    "default_99names_ar",
    "default_99names_en",
  ];

  constructor(storage) {
    super();
    this.storage = storage;

    // Dashboard elements
    this.cardEl = document.getElementById("flashcardCard");
    this.flipCardEl = document.getElementById("flashcardFlipCard");
    this.prevBtn = document.getElementById("flashcardPrevBtn");
    this.nextBtn = document.getElementById("flashcardNextBtn");
    this.questionEl = document.getElementById("flashcardQuestion");
    this.answerEl = document.getElementById("flashcardAnswer");
    this.modeToggleBtn = document.getElementById("flashcardModeToggleBtn");
    this.fontFamilyBtn = document.getElementById("flashcardFontFamilyBtn");
    this.fontScaleDecreaseBtn = document.getElementById(
      "flashcardFontDecreaseBtn",
    );
    this.fontScaleIncreaseBtn = document.getElementById(
      "flashcardFontIncreaseBtn",
    );

    // Dashboard jump controls
    this.jumpLabelEl = document.getElementById("flashcardJumpLabel");
    this.jumpSliderEl = document.getElementById("flashcardJumpSlider");
    this.jumpInputEl = document.getElementById("flashcardJumpInput");

    // Settings elements (may not exist until modal opened)
    this.settingsSetSelect = null;
    this.settingsImportBtn = null;
    this.settingsExportBtn = null;
    this.settingsDeleteSetBtn = null;
    this.settingsNewSetBtn = null;
    this.settingsImportInput = null;
    this.settingsAddCardBtn = null;
    this.settingsList = null;
    this.settingsPagination = null;
    this.settingsMeta = null;

    // Mode controls (Settings tab)
    this.settingsModeSelect = null;
    this.settingsStudyAutoAdvanceSeconds = null;

    // Typography controls (Settings tab)
    this.settingsQuestionFontSize = null;
    this.settingsQuestionFontSizeValue = null;
    this.settingsAnswerFontSize = null;
    this.settingsAnswerFontSizeValue = null;

    // State
    this.currentCardIndex = 0;
    this.isFlipped = false;
    this.settingsPage = 1;

    // Settings editor state
    this._settingsReadOnly = false;

    // Debounce timer for editor saves
    this.saveTimer = null;

    // Dashboard animation timers
    this._dashboardAnimating = false;
    this._dashboardMidTimer = null;
    this._dashboardEndTimer = null;

    // Study mode auto-advance timer
    this._autoAdvanceTimer = null;
    this._hoverPauseAutoAdvance = false;

    // Auto-advance toggle elements
    this.autoAdvanceToggleBtn = document.getElementById(
      "flashcardAutoAdvanceToggleBtn",
    );
    this.autoAdvanceStatusEl = document.getElementById("flashcardAutoStatus");
    this.autoAdvanceWrapEl = document.getElementById("flashcardAutoWrap");

    // Set selector modal state
    this._setModalPage = 1;
    this._setModalSearchQuery = "";
    this._setModal = null;

    // Arabic font picker state
    this._arabicFontFamily = "Noto Naskh Arabic";
    this._translationFontFamily = "Poppins";
    this._fontModal = null;
    this.defaultSets = [];

    // Listen for icon theme changes
    document.addEventListener("md:icon-theme-change", () => {
      this.applyAutoAdvanceUI();
      this.applyModeToDashboard();
      this._updateSetSelectorButton();
      this._updateSetModalIcons();
      if (this.settingsSetSelect) {
        this.renderSettings();
      }
    });
  }
}

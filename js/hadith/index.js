/**
 * Hadith Manager
 * - Loads bundled default hadith sets from data/*.json at runtime
 * - Supports up to 100 hadith sets (JSON import)
 * - Dashboard reader + Settings tab editor (10 items/page)
 */

class HadithManager extends BaseManager {

  static MAX_SETS = 100;

  static PAGE_SIZE = 10;

  static DETACHED_PAGE_SIZE = 10;

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
      id: "default_hadith_nawawi40",
      name: "Imam Nawawi 40 Hadith",
      file: "data/hadith_nawawi40.json",
    },
    {
      id: "default_hadith_random200",
      name: "Random 200 Hadith",
      file: "data/hadith_random200.json",
    },
  ];

  static PROTECTED_SET_IDS = [
    "default_hadith_nawawi40",
    "default_hadith_random200",
  ];

  constructor(storage) {
    super();
    this.storage = storage;

    // Dashboard elements
    this.cardEl = document.getElementById("hadithCard");
    this.shellEl = document.getElementById("hadithCardShell");
    this.prevBtn = document.getElementById("hadithPrevBtn");
    this.nextBtn = document.getElementById("hadithNextBtn");
    this.fontScaleDecreaseBtn = document.getElementById(
      "hadithFontDecreaseBtn",
    );
    this.fontScaleIncreaseBtn = document.getElementById(
      "hadithFontIncreaseBtn",
    );

    this.titleEl = document.getElementById("hadithTitleText");
    this.textEl = document.getElementById("hadithBodyText");
    this.metaDividerEl = document.getElementById("hadithMetaDivider");
    this.metaEl = document.getElementById("hadithMetaText");

    // Dashboard jump controls
    this.jumpLabelEl = document.getElementById("hadithJumpLabel");
    this.jumpSliderEl = document.getElementById("hadithJumpSlider");
    this.jumpInputEl = document.getElementById("hadithJumpInput");

    // Auto-advance toggle elements
    this.autoAdvanceToggleBtn = document.getElementById(
      "hadithAutoAdvanceToggleBtn",
    );
    this.autoAdvanceStatusEl = document.getElementById("hadithAutoStatus");
    this.autoAdvanceWrapEl = document.getElementById("hadithAutoWrap");

    // Settings elements
    this.settingsSetSelect = null;
    this.settingsImportBtn = null;
    this.settingsExportBtn = null;
    this.settingsDeleteSetBtn = null;
    this.settingsNewSetBtn = null;
    this.settingsRenameSetBtn = null;
    this.settingsImportInput = null;
    this.settingsAddItemBtn = null;
    this.settingsLanguagePickerBtn = null;
    this.settingsList = null;
    this.settingsPagination = null;
    this.settingsMeta = null;

    // Settings controls
    this.settingsAutoAdvanceSeconds = null;

    // Typography controls
    this.settingsTitleFontSize = null;
    this.settingsTitleFontSizeValue = null;
    this.settingsTextFontSize = null;
    this.settingsTextFontSizeValue = null;
    this.settingsMetaFontSize = null;
    this.settingsMetaFontSizeValue = null;

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

    // Auto-advance timer
    this._autoAdvanceTimer = null;
    this._hoverPauseAutoAdvance = false;

    this._arabicFontFamily = "Noto Naskh Arabic";
    this._translationFontFamily = "Poppins";

    // Set selector modal state
    this._setModalPage = 1;
    this._setModalSearchQuery = "";
    this._setModal = null;

    // Language selector state
    this._langModal = null;
    this._langModalContext = "dashboard";
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

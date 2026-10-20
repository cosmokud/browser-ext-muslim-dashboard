/**
 * Quotes Manager
 * Handles Quran and Hadith quotes with pagination and import/export
 */

class QuotesManager extends BaseManager {

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

  constructor(storage) {
    super();
    this.storage = storage;
    this.defaultQuotes = [];
    this.userQuotes = [];
    this.currentQuote = null;

    // Quote navigation history (for prev/next)
    this._quoteHistory = [];
    this._quoteHistoryIndex = -1;
    this._maxQuoteHistory = 200;
    this.currentPage = 1;
    this.quotesPerPage = 10;

    // Default quotes language selector (applies to bundled default quotes only)
    this._langModal = null;
    this._langModalContext = "default";

    // Debounced persistence timer for inline settings editor
    this._editorSaveTimer = null;

    // Quote auto-rotation
    this.autoRotateMs = 60 * 1000;
    this.autoRotateTimer = null;
    this._hoverPauseAutoRotate = false;
    this.quoteAutoRotatePaused = false;
    this.quoteShuffleEnabled = true;
    this._sequentialQuoteCursor = -1;
    this._quoteShufflePlaylist = [];
    this._quoteShufflePlaylistIndex = -1;
    this._quoteShufflePlaylistKey = "";

    // Track running animations so we can cancel cleanly
    this._activeAnimations = [];

    // Quote display elements
    this.quoteText = document.getElementById("quoteText");
    this.quoteSource = document.getElementById("quoteSource");
    this.quotePrev = document.getElementById("quotePrev");
    this.quoteNext = document.getElementById("quoteNext");
    this.quoteSection = document.getElementById("quoteSection");
    this.quotePauseBtn = null;
    this.quoteShuffleBtn = null;

    this.quoteContainer = this.quoteText?.closest(".quote-container") || null;
    this._arabicFontFamily = "Noto Naskh Arabic";
    this._translationFontFamily = "Poppins";

    // Quotes settings elements
    this.quotesListContainer = document.getElementById("userQuotesList");
    this.paginationContainer = document.getElementById("quotesPagination");
    this.importBtn = document.getElementById("importQuotesBtn");
    this.exportBtn = document.getElementById("exportQuotesBtn");
    this.importInput = document.getElementById("importQuotesInput");
    this.addItemBtn = document.getElementById("quotesAddItemBtn");
    this.editorLangPickerBtn = document.getElementById(
      "quotesEditorLangPickerBtn",
    );

    // Keep language selector icon in sync with icon theme changes.
    document.addEventListener("md:icon-theme-change", () => {
      this.updateLanguageSelectorButton();
      this.updateEditorLanguagePickerButton();
      this.updateQuoteControlButtons();
    });
  }
}

// Export for use
window.QuotesManager = QuotesManager;

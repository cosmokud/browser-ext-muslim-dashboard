/**
 * Search Bar Manager (Custom Searches)
 * - Stores custom searches in localStorage
 * - Shows favicon tabs with caching support
 * - Scroll arrows appear when searches > 10
 * - Lets the user choose an accent color per engine (via right-click menu)
 */

class SearchBarManager extends BaseManager {

  static MAX_VISIBLE = 10;

  constructor(storage) {
    super();
    this.storage = storage;

    this.searches = [];
    this.selectedId = null;
    this.scrollIndex = 0;

    this.contextMenu = null;
    this.pendingDeleteId = null;

    this.customColorInput = null;
    this.customColorPickerEngineId = null;

    // Favicon-derived dominant color cache.
    this.faviconDominantCache = new Map();
    this.faviconDominantInFlight = new Map();
    this.faviconDominantFailureReason = null;

    // Drag state (reorder engines, Pinned Apps-style)
    this.draggedEngine = null;
    this.draggedElement = null;
    this.dragGhost = null;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.pendingX = 0;
    this.pendingY = 0;
    this.dragFrameRequested = false;
    this.blockNextClick = false;
    this.blockNextClickTimer = null;
    this.currentDropTarget = null;
    this.flipDurationMs = 160;
    this.flipEasing = "cubic-bezier(0.2, 0.8, 0.2, 1)";

    // Track pending favicon during edit
    this.pendingFaviconDataUrl = null;

    // Elements
    this.section = document.getElementById("searchBarSection");
    this.shell = document.getElementById("searchBarShell");

    this.prevBtn = document.getElementById("searchBarEnginesPrev");
    this.nextBtn = document.getElementById("searchBarEnginesNext");
    this.viewport = document.getElementById("searchBarEngineViewport");
    this.strip = document.getElementById("searchBarEngineStrip");

    this.form = document.getElementById("searchBarForm");
    this.input = document.getElementById("searchBarInput");
    this.addBtn = document.getElementById("searchBarAddBtn");

    // Add modal
    this.addModal = document.getElementById("searchBarModal");
    this.addModalForm = document.getElementById("searchBarModalForm");
    this.addModalCloseBtn = document.getElementById("closeSearchBarModal");
    this.addModalCancelBtn = document.getElementById("cancelSearchBarModal");
    this.newName = document.getElementById("searchBarNewName");
    this.newUrl = document.getElementById("searchBarNewUrl");

    // Edit modal
    this.editModal = document.getElementById("editSearchBarModal");
    this.editModalForm = document.getElementById("editSearchBarModalForm");
    this.editModalCloseBtn = document.getElementById("closeEditSearchBarModal");
    this.editModalCancelBtn = document.getElementById("cancelEditSearchBar");
    this.editName = document.getElementById("editSearchBarName");
    this.editUrl = document.getElementById("editSearchBarUrl");
    this.editIdInput = document.getElementById("editSearchBarId");

    // Favicon controls in edit modal
    this.editFaviconPreview = document.getElementById(
      "editSearchBarFaviconPreview",
    );
    this.editRefreshFaviconBtn = document.getElementById(
      "editSearchBarRefreshFavicon",
    );
    this.editImportFaviconBtn = document.getElementById(
      "editSearchBarImportFavicon",
    );
    this.editImportFaviconUrlBtn = document.getElementById(
      "editSearchBarImportFaviconUrl",
    );
    this.editFaviconFileInput = document.getElementById(
      "editSearchBarFaviconFile",
    );
    this.editFaviconStatus = document.getElementById(
      "editSearchBarFaviconStatus",
    );

    // Delete confirm modal
    this.deleteModal = document.getElementById("searchBarDeleteConfirmModal");
    this.deleteNameEl = document.getElementById("searchBarDeleteName");
    this.confirmDeleteBtn = document.getElementById(
      "confirmSearchBarDeleteBtn",
    );
    this.cancelDeleteBtn = document.getElementById("cancelSearchBarDeleteBtn");

    // Bound event handlers for drag
    this.boundHandleMouseMove = this._handleEngineMouseMove.bind(this);
    this.boundHandleMouseUp = this._handleEngineMouseUp.bind(this);
    this.boundHandleTouchMove = this._handleEngineTouchMove.bind(this);
    this.boundHandleTouchEnd = this._handleEngineTouchEnd.bind(this);
    this.boundCaptureClick = this._captureClickWhileDragging.bind(this);

    // Suppress click that would otherwise fire after a drag
    document.addEventListener("click", this.boundCaptureClick, true);

    // Listen for icon theme changes
    document.addEventListener("md:icon-theme-change", () => {
      this._updateContextMenuIcons();
    });

    this.init();
  }
}

// Export for use
window.SearchBarManager = SearchBarManager;

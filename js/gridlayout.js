/**
 * GridLayoutManager - Drag and Drop Grid Layout System
 * Enables repositioning of dashboard components via drag-and-drop
 * Uses flex-based rows with automatic component expansion
 * Includes viewport-based responsive system for dynamic span adjustment
 */

class GridLayoutManager {

  constructor(storage, modes) {
    this.storage = storage;
    // Which presentation modes are on (js/modes.js).
    this.modes = modes;
    this.grid = null;
    this.gridItems = [];
    this.rows = [];
    this.activeRows = [];
    this.draggedItem = null;
    this.draggedItemRect = null;
    this.placeholder = null;
    this.isDragging = false;
    this.isEditModeLocked = false;
    this.isQuranFocusModeContext = false;

    // Sidebar mode (3-column layout) drag-drop support
    this.isSidebarModeEnabled = false;
    this.sidebarDropTarget = null; // 'left' | 'right' | null
    this.sidebarDropIndex = null;
    this.sidebarMarkers = new Map(); // componentId -> marker element
    this.sidebarDragOrigin = null; // { side: 'left'|'right', index: number } | null
    this.sidebarPlaceholder = null; // Placeholder element for sidebar drop preview
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.initialMouseX = 0;
    this.initialMouseY = 0;
    this.lastPointerX = 0;
    this.lastPointerY = 0;
    this.scrollBehaviorRestoreHtml = null;
    this.scrollBehaviorRestoreBody = null;
    this.scrollBehaviorOverridden = false;
    this.autoScrollVelocity = 0;
    this.scrollInterval = null;
    this.dropTargetRaf = null;
    this.pendingDropTargetX = 0;
    this.pendingDropTargetY = 0;
    this.dragRowRectsCache = [];
    this.dragRowRectsCacheScrollY = 0;
    this.viewportResizeTimer = null;
    this.lastViewportWidth = 0;
    this.containerResizeObserver = null;
    this.isSidebarResizing = false;
    this.sidebarResizeState = null;
    this.isMiddleLayoutResizing = false;
    this.middleLayoutResizeState = null;
    this.sidebarAutoEnableBlocked = false;
    this.sidebarClippingCollapseInProgress = false;
    this.sidebarMiddleLayoutDefaultWidth = 1400;
    this.sidebarMiddleLayoutMinWidth = 1000;
    this.sidebarMiddleLayoutNormalMinWidth = 1000;
    this.sidebarMiddleLayoutSideGutter = 48;
    this.sidebarDropMinWidthPerSide = 422;
    this.sidebarDropMinTotalWidth = this.sidebarDropMinWidthPerSide * 2;
    this.sidebarAutoRestoreMinSideWidth = 0;
    this.threeItemSingleRowCollapseThresholdWidth = 1200;
    this.currentMainContainerLayoutMode = null;
    this.lastMainContainerResponsiveWidth = 0;
    this.viewportAutoZoomThresholdWidth = 1000;
    this.viewportAutoZoomActive = false;
    this.viewportAutoZoomScale = 1;
    this.viewportStabilizeRaf = null;
    this.viewportStabilizeRaf2 = null;
    this.manualResizeWindowSyncRaf = null;

    // Component definitions with their original span limits
    // Span represents the maximum columns out of 6 the component prefers
    this.componentSpans = {
      header: { id: "header", span: 2, minSpan: 2 },
      pinnedAppsSection: { id: "pinnedAppsSection", span: 2, minSpan: 2 },
      searchBarSection: { id: "searchBarSection", span: 2, minSpan: 2 },
      quoteSection: { id: "quoteSection", span: 2, minSpan: 2 },
      prayerTimesCard: { id: "prayerTimesCard", span: 2, minSpan: 2 },
      calendarCard: { id: "calendarCard", span: 2, minSpan: 2 },
      qiblaCard: { id: "qiblaCard", span: 2, minSpan: 2 },
      weatherCard: { id: "weatherCard", span: 6, minSpan: 6 },
      lunarPhaseCard: { id: "lunarPhaseCard", span: 2, minSpan: 2 },
      fastingCard: { id: "fastingCard", span: 2, minSpan: 2 },
      flashcardCard: { id: "flashcardCard", span: 2, minSpan: 2 },
      adhkarCard: { id: "adhkarCard", span: 2, minSpan: 2 },
      hadithCard: { id: "hadithCard", span: 2, minSpan: 2 },
      todoCard: { id: "todoCard", span: 2, minSpan: 2 },
      notesCard: { id: "notesCard", span: 2, minSpan: 2 },
      pocketQuranCard: { id: "pocketQuranCard", span: 2, minSpan: 2 },
    };

    /**
     * Minimum width configuration for components (in pixels)
     * When a component's calculated width based on viewport falls below this,
     * the layout system will try to give it more space (expand its span)
     * or move it to a new row where it can have full width.
     *
     * Format: componentId -> minWidth in pixels
     */
    this.componentMinWidths = {
      prayerTimesCard: 360,
      calendarCard: 310,
      qiblaCard: 280,
      lunarPhaseCard: 250,
      fastingCard: 250,
      flashcardCard: 360,
      adhkarCard: 360,
      todoCard: 300,
    };

    // Track current effective spans (calculated based on viewport)
    this.effectiveSpans = {};

    // Track components expanded for responsive breakpoints
    this.expandedComponents = new Set();

    // Default row structure (component IDs in order)
    this.defaultLayout = [
      ["header"],
      ["pinnedAppsSection"],
      ["searchBarSection"],
      ["quoteSection"],
      ["prayerTimesCard", "fastingCard", "calendarCard"],
      ["flashcardCard", "adhkarCard"],
      ["hadithCard"],
      ["pocketQuranCard"],
      ["todoCard", "qiblaCard", "lunarPhaseCard"],
      ["notesCard"],
      ["weatherCard"],
    ];

    // Bound event handlers
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.handleViewportResize = this.handleViewportResize.bind(this);
    this.handleSidebarResizeDoubleClick =
      this.handleSidebarResizeDoubleClick.bind(this);
    this.handleMiddleLayoutResizeMouseDown =
      this.handleMiddleLayoutResizeMouseDown.bind(this);
    this.handleMiddleLayoutResizeTouchStart =
      this.handleMiddleLayoutResizeTouchStart.bind(this);
    this.handleMiddleLayoutResizeDoubleClick =
      this.handleMiddleLayoutResizeDoubleClick.bind(this);
  }
}

// Export for use in app.js
window.GridLayoutManager = GridLayoutManager;

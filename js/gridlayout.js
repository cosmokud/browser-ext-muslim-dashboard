/**
 * GridLayoutManager - Drag and Drop Grid Layout System
 * Enables repositioning of dashboard components via drag-and-drop
 * Uses flex-based rows with automatic component expansion
 * Includes viewport-based responsive system for dynamic span adjustment
 */

class GridLayoutManager {
  constructor(storage) {
    this.storage = storage;
    this.grid = null;
    this.gridItems = [];
    this.rows = [];
    this.activeRows = [];
    this.draggedItem = null;
    this.draggedItemRect = null;
    this.placeholder = null;
    this.isDragging = false;
    this.isEditModeEnabled = false; // Drag-drop mode disabled by default
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
    this.sidebarAutoRestoreMinSideWidth = 0;
    this.threeItemSingleRowCollapseThresholdWidth = 1200;
    this.currentMainContainerLayoutMode = null;
    this.lastMainContainerResponsiveWidth = 0;
    this.viewportAutoZoomThresholdWidth = 1000;
    this.viewportAutoZoomActive = false;
    this.viewportAutoZoomScale = 1;
    this.viewportStabilizeRaf = null;
    this.viewportStabilizeRaf2 = null;

    // Component definitions with their original span limits
    // Span represents the maximum columns out of 6 the component prefers
    this.componentSpans = {
      header: { id: "header", span: 6, minSpan: 6 },
      pinnedAppsSection: { id: "pinnedAppsSection", span: 6, minSpan: 6 },
      searchBarSection: { id: "searchBarSection", span: 6, minSpan: 6 },
      quoteSection: { id: "quoteSection", span: 6, minSpan: 6 },
      prayerTimesCard: { id: "prayerTimesCard", span: 2, minSpan: 2 },
      calendarCard: { id: "calendarCard", span: 2, minSpan: 2 },
      qiblaCard: { id: "qiblaCard", span: 2, minSpan: 2 },
      weatherCard: { id: "weatherCard", span: 6, minSpan: 6 },
      lunarPhaseCard: { id: "lunarPhaseCard", span: 2, minSpan: 2 },
      fastingCard: { id: "fastingCard", span: 2, minSpan: 2 },
      flashcardCard: { id: "flashcardCard", span: 2, minSpan: 2 },
      adhkarCard: { id: "adhkarCard", span: 2, minSpan: 2 },
      hadithCard: { id: "hadithCard", span: 6, minSpan: 6 },
      todoCard: { id: "todoCard", span: 2, minSpan: 2 },
      notesCard: { id: "notesCard", span: 6, minSpan: 6 },
      pocketQuranCard: { id: "pocketQuranCard", span: 6, minSpan: 6 },
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

  /**
   * Enable/disable sidebar mode drag behavior.
   * Actual layout CSS is toggled elsewhere (body.sidebar-mode).
   */
  setSidebarModeEnabled(enabled) {
    const next = enabled === true;
    if (this.isSidebarModeEnabled === next) {
      this.clearSidebarDropTarget();
      return;
    }

    // Persist current mode layout before switching.
    try {
      this.saveLayout();
      if (this.isSidebarModeEnabled) {
        // Leaving sidebar mode: save sidebars too
        this.saveSidebarStateFromDOM();
      }
    } catch (e) {}

    this.isSidebarModeEnabled = next;
    this.clearSidebarDropTarget();

    if (!this.isSidebarModeEnabled) {
      this.endMiddleLayoutResize();
    } else {
      this.clearSidebarAutoEnableBlocked();
    }

    // Switching modes swaps layout + (for sidebar mode) restores docked components.
    if (!this.grid) return;

    if (this.isSidebarModeEnabled) {
      // Enter sidebar mode
      this.undockAllSidebarItemsToGrid();
      this.loadLayoutForMode("sidebar");
      this.applyLayout();
      this.applySidebarStateFromStorage();
      this.applySavedSidebarMiddleLayoutWidth({
        persist: false,
        triggerSnapCheck: true,
      });
    } else {
      // Exit sidebar mode
      this.undockAllSidebarItemsToGrid();
      this.loadLayoutForMode("normal");
      this.applyLayout();
    }

    this.updateFlexBasisForCurrentDOM();
  }

  /**
   * Restore all components currently placed in sidebars back into the grid.
   */
  restoreSidebarItems() {
    // Back-compat: undock everything into the grid.
    this.undockAllSidebarItemsToGrid();
    this.updateSidebarZoneCounts();
    this.updateFlexBasisForCurrentDOM();
  }

  isSidebarAutoEnableBlocked() {
    return this.sidebarAutoEnableBlocked === true;
  }

  clearSidebarAutoEnableBlocked() {
    this.sidebarAutoEnableBlocked = false;
    this.sidebarAutoRestoreMinSideWidth = 0;
  }

  getSavedSidebarStateFromSettings() {
    const settings = this.storage.getSettings();
    const raw = settings[this.getSidebarStateStorageKey()];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { left: [], right: [] };
    }

    const normalizeIds = (ids) =>
      (Array.isArray(ids) ? ids : [])
        .map((id) => String(id || "").trim())
        .filter(Boolean);

    return {
      left: normalizeIds(raw.left),
      right: normalizeIds(raw.right),
    };
  }

  getEstimatedSidebarContentWidth() {
    const layoutEl = this.getSidebarLayoutElement();
    const layoutWidth = Math.round(
      (layoutEl && layoutEl.getBoundingClientRect().width) ||
        this.getLayoutWidth() ||
        window.innerWidth ||
        0,
    );
    if (!Number.isFinite(layoutWidth) || layoutWidth <= 0) return 0;

    const middleWidth = Math.round(
      this.getCurrentSidebarMiddleLayoutWidth() ||
        this.sidebarMiddleLayoutDefaultWidth,
    );
    const sideColumnWidth = Math.max(0, (layoutWidth - middleWidth) / 2);

    return Math.max(
      0,
      Math.round(sideColumnWidth - this.sidebarMiddleLayoutSideGutter),
    );
  }

  hasSavedSidebarItems() {
    const state = this.getSavedSidebarStateFromSettings();
    return state.left.length > 0 || state.right.length > 0;
  }

  canAutoRestoreSidebarMode() {
    if (this.isSidebarModeEnabled || !this.sidebarAutoEnableBlocked) {
      return false;
    }
    if (!this.hasSavedSidebarItems()) return false;

    const availableWidth = this.getEstimatedSidebarContentWidth();
    if (availableWidth <= 0) return false;

    const requiredWidth = Math.max(
      Number(this.sidebarAutoRestoreMinSideWidth) || 0,
      120,
    );

    return availableWidth >= requiredWidth;
  }

  maybeAutoRestoreSidebarMode() {
    if (!this.canAutoRestoreSidebarMode()) return false;

    this.clearSidebarAutoEnableBlocked();
    this.syncSidebarModeForEditState();
    return true;
  }

  getSidebarStateStorageKey() {
    return "sidebarModeSidebars";
  }

  getSidebarWidthStorageKey() {
    return "sidebarModeComponentWidths";
  }

  getSidebarMiddleLayoutWidthStorageKey() {
    return "sidebarMiddleLayoutWidthPx";
  }

  getSidebarMiddleLayoutPreferredWidthStorageKey() {
    return "sidebarMiddleLayoutPreferredWidthPx";
  }

  getSidebarLayoutElement() {
    return document.getElementById("sidebarLayout");
  }

  getSidebarMiddleElement() {
    return document.getElementById("sidebarMiddle");
  }

  getSidebarViewportWidthForMiddleLayout() {
    const width = Math.round(
      window.innerWidth ||
        document.documentElement.clientWidth ||
        document.body.clientWidth ||
        0,
    );
    return Number.isFinite(width) && width > 0 ? width : 0;
  }

  getViewportAutoZoomBaseWidth() {
    const threshold = Math.max(
      1000,
      Math.round(this.viewportAutoZoomThresholdWidth || 1000),
    );

    const preferredWidth = Number(this.getPreferredSidebarMiddleLayoutWidth());
    const currentMiddleWidth = Number(
      this.getCurrentSidebarMiddleLayoutWidth(),
    );

    let requiredWidth = Math.max(
      threshold,
      Number.isFinite(preferredWidth) ? preferredWidth : 0,
      Number.isFinite(currentMiddleWidth) ? currentMiddleWidth : 0,
      Math.round(this.sidebarMiddleLayoutMinWidth || threshold),
    );

    if (this.isSidebarModeEnabled) {
      const leftRequired = Number(
        this.getSidebarZoneRequiredWidth(this.getSidebarZone("left")),
      );
      const rightRequired = Number(
        this.getSidebarZoneRequiredWidth(this.getSidebarZone("right")),
      );

      requiredWidth = Math.max(
        requiredWidth,
        (Number.isFinite(currentMiddleWidth) ? currentMiddleWidth : threshold) +
          Math.max(0, Number.isFinite(leftRequired) ? leftRequired : 0) +
          Math.max(0, Number.isFinite(rightRequired) ? rightRequired : 0),
      );
    }

    return Math.max(threshold, Math.round(requiredWidth));
  }

  clearViewportAutoZoom() {
    const root = document.documentElement;
    if (root) {
      root.style.removeProperty("zoom");
      root.style.removeProperty("--md-viewport-auto-zoom");
    }

    if (document.body) {
      document.body.classList.remove("viewport-auto-zoom");
    }

    this.viewportAutoZoomActive = false;
    this.viewportAutoZoomScale = 1;
  }

  applyViewportAutoZoomIfNeeded(viewportWidth) {
    const width = Math.round(Number(viewportWidth));
    const threshold = Math.max(
      1000,
      Math.round(this.viewportAutoZoomThresholdWidth || 1000),
    );

    if (!Number.isFinite(width) || width <= 0 || width >= threshold) {
      this.clearViewportAutoZoom();
      return false;
    }

    const requiredLayoutWidth = this.getViewportAutoZoomBaseWidth();

    const scale = Number(
      Math.max(0.35, Math.min(1, width / requiredLayoutWidth)).toFixed(4),
    );
    const root = document.documentElement;

    if (root) {
      root.style.zoom = String(scale);
      root.style.setProperty("--md-viewport-auto-zoom", String(scale));
    }

    if (document.body) {
      document.body.classList.add("viewport-auto-zoom");
    }

    this.viewportAutoZoomActive = true;
    this.viewportAutoZoomScale = scale;
    return true;
  }

  getSidebarMiddleLayoutBounds() {
    return {
      minWidth: Math.max(1, Math.round(this.sidebarMiddleLayoutMinWidth || 1)),
      maxWidth: Number.MAX_SAFE_INTEGER,
    };
  }

  clampSidebarMiddleLayoutWidth(widthPx, { fallback = null } = {}) {
    const numericWidth = Number(widthPx);
    if (!Number.isFinite(numericWidth) || numericWidth <= 0) {
      return fallback;
    }

    const { minWidth, maxWidth } = this.getSidebarMiddleLayoutBounds();
    return Math.round(Math.min(maxWidth, Math.max(minWidth, numericWidth)));
  }

  getSavedSidebarMiddleLayoutWidth() {
    const settings = this.storage.getSettings();
    const rawValue = Number(
      settings[this.getSidebarMiddleLayoutWidthStorageKey()],
    );
    return this.clampSidebarMiddleLayoutWidth(rawValue, { fallback: null });
  }

  setSavedSidebarMiddleLayoutWidth(widthPx) {
    const width = this.clampSidebarMiddleLayoutWidth(widthPx, {
      fallback: null,
    });
    if (!Number.isFinite(width) || width <= 0) return;

    const settings = this.storage.getSettings();
    settings[this.getSidebarMiddleLayoutWidthStorageKey()] = width;
    this.storage.saveSettings(settings);
  }

  getSavedSidebarMiddleLayoutPreferredWidth() {
    const settings = this.storage.getSettings();
    const rawValue = Number(
      settings[this.getSidebarMiddleLayoutPreferredWidthStorageKey()],
    );
    return this.clampSidebarMiddleLayoutWidth(rawValue, { fallback: null });
  }

  setSavedSidebarMiddleLayoutPreferredWidth(widthPx) {
    const width = this.clampSidebarMiddleLayoutWidth(widthPx, {
      fallback: null,
    });
    if (!Number.isFinite(width) || width <= 0) return;

    const settings = this.storage.getSettings();
    settings[this.getSidebarMiddleLayoutPreferredWidthStorageKey()] = width;
    this.storage.saveSettings(settings);
  }

  getPreferredSidebarMiddleLayoutWidth() {
    const preferredWidth = this.getSavedSidebarMiddleLayoutPreferredWidth();
    const savedWidth = this.getSavedSidebarMiddleLayoutWidth();

    if (!preferredWidth && savedWidth) {
      this.setSavedSidebarMiddleLayoutPreferredWidth(savedWidth);
    }

    const candidate =
      preferredWidth || savedWidth || this.sidebarMiddleLayoutDefaultWidth;

    return this.clampSidebarMiddleLayoutWidth(candidate, {
      fallback: this.sidebarMiddleLayoutDefaultWidth,
    });
  }

  getResponsiveSidebarMiddleLayoutWidth() {
    const preferredWidth = this.getPreferredSidebarMiddleLayoutWidth();
    const { minWidth } = this.getSidebarMiddleLayoutBounds();
    const viewportWidth = this.getSidebarViewportWidthForMiddleLayout();

    if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) {
      return preferredWidth;
    }

    const maxAllowedWidth = Math.max(minWidth, Math.round(viewportWidth));
    return Math.max(minWidth, Math.min(preferredWidth, maxAllowedWidth));
  }

  syncSidebarMiddleLayoutWidthToViewport({
    persist = true,
    triggerSnapCheck = true,
  } = {}) {
    const targetWidth = this.getResponsiveSidebarMiddleLayoutWidth();
    const currentWidth = this.getCurrentSidebarMiddleLayoutWidth();

    if (Math.abs(currentWidth - targetWidth) <= 1) {
      if (persist) {
        this.setSavedSidebarMiddleLayoutWidth(targetWidth);
      }
      return { width: targetWidth, snapped: false, changed: false };
    }

    const result = this.applySidebarMiddleLayoutWidth(targetWidth, {
      persist,
      triggerSnapCheck,
      persistPreferred: false,
    });

    return {
      ...result,
      changed: true,
    };
  }

  resetSidebarMiddleLayoutWidth({ persist = true } = {}) {
    const layoutEl = this.getSidebarLayoutElement();
    if (layoutEl) {
      layoutEl.style.removeProperty("--sidebar-middle-fixed-width");
    }

    if (!persist) return;

    const settings = this.storage.getSettings();
    delete settings[this.getSidebarMiddleLayoutWidthStorageKey()];
    delete settings[this.getSidebarMiddleLayoutPreferredWidthStorageKey()];
    this.storage.saveSettings(settings);
  }

  getCurrentSidebarMiddleLayoutWidth() {
    const middleEl = this.getSidebarMiddleElement();
    const mainContainer = document.querySelector(
      "#sidebarMiddle > .main-container",
    );
    const rectSource = this.isSidebarModeEnabled ? middleEl : mainContainer;
    const rectWidth = Math.round(
      (rectSource && rectSource.getBoundingClientRect().width) || 0,
    );
    if (rectWidth > 0) return rectWidth;

    const saved = this.getSavedSidebarMiddleLayoutWidth();
    return saved || this.getPreferredSidebarMiddleLayoutWidth();
  }

  getSidebarZoneRequiredWidth(zoneEl) {
    if (!zoneEl) return 0;

    const items = Array.from(
      zoneEl.querySelectorAll(":scope > .sidebar-slot > .grid-draggable"),
    );
    if (items.length === 0) return 0;

    let required = 0;
    items.forEach((el) => {
      const componentId = this.getSidebarComponentId(el);
      const minWidth = this.getSidebarMinResizeWidth(el);
      const savedWidth = Number(
        this.getSavedSidebarComponentWidth(componentId),
      );
      const activeWidth = Number(el.dataset.sidebarCustomWidth);

      if (Number.isFinite(minWidth)) {
        required = Math.max(required, minWidth);
      }
      if (Number.isFinite(savedWidth) && savedWidth > 0) {
        required = Math.max(required, Math.round(savedWidth));
      }
      if (Number.isFinite(activeWidth) && activeWidth > 0) {
        required = Math.max(required, Math.round(activeWidth));
      }
    });

    return required > 0 ? required + 6 : 0;
  }

  restoreSidebarItemsToSavedMiddleLayout() {
    if (!this.grid) return false;

    const leftZone = this.getSidebarZone("left");
    const rightZone = this.getSidebarZone("right");
    const hasSidebarItems =
      this.getSidebarZoneItemCount(leftZone) > 0 ||
      this.getSidebarZoneItemCount(rightZone) > 0;

    if (!hasSidebarItems) return false;

    this.undockAllSidebarItemsToGrid();
    this.loadLayoutForMode("normal");
    this.applyLayout();
    this.updateFlexBasisForCurrentDOM();

    try {
      this.saveLayout();
      this.saveSidebarStateFromDOM();
    } catch (e) {}

    this.showToast(
      "Sidebar cards moved back to center layout because side columns became too narrow.",
      "info",
    );
    return true;
  }

  isSidebarElementHorizontallyClipped(el, zoneEl, tolerancePx = 2) {
    if (!el || !zoneEl) return false;

    const elementRect = el.getBoundingClientRect();
    const zoneRect = zoneEl.getBoundingClientRect();

    if (elementRect.width > zoneRect.width + tolerancePx) {
      return true;
    }

    if (
      elementRect.left < zoneRect.left - tolerancePx ||
      elementRect.right > zoneRect.right + tolerancePx
    ) {
      return true;
    }

    if (el.scrollWidth > el.clientWidth + tolerancePx) {
      return true;
    }

    return false;
  }

  hasSidebarHorizontalClipping(tolerancePx = 2) {
    if (!this.isSidebarModeEnabled) return false;

    const zones = [
      this.getSidebarZone("left"),
      this.getSidebarZone("right"),
    ].filter(Boolean);

    for (const zoneEl of zones) {
      if (zoneEl.scrollWidth > zoneEl.clientWidth + tolerancePx) {
        return true;
      }

      const items = Array.from(
        zoneEl.querySelectorAll(":scope > .sidebar-slot > .grid-draggable"),
      );

      for (const el of items) {
        if (this.isSidebarElementHorizontallyClipped(el, zoneEl, tolerancePx)) {
          return true;
        }
      }
    }

    return false;
  }

  collapseSidebarModeDueToClipping() {
    if (!this.isSidebarModeEnabled) return false;
    if (this.sidebarClippingCollapseInProgress) return true;

    this.sidebarClippingCollapseInProgress = true;

    try {
      const currentWidth = this.getCurrentSidebarMiddleLayoutWidth();
      if (currentWidth > 0) {
        this.setSavedSidebarMiddleLayoutWidth(currentWidth);
      }

      const collapseSideWidth = this.getEstimatedSidebarContentWidth();

      this.sidebarAutoEnableBlocked = true;
      this.sidebarAutoRestoreMinSideWidth = Math.max(
        120,
        Math.round(collapseSideWidth + 36),
      );
      this.isMiddleLayoutResizing = false;
      this.middleLayoutResizeState = null;
      document.body.classList.remove("middle-layout-resizing");

      if (
        window.dashboard &&
        typeof window.dashboard._setSidebarModeEnabled === "function"
      ) {
        window.dashboard._setSidebarModeEnabled(false);
      } else {
        this.setSidebarModeEnabled(false);
      }

      this.showToast(
        "Sidebars were removed because their content started clipping. Components were snapped back to center layout.",
        "info",
      );

      return true;
    } finally {
      this.sidebarClippingCollapseInProgress = false;
    }
  }

  maybeSnapSidebarItemsBackToMiddleLayout() {
    if (!this.isSidebarModeEnabled) return false;
    if (!this.hasSidebarHorizontalClipping()) return false;

    return this.collapseSidebarModeDueToClipping();
  }

  applySidebarMiddleLayoutWidth(
    widthPx,
    { persist = true, triggerSnapCheck = true, persistPreferred = false } = {},
  ) {
    const layoutEl = this.getSidebarLayoutElement();
    if (!layoutEl) {
      return { width: 0, snapped: false };
    }

    const clampedWidth = this.clampSidebarMiddleLayoutWidth(widthPx, {
      fallback: null,
    });
    if (!Number.isFinite(clampedWidth) || clampedWidth <= 0) {
      return { width: 0, snapped: false };
    }

    layoutEl.style.setProperty(
      "--sidebar-middle-fixed-width",
      `${clampedWidth}px`,
    );

    if (persist) {
      this.setSavedSidebarMiddleLayoutWidth(clampedWidth);
    }
    if (persistPreferred) {
      this.setSavedSidebarMiddleLayoutPreferredWidth(clampedWidth);
    }

    let snapped = false;
    if (triggerSnapCheck) {
      if (this.isSidebarModeEnabled) {
        snapped = this.maybeSnapSidebarItemsBackToMiddleLayout();
      } else {
        this.maybeAutoRestoreSidebarMode();
      }
    }

    return {
      width: clampedWidth,
      snapped,
    };
  }

  applySavedSidebarMiddleLayoutWidth({
    persist = false,
    triggerSnapCheck = true,
  } = {}) {
    const targetWidth = this.getResponsiveSidebarMiddleLayoutWidth();

    return this.applySidebarMiddleLayoutWidth(targetWidth, {
      persist,
      triggerSnapCheck,
      persistPreferred: false,
    });
  }

  getMainEditModeStorageKey() {
    return "gridEditModeEnabled";
  }

  getFocusEditModeStorageKey() {
    return "gridEditModeEnabledQuranFocus";
  }

  isQuranFocusModeContextActive() {
    const bodyHasFocusClass =
      !!document.body && document.body.classList.contains("quran-focus-mode");

    if (!bodyHasFocusClass && this.isQuranFocusModeContext) {
      const dashboardFocusActive =
        !!window.dashboard && window.dashboard._quranFocusModeActive === true;
      if (!dashboardFocusActive) {
        this.isQuranFocusModeContext = false;
      }
    }

    return this.isQuranFocusModeContext || bodyHasFocusClass;
  }

  getEditModeStorageKey() {
    return this.isQuranFocusModeContextActive()
      ? this.getFocusEditModeStorageKey()
      : this.getMainEditModeStorageKey();
  }

  setQuranFocusModeActive(active) {
    this.isQuranFocusModeContext = active === true;

    if (!this.isQuranFocusModeContext) {
      const pocketQuranCard = document.getElementById("pocketQuranCard");
      this.clearQuranFocusFloatingWidthStyles(pocketQuranCard);
    }

    // Focus mode and main layout keep separate edit-mode state.
    const settings = this.storage.getSettings();
    const editModeStorageKey = this.getEditModeStorageKey();
    this.isEditModeEnabled = settings[editModeStorageKey] === true;

    const toggleBtn = document.getElementById("layoutEditBtn");
    this.updateEditModeUI(toggleBtn);
    this.clearSidebarDropTarget();
  }

  isSidebarDropAllowed() {
    return this.isSidebarModeEnabled && !this.isQuranFocusModeContextActive();
  }

  isFocusModePocketQuranElement(el) {
    return (
      !!el &&
      this.getSidebarComponentId(el) === "pocketQuranCard" &&
      this.isQuranFocusModeContextActive()
    );
  }

  applyQuranFocusFloatingWidthStyles(el, widthPx) {
    if (!el) return;

    const width = Math.round(Number(widthPx) || 0);
    if (!Number.isFinite(width) || width <= 0) return;

    // Clear any stale drag offsets/transforms so focus-mode centering stays
    // stable when edit mode is toggled on/off after a resize.
    el.style.removeProperty("left");
    el.style.removeProperty("right");
    el.style.removeProperty("top");
    el.style.removeProperty("bottom");
    el.style.removeProperty("transform");

    el.classList.add("quran-focus-floating-width");
    el.style.setProperty("--quran-focus-pocket-width", `${width}px`);
  }

  clearQuranFocusFloatingWidthStyles(el) {
    if (!el) return;
    el.classList.remove("quran-focus-floating-width");
    el.style.removeProperty("--quran-focus-pocket-width");
    el.style.removeProperty("left");
    el.style.removeProperty("right");
    el.style.removeProperty("top");
    el.style.removeProperty("bottom");
    el.style.removeProperty("transform");
  }

  getFocusModeMiddleWidthStorageKey() {
    return "quranFocusMiddleComponentWidths";
  }

  getNormalWideMiddleWidthStorageKey() {
    return "sidebarMiddleComponentWidthsNormalWide";
  }

  getCompressedMiddleWidthStorageKey() {
    return "sidebarMiddleComponentWidthsCompressed";
  }

  getLegacyMiddleWidthStorageKey() {
    return "sidebarMiddleComponentWidths";
  }

  getMiddleWidthStorageKey(componentId = "") {
    const id = String(componentId || "").trim();
    const isQuranFocusPocketQuran =
      id === "pocketQuranCard" && this.isQuranFocusModeContextActive();

    if (isQuranFocusPocketQuran) {
      return this.getFocusModeMiddleWidthStorageKey();
    }

    const mainLayoutMode = this.getMainContainerLayoutMode();
    return mainLayoutMode === "compressed"
      ? this.getCompressedMiddleWidthStorageKey()
      : this.getNormalWideMiddleWidthStorageKey();
  }

  getSidebarWidthMapFromSettings() {
    const settings = this.storage.getSettings();
    const raw = settings[this.getSidebarWidthStorageKey()];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return {};
    }

    const normalized = {};
    Object.entries(raw).forEach(([id, width]) => {
      const value = Number(width);
      if (!id || !Number.isFinite(value) || value <= 0) return;
      normalized[id] = Math.round(value);
    });

    return normalized;
  }

  saveSidebarWidthMapToSettings(widthMap) {
    const settings = this.storage.getSettings();
    settings[this.getSidebarWidthStorageKey()] = { ...(widthMap || {}) };
    this.storage.saveSettings(settings);
  }

  getMiddleWidthMapFromSettings(componentId = "") {
    const settings = this.storage.getSettings();
    const selectedKey = this.getMiddleWidthStorageKey(componentId);

    let raw = settings[selectedKey];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      // Back-compat: if mode-specific maps are missing, fall back to the
      // previous single-key middle width map.
      const legacyRaw = settings[this.getLegacyMiddleWidthStorageKey()];
      if (
        legacyRaw &&
        typeof legacyRaw === "object" &&
        !Array.isArray(legacyRaw)
      ) {
        raw = legacyRaw;
      }
    }

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return {};
    }

    const normalized = {};
    Object.entries(raw).forEach(([id, width]) => {
      const value = Number(width);
      if (!id || !Number.isFinite(value) || value <= 0) return;
      normalized[id] = Math.round(value);
    });

    return normalized;
  }

  saveMiddleWidthMapToSettings(widthMap, componentId = "") {
    const settings = this.storage.getSettings();
    const selectedKey = this.getMiddleWidthStorageKey(componentId);
    settings[selectedKey] = {
      ...(widthMap || {}),
    };

    // Back-compat: keep the legacy key synchronized with the normal-wide map.
    if (selectedKey === this.getNormalWideMiddleWidthStorageKey()) {
      settings[this.getLegacyMiddleWidthStorageKey()] = {
        ...(widthMap || {}),
      };
    }

    this.storage.saveSettings(settings);
  }

  getSidebarComponentId(el) {
    if (!el) return "";
    return String(el.dataset.gridId || el.id || "").trim();
  }

  getSavedSidebarComponentWidth(componentId) {
    const id = String(componentId || "").trim();
    if (!id) return null;

    const widthMap = this.getSidebarWidthMapFromSettings();
    const value = Number(widthMap[id]);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  setSavedSidebarComponentWidth(componentId, widthPx) {
    const id = String(componentId || "").trim();
    const value = Number(widthPx);
    if (!id || !Number.isFinite(value) || value <= 0) return;

    const widthMap = this.getSidebarWidthMapFromSettings();
    widthMap[id] = Math.round(value);
    this.saveSidebarWidthMapToSettings(widthMap);
  }

  clearSavedSidebarComponentWidth(componentId) {
    const id = String(componentId || "").trim();
    if (!id) return;

    const widthMap = this.getSidebarWidthMapFromSettings();
    if (!Object.prototype.hasOwnProperty.call(widthMap, id)) return;

    delete widthMap[id];
    this.saveSidebarWidthMapToSettings(widthMap);
  }

  getSavedMiddleComponentWidth(componentId) {
    const id = String(componentId || "").trim();
    if (!id) return null;

    const widthMap = this.getMiddleWidthMapFromSettings(id);
    const value = Number(widthMap[id]);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  setSavedMiddleComponentWidth(componentId, widthPx) {
    const id = String(componentId || "").trim();
    const value = Number(widthPx);
    if (!id || !Number.isFinite(value) || value <= 0) return;

    const widthMap = this.getMiddleWidthMapFromSettings(id);
    widthMap[id] = Math.round(value);
    this.saveMiddleWidthMapToSettings(widthMap, id);
  }

  clearSavedMiddleComponentWidth(componentId) {
    const id = String(componentId || "").trim();
    if (!id) return;

    const widthMap = this.getMiddleWidthMapFromSettings(id);
    if (!Object.prototype.hasOwnProperty.call(widthMap, id)) return;

    delete widthMap[id];
    this.saveMiddleWidthMapToSettings(widthMap, id);
  }

  getSidebarMinResizeWidth(el) {
    const componentId = this.getSidebarComponentId(el);
    const configuredMin = Number(this.componentMinWidths[componentId]);
    const fallbackMin = 220;
    if (!Number.isFinite(configuredMin) || configuredMin <= 0) {
      return fallbackMin;
    }

    return Math.max(180, Math.min(420, Math.round(configuredMin)));
  }

  getSidebarMaxResizeWidth(el) {
    if (!el) return this.getSidebarMinResizeWidth(el);

    const slot = el.closest(".sidebar-slot");
    const zone = slot ? slot.closest(".sidebar-zone") : null;
    const slotWidth = Math.round((slot && slot.clientWidth) || 0);
    const zoneWidth = Math.round((zone && zone.clientWidth) || 0);
    const currentWidth = Math.round(el.getBoundingClientRect().width || 0);

    return Math.max(
      slotWidth,
      zoneWidth,
      currentWidth,
      this.getSidebarMinResizeWidth(el),
    );
  }

  getMiddleMinResizeWidth(el) {
    const componentId = this.getSidebarComponentId(el);
    const configuredMin = Number(this.componentMinWidths[componentId]);
    const fallbackMin = 220;
    if (!Number.isFinite(configuredMin) || configuredMin <= 0) {
      return fallbackMin;
    }

    return Math.max(180, Math.min(620, Math.round(configuredMin)));
  }

  getMiddleMaxResizeWidth(el) {
    if (!el) return this.getMiddleMinResizeWidth(el);

    const minWidth = this.getMiddleMinResizeWidth(el);
    const currentWidth = Math.round(el.getBoundingClientRect().width || 0);
    if (this.isFocusModePocketQuranElement(el)) {
      // Focus mode uses a fixed-position Pocket Quran overlay, so clamp by viewport
      // width instead of row/layout flow to bypass grid/container limits.
      const viewportWidth = Math.round((window.innerWidth || 0) - 24);
      return Math.max(viewportWidth, currentWidth, minWidth);
    }

    const row = el.closest(".grid-flex-row");
    const rowWidth = Math.round((row && row.clientWidth) || 0);
    const layoutWidth = Math.round(this.getLayoutWidth() || 0);
    const baseMax = Math.max(rowWidth, layoutWidth, currentWidth, minWidth);

    const componentId = this.getSidebarComponentId(el);
    if (this.isThreeItemComponentId(componentId)) {
      const mainContainerWidth = Math.round(
        this.getMainContainerResponsiveWidth() || 0,
      );
      const hardCap = Math.max(
        1,
        Math.round(
          Number.isFinite(mainContainerWidth) && mainContainerWidth > 0
            ? mainContainerWidth
            : baseMax,
        ),
      );

      const cappedByRowBudget = this.getThreeItemRowResizeBudgetCap(
        el,
        hardCap,
      );
      return Math.max(1, Math.min(baseMax, cappedByRowBudget));
    }

    return baseMax;
  }

  applySidebarWidthToElement(el, widthPx, { persist = true } = {}) {
    if (!el) return;

    const width = Number(widthPx);
    if (!Number.isFinite(width) || width <= 0) return;

    const minWidth = this.getSidebarMinResizeWidth(el);
    const maxWidth = this.getSidebarMaxResizeWidth(el);
    const clampedWidth = Math.round(
      Math.min(maxWidth, Math.max(minWidth, width)),
    );

    el.style.width = `${clampedWidth}px`;
    el.style.maxWidth = `${clampedWidth}px`;
    el.style.marginLeft = "auto";
    el.style.marginRight = "auto";
    el.classList.add("sidebar-custom-width");
    el.dataset.sidebarCustomWidth = String(clampedWidth);

    if (persist) {
      const componentId = this.getSidebarComponentId(el);
      if (componentId) {
        this.setSavedSidebarComponentWidth(componentId, clampedWidth);
      }
    }
  }

  restoreDefaultFlexForElement(el) {
    if (!el || !this.grid) return;
    if (el.classList.contains("sidebar-detached")) return;

    const id = this.getSidebarComponentId(el);
    if (!id || !this.componentSpans[id]) return;

    const row = el.closest(".grid-flex-row");
    if (!row) return;

    const visibleItems = Array.from(row.children).filter(
      (child) => !this.isComponentHidden(child),
    );
    this.setItemFlexBasis(el, id, visibleItems.length);
  }

  applyMiddleWidthToElement(el, widthPx, { persist = true } = {}) {
    if (!el || el.classList.contains("sidebar-detached")) return;

    const width = Number(widthPx);
    if (!Number.isFinite(width) || width <= 0) return;

    const minWidth = this.getMiddleMinResizeWidth(el);
    const maxWidth = this.getMiddleMaxResizeWidth(el);
    const clampedWidth = Math.round(
      Math.min(maxWidth, Math.max(minWidth, width)),
    );

    el.style.width = `${clampedWidth}px`;
    el.style.maxWidth = `${clampedWidth}px`;
    el.style.flex = `0 0 ${clampedWidth}px`;
    if (this.isFocusModePocketQuranElement(el)) {
      this.applyQuranFocusFloatingWidthStyles(el, clampedWidth);
      el.style.marginLeft = "auto";
      el.style.marginRight = "auto";
    } else {
      this.clearQuranFocusFloatingWidthStyles(el);
      el.style.marginLeft = "auto";
      el.style.marginRight = "auto";
    }
    el.classList.add("middle-custom-width");
    el.dataset.middleCustomWidth = String(clampedWidth);

    if (persist) {
      const componentId = this.getSidebarComponentId(el);
      if (componentId) {
        this.setSavedMiddleComponentWidth(componentId, clampedWidth);
      }
    }
  }

  resetSidebarWidthForElement(el, { keepSaved = true } = {}) {
    if (!el) return;

    el.style.removeProperty("width");
    el.style.removeProperty("max-width");
    el.style.removeProperty("margin-left");
    el.style.removeProperty("margin-right");
    el.classList.remove("sidebar-custom-width");
    delete el.dataset.sidebarCustomWidth;

    if (!keepSaved) {
      const componentId = this.getSidebarComponentId(el);
      if (componentId) {
        this.clearSavedSidebarComponentWidth(componentId);
      }
    }
  }

  resetMiddleWidthForElement(
    el,
    { keepSaved = true, restoreDefaultFlex = true } = {},
  ) {
    if (!el) return;

    this.clearQuranFocusFloatingWidthStyles(el);

    el.style.removeProperty("width");
    el.style.removeProperty("max-width");
    el.style.removeProperty("margin-left");
    el.style.removeProperty("margin-right");
    el.classList.remove("middle-custom-width");
    delete el.dataset.middleCustomWidth;

    if (restoreDefaultFlex) {
      this.restoreDefaultFlexForElement(el);
    }

    if (!keepSaved) {
      const componentId = this.getSidebarComponentId(el);
      if (componentId) {
        this.clearSavedMiddleComponentWidth(componentId);
      }
    }
  }

  applySavedSidebarWidthToElement(el) {
    if (!el) return;

    const componentId = this.getSidebarComponentId(el);
    const savedWidth = this.getSavedSidebarComponentWidth(componentId);
    if (savedWidth) {
      this.applySidebarWidthToElement(el, savedWidth, { persist: false });
      return;
    }

    this.resetSidebarWidthForElement(el, { keepSaved: true });
  }

  applySavedMiddleWidthToElement(el) {
    if (!el || el.classList.contains("sidebar-detached")) return;

    const componentId = this.getSidebarComponentId(el);
    const savedWidth = this.getSavedMiddleComponentWidth(componentId);
    if (savedWidth) {
      this.applyMiddleWidthToElement(el, savedWidth, { persist: false });
      return;
    }

    if (
      el.classList.contains("middle-custom-width") ||
      el.dataset.middleCustomWidth
    ) {
      this.resetMiddleWidthForElement(el, {
        keepSaved: true,
        restoreDefaultFlex: true,
      });
    }
  }

  applySavedMiddleWidthsFromDOM() {
    if (!this.grid) return;

    const middleItems = Array.from(
      this.grid.querySelectorAll(".grid-flex-row > .grid-draggable"),
    ).filter((el) => !el.classList.contains("sidebar-detached"));

    middleItems.forEach((el) => {
      this.ensureSidebarResizeHandles(el);
      this.applySavedMiddleWidthToElement(el);
    });
  }

  ensureSidebarResizeHandles(el) {
    if (!el) return;
    el.classList.add("sidebar-resizable-host");

    const hasLeft = !!el.querySelector(":scope > .sidebar-resize-handle-left");
    const hasRight = !!el.querySelector(
      ":scope > .sidebar-resize-handle-right",
    );

    const makeHandle = (side) => {
      const handle = document.createElement("div");
      handle.className = `sidebar-resize-handle sidebar-resize-handle-${side}`;
      handle.setAttribute("aria-hidden", "true");
      return handle;
    };

    if (!hasLeft) {
      el.appendChild(makeHandle("left"));
    }
    if (!hasRight) {
      el.appendChild(makeHandle("right"));
    }
  }

  removeSidebarResizeHandles(el) {
    if (!el) return;

    Array.from(el.querySelectorAll(":scope > .sidebar-resize-handle")).forEach(
      (handle) => {
        try {
          handle.remove();
        } catch (e) {}
      },
    );
    el.classList.remove("sidebar-resizable-host", "sidebar-resizing");
  }

  getSavedNormalLayoutForMode(settings, layoutMode = "normalWide") {
    const modeKey = this.getNormalLayoutStorageKeyForMode(layoutMode);

    let savedLayout = settings[modeKey];

    if (!Array.isArray(savedLayout) || savedLayout.length === 0) {
      // Compressed mode can fall back to wide layout if it has never been saved.
      if (layoutMode === "compressed") {
        savedLayout =
          settings[this.getNormalLayoutStorageKeyForMode("normalWide")];
      }
    }

    if (!Array.isArray(savedLayout) || savedLayout.length === 0) {
      savedLayout = settings.gridLayoutNormal;
    }

    if (!Array.isArray(savedLayout) || savedLayout.length === 0) {
      savedLayout = settings.gridLayout;
    }

    return savedLayout;
  }

  loadLayoutForMode(mode) {
    const settings = this.storage.getSettings();

    let savedLayout = null;
    if (mode === "sidebar") {
      savedLayout = settings[this.getSidebarLayoutStorageKey()];
    } else {
      const normalMode = this.getMainContainerLayoutMode();
      savedLayout = this.getSavedNormalLayoutForMode(settings, normalMode);
      this.currentMainContainerLayoutMode = normalMode;
    }

    // Normalize/validate
    const normalized = this.normalizeLayout(savedLayout);
    this.rows = normalized;
    this.activeRows = JSON.parse(JSON.stringify(normalized));
  }

  normalizeLayout(layout) {
    const base = Array.isArray(layout) ? layout : null;
    const rows =
      base && Array.isArray(base) && base.length > 0
        ? JSON.parse(JSON.stringify(base))
        : JSON.parse(JSON.stringify(this.defaultLayout));

    // Validate saved layout has all components
    const allIds = new Set(Object.keys(this.componentSpans));
    const savedIds = new Set(rows.flat());
    const missingIds = [...allIds].filter((id) => !savedIds.has(id));

    if (missingIds.length > 0) {
      missingIds.forEach((id) => {
        const defaultRow = this.defaultLayout.find((row) => row.includes(id));
        if (defaultRow) {
          const defaultIndex = this.defaultLayout.indexOf(defaultRow);
          if (rows[defaultIndex]) {
            rows[defaultIndex].push(id);
          } else {
            rows.push([id]);
          }
        } else {
          rows.push([id]);
        }
      });
    }

    return rows;
  }

  getSidebarStateFromDOM() {
    const leftZone = this.getSidebarZone("left");
    const rightZone = this.getSidebarZone("right");
    const getIds = (zone) => {
      if (!zone) return [];
      return Array.from(
        zone.querySelectorAll(":scope > .sidebar-slot > .grid-draggable"),
      )
        .map((el) => el.dataset.gridId)
        .filter(Boolean);
    };

    return {
      left: getIds(leftZone),
      right: getIds(rightZone),
    };
  }

  saveSidebarStateFromDOM() {
    const state = this.getSidebarStateFromDOM();
    const settings = this.storage.getSettings();
    settings[this.getSidebarStateStorageKey()] = state;
    this.storage.saveSettings(settings);
  }

  applySidebarStateFromStorage() {
    const settings = this.storage.getSettings();
    const stored = settings[this.getSidebarStateStorageKey()];
    const state =
      stored && typeof stored === "object"
        ? {
            left: Array.isArray(stored.left) ? stored.left : [],
            right: Array.isArray(stored.right) ? stored.right : [],
          }
        : { left: [], right: [] };

    this.applySidebarState(state);
  }

  applySidebarState(state) {
    // Ensure clean slate
    this.undockAllSidebarItemsToGrid();

    const dockList = (side, ids) => {
      (Array.isArray(ids) ? ids : []).forEach((id) => {
        const el = this.getElementByComponentId(id);
        if (!el) return;
        this.dockElementToSidebar(el, side);
      });
    };

    dockList("left", state.left || []);
    dockList("right", state.right || []);

    this.updateSidebarZoneCounts();
    this.cleanupEmptyRows();
    this.updateRowsFromDOM();
  }

  undockAllSidebarItemsToGrid() {
    if (!this.grid) return;
    const zones = [
      this.getSidebarZone("left"),
      this.getSidebarZone("right"),
    ].filter(Boolean);

    zones.forEach((zone) => {
      Array.from(zone.querySelectorAll(":scope > .sidebar-slot")).forEach(
        (slot) => {
          const child = slot.querySelector(":scope > .grid-draggable");
          if (child) {
            this.resetSidebarWidthForElement(child, { keepSaved: true });
            child.classList.remove("sidebar-detached");
            this.grid.appendChild(child);
            this.ensureSidebarResizeHandles(child);
          }
          try {
            slot.remove();
          } catch (e) {}
        },
      );
    });

    this.updateSidebarZoneCounts();
  }

  dockElementToSidebar(el, side, index = null) {
    const zone = this.getSidebarZone(side);
    if (!zone || !el) return false;

    this.resetMiddleWidthForElement(el, {
      keepSaved: true,
      restoreDefaultFlex: false,
    });

    // Ensure element is not counted in grid
    el.classList.add("sidebar-detached");

    // Ensure element is draggable (for sidebar drag support)
    el.classList.add("grid-draggable");
    el.setAttribute("draggable", "false"); // We use custom drag

    // Ensure data-grid-id is set
    const id = el.id || el.dataset.gridId;
    if (id && !el.dataset.gridId) {
      el.dataset.gridId = id;
    }

    // Remove flex constraints so it can fit sidebar width
    el.style.flex = "";
    el.style.maxWidth = "";
    el.style.minWidth = "";
    this.ensureSidebarResizeHandles(el);

    const slot = document.createElement("div");
    slot.className = "sidebar-slot";
    slot.appendChild(el);

    if (typeof index === "number" && index >= 0) {
      const existing = Array.from(zone.children);
      if (existing[index]) zone.insertBefore(slot, existing[index]);
      else zone.appendChild(slot);
    } else {
      zone.appendChild(slot);
    }

    this.applySavedSidebarWidthToElement(el);

    return true;
  }

  cleanupEmptyRows() {
    if (!this.grid) return;

    this.grid.querySelectorAll(".grid-flex-row").forEach((row) => {
      row.classList.remove("grid-row-target");
      const visibleChildren = Array.from(row.children).filter(
        (el) =>
          el.classList &&
          el.classList.contains("grid-draggable") &&
          !this.isComponentHidden(el),
      );
      if (visibleChildren.length === 0) {
        // If it's an empty row (or only contains placeholders/markers), remove it.
        const hasReal = Array.from(row.children).some(
          (el) => el.classList && el.classList.contains("grid-draggable"),
        );
        if (!hasReal) {
          row.remove();
        }
      }
    });

    this.grid.querySelectorAll(".grid-flex-row-new").forEach((row) => {
      if (row.children.length === 0) row.remove();
    });
  }

  getSidebarZone(side) {
    if (side === "left") return document.getElementById("sidebarLeftZone");
    if (side === "right") return document.getElementById("sidebarRightZone");
    return null;
  }

  getSidebarZoneItemCount(zoneEl) {
    if (!zoneEl) return 0;
    return zoneEl.querySelectorAll(":scope > .sidebar-slot").length;
  }

  updateSidebarZoneCounts() {
    // Legacy no-op: old implementation toggled count-* classes.
    // Sidebar now supports infinite rows.
    return;
  }

  /**
   * Add sidebar-is-dragging class to both sidebar zones for visual feedback
   */
  addSidebarDraggingClass() {
    const leftZone = this.getSidebarZone("left");
    const rightZone = this.getSidebarZone("right");
    if (leftZone) leftZone.classList.add("sidebar-is-dragging");
    if (rightZone) rightZone.classList.add("sidebar-is-dragging");
  }

  /**
   * Remove sidebar-is-dragging class from both sidebar zones
   */
  removeSidebarDraggingClass() {
    const leftZone = this.getSidebarZone("left");
    const rightZone = this.getSidebarZone("right");
    if (leftZone) leftZone.classList.remove("sidebar-is-dragging");
    if (rightZone) rightZone.classList.remove("sidebar-is-dragging");
  }

  /**
   * Disable smooth scroll during drag for faster auto-scroll
   */
  disableSmoothScrollDuringDrag() {
    if (this.scrollBehaviorOverridden) return;
    const docEl = document.documentElement;
    const bodyEl = document.body;
    this.scrollBehaviorRestoreHtml = docEl.style.scrollBehavior;
    this.scrollBehaviorRestoreBody = bodyEl.style.scrollBehavior;
    docEl.style.scrollBehavior = "auto";
    bodyEl.style.scrollBehavior = "auto";
    this.scrollBehaviorOverridden = true;
  }

  /**
   * Restore smooth scroll behavior after drag
   */
  restoreSmoothScrollAfterDrag() {
    if (!this.scrollBehaviorOverridden) return;
    const docEl = document.documentElement;
    const bodyEl = document.body;
    docEl.style.scrollBehavior = this.scrollBehaviorRestoreHtml || "";
    bodyEl.style.scrollBehavior = this.scrollBehaviorRestoreBody || "";
    this.scrollBehaviorRestoreHtml = null;
    this.scrollBehaviorRestoreBody = null;
    this.scrollBehaviorOverridden = false;
  }

  clearSidebarDropTarget() {
    this.sidebarDropTarget = null;
    this.sidebarDropIndex = null;
    ["sidebarLeftZone", "sidebarRightZone"].forEach((id) => {
      const zone = document.getElementById(id);
      if (zone) zone.classList.remove("sidebar-drop-target");
    });
    // Remove sidebar placeholder if it exists
    this.removeSidebarPlaceholder();
  }

  /**
   * Create or return the existing sidebar placeholder element
   */
  createSidebarPlaceholder() {
    if (!this.sidebarPlaceholder) {
      this.sidebarPlaceholder = document.createElement("div");
      this.sidebarPlaceholder.className = "sidebar-placeholder";
      // Use the dragged item's height as a reference for the placeholder
      if (this.draggedItemRect) {
        this.sidebarPlaceholder.style.minHeight = `${Math.min(
          this.draggedItemRect.height,
          150,
        )}px`;
      } else {
        this.sidebarPlaceholder.style.minHeight = "100px";
      }
    }
    return this.sidebarPlaceholder;
  }

  /**
   * Remove the sidebar placeholder from DOM
   */
  removeSidebarPlaceholder() {
    if (this.sidebarPlaceholder) {
      try {
        this.sidebarPlaceholder.remove();
      } catch (e) {}
      this.sidebarPlaceholder = null;
    }
  }

  /**
   * Update the sidebar placeholder position within the target zone
   */
  updateSidebarPlaceholder(zone, insertIndex) {
    if (!zone) {
      this.removeSidebarPlaceholder();
      return;
    }

    const placeholder = this.createSidebarPlaceholder();
    const slots = Array.from(zone.querySelectorAll(":scope > .sidebar-slot"));

    // Calculate the target element to insert before
    const targetSlot = slots[insertIndex] || null;

    // If placeholder is already in the correct position, skip DOM manipulation
    if (placeholder.parentNode === zone) {
      const nextSibling = placeholder.nextElementSibling;
      // If target is null (insert at end) and placeholder is at end
      // Or if target matches the next sibling, we're already in position
      if (targetSlot === null && nextSibling === null) {
        return;
      }
      if (targetSlot && nextSibling === targetSlot) {
        return;
      }
    }

    // Remove from current position if it's in a different zone
    if (placeholder.parentNode && placeholder.parentNode !== zone) {
      placeholder.remove();
    }

    // Insert at the correct position
    if (targetSlot) {
      zone.insertBefore(placeholder, targetSlot);
    } else {
      zone.appendChild(placeholder);
    }
  }

  getSidebarInsertionIndex(zoneEl, clientY) {
    if (!zoneEl) return 0;
    const slots = Array.from(zoneEl.querySelectorAll(":scope > .sidebar-slot"));
    if (slots.length === 0) return 0;

    for (let i = 0; i < slots.length; i++) {
      const rect = slots[i].getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (clientY < mid) return i;
    }

    return slots.length;
  }

  updateSidebarDropTarget(clientX, clientY) {
    const leftZone = this.getSidebarZone("left");
    const rightZone = this.getSidebarZone("right");

    // If zones aren't present/visible, clear and skip
    if (!leftZone || !rightZone) {
      this.clearSidebarDropTarget();
      return;
    }

    let targetZone = null;
    let targetSide = null;

    // Prefer DOM hit-testing (more reliable than rect math when zones contain content)
    try {
      const elAtPoint = document.elementFromPoint(clientX, clientY);
      const zoneAtPoint = elAtPoint?.closest?.(
        "#sidebarLeftZone, #sidebarRightZone",
      );
      if (zoneAtPoint === leftZone) {
        targetZone = leftZone;
        targetSide = "left";
      } else if (zoneAtPoint === rightZone) {
        targetZone = rightZone;
        targetSide = "right";
      }
    } catch (e) {
      // Fall back to rect-based hit testing below
    }

    // Fallback to rect-based hit testing if elementFromPoint didn't find a zone
    if (!targetZone) {
      const leftRect = leftZone.getBoundingClientRect();
      const rightRect = rightZone.getBoundingClientRect();

      const inLeft =
        clientX >= leftRect.left &&
        clientX <= leftRect.right &&
        clientY >= leftRect.top &&
        clientY <= leftRect.bottom;

      const inRight =
        clientX >= rightRect.left &&
        clientX <= rightRect.right &&
        clientY >= rightRect.top &&
        clientY <= rightRect.bottom;

      if (inLeft) {
        targetZone = leftZone;
        targetSide = "left";
      } else if (inRight) {
        targetZone = rightZone;
        targetSide = "right";
      }
    }

    // If not hovering over any sidebar zone, clear and exit
    if (!targetZone) {
      this.clearSidebarDropTarget();
      return;
    }

    // Remove highlight from the other zone if switching sides
    if (this.sidebarDropTarget && this.sidebarDropTarget !== targetSide) {
      const otherZone = this.getSidebarZone(this.sidebarDropTarget);
      if (otherZone) otherZone.classList.remove("sidebar-drop-target");
    }

    // Update state
    this.sidebarDropTarget = targetSide;
    this.sidebarDropIndex = this.getSidebarInsertionIndex(targetZone, clientY);
    targetZone.classList.add("sidebar-drop-target");
    this.updateSidebarPlaceholder(targetZone, this.sidebarDropIndex);
  }

  /**
   * Update flex basis for the current DOM rows without rebuilding/repacking rows.
   * This is used after manual drag-and-drop so the user's row boundaries remain intact.
   */
  updateFlexBasisForCurrentDOM() {
    if (!this.grid) return;

    // Recompute responsive spans, but do not rebuild rows.
    this.calculateResponsiveLayout();

    // Force a full repack when narrow-container mode is active so
    // 2-span cards cannot remain side-by-side in existing rows.
    if (this.shouldForceSingleRowLayoutForThreeItemComponents()) {
      this.recalculateLayout();
      return;
    }

    const rowWrappers = this.grid.querySelectorAll(".grid-flex-row");
    rowWrappers.forEach((rowWrapper) => {
      const rowItems = Array.from(rowWrapper.children);
      const visibleItems = rowItems.filter((el) => !this.isComponentHidden(el));

      rowItems.forEach((el) => {
        const id = el.dataset.gridId;
        if (id) {
          this.setItemFlexBasis(el, id, visibleItems.length);
        }
      });

      // Hide row if all items are hidden
      if (visibleItems.length === 0) {
        rowWrapper.style.display = "none";
      } else {
        rowWrapper.style.display = "";
      }
    });

    this.updateGridItems();
    this.applySavedMiddleWidthsFromDOM();
  }

  /**
   * Initialize the grid layout manager
   */
  init() {
    this.grid = document.querySelector(".content-grid");
    if (!this.grid) {
      console.warn("GridLayoutManager: .content-grid not found");
      return;
    }

    // Load saved layout or use default
    this.loadLayout();
    this.lastMainContainerResponsiveWidth =
      this.getMainContainerResponsiveWidth();

    // Load edit mode state from settings (default OFF)
    const settings = this.storage.getSettings();
    this.isEditModeEnabled =
      settings[this.getMainEditModeStorageKey()] === true;

    // Calculate initial responsive layout based on viewport
    this.lastViewportWidth = this.getSidebarViewportWidthForMiddleLayout();
    const isViewportZoomedOut = this.applyViewportAutoZoomIfNeeded(
      this.lastViewportWidth,
    );
    if (!isViewportZoomedOut) {
      this.calculateResponsiveLayout();
    }

    // Apply the layout to create flex rows
    this.applyLayout();
    this.recalculateLayout();

    // Setup event listeners for drag and drop (only active when edit mode is enabled)
    this.setupEventListeners();

    // Setup viewport-based responsive monitoring
    this.setupViewportListener();

    // Setup edit mode toggle button
    this.setupEditModeToggle();

    this.applySavedSidebarMiddleLayoutWidth({
      persist: false,
      triggerSnapCheck: false,
    });

    // Listen for visibility changes
    document.addEventListener("md:visibility-changed", () => {
      this.recalculateLayout();
    });

    // Remove the loading state to reveal the grid
    // Use double-rAF to ensure layout is fully calculated before showing
    // This prevents any flash of jumbled content on fast machines
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.grid.classList.remove("grid-layout-loading");
        this.grid.classList.add("grid-layout-ready");
      });
    });

    document.addEventListener("wheel", this.handleWheel, { passive: false });
    console.log("✅ GridLayoutManager initialized");
  }

  /**
   * Setup the edit mode toggle button in the FAB menu
   */
  setupEditModeToggle() {
    const toggleBtn = document.getElementById("layoutEditBtn");
    if (!toggleBtn) return;

    // Set initial state
    this.updateEditModeUI(toggleBtn);

    // Handle toggle click
    toggleBtn.addEventListener("click", () => {
      this.toggleEditMode();
    });
  }

  /**
   * Toggle drag-and-drop edit mode
   */
  toggleEditMode() {
    const wasEditModeEnabled = this.isEditModeEnabled;
    const editModeStorageKey = this.getEditModeStorageKey();

    if (this.isEditModeLocked) {
      // Safety: if lock is active, ensure edit mode is off.
      if (this.isEditModeEnabled) {
        this.isEditModeEnabled = false;

        const settings = this.storage.getSettings();
        settings[editModeStorageKey] = false;
        this.storage.saveSettings(settings);
      }

      const toggleBtn = document.getElementById("layoutEditBtn");
      this.updateEditModeUI(toggleBtn);
      return;
    }

    this.temporarilyDisableLayoutToggleAnimations();
    this.isEditModeEnabled = !this.isEditModeEnabled;

    // Save state to settings
    const settings = this.storage.getSettings();
    settings[editModeStorageKey] = this.isEditModeEnabled;
    this.storage.saveSettings(settings);

    // Update UI
    const toggleBtn = document.getElementById("layoutEditBtn");
    this.updateEditModeUI(toggleBtn);

    // Update grid state
    if (this.grid) {
      this.grid.classList.toggle("grid-edit-mode", this.isEditModeEnabled);
    }
    // Also add to body so sidebar CSS selectors work
    document.body.classList.toggle("grid-edit-mode", this.isEditModeEnabled);

    if (!this.isEditModeEnabled) {
      this.endMiddleLayoutResize();
      this.endSidebarResize();
      this.clearSidebarAutoEnableBlocked();
    }

    if (this.isQuranFocusModeContextActive()) {
      const pocketQuranCard = document.getElementById("pocketQuranCard");
      if (pocketQuranCard) {
        this.applySavedMiddleWidthToElement(pocketQuranCard);
      }
    }

    // Show toast notification
    this.showToast(
      this.isEditModeEnabled
        ? "Layout Editor Mode enabled - drag components to reposition"
        : "Layout Editor Mode disabled",
      this.isEditModeEnabled ? "success" : "info",
    );

    // Keep the current layout snapshot stable when leaving edit mode.
    if (wasEditModeEnabled && !this.isEditModeEnabled) {
      try {
        this.saveLayout();
      } catch (e) {}
    }
  }

  /**
   * Update the edit mode toggle button UI
   */
  updateEditModeUI(toggleBtn) {
    if (!toggleBtn) return;

    // Keep button hoverable so FAB custom tooltips continue to work even when locked.
    toggleBtn.disabled = false;
    toggleBtn.setAttribute(
      "aria-disabled",
      this.isEditModeLocked ? "true" : "false",
    );
    toggleBtn.classList.toggle("is-locked", this.isEditModeLocked);

    const tooltipText = this.isEditModeLocked
      ? "Layout Editor Mode locked while Quran Focus Mode or Moment Mode is active"
      : this.isEditModeEnabled
        ? "Disable Layout Editor Mode"
        : "Enable Layout Editor Mode";

    toggleBtn.setAttribute(
      "aria-pressed",
      this.isEditModeEnabled ? "true" : "false",
    );
    toggleBtn.classList.toggle("active", this.isEditModeEnabled);
    toggleBtn.setAttribute("data-tooltip", tooltipText);
    toggleBtn.setAttribute("aria-label", tooltipText);
    toggleBtn.removeAttribute("title");

    // Update grid class
    if (this.grid) {
      this.grid.classList.toggle("grid-edit-mode", this.isEditModeEnabled);
    }
    // Also add to body so sidebar CSS selectors work
    document.body.classList.toggle("grid-edit-mode", this.isEditModeEnabled);
  }

  temporarilyDisableLayoutToggleAnimations() {
    document.body.classList.add("layout-edit-toggle-no-anim");

    // Two RAFs keeps transitions disabled for this style/class flip only.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.classList.remove("layout-edit-toggle-no-anim");
      });
    });
  }

  syncSidebarModeForEditState() {
    try {
      if (
        window.dashboard &&
        typeof window.dashboard.syncSidebarModeWithLayoutEditMode === "function"
      ) {
        window.dashboard.syncSidebarModeWithLayoutEditMode();
      }
    } catch (e) {}
  }

  /**
   * Show a toast notification
   */
  showToast(message, type = "info") {
    // Try to use the settings manager toast if available
    if (
      window.dashboard &&
      window.dashboard.settings &&
      typeof window.dashboard.settings.showToast === "function"
    ) {
      window.dashboard.settings.showToast(message, type);
      return;
    }

    // Fallback: create a simple toast
    const existingToast = document.querySelector(".grid-toast");
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement("div");
    toast.className = `grid-toast grid-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    let hideTimer = null;

    const hideToast = () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }

      toast.classList.remove("grid-toast-visible");
      setTimeout(() => toast.remove(), 300);
    };

    const scheduleHide = (delayMs) => {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
      hideTimer = setTimeout(hideToast, delayMs);
    };

    requestAnimationFrame(() => {
      toast.classList.add("grid-toast-visible");
    });

    toast.addEventListener(
      "mouseenter",
      () => {
        scheduleHide(120);
      },
      { once: true },
    );

    scheduleHide(2500);
  }

  /**
   * Setup viewport resize listener for responsive layout
   * Uses viewport width (stable) instead of component width (unstable) to prevent feedback loops
   */
  setupViewportListener() {
    // Listen to window resize events with debouncing
    window.addEventListener("resize", this.handleViewportResize);

    // Also listen to orientation changes on mobile
    window.addEventListener("orientationchange", () => {
      setTimeout(() => this.handleViewportResize(), 100);
    });

    // Observe container width changes (e.g., devtools open/close, custom width)
    if (typeof ResizeObserver !== "undefined" && this.grid) {
      if (this.containerResizeObserver) {
        this.containerResizeObserver.disconnect();
      }
      this.containerResizeObserver = new ResizeObserver(() => {
        this.handleViewportResize("observer");
      });
      this.containerResizeObserver.observe(this.grid);
    }
  }

  /**
   * Get the current layout width for responsive calculations
   */
  getLayoutWidth() {
    if (this.grid) {
      const rect = this.grid.getBoundingClientRect();
      if (rect && rect.width) {
        return Math.round(rect.width);
      }
      if (this.grid.offsetWidth) {
        return this.grid.offsetWidth;
      }
    }

    return (
      window.innerWidth ||
      document.documentElement.clientWidth ||
      document.body.clientWidth ||
      0
    );
  }

  getMainContainerResponsiveWidth() {
    const mainContainer =
      (this.grid &&
        (this.grid.closest(".main-container.container-wide") ||
          this.grid.closest(".main-container"))) ||
      document.querySelector(
        "#sidebarMiddle > .main-container.container-wide",
      ) ||
      document.querySelector(".main-container.container-wide") ||
      document.querySelector("#sidebarMiddle > .main-container") ||
      document.querySelector(".main-container");

    const width = Math.round(
      (mainContainer && mainContainer.getBoundingClientRect().width) || 0,
    );

    if (Number.isFinite(width) && width > 0) {
      return width;
    }

    return this.getLayoutWidth();
  }

  getNormalWideLayoutStorageKey() {
    return "gridLayoutNormalWide";
  }

  getCompressedLayoutStorageKey() {
    return "gridLayoutNormalCompressed";
  }

  getSidebarLayoutStorageKey() {
    return "gridLayoutSidebar";
  }

  getNormalLayoutStorageKeyForMode(layoutMode = "normalWide") {
    return layoutMode === "compressed"
      ? this.getCompressedLayoutStorageKey()
      : this.getNormalWideLayoutStorageKey();
  }

  getMainContainerLayoutMode() {
    return this.shouldForceSingleRowLayoutForThreeItemComponents()
      ? "compressed"
      : "normalWide";
  }

  saveNormalLayoutRowsForMode(
    layoutMode,
    rowsOverride = this.rows,
    settings = null,
  ) {
    const targetSettings = settings || this.storage.getSettings();
    const rows = Array.isArray(rowsOverride)
      ? JSON.parse(JSON.stringify(rowsOverride))
      : [];

    targetSettings[this.getNormalLayoutStorageKeyForMode(layoutMode)] = rows;

    // Back-compat: keep legacy normal keys synced with wide mode only.
    if (layoutMode === "normalWide") {
      targetSettings.gridLayoutNormal = JSON.parse(JSON.stringify(rows));
      targetSettings.gridLayout = JSON.parse(JSON.stringify(rows));
    }

    return targetSettings;
  }

  syncMainContainerLayoutModeIfNeeded() {
    if (this.isSidebarModeEnabled || !this.grid) {
      return false;
    }

    const targetMode = this.getMainContainerLayoutMode();
    const previousMode = this.currentMainContainerLayoutMode;

    if (!previousMode) {
      this.currentMainContainerLayoutMode = targetMode;
      return false;
    }

    if (previousMode === targetMode) {
      return false;
    }

    const settings = this.storage.getSettings();

    // Save the currently active normal-mode layout before switching buckets.
    this.saveNormalLayoutRowsForMode(previousMode, this.rows, settings);

    const nextSavedLayout = this.getSavedNormalLayoutForMode(
      settings,
      targetMode,
    );
    const normalized = this.normalizeLayout(nextSavedLayout);

    this.rows = normalized;
    this.activeRows = JSON.parse(JSON.stringify(normalized));
    this.currentMainContainerLayoutMode = targetMode;

    this.storage.saveSettings(settings);
    this.applyLayout(this.rows);

    return true;
  }

  shouldForceSingleRowLayoutForThreeItemComponents() {
    const threshold = Math.max(
      1,
      Math.round(this.threeItemSingleRowCollapseThresholdWidth || 1200),
    );
    const containerWidth = this.getMainContainerResponsiveWidth();

    return (
      Number.isFinite(containerWidth) &&
      containerWidth > 0 &&
      containerWidth < threshold
    );
  }

  getThreeItemComponentIds() {
    return Object.keys(this.componentSpans).filter((componentId) => {
      const config = this.componentSpans[componentId];
      return (
        config && Number(config.span) === 2 && Number(config.minSpan) === 2
      );
    });
  }

  isThreeItemComponentId(componentId) {
    const id = String(componentId || "").trim();
    if (!id) return false;

    const config = this.componentSpans[id];
    return (
      !!config && Number(config.span) === 2 && Number(config.minSpan) === 2
    );
  }

  getGridFlexRowGapPx(rowEl) {
    if (!rowEl || typeof window === "undefined" || !window.getComputedStyle) {
      return 0;
    }

    const computed = window.getComputedStyle(rowEl);
    const gapRaw = computed.columnGap || computed.gap || "0";
    const gap = Number.parseFloat(gapRaw);
    return Number.isFinite(gap) && gap > 0 ? gap : 0;
  }

  getThreeItemRowResizeBudgetCap(el, absoluteCap) {
    const fallbackCap = Math.max(1, Math.round(Number(absoluteCap) || 0));
    if (!el) return fallbackCap;

    const targetId = this.getSidebarComponentId(el);
    if (!this.isThreeItemComponentId(targetId)) {
      return fallbackCap;
    }

    // Two modes only:
    // 1) Normal layout -> each item hard-limited to its default width for the
    //    current row density (1, 2, or 3 visible items).
    // 2) Compressed single-item row -> full container width allowed.
    if (this.shouldForceSingleRowLayoutForThreeItemComponents()) {
      return fallbackCap;
    }

    const row = el.closest(".grid-flex-row");
    if (!row) {
      return Math.max(1, Math.round(fallbackCap / 3));
    }

    const visibleChildren = Array.from(row.children).filter(
      (child) => !this.isComponentHidden(child),
    );
    const visibleCount = Math.max(1, visibleChildren.length);

    const rowWidth = Math.round(
      row.getBoundingClientRect().width || row.clientWidth || 0,
    );
    const rowGap = this.getGridFlexRowGapPx(row);

    const totalGapWidth = Math.max(0, visibleCount - 1) * rowGap;

    // Use the default width for the current row composition:
    // 1 item: full row, 2 items: half row (minus 1 gap), 3 items: third row (minus 2 gaps).
    const defaultRowWidth = Math.max(
      1,
      Math.round(Math.max(0, rowWidth - totalGapWidth) / visibleCount),
    );

    return Math.max(1, Math.min(fallbackCap, defaultRowWidth));
  }

  runViewportResizeLayoutSync({ force = false } = {}) {
    if (this.isMiddleLayoutResizing || this.isSidebarResizing) {
      return {
        applied: false,
        zoomed: false,
        widthChanged: false,
        zoomChanged: false,
        mainContainerWidthChanged: false,
        layoutModeChanged: false,
      };
    }

    const newWidth = this.getSidebarViewportWidthForMiddleLayout();
    if (newWidth <= 0) {
      return { applied: false, zoomed: false, widthChanged: false };
    }

    const mainContainerWidth = this.getMainContainerResponsiveWidth();
    const mainContainerWidthChanged =
      Math.abs(mainContainerWidth - this.lastMainContainerResponsiveWidth) > 2;
    this.lastMainContainerResponsiveWidth = mainContainerWidth;

    const layoutModeChanged = this.syncMainContainerLayoutModeIfNeeded();

    const previousZoomActive = this.viewportAutoZoomActive === true;
    const previousZoomScale = Number(this.viewportAutoZoomScale) || 1;
    const isViewportZoomedOut = this.applyViewportAutoZoomIfNeeded(newWidth);
    const zoomChanged =
      previousZoomActive !== this.viewportAutoZoomActive ||
      Math.abs(previousZoomScale - (Number(this.viewportAutoZoomScale) || 1)) >
        0.0005;

    const widthChanged = Math.abs(newWidth - this.lastViewportWidth) > 2;
    this.lastViewportWidth = newWidth;

    if (isViewportZoomedOut) {
      if (
        this.shouldForceSingleRowLayoutForThreeItemComponents() ||
        layoutModeChanged ||
        mainContainerWidthChanged
      ) {
        this.recalculateLayout();
      }
      return {
        applied: true,
        zoomed: true,
        widthChanged,
        zoomChanged,
        mainContainerWidthChanged,
        layoutModeChanged,
      };
    }

    if (
      !force &&
      !widthChanged &&
      !zoomChanged &&
      !mainContainerWidthChanged &&
      !layoutModeChanged
    ) {
      return {
        applied: false,
        zoomed: false,
        widthChanged,
        zoomChanged,
        mainContainerWidthChanged,
        layoutModeChanged,
      };
    }

    this.syncSidebarMiddleLayoutWidthToViewport({
      persist: true,
      triggerSnapCheck: true,
    });
    this.calculateResponsiveLayout();
    this.recalculateLayout();

    if (this.isSidebarModeEnabled) {
      this.maybeSnapSidebarItemsBackToMiddleLayout();
    } else {
      this.maybeAutoRestoreSidebarMode();
    }

    return {
      applied: true,
      zoomed: false,
      widthChanged,
      zoomChanged,
      mainContainerWidthChanged,
      layoutModeChanged,
    };
  }

  cancelViewportStabilizePass() {
    if (this.viewportStabilizeRaf) {
      cancelAnimationFrame(this.viewportStabilizeRaf);
      this.viewportStabilizeRaf = null;
    }
    if (this.viewportStabilizeRaf2) {
      cancelAnimationFrame(this.viewportStabilizeRaf2);
      this.viewportStabilizeRaf2 = null;
    }
  }

  scheduleViewportStabilizePass() {
    this.cancelViewportStabilizePass();

    this.viewportStabilizeRaf = requestAnimationFrame(() => {
      this.viewportStabilizeRaf = null;
      this.viewportStabilizeRaf2 = requestAnimationFrame(() => {
        this.viewportStabilizeRaf2 = null;
        this.runViewportResizeLayoutSync({ force: true });
      });
    });
  }

  /**
   * Handle viewport resize - recalculate responsive layout
   */
  handleViewportResize(sourceOrEvent = "window") {
    const source = typeof sourceOrEvent === "string" ? sourceOrEvent : "window";
    const forceSync = source !== "observer";

    const immediateWidth = this.getSidebarViewportWidthForMiddleLayout();
    if (immediateWidth > 0) {
      this.applyViewportAutoZoomIfNeeded(immediateWidth);
    }

    // Debounce resize handling
    if (this.viewportResizeTimer) {
      clearTimeout(this.viewportResizeTimer);
    }
    this.cancelViewportStabilizePass();

    this.viewportResizeTimer = setTimeout(() => {
      const syncResult = this.runViewportResizeLayoutSync({ force: forceSync });

      // Fast maximize/restore can report transient dimensions; run a second
      // stabilized pass after reflow to avoid ending in a stale/broken layout.
      if (
        !syncResult.zoomed &&
        (forceSync ||
          syncResult.widthChanged ||
          syncResult.mainContainerWidthChanged ||
          syncResult.layoutModeChanged)
      ) {
        this.scheduleViewportStabilizePass();
      }
    }, 150);
  }

  /**
   * Calculate responsive layout based on viewport width
   * This determines effective spans for all components to ensure they meet minimum width requirements
   */
  calculateResponsiveLayout() {
    if (!this.grid) return;

    // Get container width (accounts for padding, max-width constraints)
    const containerWidth = this.getLayoutWidth();
    const gap = 32; // var(--spacing-xl) in pixels, approximate

    // Calculate width per span unit (6 spans = container width minus gaps)
    // For n items in a row with 6 total spans, we have (n-1) gaps
    // Simplified: assume 2-3 items average, so roughly 2 gaps
    const avgGaps = 2;
    const availableWidth = containerWidth - gap * avgGaps;
    const widthPerSpan = availableWidth / 6;

    // Reset effective spans to defaults
    this.effectiveSpans = {};

    // Global narrow-container rule: below the threshold, force every
    // 2-span component to occupy its own full row.
    if (this.shouldForceSingleRowLayoutForThreeItemComponents()) {
      this.getThreeItemComponentIds().forEach((componentId) => {
        this.effectiveSpans[componentId] = 6;
      });
      return;
    }

    // Calculate effective span for each component with min width requirements
    Object.keys(this.componentMinWidths).forEach((componentId) => {
      const minWidth = this.componentMinWidths[componentId];
      const baseConfig = this.componentSpans[componentId];

      if (!baseConfig) return;

      // Calculate how many spans needed to meet minimum width
      const spansNeeded = Math.ceil(minWidth / widthPerSpan);

      // Clamp between base span and 6 (full width)
      const effectiveSpan = Math.max(baseConfig.span, Math.min(6, spansNeeded));

      // Only store if different from default
      if (effectiveSpan !== baseConfig.span) {
        this.effectiveSpans[componentId] = effectiveSpan;
      }
    });
  }

  /**
   * Get the effective span for a component (considering responsive calculations)
   */
  getEffectiveSpan(componentId) {
    // First check if we have a calculated effective span
    if (this.effectiveSpans[componentId]) {
      return this.effectiveSpans[componentId];
    }

    // Fall back to base configuration
    const baseConfig = this.componentSpans[componentId];
    return baseConfig ? baseConfig.span : 2;
  }

  /**
   * Get element by component ID
   */
  getElementByComponentId(componentId) {
    if (componentId === "header") {
      return this.grid?.querySelector(".header");
    }
    return document.getElementById(componentId);
  }

  /**
   * Load layout from storage or use default
   */
  loadLayout() {
    this.loadLayoutForMode("normal");
  }

  /**
   * Save layout to storage
   */
  saveLayout() {
    const settings = this.storage.getSettings();

    if (this.isSidebarModeEnabled) {
      settings[this.getSidebarLayoutStorageKey()] = JSON.parse(
        JSON.stringify(this.rows),
      );
    } else {
      const layoutMode = this.getMainContainerLayoutMode();
      this.saveNormalLayoutRowsForMode(layoutMode, this.rows, settings);
      this.currentMainContainerLayoutMode = layoutMode;
    }

    // Sidebar mode also persists which components are docked
    if (this.isSidebarModeEnabled) {
      settings[this.getSidebarStateStorageKey()] =
        this.getSidebarStateFromDOM();
    }
    this.storage.saveSettings(settings);
  }

  /**
   * Apply the current layout to the DOM
   * Creates flex row wrappers for each row
   */
  applyLayout(rowsOverride = null) {
    if (!this.grid) return;

    const layoutRows = Array.isArray(rowsOverride) ? rowsOverride : this.rows;
    this.activeRows = JSON.parse(JSON.stringify(layoutRows));

    // Store all grid items
    const items = {};
    Object.keys(this.componentSpans).forEach((id) => {
      const el =
        id === "header"
          ? this.grid.querySelector(".header")
          : document.getElementById(id);
      if (el) {
        items[id] = el;
      }
    });

    // Remove existing flex rows (but keep items)
    const existingRows = this.grid.querySelectorAll(".grid-flex-row");
    existingRows.forEach((row) => {
      // Move children back to grid before removing row
      while (row.firstChild) {
        this.grid.appendChild(row.firstChild);
      }
      row.remove();
    });

    // Clear the grid's explicit children order
    const fragment = document.createDocumentFragment();

    // Create flex rows for each row in layout
    layoutRows.forEach((rowItems, rowIndex) => {
      const rowWrapper = document.createElement("div");
      rowWrapper.className = "grid-flex-row";
      rowWrapper.dataset.rowIndex = rowIndex;

      // Count visible items in this row
      const visibleItems = rowItems.filter((id) => {
        const el = items[id];
        return el && !this.isComponentHidden(el);
      });

      // Add items to the row
      rowItems.forEach((id) => {
        const el = items[id];
        if (el) {
          // Skip floating cards - they are managed by FloatingModeManager
          // and should not be moved back into the grid layout
          if (el.classList.contains("floating-card")) {
            return;
          }

          // Skip sidebar-detached components while sidebar mode is active
          if (el.classList.contains("sidebar-detached")) {
            return;
          }

          // Set flex basis based on visible items count
          this.setItemFlexBasis(el, id, visibleItems.length);

          // Make item draggable
          el.classList.add("grid-draggable");
          el.setAttribute("draggable", "false"); // We use custom drag
          el.dataset.gridId = id;
          this.ensureSidebarResizeHandles(el);

          rowWrapper.appendChild(el);
        }
      });

      // Keep empty rows from reserving vertical gap when all row items are hidden.
      if (visibleItems.length === 0) {
        rowWrapper.style.display = "none";
      } else {
        rowWrapper.style.display = "";
      }

      fragment.appendChild(rowWrapper);
    });

    this.grid.appendChild(fragment);

    // Add class for CSS fallback (browsers that don't support :has())
    this.grid.classList.add("grid-layout-active");

    this.updateGridItems();
    this.applySavedMiddleWidthsFromDOM();
  }

  /**
   * Set flex basis for an item based on visible items in row
   */
  setItemFlexBasis(el, id, visibleCount) {
    const config = this.componentSpans[id];
    if (!config) return;

    // If item is hidden, don't set flex
    if (this.isComponentHidden(el)) {
      el.style.flex = "";
      return;
    }

    // Get effective span (considering breakpoint state)
    const effectiveSpan = this.getEffectiveSpan(id);

    // Calculate flex basis percentage
    let flexPercent;
    if (visibleCount === 0 || visibleCount === 1) {
      flexPercent = 100;
    } else if (visibleCount === 2) {
      flexPercent = 50;
    } else if (visibleCount === 3) {
      flexPercent = 33.333;
    } else {
      // More than 3 items, use effective span ratio
      flexPercent = (effectiveSpan / 6) * 100;
    }

    // For full-width components, always use 100%
    if (config.span === 6 && config.minSpan === 6) {
      flexPercent = 100;
    }

    el.style.flex = `1 1 calc(${flexPercent}% - var(--spacing-xl))`;
    el.style.maxWidth = `${flexPercent}%`;
    el.style.minWidth = `${Math.max(200, (config.minSpan / 6) * 100)}px`;

    // Add data attribute for debugging/CSS targeting
    el.dataset.effectiveSpan = effectiveSpan;
  }

  /**
   * Check if a component is hidden via visibility settings
   */
  isComponentHidden(el) {
    return (
      el.style.display === "none" ||
      el.getAttribute("aria-hidden") === "true" ||
      el.classList.contains("floating-card") ||
      el.classList.contains("sidebar-detached")
    );
  }

  /**
   * Update grid items array
   */
  updateGridItems() {
    this.gridItems = Array.from(
      this.grid.querySelectorAll(".grid-draggable"),
    ).filter(
      (el) =>
        !this.isComponentHidden(el) && !el.classList.contains("floating-card"),
    );
  }

  areRowsEqual(leftRows, rightRows) {
    if (!Array.isArray(leftRows) || !Array.isArray(rightRows)) return false;
    if (leftRows.length !== rightRows.length) return false;

    for (let rowIndex = 0; rowIndex < leftRows.length; rowIndex += 1) {
      const leftRow = leftRows[rowIndex];
      const rightRow = rightRows[rowIndex];

      if (!Array.isArray(leftRow) || !Array.isArray(rightRow)) return false;
      if (leftRow.length !== rightRow.length) return false;

      for (let itemIndex = 0; itemIndex < leftRow.length; itemIndex += 1) {
        if (leftRow[itemIndex] !== rightRow[itemIndex]) return false;
      }
    }

    return true;
  }

  /**
   * Recalculate layout when visibility or viewport changes
   * Rebuilds rows based on current effective spans
   */
  recalculateLayout() {
    if (!this.grid || this.isDragging) return;

    // First, recalculate effective spans based on current viewport
    this.calculateResponsiveLayout();

    const baseRows = Array.isArray(this.rows) ? this.rows : [];
    const baseOrder = baseRows.flat();
    const hasResponsiveOverrides = Object.keys(this.effectiveSpans).length > 0;

    // If no responsive overrides are needed, restore the canonical layout.
    if (!hasResponsiveOverrides) {
      const layoutChanged = !this.areRowsEqual(baseRows, this.activeRows || []);

      if (layoutChanged) {
        this.applyLayout(baseRows);
      } else {
        // Just update flex basis for existing layout
        const rowWrappers = this.grid.querySelectorAll(".grid-flex-row");
        rowWrappers.forEach((rowWrapper) => {
          const rowItems = Array.from(rowWrapper.children);
          const visibleItems = rowItems.filter(
            (el) => !this.isComponentHidden(el),
          );

          rowItems.forEach((el) => {
            const id = el.dataset.gridId;
            if (id) {
              this.setItemFlexBasis(el, id, visibleItems.length);
            }
          });

          // Hide row if all items are hidden
          if (visibleItems.length === 0) {
            rowWrapper.style.display = "none";
          } else {
            rowWrapper.style.display = "";
          }
        });
      }

      this.updateGridItems();
      this.applySavedMiddleWidthsFromDOM();
      return;
    }

    // Get visible components in their current order
    const allComponentIds = baseOrder;
    const visibleComponentIds = allComponentIds.filter((id) => {
      const el = this.getElementByComponentId(id);
      return el && !this.isComponentHidden(el);
    });

    // Rebuild rows based on effective spans
    const newRows = [];
    let currentRow = [];
    let currentRowSpan = 0;

    visibleComponentIds.forEach((componentId) => {
      const effectiveSpan = this.getEffectiveSpan(componentId);
      const config = this.componentSpans[componentId];

      // Full-width components always get their own row
      if (config && config.span === 6 && config.minSpan === 6) {
        if (currentRow.length > 0) {
          newRows.push(currentRow);
          currentRow = [];
          currentRowSpan = 0;
        }
        newRows.push([componentId]);
        return;
      }

      // Check if component fits in current row
      if (currentRowSpan + effectiveSpan <= 6) {
        currentRow.push(componentId);
        currentRowSpan += effectiveSpan;
      } else {
        // Start a new row
        if (currentRow.length > 0) {
          newRows.push(currentRow);
        }
        currentRow = [componentId];
        currentRowSpan = effectiveSpan;
      }
    });

    // Don't forget the last row
    if (currentRow.length > 0) {
      newRows.push(currentRow);
    }

    // Add back hidden components to maintain their positions
    const hiddenComponentIds = allComponentIds.filter((id) => {
      const el = this.getElementByComponentId(id);
      return !el || this.isComponentHidden(el);
    });

    const baseRowIndexMap = new Map();
    baseRows.forEach((row, rowIndex) => {
      row.forEach((id) => {
        if (!baseRowIndexMap.has(id)) {
          baseRowIndexMap.set(id, rowIndex);
        }
      });
    });

    // Append hidden components to maintain order (they won't be visible anyway)
    hiddenComponentIds.forEach((id) => {
      // Find original row index and add to corresponding new row
      const originalRowIdx = baseRowIndexMap.has(id)
        ? baseRowIndexMap.get(id)
        : -1;
      if (originalRowIdx >= 0 && newRows[originalRowIdx]) {
        newRows[originalRowIdx].push(id);
      } else if (newRows.length > 0) {
        newRows[newRows.length - 1].push(id);
      } else {
        newRows.push([id]);
      }
    });

    // Only update DOM if layout actually changed
    const layoutChanged =
      JSON.stringify(newRows) !== JSON.stringify(this.activeRows || []);

    if (layoutChanged) {
      this.applyLayout(newRows);
      // Don't save layout on resize - only save on manual drag operations
    } else {
      // Just update flex basis for existing layout
      const rowWrappers = this.grid.querySelectorAll(".grid-flex-row");
      rowWrappers.forEach((rowWrapper) => {
        const rowItems = Array.from(rowWrapper.children);
        const visibleItems = rowItems.filter(
          (el) => !this.isComponentHidden(el),
        );

        rowItems.forEach((el) => {
          const id = el.dataset.gridId;
          if (id) {
            this.setItemFlexBasis(el, id, visibleItems.length);
          }
        });

        // Hide row if all items are hidden
        if (visibleItems.length === 0) {
          rowWrapper.style.display = "none";
        } else {
          rowWrapper.style.display = "";
        }
      });
    }

    this.updateGridItems();
    this.applySavedMiddleWidthsFromDOM();
  }

  /**
   * Setup event listeners for drag and drop
   */
  setupEventListeners() {
    // Mouse events
    this.grid.addEventListener("mousedown", this.handleMouseDown);
    this.grid.addEventListener("dblclick", this.handleSidebarResizeDoubleClick);
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("mouseup", this.handleMouseUp);

    // Allow drag start from sidebars too (still gated by edit mode)
    const leftZone = document.getElementById("sidebarLeftZone");
    const rightZone = document.getElementById("sidebarRightZone");
    if (leftZone) leftZone.addEventListener("mousedown", this.handleMouseDown);
    if (leftZone)
      leftZone.addEventListener(
        "dblclick",
        this.handleSidebarResizeDoubleClick,
      );
    if (rightZone)
      rightZone.addEventListener("mousedown", this.handleMouseDown);
    if (rightZone)
      rightZone.addEventListener(
        "dblclick",
        this.handleSidebarResizeDoubleClick,
      );

    const sidebarMiddle = this.getSidebarMiddleElement();
    if (sidebarMiddle) {
      sidebarMiddle.addEventListener(
        "mousedown",
        this.handleMiddleLayoutResizeMouseDown,
      );
      sidebarMiddle.addEventListener(
        "touchstart",
        this.handleMiddleLayoutResizeTouchStart,
        {
          passive: false,
        },
      );
      sidebarMiddle.addEventListener(
        "dblclick",
        this.handleMiddleLayoutResizeDoubleClick,
      );
    }

    // Touch events
    this.grid.addEventListener("touchstart", this.handleTouchStart, {
      passive: false,
    });
    if (leftZone)
      leftZone.addEventListener("touchstart", this.handleTouchStart, {
        passive: false,
      });
    if (rightZone)
      rightZone.addEventListener("touchstart", this.handleTouchStart, {
        passive: false,
      });
    document.addEventListener("touchmove", this.handleTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", this.handleTouchEnd);

    // Keyboard support for accessibility
    document.addEventListener("keydown", this.handleKeyDown);
  }

  handleMiddleLayoutResizeMouseDown(e) {
    this.tryStartMiddleLayoutResizeFromMouseEvent(e);
  }

  handleMiddleLayoutResizeTouchStart(e) {
    if (!e || e.touches.length !== 1) return;
    this.tryStartMiddleLayoutResizeFromTouchEvent(e);
  }

  tryStartMiddleLayoutResizeFromMouseEvent(e) {
    if (!e || e.button !== 0) return false;
    return this.tryStartMiddleLayoutResize(e.target, e.clientX, e);
  }

  tryStartMiddleLayoutResizeFromTouchEvent(e) {
    if (!e || e.touches.length !== 1) return false;
    const touch = e.touches[0];
    return this.tryStartMiddleLayoutResize(touch.target, touch.clientX, e);
  }

  tryStartMiddleLayoutResize(target, clientX, sourceEvent = null) {
    if (!this.isEditModeEnabled || this.isEditModeLocked) return false;

    const handle = target?.closest?.(".middle-layout-resize-handle");
    if (!handle || !handle.closest("#sidebarMiddle")) {
      return false;
    }

    if (sourceEvent && sourceEvent.detail >= 2) {
      sourceEvent.preventDefault();
      sourceEvent.stopPropagation();
      return true;
    }

    const side = handle.classList.contains("middle-layout-resize-handle-left")
      ? "left"
      : "right";

    this.isMiddleLayoutResizing = true;
    this.middleLayoutResizeState = {
      side,
      startX: clientX,
      startWidth: this.getCurrentSidebarMiddleLayoutWidth(),
    };

    document.body.classList.add("middle-layout-resizing");

    if (sourceEvent) {
      sourceEvent.preventDefault();
      sourceEvent.stopPropagation();
    }

    return true;
  }

  handleMiddleLayoutResizeDoubleClick(e) {
    if (!this.isEditModeEnabled || this.isEditModeLocked) return;

    const handle = e.target?.closest?.(".middle-layout-resize-handle");
    if (!handle || !handle.closest("#sidebarMiddle")) {
      return;
    }

    this.applySidebarMiddleLayoutWidth(this.sidebarMiddleLayoutDefaultWidth, {
      persist: true,
      triggerSnapCheck: true,
      persistPreferred: true,
    });

    e.preventDefault();
    e.stopPropagation();
  }

  updateMiddleLayoutResize(clientX) {
    if (!this.isMiddleLayoutResizing || !this.middleLayoutResizeState) return;

    const { side, startX, startWidth } = this.middleLayoutResizeState;
    const delta = side === "right" ? clientX - startX : startX - clientX;
    const nextWidth = startWidth + delta * 2;

    this.applySidebarMiddleLayoutWidth(nextWidth, {
      persist: false,
      // Keep drag movement smooth; evaluate clipping/auto-restore on release.
      triggerSnapCheck: false,
    });
  }

  endMiddleLayoutResize() {
    if (!this.isMiddleLayoutResizing || !this.middleLayoutResizeState) {
      return false;
    }

    const middleEl = this.getSidebarMiddleElement();
    const mainContainer = document.querySelector(
      "#sidebarMiddle > .main-container",
    );
    const widthSource = this.isSidebarModeEnabled ? middleEl : mainContainer;
    const finalWidth = Math.round(
      (widthSource && widthSource.getBoundingClientRect().width) ||
        this.middleLayoutResizeState.startWidth ||
        0,
    );

    if (finalWidth > 0) {
      this.applySidebarMiddleLayoutWidth(finalWidth, {
        persist: true,
        triggerSnapCheck: true,
        persistPreferred: true,
      });
    }

    this.isMiddleLayoutResizing = false;
    this.middleLayoutResizeState = null;
    document.body.classList.remove("middle-layout-resizing");

    // Run one post-resize responsive sync now that manual resizing has ended.
    this.handleViewportResize("middle-resize-end");

    return true;
  }

  tryStartSidebarResizeFromMouseEvent(e) {
    if (!this.isEditModeEnabled || this.isEditModeLocked) return false;

    const handle = e.target?.closest?.(".sidebar-resize-handle");
    if (!handle) return false;

    const el = handle.closest(".grid-draggable");
    if (!el) {
      return false;
    }

    const isSidebarItem =
      el.classList.contains("sidebar-detached") &&
      !!el.closest(".sidebar-slot");
    const isMiddleItem = !isSidebarItem && !!el.closest(".grid-flex-row");
    if (!isSidebarItem && !isMiddleItem) {
      return false;
    }

    // Let dblclick handle width reset; don't start a second drag-resize.
    if (e.detail >= 2) {
      e.preventDefault();
      e.stopPropagation();
      return true;
    }

    const side = handle.classList.contains("sidebar-resize-handle-left")
      ? "left"
      : "right";
    let rect = el.getBoundingClientRect();
    const mode = isSidebarItem ? "sidebar" : "middle";

    let middleResizeHardMaxWidth = null;
    if (mode === "middle") {
      const componentId = this.getSidebarComponentId(el);
      if (this.isThreeItemComponentId(componentId)) {
        const mainContainerWidth = Math.round(
          this.getMainContainerResponsiveWidth() || 0,
        );
        const hardCap = Math.max(
          1,
          Math.round(
            Number.isFinite(mainContainerWidth) && mainContainerWidth > 0
              ? mainContainerWidth
              : rect.width,
          ),
        );

        middleResizeHardMaxWidth = this.getThreeItemRowResizeBudgetCap(
          el,
          hardCap,
        );

        if (
          Number.isFinite(middleResizeHardMaxWidth) &&
          middleResizeHardMaxWidth > 0 &&
          rect.width > middleResizeHardMaxWidth
        ) {
          this.applyMiddleWidthToElement(el, middleResizeHardMaxWidth, {
            persist: false,
          });
          rect = el.getBoundingClientRect();
        }
      }
    }

    this.isSidebarResizing = true;
    this.sidebarResizeState = {
      el,
      side,
      mode,
      startX: e.clientX,
      startWidth: rect.width,
      middleResizeHardMaxWidth,
    };

    el.classList.add("sidebar-resizing");
    document.body.classList.add("sidebar-resizing");

    e.preventDefault();
    e.stopPropagation();
    return true;
  }

  handleSidebarResizeDoubleClick(e) {
    if (!this.isEditModeEnabled || this.isEditModeLocked) return;

    const handle = e.target?.closest?.(".sidebar-resize-handle");
    if (!handle) return;

    const el = handle.closest(".grid-draggable");
    if (!el) return;

    const isSidebarItem =
      el.classList.contains("sidebar-detached") &&
      !!el.closest(".sidebar-slot");
    if (isSidebarItem) {
      this.resetSidebarWidthForElement(el, { keepSaved: false });
    } else {
      this.resetMiddleWidthForElement(el, {
        keepSaved: false,
        restoreDefaultFlex: true,
      });
    }

    e.preventDefault();
    e.stopPropagation();
  }

  updateSidebarResize(clientX) {
    if (!this.isSidebarResizing || !this.sidebarResizeState) return;

    const { el, side, mode, startX, startWidth, middleResizeHardMaxWidth } =
      this.sidebarResizeState;
    if (!el || !el.isConnected) {
      this.endSidebarResize();
      return;
    }

    const delta = side === "right" ? clientX - startX : startX - clientX;
    let nextWidth = startWidth + delta * 2;

    if (
      mode === "middle" &&
      Number.isFinite(middleResizeHardMaxWidth) &&
      middleResizeHardMaxWidth > 0
    ) {
      nextWidth = Math.min(nextWidth, Math.round(middleResizeHardMaxWidth));
    }

    if (mode === "middle") {
      this.applyMiddleWidthToElement(el, nextWidth, { persist: false });
    } else {
      this.applySidebarWidthToElement(el, nextWidth, { persist: false });
    }
  }

  endSidebarResize() {
    if (!this.isSidebarResizing || !this.sidebarResizeState) {
      return false;
    }

    const { el, mode } = this.sidebarResizeState;
    if (el && el.isConnected) {
      const finalWidth = Math.round(el.getBoundingClientRect().width || 0);
      if (finalWidth > 0) {
        if (mode === "middle") {
          this.applyMiddleWidthToElement(el, finalWidth, { persist: true });
        } else {
          this.applySidebarWidthToElement(el, finalWidth, { persist: true });
        }
      }
      el.classList.remove("sidebar-resizing");
    }

    document.body.classList.remove("sidebar-resizing");
    this.isSidebarResizing = false;
    this.sidebarResizeState = null;
    return true;
  }

  /**
   * Get drag handle or draggable element from target
   */
  getDraggableFromTarget(target) {
    // Check if clicking on interactive elements - don't drag
    if (
      target.closest(
        'button, input, select, textarea, a, [contenteditable="true"], .todo-list, .notes-editor, .flashcard-flip-card, .pocket-quran-content, .calendar-days',
      )
    ) {
      return null;
    }

    // Find the draggable parent
    const draggable = target.closest(".grid-draggable");
    if (!draggable) {
      return null;
    }

    // In Quran Focus + Layout Editor, Pocket Quran can be resized only.
    if (
      this.isQuranFocusModeContextActive() &&
      this.getSidebarComponentId(draggable) === "pocketQuranCard"
    ) {
      return null;
    }

    // Allow dragging items currently docked in sidebars (edit mode only)
    const isSidebarItem = draggable.classList.contains("sidebar-detached");
    if (
      this.isComponentHidden(draggable) &&
      !(this.isEditModeEnabled && isSidebarItem)
    ) {
      return null;
    }

    // Don't drag items in floating mode
    if (draggable.classList.contains("floating-card")) {
      return null;
    }

    return draggable;
  }

  /**
   * Handle mouse down - start drag
   */
  handleMouseDown(e) {
    // Only left mouse button
    if (e.button !== 0) return;

    // Only allow dragging when layout edit mode is enabled
    if (!this.isEditModeEnabled) return;

    if (this.tryStartSidebarResizeFromMouseEvent(e)) {
      return;
    }

    const draggable = this.getDraggableFromTarget(e.target);
    if (!draggable) return;

    this.startDrag(draggable, e.clientX, e.clientY);
    e.preventDefault();
  }

  /**
   * Handle touch start - start drag
   */
  handleTouchStart(e) {
    if (e.touches.length !== 1) return;

    // Only allow dragging when layout edit mode is enabled
    if (!this.isEditModeEnabled) return;

    if (e.target?.closest?.(".sidebar-resize-handle")) return;

    const touch = e.touches[0];
    const draggable = this.getDraggableFromTarget(touch.target);
    if (!draggable) return;

    // Add delay for touch to distinguish from scroll
    this.touchStartTimer = setTimeout(() => {
      this.startDrag(draggable, touch.clientX, touch.clientY);
    }, 200);

    this.touchStartPos = { x: touch.clientX, y: touch.clientY };
  }

  /**
   * Start dragging an element
   */
  startDrag(element, clientX, clientY) {
    this.isDragging = true;
    this.draggedItem = element;

    // Capture the bounding rect BEFORE any DOM manipulation
    // This is critical for sidebar items to get correct dimensions
    const originalRect = element.getBoundingClientRect();

    // If dragging from a sidebar, undock it into the grid so placeholder logic works.
    this.sidebarDragOrigin = null;
    const sidebarSlot = element.closest?.(".sidebar-slot");
    if (sidebarSlot && this.grid) {
      const leftZone = document.getElementById("sidebarLeftZone");
      const rightZone = document.getElementById("sidebarRightZone");
      const zone = sidebarSlot.closest?.("#sidebarLeftZone, #sidebarRightZone");
      const side =
        zone === leftZone ? "left" : zone === rightZone ? "right" : null;
      if (side) {
        const index = Array.from(zone.children).indexOf(sidebarSlot);
        this.sidebarDragOrigin = { side, index };
      }

      // Remove from sidebar slot
      try {
        element.classList.remove("sidebar-detached");
      } catch (e) {}

      try {
        sidebarSlot.remove();
      } catch (e) {}

      this.updateSidebarZoneCounts();

      // Create a temporary row at the end so the element has a grid context
      const tempRow = document.createElement("div");
      tempRow.className = "grid-flex-row grid-flex-row-new";
      tempRow.dataset.rowIndex = String(
        this.grid.querySelectorAll(".grid-flex-row").length,
      );
      this.grid.appendChild(tempRow);
      tempRow.appendChild(element);
    }

    // Use the original rect captured before DOM manipulation
    this.draggedItemRect = originalRect;
    this.initialMouseX = clientX;
    this.initialMouseY = clientY;
    this.lastPointerX = clientX;
    this.lastPointerY = clientY;

    // Disable smooth scrolling for fast edge auto-scroll
    this.disableSmoothScrollDuringDrag();

    // Calculate offset from element top-left
    this.dragOffsetX = clientX - this.draggedItemRect.left;
    this.dragOffsetY = clientY - this.draggedItemRect.top;

    // Store original position info
    let row = element.closest(".grid-flex-row");
    if (!row && this.grid) {
      // Fallback: put the element in a new row if it's not currently in the grid.
      row = document.createElement("div");
      row.className = "grid-flex-row grid-flex-row-new";
      row.dataset.rowIndex = String(
        this.grid.querySelectorAll(".grid-flex-row").length,
      );
      this.grid.appendChild(row);
      row.appendChild(element);
    }
    this.originalRow = row;
    this.originalRowIndex = row ? parseInt(row.dataset.rowIndex) : 0;
    this.originalItemIndex = row
      ? Array.from(row.children).indexOf(element)
      : 0;

    // Create placeholder
    this.createPlaceholder();

    // Style dragged item
    element.classList.add("grid-dragging");
    element.style.position = "fixed";
    element.style.zIndex = "10000";
    element.style.width = `${this.draggedItemRect.width}px`;
    element.style.height = `${this.draggedItemRect.height}px`;
    element.style.left = `${this.draggedItemRect.left}px`;
    element.style.top = `${this.draggedItemRect.top}px`;
    element.style.pointerEvents = "none";
    element.style.transition = "none";

    // Add dragging class to grid
    this.grid.classList.add("grid-is-dragging");

    // Add dragging class to sidebar zones for visual feedback
    this.addSidebarDraggingClass();

    // Setup auto-scroll
    this.setupAutoScroll();

    // Cache row geometry for drag hit-testing; updated lazily when needed.
    this.rebuildDragRowRectsCache();
  }

  /**
   * Create placeholder element
   */
  createPlaceholder() {
    this.placeholder = document.createElement("div");
    this.placeholder.className = "grid-placeholder";
    this.placeholder.style.width = `${this.draggedItemRect.width}px`;
    this.placeholder.style.height = `${this.draggedItemRect.height}px`;
    this.placeholder.style.flex = this.draggedItem.style.flex;
    this.placeholder.style.maxWidth = this.draggedItem.style.maxWidth;

    // Insert placeholder where dragged item was
    this.draggedItem.parentNode.insertBefore(
      this.placeholder,
      this.draggedItem,
    );
  }

  /**
   * Handle mouse move - update drag position
   */
  handleMouseMove(e) {
    if (this.isMiddleLayoutResizing) {
      this.updateMiddleLayoutResize(e.clientX);
      e.preventDefault();
      return;
    }

    if (this.isSidebarResizing) {
      this.updateSidebarResize(e.clientX);
      e.preventDefault();
      return;
    }

    if (!this.isDragging) return;
    this.updateDrag(e.clientX, e.clientY);
  }

  /**
   * Handle touch move - update drag position
   */
  handleTouchMove(e) {
    if (this.isMiddleLayoutResizing) {
      const touch = e.touches && e.touches[0];
      if (!touch) return;
      this.updateMiddleLayoutResize(touch.clientX);
      e.preventDefault();
      return;
    }

    if (this.touchStartTimer) {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - this.touchStartPos.x);
      const dy = Math.abs(touch.clientY - this.touchStartPos.y);

      // Cancel drag start if moved too much (user is scrolling)
      if (dx > 10 || dy > 10) {
        clearTimeout(this.touchStartTimer);
        this.touchStartTimer = null;
      }
    }

    if (!this.isDragging) return;
    e.preventDefault();

    const touch = e.touches[0];
    this.updateDrag(touch.clientX, touch.clientY);
  }

  /**
   * Update drag position and find drop target
   */
  updateDrag(clientX, clientY) {
    if (!this.draggedItem) return;

    // Track last pointer position for auto-scroll calculations
    this.lastPointerX = clientX;
    this.lastPointerY = clientY;

    // Update dragged item position
    this.draggedItem.style.left = `${clientX - this.dragOffsetX}px`;
    this.draggedItem.style.top = `${clientY - this.dragOffsetY}px`;

    // Find drop target (throttled to animation frames)
    this.scheduleDropTargetUpdate(clientX, clientY);
  }

  scheduleDropTargetUpdate(clientX, clientY) {
    this.pendingDropTargetX = clientX;
    this.pendingDropTargetY = clientY;

    if (this.dropTargetRaf) return;

    this.dropTargetRaf = requestAnimationFrame(() => {
      this.dropTargetRaf = null;
      if (!this.isDragging || !this.draggedItem) return;
      this.updateDropTarget(this.pendingDropTargetX, this.pendingDropTargetY);
    });
  }

  cancelDropTargetUpdate() {
    if (!this.dropTargetRaf) return;
    cancelAnimationFrame(this.dropTargetRaf);
    this.dropTargetRaf = null;
  }

  getCurrentScrollY() {
    return (
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0
    );
  }

  rebuildDragRowRectsCache() {
    if (!this.grid) {
      this.dragRowRectsCache = [];
      this.dragRowRectsCacheScrollY = this.getCurrentScrollY();
      return;
    }

    const rows = Array.from(this.grid.querySelectorAll(".grid-flex-row"));
    this.dragRowRectsCacheScrollY = this.getCurrentScrollY();
    this.dragRowRectsCache = rows.map((row, index) => {
      const rect = row.getBoundingClientRect();
      return {
        row,
        index,
        top: rect.top,
        bottom: rect.bottom,
      };
    });
  }

  getDragRowRectEntries() {
    if (
      !Array.isArray(this.dragRowRectsCache) ||
      !this.dragRowRectsCache.length
    ) {
      this.rebuildDragRowRectsCache();
      return this.dragRowRectsCache || [];
    }

    const currentScrollY = this.getCurrentScrollY();
    const scrollDelta = currentScrollY - this.dragRowRectsCacheScrollY;
    if (scrollDelta !== 0) {
      this.dragRowRectsCache.forEach((entry) => {
        entry.top -= scrollDelta;
        entry.bottom -= scrollDelta;
      });
      this.dragRowRectsCacheScrollY = currentScrollY;
    }

    return this.dragRowRectsCache;
  }

  invalidateDragRowRectsCache() {
    this.dragRowRectsCache = null;
    this.dragRowRectsCacheScrollY = this.getCurrentScrollY();
  }

  /**
   * Update drop target - find where to place the placeholder
   */
  updateDropTarget(clientX, clientY) {
    // Sidebar mode: treat sidebars as drop targets.
    if (this.isSidebarDropAllowed()) {
      this.updateSidebarDropTarget(clientX, clientY);

      // If we're not in edit mode, do NOT reposition placeholder within the grid.
      // Sidebar mode dragging is only for moving items into sidebars.
      if (!this.isEditModeEnabled) {
        this.grid
          .querySelectorAll(".grid-flex-row")
          .forEach((r) => r.classList.remove("grid-row-target"));
        return;
      }
    } else {
      this.clearSidebarDropTarget();
    }

    const draggedId = this.draggedItem.dataset.gridId;
    const draggedConfig = this.componentSpans[draggedId];

    // Find the row we're hovering over
    const rowEntries = this.getDragRowRectEntries();
    if (!rowEntries.length) return;

    let targetRow = null;
    let targetRowIndex = -1;
    let targetRowRect = null;

    rowEntries.forEach((entry) => {
      if (
        clientY >= entry.top - 20 &&
        clientY <= entry.bottom + 20 &&
        entry.row.style.display !== "none"
      ) {
        targetRow = entry.row;
        targetRowIndex = entry.index;
        targetRowRect = {
          top: entry.top,
          bottom: entry.bottom,
          height: entry.bottom - entry.top,
        };
      }
    });

    if (!targetRow) {
      // Check if we're above all rows or below
      const firstRow = rowEntries[0];
      const lastRow = rowEntries[rowEntries.length - 1];

      if (firstRow && clientY < firstRow.top) {
        targetRow = firstRow.row;
        targetRowIndex = 0;
        targetRowRect = {
          top: firstRow.top,
          bottom: firstRow.bottom,
          height: firstRow.bottom - firstRow.top,
        };
      } else if (lastRow && clientY > lastRow.bottom) {
        targetRow = lastRow.row;
        targetRowIndex = rowEntries.length - 1;
        targetRowRect = {
          top: lastRow.top,
          bottom: lastRow.bottom,
          height: lastRow.bottom - lastRow.top,
        };
      }
    }

    if (!targetRow || !targetRowRect) return;

    const targetLayoutRowIndex = Number.isFinite(
      parseInt(targetRow.dataset.rowIndex, 10),
    )
      ? parseInt(targetRow.dataset.rowIndex, 10)
      : targetRowIndex;

    // Check if we can drop in this row based on span constraints
    const rowItems = Array.from(targetRow.children).filter(
      (el) =>
        el !== this.placeholder &&
        el !== this.draggedItem &&
        !this.isComponentHidden(el),
    );

    // Calculate total span in target row
    let totalSpan = draggedConfig.span;
    rowItems.forEach((el) => {
      const itemId = el.dataset.gridId;
      const itemConfig = this.componentSpans[itemId];
      if (itemConfig) {
        totalSpan += itemConfig.span;
      }
    });

    // Determine if we need to create a new row
    const needsNewRow = totalSpan > 6 || draggedConfig.span === 6;

    // Allow any component to create a new row when hovering near the top/bottom edge of a row.
    // This enables intentionally placing a component on its own row even if it would fit.
    const NEW_ROW_EDGE_ZONE_PX = 28;
    const nearTopEdge = clientY < targetRowRect.top + NEW_ROW_EDGE_ZONE_PX;
    const nearBottomEdge =
      clientY > targetRowRect.bottom - NEW_ROW_EDGE_ZONE_PX;
    const wantsNewRow = rowItems.length > 0 && (nearTopEdge || nearBottomEdge);

    if ((needsNewRow || wantsNewRow) && rowItems.length > 0) {
      // Create insertion point for new row (above or below current row)
      if (wantsNewRow) {
        this.movePlaceholderToNewRow(
          targetLayoutRowIndex,
          nearTopEdge ? "before" : "after",
        );
      } else {
        const rowCenterY = targetRowRect.top + targetRowRect.height / 2;
        this.movePlaceholderToNewRow(
          targetLayoutRowIndex,
          clientY < rowCenterY ? "before" : "after",
        );
      }
    } else {
      // Can drop within this row - find position
      let insertPosition = rowItems.length;

      rowItems.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;

        if (clientX < centerX && insertPosition > index) {
          insertPosition = index;
        }
      });

      // Move placeholder to target position
      this.movePlaceholderToRow(targetRow, insertPosition);
    }
  }

  /**
   * Move placeholder to a position within a row
   */
  movePlaceholderToRow(row, position) {
    // Remove placeholder from current position
    if (this.placeholder.parentNode) {
      this.placeholder.parentNode.removeChild(this.placeholder);
    }

    const children = Array.from(row.children).filter(
      (el) => el !== this.draggedItem && !this.isComponentHidden(el),
    );

    if (position >= children.length) {
      row.appendChild(this.placeholder);
    } else {
      row.insertBefore(this.placeholder, children[position]);
    }

    // Update placeholder size based on new row context
    const visibleCount =
      children.filter((el) => el !== this.placeholder).length + 1;
    const draggedId = this.draggedItem.dataset.gridId;
    const config = this.componentSpans[draggedId];

    let flexPercent;
    if (visibleCount === 1) {
      flexPercent = 100;
    } else if (visibleCount === 2) {
      flexPercent = 50;
    } else if (visibleCount === 3) {
      flexPercent = 33.333;
    } else {
      flexPercent = (config.span / 6) * 100;
    }

    this.placeholder.style.flex = `1 1 calc(${flexPercent}% - var(--spacing-xl))`;
    this.placeholder.style.maxWidth = `${flexPercent}%`;

    // Mark current target row
    this.grid
      .querySelectorAll(".grid-flex-row")
      .forEach((r) => r.classList.remove("grid-row-target"));
    row.classList.add("grid-row-target");

    this.invalidateDragRowRectsCache();
  }

  /**
   * Move placeholder to a new row (before or after existing row)
   */
  movePlaceholderToNewRow(rowIndex, position) {
    // Remove placeholder from current position
    if (this.placeholder.parentNode) {
      this.placeholder.parentNode.removeChild(this.placeholder);
    }

    // Check if there's already an empty row we created
    let newRow = this.grid.querySelector(".grid-flex-row-new");
    if (!newRow) {
      newRow = document.createElement("div");
      newRow.className = "grid-flex-row grid-flex-row-new";
    }

    const rows = this.grid.querySelectorAll(
      ".grid-flex-row:not(.grid-flex-row-new)",
    );
    const targetRow = rows[rowIndex];

    if (position === "before") {
      targetRow.parentNode.insertBefore(newRow, targetRow);
    } else {
      targetRow.parentNode.insertBefore(newRow, targetRow.nextSibling);
    }

    // Placeholder takes full width in new row
    this.placeholder.style.flex = "1 1 100%";
    this.placeholder.style.maxWidth = "100%";
    newRow.appendChild(this.placeholder);

    // Mark new row as target
    this.grid
      .querySelectorAll(".grid-flex-row")
      .forEach((r) => r.classList.remove("grid-row-target"));
    newRow.classList.add("grid-row-target");

    this.invalidateDragRowRectsCache();
  }

  /**
   * Handle mouse up - end drag
   */
  handleMouseUp(e) {
    if (this.isMiddleLayoutResizing) {
      this.endMiddleLayoutResize();
      return;
    }

    if (this.isSidebarResizing) {
      this.endSidebarResize();
      return;
    }

    if (!this.isDragging) return;

    // Ensure sidebar target is up-to-date at release time
    if (this.isSidebarDropAllowed()) {
      this.updateSidebarDropTarget(e.clientX, e.clientY);
    }

    this.endDrag();
  }

  /**
   * Handle touch end - end drag
   */
  handleTouchEnd(e) {
    if (this.isMiddleLayoutResizing) {
      this.endMiddleLayoutResize();
      return;
    }

    if (this.touchStartTimer) {
      clearTimeout(this.touchStartTimer);
      this.touchStartTimer = null;
    }

    if (!this.isDragging) return;

    // Ensure sidebar target is up-to-date at release time
    if (this.isSidebarDropAllowed()) {
      const touch = (e.changedTouches && e.changedTouches[0]) || null;
      if (touch) this.updateSidebarDropTarget(touch.clientX, touch.clientY);
    }

    this.endDrag();
  }

  /**
   * End drag operation
   */
  endDrag() {
    if (!this.isDragging || !this.draggedItem) return;

    // Stop auto-scroll
    this.stopAutoScroll();
    this.cancelDropTargetUpdate();
    this.invalidateDragRowRectsCache();

    // Restore smooth scroll behavior
    this.restoreSmoothScrollAfterDrag();

    // Sidebar drop takes precedence (no grid animation)
    if (this.isSidebarDropAllowed() && this.sidebarDropTarget) {
      this.finalizeSidebarDrop(this.sidebarDropTarget);
      return;
    }

    // Get final position from placeholder
    const placeholderParent = this.placeholder.parentNode;
    const placeholderIndex = Array.from(placeholderParent.children).indexOf(
      this.placeholder,
    );

    // Animate dragged item to placeholder position
    const placeholderRect = this.placeholder.getBoundingClientRect();

    this.draggedItem.style.transition = "all 0.2s ease";
    this.draggedItem.style.left = `${placeholderRect.left}px`;
    this.draggedItem.style.top = `${placeholderRect.top}px`;
    this.draggedItem.style.width = `${placeholderRect.width}px`;

    // After animation, finalize position
    setTimeout(() => {
      this.finalizeDrop(placeholderParent, placeholderIndex);
    }, 200);
  }

  /**
   * Finalize drop - update DOM and save layout
   */
  finalizeDrop(targetRow, insertIndex) {
    if (!this.draggedItem || !this.placeholder) return;

    const movedOutFromSidebar = !!this.sidebarDragOrigin;

    this.clearSidebarDropTarget();

    // Reset dragged item styles
    this.draggedItem.classList.remove("grid-dragging");
    this.draggedItem.style.position = "";
    this.draggedItem.style.zIndex = "";
    this.draggedItem.style.left = "";
    this.draggedItem.style.top = "";
    this.draggedItem.style.width = "";
    this.draggedItem.style.height = "";
    this.draggedItem.style.pointerEvents = "";
    this.draggedItem.style.transition = "";

    // Replace placeholder with dragged item
    targetRow.insertBefore(this.draggedItem, this.placeholder);
    this.placeholder.remove();
    this.placeholder = null;

    if (movedOutFromSidebar) {
      this.resetSidebarWidthForElement(this.draggedItem, { keepSaved: true });
      this.ensureSidebarResizeHandles(this.draggedItem);
      this.applySavedMiddleWidthToElement(this.draggedItem);
    }

    // Clean up empty rows and temporary rows
    this.grid.querySelectorAll(".grid-flex-row").forEach((row) => {
      row.classList.remove("grid-flex-row-new", "grid-row-target");
      const visibleChildren = Array.from(row.children).filter(
        (el) => !this.isComponentHidden(el),
      );
      if (visibleChildren.length === 0) {
        // Move any hidden items to nearest row before removing
        const hiddenChildren = Array.from(row.children);
        if (hiddenChildren.length > 0) {
          const nextRow = row.nextElementSibling || row.previousElementSibling;
          if (nextRow && nextRow.classList.contains("grid-flex-row")) {
            hiddenChildren.forEach((child) => nextRow.appendChild(child));
          }
        }
        row.remove();
      }
    });

    // Update rows array from DOM
    this.updateRowsFromDOM();

    // Update flex basis for all items without repacking rows
    this.updateFlexBasisForCurrentDOM();

    // Remove dragging class from grid
    this.grid.classList.remove("grid-is-dragging");

    // Remove dragging class from sidebar zones
    this.removeSidebarDraggingClass();

    // Save layout
    this.saveLayout();

    // Restore smooth scroll behavior
    this.restoreSmoothScrollAfterDrag();

    // If we dragged out of a sidebar while in sidebar mode, persist sidebar contents.
    if (this.isSidebarModeEnabled) {
      try {
        this.saveSidebarStateFromDOM();
      } catch (e) {}
    }

    // Reset state
    this.isDragging = false;
    this.draggedItem = null;
    this.originalRow = null;
    this.sidebarDragOrigin = null;
    this.invalidateDragRowRectsCache();
  }

  finalizeSidebarDrop(side) {
    if (!this.draggedItem || !this.placeholder) return;

    const zone = this.getSidebarZone(side);
    if (!zone) {
      this.clearSidebarDropTarget();
      this.cancelDrag();
      return;
    }

    const insertIndex =
      typeof this.sidebarDropIndex === "number" ? this.sidebarDropIndex : null;

    // Remove placeholder (we don't keep hidden markers anymore)
    try {
      this.placeholder.remove();
    } catch (e) {}
    this.placeholder = null;

    // Reset dragged item styles (similar to finalizeDrop)
    this.draggedItem.classList.remove("grid-dragging");
    this.draggedItem.style.position = "";
    this.draggedItem.style.zIndex = "";
    this.draggedItem.style.left = "";
    this.draggedItem.style.top = "";
    this.draggedItem.style.width = "";
    this.draggedItem.style.height = "";
    this.draggedItem.style.pointerEvents = "";
    this.draggedItem.style.transition = "";

    // Clear grid sizing constraints so the component can fit the sidebar width.
    this.draggedItem.style.flex = "";
    this.draggedItem.style.maxWidth = "";
    this.draggedItem.style.minWidth = "";

    // Move into sidebar slot
    this.dockElementToSidebar(this.draggedItem, side, insertIndex);

    // Cleanup grid drag styling
    this.grid.classList.remove("grid-is-dragging");
    this.removeSidebarDraggingClass();
    this.grid
      .querySelectorAll(".grid-flex-row")
      .forEach((r) => r.classList.remove("grid-row-target"));

    this.clearSidebarDropTarget();
    this.updateSidebarZoneCounts();

    // Clean up empty rows to avoid gaps
    this.cleanupEmptyRows();

    // Update rows layout (middle column) and persist sidebar mode state
    this.updateRowsFromDOM();
    this.updateFlexBasisForCurrentDOM();
    this.saveLayout();

    // Restore smooth scroll behavior
    this.restoreSmoothScrollAfterDrag();

    // Reset state
    this.isDragging = false;
    this.draggedItem = null;
    this.originalRow = null;
    this.sidebarDragOrigin = null;
  }

  /**
   * Update rows array from current DOM state
   */
  updateRowsFromDOM() {
    const floatingTargets = window.dashboard?.floating?.targets || {};
    const floatingPlaceholderFallback = {
      quotes: "quoteSection",
      prayerTimes: "prayerTimesCard",
      hijriCalendar: "calendarCard",
      qiblaDirection: "qiblaCard",
      lunarPhase: "lunarPhaseCard",
      fasting: "fastingCard",
      flashcards: "flashcardCard",
      adhkar: "adhkarCard",
      hadith: "hadithCard",
      todoList: "todoCard",
    };

    const resolveFloatingPlaceholderId = (floatingKey) => {
      if (!floatingKey) return null;

      const fromTargets = floatingTargets[floatingKey]?.cardId;
      if (fromTargets) return fromTargets;

      return floatingPlaceholderFallback[floatingKey] || null;
    };

    this.rows = [];
    const rowElements = this.grid.querySelectorAll(".grid-flex-row");

    rowElements.forEach((row, index) => {
      const rowIds = [];
      row.dataset.rowIndex = index;

      Array.from(row.children).forEach((child) => {
        let id = child.dataset.gridId;

        if (!id && child.hasAttribute("data-floating-placeholder")) {
          const floatingKey = child.getAttribute("data-floating-placeholder");
          id = resolveFloatingPlaceholderId(floatingKey);
        }

        if (id && this.componentSpans[id] && !rowIds.includes(id)) {
          rowIds.push(id);
        }
      });

      if (rowIds.length > 0) {
        this.rows.push(rowIds);
      }
    });

    this.activeRows = JSON.parse(JSON.stringify(this.rows));
  }

  /**
   * Setup auto-scroll when dragging near edges
   */
  setupAutoScroll() {
    const scrollThreshold = 280;
    const minSpeed = 22;
    const maxSpeed = 180;
    const smoothing = 0.2;

    const getSpeed = (intensity) => {
      const clamped = Math.max(0, Math.min(scrollThreshold, intensity));
      const ratio = clamped / scrollThreshold;
      const eased = Math.pow(ratio, 0.65);
      return minSpeed + eased * (maxSpeed - minSpeed);
    };

    this.scrollInterval = setInterval(() => {
      if (!this.isDragging || !this.draggedItem) return;

      const windowHeight = window.innerHeight || 0;
      if (!windowHeight) return;

      const pointerY =
        Number.isFinite(this.lastPointerY) && this.lastPointerY > 0
          ? this.lastPointerY
          : this.draggedItem.getBoundingClientRect().top + this.dragOffsetY;

      const distanceToTop = pointerY;
      const distanceToBottom = windowHeight - pointerY;

      let targetSpeed = 0;

      // Scroll up
      if (distanceToTop < scrollThreshold) {
        targetSpeed = -getSpeed(scrollThreshold - distanceToTop);
      }
      // Scroll down
      else if (distanceToBottom < scrollThreshold) {
        targetSpeed = getSpeed(scrollThreshold - distanceToBottom);
      }

      // Smooth velocity for less jittery motion
      this.autoScrollVelocity =
        this.autoScrollVelocity * (1 - smoothing) + targetSpeed * smoothing;

      if (Math.abs(this.autoScrollVelocity) > 0.5) {
        window.scrollBy({
          top: Math.round(this.autoScrollVelocity),
          left: 0,
          behavior: "auto",
        });
      }
    }, 16);
  }

  /**
   * Stop auto-scroll
   */
  stopAutoScroll() {
    if (this.scrollInterval) {
      clearInterval(this.scrollInterval);
      this.scrollInterval = null;
    }
    this.autoScrollVelocity = 0;
  }

  /**
   * Allow mouse wheel scrolling during drag
   */
  handleWheel(e) {
    if (!this.isDragging) return;

    let deltaY = e.deltaY;
    if (e.deltaMode === 1) {
      // Line mode
      deltaY *= 16;
    } else if (e.deltaMode === 2) {
      // Page mode
      deltaY *= window.innerHeight || 0;
    }

    window.scrollBy({ top: deltaY, left: 0, behavior: "auto" });
    e.preventDefault();
  }

  /**
   * Handle keyboard events for accessibility
   */
  handleKeyDown(e) {
    if (e.key === "Escape" && this.isMiddleLayoutResizing) {
      this.endMiddleLayoutResize();
      return;
    }

    if (e.key === "Escape" && this.isSidebarResizing) {
      this.endSidebarResize();
      return;
    }

    // Escape cancels drag
    if (e.key === "Escape" && this.isDragging) {
      this.cancelDrag();
    }
  }

  /**
   * Cancel current drag operation
   */
  cancelDrag() {
    if (!this.isDragging || !this.draggedItem) return;

    this.clearSidebarDropTarget();

    this.stopAutoScroll();
    this.cancelDropTargetUpdate();
    this.invalidateDragRowRectsCache();

    // Reset dragged item
    this.draggedItem.classList.remove("grid-dragging");
    this.draggedItem.style.position = "";
    this.draggedItem.style.zIndex = "";
    this.draggedItem.style.left = "";
    this.draggedItem.style.top = "";
    this.draggedItem.style.width = "";
    this.draggedItem.style.height = "";
    this.draggedItem.style.pointerEvents = "";
    this.draggedItem.style.transition = "";

    // Remove placeholder and any temporary rows
    if (this.placeholder) {
      this.placeholder.remove();
      this.placeholder = null;
    }

    // If this drag started from a sidebar, put it back.
    if (this.sidebarDragOrigin && this.isSidebarModeEnabled) {
      try {
        const { side, index } = this.sidebarDragOrigin;
        this.dockElementToSidebar(this.draggedItem, side, index);
        this.updateSidebarZoneCounts();
      } catch (e) {}
    }

    this.grid.querySelectorAll(".grid-flex-row-new").forEach((row) => {
      if (row.children.length === 0) {
        row.remove();
      }
    });

    // Remove styling
    this.grid.classList.remove("grid-is-dragging");
    this.removeSidebarDraggingClass();
    this.grid
      .querySelectorAll(".grid-flex-row")
      .forEach((r) => r.classList.remove("grid-row-target"));

    // Reset state
    this.isDragging = false;
    this.draggedItem = null;
    this.originalRow = null;
    this.sidebarDragOrigin = null;
    this.invalidateDragRowRectsCache();
  }

  /**
   * Reset layout to default
   */
  resetToDefault() {
    const defaultRows = this.normalizeLayout(
      JSON.parse(JSON.stringify(this.defaultLayout)),
    );

    this.rows = JSON.parse(JSON.stringify(defaultRows));
    this.activeRows = JSON.parse(JSON.stringify(defaultRows));
    this.expandedComponents.clear(); // Clear breakpoint states

    // Reset both layout modes and sidebar positions in storage
    try {
      const settings = this.storage.getSettings();
      settings[this.getNormalLayoutStorageKeyForMode("normalWide")] =
        JSON.parse(JSON.stringify(defaultRows));
      settings[this.getNormalLayoutStorageKeyForMode("compressed")] =
        JSON.parse(JSON.stringify(defaultRows));
      settings[this.getSidebarLayoutStorageKey()] = JSON.parse(
        JSON.stringify(defaultRows),
      );
      settings.gridLayoutNormal = JSON.parse(JSON.stringify(defaultRows));
      settings.gridLayout = JSON.parse(JSON.stringify(defaultRows));
      settings[this.getSidebarStateStorageKey()] = { left: [], right: [] };
      settings[this.getSidebarWidthStorageKey()] = {};
      settings[this.getNormalWideMiddleWidthStorageKey()] = {};
      settings[this.getCompressedMiddleWidthStorageKey()] = {};
      settings[this.getLegacyMiddleWidthStorageKey()] = {};
      settings[this.getFocusModeMiddleWidthStorageKey()] = {};
      delete settings[this.getSidebarMiddleLayoutWidthStorageKey()];
      delete settings[this.getSidebarMiddleLayoutPreferredWidthStorageKey()];
      this.storage.saveSettings(settings);
    } catch (e) {
      // ignore
    }

    // Ensure any docked sidebar items return to the grid
    try {
      this.undockAllSidebarItemsToGrid();
    } catch (e) {}

    this.applyLayout(this.rows);
    this.resetSidebarMiddleLayoutWidth({ persist: false });
    this.updateSidebarZoneCounts();
    this.updateFlexBasisForCurrentDOM();
  }

  resetAllCustomComponentWidths() {
    // Clear saved size overrides for both sidebar-docked and middle/grid components.
    try {
      const settings = this.storage.getSettings();
      settings[this.getSidebarWidthStorageKey()] = {};
      settings[this.getNormalWideMiddleWidthStorageKey()] = {};
      settings[this.getCompressedMiddleWidthStorageKey()] = {};
      settings[this.getLegacyMiddleWidthStorageKey()] = {};
      settings[this.getFocusModeMiddleWidthStorageKey()] = {};
      this.storage.saveSettings(settings);
    } catch (e) {
      // ignore
    }

    const allDraggables = Array.from(
      document.querySelectorAll(".grid-draggable"),
    );

    allDraggables.forEach((el) => {
      this.resetSidebarWidthForElement(el, { keepSaved: true });
      this.resetMiddleWidthForElement(el, {
        keepSaved: true,
        restoreDefaultFlex: !el.classList.contains("sidebar-detached"),
      });
    });

    this.updateSidebarZoneCounts();
    this.updateFlexBasisForCurrentDOM();
  }

  /**
   * Get current layout for external use
   */
  getLayout() {
    return JSON.parse(JSON.stringify(this.rows));
  }

  /**
   * Set layout from external source
   */
  setLayout(layout) {
    if (Array.isArray(layout) && layout.length > 0) {
      this.rows = layout;
      this.applyLayout(this.rows);
      this.saveLayout();
    }
  }

  /**
   * Enable edit mode programmatically
   */
  enableEditMode() {
    if (this.isEditModeLocked) {
      return;
    }

    if (!this.isEditModeEnabled) {
      this.toggleEditMode();
    }
  }

  /**
   * Disable edit mode programmatically
   */
  disableEditMode() {
    if (this.isEditModeEnabled) {
      this.toggleEditMode();
    }
  }

  /**
   * Lock/unlock edit mode (used by mode managers like Moment Mode)
   */
  setEditModeLocked(locked) {
    const next = locked === true;
    this.isEditModeLocked = next;
    const editModeStorageKey = this.getEditModeStorageKey();

    if (this.isEditModeLocked && this.isEditModeEnabled) {
      this.isEditModeEnabled = false;

      const settings = this.storage.getSettings();
      settings[editModeStorageKey] = false;
      this.storage.saveSettings(settings);
    }

    const toggleBtn = document.getElementById("layoutEditBtn");
    this.updateEditModeUI(toggleBtn);
    this.syncSidebarModeForEditState();
  }

  /**
   * Check if edit mode is currently enabled
   */
  isEditMode() {
    return this.isEditModeEnabled;
  }

  /**
   * Set minimum width requirement for a component
   * The layout system will ensure this component gets enough spans to meet its minimum width
   * @param {string} componentId - The ID of the component
   * @param {number} minWidth - Minimum width in pixels
   */
  setComponentMinWidth(componentId, minWidth) {
    this.componentMinWidths[componentId] = minWidth;
    // Recalculate layout to apply new minimum
    this.calculateResponsiveLayout();
    this.recalculateLayout();
  }

  /**
   * Remove minimum width requirement for a component
   * @param {string} componentId - The ID of the component
   */
  removeComponentMinWidth(componentId) {
    delete this.componentMinWidths[componentId];
    delete this.effectiveSpans[componentId];
    // Recalculate layout
    this.calculateResponsiveLayout();
    this.recalculateLayout();
  }

  /**
   * Get the current minimum width configuration
   * @returns {Object} Map of componentId -> minWidth
   */
  getComponentMinWidths() {
    return { ...this.componentMinWidths };
  }

  /**
   * Cleanup when component is destroyed
   */
  destroy() {
    // Clear any pending timers
    if (this.viewportResizeTimer) {
      clearTimeout(this.viewportResizeTimer);
    }
    this.cancelViewportStabilizePass();

    this.cancelDropTargetUpdate();

    // Remove event listeners
    window.removeEventListener("resize", this.handleViewportResize);

    if (this.containerResizeObserver) {
      this.containerResizeObserver.disconnect();
      this.containerResizeObserver = null;
    }

    if (this.grid) {
      this.grid.removeEventListener("mousedown", this.handleMouseDown);
      this.grid.removeEventListener(
        "dblclick",
        this.handleSidebarResizeDoubleClick,
      );
      this.grid.removeEventListener("touchstart", this.handleTouchStart);
    }
    const leftZone = document.getElementById("sidebarLeftZone");
    const rightZone = document.getElementById("sidebarRightZone");
    if (leftZone) {
      leftZone.removeEventListener("mousedown", this.handleMouseDown);
      leftZone.removeEventListener("touchstart", this.handleTouchStart);
      leftZone.removeEventListener(
        "dblclick",
        this.handleSidebarResizeDoubleClick,
      );
    }
    if (rightZone) {
      rightZone.removeEventListener("mousedown", this.handleMouseDown);
      rightZone.removeEventListener("touchstart", this.handleTouchStart);
      rightZone.removeEventListener(
        "dblclick",
        this.handleSidebarResizeDoubleClick,
      );
    }
    const sidebarMiddle = this.getSidebarMiddleElement();
    if (sidebarMiddle) {
      sidebarMiddle.removeEventListener(
        "mousedown",
        this.handleMiddleLayoutResizeMouseDown,
      );
      sidebarMiddle.removeEventListener(
        "touchstart",
        this.handleMiddleLayoutResizeTouchStart,
      );
      sidebarMiddle.removeEventListener(
        "dblclick",
        this.handleMiddleLayoutResizeDoubleClick,
      );
    }
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("mouseup", this.handleMouseUp);
    document.removeEventListener("touchmove", this.handleTouchMove);
    document.removeEventListener("touchend", this.handleTouchEnd);
    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("wheel", this.handleWheel);
    document.body.classList.remove("sidebar-resizing");
    document.body.classList.remove("middle-layout-resizing");
    this.clearViewportAutoZoom();
  }
}

// Export for use in app.js
window.GridLayoutManager = GridLayoutManager;

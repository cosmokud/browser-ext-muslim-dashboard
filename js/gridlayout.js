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
    this.viewportResizeTimer = null;
    this.lastViewportWidth = 0;
    this.containerResizeObserver = null;

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
      ["todoCard", "qiblaCard", "lunarPhaseCard"],
      ["flashcardCard", "adhkarCard"],
      ["hadithCard"],
      ["pocketQuranCard"],
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

    // Switching modes swaps layout + (for sidebar mode) restores docked components.
    if (!this.grid) return;

    if (this.isSidebarModeEnabled) {
      // Enter sidebar mode
      this.undockAllSidebarItemsToGrid();
      this.loadLayoutForMode("sidebar");
      this.applyLayout();
      this.applySidebarStateFromStorage();
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

  getSidebarStateStorageKey() {
    return "sidebarModeSidebars";
  }

  loadLayoutForMode(mode) {
    const settings = this.storage.getSettings();

    const layoutKey =
      mode === "sidebar" ? "gridLayoutSidebar" : "gridLayoutNormal";
    let savedLayout = settings[layoutKey];

    // Back-compat: old single layout key is treated as the normal layout.
    if (mode !== "sidebar" && (!savedLayout || !Array.isArray(savedLayout))) {
      savedLayout = settings.gridLayout;
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
        zone.querySelectorAll(":scope > .sidebar-slot > .grid-draggable")
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
            child.classList.remove("sidebar-detached");
            this.grid.appendChild(child);
          }
          try {
            slot.remove();
          } catch (e) {}
        }
      );
    });

    this.updateSidebarZoneCounts();
  }

  dockElementToSidebar(el, side, index = null) {
    const zone = this.getSidebarZone(side);
    if (!zone || !el) return false;

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
          !this.isComponentHidden(el)
      );
      if (visibleChildren.length === 0) {
        // If it's an empty row (or only contains placeholders/markers), remove it.
        const hasReal = Array.from(row.children).some(
          (el) => el.classList && el.classList.contains("grid-draggable")
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
          150
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
        "#sidebarLeftZone, #sidebarRightZone"
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

    // Load edit mode state from settings (default OFF)
    const settings = this.storage.getSettings();
    this.isEditModeEnabled = settings.gridEditModeEnabled === true;

    // Calculate initial responsive layout based on viewport
    this.lastViewportWidth = this.getLayoutWidth();
    this.calculateResponsiveLayout();

    // Apply the layout to create flex rows
    this.applyLayout();

    // Setup event listeners for drag and drop (only active when edit mode is enabled)
    this.setupEventListeners();

    // Setup viewport-based responsive monitoring
    this.setupViewportListener();

    // Setup edit mode toggle button
    this.setupEditModeToggle();

    // Listen for visibility changes
    document.addEventListener("md:visibility-changed", () => {
      this.recalculateLayout();
    });

    // Remove the loading state to reveal the grid
    requestAnimationFrame(() => {
      this.grid.classList.remove("grid-layout-loading");
      this.grid.classList.add("grid-layout-ready");
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
    this.isEditModeEnabled = !this.isEditModeEnabled;

    // Save state to settings
    const settings = this.storage.getSettings();
    settings.gridEditModeEnabled = this.isEditModeEnabled;
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

    // Show toast notification
    this.showToast(
      this.isEditModeEnabled
        ? "Layout edit mode enabled - drag components to reposition"
        : "Layout edit mode disabled",
      this.isEditModeEnabled ? "success" : "info"
    );
  }

  /**
   * Update the edit mode toggle button UI
   */
  updateEditModeUI(toggleBtn) {
    if (!toggleBtn) return;

    toggleBtn.setAttribute(
      "aria-pressed",
      this.isEditModeEnabled ? "true" : "false"
    );
    toggleBtn.classList.toggle("active", this.isEditModeEnabled);
    toggleBtn.title = this.isEditModeEnabled
      ? "Disable Layout Edit Mode"
      : "Enable Layout Edit Mode";

    // Update grid class
    if (this.grid) {
      this.grid.classList.toggle("grid-edit-mode", this.isEditModeEnabled);
    }
    // Also add to body so sidebar CSS selectors work
    document.body.classList.toggle("grid-edit-mode", this.isEditModeEnabled);
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

    requestAnimationFrame(() => {
      toast.classList.add("grid-toast-visible");
    });

    setTimeout(() => {
      toast.classList.remove("grid-toast-visible");
      setTimeout(() => toast.remove(), 300);
    }, 2500);
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
        this.handleViewportResize();
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

  /**
   * Handle viewport resize - recalculate responsive layout
   */
  handleViewportResize() {
    // Debounce resize handling
    if (this.viewportResizeTimer) {
      clearTimeout(this.viewportResizeTimer);
    }

    this.viewportResizeTimer = setTimeout(() => {
      const newWidth = this.getLayoutWidth();

      // Only recalculate if layout width changed (avoid tiny jitter)
      if (newWidth > 0 && Math.abs(newWidth - this.lastViewportWidth) > 2) {
        this.lastViewportWidth = newWidth;
        this.calculateResponsiveLayout();
        this.recalculateLayout();
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
    const layoutKey = this.isSidebarModeEnabled
      ? "gridLayoutSidebar"
      : "gridLayoutNormal";
    settings[layoutKey] = this.rows;

    // Back-compat: keep old key updated for normal mode
    if (!this.isSidebarModeEnabled) {
      settings.gridLayout = this.rows;
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

          rowWrapper.appendChild(el);
        }
      });

      fragment.appendChild(rowWrapper);
    });

    this.grid.appendChild(fragment);

    // Add class for CSS fallback (browsers that don't support :has())
    this.grid.classList.add("grid-layout-active");

    this.updateGridItems();
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
      this.grid.querySelectorAll(".grid-draggable")
    ).filter(
      (el) =>
        !this.isComponentHidden(el) && !el.classList.contains("floating-card")
    );
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
      const layoutChanged =
        JSON.stringify(baseRows) !== JSON.stringify(this.activeRows || []);

      if (layoutChanged) {
        this.applyLayout(baseRows);
      } else {
        // Just update flex basis for existing layout
        const rowWrappers = this.grid.querySelectorAll(".grid-flex-row");
        rowWrappers.forEach((rowWrapper) => {
          const rowItems = Array.from(rowWrapper.children);
          const visibleItems = rowItems.filter(
            (el) => !this.isComponentHidden(el)
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
          (el) => !this.isComponentHidden(el)
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
  }

  /**
   * Setup event listeners for drag and drop
   */
  setupEventListeners() {
    // Mouse events
    this.grid.addEventListener("mousedown", this.handleMouseDown);
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("mouseup", this.handleMouseUp);

    // Allow drag start from sidebars too (still gated by edit mode)
    const leftZone = document.getElementById("sidebarLeftZone");
    const rightZone = document.getElementById("sidebarRightZone");
    if (leftZone) leftZone.addEventListener("mousedown", this.handleMouseDown);
    if (rightZone)
      rightZone.addEventListener("mousedown", this.handleMouseDown);

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

  /**
   * Get drag handle or draggable element from target
   */
  getDraggableFromTarget(target) {
    // Check if clicking on interactive elements - don't drag
    if (
      target.closest(
        'button, input, select, textarea, a, [contenteditable="true"], .todo-list, .notes-editor, .flashcard-flip-card, .pocket-quran-content, .calendar-days'
      )
    ) {
      return null;
    }

    // Find the draggable parent
    const draggable = target.closest(".grid-draggable");
    if (!draggable) {
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
        this.grid.querySelectorAll(".grid-flex-row").length
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
        this.grid.querySelectorAll(".grid-flex-row").length
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
      this.draggedItem
    );
  }

  /**
   * Handle mouse move - update drag position
   */
  handleMouseMove(e) {
    if (!this.isDragging) return;
    this.updateDrag(e.clientX, e.clientY);
  }

  /**
   * Handle touch move - update drag position
   */
  handleTouchMove(e) {
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

    // Find drop target
    this.updateDropTarget(clientX, clientY);
  }

  /**
   * Update drop target - find where to place the placeholder
   */
  updateDropTarget(clientX, clientY) {
    // Sidebar mode: treat sidebars as drop targets.
    if (this.isSidebarModeEnabled) {
      this.updateSidebarDropTarget(clientX, clientY);

      // If we're not in edit mode, do NOT reposition placeholder within the grid.
      // Sidebar mode dragging is only for moving items into sidebars.
      if (!this.isEditModeEnabled) {
        this.grid
          .querySelectorAll(".grid-flex-row")
          .forEach((r) => r.classList.remove("grid-row-target"));
        return;
      }
    }

    const draggedId = this.draggedItem.dataset.gridId;
    const draggedConfig = this.componentSpans[draggedId];

    // Find the row we're hovering over
    const rows = this.grid.querySelectorAll(".grid-flex-row");
    let targetRow = null;
    let targetRowIndex = -1;
    let insertBefore = null;
    let insertAfter = null;

    rows.forEach((row, index) => {
      const rect = row.getBoundingClientRect();
      if (
        clientY >= rect.top - 20 &&
        clientY <= rect.bottom + 20 &&
        row.style.display !== "none"
      ) {
        targetRow = row;
        targetRowIndex = index;
      }
    });

    if (!targetRow) {
      // Check if we're above all rows or below
      const firstRow = rows[0];
      const lastRow = rows[rows.length - 1];

      if (firstRow && clientY < firstRow.getBoundingClientRect().top) {
        targetRow = firstRow;
        targetRowIndex = 0;
      } else if (lastRow && clientY > lastRow.getBoundingClientRect().bottom) {
        targetRow = lastRow;
        targetRowIndex = rows.length - 1;
      }
    }

    if (!targetRow) return;

    const targetRowRect = targetRow.getBoundingClientRect();
    const targetLayoutRowIndex = Number.isFinite(
      parseInt(targetRow.dataset.rowIndex, 10)
    )
      ? parseInt(targetRow.dataset.rowIndex, 10)
      : targetRowIndex;

    // Check if we can drop in this row based on span constraints
    const rowItems = Array.from(targetRow.children).filter(
      (el) =>
        el !== this.placeholder &&
        el !== this.draggedItem &&
        !this.isComponentHidden(el)
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
          nearTopEdge ? "before" : "after"
        );
      } else {
        const rowCenterY = targetRowRect.top + targetRowRect.height / 2;
        this.movePlaceholderToNewRow(
          targetLayoutRowIndex,
          clientY < rowCenterY ? "before" : "after"
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
      (el) => el !== this.draggedItem && !this.isComponentHidden(el)
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
      ".grid-flex-row:not(.grid-flex-row-new)"
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
  }

  /**
   * Handle mouse up - end drag
   */
  handleMouseUp(e) {
    if (!this.isDragging) return;

    // Ensure sidebar target is up-to-date at release time
    if (this.isSidebarModeEnabled) {
      this.updateSidebarDropTarget(e.clientX, e.clientY);
    }

    this.endDrag();
  }

  /**
   * Handle touch end - end drag
   */
  handleTouchEnd(e) {
    if (this.touchStartTimer) {
      clearTimeout(this.touchStartTimer);
      this.touchStartTimer = null;
    }

    if (!this.isDragging) return;

    // Ensure sidebar target is up-to-date at release time
    if (this.isSidebarModeEnabled) {
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

    // Restore smooth scroll behavior
    this.restoreSmoothScrollAfterDrag();

    // Sidebar drop takes precedence (no grid animation)
    if (this.isSidebarModeEnabled && this.sidebarDropTarget) {
      this.finalizeSidebarDrop(this.sidebarDropTarget);
      return;
    }

    // Get final position from placeholder
    const placeholderParent = this.placeholder.parentNode;
    const placeholderIndex = Array.from(placeholderParent.children).indexOf(
      this.placeholder
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

    // Clean up empty rows and temporary rows
    this.grid.querySelectorAll(".grid-flex-row").forEach((row) => {
      row.classList.remove("grid-flex-row-new", "grid-row-target");
      const visibleChildren = Array.from(row.children).filter(
        (el) => !this.isComponentHidden(el)
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
    this.rows = [];
    const rowElements = this.grid.querySelectorAll(".grid-flex-row");

    rowElements.forEach((row, index) => {
      const rowIds = [];
      row.dataset.rowIndex = index;

      Array.from(row.children).forEach((child) => {
        const id = child.dataset.gridId;
        if (id && this.componentSpans[id]) {
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
  }

  /**
   * Reset layout to default
   */
  resetToDefault() {
    const defaultRows = JSON.parse(JSON.stringify(this.defaultLayout));

    this.rows = JSON.parse(JSON.stringify(defaultRows));
    this.activeRows = JSON.parse(JSON.stringify(defaultRows));
    this.expandedComponents.clear(); // Clear breakpoint states

    // Reset both layout modes and sidebar positions in storage
    try {
      const settings = this.storage.getSettings();
      settings.gridLayoutNormal = JSON.parse(JSON.stringify(defaultRows));
      settings.gridLayoutSidebar = JSON.parse(JSON.stringify(defaultRows));
      settings.gridLayout = JSON.parse(JSON.stringify(defaultRows));
      settings[this.getSidebarStateStorageKey()] = { left: [], right: [] };
      this.storage.saveSettings(settings);
    } catch (e) {
      // ignore
    }

    // Ensure any docked sidebar items return to the grid
    try {
      this.undockAllSidebarItemsToGrid();
    } catch (e) {}

    this.applyLayout(this.rows);
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

    // Remove event listeners
    window.removeEventListener("resize", this.handleViewportResize);

    if (this.containerResizeObserver) {
      this.containerResizeObserver.disconnect();
      this.containerResizeObserver = null;
    }

    if (this.grid) {
      this.grid.removeEventListener("mousedown", this.handleMouseDown);
      this.grid.removeEventListener("touchstart", this.handleTouchStart);
    }
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("mouseup", this.handleMouseUp);
    document.removeEventListener("touchmove", this.handleTouchMove);
    document.removeEventListener("touchend", this.handleTouchEnd);
    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("wheel", this.handleWheel);
  }
}

// Export for use in app.js
window.GridLayoutManager = GridLayoutManager;

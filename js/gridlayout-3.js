/**
 * GridLayoutManager, part 3 of 4.
 * Moved out of js/gridlayout.js at method boundaries, so no single file carries the
 * whole class. The class itself is declared in js/gridlayout.js; load this after it.
 */
(function (prototype, members) {
  for (const name of Object.getOwnPropertyNames(members.prototype)) {
    if (name === "constructor") continue;
    Object.defineProperty(
      prototype,
      name,
      Object.getOwnPropertyDescriptor(members.prototype, name),
    );
  }
})(GridLayoutManager.prototype, class {

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
    this.modes.set("edit", settings[this.getMainEditModeStorageKey()] === true);

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

  toggleEditMode() {
    const wasEditModeEnabled = this.isEditModeEnabled;
    const editModeStorageKey = this.getEditModeStorageKey();

    if (this.isEditModeLocked) {
      // Safety: if lock is active, ensure edit mode is off.
      if (this.isEditModeEnabled) {
        this.modes.exit("edit");

        const settings = this.storage.getSettings();
        settings[editModeStorageKey] = false;
        this.storage.saveSettings(settings);
      }

      const toggleBtn = document.getElementById("layoutEditBtn");
      this.updateEditModeUI(toggleBtn);
      this.syncSidebarModeForEditState();
      return;
    }

    this.temporarilyDisableLayoutToggleAnimations();
    this.modes.toggle("edit");

    // Save state to settings
    const settings = this.storage.getSettings();
    settings[editModeStorageKey] = this.isEditModeEnabled;
    this.storage.saveSettings(settings);

    // Update UI
    const toggleBtn = document.getElementById("layoutEditBtn");
    this.updateEditModeUI(toggleBtn);

    // Update grid state (the body class belongs to the mode module)
    if (this.grid) {
      this.grid.classList.toggle("grid-edit-mode", this.isEditModeEnabled);
    }

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

    this.syncSidebarModeForEditState();
  }

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

      if (
        syncResult.applied ||
        syncResult.widthChanged ||
        syncResult.mainContainerWidthChanged ||
        syncResult.layoutModeChanged
      ) {
        this.emitLayoutLiveResize({
          reason: "viewport-resize-sync",
          triggerSource: source,
          zoomed: syncResult.zoomed === true,
          layoutMode: this.getMainContainerLayoutMode(),
          mainContainerWidth: this.getMainContainerResponsiveWidth(),
        });
      }

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

  getEffectiveSpan(componentId) {
    // First check if we have a calculated effective span
    if (this.effectiveSpans[componentId]) {
      return this.effectiveSpans[componentId];
    }

    // Fall back to base configuration
    const baseConfig = this.componentSpans[componentId];
    return baseConfig ? baseConfig.span : 2;
  }

  getElementByComponentId(componentId) {
    if (componentId === "header") {
      return this.grid?.querySelector(".header");
    }
    return document.getElementById(componentId);
  }

  loadLayout() {
    this.loadLayoutForMode("normal");
  }

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

  isComponentHidden(el) {
    return (
      el.style.display === "none" ||
      el.getAttribute("aria-hidden") === "true" ||
      el.classList.contains("floating-card") ||
      el.classList.contains("sidebar-detached")
    );
  }

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

  recalculateLayout() {
    if (!this.grid || this.isDragging) return;

    // First, recalculate effective spans based on current viewport
    this.calculateResponsiveLayout();

    const baseRows = Array.isArray(this.rows) ? this.rows : [];
    const baseOrder = baseRows.flat();
    const hasResponsiveOverrides = Object.keys(this.effectiveSpans).length > 0;

    // Hidden components can be temporarily replaced by other cards via drag/drop.
    // When those hidden cards are toggled visible again, proactively repack if
    // any row would exceed the 6-span budget (or 3 visible cards for span-2 cards).
    const hasVisibleOverflow = baseRows.some((row) => {
      if (!Array.isArray(row) || row.length === 0) return false;

      let visibleCount = 0;
      let visibleSpan = 0;

      for (const id of row) {
        const el = this.getElementByComponentId(id);
        if (!el || this.isComponentHidden(el)) continue;

        visibleCount += 1;
        visibleSpan += this.getEffectiveSpan(id);

        if (visibleCount > 3 || visibleSpan > 6) {
          return true;
        }
      }

      return false;
    });

    // When responsive overrides are inactive, preserve user-defined row boundaries.
    // If overflow exists after visibility changes, repair only overflowing rows.
    if (!hasResponsiveOverrides) {
      const updateFlexBasisForCurrentRows = () => {
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
      };

      if (!hasVisibleOverflow) {
        const layoutChanged = !this.areRowsEqual(
          baseRows,
          this.activeRows || [],
        );

        if (layoutChanged) {
          this.applyLayout(baseRows);
        } else {
          // Just update flex basis for existing layout
          updateFlexBasisForCurrentRows();
        }

        this.updateGridItems();
        this.applySavedMiddleWidthsFromDOM();
        return;
      }

      const repairedRows = JSON.parse(JSON.stringify(baseRows));

      const isVisibleComponentId = (componentId) => {
        const el = this.getElementByComponentId(componentId);
        return !!el && !this.isComponentHidden(el);
      };

      const getVisibleRowUsage = (row) => {
        let visibleCount = 0;
        let visibleSpan = 0;

        row.forEach((componentId) => {
          if (!isVisibleComponentId(componentId)) return;
          visibleCount += 1;
          visibleSpan += this.getEffectiveSpan(componentId);
        });

        return { visibleCount, visibleSpan };
      };

      const findFirstOverflowComponentId = (row) => {
        let visibleCount = 0;
        let visibleSpan = 0;

        for (const componentId of row) {
          if (!isVisibleComponentId(componentId)) continue;

          const span = this.getEffectiveSpan(componentId);
          if (visibleCount + 1 > 3 || visibleSpan + span > 6) {
            return componentId;
          }

          visibleCount += 1;
          visibleSpan += span;
        }

        return null;
      };

      const canFitVisibleComponentInRow = (row, componentId) => {
        if (!isVisibleComponentId(componentId)) return true;

        const { visibleCount, visibleSpan } = getVisibleRowUsage(row);
        const nextSpan = this.getEffectiveSpan(componentId);
        return visibleCount + 1 <= 3 && visibleSpan + nextSpan <= 6;
      };

      for (let rowIndex = 0; rowIndex < repairedRows.length; rowIndex += 1) {
        const row = repairedRows[rowIndex];
        if (!Array.isArray(row) || row.length === 0) continue;

        while (true) {
          const overflowComponentId = findFirstOverflowComponentId(row);
          if (!overflowComponentId) break;

          const overflowIndex = row.indexOf(overflowComponentId);
          if (overflowIndex < 0) break;

          row.splice(overflowIndex, 1);

          const nextRowIndex = rowIndex + 1;
          if (nextRowIndex >= repairedRows.length) {
            repairedRows.push([overflowComponentId]);
            continue;
          }

          const nextRow = repairedRows[nextRowIndex];
          if (
            Array.isArray(nextRow) &&
            canFitVisibleComponentInRow(nextRow, overflowComponentId)
          ) {
            nextRow.push(overflowComponentId);
          } else {
            // Keep next row intact and spawn a solo row above it when full.
            repairedRows.splice(nextRowIndex, 0, [overflowComponentId]);
          }
        }
      }

      const canonicalRowsChanged = !this.areRowsEqual(baseRows, repairedRows);
      const layoutChanged = !this.areRowsEqual(
        repairedRows,
        this.activeRows || [],
      );

      if (layoutChanged) {
        this.applyLayout(repairedRows);
      } else {
        updateFlexBasisForCurrentRows();
      }

      if (canonicalRowsChanged) {
        this.rows = JSON.parse(JSON.stringify(repairedRows));
        this.activeRows = JSON.parse(JSON.stringify(repairedRows));

        try {
          this.saveLayout();
        } catch (e) {
          // ignore storage save failures during automatic overflow repair
        }
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

    const rowSpanTotals = newRows.map((row) =>
      row.reduce(
        (sum, componentId) => sum + this.getEffectiveSpan(componentId),
        0,
      ),
    );

    const tryAppendToExistingRow = (rowIndex, componentId, componentSpan) => {
      if (rowIndex < 0 || rowIndex >= newRows.length) return false;

      const row = newRows[rowIndex];
      if (!Array.isArray(row)) return false;

      // Keep latent layout aligned with 3-items-per-row constraint.
      if (row.length >= 3) return false;

      const currentSpan = rowSpanTotals[rowIndex] || 0;
      if (currentSpan + componentSpan > 6) return false;

      row.push(componentId);
      rowSpanTotals[rowIndex] = currentSpan + componentSpan;
      return true;
    };

    // Re-insert hidden components using deterministic placement:
    // old row -> next row (if space) -> solo row above next row.
    hiddenComponentIds.forEach((id) => {
      const componentSpan = this.getEffectiveSpan(id);
      const originalRowIdx = baseRowIndexMap.has(id)
        ? baseRowIndexMap.get(id)
        : -1;

      // Fallback for unexpected IDs without an original row mapping.
      if (originalRowIdx < 0) {
        const lastRowIdx = newRows.length - 1;
        if (!tryAppendToExistingRow(lastRowIdx, id, componentSpan)) {
          newRows.push([id]);
          rowSpanTotals.push(componentSpan);
        }
        return;
      }

      if (tryAppendToExistingRow(originalRowIdx, id, componentSpan)) {
        return;
      }

      const nextRowIdx = originalRowIdx + 1;

      // No next row exists: spawn a solo row at the end.
      if (nextRowIdx >= newRows.length) {
        newRows.push([id]);
        rowSpanTotals.push(componentSpan);
        return;
      }

      // Next row exists: use it when there's room.
      if (tryAppendToExistingRow(nextRowIdx, id, componentSpan)) {
        return;
      }

      // Next row is full (3 items or span-locked): insert solo row above it.
      newRows.splice(nextRowIdx, 0, [id]);
      rowSpanTotals.splice(nextRowIdx, 0, componentSpan);
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

    if (this.isQuranFocusModeContextActive()) {
      if (sourceEvent) {
        sourceEvent.preventDefault();
        sourceEvent.stopPropagation();
      }
      return true;
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

    if (this.isQuranFocusModeContextActive()) {
      e.preventDefault();
      e.stopPropagation();
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

    this.queueManualResizeWindowSync();
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

    this.emitLayoutLiveResize({
      reason: "middle-layout-resize-end",
      finalWidth,
    });

    this.queueManualResizeWindowSync();

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
      const shouldSkipThreeItemHardCap = this.isFocusModePocketQuranElement(el);

      if (
        this.isThreeItemComponentId(componentId) &&
        !shouldSkipThreeItemHardCap
      ) {
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
});

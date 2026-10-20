/**
 * GridLayoutManager, part 2 of 4.
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

    const slotEl = el.closest(".sidebar-slot");
    const elementRect = el.getBoundingClientRect();
    const zoneRect = zoneEl.getBoundingClientRect();
    const boundaryRect = slotEl ? slotEl.getBoundingClientRect() : zoneRect;
    const tolerance = Math.max(2, Number(tolerancePx) || 0);

    if (elementRect.width > boundaryRect.width + tolerance) {
      return true;
    }

    if (
      elementRect.left < boundaryRect.left - tolerance ||
      elementRect.right > boundaryRect.right + tolerance
    ) {
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
    const tolerance = Math.max(2, Number(tolerancePx) || 0);

    for (const zoneEl of zones) {
      // Ignore tiny deltas caused by fractional layout/border rounding.
      if (zoneEl.scrollWidth > zoneEl.clientWidth + tolerance + 12) {
        return true;
      }

      const items = Array.from(
        zoneEl.querySelectorAll(":scope > .sidebar-slot > .grid-draggable"),
      );

      for (const el of items) {
        if (this.isSidebarElementHorizontallyClipped(el, zoneEl, tolerance)) {
          return true;
        }
      }
    }

    return false;
  }

  collapseSidebarModeDueToClipping() {
    if (!this.isSidebarModeEnabled) return false;
    if (this.hasSidebarDropViewportSpace()) return false;
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

      return true;
    } finally {
      this.sidebarClippingCollapseInProgress = false;
    }
  }

  maybeSnapSidebarItemsBackToMiddleLayout() {
    if (!this.isSidebarModeEnabled) return false;
    if (this.hasSidebarDropViewportSpace()) return false;
    if (!this.hasSidebarHorizontalClipping()) return false;

    return this.collapseSidebarModeDueToClipping();
  }

  emitLayoutLiveResize(detail = {}) {
    try {
      document.dispatchEvent(
        new CustomEvent("md:layout-live-resize", {
          detail: {
            source: "gridlayout",
            ...(detail || {}),
          },
        }),
      );
    } catch (e) {}

    try {
      const weather = window.dashboard?.weather;
      if (
        weather &&
        typeof weather.handleExternalLayoutLiveResize === "function"
      ) {
        weather.handleExternalLayoutLiveResize(detail || {});
      }
    } catch (e) {}
  }

  queueManualResizeWindowSync() {
    if (this.manualResizeWindowSyncRaf) {
      return;
    }

    this.manualResizeWindowSyncRaf = requestAnimationFrame(() => {
      this.manualResizeWindowSyncRaf = null;

      try {
        window.dispatchEvent(new Event("resize"));
      } catch (e) {}
    });
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

    this.emitLayoutLiveResize({
      reason: "middle-layout-width",
      width: clampedWidth,
    });

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
    // The app notifies this grid when it switches layouts; the module is the
    // second opinion, so neither side alone has to be trusted.
    return (
      this.isQuranFocusModeContext ||
      this.modes?.isActive?.("quranFocus") === true
    );
  }

  getEditModeStorageKey() {
    return this.isQuranFocusModeContextActive()
      ? this.getFocusEditModeStorageKey()
      : this.getMainEditModeStorageKey();
  }

  setQuranFocusModeActive(active) {
    this.isQuranFocusModeContext = active === true;

    // In focus mode, keep main-container resize state off so only
    // Pocket Quran width handles remain interactive.
    if (this.isQuranFocusModeContext) {
      this.endMiddleLayoutResize();
    }

    if (!this.isQuranFocusModeContext) {
      const pocketQuranCard = document.getElementById("pocketQuranCard");
      this.clearQuranFocusFloatingWidthStyles(pocketQuranCard);
    }

    // Focus mode and main layout keep separate edit-mode state.
    const settings = this.storage.getSettings();
    const editModeStorageKey = this.getEditModeStorageKey();
    if (this.isQuranFocusModeContext) {
      settings[editModeStorageKey] = false;
      this.storage.saveSettings(settings);
      this.modes.exit("edit");
    } else {
      this.modes.set("edit", settings[editModeStorageKey] === true);
    }

    const toggleBtn = document.getElementById("layoutEditBtn");
    this.updateEditModeUI(toggleBtn);
    this.clearSidebarDropTarget();
  }

  getSidebarDropAvailableViewportSpace() {
    const leftSidebar = document.getElementById("sidebarLeft");
    const rightSidebar = document.getElementById("sidebarRight");
    const leftWidth = Math.round(
      (leftSidebar && leftSidebar.getBoundingClientRect().width) || 0,
    );
    const rightWidth = Math.round(
      (rightSidebar && rightSidebar.getBoundingClientRect().width) || 0,
    );
    const measuredSidebarWidth = Math.max(0, leftWidth + rightWidth);

    const viewportWidth = this.getSidebarViewportWidthForMiddleLayout();
    if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return 0;

    const mainContainer = document.querySelector(
      "#sidebarMiddle > .main-container.container-wide, #sidebarMiddle > .main-container",
    );
    const middleEl = this.getSidebarMiddleElement();

    const middleWidth = Math.round(
      (mainContainer && mainContainer.getBoundingClientRect().width) ||
        (middleEl && middleEl.getBoundingClientRect().width) ||
        this.getCurrentSidebarMiddleLayoutWidth() ||
        this.sidebarMiddleLayoutDefaultWidth ||
        0,
    );

    if (!Number.isFinite(middleWidth) || middleWidth <= 0) return 0;
    const computedSidebarWidth = Math.max(
      0,
      Math.round(viewportWidth - middleWidth),
    );

    if (measuredSidebarWidth > 0) {
      return Math.max(measuredSidebarWidth, computedSidebarWidth);
    }

    return computedSidebarWidth;
  }

  getSidebarDropRequiredTotalWidth() {
    return Math.max(
      1,
      Math.round(
        Number(this.sidebarDropMinTotalWidth) ||
          Number(this.sidebarDropMinWidthPerSide) * 2 ||
          844,
      ),
    );
  }

  hasSidebarDropViewportSpace() {
    return (
      this.getSidebarDropAvailableViewportSpace() >=
      this.getSidebarDropRequiredTotalWidth()
    );
  }

  isSidebarDropAllowed() {
    if (!this.isSidebarModeEnabled || this.isQuranFocusModeContextActive()) {
      return false;
    }

    // Keep sidebar-origin drags returnable/reorderable even in tight viewports.
    if (this.sidebarDragOrigin) {
      return true;
    }

    return this.hasSidebarDropViewportSpace();
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

    this.emitLayoutLiveResize({
      reason: "sidebar-component-width",
      componentId: this.getSidebarComponentId(el),
      width: clampedWidth,
    });

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

    this.emitLayoutLiveResize({
      reason: "component-width",
      componentId: this.getSidebarComponentId(el),
      width: clampedWidth,
    });

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

  addSidebarDraggingClass() {
    const leftZone = this.getSidebarZone("left");
    const rightZone = this.getSidebarZone("right");
    if (leftZone) leftZone.classList.add("sidebar-is-dragging");
    if (rightZone) rightZone.classList.add("sidebar-is-dragging");
  }

  removeSidebarDraggingClass() {
    const leftZone = this.getSidebarZone("left");
    const rightZone = this.getSidebarZone("right");
    if (leftZone) leftZone.classList.remove("sidebar-is-dragging");
    if (rightZone) rightZone.classList.remove("sidebar-is-dragging");
  }

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

  removeSidebarPlaceholder() {
    if (this.sidebarPlaceholder) {
      try {
        this.sidebarPlaceholder.remove();
      } catch (e) {}
      this.sidebarPlaceholder = null;
    }
  }

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
});

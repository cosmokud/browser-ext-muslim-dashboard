/**
 * GridLayoutManager: sidebar mode restore, middle width and clipping.
 * Part of the class declared in js/gridlayout/index.js; load this after it.
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
});

/**
 * GridLayoutManager: public layout api, reset and teardown.
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

  getLayout() {
    return JSON.parse(JSON.stringify(this.rows));
  }

  setLayout(layout) {
    if (Array.isArray(layout) && layout.length > 0) {
      this.rows = layout;
      this.applyLayout(this.rows);
      this.saveLayout();
    }
  }

  enableEditMode() {
    if (this.isEditModeLocked) {
      return;
    }

    if (!this.isEditModeEnabled) {
      this.toggleEditMode();
    }
  }

  disableEditMode() {
    if (this.isEditModeEnabled) {
      this.toggleEditMode();
    }
  }

  setEditModeLocked(locked) {
    const next = locked === true;
    this.isEditModeLocked = next;
    const editModeStorageKey = this.getEditModeStorageKey();

    if (this.isEditModeLocked && this.isEditModeEnabled) {
      this.modes.exit("edit");

      const settings = this.storage.getSettings();
      settings[editModeStorageKey] = false;
      this.storage.saveSettings(settings);
    }

    const toggleBtn = document.getElementById("layoutEditBtn");
    this.updateEditModeUI(toggleBtn);
    this.syncSidebarModeForEditState();
  }

  get isEditModeEnabled() {
    return this.modes?.isActive?.("edit") === true;
  }

  isEditMode() {
    return this.isEditModeEnabled;
  }

  setComponentMinWidth(componentId, minWidth) {
    this.componentMinWidths[componentId] = minWidth;
    // Recalculate layout to apply new minimum
    this.calculateResponsiveLayout();
    this.recalculateLayout();
  }

  removeComponentMinWidth(componentId) {
    delete this.componentMinWidths[componentId];
    delete this.effectiveSpans[componentId];
    // Recalculate layout
    this.calculateResponsiveLayout();
    this.recalculateLayout();
  }

  getComponentMinWidths() {
    return { ...this.componentMinWidths };
  }

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
});

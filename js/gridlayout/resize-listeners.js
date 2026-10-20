/**
 * GridLayoutManager: middle and sidebar drag resize.
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

    this.queueManualResizeWindowSync();
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

    this.emitLayoutLiveResize({
      reason: "component-resize-end",
      componentId: this.getSidebarComponentId(el),
    });

    this.queueManualResizeWindowSync();

    return true;
  }
});

/**
 * GridLayoutManager: sidebar drop space checks.
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
});

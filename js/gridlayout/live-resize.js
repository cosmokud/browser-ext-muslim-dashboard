/**
 * GridLayoutManager: live resize ping after width changes.
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
});

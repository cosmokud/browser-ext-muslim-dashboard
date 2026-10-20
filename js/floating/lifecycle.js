/**
 * FloatingModeManager: init and flush.
 * Part of the class declared in js/floating/index.js; load this after it.
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
})(FloatingModeManager.prototype, class {

  init() {
    // Prepare runtime state for each target
    for (const key of Object.keys(this.targets)) {
      const { cardId, buttonId } = this.targets[key];
      const card = document.getElementById(cardId);
      const button = document.getElementById(buttonId);
      if (!card) continue;

      const placeholder = document.createElement("div");
      placeholder.setAttribute("data-floating-placeholder", key);
      placeholder.style.display = "none";

      this.runtime.set(key, {
        key,
        card,
        button,
        placeholder,
        originalParent: null,
        originalNextSibling: null,
        dragging: null,
        resizing: null,
        userResizing: false,
        userMovedSinceLastSave: false,
        autoPositionChangedSinceLastSave: false,
        spaceSuspended: false,
        collapseTimer: null,
        _collapseBtn: null,
        _resetSizeBtn: null,
        _collapseProxy: null,
        _collapseProxyRemoveTimer: null,
        persistenceSuppressed: 0,
        resizeObserver: null,
        mutationObserver: null,
        mutationDebounceTimer: null,
        saveTimer: null,
        minUpdateRaf: null,
        minUpdateTimer: null,
        dragPersistRaf: null,
        dragPersistLastAt: 0,
        _floatingHandle: null,
        _onPointerDown: null,
        _onCardPointerDownForResize: null,
        _onCardPointerMoveForResizeCursor: null,
        _onCardPointerLeaveForResizeCursor: null,
        _onAnyPointerUpClearResize: null,
        _onResizePointerMove: null,
        _onResizePointerUp: null,
        _resizeHandles: null,
        componentId: card.dataset?.gridId || card.id || null,
        layoutModeAtFloat: this._getComponentLayoutMode(
          card.dataset?.gridId || card.id || null,
        ),
        layoutSnapshotAtFloat: "",
        lastKnownRowIndex: -1,
        lastKnownIndexInRow: -1,
        lastKnownRowLength: 0,
      });

      if (button) {
        button.addEventListener("click", (e) => {
          // Prevent label-based toggling when the button is clicked (defensive: button may be inside a label).
          e.preventDefault();
          e.stopPropagation();
          this.toggle(key);
        });

        // Prevent propagation on pointer-down so accidental label toggles don't occur while pressing the button
        button.addEventListener("mousedown", (e) => {
          e.stopPropagation();
        });
      }
    }

    // Apply viewport constraints + initial state
    this.applyViewportConstraint();

    // Keep floating windows visible on viewport changes, but never persist
    // these automatic adjustments.
    window.addEventListener("resize", () => this.onWindowResize());

    document.addEventListener("md:performance-mode-change", (event) => {
      if (event?.detail?.enabled !== true) return;

      if (this._resizeRaf) {
        cancelAnimationFrame(this._resizeRaf);
        this._resizeRaf = null;
      }
      if (this._performanceResizeTimer) {
        clearTimeout(this._performanceResizeTimer);
        this._performanceResizeTimer = null;
      }

      for (const st of this.runtime.values()) {
        if (st.dragPersistRaf) {
          cancelAnimationFrame(st.dragPersistRaf);
          st.dragPersistRaf = null;
        }
        if (st.minUpdateRaf) {
          cancelAnimationFrame(st.minUpdateRaf);
          st.minUpdateRaf = null;
        }
        if (st.minUpdateTimer) {
          clearTimeout(st.minUpdateTimer);
          st.minUpdateTimer = null;
        }
        if (st.mutationDebounceTimer) {
          clearTimeout(st.mutationDebounceTimer);
          st.mutationDebounceTimer = null;
        }
      }
    });

    // Keep constraint in sync with viewport
    const onViewportChange = () => this.applyViewportConstraint();
    try {
      this.viewportDisableQuery.addEventListener("change", onViewportChange);
    } catch (e) {
      // Safari legacy
      this.viewportDisableQuery.addListener(onViewportChange);
    }

    // Ensure we persist the very latest geometry even if the page is closed quickly
    window.addEventListener("pagehide", () => {
      try {
        this.flushAll();
      } catch (e) {
        this.debugLog("pagehide flushAll failed", e);
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        try {
          this.flushAll();
        } catch (e) {
          this.debugLog("visibilitychange flushAll failed", e);
        }
      }
    });
  }

  notifyLayoutChanged() {
    const dashboard = window.dashboard;
    if (!dashboard) return;

    if (typeof dashboard.applyComponentVisibility === "function") {
      try {
        dashboard.applyComponentVisibility();
      } catch (e) {
        this.debugLog("applyComponentVisibility failed", e);
      }
    }

    if (
      dashboard.gridLayout &&
      typeof dashboard.gridLayout.recalculateLayout === "function"
    ) {
      try {
        dashboard.gridLayout.recalculateLayout();
      } catch (e) {
        this.debugLog("gridLayout.recalculateLayout failed", e);
      }
    }
  }

  flushAll() {
    for (const key of this.runtime.keys()) {
      const st = this.runtime.get(key);
      if (!st) continue;
      if (st.saveTimer) {
        try {
          clearTimeout(st.saveTimer);
        } catch (e) {
          this.debugLog(`clearTimeout failed for ${key}`, e);
        }
        st.saveTimer = null;
      }
      // If the user is/was dragging, ensure persistence isn't blocked by any
      // temporary suppression window.
      this.flushSave(key, {
        force: !!st.dragging || st.userMovedSinceLastSave === true,
      });
    }
  }
});

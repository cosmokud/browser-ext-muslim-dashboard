/**
 * FloatingModeManager: leaving floating mode from dashboard settings.
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

  _clearFloatingPresentation(card) {
    if (!card) return;

    card.classList.remove("floating-card");
    card.style.position = "";
    card.style.left = "";
    card.style.top = "";
    card.style.width = "";
    card.style.height = "";
    card.style.zIndex = "";
    card.style.resize = "";
    card.style.overflow = "";
    card.style.minWidth = "";
    card.style.minHeight = "";
    card.style.maxWidth = "";
    card.style.maxHeight = "";
    card.style.pointerEvents = "";
  }

  enforceNonFloatingFromDashboardSettings({
    applyFloatingEnabled = false,
  } = {}) {
    const settings = this.getSettings() || {};
    const floatingSettings = settings.floating || {};
    const sidebarModeEnabled = settings.sidebarModeEnabled === true;
    const runtimeModeDeferred = this.isRuntimeModeDeferred();
    const grid = window.dashboard?.gridLayout || null;
    const normalizeIdList = (ids) =>
      (Array.isArray(ids) ? ids : [])
        .map((id) => String(id || "").trim())
        .filter(Boolean);

    const sidebarState = {
      left: normalizeIdList(settings?.sidebarModeSidebars?.left),
      right: normalizeIdList(settings?.sidebarModeSidebars?.right),
    };

    const ensureSidebarStatePlacement = (componentId, side, index = null) => {
      const id = String(componentId || "").trim();
      const targetSide =
        side === "right" ? "right" : side === "left" ? "left" : null;
      if (!id || !targetSide) return false;

      const otherSide = targetSide === "left" ? "right" : "left";
      const nextTarget = sidebarState[targetSide].filter(
        (value) => value !== id,
      );
      const nextOther = sidebarState[otherSide].filter((value) => value !== id);

      const targetIndexRaw = Number(index);
      const targetIndex =
        Number.isFinite(targetIndexRaw) && targetIndexRaw >= 0
          ? Math.min(Math.round(targetIndexRaw), nextTarget.length)
          : nextTarget.length;
      nextTarget.splice(targetIndex, 0, id);

      const changedSide =
        nextTarget.length !== sidebarState[targetSide].length ||
        nextTarget.some(
          (value, idx) => value !== sidebarState[targetSide][idx],
        );
      const changedOther =
        nextOther.length !== sidebarState[otherSide].length ||
        nextOther.some((value, idx) => value !== sidebarState[otherSide][idx]);

      if (!changedSide && !changedOther) return false;

      sidebarState[targetSide] = nextTarget;
      sidebarState[otherSide] = nextOther;
      return true;
    };

    const rebuildFromStoredLayout = () => {
      if (!grid) return false;

      try {
        if (sidebarModeEnabled) {
          if (typeof grid.loadLayoutForMode === "function") {
            grid.loadLayoutForMode("sidebar");
          }
          if (typeof grid.applyLayout === "function") {
            grid.applyLayout();
          }
          if (typeof grid.applySidebarStateFromStorage === "function") {
            grid.applySidebarStateFromStorage();
          }
        } else {
          if (typeof grid.undockAllSidebarItemsToGrid === "function") {
            grid.undockAllSidebarItemsToGrid();
          }
          if (typeof grid.loadLayoutForMode === "function") {
            grid.loadLayoutForMode("normal");
          }
          if (typeof grid.applyLayout === "function") {
            grid.applyLayout();
          }
        }

        if (typeof grid.updateRowsFromDOM === "function") {
          grid.updateRowsFromDOM();
        }
        if (typeof grid.updateFlexBasisForCurrentDOM === "function") {
          grid.updateFlexBasisForCurrentDOM();
        }
        if (typeof grid.applySavedMiddleWidthsFromDOM === "function") {
          grid.applySavedMiddleWidthsFromDOM();
        }

        return true;
      } catch (e) {
        return false;
      }
    };

    let changed = false;
    let sidebarStateChanged = false;

    // Strict OFF-state cleanup from local settings.
    for (const [key, st] of this.runtime.entries()) {
      if (!st?.card) continue;

      const desiredFloating = floatingSettings?.[key]?.enabled === true;
      const card = st.card;

      if (desiredFloating !== true) {
        const persistedAnchor = this._getPersistedRestoreAnchor(key);
        const componentId =
          st.componentId ||
          card.dataset?.gridId ||
          this.targets?.[key]?.cardId ||
          card.id ||
          persistedAnchor?.componentId ||
          null;

        if (componentId && !st.componentId) {
          st.componentId = componentId;
        }

        let sidebarAnchor = null;
        if (componentId) {
          const leftIndex = sidebarState.left.indexOf(componentId);
          if (leftIndex >= 0) {
            sidebarAnchor = { side: "left", index: leftIndex };
          } else {
            const rightIndex = sidebarState.right.indexOf(componentId);
            if (rightIndex >= 0) {
              sidebarAnchor = { side: "right", index: rightIndex };
            }
          }
        }

        if (
          !sidebarAnchor &&
          persistedAnchor &&
          persistedAnchor.mode === "sidebar"
        ) {
          const side =
            persistedAnchor.side === "right"
              ? "right"
              : persistedAnchor.side === "left"
                ? "left"
                : null;
          if (side) {
            sidebarAnchor = {
              side,
              index: Number.isFinite(Number(persistedAnchor.index))
                ? Math.max(0, Math.round(Number(persistedAnchor.index)))
                : null,
            };
          }
        }

        if (
          componentId &&
          sidebarAnchor &&
          ensureSidebarStatePlacement(
            componentId,
            sidebarAnchor.side,
            sidebarAnchor.index,
          )
        ) {
          sidebarStateChanged = true;
        }

        if (st.collapseTimer) {
          try {
            clearTimeout(st.collapseTimer);
          } catch (e) {}
          st.collapseTimer = null;
        }

        this.removeCollapseProxy(key);
        this.removeCollapseButton(key);
        this.removeResizeHandles(key);

        if (card.classList.contains("floating-card")) {
          changed = true;
        }

        this._clearFloatingPresentation(card);

        if (card.classList.contains("sidebar-detached")) {
          card.classList.remove("sidebar-detached");
          changed = true;
        }

        if (st.placeholder && st.placeholder.parentNode) {
          try {
            st.placeholder.remove();
          } catch (e) {}
        }

        st.spaceSuspended = false;
      }

      this.updateButton(key);
    }

    if (sidebarStateChanged) {
      settings.sidebarModeSidebars = {
        left: [...sidebarState.left],
        right: [...sidebarState.right],
      };
      this.saveSettings(settings);
      changed = true;
    }

    // During focus mode we only enforce OFF immediately; runtime/layout apply is deferred.
    if (runtimeModeDeferred) {
      if (changed) this.notifyLayoutChanged();
      return;
    }

    const rebuilt = rebuildFromStoredLayout();
    changed = changed || rebuilt;

    // Apply ON-state floating from local settings only after layout restored.
    if (applyFloatingEnabled) {
      for (const key of this.runtime.keys()) {
        const desiredFloating = floatingSettings?.[key]?.enabled === true;
        if (!desiredFloating) continue;
        this.applyOne(key);
        changed = true;
      }
    }

    // Hard guarantee: OFF must never remain floating.
    let requiresFinalRepair = false;
    for (const [key, st] of this.runtime.entries()) {
      if (!st?.card) continue;
      const desiredFloating = floatingSettings?.[key]?.enabled === true;
      if (desiredFloating) continue;

      if (st.card.classList.contains("floating-card")) {
        this._clearFloatingPresentation(st.card);
        requiresFinalRepair = true;
      }
      st.spaceSuspended = false;
      this.updateButton(key);
    }

    if (requiresFinalRepair) {
      changed = rebuildFromStoredLayout() || changed;
    }

    if (changed) {
      this.notifyLayoutChanged();
    }
  }
});

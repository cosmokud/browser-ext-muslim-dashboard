/**
 * FloatingModeManager, part 2 of 3.
 * Moved out of js/floating.js at method boundaries, so no single file carries the
 * whole class. The class itself is declared in js/floating.js; load this after it.
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

  debugLog(scope, error, extra = null) {
    const message = error?.message || String(error);
    if (extra !== null && typeof extra !== "undefined") {
      console.debug(`[FloatingMode] ${scope}: ${message}`, extra);
      return;
    }
    console.debug(`[FloatingMode] ${scope}: ${message}`);
  }

  _isGridLayoutActive() {
    try {
      return !!document.querySelector(".content-grid .grid-flex-row");
    } catch (e) {
      return false;
    }
  }

  _getGridLayoutRowsSnapshot() {
    try {
      const rows = window.dashboard?.gridLayout?.rows;
      if (Array.isArray(rows)) return rows;
    } catch (e) {}

    try {
      const settings = this.getSettings();
      if (Array.isArray(settings?.gridLayout)) return settings.gridLayout;
    } catch (e) {}

    return null;
  }

  _getGridLayoutManager() {
    try {
      return window.dashboard?.gridLayout || null;
    } catch (e) {
      return null;
    }
  }

  _getComponentSpanMeta(componentId) {
    const grid = this._getGridLayoutManager();
    const dynamicMeta = grid?.componentSpans?.[componentId];
    if (dynamicMeta && typeof dynamicMeta === "object") {
      const span = Number(dynamicMeta.span);
      const minSpan = Number(dynamicMeta.minSpan);
      return {
        span: Number.isFinite(span) ? span : 6,
        minSpan: Number.isFinite(minSpan)
          ? minSpan
          : Number.isFinite(span)
            ? span
            : 6,
      };
    }

    const fallbackMeta = {
      header: { span: 2, minSpan: 2 },
      pinnedAppsSection: { span: 2, minSpan: 2 },
      searchBarSection: { span: 2, minSpan: 2 },
      quoteSection: { span: 2, minSpan: 2 },
      weatherCard: { span: 6, minSpan: 6 },
      hadithCard: { span: 2, minSpan: 2 },
      notesCard: { span: 2, minSpan: 2 },
      pocketQuranCard: { span: 2, minSpan: 2 },
      prayerTimesCard: { span: 2, minSpan: 2 },
      calendarCard: { span: 2, minSpan: 2 },
      qiblaCard: { span: 2, minSpan: 2 },
      lunarPhaseCard: { span: 2, minSpan: 2 },
      fastingCard: { span: 2, minSpan: 2 },
      flashcardCard: { span: 2, minSpan: 2 },
      adhkarCard: { span: 2, minSpan: 2 },
      todoCard: { span: 2, minSpan: 2 },
    };

    return fallbackMeta[componentId] || { span: 6, minSpan: 6 };
  }

  _isFullWidthGridComponent(componentId) {
    const meta = this._getComponentSpanMeta(componentId);
    return meta.span >= 6 || meta.minSpan >= 6;
  }

  _getComponentLayoutMode(componentId) {
    if (!componentId) return "full-width";
    return this._isFullWidthGridComponent(componentId)
      ? "full-width"
      : "three-item";
  }

  _canFitIntoThreeItemRow(row, componentId) {
    if (!Array.isArray(row) || !componentId) return false;
    if (this._isFullWidthGridComponent(componentId)) return false;
    if (row.length >= 3) return false;
    if (row.some((id) => this._isFullWidthGridComponent(id))) return false;

    const nextSpan = this._getComponentSpanMeta(componentId).span;
    const currentSpan = row.reduce(
      (sum, id) => sum + this._getComponentSpanMeta(id).span,
      0,
    );

    return currentSpan + nextSpan <= 6;
  }

  _captureFloatingLayoutAnchor(key, card) {
    const st = this.runtime.get(key);
    if (!st) return;

    const rows = this._getGridLayoutRowsSnapshot();
    const componentId =
      card?.dataset?.gridId || this.targets?.[key]?.cardId || card?.id || null;

    st.componentId = componentId;
    st.layoutModeAtFloat = this._getComponentLayoutMode(componentId);
    st.layoutSnapshotAtFloat = Array.isArray(rows) ? JSON.stringify(rows) : "";
    st.lastKnownRowIndex = -1;
    st.lastKnownIndexInRow = -1;
    st.lastKnownRowLength = 0;

    if (!Array.isArray(rows) || !componentId) return;

    const rowIndex = rows.findIndex(
      (row) => Array.isArray(row) && row.includes(componentId),
    );

    st.lastKnownRowIndex = rowIndex;

    if (rowIndex >= 0) {
      const row = rows[rowIndex];
      st.lastKnownIndexInRow = row.indexOf(componentId);
      st.lastKnownRowLength = row.length;
    }
  }

  _restoreCardWithLayoutRules(key, card, st) {
    const grid = this._getGridLayoutManager();
    if (!grid || !Array.isArray(grid.rows)) return false;
    if (typeof grid.applyLayout !== "function") return false;

    const componentId =
      st?.componentId ||
      card?.dataset?.gridId ||
      this.targets?.[key]?.cardId ||
      card?.id;
    if (!componentId) return false;

    const currentRows = JSON.parse(JSON.stringify(grid.rows));
    const currentHash = JSON.stringify(currentRows);
    const layoutChanged =
      typeof st?.layoutSnapshotAtFloat === "string" &&
      st.layoutSnapshotAtFloat.length > 0 &&
      st.layoutSnapshotAtFloat !== currentHash;

    let anchorRowIndex = currentRows.findIndex(
      (row) => Array.isArray(row) && row.includes(componentId),
    );
    if (anchorRowIndex < 0 && Number.isInteger(st?.lastKnownRowIndex)) {
      anchorRowIndex = st.lastKnownRowIndex;
    }
    if (anchorRowIndex < 0) {
      anchorRowIndex = currentRows.length > 0 ? currentRows.length - 1 : 0;
    }

    let preferredIndexInRow = -1;
    if (anchorRowIndex >= 0 && Array.isArray(currentRows[anchorRowIndex])) {
      preferredIndexInRow = currentRows[anchorRowIndex].indexOf(componentId);
    }
    if (preferredIndexInRow < 0 && Number.isInteger(st?.lastKnownIndexInRow)) {
      preferredIndexInRow = st.lastKnownIndexInRow;
    }

    const rows = currentRows.map((row) =>
      Array.isArray(row) ? row.filter((id) => id !== componentId) : [],
    );
    if (rows.length === 0) rows.push([]);

    const safeAnchorIndex = Math.max(
      0,
      Math.min(anchorRowIndex, rows.length - 1),
    );
    const anchorRow = rows[safeAnchorIndex] || [];

    const layoutMode =
      st?.layoutModeAtFloat || this._getComponentLayoutMode(componentId);

    if (layoutMode === "full-width") {
      const previousPlaceTaken = anchorRow.length > 0;

      if (previousPlaceTaken) {
        const insertIndex = Math.max(0, Math.min(safeAnchorIndex, rows.length));
        rows.splice(insertIndex, 0, [componentId]);
      } else {
        rows[safeAnchorIndex] = [componentId];
      }
    } else {
      const canUseAnchorRow = this._canFitIntoThreeItemRow(
        anchorRow,
        componentId,
      );

      if (layoutChanged && !canUseAnchorRow) {
        const insertIndex = Math.max(
          0,
          Math.min(safeAnchorIndex + 1, rows.length),
        );
        rows.splice(insertIndex, 0, [componentId]);
      } else if (canUseAnchorRow) {
        const insertIndex =
          Number.isInteger(preferredIndexInRow) && preferredIndexInRow >= 0
            ? Math.min(preferredIndexInRow, anchorRow.length)
            : anchorRow.length;
        anchorRow.splice(insertIndex, 0, componentId);
      } else {
        const insertIndex = Math.max(
          0,
          Math.min(safeAnchorIndex + 1, rows.length),
        );
        rows.splice(insertIndex, 0, [componentId]);
      }
    }

    const dedupedRows = [];
    const seen = new Set();
    for (const row of rows) {
      if (!Array.isArray(row)) continue;

      const nextRow = [];
      for (const id of row) {
        if (!id || seen.has(id)) continue;
        nextRow.push(id);
        seen.add(id);
      }

      if (nextRow.length > 0) {
        dedupedRows.push(nextRow);
      }
    }

    if (!seen.has(componentId)) {
      const fallbackIndex = Math.max(
        0,
        Math.min(
          Number.isInteger(st?.lastKnownRowIndex)
            ? st.lastKnownRowIndex
            : dedupedRows.length,
          dedupedRows.length,
        ),
      );
      dedupedRows.splice(fallbackIndex, 0, [componentId]);
    }

    card.classList.remove("floating-card");

    grid.rows = dedupedRows;
    grid.activeRows = JSON.parse(JSON.stringify(dedupedRows));
    grid.applyLayout(dedupedRows);

    if (typeof grid.updateFlexBasisForCurrentDOM === "function") {
      grid.updateFlexBasisForCurrentDOM();
    }

    if (typeof grid.saveLayout === "function") {
      grid.saveLayout();
    }

    return true;
  }

  _resolveGridLayoutInsertionPoint(key, card) {
    const contentGrid = document.querySelector(".content-grid");
    if (!contentGrid) return null;

    const rows = this._getGridLayoutRowsSnapshot();
    if (!rows || !Array.isArray(rows)) return null;

    const componentId =
      card?.dataset?.gridId || this.targets?.[key]?.cardId || card?.id;
    if (!componentId) return null;

    const rowIndex = rows.findIndex(
      (row) => Array.isArray(row) && row.includes(componentId),
    );
    if (rowIndex < 0) return null;

    const rowWrapper = contentGrid.querySelector(
      `.grid-flex-row[data-row-index="${rowIndex}"]`,
    );
    if (!rowWrapper) return null;

    const row = rows[rowIndex];
    const idx = row.indexOf(componentId);
    if (idx < 0) return { parent: rowWrapper, before: null };

    // Build a map of componentId -> DOM element for children currently in this row
    const childMap = new Map();
    const children = Array.from(rowWrapper.children || []);
    for (const child of children) {
      if (!child) continue;
      // Skip placeholders (they have data-floating-placeholder but no gridId)
      if (child.hasAttribute && child.hasAttribute("data-floating-placeholder"))
        continue;
      // Skip floating cards (shouldn't be in row, but defensive)
      if (child.classList && child.classList.contains("floating-card"))
        continue;

      const childId = child.classList?.contains("header")
        ? "header"
        : child.dataset?.gridId || child.id;
      if (childId) {
        childMap.set(childId, child);
      }
    }

    // Iterate through the row config starting from idx+1 to find the first
    // sibling that exists in DOM - that's where we insert before.
    for (let i = idx + 1; i < row.length; i++) {
      const siblingId = row[i];
      const siblingEl = childMap.get(siblingId);
      if (siblingEl && siblingEl.isConnected) {
        return { parent: rowWrapper, before: siblingEl };
      }
    }

    // No later sibling found in DOM - we need to insert at the correct position.
    // Check if there's an earlier sibling we should insert after.
    // Find the last earlier sibling that exists in DOM, and insert after it.
    for (let i = idx - 1; i >= 0; i--) {
      const siblingId = row[i];
      const siblingEl = childMap.get(siblingId);
      if (siblingEl && siblingEl.isConnected) {
        // Insert after this sibling (before its nextSibling)
        return { parent: rowWrapper, before: siblingEl.nextSibling };
      }
    }

    // No siblings found at all - either the row is empty or only has placeholders.
    // Insert at the beginning of the row (before first child, if any).
    const firstRealChild = children.find((child) => {
      if (!child) return false;
      if (child.hasAttribute && child.hasAttribute("data-floating-placeholder"))
        return false;
      if (child.classList && child.classList.contains("floating-card"))
        return false;
      return true;
    });

    return { parent: rowWrapper, before: firstRealChild || null };
  }

  _resolveComponentIdFromRestoreNode(node) {
    if (!node) return null;

    if (node.classList?.contains("header")) return "header";

    const gridId = node.dataset?.gridId;
    if (gridId) return gridId;

    if (node.id) return node.id;

    const floatingKey = node.getAttribute?.("data-floating-placeholder");
    if (floatingKey && this.targets?.[floatingKey]?.cardId) {
      return this.targets[floatingKey].cardId;
    }

    return null;
  }

  _getSavedSidebarAnchorForComponent(componentId) {
    const id = String(componentId || "").trim();
    if (!id) return null;

    try {
      const settings = this.getSettings();
      const raw = settings?.sidebarModeSidebars;
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return null;
      }

      const normalizeIds = (ids) =>
        (Array.isArray(ids) ? ids : [])
          .map((value) => String(value || "").trim())
          .filter(Boolean);

      const left = normalizeIds(raw.left);
      const leftIndex = left.indexOf(id);
      if (leftIndex >= 0) {
        return { side: "left", index: leftIndex };
      }

      const right = normalizeIds(raw.right);
      const rightIndex = right.indexOf(id);
      if (rightIndex >= 0) {
        return { side: "right", index: rightIndex };
      }
    } catch (e) {}

    return null;
  }

  _buildRestoreAnchorFromCurrentDOM(key, card, st) {
    const placeholder = st?.placeholder || null;
    const placeholderParent = placeholder?.parentNode || null;
    if (!placeholder || !placeholderParent) return null;

    const componentId =
      st?.componentId ||
      card?.dataset?.gridId ||
      this.targets?.[key]?.cardId ||
      card?.id ||
      null;

    const quranFocusModeActive = this.isQuranFocusModeActive();

    // In Quran Focus mode, preserve sidebar origin from persisted sidebar state
    // instead of replacing it with a temporary middle-grid anchor.
    if (quranFocusModeActive) {
      const savedSidebarAnchor =
        this._getSavedSidebarAnchorForComponent(componentId);
      if (savedSidebarAnchor) {
        return {
          mode: "sidebar",
          side: savedSidebarAnchor.side,
          index: savedSidebarAnchor.index,
          componentId,
        };
      }
    }

    const sidebarSlot = placeholderParent.classList?.contains("sidebar-slot")
      ? placeholderParent
      : placeholderParent.closest?.(".sidebar-slot");

    if (sidebarSlot) {
      const sidebarZone = sidebarSlot.closest?.(".sidebar-zone");
      const side =
        sidebarZone?.id === "sidebarRightZone"
          ? "right"
          : sidebarZone?.id === "sidebarLeftZone"
            ? "left"
            : null;

      if (side) {
        const slots = Array.from(
          sidebarZone.querySelectorAll(":scope > .sidebar-slot"),
        );
        const index = slots.indexOf(sidebarSlot);

        return {
          mode: "sidebar",
          side,
          index: index >= 0 ? index : 0,
          componentId,
        };
      }
    }

    const rowEl = placeholderParent.classList?.contains("grid-flex-row")
      ? placeholderParent
      : placeholderParent.closest?.(".grid-flex-row");

    if (!rowEl) return null;

    let rowIndex = Number.parseInt(rowEl.dataset?.rowIndex ?? "", 10);
    if (!Number.isFinite(rowIndex) || rowIndex < 0) {
      const rowEls = Array.from(
        document.querySelectorAll(".content-grid .grid-flex-row"),
      );
      const foundIndex = rowEls.indexOf(rowEl);
      rowIndex = foundIndex >= 0 ? foundIndex : 0;
    }

    let indexInRow = 0;
    let beforeComponentId = null;
    let seenPlaceholder = false;
    const children = Array.from(rowEl.children || []);

    for (const child of children) {
      if (child === placeholder) {
        seenPlaceholder = true;
        continue;
      }

      const childId = this._resolveComponentIdFromRestoreNode(child);
      if (!childId) continue;

      if (!seenPlaceholder) {
        indexInRow += 1;
      } else if (!beforeComponentId) {
        beforeComponentId = childId;
      }
    }

    return {
      mode: "grid",
      rowIndex: Math.max(0, rowIndex),
      indexInRow: Math.max(0, indexInRow),
      beforeComponentId: beforeComponentId || null,
      componentId,
    };
  }

  _persistRestoreAnchor(key, card, st) {
    const restoreAnchor = this._buildRestoreAnchorFromCurrentDOM(key, card, st);
    if (!restoreAnchor) return;

    try {
      const settings = this.getSettings();
      settings.floating = settings.floating || {};
      settings.floating[key] = {
        ...(settings.floating[key] || {}),
        restoreAnchor,
      };
      this.saveSettings(settings);
    } catch (e) {}

    try {
      const storedBox = this.getStoredBox(key);
      const nextStoredBox =
        storedBox && typeof storedBox === "object"
          ? { ...storedBox, restoreAnchor }
          : { restoreAnchor };
      this.storage.set(this.getBoxStorageKey(key), nextStoredBox);
    } catch (e) {}
  }

  _getPersistedRestoreAnchor(key) {
    let anchor = null;

    try {
      const storedBox = this.getStoredBox(key);
      if (
        storedBox &&
        typeof storedBox === "object" &&
        storedBox.restoreAnchor &&
        typeof storedBox.restoreAnchor === "object"
      ) {
        anchor = storedBox.restoreAnchor;
      }
    } catch (e) {}

    if (!anchor) {
      try {
        anchor = this.getSettings()?.floating?.[key]?.restoreAnchor || null;
      } catch (e) {
        anchor = null;
      }
    }

    if (!anchor || typeof anchor !== "object") return null;
    if (anchor.mode !== "sidebar" && anchor.mode !== "grid") return null;

    return anchor;
  }

  _restoreCardWithPersistedAnchor(key, card, st) {
    const anchor = this._getPersistedRestoreAnchor(key);
    if (!anchor) return false;

    const componentId =
      anchor.componentId ||
      st?.componentId ||
      card?.dataset?.gridId ||
      this.targets?.[key]?.cardId ||
      card?.id ||
      null;

    if (anchor.mode === "sidebar") {
      const side =
        anchor.side === "right"
          ? "right"
          : anchor.side === "left"
            ? "left"
            : null;
      if (!side) return false;

      const grid = window.dashboard?.gridLayout;
      const sidebarModeActive =
        !!document.body?.classList?.contains("sidebar-mode") ||
        grid?.isSidebarModeEnabled === true;

      if (
        !sidebarModeActive ||
        !grid ||
        typeof grid.dockElementToSidebar !== "function"
      ) {
        return false;
      }

      const rawIndex = Number(anchor.index);
      const insertIndex =
        Number.isFinite(rawIndex) && rawIndex >= 0
          ? Math.round(rawIndex)
          : null;

      try {
        grid.dockElementToSidebar(card, side, insertIndex);
        return true;
      } catch (e) {
        return false;
      }
    }

    if (anchor.mode === "grid") {
      const grid = window.dashboard?.gridLayout;

      if (
        grid &&
        Array.isArray(grid.rows) &&
        typeof grid.applyLayout === "function" &&
        componentId
      ) {
        try {
          const currentRows = JSON.parse(JSON.stringify(grid.rows));
          const rows = [];

          for (const row of currentRows) {
            if (!Array.isArray(row)) continue;
            const nextRow = row.filter((id) => id !== componentId);
            if (nextRow.length > 0) rows.push(nextRow);
          }

          let targetRowIndex = Number(anchor.rowIndex);
          if (!Number.isFinite(targetRowIndex) || targetRowIndex < 0) {
            targetRowIndex = rows.length;
          }
          targetRowIndex = Math.min(Math.round(targetRowIndex), rows.length);

          if (!rows[targetRowIndex]) {
            rows.splice(targetRowIndex, 0, []);
          }

          const targetRow = rows[targetRowIndex];
          let targetIndex = Number(anchor.indexInRow);
          if (!Number.isFinite(targetIndex) || targetIndex < 0) {
            targetIndex = targetRow.length;
          }
          targetIndex = Math.min(Math.round(targetIndex), targetRow.length);

          targetRow.splice(targetIndex, 0, componentId);

          grid.rows = rows;
          grid.activeRows = JSON.parse(JSON.stringify(rows));
          grid.applyLayout(rows);

          if (typeof grid.updateFlexBasisForCurrentDOM === "function") {
            grid.updateFlexBasisForCurrentDOM();
          }

          if (typeof grid.saveLayout === "function") {
            grid.saveLayout();
          }

          return true;
        } catch (e) {}
      }

      try {
        const rawRowIndex = Number(anchor.rowIndex);
        const rowSelector =
          Number.isFinite(rawRowIndex) && rawRowIndex >= 0
            ? `.content-grid .grid-flex-row[data-row-index="${Math.round(rawRowIndex)}"]`
            : ".content-grid .grid-flex-row:last-child";
        const rowEl = document.querySelector(rowSelector);
        if (!rowEl) return false;

        let beforeEl = null;
        const beforeComponentId = String(anchor.beforeComponentId || "").trim();
        if (beforeComponentId) {
          beforeEl =
            rowEl.querySelector(`[data-grid-id="${beforeComponentId}"]`) ||
            rowEl.querySelector(`#${beforeComponentId}`);
        }

        if (!beforeEl) {
          const rawIndex = Number(anchor.indexInRow);
          if (Number.isFinite(rawIndex) && rawIndex >= 0) {
            const rowChildren = Array.from(rowEl.children || []).filter(
              (child) => this._resolveComponentIdFromRestoreNode(child),
            );
            beforeEl = rowChildren[Math.round(rawIndex)] || null;
          }
        }

        rowEl.insertBefore(card, beforeEl);
        return true;
      } catch (e) {
        return false;
      }
    }

    return false;
  }

  removeCollapseProxy(key) {
    const st = this.runtime.get(key);
    if (!st) return;

    if (st._collapseProxyRemoveTimer) {
      try {
        window.clearTimeout(st._collapseProxyRemoveTimer);
      } catch (e) {}
      st._collapseProxyRemoveTimer = null;
    }

    if (st._collapseProxy) {
      try {
        st._collapseProxy.remove();
      } catch (e) {}
      st._collapseProxy = null;
    }
  }

  ensureCollapseButton(key) {
    const st = this.runtime.get(key);
    if (!st || !st.card) return;
    const card = st.card;
    if (!card.classList.contains("floating-card")) return;

    const hasCollapse = !!(st._collapseBtn && st._collapseBtn.isConnected);
    const hasReset = !!(st._resetSizeBtn && st._resetSizeBtn.isConnected);
    if (hasCollapse && hasReset) return;

    // Prevent drag initiation from control buttons.
    const stop = (e) => {
      try {
        e.stopPropagation();
      } catch (err) {}
    };

    if (!hasReset) {
      const resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.className = "floating-reset-size-btn";
      resetBtn.setAttribute("title", "Reset size to default");
      resetBtn.setAttribute("aria-label", "Reset size to default");
      // Use a simple square glyph to indicate baseline/default size.
      resetBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><rect x="6" y="6" width="12" height="12" rx="1.5"></rect></svg>`;

      const onResetSize = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!card.classList.contains("floating-card")) return;

        const defaults = this.getDefaultFloatingBox(key);
        const maxFloatingWidth = Math.max(
          280,
          Math.floor(window.innerWidth - this.viewportPadding * 2),
        );
        const maxFloatingHeight = Math.max(
          200,
          Math.floor(window.innerHeight - this.viewportPadding * 2),
        );

        const nextWidth = this.clamp(
          this.safeNumber(defaults.width, 420),
          280,
          maxFloatingWidth,
        );
        const nextHeight = this.clamp(
          this.safeNumber(defaults.height, 520),
          200,
          maxFloatingHeight,
        );

        card.style.width = `${Math.round(nextWidth)}px`;
        card.style.height = `${Math.round(nextHeight)}px`;

        // Keep the reset geometry fully visible and persist immediately.
        this.clampCardToViewport(key, { persist: true });
        this.scheduleMinUpdate(key);
        this.flushSave(key, { force: true });
      };

      resetBtn.addEventListener("click", onResetSize);
      resetBtn.addEventListener("pointerdown", stop);
      resetBtn.addEventListener("mousedown", stop);

      st._resetSizeBtn = resetBtn;
      try {
        card.appendChild(resetBtn);
      } catch (e) {}
    }

    if (!hasCollapse) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "floating-collapse-btn";
      btn.setAttribute("title", "Return to layout");
      btn.setAttribute("aria-label", "Return to layout");
      // Use SVG minimize icon
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;

      const onClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Explicit user action: disable floating and persist that preference.
        try {
          st.spaceSuspended = false;
        } catch (err) {}
        this.setEnabledDesired(key, false);
        this.disableFloatingRuntime(key);
        this.updateButton(key);
        this.notifyLayoutChanged();
      };

      btn.addEventListener("click", onClick);
      btn.addEventListener("pointerdown", stop);
      btn.addEventListener("mousedown", stop);

      st._collapseBtn = btn;
      try {
        card.appendChild(btn);
      } catch (e) {}
    }
  }

  removeCollapseButton(key) {
    const st = this.runtime.get(key);
    if (!st) return;
    try {
      if (st._collapseBtn) st._collapseBtn.remove();
    } catch (e) {}
    st._collapseBtn = null;

    try {
      if (st._resetSizeBtn) st._resetSizeBtn.remove();
    } catch (e) {}
    st._resetSizeBtn = null;
  }

  getResizeDirectionForPointer(card, clientX, clientY) {
    if (!card) return null;
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;

    const rect = card.getBoundingClientRect();
    const edge = 12;

    const nearLeft = clientX - rect.left <= edge;
    const nearRight = rect.right - clientX <= edge;
    const nearBottom = rect.bottom - clientY <= edge;

    if (nearBottom && nearLeft) return "sw";
    if (nearBottom && nearRight) return "se";
    if (nearBottom) return "s";
    if (nearLeft) return "w";
    if (nearRight) return "e";

    return null;
  }

  getResizeCursor(direction) {
    const cursorByDirection = {
      e: "e-resize",
      w: "w-resize",
      s: "s-resize",
      se: "se-resize",
      sw: "sw-resize",
    };
    return cursorByDirection[String(direction || "")] || "";
  }

  ensureResizeHandles(key) {
    const st = this.runtime.get(key);
    if (!st || !st.card) return;
    const card = st.card;
    if (!card.classList.contains("floating-card")) return;

    const existingHandles = Array.isArray(st._resizeHandles)
      ? st._resizeHandles.filter((handle) => handle?.isConnected)
      : [];
    if (existingHandles.length > 0) {
      st._resizeHandles = existingHandles;
      return;
    }

    const handleDefs = ["w", "e", "s", "sw", "se"];
    st._resizeHandles = handleDefs
      .map((direction) => {
        const handle = document.createElement("div");
        handle.className = `floating-resize-handle floating-resize-handle-${direction}`;
        handle.dataset.resizeDir = direction;
        handle.setAttribute("aria-hidden", "true");
        handle.tabIndex = -1;
        try {
          card.appendChild(handle);
          return handle;
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);
  }

  removeResizeHandles(key) {
    const st = this.runtime.get(key);
    if (!st) return;

    if (Array.isArray(st._resizeHandles)) {
      st._resizeHandles.forEach((handle) => {
        try {
          handle?.remove();
        } catch (e) {}
      });
    }

    st._resizeHandles = null;
  }

  createCollapseProxy(key, card) {
    if (!card) return null;

    // If a previous proxy is still fading, remove it to avoid overlap.
    if (key) this.removeCollapseProxy(key);

    try {
      const rect = card.getBoundingClientRect();
      const proxy = card.cloneNode(true);

      // Avoid duplicate IDs and interactive behavior.
      const stripIds = (node) => {
        if (!node || node.nodeType !== 1) return;
        try {
          node.removeAttribute("id");
        } catch (e) {}
        const children = node.children || [];
        for (const c of children) stripIds(c);
      };
      stripIds(proxy);

      try {
        proxy
          .querySelectorAll(
            ".floating-collapse-btn, button, a, input, textarea, select",
          )
          .forEach((el) => {
            try {
              el.setAttribute("tabindex", "-1");
              el.setAttribute("aria-hidden", "true");
            } catch (e) {}
          });
      } catch (e) {}

      proxy.classList.add("floating-collapse-out");
      proxy.style.position = "fixed";
      proxy.style.left = `${Math.round(rect.left)}px`;
      proxy.style.top = `${Math.round(rect.top)}px`;
      proxy.style.width = `${Math.round(rect.width)}px`;
      proxy.style.height = `${Math.round(rect.height)}px`;
      proxy.style.margin = "0";
      proxy.style.pointerEvents = "none";
      proxy.style.zIndex = String(
        Math.max(999, parseInt(card.style.zIndex || "50", 10) + 50),
      );

      document.body.appendChild(proxy);

      // Guarantee the proxy lands on exact opacity: 0 at the end.
      const onAnimEnd = () => {
        try {
          proxy.style.opacity = "0";
        } catch (e) {}
        try {
          proxy.removeEventListener("animationend", onAnimEnd);
        } catch (e) {}
      };
      try {
        proxy.addEventListener("animationend", onAnimEnd);
      } catch (e) {}

      const removeAfterMs = this.collapseOutMs + 80;
      if (key) {
        const st = this.runtime.get(key);
        if (st) {
          st._collapseProxy = proxy;
          st._collapseProxyRemoveTimer = window.setTimeout(() => {
            const st2 = this.runtime.get(key);
            if (st2) {
              st2._collapseProxy = null;
              st2._collapseProxyRemoveTimer = null;
            }
            try {
              proxy.style.opacity = "0";
            } catch (e) {}
            try {
              proxy.remove();
            } catch (e) {}
          }, removeAfterMs);
        } else {
          window.setTimeout(() => {
            try {
              proxy.style.opacity = "0";
            } catch (e) {}
            try {
              proxy.remove();
            } catch (e) {}
          }, removeAfterMs);
        }
      } else {
        window.setTimeout(() => {
          try {
            proxy.style.opacity = "0";
          } catch (e) {}
          try {
            proxy.remove();
          } catch (e) {}
        }, removeAfterMs);
      }

      return proxy;
    } catch (e) {
      return null;
    }
  }

  getBoxStorageKey(key) {
    return `floatingBox_${key}`;
  }

  getStoredBox(key) {
    try {
      return this.storage.get(this.getBoxStorageKey(key), null);
    } catch (e) {
      return null;
    }
  }

  getDefaultFloatingBox(key) {
    const baseFallback = {
      left: 40,
      top: 120,
      width: 420,
      height: 520,
      z: 10,
    };

    const perKeyFallback = {
      quotes: { width: 640, height: 300 },
      lunarPhase: { width: 420, height: 300 },
      fasting: { width: 420, height: 300 },
      flashcards: { width: 560, height: 360 },
      adhkar: { width: 560, height: 420 },
      hadith: { width: 720, height: 480 },
      todoList: { width: 560, height: 360 },
    };

    let defaultsFromStorage = null;
    try {
      if (typeof this.storage?.getDefaultSettings === "function") {
        defaultsFromStorage =
          this.storage.getDefaultSettings()?.floating?.[key];
      }
    } catch (e) {
      defaultsFromStorage = null;
    }

    return {
      ...baseFallback,
      ...(perKeyFallback[key] || {}),
      ...(defaultsFromStorage && typeof defaultsFromStorage === "object"
        ? defaultsFromStorage
        : {}),
    };
  }

  persistBox(key, box) {
    // Persist in two places:
    // 1) settings.floating (for export/import and centralized config)
    // 2) dedicated per-component key (more robust against accidental overwrites)
    try {
      const settings = this.getSettings();
      settings.floating = settings.floating || {};
      settings.floating[key] = {
        ...(settings.floating[key] || {}),
        ...(box || {}),
      };
      this.saveSettings(settings);
    } catch (e) {}

    try {
      this.storage.set(this.getBoxStorageKey(key), box);
    } catch (e) {}
  }

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

  getSettings() {
    return this.storage.getSettings();
  }

  saveSettings(settings) {
    this.storage.saveSettings(settings);
  }

  isEnabledDesired(key) {
    const settings = this.getSettings();
    return settings?.floating?.[key]?.enabled === true;
  }

  isQuranFocusModeActive() {
    return window.dashboard?.modes?.isActive?.("quranFocus") === true;
  }

  isMomentModeActive() {
    return window.dashboard?.modes?.isActive?.("moment") === true;
  }

  isRuntimeModeDeferred() {
    return this.isQuranFocusModeActive() || this.isMomentModeActive();
  }

  applyDeferredFromSettings() {
    if (this.isRuntimeModeDeferred()) {
      this.updateAllButtons();
      return;
    }

    this.enforceNonFloatingFromDashboardSettings({
      applyFloatingEnabled: true,
    });
  }

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

  setEnabledDesired(key, enabled) {
    const settings = this.getSettings();
    settings.floating = settings.floating || {};
    settings.floating[key] = { ...(settings.floating[key] || {}), enabled };
    this.saveSettings(settings);
  }

  resetToDefault() {
    let defaults = {};
    try {
      defaults =
        typeof this.storage?.getDefaultSettings === "function"
          ? this.storage.getDefaultSettings()
          : {};
    } catch (e) {
      this.debugLog("getDefaultSettings failed during reset", e);
      defaults = {};
    }

    const defaultFloating =
      defaults && typeof defaults.floating === "object" && defaults.floating
        ? defaults.floating
        : {};

    const settings = this.getSettings();
    settings.floating = settings.floating || {};

    for (const key of Object.keys(this.targets)) {
      const defaultBoxForKey =
        defaultFloating && typeof defaultFloating[key] === "object"
          ? defaultFloating[key]
          : this.getDefaultFloatingBox(key);

      settings.floating[key] = {
        ...(defaultBoxForKey || {}),
        enabled: false,
      };

      try {
        this.storage.remove(this.getBoxStorageKey(key));
      } catch (e) {
        this.debugLog(`storage.remove failed for ${key}`, e);
      }

      const st = this.runtime.get(key);
      if (st) {
        st.spaceSuspended = false;
        st.userMovedSinceLastSave = false;
        st.autoPositionChangedSinceLastSave = false;
      }
    }

    this.saveSettings(settings);

    for (const key of this.runtime.keys()) {
      this.applyOne(key);
    }

    this.notifyLayoutChanged();
  }

  toggle(key) {
    const desired = this.isEnabledDesired(key);
    this.setEnabledDesired(key, !desired);

    // While mode-managed layouts are active, toggles only update preference
    // state; runtime changes apply after mode exits.
    if (this.isRuntimeModeDeferred()) {
      this.updateButton(key);
      return;
    }

    this.applyOne(key);
    this.notifyLayoutChanged();
  }

  applyViewportConstraint() {
    const shouldSuspend = this.viewportDisableQuery.matches;

    const changed = shouldSuspend !== this.isViewportSuspended;
    this.isViewportSuspended = shouldSuspend;

    // In mode-managed layouts, keep settings toggleable but defer runtime
    // changes.
    if (this.isRuntimeModeDeferred()) {
      this.hasAppliedOnce = true;
      this.updateAllButtons();
      return;
    }

    // Always apply at least once so persisted states restore on reload
    if (this.isViewportSuspended) {
      for (const key of this.runtime.keys()) this.disableFloatingRuntime(key);
    } else {
      for (const key of this.runtime.keys()) this.applyOne(key);
    }

    this.hasAppliedOnce = true;
    this.updateAllButtons();
    this.notifyLayoutChanged();
  }

  updateAllButtons() {
    for (const key of this.runtime.keys()) this.updateButton(key);
  }
});

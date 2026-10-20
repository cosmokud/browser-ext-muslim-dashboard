/**
 * FloatingModeManager: restoring a card to its anchor.
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
});

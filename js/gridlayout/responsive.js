/**
 * GridLayoutManager: responsive layout calculation.
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

  syncMainContainerLayoutModeIfNeeded() {
    if (this.isSidebarModeEnabled || !this.grid) {
      return false;
    }

    const targetMode = this.getMainContainerLayoutMode();
    const previousMode = this.currentMainContainerLayoutMode;

    if (!previousMode) {
      this.currentMainContainerLayoutMode = targetMode;
      return false;
    }

    if (previousMode === targetMode) {
      return false;
    }

    const settings = this.storage.getSettings();

    // Save the currently active normal-mode layout before switching buckets.
    this.saveNormalLayoutRowsForMode(previousMode, this.rows, settings);

    const nextSavedLayout = this.getSavedNormalLayoutForMode(
      settings,
      targetMode,
    );
    const normalized = this.normalizeLayout(nextSavedLayout);

    this.rows = normalized;
    this.activeRows = JSON.parse(JSON.stringify(normalized));
    this.currentMainContainerLayoutMode = targetMode;

    this.storage.saveSettings(settings);
    this.applyLayout(this.rows);

    return true;
  }

  shouldForceSingleRowLayoutForThreeItemComponents() {
    const threshold = Math.max(
      1,
      Math.round(this.threeItemSingleRowCollapseThresholdWidth || 1200),
    );
    const containerWidth = this.getMainContainerResponsiveWidth();

    return (
      Number.isFinite(containerWidth) &&
      containerWidth > 0 &&
      containerWidth < threshold
    );
  }

  getThreeItemComponentIds() {
    return Object.keys(this.componentSpans).filter((componentId) => {
      const config = this.componentSpans[componentId];
      return (
        config && Number(config.span) === 2 && Number(config.minSpan) === 2
      );
    });
  }

  isThreeItemComponentId(componentId) {
    const id = String(componentId || "").trim();
    if (!id) return false;

    const config = this.componentSpans[id];
    return (
      !!config && Number(config.span) === 2 && Number(config.minSpan) === 2
    );
  }

  getGridFlexRowGapPx(rowEl) {
    if (!rowEl || typeof window === "undefined" || !window.getComputedStyle) {
      return 0;
    }

    const computed = window.getComputedStyle(rowEl);
    const gapRaw = computed.columnGap || computed.gap || "0";
    const gap = Number.parseFloat(gapRaw);
    return Number.isFinite(gap) && gap > 0 ? gap : 0;
  }

  getThreeItemRowResizeBudgetCap(el, absoluteCap) {
    const fallbackCap = Math.max(1, Math.round(Number(absoluteCap) || 0));
    if (!el) return fallbackCap;

    const targetId = this.getSidebarComponentId(el);
    if (!this.isThreeItemComponentId(targetId)) {
      return fallbackCap;
    }

    // Two modes only:
    // 1) Normal layout -> each item hard-limited to its default width for the
    //    current row density (1, 2, or 3 visible items).
    // 2) Compressed single-item row -> full container width allowed.
    if (this.shouldForceSingleRowLayoutForThreeItemComponents()) {
      return fallbackCap;
    }

    const row = el.closest(".grid-flex-row");
    if (!row) {
      return Math.max(1, Math.round(fallbackCap / 3));
    }

    const visibleChildren = Array.from(row.children).filter(
      (child) => !this.isComponentHidden(child),
    );
    const visibleCount = Math.max(1, visibleChildren.length);

    const rowWidth = Math.round(
      row.getBoundingClientRect().width || row.clientWidth || 0,
    );
    const rowGap = this.getGridFlexRowGapPx(row);

    const totalGapWidth = Math.max(0, visibleCount - 1) * rowGap;

    // Use the default width for the current row composition:
    // 1 item: full row, 2 items: half row (minus 1 gap), 3 items: third row (minus 2 gaps).
    const defaultRowWidth = Math.max(
      1,
      Math.round(Math.max(0, rowWidth - totalGapWidth) / visibleCount),
    );

    return Math.max(1, Math.min(fallbackCap, defaultRowWidth));
  }

  runViewportResizeLayoutSync({ force = false } = {}) {
    if (this.isMiddleLayoutResizing || this.isSidebarResizing) {
      return {
        applied: false,
        zoomed: false,
        widthChanged: false,
        zoomChanged: false,
        mainContainerWidthChanged: false,
        layoutModeChanged: false,
      };
    }

    const newWidth = this.getSidebarViewportWidthForMiddleLayout();
    if (newWidth <= 0) {
      return { applied: false, zoomed: false, widthChanged: false };
    }

    const mainContainerWidth = this.getMainContainerResponsiveWidth();
    const mainContainerWidthChanged =
      Math.abs(mainContainerWidth - this.lastMainContainerResponsiveWidth) > 2;
    this.lastMainContainerResponsiveWidth = mainContainerWidth;

    const layoutModeChanged = this.syncMainContainerLayoutModeIfNeeded();

    const previousZoomActive = this.viewportAutoZoomActive === true;
    const previousZoomScale = Number(this.viewportAutoZoomScale) || 1;
    const isViewportZoomedOut = this.applyViewportAutoZoomIfNeeded(newWidth);
    const zoomChanged =
      previousZoomActive !== this.viewportAutoZoomActive ||
      Math.abs(previousZoomScale - (Number(this.viewportAutoZoomScale) || 1)) >
        0.0005;

    const widthChanged = Math.abs(newWidth - this.lastViewportWidth) > 2;
    this.lastViewportWidth = newWidth;

    if (isViewportZoomedOut) {
      if (
        this.shouldForceSingleRowLayoutForThreeItemComponents() ||
        layoutModeChanged ||
        mainContainerWidthChanged
      ) {
        this.recalculateLayout();
      }
      return {
        applied: true,
        zoomed: true,
        widthChanged,
        zoomChanged,
        mainContainerWidthChanged,
        layoutModeChanged,
      };
    }

    if (
      !force &&
      !widthChanged &&
      !zoomChanged &&
      !mainContainerWidthChanged &&
      !layoutModeChanged
    ) {
      return {
        applied: false,
        zoomed: false,
        widthChanged,
        zoomChanged,
        mainContainerWidthChanged,
        layoutModeChanged,
      };
    }

    this.syncSidebarMiddleLayoutWidthToViewport({
      persist: true,
      triggerSnapCheck: true,
    });
    this.calculateResponsiveLayout();
    this.recalculateLayout();

    if (this.isSidebarModeEnabled) {
      this.maybeSnapSidebarItemsBackToMiddleLayout();
    } else {
      this.maybeAutoRestoreSidebarMode();
    }

    return {
      applied: true,
      zoomed: false,
      widthChanged,
      zoomChanged,
      mainContainerWidthChanged,
      layoutModeChanged,
    };
  }

  cancelViewportStabilizePass() {
    if (this.viewportStabilizeRaf) {
      cancelAnimationFrame(this.viewportStabilizeRaf);
      this.viewportStabilizeRaf = null;
    }
    if (this.viewportStabilizeRaf2) {
      cancelAnimationFrame(this.viewportStabilizeRaf2);
      this.viewportStabilizeRaf2 = null;
    }
  }

  scheduleViewportStabilizePass() {
    this.cancelViewportStabilizePass();

    this.viewportStabilizeRaf = requestAnimationFrame(() => {
      this.viewportStabilizeRaf = null;
      this.viewportStabilizeRaf2 = requestAnimationFrame(() => {
        this.viewportStabilizeRaf2 = null;
        this.runViewportResizeLayoutSync({ force: true });
      });
    });
  }

  handleViewportResize(sourceOrEvent = "window") {
    const source = typeof sourceOrEvent === "string" ? sourceOrEvent : "window";
    const forceSync = source !== "observer";

    const immediateWidth = this.getSidebarViewportWidthForMiddleLayout();
    if (immediateWidth > 0) {
      this.applyViewportAutoZoomIfNeeded(immediateWidth);
    }

    // Debounce resize handling
    if (this.viewportResizeTimer) {
      clearTimeout(this.viewportResizeTimer);
    }
    this.cancelViewportStabilizePass();

    this.viewportResizeTimer = setTimeout(() => {
      const syncResult = this.runViewportResizeLayoutSync({ force: forceSync });

      if (
        syncResult.applied ||
        syncResult.widthChanged ||
        syncResult.mainContainerWidthChanged ||
        syncResult.layoutModeChanged
      ) {
        this.emitLayoutLiveResize({
          reason: "viewport-resize-sync",
          triggerSource: source,
          zoomed: syncResult.zoomed === true,
          layoutMode: this.getMainContainerLayoutMode(),
          mainContainerWidth: this.getMainContainerResponsiveWidth(),
        });
      }

      // Fast maximize/restore can report transient dimensions; run a second
      // stabilized pass after reflow to avoid ending in a stale/broken layout.
      if (
        !syncResult.zoomed &&
        (forceSync ||
          syncResult.widthChanged ||
          syncResult.mainContainerWidthChanged ||
          syncResult.layoutModeChanged)
      ) {
        this.scheduleViewportStabilizePass();
      }
    }, 150);
  }

  calculateResponsiveLayout() {
    if (!this.grid) return;

    // Get container width (accounts for padding, max-width constraints)
    const containerWidth = this.getLayoutWidth();
    const gap = 32; // var(--spacing-xl) in pixels, approximate

    // Calculate width per span unit (6 spans = container width minus gaps)
    // For n items in a row with 6 total spans, we have (n-1) gaps
    // Simplified: assume 2-3 items average, so roughly 2 gaps
    const avgGaps = 2;
    const availableWidth = containerWidth - gap * avgGaps;
    const widthPerSpan = availableWidth / 6;

    // Reset effective spans to defaults
    this.effectiveSpans = {};

    // Global narrow-container rule: below the threshold, force every
    // 2-span component to occupy its own full row.
    if (this.shouldForceSingleRowLayoutForThreeItemComponents()) {
      this.getThreeItemComponentIds().forEach((componentId) => {
        this.effectiveSpans[componentId] = 6;
      });
      return;
    }

    // Calculate effective span for each component with min width requirements
    Object.keys(this.componentMinWidths).forEach((componentId) => {
      const minWidth = this.componentMinWidths[componentId];
      const baseConfig = this.componentSpans[componentId];

      if (!baseConfig) return;

      // Calculate how many spans needed to meet minimum width
      const spansNeeded = Math.ceil(minWidth / widthPerSpan);

      // Clamp between base span and 6 (full width)
      const effectiveSpan = Math.max(baseConfig.span, Math.min(6, spansNeeded));

      // Only store if different from default
      if (effectiveSpan !== baseConfig.span) {
        this.effectiveSpans[componentId] = effectiveSpan;
      }
    });
  }

  getEffectiveSpan(componentId) {
    // First check if we have a calculated effective span
    if (this.effectiveSpans[componentId]) {
      return this.effectiveSpans[componentId];
    }

    // Fall back to base configuration
    const baseConfig = this.componentSpans[componentId];
    return baseConfig ? baseConfig.span : 2;
  }

  getElementByComponentId(componentId) {
    if (componentId === "header") {
      return this.grid?.querySelector(".header");
    }
    return document.getElementById(componentId);
  }

  loadLayout() {
    this.loadLayoutForMode("normal");
  }

  saveLayout() {
    const settings = this.storage.getSettings();

    if (this.isSidebarModeEnabled) {
      settings[this.getSidebarLayoutStorageKey()] = JSON.parse(
        JSON.stringify(this.rows),
      );
    } else {
      const layoutMode = this.getMainContainerLayoutMode();
      this.saveNormalLayoutRowsForMode(layoutMode, this.rows, settings);
      this.currentMainContainerLayoutMode = layoutMode;
    }

    // Sidebar mode also persists which components are docked
    if (this.isSidebarModeEnabled) {
      settings[this.getSidebarStateStorageKey()] =
        this.getSidebarStateFromDOM();
    }
    this.storage.saveSettings(settings);
  }

  applyLayout(rowsOverride = null) {
    if (!this.grid) return;

    const layoutRows = Array.isArray(rowsOverride) ? rowsOverride : this.rows;
    this.activeRows = JSON.parse(JSON.stringify(layoutRows));

    // Store all grid items
    const items = {};
    Object.keys(this.componentSpans).forEach((id) => {
      const el =
        id === "header"
          ? this.grid.querySelector(".header")
          : document.getElementById(id);
      if (el) {
        items[id] = el;
      }
    });

    // Remove existing flex rows (but keep items)
    const existingRows = this.grid.querySelectorAll(".grid-flex-row");
    existingRows.forEach((row) => {
      // Move children back to grid before removing row
      while (row.firstChild) {
        this.grid.appendChild(row.firstChild);
      }
      row.remove();
    });

    // Clear the grid's explicit children order
    const fragment = document.createDocumentFragment();

    // Create flex rows for each row in layout
    layoutRows.forEach((rowItems, rowIndex) => {
      const rowWrapper = document.createElement("div");
      rowWrapper.className = "grid-flex-row";
      rowWrapper.dataset.rowIndex = rowIndex;

      // Count visible items in this row
      const visibleItems = rowItems.filter((id) => {
        const el = items[id];
        return el && !this.isComponentHidden(el);
      });

      // Add items to the row
      rowItems.forEach((id) => {
        const el = items[id];
        if (el) {
          // Skip floating cards - they are managed by FloatingModeManager
          // and should not be moved back into the grid layout
          if (el.classList.contains("floating-card")) {
            return;
          }

          // Skip sidebar-detached components while sidebar mode is active
          if (el.classList.contains("sidebar-detached")) {
            return;
          }

          // Set flex basis based on visible items count
          this.setItemFlexBasis(el, id, visibleItems.length);

          // Make item draggable
          el.classList.add("grid-draggable");
          el.setAttribute("draggable", "false"); // We use custom drag
          el.dataset.gridId = id;
          this.ensureSidebarResizeHandles(el);

          rowWrapper.appendChild(el);
        }
      });

      // Keep empty rows from reserving vertical gap when all row items are hidden.
      if (visibleItems.length === 0) {
        rowWrapper.style.display = "none";
      } else {
        rowWrapper.style.display = "";
      }

      fragment.appendChild(rowWrapper);
    });

    this.grid.appendChild(fragment);

    // Add class for CSS fallback (browsers that don't support :has())
    this.grid.classList.add("grid-layout-active");

    this.updateGridItems();
    this.applySavedMiddleWidthsFromDOM();
  }

  setItemFlexBasis(el, id, visibleCount) {
    const config = this.componentSpans[id];
    if (!config) return;

    // If item is hidden, don't set flex
    if (this.isComponentHidden(el)) {
      el.style.flex = "";
      return;
    }

    // Get effective span (considering breakpoint state)
    const effectiveSpan = this.getEffectiveSpan(id);

    // Calculate flex basis percentage
    let flexPercent;
    if (visibleCount === 0 || visibleCount === 1) {
      flexPercent = 100;
    } else if (visibleCount === 2) {
      flexPercent = 50;
    } else if (visibleCount === 3) {
      flexPercent = 33.333;
    } else {
      // More than 3 items, use effective span ratio
      flexPercent = (effectiveSpan / 6) * 100;
    }

    // For full-width components, always use 100%
    if (config.span === 6 && config.minSpan === 6) {
      flexPercent = 100;
    }

    el.style.flex = `1 1 calc(${flexPercent}% - var(--spacing-xl))`;
    el.style.maxWidth = `${flexPercent}%`;
    el.style.minWidth = `${Math.max(200, (config.minSpan / 6) * 100)}px`;

    // Add data attribute for debugging/CSS targeting
    el.dataset.effectiveSpan = effectiveSpan;
  }

  isComponentHidden(el) {
    return (
      el.style.display === "none" ||
      el.getAttribute("aria-hidden") === "true" ||
      el.classList.contains("floating-card") ||
      el.classList.contains("sidebar-detached")
    );
  }

  updateGridItems() {
    this.gridItems = Array.from(
      this.grid.querySelectorAll(".grid-draggable"),
    ).filter(
      (el) =>
        !this.isComponentHidden(el) && !el.classList.contains("floating-card"),
    );
  }

  areRowsEqual(leftRows, rightRows) {
    if (!Array.isArray(leftRows) || !Array.isArray(rightRows)) return false;
    if (leftRows.length !== rightRows.length) return false;

    for (let rowIndex = 0; rowIndex < leftRows.length; rowIndex += 1) {
      const leftRow = leftRows[rowIndex];
      const rightRow = rightRows[rowIndex];

      if (!Array.isArray(leftRow) || !Array.isArray(rightRow)) return false;
      if (leftRow.length !== rightRow.length) return false;

      for (let itemIndex = 0; itemIndex < leftRow.length; itemIndex += 1) {
        if (leftRow[itemIndex] !== rightRow[itemIndex]) return false;
      }
    }

    return true;
  }

  recalculateLayout() {
    if (!this.grid || this.isDragging) return;

    // First, recalculate effective spans based on current viewport
    this.calculateResponsiveLayout();

    const baseRows = Array.isArray(this.rows) ? this.rows : [];
    const baseOrder = baseRows.flat();
    const hasResponsiveOverrides = Object.keys(this.effectiveSpans).length > 0;

    // Hidden components can be temporarily replaced by other cards via drag/drop.
    // When those hidden cards are toggled visible again, proactively repack if
    // any row would exceed the 6-span budget (or 3 visible cards for span-2 cards).
    const hasVisibleOverflow = baseRows.some((row) => {
      if (!Array.isArray(row) || row.length === 0) return false;

      let visibleCount = 0;
      let visibleSpan = 0;

      for (const id of row) {
        const el = this.getElementByComponentId(id);
        if (!el || this.isComponentHidden(el)) continue;

        visibleCount += 1;
        visibleSpan += this.getEffectiveSpan(id);

        if (visibleCount > 3 || visibleSpan > 6) {
          return true;
        }
      }

      return false;
    });

    // When responsive overrides are inactive, preserve user-defined row boundaries.
    // If overflow exists after visibility changes, repair only overflowing rows.
    if (!hasResponsiveOverrides) {
      const updateFlexBasisForCurrentRows = () => {
        const rowWrappers = this.grid.querySelectorAll(".grid-flex-row");
        rowWrappers.forEach((rowWrapper) => {
          const rowItems = Array.from(rowWrapper.children);
          const visibleItems = rowItems.filter(
            (el) => !this.isComponentHidden(el),
          );

          rowItems.forEach((el) => {
            const id = el.dataset.gridId;
            if (id) {
              this.setItemFlexBasis(el, id, visibleItems.length);
            }
          });

          // Hide row if all items are hidden
          if (visibleItems.length === 0) {
            rowWrapper.style.display = "none";
          } else {
            rowWrapper.style.display = "";
          }
        });
      };

      if (!hasVisibleOverflow) {
        const layoutChanged = !this.areRowsEqual(
          baseRows,
          this.activeRows || [],
        );

        if (layoutChanged) {
          this.applyLayout(baseRows);
        } else {
          // Just update flex basis for existing layout
          updateFlexBasisForCurrentRows();
        }

        this.updateGridItems();
        this.applySavedMiddleWidthsFromDOM();
        return;
      }

      const repairedRows = JSON.parse(JSON.stringify(baseRows));

      const isVisibleComponentId = (componentId) => {
        const el = this.getElementByComponentId(componentId);
        return !!el && !this.isComponentHidden(el);
      };

      const getVisibleRowUsage = (row) => {
        let visibleCount = 0;
        let visibleSpan = 0;

        row.forEach((componentId) => {
          if (!isVisibleComponentId(componentId)) return;
          visibleCount += 1;
          visibleSpan += this.getEffectiveSpan(componentId);
        });

        return { visibleCount, visibleSpan };
      };

      const findFirstOverflowComponentId = (row) => {
        let visibleCount = 0;
        let visibleSpan = 0;

        for (const componentId of row) {
          if (!isVisibleComponentId(componentId)) continue;

          const span = this.getEffectiveSpan(componentId);
          if (visibleCount + 1 > 3 || visibleSpan + span > 6) {
            return componentId;
          }

          visibleCount += 1;
          visibleSpan += span;
        }

        return null;
      };

      const canFitVisibleComponentInRow = (row, componentId) => {
        if (!isVisibleComponentId(componentId)) return true;

        const { visibleCount, visibleSpan } = getVisibleRowUsage(row);
        const nextSpan = this.getEffectiveSpan(componentId);
        return visibleCount + 1 <= 3 && visibleSpan + nextSpan <= 6;
      };

      for (let rowIndex = 0; rowIndex < repairedRows.length; rowIndex += 1) {
        const row = repairedRows[rowIndex];
        if (!Array.isArray(row) || row.length === 0) continue;

        while (true) {
          const overflowComponentId = findFirstOverflowComponentId(row);
          if (!overflowComponentId) break;

          const overflowIndex = row.indexOf(overflowComponentId);
          if (overflowIndex < 0) break;

          row.splice(overflowIndex, 1);

          const nextRowIndex = rowIndex + 1;
          if (nextRowIndex >= repairedRows.length) {
            repairedRows.push([overflowComponentId]);
            continue;
          }

          const nextRow = repairedRows[nextRowIndex];
          if (
            Array.isArray(nextRow) &&
            canFitVisibleComponentInRow(nextRow, overflowComponentId)
          ) {
            nextRow.push(overflowComponentId);
          } else {
            // Keep next row intact and spawn a solo row above it when full.
            repairedRows.splice(nextRowIndex, 0, [overflowComponentId]);
          }
        }
      }

      const canonicalRowsChanged = !this.areRowsEqual(baseRows, repairedRows);
      const layoutChanged = !this.areRowsEqual(
        repairedRows,
        this.activeRows || [],
      );

      if (layoutChanged) {
        this.applyLayout(repairedRows);
      } else {
        updateFlexBasisForCurrentRows();
      }

      if (canonicalRowsChanged) {
        this.rows = JSON.parse(JSON.stringify(repairedRows));
        this.activeRows = JSON.parse(JSON.stringify(repairedRows));

        try {
          this.saveLayout();
        } catch (e) {
          // ignore storage save failures during automatic overflow repair
        }
      }

      this.updateGridItems();
      this.applySavedMiddleWidthsFromDOM();
      return;
    }

    // Get visible components in their current order
    const allComponentIds = baseOrder;
    const visibleComponentIds = allComponentIds.filter((id) => {
      const el = this.getElementByComponentId(id);
      return el && !this.isComponentHidden(el);
    });

    // Rebuild rows based on effective spans
    const newRows = [];
    let currentRow = [];
    let currentRowSpan = 0;

    visibleComponentIds.forEach((componentId) => {
      const effectiveSpan = this.getEffectiveSpan(componentId);
      const config = this.componentSpans[componentId];

      // Full-width components always get their own row
      if (config && config.span === 6 && config.minSpan === 6) {
        if (currentRow.length > 0) {
          newRows.push(currentRow);
          currentRow = [];
          currentRowSpan = 0;
        }
        newRows.push([componentId]);
        return;
      }

      // Check if component fits in current row
      if (currentRowSpan + effectiveSpan <= 6) {
        currentRow.push(componentId);
        currentRowSpan += effectiveSpan;
      } else {
        // Start a new row
        if (currentRow.length > 0) {
          newRows.push(currentRow);
        }
        currentRow = [componentId];
        currentRowSpan = effectiveSpan;
      }
    });

    // Don't forget the last row
    if (currentRow.length > 0) {
      newRows.push(currentRow);
    }

    // Add back hidden components to maintain their positions
    const hiddenComponentIds = allComponentIds.filter((id) => {
      const el = this.getElementByComponentId(id);
      return !el || this.isComponentHidden(el);
    });

    const baseRowIndexMap = new Map();
    baseRows.forEach((row, rowIndex) => {
      row.forEach((id) => {
        if (!baseRowIndexMap.has(id)) {
          baseRowIndexMap.set(id, rowIndex);
        }
      });
    });

    const rowSpanTotals = newRows.map((row) =>
      row.reduce(
        (sum, componentId) => sum + this.getEffectiveSpan(componentId),
        0,
      ),
    );

    const tryAppendToExistingRow = (rowIndex, componentId, componentSpan) => {
      if (rowIndex < 0 || rowIndex >= newRows.length) return false;

      const row = newRows[rowIndex];
      if (!Array.isArray(row)) return false;

      // Keep latent layout aligned with 3-items-per-row constraint.
      if (row.length >= 3) return false;

      const currentSpan = rowSpanTotals[rowIndex] || 0;
      if (currentSpan + componentSpan > 6) return false;

      row.push(componentId);
      rowSpanTotals[rowIndex] = currentSpan + componentSpan;
      return true;
    };

    // Re-insert hidden components using deterministic placement:
    // old row -> next row (if space) -> solo row above next row.
    hiddenComponentIds.forEach((id) => {
      const componentSpan = this.getEffectiveSpan(id);
      const originalRowIdx = baseRowIndexMap.has(id)
        ? baseRowIndexMap.get(id)
        : -1;

      // Fallback for unexpected IDs without an original row mapping.
      if (originalRowIdx < 0) {
        const lastRowIdx = newRows.length - 1;
        if (!tryAppendToExistingRow(lastRowIdx, id, componentSpan)) {
          newRows.push([id]);
          rowSpanTotals.push(componentSpan);
        }
        return;
      }

      if (tryAppendToExistingRow(originalRowIdx, id, componentSpan)) {
        return;
      }

      const nextRowIdx = originalRowIdx + 1;

      // No next row exists: spawn a solo row at the end.
      if (nextRowIdx >= newRows.length) {
        newRows.push([id]);
        rowSpanTotals.push(componentSpan);
        return;
      }

      // Next row exists: use it when there's room.
      if (tryAppendToExistingRow(nextRowIdx, id, componentSpan)) {
        return;
      }

      // Next row is full (3 items or span-locked): insert solo row above it.
      newRows.splice(nextRowIdx, 0, [id]);
      rowSpanTotals.splice(nextRowIdx, 0, componentSpan);
    });

    // Only update DOM if layout actually changed
    const layoutChanged =
      JSON.stringify(newRows) !== JSON.stringify(this.activeRows || []);

    if (layoutChanged) {
      this.applyLayout(newRows);
      // Don't save layout on resize - only save on manual drag operations
    } else {
      // Just update flex basis for existing layout
      const rowWrappers = this.grid.querySelectorAll(".grid-flex-row");
      rowWrappers.forEach((rowWrapper) => {
        const rowItems = Array.from(rowWrapper.children);
        const visibleItems = rowItems.filter(
          (el) => !this.isComponentHidden(el),
        );

        rowItems.forEach((el) => {
          const id = el.dataset.gridId;
          if (id) {
            this.setItemFlexBasis(el, id, visibleItems.length);
          }
        });

        // Hide row if all items are hidden
        if (visibleItems.length === 0) {
          rowWrapper.style.display = "none";
        } else {
          rowWrapper.style.display = "";
        }
      });
    }

    this.updateGridItems();
    this.applySavedMiddleWidthsFromDOM();
  }
});

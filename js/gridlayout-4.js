/**
 * GridLayoutManager, part 4 of 4.
 * Moved out of js/gridlayout.js at method boundaries, so no single file carries the
 * whole class. The class itself is declared in js/gridlayout.js; load this after it.
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

  getDraggableFromTarget(target) {
    // Check if clicking on interactive elements - don't drag
    if (
      target.closest(
        'button, input, select, textarea, a, [contenteditable="true"], .todo-list, .notes-editor, .flashcard-flip-card, .pocket-quran-content, .calendar-days',
      )
    ) {
      return null;
    }

    // Find the draggable parent
    const draggable = target.closest(".grid-draggable");
    if (!draggable) {
      return null;
    }

    // In Quran Focus + Layout Editor, Pocket Quran can be resized only.
    if (
      this.isQuranFocusModeContextActive() &&
      this.getSidebarComponentId(draggable) === "pocketQuranCard"
    ) {
      return null;
    }

    // Allow dragging items currently docked in sidebars (edit mode only)
    const isSidebarItem = draggable.classList.contains("sidebar-detached");
    if (
      this.isComponentHidden(draggable) &&
      !(this.isEditModeEnabled && isSidebarItem)
    ) {
      return null;
    }

    // Don't drag items in floating mode
    if (draggable.classList.contains("floating-card")) {
      return null;
    }

    return draggable;
  }

  handleMouseDown(e) {
    // Only left mouse button
    if (e.button !== 0) return;

    // Only allow dragging when layout edit mode is enabled
    if (!this.isEditModeEnabled) return;

    if (this.tryStartSidebarResizeFromMouseEvent(e)) {
      return;
    }

    const draggable = this.getDraggableFromTarget(e.target);
    if (!draggable) return;

    this.startDrag(draggable, e.clientX, e.clientY);
    e.preventDefault();
  }

  handleTouchStart(e) {
    if (e.touches.length !== 1) return;

    // Only allow dragging when layout edit mode is enabled
    if (!this.isEditModeEnabled) return;

    if (e.target?.closest?.(".sidebar-resize-handle")) return;

    const touch = e.touches[0];
    const draggable = this.getDraggableFromTarget(touch.target);
    if (!draggable) return;

    // Add delay for touch to distinguish from scroll
    this.touchStartTimer = setTimeout(() => {
      this.startDrag(draggable, touch.clientX, touch.clientY);
    }, 200);

    this.touchStartPos = { x: touch.clientX, y: touch.clientY };
  }

  startDrag(element, clientX, clientY) {
    this.isDragging = true;
    this.draggedItem = element;

    // Capture the bounding rect BEFORE any DOM manipulation
    // This is critical for sidebar items to get correct dimensions
    const originalRect = element.getBoundingClientRect();

    // If dragging from a sidebar, undock it into the grid so placeholder logic works.
    this.sidebarDragOrigin = null;
    const sidebarSlot = element.closest?.(".sidebar-slot");
    if (sidebarSlot && this.grid) {
      const leftZone = document.getElementById("sidebarLeftZone");
      const rightZone = document.getElementById("sidebarRightZone");
      const zone = sidebarSlot.closest?.("#sidebarLeftZone, #sidebarRightZone");
      const side =
        zone === leftZone ? "left" : zone === rightZone ? "right" : null;
      if (side) {
        const index = Array.from(zone.children).indexOf(sidebarSlot);
        this.sidebarDragOrigin = { side, index };
      }

      // Remove from sidebar slot
      try {
        element.classList.remove("sidebar-detached");
      } catch (e) {}

      try {
        sidebarSlot.remove();
      } catch (e) {}

      this.updateSidebarZoneCounts();

      // Create a temporary row at the end so the element has a grid context
      const tempRow = document.createElement("div");
      tempRow.className = "grid-flex-row grid-flex-row-new";
      tempRow.dataset.rowIndex = String(
        this.grid.querySelectorAll(".grid-flex-row").length,
      );
      this.grid.appendChild(tempRow);
      tempRow.appendChild(element);
    }

    // Use the original rect captured before DOM manipulation
    this.draggedItemRect = originalRect;
    this.initialMouseX = clientX;
    this.initialMouseY = clientY;
    this.lastPointerX = clientX;
    this.lastPointerY = clientY;

    // Disable smooth scrolling for fast edge auto-scroll
    this.disableSmoothScrollDuringDrag();

    // Calculate offset from element top-left
    this.dragOffsetX = clientX - this.draggedItemRect.left;
    this.dragOffsetY = clientY - this.draggedItemRect.top;

    // Store original position info
    let row = element.closest(".grid-flex-row");
    if (!row && this.grid) {
      // Fallback: put the element in a new row if it's not currently in the grid.
      row = document.createElement("div");
      row.className = "grid-flex-row grid-flex-row-new";
      row.dataset.rowIndex = String(
        this.grid.querySelectorAll(".grid-flex-row").length,
      );
      this.grid.appendChild(row);
      row.appendChild(element);
    }
    this.originalRow = row;
    this.originalRowIndex = row ? parseInt(row.dataset.rowIndex) : 0;
    this.originalItemIndex = row
      ? Array.from(row.children).indexOf(element)
      : 0;

    // Create placeholder
    this.createPlaceholder();

    // Style dragged item
    element.classList.add("grid-dragging");
    element.style.position = "fixed";
    element.style.zIndex = "10000";
    element.style.width = `${this.draggedItemRect.width}px`;
    element.style.height = `${this.draggedItemRect.height}px`;
    element.style.left = `${this.draggedItemRect.left}px`;
    element.style.top = `${this.draggedItemRect.top}px`;
    element.style.pointerEvents = "none";
    element.style.transition = "none";

    // Add dragging class to grid
    this.grid.classList.add("grid-is-dragging");

    // Add dragging class to sidebar zones for visual feedback
    this.addSidebarDraggingClass();

    // Setup auto-scroll
    this.setupAutoScroll();

    // Cache row geometry for drag hit-testing; updated lazily when needed.
    this.rebuildDragRowRectsCache();
  }

  createPlaceholder() {
    this.placeholder = document.createElement("div");
    this.placeholder.className = "grid-placeholder";
    this.placeholder.style.width = `${this.draggedItemRect.width}px`;
    this.placeholder.style.height = `${this.draggedItemRect.height}px`;
    this.placeholder.style.flex = this.draggedItem.style.flex;
    this.placeholder.style.maxWidth = this.draggedItem.style.maxWidth;

    // Insert placeholder where dragged item was
    this.draggedItem.parentNode.insertBefore(
      this.placeholder,
      this.draggedItem,
    );
  }

  handleMouseMove(e) {
    if (this.isMiddleLayoutResizing) {
      this.updateMiddleLayoutResize(e.clientX);
      e.preventDefault();
      return;
    }

    if (this.isSidebarResizing) {
      this.updateSidebarResize(e.clientX);
      e.preventDefault();
      return;
    }

    if (!this.isDragging) return;
    this.updateDrag(e.clientX, e.clientY);
  }

  handleTouchMove(e) {
    if (this.isMiddleLayoutResizing) {
      const touch = e.touches && e.touches[0];
      if (!touch) return;
      this.updateMiddleLayoutResize(touch.clientX);
      e.preventDefault();
      return;
    }

    if (this.touchStartTimer) {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - this.touchStartPos.x);
      const dy = Math.abs(touch.clientY - this.touchStartPos.y);

      // Cancel drag start if moved too much (user is scrolling)
      if (dx > 10 || dy > 10) {
        clearTimeout(this.touchStartTimer);
        this.touchStartTimer = null;
      }
    }

    if (!this.isDragging) return;
    e.preventDefault();

    const touch = e.touches[0];
    this.updateDrag(touch.clientX, touch.clientY);
  }

  updateDrag(clientX, clientY) {
    if (!this.draggedItem) return;

    // Track last pointer position for auto-scroll calculations
    this.lastPointerX = clientX;
    this.lastPointerY = clientY;

    // Update dragged item position
    this.draggedItem.style.left = `${clientX - this.dragOffsetX}px`;
    this.draggedItem.style.top = `${clientY - this.dragOffsetY}px`;

    // Find drop target (throttled to animation frames)
    this.scheduleDropTargetUpdate(clientX, clientY);
  }

  scheduleDropTargetUpdate(clientX, clientY) {
    this.pendingDropTargetX = clientX;
    this.pendingDropTargetY = clientY;

    if (this.dropTargetRaf) return;

    this.dropTargetRaf = requestAnimationFrame(() => {
      this.dropTargetRaf = null;
      if (!this.isDragging || !this.draggedItem) return;
      this.updateDropTarget(this.pendingDropTargetX, this.pendingDropTargetY);
    });
  }

  cancelDropTargetUpdate() {
    if (!this.dropTargetRaf) return;
    cancelAnimationFrame(this.dropTargetRaf);
    this.dropTargetRaf = null;
  }

  getCurrentScrollY() {
    return (
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0
    );
  }

  rebuildDragRowRectsCache() {
    if (!this.grid) {
      this.dragRowRectsCache = [];
      this.dragRowRectsCacheScrollY = this.getCurrentScrollY();
      return;
    }

    const rows = Array.from(this.grid.querySelectorAll(".grid-flex-row"));
    this.dragRowRectsCacheScrollY = this.getCurrentScrollY();
    this.dragRowRectsCache = rows.map((row, index) => {
      const rect = row.getBoundingClientRect();
      return {
        row,
        index,
        top: rect.top,
        bottom: rect.bottom,
      };
    });
  }

  getDragRowRectEntries() {
    if (
      !Array.isArray(this.dragRowRectsCache) ||
      !this.dragRowRectsCache.length
    ) {
      this.rebuildDragRowRectsCache();
      return this.dragRowRectsCache || [];
    }

    const currentScrollY = this.getCurrentScrollY();
    const scrollDelta = currentScrollY - this.dragRowRectsCacheScrollY;
    if (scrollDelta !== 0) {
      this.dragRowRectsCache.forEach((entry) => {
        entry.top -= scrollDelta;
        entry.bottom -= scrollDelta;
      });
      this.dragRowRectsCacheScrollY = currentScrollY;
    }

    return this.dragRowRectsCache;
  }

  invalidateDragRowRectsCache() {
    this.dragRowRectsCache = null;
    this.dragRowRectsCacheScrollY = this.getCurrentScrollY();
  }

  updateDropTarget(clientX, clientY) {
    // Sidebar mode: treat sidebars as drop targets.
    if (this.isSidebarDropAllowed()) {
      this.updateSidebarDropTarget(clientX, clientY);

      // If we're not in edit mode, do NOT reposition placeholder within the grid.
      // Sidebar mode dragging is only for moving items into sidebars.
      if (!this.isEditModeEnabled) {
        this.grid
          .querySelectorAll(".grid-flex-row")
          .forEach((r) => r.classList.remove("grid-row-target"));
        return;
      }
    } else {
      this.clearSidebarDropTarget();
    }

    const draggedId = this.draggedItem.dataset.gridId;
    const draggedConfig = this.componentSpans[draggedId];

    // Find the row we're hovering over
    const rowEntries = this.getDragRowRectEntries();
    if (!rowEntries.length) return;

    let targetRow = null;
    let targetRowIndex = -1;
    let targetRowRect = null;

    rowEntries.forEach((entry) => {
      if (
        clientY >= entry.top - 20 &&
        clientY <= entry.bottom + 20 &&
        entry.row.style.display !== "none"
      ) {
        targetRow = entry.row;
        targetRowIndex = entry.index;
        targetRowRect = {
          top: entry.top,
          bottom: entry.bottom,
          height: entry.bottom - entry.top,
        };
      }
    });

    if (!targetRow) {
      // Check if we're above all rows or below
      const firstRow = rowEntries[0];
      const lastRow = rowEntries[rowEntries.length - 1];

      if (firstRow && clientY < firstRow.top) {
        targetRow = firstRow.row;
        targetRowIndex = 0;
        targetRowRect = {
          top: firstRow.top,
          bottom: firstRow.bottom,
          height: firstRow.bottom - firstRow.top,
        };
      } else if (lastRow && clientY > lastRow.bottom) {
        targetRow = lastRow.row;
        targetRowIndex = rowEntries.length - 1;
        targetRowRect = {
          top: lastRow.top,
          bottom: lastRow.bottom,
          height: lastRow.bottom - lastRow.top,
        };
      }
    }

    if (!targetRow || !targetRowRect) return;

    const targetLayoutRowIndex = Number.isFinite(
      parseInt(targetRow.dataset.rowIndex, 10),
    )
      ? parseInt(targetRow.dataset.rowIndex, 10)
      : targetRowIndex;

    // Check if we can drop in this row based on span constraints
    const rowItems = Array.from(targetRow.children).filter(
      (el) =>
        el !== this.placeholder &&
        el !== this.draggedItem &&
        !this.isComponentHidden(el),
    );

    // Calculate total span in target row
    let totalSpan = draggedConfig.span;
    rowItems.forEach((el) => {
      const itemId = el.dataset.gridId;
      const itemConfig = this.componentSpans[itemId];
      if (itemConfig) {
        totalSpan += itemConfig.span;
      }
    });

    // Determine if we need to create a new row
    const needsNewRow = totalSpan > 6 || draggedConfig.span === 6;

    // Allow any component to create a new row when hovering near the top/bottom edge of a row.
    // This enables intentionally placing a component on its own row even if it would fit.
    const NEW_ROW_EDGE_ZONE_PX = 28;
    const nearTopEdge = clientY < targetRowRect.top + NEW_ROW_EDGE_ZONE_PX;
    const nearBottomEdge =
      clientY > targetRowRect.bottom - NEW_ROW_EDGE_ZONE_PX;
    const wantsNewRow = rowItems.length > 0 && (nearTopEdge || nearBottomEdge);

    if ((needsNewRow || wantsNewRow) && rowItems.length > 0) {
      // Create insertion point for new row (above or below current row)
      if (wantsNewRow) {
        this.movePlaceholderToNewRow(
          targetLayoutRowIndex,
          nearTopEdge ? "before" : "after",
        );
      } else {
        const rowCenterY = targetRowRect.top + targetRowRect.height / 2;
        this.movePlaceholderToNewRow(
          targetLayoutRowIndex,
          clientY < rowCenterY ? "before" : "after",
        );
      }
    } else {
      // Can drop within this row - find position
      let insertPosition = rowItems.length;

      rowItems.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;

        if (clientX < centerX && insertPosition > index) {
          insertPosition = index;
        }
      });

      // Move placeholder to target position
      this.movePlaceholderToRow(targetRow, insertPosition);
    }
  }

  movePlaceholderToRow(row, position) {
    // Remove placeholder from current position
    if (this.placeholder.parentNode) {
      this.placeholder.parentNode.removeChild(this.placeholder);
    }

    const children = Array.from(row.children).filter(
      (el) => el !== this.draggedItem && !this.isComponentHidden(el),
    );

    if (position >= children.length) {
      row.appendChild(this.placeholder);
    } else {
      row.insertBefore(this.placeholder, children[position]);
    }

    // Update placeholder size based on new row context
    const visibleCount =
      children.filter((el) => el !== this.placeholder).length + 1;
    const draggedId = this.draggedItem.dataset.gridId;
    const config = this.componentSpans[draggedId];

    let flexPercent;
    if (visibleCount === 1) {
      flexPercent = 100;
    } else if (visibleCount === 2) {
      flexPercent = 50;
    } else if (visibleCount === 3) {
      flexPercent = 33.333;
    } else {
      flexPercent = (config.span / 6) * 100;
    }

    this.placeholder.style.flex = `1 1 calc(${flexPercent}% - var(--spacing-xl))`;
    this.placeholder.style.maxWidth = `${flexPercent}%`;

    // Mark current target row
    this.grid
      .querySelectorAll(".grid-flex-row")
      .forEach((r) => r.classList.remove("grid-row-target"));
    row.classList.add("grid-row-target");

    this.invalidateDragRowRectsCache();
  }

  movePlaceholderToNewRow(rowIndex, position) {
    // Remove placeholder from current position
    if (this.placeholder.parentNode) {
      this.placeholder.parentNode.removeChild(this.placeholder);
    }

    // Check if there's already an empty row we created
    let newRow = this.grid.querySelector(".grid-flex-row-new");
    if (!newRow) {
      newRow = document.createElement("div");
      newRow.className = "grid-flex-row grid-flex-row-new";
    }

    const rows = this.grid.querySelectorAll(
      ".grid-flex-row:not(.grid-flex-row-new)",
    );
    const targetRow = rows[rowIndex];

    if (position === "before") {
      targetRow.parentNode.insertBefore(newRow, targetRow);
    } else {
      targetRow.parentNode.insertBefore(newRow, targetRow.nextSibling);
    }

    // Placeholder takes full width in new row
    this.placeholder.style.flex = "1 1 100%";
    this.placeholder.style.maxWidth = "100%";
    newRow.appendChild(this.placeholder);

    // Mark new row as target
    this.grid
      .querySelectorAll(".grid-flex-row")
      .forEach((r) => r.classList.remove("grid-row-target"));
    newRow.classList.add("grid-row-target");

    this.invalidateDragRowRectsCache();
  }

  handleMouseUp(e) {
    if (this.isMiddleLayoutResizing) {
      this.endMiddleLayoutResize();
      return;
    }

    if (this.isSidebarResizing) {
      this.endSidebarResize();
      return;
    }

    if (!this.isDragging) return;

    // Ensure sidebar target is up-to-date at release time
    if (this.isSidebarDropAllowed()) {
      this.updateSidebarDropTarget(e.clientX, e.clientY);
    }

    this.endDrag();
  }

  handleTouchEnd(e) {
    if (this.isMiddleLayoutResizing) {
      this.endMiddleLayoutResize();
      return;
    }

    if (this.touchStartTimer) {
      clearTimeout(this.touchStartTimer);
      this.touchStartTimer = null;
    }

    if (!this.isDragging) return;

    // Ensure sidebar target is up-to-date at release time
    if (this.isSidebarDropAllowed()) {
      const touch = (e.changedTouches && e.changedTouches[0]) || null;
      if (touch) this.updateSidebarDropTarget(touch.clientX, touch.clientY);
    }

    this.endDrag();
  }

  endDrag() {
    if (!this.isDragging || !this.draggedItem) return;

    // Stop auto-scroll
    this.stopAutoScroll();
    this.cancelDropTargetUpdate();
    this.invalidateDragRowRectsCache();

    // Restore smooth scroll behavior
    this.restoreSmoothScrollAfterDrag();

    // Sidebar drop takes precedence (no grid animation)
    if (this.isSidebarDropAllowed() && this.sidebarDropTarget) {
      this.finalizeSidebarDrop(this.sidebarDropTarget);
      return;
    }

    // Get final position from placeholder
    const placeholderParent = this.placeholder?.parentElement;
    if (!placeholderParent) {
      this.cancelDrag();
      return;
    }
    const placeholderIndex = Array.from(placeholderParent.children).indexOf(
      this.placeholder,
    );

    // Animate dragged item to placeholder position
    const placeholderRect = this.placeholder.getBoundingClientRect();

    this.draggedItem.style.transition = "all 0.2s ease";
    this.draggedItem.style.left = `${placeholderRect.left}px`;
    this.draggedItem.style.top = `${placeholderRect.top}px`;
    this.draggedItem.style.width = `${placeholderRect.width}px`;

    // After animation, finalize position
    setTimeout(() => {
      this.finalizeDrop(placeholderParent, placeholderIndex);
    }, 200);
  }

  finalizeDrop(targetRow, insertIndex) {
    if (!this.draggedItem || !this.placeholder) return;

    const movedOutFromSidebar = !!this.sidebarDragOrigin;

    this.clearSidebarDropTarget();

    // Reset dragged item styles
    this.draggedItem.classList.remove("grid-dragging");
    this.draggedItem.style.position = "";
    this.draggedItem.style.zIndex = "";
    this.draggedItem.style.left = "";
    this.draggedItem.style.top = "";
    this.draggedItem.style.width = "";
    this.draggedItem.style.height = "";
    this.draggedItem.style.pointerEvents = "";
    this.draggedItem.style.transition = "";

    // Replace placeholder with dragged item.
    // During the drop animation delay, DOM updates can move/remove rows.
    const livePlaceholder = this.placeholder;
    const livePlaceholderParent = livePlaceholder.parentElement;
    let destinationRow =
      livePlaceholderParent && this.grid.contains(livePlaceholderParent)
        ? livePlaceholderParent
        : targetRow && this.grid.contains(targetRow)
          ? targetRow
          : this.originalRow && this.grid.contains(this.originalRow)
            ? this.originalRow
            : this.grid.querySelector(".grid-flex-row");

    if (!destinationRow) {
      destinationRow = document.createElement("div");
      destinationRow.className = "grid-flex-row";
      destinationRow.dataset.rowIndex = "0";
      this.grid.appendChild(destinationRow);
    }

    if (livePlaceholderParent === destinationRow) {
      destinationRow.insertBefore(this.draggedItem, livePlaceholder);
    } else {
      const safeInsertIndex =
        Number.isInteger(insertIndex) && insertIndex >= 0
          ? insertIndex
          : destinationRow.children.length;
      const referenceNode = destinationRow.children[safeInsertIndex] || null;
      destinationRow.insertBefore(this.draggedItem, referenceNode);
    }

    if (livePlaceholder.parentNode) {
      livePlaceholder.remove();
    }
    this.placeholder = null;

    if (movedOutFromSidebar) {
      this.resetSidebarWidthForElement(this.draggedItem, { keepSaved: true });
      this.ensureSidebarResizeHandles(this.draggedItem);
      this.applySavedMiddleWidthToElement(this.draggedItem);
    }

    // Clean up empty rows and temporary rows
    this.grid.querySelectorAll(".grid-flex-row").forEach((row) => {
      row.classList.remove("grid-flex-row-new", "grid-row-target");
      const visibleChildren = Array.from(row.children).filter(
        (el) => !this.isComponentHidden(el),
      );
      if (visibleChildren.length === 0) {
        // Move any hidden items to nearest row before removing
        const hiddenChildren = Array.from(row.children);
        if (hiddenChildren.length > 0) {
          const nextRow = row.nextElementSibling || row.previousElementSibling;
          if (nextRow && nextRow.classList.contains("grid-flex-row")) {
            hiddenChildren.forEach((child) => nextRow.appendChild(child));
          }
        }
        row.remove();
      }
    });

    // Update rows array from DOM
    this.updateRowsFromDOM();

    // Update flex basis for all items without repacking rows
    this.updateFlexBasisForCurrentDOM();

    // Remove dragging class from grid
    this.grid.classList.remove("grid-is-dragging");

    // Remove dragging class from sidebar zones
    this.removeSidebarDraggingClass();

    // Save layout
    this.saveLayout();

    // Restore smooth scroll behavior
    this.restoreSmoothScrollAfterDrag();

    // If we dragged out of a sidebar while in sidebar mode, persist sidebar contents.
    if (this.isSidebarModeEnabled) {
      try {
        this.saveSidebarStateFromDOM();
      } catch (e) {}
    }

    // Reset state
    this.isDragging = false;
    this.draggedItem = null;
    this.originalRow = null;
    this.sidebarDragOrigin = null;
    this.invalidateDragRowRectsCache();
  }

  finalizeSidebarDrop(side) {
    if (!this.draggedItem || !this.placeholder) return;

    const zone = this.getSidebarZone(side);
    if (!zone) {
      this.clearSidebarDropTarget();
      this.cancelDrag();
      return;
    }

    const insertIndex =
      typeof this.sidebarDropIndex === "number" ? this.sidebarDropIndex : null;

    // Remove placeholder (we don't keep hidden markers anymore)
    try {
      this.placeholder.remove();
    } catch (e) {}
    this.placeholder = null;

    // Reset dragged item styles (similar to finalizeDrop)
    this.draggedItem.classList.remove("grid-dragging");
    this.draggedItem.style.position = "";
    this.draggedItem.style.zIndex = "";
    this.draggedItem.style.left = "";
    this.draggedItem.style.top = "";
    this.draggedItem.style.width = "";
    this.draggedItem.style.height = "";
    this.draggedItem.style.pointerEvents = "";
    this.draggedItem.style.transition = "";

    // Clear grid sizing constraints so the component can fit the sidebar width.
    this.draggedItem.style.flex = "";
    this.draggedItem.style.maxWidth = "";
    this.draggedItem.style.minWidth = "";

    // Move into sidebar slot
    this.dockElementToSidebar(this.draggedItem, side, insertIndex);

    // Cleanup grid drag styling
    this.grid.classList.remove("grid-is-dragging");
    this.removeSidebarDraggingClass();
    this.grid
      .querySelectorAll(".grid-flex-row")
      .forEach((r) => r.classList.remove("grid-row-target"));

    this.clearSidebarDropTarget();
    this.updateSidebarZoneCounts();

    // Clean up empty rows to avoid gaps
    this.cleanupEmptyRows();

    // Update rows layout (middle column) and persist sidebar mode state
    this.updateRowsFromDOM();
    this.updateFlexBasisForCurrentDOM();
    this.saveLayout();

    // Restore smooth scroll behavior
    this.restoreSmoothScrollAfterDrag();

    // Reset state
    this.isDragging = false;
    this.draggedItem = null;
    this.originalRow = null;
    this.sidebarDragOrigin = null;
  }

  updateRowsFromDOM() {
    const floatingTargets = window.dashboard?.floating?.targets || {};
    const floatingPlaceholderFallback = {
      quotes: "quoteSection",
      prayerTimes: "prayerTimesCard",
      hijriCalendar: "calendarCard",
      qiblaDirection: "qiblaCard",
      lunarPhase: "lunarPhaseCard",
      fasting: "fastingCard",
      flashcards: "flashcardCard",
      adhkar: "adhkarCard",
      hadith: "hadithCard",
      todoList: "todoCard",
    };

    const resolveFloatingPlaceholderId = (floatingKey) => {
      if (!floatingKey) return null;

      const fromTargets = floatingTargets[floatingKey]?.cardId;
      if (fromTargets) return fromTargets;

      return floatingPlaceholderFallback[floatingKey] || null;
    };

    this.rows = [];
    const rowElements = this.grid.querySelectorAll(".grid-flex-row");

    rowElements.forEach((row, index) => {
      const rowIds = [];
      row.dataset.rowIndex = index;

      Array.from(row.children).forEach((child) => {
        let id = child.dataset.gridId;

        if (!id && child.hasAttribute("data-floating-placeholder")) {
          const floatingKey = child.getAttribute("data-floating-placeholder");
          id = resolveFloatingPlaceholderId(floatingKey);
        }

        if (id && this.componentSpans[id] && !rowIds.includes(id)) {
          rowIds.push(id);
        }
      });

      if (rowIds.length > 0) {
        this.rows.push(rowIds);
      }
    });

    this.activeRows = JSON.parse(JSON.stringify(this.rows));
  }

  setupAutoScroll() {
    const scrollThreshold = 240;
    const minSpeed = 12;
    const maxSpeed = 36;
    const smoothing = 0.16;
    const accelerationLimit = 2.4;

    const getSpeed = (intensity) => {
      const clamped = Math.max(0, Math.min(scrollThreshold, intensity));
      const ratio = clamped / scrollThreshold;
      const eased = Math.pow(ratio, 1.8);
      return minSpeed + eased * (maxSpeed - minSpeed);
    };

    this.scrollInterval = setInterval(() => {
      if (!this.isDragging || !this.draggedItem) return;

      const windowHeight = window.innerHeight || 0;
      if (!windowHeight) return;

      const pointerY =
        Number.isFinite(this.lastPointerY) && this.lastPointerY > 0
          ? this.lastPointerY
          : this.draggedItem.getBoundingClientRect().top + this.dragOffsetY;

      const distanceToTop = pointerY;
      const distanceToBottom = windowHeight - pointerY;

      let targetSpeed = 0;

      // Scroll up
      if (distanceToTop < scrollThreshold) {
        targetSpeed = -getSpeed(scrollThreshold - distanceToTop);
      }
      // Scroll down
      else if (distanceToBottom < scrollThreshold) {
        targetSpeed = getSpeed(scrollThreshold - distanceToBottom);
      }

      // Limit acceleration so near-edge movement feels controlled.
      const velocityDelta = targetSpeed - this.autoScrollVelocity;
      if (velocityDelta > accelerationLimit) {
        targetSpeed = this.autoScrollVelocity + accelerationLimit;
      } else if (velocityDelta < -accelerationLimit) {
        targetSpeed = this.autoScrollVelocity - accelerationLimit;
      }

      // Smooth velocity for less jittery motion
      this.autoScrollVelocity =
        this.autoScrollVelocity * (1 - smoothing) + targetSpeed * smoothing;

      this.autoScrollVelocity = Math.max(
        -maxSpeed,
        Math.min(maxSpeed, this.autoScrollVelocity),
      );

      if (Math.abs(this.autoScrollVelocity) > 0.5) {
        window.scrollBy({
          top: Math.round(this.autoScrollVelocity),
          left: 0,
          behavior: "auto",
        });
      }
    }, 16);
  }

  stopAutoScroll() {
    if (this.scrollInterval) {
      clearInterval(this.scrollInterval);
      this.scrollInterval = null;
    }
    this.autoScrollVelocity = 0;
  }

  handleWheel(e) {
    if (!this.isDragging) return;

    let deltaY = e.deltaY;
    if (e.deltaMode === 1) {
      // Line mode
      deltaY *= 16;
    } else if (e.deltaMode === 2) {
      // Page mode
      deltaY *= window.innerHeight || 0;
    }

    window.scrollBy({ top: deltaY, left: 0, behavior: "auto" });
    e.preventDefault();
  }

  handleKeyDown(e) {
    if (e.key === "Escape" && this.isMiddleLayoutResizing) {
      this.endMiddleLayoutResize();
      return;
    }

    if (e.key === "Escape" && this.isSidebarResizing) {
      this.endSidebarResize();
      return;
    }

    // Escape cancels drag
    if (e.key === "Escape" && this.isDragging) {
      this.cancelDrag();
    }
  }

  cancelDrag() {
    if (!this.isDragging || !this.draggedItem) return;

    this.clearSidebarDropTarget();

    this.stopAutoScroll();
    this.cancelDropTargetUpdate();
    this.invalidateDragRowRectsCache();

    // Reset dragged item
    this.draggedItem.classList.remove("grid-dragging");
    this.draggedItem.style.position = "";
    this.draggedItem.style.zIndex = "";
    this.draggedItem.style.left = "";
    this.draggedItem.style.top = "";
    this.draggedItem.style.width = "";
    this.draggedItem.style.height = "";
    this.draggedItem.style.pointerEvents = "";
    this.draggedItem.style.transition = "";

    // Remove placeholder and any temporary rows
    if (this.placeholder) {
      this.placeholder.remove();
      this.placeholder = null;
    }

    // If this drag started from a sidebar, put it back.
    if (this.sidebarDragOrigin && this.isSidebarModeEnabled) {
      try {
        const { side, index } = this.sidebarDragOrigin;
        this.dockElementToSidebar(this.draggedItem, side, index);
        this.updateSidebarZoneCounts();
      } catch (e) {}
    }

    this.grid.querySelectorAll(".grid-flex-row-new").forEach((row) => {
      if (row.children.length === 0) {
        row.remove();
      }
    });

    // Remove styling
    this.grid.classList.remove("grid-is-dragging");
    this.removeSidebarDraggingClass();
    this.grid
      .querySelectorAll(".grid-flex-row")
      .forEach((r) => r.classList.remove("grid-row-target"));

    // Reset state
    this.isDragging = false;
    this.draggedItem = null;
    this.originalRow = null;
    this.sidebarDragOrigin = null;
    this.invalidateDragRowRectsCache();
  }

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

/**
 * GridLayoutManager - Drag and Drop Grid Layout System
 * Enables repositioning of dashboard components via drag-and-drop
 * Uses flex-based rows with automatic component expansion
 */

class GridLayoutManager {
  constructor(storage) {
    this.storage = storage;
    this.grid = null;
    this.gridItems = [];
    this.rows = [];
    this.draggedItem = null;
    this.draggedItemRect = null;
    this.placeholder = null;
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.initialMouseX = 0;
    this.initialMouseY = 0;
    this.scrollInterval = null;

    // Component definitions with their original span limits
    // Span represents the maximum columns out of 6 the component prefers
    this.componentSpans = {
      header: { id: "header", span: 6, minSpan: 6 },
      pinnedAppsSection: { id: "pinnedAppsSection", span: 6, minSpan: 6 },
      searchBarSection: { id: "searchBarSection", span: 6, minSpan: 6 },
      quoteSection: { id: "quoteSection", span: 6, minSpan: 6 },
      prayerTimesCard: { id: "prayerTimesCard", span: 2, minSpan: 2 },
      calendarCard: { id: "calendarCard", span: 2, minSpan: 2 },
      qiblaCard: { id: "qiblaCard", span: 2, minSpan: 2 },
      weatherCard: { id: "weatherCard", span: 6, minSpan: 3 },
      lunarPhaseCard: { id: "lunarPhaseCard", span: 2, minSpan: 2 },
      fastingCard: { id: "fastingCard", span: 2, minSpan: 2 },
      flashcardCard: { id: "flashcardCard", span: 3, minSpan: 2 },
      todoCard: { id: "todoCard", span: 3, minSpan: 2 },
      notesCard: { id: "notesCard", span: 6, minSpan: 3 },
      pocketQuranCard: { id: "pocketQuranCard", span: 6, minSpan: 6 },
    };

    // Default row structure (component IDs in order)
    this.defaultLayout = [
      ["header"],
      ["pinnedAppsSection"],
      ["searchBarSection"],
      ["quoteSection"],
      ["prayerTimesCard", "calendarCard", "qiblaCard"],
      ["weatherCard"],
      ["lunarPhaseCard", "fastingCard"],
      ["flashcardCard", "todoCard"],
      ["notesCard"],
      ["pocketQuranCard"],
    ];

    // Bound event handlers
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * Initialize the grid layout manager
   */
  init() {
    this.grid = document.querySelector(".content-grid");
    if (!this.grid) {
      console.warn("GridLayoutManager: .content-grid not found");
      return;
    }

    // Load saved layout or use default
    this.loadLayout();

    // Apply the layout to create flex rows
    this.applyLayout();

    // Setup event listeners for drag and drop
    this.setupEventListeners();

    // Listen for visibility changes
    document.addEventListener("md:visibility-changed", () => {
      this.recalculateLayout();
    });

    console.log("✅ GridLayoutManager initialized");
  }

  /**
   * Load layout from storage or use default
   */
  loadLayout() {
    const settings = this.storage.getSettings();
    const savedLayout = settings.gridLayout;

    if (savedLayout && Array.isArray(savedLayout) && savedLayout.length > 0) {
      // Validate saved layout has all components
      const allIds = new Set(Object.keys(this.componentSpans));
      const savedIds = new Set(savedLayout.flat());

      // Check for missing components and add them
      const missingIds = [...allIds].filter((id) => !savedIds.has(id));
      if (missingIds.length > 0) {
        // Add missing components to appropriate rows based on default layout
        missingIds.forEach((id) => {
          const defaultRow = this.defaultLayout.find((row) => row.includes(id));
          if (defaultRow) {
            const defaultIndex = this.defaultLayout.indexOf(defaultRow);
            if (savedLayout[defaultIndex]) {
              savedLayout[defaultIndex].push(id);
            } else {
              savedLayout.push([id]);
            }
          } else {
            savedLayout.push([id]);
          }
        });
      }

      this.rows = savedLayout;
    } else {
      this.rows = JSON.parse(JSON.stringify(this.defaultLayout));
    }
  }

  /**
   * Save layout to storage
   */
  saveLayout() {
    const settings = this.storage.getSettings();
    settings.gridLayout = this.rows;
    this.storage.saveSettings(settings);
  }

  /**
   * Apply the current layout to the DOM
   * Creates flex row wrappers for each row
   */
  applyLayout() {
    if (!this.grid) return;

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
    this.rows.forEach((rowItems, rowIndex) => {
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
          // Set flex basis based on visible items count
          this.setItemFlexBasis(el, id, visibleItems.length);

          // Make item draggable
          el.classList.add("grid-draggable");
          el.setAttribute("draggable", "false"); // We use custom drag
          el.dataset.gridId = id;

          rowWrapper.appendChild(el);
        }
      });

      fragment.appendChild(rowWrapper);
    });

    this.grid.appendChild(fragment);

    // Add class for CSS fallback (browsers that don't support :has())
    this.grid.classList.add("grid-layout-active");

    this.updateGridItems();
  }

  /**
   * Set flex basis for an item based on visible items in row
   */
  setItemFlexBasis(el, id, visibleCount) {
    const config = this.componentSpans[id];
    if (!config) return;

    // If item is hidden, don't set flex
    if (this.isComponentHidden(el)) {
      el.style.flex = "";
      return;
    }

    // Calculate flex basis percentage
    let flexPercent;
    if (visibleCount === 0 || visibleCount === 1) {
      flexPercent = 100;
    } else if (visibleCount === 2) {
      flexPercent = 50;
    } else if (visibleCount === 3) {
      flexPercent = 33.333;
    } else {
      // More than 3 items, use original span ratio
      flexPercent = (config.span / 6) * 100;
    }

    // For full-width components, always use 100%
    if (config.span === 6 && config.minSpan === 6) {
      flexPercent = 100;
    }

    el.style.flex = `1 1 calc(${flexPercent}% - var(--spacing-xl))`;
    el.style.maxWidth = `${flexPercent}%`;
    el.style.minWidth = `${Math.max(200, (config.minSpan / 6) * 100)}px`;
  }

  /**
   * Check if a component is hidden via visibility settings
   */
  isComponentHidden(el) {
    return (
      el.style.display === "none" ||
      el.getAttribute("aria-hidden") === "true" ||
      el.classList.contains("floating-card")
    );
  }

  /**
   * Update grid items array
   */
  updateGridItems() {
    this.gridItems = Array.from(
      this.grid.querySelectorAll(".grid-draggable")
    ).filter(
      (el) =>
        !this.isComponentHidden(el) && !el.classList.contains("floating-card")
    );
  }

  /**
   * Recalculate layout when visibility changes
   */
  recalculateLayout() {
    if (!this.grid) return;

    // Update flex basis for all items in each row
    const rowWrappers = this.grid.querySelectorAll(".grid-flex-row");
    rowWrappers.forEach((rowWrapper) => {
      const rowItems = Array.from(rowWrapper.children);
      const visibleItems = rowItems.filter((el) => !this.isComponentHidden(el));

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

    this.updateGridItems();
  }

  /**
   * Setup event listeners for drag and drop
   */
  setupEventListeners() {
    // Mouse events
    this.grid.addEventListener("mousedown", this.handleMouseDown);
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("mouseup", this.handleMouseUp);

    // Touch events
    this.grid.addEventListener("touchstart", this.handleTouchStart, {
      passive: false,
    });
    document.addEventListener("touchmove", this.handleTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", this.handleTouchEnd);

    // Keyboard support for accessibility
    document.addEventListener("keydown", this.handleKeyDown);
  }

  /**
   * Get drag handle or draggable element from target
   */
  getDraggableFromTarget(target) {
    // Check if clicking on interactive elements - don't drag
    if (
      target.closest(
        'button, input, select, textarea, a, [contenteditable="true"], .todo-list, .notes-editor, .flashcard-flip-card, .pocket-quran-content, .calendar-days'
      )
    ) {
      return null;
    }

    // Find the draggable parent
    const draggable = target.closest(".grid-draggable");
    if (!draggable || this.isComponentHidden(draggable)) {
      return null;
    }

    // Don't drag items in floating mode
    if (draggable.classList.contains("floating-card")) {
      return null;
    }

    return draggable;
  }

  /**
   * Handle mouse down - start drag
   */
  handleMouseDown(e) {
    // Only left mouse button
    if (e.button !== 0) return;

    const draggable = this.getDraggableFromTarget(e.target);
    if (!draggable) return;

    this.startDrag(draggable, e.clientX, e.clientY);
    e.preventDefault();
  }

  /**
   * Handle touch start - start drag
   */
  handleTouchStart(e) {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const draggable = this.getDraggableFromTarget(touch.target);
    if (!draggable) return;

    // Add delay for touch to distinguish from scroll
    this.touchStartTimer = setTimeout(() => {
      this.startDrag(draggable, touch.clientX, touch.clientY);
    }, 200);

    this.touchStartPos = { x: touch.clientX, y: touch.clientY };
  }

  /**
   * Start dragging an element
   */
  startDrag(element, clientX, clientY) {
    this.isDragging = true;
    this.draggedItem = element;
    this.draggedItemRect = element.getBoundingClientRect();
    this.initialMouseX = clientX;
    this.initialMouseY = clientY;

    // Calculate offset from element top-left
    this.dragOffsetX = clientX - this.draggedItemRect.left;
    this.dragOffsetY = clientY - this.draggedItemRect.top;

    // Store original position info
    const row = element.closest(".grid-flex-row");
    this.originalRow = row;
    this.originalRowIndex = parseInt(row.dataset.rowIndex);
    this.originalItemIndex = Array.from(row.children).indexOf(element);

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

    // Setup auto-scroll
    this.setupAutoScroll();
  }

  /**
   * Create placeholder element
   */
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
      this.draggedItem
    );
  }

  /**
   * Handle mouse move - update drag position
   */
  handleMouseMove(e) {
    if (!this.isDragging) return;
    this.updateDrag(e.clientX, e.clientY);
  }

  /**
   * Handle touch move - update drag position
   */
  handleTouchMove(e) {
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

  /**
   * Update drag position and find drop target
   */
  updateDrag(clientX, clientY) {
    if (!this.draggedItem) return;

    // Update dragged item position
    this.draggedItem.style.left = `${clientX - this.dragOffsetX}px`;
    this.draggedItem.style.top = `${clientY - this.dragOffsetY}px`;

    // Find drop target
    this.updateDropTarget(clientX, clientY);
  }

  /**
   * Update drop target - find where to place the placeholder
   */
  updateDropTarget(clientX, clientY) {
    const draggedId = this.draggedItem.dataset.gridId;
    const draggedConfig = this.componentSpans[draggedId];

    // Find the row we're hovering over
    const rows = this.grid.querySelectorAll(".grid-flex-row");
    let targetRow = null;
    let targetRowIndex = -1;
    let insertBefore = null;
    let insertAfter = null;

    rows.forEach((row, index) => {
      const rect = row.getBoundingClientRect();
      if (
        clientY >= rect.top - 20 &&
        clientY <= rect.bottom + 20 &&
        row.style.display !== "none"
      ) {
        targetRow = row;
        targetRowIndex = index;
      }
    });

    if (!targetRow) {
      // Check if we're above all rows or below
      const firstRow = rows[0];
      const lastRow = rows[rows.length - 1];

      if (firstRow && clientY < firstRow.getBoundingClientRect().top) {
        targetRow = firstRow;
        targetRowIndex = 0;
      } else if (lastRow && clientY > lastRow.getBoundingClientRect().bottom) {
        targetRow = lastRow;
        targetRowIndex = rows.length - 1;
      }
    }

    if (!targetRow) return;

    // Check if we can drop in this row based on span constraints
    const rowItems = Array.from(targetRow.children).filter(
      (el) =>
        el !== this.placeholder &&
        el !== this.draggedItem &&
        !this.isComponentHidden(el)
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

    if (needsNewRow && rowItems.length > 0) {
      // Create insertion point for new row (above or below current row)
      const rowRect = targetRow.getBoundingClientRect();
      const rowCenterY = rowRect.top + rowRect.height / 2;

      if (clientY < rowCenterY) {
        // Insert above - move placeholder to a new row above
        this.movePlaceholderToNewRow(targetRowIndex, "before");
      } else {
        // Insert below - move placeholder to a new row below
        this.movePlaceholderToNewRow(targetRowIndex, "after");
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

  /**
   * Move placeholder to a position within a row
   */
  movePlaceholderToRow(row, position) {
    // Remove placeholder from current position
    if (this.placeholder.parentNode) {
      this.placeholder.parentNode.removeChild(this.placeholder);
    }

    const children = Array.from(row.children).filter(
      (el) => el !== this.draggedItem && !this.isComponentHidden(el)
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
  }

  /**
   * Move placeholder to a new row (before or after existing row)
   */
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
      ".grid-flex-row:not(.grid-flex-row-new)"
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
  }

  /**
   * Handle mouse up - end drag
   */
  handleMouseUp(e) {
    if (!this.isDragging) return;
    this.endDrag();
  }

  /**
   * Handle touch end - end drag
   */
  handleTouchEnd(e) {
    if (this.touchStartTimer) {
      clearTimeout(this.touchStartTimer);
      this.touchStartTimer = null;
    }

    if (!this.isDragging) return;
    this.endDrag();
  }

  /**
   * End drag operation
   */
  endDrag() {
    if (!this.isDragging || !this.draggedItem) return;

    // Stop auto-scroll
    this.stopAutoScroll();

    // Get final position from placeholder
    const placeholderParent = this.placeholder.parentNode;
    const placeholderIndex = Array.from(placeholderParent.children).indexOf(
      this.placeholder
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

  /**
   * Finalize drop - update DOM and save layout
   */
  finalizeDrop(targetRow, insertIndex) {
    if (!this.draggedItem || !this.placeholder) return;

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

    // Replace placeholder with dragged item
    targetRow.insertBefore(this.draggedItem, this.placeholder);
    this.placeholder.remove();
    this.placeholder = null;

    // Clean up empty rows and temporary rows
    this.grid.querySelectorAll(".grid-flex-row").forEach((row) => {
      row.classList.remove("grid-flex-row-new", "grid-row-target");
      const visibleChildren = Array.from(row.children).filter(
        (el) => !this.isComponentHidden(el)
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

    // Recalculate flex basis for all items
    this.recalculateLayout();

    // Remove dragging class from grid
    this.grid.classList.remove("grid-is-dragging");

    // Save layout
    this.saveLayout();

    // Reset state
    this.isDragging = false;
    this.draggedItem = null;
    this.originalRow = null;
  }

  /**
   * Update rows array from current DOM state
   */
  updateRowsFromDOM() {
    this.rows = [];
    const rowElements = this.grid.querySelectorAll(".grid-flex-row");

    rowElements.forEach((row, index) => {
      const rowIds = [];
      row.dataset.rowIndex = index;

      Array.from(row.children).forEach((child) => {
        const id = child.dataset.gridId;
        if (id && this.componentSpans[id]) {
          rowIds.push(id);
        }
      });

      if (rowIds.length > 0) {
        this.rows.push(rowIds);
      }
    });
  }

  /**
   * Setup auto-scroll when dragging near edges
   */
  setupAutoScroll() {
    const scrollSpeed = 10;
    const scrollThreshold = 80;

    this.scrollInterval = setInterval(() => {
      if (!this.isDragging || !this.draggedItem) return;

      const rect = this.draggedItem.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Scroll down
      if (rect.bottom > windowHeight - scrollThreshold) {
        window.scrollBy(0, scrollSpeed);
      }
      // Scroll up
      else if (rect.top < scrollThreshold) {
        window.scrollBy(0, -scrollSpeed);
      }
    }, 16);
  }

  /**
   * Stop auto-scroll
   */
  stopAutoScroll() {
    if (this.scrollInterval) {
      clearInterval(this.scrollInterval);
      this.scrollInterval = null;
    }
  }

  /**
   * Handle keyboard events for accessibility
   */
  handleKeyDown(e) {
    // Escape cancels drag
    if (e.key === "Escape" && this.isDragging) {
      this.cancelDrag();
    }
  }

  /**
   * Cancel current drag operation
   */
  cancelDrag() {
    if (!this.isDragging || !this.draggedItem) return;

    this.stopAutoScroll();

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

    this.grid.querySelectorAll(".grid-flex-row-new").forEach((row) => {
      if (row.children.length === 0) {
        row.remove();
      }
    });

    // Remove styling
    this.grid.classList.remove("grid-is-dragging");
    this.grid
      .querySelectorAll(".grid-flex-row")
      .forEach((r) => r.classList.remove("grid-row-target"));

    // Reset state
    this.isDragging = false;
    this.draggedItem = null;
    this.originalRow = null;
  }

  /**
   * Reset layout to default
   */
  resetToDefault() {
    this.rows = JSON.parse(JSON.stringify(this.defaultLayout));
    this.applyLayout();
    this.saveLayout();
  }

  /**
   * Get current layout for external use
   */
  getLayout() {
    return JSON.parse(JSON.stringify(this.rows));
  }

  /**
   * Set layout from external source
   */
  setLayout(layout) {
    if (Array.isArray(layout) && layout.length > 0) {
      this.rows = layout;
      this.applyLayout();
      this.saveLayout();
    }
  }
}

// Export for use in app.js
window.GridLayoutManager = GridLayoutManager;

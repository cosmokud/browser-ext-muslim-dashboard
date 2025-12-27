/**
 * Dock Manager
 * Handles draggable, dockable UI components in a tiled layout
 * Features: Multiple slots per row, dynamic row spawning, responsive animations
 */

class DockManager {
  constructor(storage) {
    this.storage = storage;
    this.components = [];
    this.draggedComponent = null;
    this.draggedSlot = null;
    this.isEditMode = false;
    this.componentCache = {}; // Global component cache

    // Container elements
    this.masterContainer = document.getElementById("masterContainer");
    this.leftContainer = document.getElementById("leftContainer");
    this.mainContainer = document.getElementById("mainDockContainer");
    this.rightContainer = document.getElementById("rightContainer");

    // Settings
    this.settings = {
      slotsPerRow: 3,
      containerWidth: "default",
      customWidth: 80,
      showSideContainers: true,
      sideAlignment: "center",
    };

    // Component registry
    this.componentRegistry = {
      prayerTimes: { id: "prayerTimesCard", name: "Prayer Times", icon: "🕌" },
      calendar: { id: "calendarCard", name: "Calendar", icon: "📅" },
      qibla: { id: "qiblaCard", name: "Qibla Direction", icon: "🧭" },
      todo: { id: "todoCard", name: "My Tasks", icon: "✅" },
      pinnedApps: { id: "pinnedAppsSection", name: "Pinned Apps", icon: "📌" },
      quote: { id: "quoteSection", name: "Daily Quote", icon: "📖" },
    };

    // Active components (for component management)
    this.activeComponents = new Set(Object.keys(this.componentRegistry));
  }

  /**
   * Initialize dock manager
   */
  init() {
    this.cacheAllComponents();
    this.loadSettings();
    this.loadLayout();
    this.applyContainerWidth();
    this.applySideContainers();
    this.bindEvents();
    this.render();
  }

  /**
   * Cache all components once at initialization
   */
  cacheAllComponents() {
    for (const key in this.componentRegistry) {
      const comp = this.componentRegistry[key];
      const el = document.getElementById(comp.id);
      if (el) {
        this.componentCache[key] = el;
      }
    }
  }

  /**
   * Load settings from storage
   */
  loadSettings() {
    const settings = this.storage.getSettings();
    this.settings.slotsPerRow = settings.dockSlotsPerRow || 3;
    this.settings.containerWidth = settings.dockContainerWidth || "default";
    this.settings.customWidth = settings.dockCustomWidth || 80;
    this.settings.showSideContainers =
      settings.dockShowSideContainers !== undefined
        ? settings.dockShowSideContainers
        : true;
    this.settings.sideAlignment = settings.dockSideAlignment || "center";
  }

  /**
   * Save settings to storage
   */
  saveSettings() {
    const settings = this.storage.getSettings();
    settings.dockSlotsPerRow = this.settings.slotsPerRow;
    settings.dockContainerWidth = this.settings.containerWidth;
    settings.dockCustomWidth = this.settings.customWidth;
    settings.dockShowSideContainers = this.settings.showSideContainers;
    settings.dockSideAlignment = this.settings.sideAlignment;
    this.storage.saveSettings(settings);
  }

  /**
   * Load layout from storage
   */
  loadLayout() {
    const saved = this.storage.get("dockLayout", null);

    if (saved && saved.main) {
      this.layout = saved;
    } else {
      // Default layout - side containers enabled, 3 slots per row
      // Row 0: Pinned Apps (full row - 3 slots)
      // Row 1: Quote (full row - 3 slots)
      // Row 2: Prayer Times (2 slots) + Qibla (1 slot) = 3 slots
      // Row 3: Calendar (1 slot)
      // Right side: Todo
      this.layout = {
        main: [
          { row: 0, components: [{ id: "pinnedApps", slots: 3 }] },
          { row: 1, components: [{ id: "quote", slots: 3 }] },
          {
            row: 2,
            components: [
              { id: "prayerTimes", slots: 2 },
              { id: "qibla", slots: 1 },
            ],
          },
          { row: 3, components: [{ id: "calendar", slots: 1 }] },
        ],
        left: [],
        right: [{ row: 0, components: [{ id: "todo", slots: 1 }] }],
      };
    }
  }

  /**
   * Save layout to storage
   */
  saveLayout() {
    this.storage.set("dockLayout", this.layout);
  }

  /**
   * Apply container width settings
   */
  applyContainerWidth() {
    if (!this.masterContainer) return;

    const widthMap = {
      default: "1400px",
      narrow: "900px",
      medium: "1100px",
      wide: "1600px",
      full: "99vw",
    };

    if (this.settings.containerWidth === "custom") {
      this.masterContainer.style.maxWidth = `${this.settings.customWidth}vw`;
    } else {
      this.masterContainer.style.maxWidth =
        widthMap[this.settings.containerWidth] || widthMap.default;
    }
  }

  /**
   * Apply side containers visibility
   */
  applySideContainers() {
    if (this.leftContainer) {
      this.leftContainer.style.display = this.settings.showSideContainers
        ? "flex"
        : "none";
    }
    if (this.rightContainer) {
      this.rightContainer.style.display = this.settings.showSideContainers
        ? "flex"
        : "none";
    }

    // Apply vertical alignment
    const alignMap = {
      top: "flex-start",
      center: "center",
      bottom: "flex-end",
    };

    if (this.leftContainer) {
      this.leftContainer.style.justifyContent =
        alignMap[this.settings.sideAlignment] || "center";
    }
    if (this.rightContainer) {
      this.rightContainer.style.justifyContent =
        alignMap[this.settings.sideAlignment] || "center";
    }
  }

  /**
   * Bind events
   */
  bindEvents() {
    // Main container drag events
    if (this.mainContainer) {
      this.mainContainer.addEventListener("dragover", (e) =>
        this.handleDragOver(e)
      );
      this.mainContainer.addEventListener("drop", (e) =>
        this.handleDrop(e, "main")
      );
    }

    // Side containers
    if (this.leftContainer) {
      this.leftContainer.addEventListener("dragover", (e) =>
        this.handleDragOver(e)
      );
      this.leftContainer.addEventListener("drop", (e) =>
        this.handleDrop(e, "left")
      );
    }
    if (this.rightContainer) {
      this.rightContainer.addEventListener("dragover", (e) =>
        this.handleDragOver(e)
      );
      this.rightContainer.addEventListener("drop", (e) =>
        this.handleDrop(e, "right")
      );
    }
  }

  /**
   * Render the dock layout
   */
  render() {
    // First, detach all components from DOM but keep in cache
    for (const key in this.componentCache) {
      const el = this.componentCache[key];
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }

    // Clear all containers
    if (this.mainContainer) this.mainContainer.innerHTML = "";
    if (this.leftContainer) this.leftContainer.innerHTML = "";
    if (this.rightContainer) this.rightContainer.innerHTML = "";

    // Render all containers
    this.renderContainer("main", this.mainContainer, this.layout.main);
    if (this.settings.showSideContainers) {
      this.renderContainer("left", this.leftContainer, this.layout.left);
      this.renderContainer("right", this.rightContainer, this.layout.right);
    }
    this.equalizeRowHeights();
  }

  /**
   * Render a single container
   */
  renderContainer(containerType, containerEl, rows) {
    if (!containerEl) return;

    // Render rows using global component cache
    rows.forEach((rowData, rowIndex) => {
      const rowEl = this.createRow(
        containerType,
        rowIndex,
        rowData.components,
        this.componentCache
      );
      containerEl.appendChild(rowEl);
    });

    // Add drop zone for new row at the bottom
    const dropZone = document.createElement("div");
    dropZone.className = "dock-new-row-zone";
    dropZone.dataset.container = containerType;
    dropZone.innerHTML = "<span>Drop here to create new row</span>";
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("active");
    });
    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("active");
    });
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("active");
      this.handleNewRowDrop(e, containerType);
    });
    containerEl.appendChild(dropZone);
  }

  /**
   * Create a row element
   */
  createRow(containerType, rowIndex, components, componentCache) {
    const rowEl = document.createElement("div");
    rowEl.className = "dock-row";
    rowEl.dataset.row = rowIndex;
    rowEl.dataset.container = containerType;

    // Calculate total slots used
    const totalSlots = components.reduce((sum, c) => sum + c.slots, 0);
    const slotsPerRow =
      containerType === "main" ? this.settings.slotsPerRow : 1;

    components.forEach((compData, compIndex) => {
      const slotEl = document.createElement("div");
      slotEl.className = "dock-slot";
      slotEl.dataset.slots = compData.slots;
      slotEl.dataset.componentId = compData.id;
      slotEl.style.flex = compData.slots;

      // Get the component element
      const component = componentCache[compData.id];
      if (component) {
        component.classList.add("dock-component");
        component.draggable = true;
        component.dataset.dockId = compData.id;

        // Add drag handle
        this.addDragHandle(component, compData.id);

        // Add resize handles for main container (always show on hover)
        if (containerType === "main") {
          this.addResizeHandle(slotEl, compData, rowIndex, compIndex);
        }

        // Bind drag events
        component.addEventListener("dragstart", (e) =>
          this.handleDragStart(e, compData.id, containerType, rowIndex)
        );
        component.addEventListener("dragend", () => this.handleDragEnd());

        slotEl.appendChild(component);
      }

      // Slot drop events
      slotEl.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
        slotEl.classList.add("drag-over");
      });
      slotEl.addEventListener("dragleave", () => {
        slotEl.classList.remove("drag-over");
      });
      slotEl.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        slotEl.classList.remove("drag-over");
        this.handleSlotDrop(e, containerType, rowIndex, compIndex);
      });

      rowEl.appendChild(slotEl);
    });

    // Add empty slots for remaining space
    const emptySlots = slotsPerRow - totalSlots;
    for (let i = 0; i < emptySlots; i++) {
      const emptySlot = document.createElement("div");
      emptySlot.className = "dock-slot dock-slot-empty";
      emptySlot.style.flex = 1;
      emptySlot.innerHTML = '<span class="empty-slot-label">Empty Slot</span>';

      emptySlot.addEventListener("dragover", (e) => {
        e.preventDefault();
        emptySlot.classList.add("drag-over");
      });
      emptySlot.addEventListener("dragleave", () => {
        emptySlot.classList.remove("drag-over");
      });
      emptySlot.addEventListener("drop", (e) => {
        e.preventDefault();
        emptySlot.classList.remove("drag-over");
        this.handleEmptySlotDrop(e, containerType, rowIndex);
      });

      rowEl.appendChild(emptySlot);
    }

    return rowEl;
  }

  /**
   * Add drag handle to component
   */
  addDragHandle(component, componentId) {
    // Check if handle already exists
    if (component.querySelector(".dock-drag-handle")) return;

    const handle = document.createElement("div");
    handle.className = "dock-drag-handle";
    handle.innerHTML = "⋮⋮";
    handle.title = "Drag to reorder";

    component.insertBefore(handle, component.firstChild);
  }

  /**
   * Add resize handle
   */
  addResizeHandle(slotEl, compData, rowIndex, compIndex) {
    const handle = document.createElement("div");
    handle.className = "dock-resize-handle";
    handle.title = "Drag to resize";

    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.startResize(e, compData, rowIndex, compIndex);
    });

    slotEl.appendChild(handle);
  }

  /**
   * Start resize operation
   */
  startResize(e, compData, rowIndex, compIndex) {
    const startX = e.clientX;
    const startSlots = compData.slots;
    const maxSlots = this.settings.slotsPerRow;
    let lastAppliedSlots = startSlots;

    const onMouseMove = (e) => {
      const diff = e.clientX - startX;
      const slotWidth = this.mainContainer.offsetWidth / maxSlots;
      const slotChange = Math.round(diff / slotWidth);
      const newSlots = Math.max(1, Math.min(maxSlots, startSlots + slotChange));

      if (newSlots === lastAppliedSlots) return;
      lastAppliedSlots = newSlots;

      const row = this.layout.main[rowIndex];
      const currentTotalSlots = row.components.reduce(
        (sum, c) => sum + c.slots,
        0
      );
      const slotsNeeded = newSlots - compData.slots;

      if (slotsNeeded > 0) {
        // Expanding - check if we need to move components to new row
        const availableSlots = maxSlots - currentTotalSlots + compData.slots;

        if (newSlots <= availableSlots) {
          // Fits in current row
          row.components[compIndex].slots = newSlots;
        } else {
          // Need to push rightmost component(s) to new row
          row.components[compIndex].slots = newSlots;
          this.handleRowOverflow(rowIndex);
        }
      } else {
        // Shrinking - just update slots
        row.components[compIndex].slots = newSlots;
      }

      this.render();
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      this.saveLayout();
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  /**
   * Handle row overflow by moving rightmost components to new row
   */
  handleRowOverflow(rowIndex) {
    const row = this.layout.main[rowIndex];
    const maxSlots = this.settings.slotsPerRow;

    while (
      row.components.reduce((sum, c) => sum + c.slots, 0) > maxSlots &&
      row.components.length > 1
    ) {
      // Remove the rightmost component
      const overflow = row.components.pop();

      // Check if next row exists, otherwise create one
      if (!this.layout.main[rowIndex + 1]) {
        this.layout.main.push({
          row: rowIndex + 1,
          components: [overflow],
        });
      } else {
        // Insert at the beginning of the next row
        this.layout.main[rowIndex + 1].components.unshift(overflow);
        // Check if next row now overflows
        this.handleRowOverflow(rowIndex + 1);
      }
    }
  }

  /**
   * Handle drag start
   */
  handleDragStart(e, componentId, containerType, rowIndex) {
    this.draggedComponent = {
      id: componentId,
      container: containerType,
      row: rowIndex,
    };
    e.target.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", componentId);

    // Add dragging class to container to show drop zones
    if (this.mainContainer) {
      this.mainContainer.classList.add("dragging");
    }
  }

  /**
   * Handle drag end
   */
  handleDragEnd() {
    this.draggedComponent = null;
    document
      .querySelectorAll(".dragging")
      .forEach((el) => el.classList.remove("dragging"));
    document
      .querySelectorAll(".drag-over")
      .forEach((el) => el.classList.remove("drag-over"));
    document
      .querySelectorAll(".dock-new-row-zone.active")
      .forEach((el) => el.classList.remove("active"));
  }

  /**
   * Handle drag over
   */
  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  /**
   * Handle drop on existing slot
   */
  handleSlotDrop(e, containerType, rowIndex, slotIndex) {
    if (!this.draggedComponent) return;

    const sourceLayout = this.layout[this.draggedComponent.container];
    const targetLayout = this.layout[containerType];

    // Find and remove from source
    for (let r = 0; r < sourceLayout.length; r++) {
      const row = sourceLayout[r];
      const compIndex = row.components.findIndex(
        (c) => c.id === this.draggedComponent.id
      );
      if (compIndex !== -1) {
        const [removed] = row.components.splice(compIndex, 1);

        // Clean up empty rows
        if (row.components.length === 0) {
          sourceLayout.splice(r, 1);
        }

        // Insert at new position
        if (targetLayout[rowIndex]) {
          targetLayout[rowIndex].components.splice(slotIndex, 0, removed);
        }

        break;
      }
    }

    this.saveLayout();
    this.render();
  }

  /**
   * Handle drop on empty slot
   */
  handleEmptySlotDrop(e, containerType, rowIndex) {
    if (!this.draggedComponent) return;

    const sourceLayout = this.layout[this.draggedComponent.container];
    const targetLayout = this.layout[containerType];

    // Find and remove from source
    for (let r = 0; r < sourceLayout.length; r++) {
      const row = sourceLayout[r];
      const compIndex = row.components.findIndex(
        (c) => c.id === this.draggedComponent.id
      );
      if (compIndex !== -1) {
        const [removed] = row.components.splice(compIndex, 1);

        // Clean up empty rows
        if (row.components.length === 0) {
          sourceLayout.splice(r, 1);
        }

        // Add to target row
        if (targetLayout[rowIndex]) {
          targetLayout[rowIndex].components.push(removed);
        }

        break;
      }
    }

    this.saveLayout();
    this.render();
  }

  /**
   * Handle drop to create new row
   */
  handleNewRowDrop(e, containerType) {
    if (!this.draggedComponent) return;

    const sourceLayout = this.layout[this.draggedComponent.container];
    const targetLayout = this.layout[containerType];

    // Find and remove from source
    for (let r = 0; r < sourceLayout.length; r++) {
      const row = sourceLayout[r];
      const compIndex = row.components.findIndex(
        (c) => c.id === this.draggedComponent.id
      );
      if (compIndex !== -1) {
        const [removed] = row.components.splice(compIndex, 1);

        // Clean up empty rows
        if (row.components.length === 0) {
          sourceLayout.splice(r, 1);
        }

        // Create new row at the end
        targetLayout.push({
          row: targetLayout.length,
          components: [removed],
        });

        break;
      }
    }

    this.saveLayout();
    this.render();
  }

  /**
   * Handle general drop
   */
  handleDrop(e, containerType) {
    // Handled by slot/row specific handlers
  }

  /**
   * Equalize row heights
   */
  equalizeRowHeights() {
    if (!this.mainContainer) return;

    const rows = this.mainContainer.querySelectorAll(".dock-row");
    rows.forEach((row) => {
      const slots = row.querySelectorAll(".dock-slot");
      let maxHeight = 0;

      // Reset heights first
      slots.forEach((slot) => {
        slot.style.minHeight = "auto";
        const component = slot.querySelector(".dock-component");
        if (component) {
          component.style.height = "auto";
        }
      });

      // Find max height
      slots.forEach((slot) => {
        const component = slot.querySelector(".dock-component");
        if (component) {
          maxHeight = Math.max(maxHeight, component.offsetHeight);
        }
      });

      // Apply max height to all slots in row
      if (maxHeight > 0) {
        slots.forEach((slot) => {
          slot.style.minHeight = `${maxHeight}px`;
        });
      }
    });
  }

  /**
   * Update slots per row
   */
  setSlotsPerRow(count) {
    const newSlotsPerRow = Math.max(2, Math.min(8, count));
    this.settings.slotsPerRow = newSlotsPerRow;

    // Reflow layout to handle overflow
    this.reflowLayout();

    this.saveSettings();
    this.saveLayout();
    this.render();
  }

  /**
   * Reflow layout to handle slot overflow
   * When slots per row decreases, move excess components to new rows
   */
  reflowLayout() {
    const slotsPerRow = this.settings.slotsPerRow;

    // Process main container
    const newMainRows = [];
    for (const row of this.layout.main) {
      let currentRow = { row: newMainRows.length, components: [] };
      let currentSlots = 0;

      for (const comp of row.components) {
        // Cap component slots to max slots per row
        const compSlots = Math.min(comp.slots, slotsPerRow);

        if (currentSlots + compSlots <= slotsPerRow) {
          currentRow.components.push({ ...comp, slots: compSlots });
          currentSlots += compSlots;
        } else {
          // Push current row and start new one
          if (currentRow.components.length > 0) {
            newMainRows.push(currentRow);
          }
          currentRow = {
            row: newMainRows.length,
            components: [{ ...comp, slots: compSlots }],
          };
          currentSlots = compSlots;
        }
      }

      // Don't forget the last row
      if (currentRow.components.length > 0) {
        newMainRows.push(currentRow);
      }
    }

    this.layout.main = newMainRows;
  }

  /**
   * Update container width
   */
  setContainerWidth(width, customValue = null) {
    this.settings.containerWidth = width;
    if (customValue !== null) {
      this.settings.customWidth = Math.max(30, Math.min(99, customValue));
    }
    this.saveSettings();
    this.applyContainerWidth();
  }

  /**
   * Toggle side containers
   */
  toggleSideContainers(show) {
    this.settings.showSideContainers = show;
    this.saveSettings();
    this.applySideContainers();
    this.render();
  }

  /**
   * Set side containers visibility and alignment
   */
  setSideContainers(show, alignment) {
    this.settings.showSideContainers = show;
    this.settings.sideAlignment = alignment || "center";
    this.saveSettings();
    this.applySideContainers();
    this.render();
  }

  /**
   * Set side alignment
   */
  setSideAlignment(alignment) {
    this.settings.sideAlignment = alignment;
    this.saveSettings();
    this.applySideContainers();
  }

  /**
   * Reset layout to default
   */
  resetLayout() {
    // Default layout with side containers enabled, 3 slots per row
    // Row 0: Pinned Apps (full row - 3 slots)
    // Row 1: Quote (full row - 3 slots)
    // Row 2: Prayer Times (2 slots) + Qibla (1 slot) = 3 slots
    // Row 3: Calendar (1 slot)
    // Right side: Todo
    this.layout = {
      main: [
        { row: 0, components: [{ id: "pinnedApps", slots: 3 }] },
        { row: 1, components: [{ id: "quote", slots: 3 }] },
        {
          row: 2,
          components: [
            { id: "prayerTimes", slots: 2 },
            { id: "qibla", slots: 1 },
          ],
        },
        { row: 3, components: [{ id: "calendar", slots: 1 }] },
      ],
      left: [],
      right: [{ row: 0, components: [{ id: "todo", slots: 1 }] }],
    };

    // Reset settings
    this.settings.slotsPerRow = 3;
    this.settings.containerWidth = "default";
    this.settings.customWidth = 80;
    this.settings.showSideContainers = true;
    this.settings.sideAlignment = "center";

    // Reset active components
    this.activeComponents = new Set(Object.keys(this.componentRegistry));

    this.saveLayout();
    this.saveSettings();
    this.applyContainerWidth();
    this.applySideContainers();
    this.render();
  }

  /**
   * Get all active components in layout
   */
  getActiveComponentsInLayout() {
    const active = new Set();

    const scanContainer = (rows) => {
      for (const row of rows) {
        for (const comp of row.components) {
          active.add(comp.id);
        }
      }
    };

    scanContainer(this.layout.main);
    scanContainer(this.layout.left);
    scanContainer(this.layout.right);

    return active;
  }

  /**
   * Get available components (not in layout)
   */
  getAvailableComponents() {
    const inLayout = this.getActiveComponentsInLayout();
    const available = [];

    for (const key in this.componentRegistry) {
      if (!inLayout.has(key)) {
        available.push({
          id: key,
          ...this.componentRegistry[key],
        });
      }
    }

    return available;
  }

  /**
   * Add a component to the layout
   */
  addComponent(componentId, container = "main") {
    if (!this.componentRegistry[componentId]) return false;

    const targetLayout = this.layout[container];

    // Add to a new row at the bottom
    targetLayout.push({
      row: targetLayout.length,
      components: [{ id: componentId, slots: 1 }],
    });

    this.saveLayout();
    this.render();
    return true;
  }

  /**
   * Remove a component from the layout
   */
  removeComponent(componentId) {
    const removeFromContainer = (rows) => {
      for (let r = rows.length - 1; r >= 0; r--) {
        const row = rows[r];
        const compIndex = row.components.findIndex((c) => c.id === componentId);

        if (compIndex !== -1) {
          const totalSlotsInRow = row.components.reduce(
            (sum, c) => sum + c.slots,
            0
          );
          const componentSlots = row.components[compIndex].slots;

          // Remove the component
          row.components.splice(compIndex, 1);

          // Only remove the row if the component consumed the entire row
          if (
            row.components.length === 0 ||
            componentSlots >= this.settings.slotsPerRow
          ) {
            if (row.components.length === 0) {
              rows.splice(r, 1);
            }
          }

          // Hide the component element
          const compInfo = this.componentRegistry[componentId];
          if (compInfo) {
            const el = document.getElementById(compInfo.id);
            if (el) {
              el.style.display = "none";
            }
          }

          return true;
        }
      }
      return false;
    };

    if (removeFromContainer(this.layout.main)) {
      this.saveLayout();
      this.render();
      return true;
    }
    if (removeFromContainer(this.layout.left)) {
      this.saveLayout();
      this.render();
      return true;
    }
    if (removeFromContainer(this.layout.right)) {
      this.saveLayout();
      this.render();
      return true;
    }

    return false;
  }

  /**
   * Get component info for settings panel
   */
  getComponentsList() {
    const inLayout = this.getActiveComponentsInLayout();
    const list = [];

    for (const key in this.componentRegistry) {
      list.push({
        id: key,
        name: this.componentRegistry[key].name,
        icon: this.componentRegistry[key].icon,
        active: inLayout.has(key),
      });
    }

    return list;
  }
}

// Export for use
window.DockManager = DockManager;

/**
 * GridLayoutManager: docking items into the sidebar.
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

  undockAllSidebarItemsToGrid() {
    if (!this.grid) return;
    const zones = [
      this.getSidebarZone("left"),
      this.getSidebarZone("right"),
    ].filter(Boolean);

    zones.forEach((zone) => {
      Array.from(zone.querySelectorAll(":scope > .sidebar-slot")).forEach(
        (slot) => {
          const child = slot.querySelector(":scope > .grid-draggable");
          if (child) {
            this.resetSidebarWidthForElement(child, { keepSaved: true });
            child.classList.remove("sidebar-detached");
            this.grid.appendChild(child);
            this.ensureSidebarResizeHandles(child);
          }
          try {
            slot.remove();
          } catch (e) {}
        },
      );
    });

    this.updateSidebarZoneCounts();
  }

  dockElementToSidebar(el, side, index = null) {
    const zone = this.getSidebarZone(side);
    if (!zone || !el) return false;

    this.resetMiddleWidthForElement(el, {
      keepSaved: true,
      restoreDefaultFlex: false,
    });

    // Ensure element is not counted in grid
    el.classList.add("sidebar-detached");

    // Ensure element is draggable (for sidebar drag support)
    el.classList.add("grid-draggable");
    el.setAttribute("draggable", "false"); // We use custom drag

    // Ensure data-grid-id is set
    const id = el.id || el.dataset.gridId;
    if (id && !el.dataset.gridId) {
      el.dataset.gridId = id;
    }

    // Remove flex constraints so it can fit sidebar width
    el.style.flex = "";
    el.style.maxWidth = "";
    el.style.minWidth = "";
    this.ensureSidebarResizeHandles(el);

    const slot = document.createElement("div");
    slot.className = "sidebar-slot";
    slot.appendChild(el);

    if (typeof index === "number" && index >= 0) {
      const existing = Array.from(zone.children);
      if (existing[index]) zone.insertBefore(slot, existing[index]);
      else zone.appendChild(slot);
    } else {
      zone.appendChild(slot);
    }

    this.applySavedSidebarWidthToElement(el);

    return true;
  }

  cleanupEmptyRows() {
    if (!this.grid) return;

    this.grid.querySelectorAll(".grid-flex-row").forEach((row) => {
      row.classList.remove("grid-row-target");
      const visibleChildren = Array.from(row.children).filter(
        (el) =>
          el.classList &&
          el.classList.contains("grid-draggable") &&
          !this.isComponentHidden(el),
      );
      if (visibleChildren.length === 0) {
        // If it's an empty row (or only contains placeholders/markers), remove it.
        const hasReal = Array.from(row.children).some(
          (el) => el.classList && el.classList.contains("grid-draggable"),
        );
        if (!hasReal) {
          row.remove();
        }
      }
    });

    this.grid.querySelectorAll(".grid-flex-row-new").forEach((row) => {
      if (row.children.length === 0) row.remove();
    });
  }

  getSidebarZone(side) {
    if (side === "left") return document.getElementById("sidebarLeftZone");
    if (side === "right") return document.getElementById("sidebarRightZone");
    return null;
  }

  getSidebarZoneItemCount(zoneEl) {
    if (!zoneEl) return 0;
    return zoneEl.querySelectorAll(":scope > .sidebar-slot").length;
  }

  updateSidebarZoneCounts() {
    // Legacy no-op: old implementation toggled count-* classes.
    // Sidebar now supports infinite rows.
    return;
  }

  addSidebarDraggingClass() {
    const leftZone = this.getSidebarZone("left");
    const rightZone = this.getSidebarZone("right");
    if (leftZone) leftZone.classList.add("sidebar-is-dragging");
    if (rightZone) rightZone.classList.add("sidebar-is-dragging");
  }

  removeSidebarDraggingClass() {
    const leftZone = this.getSidebarZone("left");
    const rightZone = this.getSidebarZone("right");
    if (leftZone) leftZone.classList.remove("sidebar-is-dragging");
    if (rightZone) rightZone.classList.remove("sidebar-is-dragging");
  }

  disableSmoothScrollDuringDrag() {
    if (this.scrollBehaviorOverridden) return;
    const docEl = document.documentElement;
    const bodyEl = document.body;
    this.scrollBehaviorRestoreHtml = docEl.style.scrollBehavior;
    this.scrollBehaviorRestoreBody = bodyEl.style.scrollBehavior;
    docEl.style.scrollBehavior = "auto";
    bodyEl.style.scrollBehavior = "auto";
    this.scrollBehaviorOverridden = true;
  }

  restoreSmoothScrollAfterDrag() {
    if (!this.scrollBehaviorOverridden) return;
    const docEl = document.documentElement;
    const bodyEl = document.body;
    docEl.style.scrollBehavior = this.scrollBehaviorRestoreHtml || "";
    bodyEl.style.scrollBehavior = this.scrollBehaviorRestoreBody || "";
    this.scrollBehaviorRestoreHtml = null;
    this.scrollBehaviorRestoreBody = null;
    this.scrollBehaviorOverridden = false;
  }

  clearSidebarDropTarget() {
    this.sidebarDropTarget = null;
    this.sidebarDropIndex = null;
    ["sidebarLeftZone", "sidebarRightZone"].forEach((id) => {
      const zone = document.getElementById(id);
      if (zone) zone.classList.remove("sidebar-drop-target");
    });
    // Remove sidebar placeholder if it exists
    this.removeSidebarPlaceholder();
  }

  createSidebarPlaceholder() {
    if (!this.sidebarPlaceholder) {
      this.sidebarPlaceholder = document.createElement("div");
      this.sidebarPlaceholder.className = "sidebar-placeholder";
      // Use the dragged item's height as a reference for the placeholder
      if (this.draggedItemRect) {
        this.sidebarPlaceholder.style.minHeight = `${Math.min(
          this.draggedItemRect.height,
          150,
        )}px`;
      } else {
        this.sidebarPlaceholder.style.minHeight = "100px";
      }
    }
    return this.sidebarPlaceholder;
  }

  removeSidebarPlaceholder() {
    if (this.sidebarPlaceholder) {
      try {
        this.sidebarPlaceholder.remove();
      } catch (e) {}
      this.sidebarPlaceholder = null;
    }
  }
});

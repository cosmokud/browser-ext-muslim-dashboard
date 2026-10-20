/**
 * GridLayoutManager: sidebar drop placeholder.
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

  updateSidebarPlaceholder(zone, insertIndex) {
    if (!zone) {
      this.removeSidebarPlaceholder();
      return;
    }

    const placeholder = this.createSidebarPlaceholder();
    const slots = Array.from(zone.querySelectorAll(":scope > .sidebar-slot"));

    // Calculate the target element to insert before
    const targetSlot = slots[insertIndex] || null;

    // If placeholder is already in the correct position, skip DOM manipulation
    if (placeholder.parentNode === zone) {
      const nextSibling = placeholder.nextElementSibling;
      // If target is null (insert at end) and placeholder is at end
      // Or if target matches the next sibling, we're already in position
      if (targetSlot === null && nextSibling === null) {
        return;
      }
      if (targetSlot && nextSibling === targetSlot) {
        return;
      }
    }

    // Remove from current position if it's in a different zone
    if (placeholder.parentNode && placeholder.parentNode !== zone) {
      placeholder.remove();
    }

    // Insert at the correct position
    if (targetSlot) {
      zone.insertBefore(placeholder, targetSlot);
    } else {
      zone.appendChild(placeholder);
    }
  }

  getSidebarInsertionIndex(zoneEl, clientY) {
    if (!zoneEl) return 0;
    const slots = Array.from(zoneEl.querySelectorAll(":scope > .sidebar-slot"));
    if (slots.length === 0) return 0;

    for (let i = 0; i < slots.length; i++) {
      const rect = slots[i].getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (clientY < mid) return i;
    }

    return slots.length;
  }

  updateSidebarDropTarget(clientX, clientY) {
    const leftZone = this.getSidebarZone("left");
    const rightZone = this.getSidebarZone("right");

    // If zones aren't present/visible, clear and skip
    if (!leftZone || !rightZone) {
      this.clearSidebarDropTarget();
      return;
    }

    let targetZone = null;
    let targetSide = null;

    // Prefer DOM hit-testing (more reliable than rect math when zones contain content)
    try {
      const elAtPoint = document.elementFromPoint(clientX, clientY);
      const zoneAtPoint = elAtPoint?.closest?.(
        "#sidebarLeftZone, #sidebarRightZone",
      );
      if (zoneAtPoint === leftZone) {
        targetZone = leftZone;
        targetSide = "left";
      } else if (zoneAtPoint === rightZone) {
        targetZone = rightZone;
        targetSide = "right";
      }
    } catch (e) {
      // Fall back to rect-based hit testing below
    }

    // Fallback to rect-based hit testing if elementFromPoint didn't find a zone
    if (!targetZone) {
      const leftRect = leftZone.getBoundingClientRect();
      const rightRect = rightZone.getBoundingClientRect();

      const inLeft =
        clientX >= leftRect.left &&
        clientX <= leftRect.right &&
        clientY >= leftRect.top &&
        clientY <= leftRect.bottom;

      const inRight =
        clientX >= rightRect.left &&
        clientX <= rightRect.right &&
        clientY >= rightRect.top &&
        clientY <= rightRect.bottom;

      if (inLeft) {
        targetZone = leftZone;
        targetSide = "left";
      } else if (inRight) {
        targetZone = rightZone;
        targetSide = "right";
      }
    }

    // If not hovering over any sidebar zone, clear and exit
    if (!targetZone) {
      this.clearSidebarDropTarget();
      return;
    }

    // Remove highlight from the other zone if switching sides
    if (this.sidebarDropTarget && this.sidebarDropTarget !== targetSide) {
      const otherZone = this.getSidebarZone(this.sidebarDropTarget);
      if (otherZone) otherZone.classList.remove("sidebar-drop-target");
    }

    // Update state
    this.sidebarDropTarget = targetSide;
    this.sidebarDropIndex = this.getSidebarInsertionIndex(targetZone, clientY);
    targetZone.classList.add("sidebar-drop-target");
    this.updateSidebarPlaceholder(targetZone, this.sidebarDropIndex);
  }

  updateFlexBasisForCurrentDOM() {
    if (!this.grid) return;

    // Recompute responsive spans, but do not rebuild rows.
    this.calculateResponsiveLayout();

    // Force a full repack when narrow-container mode is active so
    // 2-span cards cannot remain side-by-side in existing rows.
    if (this.shouldForceSingleRowLayoutForThreeItemComponents()) {
      this.recalculateLayout();
      return;
    }

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
    this.applySavedMiddleWidthsFromDOM();
  }
});

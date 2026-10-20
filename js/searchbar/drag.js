/**
 * SearchBarManager: engine tab dragging.
 * Part of the class declared in js/searchbar/index.js; load this after it.
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
})(SearchBarManager.prototype, class {

  _getEngineTabElements() {
    if (!this.strip) return [];
    return Array.from(this.strip.querySelectorAll(".search-bar-engine-tab"));
  }

  _captureEngineRects(excludeDragging = true) {
    const rects = new Map();
    for (const el of this._getEngineTabElements()) {
      if (excludeDragging && el.classList.contains("dragging")) continue;
      const id = el.getAttribute("data-id");
      if (id == null) continue;
      rects.set(String(id), el.getBoundingClientRect());
    }
    return rects;
  }

  _syncDomOrderToSearches() {
    if (!this.strip) return;
    const existing = new Map(
      this._getEngineTabElements().map((el) => [
        String(el.getAttribute("data-id")),
        el,
      ]),
    );

    const frag = document.createDocumentFragment();
    for (const engine of this.searches) {
      const el = existing.get(String(engine.id));
      if (el) frag.appendChild(el);
    }
    this.strip.appendChild(frag);
  }

  _animateFlip(beforeRects) {
    if (!this.strip) return;
    const elements = this._getEngineTabElements().filter(
      (el) => !el.classList.contains("dragging"),
    );

    for (const el of elements) {
      const id = String(el.getAttribute("data-id"));
      const before = beforeRects.get(id);
      if (!before) continue;
      const after = el.getBoundingClientRect();
      const dx = before.left - after.left;
      const dy = before.top - after.top;
      if (dx === 0 && dy === 0) continue;

      el.style.transition = "transform 0s";
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    }

    // Force style flush
    void this.strip.offsetHeight;

    requestAnimationFrame(() => {
      const elements2 = this._getEngineTabElements().filter(
        (el) => !el.classList.contains("dragging"),
      );
      for (const el of elements2) {
        if (!el.style.transform) continue;
        el.style.transition = `transform ${this.flipDurationMs}ms ${this.flipEasing}`;
        el.style.transform = "";
        window.setTimeout(() => {
          el.style.transition = "";
        }, this.flipDurationMs + 30);
      }
    });
  }

  _getClosestNonDraggingEngineAtPoint(x, y) {
    const direct = document
      .elementFromPoint(x, y)
      ?.closest(".search-bar-engine-tab");
    if (direct && !direct.classList.contains("dragging")) return direct;

    const items = this._getEngineTabElements().filter(
      (el) => !el.classList.contains("dragging"),
    );
    let best = null;
    let bestDist = Infinity;
    for (const el of items) {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (d < bestDist) {
        bestDist = d;
        best = el;
      }
    }
    return best;
  }

  _maybeReorderEngineAtPoint(x, y) {
    if (!this.draggedEngine || !this.strip) return;

    const targetEl = this._getClosestNonDraggingEngineAtPoint(x, y);

    // Clear previous hover state
    this.strip
      .querySelectorAll(".search-bar-engine-tab.drag-over")
      .forEach((el) => el.classList.remove("drag-over"));

    if (!targetEl) {
      this.currentDropTarget = null;
      return;
    }

    const targetId = String(targetEl.getAttribute("data-id"));
    const targetEngine = this.searches.find((s) => String(s.id) === targetId);
    if (
      !targetEngine ||
      String(targetEngine.id) === String(this.draggedEngine.id)
    ) {
      this.currentDropTarget = null;
      return;
    }

    const draggedIndex = this.searches.findIndex(
      (s) => String(s.id) === String(this.draggedEngine.id),
    );
    const targetIndex = this.searches.findIndex(
      (s) => String(s.id) === String(targetEngine.id),
    );
    if (draggedIndex === -1 || targetIndex === -1) return;

    const rect = targetEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const deadZone = rect.width * 0.08;

    let insertionIndex = targetIndex;
    if (x > centerX + deadZone) insertionIndex = targetIndex + 1;
    else if (x < centerX - deadZone) insertionIndex = targetIndex;
    else {
      targetEl.classList.add("drag-over");
      this.currentDropTarget = targetEngine;
      return;
    }

    let toIndex = insertionIndex;
    if (toIndex > draggedIndex) toIndex -= 1;
    toIndex = Math.max(0, Math.min(this.searches.length - 1, toIndex));

    targetEl.classList.add("drag-over");
    this.currentDropTarget = targetEngine;
    if (toIndex === draggedIndex) return;

    const beforeRects = this._captureEngineRects(true);
    const [moved] = this.searches.splice(draggedIndex, 1);
    this.searches.splice(toIndex, 0, moved);
    this._syncDomOrderToSearches();
    this._animateFlip(beforeRects);
  }

  _createEngineDragGhost(engine, sourceElement) {
    const ghost = document.createElement("div");
    // Reuse the same visual/animation as Pinned Apps
    ghost.className = "pinned-app-drag-ghost search-bar-drag-ghost";

    // Size: ~110% of the actual circular tab
    try {
      const r = sourceElement.getBoundingClientRect();
      const base = Math.max(1, Math.min(r.width, r.height));
      const size = Math.max(24, Math.round(base * 1.1));
      ghost.style.width = `${size}px`;
      ghost.style.height = `${size}px`;
      ghost.style.borderRadius = "9999px";

      // Cancel the default pinned ghost scaling (we already sized it up)
      ghost.style.transform = "translate(-50%, -50%)";
    } catch (e) {}

    const iconEl = sourceElement.querySelector(".search-bar-engine-icon");
    const imgEl = iconEl?.querySelector("img");
    const fallbackEl = iconEl?.querySelector(".search-bar-engine-fallback");

    if (imgEl && imgEl.style.display !== "none") {
      const imgClone = imgEl.cloneNode(true);
      imgClone.draggable = false;
      ghost.appendChild(imgClone);
    } else if (fallbackEl) {
      // Use pinned-app fallback styling to match the ghost
      const fallbackClone = document.createElement("span");
      fallbackClone.className = "pinned-app-fallback";
      fallbackClone.textContent =
        fallbackEl.textContent || engine.name.charAt(0).toUpperCase();
      ghost.appendChild(fallbackClone);
    } else {
      const fallbackClone = document.createElement("span");
      fallbackClone.className = "pinned-app-fallback";
      fallbackClone.textContent = engine.name.charAt(0).toUpperCase();
      ghost.appendChild(fallbackClone);
    }

    document.body.appendChild(ghost);
    return ghost;
  }

  _updateEngineDragPosition() {
    if (!this.dragGhost) return;
    this.dragGhost.style.left = `${this.currentX}px`;
    this.dragGhost.style.top = `${this.currentY}px`;
  }

  _startEngineDragVisuals() {
    if (!this.draggedElement || !this.draggedEngine) return;

    this.dragGhost = this._createEngineDragGhost(
      this.draggedEngine,
      this.draggedElement,
    );
    this._updateEngineDragPosition();

    this.draggedElement.classList.add("dragging");
    this.strip?.classList.add("is-dragging");

    // Prevent the click that fires after a drag
    this.blockNextClick = true;
    if (this.blockNextClickTimer) {
      window.clearTimeout(this.blockNextClickTimer);
    }
    this.blockNextClickTimer = window.setTimeout(() => {
      this.blockNextClick = false;
      this.blockNextClickTimer = null;
    }, 600);

    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
  }

  _queueEngineDragFrame() {
    if (this.dragFrameRequested) return;
    this.dragFrameRequested = true;

    requestAnimationFrame(() => {
      this.dragFrameRequested = false;
      if (!this.isDragging) return;

      this.currentX = this.pendingX;
      this.currentY = this.pendingY;
      this._updateEngineDragPosition();
      this._maybeReorderEngineAtPoint(this.currentX, this.currentY);
    });
  }

  _handleEngineDragStart(e, engine, el) {
    if (e.button !== 0) return;

    this.startX = e.clientX;
    this.startY = e.clientY;
    this.currentX = e.clientX;
    this.currentY = e.clientY;
    this.draggedEngine = engine;
    this.draggedElement = el;
    this.isDragging = false;

    document.addEventListener("mousemove", this.boundHandleMouseMove);
    document.addEventListener("mouseup", this.boundHandleMouseUp);
  }

  _handleEngineMouseMove(e) {
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    if (!this.isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      this.isDragging = true;
      this._startEngineDragVisuals();
    }

    if (this.isDragging) {
      e.preventDefault();
      this.pendingX = e.clientX;
      this.pendingY = e.clientY;
      this._queueEngineDragFrame();
    }
  }

  _handleEngineMouseUp(e) {
    document.removeEventListener("mousemove", this.boundHandleMouseMove);
    document.removeEventListener("mouseup", this.boundHandleMouseUp);

    if (this.isDragging) {
      e.preventDefault();
      this._endEngineDrag();
    }

    this.isDragging = false;
    this.draggedEngine = null;
    this.draggedElement = null;
  }

  _handleEngineTouchStart(e, engine, el) {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.currentX = touch.clientX;
    this.currentY = touch.clientY;
    this.draggedEngine = engine;
    this.draggedElement = el;
    this.isDragging = false;

    document.addEventListener("touchmove", this.boundHandleTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", this.boundHandleTouchEnd);
    document.addEventListener("touchcancel", this.boundHandleTouchEnd);
  }

  _handleEngineTouchMove(e) {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - this.startX;
    const dy = touch.clientY - this.startY;
    if (!this.isDragging && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      this.isDragging = true;
      e.preventDefault();
      this._startEngineDragVisuals();
    }
    if (this.isDragging) {
      e.preventDefault();
      this.pendingX = touch.clientX;
      this.pendingY = touch.clientY;
      this._queueEngineDragFrame();
    }
  }

  _handleEngineTouchEnd(e) {
    document.removeEventListener("touchmove", this.boundHandleTouchMove);
    document.removeEventListener("touchend", this.boundHandleTouchEnd);
    document.removeEventListener("touchcancel", this.boundHandleTouchEnd);

    if (this.isDragging) {
      this._endEngineDrag();
    }

    this.isDragging = false;
    this.draggedEngine = null;
    this.draggedElement = null;
  }

  _endEngineDrag() {
    // Remove ghost
    if (this.dragGhost) {
      this.dragGhost.classList.add("dropping");
      setTimeout(() => {
        if (this.dragGhost && this.dragGhost.parentNode) {
          this.dragGhost.parentNode.removeChild(this.dragGhost);
        }
        this.dragGhost = null;
      }, 200);
    }

    // Persist the live-updated order
    this.persist();

    // Cleanup
    this.strip
      ?.querySelectorAll(".search-bar-engine-tab")
      .forEach((item) => item.classList.remove("dragging", "drag-over"));
    this.strip?.classList.remove("is-dragging");

    document.body.style.userSelect = "";
    document.body.style.webkitUserSelect = "";

    this.currentDropTarget = null;

    // Keep selection visible after reorder
    this.ensureSelectionInView();
    this.updateStripTransform();
    this.updateSelectionUi();
  }
});

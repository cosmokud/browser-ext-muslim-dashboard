/**
 * FloatingModeManager, part 3 of 3.
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

  updateButton(key) {
    const st = this.runtime.get(key);
    if (!st || !st.button) return;

    const desired = this.isEnabledDesired(key);
    const quranFocusModeActive = this.isQuranFocusModeActive();
    const momentModeActive = this.isMomentModeActive();
    const active = desired && !this.isViewportSuspended && !st.spaceSuspended;

    st.button.classList.toggle("active", active);
    st.button.setAttribute("aria-pressed", active ? "true" : "false");

    // Keep the button clickable even when suspended so users can still
    // toggle their preference (it will auto-apply when space/viewport allows).
    try {
      st.button.disabled = false;
      st.button.removeAttribute("aria-disabled");
    } catch (e) {
      this.debugLog(`updateButton disabled state failed for ${key}`, e);
    }

    if (quranFocusModeActive) {
      st.button.setAttribute(
        "title",
        desired
          ? "Floating will apply after exiting Quran Focus Mode"
          : "Toggle Floating Mode (applies after exiting Quran Focus Mode)",
      );
    } else if (momentModeActive) {
      st.button.setAttribute(
        "title",
        desired
          ? "Floating will apply after exiting Moment Mode"
          : "Toggle Floating Mode (applies after exiting Moment Mode)",
      );
    } else if (this.isViewportSuspended) {
      st.button.setAttribute(
        "title",
        desired
          ? "Floating will activate when screen is wider"
          : "Floating is unavailable on small screens",
      );
    } else if (desired && st.spaceSuspended) {
      st.button.setAttribute(
        "title",
        "Not enough space for Floating Mode at this viewport width",
      );
    } else {
      st.button.setAttribute("title", "Toggle Floating Mode");
    }
  }

  applyOne(key) {
    const st = this.runtime.get(key);
    if (!st) return;

    // Keep mode-managed layouts stable: do not mutate runtime floating state
    // while active.
    if (this.isRuntimeModeDeferred()) {
      this.updateButton(key);
      return;
    }

    if (this.isViewportSuspended) {
      this.disableFloatingRuntime(key);
      this.updateButton(key);
      return;
    }

    const desired = this.isEnabledDesired(key);
    if (desired) {
      this.enableFloatingRuntime(key);
    } else {
      st.spaceSuspended = false;
      this.disableFloatingRuntime(key);
    }

    this.updateButton(key);
  }

  enableFloatingRuntime(key) {
    const st = this.runtime.get(key);
    if (!st || !st.card) return;

    const card = st.card;

    // When resizing around the horizontal-space threshold, a recent collapse can
    // leave a fading proxy clone visible. Remove it immediately before re-floating.
    this.removeCollapseProxy(key);

    // If the card is mid "tiling" fade-in, clear that animation before detaching.
    try {
      card.classList.remove("tiling-collapse-in");
      card.classList.remove("floating-collapse-out");
    } catch (e) {}

    const cfg =
      this.getStoredBox(key) || this.getSettings()?.floating?.[key] || {};
    const left = this.safeNumber(cfg.left, 40);
    const top = this.safeNumber(cfg.top, 120);
    const maxFloatingWidth = Math.max(
      280,
      Math.floor(window.innerWidth - this.viewportPadding * 2),
    );
    const width = this.clamp(
      this.safeNumber(cfg.width, 420),
      280,
      maxFloatingWidth,
    );
    const height = this.safeNumber(cfg.height, 520);
    const z = this.safeNumber(cfg.z, 10);

    // If space is constrained, width above has already been clamped to a safe
    // viewport-fit value so toggling still works without needing a full reload.
    if (!this.hasHorizontalSpace(width)) {
      st.spaceSuspended = true;
      // If it was already floating, restore it to tiling.
      this.disableFloatingRuntime(key);
      this.updateButton(key);
      return;
    }

    st.spaceSuspended = false;

    // Already floating
    if (card.classList.contains("floating-card")) {
      // Ensure position is clamped, but do NOT persist auto moves.
      this.clampCardToViewport(key, { persist: false });
      // If there's no longer enough space for floating, cancel it.
      this.enforceHorizontalSpace(key);
      return;
    }

    // Record original position and insert placeholder
    this._captureFloatingLayoutAnchor(key, card);

    st.originalParent = card.parentNode;
    st.originalNextSibling = card.nextSibling;

    try {
      st.originalParent.insertBefore(st.placeholder, st.originalNextSibling);
    } catch (e) {
      // If insertBefore fails, fallback to append
      try {
        st.originalParent.appendChild(st.placeholder);
      } catch (e2) {}
    }

    // Persist a restore anchor so we can recover exact origin even if
    // placeholder/original parent is lost after layout rebuilds.
    this._persistRestoreAnchor(key, card, st);

    // Detach and float
    document.body.appendChild(card);
    card.classList.add("floating-card");

    this.ensureCollapseButton(key);
    this.ensureResizeHandles(key);

    this.notifyLayoutChanged();

    // Safe startup animation (no transforms)
    card.classList.remove("floating-animate-in");
    // Force reflow so re-adding the class retriggers animation reliably
    try {
      void card.offsetWidth;
    } catch (e) {}
    card.classList.add("floating-animate-in");
    const onAnimEnd = (e) => {
      if (e && e.target !== card) return;
      card.classList.remove("floating-animate-in");
      card.removeEventListener("animationend", onAnimEnd);
    };
    card.addEventListener("animationend", onAnimEnd);
    // Fallback: remove class even if animationend doesn't fire
    window.setTimeout(() => {
      try {
        card.classList.remove("floating-animate-in");
        card.removeEventListener("animationend", onAnimEnd);
      } catch (e) {}
    }, 500);

    card.style.position = "fixed";
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
    card.style.width = `${width}px`;
    card.style.height = `${height}px`;
    card.style.zIndex = String(z);

    // Use custom edge resize handles (sides + bottom corners) for consistent UX.
    card.style.resize = "none";
    const keepOverflowVisible =
      card.id === "notesCard" || card.id === "fastingCard";
    card.style.overflow = keepOverflowVisible ? "visible" : "hidden";

    // Prevent resizing below content (no scrollbars). Will be refined dynamically.
    card.style.minWidth = "280px";
    card.style.minHeight = "200px";

    // Dragging
    const handleSelector = this.targets[key]?.handleSelector;
    const handle =
      (handleSelector ? card.querySelector(handleSelector) : null) ||
      card.querySelector(".card-header") ||
      card;
    handle.style.cursor = "move";
    // Allow normal taps/clicks; we only preventDefault when actually dragging
    handle.style.touchAction = "manipulation";

    const onPointerDown = (e) => {
      if (!card.classList.contains("floating-card")) return;
      if (e.button !== undefined && e.button !== 0) return;
      if (st.resizing) return;

      if (e.target && e.target.closest(".floating-resize-handle")) {
        return;
      }

      // Don't hijack interactions
      if (
        e.target &&
        e.target.closest("button, a, input, textarea, select, [role='button']")
      ) {
        return;
      }

      e.preventDefault();

      const rect = card.getBoundingClientRect();
      const styleLeft = parseFloat(card.style.left);
      const styleTop = parseFloat(card.style.top);
      const pointerX = e.clientX;
      const pointerY = e.clientY;
      st.dragging = {
        startX: pointerX,
        startY: pointerY,
        startLeft: Number.isFinite(styleLeft) ? styleLeft : rect.left,
        startTop: Number.isFinite(styleTop) ? styleTop : rect.top,
      };

      st.userMovedSinceLastSave = false;

      try {
        handle.setPointerCapture(e.pointerId);
      } catch (err) {}

      // Bring to front on grab
      this.bumpZIndex(key);

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp, { once: true });
      document.addEventListener("pointercancel", onPointerUp, { once: true });
    };

    const onResizePointerMove = (e) => {
      if (!st.resizing || !card.classList.contains("floating-card")) return;
      if (
        typeof st.resizing.pointerId === "number" &&
        typeof e.pointerId === "number" &&
        e.pointerId !== st.resizing.pointerId
      ) {
        return;
      }

      const dx = e.clientX - st.resizing.startX;
      const dy = e.clientY - st.resizing.startY;
      const direction = st.resizing.direction;

      const pad = this.viewportPadding;
      const maxRight = window.innerWidth - pad;
      const maxBottom = window.innerHeight - pad;

      const minWidth = Math.max(
        280,
        this.safeNumber(parseFloat(card.style.minWidth), 280),
      );
      const minHeight = Math.max(
        200,
        this.safeNumber(parseFloat(card.style.minHeight), 200),
      );
      const maxWidth = Math.max(
        minWidth,
        Math.floor(window.innerWidth - pad * 2),
      );
      const maxHeight = Math.max(
        minHeight,
        Math.floor(window.innerHeight - pad * 2),
      );

      let nextLeft = st.resizing.startLeft;
      let nextWidth = st.resizing.startWidth;
      let nextHeight = st.resizing.startHeight;

      if (direction.includes("w")) {
        const startRight = st.resizing.startLeft + st.resizing.startWidth;
        const maxLeft = startRight - minWidth;
        const rawLeft = st.resizing.startLeft + dx;
        nextLeft = this.clamp(rawLeft, pad, maxLeft);
        nextWidth = this.clamp(startRight - nextLeft, minWidth, maxWidth);
        nextLeft = startRight - nextWidth;
      }

      if (direction.includes("e")) {
        const maxWidthByRightEdge = Math.max(
          minWidth,
          Math.floor(maxRight - st.resizing.startLeft),
        );
        nextWidth = this.clamp(
          st.resizing.startWidth + dx,
          minWidth,
          Math.min(maxWidth, maxWidthByRightEdge),
        );
      }

      if (direction.includes("s")) {
        const maxHeightByBottomEdge = Math.max(
          minHeight,
          Math.floor(maxBottom - st.resizing.startTop),
        );
        nextHeight = this.clamp(
          st.resizing.startHeight + dy,
          minHeight,
          Math.min(maxHeight, maxHeightByBottomEdge),
        );
      }

      if (
        Math.abs(nextLeft - st.resizing.startLeft) > 0.5 ||
        Math.abs(nextWidth - st.resizing.startWidth) > 0.5 ||
        Math.abs(nextHeight - st.resizing.startHeight) > 0.5
      ) {
        st.userMovedSinceLastSave = true;
      }

      card.style.left = `${Math.round(nextLeft)}px`;
      card.style.width = `${Math.round(nextWidth)}px`;
      card.style.height = `${Math.round(nextHeight)}px`;

      this.scheduleSave(key);
    };

    const onResizePointerUp = (e) => {
      if (st.resizing) {
        if (
          typeof st.resizing.pointerId === "number" &&
          typeof e?.pointerId === "number" &&
          e.pointerId !== st.resizing.pointerId
        ) {
          return;
        }

        document.removeEventListener("pointermove", onResizePointerMove);
        document.removeEventListener("pointerup", onResizePointerUp);
        document.removeEventListener("pointercancel", onResizePointerUp);

        st.resizing = null;
        st.userResizing = false;

        // User-driven: clamp + persist final geometry.
        this.clampCardToViewport(key, { persist: true });
        this.scheduleMinUpdate(key);
        this.flushSave(key, { force: true });
      }
    };

    const onCardPointerDownForResize = (e) => {
      if (!card.classList.contains("floating-card")) return;
      if (e.button !== undefined && e.button !== 0) return;
      if (typeof e.clientX !== "number" || typeof e.clientY !== "number")
        return;
      if (st.dragging || st.resizing) return;

      const interactiveTarget = e.target?.closest(
        ".floating-collapse-btn, .floating-reset-size-btn, button, a, input, textarea, select, [role='button']",
      );
      if (interactiveTarget) return;

      const handleDir = String(
        e.target?.closest(".floating-resize-handle")?.dataset?.resizeDir || "",
      ).trim();
      const direction =
        handleDir ||
        this.getResizeDirectionForPointer(card, e.clientX, e.clientY);
      if (!direction) return;

      e.preventDefault();
      e.stopPropagation();

      const rect = card.getBoundingClientRect();
      const styleLeft = parseFloat(card.style.left);
      const styleTop = parseFloat(card.style.top);
      const styleWidth = parseFloat(card.style.width);
      const styleHeight = parseFloat(card.style.height);

      st.userResizing = true;
      st.userMovedSinceLastSave = false;
      st.resizing = {
        pointerId: typeof e.pointerId === "number" ? e.pointerId : null,
        direction,
        startX: e.clientX,
        startY: e.clientY,
        startLeft: Number.isFinite(styleLeft) ? styleLeft : rect.left,
        startTop: Number.isFinite(styleTop) ? styleTop : rect.top,
        startWidth: Number.isFinite(styleWidth) ? styleWidth : rect.width,
        startHeight: Number.isFinite(styleHeight) ? styleHeight : rect.height,
      };

      this.bumpZIndex(key);

      try {
        card.setPointerCapture(e.pointerId);
      } catch (err) {}

      document.addEventListener("pointermove", onResizePointerMove);
      document.addEventListener("pointerup", onResizePointerUp);
      document.addEventListener("pointercancel", onResizePointerUp);
    };

    const onCardPointerMoveForResizeCursor = (e) => {
      if (!card.classList.contains("floating-card")) return;
      if (st.dragging || st.resizing) return;

      const direction = this.getResizeDirectionForPointer(
        card,
        e.clientX,
        e.clientY,
      );
      const cursor = this.getResizeCursor(direction);
      card.style.cursor = cursor;
    };

    const onCardPointerLeaveForResizeCursor = () => {
      if (st.dragging || st.resizing) return;
      card.style.cursor = "";
    };

    const onAnyPointerUpClearResize = () => {
      if (!st.resizing) {
        st.userResizing = false;
      }
    };

    const onPointerMove = (e) => {
      if (!st.dragging) return;
      const dx = e.clientX - st.dragging.startX;
      const dy = e.clientY - st.dragging.startY;

      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        st.userMovedSinceLastSave = true;
      }

      const nextLeft = st.dragging.startLeft + dx;
      const nextTop = st.dragging.startTop + dy;

      card.style.left = `${nextLeft}px`;
      card.style.top = `${nextTop}px`;

      // Persist drag position while moving (throttled) so position survives even
      // if pointerup is missed or the tab closes mid-drag.
      this.scheduleDragPersist(key);
    };

    const onPointerUp = () => {
      document.removeEventListener("pointermove", onPointerMove);
      st.dragging = null;
      // User-driven: clamp + persist final position.
      this.clampCardToViewport(key, { persist: true });
      this.flushSave(key, { force: true });
    };

    // Store handlers for cleanup
    st._floatingHandle = handle;
    st._onPointerDown = onPointerDown;
    st._onCardPointerDownForResize = onCardPointerDownForResize;
    st._onCardPointerMoveForResizeCursor = onCardPointerMoveForResizeCursor;
    st._onCardPointerLeaveForResizeCursor = onCardPointerLeaveForResizeCursor;
    st._onAnyPointerUpClearResize = onAnyPointerUpClearResize;
    st._onResizePointerMove = onResizePointerMove;
    st._onResizePointerUp = onResizePointerUp;
    handle.addEventListener("pointerdown", onPointerDown);
    card.addEventListener("pointerdown", onCardPointerDownForResize);
    card.addEventListener("pointermove", onCardPointerMoveForResizeCursor);
    card.addEventListener("pointerleave", onCardPointerLeaveForResizeCursor);
    document.addEventListener("pointerup", onAnyPointerUpClearResize);
    document.addEventListener("pointercancel", onAnyPointerUpClearResize);

    // Resize persistence
    if (typeof ResizeObserver !== "undefined") {
      st.resizeObserver = new ResizeObserver(() => {
        if (!card.classList.contains("floating-card")) return;
        if (this.isPersistenceSuppressed(key)) return;
        this.scheduleSave(key);
        this.scheduleMinUpdate(key);
      });
      st.resizeObserver.observe(card);
    }

    // Content changes can alter the required minimum size
    if (typeof MutationObserver !== "undefined") {
      st.mutationObserver = new MutationObserver(() => {
        if (!card.classList.contains("floating-card")) return;

        if (st.mutationDebounceTimer) return;
        st.mutationDebounceTimer = window.setTimeout(() => {
          st.mutationDebounceTimer = null;
          if (!card.classList.contains("floating-card")) return;
          this.scheduleMinUpdate(key);
        }, 60);
      });
      st.mutationObserver.observe(card, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
      });
    }

    // Compute min sizes based on current content and ensure height is not below content
    this.scheduleMinUpdate(key);

    // Persist the configured box once on enable, but do NOT persist any
    // automatic clamping that might be required for the current viewport.
    this.flushSave(key);
    this.clampCardToViewport(key, { persist: false });
  }

  disableFloatingRuntime(key) {
    const st = this.runtime.get(key);
    if (!st || !st.card) return;

    const card = st.card;

    // If not floating, just update button state
    if (!card.classList.contains("floating-card")) {
      this.updateButton(key);
      return;
    }

    // If a collapse is already scheduled, don't double-run it.
    if (st.collapseTimer) return;

    // Remove any previous proxy clone so we never stack fade-outs.
    this.removeCollapseProxy(key);

    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Cleanup handlers
    try {
      if (st._floatingHandle && st._onPointerDown) {
        st._floatingHandle.removeEventListener(
          "pointerdown",
          st._onPointerDown,
        );
      }
    } catch (e) {}

    try {
      if (st.card && st._onCardPointerDownForResize) {
        st.card.removeEventListener(
          "pointerdown",
          st._onCardPointerDownForResize,
        );
      }
    } catch (e) {}

    try {
      if (st.card && st._onCardPointerMoveForResizeCursor) {
        st.card.removeEventListener(
          "pointermove",
          st._onCardPointerMoveForResizeCursor,
        );
      }
      if (st.card && st._onCardPointerLeaveForResizeCursor) {
        st.card.removeEventListener(
          "pointerleave",
          st._onCardPointerLeaveForResizeCursor,
        );
      }
      st.card.style.cursor = "";
    } catch (e) {}

    try {
      if (st._onAnyPointerUpClearResize) {
        document.removeEventListener(
          "pointerup",
          st._onAnyPointerUpClearResize,
        );
        document.removeEventListener(
          "pointercancel",
          st._onAnyPointerUpClearResize,
        );
      }

      if (st._onResizePointerMove) {
        document.removeEventListener("pointermove", st._onResizePointerMove);
      }
      if (st._onResizePointerUp) {
        document.removeEventListener("pointerup", st._onResizePointerUp);
        document.removeEventListener("pointercancel", st._onResizePointerUp);
      }
    } catch (e) {}

    st._floatingHandle = null;
    st._onPointerDown = null;
    st._onCardPointerDownForResize = null;
    st._onCardPointerMoveForResizeCursor = null;
    st._onCardPointerLeaveForResizeCursor = null;
    st._onAnyPointerUpClearResize = null;
    st._onResizePointerMove = null;
    st._onResizePointerUp = null;
    st.resizing = null;
    st.userResizing = false;

    if (st.resizeObserver) {
      try {
        st.resizeObserver.disconnect();
      } catch (e) {}
      st.resizeObserver = null;
    }

    if (st.mutationObserver) {
      try {
        st.mutationObserver.disconnect();
      } catch (e) {}
      st.mutationObserver = null;
    }

    if (st.minUpdateRaf) {
      try {
        cancelAnimationFrame(st.minUpdateRaf);
      } catch (e) {}
      st.minUpdateRaf = null;
    }

    if (st.minUpdateTimer) {
      try {
        clearTimeout(st.minUpdateTimer);
      } catch (e) {}
      st.minUpdateTimer = null;
    }

    if (st.mutationDebounceTimer) {
      try {
        clearTimeout(st.mutationDebounceTimer);
      } catch (e) {}
      st.mutationDebounceTimer = null;
    }

    const finalizeRestoreToTiling = () => {
      // Button only exists in floating mode
      this.removeCollapseButton(key);
      this.removeResizeHandles(key);

      // Restore to original position using placeholder (while still floating),
      // then clear floating styles so it participates in the tiling layout.
      const placeholder = st.placeholder;
      let inserted = false;

      const gridLayoutActive = this._isGridLayoutActive();
      const quranFocusModeActive = this.isQuranFocusModeActive();
      const placeholderParent = placeholder?.parentNode || null;
      const restoreToSidebarSlot =
        card.classList.contains("sidebar-detached") ||
        !!placeholderParent?.closest?.(".sidebar-zone") ||
        !!st.originalParent?.closest?.(".sidebar-zone") ||
        placeholderParent?.classList?.contains("sidebar-slot") === true ||
        st.originalParent?.classList?.contains("sidebar-slot") === true;
      const placeholderInSidebarContext =
        placeholderParent?.classList?.contains("sidebar-slot") === true ||
        placeholderParent?.classList?.contains("sidebar-zone") === true ||
        !!placeholderParent?.closest?.(".sidebar-slot, .sidebar-zone");

      // Strategy 1 (PRIMARY): Apply explicit layout rules for floating -> tiling restore.
      // This prevents components from jumping to the top when edit-mode layout changed.
      if (
        !inserted &&
        gridLayoutActive &&
        !restoreToSidebarSlot &&
        !quranFocusModeActive
      ) {
        try {
          if (placeholder && placeholder.parentNode) {
            placeholder.remove();
          }

          inserted = this._restoreCardWithLayoutRules(key, card, st);
        } catch (e) {
          // Fallback strategies below
        }
      }

      // Strategy 2: Use placeholder position for non-grid layout mode and
      // for cards that originated from sidebar slots/focus-mode context.
      // For sidebar-origin cards, only trust placeholder when it still lives in
      // a sidebar context; otherwise allow persisted sidebar anchor recovery.
      if (
        !inserted &&
        (!gridLayoutActive ||
          quranFocusModeActive ||
          (restoreToSidebarSlot
            ? placeholderInSidebarContext
            : !!(placeholder && placeholder.parentNode)))
      ) {
        const placeholderStillValid = !!(placeholder && placeholder.parentNode);

        if (placeholderStillValid) {
          try {
            placeholder.parentNode.insertBefore(card, placeholder);
            inserted = true;
          } catch (e) {
            // Fallback strategies below
          }
        }
      }

      // Clean up placeholder regardless of which strategy succeeded
      if (placeholder && placeholder.parentNode) {
        try {
          placeholder.remove();
        } catch (e) {}
      }

      // Strategy 3: Recover from persisted restore anchor (settings/local storage)
      // when runtime DOM anchors are unavailable.
      if (!inserted) {
        try {
          inserted = this._restoreCardWithPersistedAnchor(key, card, st);
        } catch (e) {
          inserted = false;
        }
      }

      // Strategy 4: Use stored original position
      if (!inserted && st.originalParent && st.originalParent.isConnected) {
        try {
          if (
            st.originalNextSibling &&
            st.originalNextSibling.isConnected &&
            st.originalNextSibling.parentNode === st.originalParent
          ) {
            st.originalParent.insertBefore(card, st.originalNextSibling);
          } else {
            st.originalParent.appendChild(card);
          }
          inserted = true;
        } catch (e) {
          // Fallback below
        }
      }

      // Strategy 5: Find content-grid and append
      if (!inserted) {
        try {
          const contentGrid = document.querySelector(".content-grid");
          if (contentGrid) {
            contentGrid.appendChild(card);
            inserted = true;
          }
        } catch (e) {
          // Last resort
        }
      }

      // Strategy 6: Last resort - append to body
      if (!inserted) {
        try {
          (
            document.querySelector(".content-grid") || document.body
          ).appendChild(card);
        } catch (e2) {}
      }

      // Clean up placeholder if still in DOM
      if (placeholder && placeholder.parentNode) {
        try {
          placeholder.remove();
        } catch (e) {}
      }

      // Remove floating styles
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

      st.layoutSnapshotAtFloat = "";
      st.lastKnownRowIndex = -1;
      st.lastKnownIndexInRow = -1;
      st.lastKnownRowLength = 0;

      // Fade in quickly once the card is in place.
      if (inserted && !prefersReducedMotion) {
        try {
          // Ensure we don't accidentally re-trigger the base .card entrance animation.
          card.classList.remove("floating-collapse-out");
          card.classList.add("tiling-collapse-in");

          const cleanup = () => {
            try {
              card.classList.remove("tiling-collapse-in");
              card.removeEventListener("animationend", cleanup);
            } catch (e) {}
          };
          card.addEventListener("animationend", cleanup);
          window.setTimeout(cleanup, this.collapseInMs + 80);
        } catch (e) {}
      } else {
        try {
          card.classList.remove("floating-collapse-out");
          card.classList.remove("tiling-collapse-in");
        } catch (e) {}
      }

      // Re-enable interactions.
      try {
        card.style.pointerEvents = "";
      } catch (e) {}

      // Notify layout manager after restoring this card to grid mode.
      this.notifyLayoutChanged();

      // Ensure browser-native resize dimensions cannot leak into tiling mode.
      window.requestAnimationFrame(() => {
        try {
          if (!card.classList.contains("floating-card")) {
            card.style.width = "";
            card.style.height = "";
            card.style.minWidth = "";
            card.style.minHeight = "";
            card.style.maxWidth = "";
            card.style.maxHeight = "";
          }
        } catch (e) {}
      });

      // Replace reload-based recovery: force a deterministic grid rebuild when
      // user disabled floating while grid layout is active.
      try {
        const desiredStillFloating = this.isEnabledDesired(key);
        if (gridLayoutActive && !desiredStillFloating) {
          const grid = window.dashboard?.gridLayout;
          if (grid) {
            window.requestAnimationFrame(() => {
              try {
                if (typeof grid.applyLayout === "function") {
                  grid.applyLayout();
                }
              } catch (e) {}
              try {
                if (typeof grid.recalculateLayout === "function") {
                  grid.recalculateLayout();
                }
              } catch (e) {}
            });
          }
        }
      } catch (e) {}
    };

    if (prefersReducedMotion) {
      finalizeRestoreToTiling();
      return;
    }

    // Subtle collapse WITHOUT empty gap:
    // - Create a visual proxy that fades out where it was floating
    // - Immediately restore the real card into tiling, then fade it in quickly
    this.createCollapseProxy(key, card);

    // Immediately restore the real card so the grid never looks empty.
    st.collapseTimer = window.setTimeout(() => {
      st.collapseTimer = null;
    }, this.collapseOutMs + 120);

    try {
      card.classList.remove("floating-collapse-out");
      card.classList.remove("tiling-collapse-in");
    } catch (e) {}

    finalizeRestoreToTiling();
  }

  bumpZIndex(key) {
    // naive monotonic z-index bump within floating cards
    const st = this.runtime.get(key);
    if (!st || !st.card) return;

    let maxZ = 10;
    for (const other of this.runtime.values()) {
      if (!other.card?.classList.contains("floating-card")) continue;
      const z = parseInt(other.card.style.zIndex || "10", 10);
      if (Number.isFinite(z)) maxZ = Math.max(maxZ, z);
    }

    const nextZ = maxZ + 1;
    st.card.style.zIndex = String(nextZ);

    const settings = this.getSettings();
    settings.floating = settings.floating || {};
    settings.floating[key] = { ...(settings.floating[key] || {}), z: nextZ };
    this.saveSettings(settings);
  }

  scheduleSave(key) {
    const st = this.runtime.get(key);
    if (!st || !st.card) return;

    if (this.isPersistenceSuppressed(key)) return;

    if (st.saveTimer) return;

    st.saveTimer = window.setTimeout(() => {
      st.saveTimer = null;
      this.flushSave(key);
    }, 120);
  }

  scheduleDragPersist(key) {
    const st = this.runtime.get(key);
    if (!st || !st.card) return;
    if (!st.card.classList.contains("floating-card")) return;

    if (this.isPerformanceModeEnabled()) {
      const now = Date.now();
      if (now - (st.dragPersistLastAt || 0) < 160) return;
      st.dragPersistLastAt = now;
      this.flushSave(key, { force: true });
      return;
    }

    if (st.dragPersistRaf) return;
    st.dragPersistRaf = requestAnimationFrame(() => {
      st.dragPersistRaf = null;
      const now = Date.now();
      // Throttle localStorage writes; still frequent enough to feel instantaneous.
      if (now - (st.dragPersistLastAt || 0) < 80) return;
      st.dragPersistLastAt = now;
      this.flushSave(key, { force: true });
    });
  }

  scheduleMinUpdate(key) {
    const st = this.runtime.get(key);
    if (!st || !st.card) return;
    if (!st.card.classList.contains("floating-card")) return;

    if (this.isPerformanceModeEnabled()) {
      if (st.minUpdateTimer) return;
      st.minUpdateTimer = window.setTimeout(() => {
        st.minUpdateTimer = null;
        this.updateMinSizeToContent(key);
      }, 80);
      return;
    }

    if (st.minUpdateRaf) return;
    st.minUpdateRaf = requestAnimationFrame(() => {
      st.minUpdateRaf = null;
      this.updateMinSizeToContent(key);
    });
  }

  updateMinSizeToContent(key) {
    const st = this.runtime.get(key);
    if (!st || !st.card) return;
    const card = st.card;
    if (!card.classList.contains("floating-card")) return;

    const doUpdate = () => {
      // Measure natural content height at current width (without forcing scrollbars)
      const prevHeight = card.style.height;
      const prevMinHeight = card.style.minHeight;

      // Temporarily allow the card to size to its content to measure the minimum
      card.style.minHeight = "0px";
      card.style.height = "auto";

      const naturalHeight = Math.ceil(card.getBoundingClientRect().height);

      // Restore explicit height, then enforce minHeight
      card.style.height = prevHeight;
      const nextMinHeight = `${Math.max(0, naturalHeight)}px`;
      if (prevMinHeight !== nextMinHeight) {
        card.style.minHeight = nextMinHeight;
      } else {
        card.style.minHeight = prevMinHeight;
      }

      // If the current height is below the content minimum, grow it.
      const rect = card.getBoundingClientRect();
      if (rect.height + 0.5 < naturalHeight) {
        card.style.height = `${naturalHeight}px`;
      }

      // Keep it on-screen as best as possible.
      // NOTE: Position changes from content/DOM-driven reflow must not persist.
      this.clampCardToViewport(key, { persist: false });
    };

    // If this update is auto-triggered (content reflow, viewport shrink), do
    // not allow the resulting programmatic resize/clamp to persist.
    if (st.userResizing) {
      doUpdate();
    } else {
      this.withPersistenceSuppressedThroughNextFrame(key, doUpdate);
    }
  }

  flushSave(key, { force = false } = {}) {
    const st = this.runtime.get(key);
    if (!st || !st.card) return;

    // Suppression is only for automatic layout adjustments. User drag saves
    // must bypass it.
    if (!force && this.isPersistenceSuppressed(key)) return;

    if (!st.card.classList.contains("floating-card")) return;

    const card = st.card;
    const rect = card.getBoundingClientRect();

    // Prefer inline styles for position; they are the source of truth for dragging.
    // (Using getBoundingClientRect() alone can be stale in rare timing cases.)
    const styleLeft = parseFloat(card.style.left);
    const styleTop = parseFloat(card.style.top);
    const left = Number.isFinite(styleLeft) ? styleLeft : rect.left;
    const top = Number.isFinite(styleTop) ? styleTop : rect.top;

    // Prefer inline width/height (set by resize handles), fallback to rect.
    const styleWidth = parseFloat(card.style.width);
    const styleHeight = parseFloat(card.style.height);
    const width = Number.isFinite(styleWidth) ? styleWidth : rect.width;
    const height = Number.isFinite(styleHeight) ? styleHeight : rect.height;

    const settings = this.getSettings();
    settings.floating = settings.floating || {};
    const prev = settings.floating[key] || {};

    // If the window was only moved automatically (e.g., viewport shrink clamp),
    // never persist the new left/top. Only user drags should update position.
    const shouldPersistPosition = st.userMovedSinceLastSave === true;
    const shouldKeepPreviousPosition =
      st.autoPositionChangedSinceLastSave === true && !shouldPersistPosition;

    const persistedLeft = shouldKeepPreviousPosition
      ? this.safeNumber(prev.left, Math.round(left))
      : Math.round(left);
    const persistedTop = shouldKeepPreviousPosition
      ? this.safeNumber(prev.top, Math.round(top))
      : Math.round(top);

    const box = {
      ...prev,
      left: persistedLeft,
      top: persistedTop,
      width: Math.round(width),
      height: Math.round(height),
      // Persist geometry without mutating the user's toggle intent.
      enabled: this.isEnabledDesired(key) === true,
      z: this.safeNumber(parseInt(card.style.zIndex || "10", 10), prev.z ?? 10),
    };

    this.persistBox(key, box);

    if (shouldPersistPosition) {
      st.autoPositionChangedSinceLastSave = false;
      st.userMovedSinceLastSave = false;
    }
  }

  clampCardToViewport(key, { persist = false } = {}) {
    const st = this.runtime.get(key);
    if (!st || !st.card) return;
    const card = st.card;
    if (!card.classList.contains("floating-card")) return;

    // IMPORTANT: use inline styles as the source of truth.
    // getBoundingClientRect() is affected by CSS transforms/animations, which can
    // otherwise "nudge" a window on startup.
    const rect = card.getBoundingClientRect();
    const styleLeft = parseFloat(card.style.left);
    const styleTop = parseFloat(card.style.top);
    const styleWidth = parseFloat(card.style.width);
    const styleHeight = parseFloat(card.style.height);

    const curLeft = Number.isFinite(styleLeft) ? styleLeft : rect.left;
    const curTop = Number.isFinite(styleTop) ? styleTop : rect.top;
    const curWidth = Number.isFinite(styleWidth) ? styleWidth : rect.width;
    const curHeight = Number.isFinite(styleHeight) ? styleHeight : rect.height;

    const pad = this.viewportPadding;
    const maxLeft = Math.max(pad, window.innerWidth - curWidth - pad);
    const maxTop = Math.max(pad, window.innerHeight - curHeight - pad);

    const clampedLeft = this.clamp(curLeft, pad, maxLeft);
    const clampedTop = this.clamp(curTop, pad, maxTop);

    const nextLeft = Math.round(clampedLeft);
    const nextTop = Math.round(clampedTop);

    const prevLeft = Number.isFinite(styleLeft) ? Math.round(styleLeft) : null;
    const prevTop = Number.isFinite(styleTop) ? Math.round(styleTop) : null;

    if (prevLeft !== nextLeft) card.style.left = `${nextLeft}px`;
    if (prevTop !== nextTop) card.style.top = `${nextTop}px`;

    const didMove =
      (prevLeft !== null && prevLeft !== nextLeft) ||
      (prevTop !== null && prevTop !== nextTop);

    if (didMove && !persist) {
      st.autoPositionChangedSinceLastSave = true;
    }

    // Persist only for user-driven interactions (drag end / resize handle).
    if (!persist) return;
    if (this.isPersistenceSuppressed(key)) return;

    if (didMove) {
      st.userMovedSinceLastSave = true;
    }

    if (didMove) {
      this.scheduleSave(key);
    }
  }

  onWindowResize() {
    if (this.isPerformanceModeEnabled()) {
      if (this._performanceResizeTimer) {
        clearTimeout(this._performanceResizeTimer);
      }
      this._performanceResizeTimer = window.setTimeout(() => {
        this._performanceResizeTimer = null;
        for (const key of this.runtime.keys()) {
          this.enforceHorizontalSpace(key);
          this.clampCardToViewport(key, { persist: false });
        }
      }, 90);
      return;
    }

    if (this._resizeRaf) return;
    this._resizeRaf = requestAnimationFrame(() => {
      this._resizeRaf = null;
      for (const key of this.runtime.keys()) {
        // Enforce horizontal space rule and clamp without persistence.
        this.enforceHorizontalSpace(key);
        this.clampCardToViewport(key, { persist: false });
      }
    });
  }

  getMainContainerRect() {
    const el =
      document.querySelector(".main-container") ||
      document.querySelector(".content-grid") ||
      document.body;
    try {
      return el.getBoundingClientRect();
    } catch (e) {
      return { left: 0, right: window.innerWidth, width: window.innerWidth };
    }
  }

  getAvailableSidebarSpace() {
    const rect = this.getMainContainerRect();
    const leftSpace = Math.max(0, rect.left);
    const rightSpace = Math.max(0, window.innerWidth - rect.right);

    // The spec wants a single-side capacity (e.g. remaining space split into
    // left/right sidebars). For a centered container, this is one margin side.
    return Math.max(0, Math.min(leftSpace, rightSpace) - this.viewportPadding);
  }

  hasHorizontalSpace(componentWidth) {
    const w = this.safeNumber(componentWidth, 0) || 0;
    const maxFloatingWidth = Math.max(
      280,
      Math.floor(window.innerWidth - this.viewportPadding * 2),
    );
    return w <= maxFloatingWidth;
  }

  enforceHorizontalSpace(key) {
    const st = this.runtime.get(key);
    if (!st || !st.card) return true;

    const desired = this.isEnabledDesired(key);
    const isFloating = st.card.classList.contains("floating-card");

    // If not floating, approximate width from stored config so we can decide
    // whether we should auto-restore when space returns.
    let componentWidth = 0;
    if (isFloating) {
      componentWidth = Math.max(0, st.card.getBoundingClientRect().width || 0);
    } else {
      const cfg =
        this.getStoredBox(key) || this.getSettings()?.floating?.[key] || {};
      componentWidth = this.safeNumber(cfg.width, 420);
    }

    const hasSpace = this.hasHorizontalSpace(componentWidth);

    if (!hasSpace) {
      st.spaceSuspended = desired;
      if (isFloating) {
        this.disableFloatingRuntime(key);
      }
      this.updateButton(key);
      return false;
    }

    // Space is available again: if user still wants floating, restore it.
    if (desired && !this.isViewportSuspended) {
      if (st.spaceSuspended && !isFloating) {
        st.spaceSuspended = false;
        this.enableFloatingRuntime(key);
      } else {
        st.spaceSuspended = false;
      }
    } else {
      st.spaceSuspended = false;
    }

    this.updateButton(key);
    return true;
  }

  isPerformanceModeEnabled() {
    if (typeof window !== "undefined") {
      if (typeof window.__MD_PERFORMANCE_MODE__ === "boolean") {
        return window.__MD_PERFORMANCE_MODE__ === true;
      }
    }

    try {
      return this.storage.getSettings()?.performanceModeEnabled === true;
    } catch (e) {
      return false;
    }
  }

  isPersistenceSuppressed(key) {
    const st = this.runtime.get(key);
    return !!st && (st.persistenceSuppressed || 0) > 0;
  }

  withPersistenceSuppressedThroughNextFrame(key, fn) {
    const st = this.runtime.get(key);
    if (!st) return fn();

    st.persistenceSuppressed = (st.persistenceSuppressed || 0) + 1;
    try {
      return fn();
    } finally {
      requestAnimationFrame(() => {
        const st2 = this.runtime.get(key);
        if (!st2) return;
        st2.persistenceSuppressed = Math.max(
          0,
          (st2.persistenceSuppressed || 0) - 1,
        );
      });
    }
  }

  safeNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  clamp(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.min(Math.max(value, min), max);
  }

  _getGridPositionOrder(key) {
    const orderMap = {
      quotes: 50,
      prayerTimes: 100,
      fasting: 110,
      hijriCalendar: 120,
      flashcards: 200,
      adhkar: 210,
      hadith: 300,
      todoList: 400,
      qiblaDirection: 410,
      lunarPhase: 420,
    };
    return orderMap[key] ?? 500;
  }

  _findInsertReferenceByOrder(parent, targetOrder) {
    if (!parent) return null;

    const cardIdToKey = {
      quoteSection: "quotes",
      prayerTimesCard: "prayerTimes",
      calendarCard: "hijriCalendar",
      fastingCard: "fasting",
      adhkarCard: "adhkar",
      hadithCard: "hadith",
      qiblaCard: "qiblaDirection",
      lunarPhaseCard: "lunarPhase",
      flashcardCard: "flashcards",
      todoCard: "todoList",
    };

    const children = Array.from(parent.children);
    for (const child of children) {
      const childKey = cardIdToKey[child.id];
      if (childKey) {
        const childOrder = this._getGridPositionOrder(childKey);
        if (childOrder > targetOrder) {
          return child;
        }
      }
    }
    return null;
  }
});

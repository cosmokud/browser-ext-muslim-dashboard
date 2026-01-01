/**
 * Floating Mode Manager
 * Detaches select components into draggable, resizable, persistent floating windows.
 *
 * Design goals:
 * - Minimal DOM intrusion: uses a placeholder node to restore original order.
 * - No external deps.
 * - Persistence stored in settings.floating[componentKey].
 * - Responsive safety: floating is suspended on small viewports.
 */

class FloatingModeManager {
  constructor(storage) {
    this.storage = storage;

    this.viewportDisableQuery = window.matchMedia("(max-width: 699px)");
    this.isViewportSuspended = false;
    this.hasAppliedOnce = false;

    this.viewportPadding = 8;

    this.targets = {
      prayerTimes: {
        cardId: "prayerTimesCard",
        buttonId: "floatingPrayerTimesBtn",
        // Use header as the drag handle (match other floating components)
        handleSelector: ".card-header",
      },
      hijriCalendar: {
        cardId: "calendarCard",
        buttonId: "floatingHijriCalendarBtn",
      },
      qiblaDirection: {
        cardId: "qiblaCard",
        buttonId: "floatingQiblaDirectionBtn",
      },
      flashcards: {
        cardId: "flashcardCard",
        buttonId: "floatingFlashcardsBtn",
      },
      todoList: {
        cardId: "todoCard",
        buttonId: "floatingTodoListBtn",
      },
    };

    this.runtime = new Map();

    this._resizeRaf = null;
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
        userResizing: false,
        userMovedSinceLastSave: false,
        autoPositionChangedSinceLastSave: false,
        spaceSuspended: false,
        persistenceSuppressed: 0,
        resizeObserver: null,
        mutationObserver: null,
        saveTimer: null,
        minUpdateRaf: null,
        dragPersistRaf: null,
        dragPersistLastAt: 0,
      });

      if (button) {
        button.addEventListener("click", (e) => {
          // The button lives inside a <label>; prevent toggling the visibility checkbox.
          e.preventDefault();
          e.stopPropagation();
          if (this.isViewportSuspended) return;
          this.toggle(key);
        });

        // Avoid label-click toggling when mouse down on the button
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
      } catch (e) {}
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        try {
          this.flushAll();
        } catch (e) {}
      }
    });
  }

  notifyLayoutChanged() {
    if (
      window.dashboard &&
      typeof window.dashboard.applyComponentVisibility === "function"
    ) {
      try {
        window.dashboard.applyComponentVisibility();
      } catch (e) {}
    }
  }

  flushAll() {
    for (const key of this.runtime.keys()) {
      const st = this.runtime.get(key);
      if (!st) continue;
      if (st.saveTimer) {
        try {
          clearTimeout(st.saveTimer);
        } catch (e) {}
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

  setEnabledDesired(key, enabled) {
    const settings = this.getSettings();
    settings.floating = settings.floating || {};
    settings.floating[key] = { ...(settings.floating[key] || {}), enabled };
    this.saveSettings(settings);
  }

  toggle(key) {
    const desired = this.isEnabledDesired(key);
    this.setEnabledDesired(key, !desired);
    this.applyOne(key);

    // Let layout recalculations run if the dashboard exposes it
    if (
      window.dashboard &&
      typeof window.dashboard.applyComponentVisibility === "function"
    ) {
      try {
        window.dashboard.applyComponentVisibility();
      } catch (e) {}
    }
  }

  applyViewportConstraint() {
    const shouldSuspend = this.viewportDisableQuery.matches;

    const changed = shouldSuspend !== this.isViewportSuspended;
    this.isViewportSuspended = shouldSuspend;

    // Always apply at least once so persisted states restore on reload
    if (this.isViewportSuspended) {
      for (const key of this.runtime.keys()) this.disableFloatingRuntime(key);
    } else {
      for (const key of this.runtime.keys()) this.applyOne(key);
    }

    this.hasAppliedOnce = true;
    this.updateAllButtons();

    if (
      window.dashboard &&
      typeof window.dashboard.applyComponentVisibility === "function"
    ) {
      try {
        window.dashboard.applyComponentVisibility();
      } catch (e) {}
    }
  }

  updateAllButtons() {
    for (const key of this.runtime.keys()) this.updateButton(key);
  }

  updateButton(key) {
    const st = this.runtime.get(key);
    if (!st || !st.button) return;

    const desired = this.isEnabledDesired(key);
    const active = desired && !this.isViewportSuspended && !st.spaceSuspended;

    st.button.classList.toggle("active", active);
    st.button.setAttribute("aria-pressed", active ? "true" : "false");

    st.button.disabled = this.isViewportSuspended;
    if (this.isViewportSuspended) {
      st.button.setAttribute(
        "title",
        "Floating Mode is disabled on small screens"
      );
    } else if (desired && st.spaceSuspended) {
      st.button.setAttribute(
        "title",
        "Not enough space for Floating Mode at this viewport width"
      );
    } else {
      st.button.setAttribute("title", "Toggle Floating Mode");
    }
  }

  applyOne(key) {
    const st = this.runtime.get(key);
    if (!st) return;

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

    const cfg =
      this.getStoredBox(key) || this.getSettings()?.floating?.[key] || {};
    const left = this.safeNumber(cfg.left, 40);
    const top = this.safeNumber(cfg.top, 120);
    const width = this.safeNumber(cfg.width, 420);
    const height = this.safeNumber(cfg.height, 520);
    const z = this.safeNumber(cfg.z, 10);

    // If the viewport can't accommodate the main container plus a sidebar-wide
    // floating window, keep tiling layout. Do NOT change the user's desired
    // setting; we'll auto-restore when space returns.
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

    // Detach and float
    document.body.appendChild(card);
    card.classList.add("floating-card");

    // Update top-features columns if this card used to live there.
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

    // Native resizing
    card.style.resize = "both";
    card.style.overflow = "hidden";

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

    // Track native resize handle drags (bottom-right) to treat resulting clamps
    // as user-driven (and thus persistable).
    const onCardPointerDownForResize = (e) => {
      if (!card.classList.contains("floating-card")) return;
      if (e.button !== undefined && e.button !== 0) return;
      if (typeof e.clientX !== "number" || typeof e.clientY !== "number")
        return;

      const rect = card.getBoundingClientRect();
      const edge = 18; // px
      const nearRight = rect.right - e.clientX <= edge;
      const nearBottom = rect.bottom - e.clientY <= edge;

      if (nearRight && nearBottom) {
        st.userResizing = true;
      }
    };

    const onAnyPointerUpClearResize = () => {
      st.userResizing = false;
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
    st._onAnyPointerUpClearResize = onAnyPointerUpClearResize;
    handle.addEventListener("pointerdown", onPointerDown);
    card.addEventListener("pointerdown", onCardPointerDownForResize);
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
        this.scheduleMinUpdate(key);
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

    // Capture the current floating rect for a FLIP-style collapse animation.
    let fromRect = null;
    try {
      fromRect = card.getBoundingClientRect();
    } catch (e) {
      fromRect = null;
    }

    // If not floating, just update button state
    if (!card.classList.contains("floating-card")) {
      this.updateButton(key);
      return;
    }

    // Cleanup handlers
    try {
      if (st._floatingHandle && st._onPointerDown) {
        st._floatingHandle.removeEventListener(
          "pointerdown",
          st._onPointerDown
        );
      }
    } catch (e) {}

    try {
      if (st.card && st._onCardPointerDownForResize) {
        st.card.removeEventListener(
          "pointerdown",
          st._onCardPointerDownForResize
        );
      }
    } catch (e) {}

    try {
      if (st._onAnyPointerUpClearResize) {
        document.removeEventListener(
          "pointerup",
          st._onAnyPointerUpClearResize
        );
        document.removeEventListener(
          "pointercancel",
          st._onAnyPointerUpClearResize
        );
      }
    } catch (e) {}

    st._floatingHandle = null;
    st._onPointerDown = null;
    st._onCardPointerDownForResize = null;
    st._onAnyPointerUpClearResize = null;

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

    // Restore to original position using placeholder (while still floating),
    // then clear floating styles so it participates in the tiling layout.
    const placeholder = st.placeholder;
    let inserted = false;
    if (placeholder && placeholder.parentNode) {
      try {
        placeholder.parentNode.insertBefore(card, placeholder);
        placeholder.remove();
        inserted = true;
      } catch (e) {
        // Fallback: append to original parent
        try {
          (
            st.originalParent ||
            document.querySelector(".content-grid") ||
            document.body
          ).appendChild(card);
          inserted = true;
        } catch (e2) {}
      }
    } else if (st.originalParent) {
      try {
        st.originalParent.insertBefore(card, st.originalNextSibling);
        inserted = true;
      } catch (e) {
        try {
          st.originalParent.appendChild(card);
          inserted = true;
        } catch (e2) {}
      }
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

    // Animate collapse into the tiling layout (FLIP). Keep it resilient and
    // skip if reduced-motion is preferred.
    if (inserted && fromRect) {
      try {
        const prefersReducedMotion =
          window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!prefersReducedMotion) {
          const toRect = card.getBoundingClientRect();
          this.animateCollapseToTiling(card, fromRect, toRect);
        }
      } catch (e) {}
    }

    // Ensure the top-features grid updates back to 3 columns when these cards
    // return from floating.
    this.notifyLayoutChanged();
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
      enabled: true,
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
    return w <= this.getAvailableSidebarSpace();
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
          (st2.persistenceSuppressed || 0) - 1
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

  animateCollapseToTiling(card, fromRect, toRect) {
    if (!card || !fromRect || !toRect) return;

    const dx = fromRect.left - toRect.left;
    const dy = fromRect.top - toRect.top;

    const toW = Math.max(1, toRect.width || 1);
    const toH = Math.max(1, toRect.height || 1);
    const scaleX = Math.max(0.2, (fromRect.width || toW) / toW);
    const scaleY = Math.max(0.2, (fromRect.height || toH) / toH);

    const hasMeaningfulMove =
      Math.abs(dx) > 0.5 ||
      Math.abs(dy) > 0.5 ||
      Math.abs(scaleX - 1) > 0.02 ||
      Math.abs(scaleY - 1) > 0.02;
    if (!hasMeaningfulMove) return;

    // Set initial inverted transform without transition, then transition to identity.
    // Opacity fade is handled by CSS animation on .floating-collapse.
    card.classList.add("floating-collapse");
    card.style.transition = "none";
    card.style.transformOrigin = "top left";
    card.style.willChange = "transform, opacity";
    card.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;

    try {
      void card.offsetWidth;
    } catch (e) {}

    // Next frame: allow CSS transition to run.
    requestAnimationFrame(() => {
      try {
        card.style.transition = "";
        card.style.transform = "";

        const cleanup = () => {
          try {
            card.classList.remove("floating-collapse");
            card.style.willChange = "";
            card.style.transformOrigin = "";
            card.removeEventListener("transitionend", cleanup);
            card.removeEventListener("animationend", cleanup);
          } catch (e) {}
        };
        card.addEventListener("transitionend", cleanup);
        card.addEventListener("animationend", cleanup);

        // Safety cleanup in case transitionend doesn't fire.
        window.setTimeout(cleanup, 950);
      } catch (e) {}
    });
  }
}

// Export for debugging
window.FloatingModeManager = FloatingModeManager;

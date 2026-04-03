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
      quotes: {
        cardId: "quoteSection",
        buttonId: "floatingQuotesBtn",
        // Quotes does not use .card-header, so drag from its container.
        handleSelector: ".quote-container",
      },
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
      lunarPhase: {
        cardId: "lunarPhaseCard",
        buttonId: "floatingLunarPhaseBtn",
      },
      fasting: {
        cardId: "fastingCard",
        buttonId: "floatingFastingBtn",
      },
      flashcards: {
        cardId: "flashcardCard",
        buttonId: "floatingFlashcardsBtn",
      },
      adhkar: {
        cardId: "adhkarCard",
        buttonId: "floatingAdhkarBtn",
      },
      hadith: {
        cardId: "hadithCard",
        buttonId: "floatingHadithBtn",
      },
      todoList: {
        cardId: "todoCard",
        buttonId: "floatingTodoListBtn",
      },
    };

    this.runtime = new Map();

    this._resizeRaf = null;
    this._performanceResizeTimer = null;

    // Animation tuning (ms)
    this.collapseOutMs = 260;
    this.collapseInMs = 90;
  }

  _isGridLayoutActive() {
    try {
      return !!document.querySelector(".content-grid .grid-flex-row");
    } catch (e) {
      return false;
    }
  }

  _getGridLayoutRowsSnapshot() {
    try {
      const rows = window.dashboard?.gridLayout?.rows;
      if (Array.isArray(rows)) return rows;
    } catch (e) {}

    try {
      const settings = this.getSettings();
      if (Array.isArray(settings?.gridLayout)) return settings.gridLayout;
    } catch (e) {}

    return null;
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

  removeCollapseProxy(key) {
    const st = this.runtime.get(key);
    if (!st) return;

    if (st._collapseProxyRemoveTimer) {
      try {
        window.clearTimeout(st._collapseProxyRemoveTimer);
      } catch (e) {}
      st._collapseProxyRemoveTimer = null;
    }

    if (st._collapseProxy) {
      try {
        st._collapseProxy.remove();
      } catch (e) {}
      st._collapseProxy = null;
    }
  }

  ensureCollapseButton(key) {
    const st = this.runtime.get(key);
    if (!st || !st.card) return;
    const card = st.card;
    if (!card.classList.contains("floating-card")) return;

    if (st._collapseBtn && st._collapseBtn.isConnected) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "floating-collapse-btn";
    btn.setAttribute("title", "Return to layout");
    btn.setAttribute("aria-label", "Return to layout");
    // Use SVG minimize icon
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;

    const onClick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Explicit user action: disable floating and persist that preference.
      try {
        st.spaceSuspended = false;
      } catch (err) {}
      this.setEnabledDesired(key, false);
      this.disableFloatingRuntime(key);
      this.updateButton(key);
      this.notifyLayoutChanged();
    };

    // Prevent drag initiation from the button.
    const stop = (e) => {
      try {
        e.stopPropagation();
      } catch (err) {}
    };

    btn.addEventListener("click", onClick);
    btn.addEventListener("pointerdown", stop);
    btn.addEventListener("mousedown", stop);

    st._collapseBtn = btn;
    try {
      card.appendChild(btn);
    } catch (e) {}
  }

  removeCollapseButton(key) {
    const st = this.runtime.get(key);
    if (!st) return;
    try {
      if (st._collapseBtn) st._collapseBtn.remove();
    } catch (e) {}
    st._collapseBtn = null;
  }

  createCollapseProxy(key, card) {
    if (!card) return null;

    // If a previous proxy is still fading, remove it to avoid overlap.
    if (key) this.removeCollapseProxy(key);

    try {
      const rect = card.getBoundingClientRect();
      const proxy = card.cloneNode(true);

      // Avoid duplicate IDs and interactive behavior.
      const stripIds = (node) => {
        if (!node || node.nodeType !== 1) return;
        try {
          node.removeAttribute("id");
        } catch (e) {}
        const children = node.children || [];
        for (const c of children) stripIds(c);
      };
      stripIds(proxy);

      try {
        proxy
          .querySelectorAll(
            ".floating-collapse-btn, button, a, input, textarea, select",
          )
          .forEach((el) => {
            try {
              el.setAttribute("tabindex", "-1");
              el.setAttribute("aria-hidden", "true");
            } catch (e) {}
          });
      } catch (e) {}

      proxy.classList.add("floating-collapse-out");
      proxy.style.position = "fixed";
      proxy.style.left = `${Math.round(rect.left)}px`;
      proxy.style.top = `${Math.round(rect.top)}px`;
      proxy.style.width = `${Math.round(rect.width)}px`;
      proxy.style.height = `${Math.round(rect.height)}px`;
      proxy.style.margin = "0";
      proxy.style.pointerEvents = "none";
      proxy.style.zIndex = String(
        Math.max(999, parseInt(card.style.zIndex || "50", 10) + 50),
      );

      document.body.appendChild(proxy);

      // Guarantee the proxy lands on exact opacity: 0 at the end.
      const onAnimEnd = () => {
        try {
          proxy.style.opacity = "0";
        } catch (e) {}
        try {
          proxy.removeEventListener("animationend", onAnimEnd);
        } catch (e) {}
      };
      try {
        proxy.addEventListener("animationend", onAnimEnd);
      } catch (e) {}

      const removeAfterMs = this.collapseOutMs + 80;
      if (key) {
        const st = this.runtime.get(key);
        if (st) {
          st._collapseProxy = proxy;
          st._collapseProxyRemoveTimer = window.setTimeout(() => {
            const st2 = this.runtime.get(key);
            if (st2) {
              st2._collapseProxy = null;
              st2._collapseProxyRemoveTimer = null;
            }
            try {
              proxy.style.opacity = "0";
            } catch (e) {}
            try {
              proxy.remove();
            } catch (e) {}
          }, removeAfterMs);
        } else {
          window.setTimeout(() => {
            try {
              proxy.style.opacity = "0";
            } catch (e) {}
            try {
              proxy.remove();
            } catch (e) {}
          }, removeAfterMs);
        }
      } else {
        window.setTimeout(() => {
          try {
            proxy.style.opacity = "0";
          } catch (e) {}
          try {
            proxy.remove();
          } catch (e) {}
        }, removeAfterMs);
      }

      return proxy;
    } catch (e) {
      return null;
    }
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
        collapseTimer: null,
        _collapseProxy: null,
        _collapseProxyRemoveTimer: null,
        persistenceSuppressed: 0,
        resizeObserver: null,
        mutationObserver: null,
        saveTimer: null,
        minUpdateRaf: null,
        minUpdateTimer: null,
        dragPersistRaf: null,
        dragPersistLastAt: 0,
      });

      if (button) {
        button.addEventListener("click", (e) => {
          // Prevent label-based toggling when the button is clicked (defensive: button may be inside a label).
          e.preventDefault();
          e.stopPropagation();
          this.toggle(key);
        });

        // Prevent propagation on pointer-down so accidental label toggles don't occur while pressing the button
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

    document.addEventListener("md:performance-mode-change", (event) => {
      if (event?.detail?.enabled !== true) return;

      if (this._resizeRaf) {
        cancelAnimationFrame(this._resizeRaf);
        this._resizeRaf = null;
      }
      if (this._performanceResizeTimer) {
        clearTimeout(this._performanceResizeTimer);
        this._performanceResizeTimer = null;
      }

      for (const st of this.runtime.values()) {
        if (st.dragPersistRaf) {
          cancelAnimationFrame(st.dragPersistRaf);
          st.dragPersistRaf = null;
        }
        if (st.minUpdateRaf) {
          cancelAnimationFrame(st.minUpdateRaf);
          st.minUpdateRaf = null;
        }
        if (st.minUpdateTimer) {
          clearTimeout(st.minUpdateTimer);
          st.minUpdateTimer = null;
        }
      }
    });

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
    const dashboard = window.dashboard;
    if (!dashboard) return;

    if (typeof dashboard.applyComponentVisibility === "function") {
      try {
        dashboard.applyComponentVisibility();
      } catch (e) {}
    }

    if (
      dashboard.gridLayout &&
      typeof dashboard.gridLayout.recalculateLayout === "function"
    ) {
      try {
        dashboard.gridLayout.recalculateLayout();
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
    this.notifyLayoutChanged();
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
    this.notifyLayoutChanged();
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

    // Keep the button clickable even when suspended so users can still
    // toggle their preference (it will auto-apply when space/viewport allows).
    try {
      st.button.disabled = false;
      st.button.removeAttribute("aria-disabled");
    } catch (e) {}

    if (this.isViewportSuspended) {
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

    this.ensureCollapseButton(key);

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
    card.style.overflow = key === "notesCard" ? "visible" : "hidden";

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

    if (st.minUpdateTimer) {
      try {
        clearTimeout(st.minUpdateTimer);
      } catch (e) {}
      st.minUpdateTimer = null;
    }

    const finalizeRestoreToTiling = () => {
      // Button only exists in floating mode
      this.removeCollapseButton(key);

      // Restore to original position using placeholder (while still floating),
      // then clear floating styles so it participates in the tiling layout.
      const placeholder = st.placeholder;
      let inserted = false;

      const gridLayoutActive = this._isGridLayoutActive();

      // STRATEGY PRIORITY:
      // When grid layout is active, ALWAYS use the grid configuration as the source
      // of truth for positioning. The placeholder may have drifted or been repositioned
      // when GridLayoutManager rebuilt the layout.

      // Strategy 1 (PRIMARY): When grid layout is active, restore into the correct
      // row wrapper based on the current GridLayoutManager rows configuration.
      // This is the most reliable method as it uses the authoritative layout data.
      if (!inserted && gridLayoutActive) {
        try {
          const point = this._resolveGridLayoutInsertionPoint(key, card);
          if (point && point.parent) {
            if (point.before && point.before.isConnected) {
              point.parent.insertBefore(card, point.before);
            } else {
              point.parent.appendChild(card);
            }
            inserted = true;
          }
        } catch (e) {
          // Fallback strategies below
        }
      }

      // Strategy 2: Use placeholder position (only for non-grid-layout mode)
      // When GridLayoutManager is NOT active, the placeholder position is reliable.
      if (!inserted && !gridLayoutActive) {
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

      // Strategy 3: Use stored original position
      if (!inserted && st.originalParent && st.originalParent.isConnected) {
        try {
          if (
            st.originalNextSibling &&
            st.originalNextSibling.isConnected &&
            st.originalNextSibling.parentNode === st.originalParent
          ) {
            st.originalParent.insertBefore(card, st.originalNextSibling);
          } else {
            // Insert at original parent, but need to find correct position
            // by looking for the card's expected grid position
            const gridOrder = this._getGridPositionOrder(key);
            const insertRef = this._findInsertReferenceByOrder(
              st.originalParent,
              gridOrder,
            );
            if (insertRef) {
              st.originalParent.insertBefore(card, insertRef);
            } else {
              st.originalParent.appendChild(card);
            }
          }
          inserted = true;
        } catch (e) {
          // Fallback below
        }
      }

      // Strategy 4: Find content-grid and insert at correct position
      if (!inserted) {
        try {
          const contentGrid = document.querySelector(".content-grid");
          if (contentGrid) {
            const gridOrder = this._getGridPositionOrder(key);
            const insertRef = this._findInsertReferenceByOrder(
              contentGrid,
              gridOrder,
            );
            if (insertRef) {
              contentGrid.insertBefore(card, insertRef);
            } else {
              contentGrid.appendChild(card);
            }
            inserted = true;
          }
        } catch (e) {
          // Last resort
        }
      }

      // Strategy 4: Last resort - append to body
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

  /**
   * Get the expected grid position order for a component.
   * Lower numbers appear first in the grid.
   */
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

  /**
   * Find the reference node to insert before, based on grid order.
   * Returns null if should append at end.
   */
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
}

// Export for debugging
window.FloatingModeManager = FloatingModeManager;

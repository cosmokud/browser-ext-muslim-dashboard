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

    this.viewportPadding = 8;

    this.targets = {
      prayerTimes: {
        cardId: "prayerTimesCard",
        buttonId: "floatingPrayerTimesBtn",
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
        resizeObserver: null,
        saveTimer: null,
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

    // Keep constraint in sync with viewport
    const onViewportChange = () => this.applyViewportConstraint();
    try {
      this.viewportDisableQuery.addEventListener("change", onViewportChange);
    } catch (e) {
      // Safari legacy
      this.viewportDisableQuery.addListener(onViewportChange);
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
    if (window.dashboard && typeof window.dashboard.applyComponentVisibility === "function") {
      try {
        window.dashboard.applyComponentVisibility();
      } catch (e) {}
    }
  }

  applyViewportConstraint() {
    const shouldSuspend = this.viewportDisableQuery.matches;

    if (shouldSuspend === this.isViewportSuspended) {
      // Still update button state (e.g., if HTML loaded later)
      this.updateAllButtons();
      return;
    }

    this.isViewportSuspended = shouldSuspend;

    if (this.isViewportSuspended) {
      // Suspend floating visually without destroying the user's preference.
      for (const key of this.runtime.keys()) {
        this.disableFloatingRuntime(key);
      }
    } else {
      // Re-apply desired states.
      for (const key of this.runtime.keys()) {
        this.applyOne(key);
      }
    }

    this.updateAllButtons();

    if (window.dashboard && typeof window.dashboard.applyComponentVisibility === "function") {
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
    const active = desired && !this.isViewportSuspended;

    st.button.classList.toggle("active", active);
    st.button.setAttribute("aria-pressed", active ? "true" : "false");

    st.button.disabled = this.isViewportSuspended;
    if (this.isViewportSuspended) {
      st.button.setAttribute("title", "Floating Mode is disabled on small screens");
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
      this.disableFloatingRuntime(key);
    }

    this.updateButton(key);
  }

  enableFloatingRuntime(key) {
    const st = this.runtime.get(key);
    if (!st || !st.card) return;

    const card = st.card;

    // Already floating
    if (card.classList.contains("floating-card")) {
      // ensure position is clamped
      this.clampCardToViewport(key);
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

    const cfg = this.getSettings()?.floating?.[key] || {};
    const left = this.safeNumber(cfg.left, 40);
    const top = this.safeNumber(cfg.top, 120);
    const width = this.safeNumber(cfg.width, 420);
    const height = this.safeNumber(cfg.height, 520);
    const z = this.safeNumber(cfg.z, 10);

    card.style.position = "fixed";
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
    card.style.width = `${width}px`;
    card.style.height = `${height}px`;
    card.style.zIndex = String(z);

    // Native resizing
    card.style.resize = "both";
    card.style.overflow = "auto";

    // Dragging
    const handle = card.querySelector(".card-header") || card;
    handle.style.cursor = "move";
    handle.style.touchAction = "none";

    const onPointerDown = (e) => {
      if (!card.classList.contains("floating-card")) return;
      if (e.button !== undefined && e.button !== 0) return;

      // Don't hijack interactions
      if (e.target && e.target.closest("button, a, input, textarea, select, [role='button']")) {
        return;
      }

      e.preventDefault();

      const rect = card.getBoundingClientRect();
      const pointerX = e.clientX;
      const pointerY = e.clientY;
      st.dragging = {
        startX: pointerX,
        startY: pointerY,
        startLeft: rect.left,
        startTop: rect.top,
      };

      try {
        handle.setPointerCapture(e.pointerId);
      } catch (err) {}

      // Bring to front on grab
      this.bumpZIndex(key);

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp, { once: true });
      document.addEventListener("pointercancel", onPointerUp, { once: true });
    };

    const onPointerMove = (e) => {
      if (!st.dragging) return;
      const dx = e.clientX - st.dragging.startX;
      const dy = e.clientY - st.dragging.startY;

      const nextLeft = st.dragging.startLeft + dx;
      const nextTop = st.dragging.startTop + dy;

      card.style.left = `${nextLeft}px`;
      card.style.top = `${nextTop}px`;

      this.scheduleSave(key);
    };

    const onPointerUp = () => {
      document.removeEventListener("pointermove", onPointerMove);
      st.dragging = null;
      this.clampCardToViewport(key);
      this.flushSave(key);
    };

    // Store handlers for cleanup
    st._floatingHandle = handle;
    st._onPointerDown = onPointerDown;
    handle.addEventListener("pointerdown", onPointerDown);

    // Resize persistence
    if (typeof ResizeObserver !== "undefined") {
      st.resizeObserver = new ResizeObserver(() => {
        if (!card.classList.contains("floating-card")) return;
        this.scheduleSave(key);
      });
      st.resizeObserver.observe(card);
    }

    this.clampCardToViewport(key);
    this.flushSave(key);
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

    // Cleanup handlers
    try {
      if (st._floatingHandle && st._onPointerDown) {
        st._floatingHandle.removeEventListener("pointerdown", st._onPointerDown);
      }
    } catch (e) {}

    st._floatingHandle = null;
    st._onPointerDown = null;

    if (st.resizeObserver) {
      try {
        st.resizeObserver.disconnect();
      } catch (e) {}
      st.resizeObserver = null;
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

    // Restore to original position using placeholder
    const placeholder = st.placeholder;
    if (placeholder && placeholder.parentNode) {
      try {
        placeholder.parentNode.insertBefore(card, placeholder);
        placeholder.remove();
      } catch (e) {
        // Fallback: append to original parent
        try {
          (st.originalParent || document.querySelector(".content-grid") || document.body).appendChild(card);
        } catch (e2) {}
      }
    } else if (st.originalParent) {
      try {
        st.originalParent.insertBefore(card, st.originalNextSibling);
      } catch (e) {
        try {
          st.originalParent.appendChild(card);
        } catch (e2) {}
      }
    }
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

    if (st.saveTimer) return;

    st.saveTimer = window.setTimeout(() => {
      st.saveTimer = null;
      this.flushSave(key);
    }, 120);
  }

  flushSave(key) {
    const st = this.runtime.get(key);
    if (!st || !st.card) return;

    if (!st.card.classList.contains("floating-card")) return;

    const card = st.card;
    const rect = card.getBoundingClientRect();

    const settings = this.getSettings();
    settings.floating = settings.floating || {};
    const prev = settings.floating[key] || {};

    settings.floating[key] = {
      ...prev,
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      enabled: true,
      z: this.safeNumber(parseInt(card.style.zIndex || "10", 10), prev.z ?? 10),
    };

    this.saveSettings(settings);
  }

  clampCardToViewport(key) {
    const st = this.runtime.get(key);
    if (!st || !st.card) return;
    const card = st.card;
    if (!card.classList.contains("floating-card")) return;

    const rect = card.getBoundingClientRect();

    const pad = this.viewportPadding;
    const maxLeft = Math.max(pad, window.innerWidth - rect.width - pad);
    const maxTop = Math.max(pad, window.innerHeight - rect.height - pad);

    const left = this.clamp(rect.left, pad, maxLeft);
    const top = this.clamp(rect.top, pad, maxTop);

    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round(top)}px`;
  }

  safeNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  clamp(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.min(Math.max(value, min), max);
  }
}

// Export for debugging
window.FloatingModeManager = FloatingModeManager;

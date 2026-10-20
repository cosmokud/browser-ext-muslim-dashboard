/**
 * FloatingModeManager: viewport clamping and space checks.
 * Part of the class declared in js/floating/index.js; load this after it.
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
});

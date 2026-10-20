/**
 * FloatingModeManager: batched persistence of box state.
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
});

/**
 * FloatingModeManager: collapse button and resize handles.
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

    const hasCollapse = !!(st._collapseBtn && st._collapseBtn.isConnected);
    const hasReset = !!(st._resetSizeBtn && st._resetSizeBtn.isConnected);
    if (hasCollapse && hasReset) return;

    // Prevent drag initiation from control buttons.
    const stop = (e) => {
      try {
        e.stopPropagation();
      } catch (err) {}
    };

    if (!hasReset) {
      const resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.className = "floating-reset-size-btn";
      resetBtn.setAttribute("title", "Reset size to default");
      resetBtn.setAttribute("aria-label", "Reset size to default");
      // Use a simple square glyph to indicate baseline/default size.
      resetBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><rect x="6" y="6" width="12" height="12" rx="1.5"></rect></svg>`;

      const onResetSize = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!card.classList.contains("floating-card")) return;

        const defaults = this.getDefaultFloatingBox(key);
        const maxFloatingWidth = Math.max(
          280,
          Math.floor(window.innerWidth - this.viewportPadding * 2),
        );
        const maxFloatingHeight = Math.max(
          200,
          Math.floor(window.innerHeight - this.viewportPadding * 2),
        );

        const nextWidth = this.clamp(
          this.safeNumber(defaults.width, 420),
          280,
          maxFloatingWidth,
        );
        const nextHeight = this.clamp(
          this.safeNumber(defaults.height, 520),
          200,
          maxFloatingHeight,
        );

        card.style.width = `${Math.round(nextWidth)}px`;
        card.style.height = `${Math.round(nextHeight)}px`;

        // Keep the reset geometry fully visible and persist immediately.
        this.clampCardToViewport(key, { persist: true });
        this.scheduleMinUpdate(key);
        this.flushSave(key, { force: true });
      };

      resetBtn.addEventListener("click", onResetSize);
      resetBtn.addEventListener("pointerdown", stop);
      resetBtn.addEventListener("mousedown", stop);

      st._resetSizeBtn = resetBtn;
      try {
        card.appendChild(resetBtn);
      } catch (e) {}
    }

    if (!hasCollapse) {
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

      btn.addEventListener("click", onClick);
      btn.addEventListener("pointerdown", stop);
      btn.addEventListener("mousedown", stop);

      st._collapseBtn = btn;
      try {
        card.appendChild(btn);
      } catch (e) {}
    }
  }

  removeCollapseButton(key) {
    const st = this.runtime.get(key);
    if (!st) return;
    try {
      if (st._collapseBtn) st._collapseBtn.remove();
    } catch (e) {}
    st._collapseBtn = null;

    try {
      if (st._resetSizeBtn) st._resetSizeBtn.remove();
    } catch (e) {}
    st._resetSizeBtn = null;
  }

  getResizeDirectionForPointer(card, clientX, clientY) {
    if (!card) return null;
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;

    const rect = card.getBoundingClientRect();
    const edge = 12;

    const nearLeft = clientX - rect.left <= edge;
    const nearRight = rect.right - clientX <= edge;
    const nearBottom = rect.bottom - clientY <= edge;

    if (nearBottom && nearLeft) return "sw";
    if (nearBottom && nearRight) return "se";
    if (nearBottom) return "s";
    if (nearLeft) return "w";
    if (nearRight) return "e";

    return null;
  }

  getResizeCursor(direction) {
    const cursorByDirection = {
      e: "e-resize",
      w: "w-resize",
      s: "s-resize",
      se: "se-resize",
      sw: "sw-resize",
    };
    return cursorByDirection[String(direction || "")] || "";
  }

  ensureResizeHandles(key) {
    const st = this.runtime.get(key);
    if (!st || !st.card) return;
    const card = st.card;
    if (!card.classList.contains("floating-card")) return;

    const existingHandles = Array.isArray(st._resizeHandles)
      ? st._resizeHandles.filter((handle) => handle?.isConnected)
      : [];
    if (existingHandles.length > 0) {
      st._resizeHandles = existingHandles;
      return;
    }

    const handleDefs = ["w", "e", "s", "sw", "se"];
    st._resizeHandles = handleDefs
      .map((direction) => {
        const handle = document.createElement("div");
        handle.className = `floating-resize-handle floating-resize-handle-${direction}`;
        handle.dataset.resizeDir = direction;
        handle.setAttribute("aria-hidden", "true");
        handle.tabIndex = -1;
        try {
          card.appendChild(handle);
          return handle;
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);
  }

  removeResizeHandles(key) {
    const st = this.runtime.get(key);
    if (!st) return;

    if (Array.isArray(st._resizeHandles)) {
      st._resizeHandles.forEach((handle) => {
        try {
          handle?.remove();
        } catch (e) {}
      });
    }

    st._resizeHandles = null;
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
});

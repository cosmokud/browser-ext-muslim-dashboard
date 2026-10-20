/**
 * MuslimDashboard: floating action button menu.
 * Part of the class declared in js/app/index.js; load this after it.
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
})(MuslimDashboard.prototype, class {

  setupFabMenu() {
    const menu = document.getElementById("fabMenu");
    const toggle = document.getElementById("fabMenuToggle");
    const items = document.getElementById("fabMenuItems");

    if (!menu || !toggle || !items) return;

    // Enable JS-driven autohide mode (graceful: without JS toggle remains visible)
    menu.classList.add("autohide");
    toggle.setAttribute("inert", "");
    toggle.setAttribute("tabindex", "-1");

    const setHotVisible = (visible) => {
      menu.classList.toggle("hot-visible", visible);
      try {
        if (visible) {
          toggle.removeAttribute("inert");
          toggle.removeAttribute("tabindex");
          return;
        }

        // Never hide a currently focused control from the accessibility tree.
        if (document.activeElement === toggle) {
          try {
            toggle.blur();
          } catch (e) {}
        }

        toggle.setAttribute("inert", "");
        toggle.setAttribute("tabindex", "-1");
      } catch (e) {}
    };

    const setItemsHidden = (hidden, opts = {}) => {
      try {
        if (hidden) {
          // If focus is inside the menu items, move it out BEFORE hiding
          // from assistive tech to avoid browser warnings and AT focus traps.
          const active = document.activeElement;
          if (active && items.contains(active)) {
            try {
              active.blur();
            } catch (e) {}

            if (opts.returnFocusToToggle) {
              try {
                if (!toggle.hasAttribute("inert")) {
                  toggle.focus({ preventScroll: true });
                }
              } catch (e) {}
            }
          }

          try {
            items.setAttribute("inert", "");
          } catch (e) {}
          items.setAttribute("aria-hidden", "true");
          return;
        }

        items.removeAttribute("inert");
        items.setAttribute("aria-hidden", "false");
      } catch (e) {}
    };

    const setOpen = (open, opts = {}) => {
      menu.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      setItemsHidden(!open, {
        returnFocusToToggle: !!opts.returnFocusToToggle,
      });
      // keep toggle visible while menu is open
      if (open) setHotVisible(true);
    };

    const isOpen = () => menu.classList.contains("open");

    // ===== Custom tooltip for FAB buttons (left of cursor) =====
    // We suppress native `title` tooltips for FAB buttons and replace them with
    // a custom tooltip so we can control placement (left of cursor).
    const ensureFabTooltip = () => {
      let tip = document.getElementById("fabMenuTooltip");
      if (tip) return tip;
      tip = document.createElement("div");
      tip.id = "fabMenuTooltip";
      tip.className = "fab-menu-tooltip";
      tip.setAttribute("role", "tooltip");
      tip.setAttribute("aria-hidden", "true");
      document.body.appendChild(tip);
      return tip;
    };

    const getFabTooltipText = (btn) => {
      if (!btn) return "";
      return (
        btn.getAttribute("data-tooltip") ||
        btn.getAttribute("title") ||
        btn.getAttribute("aria-label") ||
        ""
      ).trim();
    };

    const showFabTooltip = (text, x, y) => {
      const tip = ensureFabTooltip();
      if (!text) {
        tip.classList.remove("active");
        tip.setAttribute("aria-hidden", "true");
        return;
      }

      tip.textContent = text;
      tip.classList.add("active");
      tip.setAttribute("aria-hidden", "false");

      // Measure after text update
      const rect = tip.getBoundingClientRect();
      const margin = 10;
      const offset = 14;

      // Prefer left of cursor. Flip to right only if it would go off-screen.
      let left = x - rect.width - offset;
      if (left < margin) {
        left = x + offset;
      }
      left = Math.max(
        margin,
        Math.min(left, window.innerWidth - rect.width - margin),
      );

      let top = y - rect.height / 2;
      top = Math.max(
        margin,
        Math.min(top, window.innerHeight - rect.height - margin),
      );

      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
    };

    const hideFabTooltip = () => {
      const tip = document.getElementById("fabMenuTooltip");
      if (!tip) return;
      tip.classList.remove("active");
      tip.setAttribute("aria-hidden", "true");
    };

    // Migrate native titles to data-tooltip (prevents default browser tooltip)
    try {
      menu.querySelectorAll("button").forEach((btn) => {
        const title = btn.getAttribute("title");
        if (title && !btn.getAttribute("data-tooltip")) {
          btn.setAttribute("data-tooltip", title);
          btn.removeAttribute("title");
        }
      });
    } catch (e) {}

    let activeTooltipBtn = null;
    menu.addEventListener("mouseover", (e) => {
      const btn = e.target?.closest?.("button");
      if (!btn || !menu.contains(btn)) return;
      activeTooltipBtn = btn;
      const text = getFabTooltipText(btn);
      showFabTooltip(text, e.clientX, e.clientY);
    });

    menu.addEventListener("mousemove", (e) => {
      if (!activeTooltipBtn) return;
      const btn = e.target?.closest?.("button");
      if (btn !== activeTooltipBtn) return;
      const text = getFabTooltipText(activeTooltipBtn);
      showFabTooltip(text, e.clientX, e.clientY);
    });

    menu.addEventListener("mouseout", (e) => {
      if (!activeTooltipBtn) return;
      const related = e.relatedTarget;
      if (related && activeTooltipBtn.contains(related)) return;
      activeTooltipBtn = null;
      hideFabTooltip();
    });

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setOpen(!isOpen());
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (!isOpen()) return;
      if (menu.contains(e.target)) return;
      setOpen(false);
      // hide toggle shortly after closing if user isn't hovering
      setTimeout(() => setHotVisible(false), 300);
    });

    // Protect middle-click autoscroll from being blocked by any event handlers.
    // This ensures the browser's native middle-click scroll behavior works.
    document.addEventListener(
      "auxclick",
      (e) => {
        // Middle mouse button is button === 1
        if (e.button === 1) {
          // Don't prevent default - allow browser's autoscroll
          e.stopPropagation();
        }
      },
      { capture: true },
    );

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (!isOpen()) return;
      if (e.key === "Escape") {
        setOpen(false, { returnFocusToToggle: true });
        setTimeout(() => setHotVisible(false), 300);
      }
    });

    // Close after choosing an action
    items.addEventListener("click", (e) => {
      const button = e.target.closest("button");
      if (!button) return;

      // Sticky Notes behavior:
      // - Show Sticky Notes  => keep FAB menu open
      // - Hide Sticky Notes  => close FAB menu
      if (button.id === "toggleStickyNotesBtn") {
        const stickyState = button.dataset.stickyNotesState;
        if (stickyState === "visible") {
          // Keep tooltip text in sync immediately after toggling.
          if (activeTooltipBtn === button) {
            const rect = button.getBoundingClientRect();
            const x =
              Number.isFinite(e.clientX) && e.clientX > 0
                ? e.clientX
                : rect.left + rect.width / 2;
            const y =
              Number.isFinite(e.clientY) && e.clientY > 0
                ? e.clientY
                : rect.top + rect.height / 2;
            showFabTooltip(getFabTooltipText(button), x, y);
          }
          return;
        }
      }

      // Add Sticky Note should keep the FAB menu open.
      if (button.id === "addStickyNoteBtn") {
        return;
      }

      setOpen(false);

      if (activeTooltipBtn === button) {
        hideFabTooltip();
        activeTooltipBtn = null;
      }
    });

    // Autohide behaviour: show toggle when pointer is near bottom-right, or on touch
    const threshold = 120; // px from corner
    const hideDelay = 700; // ms (snappier)
    let hideTimer = null;

    // Startup sequence: keep FAB fully hidden until the intro plays.
    let startupActive = true;
    try {
      menu.classList.add("startup-hidden");
    } catch (e) {}

    const showHot = () => {
      setHotVisible(true);
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    };

    const hideHot = () => {
      if (isOpen()) return; // keep visible if menu is open
      setHotVisible(false);
    };

    // Mouse move detection (desktop)
    document.addEventListener("mousemove", (e) => {
      if (startupActive) return;
      const dx = window.innerWidth - e.clientX;
      const dy = window.innerHeight - e.clientY;
      if (dx < threshold && dy < threshold) {
        showHot();
      } else {
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(hideHot, hideDelay);
      }
    });

    // Touch fallback (mobile)
    document.addEventListener(
      "touchstart",
      (e) => {
        if (startupActive) return;
        const t = e.touches[0];
        if (!t) return;
        const dx = window.innerWidth - t.clientX;
        const dy = window.innerHeight - t.clientY;
        if (dx < threshold && dy < threshold) {
          showHot();
          if (hideTimer) clearTimeout(hideTimer);
          hideTimer = setTimeout(hideHot, hideDelay * 3);
        }
      },
      { passive: true },
    );

    // Show on focus (keyboard)
    toggle.addEventListener("focus", () => {
      if (startupActive) return;
      showHot();
    });
    toggle.addEventListener("blur", () => {
      if (startupActive) return;
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(hideHot, hideDelay);
    });

    // Keyboard hotspot support (focusable invisible target at the corner)
    const hotspot = document.getElementById("fabHotspot");
    if (hotspot) {
      hotspot.addEventListener("focus", () => {
        if (startupActive) return;
        showHot();
        // Move focus to the toggle so keyboard users can open the menu
        setTimeout(() => toggle.focus(), 0);
      });
      hotspot.addEventListener("blur", () => {
        if (startupActive) return;
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(hideHot, hideDelay);
      });
    }

    // Ensure initial state
    setHotVisible(false);
    setOpen(false);

    // Ensure tooltip doesn't linger if menu closes or user clicks.
    document.addEventListener("click", () => hideFabTooltip());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideFabTooltip();
    });

    // Startup sequence: hidden → quick bounce in → stay visible a bit → fade out.
    const startupDelay = 0; // ms
    const bounceMs = 350; // ms
    const visibleMs = 4630; // ms
    const fadeMs = 220; // ms

    setTimeout(() => {
      try {
        menu.classList.remove("startup-hidden");
      } catch (e) {}

      setHotVisible(true);
      menu.classList.add("entrance-animate");

      setTimeout(() => {
        menu.classList.remove("entrance-animate");
        setTimeout(() => {
          setHotVisible(false);
          // Allow autohide detection after fade completes.
          setTimeout(() => {
            startupActive = false;
          }, fadeMs);
        }, visibleMs);
      }, bounceMs);
    }, startupDelay);
  }
});

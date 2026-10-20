/**
 * GridLayoutManager: grid init and edit mode toggling.
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

  init() {
    this.grid = document.querySelector(".content-grid");
    if (!this.grid) {
      console.warn("GridLayoutManager: .content-grid not found");
      return;
    }

    // Load saved layout or use default
    this.loadLayout();
    this.lastMainContainerResponsiveWidth =
      this.getMainContainerResponsiveWidth();

    // Load edit mode state from settings (default OFF)
    const settings = this.storage.getSettings();
    this.modes.set("edit", settings[this.getMainEditModeStorageKey()] === true);

    // Calculate initial responsive layout based on viewport
    this.lastViewportWidth = this.getSidebarViewportWidthForMiddleLayout();
    const isViewportZoomedOut = this.applyViewportAutoZoomIfNeeded(
      this.lastViewportWidth,
    );
    if (!isViewportZoomedOut) {
      this.calculateResponsiveLayout();
    }

    // Apply the layout to create flex rows
    this.applyLayout();
    this.recalculateLayout();

    // Setup event listeners for drag and drop (only active when edit mode is enabled)
    this.setupEventListeners();

    // Setup viewport-based responsive monitoring
    this.setupViewportListener();

    // Setup edit mode toggle button
    this.setupEditModeToggle();

    this.applySavedSidebarMiddleLayoutWidth({
      persist: false,
      triggerSnapCheck: false,
    });

    // Listen for visibility changes
    document.addEventListener("md:visibility-changed", () => {
      this.recalculateLayout();
    });

    // Remove the loading state to reveal the grid
    // Use double-rAF to ensure layout is fully calculated before showing
    // This prevents any flash of jumbled content on fast machines
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.grid.classList.remove("grid-layout-loading");
        this.grid.classList.add("grid-layout-ready");
      });
    });

    document.addEventListener("wheel", this.handleWheel, { passive: false });
    console.log("✅ GridLayoutManager initialized");
  }

  setupEditModeToggle() {
    const toggleBtn = document.getElementById("layoutEditBtn");
    if (!toggleBtn) return;

    // Set initial state
    this.updateEditModeUI(toggleBtn);

    // Handle toggle click
    toggleBtn.addEventListener("click", () => {
      this.toggleEditMode();
    });
  }

  toggleEditMode() {
    const wasEditModeEnabled = this.isEditModeEnabled;
    const editModeStorageKey = this.getEditModeStorageKey();

    if (this.isEditModeLocked) {
      // Safety: if lock is active, ensure edit mode is off.
      if (this.isEditModeEnabled) {
        this.modes.exit("edit");

        const settings = this.storage.getSettings();
        settings[editModeStorageKey] = false;
        this.storage.saveSettings(settings);
      }

      const toggleBtn = document.getElementById("layoutEditBtn");
      this.updateEditModeUI(toggleBtn);
      this.syncSidebarModeForEditState();
      return;
    }

    this.temporarilyDisableLayoutToggleAnimations();
    this.modes.toggle("edit");

    // Save state to settings
    const settings = this.storage.getSettings();
    settings[editModeStorageKey] = this.isEditModeEnabled;
    this.storage.saveSettings(settings);

    // Update UI
    const toggleBtn = document.getElementById("layoutEditBtn");
    this.updateEditModeUI(toggleBtn);

    // Update grid state (the body class belongs to the mode module)
    if (this.grid) {
      this.grid.classList.toggle("grid-edit-mode", this.isEditModeEnabled);
    }

    if (!this.isEditModeEnabled) {
      this.endMiddleLayoutResize();
      this.endSidebarResize();
      this.clearSidebarAutoEnableBlocked();
    }

    if (this.isQuranFocusModeContextActive()) {
      const pocketQuranCard = document.getElementById("pocketQuranCard");
      if (pocketQuranCard) {
        this.applySavedMiddleWidthToElement(pocketQuranCard);
      }
    }

    // Show toast notification
    this.showToast(
      this.isEditModeEnabled
        ? "Layout Editor Mode enabled - drag components to reposition"
        : "Layout Editor Mode disabled",
      this.isEditModeEnabled ? "success" : "info",
    );

    // Keep the current layout snapshot stable when leaving edit mode.
    if (wasEditModeEnabled && !this.isEditModeEnabled) {
      try {
        this.saveLayout();
      } catch (e) {}
    }

    this.syncSidebarModeForEditState();
  }

  updateEditModeUI(toggleBtn) {
    if (!toggleBtn) return;

    // Keep button hoverable so FAB custom tooltips continue to work even when locked.
    toggleBtn.disabled = false;
    toggleBtn.setAttribute(
      "aria-disabled",
      this.isEditModeLocked ? "true" : "false",
    );
    toggleBtn.classList.toggle("is-locked", this.isEditModeLocked);

    const tooltipText = this.isEditModeLocked
      ? "Layout Editor Mode locked while Quran Focus Mode or Moment Mode is active"
      : this.isEditModeEnabled
        ? "Disable Layout Editor Mode"
        : "Enable Layout Editor Mode";

    toggleBtn.setAttribute(
      "aria-pressed",
      this.isEditModeEnabled ? "true" : "false",
    );
    toggleBtn.classList.toggle("active", this.isEditModeEnabled);
    toggleBtn.setAttribute("data-tooltip", tooltipText);
    toggleBtn.setAttribute("aria-label", tooltipText);
    toggleBtn.removeAttribute("title");

    // Update grid class
    if (this.grid) {
      this.grid.classList.toggle("grid-edit-mode", this.isEditModeEnabled);
    }
  }

  temporarilyDisableLayoutToggleAnimations() {
    document.body.classList.add("layout-edit-toggle-no-anim");

    // Two RAFs keeps transitions disabled for this style/class flip only.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.classList.remove("layout-edit-toggle-no-anim");
      });
    });
  }

  syncSidebarModeForEditState() {
    try {
      if (
        window.dashboard &&
        typeof window.dashboard.syncSidebarModeWithLayoutEditMode === "function"
      ) {
        window.dashboard.syncSidebarModeWithLayoutEditMode();
      }
    } catch (e) {}
  }

  showToast(message, type = "info") {
    // Try to use the settings manager toast if available
    if (
      window.dashboard &&
      window.dashboard.settings &&
      typeof window.dashboard.settings.showToast === "function"
    ) {
      window.dashboard.settings.showToast(message, type);
      return;
    }

    // Fallback: create a simple toast
    const existingToast = document.querySelector(".grid-toast");
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement("div");
    toast.className = `grid-toast grid-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    let hideTimer = null;

    const hideToast = () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }

      toast.classList.remove("grid-toast-visible");
      setTimeout(() => toast.remove(), 300);
    };

    const scheduleHide = (delayMs) => {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
      hideTimer = setTimeout(hideToast, delayMs);
    };

    requestAnimationFrame(() => {
      toast.classList.add("grid-toast-visible");
    });

    toast.addEventListener(
      "mouseenter",
      () => {
        scheduleHide(120);
      },
      { once: true },
    );

    scheduleHide(2500);
  }

  setupViewportListener() {
    // Listen to window resize events with debouncing
    window.addEventListener("resize", this.handleViewportResize);

    // Also listen to orientation changes on mobile
    window.addEventListener("orientationchange", () => {
      setTimeout(() => this.handleViewportResize(), 100);
    });

    // Observe container width changes (e.g., devtools open/close, custom width)
    if (typeof ResizeObserver !== "undefined" && this.grid) {
      if (this.containerResizeObserver) {
        this.containerResizeObserver.disconnect();
      }
      this.containerResizeObserver = new ResizeObserver(() => {
        this.handleViewportResize("observer");
      });
      this.containerResizeObserver.observe(this.grid);
    }
  }
});

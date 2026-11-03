/**
 * MuslimDashboard: sidebar mode entry and exit.
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

  isSidebarWidthSupported() {
    return true;
  }

  syncSidebarModeWithLayoutEditMode() {
    const focusModeActive = this.modes.isActive("quranFocus");

    const isEditModeEnabled = !!(
      this.gridLayout &&
      typeof this.gridLayout.isEditMode === "function" &&
      this.gridLayout.isEditMode()
    );
    const sidebarAutoEnableBlocked = !!(
      this.gridLayout &&
      typeof this.gridLayout.isSidebarAutoEnableBlocked === "function" &&
      this.gridLayout.isSidebarAutoEnableBlocked()
    );
    const keepCurrentSidebarLayout = this.modes.isActive("sidebar");
    const wantsSidebarLayout = isEditModeEnabled || keepCurrentSidebarLayout;

    const canUseSidebarLayout =
      wantsSidebarLayout &&
      !focusModeActive &&
      !this.modes.isActive("moment") &&
      !sidebarAutoEnableBlocked &&
      this.isSidebarWidthSupported();

    if (typeof this._setSidebarModeEnabled === "function") {
      this._setSidebarModeEnabled(canUseSidebarLayout);
    }
  }

  exitExcludedModes(name) {
    for (const other of this.modes.excludes(name)) {
      try {
        this.modeSetters[other]?.(false);
      } catch (e) {
        console.warn(`Exiting ${other} mode failed:`, e);
      }
    }
  }

  initSidebarMode() {
    const setEnabled = (enabled) => {
      const next = enabled === true;

      // Enforce mutual exclusivity: sidebar mode cannot coexist with Quran focus mode or Moment mode.
      // Exit other modes first so visibility/layout restore happens cleanly.
      if (next) {
        try {
          if (
            this.gridLayout &&
            typeof this.gridLayout.clearSidebarAutoEnableBlocked === "function"
          ) {
            this.gridLayout.clearSidebarAutoEnableBlocked();
          }
        } catch (e) {}

        this.exitExcludedModes("sidebar");
      }

      // Guard: sidebar layout requires enough viewport width.
      if (next && !this.isSidebarWidthSupported()) {
        try {
          const s = this.storage.getSettings();
          s.sidebarModeEnabled = false;
          if (s.lastDashboardMode === "sidebar") s.lastDashboardMode = "normal";
          this.storage.saveSettings(s);
        } catch (e) {}

        return false;
      }

      // Enable: toggle CSS first (so sidebars are visible), then swap layout state.
      // Disable: swap layout state first (so components return), then remove CSS.
      if (next) {
        this.modes.set("sidebar", true);

        try {
          const s = this.storage.getSettings();
          s.sidebarModeEnabled = true;
          // Ensure other modes are off.
          s.quranFocusModeEnabled = false;
          s.momentModeEnabled = false;
          s.lastDashboardMode = "sidebar";
          this.storage.saveSettings(s);
        } catch (e) {}

        try {
          this.gridLayout?.setSidebarModeEnabled?.(true);
        } catch (e) {
          console.warn("Sidebar mode enable failed:", e);
        }
      } else {
        try {
          this.gridLayout?.setSidebarModeEnabled?.(false);
        } catch (e) {
          console.warn("Sidebar mode disable failed:", e);
        }

        this.modes.set("sidebar", false);

        try {
          const s = this.storage.getSettings();
          const autoBlockedByViewport =
            this.gridLayout?.isSidebarAutoEnableBlocked?.() === true;

          // Keep user's sidebar preference when collapse was automatic due to
          // viewport clipping (startup/small window). This allows auto-restore
          // when space returns and across browser restarts.
          if (!autoBlockedByViewport) {
            s.sidebarModeEnabled = false;
            if (s.lastDashboardMode === "sidebar") {
              s.lastDashboardMode = "normal";
            }
          } else {
            s.sidebarModeEnabled = true;
            s.lastDashboardMode = "sidebar";
          }
          this.storage.saveSettings(s);
        } catch (e) {}
      }

      return true;
    };

    // Expose setter for other modes to call.
    this._setSidebarModeEnabled = setEnabled;
    this.modeSetters.sidebar = setEnabled;

    // Restore the previously active layout shape when valid; Layout Editor Mode
    // can still opt into sidebars automatically.
    let shouldStartInSidebarLayout = false;
    try {
      shouldStartInSidebarLayout =
        Modes.restore(this.storage.getSettings()) === "sidebar";
    } catch (e) {}

    setEnabled(shouldStartInSidebarLayout);
    this.syncSidebarModeWithLayoutEditMode();

    // Keep sidebar availability in sync with viewport width while edit mode is active.
    let resizeTimer = null;
    window.addEventListener("resize", () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (this.gridLayout && this.gridLayout.isSidebarModeEnabled === false) {
          const blocked = this.gridLayout.isSidebarAutoEnableBlocked?.() === true;
          const hasSpace = this.gridLayout.hasSidebarDropViewportSpace?.() === true;
          if (blocked && hasSpace) {
            this.gridLayout.clearSidebarAutoEnableBlocked?.();
            if (typeof this._setSidebarModeEnabled === "function") {
              this._setSidebarModeEnabled(true);
            }
            return;
          }
        }
        this.syncSidebarModeWithLayoutEditMode();
      }, 120);
    });

    // Wake/resume safeguard: some systems return from sleep without a reliable
    // resize event, so re-assert sidebar/layout state when the tab becomes active.
    const scheduleSidebarWakeSync = (reason = "wake") => {
      const runSync = () => {
        try {
          this.gridLayout?.handleViewportResize?.(`resume-${reason}`);
        } catch (e) {}
        this.syncSidebarModeWithLayoutEditMode();
      };

      requestAnimationFrame(runSync);
      setTimeout(runSync, 180);
    };

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        scheduleSidebarWakeSync("visibility");
      }
    });
    window.addEventListener("focus", () => scheduleSidebarWakeSync("focus"));
    window.addEventListener("pageshow", () => scheduleSidebarWakeSync("pageshow"));
  }
});

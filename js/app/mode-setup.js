/**
 * MuslimDashboard: quran focus, moment mode and pinned apps.
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

  initQuranFocusMode() {
    // Nothing is in focus mode until the restore path below says so.
    this.modes.exit("quranFocus");

    const focusBtn = document.getElementById("quranFocusBtn");
    if (!focusBtn) return;

    const getHideableElements = () => {
      return [
        document.querySelector(".header"),
        document.getElementById("pinnedAppsSection"),
        document.getElementById("searchBarSection"),
        document.getElementById("quoteSection"),
        document.getElementById("prayerTimesCard"),
        document.getElementById("calendarCard"),
        document.getElementById("qiblaCard"),
        document.getElementById("weatherCard"),
        document.getElementById("lunarPhaseCard"),
        document.getElementById("fastingCard"),
        document.getElementById("flashcardCard"),
        document.getElementById("adhkarCard"),
        document.getElementById("hadithCard"),
        document.getElementById("todoCard"),
        document.getElementById("notesCard"),
      ].filter(Boolean);
    };

    let focusEnterAnimationClearTimer = null;
    let focusEnterAnimationEndHandler = null;

    const runFocusEnterAnimation = () => {
      const pocketQuranCard = document.getElementById("pocketQuranCard");
      if (!pocketQuranCard) return;

      if (focusEnterAnimationClearTimer) {
        clearTimeout(focusEnterAnimationClearTimer);
        focusEnterAnimationClearTimer = null;
      }
      if (focusEnterAnimationEndHandler) {
        pocketQuranCard.removeEventListener(
          "animationend",
          focusEnterAnimationEndHandler,
        );
        focusEnterAnimationEndHandler = null;
      }

      pocketQuranCard.classList.remove("quran-focus-entering");
      void pocketQuranCard.offsetWidth;
      pocketQuranCard.classList.add("quran-focus-entering");

      const clearEnterClass = () => {
        if (focusEnterAnimationClearTimer) {
          clearTimeout(focusEnterAnimationClearTimer);
          focusEnterAnimationClearTimer = null;
        }
        if (focusEnterAnimationEndHandler) {
          pocketQuranCard.removeEventListener(
            "animationend",
            focusEnterAnimationEndHandler,
          );
          focusEnterAnimationEndHandler = null;
        }
        pocketQuranCard.classList.remove("quran-focus-entering");
      };

      focusEnterAnimationEndHandler = (event) => {
        if (
          event.target !== pocketQuranCard ||
          event.animationName !== "quranFocusEnterFade"
        ) {
          return;
        }
        clearEnterClass();
      };

      pocketQuranCard.addEventListener(
        "animationend",
        focusEnterAnimationEndHandler,
      );

      focusEnterAnimationClearTimer = setTimeout(clearEnterClass, 520);
    };

    const enterFocusMode = (opts = {}) => {
      // Enforce mutual exclusivity: focus mode cannot coexist with sidebar mode.
      // Capture the previous mode so exiting focus can restore it.
      if (!opts.preservePreviousMode) {
        this._dashboardModeBeforeFocus = this.modes.isActive("sidebar")
          ? "sidebar"
          : "normal";
      }

      // Focus takes over the screen: turn off the modes it excludes first.
      this.exitExcludedModes("quranFocus");
      this.modes.enter("quranFocus");
      focusBtn.setAttribute("aria-pressed", "true");
      focusBtn.classList.add("active");

      try {
        const s = this.storage.getSettings();
        s.quranFocusModeEnabled = true;
        // Ensure other modes are off.
        s.sidebarModeEnabled = false;
        s.momentModeEnabled = false;
        s.lastDashboardMode = "quranFocus";
        this.storage.saveSettings(s);
      } catch (e) {}

      // Close the FAB menu if it's open
      const fabMenu = document.getElementById("fabMenu");
      const fabToggle = document.getElementById("fabMenuToggle");
      const fabItems = document.getElementById("fabMenuItems");
      if (fabMenu && fabMenu.classList.contains("open")) {
        fabMenu.classList.remove("open");
        if (fabToggle) {
          fabToggle.setAttribute("aria-expanded", "false");
          fabToggle.setAttribute("aria-label", "Open menu");
        }
        if (fabItems) {
          try {
            const active = document.activeElement;
            if (active && fabItems.contains(active)) {
              try {
                active.blur();
              } catch (e) {}
            }

            fabItems.setAttribute("inert", "");
          } catch (e) {}
          fabItems.setAttribute("aria-hidden", "true");
        }
      }

      // Store current visibility state of Pocket Quran
      const pocketQuranCard = document.getElementById("pocketQuranCard");
      const wasHidden =
        pocketQuranCard && pocketQuranCard.style.display === "none";

      // Force show Pocket Quran if it was hidden
      if (pocketQuranCard && wasHidden) {
        pocketQuranCard.style.display = "";
        pocketQuranCard.setAttribute("aria-hidden", "false");
      }

      // Hide all other elements with !important inline style
      const elements = getHideableElements();
      elements.forEach((el) => {
        el.dataset.focusModeHidden =
          el.style.display === "none" ? "was-hidden" : "visible";
        el.style.setProperty("display", "none", "important");
        el.setAttribute("aria-hidden", "true");
      });

      // Also hide grid-flex-row containers except the one containing pocketQuranCard
      const gridRows = document.querySelectorAll(".grid-flex-row");
      gridRows.forEach((row) => {
        if (!row.contains(pocketQuranCard)) {
          row.dataset.focusModeHidden = "row";
          row.style.setProperty("display", "none", "important");
        }
      });

      // Focus mode uses its own edit-mode state (separate from main layout).
      try {
        if (
          this.gridLayout &&
          typeof this.gridLayout.setQuranFocusModeActive === "function"
        ) {
          this.gridLayout.setQuranFocusModeActive(true);
        }
      } catch (e) {}

      // Switch Pocket Quran sizing to focus-mode width scope so main-layout
      // custom width does not leak into focus mode.
      try {
        if (
          pocketQuranCard &&
          this.gridLayout &&
          typeof this.gridLayout.applySavedMiddleWidthToElement === "function"
        ) {
          this.gridLayout.applySavedMiddleWidthToElement(pocketQuranCard);
        }
      } catch (e) {}

      runFocusEnterAnimation();
    };

    const exitFocusMode = () => {
      this.modes.exit("quranFocus");

      focusBtn.setAttribute("aria-pressed", "false");
      focusBtn.classList.remove("active");

      const pocketQuranCard = document.getElementById("pocketQuranCard");
      pocketQuranCard?.classList.remove("quran-focus-entering");

      const restoreMode =
        this._dashboardModeBeforeFocus === "sidebar" ? "sidebar" : "normal";

      try {
        const s = this.storage.getSettings();
        s.quranFocusModeEnabled = false;
        s.sidebarModeEnabled = restoreMode === "sidebar";

        // Restore the last non-focus mode (captured on entry).
        s.lastDashboardMode = restoreMode;
        this.storage.saveSettings(s);
      } catch (e) {}

      // Return to main-layout edit-mode state after leaving focus mode.
      try {
        if (
          this.gridLayout &&
          typeof this.gridLayout.setQuranFocusModeActive === "function"
        ) {
          this.gridLayout.setQuranFocusModeActive(false);
        }
      } catch (e) {}

      // Undo the temporary, forced focus-mode hiding without reloading the page.
      // This keeps Pocket Quran recitation (audio) running.
      const elements = getHideableElements();
      elements.forEach((el) => {
        try {
          el.style.removeProperty("display");
        } catch (e) {}
        try {
          el.removeAttribute("aria-hidden");
        } catch (e) {}
        try {
          delete el.dataset.focusModeHidden;
        } catch (e) {}
      });

      // Restore grid rows that were hidden in focus mode.
      const gridRows = document.querySelectorAll(".grid-flex-row");
      gridRows.forEach((row) => {
        try {
          row.style.removeProperty("display");
        } catch (e) {}
        try {
          delete row.dataset.focusModeHidden;
        } catch (e) {}
      });

      // Restore the user's saved grid layout (focus mode may temporarily hide
      // most cards which can confuse the responsive repacking logic).
      try {
        if (
          this.gridLayout &&
          typeof this.gridLayout.loadLayoutForMode === "function" &&
          typeof this.gridLayout.applyLayout === "function"
        ) {
          this.gridLayout.loadLayoutForMode(
            this.gridLayout.isSidebarModeEnabled ? "sidebar" : "normal",
          );
          this.gridLayout.applyLayout();

          // Restore main-layout width scope after leaving focus mode.
          if (
            typeof this.gridLayout.applySavedMiddleWidthsFromDOM === "function"
          ) {
            this.gridLayout.applySavedMiddleWidthsFromDOM();
          }
        }
      } catch (e) {}

      // Re-apply visibility + layout (this triggers grid recalculation).
      try {
        this.applyComponentVisibility();
      } catch (e) {}

      // Re-apply container width and nudge layout recalculation.
      try {
        const s = this.storage.getSettings();
        if (
          this.settings &&
          typeof this.settings.applyContainerWidth === "function"
        ) {
          this.settings.applyContainerWidth(
            s.containerWidth || "narrow",
            s.containerWidthCustom || 70,
          );
        }
      } catch (e) {}

      try {
        window.dispatchEvent(new Event("resize"));
      } catch (e) {}

      // If focus was entered from sidebar mode, restore sidebar layout/state.
      // Otherwise keep the existing sync behavior for normal mode.
      let restoredSidebarAfterFocus = false;
      if (
        restoreMode === "sidebar" &&
        typeof this._setSidebarModeEnabled === "function"
      ) {
        try {
          restoredSidebarAfterFocus =
            this._setSidebarModeEnabled(true) === true;
        } catch (e) {
          restoredSidebarAfterFocus = false;
        }
      }

      if (!restoredSidebarAfterFocus) {
        this.syncSidebarModeWithLayoutEditMode();
      }

      // Apply any floating toggles that were changed while focus mode was active.
      try {
        if (
          this.floating &&
          typeof this.floating.applyDeferredFromSettings === "function"
        ) {
          this.floating.applyDeferredFromSettings();
        } else if (
          this.floating &&
          typeof this.floating.applyViewportConstraint === "function"
        ) {
          this.floating.applyViewportConstraint();
        }
      } catch (e) {}

      try {
        if (
          this.floating &&
          typeof this.floating.enforceNonFloatingFromDashboardSettings ===
            "function"
        ) {
          this.floating.enforceNonFloatingFromDashboardSettings();
        }
      } catch (e) {}
    };

    // Expose setter for other modes to call.
    this._setQuranFocusModeEnabled = (enabled) => {
      const next = enabled === true;
      if (next) enterFocusMode();
      else exitFocusMode();
    };
    this.modeSetters.quranFocus = this._setQuranFocusModeEnabled;

    const toggleFocusMode = () => {
      if (this.modes.isActive("quranFocus")) {
        exitFocusMode();
      } else {
        enterFocusMode();
      }
    };

    focusBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFocusMode();

      // Safety reconcile after any focus toggle click.
      // If a floating setting is OFF, component must not remain floating.
      window.setTimeout(() => {
        try {
          if (
            this.floating &&
            typeof this.floating.enforceNonFloatingFromDashboardSettings ===
              "function"
          ) {
            this.floating.enforceNonFloatingFromDashboardSettings();
          }
        } catch (err) {}
      }, 0);
    });

    // Handle Escape key to exit focus mode
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.modes.isActive("quranFocus")) {
        exitFocusMode();
      }
    });

    // Restore last state from settings
    try {
      const s = this.storage.getSettings();
      if (Modes.restore(s) === "quranFocus") {
        // Capture what the user was using before focus (if we have a hint),
        // but do not restore it simultaneously.
        this._dashboardModeBeforeFocus =
          s.sidebarModeEnabled === true ? "sidebar" : "normal";
        try {
          if (typeof this._setSidebarModeEnabled === "function") {
            this._setSidebarModeEnabled(false);
          } else {
            this.modes.exit("sidebar");
            this.gridLayout?.setSidebarModeEnabled?.(false);
          }
        } catch (e) {}

        enterFocusMode({ preservePreviousMode: true });
      }
    } catch (e) {}
  }

  initMomentMode() {
    if (typeof window.MomentModeManager !== "function") return;

    this.momentMode = new window.MomentModeManager(this);
    this.momentMode.init();
  }

  applyPinnedAppsSettings(perRowOverride) {
    const settings = this.storage.getSettings();
    const perRow = SettingsRegistry.coerce(
      "pinnedAppsPerRow",
      Number.isFinite(perRowOverride)
        ? perRowOverride
        : Number(settings.pinnedAppsPerRow),
    );

    const appCount = Array.isArray(this.pinnedApps?.apps)
      ? this.pinnedApps.apps.length
      : 0;
    const needsBuffer = appCount > 0 && appCount % perRow === 0;
    const effectivePerRow = needsBuffer ? perRow + 1 : perRow;

    const grid = document.getElementById("pinnedAppsGrid");
    if (grid) {
      grid.style.setProperty("--pinned-apps-per-row", String(effectivePerRow));
    }
  }
});

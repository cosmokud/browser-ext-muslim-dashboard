/**
 * MuslimDashboard, part 2 of 3.
 * Moved out of js/app.js at method boundaries, so no single file carries the
 * whole class. The class itself is declared in js/app.js; load this after it.
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

  showToast(message, type = "info") {
    try {
      if (this.settings && typeof this.settings.showToast === "function") {
        this.settings.showToast(message, type);
        return;
      }
    } catch (e) {}

    try {
      this.gridLayout?.showToast?.(message, type);
    } catch (e) {}
  }

  normalizeDebugDateYMD(rawValue) {
    return DebugClock.normalizeDateYMD(rawValue, this._nativeDateCtor || Date);
  }

  applyDebugDateSimulationFromSettings(settingsOverride = null) {
    const settings =
      settingsOverride && typeof settingsOverride === "object"
        ? settingsOverride
        : this.storage.getSettings();

    const debugSettings =
      settings && typeof settings.debug === "object" ? settings.debug : {};

    const debugModeEnabled = globalThis.ENABLE_DEBUG_MODE === true;

    const simulationEnabled =
      debugModeEnabled && debugSettings.simulatedDateEnabled === true;
    const simulatedYmd = this.normalizeDebugDateYMD(
      debugSettings.simulatedDate,
    );

    const simulatedTime = DebugClock.normalizeTimeHM(
      debugSettings.simulatedTime,
    );

    const NativeDate = this._nativeDateCtor || Date;

    if (simulationEnabled && simulatedYmd) {
      const getSimulatedNowMs = () =>
        DebugClock.now(simulatedYmd, simulatedTime, NativeDate);

      const SimulatedDate = class extends NativeDate {
        constructor(...args) {
          if (args.length === 0) {
            super(getSimulatedNowMs());
            return;
          }
          super(...args);
        }

        static now() {
          return getSimulatedNowMs();
        }

        static parse(value) {
          return NativeDate.parse(value);
        }

        static UTC(...args) {
          return NativeDate.UTC(...args);
        }
      };

      window.Date = SimulatedDate;
      this._debugDateSimulationEnabled = true;
      this._debugSimulatedDateYMD = simulatedYmd;
      this._debugSimulatedTimeHM = simulatedTime || null;
      return;
    }

    if (window.Date !== NativeDate) {
      window.Date = NativeDate;
    }
    this._debugDateSimulationEnabled = false;
    this._debugSimulatedDateYMD = null;
    this._debugSimulatedTimeHM = null;
  }

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
      const s = this.storage.getSettings();
      const focusInitial =
        s.quranFocusModeEnabled === true ||
        s.lastDashboardMode === "quranFocus";
      const momentInitial =
        globalThis.ENABLE_DEBUG_MODE === true &&
        (s.momentModeEnabled === true || s.lastDashboardMode === "moment");

      shouldStartInSidebarLayout =
        !focusInitial && !momentInitial && s.sidebarModeEnabled === true;
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

  async init() {
    console.log("🕌 Muslim Dashboard initializing...");

    // Ensure Pocket Quran has a default Arabic font family before the component
    // initializes (so existing users missing this field get a stable default).
    try {
      const s = this.storage.getSettings();
      if (!s.pocketQuran) s.pocketQuran = {};
      const current = String(s.pocketQuran.arabicFontFamily || "").trim();
      if (!current) {
        s.pocketQuran.arabicFontFamily = "KFGQPC Uthman Taha Naskh";
        this.storage.saveSettings(s);
      }
    } catch (e) {}

    // Which calendar "today" is on, before any card renders.
    try {
      HijriCalendars.setMode(
        this.storage.getSettings()?.fasting?.hijriCalendar,
      );
    } catch (e) {}

    // Apply debug date simulation as early as possible so all modules share it.
    try {
      this.applyDebugDateSimulationFromSettings();
    } catch (e) {}

    // Initialize themes first (applies CSS variables before any UI renders)
    this.themes.init();

    // Start background first for visual appeal
    this.backgrounds.init();

    // Initialize time display (synchronous - no network)
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);

    // Initialize date display (synchronous - no network)
    this.updateDate();

    // Initialize greeting (synchronous - no network)
    this.updateGreeting();

    // Initialize todos (synchronous - uses localStorage)
    this.todos.init();

    // Initialize pinned apps (synchronous - uses localStorage)
    this.pinnedApps = new PinnedAppsManager(this.storage);

    // Initialize search bar (synchronous - uses localStorage)
    this.searchBar = new SearchBarManager(this.storage);

    if (window.faviconCache?.initializeAll) {
      window.faviconCache
        .initializeAll(this.pinnedApps.apps, this.searchBar.searches)
        .catch(() => {});
    }

    // Initialize calendar (synchronous - uses localStorage)
    this.calendar = new CalendarManager(this.storage, this.hijri);
    this.calendar.init();

    // Initialize fasting countdowns (synchronous - no network)
    this.fasting = new FastingManager(this.storage, this.hijri);
    this.fasting.init();

    // Initialize sticky notes (synchronous - uses localStorage)
    this.stickyNotes = new StickyNotesManager(this.storage);

    // Initialize lunar phase (synchronous initial render)
    this.lunarPhase = new LunarPhaseManager(this.storage, this.prayerTimes);
    this.lunarPhase.init();

    // Initialize notes (synchronous - uses localStorage)
    this.notes = new NotesManager(this.storage);

    // Initialize pocket quran (renders loading state, fetches in background)
    this.pocketQuran = new PocketQuranManager(this.storage);

    // Initialize weather manager (renders loading state synchronously)
    this.weather = new WeatherManager(this.storage);

    // Initialize flashcards manager (renders loading state synchronously)
    this.flashcards = new FlashcardManager(this.storage);

    // Initialize hadith manager (renders loading state synchronously)
    this.hadith = new HadithManager(this.storage);

    // Initialize adhkar manager (renders loading state synchronously)
    this.adhkar = new AdhkarManager(this.storage);

    // Initialize unified content search (adds search buttons + modal wiring)
    try {
      if (window.ContentSearchManager) {
        this.contentSearch = new window.ContentSearchManager({
          storage: this.storage,
          quotes: this.quotes,
          adhkar: this.adhkar,
          hadith: this.hadith,
          notes: this.notes,
          todos: this.todos,
        });
        this.contentSearch.init();
      }
    } catch (e) {
      console.warn("ContentSearchManager init failed:", e);
    }

    // Initialize settings manager (needs references to other managers)
    this.settings = new SettingsManager(
      this.storage,
      this.prayerTimes,
      this.qibla,
      this.quotes,
      this.backgrounds,
      this.weather,
      this.flashcards,
      this.hadith,
      this.adhkar,
    );
    this.settings.init();
    this.openSettingsFromUrlIfRequested();
    window.addEventListener("hashchange", () => {
      this.openSettingsFromUrlIfRequested();
    });

    // Apply initial container width
    const settings = this.storage.getSettings();
    this.settings.applyContainerWidth(
      settings.containerWidth || "narrow",
      settings.containerWidthCustom || 70,
    );

    // Apply floating mode positions/states before visibility + layout calculations
    try {
      this.floating.init();
    } catch (e) {
      console.warn("Floating mode init failed:", e);
    }

    // Apply component visibility
    this.applyComponentVisibility();

    // Initialize grid layout manager for drag-and-drop (after visibility is applied)
    try {
      this.gridLayout = new GridLayoutManager(this.storage, this.modes);
      this.gridLayout.init();
    } catch (e) {
      console.warn("GridLayoutManager init failed:", e);
    }

    // Initialize sidebar layout controller (used by Layout Edit Mode).
    this.initSidebarMode();

    // Apply heading settings
    this.applyHeadingSettings();

    // Apply pinned apps layout settings
    this.applyPinnedAppsSettings();

    // Apply per-card blur overrides (readability-first components)
    this.initReadabilityBlurOverrides();

    // Initialize Quran Focus Mode
    this.initQuranFocusMode();

    // Initialize Moment Mode
    this.initMomentMode();

    // Add global Refresh Background button handler (bottom-right UI)
    const refreshBtn = document.getElementById("refreshBgBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        if (this.backgrounds) {
          this.backgrounds.changeBackground();
        }
        refreshBtn.classList.add("rotate-once");
        setTimeout(() => refreshBtn.classList.remove("rotate-once"), 700);
      });
    }

    // Setup hamburger menu for bottom-right actions
    this.setupFabMenu();

    // Setup location updates
    this.setupLocationUpdates();

    // Keep prayer card in sync when popup saves prayer/location settings.
    this.setupExternalPrayerSettingsSync();

    console.log("✅ Muslim Dashboard UI ready!");

    // ════════════════════════════════════════════════════════════════════════
    // ASYNC BACKGROUND INITIALIZATION
    // All network-dependent operations run in parallel, non-blocking
    // Components show loading states immediately, then update when data arrives
    // ════════════════════════════════════════════════════════════════════════

    // Track background async tasks for potential error handling
    const backgroundTasks = [];

    // Prayer times initialization (includes geolocation + reverse geocoding)
    backgroundTasks.push(
      this.prayerTimes
        .init()
        .then(() => {
          // Initialize qibla after location is available
          const location = this.prayerTimes.getCurrentLocation();
          if (location) {
            this.qibla.init(location.latitude, location.longitude);
          }
          // Refresh lunar phase with new location
          if (this.lunarPhase) {
            this.lunarPhase.refresh();
          }
        })
        .catch((err) => {
          console.warn("Prayer times init background error:", err);
        }),
    );

    // Quotes initialization (loads default quotes JSON)
    backgroundTasks.push(
      this.quotes.init().catch((err) => {
        console.warn("Quotes init background error:", err);
      }),
    );

    // Weather initialization (includes geolocation + weather API)
    backgroundTasks.push(
      this.weather.init().catch((err) => {
        console.warn("Weather init background error:", err);
      }),
    );

    // Flashcards initialization (loads CSV data)
    backgroundTasks.push(
      this.flashcards.init().catch((err) => {
        console.warn("Flashcards init background error:", err);
      }),
    );

    // Hadith initialization (loads default JSON sets)
    backgroundTasks.push(
      this.hadith.init().catch((err) => {
        console.warn("Hadith init background error:", err);
      }),
    );

    // Adhkar initialization (loads default JSON sets)
    backgroundTasks.push(
      this.adhkar.init().catch((err) => {
        console.warn("Adhkar init background error:", err);
      }),
    );

    // Wait for all background tasks to complete (non-blocking for UI)
    Promise.allSettled(backgroundTasks).then(() => {
      console.log("✅ Muslim Dashboard fully loaded (all data fetched)!");
    });
  }

  initReadabilityBlurOverrides() {
    /**
     * Enhanced blur settings popup for individual cards.
     * Features:
     * - Triple toggle for glass effect: OFF / DASH (follow dashboard) / ON
     *   - OFF: Disable glass effect for this card only (more readable), locks blur power slider
     *   - DASH: Follow dashboard's global glass setting (default behavior)
     *   - ON: Force enable glass effect for this card
     * - Blur power slider: enabled only in ON mode
     */

    const isDashboardGlassEnabled = () => {
      try {
        const settings = this.storage.getSettings();
        return settings?.theme?.glassEnabled !== false;
      } catch (e) {
        return true;
      }
    };

    const getDashboardBlurPower = () => {
      try {
        const settings = this.storage.getSettings();
        return settings?.uiBlurPower ?? 100;
      } catch (e) {
        return 100;
      }
    };

    const getDashboardGlassOpacity = () => {
      try {
        const settings = this.storage.getSettings();
        return SettingsRegistry.coerce("glassOpacity", settings?.theme?.glassOpacity);
      } catch (e) {
        return 50;
      }
    };

    const readSettings = () => this.storage.getSettings();
    const writeSettings = (patch) => {
      const current = this.storage.get("settings", {});
      this.storage.set("settings", { ...current, ...patch });
    };

    const validBlurStates = new Set(["off", "dashboard", "on"]);
    const normalizeBlurState = (value) =>
      validBlurStates.has(value) ? value : "dashboard";
    const normalizeBlurPower = (value) =>
      SettingsRegistry.coerce("blurPower", value, 100);
    const normalizeGlassOpacity = (
      value,
      fallback = getDashboardGlassOpacity(),
    ) => {
      if (value === null || typeof value === "undefined") {
        return fallback;
      }

      return SettingsRegistry.coerce("glassOpacity", value, fallback);
    };

    const blurPopupByCardId = new Map();
    const blurPopupPortalled = new WeakSet();
    let blurPopupPositionRaf = null;

    const ensureBlurPopupPortal = (menu, popup) => {
      if (!menu || !popup) return;
      if (blurPopupPortalled.has(popup)) return;

      try {
        document.body.appendChild(popup);
        popup.classList.add("blur-popup-portal");
        blurPopupPortalled.add(popup);
      } catch (e) {}
    };

    const positionBlurPopup = (menu, popup) => {
      if (!menu || !popup || !popup.classList.contains("blur-popup-open")) {
        return;
      }

      const anchorRect = menu.getBoundingClientRect();
      const viewportPadding = 10;
      const gap = 10;

      const popupWidth = Math.max(220, Math.round(popup.offsetWidth || 280));
      const popupHeight = Math.max(200, Math.round(popup.offsetHeight || 320));

      let left = Math.round(anchorRect.right - popupWidth);
      left = Math.max(
        viewportPadding,
        Math.min(left, window.innerWidth - viewportPadding - popupWidth),
      );

      const belowTop = Math.round(anchorRect.bottom + gap);
      const aboveTop = Math.round(anchorRect.top - gap - popupHeight);
      const canFitBelow =
        belowTop + popupHeight <= window.innerHeight - viewportPadding;
      const canFitAbove = aboveTop >= viewportPadding;

      let top = belowTop;
      if (!canFitBelow && canFitAbove) {
        top = aboveTop;
      } else if (!canFitBelow && !canFitAbove) {
        top = Math.max(
          viewportPadding,
          Math.min(top, window.innerHeight - viewportPadding - popupHeight),
        );
      }

      popup.style.left = `${left}px`;
      popup.style.top = `${top}px`;
      popup.style.right = "auto";
      popup.style.bottom = "auto";
    };

    const repositionOpenBlurPopups = () => {
      if (blurPopupPositionRaf) return;

      blurPopupPositionRaf = requestAnimationFrame(() => {
        blurPopupPositionRaf = null;

        const openMenus = document.querySelectorAll(
          ".card-blur-menu.blur-menu-open",
        );
        if (!openMenus.length) return;

        openMenus.forEach((menu) => {
          const cardId = menu.dataset.cardId;
          if (!cardId) return;
          const popup = blurPopupByCardId.get(cardId);
          if (!popup) return;
          positionBlurPopup(menu, popup);
        });
      });
    };

    // Close all open blur menus
    const closeAllBlurMenus = () => {
      if (blurPopupPositionRaf) {
        cancelAnimationFrame(blurPopupPositionRaf);
        blurPopupPositionRaf = null;
      }

      document
        .querySelectorAll(".card-blur-menu.blur-menu-open")
        .forEach((menu) => {
          menu.classList.remove("blur-menu-open");
          menu.closest(".card")?.classList.remove("card-blur-popup-open");

          const cardId = menu.dataset.cardId;
          if (!cardId) return;
          const popup = blurPopupByCardId.get(cardId);
          popup?.classList.remove("blur-popup-open");
        });

      document
        .querySelectorAll(".blur-settings-popup.blur-popup-open")
        .forEach((popup) => {
          popup.classList.remove("blur-popup-open");
        });
    };

    // Close menus when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".card-blur-menu")) {
        closeAllBlurMenus();
      }
    });

    // Close menus on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeAllBlurMenus();
      }
    });

    window.addEventListener("resize", repositionOpenBlurPopups);
    window.addEventListener("scroll", repositionOpenBlurPopups, {
      capture: true,
      passive: true,
    });

    const setupBlurMenu = ({ cardId, stateKey, blurPowerKey, opacityKey }) => {
      const card = document.getElementById(cardId);
      const menu = document.querySelector(
        `.card-blur-menu[data-card-id="${cardId}"]`,
      );

      if (!card || !menu) return null;

      const btn = menu.querySelector(".card-blur-btn");
      const popup = menu.querySelector(".blur-settings-popup");
      const closeBtn = popup?.querySelector(".blur-popup-close");
      const glassOptions = popup?.querySelectorAll(".blur-glass-option");
      const sliderWrap = popup?.querySelector(".blur-power-slider-wrap");
      const slider = popup?.querySelector(".blur-power-slider");
      const valueDisplay = popup?.querySelector(".blur-power-value");

      let opacityWrap = popup?.querySelector(".blur-opacity-slider-wrap");
      if (!opacityWrap && popup) {
        const section = document.createElement("div");
        section.className = "blur-setting-section blur-opacity-section";
        section.innerHTML = `
          <span class="blur-setting-label">Opacity</span>
          <div class="blur-power-slider-wrap blur-opacity-slider-wrap disabled">
            <input
              type="range"
              class="blur-power-slider blur-opacity-slider"
              min="0"
              max="100"
              value="${getDashboardGlassOpacity()}"
              aria-label="Glass opacity"
            />
            <span class="blur-power-value blur-opacity-value">${getDashboardGlassOpacity()}%</span>
          </div>
        `;
        popup.appendChild(section);
        opacityWrap = section.querySelector(".blur-opacity-slider-wrap");
      }

      const opacitySlider = popup?.querySelector(".blur-opacity-slider");
      const opacityValueDisplay = popup?.querySelector(".blur-opacity-value");

      if (!btn || !popup) return null;

      blurPopupByCardId.set(cardId, popup);
      ensureBlurPopupPortal(menu, popup);

      const clearCardGlassVars = () => {
        card.style.removeProperty("--glass-bg");
        card.style.removeProperty("--glass-bg-hover");
        card.style.removeProperty("--glass-border");
        card.style.removeProperty("--glass-shadow");
      };

      const setColorAlpha = (value, alpha) => {
        if (typeof value !== "string") return value;
        const match = value
          .replace(/\s+/g, "")
          .match(/^rgba?\((\d+),(\d+),(\d+)(?:,[0-9.]+)?\)$/i);
        if (!match) return value;

        const bounded = Number(
          Math.min(1, Math.max(0, Number(alpha))).toFixed(3),
        );
        return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${bounded})`;
      };

      const getGlassOpacityAlphas = (opacityPercent) => {
        const baseAlpha = normalizeGlassOpacity(opacityPercent, 35) / 100;
        const hoverRatio = 0.45 / 0.35;
        const borderRatio = 0.4 / 0.35;
        const clampAlpha = (alpha) =>
          Number(Math.min(1, Math.max(0, alpha)).toFixed(3));

        return {
          bg: clampAlpha(baseAlpha),
          hover: clampAlpha(baseAlpha * hoverRatio),
          border: clampAlpha(baseAlpha * borderRatio),
        };
      };

      const applyCardGlassVars = (glassEnabled, opacityPercent = null) => {
        const colors = this.themes?.getThemeColors?.();
        if (!colors) return;

        if (glassEnabled) {
          const targetOpacity = normalizeGlassOpacity(
            opacityPercent,
            getDashboardGlassOpacity(),
          );
          const opacityAlphas = getGlassOpacityAlphas(targetOpacity);
          const glassBg = setColorAlpha(colors.glassBg, opacityAlphas.bg);
          const glassBgHover = setColorAlpha(
            colors.glassBgHover,
            opacityAlphas.hover,
          );
          const glassBorder = setColorAlpha(
            colors.glassBorder,
            opacityAlphas.border,
          );

          card.style.setProperty("--glass-bg", glassBg);
          card.style.setProperty("--glass-bg-hover", glassBgHover);
          card.style.setProperty("--glass-border", glassBorder);
          card.style.setProperty(
            "--glass-shadow",
            "0 8px 32px rgba(0, 0, 0, 0.3)",
          );
          return;
        }

        // Solid mode - NO transparency in the base surfaces.
        // We mix theme colors into the body background to get fully-opaque panel colors.
        const isLight = this.themes.getCurrentMode?.() === "light";

        const bgMix = isLight ? 0.12 : 0.38;
        const bgHoverMix = isLight ? 0.18 : 0.48;
        const borderMix = isLight ? 0.25 : 0.58;

        const mixHexToRgb = (baseHex, mixHex, mixWeight) => {
          const base = this.themes.hexToRgb?.(baseHex);
          const mix = this.themes.hexToRgb?.(mixHex);
          if (!base || !mix) return null;

          const w = Math.max(0, Math.min(1, Number(mixWeight)));
          const blend = (a, b) => Math.round(a * (1 - w) + b * w);

          return `rgb(${blend(base.r, mix.r)}, ${blend(base.g, mix.g)}, ${blend(
            base.b,
            mix.b,
          )})`;
        };

        const solidBg =
          mixHexToRgb(colors.bodyBg, colors.primary, bgMix) ||
          (isLight ? "rgb(255, 255, 255)" : "rgb(30, 30, 50)");
        const solidHover =
          mixHexToRgb(colors.bodyBg, colors.primary, bgHoverMix) ||
          (isLight ? "rgb(245, 245, 245)" : "rgb(40, 40, 60)");
        const solidBorder =
          mixHexToRgb(colors.bodyBg, colors.primaryLight, borderMix) ||
          (isLight ? "rgb(220, 220, 220)" : "rgb(90, 90, 110)");

        card.style.setProperty("--glass-bg", solidBg);
        card.style.setProperty("--glass-bg-hover", solidHover);
        card.style.setProperty("--glass-border", solidBorder);
        card.style.setProperty(
          "--glass-shadow",
          "0 4px 20px rgba(0, 0, 0, 0.2)",
        );
      };

      // Apply glass state to the card
      const applyGlassState = (
        state,
        customBlurEnabled,
        customBlurPower,
        customGlassOpacity,
        options = {},
      ) => {
        const resetDashboardSurface = options?.resetDashboardSurface === true;

        // Determine effective glass state based on the triple toggle
        // OFF: Force glass disabled for this component only
        // DASH: Follow dashboard setting
        // ON: Force glass enabled for this component
        const isDashboardState = state === "dashboard";
        let effectiveGlass;
        if (state === "on") {
          effectiveGlass = true;
        } else if (state === "off") {
          effectiveGlass = false;
        } else {
          // "dashboard" - follow global setting
          effectiveGlass = isDashboardGlassEnabled();
        }

        // Apply per-card glass override attribute:
        // - OFF  => data-glass-enabled="false" on this card only
        // - ON   => data-glass-enabled="true" on this card only
        // - DASH => remove attribute so it follows dashboard/root setting
        if (state === "dashboard") {
          delete card.dataset.glassEnabled;
          if (resetDashboardSurface) {
            clearCardGlassVars();
          }
        } else if (state === "on") {
          card.dataset.glassEnabled = "true";
          applyCardGlassVars(true, customGlassOpacity);
        } else if (state === "off") {
          card.dataset.glassEnabled = "false";
          applyCardGlassVars(false);
        }

        // Determine effective blur power
        const usingCustomBlur = state === "on";
        let effectiveBlurPower;
        if (!effectiveGlass) {
          // Glass is off, blur multiplier should be 0
          effectiveBlurPower = 0;
        } else if (usingCustomBlur) {
          // Custom blur power enabled
          effectiveBlurPower = customBlurPower / 100;
        } else {
          // Follow dashboard blur power
          effectiveBlurPower = getDashboardBlurPower() / 100;
        }

        // Apply via CSS custom property
        if (!effectiveGlass) {
          // Glass disabled - set multiplier to 0
          card.style.setProperty("--ui-blur-multiplier", "0");
          card.dataset.blurOverride = "off";
        } else if (usingCustomBlur) {
          // Custom blur power
          card.style.setProperty(
            "--ui-blur-multiplier",
            String(effectiveBlurPower),
          );
          card.dataset.blurOverride = String(effectiveBlurPower);
        } else {
          // Follow dashboard
          card.style.removeProperty("--ui-blur-multiplier");
          delete card.dataset.blurOverride;
        }

        // Update button icon based on state
        const getThemedIcon = (emoji) => {
          if (window.dashboard?.iconThemes) {
            return window.dashboard.iconThemes.getIcon(emoji, { size: 16 });
          }
          return emoji;
        };

        if (state === "off") {
          btn.innerHTML = getThemedIcon("⬜");
        } else if (state === "on") {
          btn.innerHTML = getThemedIcon("✨");
        } else {
          btn.innerHTML = getThemedIcon("🔗");
        }

        // Notify components
        try {
          document.dispatchEvent(
            new CustomEvent("md:card-blur-update", { detail: { cardId } }),
          );
        } catch (e) {}
      };

      // Update UI to match state
      const syncUI = (
        glassState,
        customBlurEnabled,
        customBlurPower,
        customGlassOpacity,
      ) => {
        // Update glass toggle buttons
        glassOptions?.forEach((opt) => {
          const val = opt.dataset.glassValue;
          opt.classList.toggle("active", val === glassState);
        });

        // Blur power slider is only adjustable in ON mode.
        const isGlassOff = glassState === "off";
        const isDashboardState = glassState === "dashboard";

        // Update slider state - disabled when glass is off or dashboard-linked
        const effectiveBlurPower = isDashboardState
          ? getDashboardBlurPower()
          : customBlurPower;
        if (sliderWrap) {
          sliderWrap.classList.toggle(
            "disabled",
            isGlassOff || isDashboardState,
          );
        }

        // Update slider value
        if (slider) {
          slider.value = String(effectiveBlurPower);
          slider.disabled = isGlassOff || isDashboardState;
        }

        // Update value display
        if (valueDisplay) {
          valueDisplay.textContent = effectiveBlurPower + "%";
        }

        const effectiveOpacity = isDashboardState
          ? getDashboardGlassOpacity()
          : customGlassOpacity;
        if (opacityWrap) {
          opacityWrap.classList.toggle(
            "disabled",
            isGlassOff || isDashboardState,
          );
        }
        if (opacitySlider) {
          opacitySlider.value = String(effectiveOpacity);
          opacitySlider.disabled = isGlassOff || isDashboardState;
        }
        if (opacityValueDisplay) {
          opacityValueDisplay.textContent = effectiveOpacity + "%";
        }
      };

      // Load initial state
      const settings = readSettings();
      let currentGlassState = normalizeBlurState(settings?.[stateKey]);
      let currentCustomEnabled = currentGlassState === "on";
      let currentCustomPower = normalizeBlurPower(settings?.[blurPowerKey]);
      let currentGlassOpacity = normalizeGlassOpacity(settings?.[opacityKey]);

      // Persist normalized defaults so every blur-capable component starts in
      // dashboard-follow mode and keeps its own custom settings across reloads.
      const initialPatch = {};
      if (settings?.[stateKey] !== currentGlassState) {
        initialPatch[stateKey] = currentGlassState;
      }
      if (settings?.[blurPowerKey + "Enabled"] !== currentCustomEnabled) {
        initialPatch[blurPowerKey + "Enabled"] = currentCustomEnabled;
      }
      if (settings?.[blurPowerKey] !== currentCustomPower) {
        initialPatch[blurPowerKey] = currentCustomPower;
      }
      if (settings?.[opacityKey] !== currentGlassOpacity) {
        initialPatch[opacityKey] = currentGlassOpacity;
      }
      if (Object.keys(initialPatch).length > 0) {
        writeSettings(initialPatch);
      }

      // Apply initial state
      syncUI(
        currentGlassState,
        currentCustomEnabled,
        currentCustomPower,
        currentGlassOpacity,
      );
      applyGlassState(
        currentGlassState,
        currentCustomEnabled,
        currentCustomPower,
        currentGlassOpacity,
      );

      // Toggle popup open/close
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isOpen = menu.classList.contains("blur-menu-open");

        // Close all other menus first
        closeAllBlurMenus();

        // Toggle this menu
        if (!isOpen) {
          menu.classList.add("blur-menu-open");
          card.classList.add("card-blur-popup-open");
          popup.classList.add("blur-popup-open");
          ensureBlurPopupPortal(menu, popup);
          positionBlurPopup(menu, popup);
        }
      });

      // Close button
      closeBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        menu.classList.remove("blur-menu-open");
        card.classList.remove("card-blur-popup-open");
        popup.classList.remove("blur-popup-open");
      });

      // Prevent popup clicks from closing it
      popup.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      // Glass effect toggle options
      glassOptions?.forEach((opt) => {
        opt.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          const newState = opt.dataset.glassValue;
          currentGlassState = newState;
          currentCustomEnabled = newState === "on";

          // Update UI
          glassOptions.forEach((o) => o.classList.remove("active"));
          opt.classList.add("active");
          syncUI(
            currentGlassState,
            currentCustomEnabled,
            currentCustomPower,
            currentGlassOpacity,
          );

          // Apply and save
          applyGlassState(
            currentGlassState,
            currentCustomEnabled,
            currentCustomPower,
            currentGlassOpacity,
            { resetDashboardSurface: newState === "dashboard" },
          );
          writeSettings({
            [stateKey]: newState,
            [blurPowerKey + "Enabled"]: currentCustomEnabled,
          });

          if (newState === "dashboard" && this.themes?.applyTheme) {
            this.themes.applyTheme();
          }
        });
      });

      // Blur power slider
      slider?.addEventListener("input", () => {
        // Only editable in ON mode.
        if (currentGlassState !== "on") {
          return;
        }

        currentCustomPower = normalizeBlurPower(slider.value);

        // Update value display
        if (valueDisplay) {
          valueDisplay.textContent = currentCustomPower + "%";
        }

        // Apply and save
        applyGlassState(
          currentGlassState,
          currentCustomEnabled,
          currentCustomPower,
          currentGlassOpacity,
        );
        writeSettings({ [blurPowerKey]: currentCustomPower });
      });

      // Per-card glass opacity slider
      opacitySlider?.addEventListener("input", () => {
        if (currentGlassState === "off" || currentGlassState === "dashboard") {
          return;
        }

        currentGlassOpacity = normalizeGlassOpacity(
          opacitySlider.value,
          currentGlassOpacity,
        );
        if (opacityValueDisplay) {
          opacityValueDisplay.textContent = currentGlassOpacity + "%";
        }

        applyGlassState(
          currentGlassState,
          currentCustomEnabled,
          currentCustomPower,
          currentGlassOpacity,
        );
        writeSettings({ [opacityKey]: currentGlassOpacity });
      });

      // Listen for dashboard glass setting changes
      document.addEventListener("md:glass-setting-changed", () => {
        // Only update if following dashboard setting
        if (currentGlassState === "dashboard") {
          syncUI(
            currentGlassState,
            currentCustomEnabled,
            currentCustomPower,
            currentGlassOpacity,
          );
          applyGlassState(
            currentGlassState,
            currentCustomEnabled,
            currentCustomPower,
            currentGlassOpacity,
          );
        }
      });

      // Recompute per-card glass/solid colors on theme changes.
      document.addEventListener("md:theme-change", () => {
        applyGlassState(
          currentGlassState,
          currentCustomEnabled,
          currentCustomPower,
          currentGlassOpacity,
        );
      });

      // Listen for dashboard blur power changes
      document.addEventListener("md:ui-blur-update", () => {
        // Update only when dashboard-linked.
        if (currentGlassState === "dashboard") {
          syncUI(
            currentGlassState,
            currentCustomEnabled,
            currentCustomPower,
            currentGlassOpacity,
          );
          applyGlassState(
            currentGlassState,
            currentCustomEnabled,
            currentCustomPower,
            currentGlassOpacity,
          );
        }
      });

      return {
        card,
        menu,
        applyGlassState: () =>
          applyGlassState(
            currentGlassState,
            currentCustomEnabled,
            currentCustomPower,
            currentGlassOpacity,
          ),
      };
    };

    // Setup all cards with blur menu
    const blurConfigs = [
      {
        cardId: "pocketQuranCard",
        stateKey: "pocketQuranBlurState",
        blurPowerKey: "pocketQuranBlurPower",
        opacityKey: "pocketQuranGlassOpacity",
      },
      {
        cardId: "todoCard",
        stateKey: "todoBlurState",
        blurPowerKey: "todoBlurPower",
        opacityKey: "todoGlassOpacity",
      },
      {
        cardId: "flashcardCard",
        stateKey: "flashcardBlurState",
        blurPowerKey: "flashcardBlurPower",
        opacityKey: "flashcardGlassOpacity",
      },
      {
        cardId: "adhkarCard",
        stateKey: "adhkarBlurState",
        blurPowerKey: "adhkarBlurPower",
        opacityKey: "adhkarGlassOpacity",
      },
      {
        cardId: "hadithCard",
        stateKey: "hadithBlurState",
        blurPowerKey: "hadithBlurPower",
        opacityKey: "hadithGlassOpacity",
      },
      {
        cardId: "notesCard",
        stateKey: "notesBlurState",
        blurPowerKey: "notesBlurPower",
        opacityKey: "notesGlassOpacity",
      },
    ];

    this._blurMenus = blurConfigs
      .map((cfg) => setupBlurMenu(cfg))
      .filter(Boolean);

    // Listen for icon theme changes and update blur menu button icons
    document.addEventListener("md:icon-theme-change", () => {
      const readSettings = () => this.storage.getSettings();
      const getThemedIcon = (emoji) => {
        if (window.dashboard?.iconThemes) {
          return window.dashboard.iconThemes.getIcon(emoji, { size: 16 });
        }
        return emoji;
      };

      blurConfigs.forEach(({ stateKey }) => {
        const settings = readSettings();
        const state = settings?.[stateKey] || "dashboard";
        const menu = document.querySelector(`.card-blur-menu[data-card-id]`);

        document.querySelectorAll(".card-blur-btn").forEach((btn) => {
          const cardMenu = btn.closest(".card-blur-menu");
          const cardId = cardMenu?.dataset?.cardId;
          if (!cardId) return;

          const cardStateKey = blurConfigs.find(
            (c) => c.cardId === cardId,
          )?.stateKey;
          const cardState = settings?.[cardStateKey] || "dashboard";

          if (cardState === "off") {
            btn.innerHTML = getThemedIcon("⬜");
          } else if (cardState === "on") {
            btn.innerHTML = getThemedIcon("✨");
          } else {
            btn.innerHTML = getThemedIcon("🔗");
          }
        });
      });
    });
  }
});

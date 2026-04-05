/**
 * Muslim Dashboard - Main Application
 * Orchestrates all modules and initializes the dashboard
 * Enhanced with calendar widget, pinned apps, weather, and more prayer options
 */

class MuslimDashboard {
  constructor() {
    // Initialize storage
    this.storage = new StorageManager();

    // Floating mode manager (detached draggable/resizable cards)
    this.floating = new FloatingModeManager(this.storage);

    // Initialize Theme Manager
    this.themes = new ThemeManager(this.storage);

    // Initialize Icon Theme Manager
    this.iconThemes = new IconThemeManager(this.storage);

    // Initialize managers
    this.backgrounds = new BackgroundManager(this.storage);
    this.prayerTimes = new PrayerTimesManager(this.storage);
    this.qibla = new QiblaManager(this.storage);
    this.quotes = new QuotesManager(this.storage);
    this.todos = new TodoManager(this.storage);
    this.pinnedApps = null; // Will be initialized after DOM
    this.searchBar = null; // Will be initialized after DOM
    this.calendar = null; // Will be initialized after DOM
    this.stickyNotes = null; // Will be initialized after DOM
    this.weather = null; // Will be initialized after DOM
    this.lunarPhase = null; // Will be initialized after DOM
    this.flashcards = null; // Will be initialized after DOM
    this.hadith = null; // Will be initialized after DOM
    this.fasting = null; // Will be initialized after DOM
    this.notes = null; // Will be initialized after DOM
    this.pocketQuran = null; // Will be initialized after DOM
    this.momentMode = null; // Will be initialized after DOM

    // Unified content search modal (Quotes / Adhkar / Hadith / Notes / Todo)
    this.contentSearch = null;

    // Grid layout manager for drag-and-drop
    this.gridLayout = null; // Will be initialized after DOM
    // Sidebar mode (3-column layout)
    this.sidebarModeEnabled = false;
    this.MIN_SIDEBAR_MODE_WIDTH = 2144;

    // Dashboard mode coordination (ensures modes are mutually exclusive)
    this._setSidebarModeEnabled = null;
    this._setQuranFocusModeEnabled = null;
    this._setMomentModeEnabled = null;
    this._dashboardModeBeforeFocus = "normal";
    this._momentModeActive = false;

    // Settings will be initialized after other managers
    this.settings = null;

    // Hijri date converter
    this.hijri = new HijriDate();

    // UI Elements
    this.greeting = document.getElementById("greeting");
    this.dateDisplay = document.getElementById("dateDisplay");
    this.currentTime = document.getElementById("currentTime");
    this.currentSeconds = document.getElementById("currentSeconds");
    this.currentAmPm = document.getElementById("currentAmPm");
    this.headerNextPrayer = document.getElementById("headerNextPrayer");
    this.headerNextPrayerName = document.getElementById("headerNextPrayerName");
    this.headerNextPrayerCountdown = document.getElementById(
      "headerNextPrayerCountdown",
    );

    // Keep a handle to the native Date constructor for debug date simulation.
    this._nativeDateCtor = Date;
    this._debugDateSimulationEnabled = false;
    this._debugSimulatedDateYMD = null;
  }

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
    const raw = String(rawValue || "").trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return "";

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);

    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day) ||
      year < 1 ||
      year > 9999 ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return "";
    }

    const NativeDate = this._nativeDateCtor || Date;
    const probe = new NativeDate(year, month - 1, day);
    if (
      probe.getFullYear() !== year ||
      probe.getMonth() !== month - 1 ||
      probe.getDate() !== day
    ) {
      return "";
    }

    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  /**
   * Apply or clear app-wide debug date simulation.
   * When enabled, `new Date()` (without args) returns the simulated date
   * while preserving the real current time of day.
   */
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

    const NativeDate = this._nativeDateCtor || Date;

    if (simulationEnabled && simulatedYmd) {
      const [yearText, monthText, dayText] = simulatedYmd.split("-");
      const simYear = parseInt(yearText, 10);
      const simMonth = parseInt(monthText, 10);
      const simDay = parseInt(dayText, 10);

      const getSimulatedNowMs = () => {
        const realNow = new NativeDate();
        return new NativeDate(
          simYear,
          simMonth - 1,
          simDay,
          realNow.getHours(),
          realNow.getMinutes(),
          realNow.getSeconds(),
          realNow.getMilliseconds(),
        ).getTime();
      };

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
      return;
    }

    if (window.Date !== NativeDate) {
      window.Date = NativeDate;
    }
    this._debugDateSimulationEnabled = false;
    this._debugSimulatedDateYMD = null;
  }

  setupFabMenu() {
    const menu = document.getElementById("fabMenu");
    const toggle = document.getElementById("fabMenuToggle");
    const items = document.getElementById("fabMenuItems");

    if (!menu || !toggle || !items) return;

    // Enable JS-driven autohide mode (graceful: without JS toggle remains visible)
    menu.classList.add("autohide");
    toggle.setAttribute("aria-hidden", "true");

    const setHotVisible = (visible) => {
      menu.classList.toggle("hot-visible", visible);
      try {
        toggle.setAttribute("aria-hidden", visible ? "false" : "true");
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
                if (toggle.getAttribute("aria-hidden") !== "true") {
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
    try {
      return window.innerWidth >= this.MIN_SIDEBAR_MODE_WIDTH;
    } catch (e) {
      return false;
    }
  }

  syncSidebarModeWithLayoutEditMode() {
    const isEditModeEnabled = !!(
      this.gridLayout &&
      typeof this.gridLayout.isEditMode === "function" &&
      this.gridLayout.isEditMode()
    );
    const keepCurrentSidebarLayout = this.sidebarModeEnabled === true;
    const wantsSidebarLayout = isEditModeEnabled || keepCurrentSidebarLayout;

    const canUseSidebarLayout =
      wantsSidebarLayout &&
      !this._quranFocusModeActive &&
      !this._momentModeActive &&
      this.isSidebarWidthSupported();

    if (typeof this._setSidebarModeEnabled === "function") {
      this._setSidebarModeEnabled(canUseSidebarLayout);
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
            this._quranFocusModeActive &&
            typeof this._setQuranFocusModeEnabled === "function"
          ) {
            this._setQuranFocusModeEnabled(false);
          }
        } catch (e) {}

        try {
          if (
            this._momentModeActive &&
            typeof this._setMomentModeEnabled === "function"
          ) {
            this._setMomentModeEnabled(false);
          }
        } catch (e) {}
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
        this.sidebarModeEnabled = true;
        document.body.classList.add("sidebar-mode");

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

        this.sidebarModeEnabled = false;
        document.body.classList.remove("sidebar-mode");

        try {
          const s = this.storage.getSettings();
          s.sidebarModeEnabled = false;
          if (s.lastDashboardMode === "sidebar") {
            s.lastDashboardMode = "normal";
          }
          this.storage.saveSettings(s);
        } catch (e) {}
      }

      return true;
    };

    // Expose setter for other modes to call.
    this._setSidebarModeEnabled = setEnabled;

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
        this.syncSidebarModeWithLayoutEditMode();
      }, 120);
    });
  }

  /**
   * Initialize the dashboard
   * Non-blocking startup: All UI components render immediately,
   * API-dependent data loads in background without blocking interaction
   */
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
      this.gridLayout = new GridLayoutManager(this.storage);
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
        const numeric = Number(settings?.theme?.glassOpacity);
        if (!Number.isFinite(numeric)) return 50;
        return Math.min(100, Math.max(0, Math.round(numeric)));
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
    const normalizeBlurPower = (value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return 100;
      return Math.min(200, Math.max(0, Math.round(numeric)));
    };
    const normalizeGlassOpacity = (
      value,
      fallback = getDashboardGlassOpacity(),
    ) => {
      if (value === null || typeof value === "undefined") {
        return fallback;
      }

      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return fallback;
      return Math.min(100, Math.max(0, Math.round(numeric)));
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

  /**
   * Initialize Quran Focus Mode
   * Hides all components except Pocket Quran, making it full viewport
   */
  initQuranFocusMode() {
    const focusBtn = document.getElementById("quranFocusBtn");
    if (!focusBtn) return;

    this._quranFocusModeActive = false;
    this._quranFocusPreviousVisibility = null;

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

    const enterFocusMode = (opts = {}) => {
      // Enforce mutual exclusivity: focus mode cannot coexist with sidebar mode.
      // Capture the previous mode so exiting focus can restore it.
      if (!opts.preservePreviousMode) {
        this._dashboardModeBeforeFocus = this.sidebarModeEnabled
          ? "sidebar"
          : "normal";
      }

      try {
        if (
          this.sidebarModeEnabled &&
          typeof this._setSidebarModeEnabled === "function"
        ) {
          this._setSidebarModeEnabled(false);
        } else {
          // Defensive cleanup if sidebar mode is partially active.
          document.body.classList.remove("sidebar-mode");
          this.sidebarModeEnabled = false;
          try {
            this.gridLayout?.setSidebarModeEnabled?.(false);
          } catch (e) {}
          const sidebarBtn = document.getElementById("sidebarModeBtn");
          if (sidebarBtn) {
            sidebarBtn.classList.remove("active");
            sidebarBtn.setAttribute("aria-pressed", "false");
          }
        }
      } catch (e) {}

      // Also exit Moment Mode if active
      try {
        if (
          this._momentModeActive &&
          typeof this._setMomentModeEnabled === "function"
        ) {
          this._setMomentModeEnabled(false);
        }
      } catch (e) {}

      // Disable and lock layout editing while Quran Focus Mode is active.
      try {
        if (
          this.gridLayout &&
          typeof this.gridLayout.setEditModeLocked === "function"
        ) {
          this.gridLayout.setEditModeLocked(true);
        } else if (
          this.gridLayout &&
          typeof this.gridLayout.disableEditMode === "function"
        ) {
          this.gridLayout.disableEditMode();
        }
      } catch (e) {}

      this._quranFocusModeActive = true;
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
      this._quranFocusPreviousVisibility = wasHidden;

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

      // Add focus mode class to body for full viewport styling
      document.body.classList.add("quran-focus-mode");
    };

    const exitFocusMode = () => {
      this._quranFocusModeActive = false;

      // Unlock layout editing when Quran Focus Mode exits.
      try {
        if (
          this.gridLayout &&
          typeof this.gridLayout.setEditModeLocked === "function"
        ) {
          this.gridLayout.setEditModeLocked(false);
        }
      } catch (e) {}

      focusBtn.setAttribute("aria-pressed", "false");
      focusBtn.classList.remove("active");

      const restoreMode = "normal";

      try {
        const s = this.storage.getSettings();
        s.quranFocusModeEnabled = false;

        // Restore the last non-focus mode (captured on entry).
        s.lastDashboardMode = restoreMode;
        this.storage.saveSettings(s);
      } catch (e) {}

      // Remove focus mode class so normal styling returns.
      document.body.classList.remove("quran-focus-mode");

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

      // Sidebar behavior is now owned by Layout Edit Mode.
      this.syncSidebarModeWithLayoutEditMode();
    };

    // Expose setter for other modes to call.
    this._setQuranFocusModeEnabled = (enabled) => {
      const next = enabled === true;
      if (next) enterFocusMode();
      else exitFocusMode();
    };

    const toggleFocusMode = () => {
      if (this._quranFocusModeActive) {
        exitFocusMode();
      } else {
        enterFocusMode();
      }
    };

    focusBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFocusMode();
    });

    // Handle Escape key to exit focus mode
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._quranFocusModeActive) {
        exitFocusMode();
      }
    });

    // Restore last state from settings
    try {
      const s = this.storage.getSettings();
      // Don't restore Quran focus if Moment mode is the last mode
      const momentInitial =
        globalThis.ENABLE_DEBUG_MODE === true &&
        (s.momentModeEnabled === true || s.lastDashboardMode === "moment");
      const initial =
        !momentInitial &&
        (s.quranFocusModeEnabled === true ||
          s.lastDashboardMode === "quranFocus");
      if (initial) {
        // Capture what the user was using before focus (if we have a hint),
        // but do not restore it simultaneously.
        this._dashboardModeBeforeFocus =
          s.sidebarModeEnabled === true ? "sidebar" : "normal";
        try {
          if (typeof this._setSidebarModeEnabled === "function") {
            this._setSidebarModeEnabled(false);
          } else {
            document.body.classList.remove("sidebar-mode");
            this.sidebarModeEnabled = false;
            this.gridLayout?.setSidebarModeEnabled?.(false);
          }
        } catch (e) {}

        enterFocusMode({ preservePreviousMode: true });
      }
    } catch (e) {}
  }

  /**
   * Initialize Moment Mode manager
   */
  initMomentMode() {
    if (typeof window.MomentModeManager !== "function") return;

    this.momentMode = new window.MomentModeManager(this);
    this.momentMode.init();

    if (this.momentMode && typeof this.momentMode.isActive === "function") {
      this._momentModeActive = this.momentMode.isActive();
    }
  }

  applyPinnedAppsSettings(perRowOverride) {
    const settings = this.storage.getSettings();
    const perRowRaw = Number.isFinite(perRowOverride)
      ? perRowOverride
      : Number(settings.pinnedAppsPerRow);
    const perRow = Number.isFinite(perRowRaw)
      ? Math.min(20, Math.max(3, perRowRaw))
      : 10;

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

  /**
   * Render the clock as separate hour/minute parts so styles can emphasize them independently.
   */
  setCurrentTimeParts(hoursText, minutesText) {
    if (!this.currentTime) return;

    const safeHours = String(hoursText || "00");
    const safeMinutes = String(minutesText || "00");

    this.currentTime.innerHTML =
      `<span class="time-hours">${safeHours}</span>` +
      `<span class="time-separator">:</span>` +
      `<span class="time-minutes">${safeMinutes}</span>`;
    this.currentTime.setAttribute("aria-label", `${safeHours}:${safeMinutes}`);
  }

  /**
   * Update current time display
   */
  updateTime() {
    const now = new Date();
    const settings = this.storage.getSettings();
    const headingSettings = settings.heading || {};
    const clockFormat =
      headingSettings.clockFormat || settings.timeFormat || "24h";
    const is24h = clockFormat === "24h";
    const showAmPm = headingSettings.showAmPm !== false;

    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    if (!is24h) {
      const suffix = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      this.setCurrentTimeParts(String(hours), minutes);

      if (this.currentAmPm) {
        if (showAmPm) {
          this.currentAmPm.textContent = suffix;
          this.currentAmPm.style.display = "";
          this.currentAmPm.setAttribute("aria-hidden", "false");
        } else {
          this.currentAmPm.textContent = "";
          this.currentAmPm.style.display = "none";
          this.currentAmPm.setAttribute("aria-hidden", "true");
        }
      }
    } else {
      this.setCurrentTimeParts(String(hours).padStart(2, "0"), minutes);
      if (this.currentAmPm) {
        this.currentAmPm.textContent = "";
        this.currentAmPm.style.display = "none";
        this.currentAmPm.setAttribute("aria-hidden", "true");
      }
    }

    if (this.currentSeconds) {
      this.currentSeconds.textContent = `:${seconds}`;
    }

    this.updateHeaderNextPrayer();
  }

  /**
   * Update header next-prayer display (shown underneath the clock)
   */
  updateHeaderNextPrayer() {
    const settings = this.storage.getSettings();
    const headingSettings = settings.heading || {};
    const visibility = settings.componentVisibility || {};
    const shouldShow =
      visibility.header !== false &&
      headingSettings.showClock !== false &&
      headingSettings.showNextPrayer === true;

    if (this.headerNextPrayer) {
      this.headerNextPrayer.style.display = shouldShow ? "inline-flex" : "none";
      this.headerNextPrayer.setAttribute(
        "aria-hidden",
        shouldShow ? "false" : "true",
      );
    }

    if (!shouldShow) return;

    const nextPrayerInfo =
      this.prayerTimes &&
      typeof this.prayerTimes.getNextPrayerInfo === "function"
        ? this.prayerTimes.getNextPrayerInfo(settings.prayerVisibility)
        : null;

    if (this.headerNextPrayerName) {
      this.headerNextPrayerName.textContent =
        nextPrayerInfo?.name || "Loading...";
    }

    if (this.headerNextPrayerCountdown) {
      this.headerNextPrayerCountdown.textContent =
        nextPrayerInfo?.countdown || "--:--:--";
    }
  }

  /**
   * Update date display
   */
  updateDate() {
    const now = new Date();
    const settings = this.storage.getSettings();
    const headingSettings = settings.heading || {};
    const dateCalendar =
      headingSettings.dateCalendar || settings.calendarType || "hijri";
    const legacyShowWeekday = headingSettings.showWeekday;
    const dateFormat = this.normalizeHeadingDateFormat(
      headingSettings.dateFormat || "full",
      legacyShowWeekday,
    );
    const showIslamicEvents = headingSettings.showIslamicEvents !== false;

    let dateText = "";

    if (dateCalendar === "hijri" || dateCalendar === "both") {
      const hijriDate = this.hijri.toHijri(now, settings.hijriAdjustment || 0);
      dateText = this.hijri.format(hijriDate, dateFormat, "en");

      // Check for Islamic events
      if (showIslamicEvents) {
        const event = this.hijri.getTodayEvent(hijriDate);
        if (event) {
          dateText += ` • ${event.name}`;
        }
      }

      if (dateCalendar === "both") {
        dateText += " | " + this.formatGregorianDate(now, dateFormat);
      }
    } else {
      dateText = this.formatGregorianDate(now, dateFormat);
    }

    this.dateDisplay.textContent = dateText;
  }

  /**
   * Format Gregorian date with options
   */
  normalizeHeadingDateFormat(format, legacyShowWeekday) {
    const normalized = String(format || "").trim();
    const newValues = new Set([
      "full-weekday",
      "full",
      "medium-weekday",
      "medium",
      "short",
    ]);

    if (newValues.has(normalized)) return normalized;

    // Legacy values were: full/long/medium/short + separate showWeekday
    if (normalized === "full") {
      return legacyShowWeekday === false ? "full" : "full-weekday";
    }
    if (normalized === "long") {
      return "full";
    }
    if (normalized === "medium") {
      return legacyShowWeekday === false ? "medium" : "medium-weekday";
    }
    if (normalized === "short") {
      return "short";
    }

    return legacyShowWeekday === false ? "full" : "full-weekday";
  }

  normalizeHexColor(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";

    const shortHex = raw.match(/^#([0-9a-f]{3})$/i);
    if (shortHex) {
      const expanded = shortHex[1]
        .split("")
        .map((c) => c + c)
        .join("")
        .toLowerCase();
      return `#${expanded}`;
    }

    const fullHex = raw.match(/^#([0-9a-f]{6})$/i);
    if (fullHex) {
      return `#${fullHex[1].toLowerCase()}`;
    }

    return "";
  }

  parseCssRgbColor(colorValue) {
    const value = String(colorValue || "").trim();
    const match = value.match(
      /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*[0-9.]+)?\s*\)$/i,
    );
    if (!match) return null;

    return {
      r: Math.max(0, Math.min(255, Math.round(Number(match[1])))),
      g: Math.max(0, Math.min(255, Math.round(Number(match[2])))),
      b: Math.max(0, Math.min(255, Math.round(Number(match[3])))),
    };
  }

  rgbToHex(r, g, b) {
    const toHex = (value) =>
      Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  hexToRgb(color) {
    const normalized = this.normalizeHexColor(color);
    if (!normalized) return null;

    return {
      r: parseInt(normalized.slice(1, 3), 16),
      g: parseInt(normalized.slice(3, 5), 16),
      b: parseInt(normalized.slice(5, 7), 16),
    };
  }

  clampHeaderGlowOpacity(value, fallback = 72) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.min(100, Math.round(parsed)));
  }

  clampHeaderGlowRadius(value, fallback = 14) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.min(50, Math.round(parsed)));
  }

  getInverseTextColorHex(sourceEl) {
    const target = sourceEl || document.body;
    if (!target || typeof window.getComputedStyle !== "function") {
      return "#ffffff";
    }

    const rgb = this.parseCssRgbColor(window.getComputedStyle(target).color);
    if (!rgb) return "#ffffff";

    return this.rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
  }

  resolveHeaderGlowColor(preferredColor, sourceEl) {
    const normalized = this.normalizeHexColor(preferredColor);
    if (normalized) return normalized;
    return this.getInverseTextColorHex(sourceEl);
  }

  applyHeaderGlow(el, enabled, glowColor, opacity = 72, radius = 14) {
    if (!el) return;

    if (enabled === true) {
      const safeColor = this.normalizeHexColor(glowColor) || "#ffffff";
      const safeOpacity = this.clampHeaderGlowOpacity(opacity, 72);
      const safeRadius = this.clampHeaderGlowRadius(radius, 14);
      const rgb = this.hexToRgb(safeColor) || { r: 255, g: 255, b: 255 };
      const alpha = Number((safeOpacity / 100).toFixed(3));

      el.classList.add("header-glow-enabled");
      el.style.setProperty(
        "--header-glow-color",
        `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`,
      );
      el.style.setProperty("--header-glow-radius", `${safeRadius}px`);
      return;
    }

    el.classList.remove("header-glow-enabled");
    el.style.removeProperty("--header-glow-color");
    el.style.removeProperty("--header-glow-radius");
  }

  /**
   * Format Gregorian date based on a combined Date Format value
   */
  formatGregorianDate(date, format) {
    const options = {};
    const normalized = String(format || "").trim();
    const includeWeekday = normalized.endsWith("-weekday");
    const base = includeWeekday
      ? normalized.replace(/-weekday$/, "")
      : normalized;

    if (includeWeekday) {
      options.weekday = base === "medium" ? "short" : "long";
    }

    switch (base) {
      case "full":
        options.year = "numeric";
        options.month = "long";
        options.day = "numeric";
        break;
      case "medium":
        options.year = "numeric";
        options.month = "short";
        options.day = "numeric";
        break;
      case "short":
        options.year = "numeric";
        options.month = "numeric";
        options.day = "numeric";
        break;
      default:
        options.year = "numeric";
        options.month = "long";
        options.day = "numeric";
    }

    return date.toLocaleDateString("en-US", options);
  }

  /**
   * Update greeting based on time and settings
   */
  updateGreeting() {
    const settings = this.storage.getSettings();
    const headingSettings = settings.heading || {};
    const hour = new Date().getHours();
    let greeting;

    // Check if custom greeting is enabled
    if (headingSettings.useCustomGreeting && headingSettings.customGreeting) {
      greeting = headingSettings.customGreeting;
    } else {
      // Use time-based greetings
      const timeRanges = headingSettings.greetingTimeRanges || {};

      if (hour >= 3 && hour < 12) {
        greeting =
          timeRanges.morning?.text || "As-salamu alaykum, Good Morning";
      } else if (hour >= 12 && hour < 15) {
        greeting =
          timeRanges.afternoon?.text || "As-salamu alaykum, Good Afternoon";
      } else if (hour >= 15 && hour < 18) {
        greeting =
          timeRanges.evening?.text || "As-salamu alaykum, Good Evening";
      } else {
        greeting = timeRanges.night?.text || "As-salamu alaykum, Good Night";
      }
    }

    this.greeting.textContent = greeting;
  }

  /**
   * Apply component visibility settings
   */
  applyComponentVisibility() {
    const settings = this.storage.getSettings();
    const visibility = settings.componentVisibility || {};

    let visibilityChanged = false;
    const setVisibility = (el, shouldHide) => {
      if (!el) return;
      const currentDisplay = el.style.getPropertyValue("display");
      const currentDisplayPriority = el.style.getPropertyPriority("display");
      const nextAria = shouldHide ? "true" : "false";

      if (shouldHide) {
        if (
          currentDisplay !== "none" ||
          currentDisplayPriority !== "important"
        ) {
          el.style.setProperty("display", "none", "important");
          visibilityChanged = true;
        }
      } else if (currentDisplay) {
        el.style.removeProperty("display");
        visibilityChanged = true;
      }

      if (el.getAttribute("aria-hidden") !== nextAria) {
        el.setAttribute("aria-hidden", nextAria);
        visibilityChanged = true;
      }
    };

    // Header (greeting, date, clock)
    const header = document.querySelector(".header");
    setVisibility(header, visibility.header === false);

    // Quick Pins
    const pinnedAppsSection = document.getElementById("pinnedAppsSection");
    setVisibility(pinnedAppsSection, visibility.quickPins === false);

    // Search Bar
    const searchBarSection = document.getElementById("searchBarSection");
    setVisibility(searchBarSection, visibility.searchBar === false);

    // Quotes
    const quoteSection = document.getElementById("quoteSection");
    setVisibility(quoteSection, visibility.quotes === false);

    // Prayer Times
    const prayerTimesCard = document.getElementById("prayerTimesCard");
    setVisibility(prayerTimesCard, visibility.prayerTimes === false);

    // Hijri Calendar
    const calendarCard = document.getElementById("calendarCard");
    setVisibility(calendarCard, visibility.hijriCalendar === false);

    // Qibla Direction
    const qiblaCard = document.getElementById("qiblaCard");
    setVisibility(qiblaCard, visibility.qiblaDirection === false);

    // Weather
    const weatherCard = document.getElementById("weatherCard");
    setVisibility(weatherCard, visibility.weather === false);

    // Lunar Phase
    const lunarPhaseCard = document.getElementById("lunarPhaseCard");
    setVisibility(lunarPhaseCard, visibility.lunarPhase === false);

    // Fasting
    const fastingCard = document.getElementById("fastingCard");
    setVisibility(fastingCard, visibility.fasting === false);

    // Flashcards
    const flashcardCard = document.getElementById("flashcardCard");
    setVisibility(flashcardCard, visibility.flashcards === false);

    // Adhkar
    const adhkarCard = document.getElementById("adhkarCard");
    setVisibility(adhkarCard, visibility.adhkar === false);

    // Hadith
    const hadithCard = document.getElementById("hadithCard");
    setVisibility(hadithCard, visibility.hadith === false);

    // Todo
    const todoCard = document.getElementById("todoCard");
    setVisibility(todoCard, visibility.todoList === false);

    // Notes
    const notesCard = document.getElementById("notesCard");
    setVisibility(notesCard, visibility.notes === false);

    // Pocket Quran
    const pocketQuranCard = document.getElementById("pocketQuranCard");
    setVisibility(pocketQuranCard, visibility.pocketQuran === false);

    if (
      this.momentMode &&
      typeof this.momentMode.syncLayoutVisibility === "function"
    ) {
      this.momentMode.syncLayoutVisibility();
    }

    // Apply quote layout style
    if (this.quotes && typeof this.quotes.applyLayoutStyle === "function") {
      this.quotes.applyLayoutStyle();
    }

    // Update compact weather display
    if (
      this.weather &&
      typeof this.weather.updateCompactWeather === "function"
    ) {
      this.weather.updateCompactWeather();
    }

    // Notify grid layout manager to recalculate layout (only when visibility changed)
    if (visibilityChanged) {
      try {
        document.dispatchEvent(new CustomEvent("md:visibility-changed"));
      } catch (e) {
        // Fallback for older browsers
        if (this.gridLayout) {
          this.gridLayout.recalculateLayout();
        }
      }
    }
  }

  /**
   * Apply heading settings (clock, date formatting)
   */
  applyHeadingSettings() {
    const settings = this.storage.getSettings();
    const headingSettings = settings.heading || {};
    const visibility = settings.componentVisibility || {};
    const timeSection = document.querySelector(".time-section");
    const timeMainRow =
      document.getElementById("timeMainRow") ||
      document.querySelector(".time-main-row");
    const currentSeconds = document.getElementById("currentSeconds");

    if (
      settings.compactWeatherEnabled === true &&
      this.weather &&
      typeof this.weather.ensureCompactWeatherElement === "function"
    ) {
      this.weather.ensureCompactWeatherElement();
    }

    const compactWeather = document.getElementById("compactWeather");
    const toggleHeaderSurface = (el, enabled) => {
      if (!el) return;
      el.classList.toggle("header-surface-enabled", enabled === true);
    };

    const showGreeting =
      headingSettings.showGreeting !== false && visibility.header !== false;
    const showClock =
      headingSettings.showClock !== false && visibility.header !== false;
    const showDate = headingSettings.showDate !== false;
    const showNextPrayer =
      showClock &&
      headingSettings.showNextPrayer === true &&
      visibility.header !== false;

    // Show/hide clock
    if (timeSection) {
      timeSection.style.display = showClock ? "" : "none";
    }

    if (this.greeting) {
      this.greeting.style.display = showGreeting ? "" : "none";
      this.greeting.setAttribute(
        "aria-hidden",
        showGreeting ? "false" : "true",
      );
    }

    // Show/hide seconds
    if (currentSeconds) {
      currentSeconds.style.display =
        headingSettings.showSeconds === false ? "none" : "";
    }

    // Apply clock style
    const clockStyle = headingSettings.clockStyle || "default";
    const clockSurfaceLocked = clockStyle === "boxed" || clockStyle === "pill";
    if (timeSection) {
      [...timeSection.classList]
        .filter((c) => c.startsWith("clock-style-"))
        .forEach((c) => timeSection.classList.remove(c));
      timeSection.classList.add(`clock-style-${clockStyle}`);
    }

    // Show/hide date
    if (this.dateDisplay) {
      this.dateDisplay.style.display = showDate ? "" : "none";
      this.dateDisplay.setAttribute("aria-hidden", showDate ? "false" : "true");
    }

    toggleHeaderSurface(
      this.greeting,
      headingSettings.greetingBackgroundEnabled === true,
    );
    toggleHeaderSurface(
      this.dateDisplay,
      headingSettings.dateBackgroundEnabled === true,
    );
    toggleHeaderSurface(
      timeMainRow,
      !clockSurfaceLocked && headingSettings.timeBackgroundEnabled === true,
    );
    toggleHeaderSurface(
      this.headerNextPrayer,
      headingSettings.nextPrayerBackgroundEnabled === true,
    );
    toggleHeaderSurface(
      compactWeather,
      headingSettings.compactWeatherBackgroundEnabled === true,
    );

    const greetingGlowColor = this.resolveHeaderGlowColor(
      headingSettings.greetingGlowColor,
      this.greeting,
    );
    const dateGlowColor = this.resolveHeaderGlowColor(
      headingSettings.dateGlowColor,
      this.dateDisplay,
    );
    const timeGlowColor = this.resolveHeaderGlowColor(
      headingSettings.timeGlowColor,
      this.currentTime || timeMainRow,
    );
    const nextPrayerGlowColor = this.resolveHeaderGlowColor(
      headingSettings.nextPrayerGlowColor,
      this.headerNextPrayer,
    );
    const compactWeatherGlowColor = this.resolveHeaderGlowColor(
      headingSettings.compactWeatherGlowColor,
      compactWeather?.querySelector(".compact-weather-temp") || compactWeather,
    );

    const greetingGlowOpacity = this.clampHeaderGlowOpacity(
      headingSettings.greetingGlowOpacity,
      72,
    );
    const greetingGlowRadius = this.clampHeaderGlowRadius(
      headingSettings.greetingGlowRadius,
      14,
    );

    const dateGlowOpacity = this.clampHeaderGlowOpacity(
      headingSettings.dateGlowOpacity,
      72,
    );
    const dateGlowRadius = this.clampHeaderGlowRadius(
      headingSettings.dateGlowRadius,
      14,
    );

    const timeGlowOpacity = this.clampHeaderGlowOpacity(
      headingSettings.timeGlowOpacity,
      72,
    );
    const timeGlowRadius = this.clampHeaderGlowRadius(
      headingSettings.timeGlowRadius,
      14,
    );

    const nextPrayerGlowOpacity = this.clampHeaderGlowOpacity(
      headingSettings.nextPrayerGlowOpacity,
      72,
    );
    const nextPrayerGlowRadius = this.clampHeaderGlowRadius(
      headingSettings.nextPrayerGlowRadius,
      14,
    );

    const compactWeatherGlowOpacity = this.clampHeaderGlowOpacity(
      headingSettings.compactWeatherGlowOpacity,
      72,
    );
    const compactWeatherGlowRadius = this.clampHeaderGlowRadius(
      headingSettings.compactWeatherGlowRadius,
      14,
    );

    this.applyHeaderGlow(
      this.greeting,
      headingSettings.greetingGlowEnabled === true && showGreeting,
      greetingGlowColor,
      greetingGlowOpacity,
      greetingGlowRadius,
    );
    this.applyHeaderGlow(
      this.dateDisplay,
      headingSettings.dateGlowEnabled === true && showDate,
      dateGlowColor,
      dateGlowOpacity,
      dateGlowRadius,
    );
    this.applyHeaderGlow(
      timeMainRow,
      headingSettings.timeGlowEnabled === true && showClock,
      timeGlowColor,
      timeGlowOpacity,
      timeGlowRadius,
    );
    this.applyHeaderGlow(
      this.headerNextPrayer,
      headingSettings.nextPrayerGlowEnabled === true && showNextPrayer,
      nextPrayerGlowColor,
      nextPrayerGlowOpacity,
      nextPrayerGlowRadius,
    );
    this.applyHeaderGlow(
      compactWeather,
      headingSettings.compactWeatherGlowEnabled === true &&
        settings.compactWeatherEnabled === true,
      compactWeatherGlowColor,
      compactWeatherGlowOpacity,
      compactWeatherGlowRadius,
    );

    if (
      this.themes &&
      typeof this.themes.getMainGridComponentOpacity === "function" &&
      typeof this.themes.setMainGridComponentOpacity === "function"
    ) {
      this.themes.setMainGridComponentOpacity(
        this.themes.getMainGridComponentOpacity(),
        false,
      );
    }

    if (
      this.momentMode &&
      typeof this.momentMode.syncLayoutVisibility === "function"
    ) {
      this.momentMode.syncLayoutVisibility();
    }

    this.updateHeaderNextPrayer();
  }

  /**
   * Setup location updates
   */
  setupLocationUpdates() {
    // Update qibla when prayer times location changes
    const originalUpdate = this.prayerTimes.updatePrayerTimes.bind(
      this.prayerTimes,
    );
    this.prayerTimes.updatePrayerTimes = () => {
      originalUpdate();
      const location = this.prayerTimes.getCurrentLocation();
      if (location) {
        this.qibla.updateLocation(location.latitude, location.longitude);
        if (this.lunarPhase) {
          this.lunarPhase.refresh();
        }
      }
    };
  }

  getSettingsTabFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search || "");
      const raw =
        params.get("settingsTab") || params.get("openSettingsTab") || "";
      const tab = String(raw).trim();
      if (!tab) return "";

      const allowedTabs = new Set(["location", "prayer"]);
      return allowedTabs.has(tab) ? tab : "";
    } catch (e) {
      return "";
    }
  }

  getSettingsTabFromHash() {
    try {
      const hashText = String(window.location.hash || "").replace(/^#/, "");
      if (!hashText) return "";

      const params = new URLSearchParams(hashText);
      const raw =
        params.get("settingsTab") || params.get("openSettingsTab") || "";
      const tab = String(raw).trim();
      if (!tab) return "";

      const allowedTabs = new Set(["location", "prayer"]);
      return allowedTabs.has(tab) ? tab : "";
    } catch (e) {
      return "";
    }
  }

  clearSettingsTabQueryFromUrl() {
    try {
      const url = new URL(window.location.href);
      let changed = false;

      if (
        url.searchParams.has("settingsTab") ||
        url.searchParams.has("openSettingsTab")
      ) {
        url.searchParams.delete("settingsTab");
        url.searchParams.delete("openSettingsTab");
        changed = true;
      }

      const hashText = String(url.hash || "").replace(/^#/, "");
      if (hashText) {
        const hashParams = new URLSearchParams(hashText);
        const hasSettingsTabInHash =
          hashParams.has("settingsTab") || hashParams.has("openSettingsTab");

        if (hasSettingsTabInHash) {
          hashParams.delete("settingsTab");
          hashParams.delete("openSettingsTab");
          changed = true;

          const nextHash = hashParams.toString();
          url.hash = nextHash ? `#${nextHash}` : "";
        }
      }

      if (!changed) return;

      const searchText = url.searchParams.toString();
      const nextUrl = `${url.pathname}${searchText ? `?${searchText}` : ""}${url.hash || ""}`;
      history.replaceState(null, "", nextUrl);
    } catch (e) {
      // ignore
    }
  }

  openSettingsFromUrlIfRequested() {
    const requestedTab =
      this.getSettingsTabFromUrl() || this.getSettingsTabFromHash();
    if (!requestedTab || !this.settings) return;

    try {
      this.settings.openModal();
      this.settings.switchTab(requestedTab);

      if (requestedTab === "location") {
        const locationFocusEl =
          document.getElementById("requestLocationBtn") ||
          document.getElementById("cityInput");
        locationFocusEl?.focus?.();
      } else if (requestedTab === "prayer") {
        const prayerFocusEl =
          document.getElementById("calculationMethod") ||
          document.getElementById("showFajr");
        prayerFocusEl?.focus?.();
      }
    } catch (e) {
      console.warn("Failed to open settings from URL:", e);
    }

    this.clearSettingsTabQueryFromUrl();
  }
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  // Prevent browser scroll restoration from jumping to a saved (often bottom)
  // scroll position on refresh/startup.
  try {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  } catch (e) {}

  const scrollToTop = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch (e) {
      try {
        window.scrollTo(0, 0);
      } catch (e2) {}
    }
  };

  // Ensure we start at the top even if layout shifts during first paint.
  scrollToTop();
  requestAnimationFrame(scrollToTop);

  const dashboard = new MuslimDashboard();
  // Expose instance for runtime interactions (settings live preview, debugging)
  window.dashboard = dashboard;
  const initPromise = dashboard.init();

  // If any async init (fetches, renders) triggers a late scroll adjustment,
  // re-assert top once init settles.
  if (initPromise && typeof initPromise.finally === "function") {
    initPromise.finally(() => {
      scrollToTop();
      requestAnimationFrame(scrollToTop);
    });
  }
});

// Export for debugging
window.MuslimDashboard = MuslimDashboard;

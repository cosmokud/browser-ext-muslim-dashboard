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

    // Unified content search modal (Quotes / Adhkar / Hadith)
    this.contentSearch = null;

    // Grid layout manager for drag-and-drop
    this.gridLayout = null; // Will be initialized after DOM
    // Sidebar mode (3-column layout)
    this.sidebarModeEnabled = false;

    // Dashboard mode coordination (ensures modes are mutually exclusive)
    this._setSidebarModeEnabled = null;
    this._setQuranFocusModeEnabled = null;
    this._dashboardModeBeforeFocus = "normal";

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

  initSidebarMode() {
    const btn = document.getElementById("sidebarModeBtn");
    if (!btn) return;

    const MIN_SIDEBAR_MODE_WIDTH = 2144; // px
    const isSidebarWidthSupported = () => {
      try {
        return window.innerWidth >= MIN_SIDEBAR_MODE_WIDTH;
      } catch (e) {
        return false;
      }
    };

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

      // Guard: sidebar mode requires enough viewport width.
      if (next && !isSidebarWidthSupported()) {
        this.showToast(
          "Your screen width doesn't support sidebar mode",
          "info",
        );

        try {
          const s = this.storage.getSettings();
          s.sidebarModeEnabled = false;
          if (s.lastDashboardMode === "sidebar") s.lastDashboardMode = "normal";
          this.storage.saveSettings(s);
        } catch (e) {}

        return;
      }

      // Enable: toggle CSS first (so sidebars are visible), then swap layout state.
      // Disable: swap layout state first (so components return), then remove CSS.
      if (next) {
        this.sidebarModeEnabled = true;
        document.body.classList.add("sidebar-mode");
        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");

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
        btn.classList.remove("active");
        btn.setAttribute("aria-pressed", "false");

        try {
          const s = this.storage.getSettings();
          s.sidebarModeEnabled = false;
          if (s.lastDashboardMode === "sidebar") s.lastDashboardMode = "normal";
          this.storage.saveSettings(s);
        } catch (e) {}
      }
    };

    // Expose setter for other modes to call.
    this._setSidebarModeEnabled = setEnabled;

    // Restore last state from settings
    try {
      const s = this.storage.getSettings();
      // Enforce exclusivity on startup: if Quran focus or Moment mode is the active/last mode,
      // do not also restore sidebar mode.
      const focusInitial =
        s.quranFocusModeEnabled === true ||
        s.lastDashboardMode === "quranFocus";
      const momentInitial =
        s.momentModeEnabled === true || s.lastDashboardMode === "moment";
      const initial =
        !focusInitial &&
        !momentInitial &&
        (s.sidebarModeEnabled === true || s.lastDashboardMode === "sidebar");

      if (initial && !isSidebarWidthSupported()) {
        this.showToast(
          "Your screen width doesn't support sidebar mode",
          "info",
        );
        setEnabled(false);
      } else {
        setEnabled(initial);
      }
    } catch (e) {
      setEnabled(false);
    }

    btn.addEventListener("click", () => {
      setEnabled(!this.sidebarModeEnabled);
    });

    // Auto-exit sidebar mode on resize if it becomes unsupported.
    let resizeTimer = null;
    window.addEventListener("resize", () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (this.sidebarModeEnabled && !isSidebarWidthSupported()) {
          setEnabled(false);
          this.showToast(
            "It's no longer possible to stay in sidebars mode with your current screen width.",
            "info",
          );
        }
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

    // Initialize sidebar mode toggle (FAB button)
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
     *   - OFF: Disable glass effect for this card only (more readable), locks blur power toggle
     *   - DASH: Follow dashboard's global glass setting (default behavior)
     *   - ON: Force enable glass effect for this card
     * - Custom blur power slider with toggle to enable/disable
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

    const readSettings = () => this.storage.getSettings();
    const writeSettings = (patch) => {
      const current = this.storage.get("settings", {});
      this.storage.set("settings", { ...current, ...patch });
    };

    // Close all open blur menus
    const closeAllBlurMenus = () => {
      document
        .querySelectorAll(".card-blur-menu.blur-menu-open")
        .forEach((menu) => {
          menu.classList.remove("blur-menu-open");
          menu.closest(".card")?.classList.remove("card-blur-popup-open");
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

    const setupBlurMenu = ({ cardId, stateKey, blurPowerKey }) => {
      const card = document.getElementById(cardId);
      const menu = document.querySelector(
        `.card-blur-menu[data-card-id="${cardId}"]`,
      );

      if (!card || !menu) return null;

      const btn = menu.querySelector(".card-blur-btn");
      const popup = menu.querySelector(".blur-settings-popup");
      const closeBtn = popup?.querySelector(".blur-popup-close");
      const glassOptions = popup?.querySelectorAll(".blur-glass-option");
      const customToggle = popup?.querySelector(".blur-power-checkbox");
      const sliderWrap = popup?.querySelector(".blur-power-slider-wrap");
      const slider = popup?.querySelector(".blur-power-slider");
      const valueDisplay = popup?.querySelector(".blur-power-value");
      const blurPowerToggleLabel = popup?.querySelector(".blur-power-toggle");

      if (!btn || !popup) return null;

      const clearCardGlassVars = () => {
        card.style.removeProperty("--glass-bg");
        card.style.removeProperty("--glass-bg-hover");
        card.style.removeProperty("--glass-border");
        card.style.removeProperty("--glass-shadow");
      };

      const applyCardGlassVars = (glassEnabled) => {
        const colors = this.themes?.getThemeColors?.();
        if (!colors) return;

        if (glassEnabled) {
          card.style.setProperty("--glass-bg", colors.glassBg);
          card.style.setProperty("--glass-bg-hover", colors.glassBgHover);
          card.style.setProperty("--glass-border", colors.glassBorder);
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
      const applyGlassState = (state, customBlurEnabled, customBlurPower) => {
        // Determine effective glass state based on the triple toggle
        // OFF: Force glass disabled for this component only
        // DASH: Follow dashboard setting
        // ON: Force glass enabled for this component
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
          clearCardGlassVars();
        } else if (state === "on") {
          card.dataset.glassEnabled = "true";
          applyCardGlassVars(true);
        } else if (state === "off") {
          card.dataset.glassEnabled = "false";
          applyCardGlassVars(false);
        }

        // Determine effective blur power
        let effectiveBlurPower;
        if (!effectiveGlass) {
          // Glass is off, blur multiplier should be 0
          effectiveBlurPower = 0;
        } else if (customBlurEnabled) {
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
        } else if (customBlurEnabled) {
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
      const syncUI = (glassState, customBlurEnabled, customBlurPower) => {
        // Update glass toggle buttons
        glassOptions?.forEach((opt) => {
          const val = opt.dataset.glassValue;
          opt.classList.toggle("active", val === glassState);
        });

        // When glass is OFF, lock the blur power toggle to disabled
        const isGlassOff = glassState === "off";

        // Update custom blur toggle
        if (customToggle) {
          if (isGlassOff) {
            customToggle.checked = false;
            customToggle.disabled = true;
          } else {
            customToggle.checked = customBlurEnabled;
            customToggle.disabled = false;
          }
        }

        // Update blur power toggle label/wrapper disabled state
        if (blurPowerToggleLabel) {
          blurPowerToggleLabel.classList.toggle("disabled", isGlassOff);
        }

        // Update slider state - disabled when glass is off OR custom blur is not enabled
        if (sliderWrap) {
          sliderWrap.classList.toggle(
            "disabled",
            isGlassOff || !customBlurEnabled,
          );
        }

        // Update slider value
        if (slider) {
          slider.value = String(customBlurPower);
          slider.disabled = isGlassOff;
        }

        // Update value display
        if (valueDisplay) {
          valueDisplay.textContent = customBlurPower + "%";
        }
      };

      // Load initial state
      const settings = readSettings();
      let currentGlassState = settings?.[stateKey] || "dashboard";
      let currentCustomEnabled = settings?.[blurPowerKey + "Enabled"] || false;
      let currentCustomPower = settings?.[blurPowerKey] ?? 100;

      // If glass is off, force custom enabled to false
      if (currentGlassState === "off") {
        currentCustomEnabled = false;
      }

      // Apply initial state
      syncUI(currentGlassState, currentCustomEnabled, currentCustomPower);
      applyGlassState(
        currentGlassState,
        currentCustomEnabled,
        currentCustomPower,
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
        }
      });

      // Close button
      closeBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        menu.classList.remove("blur-menu-open");
        card.classList.remove("card-blur-popup-open");
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

          // If switching to OFF, force disable custom blur
          if (newState === "off") {
            currentCustomEnabled = false;
            writeSettings({ [blurPowerKey + "Enabled"]: false });
          }

          // Update UI
          glassOptions.forEach((o) => o.classList.remove("active"));
          opt.classList.add("active");
          syncUI(currentGlassState, currentCustomEnabled, currentCustomPower);

          // Apply and save
          applyGlassState(
            currentGlassState,
            currentCustomEnabled,
            currentCustomPower,
          );
          writeSettings({ [stateKey]: newState });
        });
      });

      // Custom blur power toggle
      customToggle?.addEventListener("change", () => {
        // Don't allow enabling custom blur when glass is off
        if (currentGlassState === "off") {
          customToggle.checked = false;
          return;
        }

        currentCustomEnabled = customToggle.checked;

        // Update slider state
        syncUI(currentGlassState, currentCustomEnabled, currentCustomPower);

        // Apply and save
        applyGlassState(
          currentGlassState,
          currentCustomEnabled,
          currentCustomPower,
        );
        writeSettings({ [blurPowerKey + "Enabled"]: currentCustomEnabled });
      });

      // Blur power slider
      slider?.addEventListener("input", () => {
        // Don't process if glass is off
        if (currentGlassState === "off") return;

        currentCustomPower = parseInt(slider.value, 10);

        // Update value display
        if (valueDisplay) {
          valueDisplay.textContent = currentCustomPower + "%";
        }

        // Apply and save
        applyGlassState(
          currentGlassState,
          currentCustomEnabled,
          currentCustomPower,
        );
        writeSettings({ [blurPowerKey]: currentCustomPower });
      });

      // Listen for dashboard glass setting changes
      document.addEventListener("md:glass-setting-changed", () => {
        // Only update if following dashboard setting
        if (currentGlassState === "dashboard") {
          applyGlassState(
            currentGlassState,
            currentCustomEnabled,
            currentCustomPower,
          );
        }
      });

      // Recompute per-card glass/solid colors on theme changes.
      document.addEventListener("md:theme-change", () => {
        applyGlassState(
          currentGlassState,
          currentCustomEnabled,
          currentCustomPower,
        );
      });

      // Listen for dashboard blur power changes
      document.addEventListener("md:ui-blur-update", () => {
        // Only update if glass is not off and not using custom blur
        if (currentGlassState !== "off" && !currentCustomEnabled) {
          applyGlassState(
            currentGlassState,
            currentCustomEnabled,
            currentCustomPower,
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
          ),
      };
    };

    // Setup all cards with blur menu
    const blurConfigs = [
      {
        cardId: "pocketQuranCard",
        stateKey: "pocketQuranBlurState",
        blurPowerKey: "pocketQuranBlurPower",
      },
      {
        cardId: "todoCard",
        stateKey: "todoBlurState",
        blurPowerKey: "todoBlurPower",
      },
      {
        cardId: "flashcardCard",
        stateKey: "flashcardBlurState",
        blurPowerKey: "flashcardBlurPower",
      },
      {
        cardId: "adhkarCard",
        stateKey: "adhkarBlurState",
        blurPowerKey: "adhkarBlurPower",
      },
      {
        cardId: "hadithCard",
        stateKey: "hadithBlurState",
        blurPowerKey: "hadithBlurPower",
      },
      {
        cardId: "notesCard",
        stateKey: "notesBlurState",
        blurPowerKey: "notesBlurPower",
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

      const restoreMode =
        this._dashboardModeBeforeFocus === "sidebar" ? "sidebar" : "normal";

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

      // If the user came from sidebar mode, restore it after focus cleanup.
      if (restoreMode === "sidebar") {
        try {
          if (typeof this._setSidebarModeEnabled === "function") {
            this._setSidebarModeEnabled(true);
          }
        } catch (e) {}
      }
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
        s.momentModeEnabled === true || s.lastDashboardMode === "moment";
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
   * Initialize Moment Mode
   * Minimalist layout with transparent components
   * Moves actual components (prayerTimesCard, quoteSection, pinnedAppsSection, searchBarSection)
   * into moment mode containers with transparent styling
   */
  initMomentMode() {
    const momentBtn = document.getElementById("momentModeBtn");
    if (!momentBtn) return;

    this._momentModeActive = false;
    this._momentModeUpdateInterval = null;

    // Store original parent references for restoring components
    this._momentModeOriginalParents = {};

    const exitBtn = document.getElementById("momentModeExitBtn");

    const updateMomentClock = () => {
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

      const clockTime = document.getElementById("momentClockTime");
      const clockSeconds = document.getElementById("momentClockSeconds");
      const clockAmPm = document.getElementById("momentClockAmPm");

      if (!is24h) {
        const suffix = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        if (clockTime) clockTime.textContent = `${hours}:${minutes}`;
        if (clockSeconds) clockSeconds.textContent = `:${seconds}`;
        if (clockAmPm) {
          clockAmPm.textContent = showAmPm ? suffix : "";
          clockAmPm.style.display = showAmPm ? "" : "none";
        }
      } else {
        if (clockTime)
          clockTime.textContent = `${String(hours).padStart(2, "0")}:${minutes}`;
        if (clockSeconds) clockSeconds.textContent = `:${seconds}`;
        if (clockAmPm) {
          clockAmPm.textContent = "";
          clockAmPm.style.display = "none";
        }
      }
    };

    const updateMomentDate = () => {
      const now = new Date();
      const settings = this.storage.getSettings();

      // Format Hijri date
      const hijriDate = this.hijri.toHijri(now, settings.hijriAdjustment || 0);
      const hijriText = this.hijri.format(hijriDate, "full", "en");

      // Format Gregorian date
      const gregorianOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      const gregorianText = now.toLocaleDateString("en-US", gregorianOptions);

      const momentDate = document.getElementById("momentDate");
      if (momentDate) {
        momentDate.innerHTML = `${hijriText} AH<br>${gregorianText}`;
      }
    };

    const moveComponentsToMomentMode = () => {
      const momentLeft = document.getElementById("momentModeLeft");
      const momentMiddle = document.getElementById("momentModeMiddle");

      // Components to move
      const prayerTimesCard = document.getElementById("prayerTimesCard");
      const quoteSection = document.getElementById("quoteSection");
      const pinnedAppsSection = document.getElementById("pinnedAppsSection");
      const searchBarSection = document.getElementById("searchBarSection");

      // Store original parents and next siblings for restoration
      if (prayerTimesCard) {
        this._momentModeOriginalParents.prayerTimesCard = {
          parent: prayerTimesCard.parentElement,
          nextSibling: prayerTimesCard.nextElementSibling,
        };
        if (momentLeft) {
          momentLeft.appendChild(prayerTimesCard);
        }
      }

      if (quoteSection) {
        this._momentModeOriginalParents.quoteSection = {
          parent: quoteSection.parentElement,
          nextSibling: quoteSection.nextElementSibling,
        };
        if (momentMiddle) {
          // Create a wrapper container for the quote section to allow centering
          // while the quote maintains its own compact width
          const quoteWrapper = document.createElement("div");
          quoteWrapper.className = "moment-quote-wrapper";
          quoteWrapper.id = "momentQuoteWrapper";
          quoteWrapper.appendChild(quoteSection);
          momentMiddle.appendChild(quoteWrapper);
        }
      }

      if (pinnedAppsSection) {
        this._momentModeOriginalParents.pinnedAppsSection = {
          parent: pinnedAppsSection.parentElement,
          nextSibling: pinnedAppsSection.nextElementSibling,
        };
        if (momentMiddle) {
          momentMiddle.appendChild(pinnedAppsSection);
        }
      }

      if (searchBarSection) {
        this._momentModeOriginalParents.searchBarSection = {
          parent: searchBarSection.parentElement,
          nextSibling: searchBarSection.nextElementSibling,
        };
        if (momentMiddle) {
          // Create a wrapper container for the search bar to allow centering
          // while the search bar maintains its own compact width
          const searchWrapper = document.createElement("div");
          searchWrapper.className = "moment-search-wrapper";
          searchWrapper.id = "momentSearchWrapper";
          searchWrapper.appendChild(searchBarSection);
          momentMiddle.appendChild(searchWrapper);
        }
      }
    };

    const restoreComponentsFromMomentMode = () => {
      // Restore each component to its original location
      const restoreComponent = (id) => {
        const component = document.getElementById(id);
        const original = this._momentModeOriginalParents[id];
        if (component && original && original.parent) {
          if (original.nextSibling) {
            original.parent.insertBefore(component, original.nextSibling);
          } else {
            original.parent.appendChild(component);
          }
        }
      };

      // Remove the search bar wrapper before restoring
      const searchWrapper = document.getElementById("momentSearchWrapper");
      if (searchWrapper) {
        searchWrapper.remove();
      }

      // Remove the quote wrapper before restoring
      const quoteWrapper = document.getElementById("momentQuoteWrapper");
      if (quoteWrapper) {
        quoteWrapper.remove();
      }

      restoreComponent("prayerTimesCard");
      restoreComponent("quoteSection");
      restoreComponent("pinnedAppsSection");
      restoreComponent("searchBarSection");

      // Clear stored references
      this._momentModeOriginalParents = {};
    };

    const enterMomentMode = () => {
      // Exit other modes first
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
          this.sidebarModeEnabled &&
          typeof this._setSidebarModeEnabled === "function"
        ) {
          this._setSidebarModeEnabled(false);
        }
      } catch (e) {}

      // Disable and lock layout editing while Moment Mode is active.
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

      this._momentModeActive = true;
      momentBtn.setAttribute("aria-pressed", "true");
      momentBtn.classList.add("active");
      document.body.classList.add("moment-mode");

      // Move actual components to moment mode containers
      moveComponentsToMomentMode();

      // Initialize clock and date
      updateMomentClock();
      updateMomentDate();

      // Start update interval for clock
      this._momentModeUpdateInterval = setInterval(() => {
        updateMomentClock();
      }, 1000);

      // Close FAB menu
      const fabMenu = document.getElementById("fabMenu");
      const fabToggle = document.getElementById("fabMenuToggle");
      const fabItems = document.getElementById("fabMenuItems");
      if (fabMenu && fabMenu.classList.contains("open")) {
        fabMenu.classList.remove("open");
        if (fabToggle) {
          fabToggle.setAttribute("aria-expanded", "false");
        }
        if (fabItems) {
          fabItems.setAttribute("aria-hidden", "true");
        }
      }

      // Save state
      try {
        const s = this.storage.getSettings();
        s.momentModeEnabled = true;
        s.sidebarModeEnabled = false;
        s.quranFocusModeEnabled = false;
        s.lastDashboardMode = "moment";
        this.storage.saveSettings(s);
      } catch (e) {}
    };

    const exitMomentMode = () => {
      this._momentModeActive = false;

      // Unlock layout editing when Moment Mode exits.
      try {
        if (
          this.gridLayout &&
          typeof this.gridLayout.setEditModeLocked === "function"
        ) {
          this.gridLayout.setEditModeLocked(false);
        }
      } catch (e) {}

      momentBtn.setAttribute("aria-pressed", "false");
      momentBtn.classList.remove("active");
      document.body.classList.remove("moment-mode");

      // Restore components to original locations
      restoreComponentsFromMomentMode();

      // Clear update interval
      if (this._momentModeUpdateInterval) {
        clearInterval(this._momentModeUpdateInterval);
        this._momentModeUpdateInterval = null;
      }

      // Save state
      try {
        const s = this.storage.getSettings();
        s.momentModeEnabled = false;
        s.lastDashboardMode = "normal";
        this.storage.saveSettings(s);
      } catch (e) {}

      // Trigger resize to restore layout
      try {
        window.dispatchEvent(new Event("resize"));
      } catch (e) {}
    };

    // Expose setter for other modes
    this._setMomentModeEnabled = (enabled) => {
      if (enabled) enterMomentMode();
      else exitMomentMode();
    };

    const toggleMomentMode = () => {
      if (this._momentModeActive) {
        exitMomentMode();
      } else {
        enterMomentMode();
      }
    };

    momentBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleMomentMode();
    });

    // Exit button at the bottom center of moment mode
    if (exitBtn) {
      exitBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        exitMomentMode();
      });
    }

    // Handle Escape key to exit moment mode
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._momentModeActive) {
        exitMomentMode();
      }
    });

    // Restore last state from settings
    try {
      const s = this.storage.getSettings();
      if (s.momentModeEnabled === true || s.lastDashboardMode === "moment") {
        enterMomentMode();
      }
    } catch (e) {}
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
      this.currentTime.textContent = `${hours}:${minutes}`;

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
      this.currentTime.textContent = `${String(hours).padStart(
        2,
        "0",
      )}:${minutes}`;
      if (this.currentAmPm) {
        this.currentAmPm.textContent = "";
        this.currentAmPm.style.display = "none";
        this.currentAmPm.setAttribute("aria-hidden", "true");
      }
    }

    if (this.currentSeconds) {
      this.currentSeconds.textContent = `:${seconds}`;
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
      const nextDisplay = shouldHide ? "none" : "";
      const nextAria = shouldHide ? "true" : "false";

      if (el.style.display !== nextDisplay) {
        el.style.display = nextDisplay;
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
    const timeSection = document.querySelector(".time-section");
    const currentSeconds = document.getElementById("currentSeconds");

    // Show/hide clock
    if (timeSection) {
      timeSection.style.display =
        headingSettings.showClock === false ? "none" : "";
    }

    // Show/hide seconds
    if (currentSeconds) {
      currentSeconds.style.display =
        headingSettings.showSeconds === false ? "none" : "";
    }

    // Apply clock style
    const clockStyle = headingSettings.clockStyle || "default";
    if (timeSection) {
      [...timeSection.classList]
        .filter((c) => c.startsWith("clock-style-"))
        .forEach((c) => timeSection.classList.remove(c));
      timeSection.classList.add(`clock-style-${clockStyle}`);
    }

    // Show/hide date
    if (this.dateDisplay) {
      this.dateDisplay.style.display =
        headingSettings.showDate === false ? "none" : "";
    }
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

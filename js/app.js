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
    this.fasting = null; // Will be initialized after DOM
    this.notes = null; // Will be initialized after DOM
    this.pocketQuran = null; // Will be initialized after DOM

    // Grid layout manager for drag-and-drop
    this.gridLayout = null; // Will be initialized after DOM

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

    const setOpen = (open) => {
      menu.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      items.setAttribute("aria-hidden", open ? "false" : "true");
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
        Math.min(left, window.innerWidth - rect.width - margin)
      );

      let top = y - rect.height / 2;
      top = Math.max(
        margin,
        Math.min(top, window.innerHeight - rect.height - margin)
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

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (!isOpen()) return;
      if (e.key === "Escape") {
        setOpen(false);
        setTimeout(() => setHotVisible(false), 300);
      }
    });

    // Close after choosing an action
    items.addEventListener("click", (e) => {
      const button = e.target.closest("button");
      if (!button) return;
      setOpen(false);
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
      { passive: true }
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

  /**
   * Initialize the dashboard
   */
  async init() {
    console.log("🕌 Muslim Dashboard initializing...");

    // Initialize themes first (applies CSS variables before any UI renders)
    this.themes.init();

    // Start background first for visual appeal
    this.backgrounds.init();

    // Initialize time display
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);

    // Initialize date display
    this.updateDate();

    // Initialize greeting
    this.updateGreeting();

    // Initialize prayer times
    await this.prayerTimes.init();

    // Initialize qibla after location is available
    const location = this.prayerTimes.getCurrentLocation();
    if (location) {
      this.qibla.init(location.latitude, location.longitude);
    }

    // Initialize quotes
    await this.quotes.init();

    // Initialize todos
    this.todos.init();

    // Initialize pinned apps
    this.pinnedApps = new PinnedAppsManager(this.storage);

    // Initialize search bar (custom searches)
    this.searchBar = new SearchBarManager(this.storage);

    // Initialize calendar
    this.calendar = new CalendarManager(this.storage, this.hijri);
    this.calendar.init();

    // Initialize fasting countdowns
    this.fasting = new FastingManager(this.storage, this.hijri);
    this.fasting.init();

    // Initialize sticky notes
    this.stickyNotes = new StickyNotesManager(this.storage);

    // Initialize weather
    this.weather = new WeatherManager(this.storage);
    await this.weather.init();

    // Initialize lunar phase
    this.lunarPhase = new LunarPhaseManager(this.storage, this.prayerTimes);
    this.lunarPhase.init();

    // Initialize flashcards
    this.flashcards = new FlashcardManager(this.storage);
    await this.flashcards.init();

    // Initialize notes (full-width component)
    this.notes = new NotesManager(this.storage);

    // Initialize pocket quran (full-width component)
    this.pocketQuran = new PocketQuranManager(this.storage);

    // Initialize settings (after all other managers)
    this.settings = new SettingsManager(
      this.storage,
      this.prayerTimes,
      this.qibla,
      this.quotes,
      this.backgrounds,
      this.weather,
      this.flashcards
    );
    this.settings.init();

    // Apply initial container width
    const settings = this.storage.getSettings();
    this.settings.applyContainerWidth(
      settings.containerWidth || "narrow",
      settings.containerWidthCustom || 70
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

    // Apply heading settings
    this.applyHeadingSettings();

    // Apply pinned apps layout settings
    this.applyPinnedAppsSettings();

    // Apply per-card blur overrides (readability-first components)
    this.initReadabilityBlurOverrides();

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

    console.log("✅ Muslim Dashboard ready!");
  }

  initReadabilityBlurOverrides() {
    const clampNumber = (value, min, max, fallback) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return fallback;
      return Math.min(max, Math.max(min, n));
    };

    const popoverPairs = [];

    const setup = ({
      cardId,
      toggleId,
      rangeId,
      valueId,
      menuBtnId,
      popoverId,
      enabledKey,
      powerKey,
    }) => {
      const card = document.getElementById(cardId);
      const toggle = document.getElementById(toggleId);
      const range = document.getElementById(rangeId);
      const valueEl = document.getElementById(valueId);

      const menuBtn = menuBtnId ? document.getElementById(menuBtnId) : null;
      const popover = popoverId ? document.getElementById(popoverId) : null;

      if (!card || !toggle || !range || !valueEl) return;

      const readSettings = () => this.storage.getSettings();
      const writeSettings = (patch) => {
        const current = this.storage.get("settings", {});
        this.storage.set("settings", { ...current, ...patch });
      };

      const apply = (enabled, powerPercent) => {
        const clampedPower = clampNumber(powerPercent, 0, 200, 100);

        toggle.checked = Boolean(enabled);
        range.disabled = !toggle.checked;

        if (toggle.checked) {
          range.value = String(clampedPower);
          valueEl.textContent = `${clampedPower}%`;

          // Apply the blur multiplier as an inline CSS custom property.
          // Use both setProperty and setAttribute to ensure maximum compatibility.
          const multiplierValue = String(clampedPower / 100);
          card.style.setProperty("--ui-blur-multiplier", multiplierValue);

          // Also add a data attribute for debugging/CSS fallback.
          card.dataset.blurOverride = multiplierValue;
        } else {
          valueEl.textContent = "Dashboard";
          card.style.removeProperty("--ui-blur-multiplier");
          delete card.dataset.blurOverride;
        }

        // Notify components that portal UI may need syncing.
        try {
          document.dispatchEvent(
            new CustomEvent("md:card-blur-update", {
              detail: { cardId },
            })
          );
        } catch (e) {}
      };

      const settings = readSettings();
      const initialEnabled = Boolean(settings?.[enabledKey]);
      const initialPower = clampNumber(settings?.[powerKey], 0, 200, 100);
      apply(initialEnabled, initialPower);

      toggle.addEventListener("change", () => {
        const enabled = toggle.checked;
        const power = clampNumber(range.value, 0, 200, 100);
        apply(enabled, power);
        writeSettings({ [enabledKey]: enabled, [powerKey]: power });
      });

      range.addEventListener("input", () => {
        const power = clampNumber(range.value, 0, 200, 100);
        if (toggle.checked) {
          const multiplierValue = String(power / 100);
          valueEl.textContent = `${power}%`;
          card.style.setProperty("--ui-blur-multiplier", multiplierValue);
          card.dataset.blurOverride = multiplierValue;
        }
        writeSettings({ [enabledKey]: toggle.checked, [powerKey]: power });

        try {
          document.dispatchEvent(
            new CustomEvent("md:card-blur-update", {
              detail: { cardId },
            })
          );
        } catch (e) {}
      });

      if (menuBtn && popover) {
        popoverPairs.push({ menuBtn, popover });

        const setOpen = (open) => {
          popover.hidden = !open;
          menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
        };

        menuBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(popover.hidden);
        });

        popover.addEventListener("click", (e) => {
          // allow interacting with controls without closing
          e.stopPropagation();
        });

        // start closed
        setOpen(false);
      }
    };

    setup({
      cardId: "pocketQuranCard",
      toggleId: "pocketQuranBlurOverrideToggle",
      rangeId: "pocketQuranBlurOverrideRange",
      valueId: "pocketQuranBlurOverrideValue",
      menuBtnId: "pocketQuranBlurMenuBtn",
      popoverId: "pocketQuranBlurPopover",
      enabledKey: "pocketQuranBlurOverrideEnabled",
      powerKey: "pocketQuranBlurOverridePower",
    });

    setup({
      cardId: "todoCard",
      toggleId: "todoBlurOverrideToggle",
      rangeId: "todoBlurOverrideRange",
      valueId: "todoBlurOverrideValue",
      menuBtnId: "todoBlurMenuBtn",
      popoverId: "todoBlurPopover",
      enabledKey: "todoBlurOverrideEnabled",
      powerKey: "todoBlurOverridePower",
    });

    setup({
      cardId: "flashcardCard",
      toggleId: "flashcardBlurOverrideToggle",
      rangeId: "flashcardBlurOverrideRange",
      valueId: "flashcardBlurOverrideValue",
      menuBtnId: "flashcardBlurMenuBtn",
      popoverId: "flashcardBlurPopover",
      enabledKey: "flashcardBlurOverrideEnabled",
      powerKey: "flashcardBlurOverridePower",
    });

    setup({
      cardId: "notesCard",
      toggleId: "notesBlurOverrideToggle",
      rangeId: "notesBlurOverrideRange",
      valueId: "notesBlurOverrideValue",
      menuBtnId: "notesBlurMenuBtn",
      popoverId: "notesBlurPopover",
      enabledKey: "notesBlurOverrideEnabled",
      powerKey: "notesBlurOverridePower",
    });

    // Close popovers on outside click / Escape.
    if (popoverPairs.length) {
      document.addEventListener("click", (e) => {
        const t = e.target;
        for (const { menuBtn, popover } of popoverPairs) {
          if (popover.hidden) continue;
          if (menuBtn.contains(t) || popover.contains(t)) continue;
          popover.hidden = true;
          menuBtn.setAttribute("aria-expanded", "false");
        }
      });

      document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        for (const { menuBtn, popover } of popoverPairs) {
          if (popover.hidden) continue;
          popover.hidden = true;
          menuBtn.setAttribute("aria-expanded", "false");
        }
      });
    }
  }

  applyPinnedAppsSettings() {
    const settings = this.storage.getSettings();
    const perRowRaw = Number(settings.pinnedAppsPerRow);
    const perRow = Number.isFinite(perRowRaw)
      ? Math.min(20, Math.max(3, perRowRaw))
      : 10;

    const grid = document.getElementById("pinnedAppsGrid");
    if (grid) {
      grid.style.setProperty("--pinned-apps-per-row", String(perRow));
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
        "0"
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
      legacyShowWeekday
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
        greeting = timeRanges.morning?.text || "Assalamu Alaikum, Good Morning";
      } else if (hour >= 12 && hour < 15) {
        greeting =
          timeRanges.afternoon?.text || "Assalamu Alaikum, Good Afternoon";
      } else if (hour >= 15 && hour < 18) {
        greeting = timeRanges.evening?.text || "Assalamu Alaikum, Good Evening";
      } else {
        greeting = timeRanges.night?.text || "Assalamu Alaikum, Good Night";
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

    // Header (greeting, date, clock)
    const header = document.querySelector(".header");
    if (header) {
      header.style.display = visibility.header === false ? "none" : "";
      header.setAttribute(
        "aria-hidden",
        visibility.header === false ? "true" : "false"
      );
    }

    // Quick Pins
    const pinnedAppsSection = document.getElementById("pinnedAppsSection");
    if (pinnedAppsSection) {
      pinnedAppsSection.style.display =
        visibility.quickPins === false ? "none" : "";
      pinnedAppsSection.setAttribute(
        "aria-hidden",
        visibility.quickPins === false ? "true" : "false"
      );
    }

    // Search Bar
    const searchBarSection = document.getElementById("searchBarSection");
    if (searchBarSection) {
      searchBarSection.style.display =
        visibility.searchBar === false ? "none" : "";
      searchBarSection.setAttribute(
        "aria-hidden",
        visibility.searchBar === false ? "true" : "false"
      );
    }

    // Quotes
    const quoteSection = document.getElementById("quoteSection");
    if (quoteSection) {
      quoteSection.style.display = visibility.quotes === false ? "none" : "";
      quoteSection.setAttribute(
        "aria-hidden",
        visibility.quotes === false ? "true" : "false"
      );
    }

    // Prayer Times
    const prayerTimesCard = document.getElementById("prayerTimesCard");
    if (prayerTimesCard) {
      prayerTimesCard.style.display =
        visibility.prayerTimes === false ? "none" : "";
      prayerTimesCard.setAttribute(
        "aria-hidden",
        visibility.prayerTimes === false ? "true" : "false"
      );
    }

    // Hijri Calendar
    const calendarCard = document.getElementById("calendarCard");
    if (calendarCard) {
      calendarCard.style.display =
        visibility.hijriCalendar === false ? "none" : "";
      calendarCard.setAttribute(
        "aria-hidden",
        visibility.hijriCalendar === false ? "true" : "false"
      );
    }

    // Qibla Direction
    const qiblaCard = document.getElementById("qiblaCard");
    if (qiblaCard) {
      qiblaCard.style.display =
        visibility.qiblaDirection === false ? "none" : "";
      qiblaCard.setAttribute(
        "aria-hidden",
        visibility.qiblaDirection === false ? "true" : "false"
      );
    }

    // Weather
    const weatherCard = document.getElementById("weatherCard");
    if (weatherCard) {
      weatherCard.style.display = visibility.weather === false ? "none" : "";
      weatherCard.setAttribute(
        "aria-hidden",
        visibility.weather === false ? "true" : "false"
      );
    }

    // Lunar Phase
    const lunarPhaseCard = document.getElementById("lunarPhaseCard");
    if (lunarPhaseCard) {
      lunarPhaseCard.style.display =
        visibility.lunarPhase === false ? "none" : "";
      lunarPhaseCard.setAttribute(
        "aria-hidden",
        visibility.lunarPhase === false ? "true" : "false"
      );
    }

    // Fasting
    const fastingCard = document.getElementById("fastingCard");
    if (fastingCard) {
      fastingCard.style.display = visibility.fasting === false ? "none" : "";
      fastingCard.setAttribute(
        "aria-hidden",
        visibility.fasting === false ? "true" : "false"
      );
    }

    // Flashcards
    const flashcardCard = document.getElementById("flashcardCard");
    if (flashcardCard) {
      flashcardCard.style.display =
        visibility.flashcards === false ? "none" : "";
      flashcardCard.setAttribute(
        "aria-hidden",
        visibility.flashcards === false ? "true" : "false"
      );
    }

    // Todo List
    const todoCard = document.getElementById("todoCard");
    if (todoCard) {
      todoCard.style.display = visibility.todoList === false ? "none" : "";
      todoCard.setAttribute(
        "aria-hidden",
        visibility.todoList === false ? "true" : "false"
      );
    }

    // Notes
    const notesCard = document.getElementById("notesCard");
    if (notesCard) {
      notesCard.style.display = visibility.notes === false ? "none" : "";
      notesCard.setAttribute(
        "aria-hidden",
        visibility.notes === false ? "true" : "false"
      );
    }

    // Pocket Quran
    const pocketQuranCard = document.getElementById("pocketQuranCard");
    if (pocketQuranCard) {
      pocketQuranCard.style.display =
        visibility.pocketQuran === false ? "none" : "";
      pocketQuranCard.setAttribute(
        "aria-hidden",
        visibility.pocketQuran === false ? "true" : "false"
      );
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

    // Notify grid layout manager to recalculate layout
    try {
      document.dispatchEvent(new CustomEvent("md:visibility-changed"));
    } catch (e) {
      // Fallback for older browsers
      if (this.gridLayout) {
        this.gridLayout.recalculateLayout();
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
      this.prayerTimes
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

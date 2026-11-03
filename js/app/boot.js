/**
 * MuslimDashboard: dashboard boot.
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
    this.calendar = new CalendarManager(this.storage);
    this.calendar.init();

    // Initialize fasting countdowns (synchronous - no network)
    this.fasting = new FastingManager(this.storage);
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
});

/**
 * MuslimDashboard: dashboard boot.
 * Part of the class declared in js/app/index.js; load this after it.
 */
// What init() hands back, by the names the app uses for them. A caller can
// await boot completion without reaching into window.dashboard.
const BOOT_SURFACES = [
  "storage",
  "modes",
  "themes",
  "iconThemes",
  "backgrounds",
  "prayerTimes",
  "qibla",
  "quotes",
  "todos",
  "floating",
  "pinnedApps",
  "searchBar",
  "calendar",
  "fasting",
  "stickyNotes",
  "lunarPhase",
  "notes",
  "pocketQuran",
  "weather",
  "flashcards",
  "hadith",
  "adhkar",
  "contentSearch",
  "settings",
  "gridLayout",
  "momentMode",
];

// Boot order, as data. Position is the run order; `needs` names the steps that
// must already have run, so the constraints the steps state in prose are
// checkable instead of review-only. `run` is called with the dashboard as
// `this`; a step that has nothing to declare needs nothing.
const BOOT_STEPS = [
  // Existing users missing the Arabic font field get a stable default before
  // the component reads it.
  {
    name: "quranFontDefault",
    needs: [],
    run() {
      try {
        const s = this.storage.getSettings();
        if (!s.pocketQuran) s.pocketQuran = {};
        const current = String(s.pocketQuran.arabicFontFamily || "").trim();
        if (!current) {
          s.pocketQuran.arabicFontFamily = "KFGQPC Uthman Taha Naskh";
          this.storage.saveSettings(s);
        }
      } catch (e) {}
    },
  },
  // Which calendar "today" is on, before any card renders.
  {
    name: "calendarMode",
    needs: [],
    run() {
      try {
        HijriCalendars.setMode(
          this.storage.getSettings()?.fasting?.hijriCalendar,
        );
      } catch (e) {}
    },
  },
  // All modules must share the simulated date, so it is applied first.
  {
    name: "debugDateSimulation",
    needs: [],
    run() {
      try {
        this.applyDebugDateSimulationFromSettings();
      } catch (e) {}
    },
  },
  // Themes writes the CSS variables everything below renders with.
  {
    name: "themes",
    needs: [],
    run() {
      this.themes.init();
    },
  },
  // Background first for visual appeal; it depends on nothing but themes.
  {
    name: "backgrounds",
    needs: ["themes"],
    run() {
      this.backgrounds.init();
    },
  },
  {
    name: "clock",
    needs: ["themes"],
    run() {
      this.updateTime();
      setInterval(() => this.updateTime(), 1000);
    },
  },
  {
    name: "date",
    needs: ["themes", "calendarMode"],
    run() {
      this.updateDate();
    },
  },
  {
    name: "greeting",
    needs: ["themes"],
    run() {
      this.updateGreeting();
    },
  },
  {
    name: "todos",
    needs: ["themes"],
    run() {
      this.todos.init();
    },
  },
  {
    name: "pinnedApps",
    needs: ["themes"],
    run() {
      this.pinnedApps = new PinnedAppsManager(this.storage);
    },
  },
  {
    name: "searchBar",
    needs: ["themes"],
    run() {
      this.searchBar = new SearchBarManager(this.storage);
    },
  },
  {
    name: "favicons",
    needs: ["pinnedApps", "searchBar"],
    run() {
      if (window.faviconCache?.initializeAll) {
        window.faviconCache
          .initializeAll(this.pinnedApps.apps, this.searchBar.searches)
          .catch(() => {});
      }
    },
  },
  {
    name: "calendar",
    needs: ["themes", "calendarMode"],
    run() {
      this.calendar = new CalendarManager(this.storage);
      this.calendar.init();
    },
  },
  {
    name: "fasting",
    needs: ["themes", "calendarMode"],
    run() {
      this.fasting = new FastingManager(this.storage);
      this.fasting.init();
    },
  },
  {
    name: "stickyNotes",
    needs: ["themes"],
    run() {
      this.stickyNotes = new StickyNotesManager(this.storage);
    },
  },
  {
    name: "lunarPhase",
    needs: ["themes", "calendarMode"],
    run() {
      this.lunarPhase = new LunarPhaseManager(this.storage, this.prayerTimes);
      this.lunarPhase.init();
    },
  },
  {
    name: "notes",
    needs: ["themes"],
    run() {
      this.notes = new NotesManager(this.storage);
    },
  },
  {
    name: "pocketQuran",
    needs: ["themes", "quranFontDefault"],
    run() {
      this.pocketQuran = new PocketQuranManager(this.storage);
    },
  },
  {
    name: "weather",
    needs: ["themes"],
    run() {
      this.weather = new WeatherManager(this.storage);
    },
  },
  {
    name: "flashcards",
    needs: ["themes"],
    run() {
      this.flashcards = new FlashcardManager(this.storage);
    },
  },
  {
    name: "hadith",
    needs: ["themes"],
    run() {
      this.hadith = new HadithManager(this.storage);
    },
  },
  {
    name: "adhkar",
    needs: ["themes"],
    run() {
      this.adhkar = new AdhkarManager(this.storage);
    },
  },
  {
    name: "contentSearch",
    needs: ["themes", "todos", "notes", "hadith", "adhkar"],
    run() {
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
    },
  },
  // Settings hands these managers to the settings UI, so they must exist.
  {
    name: "settings",
    needs: ["themes", "weather", "flashcards", "hadith", "adhkar"],
    run() {
      this.settings = new SettingsManager({
        storage: this.storage,
        prayerTimes: this.prayerTimes,
        qibla: this.qibla,
        quotes: this.quotes,
        backgrounds: this.backgrounds,
        weather: this.weather,
        flashcards: this.flashcards,
        hadith: this.hadith,
        adhkar: this.adhkar,
      });
      this.settings.init();
      this.openSettingsFromUrlIfRequested();
      window.addEventListener("hashchange", () => {
        this.openSettingsFromUrlIfRequested();
      });
    },
  },
  {
    name: "containerWidth",
    needs: ["settings"],
    run() {
      const settings = this.storage.getSettings();
      this.settings.applyContainerWidth(
        settings.containerWidth || "narrow",
        settings.containerWidthCustom || 70,
      );
    },
  },
  // Floating positions the cards it owns before anything measures them.
  {
    name: "floating",
    needs: ["themes"],
    run() {
      try {
        this.floating.init();
      } catch (e) {
        console.warn("Floating mode init failed:", e);
      }
    },
  },
  {
    name: "componentVisibility",
    needs: ["themes", "floating"],
    run() {
      this.applyComponentVisibility();
    },
  },
  // Grid layout reads the visibility state it has just applied, so it runs
  // after it, never before.
  {
    name: "gridLayout",
    needs: ["themes", "componentVisibility"],
    run() {
      try {
        this.gridLayout = new GridLayoutManager(this.storage, this.modes);
        this.gridLayout.init();
      } catch (e) {
        console.warn("GridLayoutManager init failed:", e);
      }
    },
  },
  {
    name: "sidebarMode",
    needs: ["gridLayout"],
    run() {
      this.initSidebarMode();
    },
  },
  {
    name: "headings",
    needs: ["themes"],
    run() {
      this.applyHeadingSettings();
    },
  },
  {
    name: "pinnedAppsSettings",
    needs: ["themes", "pinnedApps"],
    run() {
      this.applyPinnedAppsSettings();
    },
  },
  {
    name: "readabilityBlur",
    needs: ["themes"],
    run() {
      this.initReadabilityBlurOverrides();
    },
  },
  {
    name: "quranFocusMode",
    needs: ["themes"],
    run() {
      this.initQuranFocusMode();
    },
  },
  {
    name: "momentMode",
    needs: ["themes"],
    run() {
      this.initMomentMode();
    },
  },
  {
    name: "refreshBackgroundButton",
    needs: ["themes", "backgrounds"],
    run() {
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
    },
  },
  {
    name: "fabMenu",
    needs: ["themes"],
    run() {
      this.setupFabMenu();
    },
  },
  {
    name: "locationUpdates",
    needs: [],
    run() {
      this.setupLocationUpdates();
    },
  },
  // Prayer card stays in sync when the popup saves prayer/location settings.
  {
    name: "externalPrayerSync",
    needs: [],
    run() {
      this.setupExternalPrayerSettingsSync();
    },
  },
];

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

    for (const step of BOOT_STEPS) step.run.call(this);

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

    // Boot is done when every background task has settled: awaiting here is
    // what makes init()'s promise mean "the dashboard is up", not just "the
    // synchronous part ran".
    await Promise.allSettled(backgroundTasks);
    console.log("✅ Muslim Dashboard fully loaded (all data fetched)!");

    return Object.fromEntries(BOOT_SURFACES.map((name) => [name, this[name]]));
  }
});

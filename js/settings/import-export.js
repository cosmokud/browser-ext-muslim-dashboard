/**
 * SettingsManager: full backup export and import.
 * Part of the class declared in js/settings/index.js; load this after it.
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
})(SettingsManager.prototype, class {

  exportAllSettings() {
    this.exportFullExport();
  }

  exportCustomSearches() {
    const searches = this.storage.getCustomSearches
      ? this.storage.getCustomSearches()
      : this.storage.get("customSearches", []);

    const lastId = this.storage.getLastCustomSearchId
      ? this.storage.getLastCustomSearchId()
      : this.storage.get("customSearchLastId", null);

    const exportData = {
      exportType: "customSearches",
      version: 1,
      exportDate: new Date().toISOString(),
      searches: Array.isArray(searches) ? searches : [],
      lastSelectedId: lastId ?? null,
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `muslim-dashboard-custom-searches-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast("Custom searches exported!", "success");
  }

  importCustomSearches(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      const searches = Array.isArray(data)
        ? data
        : Array.isArray(data?.searches)
          ? data.searches
          : null;

      if (!searches) {
        throw new Error(
          "Invalid format: expected an array or { searches: [] }",
        );
      }

      const valid = searches
        .filter(
          (s) =>
            s &&
            typeof s.name === "string" &&
            s.name.trim() !== "" &&
            typeof s.url === "string" &&
            s.url.trim() !== "",
        )
        .map((s) => ({
          id: s.id ?? Date.now() + Math.random(),
          name: String(s.name).trim().slice(0, 40),
          url: String(s.url).trim(),
          favicon: typeof s.favicon === "string" ? s.favicon : null,
        }));

      if (this.storage.saveCustomSearches) {
        this.storage.saveCustomSearches(valid);
      } else {
        this.storage.set("customSearches", valid);
      }

      const incomingLast = data?.lastSelectedId ?? null;
      if (this.storage.saveLastCustomSearchId) {
        this.storage.saveLastCustomSearchId(incomingLast);
      } else {
        this.storage.set("customSearchLastId", incomingLast);
      }

      this.showToast("Custom searches imported! Reloading...", "success");
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      this.showToast("Import failed: " + e.message, "error");
    }
  }

  exportFullExport() {
    // Complete export of ALL user data and settings
    const settings = this.storage.getSettings();
    const todos = this.storage.getTodos();
    const userQuotes = this.storage.getUserQuotes();
    const pinnedApps = this.storage.getPinnedApps();
    const lastLocation = this.storage.getLastLocation();

    const customSearches = this.storage.getCustomSearches
      ? this.storage.getCustomSearches()
      : this.storage.get("customSearches", []);

    const customSearchLastId = this.storage.getLastCustomSearchId
      ? this.storage.getLastCustomSearchId()
      : this.storage.get("customSearchLastId", null);

    const notes = this.storage.get("notes", []);
    const notesActiveId = this.storage.get("notes_active", null);
    const notesPage = this.storage.get("notes_page", 1);

    const pocketQuranBookmarkCategories = this.storage.get(
      "pocketQuran_bookmarkCategories",
      [],
    );
    const pocketQuranBookmarks = this.storage.get("pocketQuran_bookmarks", []);

    const stickyNotes = this.storage.get("stickyNotes", []);
    const stickyNotesVisible = this.storage.get("stickyNotesVisible", null);

    // Custom backgrounds
    const customBackgrounds = Array.isArray(settings.customBackgrounds)
      ? settings.customBackgrounds
      : [];

    // Flashcard sets - export ALL sets (including defaults with user progress)
    const allFlashcardSets = this.flashcards?.getSets
      ? this.flashcards.getSets()
      : this.storage.get("flashcardSets", []);

    const flashcardProtectedIds =
      typeof FlashcardManager !== "undefined" &&
      Array.isArray(FlashcardManager.PROTECTED_SET_IDS)
        ? FlashcardManager.PROTECTED_SET_IDS
        : [
            "default_top300wordforms",
            "default_99names_ar",
            "default_99names_en",
          ];

    // Separate custom sets and protected set references
    const customFlashcardSets = (
      Array.isArray(allFlashcardSets) ? allFlashcardSets : []
    )
      .filter((s) => s && s.id && !flashcardProtectedIds.includes(s.id))
      .map((s) => ({
        id: String(s.id),
        name: String(s.name || "Imported").slice(0, 40),
        createdAt: s.createdAt || null,
        updatedAt: s.updatedAt || null,
        cards: Array.isArray(s.cards)
          ? s.cards
              .filter((c) => c && (c.question || c.answer))
              .map((c) => ({
                question: String(c.question || ""),
                answer: String(c.answer || ""),
              }))
          : [],
      }));

    // Flashcard card index positions (remembers which card user was on)
    const flashcardCardIndexBySet = this.storage.get(
      "flashcardCardIndexBySet",
      {},
    );

    // Adhkar sets - export custom sets
    const allAdhkarSets = this.adhkar?.getSets
      ? this.adhkar.getSets()
      : this.storage.get("adhkarSets", []);

    const adhkarProtectedIds =
      typeof AdhkarManager !== "undefined" &&
      Array.isArray(AdhkarManager.PROTECTED_SET_IDS)
        ? AdhkarManager.PROTECTED_SET_IDS
        : [
            "default_adhkar_morning",
            "default_adhkar_evening",
            "default_adhkar_general",
          ];

    const customAdhkarSets = (Array.isArray(allAdhkarSets) ? allAdhkarSets : [])
      .filter((s) => s && s.id && !adhkarProtectedIds.includes(s.id))
      .map((s) => ({
        id: String(s.id),
        name: String(s.name || "Imported").slice(0, 40),
        createdAt: s.createdAt || null,
        updatedAt: s.updatedAt || null,
        cards: Array.isArray(s.cards)
          ? s.cards
              .filter(
                (c) =>
                  c &&
                  (c.arabic ||
                    c.romanization ||
                    c.english ||
                    c.title ||
                    c.reference),
              )
              .map((c) => ({
                title: String(c.title || ""),
                arabic: String(c.arabic || ""),
                romanization: String(c.romanization || ""),
                english: String(c.english || ""),
                reference: String(c.reference || ""),
                repeat:
                  Number.isFinite(parseInt(c.repeat, 10)) &&
                  parseInt(c.repeat, 10) > 0
                    ? parseInt(c.repeat, 10)
                    : 1,
              }))
          : [],
      }));

    // Adhkar card index positions
    const adhkarCardIndexBySet = this.storage.get("adhkarCardIndexBySet", {});

    // Hadith sets - export custom sets
    const allHadithSets = this.hadith?.getSets
      ? this.hadith.getSets()
      : this.storage.get("hadithSets", []);

    const hadithProtectedIds =
      typeof HadithManager !== "undefined" &&
      Array.isArray(HadithManager.PROTECTED_SET_IDS)
        ? HadithManager.PROTECTED_SET_IDS
        : ["default_hadith_nawawi40", "default_hadith_random200"];

    const customHadithSets = (Array.isArray(allHadithSets) ? allHadithSets : [])
      .filter((s) => s && s.id && !hadithProtectedIds.includes(s.id))
      .map((s) => ({
        id: String(s.id),
        name: String(s.name || "Imported").slice(0, 40),
        createdAt: s.createdAt || null,
        updatedAt: s.updatedAt || null,
        cards: Array.isArray(s.cards)
          ? s.cards
              .filter((c) => c && (c.text || c.title || c.narrator))
              .map((c) => ({
                title: String(c.title || ""),
                text: String(c.text || ""),
                narrator: String(c.narrator || ""),
                source: String(c.source || ""),
                grade: String(c.grade || ""),
                arabicText: String(c.arabicText || ""),
                reference: String(c.reference || ""),
                book: String(c.book || ""),
                chapter: String(c.chapter || ""),
                number: c.number ?? null,
              }))
          : [],
      }));

    // Hadith card index positions
    const hadithCardIndexBySet = this.storage.get("hadithCardIndexBySet", {});

    const exportData = {
      exportType: "full",
      version: 3,
      exportDate: new Date().toISOString(),
      settings,
      todos,
      userQuotes: Array.isArray(userQuotes) ? userQuotes : [],
      pinnedApps,
      lastLocation,

      // Search Bar
      customSearches: Array.isArray(customSearches) ? customSearches : [],
      customSearchLastId: customSearchLastId ?? null,

      // Notes
      notes: Array.isArray(notes) ? notes : [],
      notesActiveId: notesActiveId ?? null,
      notesPage: Number.isFinite(Number(notesPage)) ? Number(notesPage) : 1,

      // Pocket Quran bookmarks
      pocketQuranBookmarks: {
        categories: Array.isArray(pocketQuranBookmarkCategories)
          ? pocketQuranBookmarkCategories
          : [],
        bookmarks: Array.isArray(pocketQuranBookmarks)
          ? pocketQuranBookmarks
          : [],
      },

      // Flashcards - custom sets only (defaults are auto-loaded)
      flashcards: {
        activeSetId:
          this.flashcards?.getActiveSetId?.() ||
          settings.flashcards?.activeSetId ||
          null,
        sets: customFlashcardSets,
        cardIndexBySet: flashcardCardIndexBySet,
      },

      // Adhkar - custom sets only (defaults are auto-loaded)
      adhkar: {
        activeSetId:
          this.adhkar?.getActiveSetId?.() ||
          settings.adhkar?.activeSetId ||
          null,
        sets: customAdhkarSets,
        cardIndexBySet: adhkarCardIndexBySet,
      },

      // Hadith - custom sets only (defaults are auto-loaded)
      hadith: {
        activeSetId:
          this.hadith?.getActiveSetId?.() ||
          settings.hadith?.activeSetId ||
          null,
        sets: customHadithSets,
        cardIndexBySet: hadithCardIndexBySet,
      },

      // Custom backgrounds (also in settings.customBackgrounds but kept for clarity)
      customBackgrounds,

      // Sticky Notes (owned by StorageManager)
      stickyNotes: {
        notes: Array.isArray(stickyNotes) ? stickyNotes : [],
        visible:
          stickyNotesVisible === null ? null : stickyNotesVisible !== false,
      },
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `muslim-dashboard-full-export-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast("Full export created!", "success");
  }

  _importSharedBackupData(data, { includeUserQuotes = false } = {}) {
    if (data.settings) {
      this.storage.saveSettings(data.settings);
    }

    if (data.todos) {
      this.storage.saveTodos(data.todos);
    }

    if (includeUserQuotes && data.userQuotes) {
      this.storage.saveUserQuotes(data.userQuotes);
    }

    if (data.pinnedApps) {
      this.storage.savePinnedApps(data.pinnedApps);
    }

    if (data.lastLocation) {
      this.storage.saveLastLocation(data.lastLocation);
    }

    if (Array.isArray(data.customSearches)) {
      if (this.storage.saveCustomSearches) {
        this.storage.saveCustomSearches(data.customSearches);
      } else {
        this.storage.set("customSearches", data.customSearches);
      }
    }

    if ("customSearchLastId" in (data || {})) {
      if (this.storage.saveLastCustomSearchId) {
        this.storage.saveLastCustomSearchId(data.customSearchLastId ?? null);
      } else {
        this.storage.set("customSearchLastId", data.customSearchLastId ?? null);
      }
    }

    if (Array.isArray(data.notes)) {
      this.storage.set("notes", data.notes);
    }
    if ("notesActiveId" in (data || {})) {
      this.storage.set("notes_active", data.notesActiveId ?? null);
    }
    if ("notesPage" in (data || {})) {
      const n = parseInt(data.notesPage, 10);
      this.storage.set("notes_page", Number.isFinite(n) && n > 0 ? n : 1);
    }

    if (
      data.pocketQuranBookmarks &&
      typeof data.pocketQuranBookmarks === "object"
    ) {
      const cats = data.pocketQuranBookmarks.categories;
      const bms = data.pocketQuranBookmarks.bookmarks;
      if (Array.isArray(cats))
        this.storage.set("pocketQuran_bookmarkCategories", cats);
      if (Array.isArray(bms)) this.storage.set("pocketQuran_bookmarks", bms);
    }
  }

  importFullExport(data) {
    const maxSets =
      typeof FlashcardManager !== "undefined" &&
      typeof FlashcardManager.MAX_SETS === "number"
        ? FlashcardManager.MAX_SETS
        : 10;

    this._importSharedBackupData(data);

    // Sticky notes (replace)
    if (data.stickyNotes && typeof data.stickyNotes === "object") {
      this.storage.set(
        "stickyNotes",
        Array.isArray(data.stickyNotes.notes) ? data.stickyNotes.notes : [],
      );
      if (typeof data.stickyNotes.visible === "boolean") {
        this.storage.set("stickyNotesVisible", data.stickyNotes.visible);
      }
    }

    // Continue with a fresh settings object so we can safely patch fields below.
    const settings = this.storage.getSettings();

    // Backgrounds (full export supports overriding these explicitly)
    if (Array.isArray(data.customBackgrounds)) {
      const filtered = data.customBackgrounds
        .map((x) => this.normalizeBackgroundImageUrl(x))
        .filter((x) => this.isValidCustomBackgroundReference(x))
        .slice(0, SettingsManager.CUSTOM_BACKGROUND_LIMIT);
      settings.customBackgrounds = filtered;
    }

    // Quotes (replace)
    if (Array.isArray(data.userQuotes)) {
      const validQuotes = data.userQuotes
        .filter((q) => q && typeof q.text === "string" && q.text.trim() !== "")
        .map((q) => ({
          id: q.id || Date.now() + Math.random(),
          text: String(q.text),
          source: String(q.source || ""),
          isArabic: !!q.isArabic,
        }));
      this.storage.saveUserQuotes(validQuotes);
    }

    // Flashcards (replace custom sets, keep default)
    const existingSets = this.storage.get("flashcardSets", []);

    const protectedIds =
      typeof FlashcardManager !== "undefined" &&
      Array.isArray(FlashcardManager.PROTECTED_SET_IDS)
        ? FlashcardManager.PROTECTED_SET_IDS
        : ["default"];

    const defaultDefs = Array.isArray(FlashcardManager.DEFAULT_SETS)
      ? FlashcardManager.DEFAULT_SETS
      : [{ id: "default", name: "Default" }];

    const protectedSetsOrdered = defaultDefs.map((def) => {
      const existing = Array.isArray(existingSets)
        ? existingSets.find((s) => s && s.id === def.id)
        : null;
      if (existing) return existing;
      return {
        id: def.id,
        name: def.name || "Default",
        createdAt: new Date().toISOString(),
        cards: [],
      };
    });

    const incomingSetsRaw =
      data.flashcards?.sets || data.flashcardSets || data.flashcards || [];
    const incomingSets = Array.isArray(incomingSetsRaw) ? incomingSetsRaw : [];

    const cleanedCustomSets = incomingSets
      .filter((s) => s && s.id && !protectedIds.includes(s.id))
      .map((s, i) => ({
        id: String(s.id || `set_${Date.now()}_${i}`),
        name: String(s.name || "Imported").slice(0, 40),
        createdAt: s.createdAt || new Date().toISOString(),
        updatedAt: s.updatedAt || null,
        cards: Array.isArray(s.cards)
          ? s.cards
              .filter((c) => c && (c.question || c.answer))
              .map((c) => ({
                question: String(c.question || ""),
                answer: String(c.answer || ""),
              }))
          : [],
      }))
      .slice(0, Math.max(0, maxSets - protectedSetsOrdered.length));

    // Keep only custom sets in storage; protected defaults are loaded from bundled files at runtime.
    this.storage.set("flashcardSets", cleanedCustomSets);

    // Flashcards active set (optional)
    const incomingActiveSetId = data.flashcards?.activeSetId;
    if (
      incomingActiveSetId &&
      typeof incomingActiveSetId === "string" &&
      (protectedIds.includes(incomingActiveSetId) ||
        cleanedCustomSets.some((s) => s.id === incomingActiveSetId))
    ) {
      settings.flashcards = {
        ...(settings.flashcards || {}),
        activeSetId: incomingActiveSetId,
      };
    } else {
      settings.flashcards = {
        ...(settings.flashcards || {}),
        activeSetId: protectedSetsOrdered[0]?.id || "default",
      };
    }

    // Adhkar (replace custom sets; keep existing protected defaults if present;
    // missing defaults will be restored by AdhkarManager.ensureDefaultSets on reload)
    const maxAdhkarSets =
      typeof AdhkarManager !== "undefined" &&
      typeof AdhkarManager.MAX_SETS === "number"
        ? AdhkarManager.MAX_SETS
        : 100;

    const existingAdhkarSets = this.storage.get("adhkarSets", []);

    const adhkarProtectedIds =
      typeof AdhkarManager !== "undefined" &&
      Array.isArray(AdhkarManager.PROTECTED_SET_IDS)
        ? AdhkarManager.PROTECTED_SET_IDS
        : [
            "default_adhkar_morning",
            "default_adhkar_evening",
            "default_adhkar_general",
          ];

    const adhkarDefaultDefs =
      typeof AdhkarManager !== "undefined" &&
      Array.isArray(AdhkarManager.DEFAULT_SETS)
        ? AdhkarManager.DEFAULT_SETS
        : [];

    const reservedAdhkarDefaultCount =
      adhkarDefaultDefs.length || adhkarProtectedIds.length;

    const incomingAdhkarSetsRaw =
      data.adhkar?.sets ||
      data.adhkarSets ||
      (Array.isArray(data.adhkar) ? data.adhkar : []);
    const incomingAdhkarSets = Array.isArray(incomingAdhkarSetsRaw)
      ? incomingAdhkarSetsRaw
      : [];

    const cleanedCustomAdhkarSets = incomingAdhkarSets
      .filter((s) => s && s.id && !adhkarProtectedIds.includes(s.id))
      .map((s, i) => ({
        id: String(s.id || `set_${Date.now()}_${i}`),
        name: String(s.name || "Imported").slice(0, 40),
        createdAt: s.createdAt || new Date().toISOString(),
        updatedAt: s.updatedAt || null,
        cards: Array.isArray(s.cards)
          ? s.cards
              .filter(
                (c) =>
                  c &&
                  (c.arabic ||
                    c.romanization ||
                    c.english ||
                    c.title ||
                    c.reference),
              )
              .map((c) => ({
                title: String(c.title || ""),
                arabic: String(c.arabic || ""),
                romanization: String(c.romanization || ""),
                english: String(c.english || ""),
                reference: String(c.reference || ""),
                repeat: (() => {
                  const n = parseInt(c.repeat, 10);
                  return Number.isFinite(n) && n > 0 ? Math.min(n, 9999) : 1;
                })(),
              }))
          : [],
      }))
      .slice(0, Math.max(0, maxAdhkarSets - reservedAdhkarDefaultCount));

    this.storage.set("adhkarSets", cleanedCustomAdhkarSets);

    const incomingAdhkarActiveSetId = data.adhkar?.activeSetId;
    const validActiveAdhkarId =
      typeof incomingAdhkarActiveSetId === "string" &&
      (adhkarProtectedIds.includes(incomingAdhkarActiveSetId) ||
        cleanedCustomAdhkarSets.some(
          (s) => s && s.id === incomingAdhkarActiveSetId,
        ))
        ? incomingAdhkarActiveSetId
        : adhkarDefaultDefs[0]?.id || "default_adhkar_morning";

    settings.adhkar = {
      ...(settings.adhkar || {}),
      activeSetId: validActiveAdhkarId,
    };

    // Hadith (import custom sets; defaults will be restored by HadithManager.ensureDefaultSets on reload)
    const maxHadithSets =
      typeof HadithManager !== "undefined" &&
      typeof HadithManager.MAX_SETS === "number"
        ? HadithManager.MAX_SETS
        : 100;

    const existingHadithSets = this.storage.get("hadithSets", []);

    const hadithProtectedIds =
      typeof HadithManager !== "undefined" &&
      Array.isArray(HadithManager.PROTECTED_SET_IDS)
        ? HadithManager.PROTECTED_SET_IDS
        : ["default_hadith_nawawi40", "default_hadith_random200"];

    const hadithDefaultDefs =
      typeof HadithManager !== "undefined" &&
      Array.isArray(HadithManager.DEFAULT_SETS)
        ? HadithManager.DEFAULT_SETS
        : [];

    const reservedHadithDefaultCount =
      hadithDefaultDefs.length || hadithProtectedIds.length;

    const incomingHadithSetsRaw =
      data.hadith?.sets ||
      data.hadithSets ||
      (Array.isArray(data.hadith) ? data.hadith : []);
    const incomingHadithSets = Array.isArray(incomingHadithSetsRaw)
      ? incomingHadithSetsRaw
      : [];

    const cleanedCustomHadithSets = incomingHadithSets
      .filter((s) => s && s.id && !hadithProtectedIds.includes(s.id))
      .map((s, i) => ({
        id: String(s.id || `set_${Date.now()}_${i}`),
        name: String(s.name || "Imported").slice(0, 40),
        createdAt: s.createdAt || new Date().toISOString(),
        updatedAt: s.updatedAt || null,
        cards: Array.isArray(s.cards)
          ? s.cards
              .filter((c) => c && (c.text || c.title || c.narrator))
              .map((c) => ({
                title: String(c.title || ""),
                text: String(c.text || ""),
                narrator: String(c.narrator || ""),
                source: String(c.source || ""),
                grade: String(c.grade || ""),
                arabicText: String(c.arabicText || ""),
                reference: String(c.reference || ""),
                book: String(c.book || ""),
                chapter: String(c.chapter || ""),
                number: c.number ?? null,
              }))
          : [],
      }))
      .slice(0, Math.max(0, maxHadithSets - reservedHadithDefaultCount));

    this.storage.set("hadithSets", cleanedCustomHadithSets);

    const incomingHadithActiveSetId = data.hadith?.activeSetId;
    const validActiveHadithId =
      typeof incomingHadithActiveSetId === "string" &&
      (hadithProtectedIds.includes(incomingHadithActiveSetId) ||
        cleanedCustomHadithSets.some(
          (s) => s && s.id === incomingHadithActiveSetId,
        ))
        ? incomingHadithActiveSetId
        : hadithDefaultDefs[0]?.id || "default_hadith_nawawi40";

    settings.hadith = {
      ...(settings.hadith || {}),
      activeSetId: validActiveHadithId,
    };

    // Import card index positions (which card user was on in each set)
    if (
      data.flashcards?.cardIndexBySet &&
      typeof data.flashcards.cardIndexBySet === "object"
    ) {
      this.storage.set(
        "flashcardCardIndexBySet",
        data.flashcards.cardIndexBySet,
      );
    }

    if (
      data.adhkar?.cardIndexBySet &&
      typeof data.adhkar.cardIndexBySet === "object"
    ) {
      this.storage.set("adhkarCardIndexBySet", data.adhkar.cardIndexBySet);
    }

    if (
      data.hadith?.cardIndexBySet &&
      typeof data.hadith.cardIndexBySet === "object"
    ) {
      this.storage.set("hadithCardIndexBySet", data.hadith.cardIndexBySet);
    }

    this.storage.saveSettings(settings);
    void this.syncCustomBackgroundMediaFromSettings(settings);
  }

  importAllSettings(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      // Full export import
      if (data && data.exportType === "full") {
        this.importFullExport(data);
        this.showToast("Full export imported! Reloading...", "success");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
        return;
      }

      if (!data.version || !data.settings) {
        throw new Error("Invalid backup file format");
      }

      this._importSharedBackupData(data, { includeUserQuotes: true });

      this.showToast("Settings imported! Reloading...", "success");

      // Reload page to apply all settings
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      this.showToast("Import failed: " + e.message, "error");
    }
  }
});

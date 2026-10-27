/**
 * FlashcardManager: default set loading.
 * Part of the class declared in js/flashcards/index.js; load this after it.
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
})(FlashcardManager.prototype, class {

  async ensureDefaultSet() {
    const defs = Array.isArray(FlashcardManager.DEFAULT_SETS)
      ? FlashcardManager.DEFAULT_SETS
      : [
          {
            id: "default_99names_ar",
            name: "99 Names of Allah (Arabic)",
            file: "data/flashcard_99names_ar.csv",
            parser: "pipe",
          },
        ];

    const loadedDefaults = [];
    for (const def of defs) {
      loadedDefaults.push(await this.loadDefaultSet(def));
    }
    this.defaultSets = loadedDefaults;

    // Migration cleanup: remove legacy stored copies of protected default sets.
    const stored = this.storage.get("flashcardSets", []);
    if (Array.isArray(stored)) {
      const cleaned = stored.filter((set) => !this.isProtectedSetId(set?.id));
      if (cleaned.length !== stored.length) {
        this.storage.set("flashcardSets", cleaned);
      }
    }

    const sets = this.getSets();
    if (!sets.length) return;

    // Ensure active set is valid; prefer 99 Names (Arabic) when available.
    const activeId = this.getActiveSetId();
    if (!activeId || !sets.some((s) => s.id === activeId)) {
      const preferredId = "default_99names_ar";
      const preferredExists = sets.some((s) => s.id === preferredId);
      this.setActiveSetId(preferredExists ? preferredId : sets[0]?.id || null);
    }
  }

  async loadDefaultSet(def) {
    const now = new Date().toISOString();
    let cards = [];

    try {
      const text = await this.fetchTextResource(def.file, {
        label: `Flashcards default set ${def?.id || "unknown"}`,
      });
      cards =
        def.parser === "pipe"
          ? this.parsePipeTwoColumns(text)
          : this.parseCsvTwoColumns(text);
    } catch (e) {
      console.error(`Flashcards: failed to load default set ${def?.id}`, e);
    }

    return {
      id: def.id,
      name: def.name,
      createdAt: now,
      cards,
    };
  }

  async refreshDefaultSets() {
    await this.ensureDefaultSet();
    this.restoreCurrentCardIndexForActiveSet();
    this.renderDashboard();
    this.renderSettings();
    this.ensureAutoAdvanceState({ reset: true });
  }
});

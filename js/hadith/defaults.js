/**
 * HadithManager: default sets and imported card normalization.
 * Part of the class declared in js/hadith/index.js; load this after it.
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
})(HadithManager.prototype, class {

  async ensureDefaultSets() {
    const defs = Array.isArray(HadithManager.DEFAULT_SETS)
      ? HadithManager.DEFAULT_SETS
      : [];

    const loadedDefaults = await Promise.all(
      defs.map((def) => this.loadDefaultSet(def)),
    );
    this.defaultSets = loadedDefaults;

    // Migration cleanup: remove legacy stored copies of protected default sets.
    const stored = this.storage.get("hadithSets", []);
    if (Array.isArray(stored)) {
      const cleaned = stored.filter((set) => !this.isProtectedSetId(set?.id));
      if (cleaned.length !== stored.length) {
        this.storage.set("hadithSets", cleaned);
      }
    }

    const sets = this.getSets();
    if (!sets.length) return;

    // Ensure active set id exists
    const activeId = this.getActiveSetId();
    if (!activeId || !sets.some((s) => s.id === activeId)) {
      const preferredId = "default_hadith_nawawi40";
      const preferredExists = sets.some((s) => s.id === preferredId);
      this.setActiveSetId(preferredExists ? preferredId : sets[0]?.id || null);
    }
  }

  async loadDefaultSet(def) {
    const now = new Date().toISOString();

    try {
      const json = await this.fetchJsonResource(def.file, {
        cache: "no-store",
        label: `Hadith default set ${def.id}`,
      });
      const cards = this.normalizeImportedCards(json);
      return {
        id: def.id,
        name: def.name,
        createdAt: now,
        cards,
      };
    } catch (e) {
      console.error(`Hadith: failed to initialize default set ${def.id}`, e);
      return {
        id: def.id,
        name: def.name,
        createdAt: now,
        cards: [],
      };
    }
  }

  async refreshDefaultData() {
    await this.ensureDefaultSets();
    this.restoreCurrentCardIndexForActiveSet();
    this.renderDashboard();
    this.renderSettings();
    this.ensureAutoAdvanceState({ reset: true });
  }

  normalizeImportedCards(json) {
    if (json && typeof json === "object" && !Array.isArray(json)) {
      const arr =
        json.cards || json.items || json.hadith || json.entries || json.data;
      return this.normalizeImportedCards(Array.isArray(arr) ? arr : []);
    }

    const items = Array.isArray(json) ? json : [];

    const normalized = items
      .filter((raw) => raw && typeof raw === "object" && !Array.isArray(raw))
      .map((raw) => {
        const id = raw.id ?? raw.hadith_id ?? null;
        const parsedIdNum = parseInt(id, 10);
        const normalizedId = Number.isFinite(parsedIdNum)
          ? parsedIdNum
          : String(id || "").trim();

        const narrator = String(raw.narrator || raw.rawi || "").trim();
        const reference = String(raw.reference || raw.source || "").trim();

        const titleFields = {};
        const textFields = {};

        Object.entries(raw).forEach(([rawKey, rawValue]) => {
          if (rawValue == null) return;
          const key = String(rawKey || "");
          const value = String(rawValue).trim();
          if (!value) return;

          let match = key.match(/^title_(.+)$/i);
          if (match) {
            const code = this.normalizeLanguageCode(match[1]);
            if (!code) return;
            titleFields[`title_${code}`] = value;
            return;
          }

          match = key.match(/^text_(.+)$/i);
          if (match) {
            const code = this.normalizeLanguageCode(match[1]);
            if (!code) return;
            textFields[`text_${code}`] = value;
            return;
          }

          match = key.match(/^translation_(.+)$/i);
          if (match) {
            const code = this.normalizeLanguageCode(match[1]);
            if (!code) return;
            if (!textFields[`text_${code}`]) {
              textFields[`text_${code}`] = value;
            }
          }
        });

        const legacyTitle = String(raw.title || raw.name || "").trim();
        if (legacyTitle && !titleFields.title_en) {
          titleFields.title_en = legacyTitle;
        }

        const legacyText = String(raw.text || raw.translation || "").trim();
        if (legacyText && !textFields.text_en) {
          textFields.text_en = legacyText;
        }

        const hasLocalizedTitle = Object.keys(titleFields).length > 0;
        const hasLocalizedText = Object.keys(textFields).length > 0;
        if (
          !narrator &&
          !reference &&
          !hasLocalizedTitle &&
          !hasLocalizedText
        ) {
          return null;
        }

        const normalizedItem = {
          narrator,
          reference,
          ...titleFields,
          ...textFields,
        };
        if (normalizedId !== "") normalizedItem.id = normalizedId;
        return normalizedItem;
      })
      .filter(Boolean);

    // Keep only unique card payloads (ignoring `id`) to avoid duplicate key/value entries.
    const deduped = [];
    const seen = new Set();
    for (const card of normalized) {
      const cmp = { ...card };
      delete cmp.id;
      const ordered = {};
      Object.keys(cmp)
        .sort()
        .forEach((k) => {
          ordered[k] = cmp[k];
        });
      const key = JSON.stringify(ordered);
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(card);
    }

    return deduped;
  }
});

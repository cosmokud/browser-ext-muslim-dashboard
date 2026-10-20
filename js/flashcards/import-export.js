/**
 * FlashcardManager: card file import and export.
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

  async importCardsFile(file) {
    const name = this.inferSetNameFromFile(file.name);

    const sets = this.getSets();
    let effectiveName = name;
    let existing = sets.find(
      (s) => s.name.toLowerCase() === name.toLowerCase(),
    );

    // Never allow replacing a protected default set; instead create a new set with a unique name.
    if (existing && this.isProtectedSetId(existing.id)) {
      existing = null;
      effectiveName = this.makeUniqueSetName(effectiveName, sets);
    }

    // Enforce set cap
    if (!existing && sets.length >= FlashcardManager.MAX_SETS) {
      this.showToast(
        `You already have ${FlashcardManager.MAX_SETS} sets. Delete one first.`,
        "error",
      );
      return;
    }

    let fileText;
    try {
      fileText = await file.text();
    } catch (e) {
      this.showToast("Could not read the selected file.", "error");
      return;
    }

    let cards;
    try {
      cards = this.parseImportedCardsFile(file, fileText);
    } catch (e) {
      console.error(e);
      this.showToast("Invalid flashcards file format.", "error");
      return;
    }

    if (!cards.length) {
      this.showToast("No valid flashcards found in the file.", "error");
      return;
    }

    const now = new Date().toISOString();

    if (existing) {
      const ok = confirm(
        `A set named "${existing.name}" already exists. Replace it?`,
      );
      if (!ok) return;

      if (this.isProtectedSetId(existing.id)) {
        this.showToast("This default set cannot be replaced.", "error");
        return;
      }

      existing.cards = cards;
      existing.updatedAt = now;
      this.saveSets([...sets]);
      this.setActiveSetId(existing.id);
      this.showToast(`Replaced set: ${existing.name}`, "success");
    } else {
      const newSet = {
        id: `set_${Date.now()}`,
        name: effectiveName,
        createdAt: now,
        cards,
      };
      this.saveSets([...sets, newSet]);
      this.setActiveSetId(newSet.id);
      this.currentCardIndex = 0;
      this.persistCurrentCardIndex();
      this.showToast(`Imported set: ${effectiveName}`, "success");
    }

    this.settingsPage = 1;
    this.renderSettings();
    this.renderDashboard();
  }

  async importCsvFile(file) {
    return this.importCardsFile(file);
  }

  parseImportedCardsFile(file, text) {
    const filename = String(file?.name || "").toLowerCase();
    const content = String(text || "");
    const looksLikeJson =
      filename.endsWith(".json") || /^\s*[\[{]/.test(content);

    if (looksLikeJson) {
      throw new Error("Flashcards import supports CSV files only.");
    }

    return this.parseCsvTwoColumns(content);
  }

  normalizeImportedCards(payload) {
    const items = Array.isArray(payload)
      ? payload
      : payload && typeof payload === "object"
        ? Array.isArray(payload.cards)
          ? payload.cards
          : Array.isArray(payload.items)
            ? payload.items
            : Array.isArray(payload.flashcards)
              ? payload.flashcards
              : Array.isArray(payload.data)
                ? payload.data
                : []
        : [];

    const cards = [];
    const seen = new Set();

    for (const raw of items) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const card = this.normalizeImportedCard(raw);
      if (!card) continue;

      const dedupeKey = `${card.question}\n${card.answer}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      cards.push(card);
    }

    return cards;
  }

  normalizeImportedCard(raw) {
    const toText = (value) => String(value ?? "").trim();

    let question = toText(
      raw.question ?? raw.q ?? raw.front ?? raw.term ?? raw.prompt ?? raw.text,
    );
    let answer = toText(
      raw.answer ??
        raw.a ??
        raw.back ??
        raw.definition ??
        raw.response ??
        raw.translation,
    );

    if (!question) question = this.pickLocalizedField(raw, "question");
    if (!answer) answer = this.pickLocalizedField(raw, "answer");

    // Legacy aliases for localized schemas.
    if (!question) question = this.pickLocalizedField(raw, "text");
    if (!answer) answer = this.pickLocalizedField(raw, "translation");

    if (!question && !answer) return null;
    return { question, answer };
  }

  pickLocalizedField(raw, prefix) {
    const valuesByCode = new Map();
    const preferredOrder = ["en", "id", "ar"];

    Object.entries(raw || {}).forEach(([rawKey, rawValue]) => {
      if (rawValue == null) return;
      const key = String(rawKey || "");
      const match = key.match(new RegExp(`^${prefix}_(.+)$`, "i"));
      if (!match) return;

      const code = String(match[1] || "")
        .trim()
        .toLowerCase();
      const value = String(rawValue).trim();
      if (!code || !value || valuesByCode.has(code)) return;

      valuesByCode.set(code, value);
    });

    for (const code of preferredOrder) {
      if (valuesByCode.has(code)) return valuesByCode.get(code);
    }

    const first = [...valuesByCode.keys()].sort()[0];
    return first ? valuesByCode.get(first) : "";
  }

  exportActiveSetJson() {
    // Backward-compat alias: flashcards export is CSV-only.
    this.exportActiveSetCsv();
  }

  exportActiveSetCsv() {
    const active = this.getActiveSet();
    if (!active) return;

    const cards = (active.cards || []).map((raw) => ({
      question: String(raw?.question ?? ""),
      answer: String(raw?.answer ?? ""),
    }));
    const csv = this.cardsToCsv(cards);
    const csvWithBom = `\uFEFF${csv}`;
    const blob = new Blob([csvWithBom], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${this.slugify(active.name || "flashcards")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 500);
  }
});

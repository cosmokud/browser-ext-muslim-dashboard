/**
 * HadithManager: set import and export.
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

  inferSetNameFromFile(filename) {
    const base = String(filename || "")
      .replace(/\.[^.]+$/, "")
      .trim();
    const safe = base || "Imported";
    return safe.slice(0, 40);
  }

  async importSetFromFile(file) {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const cards = this.normalizeImportedCards(json);

      if (!cards.length) {
        this.showToast("JSON contains no valid hadith items.", "error");
        return;
      }

      const sets = this.getSets();

      const inferredName = this.inferSetNameFromFile(file.name);
      const effectiveName = this.makeUniqueSetName(inferredName, sets);

      const now = new Date().toISOString();
      const newSet = {
        id: `hadith_${Date.now()}`,
        name: effectiveName,
        createdAt: now,
        cards,
      };

      sets.push(newSet);
      this.saveSets(sets);
      this.setActiveSetId(newSet.id);
      this.currentCardIndex = 0;
      this.persistCurrentCardIndex();

      this.renderDashboard();
      this.renderSettings();

      this.showToast(`Imported set: ${effectiveName}`, "success");
    } catch (e) {
      console.error("Hadith import failed:", e);
      this.showToast("Could not read the JSON file.", "error");
    }
  }

  exportActiveSet() {
    const active = this.getActiveSet();
    if (!active) return;

    const data = JSON.stringify(
      this.normalizeImportedCards(active.cards || []),
      null,
      2,
    );
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${(active.name || "hadith").replace(
      /[^a-z0-9_-]+/gi,
      "_",
    )}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 2000);

    this.showToast("Exported JSON.", "success");
  }
});

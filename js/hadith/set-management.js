/**
 * HadithManager: set and item create/rename/delete.
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

  scheduleSaveItemField(index, field, value) {
    if (this._settingsReadOnly) return;

    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveItemField(index, field, value);
    }, 250);
  }

  saveItemField(index, field, value) {
    const sets = this.getSets();
    const activeId = this.getActiveSetId();
    const set = sets.find((s) => s.id === activeId);
    if (!set) return;
    if (this.isProtectedSetId(set.id)) return;

    const items = Array.isArray(set.cards) ? set.cards : [];
    if (index < 0 || index >= items.length) return;

    const item = items[index] || {};
    const normalizedField = String(field || "").trim();
    const baseAllowed = new Set([
      "narrator",
      "reference",
      "title",
      "text",
      "translation",
    ]);
    const isLocalizedField = /^(title|text)_[a-z0-9-]+$/i.test(normalizedField);
    if (!baseAllowed.has(normalizedField) && !isLocalizedField) return;

    let targetField = normalizedField;
    if (targetField === "title") targetField = "title_en";
    if (targetField === "text" || targetField === "translation") {
      targetField = "text_en";
    }

    item[targetField] = String(value ?? "");

    set.cards = items;
    this.saveSets(sets);

    this.renderDashboard();
  }

  isProtectedSetId(id) {
    return (
      Array.isArray(HadithManager.PROTECTED_SET_IDS) &&
      HadithManager.PROTECTED_SET_IDS.includes(String(id))
    );
  }

  makeUniqueSetName(baseName, sets) {
    const normalized =
      String(baseName || "New Set")
        .trim()
        .slice(0, 40) || "New Set";

    const isTaken = (candidate) =>
      sets.some(
        (s) => String(s.name || "").toLowerCase() === candidate.toLowerCase(),
      );

    const protectedNames = Array.isArray(HadithManager.DEFAULT_SETS)
      ? HadithManager.DEFAULT_SETS.map((d) =>
          String(d.name || "").toLowerCase(),
        )
      : [];

    if (
      !isTaken(normalized) &&
      !protectedNames.includes(normalized.toLowerCase())
    )
      return normalized;

    for (let i = 2; i <= 99; i += 1) {
      const candidate = `${normalized} (${i})`;
      if (
        !isTaken(candidate) &&
        !protectedNames.includes(candidate.toLowerCase())
      ) {
        return candidate.slice(0, 40);
      }
    }

    return `Set ${Date.now()}`;
  }

  createNewSet() {
    const sets = this.getSets();
    if (sets.length >= HadithManager.MAX_SETS) {
      this.showToast(
        `You already have ${HadithManager.MAX_SETS} sets. Delete one first.`,
        "error",
      );
      return;
    }

    const rawName = prompt("New set name:", "New Set");
    if (rawName === null) return;
    const trimmed = String(rawName).trim();
    if (!trimmed) {
      this.showToast("Set name cannot be empty.", "error");
      return;
    }

    const protectedNames = Array.isArray(HadithManager.DEFAULT_SETS)
      ? HadithManager.DEFAULT_SETS.map((d) =>
          String(d.name || "").toLowerCase(),
        )
      : [];

    if (protectedNames.includes(trimmed.toLowerCase())) {
      this.showToast(`The name '${trimmed}' is reserved.`, "error");
      return;
    }

    const name = this.makeUniqueSetName(trimmed, sets);
    const now = new Date().toISOString();

    const newSet = {
      id: `hadith_${Date.now()}`,
      name,
      createdAt: now,
      cards: [],
    };

    sets.push(newSet);
    this.saveSets(sets);
    this.setActiveSetId(newSet.id);
    this.currentCardIndex = 0;
    this.persistCurrentCardIndex();

    this.renderDashboard();
    this.renderSettings();

    this.showToast(`Created set: ${name}`, "success");
  }

  renameActiveSet() {
    const active = this.getActiveSet();
    if (!active) return;
    if (this.isProtectedSetId(active.id)) {
      this.showToast("This default set cannot be renamed.", "error");
      return;
    }

    const rawName = prompt("Rename set:", active.name || "New Set");
    if (rawName === null) return;
    const trimmed = String(rawName).trim();
    if (!trimmed) {
      this.showToast("Set name cannot be empty.", "error");
      return;
    }

    const sets = this.getSets();
    const idx = sets.findIndex((s) => s.id === active.id);
    if (idx === -1) return;

    const name = this.makeUniqueSetName(
      trimmed,
      sets.filter((s) => s.id !== active.id),
    );
    sets[idx].name = name;
    this.saveSets(sets);

    this.renderDashboard();
    this.renderSettings();

    this.showToast(`Renamed set: ${name}`, "success");
  }

  deleteActiveSet() {
    const sets = this.getSets();
    const active = this.getActiveSet();

    if (!active) return;
    if (this.isProtectedSetId(active.id)) {
      this.showToast("This default set cannot be deleted.", "error");
      return;
    }

    if (sets.length <= 1) {
      this.showToast("You must keep at least one set.", "error");
      return;
    }

    const ok = confirm(`Delete set "${active.name}"? This cannot be undone.`);
    if (!ok) return;

    const nextSets = sets.filter((s) => s.id !== active.id);
    this.saveSets(nextSets);
    this.clearSavedCardIndexForSet(active.id);

    const nextActive = nextSets[0];
    this.setActiveSetId(nextActive?.id || null);
    this.restoreCurrentCardIndexForActiveSet();

    this.renderDashboard();
    this.renderSettings();

    this.showToast("Set deleted.", "success");
  }

  addNewItem() {
    const active = this.getActiveSet();
    if (!active) return;
    if (this.isProtectedSetId(active.id)) {
      this.showToast("This default set cannot be edited.", "error");
      return;
    }

    const sets = this.getSets();
    const set = sets.find((s) => s.id === active.id);
    if (!set) return;

    const items = Array.isArray(set.cards) ? set.cards : [];

    const currentLang =
      this.normalizeLanguageCode(this.getSelectedLanguageCode()) || "en";
    const titleField = `title_${currentLang}`;
    const textField = `text_${currentLang}`;
    const newItem = {
      id: items.length + 1,
      title_en: "",
      text_en: "",
      narrator: "",
      reference: "",
    };
    if (currentLang !== "en") {
      newItem[titleField] = "";
      newItem[textField] = "";
    }

    items.push(newItem);

    set.cards = items;
    this.saveSets(sets);

    const total = items.length;
    const pageSize = this.getSettingsPageSize();
    const pages = Math.max(1, Math.ceil(total / pageSize));
    this.settingsPage = pages;

    this.renderSettings();
    this.renderDashboard();

    this.showToast("Item added.", "success");
  }

  deleteItemAtIndex(index) {
    const active = this.getActiveSet();
    if (!active) return;
    if (this.isProtectedSetId(active.id)) {
      this.showToast("This default set cannot be edited.", "error");
      return;
    }

    const sets = this.getSets();
    const set = sets.find((s) => s.id === active.id);
    if (!set) return;

    const items = Array.isArray(set.cards) ? set.cards : [];
    if (index < 0 || index >= items.length) return;

    items.splice(index, 1);
    set.cards = items;
    this.saveSets(sets);

    const pages = Math.max(
      1,
      Math.ceil(items.length / this.getSettingsPageSize()),
    );
    this.settingsPage = Math.min(this.settingsPage, pages);

    this.normalizeCurrentIndex();
    this.persistCurrentCardIndex();

    this.renderSettings();
    this.renderDashboard();

    this.showToast("Item deleted.", "success");
  }
});

/**
 * AdhkarManager: set and item delete/add/edit.
 * Part of the class declared in js/adhkar/index.js; load this after it.
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
})(AdhkarManager.prototype, class {

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

    const ok = confirm(`Delete the set "${active.name}"?`);
    if (!ok) return;

    const nextSets = sets.filter((s) => s.id !== active.id);
    this.saveSets(nextSets);
    this.setActiveSetId(nextSets[0].id);

    this.clearSavedCardIndexForSet(active.id);
    this.restoreCurrentCardIndexForActiveSet();

    this.settingsPage = 1;
    this.showToast("Set deleted.", "success");
    this.renderSettings();
    this.renderDashboard();
  }

  addItemToActiveSet() {
    const sets = this.getSets();
    const activeId = this.getActiveSetId();
    const active = sets.find((s) => s.id === activeId) || sets[0];
    if (!active) return;

    if (this.isProtectedSetId(active.id)) {
      this.showToast("This default set cannot be edited.", "error");
      return;
    }

    active.cards = Array.isArray(active.cards) ? active.cards : [];
    const currentLang =
      this.normalizeLanguageCode(this.getSelectedLanguageCode()) || "en";
    const titleField = `title_${currentLang}`;
    const textField = `text_${currentLang}`;
    const newItem = {
      repeat: 1,
      reference: "",
      arabic: "",
      romanization: "",
      title_en: "",
      text_en: "",
    };
    if (currentLang !== "en") {
      newItem[titleField] = "";
      newItem[textField] = "";
    }
    active.cards.push(newItem);
    active.updatedAt = new Date().toISOString();
    this.saveSets(sets);

    const total = active.cards.length;
    const pageSize = this.getSettingsPageSize();
    const pages = Math.max(1, Math.ceil(total / pageSize));
    this.settingsPage = pages;

    this.renderSettings();
    this.showToast("Item added.", "success");
  }

  updateItemField(globalIndex, field, value) {
    const sets = this.getSets();
    const activeId = this.getActiveSetId();
    const active = sets.find((s) => s.id === activeId) || sets[0];
    if (!active || !active.cards || !active.cards[globalIndex]) return;

    if (this.isProtectedSetId(active.id)) return;

    const normalizedField = String(field || "").trim();
    const baseAllowed = new Set([
      "title",
      "repeat",
      "reference",
      "arabic",
      "romanization",
      "translation",
      "english",
      "text",
    ]);
    const isLocalizedField = /^(title|text)_[a-z0-9-]+$/i.test(normalizedField);
    if (!baseAllowed.has(normalizedField) && !isLocalizedField) return;

    let targetField = normalizedField;
    if (targetField === "title") targetField = "title_en";
    if (
      targetField === "translation" ||
      targetField === "english" ||
      targetField === "text"
    ) {
      targetField = "text_en";
    }

    if (targetField === "repeat") {
      const n = parseInt(value, 10);
      const normalized = Number.isFinite(n) && n > 0 ? Math.min(n, 9999) : 1;
      active.cards[globalIndex][targetField] = normalized;
    } else {
      active.cards[globalIndex][targetField] = String(value ?? "");
    }
    active.updatedAt = new Date().toISOString();

    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveSets(sets);
      this.renderDashboard();
    }, 250);
  }

  deleteItemAtIndex(globalIndex) {
    const sets = this.getSets();
    const activeId = this.getActiveSetId();
    const active = sets.find((s) => s.id === activeId) || sets[0];
    if (!active) return;

    if (this.isProtectedSetId(active.id)) {
      this.showToast("This default set cannot be edited.", "error");
      return;
    }

    active.cards = Array.isArray(active.cards) ? active.cards : [];
    if (globalIndex < 0 || globalIndex >= active.cards.length) return;

    active.cards.splice(globalIndex, 1);
    active.updatedAt = new Date().toISOString();
    this.saveSets(sets);

    const pages = Math.max(
      1,
      Math.ceil((active.cards.length || 0) / this.getSettingsPageSize()),
    );
    this.settingsPage = Math.min(this.settingsPage, pages);

    this.renderSettings();
    this.renderDashboard();
    this.showToast("Item deleted.", "success");
  }
});

/**
 * AdhkarManager: set import and export.
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

  normalizeImportedCards(data) {
    // Accept shapes:
    // - Array of items: [{arabic, romanization, english, ...}]
    // - Object with cards/items field
    if (Array.isArray(data)) {
      const normalizedCards = data
        .filter((x) => x && typeof x === "object" && !Array.isArray(x))
        .map((x) => {
          const rawId = x.id ?? x.adhkar_id ?? null;
          const parsedIdNum = parseInt(rawId, 10);
          const id = Number.isFinite(parsedIdNum)
            ? parsedIdNum
            : String(rawId || "").trim();

          const rawRepeat = x.repeat ?? x.repeats ?? x.count;
          const parsedRepeat = parseInt(rawRepeat, 10);
          const repeat =
            Number.isFinite(parsedRepeat) && parsedRepeat > 0
              ? parsedRepeat
              : 1;

          const reference = String(x.reference || x.source || "").trim();
          const arabic = String(x.arabic || "").trim();
          const romanization = String(x.romanization || x.roman || "").trim();

          const textFields = {};
          const titleFields = {};

          Object.entries(x || {}).forEach(([rawKey, rawValue]) => {
            if (rawValue == null) return;

            const key = String(rawKey || "");
            const value = String(rawValue).trim();
            if (!value) return;

            let match = key.match(/^text_(.+)$/i);
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
              return;
            }

            match = key.match(/^title_(.+)$/i);
            if (match) {
              const code = this.normalizeLanguageCode(match[1]);
              if (!code) return;
              titleFields[`title_${code}`] = value;
            }
          });

          const legacyTitle = String(x.title || x.name || "").trim();
          if (legacyTitle && !titleFields.title_en) {
            titleFields.title_en = legacyTitle;
          }

          const legacyText = String(
            x.text || x.translation || x.translation_en || x.english || "",
          ).trim();
          if (legacyText) {
            if (x.isArabic === true) {
              if (!textFields.text_ar) textFields.text_ar = legacyText;
            } else if (!textFields.text_en) {
              textFields.text_en = legacyText;
            }
          }

          const hasText = Object.keys(textFields).length > 0;
          const hasTitle = Object.keys(titleFields).length > 0;
          if (!arabic && !romanization && !reference && !hasText && !hasTitle) {
            return null;
          }

          const normalized = {
            arabic,
            romanization,
            reference,
            repeat,
            ...titleFields,
            ...textFields,
          };

          if (id !== "") normalized.id = id;

          return normalized;
        })
        .filter(Boolean);

      // Keep only unique card payloads (ignoring `id`) to avoid duplicate key/value entries.
      const deduped = [];
      const seen = new Set();
      for (const card of normalizedCards) {
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

    if (data && typeof data === "object") {
      const arr =
        data.cards || data.items || data.adhkar || data.entries || data.data;
      return this.normalizeImportedCards(Array.isArray(arr) ? arr : []);
    }

    return [];
  }

  async importJsonFile(file) {
    const name = this.inferSetNameFromFile(file.name);

    const sets = this.getSets();
    let effectiveName = name;
    let existing = sets.find(
      (s) => String(s.name || "").toLowerCase() === name.toLowerCase(),
    );

    // Never allow replacing a protected default set; create a new set instead.
    if (existing && this.isProtectedSetId(existing.id)) {
      existing = null;
      effectiveName = this.makeUniqueSetName(effectiveName, sets);
    }

    if (!existing && sets.length >= AdhkarManager.MAX_SETS) {
      this.showToast(
        `You already have ${AdhkarManager.MAX_SETS} sets. Delete one first.`,
        "error",
      );
      return;
    }

    let json;
    try {
      const text = await file.text();
      json = JSON.parse(text);
    } catch (e) {
      this.showToast("Could not read the JSON file.", "error");
      return;
    }

    const cards = this.normalizeImportedCards(json);
    if (!cards.length) {
      this.showToast("JSON contains no valid adhkar items.", "error");
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

  exportActiveSetJson() {
    const active = this.getActiveSet();
    if (!active) return;

    const payload = this.normalizeImportedCards(active.cards || []);
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${this.slugify(active.name || "adhkar")}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 500);
  }
});

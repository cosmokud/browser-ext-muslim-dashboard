/**
 * SettingsManager: tajweed colours, quran labels and bookmark backup.
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

  normalizeCssHexColor(value, fallback) {
    const v = String(value || "").trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) return v;
    if (/^#[0-9a-f]{3}$/i.test(v)) return v;
    return fallback;
  }

  getMergedPocketQuranTajweedColors(colors) {
    const defaults = SettingsManager.POCKET_QURAN_DEFAULT_TAJWEED_COLORS;
    const input = colors && typeof colors === "object" ? colors : {};
    return { ...defaults, ...input };
  }

  applyPocketQuranTajweedColors(colors) {
    const card = document.getElementById("pocketQuranCard");
    if (!card) return;

    const defaults = SettingsManager.POCKET_QURAN_DEFAULT_TAJWEED_COLORS;
    const merged = this.getMergedPocketQuranTajweedColors(colors);

    for (const key of Object.keys(defaults)) {
      const normalized = this.normalizeCssHexColor(merged[key], defaults[key]);
      card.style.setProperty(`--pq-tajweed-${key}`, normalized);
    }
  }

  persistPocketQuranTajweedColorPatch(patch) {
    const settings = this.storage.getSettings();
    const pq = settings.pocketQuran || {};
    const merged = this.getMergedPocketQuranTajweedColors(pq.tajweedColors);
    const next = { ...merged, ...(patch || {}) };

    settings.pocketQuran = {
      ...pq,
      tajweedColors: next,
    };

    this.storage.saveSettings(settings);
  }

  resetAllPocketQuranTajweedColors() {
    const defaults = SettingsManager.POCKET_QURAN_DEFAULT_TAJWEED_COLORS;
    const settings = this.storage.getSettings();
    const pq = settings.pocketQuran || {};

    settings.pocketQuran = {
      ...pq,
      tajweedColors: { ...defaults },
    };

    this.storage.saveSettings(settings);
    this.applyPocketQuranTajweedColors(defaults);
    this.renderPocketQuranTajweedColorPickers(defaults);
  }

  renderPocketQuranTajweedColorPickers(colors) {
    if (!this.pocketQuranTajweedColors) return;

    const defaults = SettingsManager.POCKET_QURAN_DEFAULT_TAJWEED_COLORS;
    const labels = SettingsManager.POCKET_QURAN_TAJWEED_COLOR_LABELS;
    const merged = this.getMergedPocketQuranTajweedColors(colors);

    this.pocketQuranTajweedColors.innerHTML = "";

    for (const key of Object.keys(defaults)) {
      const row = document.createElement("div");
      row.className = "pq-tajweed-color-row";

      const label = document.createElement("div");
      label.className = "pq-tajweed-color-label";
      label.textContent = labels[key] || key;

      const actions = document.createElement("div");
      actions.className = "pq-tajweed-color-actions";

      const input = document.createElement("input");
      input.type = "color";
      input.className = "pq-tajweed-color-input";
      input.value = merged[key];
      input.setAttribute("aria-label", `Pick color for ${label.textContent}`);

      const reset = document.createElement("button");
      reset.type = "button";
      reset.className = "setting-btn";
      reset.textContent = "Reset";
      reset.title = "Reset to default";
      reset.setAttribute("aria-label", `Reset ${label.textContent} to default`);

      const applyAndPersist = (nextColor) => {
        const normalized = this.normalizeCssHexColor(nextColor, defaults[key]);
        input.value = normalized;
        this.applyPocketQuranTajweedColors({ [key]: normalized });
        this.persistPocketQuranTajweedColorPatch({ [key]: normalized });
      };

      input.addEventListener("input", (e) => {
        applyAndPersist(e.target.value);
      });

      reset.addEventListener("click", () => {
        applyAndPersist(defaults[key]);
      });

      actions.appendChild(input);
      actions.appendChild(reset);

      row.appendChild(label);
      row.appendChild(actions);
      this.pocketQuranTajweedColors.appendChild(row);
    }
  }

  updatePocketQuranArabicSizeLabel() {
    if (!this.pocketQuranArabicSize || !this.pocketQuranArabicSizeValue) return;
    const clamped = SettingsRegistry.coerce(
      "arabicFontSize",
      parseInt(this.pocketQuranArabicSize.value, 10),
    );
    this.pocketQuranArabicSize.value = String(clamped);
    this.pocketQuranArabicSizeValue.textContent = `${clamped}px`;
  }

  updatePocketQuranTranslationSizeLabel() {
    if (
      !this.pocketQuranTranslationSize ||
      !this.pocketQuranTranslationSizeValue
    )
      return;
    const clamped = SettingsRegistry.coerce(
      "translationFontSize",
      parseInt(this.pocketQuranTranslationSize.value, 10),
    );
    this.pocketQuranTranslationSize.value = String(clamped);
    this.pocketQuranTranslationSizeValue.textContent = `${clamped}px`;
  }

  updatePocketQuranHighlighterDelayLabel() {
    if (
      !this.pocketQuranHighlighterDelay ||
      !this.pocketQuranHighlighterDelayValue
    )
      return;

    const clamped = SettingsRegistry.coerce(
      "quran.reciterHighlighterDelayMs",
      parseInt(this.pocketQuranHighlighterDelay.value, 10),
    );

    this.pocketQuranHighlighterDelay.value = String(clamped);
    this.pocketQuranHighlighterDelayValue.textContent = `${clamped}ms`;
  }

  updatePocketQuranPopupArabicSizeLabel() {
    if (
      !this.pocketQuranPopupArabicSize ||
      !this.pocketQuranPopupArabicSizeValue
    )
      return;

    const clamped = SettingsRegistry.coerce(
      "arabicFontSize",
      parseInt(this.pocketQuranPopupArabicSize.value, 10),
    );

    this.pocketQuranPopupArabicSize.value = String(clamped);
    this.pocketQuranPopupArabicSizeValue.textContent = `${clamped}px`;
  }

  updatePocketQuranPopupTranslationSizeLabel() {
    if (
      !this.pocketQuranPopupTranslationSize ||
      !this.pocketQuranPopupTranslationSizeValue
    )
      return;

    const clamped = SettingsRegistry.coerce(
      "translationFontSize",
      parseInt(this.pocketQuranPopupTranslationSize.value, 10),
    );

    this.pocketQuranPopupTranslationSize.value = String(clamped);
    this.pocketQuranPopupTranslationSizeValue.textContent = `${clamped}px`;
  }

  updateRangeProgress(rangeEl) {
    if (!(rangeEl instanceof HTMLInputElement) || rangeEl.type !== "range") {
      return;
    }

    const min = parseInt(rangeEl.min, 10);
    const max = parseInt(rangeEl.max, 10);
    const value = parseInt(rangeEl.value, 10);

    const safeMin = Number.isFinite(min) ? min : 0;
    const safeMax = Number.isFinite(max) ? max : safeMin + 1;
    const safeValue = Number.isFinite(value) ? value : safeMin;

    const span = Math.max(1, safeMax - safeMin);
    const progress = ((safeValue - safeMin) / span) * 100;
    const clamped = Math.max(0, Math.min(100, progress));

    rangeEl.style.setProperty("--jump-progress", `${clamped}%`);
  }

  updateSettingsRangeProgress(root = null) {
    const scope = root instanceof Element ? root : this.modal;
    if (!scope) return;

    const ranges = scope.querySelectorAll(
      '.settings-panel input[type="range"]',
    );
    ranges.forEach((rangeEl) => this.updateRangeProgress(rangeEl));
  }

  updatePocketQuranBookmarkStats() {
    if (!this.pocketQuranBookmarkStats) return;
    const categories = this.storage.get("pocketQuran_bookmarkCategories", []);
    const bookmarks = this.storage.get("pocketQuran_bookmarks", []);
    this.pocketQuranBookmarkStats.textContent = `${categories.length} categories, ${bookmarks.length} bookmarked ayahs`;
  }

  exportPocketQuranBookmarks() {
    try {
      const pocketQuran = window.dashboard?.pocketQuran;
      if (!pocketQuran) {
        this.showToast("Pocket Quran not initialized", "error");
        return;
      }

      const json = pocketQuran.exportBookmarksJSON();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `pocket-quran-bookmarks-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(url), 500);
      this.showToast("Bookmarks exported successfully", "success");
    } catch (e) {
      console.error("Failed to export bookmarks:", e);
      this.showToast("Failed to export bookmarks", "error");
    }
  }

  importPocketQuranBookmarks(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const pocketQuran = window.dashboard?.pocketQuran;
        if (!pocketQuran) {
          this.showToast("Pocket Quran not initialized", "error");
          return;
        }

        const result = pocketQuran.importBookmarksJSON(e.target.result);
        if (result.success) {
          this.updatePocketQuranBookmarkStats();
          this.showToast(
            `Imported ${result.categoriesCount} categories, ${result.bookmarksCount} bookmarks`,
            "success",
          );
        } else {
          this.showToast(`Import failed: ${result.error}`, "error");
        }
      } catch (err) {
        console.error("Failed to import bookmarks:", err);
        this.showToast("Failed to import bookmarks", "error");
      }
    };
    reader.onerror = () => {
      this.showToast("Failed to read file", "error");
    };
    reader.readAsText(file);
  }

  updatePinnedAppsPerRowLabel() {
    if (!this.pinnedAppsPerRow || !this.pinnedAppsPerRowValue) return;
    const clamped = SettingsRegistry.coerce(
      "pinnedAppsPerRow",
      parseInt(this.pinnedAppsPerRow.value, 10),
    );
    this.pinnedAppsPerRow.value = String(clamped);
    this.pinnedAppsPerRowValue.textContent = String(clamped);

    // Apply live change to the pinned apps grid width (for immediate preview)
    if (
      window.dashboard &&
      typeof window.dashboard.applyPinnedAppsSettings === "function"
    ) {
      window.dashboard.applyPinnedAppsSettings(clamped);
    } else {
      const grid = document.getElementById("pinnedAppsGrid");
      if (grid) {
        grid.style.setProperty("--pinned-apps-per-row", String(clamped));
      }
    }
  }
});

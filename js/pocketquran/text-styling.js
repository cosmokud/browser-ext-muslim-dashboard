/**
 * PocketQuranManager: tajweed colours, sizes and range labels.
 * Part of the class declared in js/pocketquran/index.js; load this after it.
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
})(PocketQuranManager.prototype, class {

  applyTajweedColors(colors, opts = {}) {
    const { persist = false } = opts;
    if (!this.card) return;

    const defaults = PocketQuranManager.DEFAULT_TAJWEED_COLORS;
    const input = colors && typeof colors === "object" ? colors : {};
    const merged = { ...defaults, ...input };

    for (const key of Object.keys(defaults)) {
      const normalized = this.normalizeCssHexColor(merged[key], defaults[key]);
      this.card.style.setProperty(`--pq-tajweed-${key}`, normalized);
    }

    if (persist) {
      this.persistPocketQuranSettings({ tajweedColors: merged });
    }
  }

  updateRangeProgress(rangeEl) {
    if (!(rangeEl instanceof HTMLInputElement)) return;

    const min = parseInt(rangeEl.min, 10);
    const max = parseInt(rangeEl.max, 10);
    const value = parseInt(rangeEl.value, 10);

    const safeMin = Number.isFinite(min) ? min : 1;
    const safeMax = Number.isFinite(max) ? max : safeMin + 1;
    const safeValue = Number.isFinite(value) ? value : safeMin;

    const range = Math.max(1, safeMax - safeMin);
    const progress = ((safeValue - safeMin) / range) * 100;
    const clampedProgress = Math.max(0, Math.min(100, progress));

    rangeEl.style.setProperty("--jump-progress", `${clampedProgress}%`);
  }

  applyFontSizes(arabicPx, translationPx, opts = {}) {
    const { syncInputs = false, persist = false } = opts;

    const a = SettingsRegistry.coerce("arabicFontSize", arabicPx, 40);
    const t = SettingsRegistry.coerce("translationFontSize", translationPx, 18);

    if (this.card) {
      const badgeOffset = Math.max(0, (a * 1.95 - 34) / 2);
      this.card.style.setProperty("--pq-arabic-size", `${a}px`);
      this.card.style.setProperty(
        "--pq-ayah-badge-align-offset",
        `${badgeOffset.toFixed(2)}px`,
      );
      this.card.style.setProperty("--pq-translation-size", `${t}px`);
    }

    if (syncInputs) {
      if (this.arabicSizeRange) this.arabicSizeRange.value = String(a);
      if (this.translationSizeRange)
        this.translationSizeRange.value = String(t);
      if (this.arabicSizeValue) this.arabicSizeValue.textContent = `${a}px`;
      if (this.translationSizeValue)
        this.translationSizeValue.textContent = `${t}px`;
    }

    this.updateRangeProgress(this.arabicSizeRange);
    this.updateRangeProgress(this.translationSizeRange);

    if (persist) {
      this.persistPocketQuranSettings({
        arabicFontSize: a,
        translationFontSize: t,
      });
    }
  }
});

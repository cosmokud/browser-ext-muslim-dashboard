/**
 * Settings registry
 *
 * One declaration per setting: its default and how a value is coerced into
 * range. The defaults block, the panels and the app read the rule from here
 * instead of each carrying their own copy of the numbers, so an invalid value
 * is fixed in one place.
 *
 * This is the expand step of a wider change: the loader still returns the whole
 * settings blob, and the 276 call sites keep reading it. Keys this registry
 * does not know are left alone, so a rule can be migrated one at a time.
 */
class SettingsRegistry {
  static RULES = {
    // Background
    bgDim: { default: 100, min: 0, max: 100, round: true },
    bgBlur: { default: 0, min: 0, max: 40, round: true },

    // Pinned apps: a per-row count stays fractional, the old clamp never rounded it
    pinnedAppsPerRow: { default: 10, min: 3, max: 20 },

    // Pocket Quran, and the popup's own copy of the same two sizes
    arabicFontSize: { default: 40, min: 8, max: 144 },
    translationFontSize: { default: 18, min: 8, max: 144 },

    // Theme glass, and the per-component blur power the mapping applies to
    // several components' own keys, so these two rules have no single key.
    glassOpacity: { default: 50, min: 0, max: 100, round: true },
    blurPower: { min: 0, max: 200, round: true },

    // Fasting card. A dotted name is a key inside the settings blob, so the
    // blob's own defaults read from here too.
    "fasting.showRecommendations": { default: true, boolean: true },
    "fasting.dhuAlHijjahWithinDays": {
      default: 30,
      min: 7,
      max: 365,
      round: true,
    },
    "fasting.arafahWithinDays": {
      default: 30,
      min: 7,
      max: 365,
      round: true,
    },
    "fasting.ashuraWithinDays": {
      default: 30,
      min: 7,
      max: 365,
      round: true,
    },

    // Dashboard glass power, the custom container width, and the highlighter's
    // lead time (shared with js/quran-recitation.js).
    uiBlurPower: { default: 100, min: 0, max: 200, round: true },
    componentOpacity: { default: 0, min: 0, max: 100 },
    modalOpacity: { default: 97, min: 0, max: 100 },
    containerWidthCustom: { default: 70, min: 20, max: 98 },
    "quran.reciterHighlighterDelayMs": {
      default: 0,
      min: -10000,
      max: 10000,
      round: true,
    },

    // Offsets the worker schedules and the panel edits, per prayer.
    "prayerNotifications.beforeMinutes": {
      default: 10,
      min: 0,
      max: 180,
      round: true,
    },
    "prayerNotifications.afterMinutes": {
      default: 0,
      min: 0,
      max: 180,
      round: true,
    },

    // The suhur reminder's lead time, read by the worker and by the panel.
    "fasting.notifications.minutesBefore": {
      default: 60,
      min: 5,
      max: 180,
      round: true,
    },
  };

  static has(name) {
    return Object.prototype.hasOwnProperty.call(SettingsRegistry.RULES, name);
  }

  static ruleFor(name) {
    return SettingsRegistry.RULES[name];
  }

  /** The declared default, or undefined for a rule that has none. */
  static defaultOf(name) {
    return SettingsRegistry.ruleFor(name)?.default;
  }

  /** Every declared default, for the settings blob to spread in. */
  static defaults() {
    const declared = {};
    for (const [name, rule] of Object.entries(SettingsRegistry.RULES)) {
      // A dotted name belongs to a nested block, not to the top level.
      if (name.includes(".")) continue;
      if (rule.default !== undefined) declared[name] = rule.default;
    }
    return declared;
  }

  /**
   * A value inside the rule's range. Non-numeric input becomes `fallback` when
   * the caller has one (a value to fall back on that is not the default), else
   * the declared default. A rule without a default keeps the old NaN result
   * rather than inventing a value.
   */
  static coerce(name, value, fallback) {
    const rule = SettingsRegistry.ruleFor(name);
    if (!rule) return value;

    if (rule.boolean === true) {
      // Only an explicit opposite value moves a toggle off its default; the
      // card has always read a missing toggle as on.
      return rule.default === true ? value !== false : value === true;
    }

    const numeric = Number(value);
    let next = numeric;
    if (!Number.isFinite(numeric)) {
      next = fallback !== undefined ? fallback : rule.default;
    }
    if (!Number.isFinite(next)) return next;

    if (rule.round === true) next = Math.round(next);
    if (rule.min !== undefined) next = Math.max(rule.min, next);
    if (rule.max !== undefined) next = Math.min(rule.max, next);
    if (rule.round === true) next = Math.round(next);

    return next;
  }
}

globalThis.SettingsRegistry = SettingsRegistry;

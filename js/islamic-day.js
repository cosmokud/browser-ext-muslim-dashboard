/**
 * Islamic Day
 *
 * The one answer to "which Islamic day is it, and is this a fasting day",
 * shared by the new tab, the popup and the service worker.
 *
 * Day rule: the Islamic day is the device's local calendar date, converted to
 * Hijri with the user's adjustment applied. This module never reads a UTC day.
 *
 * Built from one settings snapshot; callers ask for a day, not for a number.
 * Composes HijriDate (conversion and formatting) and PrayTimes (the calculator).
 */
class IslamicDay {
  constructor(settings = {}) {
    this.settings = settings || {};
    this.adjustment = Number(this.settings.hijriAdjustment || 0);
    this.timeFormat = this.settings.timeFormat || "24h";
    this.hijri = new HijriDate();
    this.prayTimes = new PrayTimes();
    this.configurePrayTimes();
  }

  /** The Islamic day of the instant's local calendar date. */
  dayFor(date = new Date()) {
    return this.hijri.toHijri(date, this.adjustment);
  }

  formatDay(hijriDay, format = "full", lang = "en") {
    return this.hijri.format(hijriDay, format, lang);
  }

  timesFor(date = new Date(), location = {}) {
    return this.prayTimes.getTimes(
      date,
      [Number(location.latitude), Number(location.longitude)],
      "auto",
      "auto",
      this.timeFormat,
    );
  }

  /** The configured calculator, for callers that need its tables. */
  calculator() {
    return this.prayTimes;
  }

  /**
   * The fast this day calls for, or null when it calls for none.
   *
   * Takes a Hijri day from dayFor(). Precedence matches the order notification
   * labels have always been chosen in, so no label changes.
   */
  fastingDayFor(hijriDay) {
    if (!hijriDay || this.prohibitedFastFor(hijriDay)) return null;

    const { month, day, dayOfWeek } = hijriDay;

    if (month === 9) return { type: "ramadan", label: "Ramadan (month 9)" };
    if (month === 12 && day === 9) {
      return { type: "arafah", label: "Day of Arafah (9 Dhu al-Hijjah)" };
    }
    if (month === 12 && day >= 1 && day <= 9) {
      return {
        type: "dhuAlHijjah",
        label: "First 9 days of Dhu al-Hijjah (1-9 Dhu al-Hijjah)",
      };
    }
    if (month === 1 && day === 9) {
      return { type: "tasua", label: "Tasu'a (9 Muharram)" };
    }
    if (month === 1 && day === 10) {
      return { type: "ashura", label: "Ashura (10 Muharram)" };
    }
    if (month !== 9 && day >= 13 && day <= 15) {
      return {
        type: "ayyamAlBeed",
        label: "Ayyam al-Beed (13th-15th of each Hijri month)",
      };
    }
    if (dayOfWeek === 1) return { type: "monday", label: "Monday Fast" };
    if (dayOfWeek === 4) return { type: "thursday", label: "Thursday Fast" };
    return null;
  }

  /** The reason this day is no fast day, or null. */
  prohibitedFastFor(hijriDay) {
    if (!hijriDay) return null;

    const { month, day } = hijriDay;

    if (month === 10 && day === 1) {
      return { type: "eidAlFitr", label: "Eid al-Fitr (1 Shawwal)" };
    }
    if (month === 12 && day === 10) {
      return { type: "eidAlAdha", label: "Eid al-Adha (10 Dhu al-Hijjah)" };
    }
    if (month === 12 && day >= 11 && day <= 13) {
      return {
        type: "tashreeq",
        label: "Days of Tashreeq (11-13 Dhu al-Hijjah)",
      };
    }
    return null;
  }

  /** The single copy of the calculator configuration. */
  configurePrayTimes() {
    const settings = this.settings;

    this.prayTimes.setMethod(settings.calculationMethod || "MWL");

    if (settings.calculationMethod === "Custom") {
      this.prayTimes.setFajrAngle(settings.customFajrAngle ?? 18);
      this.prayTimes.setIshaAngle(
        settings.customIshaAngle ?? 17,
        settings.customIshaMinutes ?? false,
      );
    }

    this.prayTimes.setAsrMethod(settings.asrMethod || "Standard");
    this.prayTimes.setHighLatMethod(settings.highLatMethod || "None");
    this.prayTimes.setMidnightMethod(settings.midnightMethod || "Standard");
    this.prayTimes.setDuhaOffset(settings.duhaOffset ?? 20);

    if (settings.adjustments && typeof settings.adjustments === "object") {
      this.prayTimes.tune(settings.adjustments);
    }
  }
}

// globalThis so the service worker can importScripts this file, where `window`
// does not exist.
globalThis.IslamicDay = IslamicDay;

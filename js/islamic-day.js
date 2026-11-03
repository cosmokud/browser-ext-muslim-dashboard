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
    HijriCalendars.setMode(this.settings.fasting?.hijriCalendar);
    this.timeFormat = this.settings.timeFormat || "24h";
    this.hijri = new HijriDate();
    this.prayTimes = new PrayTimes();
    this.configurePrayTimes();
  }

  /** The Islamic day of the instant's local calendar date. */
  dayFor(date = new Date()) {
    return this.hijri.toHijri(date, this.adjustment);
  }

  /**
   * The local calendar date that reads as this Islamic day.
   *
   * The inverse of dayFor(): the day the adjustment moves is the same one it
   * adds, so a caller that maps a Hijri day back to Gregorian never shifts.
   */
  dateFor(hijriDay) {
    const { year, month, day } = hijriDay;
    const gregorian = this.hijri.toGregorian(year, month, day);
    const date = new Date(
      gregorian.getFullYear(),
      gregorian.getMonth(),
      gregorian.getDate(),
    );
    date.setDate(date.getDate() - this.adjustment);
    return date;
  }

  /** The Islamic event the day falls on, or null. */
  eventFor(hijriDay) {
    return hijriDay ? this.hijri.getTodayEvent(hijriDay) : null;
  }

  formatDay(hijriDay, format = "full", lang = "en") {
    return this.hijri.format(hijriDay, format, lang);
  }

  /** The month's name, as the header and the card show it. */
  monthName(month, lang = "en") {
    return this.hijri.getHijriMonthName(month, lang);
  }

  /** How many days the month has in the calendar the user chose. */
  daysInMonth(year, month) {
    return this.hijri.getHijriDaysInMonth(year, month);
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

  /**
   * Whether a prohibited fast day falls within daysAhead of this day.
   *
   * Lets a caller skip converting a week that cannot hold one. It walks the
   * days through prohibitedFastFor(), so the windows live in one place.
   */
  hasProhibitedFastWithin(hijriDay, daysAhead) {
    if (!hijriDay || !(daysAhead >= 0)) return false;

    let { year, month, day } = hijriDay;

    for (let ahead = 0; ahead <= daysAhead; ahead += 1) {
      if (this.prohibitedFastFor({ year, month, day })) return true;

      day += 1;
      if (day > this.hijri.getHijriDaysInMonth(year, month)) {
        day = 1;
        month += 1;
        if (month > 12) {
          month = 1;
          year += 1;
        }
      }
    }

    return false;
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

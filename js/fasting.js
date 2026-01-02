/**
 * Fasting Manager
 * Renders countdown gradient bars for recommended/seasonal fasts.
 * - Always derives the current Hijri date first (with user adjustment)
 * - Computes:
 *   - Monday/Thursday fasts (weekday-based)
 *   - 1 Ramadan (or 29 Ramadan when currently in Ramadan)
 *   - 13th of the (next) Hijri month (except when currently Ramadan)
 *   - 1 Dhu al-Hijjah (only when within 30 days)
 *   - Day of Arafah (9 Dhu al-Hijjah, only when within 30 days)
 */

class FastingManager {
  /**
   * @param {StorageManager} storage
   * @param {HijriDate} hijri
   */
  constructor(storage, hijri) {
    this.storage = storage;
    this.hijri = hijri;

    this.card = document.getElementById("fastingCard");
    this.subtitle = document.getElementById("fastingHijriNow");
    this.barsEl = document.getElementById("fastingBars");

    this._midnightTimer = null;
  }

  init() {
    if (!this.card || !this.barsEl || !this.hijri) return;

    this.render();
    this._scheduleMidnightRefresh();

    // Also refresh on visibility changes (tab was sleeping)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        this.render();
        this._scheduleMidnightRefresh();
      }
    });
  }

  destroy() {
    if (this._midnightTimer) {
      clearTimeout(this._midnightTimer);
      this._midnightTimer = null;
    }
  }

  _scheduleMidnightRefresh() {
    if (this._midnightTimer) {
      clearTimeout(this._midnightTimer);
      this._midnightTimer = null;
    }

    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      2
    );
    const ms = Math.max(1000, nextMidnight.getTime() - now.getTime());

    this._midnightTimer = setTimeout(() => {
      this.render();
      this._scheduleMidnightRefresh();
    }, ms);
  }

  render() {
    const now = new Date();
    const nowStart = this._startOfDay(now);
    const settings = this.storage?.getSettings
      ? this.storage.getSettings()
      : {};
    const adjustment = Number(settings.hijriAdjustment || 0);

    // Required: derive Hijri first (with adjustment)
    const hijriNow = this.hijri.toHijri(now, adjustment);

    if (this.subtitle) {
      // Use full month name (no abbreviation)
      this.subtitle.textContent = this.hijri.format(hijriNow, "full", "en");
    }

    const items = [];

    // Compute Ramadan separately so we can always place it at the bottom.
    const ramadanItem = this._ramadanCountdown(nowStart, hijriNow, adjustment);

    // Monday/Thursday fasts (weekday-based)
    // Max days in-between is 6, so width uses total=6 (full scale)
    const monday = this._weekdayCountdown(nowStart, 1);
    items.push({
      key: "monday",
      title: "Monday Fast",
      subtitle: "Weekly Sunnah",
      daysLeft: monday.daysLeft,
      totalDays: 6,
      meta: this._daysLeftText(monday.daysLeft),
      aria: `Monday fast: ${this._daysLeftText(monday.daysLeft)}`,
    });

    const thursday = this._weekdayCountdown(nowStart, 4);
    items.push({
      key: "thursday",
      title: "Thursday Fast",
      subtitle: "Weekly Sunnah",
      daysLeft: thursday.daysLeft,
      totalDays: 6,
      meta: this._daysLeftText(thursday.daysLeft),
      aria: `Thursday fast: ${this._daysLeftText(thursday.daysLeft)}`,
    });

    // 13th of Hijri months (Ayyam al-Beed) – exception: hide during Ramadan
    if (hijriNow.month !== 9) {
      const ayyam = this._thirteenthCountdown(nowStart, hijriNow, adjustment);
      // Must be the third item after Thursday
      if (ayyam) items.push(ayyam);
    }

    // Dhu al-Hijjah countdowns (only when within 30 days)
    const dhu1 = this._hijriCountdownWithin(
      nowStart,
      hijriNow,
      adjustment,
      12,
      1,
      30
    );
    if (dhu1) {
      items.push({
        key: "dhu1",
        title: "Dhu al-Hijjah",
        subtitle: "Approaching the sacred month",
        daysLeft: dhu1.daysLeft,
        totalDays: 30,
        meta: this._daysLeftText(dhu1.daysLeft),
        aria: `1 Dhu al-Hijjah: ${this._daysLeftText(dhu1.daysLeft)}`,
        badge: "1 Dhu al-Hijjah",
      });
    }

    const arafah = this._hijriCountdownWithin(
      nowStart,
      hijriNow,
      adjustment,
      12,
      9,
      30
    );
    if (arafah) {
      items.push({
        key: "arafah",
        title: "Day of Arafah",
        subtitle: "9 Dhu al-Hijjah",
        daysLeft: arafah.daysLeft,
        totalDays: 30,
        meta: this._daysLeftText(arafah.daysLeft),
        aria: `Day of Arafah: ${this._daysLeftText(arafah.daysLeft)}`,
        badge: "9 Dhu al-Hijjah",
      });
    }

    // Ramadan must always be at the bottom.
    if (ramadanItem) items.push(ramadanItem);

    this._renderBars(items);
  }

  _renderBars(items) {
    if (!this.barsEl) return;

    this.barsEl.innerHTML = "";

    for (const item of items) {
      const daysLeft = this._clampInt(item.daysLeft, 0, 9999);
      const totalDays = Math.max(1, Number(item.totalDays || 1));

      const remainingRatio = this._clamp(daysLeft / totalDays, 0, 1);
      const fillRatio = this._clamp(1 - remainingRatio, 0, 1);

      const scheme = this._schemeForRemainingRatio(remainingRatio);

      const row = document.createElement("div");
      row.className = "fasting-bar";
      row.setAttribute("role", "group");
      row.setAttribute("aria-label", item.aria || item.title);

      const header = document.createElement("div");
      header.className = "fasting-bar__header";

      const left = document.createElement("div");
      left.className = "fasting-bar__left";

      const title = document.createElement("div");
      title.className = "fasting-bar__title";
      title.textContent = item.title;

      const subtitle = document.createElement("div");
      subtitle.className = "fasting-bar__subtitle";
      subtitle.textContent = item.subtitle || "";

      left.appendChild(title);
      if (item.subtitle) left.appendChild(subtitle);

      const right = document.createElement("div");
      right.className = "fasting-bar__right";

      const badge = document.createElement("div");
      badge.className = "fasting-bar__badge";
      badge.textContent = item.badge || "";

      const value = document.createElement("div");
      value.className = "fasting-bar__value";
      value.textContent = item.meta || this._daysLeftText(daysLeft);

      if (item.badge) right.appendChild(badge);
      right.appendChild(value);

      header.appendChild(left);
      header.appendChild(right);

      const track = document.createElement("div");
      track.className = "fasting-bar__track";

      const fill = document.createElement("div");
      fill.className = "fasting-bar__fill";
      fill.style.setProperty("--fasting-c1", scheme.c1);
      fill.style.setProperty("--fasting-c2", scheme.c2);
      fill.style.setProperty("--fasting-c3", scheme.c3);

      // Trigger animation: first paint at 0, then set to target.
      fill.style.width = "0%";
      track.appendChild(fill);

      row.appendChild(header);
      row.appendChild(track);
      this.barsEl.appendChild(row);

      // Animate after insertion.
      requestAnimationFrame(() => {
        const pct = Math.round(fillRatio * 100);
        fill.style.width = `${pct}%`;
      });
    }
  }

  _weekdayCountdown(nowStart, targetDow) {
    const todayDow = nowStart.getDay(); // 0=Sun
    const delta = (targetDow - todayDow + 7) % 7;
    return { daysLeft: delta };
  }

  _ramadanCountdown(nowStart, hijriNow, adjustment) {
    const month = hijriNow.month;
    const day = hijriNow.day;

    if (month === 9) {
      const daysLeft = Math.max(0, 29 - day);
      return {
        key: "ramadan",
        title: "Ramadan",
        subtitle: "In the blessed month",
        daysLeft,
        totalDays: 29,
        meta: this._daysLeftText(daysLeft),
        aria: `Ramadan (to 29 Ramadan): ${this._daysLeftText(daysLeft)}`,
        badge: "29 Ramadan",
      };
    }

    // Countdown to 1 Ramadan
    const hy = hijriNow.year;
    const targetYear = month > 9 ? hy + 1 : hy;
    const target = this._targetGregorianForHijri(targetYear, 9, 1, adjustment);
    const daysLeft = this._diffDays(nowStart, target);

    // Width rule: treat as whole year scale
    return {
      key: "ramadan",
      title: "Ramadan",
      subtitle: "Countdown to 1 Ramadan",
      daysLeft,
      totalDays: 354,
      meta: this._daysLeftText(daysLeft),
      aria: `1 Ramadan: ${this._daysLeftText(daysLeft)}`,
      badge: "1 Ramadan",
    };
  }

  _thirteenthCountdown(nowStart, hijriNow, adjustment) {
    const hy = hijriNow.year;
    const hm = hijriNow.month;
    const hd = hijriNow.day;

    // Ayyam al-Beed are the 13th–15th of each Hijri month.
    // If we're currently within that window, it should count as "Today".
    if (hd >= 13 && hd <= 15) {
      const monthName = this.hijri.monthNames.en[hm - 1];
      const badge = `13–15 ${monthName}`;
      return {
        key: "thirteenth",
        title: "Ayyam al-Beed",
        subtitle: "13th - 15th of the Hijri month",
        daysLeft: 0,
        totalDays: 29,
        meta: "Today",
        aria: `Ayyam al-Beed (${badge}): Today`,
        badge,
      };
    }

    let targetYear = hy;
    let targetMonth = hm;
    // After the 15th, the next Ayyam window starts next month.
    if (hd > 15) {
      targetMonth = hm + 1;
      if (targetMonth > 12) {
        targetMonth = 1;
        targetYear += 1;
      }
    }

    const target = this._targetGregorianForHijri(
      targetYear,
      targetMonth,
      13,
      adjustment
    );
    const daysLeft = this._diffDays(nowStart, target);

    const monthName = this.hijri.monthNames.en[targetMonth - 1];
    const badge = `13–15 ${monthName}`;

    return {
      key: "thirteenth",
      title: "Ayyam al-Beed",
      subtitle: "13th - 15th of the Hijri month",
      daysLeft,
      totalDays: 29,
      meta: this._daysLeftText(daysLeft),
      aria: `Ayyam al-Beed (${badge}): ${this._daysLeftText(daysLeft)}`,
      badge,
    };
  }

  _hijriCountdownWithin(
    nowStart,
    hijriNow,
    adjustment,
    targetMonth,
    targetDay,
    withinDays
  ) {
    const hy = hijriNow.year;
    const hm = hijriNow.month;
    const hd = hijriNow.day;

    let targetYear = hy;

    // If we've already passed the target within the current Hijri year, use next year.
    if (hm > targetMonth || (hm === targetMonth && hd > targetDay)) {
      targetYear = hy + 1;
    }

    const target = this._targetGregorianForHijri(
      targetYear,
      targetMonth,
      targetDay,
      adjustment
    );

    const daysLeft = this._diffDays(nowStart, target);
    if (daysLeft < 0 || daysLeft > withinDays) return null;

    return { daysLeft, target };
  }

  _targetGregorianForHijri(hy, hm, hd, adjustment) {
    // Keep consistent with Hijri adjustment semantics:
    // toHijri(date, adj) uses (date + adj) to compute Hijri.
    // Therefore, the Gregorian day that *displays* as a given Hijri date
    // under adjustment adj is (toGregorian(hijri) - adj).
    const g = this.hijri.toGregorian(hy, hm, hd);
    const shifted = this._addDays(
      this._startOfDay(g),
      -Number(adjustment || 0)
    );
    return shifted;
  }

  _daysLeftText(daysLeft) {
    if (daysLeft <= 0) return "Today";
    if (daysLeft === 1) return "1 day left";
    return `${daysLeft} days left`;
  }

  _schemeForRemainingRatio(remainingRatio) {
    // remainingRatio: 1 = far (green), 0 = today (red)
    if (remainingRatio <= 0.33) {
      return {
        c1: "#ff6b6b",
        c2: "#ee5a5a",
        c3: "rgba(255, 107, 107, 0.55)",
      };
    }
    if (remainingRatio <= 0.66) {
      return {
        c1: "var(--accent-gold-light)",
        c2: "var(--accent-gold)",
        c3: "rgba(212, 175, 55, 0.45)",
      };
    }
    return {
      c1: "var(--primary-light)",
      c2: "var(--primary-color)",
      c3: "rgba(45, 138, 110, 0.45)",
    };
  }

  _startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  _addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + Number(days || 0));
    return d;
  }

  _diffDays(aStart, bStart) {
    const ms = bStart.getTime() - aStart.getTime();
    return Math.round(ms / 86400000);
  }

  _clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  _clampInt(v, min, max) {
    const n = Number(v);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, Math.trunc(n)));
  }
}

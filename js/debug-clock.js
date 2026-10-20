/**
 * The clock the debug menu drives.
 *
 * A simulated date answers "which day is it"; a simulated time answers "which
 * instant", which is what the pre-Fajr reminder and the day rollover need.
 * The time is optional: without it the simulation keeps the real time of day.
 */
(function () {
  "use strict";

  function normalizeDateYMD(rawValue, NativeDate = Date) {
    const match = String(rawValue || "")
      .trim()
      .match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return "";

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);

    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day) ||
      year < 1 ||
      year > 9999 ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return "";
    }

    // A date the calendar does not have (31 February) must not snap to March.
    const probe = new NativeDate(year, month - 1, day);
    if (
      probe.getFullYear() !== year ||
      probe.getMonth() !== month - 1 ||
      probe.getDate() !== day
    ) {
      return "";
    }

    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function normalizeTimeHM(rawValue) {
    const match = String(rawValue || "")
      .trim()
      .match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return "";

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "";
    if (hours > 23 || minutes > 59) return "";

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  /**
   * The instant the simulation stands at, in milliseconds: the stored date, the
   * stored time of day when there is one, and the real seconds so live
   * countdowns keep ticking.
   */
  function now(date, time, NativeDate = Date) {
    const ymd = normalizeDateYMD(date, NativeDate);
    if (!ymd) {
      return NativeDate.now();
    }

    const [year, month, day] = ymd.split("-").map(Number);
    const real = new NativeDate();
    const hm = normalizeTimeHM(time);
    const [hours, minutes] = hm
      ? hm.split(":").map(Number)
      : [real.getHours(), real.getMinutes()];

    return new NativeDate(
      year,
      month - 1,
      day,
      hours,
      minutes,
      real.getSeconds(),
      real.getMilliseconds(),
    ).getTime();
  }

  globalThis.DebugClock = { normalizeDateYMD, normalizeTimeHM, now };
})();

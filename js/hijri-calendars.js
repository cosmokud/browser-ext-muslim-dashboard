/**
 * The calendars behind "which Islamic day is today".
 *
 * js/hijri.js keeps the arithmetic (tabular) conversion. The two other modes
 * are published month starts, stored here as one digit per month ('2' = 29
 * days, '3' = 30) after a known first month, so a lookup is a prefix sum and a
 * binary search.
 *
 * - ummAlQura: Saudi Arabia's official calendar, 1360-1500 AH. Generated from
 *   the ICU islamic-umalqura table, which matches the published Saudi dates
 *   for 1446-1448 (Ramadan 1446 = 1 Mar 2025, Eid al-Fitr = 30 Mar 2025,
 *   Eid al-Adha = 6 Jun 2025, Ramadan 1447 = 18 Feb 2026, Muharram 1448 =
 *   16 Jun 2026).
 * - indonesia: Kemenag / MABIMS, 1364-1520 AH. Derived from the Neo-MABIMS
 *   computation (moon altitude >= 3 deg, elongation >= 6.4 deg at sunset over
 *   25 Indonesian sites) published by mabims.dev, which reproduces every month
 *   of Kemenag's official table that it can be checked against. Sidang isbat
 *   keeps the final word for Ramadan, Shawwal and Dhu al-Hijjah, so an official
 *   announcement can still move a date by a day.
 *
 * Outside a table's range the tabular arithmetic in js/hijri.js answers instead.
 */
globalThis.HijriCalendars = (function () {
  const DATA = {
    ummAlQura: {
      firstYear: 1360,
      firstMonth: 1,
      firstJulian: 2430023,
      lengths:
      "23332323223232332332232323232332323232323232323323232232323333223223" +
      "23233323232232323323323223232323332232323232332323323223232323332322" +
      "32323233322323223233323232322323323323232232323323323232232323332323" +
      "22322333233232223233233323222323323323232323232323233232322323233233" +
      "23223223332332322322332333232232233233323223223323323232323232323323" +
      "23232322332332332232232333232323223233233232322323233233232232323233" +
      "32322323232332332322322332332332232232332333222323233233232232323233" +
      "23233232232323233323223223233332322322323332332232232332332323223232" +
      "33323223322323323233232232323233323232232233332323223223332332322322" +
      "33233233223232323233322323223233323232322323323323232232323332323223" +
      "23233233223232323233232323232323232333222322323333232232223333233223" +
      "22233323323232232323323323223232323323233232232323323323223232332332" +
      "32232233323323223223323323322323232323323232322323332323232232332332" +
      "32322323233233223232323233232323232323233233223232233233322322323233" +
      "32323223232333232322323233233232232323233232323232323233232332232323" +
      "23332322322323332332232232333232323223233233232322323233233232322323" +
      "23323332232233233233223223233233232322323233233232322323323233232232" +
      "32323332322322323333232232232333233223223233233232322323233232323322" +
      "32323323233223232323332323223223332332322322332333232223233233233223" +
      "23232323323232322323323323232232332332323223232332332322323233232323" +
      "32232323233233223232233233322322323233323232232233332323223232332332" +
      "32232323233232323232323232332323232232333323223223233323322322323332" +
      "32323223233233232322323233233232322323233233232232323233323223232323" +
      "32332232322332332323232233232332323232232333232323222333233232232233" +
      "23332322322332332323232323232332323232322332323323232232323",
    },
    indonesia: {
      firstYear: 1364,
      firstMonth: 1,
      firstJulian: 2431441,
      lengths:
      "32232322332333232232233233233223223233323322232323233323232232323332" +
      "32322323233232332232323233232332232323233233232232233233323223223233" +
      "32332232232332333223223232333232322323233233232232323233232323232323" +
      "23323232322332323323232322323332323232232332332323223232333232322323" +
      "23332322323223332323232323232323323232323223332323232322332332323232" +
      "23233233322322323233323232232323332323223232332332322322332332323232" +
      "32323233232323232233233232322323233233232232323233323232223233323323" +
      "22232332333232232232333232323223233233232322323323233232323223233233" +
      "23232232323332323223232333232322322333233232232233233323223223233323" +
      "23232232332323323223232323332323232232332323323223232332332232322332" +
      "33323223223233323322232323323332223232323332323223232332323322323232" +
      "33233223232323233233232223233233323223223323332322322323332323232232" +
      "33233232322323233323232232323323233223232323233232323232323323233222" +
      "32332333232223232333232323222333233232322323233323223232323323322323" +
      "23232332323232323232332323232322332332323223232332333222323232333232" +
      "32232323332323223232332332322323232332323232323232332323232323232332" +
      "32323223233323232232323323323223232323332323222323332332322232332333" +
      "22323232233323232323223323233232323223233323232322323323323232232323" +
      "33232322323233323223232233323323223223323323232322323323323232322332" +
      "32332323223232332332323223232333232322233233233223223233233322323223" +
      "23332323223232332332322323232333232323223233232332322323232333232322" +
      "23233323323222323323332322232323333223232232333232323223233233232322" +
      "32323323323223232323323323223232323323322322323332332322232323333232" +
      "22323233323232322323323323232232323323322323232323323232323232323323" +
      "32232322333232323223233233233222323233233322232323233323223232323332" +
      "32322323233233232232323233232323232323233232323232233233232323223233" +
      "32323223232323332322323232333232232232333233232223323233232323232233" +
      "23323232322332323323232232323332323232223332332",
    },
  };

  const MODES = ["tabular", "indonesia", "ummAlQura"];
  const tables = {};
  let mode = "tabular";

  function has(name) {
    return Object.prototype.hasOwnProperty.call(DATA, name);
  }

  function getMode() {
    return mode;
  }

  function setMode(name) {
    mode = has(name) ? name : "tabular";
    return mode;
  }

  /** Prefix sums of the month lengths: starts[i] is the first day of month i. */
  function table(name) {
    if (!tables[name]) {
      const { firstYear, firstMonth, firstJulian, lengths } = DATA[name];
      const starts = new Int32Array(lengths.length + 1);
      starts[0] = firstJulian;
      for (let i = 0; i < lengths.length; i += 1) {
        starts[i + 1] = starts[i] + (lengths[i] === "3" ? 30 : 29);
      }
      tables[name] = { starts, firstYear, firstMonth };
    }
    return tables[name];
  }

  /** Index of a month in the table, or -1 when the table does not reach it. */
  function monthIndex(t, year, month) {
    const index = (year - t.firstYear) * 12 + (month - t.firstMonth);
    return index >= 0 && index < t.starts.length - 1 ? index : -1;
  }

  /** The Hijri date for a Julian day number, or null outside the table. */
  function fromJulian(name, jd) {
    const t = table(name);
    const day = Math.floor(jd);
    if (day < t.starts[0] || day >= t.starts[t.starts.length - 1]) return null;

    let low = 0;
    let high = t.starts.length - 1;
    while (high - low > 1) {
      const mid = (low + high) >> 1;
      if (t.starts[mid] <= day) low = mid;
      else high = mid;
    }

    const months = low + t.firstMonth - 1;
    return {
      year: t.firstYear + Math.floor(months / 12),
      month: (months % 12) + 1,
      day: day - t.starts[low] + 1,
    };
  }

  /** The Julian day number of a Hijri date, or null outside the table. */
  function toJulian(name, year, month, day) {
    const t = table(name);
    const index = monthIndex(t, year, month);
    if (index < 0) return null;

    const start = t.starts[index];
    const length = t.starts[index + 1] - start;
    if (day < 1 || day > length) return null;
    return start + day - 1 + 0.5;
  }

  function daysInMonth(name, year, month) {
    const t = table(name);
    const index = monthIndex(t, year, month);
    return index < 0 ? null : t.starts[index + 1] - t.starts[index];
  }

  /** The years a table covers, for the settings hint. */
  function range(name) {
    const t = table(name);
    const months = t.starts.length - 2 + t.firstMonth;
    return { firstYear: t.firstYear, lastYear: t.firstYear + Math.floor(months / 12) };
  }

  return { MODES, has, getMode, setMode, fromJulian, toJulian, daysInMonth, range };
})();

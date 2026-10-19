/**
 * The fasting card's countdown helpers: a forbidden fast day is skipped, and
 * the Ayyam al-Beed row points at the permitted days of Dhu al-Hijjah.
 *
 * Ported from tests/fasting-forbidden-days.test.ps1. That file drove node from
 * PowerShell, which could not report a node failure, so a broken helper still
 * looked green.
 */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { loadSandbox } from "./harness.mjs";

const FILES = [
  "js/hijri.js",
  "js/praytimes.js",
  "js/islamic-day.js",
  "js/fasting.js",
];

function makeCard(settings = {}) {
  const sandbox = loadSandbox(FILES, {
    globals: { document: { getElementById: () => null } },
  });
  const FastingManager = vm.runInContext("FastingManager", sandbox);
  const HijriDate = vm.runInContext("HijriDate", sandbox);

  const hijri = new HijriDate();
  const manager = new FastingManager({ getSettings: () => settings }, hijri);

  return { hijri, manager };
}

/** The start of the Gregorian day that reads as this Hijri date. */
function startForHijri(manager, month, day, year = 1446) {
  return manager._startOfDay(manager._targetGregorianForHijri(year, month, day, 0));
}

test("Ayyam al-Beed skips the forbidden day of Dhu al-Hijjah", () => {
  const { manager } = makeCard();

  let item = manager._thirteenthCountdown(
    startForHijri(manager, 12, 8),
    { year: 1446, month: 12, day: 8 },
    0,
  );
  assert.equal(item.daysLeft, 6, "starts on the first permitted day");
  assert.equal(item.badge, "14-15 Dhu al-Hijjah", "13 Dhu al-Hijjah is omitted");

  item = manager._thirteenthCountdown(
    startForHijri(manager, 12, 13),
    { year: 1446, month: 12, day: 13 },
    0,
  );
  assert.equal(item.daysLeft, 1, "points at tomorrow's permitted fast");
  assert.equal(item.meta, "Tonight", "13 Dhu al-Hijjah is not shown as a fast today");

  item = manager._thirteenthCountdown(
    startForHijri(manager, 12, 14),
    { year: 1446, month: 12, day: 14 },
    0,
  );
  assert.equal(item.daysLeft, 0);
  assert.equal(item.meta, "Today");
});

test("forbidden fast days are forbidden, and the days around them are not", () => {
  const { manager } = makeCard();

  assert.equal(
    manager._fastingDateIsForbidden(startForHijri(manager, 12, 10), 0),
    true,
    "Eid al-Adha",
  );
  assert.equal(
    manager._fastingDateIsForbidden(startForHijri(manager, 12, 14), 0),
    false,
    "14 Dhu al-Hijjah",
  );
});

test("weekly fasts move when the coming week holds a forbidden day", () => {
  const { manager } = makeCard();
  const year = 1445;

  const onEid = manager._weekdayCountdown(
    startForHijri(manager, 12, 10, year),
    1,
    { year, month: 12, day: 10 },
    0,
  );
  assert.equal(onEid.daysLeft, 7, "Monday moves when today is Eid al-Adha");

  const skipsMonday = manager._weekdayCountdown(
    startForHijri(manager, 12, 9, year),
    1,
    { year, month: 12, day: 9 },
    0,
  );
  assert.equal(skipsMonday.daysLeft, 8, "Monday skips a forbidden Monday later this week");

  const skipsThursday = manager._weekdayCountdown(
    startForHijri(manager, 12, 8, year),
    4,
    { year, month: 12, day: 8 },
    0,
  );
  assert.equal(skipsThursday.daysLeft, 12, "Thursday skips a forbidden Thursday later this week");
});

test("a dated fast row shows its Hijri day and month", () => {
  const { manager } = makeCard();

  // 2 Mar 2026 is 13 Ramadan 1447; 26 May 2026 is 9 Dhu al-Hijjah 1447.
  assert.equal(
    manager._formatHijriDayMonth(manager._startOfDay(new Date(2026, 2, 2)), 0),
    "13 Ramadan",
  );
  assert.equal(
    manager._formatHijriDayMonth(manager._startOfDay(new Date(2026, 4, 26)), 0),
    "9 Dhu al-Hijjah",
  );
});

test("a week that holds no forbidden day answers without converting", () => {
  const { hijri, manager } = makeCard();

  const original = hijri.toHijri.bind(hijri);
  hijri.toHijri = () => {
    throw new Error("converted a target outside a forbidden week");
  };
  try {
    manager._weekdayCountdown(
      startForHijri(manager, 1, 1),
      4,
      { year: 1446, month: 1, day: 1 },
      0,
    );
  } finally {
    hijri.toHijri = original;
  }
});

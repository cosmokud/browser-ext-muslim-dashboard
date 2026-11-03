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
  "js/hijri-calendars.js",
  "js/hijri.js",
  "js/praytimes.js",
  "js/islamic-day.js",
  "js/settings-registry.js",
  "js/fasting.js",
  "js/calendar.js",
];

function makeCard(settings = {}, options = {}) {
  const sandbox = loadSandbox(FILES, {
    ...options,
    globals: { document: { getElementById: () => null } },
  });
  const FastingManager = vm.runInContext("FastingManager", sandbox);
  const HijriDate = vm.runInContext("HijriDate", sandbox);

  const hijri = new HijriDate();
  const manager = new FastingManager({ getSettings: () => settings });

  return { calendars: sandbox.HijriCalendars, hijri, manager };
}

/** The rows render() builds, without a DOM to paint them into. */
function renderRows(manager) {
  let items = null;
  manager._renderBars = (next) => {
    items = next;
  };
  manager.render();
  return items || [];
}

/**
 * The calendar's day cells, read back out of the markup renderDays writes.
 * Each cell carries the day number and the fast dots the stylesheet colours.
 */
function dayCells(html) {
  return String(html || "")
    .split(/<span class="calendar-day(?=[ "])/)
    .slice(1)
    .map((chunk) => ({
      classes: (chunk.match(/^([^"]*)"/) || [, ""])[1].trim(),
      day: Number((chunk.match(/calendar-day-number">(\d+)</) || [, 0])[1]),
      dots: [...chunk.matchAll(/calendar-fast-dot--([a-z0-9-]+)/g)].map(
        (match) => match[1],
      ),
      labels: [...chunk.matchAll(/data-fast-tooltip="([^"]*)"/g)].map(
        (match) => match[1],
      ),
    }));
}

/** A calendar whose elements are plain objects, so it can render without a browser. */
function makeCalendar(settings = {}, options = {}) {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      elements.set(id, { textContent: "", innerHTML: "", addEventListener() {} });
    }
    return elements.get(id);
  };

  const sandbox = loadSandbox(FILES, {
    ...options,
    globals: {
      addEventListener() {},
      document: { getElementById: element, querySelectorAll: () => [] },
    },
  });

  const calendar = new sandbox.CalendarManager(
    { getSettings: () => settings },
    new sandbox.HijriDate(),
  );
  calendar.init();

  const cellsOf = (year, month) => {
    calendar.viewingDate = new Date(year, month - 1, 15);
    calendar.render();
    return dayCells(element("calendarDays").innerHTML);
  };

  return { calendar, cellsOf, element };
}

/** The start of the Gregorian day that reads as this Hijri date. */
function startForHijri(manager, month, day, year = 1446) {
  return manager._islamicDay.dateFor({ year, month, day });
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
    manager._fastingDateIsForbidden(startForHijri(manager, 12, 10)),
    true,
    "Eid al-Adha",
  );
  assert.equal(
    manager._fastingDateIsForbidden(startForHijri(manager, 12, 14)),
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
    manager._formatHijriDayMonth(new Date(2026, 2, 2)),
    "13 Ramadan",
  );
  assert.equal(
    manager._formatHijriDayMonth(new Date(2026, 4, 26)),
    "9 Dhu al-Hijjah",
  );
});

test("a week that holds no forbidden day answers without converting", () => {
  const { hijri, manager } = makeCard();

  const converter = manager._islamicDay.hijri;
  const original = converter.toHijri.bind(converter);
  converter.toHijri = () => {
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
    converter.toHijri = original;
  }
});

test("the Ramadan row counts the month the converter has, not a fixed 29", () => {
  const { hijri, manager } = makeCard();
  const year = 1447;
  const length = hijri.getHijriDaysInMonth(year, 9);
  assert.equal(length, 30, "Ramadan 1447 runs 18 Feb to 19 Mar 2026");

  const now = manager._islamicDay.dateFor({ year, month: 9, day: 1 });
  const item = manager._ramadanCountdown(now, { year, month: 9, day: 1 });

  assert.equal(item.badge, `${length} Ramadan`);
  assert.equal(item.subtitle, `1st-${length}th of Ramadan (month 9)`);
  assert.equal(item.daysLeft, length - 1, "the month's own remaining days");
  assert.equal(item.totalDays, length, "the bar fills over the real month");
});

test("the row reads Last day on the month's real last day", () => {
  const { hijri, manager } = makeCard();
  const year = 1447;
  const length = hijri.getHijriDaysInMonth(year, 9);

  const row = (day) => {
    const now = manager._startOfDay(
      manager._islamicDay.dateFor({ year, month: 9, day }),
    );
    return manager._ramadanCountdown(now, { year, month: 9, day });
  };

  assert.equal(row(length - 1).meta, "Tonight", "one day left reads as tonight");
  assert.equal(row(length - 1).daysLeft, 1);
  assert.equal(row(length).meta, "Last day");
  assert.equal(row(length).daysLeft, 0);
});

test("a week of rows reads its dates from the day the settings give", () => {
  const rowsOn = (date) => {
    const { manager } = makeCard({}, { now: date });
    return renderRows(manager);
  };
  const row = (rows, key) => rows.find((item) => item.key === key);

  // 23 Mar 2026 is 4 Shawwal 1447, a Monday; 26 Mar is 7 Shawwal, a Thursday.
  const rows = rowsOn(new Date(2026, 2, 23, 8, 0));
  assert.equal(row(rows, "monday").badge, "4 Shawwal");
  assert.equal(
    row(rows, "monday").aria,
    "Monday fast (4 Shawwal): Today",
    "the row names the exact Hijri date it lands on",
  );
  assert.equal(row(rows, "monday").title, "Monday Fast");
  assert.equal(row(rows, "monday").subtitle, "Weekly Sunnah");
  assert.equal(row(rows, "thursday").badge, "7 Shawwal");
  assert.equal(row(rows, "thursday").aria, "Thursday fast (7 Shawwal): 3 days left");
  assert.equal(row(rows, "thursday").title, "Thursday Fast");
  assert.equal(row(rows, "thursday").subtitle, "Weekly Sunnah");

  const later = renderRows(makeCard({ hijriAdjustment: 2 }, { now: new Date(2026, 2, 23, 8, 0) }).manager);
  assert.equal(
    row(later, "monday").badge,
    "6 Shawwal",
    "the adjustment moves the date the row shows, not just the day it counts to",
  );
});

test("the forbidden check reads the day the Hijri adjustment gives", () => {
  const eid = new Date(2026, 4, 26);

  assert.equal(makeCard().manager._fastingDateIsForbidden(eid), false, "9 Dhu al-Hijjah");
  assert.equal(
    makeCard({ hijriAdjustment: 1 }).manager._fastingDateIsForbidden(eid, 1),
    true,
    "with +1 the 26th reads as 10 Dhu al-Hijjah, Eid al-Adha",
  );
});

test("the calendar marks the days fasting is not observed", () => {
  const { cellsOf } = makeCalendar({ calendarType: "gregorian" });
  const dots = (cells, day) => cells.find((cell) => cell.day === day)?.dots || [];

  const february = cellsOf(2026, 2);
  assert.deepEqual(dots(february, 17), [], "29 Sha'ban 1447");
  assert.deepEqual(dots(february, 18), ["ramadan"], "1 Ramadan 1447");

  const march = cellsOf(2026, 3);
  assert.deepEqual(dots(march, 19), ["ramadan"], "30 Ramadan");
  assert.deepEqual(dots(march, 20), ["no-fast-eid-fitr"], "1 Shawwal");
  assert.deepEqual(dots(march, 21), ["shawwal-window"], "2 Shawwal");
  assert.deepEqual(
    march.find((cell) => cell.day === 20).labels,
    ["No fasting: Eid al-Fitr (1 Shawwal)"],
  );

  const may = cellsOf(2026, 5);
  assert.deepEqual(
    dots(may, 25),
    ["dhu-hijjah-first-ten", "monday"],
    "8 Dhu al-Hijjah, a Monday",
  );
  assert.deepEqual(
    dots(may, 26),
    ["dhu-hijjah-first-ten", "arafah"],
    "9 Dhu al-Hijjah",
  );
  assert.deepEqual(dots(may, 27), ["no-fast-eid-adha"], "10 Dhu al-Hijjah");
  assert.deepEqual(dots(may, 28), ["no-fast-tashreeq"], "11 Dhu al-Hijjah");
  assert.deepEqual(dots(may, 29), ["no-fast-tashreeq"], "12 Dhu al-Hijjah");
  assert.deepEqual(dots(may, 30), ["no-fast-tashreeq"], "13 Dhu al-Hijjah");
  assert.deepEqual(
    may.find((cell) => cell.day === 30).labels,
    ["No fasting: Days of Tashreeq (11-13 Dhu al-Hijjah)"],
  );
  assert.deepEqual(dots(may, 31), ["white-days"], "14 Dhu al-Hijjah");
});

test("the calendar reads every day through the Hijri adjustment", () => {
  const dotsOn = (adjustment, year, month, day) => {
    const { cellsOf } = makeCalendar({
      calendarType: "gregorian",
      hijriAdjustment: adjustment,
    });
    const cell = cellsOf(year, month).find((entry) => entry.day === day);
    return cell?.dots || [];
  };

  assert.deepEqual(dotsOn(0, 2026, 3, 20), ["no-fast-eid-fitr"]);
  assert.deepEqual(
    dotsOn(1, 2026, 3, 19),
    ["no-fast-eid-fitr"],
    "+1 reads the 19th as 1 Shawwal",
  );
  assert.deepEqual(
    dotsOn(-1, 2026, 3, 21),
    ["no-fast-eid-fitr"],
    "-1 reads the 21st as 1 Shawwal",
  );
  assert.deepEqual(dotsOn(1, 2026, 2, 17), ["ramadan"], "+1 reads the 17th as 1 Ramadan");
  assert.deepEqual(dotsOn(-1, 2026, 2, 19), ["ramadan"], "-1 reads the 19th as 1 Ramadan");
  assert.deepEqual(dotsOn(1, 2026, 5, 27), ["no-fast-tashreeq"], "+1 makes the 27th Tashreeq");
  assert.deepEqual(dotsOn(-1, 2026, 5, 29), ["no-fast-tashreeq"], "-1 makes the 29th Tashreeq");
});

test("a Hijri month starts on the Gregorian day its own days read from", () => {
  const renderOn = (adjustment) => {
    const { element } = makeCalendar(
      { hijriAdjustment: adjustment },
      { now: new Date(2026, 4, 27, 9, 0) },
    );
    return {
      cells: dayCells(element("calendarDays").innerHTML),
      month: element("calendarMonth").textContent,
      year: element("calendarYear").textContent,
    };
  };

  // 27 May 2026 reads as 10 Dhu al-Hijjah; the day shift moves it either side.
  const ahead = renderOn(1);
  assert.equal(ahead.month, "Dhu al-Hijjah");
  assert.equal(ahead.year, "1447 AH");
  assert.equal(
    ahead.cells.filter((cell) => cell.classes === "empty").length,
    0,
    "1 Dhu al-Hijjah reads as Sunday 17 May, so the month starts in the first cell",
  );
  const aheadToday = ahead.cells.find((cell) => cell.classes.split(" ").includes("today"));
  assert.equal(aheadToday.day, 11, "+1 reads the 27th as 11 Dhu al-Hijjah");
  assert.deepEqual(aheadToday.dots, ["no-fast-tashreeq"]);

  const behind = renderOn(-1);
  assert.equal(
    behind.cells.filter((cell) => cell.classes === "empty").length,
    2,
    "1 Dhu al-Hijjah reads as Tuesday 19 May, so the month starts two cells in",
  );
  const behindToday = behind.cells.find((cell) => cell.classes.split(" ").includes("today"));
  assert.equal(behindToday.day, 9, "-1 reads the 27th as 9 Dhu al-Hijjah");
  assert.deepEqual(behindToday.dots, ["dhu-hijjah-first-ten", "arafah"]);
});

test("the calendar chosen in settings moves the day the card counts to", () => {
  const { calendars, hijri, manager } = makeCard();
  const iso = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const ramadanStart = () =>
    iso(manager._islamicDay.dateFor({ year: 1447, month: 9, day: 1 }));

  calendars.setMode("tabular");
  assert.equal(ramadanStart(), "2026-02-18", "the arithmetic calendar");
  assert.equal(hijri.getHijriDaysInMonth(1447, 8), 29, "Sha'ban is even, so 29");

  calendars.setMode("indonesia");
  assert.equal(ramadanStart(), "2026-02-19", "Kemenag announced 19 February");
  assert.equal(hijri.getHijriDaysInMonth(1447, 8), 30, "Sha'ban gained the day");

  calendars.setMode("ummAlQura");
  assert.equal(ramadanStart(), "2026-02-18", "Saudi Arabia began on 18 February");
});

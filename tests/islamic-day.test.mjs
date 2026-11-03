/**
 * Behaviour of the shared Islamic day module.
 *
 * Calendar dates are Umm al-Qura 1447 (islamicdates.org, ummalquracalendar.org,
 * and the Saudi Supreme Court announcement of 18 March 2026), not recomputed
 * from the code under test:
 *   1 Ramadan 1447     = Wed 18 Feb 2026
 *   1 Shawwal 1447     = Fri 20 Mar 2026   (Eid al-Fitr)
 *   9 Dhu al-Hijjah    = Tue 26 May 2026   (Arafah)
 *   10 Dhu al-Hijjah   = Wed 27 May 2026   (Eid al-Adha)
 *   13 Dhu al-Hijjah   = Sat 30 May 2026   (Days of Tashreeq)
 *
 * Known gap, not covered here: at the Muharram 1448 boundary this converter
 * reads one day behind the printed Umm al-Qura calendar (it calls 16 Jun 2026
 * 30 Dhu al-Hijjah, where Umm al-Qura prints 1 Muharram). The Muharram rows
 * below therefore use the app's own mapping, and test the rule, not the moon.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { loadSandbox, localDay } from "./harness.mjs";

const FILES = [
  "js/hijri-calendars.js",
  "js/hijri.js",
  "js/praytimes.js",
  "js/islamic-day.js",
];

const withDay = (settings = {}, options = {}) => {
  const sandbox = loadSandbox(FILES, options);
  return { sandbox, day: new sandbox.IslamicDay(settings) };
};

const jakarta = { latitude: -6.2, longitude: 106.8 };

test("reads the Islamic day of the local calendar date", () => {
  const { day } = withDay();

  assert.deepEqual(pick(day.dayFor(localDay(2026, 2, 18))), { year: 1447, month: 9, day: 1 });
  assert.deepEqual(pick(day.dayFor(localDay(2026, 3, 20))), { year: 1447, month: 10, day: 1 });
  assert.deepEqual(pick(day.dayFor(localDay(2026, 5, 26))), { year: 1447, month: 12, day: 9 });
  assert.deepEqual(pick(day.dayFor(localDay(2026, 5, 27))), { year: 1447, month: 12, day: 10 });
});

test("the day turns at local midnight, not at UTC midnight", () => {
  const { day } = withDay();

  const early = pick(day.dayFor(localDay(2026, 2, 18, 0, 5)));
  const late = pick(day.dayFor(localDay(2026, 2, 18, 23, 55)));
  const next = pick(day.dayFor(localDay(2026, 2, 19, 0, 5)));

  assert.deepEqual(early, { year: 1447, month: 9, day: 1 }, "00:05 local is still 1 Ramadan");
  assert.deepEqual(late, early, "23:55 local is the same Islamic day as 00:05 local");
  assert.deepEqual(next, { year: 1447, month: 9, day: 2 }, "00:05 local tomorrow is 2 Ramadan");
});

test("applies the user's Hijri adjustment before reading the day", () => {
  const { day } = withDay({ hijriAdjustment: -1 });

  // Reading "today" with a -1 adjustment is reading yesterday.
  assert.deepEqual(
    pick(day.dayFor(localDay(2026, 2, 19))),
    { year: 1447, month: 9, day: 1 },
    "19 Feb is 2 Ramadan, so -1 reads 1 Ramadan",
  );
  assert.deepEqual(
    pick(day.dayFor(localDay(2026, 2, 18))),
    pick(new (withDay().sandbox.IslamicDay)({}).dayFor(localDay(2026, 2, 17))),
    "the adjusted reading of the 18th is the plain reading of the 17th",
  );
});

test("names the fast of each kind of fasting day", () => {
  const { day } = withDay();

  assert.equal(fast(day, 2026, 2, 18)?.type, "ramadan");
  assert.equal(fast(day, 2026, 5, 26)?.type, "arafah", "9 Dhu al-Hijjah is Arafah");
  assert.equal(fast(day, 2026, 5, 19)?.type, "dhuAlHijjah", "2 Dhu al-Hijjah");
  assert.equal(fast(day, 2026, 3, 23)?.type, "monday", "4 Shawwal, a Monday");
  assert.equal(fast(day, 2026, 3, 26)?.type, "thursday", "7 Shawwal, a Thursday");
  assert.equal(fast(day, 2026, 4, 1)?.type, "ayyamAlBeed", "13 Shawwal");
  assert.equal(fast(day, 2026, 6, 25)?.type, "tasua", "this converter's 9 Muharram");
  assert.equal(fast(day, 2026, 6, 26)?.type, "ashura", "this converter's 10 Muharram");
  assert.equal(
    fast(day, 2026, 3, 2)?.type,
    "ramadan",
    "Ramadan outranks Ayyam al-Beed (13 Ramadan) and the weekday rules",
  );
});

test("knows the days fasting is prohibited, and never calls them fast days", () => {
  const { day } = withDay();

  assert.equal(prohibited(day, 2026, 3, 20)?.type, "eidAlFitr");
  assert.equal(prohibited(day, 2026, 5, 27)?.type, "eidAlAdha");
  assert.equal(prohibited(day, 2026, 5, 28)?.type, "tashreeq", "11 Dhu al-Hijjah");
  assert.equal(prohibited(day, 2026, 5, 30)?.type, "tashreeq", "13 Dhu al-Hijjah");

  assert.equal(fast(day, 2026, 3, 20), null, "Eid al-Fitr");
  assert.equal(fast(day, 2026, 5, 27), null, "Eid al-Adha");
  assert.equal(fast(day, 2026, 5, 28), null, "Tashreeq");
  assert.equal(fast(day, 2026, 5, 30), null, "Tashreeq outranks Ayyam al-Beed");
});

test("no day in three years is both prohibited and a fast", () => {
  const { day } = withDay();

  let checked = 0;
  for (let d = localDay(2026, 1, 1); d < localDay(2029, 1, 1); d.setDate(d.getDate() + 1)) {
    const on = localDay(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const hijriDay = day.dayFor(on);
    if (day.prohibitedFastFor(hijriDay)) {
      assert.equal(day.fastingDayFor(hijriDay), null, `${on.toDateString()} is prohibited`);
    }
    checked += 1;
  }
  assert.equal(checked, 1096);
});

test("prayer times come from the calculator configured by the snapshot", () => {
  const { day } = withDay({ calculationMethod: "MWL", timeFormat: "24h" });
  const { day: custom } = withDay({
    calculationMethod: "Custom",
    customFajrAngle: 20,
    timeFormat: "24h",
  });

  const date = localDay(2026, 2, 18);
  const mwl = day.timesFor(date, jakarta);
  const wider = custom.timesFor(date, jakarta);

  assert.match(mwl.fajr, /^\d{2}:\d{2}$/, "Fajr is a time of day");
  // A wider Fajr angle puts the sun deeper below the horizon, so Fajr is earlier.
  assert.ok(
    toMinutes(wider.fajr) < toMinutes(mwl.fajr),
    `Fajr at 20 degrees (${wider.fajr}) should be earlier than at MWL's 18 (${mwl.fajr})`,
  );
});

test("loads where window does not exist, as in a service worker", () => {
  const sandbox = loadSandbox(FILES, { window: false });

  assert.equal(typeof sandbox.window, "undefined");
  const day = new sandbox.IslamicDay({});
  assert.deepEqual(pick(day.dayFor(localDay(2026, 3, 20))), { year: 1447, month: 10, day: 1 });
  assert.equal(fast(day, 2026, 3, 20), null);
});

function pick(hijriDay) {
  return { year: hijriDay.year, month: hijriDay.month, day: hijriDay.day };
}

function fast(day, year, month, date) {
  return day.fastingDayFor(day.dayFor(localDay(year, month, date)));
}

function prohibited(day, year, month, date) {
  return day.prohibitedFastFor(day.dayFor(localDay(year, month, date)));
}

function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

test("maps an Islamic day back to the date that reads as it", () => {
  const on = { year: 1447, month: 12, day: 10 };

  for (const [adjustment, expected] of [
    [0, localDay(2026, 5, 27)],
    [1, localDay(2026, 5, 26)],
    [-1, localDay(2026, 5, 28)],
  ]) {
    const { day } = withDay({ hijriAdjustment: adjustment });
    const date = day.dateFor(on);

    assert.equal(
      date.toDateString(),
      expected.toDateString(),
      `adjustment ${adjustment} reads ${expected.toDateString()} as 10 Dhu al-Hijjah`,
    );
    assert.equal(date.getHours(), 0, "the date is the start of the local day");
    assert.deepEqual(pick(day.dayFor(date)), on, "and dayFor() reads it back");
  }
});

test("names the month and counts its days in the calendar the settings chose", () => {
  const { day } = withDay();

  assert.equal(day.monthName(9), "Ramadan");
  assert.equal(day.monthName(12), "Dhu al-Hijjah");
  assert.equal(day.monthName(1, "ar"), "محرم");
  assert.equal(day.daysInMonth(1447, 9), 30, "Ramadan 1447 runs 18 Feb to 19 Mar 2026");
});

test("tells whether a prohibited fast day falls inside the coming week", () => {
  const { day } = withDay();
  const within = (year, month, date, daysAhead) =>
    day.hasProhibitedFastWithin(day.dayFor(localDay(year, month, date)), daysAhead);

  assert.equal(within(2026, 5, 24, 6), true, "7 Dhu al-Hijjah reaches Eid al-Adha");
  assert.equal(within(2026, 5, 20, 3), false, "3 Dhu al-Hijjah plus three days stops short");
  assert.equal(within(2026, 3, 20, 6), true, "Eid al-Fitr is today");
  assert.equal(within(2026, 3, 22, 6), false, "3 Shawwal plus a week holds nothing prohibited");
  assert.equal(within(2026, 5, 29, 6), true, "12 Dhu al-Hijjah is still Tashreeq");
  assert.equal(within(2026, 5, 31, 6), false, "14 Dhu al-Hijjah plus a week leaves Tashreeq behind");
});

test("names the event the day falls on, and nothing on a plain day", () => {
  const { day } = withDay();

  assert.equal(day.eventFor(day.dayFor(localDay(2026, 3, 20)))?.name, "Eid al-Fitr");
  assert.equal(day.eventFor(day.dayFor(localDay(2026, 5, 26)))?.name, "Day of Arafah");
  assert.ok(!day.eventFor(day.dayFor(localDay(2026, 3, 23))), "4 Shawwal has no event");
  assert.ok(!day.eventFor(null), "no day, no event");
});

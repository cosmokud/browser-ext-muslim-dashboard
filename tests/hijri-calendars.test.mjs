/**
 * Which Islamic day is today, under each calendar.
 *
 * The anchors are published decisions, not values this code produces: Kemenag's
 * sidang isbat announcements for 1445-1447 and Saudi Arabia's official dates for
 * the same years. They are what tells a real calendar from an arithmetic one.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { loadSandbox } from "./harness.mjs";

function calendars() {
  const sandbox = loadSandbox(["js/hijri-calendars.js", "js/hijri.js"], {
    globals: {},
  });
  return {
    HijriCalendars: sandbox.HijriCalendars,
    hijri: new sandbox.HijriDate(),
  };
}

/** The calendar reads, the way the dashboard calls it. */
function hijriOn(hijri, iso) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = hijri.toHijri(new Date(year, month - 1, day));
  return `${date.year}-${date.month}-${date.day}`;
}

test("the tabular arithmetic is still the default and never moves", () => {
  const { HijriCalendars, hijri } = calendars();
  HijriCalendars.setMode("tabular");

  assert.equal(HijriCalendars.getMode(), "tabular");
  assert.equal(hijriOn(hijri, "2026-02-18"), "1447-9-1");
  assert.equal(hijriOn(hijri, "2026-06-17"), "1448-1-1");
});

test("Indonesia follows Kemenag's decisions, not Saudi Arabia's", () => {
  const { HijriCalendars, hijri } = calendars();
  HijriCalendars.setMode("indonesia");

  // 1 Ramadan 1447 was announced for Thursday 19 February 2026.
  assert.equal(hijriOn(hijri, "2026-02-18"), "1447-8-30");
  assert.equal(hijriOn(hijri, "2026-02-19"), "1447-9-1");
  // 1 Shawwal 1447: Eid al-Fitr on Saturday 21 March 2026.
  assert.equal(hijriOn(hijri, "2026-03-20"), "1447-9-30");
  assert.equal(hijriOn(hijri, "2026-03-21"), "1447-10-1");
  // 10 Dhu al-Hijjah 1447 (Eid al-Adha) on Wednesday 27 May 2026.
  assert.equal(hijriOn(hijri, "2026-05-27"), "1447-12-10");
  // Earlier years too: Eid al-Fitr 1445 was 10 April 2024, Ramadan 1446 began 1 March 2025.
  assert.equal(hijriOn(hijri, "2024-04-10"), "1445-10-1");
  assert.equal(hijriOn(hijri, "2025-03-01"), "1446-9-1");
});

test("Umm al-Qura follows the Saudi dates", () => {
  const { HijriCalendars, hijri } = calendars();
  HijriCalendars.setMode("ummAlQura");

  assert.equal(hijriOn(hijri, "2026-02-18"), "1447-9-1");
  assert.equal(hijriOn(hijri, "2026-03-20"), "1447-10-1");
  assert.equal(hijriOn(hijri, "2025-03-30"), "1446-10-1");
  assert.equal(hijriOn(hijri, "2025-06-06"), "1446-12-10");
  assert.equal(hijriOn(hijri, "2026-06-16"), "1448-1-1");
});

test("month lengths come from the calendar that answered the conversion", () => {
  const { HijriCalendars, hijri } = calendars();

  HijriCalendars.setMode("tabular");
  assert.equal(hijri.getHijriDaysInMonth(1447, 9), 30, "odd month, tabular");
  assert.equal(hijri.getHijriDaysInMonth(1447, 8), 29, "even month, tabular");

  HijriCalendars.setMode("indonesia");
  assert.equal(hijri.getHijriDaysInMonth(1447, 8), 30, "Sha'ban 1447 ran 30 days");
  assert.equal(hijri.getHijriDaysInMonth(1447, 9), 30, "Ramadan 1447 ran 30 days");
  assert.equal(hijri.getHijriDaysInMonth(1447, 10), 29);

  HijriCalendars.setMode("ummAlQura");
  assert.equal(hijri.getHijriDaysInMonth(1447, 9), 30);

  const start = hijri.hijriToJulian(1447, 10, 1) - hijri.hijriToJulian(1447, 9, 1);
  assert.equal(start, 30, "the round trip through the table agrees");
});

test("a date outside the table falls back to the arithmetic", () => {
  const { HijriCalendars, hijri } = calendars();
  HijriCalendars.setMode("indonesia");

  // The table starts in 1364 AH; 1300 is arithmetic territory.
  const early = hijri.toHijri(new Date(1882, 11, 1));
  assert.equal(early.year, 1300);
  assert.ok(hijri.getHijriDaysInMonth(1300, 5) > 0);
});

test("an unknown mode is refused rather than guessed", () => {
  const { HijriCalendars } = calendars();
  assert.equal(HijriCalendars.setMode("islamic-civil"), "tabular");
  assert.equal(HijriCalendars.setMode("indonesia"), "indonesia");
  assert.equal(HijriCalendars.setMode(undefined), "tabular");
});

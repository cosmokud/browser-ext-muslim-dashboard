/**
 * The suhur alert, asserted through the service worker's real scheduling path
 * with a stubbed platform. This is the symptom users see: the reminder missing
 * on the first morning of Ramadan and arriving on Eid morning.
 *
 * Dates are Umm al-Qura 1447: 1 Ramadan = Wed 18 Feb 2026,
 * 1 Shawwal = Fri 20 Mar 2026, 9 Dhu al-Hijjah = Tue 26 May 2026.
 */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { loadSandbox, localDay, makeChrome } from "./harness.mjs";

const FASTING_ALARM = "md_fasting_suhur";
const JAKARTA = { latitude: -6.2, longitude: 106.8 };

/** Alert settings with only the named fast types switched on. */
function settingsFor(on) {
  const all = {
    monday: false,
    thursday: false,
    ayyamAlBeed: false,
    ashuraDays: false,
    dhuAlHijjah: false,
    arafah: false,
    ramadan: false,
  };
  for (const type of on) all[type] = true;

  return {
    calculationMethod: "MWL",
    timeFormat: "24h",
    locationMethod: "manual",
    ...JAKARTA,
    city: "Jakarta",
    fasting: {
      notifications: { enabled: true, minutesBefore: 60, notify: all },
    },
  };
}

/** Runs the worker's scheduler with the clock set to the given local morning. */
async function runScheduler({ now, on }) {
  // The worker reads its own mirrored copy of settings from chrome.storage.
  const { chrome, calls, state } = makeChrome({
    stored: { md_settings: settingsFor(on), md_lastLocation: null },
  });
  const worker = loadSandbox(["js/service-worker.js"], {
    window: false,
    now,
    globals: { chrome },
  });

  await worker.scheduleFastingNotifications();

  return {
    status: state.md_fasting_status,
    suhurAlarms: calls.alarmsCreated.filter((a) => a.name === FASTING_ALARM),
  };
}

test("schedules the suhur alert on the first morning of Ramadan", async () => {
  const { status, suhurAlarms } = await runScheduler({
    now: localDay(2026, 2, 18, 3, 0),
    on: ["ramadan"],
  });

  assert.equal(suhurAlarms.length, 1, "one suhur alert is scheduled");
  assert.equal(status.date, "2026-02-18", "for the local day, 18 Feb");
  assert.equal(status.fastingLabel, "Ramadan (month 9)");
});

test("does not schedule a suhur alert on Eid morning", async () => {
  const { status, suhurAlarms } = await runScheduler({
    now: localDay(2026, 3, 20, 3, 0),
    on: ["ramadan"],
  });

  assert.equal(suhurAlarms.length, 0, "1 Shawwal 1447 is not a fasting day");
  assert.equal(status.fastingDay, false);
  assert.equal(status.date, "2026-03-20");
});

test("names the day it schedules for, and keeps 60 minutes before Fajr", async () => {
  const { status } = await runScheduler({
    now: localDay(2026, 5, 26, 3, 0),
    on: ["arafah", "dhuAlHijjah"],
  });

  assert.equal(status.fastingLabel, "Day of Arafah (9 Dhu al-Hijjah)");
  assert.equal(status.minutesBefore, 60);
  assert.equal(
    minutesBetween(status.fajrTime, status.suhurNotificationTime),
    60,
    "the reminder sits 60 minutes before the Fajr it was computed from",
  );
});

test("does not schedule a suhur alert when notifications are off", async () => {
  const settings = settingsFor(["ramadan"]);
  settings.fasting.notifications.enabled = false;

  const { chrome, calls, state } = makeChrome({
    stored: { md_settings: settings, md_lastLocation: null },
  });
  const worker = loadSandbox(["js/service-worker.js"], {
    window: false,
    now: localDay(2026, 2, 18, 3, 0),
    globals: { chrome },
  });
  await worker.scheduleFastingNotifications();

  assert.equal(calls.alarmsCreated.filter((a) => a.name === FASTING_ALARM).length, 0);
  assert.equal(state.md_fasting_status.enabled, false);
});

/** Minutes between a local "HH:MM" Fajr and the recorded ISO suhur time. */
function minutesBetween(fajrTime, suhurIso) {
  const [hours, minutes] = String(fajrTime).split(":").map(Number);
  const fajr = localDay(
    new Date(suhurIso).getFullYear(),
    new Date(suhurIso).getMonth() + 1,
    new Date(suhurIso).getDate(),
    hours,
    minutes,
  );
  return Math.round((fajr.getTime() - new Date(suhurIso).getTime()) / 60000);
}

test("the worker's fallback location is a coordinate example, not a fixed city", () => {
  const worker = loadSandbox(["js/service-worker.js"], {
    window: false,
    globals: { chrome: makeChrome().chrome },
  });

  const fallback = vm.runInContext("pickLocation({}, null)", worker);
  assert.equal(fallback.latitude, 40.7128);
  assert.equal(fallback.longitude, -74.006);
  assert.equal(fallback.city, "Coordinate Example", "not a fixed city such as Mecca");

  const manual = vm.runInContext(
    'pickLocation({ locationMethod: "manual", latitude: 1.5, longitude: 2.5, city: "Custom" }, null)',
    worker,
  );
  assert.deepEqual(
    [manual.latitude, manual.longitude, manual.city],
    [1.5, 2.5, "Custom"],
    "a manually chosen place still wins",
  );

  const last = vm.runInContext(
    'pickLocation({}, { latitude: 3, longitude: 4, city: "Last" })',
    worker,
  );
  assert.equal(last.city, "Last", "and so does the last known place");
});

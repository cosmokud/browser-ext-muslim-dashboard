import test from "node:test";
import assert from "node:assert/strict";
import { loadSandbox } from "./harness.mjs";

function clock() {
  const sandbox = loadSandbox(["js/debug-clock.js"], {
    globals: { Date: FixedDateFor("2026-10-20T09:41:17.250") },
  });
  return sandbox.DebugClock;
}

// A Date whose "now" is a fixed instant, so the real-second passthrough is
// deterministic.
function FixedDateFor(iso) {
  const fixed = new Date(iso).getTime();
  return class FixedDate extends Date {
    constructor(...args) {
      if (args.length === 0) {
        super(fixed);
        return;
      }
      super(...args);
    }

    static now() {
      return fixed;
    }
  };
}

test("a date the calendar does not have is refused", () => {
  const DebugClock = clock();

  assert.equal(DebugClock.normalizeDateYMD("2026-02-30"), "");
  assert.equal(DebugClock.normalizeDateYMD("2026-13-01"), "");
  assert.equal(DebugClock.normalizeDateYMD("nonsense"), "");
  assert.equal(DebugClock.normalizeDateYMD("2026-02-18"), "2026-02-18");
});

test("a time outside the day is refused", () => {
  const DebugClock = clock();

  assert.equal(DebugClock.normalizeTimeHM("24:00"), "");
  assert.equal(DebugClock.normalizeTimeHM("02:60"), "");
  assert.equal(DebugClock.normalizeTimeHM("02:00"), "02:00");
  assert.equal(DebugClock.normalizeTimeHM("2:00"), "02:00");
  assert.equal(DebugClock.normalizeTimeHM(""), "");
});

test("the simulated instant is the stored date at the stored time", () => {
  const DebugClock = clock();

  const instant = new Date(
    DebugClock.now("2026-02-18", "02:00"),
  );

  assert.equal(instant.getFullYear(), 2026);
  assert.equal(instant.getMonth(), 1);
  assert.equal(instant.getDate(), 18, "the date is the 18th, not the 17th");
  assert.equal(instant.getHours(), 2);
  assert.equal(instant.getMinutes(), 0);
  assert.equal(instant.getSeconds(), 17, "real seconds keep countdowns ticking");
});

test("without a time the real time of day is kept", () => {
  const DebugClock = clock();

  const instant = new Date(DebugClock.now("2026-02-18"));

  assert.equal(instant.getDate(), 18);
  assert.equal(instant.getHours(), 9, "09:41 real time");
  assert.equal(instant.getMinutes(), 41);
});

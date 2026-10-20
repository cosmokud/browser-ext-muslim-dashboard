/**
 * Load-time seam: boot the page's own script list, in the order index.html
 * loads it, inside a sandbox with a stub DOM. Catches what a per-module test
 * cannot: a script that is missing from a page, a global that no longer exists,
 * a cross-file call that only breaks when everything runs together.
 *
 * Nothing here simulates a browser; the stub only has to be boring enough that
 * each script's load-time code runs to the end.
 */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import path from "node:path";
import { bootPage } from "./harness.mjs";

const REQUIRED = {
  "index.html": [
    "DebugClock",
    "Modes",
    "QuranCopy",
    "QuranSearch",
    "QuranRecitation",
    "QuranArabic",
    "IslamicDay",
    "HijriCalendars",
    "HijriDate",
    "SettingsRegistry",
    "StorageManager",
    "GridLayoutManager",
    "MuslimDashboard",
  ],
  "popup.html": [
    "SettingsRegistry",
    "StorageManager",
    "ThemeManager",
    "HijriCalendars",
  ],
};

for (const page of Object.keys(REQUIRED)) {
  test(`${page}: every script runs to the end and defines what the next one needs`, () => {
    const context = bootPage(page);

    for (const name of REQUIRED[page]) {
      assert.notEqual(
        vm.runInContext(`typeof ${name}`, context),
        "undefined",
        `${name} is not defined after loading the page's scripts`,
      );
    }
  });
}

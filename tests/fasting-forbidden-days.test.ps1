$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$scriptPath = Join-Path ([System.IO.Path]::GetTempPath()) "fasting-forbidden-days-test.js"

@'
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = process.argv[2];

function loadClass(relativePath, className) {
  const source = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
  const sandbox = {
    console,
    document: { getElementById: () => null },
    window: {},
    requestAnimationFrame: (fn) => fn(),
  };
  vm.runInNewContext(`${source}\nglobalThis.${className} = ${className};`, sandbox);
  return sandbox[className];
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

const HijriDate = loadClass("js/hijri.js", "HijriDate");
const FastingManager = loadClass("js/fasting.js", "FastingManager");

const hijri = new HijriDate();
const manager = new FastingManager({ getSettings: () => ({}) }, hijri);
const year = 1446;
const adjustment = 0;

function startForHijri(month, day, targetYear = year) {
  return manager._startOfDay(manager._targetGregorianForHijri(targetYear, month, day, adjustment));
}

let item = manager._thirteenthCountdown(
  startForHijri(12, 8),
  { year, month: 12, day: 8 },
  adjustment,
);
assertEqual(item.daysLeft, 6, "Ayyam al-Beed in Dhu al-Hijjah should start on the first permitted day.");
assertEqual(item.badge, "14-15 Dhu al-Hijjah", "Ayyam al-Beed badge should omit forbidden 13 Dhu al-Hijjah.");

item = manager._thirteenthCountdown(
  startForHijri(12, 13),
  { year, month: 12, day: 13 },
  adjustment,
);
assertEqual(item.daysLeft, 1, "13 Dhu al-Hijjah should point to tomorrow's permitted Ayyam al-Beed fast.");
assertEqual(item.meta, "Tonight", "13 Dhu al-Hijjah should not be shown as a fast today.");
assertEqual(item.badge, "14-15 Dhu al-Hijjah", "13 Dhu al-Hijjah should keep the adjusted permitted range badge.");

item = manager._thirteenthCountdown(
  startForHijri(12, 14),
  { year, month: 12, day: 14 },
  adjustment,
);
assertEqual(item.daysLeft, 0, "14 Dhu al-Hijjah should show Ayyam al-Beed as today.");
assertEqual(item.meta, "Today", "14 Dhu al-Hijjah should be fastable today.");

assertEqual(
  manager._fastingDateIsForbidden(startForHijri(12, 10), adjustment),
  true,
  "Eid al-Adha should be forbidden for fasting rows.",
);
assertEqual(
  manager._fastingDateIsForbidden(startForHijri(12, 14), adjustment),
  false,
  "14 Dhu al-Hijjah should remain permitted.",
);

let monday = manager._weekdayCountdown(
  startForHijri(12, 10, 1445),
  1,
  { year: 1445, month: 12, day: 10 },
  adjustment,
);
assertEqual(monday.daysLeft, 7, "Monday Fast should move to next Monday when today is Eid al-Adha.");

monday = manager._weekdayCountdown(
  startForHijri(12, 9, 1445),
  1,
  { year: 1445, month: 12, day: 9 },
  adjustment,
);
assertEqual(monday.daysLeft, 8, "Monday Fast should skip a forbidden Monday later this week.");

const thursday = manager._weekdayCountdown(
  startForHijri(12, 8, 1445),
  4,
  { year: 1445, month: 12, day: 8 },
  adjustment,
);
assertEqual(thursday.daysLeft, 12, "Thursday Fast should skip a forbidden Thursday later this week.");

const originalToHijri = hijri.toHijri.bind(hijri);
hijri.toHijri = () => {
  throw new Error("Unexpected forbidden-day target conversion outside forbidden week.");
};
try {
  manager._weekdayCountdown(
    startForHijri(1, 1),
    4,
    { year, month: 1, day: 1 },
    adjustment,
  );
} finally {
  hijri.toHijri = originalToHijri;
}
'@ | Set-Content -Path $scriptPath -Encoding UTF8

try {
  node $scriptPath $repoRoot
} finally {
  Remove-Item -Path $scriptPath -ErrorAction SilentlyContinue
}

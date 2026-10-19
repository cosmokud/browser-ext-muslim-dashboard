/**
 * Wiring: a page that asks a module for something must load it first, and the
 * module that owns a state must be its only writer. The Islamic-day side is
 * covered by the page-order test and the service worker's scheduling test;
 * the mode side by the mode module's own tests.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { loadSandbox, localDay, repoRoot } from "./harness.mjs";

const PAGES = ["index.html", "popup.html"];
const CONSUMERS = [
  "js/prayertimes.js",
  "js/fasting.js",
  "js/calendar.js",
  "js/app.js",
  "js/popup.js",
];
const NEEDED_BEFORE = ["js/praytimes.js", "js/hijri.js", "js/islamic-day.js"];
const MODULE_FILES = ["js/hijri.js", "js/praytimes.js", "js/islamic-day.js"];
const MODE_CONSUMERS = [
  "js/app.js",
  "js/gridlayout.js",
  "js/floating.js",
  "js/moment.js",
];
const MODE_CLASSES = [
  "quran-focus-mode",
  "moment-mode",
  "sidebar-mode",
  "grid-edit-mode",
];

function scriptSrcs(page) {
  const html = readFileSync(path.join(repoRoot, page), "utf8");
  return [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(
    (match) => match[1],
  );
}

test("a page loads the module before the code that asks it for a day", () => {
  for (const page of PAGES) {
    const srcs = scriptSrcs(page);
    const consumer = srcs.findIndex((src) => CONSUMERS.includes(src));
    if (consumer < 0) continue;

    for (const needed of NEEDED_BEFORE) {
      const at = srcs.indexOf(needed);
      assert.ok(at >= 0, `${page} never loads ${needed}`);
      assert.ok(
        at < consumer,
        `${page} loads ${needed} after ${srcs[consumer]}, which uses it`,
      );
    }
  }
});

test("a page loads the mode module before the code that reads modes from it", () => {
  for (const page of PAGES) {
    const srcs = scriptSrcs(page);
    const consumers = MODE_CONSUMERS.filter((file) => srcs.includes(file));
    if (consumers.length === 0) continue;

    const at = srcs.indexOf("js/modes.js");
    assert.ok(at >= 0, `${page} never loads js/modes.js`);

    for (const consumer of consumers) {
      assert.ok(
        at < srcs.indexOf(consumer),
        `${page} loads js/modes.js after ${consumer}, which reads modes from it`,
      );
    }
  }
});

test("the mode module is the only writer of the mode classes", () => {
  const writers = [];

  for (const file of readdirSync(path.join(repoRoot, "js"))) {
    if (!file.endsWith(".js") || file === "modes.js") continue;
    const source = readFileSync(path.join(repoRoot, "js", file), "utf8");
    const pattern = new RegExp(
      `body\\.classList\\.(?:add|remove|toggle)\\(\\s*"(${MODE_CLASSES.join("|")})"`,
      "g",
    );

    for (const match of source.matchAll(pattern)) {
      writers.push(`js/${file} writes ${match[1]}`);
    }
  }

  assert.deepEqual(writers, [], "body classes belong to the mode module");
});

test("the calculator the pages configure is the module's", () => {
  const sandbox = loadSandbox(MODULE_FILES);
  const calculator = new sandbox.IslamicDay({
    calculationMethod: "ISNA",
    asrMethod: "Hanafi",
    adjustments: { fajr: 3 },
    timeFormat: "12h",
  }).calculator();

  assert.equal(typeof calculator.methods?.MWL?.params, "object", "method tables, as the popup reads them");
  assert.equal(calculator.calcMethod, "ISNA");
  assert.equal(calculator.methods?.ISNA?.params?.fajr, 15, "the method table is intact");
  assert.equal(calculator.methods.ISNA.params.isha, 15);
  assert.equal(calculator.setting.asr, "Hanafi", "the Asr method is applied");
  assert.equal(calculator.adjustments.fajr, 3, "tune offsets are applied");
});

test("the card can label every prohibited day the module reports", () => {
  const sandbox = loadSandbox([...MODULE_FILES, "js/fasting.js"]);
  const tooltips = vm.runInContext("FORBIDDEN_TOOLTIPS", sandbox);
  const day = new sandbox.IslamicDay({});

  const types = new Set();
  for (
    let d = localDay(2026, 1, 1);
    d < localDay(2029, 1, 1);
    d.setDate(d.getDate() + 1)
  ) {
    const on = localDay(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const prohibited = day.prohibitedFastFor(day.dayFor(on));
    if (prohibited) types.add(prohibited.type);
  }

  assert.deepEqual(
    [...types].sort(),
    ["eidAlAdha", "eidAlFitr", "tashreeq"],
    "three kinds of prohibited day in three years",
  );
  for (const type of types) {
    assert.ok(
      typeof tooltips[type] === "string" && tooltips[type].length > 0,
      `the card has no tooltip for ${type}`,
    );
  }
});

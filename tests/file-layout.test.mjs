/**
 * File layout: no script grows past a readable size, and no script exists
 * without a page that loads it. The size limit is what keeps a feature file
 * honest; the wiring check is what catches a file that is written but never
 * loaded. The split convention itself is declared in tests/harness.mjs.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { jsFiles, repoRoot } from "./harness.mjs";

const LIMIT = 2000;

// One DOMContentLoaded closure with 283 captured bindings, 28 of them mutable.
// Splitting it is a feature extraction (prayer panel, blur panel, reader panel),
// not a file move: the parts would not share the closure's state.
const EXEMPT = {
  "js/popup.js": "one closure holding 283 captured bindings",
};

const pages = ["index.html", "popup.html", "offscreen.html"];
const worker = "js/service-worker.js";

test("no script grows past the limit", () => {
  const oversized = [];
  for (const relPath of jsFiles()) {
    const lines = readFileSync(path.join(repoRoot, relPath), "utf8").split("\n").length;
    if (lines > LIMIT && !EXEMPT[relPath]) {
      oversized.push(`${relPath} (${lines} lines)`);
    }
  }

  assert.deepEqual(
    oversized,
    [],
    `split these at method boundaries, the way js/settings.js is split:\n${oversized.join("\n")}`,
  );
});

test("every script is loaded by a page or the worker", () => {
  const sources = pages
    .map((page) => readFileSync(path.join(repoRoot, page), "utf8"))
    .concat(readFileSync(path.join(repoRoot, worker), "utf8"));

  const unloaded = jsFiles().filter(
    (relPath) => relPath !== worker && !sources.some((source) => source.includes(`"${relPath}"`)),
  );

  assert.deepEqual(
    unloaded,
    [],
    `these scripts exist but nothing loads them:\n${unloaded.join("\n")}`,
  );
});

test("the exempt file is still the file that needs the exemption", () => {
  for (const relPath of Object.keys(EXEMPT)) {
    const lines = readFileSync(path.join(repoRoot, relPath), "utf8").split("\n").length;
    assert.ok(
      lines > LIMIT,
      `${relPath} is ${lines} lines now: drop it from EXEMPT`,
    );
  }
});

// Four copies of this pattern and this walk drifted apart once already; a
// convention with two readers is two conventions. Import from tests/harness.mjs.
test("only the harness reads the script-tag pattern", () => {
  // Split so this file does not match its own rule.
  const scriptTag = "<script" + ' src=';
  const offenders = readdirSync(path.join(repoRoot, "tests"))
    .filter((name) => name.endsWith(".mjs") && name !== "harness.mjs")
    .filter((name) =>
      readFileSync(path.join(repoRoot, "tests", name), "utf8").includes(scriptTag),
    );

  assert.deepEqual(
    offenders,
    [],
    `read scripts through tests/harness.mjs instead of scanning HTML:\n${offenders.join("\n")}`,
  );
});

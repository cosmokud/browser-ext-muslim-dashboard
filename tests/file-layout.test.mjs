/**
 * File layout: no script grows past a readable size, and no script exists
 * without a page that loads it.
 *
 * A class split across files lives in `<name>/`: `index.js` declares it and one
 * file per feature adds its methods, all of them loaded in index.html order.
 * The size limit is what keeps a feature file honest; the wiring check is what
 * catches a file that is written but never loaded.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { repoRoot } from "./harness.mjs";

const LIMIT = 2000;

// One DOMContentLoaded closure with 283 captured bindings, 28 of them mutable.
// Splitting it is a feature extraction (prayer panel, blur panel, reader panel),
// not a file move: the parts would not share the closure's state.
const EXEMPT = {
  "js/popup.js": "one closure holding 283 captured bindings",
};

const pages = ["index.html", "popup.html", "offscreen.html"];
const worker = "js/service-worker.js";

function scripts(dir = "js") {
  const out = [];
  for (const name of readdirSync(path.join(repoRoot, dir))) {
    const relPath = `${dir}/${name}`;
    if (statSync(path.join(repoRoot, relPath)).isDirectory()) {
      if (name === "vendor") continue;
      out.push(...scripts(relPath));
      continue;
    }
    if (name.endsWith(".js")) out.push(relPath);
  }
  return out;
}

test("no script grows past the limit", () => {
  const oversized = [];
  for (const relPath of scripts()) {
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

  const unloaded = scripts().filter(
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

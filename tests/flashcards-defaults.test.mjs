/**
 * Flashcards default sets loading:
 * - Default sets are fetched concurrently in parallel
 * - AbortError from navigation or cancellation is silenced without logging errors
 * - Fetch failures fall back cleanly with console.warn, never crashing with console.error
 * - Malformed definitions and empty CSVs are handled safely
 */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { loadSandbox, withParts } from "./harness.mjs";

function setupFlashcards({ fetchImpl } = {}) {
  const warnings = [];
  const errors = [];
  const storage = {
    get: () => [],
    set: () => {},
  };

  const sandbox = loadSandbox(
    withParts(["js/base-manager.js", "js/flashcards.js"]),
    {
      globals: {
        console: {
          ...console,
          warn: (...args) => warnings.push(args),
          error: (...args) => errors.push(args),
        },
        fetch: fetchImpl || (async () => ({
          ok: true,
          status: 200,
          text: async () => "q1,a1\nq2,a2",
        })),
      },
    },
  );

  const FlashcardManager = vm.runInContext("FlashcardManager", sandbox);
  const manager = Object.create(FlashcardManager.prototype);
  manager.storage = storage;
  manager.defaultSets = [];
  manager.getActiveSetId = () => null;
  manager.setActiveSetId = () => {};
  manager.getSets = () => manager.defaultSets || [];
  manager.isProtectedSetId = () => true;

  return { manager, sandbox, FlashcardManager, warnings, errors };
}

test("ensureDefaultSet loads default sets concurrently in parallel", async () => {
  const activeFetches = [];
  let maxConcurrent = 0;

  const { manager } = setupFlashcards({
    fetchImpl: async (url) => {
      activeFetches.push(url);
      maxConcurrent = Math.max(maxConcurrent, activeFetches.length);
      await new Promise((r) => setTimeout(r, 10));
      activeFetches.splice(activeFetches.indexOf(url), 1);
      return {
        ok: true,
        status: 200,
        text: async () => "term|definition\nword|meaning",
      };
    },
  });

  await manager.ensureDefaultSet();

  assert.ok(maxConcurrent > 1, `fetches ran in parallel (max concurrent: ${maxConcurrent})`);
  assert.equal(manager.defaultSets.length, 3);
  for (const set of manager.defaultSets) {
    assert.equal(set.cards.length, 2);
  }
});

test("loadDefaultSet suppresses AbortError silently without logging errors or warnings", async () => {
  const { manager, warnings, errors } = setupFlashcards({
    fetchImpl: async () => {
      const abortError = new Error("The user aborted a request.");
      abortError.name = "AbortError";
      throw abortError;
    },
  });

  const result = await manager.loadDefaultSet({
    id: "default_test",
    name: "Test Set",
    file: "data/flashcard_test.csv",
    parser: "csv",
  });

  assert.equal(errors.length, 0, "no console.error on AbortError");
  assert.equal(warnings.length, 0, "no console.warn on AbortError");
  assert.equal(result.cards.length, 0, "fallback to empty cards");
  assert.equal(result.id, "default_test");
});

test("loadDefaultSet handles network/HTTP errors with console.warn and empty cards", async () => {
  const { manager, warnings, errors } = setupFlashcards({
    fetchImpl: async () => ({
      ok: false,
      status: 404,
      text: async () => "Not Found",
    }),
  });

  const result = await manager.loadDefaultSet({
    id: "default_test",
    name: "Test Set",
    file: "data/flashcard_missing.csv",
    parser: "csv",
  });

  assert.equal(errors.length, 0, "no console.error logged");
  assert.equal(warnings.length, 1, "warning logged instead of error");
  assert.equal(result.cards.length, 0);
  assert.equal(result.id, "default_test");
});

test("loadDefaultSet guards against null, undefined, or missing file definition", async () => {
  const { manager, warnings, errors } = setupFlashcards();

  const resNull = await manager.loadDefaultSet(null);
  assert.equal(resNull.cards.length, 0);

  const resUndefined = await manager.loadDefaultSet(undefined);
  assert.equal(resUndefined.cards.length, 0);

  const resNoFile = await manager.loadDefaultSet({ id: "empty" });
  assert.equal(resNoFile.cards.length, 0);

  assert.equal(errors.length, 0);
  assert.equal(warnings.length, 0);
});

test("parseCsv safely handles null, undefined, and empty string", () => {
  const { manager } = setupFlashcards();

  assert.equal(manager.parseCsv(null).length, 0);
  assert.equal(manager.parseCsv(undefined).length, 0);
  assert.equal(manager.parseCsv("").length, 0);
  assert.deepEqual(
    Array.from(manager.parseCsv("a,b\nc,d")).map((row) => Array.from(row)),
    [["a", "b"], ["c", "d"]],
  );
});

test("ensureDefaultSets aliases ensureDefaultSet for parity with other managers", async () => {
  const { manager } = setupFlashcards();
  assert.equal(typeof manager.ensureDefaultSets, "function");
});

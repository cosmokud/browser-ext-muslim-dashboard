/**
 * StorageManager owns a prefix, so it owns the keys under it: keys() lists
 * them, clear() reaches them, and the raw sticky-note keys written before the
 * prefix moved in and are dropped.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { loadSandbox } from "./harness.mjs";

/** Entries are own enumerable properties, as in a real Storage object. */
function makeLocalStorage(entries = {}) {
  const storage = { ...entries };
  Object.defineProperties(storage, {
    getItem: { value: (key) => (key in storage ? storage[key] : null) },
    setItem: {
      value: (key, value) => {
        storage[key] = String(value);
      },
    },
    removeItem: {
      value: (key) => {
        delete storage[key];
      },
    },
  });
  return storage;
}

function bootStorage(entries) {
  const localStorage = makeLocalStorage(entries);
  const sandbox = loadSandbox(["js/storage.js"], { globals: { localStorage } });
  return { localStorage, storage: new sandbox.StorageManager() };
}

/** Prototype, not constructor: init() wants a DOM these cases do not. */
function bootStickyNotes(entries) {
  const localStorage = makeLocalStorage(entries);
  const sandbox = loadSandbox(
    [
      "js/storage.js",
      "js/stickynotes/index.js",
      "js/stickynotes/visibility.js",
    ],
    { globals: { localStorage } },
  );
  const storage = new sandbox.StorageManager();
  const sticky = Object.create(sandbox.StickyNotesManager.prototype);
  Object.assign(sticky, { storage, notes: [], isVisible: true, maxZIndex: 1000 });
  return { localStorage, storage, sticky };
}

const plain = (value) => JSON.parse(JSON.stringify(value));

test("keys() lists an owned key and ignores a foreign one", () => {
  const { storage } = bootStorage({ someoneElse_key: "{}" });
  storage.set("notes", []);

  assert.deepEqual(plain(storage.keys()), ["notes"]);
});

test("clear() removes a key written through set()", () => {
  const { storage } = bootStorage();
  storage.set("notes", []);
  storage.set("settings", { theme: { name: "emerald" } });

  storage.clear();

  assert.deepEqual(plain(storage.keys()), []);
  assert.equal(storage.get("notes", null), null);
});

test("a legacy raw sticky note list is adopted, then cleared with the prefix", () => {
  const legacyNotes = [{ id: "n1", zIndex: 1005, text: "remember this" }];
  const { storage, localStorage, sticky } = bootStickyNotes({
    stickyNotes: JSON.stringify(legacyNotes),
  });

  sticky.loadNotes();

  assert.deepEqual(plain(sticky.notes), legacyNotes);
  assert.equal(localStorage.stickyNotes, undefined);
  assert.deepEqual(plain(storage.keys()), ["stickyNotes"]);

  storage.clear();

  assert.equal(storage.get("stickyNotes", null), null);
});

test("the legacy visibility flag is adopted as a boolean, not as a string", () => {
  const { storage, localStorage, sticky } = bootStickyNotes({
    stickyNotesVisible: "false",
  });

  sticky.loadNotes();

  assert.equal(sticky.isVisible, false);
  assert.equal(localStorage.stickyNotesVisible, undefined);
  assert.equal(storage.get("stickyNotesVisible", null), false);
});

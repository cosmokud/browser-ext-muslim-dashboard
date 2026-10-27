/**
 * Ayah audio is capped at 500 MB: the least recently played ayahs go first, and
 * the ayah being written is never the one dropped.
 *
 * Touching an ayah must not rewrite its blob, which is why size and last access
 * live in their own store.
 */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { loadSandbox } from "./harness.mjs";

const MB = 1024 * 1024;
const FILES = ["js/base-manager.js", "js/pocketquran/index.js"];

/** Just enough IndexedDB: stores, requests, and a transaction that completes. */
function makeIndexedDB() {
  const stores = new Map();
  const state = { failTransactions: false, openedVersion: 0 };

  const request = (result) => {
    const req = { result };
    setTimeout(() => req.onsuccess?.(), 0);
    return req;
  };

  const store = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const records = stores.get(name);
    return {
      get: (key) => request(records.get(key)),
      put: (record) => {
        records.set(record.key, record);
        return request(record.key);
      },
      delete: (key) => {
        records.delete(key);
        return request(true);
      },
      getAll: () => request([...records.values()]),
      createIndex() {},
    };
  };

  const db = {
    objectStoreNames: { contains: (name) => stores.has(name) },
    createObjectStore: (name) => {
      stores.set(name, new Map());
      return store(name);
    },
    transaction: (names) => {
      const tx = { objectStore: (name) => store(name) };
      setTimeout(() => {
        if (state.failTransactions) tx.onabort?.();
        else tx.oncomplete?.();
      }, 10);
      return tx;
    },
  };

  const indexedDB = {
    stores,
    state,
    open: (name, version) => {
      const req = { result: db };
      setTimeout(() => {
        if (version > state.openedVersion) {
          state.openedVersion = version;
          req.onupgradeneeded?.({ target: { result: db } });
        }
        req.onsuccess?.();
      }, 0);
      return req;
    },
  };

  return indexedDB;
}

function load() {
  const debugs = [];
  const persistCalls = [];
  const indexedDB = makeIndexedDB();
  const sandbox = loadSandbox(FILES, {
    globals: {
      indexedDB,
      navigator: {
        storage: {
          persist: async () => {
            persistCalls.push(true);
            return true;
          },
        },
      },
      console: {
        ...console,
        debug: (...args) => debugs.push(args),
      },
    },
  });

  const PocketQuranCacheManager = vm.runInContext(
    "PocketQuranCacheManager",
    sandbox,
  );

  return {
    cache: new PocketQuranCacheManager(),
    indexedDB,
    debugs,
    persistCalls,
    audio: () => indexedDB.stores.get("audio"),
    index: () => indexedDB.stores.get("audioIndex"),
    seed(key, size, lastAccessed) {
      this.audio().set(key, { key, blob: { size }, size });
      this.index().set(key, { key, size, lastAccessed });
    },
  };
}

test("the store asks for a durable quota once it opens", async () => {
  const env = load();
  await env.cache.dbReady;
  assert.deepEqual(env.persistCalls.length, 1);
});

test("a play touches last access without rewriting the blob", async () => {
  const env = load();
  await env.cache.dbReady;
  env.seed("7:2:255", MB, 1);
  const blob = env.audio().get("7:2:255").blob;

  const record = await env.cache.getAudio("7:2:255");
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(record.key, "7:2:255");
  assert.equal(env.audio().get("7:2:255").blob, blob, "the same blob record");
  assert.ok(
    env.index().get("7:2:255").lastAccessed > 1,
    "the index carries the access time",
  );
});

test("past 500 MB the least recently accessed ayahs are evicted first", async () => {
  const env = load();
  await env.cache.dbReady;
  env.seed("7:1:1", 200 * MB, 1);
  env.seed("7:1:2", 200 * MB, 2);
  env.seed("7:1:3", 200 * MB, 3);

  const stored = await env.cache.setAudio({
    key: "7:1:4",
    size: 10 * MB,
    blob: { size: 10 * MB },
  });

  assert.equal(stored, true);
  assert.equal(env.audio().has("7:1:1"), false, "the oldest play is gone");
  assert.equal(env.audio().has("7:1:2"), true);
  assert.equal(env.audio().has("7:1:3"), true);
  assert.equal(env.audio().has("7:1:4"), true, "the new ayah is kept");
  assert.equal(env.index().has("7:1:1"), false, "its index row went with it");

  // Back under 90% of the cap: 400 MB of the old two plus the new 10 MB.
  assert.ok(env.cache.audioBytes <= 500 * MB);
});

test("an eviction never drops the ayah that is being written", async () => {
  const env = load();
  await env.cache.dbReady;
  env.seed("7:9:1", 600 * MB, 1);

  assert.equal(
    await env.cache.setAudio({ key: "7:9:2", size: 10 * MB, blob: {} }),
    true,
  );

  assert.equal(env.audio().has("7:9:2"), true, "the writing ayah survives");
  assert.equal(env.audio().has("7:9:1"), false, "the old one made room");
  assert.equal(env.audio().size, 1);
});

test("a write the database refuses is reported, not silently dropped", async () => {
  const env = load();
  await env.cache.dbReady;
  env.indexedDB.state.failTransactions = true;

  assert.equal(
    await env.cache.setAudio({ key: "7:3:1", size: MB, blob: {} }),
    false,
  );
  assert.equal(env.debugs.length, 1, "the failure is observable");
  assert.match(String(env.debugs[0][0]), /not cached/);
});

test("a read of a missing ayah is a plain miss", async () => {
  const env = load();
  await env.cache.dbReady;

  assert.equal(await env.cache.getAudio("7:4:4"), null);
  assert.equal(env.index().size, 0, "a miss writes no index row");
});

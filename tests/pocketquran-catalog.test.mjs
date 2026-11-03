/**
 * The chapter and reciter catalog: one cache read, one fetch, one write, and
 * the same week-long TTL the three call sites used to repeat. A stale list is
 * still worth showing when the network fails, so that path must not throw.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { loadSandbox } from "./harness.mjs";

const CHAPTERS = [
  { id: 1, name_simple: "Al-Fatihah", name_arabic: "الفاتحة", verses_count: 7 },
];
const RECITERS = [{ id: 7, name: "Mishary Rashid Alafasy", style: "" }];
const STALE = 1000 * 60 * 60 * 24 * 8;

// Values built inside the sandbox carry its Object prototype; compare plain
// JSON so the assert stays about content.
const plain = (value) => JSON.parse(JSON.stringify(value));

function makeStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    data,
    get: (key, fallback = null) => (data.has(key) ? data.get(key) : fallback),
    set: (key, value) => data.set(key, value),
  };
}

function load({ storage = makeStorage(), jsonCache = null, responses = {} } = {}) {
  const calls = [];
  const sandbox = loadSandbox(["js/pocketquran/catalog.js"], {
    globals: {
      AbortController,
      fetch: async (url) => {
        calls.push(url);
        const body = responses[url];
        if (body instanceof Error) throw body;
        return { ok: true, status: 200, json: async () => body };
      },
    },
  });

  return {
    calls,
    storage,
    Catalog: sandbox.PocketQuranCatalog,
    catalog: new sandbox.PocketQuranCatalog(storage, { jsonCache }),
  };
}

test("a fresh cached list answers without touching the network", async () => {
  const url = "https://api.quran.com/api/v4/chapters?language=en";
  const { catalog, calls } = load({
    storage: makeStorage({
      pocketQuran_chapters_cache: CHAPTERS,
      pocketQuran_chapters_cache_at: Date.now() - 1000,
    }),
    responses: { [url]: { chapters: [] } },
  });

  assert.deepEqual(plain(await catalog.chapters()), CHAPTERS);
  assert.deepEqual(calls, []);
});

test("a stale cached list is refetched once and rewritten with its timestamp", async () => {
  const url = "https://api.quran.com/api/v4/chapters?language=en";
  const staleAt = Date.now() - STALE;
  const fresh = [
    { id: 2, name_simple: "Al-Baqarah", name_arabic: "البقرة", verses_count: 286 },
  ];
  const { catalog, calls, storage } = load({
    storage: makeStorage({
      pocketQuran_chapters_cache: CHAPTERS,
      pocketQuran_chapters_cache_at: staleAt,
    }),
    responses: { [url]: { chapters: fresh } },
  });

  assert.deepEqual(plain(await catalog.chapters()), fresh);
  assert.equal(calls.length, 1);
  assert.deepEqual(plain(storage.data.get("pocketQuran_chapters_cache")), fresh);
  assert.ok(storage.data.get("pocketQuran_chapters_cache_at") > staleAt);
});

test("a failed fetch falls back to the stale cache instead of throwing", async () => {
  const url = "https://api.quran.com/api/v4/chapters?language=en";
  const { catalog, calls } = load({
    storage: makeStorage({
      pocketQuran_chapters_cache: CHAPTERS,
      pocketQuran_chapters_cache_at: Date.now() - STALE,
    }),
    responses: { [url]: new Error("offline") },
  });

  assert.deepEqual(plain(await catalog.chapters()), CHAPTERS);
  assert.equal(calls.length, 1);
});

test("the normalisers drop a row whose id is not a number", async () => {
  const chaptersUrl = "https://api.quran.com/api/v4/chapters?language=en";
  const recitersUrl =
    "https://api.quran.com/api/v4/resources/recitations?language=en";
  const { catalog } = load({
    responses: {
      [chaptersUrl]: {
        chapters: [
          { id: "one", name_simple: "Broken" },
          { id: 2, name_simple: "Al-Baqarah", verses_count: 286 },
        ],
      },
      [recitersUrl]: {
        recitations: [{ id: null, reciter_name: "Broken" }, ...RECITERS],
      },
    },
  });

  assert.deepEqual(plain(await catalog.chapters()), [
    { id: 2, name_simple: "Al-Baqarah", name_arabic: "", verses_count: 286 },
  ]);
  assert.deepEqual(plain(await catalog.reciters()), RECITERS);
});

test("a hit in the JSON cache answers without the network", async () => {
  const requested = [];
  const jsonCache = {
    getJson: async (url) => {
      requested.push(url);
      return { chapters: CHAPTERS };
    },
    setJson: async () => {
      throw new Error("a cache hit must not be rewritten");
    },
  };
  const { catalog, calls } = load({ jsonCache });

  assert.deepEqual(plain(await catalog.chapters()), CHAPTERS);
  assert.equal(requested.length, 1);
  assert.deepEqual(calls, []);
});

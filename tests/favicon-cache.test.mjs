/**
 * The favicon cache remembers what it could not fetch, downloads a URL import
 * once, and never grows past its cap.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { loadSandbox } from "./harness.mjs";

const FALLBACK_ICON = "chrome-extension://stub/icons/icon32.png";
const PAGE_URL = "https://example.com/some/page";

function makeLocalStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear(),
    key: (index) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  };
}

/** One store, async callbacks, and `getAll` for the prune. */
function makeIndexedDB() {
  const records = new Map();
  const respond = (result) => {
    const request = { result };
    setTimeout(() => request.onsuccess?.(), 0);
    return request;
  };

  const store = {
    get: (key) => respond(records.get(key)),
    put: (record) => {
      records.set(record.key, record);
      return respond(true);
    },
    delete: (key) => {
      records.delete(key);
      return respond(true);
    },
    getAll: () => respond([...records.values()]),
  };
  const db = { transaction: () => ({ objectStore: () => store }) };

  return {
    records,
    open: () => {
      const request = { result: db };
      setTimeout(() => request.onsuccess?.(), 0);
      return request;
    },
  };
}

/** A FileReader that turns our fake blobs into a data URL, as a page does. */
class FakeFileReader {
  readAsDataURL(blob) {
    this.result = `data:image/png;base64,${blob.data}`;
    setTimeout(() => this.onload?.(), 0);
  }
}

const CHROME = {
  runtime: { getURL: (assetPath) => `chrome-extension://stub/${assetPath}` },
};

function load({ indexedDB = makeIndexedDB(), fetch, chrome = CHROME } = {}) {
  const fetchCalls = [];
  const sandbox = loadSandbox(["js/faviconcache.js"], {
    globals: {
      URL,
      FileReader: FakeFileReader,
      localStorage: makeLocalStorage(),
      indexedDB,
      // `chrome: false` leaves the API out of the sandbox entirely.
      ...(chrome === false ? {} : { chrome }),
      fetch: async (url, options) => {
        fetchCalls.push({ url, options });
        return fetch(url, options);
      },
    },
  });

  return {
    manager: new sandbox.FaviconCacheManager(),
    FaviconCacheManager: sandbox.FaviconCacheManager,
    indexedDB,
    fetchCalls,
  };
}

const wait = () => new Promise((resolve) => setTimeout(resolve, 20));

test("a failed fetch shows the bundled icon, never the Google URL", async () => {
  const deadFetch = async () => {
    throw new Error("no network");
  };
  const first = load({ fetch: deadFetch });

  const shown = await first.manager.fetchAndCache(PAGE_URL, "pinned", false);
  assert.equal(shown, FALLBACK_ICON, "the icon the extension already ships");
  assert.doesNotMatch(shown, /google\.com\/s2/);
  assert.equal(first.fetchCalls.length, 1);

  const key = first.manager._getCacheKey(PAGE_URL, "pinned");
  assert.equal(first.indexedDB.records.get(key)?.failure, true);

  // A later tab, same store: the marker is read and nothing is fetched.
  const second = load({ indexedDB: first.indexedDB, fetch: deadFetch });
  assert.equal(
    await second.manager.fetchAndCache(PAGE_URL, "pinned", false),
    FALLBACK_ICON,
    "the remembered failure renders the same local icon",
  );
  assert.doesNotMatch(FALLBACK_ICON, /google\.com\/s2/);
  assert.equal(second.fetchCalls.length, 0, "no request within the TTL");

  // A forced refresh is the user asking: it does try again.
  await second.manager.fetchAndCache(PAGE_URL, "pinned", true);
  assert.equal(second.fetchCalls.length, 1);
});

test("without chrome.runtime the fallback is a plain bundled path", async () => {
  const env = load({
    chrome: false,
    fetch: async () => {
      throw new Error("no network");
    },
  });

  assert.equal(
    await env.manager.fetchAndCache(PAGE_URL, "pinned", false),
    "icons/icon32.png",
  );
});

test("the failure marker expires after 24 hours", async () => {
  const env = load({
    fetch: async () => ({ ok: true, status: 200, blob: async () => ({ size: 0 }) }),
  });
  const key = env.manager._getCacheKey(PAGE_URL, "pinned");

  // An empty body counts as a failure too.
  assert.equal(
    await env.manager.fetchAndCache(PAGE_URL, "pinned", false),
    FALLBACK_ICON,
  );
  assert.equal(env.indexedDB.records.get(key)?.failure, true);

  env.indexedDB.records.set(key, {
    ...env.indexedDB.records.get(key),
    timestamp: Date.now() - env.FaviconCacheManager.FAILURE_TTL_MS - 1000,
  });

  await env.manager.fetchAndCache(PAGE_URL, "pinned", false);
  assert.equal(env.fetchCalls.length, 2, "an expired marker is a miss");
});

test("a successful fetch overwrites the failure marker", async () => {
  const env = load({
    fetch: async () => ({
      ok: true,
      status: 200,
      blob: async () => ({ size: 4, data: "aWNvbg==" }),
    }),
  });
  const key = env.manager._getCacheKey(PAGE_URL, "pinned");

  await env.manager._setFailure(PAGE_URL, "pinned");
  assert.equal(env.indexedDB.records.get(key)?.failure, true);

  const dataUrl = await env.manager.fetchAndCache(PAGE_URL, "pinned", true);
  assert.match(dataUrl, /^data:image\/png;base64,/);
  assert.equal(env.indexedDB.records.get(key)?.failure, undefined);
  assert.equal(env.indexedDB.records.get(key).dataUrl, dataUrl);
});

test("the store is capped at 300 records, the oldest going first", async () => {
  const env = load();
  const { FaviconCacheManager } = env;

  for (let i = 0; i < FaviconCacheManager.MAX_ENTRIES + 5; i += 1) {
    env.indexedDB.records.set(`pinned:site-${i}.example`, {
      key: `pinned:site-${i}.example`,
      url: `https://site-${i}.example/`,
      dataUrl: "data:image/png;base64,b2xk",
      type: "pinned",
      isCustom: false,
      timestamp: i + 1,
    });
  }

  assert.equal(await env.manager._pruneToCap(), true);
  assert.equal(env.indexedDB.records.size, FaviconCacheManager.MAX_ENTRIES);
  assert.equal(
    env.indexedDB.records.has("pinned:site-0.example"),
    false,
    "the oldest record is gone",
  );
  assert.equal(
    env.indexedDB.records.has("pinned:site-5.example"),
    true,
    "everything at or above the cap stays",
  );

  assert.equal(await env.manager._pruneToCap(), false, "nothing left to drop");
});

test("a write triggers the prune, and a user's own icon survives it", async () => {
  const env = load();
  const { FaviconCacheManager } = env;
  const customKey = "pinned:mine.example";
  env.indexedDB.records.set(customKey, {
    key: customKey,
    url: "https://mine.example/",
    dataUrl: "data:image/png;base64,bWluZQ==",
    type: "pinned",
    isCustom: true,
    timestamp: 0,
  });

  for (let i = 0; i < FaviconCacheManager.MAX_ENTRIES; i += 1) {
    env.indexedDB.records.set(`pinned:old-${i}.example`, {
      key: `pinned:old-${i}.example`,
      dataUrl: "data:image/png;base64,b2xk",
      type: "pinned",
      isCustom: false,
      timestamp: i + 1,
    });
  }

  await env.manager.setCached("https://new.example/", "data:image/png;base64,bmV3");
  await wait();

  const autoRecords = [...env.indexedDB.records.values()].filter(
    (record) => record.isCustom !== true,
  );
  assert.equal(
    autoRecords.length,
    FaviconCacheManager.MAX_ENTRIES,
    "the new record replaced the oldest instead of growing the store",
  );
  assert.equal(env.indexedDB.records.has(customKey), true, "custom icon kept");
  assert.equal(
    env.indexedDB.records.has("pinned:old-0.example"),
    false,
    "the oldest auto-fetched icon made room",
  );
});

test("a URL import is downloaded once and stored as a data URL", async () => {
  const env = load({
    fetch: async () => ({
      ok: true,
      status: 200,
      blob: async () => ({ size: 4, data: "aW1wb3J0" }),
    }),
  });
  const pageUrl = "https://mine.example/";
  const imported = await env.manager.importFromImageUrl(
    "cdn.example/icon.png",
    pageUrl,
    "pinned",
  );

  assert.match(imported, /^data:image\/png;base64,/);
  assert.equal(
    env.fetchCalls[0].url,
    "https://cdn.example/icon.png",
    "the normalized remote URL is what was downloaded",
  );
  assert.equal(
    await env.manager.getCached(pageUrl, "pinned"),
    imported,
    "a later tab reads it from the cache with no request",
  );
  assert.equal(await env.manager.isCustomFavicon(pageUrl, "pinned"), true);
});

test("an import that cannot be downloaded keeps the remote URL", async () => {
  const env = load({
    fetch: async () => {
      throw new Error("no network");
    },
  });

  assert.equal(
    await env.manager.importFromImageUrl("https://cdn.example/icon.png", "https://mine.example/"),
    "https://cdn.example/icon.png",
  );
  assert.equal(
    await env.manager.getCached("https://mine.example/", "pinned"),
    null,
    "nothing unusable was cached",
  );
});

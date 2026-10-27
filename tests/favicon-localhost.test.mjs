/**
 * Local hosts: Google's favicon service answers a localhost with a globe, so a
 * local URL resolves through Chrome's own favicon cache instead and Google is
 * never asked at all.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { loadSandbox } from "./harness.mjs";

const EXTENSION_FAVICON = "chrome-extension://stub/_favicon/";
const LOCAL_URL = "http://localhost:20128/dashboard/usage";
const CHROME = {
  runtime: { getURL: (assetPath) => `chrome-extension://stub${assetPath}` },
};

function localFaviconUrl(pageUrl, size = 32) {
  return `${EXTENSION_FAVICON}?pageUrl=${encodeURIComponent(pageUrl)}&size=${size}`;
}

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

/** Just enough IndexedDB for the cache manager: one store, async callbacks. */
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

function load({ chrome = CHROME, indexedDB = makeIndexedDB() } = {}) {
  const fetchCalls = [];
  const sandbox = loadSandbox(["js/faviconcache.js"], {
    globals: {
      URL,
      localStorage: makeLocalStorage(),
      indexedDB,
      fetch: async (...args) => {
        fetchCalls.push(args);
        throw new Error("a local favicon must not touch the network");
      },
      // `chrome: false` leaves the API out of the sandbox entirely.
      ...(chrome === false ? {} : { chrome }),
    },
  });

  return {
    FaviconCacheManager: sandbox.FaviconCacheManager,
    manager: new sandbox.FaviconCacheManager(),
    indexedDB,
    fetchCalls,
  };
}

test("a local host resolves to Chrome's favicon cache, page URL intact", () => {
  const { FaviconCacheManager } = load();

  for (const pageUrl of [
    LOCAL_URL,
    "http://127.0.0.1:8080/",
    "http://[::1]:3000/x",
  ]) {
    assert.equal(FaviconCacheManager.isLocalUrl(pageUrl), true, pageUrl);
    assert.equal(
      FaviconCacheManager.getLocalFaviconUrl(pageUrl),
      localFaviconUrl(pageUrl),
      pageUrl,
    );
  }
});

test("a local template is recognised without parsing as a page URL", () => {
  const { FaviconCacheManager } = load();

  assert.doesNotThrow(() =>
    FaviconCacheManager.isLocalUrl("http://localhost:3000/search?q=%s"),
  );
  assert.equal(
    FaviconCacheManager.isLocalUrl("http://localhost:3000/search?q=%s"),
    true,
  );
  assert.equal(FaviconCacheManager.isLocalUrl("not a url"), false);
  assert.equal(FaviconCacheManager.isLocalUrl(""), false);
  assert.equal(FaviconCacheManager.isLocalUrl(null), false);
  assert.equal(FaviconCacheManager.isLocalUrl("http://mylocalhost.example/"), false);
  assert.equal(FaviconCacheManager.isLocalUrl("http://192.168.1.10/"), false);
});

test("a public site keeps the Google service URL, never the extension one", () => {
  const { FaviconCacheManager, manager } = load();
  const displayUrl = manager.getDisplayUrl("https://example.com/x");

  assert.equal(FaviconCacheManager.isLocalUrl("https://example.com/x"), false);
  assert.equal(FaviconCacheManager.getLocalFaviconUrl("https://example.com/x"), null);
  assert.match(displayUrl, /^https:\/\/www\.google\.com\/s2\/favicons\?/);
  assert.doesNotMatch(displayUrl, /_favicon/);
});

test("a local host is never sent to Google and never fetched", async () => {
  const { manager, fetchCalls } = load();

  assert.equal(manager._getFaviconServiceUrl(LOCAL_URL, 256), null);
  assert.doesNotMatch(manager.getDisplayUrl(LOCAL_URL), /google\.com/);

  const fetched = await manager.fetchAndCache(LOCAL_URL, "pinned", true);
  assert.equal(fetched, localFaviconUrl(LOCAL_URL));
  assert.match(fetched, /\/_favicon\/\?/);
  assert.doesNotMatch(fetched, /google\.com/);

  const shown = await manager.getFaviconUrl(LOCAL_URL, "pinned", false);
  assert.equal(shown, localFaviconUrl(LOCAL_URL));
  assert.equal(fetchCalls.length, 0, "nothing was downloaded");
});

test("a globe cached before this change loses to the extension URL", async () => {
  const { manager, indexedDB } = load();
  const staleKey = manager._getCacheKey(LOCAL_URL, "pinned");

  indexedDB.records.set(staleKey, {
    key: staleKey,
    url: LOCAL_URL,
    dataUrl: "data:image/png;base64,Z2xvYmU=",
    type: "pinned",
    isCustom: false,
    timestamp: 1,
  });

  assert.equal(await manager.getCached(LOCAL_URL, "pinned"), null, "stale icon hidden");
  assert.equal(
    await manager.fetchAndCache(LOCAL_URL, "pinned", false),
    localFaviconUrl(LOCAL_URL),
  );
  assert.equal(indexedDB.records.has(staleKey), false, "stale record dropped");
});

test("a favicon the user set on a local host is still shown", async () => {
  const { manager, indexedDB } = load();
  const key = manager._getCacheKey(LOCAL_URL, "pinned");
  const customIcon = "data:image/png;base64,bWluZQ==";

  indexedDB.records.set(key, {
    key,
    url: LOCAL_URL,
    dataUrl: customIcon,
    type: "pinned",
    isCustom: true,
    timestamp: 1,
  });

  assert.equal(await manager.getCached(LOCAL_URL, "pinned"), customIcon);
  assert.equal(await manager.fetchAndCache(LOCAL_URL, "pinned", true), customIcon);
  assert.equal(indexedDB.records.has(key), true, "custom record kept");
});

test("without chrome.runtime.getURL a local host degrades to null", async () => {
  for (const chrome of [false, {}]) {
    const { FaviconCacheManager, manager, fetchCalls } = load({ chrome });

    assert.equal(FaviconCacheManager.getLocalFaviconUrl(LOCAL_URL), null);
    assert.equal(await manager.fetchAndCache(LOCAL_URL, "pinned", true), null);
    assert.equal(await manager.getFaviconUrl(LOCAL_URL, "pinned", false), null);
    assert.equal(fetchCalls.length, 0);
  }
});

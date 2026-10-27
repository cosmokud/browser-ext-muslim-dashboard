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

const SEARCH_FILES = [
  "js/base-manager.js",
  "js/faviconcache.js",
  "js/searchbar/index.js",
  "js/searchbar/init.js",
  "js/searchbar/strip.js",
  "js/searchbar/colors.js",
  "js/searchbar/context-menu.js",
];

function load({
  chrome = CHROME,
  indexedDB = makeIndexedDB(),
  files = ["js/faviconcache.js"],
} = {}) {
  const fetchCalls = [];
  const sandbox = loadSandbox(files, {
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
    sandbox,
    FaviconCacheManager: sandbox.FaviconCacheManager,
    manager: new sandbox.FaviconCacheManager(),
    indexedDB,
    fetchCalls,
  };
}

/** The real storage load, on a manager shell instead of a full page boot. */
function makeSearchManager({ records = [], indexedDB = makeIndexedDB() } = {}) {
  const loaded = load({ indexedDB, files: SEARCH_FILES });
  loaded.sandbox.faviconCache = loaded.manager;

  const storage = {
    list: records.map((record) => ({ ...record })),
    saves: [],
    getCustomSearches() {
      return this.list;
    },
    saveCustomSearches(searches) {
      const copy = JSON.parse(JSON.stringify(searches));
      this.saves.push(copy);
      this.list = copy;
    },
    getLastCustomSearchId: () => null,
    saveLastCustomSearchId: () => {},
  };

  const manager = Object.create(loaded.sandbox.SearchBarManager.prototype);
  manager.searches = [];
  manager.selectedId = null;
  manager.scrollIndex = 0;
  manager.storage = storage;

  const renders = [];
  manager.render = () => {
    renders.push(manager.searches.map((engine) => ({ ...engine })));
  };

  let sweep = null;
  const dropStale = manager._dropStaleLocalEngineIcons;
  manager._dropStaleLocalEngineIcons = function (...args) {
    sweep = dropStale.call(this, ...args);
    return sweep;
  };

  return {
    manager,
    storage,
    faviconCache: loaded.manager,
    indexedDB,
    fetchCalls: loaded.fetchCalls,
    renders,
    async load() {
      sweep = null;
      manager.loadFromStorage();
      if (sweep) await sweep;
    },
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

test("a stored local engine loses Google's favicon and stale icon in one save", async () => {
  const googleFavicon =
    "https://www.google.com/s2/favicons?domain_url=http%3A%2F%2Flocalhost%3A20128%2F&sz=256";
  const staleIcon = "data:image/png;base64,Z2xvYmU=";
  const env = makeSearchManager({
    records: [
      {
        id: "local",
        name: "Local",
        url: LOCAL_URL,
        favicon: googleFavicon,
        cachedFavicon: staleIcon,
        accentRgb: null,
        accentRgbSource: "favicon",
        faviconDominantRgb: null,
      },
    ],
  });
  const key = env.faviconCache._getCacheKey(LOCAL_URL, "search");
  env.indexedDB.records.set(key, {
    key,
    url: LOCAL_URL,
    dataUrl: staleIcon,
    type: "search",
    isCustom: false,
    timestamp: 1,
  });

  await env.load();

  const engine = env.manager.searches[0];
  assert.equal(engine.favicon, localFaviconUrl(LOCAL_URL));
  assert.match(engine.favicon, /\/_favicon\/\?/);
  assert.equal(engine.cachedFavicon, null);
  assert.equal(env.storage.saves.length, 1);
  assert.equal(env.storage.saves[0][0].cachedFavicon, null);
  assert.equal(env.indexedDB.records.has(key), false);
  assert.equal(env.renders.length, 1);
  assert.equal(env.fetchCalls.length, 0, "nothing was downloaded");

  // Reloading the cleaned record must not save or render again.
  await env.load();
  assert.equal(env.storage.saves.length, 1);
  assert.equal(env.renders.length, 1);
});

test("a stored local engine keeps an icon the user set", async () => {
  const customIcon = "data:image/png;base64,bWluZQ==";
  const env = makeSearchManager({
    records: [
      {
        id: "local",
        name: "Local",
        url: LOCAL_URL,
        favicon: localFaviconUrl(LOCAL_URL),
        cachedFavicon: customIcon,
        accentRgb: null,
        accentRgbSource: "favicon",
        faviconDominantRgb: null,
      },
    ],
  });
  const key = env.faviconCache._getCacheKey(LOCAL_URL, "search");
  env.indexedDB.records.set(key, {
    key,
    url: LOCAL_URL,
    dataUrl: customIcon,
    type: "search",
    isCustom: true,
    timestamp: 1,
  });

  await env.load();

  assert.equal(env.manager.searches[0].cachedFavicon, customIcon);
  assert.equal(env.indexedDB.records.has(key), true, "custom record kept");
  assert.equal(env.storage.saves.length, 0);
  assert.equal(env.renders.length, 0);
  assert.equal(env.fetchCalls.length, 0);
});

test("a stored public engine is untouched and still points at Google", async () => {
  const googleFavicon =
    "https://www.google.com/s2/favicons?domain_url=https%3A%2F%2Fexample.com%2F&sz=256";
  const env = makeSearchManager({
    records: [
      {
        id: "public",
        name: "Web",
        url: "https://example.com/search?q=%s",
        favicon: googleFavicon,
        cachedFavicon: null,
        accentRgb: null,
        accentRgbSource: "favicon",
        faviconDominantRgb: null,
      },
    ],
  });

  await env.load();

  const engine = env.manager.searches[0];
  assert.equal(engine.favicon, googleFavicon);
  assert.equal(engine.cachedFavicon, null);
  assert.equal(env.storage.saves.length, 0);
  assert.equal(env.renders.length, 0);
  assert.equal(env.fetchCalls.length, 0);
});

/**
 * Bundled package files are read from the HTTP cache, once per extension
 * version. The version rides on the request URL, so an update changes the URL
 * and the stale entry can never be served.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { loadSandbox } from "./harness.mjs";

const CHROME = {
  runtime: {
    getURL: (assetPath) => `chrome-extension://stub/${assetPath}`,
    getManifest: () => ({ version: "2.4.1" }),
  },
};

function load(chrome = CHROME) {
  const calls = [];
  const sandbox = loadSandbox(["js/base-manager.js"], {
    globals: {
      ...(chrome === false ? {} : { chrome }),
      fetch: async (url, options) => {
        calls.push({ url, options });
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true }),
          text: async () => "text",
        };
      },
    },
  });

  return { manager: new sandbox.BaseManager(), calls };
}

test("a bundled JSON file is asked for once per version, from the HTTP cache", async () => {
  const { manager, calls } = load();

  const json = await manager.fetchJsonResource("data/adhkar.json");
  assert.equal(json.ok, true, "the payload still arrives");
  assert.equal(
    calls[0].url,
    "chrome-extension://stub/data/adhkar.json?v=2.4.1",
  );
  assert.equal(calls[0].options.cache, "force-cache");
});

test("a bundled text file gets the same versioned, cacheable request", async () => {
  const { manager, calls } = load();

  assert.equal(await manager.fetchTextResource("data/changelog.txt"), "text");
  assert.equal(
    calls[0].url,
    "chrome-extension://stub/data/changelog.txt?v=2.4.1",
  );
  assert.equal(calls[0].options.cache, "force-cache");
});

test("a query already on the resource keeps its own separator", async () => {
  const { manager, calls } = load();

  await manager.fetchJsonResource("data/x.json?lang=en");
  assert.equal(
    calls[0].url,
    "chrome-extension://stub/data/x.json?lang=en&v=2.4.1",
  );
});

test("a remote URL is left alone, and an explicit cache option still wins", async () => {
  const { manager, calls } = load();

  await manager.fetchJsonResource("https://api.example.com/x.json");
  assert.equal(calls[0].url, "https://api.example.com/x.json");

  await manager.fetchJsonResource("data/x.json", { cache: "no-store" });
  assert.equal(calls[1].options.cache, "no-store");
});

test("without getManifest the resource is still resolved, just not versioned", async () => {
  const versionless = load({ runtime: { getURL: CHROME.runtime.getURL } });
  await versionless.manager.fetchJsonResource("data/x.json");
  assert.equal(
    versionless.calls[0].url,
    "chrome-extension://stub/data/x.json",
  );
  assert.equal(versionless.calls[0].options.cache, "force-cache");

  const noChrome = load(false);
  await noChrome.manager.fetchJsonResource("data/x.json");
  assert.equal(noChrome.calls[0].url, "data/x.json");
});

/**
 * Nominatim is asked at most once per rounded position per month.
 *
 * The key is the 3-decimal coordinate pair, which is also the request grid, so
 * a jittered position lands on the answer a previous tab already stored.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { loadSandbox } from "./harness.mjs";

const FILES = [
  "js/hijri-calendars.js",
  "js/hijri.js",
  "js/praytimes.js",
  "js/islamic-day.js",
  "js/prayertimes.js",
];
const CACHE_KEY = "md_reverse_geocode_cache_v1";

const JAKARTA = { latitude: -6.2146, longitude: 106.8451 };
const NOMINATIM = "https://nominatim.openstreetmap.org/reverse";

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

function load({ lastLocation = null } = {}) {
  const calls = [];
  const sandbox = loadSandbox(FILES, {
    globals: {
      document: { getElementById: () => null, addEventListener() {} },
      localStorage: makeLocalStorage(),
      fetch: async (url, options) => {
        calls.push({ url, options });
        return {
          ok: true,
          json: async () => ({
            address: { city: "Jakarta", country: "Indonesia" },
          }),
        };
      },
    },
  });

  const savedLocations = [];
  const manager = new sandbox.PrayerTimesManager({
    getSettings: () => ({}),
    getLastLocation: () => lastLocation,
    saveLastLocation: (location) => savedLocations.push({ ...location }),
  });
  manager.location = { ...JAKARTA, city: "Current Location" };

  /**
   * A position that drifted by ~20 m, inside the same 3-decimal cell.
   */
  const jittered = {
    latitude: JAKARTA.latitude + 0.00002,
    longitude: JAKARTA.longitude,
  };

  const cache = () => JSON.parse(sandbox.localStorage.getItem(CACHE_KEY));
  const writeCache = (entries) =>
    sandbox.localStorage.setItem(CACHE_KEY, JSON.stringify(entries));

  return { sandbox, manager, calls, savedLocations, jittered, cache, writeCache };
}

test("the request grid is the cache key, rounded to three decimals", async () => {
  const { manager, calls, cache } = load();

  assert.equal(
    await manager.reverseGeocode(JAKARTA.latitude, JAKARTA.longitude),
    true,
  );
  assert.equal(
    calls[0].url,
    `${NOMINATIM}?format=json&lat=-6.215&lon=106.845&zoom=10`,
    "the URL carries the rounded pair, not the raw floats",
  );
  assert.equal(cache()["-6.215,106.845"].city, "Jakarta");
});

test("a repeat tab answers from the cache without asking Nominatim", async () => {
  const { manager, calls, jittered, cache } = load();

  await manager.reverseGeocode(JAKARTA.latitude, JAKARTA.longitude);
  assert.equal(calls.length, 1);

  manager.location = { ...jittered, city: "Current Location" };
  assert.equal(
    await manager.reverseGeocode(jittered.latitude, jittered.longitude),
    true,
  );
  assert.equal(calls.length, 1, "the jittered position hits the same key");
  assert.equal(manager.location.city, "Jakarta");
  assert.equal(Object.keys(cache()).length, 1, "one entry, not one per drift");
});

test("an entry older than the 30 day TTL is asked again", async () => {
  const { manager, calls, writeCache } = load();
  const key = manager._reverseGeocodeKey(JAKARTA.latitude, JAKARTA.longitude);
  const stale = Date.now() - manager.constructor.REVERSE_GEOCODE_TTL_MS - 1000;
  writeCache({ [key]: { city: "Old Jakarta", timestamp: stale } });

  manager.location = { ...JAKARTA, city: "Current Location" };
  assert.equal(
    await manager.reverseGeocode(JAKARTA.latitude, JAKARTA.longitude),
    true,
  );
  assert.equal(calls.length, 1, "an expired entry is a miss");
  assert.equal(manager.location.city, "Jakarta");
});

test("the stored location's city skips the call for the same rounded position", async () => {
  const { manager, calls, savedLocations, jittered } = load({
    lastLocation: { ...JAKARTA, city: "Jakarta Pusat" },
  });

  // getLocation sets the fresh position before it asks for a city.
  manager.location = { ...jittered, city: "Current Location" };
  assert.equal(
    await manager.reverseGeocode(jittered.latitude, jittered.longitude),
    true,
  );
  assert.equal(calls.length, 0, "no reverse geocode request at all");
  assert.equal(manager.location.city, "Jakarta Pusat");
  assert.equal(
    savedLocations.at(-1).city,
    "Jakarta Pusat",
    "still written through the normal save path",
  );
  assert.equal(
    savedLocations.at(-1).latitude,
    jittered.latitude,
    "the fresh position is what gets saved",
  );
});

test("a stored city for another position is not reused", async () => {
  const { manager, calls } = load({
    lastLocation: { latitude: 51.5, longitude: -0.12, city: "London" },
  });

  await manager.reverseGeocode(JAKARTA.latitude, JAKARTA.longitude);
  assert.equal(calls.length, 1);
  assert.equal(manager.location.city, "Jakarta");
});

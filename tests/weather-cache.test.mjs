/**
 * Two decimals of coordinate is the weather request grid, so a position that
 * drifts a few hundred metres still matches today's cached forecast.
 */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { loadSandbox, stubElement } from "./harness.mjs";

const JAKARTA = { latitude: -6.2146, longitude: 106.8451 };
const DRIFTED = { latitude: -6.2142, longitude: 106.8453 };

const PAYLOAD = {
  current: {
    temperature_2m: 30,
    relative_humidity_2m: 70,
    apparent_temperature: 33,
    weather_code: 1,
    wind_speed_10m: 5,
  },
  hourly: {
    time: [],
    temperature_2m: [],
    relative_humidity_2m: [],
    precipitation: [],
    wind_speed_10m: [],
  },
  daily: {
    time: [],
    weather_code: [],
    temperature_2m_max: [],
    temperature_2m_min: [],
    precipitation_sum: [],
    wind_speed_10m_max: [],
  },
};

/** Elements that exist but never assert anything: this test is about the URL. */
function makeDocument() {
  return {
    getElementById: () => ({ ...stubElement(), getContext: () => null }),
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => stubElement(),
    addEventListener() {},
    body: stubElement("body"),
  };
}

function load({ coordinates = JAKARTA, store = new Map(), fetch = reply(PAYLOAD) } = {}) {
  const calls = [];
  const sandbox = loadSandbox(["js/base-manager.js", "js/weather.js"], {
    // A page-shaped `window`, so the manager can bind its layout listeners.
    window: false,
    globals: {
      window: {
        addEventListener() {},
        removeEventListener() {},
        setTimeout,
        clearTimeout,
        innerWidth: 1440,
        getComputedStyle: () => ({ getPropertyValue: () => "" }),
      },
      document: makeDocument(),
      fetch: async (url, options) => {
        calls.push({ url, options });
        return fetch(url, options);
      },
    },
  });

  const storage = {
    get: (key, fallback) => (store.has(key) ? store.get(key) : fallback),
    set: (key, value) => store.set(key, value),
    getLastLocation: () => null,
    getSettings: () => ({
      weatherUnit: "celsius",
      weatherLocationMode: "dashboard",
      locationMethod: "manual",
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      city: "Jakarta",
    }),
  };

  const WeatherManager = vm.runInContext("WeatherManager", sandbox);
  return { manager: new WeatherManager(storage), calls, store };
}

function reply(payload) {
  return async () => ({
    ok: true,
    status: 200,
    json: async () => payload,
    text: async () => "",
  });
}

test("the request is built from two decimals, not the raw floats", async () => {
  const env = load();

  await env.manager.fetchWeather();

  assert.equal(env.calls.length, 1);
  assert.match(
    env.calls[0].url,
    /[?&]latitude=-6\.21&longitude=106\.85&/,
    "the URL carries the rounded pair",
  );
});

test("a drifted position is served from today's cache, not the network", async () => {
  const store = new Map();
  const first = load({ store });
  await first.manager.fetchWeather();
  assert.equal(first.calls.length, 1);

  // A later new tab, ~50 m away, on the same stored cache.
  const second = load({ store, coordinates: DRIFTED });
  await second.manager.fetchWeather();

  assert.equal(
    second.calls.length,
    0,
    "a jittered position finds yesterday's entry by the same key",
  );
});

test("a position on another grid cell is a different cache key", async () => {
  const store = new Map();
  const first = load({ store });
  await first.manager.fetchWeather();

  const other = load({
    store,
    coordinates: { latitude: JAKARTA.latitude + 0.02, longitude: JAKARTA.longitude },
  });
  await other.manager.fetchWeather();

  assert.equal(other.calls.length, 1, "the forecast really is for another place");
  assert.match(other.calls[0].url, /[?&]latitude=-6\.19&/);
});

test("a cell on the equator has one key, not a minus-zero twin", async () => {
  const store = new Map();
  const below = load({
    store,
    coordinates: { latitude: -0.004, longitude: 0 },
  });
  await below.manager.fetchWeather();

  const above = load({
    store,
    coordinates: { latitude: 0.004, longitude: 0 },
  });
  await above.manager.fetchWeather();

  assert.match(below.calls[0].url, /[?&]latitude=0&/);
  assert.equal(above.calls.length, 0, "the same cell answers from the cache");
});

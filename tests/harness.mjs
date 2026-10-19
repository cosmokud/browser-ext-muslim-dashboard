/**
 * Loads repo scripts into a sandbox so behaviour can be asserted without a
 * browser. `window` is the sandbox global, as it is in a page; pass
 * `{ window: false }` for a service-worker-shaped sandbox, where `window`
 * does not exist.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function runFile(relPath, context) {
  const source = fs.readFileSync(path.join(repoRoot, relPath), "utf8");
  vm.runInContext(source, context, { filename: relPath });
}

export function loadSandbox(relPaths, { globals = {}, window = true } = {}) {
  const context = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    ...globals,
  });

  if (window) vm.runInContext("globalThis.window = globalThis;", context);

  context.importScripts = (...names) =>
    names.forEach((name) => runFile(`js/${name}`, context));

  for (const relPath of relPaths) runFile(relPath, context);
  return context;
}

/** Local calendar date, the way the extension reads "today". */
export function localDay(year, month, day, hour = 0, minute = 0) {
  return new Date(year, month - 1, day, hour, minute);
}

/**
 * Stub of the chrome APIs the service worker touches. `calls` records what the
 * worker tried to do, which is what the tests assert on.
 */
export function makeChrome({ stored = {}, alarms = [] } = {}) {
  const state = { ...stored };
  const calls = { alarmsCreated: [], alarmsCleared: [], notifications: [] };
  const noop = () => {};
  const addListener = () => {};

  const pick = (keys) => {
    if (keys == null) return { ...state };
    if (typeof keys === "string") return { [keys]: state[keys] };
    if (Array.isArray(keys)) {
      return Object.fromEntries(keys.map((key) => [key, state[key]]));
    }
    return Object.fromEntries(
      Object.entries(keys).map(([key, fallback]) => [
        key,
        state[key] === undefined ? fallback : state[key],
      ]),
    );
  };

  const chrome = {
    alarms: {
      create(name, info, callback) {
        calls.alarmsCreated.push({ name, info });
        callback?.();
      },
      clear(name, callback) {
        calls.alarmsCleared.push(name);
        callback?.(true);
      },
      getAll(callback) {
        callback?.(alarms);
      },
      onAlarm: { addListener },
    },
    notifications: {
      create(id, options, callback) {
        calls.notifications.push({ id, options });
        callback?.();
      },
      onClicked: { addListener },
    },
    runtime: {
      lastError: undefined,
      getURL: (assetPath) => assetPath,
      getContexts: async () => [],
      sendMessage: async () => {},
      onMessage: { addListener },
      onInstalled: { addListener },
      onStartup: { addListener },
    },
    storage: {
      local: {
        get(keys, callback) {
          const result = pick(keys);
          callback?.(result);
          return Promise.resolve(result);
        },
        set(items, callback) {
          Object.assign(state, items);
          callback?.();
          return Promise.resolve();
        },
      },
      onChanged: { addListener },
    },
    action: {
      setBadgeText: noop,
      setBadgeBackgroundColor: noop,
      setBadgeTextColor: noop,
      setTitle: noop,
    },
    offscreen: { createDocument: async () => {} },
  };

  return { chrome, calls, state };
}

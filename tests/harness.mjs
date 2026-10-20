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

export function loadSandbox(
  relPaths,
  { globals = {}, window = true, now } = {},
) {
  const context = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    // A page always has these; deferred so a test's own assertions run first.
    requestAnimationFrame: (callback) => setTimeout(() => callback(Date.now()), 0),
    cancelAnimationFrame: clearTimeout,
    ...globals,
  });

  if (window) vm.runInContext("globalThis.window = globalThis;", context);

  // A fixed clock, so a module that reads the current time can be driven to a
  // specific local day. Date with arguments behaves normally.
  if (now) {
    context.__fixedNow = now.getTime();
    vm.runInContext(
      `{
        const FixedDate = class extends Date {
          constructor(...args) {
            if (args.length === 0) super(globalThis.__fixedNow);
            else super(...args);
          }
          static now() { return globalThis.__fixedNow; }
        };
        globalThis.Date = FixedDate;
      }`,
      context,
    );
  }

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
 * A document with a class list, for modules that only touch body classes.
 */
export function makeDocument() {
  const classes = new Set();
  const classList = {
    add: (...names) => names.forEach((name) => classes.add(name)),
    remove: (...names) => names.forEach((name) => classes.delete(name)),
    contains: (name) => classes.has(name),
    toggle: (name, force) => {
      const on = force === undefined ? !classes.has(name) : force === true;
      if (on) classes.add(name);
      else classes.delete(name);
      return on;
    },
  };

  return { body: { classList }, classes };
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
export function stubClassList() {
  const names = new Set();
  return {
    add: (...list) => list.forEach((name) => names.add(name)),
    remove: (...list) => list.forEach((name) => names.delete(name)),
    contains: (name) => names.has(name),
    toggle: (name, force) => {
      const on = force === undefined ? !names.has(name) : force === true;
      if (on) names.add(name);
      else names.delete(name);
      return on;
    },
    names,
  };
}

export function stubElement(tag = "div") {
  const element = {
    tagName: String(tag).toUpperCase(),
    classList: stubClassList(),
    style: {
      setProperty() {},
      removeProperty() {},
      getPropertyValue: () => "",
    },
    dataset: {},
    attributes: {},
    children: [],
    files: [],
    options: [],
    value: "",
    checked: false,
    disabled: false,
    hidden: false,
    innerHTML: "",
    textContent: "",
    scrollTop: 0,
    scrollHeight: 0,
    scrollWidth: 0,
    clientWidth: 0,
    clientHeight: 0,
    offsetWidth: 0,
    offsetHeight: 0,
    offsetLeft: 0,
    offsetTop: 0,
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    insertBefore(child) {
      this.children.push(child);
      return child;
    },
    removeChild(child) {
      return child;
    },
    replaceChild(child) {
      return child;
    },
    append() {},
    prepend() {},
    remove() {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    getAttribute: (name) => null,
    removeAttribute(name) {
      delete this.attributes[name];
    },
    hasAttribute: () => false,
    toggleAttribute: () => true,
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
    querySelector: () => null,
    querySelectorAll: () => [],
    closest: () => null,
    contains: () => false,
    matches: () => false,
    getBoundingClientRect: () => ({
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
    }),
    getClientRects: () => [],
    focus() {},
    blur() {},
    click() {},
    animate: () => ({ cancel() {}, finished: Promise.resolve() }),
    scrollIntoView() {},
    insertAdjacentHTML() {},
    cloneNode() {
      return stubElement(tag);
    },
    // Islands loaded lazily by other scripts.
    contentDocument: null,
    contentWindow: null,
  };

  return element;
}

export function makePage() {
  const elements = new Map();
  const getElementById = (id) => {
    if (!elements.has(id)) elements.set(id, stubElement());
    return elements.get(id);
  };

  const body = stubElement("body");
  const document = {
    body,
    head: stubElement("head"),
    documentElement: stubElement("html"),
    readyState: "loading",
    hidden: false,
    visibilityState: "visible",
    cookie: "",
    title: "",
    activeElement: body,
    getElementById,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: (tag) => stubElement(tag),
    createDocumentFragment: () => stubElement("fragment"),
    createTextNode: (text) => ({ textContent: text }),
    createEvent: () => ({ initEvent() {} }),
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
    elements,
  };

  const storage = new Map();
  const store = {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear(),
    key: (index) => [...storage.keys()][index] ?? null,
    get length() {
      return storage.size;
    },
  };

  const observer = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };

  return {
    document,
    localStorage: store,
    sessionStorage: { ...store, ...{ getItem: () => null, setItem() {} } },
    navigator: {
      userAgent: "node",
      language: "en",
      languages: ["en"],
      onLine: true,
      clipboard: { writeText: async () => {} },
      serviceWorker: { register: async () => {} },
      storage: { estimate: async () => ({ quota: 0, usage: 0 }) },
      mediaSession: { setActionHandler() {} },
    },
    location: {
      href: "chrome-extension://test/newtab.html",
      origin: "chrome-extension://test",
      protocol: "chrome-extension:",
      hostname: "test",
      pathname: "/newtab.html",
      search: "",
      hash: "",
      reload() {},
      assign() {},
    },
    screen: { width: 1440, height: 900, availWidth: 1440, availHeight: 900 },
    innerWidth: 1440,
    innerHeight: 900,
    devicePixelRatio: 1,
    scrollY: 0,
    scrollX: 0,
    matchMedia: (query) => ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    }),
    getComputedStyle: () => ({
      getPropertyValue: () => "",
      display: "block",
      visibility: "visible",
      opacity: "1",
    }),
    performance: { now: () => Date.now() },
    crypto: {
      randomUUID: () => "00000000-0000-4000-8000-000000000000",
      getRandomValues: (array) => array,
    },
    IntersectionObserver: observer,
    MutationObserver: observer,
    ResizeObserver: observer,
    fetch: async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => "",
      arrayBuffer: async () => new ArrayBuffer(0),
      clone() {
        return this;
      },
    }),
    alert() {},
    confirm: () => false,
    prompt: () => null,
    scrollTo() {},
    scrollBy() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
    getSelection: () => ({ toString: () => "" }),
    open: () => null,
    close() {},
    history: { pushState() {}, replaceState() {}, back() {}, forward() {} },
    requestIdleCallback: (callback) =>
      setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 0 }), 0),
    cancelIdleCallback: clearTimeout,
    URL: { createObjectURL: () => "blob:stub", revokeObjectURL() {} },
    indexedDB: {
      open: () => ({ onsuccess: null, onerror: null, onupgradeneeded: null }),
      deleteDatabase: () => ({ onsuccess: null, onerror: null }),
    },
    Audio: class {
      play() {
        return Promise.resolve();
      }
      pause() {}
      addEventListener() {}
      removeEventListener() {}
      load() {}
    },
  };
}

export function scriptSrcs(page) {
  const html = fs.readFileSync(path.join(repoRoot, page), "utf8");
  return [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(
    (match) => match[1],
  );
}

/**
 * Boot a page's own script list, in the order its HTML loads it, in a stub DOM.
 * Vendor bundles are skipped: they need a real DOM and are not our seam.
 */
export function bootPage(page) {
  const context = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    URL,
    TextEncoder,
    TextDecoder,
    ...makePage(),
    chrome: makeChrome().chrome,
  });
  // `self` and `window` both name the global in a page.
  vm.runInContext("globalThis.window = globalThis; globalThis.self = globalThis;", context);

  for (const src of scriptSrcs(page)) {
    if (src.includes("/vendor/")) continue;
    const source = fs.readFileSync(path.join(repoRoot, src), "utf8");
    try {
      vm.runInContext(source, context, { filename: src });
    } catch (error) {
      throw new Error(`${src} throws while loading: ${error.message}`);
    }
  }

  return context;
}

/**
 * A class split across files loads as `<name>.js`, then `<name>-2.js`,
 * `<name>-3.js` … in that order. Expanding here means a test names only the
 * class file it is about; the parts arrive as the page loads them.
 */
export function withParts(relPaths) {
  const out = [];
  for (const relPath of relPaths) {
    out.push(relPath);
    const base = relPath.replace(/\.js$/, "");
    const dir = path.dirname(path.join(repoRoot, relPath));
    if (!fs.existsSync(dir)) continue;
    const prefix = `${path.basename(base)}-`;
    const parts = fs
      .readdirSync(dir)
      .map((name) => /^(.*)-(\d+)\.js$/.exec(name))
      .filter((match) => match && match[1] === path.basename(base))
      .map((match) => ({ name: match[0], order: Number(match[2]) }))
      .sort((a, b) => a.order - b.order)
      .map((entry) => `${path.dirname(relPath)}/${entry.name}`);
    out.push(...parts);
  }
  return out;
}

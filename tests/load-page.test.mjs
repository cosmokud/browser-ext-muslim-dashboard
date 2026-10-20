/**
 * Load-time seam: boot the page's own script list, in the order index.html
 * loads it, inside a sandbox with a stub DOM. Catches what a per-module test
 * cannot: a script that is missing from a page, a global that no longer exists,
 * a cross-file call that only breaks when everything runs together.
 *
 * Nothing here simulates a browser; the stub only has to be boring enough that
 * each script's load-time code runs to the end.
 */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import path from "node:path";
import { makeChrome, repoRoot } from "./harness.mjs";

function stubClassList() {
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

function stubElement(tag = "div") {
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

function makePage() {
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

function scriptSrcs(page) {
  const html = readFileSync(path.join(repoRoot, page), "utf8");
  return [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(
    (match) => match[1],
  );
}

const REQUIRED = {
  "index.html": [
    "Modes",
    "IslamicDay",
    "HijriDate",
    "SettingsRegistry",
    "StorageManager",
    "GridLayoutManager",
    "MuslimDashboard",
  ],
  "popup.html": ["SettingsRegistry", "StorageManager", "ThemeManager"],
};

for (const page of Object.keys(REQUIRED)) {
  test(`${page}: every script runs to the end and defines what the next one needs`, () => {
    const context = vm.createContext({
      console,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      URL: URL,
      TextEncoder,
      TextDecoder,
      ...makePage(),
      chrome: makeChrome().chrome,
    });
    // `self` and `window` both name the global in a page.
    vm.runInContext(
      "globalThis.window = globalThis; globalThis.self = globalThis;",
      context,
    );

    const srcs = scriptSrcs(page);
    assert.ok(srcs.length >= 4, "the page loads its scripts as tags");

    for (const src of srcs) {
      // Vendor bundles need a real DOM (quill alone wants Node, Element and a
      // tree walker); they are unmodified third-party code, not our seam.
      if (src.includes("/vendor/")) continue;

      const source = readFileSync(path.join(repoRoot, src), "utf8");
      try {
        vm.runInContext(source, context, { filename: src });
      } catch (error) {
        assert.fail(`${src} throws while loading: ${error.message}`);
      }
    }

    for (const name of REQUIRED[page]) {
      assert.notEqual(
        vm.runInContext(`typeof ${name}`, context),
        "undefined",
        `${name} is not defined after loading the page's scripts`,
      );
    }
  });
}

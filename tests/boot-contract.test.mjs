/**
 * The boot contract: what the app is handed, in what order, and what init()
 * hands back when it is done. Asserted against the page's own script list, so
 * the seam is the one the browser runs, not a copy of it.
 */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { bootPage, loadSandbox, makePage, stubElement } from "./harness.mjs";

const SETTINGS_DEPENDENCIES = [
  "storage",
  "prayerTimes",
  "qibla",
  "quotes",
  "backgrounds",
  "weather",
  "flashcards",
  "hadith",
  "adhkar",
];

// One class behind every HTML*Element name: boot only ever asks "is this an
// image" or "is this an input", and instanceof has to answer yes for a stub.
class HtmlElement {
  getContext() {
    return new Proxy({}, { get: () => () => ({}) });
  }
}
const ELEMENT_NAMES = [
  "Element",
  "Node",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLTextAreaElement",
  "HTMLSelectElement",
  "HTMLCanvasElement",
  "HTMLImageElement",
  "HTMLVideoElement",
  "HTMLButtonElement",
  "HTMLAnchorElement",
  "HTMLDivElement",
  "HTMLSpanElement",
  "HTMLLabelElement",
  "HTMLFormElement",
  "HTMLOptionElement",
  "HTMLTemplateElement",
  "HTMLIFrameElement",
];

function element(tag = "div") {
  const stub = stubElement(tag);
  Object.setPrototypeOf(stub, HtmlElement.prototype);
  stub.style.getPropertyPriority = () => "";
  stub.classList[Symbol.iterator] = function* () {};
  stub.querySelector = () => element();
  stub.querySelectorAll = () => [];
  stub.cloneNode = () => element(tag);
  stub.getAttribute = () => "";
  stub.replaceChildren = function (...children) {
    this.children = children;
  };
  stub.append = function (...children) {
    this.children.push(...children);
  };
  stub.prepend = function (...children) {
    this.children.unshift(...children);
  };
  return stub;
}

/**
 * Boot the page, then build and initialise a dashboard the way DOMContentLoaded
 * would. Elements answer every call, since the assertion is the value init()
 * resolves with, not what it painted.
 */
function bootDashboard() {
  const page = bootPage("index.html");

  for (const name of ELEMENT_NAMES) page[name] = HtmlElement;
  page.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init && init.detail;
    }
  };
  page.Event = class Event {
    constructor(type) {
      this.type = type;
    }
  };
  page.Image = HtmlElement;
  page.Path2D = class Path2D {};
  // Boot leaves a clock interval and refresh timers behind; unref'd so a test
  // process can still exit once its assertions are done.
  const unref = (timer) => {
    timer.unref?.();
    return timer;
  };
  page.setTimeout = (callback, ms, ...args) =>
    unref(setTimeout(callback, ms, ...args));
  page.setInterval = (callback, ms, ...args) =>
    unref(setInterval(callback, ms, ...args));
  page.requestAnimationFrame = (callback) =>
    unref(setTimeout(() => callback(Date.now()), 0));
  page.requestIdleCallback = (callback) =>
    unref(
      setTimeout(
        () => callback({ didTimeout: false, timeRemaining: () => 0 }),
        0,
      ),
    );
  page.cancelAnimationFrame = clearTimeout;
  page.cancelIdleCallback = clearTimeout;

  const byId = new Map();
  page.document.getElementById = (id) => {
    if (!byId.has(id)) byId.set(id, element());
    return byId.get(id);
  };
  page.document.body = page.document.getElementById("body");
  page.document.querySelector = () => element();
  page.document.querySelectorAll = () => [];
  page.document.createElement = (tag) => element(tag);
  page.document.createDocumentFragment = () => element("fragment");

  return { page, dashboard: vm.runInContext("new MuslimDashboard()", page) };
}

test("the settings manager is handed its managers by name, as the fields it stores", () => {
  const page = bootPage("index.html");
  page.__deps = Object.fromEntries(
    SETTINGS_DEPENDENCIES.map((name) => [name, { dependency: name }]),
  );

  const manager = vm.runInContext("new SettingsManager(globalThis.__deps)", page);

  for (const name of SETTINGS_DEPENDENCIES) {
    assert.equal(
      manager[name],
      page.__deps[name],
      `SettingsManager.${name} is not the manager it was handed`,
    );
  }
});

test("init() resolves, once its data is in, with the surfaces the app uses", async () => {
  const { dashboard } = bootDashboard();

  const surfaces = await dashboard.init();

  assert.equal(typeof surfaces, "object", "init() hands back the surfaces");
  for (const name of [
    "storage",
    "modes",
    "themes",
    "backgrounds",
    "prayerTimes",
    "quotes",
    "settings",
    "gridLayout",
  ]) {
    assert.equal(
      surfaces[name],
      dashboard[name],
      `init() does not hand back the ${name} surface`,
    );
    assert.notEqual(surfaces[name], null, `${name} is missing after init()`);
  }

  assert.equal(surfaces.storage.constructor.name, "StorageManager");
  assert.equal(surfaces.themes.constructor.name, "ThemeManager");
  assert.equal(surfaces.settings.constructor.name, "SettingsManager");
  assert.equal(surfaces.gridLayout.constructor.name, "GridLayoutManager");
});

/** A step is runnable only when every step it names has already run. */
function unmetNeeds(steps) {
  const ran = new Set();
  const unmet = [];

  for (const step of steps) {
    for (const need of step.needs) {
      if (!ran.has(need)) unmet.push(`${step.name} needs ${need}`);
    }
    ran.add(step.name);
  }

  return unmet;
}

test("the declared boot order satisfies every declared need", () => {
  const sandbox = loadSandbox(["js/app/index.js", "js/app/boot.js"], {
    globals: { document: makePage().document },
  });
  const steps = vm.runInContext(
    "BOOT_STEPS.map((step) => ({ name: step.name, needs: step.needs }))",
    sandbox,
  );

  assert.deepEqual(
    unmetNeeds(steps),
    [],
    "a step runs before something it declares it needs",
  );
  assert.equal(
    new Set(steps.map((step) => step.name)).size,
    steps.length,
    "two steps share a name, so a need cannot name one of them",
  );
});

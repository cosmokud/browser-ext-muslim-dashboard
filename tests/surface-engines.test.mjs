/**
 * Consolidated surface engines: per-card blur overrides, popup Follow-Dashboard
 * sync, and sticky-note glass rendering/blur-menu opacity all delegate to
 * ThemeTokens and SettingsRegistry with one canonical set of defaults.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";
import { loadPageDom, makeChrome, repoRoot, scriptSrcs } from "./harness.mjs";

const BLUR_SCRIPTS = [
  "js/settings-registry.js",
  "js/theme-tokens.js",
  "js/themes.js",
  "js/app/index.js",
  "js/app/blur-overrides.js",
];

const STICKY_SCRIPTS = [
  "js/settings-registry.js",
  "js/theme-tokens.js",
  "js/themes.js",
  "js/stickynotes/index.js",
  "js/stickynotes/colors.js",
  "js/stickynotes/render.js",
  "js/stickynotes/blur-menu.js",
  "js/stickynotes/note-updates.js",
];

function bootIndex(scripts) {
  const document = loadPageDom("index.html");
  const window = document.defaultView;
  for (const relPath of scripts) {
    window.eval(fs.readFileSync(path.join(repoRoot, relPath), "utf8"));
  }
  return { document, window };
}

test("blur-overrides defaults missing glassOpacity to 50, writes surface tokens without conflicting highlight overrides, and clears on dashboard", () => {
  const { document, window } = bootIndex(BLUR_SCRIPTS);
  let stored = { theme: { name: "emerald", mode: "dark", glassEnabled: true } };
  const storage = {
    getSettings: () => stored,
    get: (key, fallback) => (key === "settings" ? stored : fallback),
    set: (key, value) => {
      if (key === "settings") stored = value;
    },
    saveSettings: (next) => {
      stored = next;
    },
  };

  const themes = new window.ThemeManager(storage);
  themes.loadThemeSettings();
  themes.applyTheme();

  const app = Object.create(window.MuslimDashboard.prototype);
  app.storage = storage;
  app.themes = themes;
  app.initReadabilityBlurOverrides();

  const card = document.getElementById("todoCard");
  const menu = document.querySelector('.card-blur-menu[data-card-id="todoCard"]');
  assert.ok(card && menu);

  // Switching to ON with no saved card/dashboard glassOpacity must default to 50 (not 35).
  const onBtn = document.querySelector(
    '.blur-settings-popup .blur-glass-option[data-glass-value="on"]',
  );
  // Find todoCard's specific portaled popup via menu button click or button lookup.
  const menuBtn = menu.querySelector(".card-blur-btn");
  menuBtn.click();
  const openPopup = document.querySelector(".blur-settings-popup.blur-popup-open");
  assert.ok(openPopup, "opening todoCard blur menu exposes its popup");

  openPopup.querySelector('.blur-glass-option[data-glass-value="on"]').click();

  assert.equal(card.dataset.glassEnabled, "true");
  assert.equal(card.style.getPropertyValue("--surface-opacity"), "0.5");
  assert.equal(card.style.getPropertyValue("--surface-blur-factor"), "1");
  assert.match(card.style.getPropertyValue("--glass-bg"), /,\s*0\.5\)$/);
  assert.equal(
    card.style.getPropertyValue("--glass-bg-subtle"),
    "rgba(255, 255, 255, 0.03)",
  );
  assert.equal(
    card.style.getPropertyValue("--surface-tint-rgb"),
    "255, 255, 255",
  );
  assert.ok(card.style.getPropertyValue("--surface-rgb").length > 0);
  for (const name of [
    ...window.ThemeTokens.HIGHLIGHT_CSS_VARS,
    ...window.ThemeTokens.ACCENT_SURFACE_CSS_VARS,
  ]) {
    assert.equal(
      card.style.getPropertyValue(name),
      "",
      `ON override should not overwrite unified ${name}`,
    );
  }

  // Switching to OFF writes full solid surface tokens while inheriting unified accent/highlight tokens.
  openPopup.querySelector('.blur-glass-option[data-glass-value="off"]').click();
  assert.equal(card.dataset.glassEnabled, "false");
  assert.equal(card.style.getPropertyValue("--surface-opacity"), "1");
  assert.equal(card.style.getPropertyValue("--surface-blur-factor"), "0");
  assert.match(card.style.getPropertyValue("--glass-bg"), /^rgb\(/);
  assert.equal(card.style.getPropertyValue("--theme-highlight-border"), "");

  // Switching back to DASH clears card overrides and lets dashboard componentOpacity take over.
  themes.setGlassEnabled(false, false);
  openPopup
    .querySelector('.blur-glass-option[data-glass-value="dashboard"]')
    .click();
  assert.equal(card.dataset.glassEnabled, undefined);
  for (const name of [
    ...window.ThemeTokens.SURFACE_CSS_VARS,
    ...window.ThemeTokens.HIGHLIGHT_CSS_VARS,
  ]) {
    assert.equal(
      card.style.getPropertyValue(name),
      "",
      `DASH reset should clear inline ${name} when dashboard glass is off`,
    );
  }

  // Re-enabling dashboard glass with componentOpacity=20 lets DASH card inherit 20% via :root --component-* scope without inline stamping.
  themes.setMainGridComponentOpacity(20, false);
  themes.setGlassEnabled(true, false);
  const rootStyle = document.documentElement.style;
  assert.equal(card.style.getPropertyValue("--surface-opacity"), "");
  assert.equal(card.style.getPropertyValue("--glass-bg"), "");
  assert.equal(rootStyle.getPropertyValue("--component-opacity-factor"), "0.2");
  assert.equal(rootStyle.getPropertyValue("--component-blur-factor"), "1");
  assert.match(rootStyle.getPropertyValue("--component-glass-bg"), /,\s*0\.2\)$/);

  assert.ok(onBtn !== undefined);
  window.close();
});

function bootPopupWithSettings(settingsBlob) {
  const dom = new JSDOM(
    fs.readFileSync(path.join(repoRoot, "popup.html"), "utf8"),
    {
      url: "https://localhost/popup.html",
      runScripts: "outside-only",
      pretendToBeVisual: true,
      virtualConsole: new VirtualConsole(),
    },
  );
  const context = dom.getInternalVMContext();
  dom.window.chrome = makeChrome().chrome;
  dom.window.fetch = async () => ({ ok: true, json: async () => [] });
  dom.window.localStorage.setItem(
    "muslimDashboard_settings",
    JSON.stringify(settingsBlob),
  );

  for (const src of scriptSrcs("popup.html")) {
    if (src.includes("/vendor/")) continue;
    context.eval(fs.readFileSync(path.join(repoRoot, src), "utf8"));
  }
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
  return dom;
}

test("popup Follow-Dashboard applies dashboard glassOpacity and accentOpacity without raw-alpha clobber", () => {
  // Explicit dashboard glassOpacity=75 and accentOpacity=40 must reach :root.
  const domExplicit = bootPopupWithSettings({
    theme: {
      name: "emerald",
      mode: "dark",
      glassEnabled: true,
      glassOpacity: 75,
      accentOpacity: 40,
    },
  });
  try {
    const rootStyle = domExplicit.window.document.documentElement.style;
    assert.equal(rootStyle.getPropertyValue("--surface-opacity"), "0.75");
    assert.equal(rootStyle.getPropertyValue("--surface-blur-factor"), "1");
    assert.match(rootStyle.getPropertyValue("--glass-bg"), /,\s*0\.75\)$/);
    assert.equal(
      rootStyle.getPropertyValue("--glass-bg-subtle"),
      "rgba(255, 255, 255, 0.045)",
    );
    assert.equal(rootStyle.getPropertyValue("--accent-opacity"), "0.4");
    assert.match(rootStyle.getPropertyValue("--accent-surface-bg"), /,\s*0\.4\)/);
  } finally {
    domExplicit.window.close();
  }

  // Missing glassOpacity defaults to 50 and missing accentOpacity defaults to 75.
  const domDefault = bootPopupWithSettings({
    theme: {
      name: "emerald",
      mode: "dark",
      glassEnabled: true,
    },
  });
  try {
    const rootStyle = domDefault.window.document.documentElement.style;
    assert.equal(rootStyle.getPropertyValue("--surface-opacity"), "0.5");
    assert.equal(rootStyle.getPropertyValue("--surface-blur-factor"), "1");
    assert.match(rootStyle.getPropertyValue("--glass-bg"), /,\s*0\.5\)$/);
    assert.equal(rootStyle.getPropertyValue("--accent-opacity"), "0.75");
  } finally {
    domDefault.window.close();
  }

  const domInvalidOpacity = bootPopupWithSettings({
    theme: {
      name: "emerald",
      mode: "dark",
      glassEnabled: true,
      glassOpacity: "invalid",
    },
  });
  try {
    const rootStyle = domInvalidOpacity.window.document.documentElement.style;
    assert.equal(rootStyle.getPropertyValue("--surface-opacity"), "0.5");
    assert.match(rootStyle.getPropertyValue("--glass-bg"), /,\s*0\.5\)$/);
  } finally {
    domInvalidOpacity.window.close();
  }

  // Solid dashboard mode resolves opaque rgb() with blurFactor 0.
  const domSolid = bootPopupWithSettings({
    theme: {
      name: "emerald",
      mode: "dark",
      glassEnabled: false,
      glassOpacity: 50,
    },
  });
  try {
    const rootStyle = domSolid.window.document.documentElement.style;
    assert.equal(rootStyle.getPropertyValue("--surface-opacity"), "1");
    assert.equal(rootStyle.getPropertyValue("--surface-blur-factor"), "0");
    assert.match(rootStyle.getPropertyValue("--glass-bg"), /^rgb\(/);
  } finally {
    domSolid.window.close();
  }
});

test("sticky notes glass preset rendering and blur-menu slider/display consistently use componentOpacity", () => {
  const { document, window } = bootIndex(STICKY_SCRIPTS);
  let storedSettings = {
    theme: {
      name: "emerald",
      mode: "dark",
      glassEnabled: true,
      glassOpacity: 65,
      componentOpacity: 25,
    },
  };
  const storage = {
    getSettings: () => storedSettings,
    saveSettings: (s) => {
      storedSettings = s;
    },
    get: (_k, fallback) => fallback,
    set() {},
  };

  const themes = new window.ThemeManager(storage);
  themes.loadThemeSettings();
  themes.applyTheme();
  window.dashboard = { themes };

  const sticky = Object.create(window.StickyNotesManager.prototype);
  sticky.storage = storage;
  sticky.notes = [];
  sticky.noteBlurPopupByNoteId = new Map();
  sticky.noteBlurPopupPortalled = new WeakSet();
  sticky.colorPresets = [
    {
      name: "Glass (Default)",
      bg: "var(--glass-bg)",
      text: "var(--text-primary)",
      glass: true,
      blur: 20,
      transparency: 1,
    },
  ];
  sticky.saveNotes = () => {};

  const note = {
    id: "n1",
    content: "Test",
    x: 10,
    y: 10,
    width: 240,
    height: 180,
    zIndex: 1001,
    color: sticky.colorPresets[0],
    glassEffect: true,
    blur: 20,
    transparency: 1,
    blurState: "dashboard",
    blurPowerEnabled: false,
    blurPower: 100,
    glassOpacity: 80,
  };
  sticky.notes.push(note);

  // Direct glass-preset rendering uses componentOpacity (25%), not glassOpacity (65%) or note.transparency (1).
  const initialCss = sticky.getNoteStyles(note);
  assert.match(initialCss, /background:\s*rgba\([^)]*,\s*0\.25\)/);

  // Mount minimal note DOM with blur menu to verify blur-menu slider & display match componentOpacity.
  const noteEl = document.createElement("div");
  noteEl.id = "sticky-note-n1";
  noteEl.className = "sticky-note";
  noteEl.innerHTML = `
    <div class="sticky-note-dropdown">
      <div class="card-blur-menu sticky-note-blur-menu" data-note-id="n1">
        <button class="card-blur-btn" type="button">🔗</button>
        <div class="blur-settings-popup sticky-note-blur-popup">
          <button class="blur-popup-close" type="button">×</button>
          <button class="blur-glass-option" data-glass-value="off" type="button"></button>
          <button class="blur-glass-option active" data-glass-value="dashboard" type="button"></button>
          <button class="blur-glass-option" data-glass-value="on" type="button"></button>
          <div class="blur-power-slider-wrap">
            <input type="range" class="blur-power-slider" min="0" max="200" value="100" />
            <span class="blur-power-value">100%</span>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(noteEl);
  const dropdown = noteEl.querySelector(".sticky-note-dropdown");
  sticky.setupStickyNoteBlurMenu(noteEl, note, dropdown);

  const popup = sticky.noteBlurPopupByNoteId.get("n1");
  const slider = popup.querySelector(".blur-opacity-slider");
  const readout = popup.querySelector(".blur-opacity-value");

  assert.equal(note.transparency, 0.25);
  assert.equal(slider.value, "25");
  assert.equal(readout.textContent, "25%");

  // Missing componentOpacity coerces to SettingsRegistry default (0), not glassOpacity (65).
  storedSettings = {
    theme: {
      name: "emerald",
      mode: "dark",
      glassEnabled: true,
      glassOpacity: 65,
    },
  };
  themes.loadThemeSettings();
  themes.applyTheme();
  sticky.applyNoteBlurState("n1", { save: false });
  noteEl.querySelector(".card-blur-btn").click();
  assert.equal(note.transparency, 0);
  assert.equal(slider.value, "0");
  assert.equal(readout.textContent, "0%");
  assert.match(sticky.getNoteStyles(note), /background:\s*rgba\([^)]*,\s*0\)/);

  window.close();
});

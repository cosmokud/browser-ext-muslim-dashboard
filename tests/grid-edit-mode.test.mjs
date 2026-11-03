/**
 * The layout editor's mode state goes through the mode module: entering the
 * Quran focus layout resets edit mode for that layout, so the shared Layout
 * Editor FAB is not toggled on, and leaving it restores the main layout's saved
 * state. This replaces a source-text assertion that only checked those calls
 * were written in the right order.
 */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { loadSandbox, makeDocument } from "./harness.mjs";

function stubElement() {
  return {
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains: () => false,
    },
    style: { setProperty() {}, removeProperty() {} },
    dataset: {},
    setAttribute() {},
    removeAttribute() {},
    toggleAttribute() {},
    getAttribute: () => null,
    addEventListener() {},
    removeEventListener() {},
    appendChild() {},
    removeChild() {},
    remove() {},
    contains: () => false,
    closest: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({
      width: 0,
      height: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    }),
  };
}

function makeGrid(settings) {
  const document = Object.assign(makeDocument(), {
    getElementById: () => stubElement(),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    removeEventListener() {},
    createElement: () => stubElement(),
  });
  // Toasts are appended to the body; the class list is what the tests read.
  document.body.appendChild = () => {};
  document.body.removeChild = () => {};
  const sandbox = loadSandbox(["js/modes.js", "js/gridlayout.js"], {
    globals: { document },
  });
  const Modes = vm.runInContext("Modes", sandbox);
  const GridLayoutManager = vm.runInContext("GridLayoutManager", sandbox);
  const storage = {
    settings,
    getSettings() {
      return this.settings;
    },
    saveSettings(next) {
      this.settings = next;
    },
  };
  const modes = new Modes(settings);

  return {
    grid: new GridLayoutManager(storage, modes),
    modes,
    storage,
    document,
  };
}

test("the grid asks the mode module which layout it is in", () => {
  const { grid, modes } = makeGrid({});

  assert.equal(grid.isQuranFocusModeContextActive(), false, "main layout");
  modes.enter("quranFocus");
  assert.equal(grid.isQuranFocusModeContextActive(), true);
  modes.exit("quranFocus");
  assert.equal(grid.isQuranFocusModeContextActive(), false);
});

test("entering the focus layout resets that layout's edit mode", () => {
  const { grid, modes, storage, document } = makeGrid({
    gridEditModeEnabled: true,
  });
  assert.equal(modes.isActive("edit"), true, "the main layout starts editing");

  // The app enters the mode, then tells the grid, as mode-setup does.
  modes.enter("quranFocus");
  grid.setQuranFocusModeActive(true);

  assert.equal(
    storage.settings.gridEditModeEnabledQuranFocus,
    false,
    "the focus layout's saved state is reset",
  );
  assert.equal(
    modes.isActive("edit"),
    false,
    "so the shared Layout Editor FAB is not toggled on",
  );
  assert.equal(document.body.classList.contains("grid-edit-mode"), false);
});

test("leaving the focus layout restores the main layout's edit mode", () => {
  const { grid, modes, document } = makeGrid({ gridEditModeEnabled: true });

  modes.enter("quranFocus");
  grid.setQuranFocusModeActive(true);
  modes.exit("quranFocus");
  grid.setQuranFocusModeActive(false);

  assert.equal(modes.isActive("edit"), true);
  assert.equal(document.body.classList.contains("grid-edit-mode"), true);
});

test("toggling the layout editor writes through the module", () => {
  const { grid, modes, storage } = makeGrid({});

  grid.toggleEditMode();
  assert.equal(modes.isActive("edit"), true);
  assert.equal(grid.isEditMode(), true, "the grid agrees");
  assert.equal(
    storage.settings.gridEditModeEnabled,
    true,
    "and persists under the main layout's key",
  );

  grid.toggleEditMode();
  assert.equal(modes.isActive("edit"), false);
  assert.equal(storage.settings.gridEditModeEnabled, false);
});

test("the moment lock turns edit mode off everywhere, not just in the field", () => {
  const { grid, modes, document } = makeGrid({ gridEditModeEnabled: true });

  grid.setEditModeLocked(true);

  assert.equal(modes.isActive("edit"), false);
  assert.equal(document.body.classList.contains("grid-edit-mode"), false);
  assert.equal(grid.isEditMode(), false);
});

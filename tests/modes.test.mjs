/**
 * The mode module: which modes are on, which ones exclude which, and which
 * body classes the page wears. Four modes coexist (a layout edit can be on
 * while the sidebar is), so this is a set with an exclusion table rather than
 * one "current mode".
 *
 * The exclusion facts asserted here are the ones the app has today:
 * focus excludes moment and sidebar; moment excludes focus and sidebar;
 * sidebar excludes nothing and is excluded by both; edit excludes nothing.
 */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { loadSandbox, makeDocument } from "./harness.mjs";

const FILES = ["js/modes.js"];

function makeModes(settings = {}) {
  const document = makeDocument();
  const sandbox = loadSandbox(FILES, { globals: { document } });
  const Modes = vm.runInContext("Modes", sandbox);

  return { modes: new Modes(settings), document };
}

test("reads which modes start on from the settings snapshot", () => {
  const { modes } = makeModes({
    quranFocusModeEnabled: true,
    momentModeEnabled: true,
    sidebarModeEnabled: true,
    gridEditModeEnabled: true,
    gridEditModeEnabledQuranFocus: true,
  });

  assert.deepEqual([...modes.active()], ["edit"], "two exclusive overlays both on count as neither");
  assert.equal(modes.isActive("edit"), true);
  assert.equal(modes.isActive("quranFocus"), false);
});

test("edit reads the key of the layout context it is in", () => {
  const main = makeModes({ gridEditModeEnabled: true });
  assert.equal(main.modes.isActive("edit"), true, "main layout edit");

  const focusKeyOnly = makeModes({ gridEditModeEnabledQuranFocus: true });
  assert.equal(
    focusKeyOnly.modes.isActive("edit"),
    false,
    "the focus-layout key says nothing about the main layout",
  );

  const focus = makeModes({
    quranFocusModeEnabled: true,
    gridEditModeEnabledQuranFocus: true,
  });
  assert.equal(focus.modes.isActive("edit"), true, "focus layout edit");
});

test("an active mode suppresses the modes it excludes", () => {
  const both = makeModes({ quranFocusModeEnabled: true, sidebarModeEnabled: true });

  assert.equal(both.modes.isActive("quranFocus"), true);
  assert.equal(both.modes.isActive("sidebar"), false, "focus excludes sidebar");

  const moment = makeModes({ momentModeEnabled: true, sidebarModeEnabled: true });
  assert.equal(moment.modes.isActive("sidebar"), false, "moment excludes sidebar");

  const edit = makeModes({ gridEditModeEnabled: true, sidebarModeEnabled: true });
  assert.equal(edit.modes.isActive("edit"), true, "edit excludes nothing");
  assert.equal(edit.modes.isActive("sidebar"), true, "and is not excluded");
});

test("the exclusion table is declared once and readable", () => {
  const { modes } = makeModes();

  assert.deepEqual([...modes.excludes("quranFocus")], ["moment", "sidebar"]);
  assert.deepEqual([...modes.excludes("moment")], ["quranFocus", "sidebar"]);
  assert.deepEqual([...modes.excludes("sidebar")], []);
  assert.deepEqual([...modes.excludes("edit")], []);
});

test("entering and leaving a mode puts its body class on and off", () => {
  const { modes, document } = makeModes();
  const body = document.body.classList;

  modes.enter("quranFocus");
  assert.equal(body.contains("quran-focus-mode"), true);
  assert.equal(body.contains("moment-mode"), false);

  modes.exit("quranFocus");
  assert.equal(body.contains("quran-focus-mode"), false);
  assert.equal(modes.isActive("quranFocus"), false);
});

test("entering a mode that another one excludes drops the other's class", () => {
  const { modes, document } = makeModes({ sidebarModeEnabled: true });
  const body = document.body.classList;

  modes.enter("sidebar");
  assert.equal(body.contains("sidebar-mode"), true);

  modes.enter("moment");
  assert.equal(body.contains("moment-mode"), true);
  assert.equal(
    body.contains("sidebar-mode"),
    false,
    "the class follows isActive, not the intent",
  );
  assert.equal(modes.isActive("sidebar"), false);
  assert.deepEqual(
    [...modes.excludes("moment")],
    ["quranFocus", "sidebar"],
    "and the caller is told what to tear down",
  );
});

test("a suppressed mode comes back when its excluder leaves", () => {
  const { modes, document } = makeModes({ sidebarModeEnabled: true });

  modes.enter("quranFocus");
  assert.equal(modes.isActive("sidebar"), false);

  modes.exit("quranFocus");
  assert.equal(modes.isActive("sidebar"), true, "the intent was never thrown away");
  assert.equal(document.body.classList.contains("sidebar-mode"), true);
});

test("toggle flips the intent, and a suppressed mode still reads inactive", () => {
  const { modes } = makeModes();

  modes.toggle("edit");
  assert.equal(modes.isActive("edit"), true);
  modes.toggle("edit");
  assert.equal(modes.isActive("edit"), false);

  modes.enter("quranFocus");
  modes.toggle("sidebar");
  assert.equal(
    modes.isActive("sidebar"),
    false,
    "a suppressed mode cannot show through its excluder",
  );
});

/** The mode to start in, as the app's three restore sites answer it today. */
function restoreWith(settings, debugEnabled) {
  const sandbox = loadSandbox(FILES, {
    globals: { document: makeDocument(), ENABLE_DEBUG_MODE: debugEnabled },
  });

  return vm.runInContext("Modes", sandbox).restore(settings);
}

test("the snapshot names the mode to start in, the flags first", () => {
  assert.equal(restoreWith({ momentModeEnabled: true }, true), "moment");
  assert.equal(restoreWith({ quranFocusModeEnabled: true }, true), "quranFocus");
  assert.equal(restoreWith({ sidebarModeEnabled: true }, true), "sidebar");
  assert.equal(restoreWith({}, true), "normal");

  assert.equal(
    restoreWith({ quranFocusModeEnabled: true, momentModeEnabled: true }, true),
    "moment",
    "moment preempts focus, and the other two sites agree today",
  );
  assert.equal(
    restoreWith({ quranFocusModeEnabled: true, sidebarModeEnabled: true }, true),
    "quranFocus",
    "focus excludes sidebar, so the sidebar flag does not start it on top",
  );
});

test("a stale lastDashboardMode falls back to the flags", () => {
  assert.equal(
    restoreWith({ lastDashboardMode: "sidebar" }, true),
    "normal",
    "the sidebar flag is what starts the sidebar, not the hint left behind",
  );
  assert.equal(
    restoreWith({ lastDashboardMode: "moment" }, false),
    "normal",
    "without the debug mode there is no moment to go back to",
  );
  assert.equal(restoreWith({ lastDashboardMode: "moment" }, true), "moment");
  assert.equal(
    restoreWith({ lastDashboardMode: "quranFocus" }, true),
    "quranFocus",
    "the hint alone starts the focus layout, as it always has",
  );
});

test("a snapshot with no lastDashboardMode still names a mode", () => {
  assert.equal(restoreWith({ momentModeEnabled: true }, true), "moment");
  assert.equal(restoreWith({ quranFocusModeEnabled: true }, true), "quranFocus");
  assert.equal(restoreWith({ sidebarModeEnabled: true }, true), "sidebar");
  assert.equal(restoreWith(undefined, true), "normal", "an empty snapshot");
});

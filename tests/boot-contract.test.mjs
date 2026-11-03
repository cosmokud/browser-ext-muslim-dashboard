/**
 * The boot contract: what the app is handed, in what order, and what init()
 * hands back when it is done. Asserted against the page's own script list, so
 * the seam is the one the browser runs, not a copy of it.
 */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { bootPage } from "./harness.mjs";

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

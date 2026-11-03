/**
 * Quote navigation order.
 *
 * Shuffle mode walks a playlist generated for the page, so a click never shows
 * a quote the reader has already seen this cycle; deterministic mode walks the
 * list in order, so two cycles are identical. Previous walks back through the
 * quotes that were shown, and next reuses that forward history before the
 * playlist moves on. This is the only coverage quotes has, so the order is
 * asserted by reading back the quote that each click displayed.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { loadSandbox, makePage, withParts } from "./harness.mjs";

const ITEMS = ["one", "two", "three", "four", "five"].map((text, index) => ({
  id: `q${index + 1}`,
  source: `Source ${index + 1}`,
  type: "user",
  text_en: text,
}));

/**
 * A page instance over a fixed quote list. The bundled quotes come from a file
 * the sandbox cannot fetch, so every quote here is a user quote.
 */
function boot({ shuffle = true } = {}) {
  const settings = {
    useDefaultQuotes: false,
    useUserQuotes: true,
    quoteLayoutStyle: "classic",
    quoteShuffleEnabled: shuffle,
  };
  const storage = {
    getSettings: () => settings,
    saveSettings() {},
    getUserQuotes: () => ITEMS.map((item) => ({ ...item })),
    saveUserQuotes() {},
  };
  const sandbox = loadSandbox(withParts(["js/base-manager.js", "js/quotes.js"]), {
    globals: {
      ...makePage(),
      storage,
      // No window in this sandbox answers fetch, and a failed read is the
      // answer the loader already handles.
      fetch: async () => ({ ok: false, json: async () => [] }),
      setInterval: () => 0,
      clearInterval() {},
      CustomEvent,
    },
  });
  const quotes = new sandbox.QuotesManager(storage);
  quotes.userQuotes = ITEMS.map((item) => ({ ...item }));
  quotes.quoteShuffleEnabled = shuffle;
  return { quotes };
}

/** Quote ids in the order the page generated its playlist. */
const playlistIds = (quotes) => [...quotes._quoteShufflePlaylist].map((quote) => quote.id);

/** Click through the page the way the next button does. */
function display(quotes, times) {
  const shown = [];
  for (let index = 0; index < times; index += 1) {
    quotes.displayRandomQuote();
    shown.push(quotes.currentQuote?.id);
  }
  return shown;
}

test("a page instance keeps its playlist in memory and starts empty", () => {
  const first = boot().quotes;
  const second = boot().quotes;

  assert.deepEqual([...first._quoteShufflePlaylist], []);
  assert.equal(first._quoteShufflePlaylistIndex, -1);
  assert.notEqual(first._quoteShufflePlaylist, second._quoteShufflePlaylist);
});

test("the first quote of a page load comes from the generated playlist", async () => {
  const { quotes } = boot();
  await quotes.init();

  const availableIds = quotes.getAvailableQuotes().map((quote) => quote.id);
  assert.deepEqual(playlistIds(quotes).sort(), [...availableIds].sort());
  // The playlist was generated before the first display, so the quote shown
  // is the playlist's first item rather than a leftover from an older list.
  assert.equal(quotes.currentQuote.id, quotes._quoteShufflePlaylist[0].id);
  assert.equal(quotes._quoteShufflePlaylistIndex, 0);
});

test("shuffle visits every quote once before it repeats", () => {
  const { quotes } = boot();
  quotes.resetQuoteShufflePlaylist();

  const shown = display(quotes, ITEMS.length);

  assert.deepEqual(new Set(shown).size, ITEMS.length);
  assert.deepEqual(shown, playlistIds(quotes));
  // Only the next cycle may repeat the first quote.
  quotes.displayRandomQuote();
  assert.equal(quotes.currentQuote.id, shown[0]);
});

test("deterministic mode shows the same order every cycle", () => {
  const { quotes } = boot({ shuffle: false });

  const firstCycle = display(quotes, ITEMS.length);
  const secondCycle = display(quotes, ITEMS.length);

  assert.deepEqual(new Set(firstCycle).size, ITEMS.length);
  assert.deepEqual(secondCycle, firstCycle);
});

test("previous walks back through the quotes that were shown", () => {
  const { quotes } = boot();
  quotes.resetQuoteShufflePlaylist();
  const shown = display(quotes, ITEMS.length);

  quotes.showPreviousQuote();
  assert.equal(quotes.currentQuote.id, shown[ITEMS.length - 2]);
  assert.equal(quotes._quoteShufflePlaylistIndex, ITEMS.length - 2);

  quotes.showPreviousQuote();
  assert.equal(quotes.currentQuote.id, shown[ITEMS.length - 3]);
});

test("next reuses the forward history before the playlist advances", () => {
  const { quotes } = boot();
  quotes.resetQuoteShufflePlaylist();
  const shown = display(quotes, ITEMS.length);
  quotes.showPreviousQuote();

  quotes.showNextQuote();

  // Walked forward through the history: the playlist did not move on.
  assert.equal(quotes.currentQuote.id, shown[ITEMS.length - 1]);
  assert.equal(quotes._quoteShufflePlaylistIndex, ITEMS.length - 1);

  // History is at its end again, so this is the playlist's next cycle.
  quotes.showNextQuote();
  assert.equal(quotes.currentQuote.id, shown[0]);
});

test("previous from the first playlist item wraps to the last", () => {
  const { quotes } = boot();
  quotes.resetQuoteShufflePlaylist();
  display(quotes, 1);
  const ids = playlistIds(quotes);

  quotes.showPreviousQuote();

  assert.equal(quotes.currentQuote.id, ids[ids.length - 1]);
  assert.equal(quotes._quoteShufflePlaylistIndex, ids.length - 1);
});

test("previous from the first quote wraps to the last in order too", () => {
  const { quotes } = boot({ shuffle: false });
  display(quotes, 1);
  assert.equal(quotes.currentQuote.id, ITEMS[0].id);

  quotes.showPreviousQuote();

  assert.equal(quotes.currentQuote.id, ITEMS[ITEMS.length - 1].id);
});

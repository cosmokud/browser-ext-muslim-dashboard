/**
 * The reader's search panel and the ayah copy badge.
 *
 * Replaces tests/pocketquran-search.test.ps1, which asserted the shape of the
 * source; these cases drive the reader's own methods on the real index.html
 * markup and assert the DOM and the values they produce.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { JSDOM, VirtualConsole } from "jsdom";
import { loadPageDom, loadSandbox, repoRoot, withParts } from "./harness.mjs";

const SCRIPTS = withParts([
  "js/settings-registry.js",
  "js/quran-copy.js",
  "js/quran-search.js",
  "js/quran-recitation.js",
  "js/quran-arabic.js",
  "js/base-manager.js",
  "js/pocketquran.js",
]);

/** The reader on the parsed dashboard, with the settings a reader needs. */
function boot(settings = {}) {
  const dom = new JSDOM(fs.readFileSync(path.join(repoRoot, "index.html"), "utf8"), {
    url: "https://localhost/index.html",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole: new VirtualConsole(),
  });
  const context = dom.getInternalVMContext();
  for (const relPath of SCRIPTS) {
    vm.runInContext(fs.readFileSync(path.join(repoRoot, relPath), "utf8"), context, {
      filename: relPath,
    });
  }

  const PocketQuran = vm.runInContext("PocketQuranManager", context);
  const document = dom.window.document;
  const reader = Object.create(PocketQuran.prototype);
  reader.card = document.getElementById("pocketQuranCard");
  reader._chapters = [{ id: 2, name_simple: "Al-Baqarah", verses_count: 286 }];
  reader._activeSurah = 2;
  reader.storage = {
    getSettings: () => ({ pocketQuran: { translationResourceId: 20, ...settings } }),
    set: () => {},
    get: () => null,
  };

  return { dom, context, document, reader, PocketQuran };
}

/** One search result, as the API and the fallback both produce them. */
function result(ayah = 255, translation = "His throne is the most wide") {
  return {
    verseKey: `2:${ayah}`,
    surah: 2,
    ayah,
    arabicText: "اللَّهُ",
    translationText: translation,
  };
}

function showResults(reader, results, source = "api") {
  reader.renderPocketQuranSearchResults({
    query: "throne",
    results,
    totalResults: results.length,
    source,
    translationLabel: "Test Translation",
  });
}

test("the reader's search requests are what the cache keeps", () => {
  const { context, reader } = boot();
  const Cache = vm.runInContext("PocketQuranCacheManager", context);
  const cache = Object.create(Cache.prototype);

  assert.equal(cache.isCacheableJsonUrl(reader.getSearchApiUrl("mercy", 20, 1)), true);
  assert.equal(
    cache.isCacheableJsonUrl("https://example.com/api/v4/search?q=mercy"),
    false,
    "only Quran.com's own API is cached",
  );
});

test("the search panel is built once, with a progress ring and a result list", () => {
  const { document, reader } = boot();

  const modal = reader.createPocketQuranSearchModal();

  assert.equal(reader.createPocketQuranSearchModal(), modal, "the second open reuses it");
  assert.equal(modal.parentElement, document.body);
  assert.equal(modal.querySelector(".pq-search-progress-ring") !== null, true);
  assert.equal(modal.querySelector(".pq-search-results") !== null, true);
  assert.equal(modal.querySelector(".pq-search-pagination") !== null, true);
});

test("the search button sits with the card's header actions and opens the panel", () => {
  const { document, reader } = boot();
  const actions = document.querySelector("#pocketQuranCard .card-header-actions");

  reader.createPocketQuranSearchButton();
  reader.createPocketQuranSearchButton();

  const buttons = actions.querySelectorAll(".pq-search-btn");
  assert.equal(buttons.length, 1, "a second init adds no second button");
  assert.equal(
    buttons[0].nextElementSibling.classList.contains("card-blur-menu"),
    true,
    "the button joins the header actions, ahead of the blur menu",
  );

  buttons[0].click();
  assert.equal(reader._searchModal.classList.contains("active"), true);

  reader.closePocketQuranSearchModal();
  assert.equal(reader._searchModal.classList.contains("active"), false);
});

test("searching shows the ring, its progress and a disabled submit", () => {
  const { reader } = boot();
  reader.createPocketQuranSearchModal();

  reader.setPocketQuranSearchLoading(true, { done: 57, total: 114, source: "api" });
  const ring = reader._searchModal.querySelector(".pq-search-progress-ring");
  assert.equal(reader._searchProgressEl.hidden, false);
  assert.equal(ring.style.getPropertyValue("--pq-search-progress"), "50%");
  assert.equal(reader._searchSubmitBtn.disabled, true);

  reader.setPocketQuranSearchLoading(false);
  assert.equal(reader._searchProgressEl.hidden, true);
  assert.equal(reader._searchSubmitBtn.disabled, false);
});

test("a search with no hits falls back to the downloaded translation", async () => {
  const { reader, PocketQuran } = boot();
  const label = PocketQuran.TRANSLATIONS[20].label;
  reader.createPocketQuranSearchModal();
  const urls = [];
  reader.fetchJson = async (url) => {
    urls.push(url);
    if (url.includes("/search?")) {
      return { search: { results: [], total_results: 0, total_pages: 1 } };
    }
    if (url.includes("/quran/translations/20")) {
      return {
        translations: [
          { verse_key: "2:255", chapter_id: 2, verse_number: 255, text: "His <sup>1</sup>throne is wide" },
          { verse_key: "2:1", chapter_id: 2, verse_number: 1, text: "No match here" },
        ],
      };
    }
    if (url.includes("/quran/verses/uthmani")) {
      return { verses: [{ verse_key: "2:255", text_uthmani: "اللَّهُ" }] };
    }
    throw new Error(`unexpected request ${url}`);
  };
  reader._searchInput.value = "throne";

  await reader.runPocketQuranSearch();

  assert.equal(
    urls.filter((url) => url.includes("/search?")).length,
    1,
    "the API is asked once before the fallback",
  );
  const rows = reader._searchResultsEl.querySelectorAll(".pq-search-result");
  assert.equal(rows.length, 1, "only the verse whose translation has the term");
  assert.equal(rows[0].querySelector(".pq-search-result-ar").textContent, "اللَّهُ");
  assert.equal(
    reader._searchStatusEl.textContent,
    `Showing 1-1 of 1 result in ${label}. Loaded from cache.`,
  );
  const marks = rows[0].querySelectorAll(".pq-search-result-tr mark");
  assert.deepEqual([...marks].map((mark) => mark.textContent), ["throne"]);
});

test("a search that hits asks for one API page and renders what came back", async () => {
  const { reader, PocketQuran } = boot();
  const label = PocketQuran.TRANSLATIONS[20].label;
  reader.createPocketQuranSearchModal();
  const urls = [];
  reader.fetchJson = async (url) => {
    urls.push(url);
    return {
      search: {
        results: [
          { verse_id: 1, verse_key: "2:255", chapter_id: 2, verse_number: 255, text: "اللَّهُ", translations: [{ text: "His throne" }] },
        ],
        total_results: 1,
        total_pages: 1,
        current_page: 1,
      },
    };
  };
  reader._searchInput.value = "throne";

  await reader.runPocketQuranSearch();

  assert.deepEqual(urls, [reader.getSearchApiUrl("throne", 20, 1)]);
  assert.equal(
    reader._searchStatusEl.textContent,
    `Showing 1-1 of 1 result in ${label}. Quran.com search.`,
  );
});

test("query terms are matched literally, not as markup or a pattern", () => {
  const { document, reader } = boot();
  const container = document.createElement("div");

  reader.appendHighlightedText(container, 'a.b <b>text</b> and a.b', "a.b");

  assert.deepEqual(
    [...container.querySelectorAll("mark")].map((mark) => mark.textContent),
    ["a.b", "a.b"],
  );
  assert.equal(container.querySelector("b"), null, "the ayah's markup is text here");
  assert.equal(container.textContent, "a.b <b>text</b> and a.b");
});

test("a hundred results a page, and the pagination turns the page", () => {
  const { reader } = boot();
  reader.createPocketQuranSearchModal();
  reader._getIcon = (glyph) => String(glyph);
  const many = Array.from({ length: 150 }, (_, index) => result(index + 1));

  showResults(reader, many);

  assert.equal(reader._searchResultsEl.querySelectorAll(".pq-search-result").length, 100);
  const next = [...reader._searchPaginationEl.querySelectorAll("button[data-page]")].find(
    (button) => button.dataset.page === "2",
  );
  assert.ok(next, "no way to reach the second page");
  next.click();
  assert.equal(reader._searchResultsEl.querySelectorAll(".pq-search-result").length, 50);
  assert.equal(reader._searchStatusEl.textContent.startsWith("Showing 101-150 of 150"), true);

  showResults(reader, [result(1)]);
  assert.equal(
    reader._searchPaginationEl.children.length,
    0,
    "one page of results needs no pagination",
  );
});

test("a result row is selectable, and only its icon opens the ayah", async () => {
  const { reader } = boot();
  reader.createPocketQuranSearchModal();
  reader._getIcon = (glyph) => String(glyph);
  const navigations = [];
  reader.setActiveSurah = async (surah, options) => navigations.push({ surah, options });
  reader.scrollToAyah = (ayah) => navigations.push({ ayah });
  showResults(reader, [result(255)]);

  const [row] = reader._searchResultsEl.querySelectorAll(".pq-search-result");
  const meta = row.querySelector(".pq-search-result-meta");
  assert.equal(row.tagName, "DIV", "the row is not a button");
  assert.equal(row.getAttribute("role"), "listitem");
  assert.equal(meta.tagName, "DIV");
  assert.equal(meta.querySelector(".pq-search-result-meta-text").textContent, "Al-Baqarah 2:255");

  row.click();
  assert.deepEqual(navigations, [], "clicking the row does nothing");

  meta.querySelector("button.pq-search-result-meta-icon").click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(JSON.parse(JSON.stringify(navigations)), [
    { surah: 2, options: { preserveAyah: false, autoScroll: false } },
    { ayah: 255 },
  ]);
  assert.equal(reader._searchModal.classList.contains("active"), false);
});

test("the result's copy button copies that ayah and shows it happened", async () => {
  const { reader } = boot();
  reader.createPocketQuranSearchModal();
  reader._getIcon = (glyph) => String(glyph);
  const copied = [];
  reader.copyPocketQuranAyah = async (verse, surah, ayah) => {
    copied.push({ verse, surah, ayah });
    return true;
  };
  showResults(reader, [result(255, "His throne")]);

  const button = reader._searchResultsEl.querySelector(".pq-search-result-copy");
  button.click();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(JSON.parse(JSON.stringify(copied)), [
    {
      verse: { text_uthmani: "اللَّهُ", translations: [{ text: "His throne" }] },
      surah: 2,
      ayah: 255,
    },
  ]);
  assert.equal(button.classList.contains("copied"), true);

  button._pocketQuranCopyTimer && clearTimeout(button._pocketQuranCopyTimer);
});

test("the copy helper reports whether the text reached the clipboard", async () => {
  const { dom, reader } = boot();
  const written = [];
  Object.defineProperty(dom.window.navigator, "clipboard", {
    configurable: true,
    value: { writeText: async (text) => written.push(text) },
  });

  assert.equal(await reader.copyPocketQuranAyah({ text_uthmani: "اللَّهُ", translations: [] }, 2, 255), true);
  assert.deepEqual(written, [String.raw`"" (Al-Baqarah 2:255)`]);

  Object.defineProperty(dom.window.navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async () => {
        throw new Error("denied");
      },
    },
  });
  assert.equal(await reader.copyPocketQuranAyah({ text_uthmani: "اللَّهُ" }, 2, 255), false);
});

test("an ayah carries its badge, its copy control and the controls stack", async () => {
  const { reader } = boot();
  reader.isAyahBookmarked = () => false;
  reader._getIcon = (glyph) => String(glyph);
  const copied = [];
  reader.copyPocketQuranAyah = async (verse, surah, ayah) => {
    copied.push([surah, ayah]);
    return true;
  };

  const el = reader.createAyahElement(
    {
      verse_number: 7,
      verse_key: "2:7",
      text_uthmani: "بِسْمِ ٱللَّهِ",
      translations: [{ text: "In the name" }],
    },
    0,
  );

  assert.deepEqual(
    [...el.children].map((child) => child.className),
    ["pq-ayah-controls-stack", "pocket-quran-ayah-badge", "pocket-quran-ayah-ar", "pocket-quran-ayah-tr"],
    "the badge is outside the bottom-left stack",
  );
  assert.deepEqual(
    [...el.querySelector(".pq-ayah-controls-stack").children].map((child) => child.className),
    ["pocket-quran-ayah-star", "pq-ayah-play-btn ", "pocket-quran-ayah-copy-badge"],
  );
  assert.equal(el.querySelector(".pocket-quran-ayah-badge").textContent, "2:7");

  const copyBadge = el.querySelector(".pocket-quran-ayah-copy-badge");
  assert.equal(copyBadge.querySelector(".pocket-quran-ayah-copy-badge-icon") !== null, true);
  copyBadge.click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(copied, [[2, 7]]);
  assert.equal(copyBadge.classList.contains("copied"), true,
    "the badge only celebrates a copy that happened");
  copyBadge._pocketQuranCopyTimer && clearTimeout(copyBadge._pocketQuranCopyTimer);
});

test("a copy that failed shows no success state", async () => {
  const { reader } = boot();
  reader.isAyahBookmarked = () => false;
  reader._getIcon = (glyph) => String(glyph);
  reader.copyPocketQuranAyah = async () => false;

  const el = reader.createAyahElement(
    { verse_number: 7, verse_key: "2:7", text_uthmani: "x", translations: [] },
    0,
  );
  const copyBadge = el.querySelector(".pocket-quran-ayah-copy-badge");
  copyBadge.click();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(copyBadge.classList.contains("copied"), false);
});

test("search result rows allow selection and never highlight on hover", () => {
  const rules = stylesheetRules();
  const declarations = (selector) => {
    const rule = rules.find(
      (candidate) =>
        String(candidate.selectorText || "").replace(/\s+/g, " ") === selector,
    );
    assert.ok(rule, `no rule for ${selector}`);
    return rule.cssText;
  };

  assert.match(declarations(".pq-search-result"), /user-select:\s*text/, "a result can be selected");
  assert.match(declarations(".pq-search-result-meta-text"), /user-select:\s*text/);
  assert.match(declarations(".pq-search-result-copy"), /margin-inline-start:\s*auto/, "the copy button hugs the far edge");
  assert.match(declarations(".pq-search-result-copy.copied"), /:/, "the copied state is styled");
  assert.equal(
    rules.some((rule) => String(rule.selectorText || "").includes(".pq-search-result:hover")),
    false,
    "a row must not light up under the pointer",
  );
});

test("the ayah badge stays top-right and its copy control bottom-left", () => {
  const { reader } = boot();
  const rules = stylesheetRules();
  const declarations = (selector) => {
    const rule = rules.find(
      (candidate) =>
        String(candidate.selectorText || "").replace(/\s+/g, " ") === selector,
    );
    assert.ok(rule, `no rule for ${selector}`);
    return rule.cssText;
  };

  const badge = declarations(".pocket-quran-ayah-badge");
  assert.match(badge, /position:\s*absolute/);
  assert.match(badge, /right:\s*var\(--spacing-md\)/);
  assert.match(badge, /top:\s*calc\(var\(--spacing-md\) \+ var\(--pq-ayah-badge-align-offset, 0px\)\)/);
  assert.match(declarations(".pocket-quran-ayah-copy-badge"), /position:\s*static/);
  assert.match(declarations(".pocket-quran-ayah-copy-badge.copied"), /:/);

  reader.applyFontSizes(48, 20);
  assert.notEqual(
    reader.card.style.getPropertyValue("--pq-ayah-badge-align-offset"),
    "",
    "the badge's top offset follows the Arabic size",
  );
  assert.notEqual(reader.card.style.getPropertyValue("--pq-ayah-badge-align-offset"), "0.00px");
});

test("Tajweed is offered only for the KFGQPC faces, and a toggle redraws", async () => {
  const { reader } = boot();
  const redraws = [];
  const meta = [];
  reader.persistPocketQuranSettings = () => {};
  reader.updateTajweedToggleUI = () => {};
  reader.preloadTajweedVerses = async () => {};
  reader.refreshRenderedAyahs = (options) => redraws.push(options);
  reader.refreshSurahHeaderMeta = () => meta.push("meta");

  assert.equal(reader.isTajweedAllowedForFont("KFGQPC Uthman Taha Naskh"), true);
  assert.equal(reader.isTajweedAllowedForFont("KFGQPC KSA Regular"), true);
  assert.equal(reader.isTajweedAllowedForFont("Noto Naskh Arabic"), false);
  assert.equal(reader.isTajweedAllowedForFont("Amiri"), false);

  reader._arabicFontFamily = "KFGQPC Uthman Taha Naskh";
  await reader.toggleTajweedMode();
  assert.equal(redraws.length, 1);
  assert.equal(redraws[0].preserveScroll, true, "the redraw keeps the reader's place");
  assert.equal(meta.length, 1);

  reader._isTajweedMode = true;
  reader.disableTajweedMode();
  assert.equal(redraws.length, 2);
  assert.equal(redraws[1].preserveScroll, true);
  assert.equal(reader._isTajweedMode, false);
});

test("the whole surah is rendered once and a forced redraw replaces it", () => {
  const { document, reader } = boot();
  reader.isAyahBookmarked = () => false;
  reader._getIcon = (glyph) => String(glyph);
  reader._virtualContent = document.createElement("div");
  reader._virtualContainer = document.createElement("div");
  reader._virtualContainer.scrollTop = 120;
  reader._ayahHeights = new Map();
  reader._avgAyahHeight = 100;
  reader._renderedRange = { start: -1, end: -1 };
  reader._activeVerses = [1, 2, 3].map((ayah) => ({
    verse_number: ayah,
    verse_key: `2:${ayah}`,
    text_uthmani: `word${ayah}`,
    translations: [],
  }));

  reader.renderVisibleAyahs();

  assert.equal(reader._virtualContent.childElementCount, 3, "the whole surah, not a window");
  assert.equal(reader._renderedRange.start, 0);
  assert.equal(reader._renderedRange.end, 2, "the whole surah is the rendered range");
  assert.equal(reader._virtualContent.style.transform, "none", "nothing is translated");
  assert.equal(reader._virtualContainer.scrollTop, 120, "rendering leaves the reader's place alone");

  reader._activeVerses[0].text_uthmani = "changed";
  reader.renderVisibleAyahs();
  assert.equal(reader._virtualContent.textContent.includes("changed"), false, "a settled render is left alone");

  reader.renderVisibleAyahs({ force: true });
  assert.equal(reader._virtualContent.textContent.includes("changed"), true);
});

test("the visible ayah is the one whose rendered box crosses the line", () => {
  const { document, reader } = boot();
  reader.isAyahBookmarked = () => false;
  reader._getIcon = (glyph) => String(glyph);
  reader._virtualContent = document.createElement("div");
  reader._virtualContainer = document.createElement("div");
  reader._ayahHeights = new Map();
  reader._avgAyahHeight = 100;
  reader._renderedRange = { start: -1, end: -1 };
  reader._activeVerses = [1, 2, 3].map((ayah) => ({
    verse_number: ayah,
    verse_key: `2:${ayah}`,
    text_uthmani: "x",
    translations: [],
  }));
  reader.renderVisibleAyahs();

  const boxes = [40, 200, 300];
  reader._virtualContent.querySelectorAll(".pocket-quran-ayah").forEach((el, index) => {
    el.getBoundingClientRect = () => ({ top: index * 100, bottom: boxes[index] });
  });

  assert.equal(reader.getFirstVisibleRenderedAyahIndex(), 1);

  boxes[0] = 300;
  assert.equal(reader.getFirstVisibleRenderedAyahIndex(), 0, "the answer comes from the boxes");
  boxes[0] = 10;
  boxes[1] = 20;
  boxes[2] = 30;
  assert.equal(reader.getFirstVisibleRenderedAyahIndex(), 2, "nothing crossing the line falls to the last row");
});

test("the recitation controls are placed right after the header actions", () => {
  const { document, reader } = boot();
  const actions = document.querySelector("#pocketQuranCard .card-header-actions");
  reader._headerControlsBox = document.createElement("div");
  reader._headerControlsBox.className = "pq-recitation-controls";

  assert.equal(reader.ensureRecitationControlsAttachedToHeader(), true);
  assert.equal(actions.nextElementSibling, reader._headerControlsBox);
  assert.equal(
    document.querySelector("#pocketQuranCard .pocket-quran-header").classList.contains(
      "pq-has-recitation-controls",
    ),
    true,
  );
});

test("the header lays its actions and controls out in one two-column grid", () => {
  const rules = stylesheetRules();
  const declarations = (selector) => {
    const rule = rules.find(
      (candidate) =>
        String(candidate.selectorText || "").replace(/\s+/g, " ") === selector,
    );
    assert.ok(rule, `no rule for ${selector}`);
    return rule.cssText;
  };

  assert.match(
    declarations(".pocket-quran-header.pq-has-recitation-controls"),
    /grid-template-columns:\s*minmax\(0, 1fr\) auto/,
  );
  const controls = declarations(
    ".pocket-quran-header.pq-has-recitation-controls .pq-recitation-controls:not(.pq-recitation-controls-floating)",
  );
  assert.match(controls, /grid-column:\s*2/);
  assert.match(controls, /grid-row:\s*2/);
  assert.match(controls, /justify-self:\s*end/);
});

test("the copy setting defaults to leaving the Arabic out", () => {
  const sandbox = loadSandbox(["js/settings-registry.js", "js/storage.js"], {
    globals: { localStorage: { getItem: () => null, setItem() {}, removeItem() {} } },
  });

  assert.equal(
    vm.runInContext("new StorageManager().getSettings().pocketQuran.copyIncludeArabic", sandbox),
    false,
  );
});

test("the ayah copy setting sits above the Tajweed colours in the markup", () => {
  const document = loadPageDom("index.html");
  const copy = document.getElementById("pocketQuranSettingAyahCopy");
  const colors = document.getElementById("pocketQuranSettingTajweedColors");

  assert.ok(copy, "no ayah copy setting");
  assert.ok(colors, "no Tajweed colour setting");
  assert.equal(
    copy.compareDocumentPosition(colors) & document.defaultView.Node.DOCUMENT_POSITION_FOLLOWING,
    document.defaultView.Node.DOCUMENT_POSITION_FOLLOWING,
  );
});

/** Every rule of the shipped stylesheet, nested ones included. */
function stylesheetRules() {
  const css = fs.readFileSync(path.join(repoRoot, "css/styles.css"), "utf8");
  const dom = new JSDOM(`<style>${css}</style>`, { url: "https://localhost/" });
  const walk = (rules) =>
    [...rules].flatMap((rule) => [rule, ...(rule.cssRules ? walk(rule.cssRules) : [])]);
  return walk(dom.window.document.styleSheets[0].cssRules);
}

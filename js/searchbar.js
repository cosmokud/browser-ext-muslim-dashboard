/**
 * Search Bar Manager (Custom Searches)
 * - Stores custom searches in localStorage
 * - Shows favicon tabs (Google favicon service)
 * - Scroll arrows appear when searches > 10
 * - Lets the user choose an accent color per engine (via right-click menu)
 */

class SearchBarManager {
  static MAX_VISIBLE = 10;

  constructor(storage) {
    this.storage = storage;

    this.searches = [];
    this.selectedId = null;
    this.scrollIndex = 0;

    this.contextMenu = null;
    this.pendingDeleteId = null;

    this.customColorInput = null;

    // Favicon-derived palette cache (ColorThief-style: dominant + palette)
    this.faviconPaletteCache = new Map();
    this.faviconPaletteInFlight = new Map();

    // Elements
    this.section = document.getElementById("searchBarSection");
    this.shell = document.getElementById("searchBarShell");

    this.prevBtn = document.getElementById("searchBarEnginesPrev");
    this.nextBtn = document.getElementById("searchBarEnginesNext");
    this.viewport = document.getElementById("searchBarEngineViewport");
    this.strip = document.getElementById("searchBarEngineStrip");

    this.form = document.getElementById("searchBarForm");
    this.input = document.getElementById("searchBarInput");
    this.addBtn = document.getElementById("searchBarAddBtn");

    // Add modal
    this.addModal = document.getElementById("searchBarModal");
    this.addModalForm = document.getElementById("searchBarModalForm");
    this.addModalCloseBtn = document.getElementById("closeSearchBarModal");
    this.addModalCancelBtn = document.getElementById("cancelSearchBarModal");
    this.newName = document.getElementById("searchBarNewName");
    this.newUrl = document.getElementById("searchBarNewUrl");

    // Edit modal
    this.editModal = document.getElementById("editSearchBarModal");
    this.editModalForm = document.getElementById("editSearchBarModalForm");
    this.editModalCloseBtn = document.getElementById("closeEditSearchBarModal");
    this.editModalCancelBtn = document.getElementById("cancelEditSearchBar");
    this.editName = document.getElementById("editSearchBarName");
    this.editUrl = document.getElementById("editSearchBarUrl");
    this.editIdInput = document.getElementById("editSearchBarId");

    // Delete confirm modal
    this.deleteModal = document.getElementById("searchBarDeleteConfirmModal");
    this.deleteNameEl = document.getElementById("searchBarDeleteName");
    this.confirmDeleteBtn = document.getElementById(
      "confirmSearchBarDeleteBtn"
    );
    this.cancelDeleteBtn = document.getElementById("cancelSearchBarDeleteBtn");

    this.init();
  }

  init() {
    if (
      !this.section ||
      !this.shell ||
      !this.strip ||
      !this.form ||
      !this.input
    )
      return;

    this.loadFromStorage();
    this.bindEvents();
    this.createContextMenu();
    this.render();

    // If empty, nudge user toward adding one.
    if (!this.searches.length) {
      this.setPlaceholder("Add a custom search");
    }
  }

  notify(message, type = "info") {
    try {
      if (window.dashboard?.settings?.showToast) {
        window.dashboard.settings.showToast(String(message), type);
        return;
      }
    } catch (e) {}

    // Minimal fallback.
    if (type === "error") {
      alert(String(message));
    } else {
      console.log(message);
    }
  }

  loadFromStorage() {
    const raw =
      typeof this.storage.getCustomSearches === "function"
        ? this.storage.getCustomSearches()
        : this.storage.get("customSearches", []);

    const list = Array.isArray(raw) ? raw : [];

    this.searches = list
      .filter(
        (s) => s && typeof s.name === "string" && typeof s.url === "string"
      )
      .map((s) => {
        const id = s.id ?? Date.now() + Math.random();
        const name = String(s.name || "")
          .trim()
          .slice(0, 40);
        const url = String(s.url || "").trim();
        const favicon = typeof s.favicon === "string" ? s.favicon : null;
        const accentRgb =
          typeof s.accentRgb === "string" ? String(s.accentRgb) : null;
        return { id, name, url, favicon, accentRgb };
      })
      .filter((s) => s.name && s.url);

    const lastId =
      typeof this.storage.getLastCustomSearchId === "function"
        ? this.storage.getLastCustomSearchId()
        : this.storage.get("customSearchLastId", null);

    const exists = (id) =>
      this.searches.some((s) => String(s.id) === String(id));

    if (lastId != null && exists(lastId)) {
      this.selectedId = lastId;
    } else {
      this.selectedId = this.searches[0]?.id ?? null;
    }

    this.ensureSelectionInView();
  }

  persist() {
    if (typeof this.storage.saveCustomSearches === "function") {
      this.storage.saveCustomSearches(this.searches);
    } else {
      this.storage.set("customSearches", this.searches);
    }

    if (typeof this.storage.saveLastCustomSearchId === "function") {
      this.storage.saveLastCustomSearchId(this.selectedId);
    } else {
      this.storage.set("customSearchLastId", this.selectedId);
    }
  }

  bindEvents() {
    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.runSearch();
    });

    if (this.prevBtn) {
      this.prevBtn.addEventListener("click", () => this.scrollBy(-1));
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener("click", () => this.scrollBy(1));
    }

    if (this.addBtn) {
      this.addBtn.addEventListener("click", () => {
        this.showAddModal();
      });
    }

    // Add modal events
    if (this.addModalCloseBtn) {
      this.addModalCloseBtn.addEventListener("click", () =>
        this.hideAddModal()
      );
    }
    if (this.addModalCancelBtn) {
      this.addModalCancelBtn.addEventListener("click", () =>
        this.hideAddModal()
      );
    }
    if (this.addModal) {
      this.addModal.addEventListener("click", (e) => {
        if (e.target === this.addModal) this.hideAddModal();
      });
    }
    if (this.addModalForm) {
      this.addModalForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.addCustomSearchFromModal();
      });
    }

    // Edit modal events
    if (this.editModalCloseBtn) {
      this.editModalCloseBtn.addEventListener("click", () =>
        this.hideEditModal()
      );
    }
    if (this.editModalCancelBtn) {
      this.editModalCancelBtn.addEventListener("click", () =>
        this.hideEditModal()
      );
    }
    if (this.editModal) {
      this.editModal.addEventListener("click", (e) => {
        if (e.target === this.editModal) this.hideEditModal();
      });
    }
    if (this.editModalForm) {
      this.editModalForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.updateCustomSearchFromModal();
      });
    }

    // Delete modal events
    if (this.cancelDeleteBtn) {
      this.cancelDeleteBtn.addEventListener("click", () =>
        this.hideDeleteConfirmation()
      );
    }
    if (this.confirmDeleteBtn) {
      this.confirmDeleteBtn.addEventListener("click", () =>
        this.confirmDelete()
      );
    }
    if (this.deleteModal) {
      this.deleteModal.addEventListener("click", (e) => {
        if (e.target === this.deleteModal) this.hideDeleteConfirmation();
      });
    }

    // Escape closes context menu + modals
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      this.hideContextMenu();
      this.hideAddModal();
      this.hideEditModal();
      this.hideDeleteConfirmation();
    });
  }

  showAddModal() {
    if (!this.addModal) return;
    try {
      this.addModalForm?.reset();
    } catch (e) {}
    this.addModal.classList.add("active");
    this.newName?.focus();
  }

  hideAddModal() {
    if (!this.addModal) return;
    this.addModal.classList.remove("active");
  }

  showEditModal(engineId) {
    const engine = this.searches.find((s) => String(s.id) === String(engineId));
    if (!engine || !this.editModal) return;

    if (this.editName) this.editName.value = engine.name;
    if (this.editUrl) this.editUrl.value = engine.url;
    if (this.editIdInput) this.editIdInput.value = String(engine.id);

    this.editModal.classList.add("active");
    this.editName?.focus();
  }

  hideEditModal() {
    if (!this.editModal) return;
    this.editModal.classList.remove("active");
    try {
      this.editModalForm?.reset();
    } catch (e) {}
  }

  showDeleteConfirmation(engineId) {
    const engine = this.searches.find((s) => String(s.id) === String(engineId));
    if (!engine || !this.deleteModal) return;

    this.pendingDeleteId = String(engine.id);
    if (this.deleteNameEl) this.deleteNameEl.textContent = engine.name;
    this.deleteModal.classList.add("active");
  }

  hideDeleteConfirmation() {
    if (!this.deleteModal) return;
    this.deleteModal.classList.remove("active");
    this.pendingDeleteId = null;
  }

  confirmDelete() {
    if (!this.pendingDeleteId) return;
    this.deleteEngine(this.pendingDeleteId);
    this.hideDeleteConfirmation();
  }

  createContextMenu() {
    if (this.contextMenu) return;

    const menu = document.createElement("div");
    menu.className = "pinned-app-context-menu";
    menu.classList.add("search-bar-context-menu");
    menu.innerHTML = `
      <button class="context-menu-item context-menu-edit" type="button">
        <span class="context-menu-icon">✏️</span>
        <span>Edit</span>
      </button>
      <div class="context-menu-divider" role="separator"></div>
      <div class="context-menu-accent" aria-label="Accent color">
        <div class="context-menu-accent-title">Accent color</div>
        <div class="context-menu-accent-palette" data-role="accent-palette"></div>
        <button class="context-menu-item context-menu-accent-custom" type="button">
          <span class="context-menu-icon">🎨</span>
          <span>Custom color…</span>
        </button>
      </div>
      <div class="context-menu-divider" role="separator"></div>
      <button class="context-menu-item context-menu-delete" type="button">
        <span class="context-menu-icon">🗑️</span>
        <span>Delete</span>
      </button>
    `;

    document.body.appendChild(menu);
    this.contextMenu = menu;

    // Hidden color input to allow arbitrary selection.
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.className = "context-menu-color-input";
    colorInput.setAttribute("aria-label", "Pick custom accent color");
    colorInput.tabIndex = -1;
    menu.appendChild(colorInput);
    this.customColorInput = colorInput;

    // Build palette swatches from theme primitives.
    this._renderAccentPaletteForEngine(null);

    this.contextMenu
      .querySelector(".context-menu-edit")
      .addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = this.contextMenu?.dataset?.engineId;
        this.hideContextMenu();
        if (id != null) this.showEditModal(id);
      });

    this.contextMenu
      .querySelector(".context-menu-accent-custom")
      .addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const engineId = this.contextMenu?.dataset?.engineId;
        if (!engineId || !this.customColorInput) return;

        const engine = this.searches.find(
          (s) => String(s.id) === String(engineId)
        );
        const current = this._normalizeRgbString(engine?.accentRgb);
        this.customColorInput.value =
          this._rgbStringToHex(current) || "#ffffff";

        // Trigger native picker.
        this.customColorInput.click();
      });

    if (this.customColorInput) {
      this.customColorInput.addEventListener("input", (e) => {
        const engineId = this.contextMenu?.dataset?.engineId;
        const hex = String(e.target?.value || "").trim();
        if (!engineId) return;

        const rgb = this._hexToRgbString(hex);
        if (!rgb) return;

        this.setEngineAccent(engineId, rgb);
        this.hideContextMenu();
      });
    }

    const palette = this.contextMenu.querySelector(
      '[data-role="accent-palette"]'
    );
    if (palette) {
      palette.addEventListener("click", (e) => {
        const btn = e.target.closest("button.context-menu-swatch");
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        const engineId = this.contextMenu?.dataset?.engineId;
        const rgb = btn.dataset.rgb;
        if (!engineId || !rgb) return;
        this.setEngineAccent(engineId, rgb);
        this.hideContextMenu();
      });
    }

    this.contextMenu
      .querySelector(".context-menu-delete")
      .addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = this.contextMenu?.dataset?.engineId;
        this.hideContextMenu();
        if (id != null) this.showDeleteConfirmation(id);
      });

    document.addEventListener("click", (e) => {
      if (this.contextMenu && !this.contextMenu.contains(e.target)) {
        this.hideContextMenu();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.hideContextMenu();
      }
    });

    document.addEventListener(
      "scroll",
      () => {
        this.hideContextMenu();
      },
      true
    );
  }

  showContextMenu(x, y, engineId) {
    if (!this.contextMenu) return;

    this.contextMenu.dataset.engineId = String(engineId);

    // Refresh the palette for the current engine.
    this._renderAccentPaletteForEngine(engineId);

    this.contextMenu.style.left = `${x}px`;
    this.contextMenu.style.top = `${y}px`;
    this.contextMenu.classList.add("active");

    const rect = this.contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      this.contextMenu.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
      this.contextMenu.style.top = `${y - rect.height}px`;
    }
  }

  hideContextMenu() {
    if (!this.contextMenu) return;
    this.contextMenu.classList.remove("active");
    delete this.contextMenu.dataset.engineId;
  }

  setEngineAccent(engineId, rgbString) {
    const idx = this.searches.findIndex(
      (s) => String(s.id) === String(engineId)
    );
    if (idx < 0) return;

    const normalized = this._normalizeRgbString(rgbString);
    this.searches[idx] = {
      ...this.searches[idx],
      accentRgb: normalized,
    };

    // If this engine is selected, apply immediately.
    if (String(this.selectedId) === String(engineId)) {
      this.applyEngineAccent(this.searches[idx]);
    }

    this.persist();
    this.render();
  }

  _isValidRgbString(rgbString) {
    return (
      typeof rgbString === "string" &&
      /^\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*$/.test(rgbString)
    );
  }

  deleteEngine(engineId) {
    const idx = this.searches.findIndex(
      (s) => String(s.id) === String(engineId)
    );
    if (idx < 0) return;

    this.searches.splice(idx, 1);

    if (this.searches.length === 0) {
      this.selectedId = null;
      this.scrollIndex = 0;
    } else if (String(this.selectedId) === String(engineId)) {
      this.selectedId =
        this.searches[Math.min(idx, this.searches.length - 1)].id;
    }

    this.persist();
    this.render();
  }

  _normalizeAndValidateTemplate(name, url) {
    const cleanName = String(name || "").trim();
    let cleanUrl = String(url || "").trim();

    if (!cleanName || !cleanUrl) return null;
    if (!cleanUrl.includes("%s")) {
      this.notify("URL must include %s where the query goes.", "error");
      return null;
    }

    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = "https://" + cleanUrl;
    }

    try {
      new URL(cleanUrl.split("%s").join("test"));
    } catch (e) {
      this.notify("Please enter a valid URL template.", "error");
      return null;
    }

    return { name: cleanName, url: cleanUrl };
  }

  addCustomSearchFromModal() {
    const normalized = this._normalizeAndValidateTemplate(
      this.newName?.value,
      this.newUrl?.value
    );
    if (!normalized) return;

    const favicon = this.getFaviconUrlFromTemplate(normalized.url);
    const entry = {
      id: Date.now(),
      name: normalized.name,
      url: normalized.url,
      favicon,
      accentRgb: null,
    };

    this.searches.push(entry);
    this.selectedId = entry.id;
    this.persist();

    this.hideAddModal();
    this.render();
    this.input?.focus();
  }

  updateCustomSearchFromModal() {
    const id = this.editIdInput?.value;
    if (!id) return;

    const normalized = this._normalizeAndValidateTemplate(
      this.editName?.value,
      this.editUrl?.value
    );
    if (!normalized) return;

    const idx = this.searches.findIndex((s) => String(s.id) === String(id));
    if (idx < 0) return;

    const favicon = this.getFaviconUrlFromTemplate(normalized.url);

    this.searches[idx] = {
      ...this.searches[idx],
      name: normalized.name,
      url: normalized.url,
      favicon,
    };

    // Keep selection stable
    this.selectedId = this.searches[idx].id;
    this.persist();

    this.hideEditModal();
    this.render();
    this.input?.focus();
  }

  setPlaceholder(text) {
    if (!this.input) return;
    this.input.placeholder = String(text || "Searching...");
  }

  getSelected() {
    if (!this.searches.length) return null;
    return (
      this.searches.find((s) => String(s.id) === String(this.selectedId)) ||
      this.searches[0]
    );
  }

  selectEngine(id) {
    if (!this.searches.length) return;

    const found = this.searches.find((s) => String(s.id) === String(id));
    if (!found) return;

    this.selectedId = found.id;
    this.persist();

    this.ensureSelectionInView();
    this.updateSelectionUi();
    this.applyEngineAccent(found);
  }

  async _ensureDefaultAccentForEngine(engine) {
    if (!engine) return;
    if (this._isValidRgbString(engine.accentRgb)) return;

    const faviconUrl =
      engine.favicon || this.getFaviconUrlFromTemplate(engine.url);
    if (!faviconUrl) return;

    // Ensure favicon is stored for future loads.
    if (!engine.favicon) {
      engine.favicon = faviconUrl;
      this.persist();
    }

    const colors10 = await this._getFaviconColors10(faviconUrl);
    const dominant = colors10?.[0];
    if (!dominant) return;

    // Persist default accent for this engine.
    this.setEngineAccent(engine.id, dominant);
  }

  ensureSelectionInView() {
    const idx = this.searches.findIndex(
      (s) => String(s.id) === String(this.selectedId)
    );
    if (idx < 0) return;

    const max = SearchBarManager.MAX_VISIBLE;
    if (idx < this.scrollIndex) {
      this.scrollIndex = idx;
    } else if (idx >= this.scrollIndex + max) {
      this.scrollIndex = Math.max(0, idx - max + 1);
    }
  }

  scrollBy(delta) {
    const max = SearchBarManager.MAX_VISIBLE;
    const maxStart = Math.max(0, this.searches.length - max);

    this.scrollIndex = Math.max(
      0,
      Math.min(maxStart, this.scrollIndex + delta)
    );
    this.updateStripTransform();
  }

  getStripStepPx() {
    // Keep in sync with CSS vars.
    const fallback = 34 + 8;
    try {
      const cs = getComputedStyle(this.shell);
      const size = parseFloat(cs.getPropertyValue("--sb-engine-size")) || 34;
      const gap = parseFloat(cs.getPropertyValue("--sb-engine-gap")) || 8;
      return size + gap;
    } catch (e) {
      return fallback;
    }
  }

  updateStripTransform() {
    if (!this.strip) return;
    const step = this.getStripStepPx();
    this.strip.style.transform = `translate3d(${
      -this.scrollIndex * step
    }px, 0, 0)`;

    const shouldShow = this.searches.length > SearchBarManager.MAX_VISIBLE;
    const maxStart = Math.max(
      0,
      this.searches.length - SearchBarManager.MAX_VISIBLE
    );

    if (this.prevBtn) {
      this.prevBtn.classList.toggle(
        "is-hidden",
        !shouldShow || this.scrollIndex <= 0
      );
    }
    if (this.nextBtn) {
      this.nextBtn.classList.toggle(
        "is-hidden",
        !shouldShow || this.scrollIndex >= maxStart
      );
    }
  }

  updateSelectionUi() {
    if (!this.strip) return;

    const selected = this.getSelected();
    this.setPlaceholder(
      selected ? `Searching ${selected.name}` : "Searching..."
    );

    this.strip.querySelectorAll(".search-bar-engine-tab").forEach((btn) => {
      const id = btn.getAttribute("data-id");
      btn.setAttribute(
        "aria-selected",
        selected && String(selected.id) === String(id) ? "true" : "false"
      );
    });

    this.updateStripTransform();
  }

  getFaviconUrlFromTemplate(urlTemplate) {
    const safe = String(urlTemplate || "").trim();
    if (!safe) return null;

    // Replace %s with a sentinel so URL parsing works.
    const test = safe.split("%s").join("test");

    try {
      const urlObj = new URL(test);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
    } catch (e) {
      return null;
    }
  }

  runSearch() {
    const engine = this.getSelected();

    if (!engine) {
      this.showAddModal();
      return;
    }

    const q = String(this.input?.value || "").trim();
    if (!q) {
      this.input?.focus();
      return;
    }

    const url = String(engine.url).split("%s").join(encodeURIComponent(q));

    // Remember last used engine.
    this.selectedId = engine.id;
    this.persist();

    try {
      window.open(url, "_blank", "noopener,noreferrer");
      this.input.value = "";
    } catch (e) {
      this.notify("Could not open the search URL.", "error");
    }
  }

  applyEngineAccent(engine) {
    if (!this.shell) return;

    const rgb = this._normalizeRgbString(engine?.accentRgb);
    this.shell.style.setProperty("--sb-accent-rgb", rgb);

    // If unset, default to dominant favicon color (best-effort).
    if (engine && !this._isValidRgbString(engine.accentRgb)) {
      this._ensureDefaultAccentForEngine(engine).catch(() => {});
    }
  }

  _normalizeRgbString(rgbString) {
    const fallback = "255, 255, 255";
    if (typeof rgbString !== "string") return fallback;
    const m = rgbString
      .trim()
      .match(/^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/);
    if (!m) return fallback;
    const clamp = (n) => Math.max(0, Math.min(255, n));
    const r = clamp(parseInt(m[1], 10));
    const g = clamp(parseInt(m[2], 10));
    const b = clamp(parseInt(m[3], 10));
    return `${r}, ${g}, ${b}`;
  }

  _hexToRgbString(hex) {
    const s = String(hex || "").trim();
    const m = s.match(/^#?([0-9a-fA-F]{6})$/);
    if (!m) return null;
    const raw = m[1];
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }

  _rgbStringToHex(rgbString) {
    const m = String(rgbString || "")
      .trim()
      .match(/^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/);
    if (!m) return null;
    const clamp = (n) => Math.max(0, Math.min(255, n));
    const r = clamp(parseInt(m[1], 10));
    const g = clamp(parseInt(m[2], 10));
    const b = clamp(parseInt(m[3], 10));
    const toHex2 = (n) => n.toString(16).padStart(2, "0");
    return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
  }

  _parseHexColor(hex) {
    const rgb = this._hexToRgbString(hex);
    if (!rgb) return null;
    const m = rgb.match(/^(\d+),\s*(\d+),\s*(\d+)$/);
    if (!m) return null;
    return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
  }

  _mixRgb(a, b, t) {
    const mix = (x, y) => Math.round(x + (y - x) * t);
    return { r: mix(a.r, b.r), g: mix(a.g, b.g), b: mix(a.b, b.b) };
  }

  _rgbToString(c) {
    return `${c.r}, ${c.g}, ${c.b}`;
  }

  _getRainbowPalette20() {
    // 20 common “rainbow range” colors (fixed, predictable, covers hue spectrum).
    // Returned as "r, g, b" strings.
    const hexes = [
      "#ff0000", // red
      "#ff3b00", // red-orange
      "#ff7a00", // orange
      "#ffb300", // amber
      "#ffe600", // yellow
      "#c8ff00", // yellow-green
      "#7dff00", // lime
      "#00ff00", // green
      "#00ff6a", // spring green
      "#00ffa8", // mint
      "#00ffff", // cyan
      "#00a6ff", // sky
      "#0066ff", // blue
      "#0033ff", // deep blue
      "#4b00ff", // indigo
      "#7f00ff", // violet
      "#b800ff", // purple
      "#ff00ff", // magenta
      "#ff0099", // hot pink
      "#ff0055", // rose
    ];

    const out = [];
    for (const h of hexes) {
      const rgb = this._hexToRgbString(h);
      if (rgb) out.push(rgb);
    }
    return out;
  }

  async _getFaviconColors10(faviconUrl) {
    const key = String(faviconUrl || "");
    if (!key) return null;

    const cached = this.faviconPaletteCache.get(key);
    if (cached) return cached;

    if (this.faviconPaletteInFlight.has(key)) {
      try {
        await this.faviconPaletteInFlight.get(key);
      } catch (e) {}
      return this.faviconPaletteCache.get(key) || null;
    }

    const p = this._computeFaviconColors10(key)
      .then((colors) => {
        if (Array.isArray(colors) && colors.length) {
          this.faviconPaletteCache.set(key, colors);
        }
      })
      .finally(() => {
        this.faviconPaletteInFlight.delete(key);
      });

    this.faviconPaletteInFlight.set(key, p);

    try {
      await p;
    } catch (e) {}

    return this.faviconPaletteCache.get(key) || null;
  }

  async _computeFaviconColors10(url) {
    // ColorThief-style approach (dominant + palette) implemented locally:
    // - decode favicon into canvas
    // - build quantized histogram
    // - pick top colors with distance threshold to avoid duplicates
    let blob;
    try {
      const resp = await fetch(url, { cache: "force-cache" });
      if (!resp.ok) return null;
      blob = await resp.blob();
    } catch (e) {
      return null;
    }

    const sampleSize = 64;
    const canvas = document.createElement("canvas");
    canvas.width = sampleSize;
    canvas.height = sampleSize;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    try {
      if (typeof createImageBitmap === "function") {
        const bmp = await createImageBitmap(blob);
        ctx.drawImage(bmp, 0, 0, sampleSize, sampleSize);
      } else {
        const img = new Image();
        const objectUrl = URL.createObjectURL(blob);
        await new Promise((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = objectUrl;
        });
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
        URL.revokeObjectURL(objectUrl);
      }
    } catch (e) {
      return null;
    }

    let data;
    try {
      data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
    } catch (e) {
      return null;
    }

    // Quantization: 5 bits/channel => 32 levels.
    const shift = 3;
    const stride = 2;

    const bins = new Map();

    for (let y = 0; y < sampleSize; y += stride) {
      for (let x = 0; x < sampleSize; x += stride) {
        const i = (y * sampleSize + x) * 4;
        const a = data[i + 3];
        if (a < 32) continue;

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Ignore near-white padding
        if (r > 245 && g > 245 && b > 245) continue;

        const rQ = r >> shift;
        const gQ = g >> shift;
        const bQ = b >> shift;
        const key = (rQ << 10) | (gQ << 5) | bQ;

        const prev = bins.get(key);
        if (prev) {
          prev.count += 1;
          prev.r += r;
          prev.g += g;
          prev.b += b;
        } else {
          bins.set(key, { count: 1, r, g, b });
        }
      }
    }

    if (!bins.size) return null;

    const entries = Array.from(bins.values())
      .map((v) => ({
        count: v.count,
        r: Math.round(v.r / v.count),
        g: Math.round(v.g / v.count),
        b: Math.round(v.b / v.count),
      }))
      .sort((a, b) => b.count - a.count);

    const chosen = [];
    const dist2 = (c1, c2) => {
      const dr = c1.r - c2.r;
      const dg = c1.g - c2.g;
      const db = c1.b - c2.b;
      return dr * dr + dg * dg + db * db;
    };

    const clamp = (v) => Math.max(20, Math.min(235, v));
    const toRgbStr = (c) => `${clamp(c.r)}, ${clamp(c.g)}, ${clamp(c.b)}`;

    // Prefer distinct colors; fall back by relaxing the distance if needed.
    const thresholds = [80, 65, 50, 35];
    for (const minDist of thresholds) {
      chosen.length = 0;

      for (const c of entries) {
        if (!chosen.length) {
          chosen.push(c);
          if (chosen.length >= 10) break;
          continue;
        }

        const ok = chosen.every((p) => dist2(c, p) >= minDist * minDist);
        if (!ok) continue;
        chosen.push(c);
        if (chosen.length >= 10) break;
      }

      if (chosen.length >= 6) break;
    }

    // Ensure we return up to 10 colors; dominant is first.
    const out = chosen.slice(0, 10).map(toRgbStr);
    return out.length ? out : null;
  }

  async _renderAccentPaletteForEngine(engineId) {
    if (!this.contextMenu) return;
    const paletteEl = this.contextMenu.querySelector(
      '[data-role="accent-palette"]'
    );
    if (!paletteEl) return;

    const rainbow = this._getRainbowPalette20();

    // Always render 30 swatches.
    const initial = new Array(10).fill("255, 255, 255").concat(rainbow);
    this._renderSwatches(paletteEl, initial);

    if (!engineId) return;
    const engine = this.searches.find((s) => String(s.id) === String(engineId));
    if (!engine) return;

    const faviconUrl =
      engine.favicon || this.getFaviconUrlFromTemplate(engine.url);
    if (!faviconUrl) return;

    const colors10 = await this._getFaviconColors10(faviconUrl);
    if (!colors10) return;

    // If the menu moved to another engine while awaiting, abort.
    if (String(this.contextMenu?.dataset?.engineId) !== String(engineId))
      return;

    const dominant = colors10[0] || "255, 255, 255";
    const palette9 = colors10.slice(1, 10);
    while (palette9.length < 9)
      palette9.push(rainbow[palette9.length] || "255, 255, 255");

    const all = [dominant, ...palette9, ...rainbow];
    this._renderSwatches(paletteEl, all);
  }

  _renderSwatches(paletteEl, rgbList) {
    paletteEl.innerHTML = "";
    rgbList.forEach((rgb, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "context-menu-swatch";
      btn.dataset.rgb = rgb;
      btn.setAttribute("aria-label", `Set accent color ${rgb}`);
      btn.setAttribute("title", idx === 0 ? "Dominant favicon color" : "");
      btn.style.background = `rgb(${rgb})`;
      paletteEl.appendChild(btn);
    });
  }

  render() {
    if (!this.strip) return;

    if (this.shell) {
      this.shell.classList.toggle("has-engines", this.searches.length > 0);

      const visible = Math.max(
        1,
        Math.min(SearchBarManager.MAX_VISIBLE, this.searches.length)
      );
      this.shell.style.setProperty("--sb-engine-visible", String(visible));
    }

    // Clear
    this.strip.innerHTML = "";

    const frag = document.createDocumentFragment();

    this.searches.forEach((engine) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "search-bar-engine-tab";
      btn.setAttribute("role", "tab");
      btn.setAttribute("data-id", String(engine.id));
      btn.setAttribute(
        "aria-selected",
        String(engine.id) === String(this.selectedId) ? "true" : "false"
      );
      btn.title = engine.name;

      const icon = document.createElement("span");
      icon.className = "search-bar-engine-icon";

      const faviconUrl =
        engine.favicon || this.getFaviconUrlFromTemplate(engine.url);
      const fallback = document.createElement("span");
      fallback.className = "search-bar-engine-fallback";
      fallback.textContent = engine.name.charAt(0).toUpperCase();

      if (faviconUrl) {
        const img = document.createElement("img");
        img.src = faviconUrl;
        img.alt = engine.name;
        img.draggable = false;
        img.addEventListener("error", () => {
          img.style.display = "none";
          fallback.style.display = "flex";
        });
        icon.appendChild(img);
      }

      icon.appendChild(fallback);
      btn.appendChild(icon);

      btn.addEventListener("click", () => {
        this.selectEngine(engine.id);
      });

      btn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showContextMenu(e.clientX, e.clientY, engine.id);
      });

      frag.appendChild(btn);
    });

    this.strip.appendChild(frag);

    // Final UI sync.
    this.updateSelectionUi();

    // Apply accent for current selection.
    const selected = this.getSelected();
    if (selected) {
      // Ensure favicon is stored for future loads.
      if (!selected.favicon) {
        selected.favicon = this.getFaviconUrlFromTemplate(selected.url);
        this.persist();
      }
      this.applyEngineAccent(selected);
    } else {
      // Reset to default accent and placeholder when empty.
      if (this.shell) {
        this.shell.style.setProperty("--sb-accent-rgb", "255, 255, 255");
      }
      this.setPlaceholder("Add a custom search");
    }

    // Arrow visibility and transform.
    this.updateStripTransform();
  }
}

// Export for use
window.SearchBarManager = SearchBarManager;

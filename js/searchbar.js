/**
 * Search Bar Manager (Custom Searches)
 * - Stores custom searches in localStorage
 * - Shows favicon tabs (Google favicon service)
 * - Scroll arrows appear when searches > 10
 * - Computes a favicon-derived accent color for the bar (best-effort)
 */

class SearchBarManager {
  static MAX_VISIBLE = 10;

  constructor(storage) {
    this.storage = storage;

    this.searches = [];
    this.selectedId = null;
    this.scrollIndex = 0;

    this.colorCache = new Map();
    this.colorInFlight = new Map();

    this.contextMenu = null;
    this.pendingDeleteId = null;

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
        return { id, name, url, favicon };
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
    menu.innerHTML = `
      <button class="context-menu-item context-menu-edit" type="button">
        <span class="context-menu-icon">✏️</span>
        <span>Edit</span>
      </button>
      <button class="context-menu-item context-menu-delete" type="button">
        <span class="context-menu-icon">🗑️</span>
        <span>Delete</span>
      </button>
    `;

    document.body.appendChild(menu);
    this.contextMenu = menu;

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

  async applyEngineAccent(engine) {
    if (!this.shell) return;

    const faviconUrl =
      engine?.favicon || this.getFaviconUrlFromTemplate(engine?.url);
    if (!faviconUrl) return;

    const cached = this.colorCache.get(faviconUrl);
    if (cached) {
      this.shell.style.setProperty(
        "--sb-accent-rgb",
        `${cached.r}, ${cached.g}, ${cached.b}`
      );
      return;
    }

    // Deduplicate concurrent fetches.
    if (this.colorInFlight.has(faviconUrl)) {
      try {
        await this.colorInFlight.get(faviconUrl);
      } catch (e) {}
      const after = this.colorCache.get(faviconUrl);
      if (after) {
        this.shell.style.setProperty(
          "--sb-accent-rgb",
          `${after.r}, ${after.g}, ${after.b}`
        );
      }
      return;
    }

    const p = this.computeAverageColorFromImageUrl(faviconUrl)
      .then((rgb) => {
        if (rgb) this.colorCache.set(faviconUrl, rgb);
      })
      .finally(() => {
        this.colorInFlight.delete(faviconUrl);
      });

    this.colorInFlight.set(faviconUrl, p);

    try {
      await p;
      const rgb = this.colorCache.get(faviconUrl);
      if (rgb) {
        this.shell.style.setProperty(
          "--sb-accent-rgb",
          `${rgb.r}, ${rgb.g}, ${rgb.b}`
        );
      }
    } catch (e) {
      // Best-effort only.
    }
  }

  async computeAverageColorFromImageUrl(url) {
    // Best-effort: fetch + decode and sample pixels.
    // On Chrome extension pages, this is reliable if host_permissions allow the URL.
    let blob;
    try {
      const resp = await fetch(url, { cache: "force-cache" });
      if (!resp.ok) return null;
      blob = await resp.blob();
    } catch (e) {
      return null;
    }

    const sampleSize = 32;
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

    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;

    // Sample every 2 pixels (fast + stable).
    const stride = 2;
    for (let y = 0; y < sampleSize; y += stride) {
      for (let x = 0; x < sampleSize; x += stride) {
        const i = (y * sampleSize + x) * 4;
        const a = data[i + 3];
        if (a < 32) continue;

        const rr = data[i];
        const gg = data[i + 1];
        const bb = data[i + 2];

        // Ignore near-white pixels (common favicon padding).
        if (rr > 245 && gg > 245 && bb > 245) continue;

        r += rr;
        g += gg;
        b += bb;
        n++;
      }
    }

    if (!n) return null;

    r = Math.round(r / n);
    g = Math.round(g / n);
    b = Math.round(b / n);

    // Clamp to avoid extremes that look harsh behind white text.
    const clamp = (v) => Math.max(20, Math.min(235, v));
    return { r: clamp(r), g: clamp(g), b: clamp(b) };
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

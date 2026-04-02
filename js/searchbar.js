/**
 * Search Bar Manager (Custom Searches)
 * - Stores custom searches in localStorage
 * - Shows favicon tabs with caching support
 * - Scroll arrows appear when searches > 10
 * - Lets the user choose an accent color per engine (via right-click menu)
 */

class SearchBarManager extends BaseManager {
  static MAX_VISIBLE = 10;

  constructor(storage) {
    super();
    this.storage = storage;

    this.searches = [];
    this.selectedId = null;
    this.scrollIndex = 0;

    this.contextMenu = null;
    this.pendingDeleteId = null;

    this.customColorInput = null;

    // Favicon-derived dominant color cache (1px-canvas hack)
    this.faviconDominantCache = new Map();
    this.faviconDominantInFlight = new Map();

    // Drag state (reorder engines, Pinned Apps-style)
    this.draggedEngine = null;
    this.draggedElement = null;
    this.dragGhost = null;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.pendingX = 0;
    this.pendingY = 0;
    this.dragFrameRequested = false;
    this.blockNextClick = false;
    this.blockNextClickTimer = null;
    this.currentDropTarget = null;
    this.flipDurationMs = 160;
    this.flipEasing = "cubic-bezier(0.2, 0.8, 0.2, 1)";

    // Track pending favicon during edit
    this.pendingFaviconDataUrl = null;

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

    // Favicon controls in edit modal
    this.editFaviconPreview = document.getElementById(
      "editSearchBarFaviconPreview",
    );
    this.editRefreshFaviconBtn = document.getElementById(
      "editSearchBarRefreshFavicon",
    );
    this.editImportFaviconBtn = document.getElementById(
      "editSearchBarImportFavicon",
    );
    this.editImportFaviconUrlBtn = document.getElementById(
      "editSearchBarImportFaviconUrl",
    );
    this.editFaviconFileInput = document.getElementById(
      "editSearchBarFaviconFile",
    );
    this.editFaviconStatus = document.getElementById(
      "editSearchBarFaviconStatus",
    );

    // Delete confirm modal
    this.deleteModal = document.getElementById("searchBarDeleteConfirmModal");
    this.deleteNameEl = document.getElementById("searchBarDeleteName");
    this.confirmDeleteBtn = document.getElementById(
      "confirmSearchBarDeleteBtn",
    );
    this.cancelDeleteBtn = document.getElementById("cancelSearchBarDeleteBtn");

    // Bound event handlers for drag
    this.boundHandleMouseMove = this._handleEngineMouseMove.bind(this);
    this.boundHandleMouseUp = this._handleEngineMouseUp.bind(this);
    this.boundHandleTouchMove = this._handleEngineTouchMove.bind(this);
    this.boundHandleTouchEnd = this._handleEngineTouchEnd.bind(this);
    this.boundCaptureClick = this._captureClickWhileDragging.bind(this);

    // Suppress click that would otherwise fire after a drag
    document.addEventListener("click", this.boundCaptureClick, true);

    // Listen for icon theme changes
    document.addEventListener("md:icon-theme-change", () => {
      this._updateContextMenuIcons();
    });

    this.init();
  }

  /**
   * Update context menu icons when theme changes
   */
  _updateContextMenuIcons() {
    if (this.contextMenu) {
      const editIcon = this.contextMenu.querySelector(
        ".context-menu-edit .context-menu-icon",
      );
      const colorIcon = this.contextMenu.querySelector(
        ".context-menu-accent-custom .context-menu-icon",
      );
      const deleteIcon = this.contextMenu.querySelector(
        ".context-menu-delete .context-menu-icon",
      );
      if (editIcon) editIcon.innerHTML = this._getIcon("✏️", { size: 16 });
      if (colorIcon) colorIcon.innerHTML = this._getIcon("🎨", { size: 16 });
      if (deleteIcon) deleteIcon.innerHTML = this._getIcon("🗑️", { size: 16 });
    }
  }

  _captureClickWhileDragging(e) {
    if (!this.blockNextClick) return;
    e.preventDefault();
    e.stopPropagation();
    this.blockNextClick = false;
    if (this.blockNextClickTimer) {
      window.clearTimeout(this.blockNextClickTimer);
      this.blockNextClickTimer = null;
    }
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
        (s) => s && typeof s.name === "string" && typeof s.url === "string",
      )
      .map((s) => {
        const id = s.id ?? Date.now() + Math.random();
        const name = String(s.name || "")
          .trim()
          .slice(0, 40);
        const url = String(s.url || "").trim();
        const favicon = typeof s.favicon === "string" ? s.favicon : null;
        const cachedFavicon =
          typeof s.cachedFavicon === "string" ? s.cachedFavicon : null;
        const accentRgb =
          typeof s.accentRgb === "string" ? String(s.accentRgb) : null;
        return { id, name, url, favicon, cachedFavicon, accentRgb };
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
        this.hideAddModal(),
      );
    }
    if (this.addModalCancelBtn) {
      this.addModalCancelBtn.addEventListener("click", () =>
        this.hideAddModal(),
      );
    }
    if (this.addModal) {
      this._bindOverlayCloseBehavior(this.addModal, () => this.hideAddModal());
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
        this.hideEditModal(),
      );
    }
    if (this.editModalCancelBtn) {
      this.editModalCancelBtn.addEventListener("click", () =>
        this.hideEditModal(),
      );
    }
    if (this.editModal) {
      this._bindOverlayCloseBehavior(this.editModal, () =>
        this.hideEditModal(),
      );
    }
    if (this.editModalForm) {
      this.editModalForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.updateCustomSearchFromModal();
      });
    }

    // Favicon refresh button
    if (this.editRefreshFaviconBtn) {
      this.editRefreshFaviconBtn.addEventListener("click", () =>
        this.handleRefreshFavicon(),
      );
    }

    // Favicon import button
    if (this.editImportFaviconBtn) {
      this.editImportFaviconBtn.addEventListener("click", () => {
        this.editFaviconFileInput?.click();
      });
    }

    // Favicon import by URL button
    if (this.editImportFaviconUrlBtn) {
      this.editImportFaviconUrlBtn.addEventListener("click", () =>
        this.handleImportFaviconFromUrl(),
      );
    }

    // Favicon file input change
    if (this.editFaviconFileInput) {
      this.editFaviconFileInput.addEventListener("change", (e) =>
        this.handleFaviconFileSelect(e),
      );
    }

    // Delete modal events
    if (this.cancelDeleteBtn) {
      this.cancelDeleteBtn.addEventListener("click", () =>
        this.hideDeleteConfirmation(),
      );
    }
    if (this.confirmDeleteBtn) {
      this.confirmDeleteBtn.addEventListener("click", () =>
        this.confirmDelete(),
      );
    }
    if (this.deleteModal) {
      this._bindOverlayCloseBehavior(this.deleteModal, () =>
        this.hideDeleteConfirmation(),
      );
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

    // Reset pending favicon
    this.pendingFaviconDataUrl = null;

    if (this.editName) this.editName.value = engine.name;
    if (this.editUrl) this.editUrl.value = engine.url;
    if (this.editIdInput) this.editIdInput.value = String(engine.id);

    // Update favicon preview
    this.updateEditFaviconPreview(
      engine.url,
      engine.cachedFavicon || engine.favicon,
    );

    // Clear status
    if (this.editFaviconStatus) {
      this.editFaviconStatus.textContent = "";
      this.editFaviconStatus.className = "favicon-status";
    }

    // Reset file input
    if (this.editFaviconFileInput) {
      this.editFaviconFileInput.value = "";
    }

    this.editModal.classList.add("active");
    this.editName?.focus();
  }

  /**
   * Update the favicon preview in the edit modal
   */
  async updateEditFaviconPreview(url, cachedFavicon) {
    if (!this.editFaviconPreview) return;

    // Try to get cached favicon
    let faviconUrl = cachedFavicon;

    if (!faviconUrl && window.faviconCache) {
      faviconUrl = await window.faviconCache.getCached(url, "search");
    }

    if (!faviconUrl) {
      // Fallback to Google API
      faviconUrl = this.getFaviconUrlFromTemplate(url);
    }

    if (faviconUrl) {
      this.editFaviconPreview.innerHTML = `<img src="${faviconUrl}" alt="Favicon" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
        <span class="favicon-fallback" style="display:none;">?</span>`;
    } else {
      this.editFaviconPreview.innerHTML = `<span class="favicon-fallback">?</span>`;
    }
  }

  /**
   * Handle refresh favicon button click
   */
  async handleRefreshFavicon() {
    const url = this.editUrl?.value.trim();
    if (!url) {
      this.showFaviconStatus("Please enter a URL first", "error");
      return;
    }

    this.showFaviconStatus("Fetching favicon...", "loading");

    try {
      if (window.faviconCache) {
        const dataUrl = await window.faviconCache.refreshFromGoogle(
          url,
          "search",
        );
        if (dataUrl) {
          this.pendingFaviconDataUrl = dataUrl;
          if (this.editFaviconPreview) {
            this.editFaviconPreview.innerHTML = `<img src="${dataUrl}" alt="Favicon">`;
          }
          this.showFaviconStatus("Favicon refreshed!", "success");
        } else {
          this.showFaviconStatus("Could not fetch favicon", "error");
        }
      } else {
        // Fallback without cache
        const faviconUrl = this.getFaviconUrlFromTemplate(url);
        if (this.editFaviconPreview) {
          this.editFaviconPreview.innerHTML = `<img src="${faviconUrl}" alt="Favicon">`;
        }
        this.showFaviconStatus("Favicon refreshed!", "success");
      }
    } catch (e) {
      this.showFaviconStatus("Error refreshing favicon", "error");
    }
  }

  /**
   * Handle favicon file selection
   */
  async handleFaviconFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = this.editUrl?.value.trim();
    if (!url) {
      this.showFaviconStatus("Please enter a URL first", "error");
      return;
    }

    this.showFaviconStatus("Processing image...", "loading");

    try {
      if (window.faviconCache) {
        const dataUrl = await window.faviconCache.importFromFile(
          file,
          url,
          "search",
        );
        this.pendingFaviconDataUrl = dataUrl;
        if (this.editFaviconPreview) {
          this.editFaviconPreview.innerHTML = `<img src="${dataUrl}" alt="Favicon">`;
        }
        this.showFaviconStatus("Custom icon imported!", "success");
      } else {
        // Fallback: just show the image without caching
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target.result;
          this.pendingFaviconDataUrl = dataUrl;
          if (this.editFaviconPreview) {
            this.editFaviconPreview.innerHTML = `<img src="${dataUrl}" alt="Favicon">`;
          }
          this.showFaviconStatus("Custom icon imported!", "success");
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      this.showFaviconStatus(err.message || "Error importing image", "error");
    }

    // Reset file input so same file can be selected again
    if (this.editFaviconFileInput) {
      this.editFaviconFileInput.value = "";
    }
  }

  /**
   * Handle favicon import from image URL
   */
  async handleImportFaviconFromUrl() {
    const url = this.editUrl?.value.trim();
    if (!url) {
      this.showFaviconStatus("Please enter a URL first", "error");
      return;
    }

    const prompted = window.prompt(
      "Enter image URL for favicon import",
      "https://",
    );
    if (prompted === null) return;

    const imageUrl = String(prompted || "").trim();
    if (!imageUrl) {
      this.showFaviconStatus("Please enter an image URL", "error");
      return;
    }

    this.showFaviconStatus("Importing icon from URL...", "loading");

    try {
      if (!window.faviconCache?.importFromImageUrl) {
        throw new Error("Favicon manager is unavailable.");
      }

      const dataUrl = await window.faviconCache.importFromImageUrl(
        imageUrl,
        url,
        "search",
      );

      this.pendingFaviconDataUrl = dataUrl;
      if (this.editFaviconPreview) {
        this.editFaviconPreview.innerHTML = `<img src="${dataUrl}" alt="Favicon">`;
      }
      this.showFaviconStatus("Icon imported from URL!", "success");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error importing icon from image URL";
      this.showFaviconStatus(message, "error");
    }
  }

  /**
   * Show status message for favicon operations
   */
  showFaviconStatus(message, type = "info") {
    if (!this.editFaviconStatus) return;

    this.editFaviconStatus.textContent = message;
    this.editFaviconStatus.className = `favicon-status favicon-status-${type}`;

    // Auto-clear success messages
    if (type === "success") {
      setTimeout(() => {
        if (this.editFaviconStatus?.textContent === message) {
          this.editFaviconStatus.textContent = "";
          this.editFaviconStatus.className = "favicon-status";
        }
      }, 3000);
    }
  }

  hideEditModal() {
    if (!this.editModal) return;
    this.editModal.classList.remove("active");
    this.pendingFaviconDataUrl = null;
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
        <span class="context-menu-icon">${this._getIcon("✏️", {
          size: 16,
        })}</span>
        <span>Edit</span>
      </button>
      <div class="context-menu-divider" role="separator"></div>
      <div class="context-menu-accent" aria-label="Accent color">
        <div class="context-menu-accent-title">Accent color</div>
        <div class="context-menu-accent-palette" data-role="accent-palette"></div>
        <button class="context-menu-item context-menu-accent-custom" type="button">
          <span class="context-menu-icon">${this._getIcon("🎨", {
            size: 16,
          })}</span>
          <span>Custom color…</span>
        </button>
      </div>
      <div class="context-menu-divider" role="separator"></div>
      <button class="context-menu-item context-menu-delete" type="button">
        <span class="context-menu-icon">${this._getIcon("🗑️", {
          size: 16,
        })}</span>
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
          (s) => String(s.id) === String(engineId),
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
      '[data-role="accent-palette"]',
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

    // Close context menu on outside right-click.
    // Capture phase ensures opener stopPropagation() doesn't prevent dismissal.
    document.addEventListener(
      "contextmenu",
      (e) => {
        if (this.contextMenu && !this.contextMenu.contains(e.target)) {
          this.hideContextMenu();
        }
      },
      true,
    );

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
      true,
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
      (s) => String(s.id) === String(engineId),
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
      (s) => String(s.id) === String(engineId),
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

  async addCustomSearchFromModal() {
    const normalized = this._normalizeAndValidateTemplate(
      this.newName?.value,
      this.newUrl?.value,
    );
    if (!normalized) return;

    // Get favicon - fetch fresh for new search engines
    let favicon = this.getFaviconUrlFromTemplate(normalized.url);
    let cachedFavicon = null;

    if (window.faviconCache) {
      // Fetch and cache for new search
      cachedFavicon = await window.faviconCache.fetchAndCache(
        normalized.url,
        "search",
        true,
      );
      if (cachedFavicon) {
        favicon = cachedFavicon;
      }
    }

    const entry = {
      id: Date.now(),
      name: normalized.name,
      url: normalized.url,
      favicon,
      cachedFavicon,
      accentRgb: null,
    };

    this.searches.push(entry);
    this.selectedId = entry.id;
    this.persist();

    this.hideAddModal();
    this.render();
    this.input?.focus();

    // Best-effort: set default accent from favicon immediately after adding.
    this._ensureDefaultAccentForEngine(entry).catch(() => {});
  }

  _getEngineTabElements() {
    if (!this.strip) return [];
    return Array.from(this.strip.querySelectorAll(".search-bar-engine-tab"));
  }

  _captureEngineRects(excludeDragging = true) {
    const rects = new Map();
    for (const el of this._getEngineTabElements()) {
      if (excludeDragging && el.classList.contains("dragging")) continue;
      const id = el.getAttribute("data-id");
      if (id == null) continue;
      rects.set(String(id), el.getBoundingClientRect());
    }
    return rects;
  }

  _syncDomOrderToSearches() {
    if (!this.strip) return;
    const existing = new Map(
      this._getEngineTabElements().map((el) => [
        String(el.getAttribute("data-id")),
        el,
      ]),
    );

    const frag = document.createDocumentFragment();
    for (const engine of this.searches) {
      const el = existing.get(String(engine.id));
      if (el) frag.appendChild(el);
    }
    this.strip.appendChild(frag);
  }

  _animateFlip(beforeRects) {
    if (!this.strip) return;
    const elements = this._getEngineTabElements().filter(
      (el) => !el.classList.contains("dragging"),
    );

    for (const el of elements) {
      const id = String(el.getAttribute("data-id"));
      const before = beforeRects.get(id);
      if (!before) continue;
      const after = el.getBoundingClientRect();
      const dx = before.left - after.left;
      const dy = before.top - after.top;
      if (dx === 0 && dy === 0) continue;

      el.style.transition = "transform 0s";
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    }

    // Force style flush
    void this.strip.offsetHeight;

    requestAnimationFrame(() => {
      const elements2 = this._getEngineTabElements().filter(
        (el) => !el.classList.contains("dragging"),
      );
      for (const el of elements2) {
        if (!el.style.transform) continue;
        el.style.transition = `transform ${this.flipDurationMs}ms ${this.flipEasing}`;
        el.style.transform = "";
        window.setTimeout(() => {
          el.style.transition = "";
        }, this.flipDurationMs + 30);
      }
    });
  }

  _getClosestNonDraggingEngineAtPoint(x, y) {
    const direct = document
      .elementFromPoint(x, y)
      ?.closest(".search-bar-engine-tab");
    if (direct && !direct.classList.contains("dragging")) return direct;

    const items = this._getEngineTabElements().filter(
      (el) => !el.classList.contains("dragging"),
    );
    let best = null;
    let bestDist = Infinity;
    for (const el of items) {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (d < bestDist) {
        bestDist = d;
        best = el;
      }
    }
    return best;
  }

  _maybeReorderEngineAtPoint(x, y) {
    if (!this.draggedEngine || !this.strip) return;

    const targetEl = this._getClosestNonDraggingEngineAtPoint(x, y);

    // Clear previous hover state
    this.strip
      .querySelectorAll(".search-bar-engine-tab.drag-over")
      .forEach((el) => el.classList.remove("drag-over"));

    if (!targetEl) {
      this.currentDropTarget = null;
      return;
    }

    const targetId = String(targetEl.getAttribute("data-id"));
    const targetEngine = this.searches.find((s) => String(s.id) === targetId);
    if (
      !targetEngine ||
      String(targetEngine.id) === String(this.draggedEngine.id)
    ) {
      this.currentDropTarget = null;
      return;
    }

    const draggedIndex = this.searches.findIndex(
      (s) => String(s.id) === String(this.draggedEngine.id),
    );
    const targetIndex = this.searches.findIndex(
      (s) => String(s.id) === String(targetEngine.id),
    );
    if (draggedIndex === -1 || targetIndex === -1) return;

    const rect = targetEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const deadZone = rect.width * 0.08;

    let insertionIndex = targetIndex;
    if (x > centerX + deadZone) insertionIndex = targetIndex + 1;
    else if (x < centerX - deadZone) insertionIndex = targetIndex;
    else {
      targetEl.classList.add("drag-over");
      this.currentDropTarget = targetEngine;
      return;
    }

    let toIndex = insertionIndex;
    if (toIndex > draggedIndex) toIndex -= 1;
    toIndex = Math.max(0, Math.min(this.searches.length - 1, toIndex));

    targetEl.classList.add("drag-over");
    this.currentDropTarget = targetEngine;
    if (toIndex === draggedIndex) return;

    const beforeRects = this._captureEngineRects(true);
    const [moved] = this.searches.splice(draggedIndex, 1);
    this.searches.splice(toIndex, 0, moved);
    this._syncDomOrderToSearches();
    this._animateFlip(beforeRects);
  }

  _createEngineDragGhost(engine, sourceElement) {
    const ghost = document.createElement("div");
    // Reuse the same visual/animation as Pinned Apps
    ghost.className = "pinned-app-drag-ghost search-bar-drag-ghost";

    // Size: ~110% of the actual circular tab
    try {
      const r = sourceElement.getBoundingClientRect();
      const base = Math.max(1, Math.min(r.width, r.height));
      const size = Math.max(24, Math.round(base * 1.1));
      ghost.style.width = `${size}px`;
      ghost.style.height = `${size}px`;
      ghost.style.borderRadius = "9999px";

      // Cancel the default pinned ghost scaling (we already sized it up)
      ghost.style.transform = "translate(-50%, -50%)";
    } catch (e) {}

    const iconEl = sourceElement.querySelector(".search-bar-engine-icon");
    const imgEl = iconEl?.querySelector("img");
    const fallbackEl = iconEl?.querySelector(".search-bar-engine-fallback");

    if (imgEl && imgEl.style.display !== "none") {
      const imgClone = imgEl.cloneNode(true);
      imgClone.draggable = false;
      ghost.appendChild(imgClone);
    } else if (fallbackEl) {
      // Use pinned-app fallback styling to match the ghost
      const fallbackClone = document.createElement("span");
      fallbackClone.className = "pinned-app-fallback";
      fallbackClone.textContent =
        fallbackEl.textContent || engine.name.charAt(0).toUpperCase();
      ghost.appendChild(fallbackClone);
    } else {
      const fallbackClone = document.createElement("span");
      fallbackClone.className = "pinned-app-fallback";
      fallbackClone.textContent = engine.name.charAt(0).toUpperCase();
      ghost.appendChild(fallbackClone);
    }

    document.body.appendChild(ghost);
    return ghost;
  }

  _updateEngineDragPosition() {
    if (!this.dragGhost) return;
    this.dragGhost.style.left = `${this.currentX}px`;
    this.dragGhost.style.top = `${this.currentY}px`;
  }

  _startEngineDragVisuals() {
    if (!this.draggedElement || !this.draggedEngine) return;

    this.dragGhost = this._createEngineDragGhost(
      this.draggedEngine,
      this.draggedElement,
    );
    this._updateEngineDragPosition();

    this.draggedElement.classList.add("dragging");
    this.strip?.classList.add("is-dragging");

    // Prevent the click that fires after a drag
    this.blockNextClick = true;
    if (this.blockNextClickTimer) {
      window.clearTimeout(this.blockNextClickTimer);
    }
    this.blockNextClickTimer = window.setTimeout(() => {
      this.blockNextClick = false;
      this.blockNextClickTimer = null;
    }, 600);

    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
  }

  _queueEngineDragFrame() {
    if (this.dragFrameRequested) return;
    this.dragFrameRequested = true;

    requestAnimationFrame(() => {
      this.dragFrameRequested = false;
      if (!this.isDragging) return;

      this.currentX = this.pendingX;
      this.currentY = this.pendingY;
      this._updateEngineDragPosition();
      this._maybeReorderEngineAtPoint(this.currentX, this.currentY);
    });
  }

  _handleEngineDragStart(e, engine, el) {
    if (e.button !== 0) return;

    this.startX = e.clientX;
    this.startY = e.clientY;
    this.currentX = e.clientX;
    this.currentY = e.clientY;
    this.draggedEngine = engine;
    this.draggedElement = el;
    this.isDragging = false;

    document.addEventListener("mousemove", this.boundHandleMouseMove);
    document.addEventListener("mouseup", this.boundHandleMouseUp);
  }

  _handleEngineMouseMove(e) {
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    if (!this.isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      this.isDragging = true;
      this._startEngineDragVisuals();
    }

    if (this.isDragging) {
      e.preventDefault();
      this.pendingX = e.clientX;
      this.pendingY = e.clientY;
      this._queueEngineDragFrame();
    }
  }

  _handleEngineMouseUp(e) {
    document.removeEventListener("mousemove", this.boundHandleMouseMove);
    document.removeEventListener("mouseup", this.boundHandleMouseUp);

    if (this.isDragging) {
      e.preventDefault();
      this._endEngineDrag();
    }

    this.isDragging = false;
    this.draggedEngine = null;
    this.draggedElement = null;
  }

  _handleEngineTouchStart(e, engine, el) {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.currentX = touch.clientX;
    this.currentY = touch.clientY;
    this.draggedEngine = engine;
    this.draggedElement = el;
    this.isDragging = false;

    document.addEventListener("touchmove", this.boundHandleTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", this.boundHandleTouchEnd);
    document.addEventListener("touchcancel", this.boundHandleTouchEnd);
  }

  _handleEngineTouchMove(e) {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - this.startX;
    const dy = touch.clientY - this.startY;
    if (!this.isDragging && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      this.isDragging = true;
      e.preventDefault();
      this._startEngineDragVisuals();
    }
    if (this.isDragging) {
      e.preventDefault();
      this.pendingX = touch.clientX;
      this.pendingY = touch.clientY;
      this._queueEngineDragFrame();
    }
  }

  _handleEngineTouchEnd(e) {
    document.removeEventListener("touchmove", this.boundHandleTouchMove);
    document.removeEventListener("touchend", this.boundHandleTouchEnd);
    document.removeEventListener("touchcancel", this.boundHandleTouchEnd);

    if (this.isDragging) {
      this._endEngineDrag();
    }

    this.isDragging = false;
    this.draggedEngine = null;
    this.draggedElement = null;
  }

  _endEngineDrag() {
    // Remove ghost
    if (this.dragGhost) {
      this.dragGhost.classList.add("dropping");
      setTimeout(() => {
        if (this.dragGhost && this.dragGhost.parentNode) {
          this.dragGhost.parentNode.removeChild(this.dragGhost);
        }
        this.dragGhost = null;
      }, 200);
    }

    // Persist the live-updated order
    this.persist();

    // Cleanup
    this.strip
      ?.querySelectorAll(".search-bar-engine-tab")
      .forEach((item) => item.classList.remove("dragging", "drag-over"));
    this.strip?.classList.remove("is-dragging");

    document.body.style.userSelect = "";
    document.body.style.webkitUserSelect = "";

    this.currentDropTarget = null;

    // Keep selection visible after reorder
    this.ensureSelectionInView();
    this.updateStripTransform();
    this.updateSelectionUi();
  }

  async updateCustomSearchFromModal() {
    const id = this.editIdInput?.value;
    if (!id) return;

    const normalized = this._normalizeAndValidateTemplate(
      this.editName?.value,
      this.editUrl?.value,
    );
    if (!normalized) return;

    const idx = this.searches.findIndex((s) => String(s.id) === String(id));
    if (idx < 0) return;

    const urlChanged = this.searches[idx].url !== normalized.url;

    // Handle favicon update
    let favicon = this.searches[idx].favicon;
    let cachedFavicon = this.searches[idx].cachedFavicon;

    if (this.pendingFaviconDataUrl) {
      // User manually set a favicon
      favicon = this.pendingFaviconDataUrl;
      cachedFavicon = this.pendingFaviconDataUrl;
    } else if (urlChanged) {
      // URL changed, fetch new favicon
      if (window.faviconCache) {
        const newCached = await window.faviconCache.fetchAndCache(
          normalized.url,
          "search",
          true,
        );
        if (newCached) {
          favicon = newCached;
          cachedFavicon = newCached;
        } else {
          favicon = this.getFaviconUrlFromTemplate(normalized.url);
          cachedFavicon = null;
        }
      } else {
        favicon = this.getFaviconUrlFromTemplate(normalized.url);
        cachedFavicon = null;
      }
    }

    this.searches[idx] = {
      ...this.searches[idx],
      name: normalized.name,
      url: normalized.url,
      favicon,
      cachedFavicon,
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

    const dominant = await this._getFaviconDominantRgb(faviconUrl);
    if (!dominant) return;

    // Persist default accent for this engine.
    this.setEngineAccent(engine.id, dominant);
  }

  ensureSelectionInView() {
    const idx = this.searches.findIndex(
      (s) => String(s.id) === String(this.selectedId),
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
      Math.min(maxStart, this.scrollIndex + delta),
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
      this.searches.length - SearchBarManager.MAX_VISIBLE,
    );

    if (this.prevBtn) {
      this.prevBtn.classList.toggle(
        "is-hidden",
        !shouldShow || this.scrollIndex <= 0,
      );
    }
    if (this.nextBtn) {
      this.nextBtn.classList.toggle(
        "is-hidden",
        !shouldShow || this.scrollIndex >= maxStart,
      );
    }
  }

  updateSelectionUi() {
    if (!this.strip) return;

    const selected = this.getSelected();
    this.setPlaceholder(
      selected ? `Searching ${selected.name}` : "Searching...",
    );

    this.strip.querySelectorAll(".search-bar-engine-tab").forEach((btn) => {
      const id = btn.getAttribute("data-id");
      btn.setAttribute(
        "aria-selected",
        selected && String(selected.id) === String(id) ? "true" : "false",
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
      return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(urlObj.href)}&sz=256`;
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

  _hslToRgb(h, s, l) {
    const hh = (((Number(h) || 0) % 360) + 360) % 360;
    const ss = Math.max(0, Math.min(100, Number(s) || 0)) / 100;
    const ll = Math.max(0, Math.min(100, Number(l) || 0)) / 100;

    const c = (1 - Math.abs(2 * ll - 1)) * ss;
    const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
    const m = ll - c / 2;

    let r1 = 0;
    let g1 = 0;
    let b1 = 0;

    if (hh < 60) {
      r1 = c;
      g1 = x;
    } else if (hh < 120) {
      r1 = x;
      g1 = c;
    } else if (hh < 180) {
      g1 = c;
      b1 = x;
    } else if (hh < 240) {
      g1 = x;
      b1 = c;
    } else if (hh < 300) {
      r1 = x;
      b1 = c;
    } else {
      r1 = c;
      b1 = x;
    }

    return {
      r: Math.round((r1 + m) * 255),
      g: Math.round((g1 + m) * 255),
      b: Math.round((b1 + m) * 255),
    };
  }

  _getRainbowPalette(count) {
    const n = Math.max(1, Math.floor(Number(count) || 0));
    const out = [];
    for (let i = 0; i < n; i++) {
      const hue = (i * 360) / n;
      const rgb = this._hslToRgb(hue, 95, 55);
      out.push(`${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
    return out;
  }

  async _getFaviconDominantRgb(faviconUrl) {
    const key = String(faviconUrl || "");
    if (!key) return null;

    const cached = this.faviconDominantCache.get(key);
    if (cached) return cached;

    if (this.faviconDominantInFlight.has(key)) {
      try {
        await this.faviconDominantInFlight.get(key);
      } catch (e) {}
      return this.faviconDominantCache.get(key) || null;
    }

    const p = this._computeFaviconDominantRgb(key)
      .then((rgb) => {
        if (this._isValidRgbString(rgb)) {
          this.faviconDominantCache.set(key, this._normalizeRgbString(rgb));
        }
      })
      .finally(() => {
        this.faviconDominantInFlight.delete(key);
      });

    this.faviconDominantInFlight.set(key, p);

    try {
      await p;
    } catch (e) {}

    return this.faviconDominantCache.get(key) || null;
  }

  async _computeFaviconDominantRgb(url) {
    // "Hack" dominant color: draw the whole image into a 1x1 canvas.
    // We still fetch->blob->objectURL to avoid CORS/canvas taint issues.
    let blob;
    try {
      const resp = await fetch(url, { cache: "force-cache" });
      if (!resp.ok) return null;
      blob = await resp.blob();
    } catch (e) {
      return null;
    }

    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.decoding = "async";
      img.src = objectUrl;

      if (typeof img.decode === "function") {
        try {
          await img.decode();
        } catch (e) {
          await new Promise((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
          });
        }
      } else {
        await new Promise((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
        });
      }

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      canvas.width = 1;
      canvas.height = 1;

      try {
        ctx.drawImage(img, 0, 0, 1, 1);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        const r = data[0];
        const g = data[1];
        const b = data[2];
        const a = data[3];
        if (a != null && a < 8) return null;
        return `${r}, ${g}, ${b}`;
      } catch (e) {
        return null;
      }
    } finally {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch (e) {}
    }
  }

  async _renderAccentPaletteForEngine(engineId) {
    if (!this.contextMenu) return;
    const paletteEl = this.contextMenu.querySelector(
      '[data-role="accent-palette"]',
    );
    if (!paletteEl) return;

    const rainbow29 = this._getRainbowPalette(29);
    while (rainbow29.length < 29) rainbow29.push("255, 255, 255");

    // If no engine is selected yet, show a full rainbow row.
    if (!engineId) {
      const rainbow30 = this._getRainbowPalette(30);
      while (rainbow30.length < 30) rainbow30.push("255, 255, 255");
      this._renderSwatches(paletteEl, rainbow30.slice(0, 30));
      return;
    }

    const engine = this.searches.find((s) => String(s.id) === String(engineId));
    if (!engine) return;

    const initialDominant = this._isValidRgbString(engine.accentRgb)
      ? this._normalizeRgbString(engine.accentRgb)
      : rainbow29[0] || "255, 255, 255";
    this._renderSwatches(paletteEl, [initialDominant, ...rainbow29]);

    const faviconUrl =
      engine.favicon || this.getFaviconUrlFromTemplate(engine.url);
    if (!faviconUrl) return;

    let dominant;
    try {
      dominant = await this._getFaviconDominantRgb(faviconUrl);
    } catch (e) {
      dominant = null;
    }
    if (!dominant) return;

    // If the menu moved to another engine while awaiting, abort.
    if (String(this.contextMenu?.dataset?.engineId) !== String(engineId))
      return;

    this._renderSwatches(paletteEl, [dominant, ...rainbow29]);
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
        Math.min(SearchBarManager.MAX_VISIBLE, this.searches.length),
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
        String(engine.id) === String(this.selectedId) ? "true" : "false",
      );
      btn.title = engine.name;

      const icon = document.createElement("span");
      icon.className = "search-bar-engine-icon";

      // Use cached favicon first, then stored favicon, then fetch URL
      const faviconUrl =
        engine.cachedFavicon ||
        engine.favicon ||
        this.getFaviconUrlFromTemplate(engine.url);
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

      // Load cached favicon asynchronously if not already cached
      if (!engine.cachedFavicon && window.faviconCache) {
        this.loadCachedFaviconForEngine(engine, btn);
      }

      btn.addEventListener("click", () => {
        this.selectEngine(engine.id);
      });

      // Mouse-based custom drag (desktop)
      btn.addEventListener("mousedown", (e) =>
        this._handleEngineDragStart(e, engine, btn),
      );

      // Touch-based drag (mobile)
      btn.addEventListener(
        "touchstart",
        (e) => this._handleEngineTouchStart(e, engine, btn),
        { passive: false },
      );

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

  /**
   * Load cached favicon for an engine asynchronously
   */
  async loadCachedFaviconForEngine(engine, btnEl) {
    try {
      const cached = await window.faviconCache.getCached(engine.url, "search");
      if (cached) {
        const img = btnEl.querySelector(".search-bar-engine-icon img");
        if (img) {
          img.src = cached;
        }
        // Update engine object
        engine.cachedFavicon = cached;
      }
    } catch (e) {
      // Silently fail
    }
  }
}

// Export for use
window.SearchBarManager = SearchBarManager;

/**
 * Pinned Apps Manager
 * Handles pinned websites/apps with drag-and-drop functionality
 * Features: favicon fetching with caching, reordering, editing, 10 items per row
 */

class PinnedAppsManager extends BaseManager {
  constructor(storage) {
    super();
    this.storage = storage;
    this.apps = [];
    this.draggedItem = null;
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
    this.wrapper = document.getElementById("pinnedAppsGrid");
    this.container = document.getElementById("pinnedAppsTrack") || this.wrapper;
    this.addBtn = document.getElementById("addPinnedAppBtn");
    this.modal = document.getElementById("pinnedAppModal");
    this.form = document.getElementById("pinnedAppForm");
    this.closeBtn = document.getElementById("closePinnedAppModal");
    this.cancelBtn = document.getElementById("cancelPinnedApp");

    // Edit modal elements
    this.editModal = document.getElementById("editPinnedAppModal");
    this.editForm = document.getElementById("editPinnedAppForm");
    this.editCloseBtn = document.getElementById("closeEditPinnedAppModal");
    this.editCancelBtn = document.getElementById("cancelEditPinnedApp");
    this.editNameInput = document.getElementById("editPinnedAppName");
    this.editUrlInput = document.getElementById("editPinnedAppUrl");
    this.editIdInput = document.getElementById("editPinnedAppId");

    // Favicon controls in edit modal
    this.editFaviconPreview = document.getElementById(
      "editPinnedAppFaviconPreview",
    );
    this.editRefreshFaviconBtn = document.getElementById(
      "editPinnedAppRefreshFavicon",
    );
    this.editImportFaviconBtn = document.getElementById(
      "editPinnedAppImportFavicon",
    );
    this.editImportFaviconUrlBtn = document.getElementById(
      "editPinnedAppImportFaviconUrl",
    );
    this.editFaviconFileInput = document.getElementById(
      "editPinnedAppFaviconFile",
    );
    this.editFaviconStatus = document.getElementById(
      "editPinnedAppFaviconStatus",
    );

    // Track if favicon was changed during edit
    this.pendingFaviconDataUrl = null;

    // Delete confirmation modal elements
    this.deleteModal = document.getElementById("deleteConfirmModal");
    this.deleteAppName = document.getElementById("deleteAppName");
    this.confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
    this.cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
    this.pendingDeleteId = null;

    // Context menu element
    this.contextMenu = null;

    // Bound event handlers for proper cleanup
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    this.boundHandleTouchMove = this.handleTouchMove.bind(this);
    this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);
    this.boundCaptureClick = this.captureClickWhileDragging.bind(this);

    // Suppress the click that would otherwise fire after a drag
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
      const deleteIcon = this.contextMenu.querySelector(
        ".context-menu-delete .context-menu-icon",
      );
      if (editIcon) editIcon.innerHTML = this._getIcon("✏️", { size: 16 });
      if (deleteIcon) deleteIcon.innerHTML = this._getIcon("🗑️", { size: 16 });
    }
  }

  _attachImageFallback(imgEl, fallbackEl, fallbackDisplay = "flex") {
    if (!imgEl || !fallbackEl) return;

    imgEl.addEventListener("error", () => {
      imgEl.style.display = "none";
      fallbackEl.style.display = fallbackDisplay;
    });
  }

  _renderFaviconPreview(containerEl, faviconUrl) {
    if (!containerEl) return;

    containerEl.innerHTML = "";

    const fallback = document.createElement("span");
    fallback.className = "favicon-fallback";
    fallback.textContent = "?";

    if (!faviconUrl) {
      containerEl.appendChild(fallback);
      return;
    }

    const img = document.createElement("img");
    img.src = faviconUrl;
    img.alt = "Favicon";

    fallback.style.display = "none";
    containerEl.appendChild(img);
    containerEl.appendChild(fallback);
    this._attachImageFallback(img, fallback);
  }

  captureClickWhileDragging(e) {
    if (!this.blockNextClick) return;
    e.preventDefault();
    e.stopPropagation();
    this.blockNextClick = false;
    if (this.blockNextClickTimer) {
      window.clearTimeout(this.blockNextClickTimer);
      this.blockNextClickTimer = null;
    }
  }

  /**
   * Initialize pinned apps
   */
  init() {
    this.loadApps();
    this.createContextMenu();
    this.bindEvents();
    this.render();
  }

  /**
   * Create context menu element
   */
  createContextMenu() {
    this.contextMenu = document.createElement("div");
    this.contextMenu.className = "pinned-app-context-menu";
    this.contextMenu.innerHTML = `
      <button class="context-menu-item context-menu-edit">
        <span class="context-menu-icon">${this._getIcon("✏️", {
          size: 16,
        })}</span>
        <span>Edit</span>
      </button>
      <button class="context-menu-item context-menu-delete">
        <span class="context-menu-icon">${this._getIcon("🗑️", {
          size: 16,
        })}</span>
        <span>Delete</span>
      </button>
    `;
    document.body.appendChild(this.contextMenu);

    // Context menu item click handlers
    this.contextMenu
      .querySelector(".context-menu-edit")
      .addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const appId = parseInt(this.contextMenu.dataset.appId);
        this.hideContextMenu();
        if (appId) this.showEditModal(appId);
      });

    this.contextMenu
      .querySelector(".context-menu-delete")
      .addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const appId = parseInt(this.contextMenu.dataset.appId);
        this.hideContextMenu();
        if (appId) this.showDeleteConfirmation(appId);
      });

    // Close context menu on outside click
    document.addEventListener("click", (e) => {
      if (!this.contextMenu.contains(e.target)) {
        this.hideContextMenu();
      }
    });

    // Close context menu on outside right-click
    // Use capture so openers that call stopPropagation() don't block dismissal.
    document.addEventListener(
      "contextmenu",
      (e) => {
        if (!this.contextMenu.contains(e.target)) {
          this.hideContextMenu();
        }
      },
      true,
    );

    // Close context menu on escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.hideContextMenu();
      }
    });

    // Close context menu on scroll
    document.addEventListener(
      "scroll",
      () => {
        this.hideContextMenu();
      },
      true,
    );
  }

  /**
   * Show context menu at position
   */
  showContextMenu(x, y, appId) {
    this.contextMenu.dataset.appId = appId;

    // Position the menu
    this.contextMenu.style.left = x + "px";
    this.contextMenu.style.top = y + "px";

    // Show menu with animation
    this.contextMenu.classList.add("active");

    // Adjust position if menu goes off screen
    const rect = this.contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      this.contextMenu.style.left = x - rect.width + "px";
    }
    if (rect.bottom > window.innerHeight) {
      this.contextMenu.style.top = y - rect.height + "px";
    }
  }

  /**
   * Hide context menu
   */
  hideContextMenu() {
    this.contextMenu.classList.remove("active");
    delete this.contextMenu.dataset.appId;
  }

  /**
   * Show delete confirmation modal
   */
  showDeleteConfirmation(appId) {
    const app = this.apps.find((a) => a.id === appId);
    if (!app) return;

    this.pendingDeleteId = appId;
    if (this.deleteAppName) {
      this.deleteAppName.textContent = app.name;
    }
    if (this.deleteModal) {
      this.deleteModal.classList.add("active");
    }
  }

  /**
   * Hide delete confirmation modal
   */
  hideDeleteConfirmation() {
    if (this.deleteModal) {
      this.deleteModal.classList.remove("active");
    }
    this.pendingDeleteId = null;
  }

  /**
   * Confirm delete action
   */
  confirmDelete() {
    if (this.pendingDeleteId) {
      this.removeApp(this.pendingDeleteId);
    }
    this.hideDeleteConfirmation();
  }

  /**
   * Load apps from storage
   */
  loadApps() {
    this.apps = this.storage.getPinnedApps();
    // Sort by order
    this.apps.sort((a, b) => a.order - b.order);
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Add app button
    if (this.addBtn) {
      this.addBtn.addEventListener("click", () => this.showModal());
    }

    // Modal close buttons
    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => this.hideModal());
    }
    if (this.cancelBtn) {
      this.cancelBtn.addEventListener("click", () => this.hideModal());
    }

    // Form submit
    if (this.form) {
      this.form.addEventListener("submit", (e) => this.handleFormSubmit(e));
    }

    // Edit modal close buttons
    if (this.editCloseBtn) {
      this.editCloseBtn.addEventListener("click", () => this.hideEditModal());
    }
    if (this.editCancelBtn) {
      this.editCancelBtn.addEventListener("click", () => this.hideEditModal());
    }

    // Edit form submit
    if (this.editForm) {
      this.editForm.addEventListener("submit", (e) =>
        this.handleEditFormSubmit(e),
      );
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

    // Close edit modal on backdrop click (guarded against text-selection drags)
    this._bindOverlayCloseBehavior(this.editModal, () => this.hideEditModal());

    // Close modal on backdrop click (guarded against text-selection drags)
    this._bindOverlayCloseBehavior(this.modal, () => this.hideModal());

    // Delete confirmation modal buttons
    if (this.confirmDeleteBtn) {
      this.confirmDeleteBtn.addEventListener("click", () =>
        this.confirmDelete(),
      );
    }
    if (this.cancelDeleteBtn) {
      this.cancelDeleteBtn.addEventListener("click", () =>
        this.hideDeleteConfirmation(),
      );
    }

    // Close delete modal on backdrop click
    this._bindOverlayCloseBehavior(this.deleteModal, () =>
      this.hideDeleteConfirmation(),
    );

    document.addEventListener("keydown", (event) => {
      if (!this.deleteModal?.classList.contains("active")) return;

      if (event.key === "Enter") {
        event.preventDefault();
        this.confirmDelete();
        return;
      }

      if (event.key === "Escape") {
        this.hideDeleteConfirmation();
      }
    });
  }

  /**
   * Show add app modal
   */
  showModal() {
    if (this.modal) {
      this.modal.classList.add("active");
      const nameInput = document.getElementById("pinnedAppName");
      if (nameInput) nameInput.focus();
    }
  }

  /**
   * Hide add app modal
   */
  hideModal() {
    if (this.modal) {
      this.modal.classList.remove("active");
      if (this.form) this.form.reset();
    }
  }

  /**
   * Show edit app modal
   */
  showEditModal(appId) {
    const app = this.apps.find((a) => a.id === appId);
    if (!app) return;

    // Reset pending favicon
    this.pendingFaviconDataUrl = null;

    if (this.editModal) {
      if (this.editNameInput) this.editNameInput.value = app.name;
      if (this.editUrlInput) this.editUrlInput.value = app.url;
      if (this.editIdInput) this.editIdInput.value = appId;

      // Update favicon preview
      this.updateEditFaviconPreview(app.url, app.cachedFavicon);

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
      if (this.editNameInput) this.editNameInput.focus();
    }
  }

  /**
   * Update the favicon preview in the edit modal
   */
  async updateEditFaviconPreview(url, cachedFavicon) {
    if (!this.editFaviconPreview) return;

    // Try to get cached favicon
    let faviconUrl = cachedFavicon;

    if (!faviconUrl && window.faviconCache) {
      faviconUrl = await window.faviconCache.getCached(url, "pinned");
    }

    if (!faviconUrl) {
      // Fallback to Google API
      faviconUrl = this.getFaviconUrl(url);
    }

    this._renderFaviconPreview(this.editFaviconPreview, faviconUrl);
  }

  /**
   * Handle refresh favicon button click
   */
  async handleRefreshFavicon() {
    const rawUrl = this.editUrlInput?.value.trim();
    if (!rawUrl) {
      this.showFaviconStatus("Please enter a URL first", "error");
      return;
    }

    // Ensure URL has protocol
    let normalizedUrl = rawUrl;
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    // Validate URL before attempting refresh
    try {
      normalizedUrl = new URL(normalizedUrl).href;
    } catch (e) {
      this.showFaviconStatus("Please enter a valid URL", "error");
      return;
    }

    this.showFaviconStatus("Fetching favicon...", "loading");

    try {
      let refreshedFaviconUrl = null;

      if (window.faviconCache) {
        const dataUrl = await window.faviconCache.refreshFromGoogle(
          normalizedUrl,
          "pinned",
        );
        if (dataUrl) {
          refreshedFaviconUrl = dataUrl;
        }
      }

      // Fallback: use direct URL even when cache refresh fails.
      if (!refreshedFaviconUrl) {
        refreshedFaviconUrl = this.getFaviconUrl(normalizedUrl);
      }

      if (refreshedFaviconUrl) {
        this.pendingFaviconDataUrl = refreshedFaviconUrl;
        this._renderFaviconPreview(this.editFaviconPreview, refreshedFaviconUrl);
        this.showFaviconStatus("Favicon refreshed!", "success");
      } else {
        this.showFaviconStatus("Could not fetch favicon", "error");
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

    const url = this.editUrlInput?.value.trim();
    if (!url) {
      this.showFaviconStatus("Please enter a URL first", "error");
      return;
    }

    // Ensure URL has protocol
    let normalizedUrl = url;
    if (
      !normalizedUrl.startsWith("http://") &&
      !normalizedUrl.startsWith("https://")
    ) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    this.showFaviconStatus("Processing image...", "loading");

    try {
      if (window.faviconCache) {
        const dataUrl = await window.faviconCache.importFromFile(
          file,
          normalizedUrl,
          "pinned",
        );
        this.pendingFaviconDataUrl = dataUrl;
        this._renderFaviconPreview(this.editFaviconPreview, dataUrl);
        this.showFaviconStatus("Custom icon imported!", "success");
      } else {
        // Fallback: just show the image without caching
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target.result;
          this.pendingFaviconDataUrl = dataUrl;
          this._renderFaviconPreview(this.editFaviconPreview, dataUrl);
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
    const url = this.editUrlInput?.value.trim();
    if (!url) {
      this.showFaviconStatus("Please enter a URL first", "error");
      return;
    }

    const imageUrl = await this.openUrlInputModal({
      title: "Import Favicon by URL",
      description:
        "Paste a direct icon/image URL. Only HTTP(S) links are supported.",
      label: "Favicon image URL",
      placeholder: "https://example.com/favicon.png",
      submitLabel: "Import",
      initialValue: "https://",
      validate: (value) => {
        let normalized = String(value || "").trim();
        if (!normalized) return "";
        if (!/^https?:\/\//i.test(normalized)) {
          normalized = `https://${normalized}`;
        }

        try {
          const parsed = new URL(normalized);
          if (!["http:", "https:"].includes(parsed.protocol)) {
            return "";
          }
          return parsed.href;
        } catch (_error) {
          return "";
        }
      },
      invalidMessage: "Please enter a valid HTTP(S) image URL.",
    });

    if (!imageUrl) {
      this.showFaviconStatus("Please enter an image URL", "error");
      return;
    }

    // Ensure URL has protocol
    let normalizedUrl = url;
    if (
      !normalizedUrl.startsWith("http://") &&
      !normalizedUrl.startsWith("https://")
    ) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    this.showFaviconStatus("Importing icon from URL...", "loading");

    try {
      if (!window.faviconCache?.importFromImageUrl) {
        throw new Error("Favicon manager is unavailable.");
      }

      const dataUrl = await window.faviconCache.importFromImageUrl(
        imageUrl,
        normalizedUrl,
        "pinned",
      );

      this.pendingFaviconDataUrl = dataUrl;
      this._renderFaviconPreview(this.editFaviconPreview, dataUrl);
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

  /**
   * Hide edit app modal
   */
  hideEditModal() {
    if (this.editModal) {
      this.editModal.classList.remove("active");
      if (this.editForm) this.editForm.reset();
      this.pendingFaviconDataUrl = null;
    }
  }

  /**
   * Handle edit form submission
   */
  async handleEditFormSubmit(e) {
    e.preventDefault();

    const name = this.editNameInput?.value.trim();
    let url = this.editUrlInput?.value.trim();
    const appId = parseInt(this.editIdInput?.value);

    if (!name || !url || !appId) return;

    // Ensure URL has protocol
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      alert("Please enter a valid URL");
      return;
    }

    // Find and update the app
    const app = this.apps.find((a) => a.id === appId);
    if (app) {
      const urlChanged = app.url !== url;
      app.name = name;
      app.url = url;

      // Handle favicon update
      if (this.pendingFaviconDataUrl) {
        // User manually set a favicon
        app.cachedFavicon = this.pendingFaviconDataUrl;
        app.favicon = this.pendingFaviconDataUrl;
      } else if (urlChanged) {
        // URL changed, fetch new favicon
        if (window.faviconCache) {
          const cachedFavicon = await window.faviconCache.fetchAndCache(
            url,
            "pinned",
            true,
          );
          if (cachedFavicon) {
            app.cachedFavicon = cachedFavicon;
            app.favicon = cachedFavicon;
          } else {
            app.favicon = this.getFaviconUrl(url);
            app.cachedFavicon = null;
          }
        } else {
          app.favicon = this.getFaviconUrl(url);
        }
      }

      this.saveApps();
      this.render();
      this.hideEditModal();
    }
  }

  /**
   * Handle form submission
   */
  async handleFormSubmit(e) {
    e.preventDefault();

    const nameInput = document.getElementById("pinnedAppName");
    const urlInput = document.getElementById("pinnedAppUrl");

    if (!nameInput || !urlInput) return;

    const name = nameInput.value.trim();
    let url = urlInput.value.trim();

    if (!name || !url) return;

    // Ensure URL has protocol
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      alert("Please enter a valid URL");
      return;
    }

    // Get favicon - fetch fresh for new apps
    let favicon = this.getFaviconUrl(url);
    let cachedFavicon = null;

    if (window.faviconCache) {
      // Fetch and cache for new app
      cachedFavicon = await window.faviconCache.fetchAndCache(
        url,
        "pinned",
        true,
      );
      if (cachedFavicon) {
        favicon = cachedFavicon;
      }
    }

    // Add app
    const app = {
      id: Date.now(),
      name: name,
      url: url,
      favicon: favicon,
      cachedFavicon: cachedFavicon,
      order: this.apps.length,
    };

    this.apps.push(app);
    this.saveApps();
    this.render();
    this.hideModal();
  }

  /**
   * Get favicon URL for a website
   */
  getFaviconUrl(url) {
    try {
      const urlObj = new URL(url);
      const domainBaseUrl = new URL(`${urlObj.origin}/`).href;

      // Use Google's favicon service as primary
      return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(domainBaseUrl)}&sz=256`;
    } catch (e) {
      return null;
    }
  }

  /**
   * Remove an app
   */
  removeApp(appId) {
    this.apps = this.apps.filter((app) => app.id !== appId);
    // Reorder
    this.apps.forEach((app, index) => {
      app.order = index;
    });
    this.saveApps();
    this.render();
  }

  /**
   * Save apps to storage
   */
  saveApps() {
    this.storage.savePinnedApps(this.apps);
  }

  /**
   * Render pinned apps grid
   */
  render() {
    if (!this.container) return;

    // Clear container except for add button
    const addButton = this.container.querySelector(".pinned-app-add");
    this.container.innerHTML = "";

    // Render apps
    this.apps.forEach((app) => {
      const appEl = this.createAppElement(app);
      this.container.appendChild(appEl);
    });

    // Re-add the add button if we have it
    if (addButton) {
      this.container.appendChild(addButton);
    } else {
      // Create add button
      const addEl = document.createElement("div");
      addEl.className = "pinned-app-add";
      addEl.id = "addPinnedAppBtn";
      addEl.innerHTML = `
        <div class="add-icon">+</div>
        <span class="add-text">Add Site</span>
      `;
      addEl.addEventListener("click", () => this.showModal());
      this.container.appendChild(addEl);
    }

    try {
      window.dashboard?.applyPinnedAppsSettings?.();
    } catch (e) {}
  }

  /**
   * Create app element
   */
  createAppElement(app) {
    const el = document.createElement("div");
    el.className = "pinned-app-item";
    el.dataset.appId = app.id;

    // Use cached favicon first, then stored favicon, then fetch URL
    const faviconUrl =
      app.cachedFavicon || app.favicon || this.getFaviconUrl(app.url);
    const fallbackIcon = app.name.charAt(0).toUpperCase();

    el.innerHTML = `
      <a href="${
        app.url
      }" class="pinned-app-link" target="_blank" rel="noopener noreferrer">
        <div class="pinned-app-icon">
          ${
            faviconUrl
              ? `<img src="${faviconUrl}" alt="${this.escapeHtml(app.name)}" draggable="false">`
              : ""
          }
          <span class="pinned-app-fallback" style="${
            faviconUrl ? "display:none" : ""
          }">${fallbackIcon}</span>
        </div>
        <span class="pinned-app-name">${this.escapeHtml(app.name)}</span>
      </a>
    `;

    const iconImg = el.querySelector(".pinned-app-icon img");
    const iconFallback = el.querySelector(".pinned-app-fallback");
    this._attachImageFallback(iconImg, iconFallback);

    // Load cached favicon asynchronously if not already cached in app object
    if (!app.cachedFavicon && window.faviconCache) {
      this.loadCachedFaviconForElement(app, el);
    }

    // Prevent link drag
    const link = el.querySelector(".pinned-app-link");
    if (link) {
      link.addEventListener("dragstart", (e) => e.preventDefault());
    }

    // Mouse-based custom drag (desktop)
    el.addEventListener("mousedown", (e) => this.handleDragStart(e, app, el));

    // Touch-based drag (mobile)
    el.addEventListener(
      "touchstart",
      (e) => this.handleTouchStart(e, app, el),
      { passive: false },
    );

    // Right-click context menu
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showContextMenu(e.clientX, e.clientY, app.id);
    });

    return el;
  }

  /**
   * Load cached favicon for an element asynchronously
   */
  async loadCachedFaviconForElement(app, el) {
    try {
      const cached = await window.faviconCache.getCached(app.url, "pinned");
      if (cached) {
        const img = el.querySelector(".pinned-app-icon img");
        if (img) {
          img.src = cached;
        }
        // Update app object
        app.cachedFavicon = cached;
      }
    } catch (e) {
      // Silently fail
    }
  }

  /**
   * Create drag ghost element (Android-like circular icon)
   */
  createDragGhost(app, sourceElement) {
    const ghost = document.createElement("div");
    ghost.className = "pinned-app-drag-ghost";

    const iconEl = sourceElement.querySelector(".pinned-app-icon");
    const imgEl = iconEl?.querySelector("img");
    const fallbackEl = iconEl?.querySelector(".pinned-app-fallback");

    if (imgEl && imgEl.style.display !== "none") {
      const imgClone = imgEl.cloneNode(true);
      imgClone.draggable = false;
      ghost.appendChild(imgClone);
    } else if (fallbackEl) {
      const fallbackClone = fallbackEl.cloneNode(true);
      fallbackClone.style.display = "flex";
      ghost.appendChild(fallbackClone);
    } else {
      ghost.textContent = app.name.charAt(0).toUpperCase();
    }

    document.body.appendChild(ghost);
    return ghost;
  }

  /**
   * Handle mouse-based drag start
   */
  handleDragStart(e, app, el) {
    // Only left mouse button
    if (e.button !== 0) return;

    // Match search-style drag behavior by preventing native text selection.
    e.preventDefault();

    // Don't start drag if clicking on a link for navigation
    // But allow drag to start after a small move

    this.startX = e.clientX;
    this.startY = e.clientY;
    this.currentX = e.clientX;
    this.currentY = e.clientY;
    this.draggedItem = app;
    this.draggedElement = el;
    this.isDragging = false;

    document.addEventListener("mousemove", this.boundHandleMouseMove);
    document.addEventListener("mouseup", this.boundHandleMouseUp);
  }

  /**
   * Handle mouse move during drag
   */
  handleMouseMove(e) {
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;

    // Start dragging after threshold (5px movement)
    if (!this.isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      this.isDragging = true;
      this.startDragVisuals();
    }

    if (this.isDragging) {
      e.preventDefault();
      this.pendingX = e.clientX;
      this.pendingY = e.clientY;
      this.queueDragFrame();
    }
  }

  /**
   * Handle mouse up (end drag)
   */
  handleMouseUp(e) {
    document.removeEventListener("mousemove", this.boundHandleMouseMove);
    document.removeEventListener("mouseup", this.boundHandleMouseUp);

    if (this.isDragging) {
      e.preventDefault();
      this.endDrag();
    }

    this.isDragging = false;
    this.draggedItem = null;
    this.draggedElement = null;
  }

  /**
   * Handle touch start
   */
  handleTouchStart(e, app, el) {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.currentX = touch.clientX;
    this.currentY = touch.clientY;
    this.draggedItem = app;
    this.draggedElement = el;
    this.isDragging = false;

    document.addEventListener("touchmove", this.boundHandleTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", this.boundHandleTouchEnd);
    document.addEventListener("touchcancel", this.boundHandleTouchEnd);
  }

  /**
   * Handle touch move
   */
  handleTouchMove(e) {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dx = touch.clientX - this.startX;
    const dy = touch.clientY - this.startY;

    if (!this.isDragging && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      this.isDragging = true;
      e.preventDefault();
      this.startDragVisuals();
    }

    if (this.isDragging) {
      e.preventDefault();
      this.pendingX = touch.clientX;
      this.pendingY = touch.clientY;
      this.queueDragFrame();
    }
  }

  /**
   * Handle touch end
   */
  handleTouchEnd(e) {
    document.removeEventListener("touchmove", this.boundHandleTouchMove);
    document.removeEventListener("touchend", this.boundHandleTouchEnd);
    document.removeEventListener("touchcancel", this.boundHandleTouchEnd);

    if (this.isDragging) {
      this.endDrag();
    }

    this.isDragging = false;
    this.draggedItem = null;
    this.draggedElement = null;
  }

  /**
   * Start drag visuals
   */
  startDragVisuals() {
    if (!this.draggedElement || !this.draggedItem) return;

    // Create ghost
    this.dragGhost = this.createDragGhost(
      this.draggedItem,
      this.draggedElement,
    );
    this.updateDragPosition();

    // Add dragging class to source element
    this.draggedElement.classList.add("dragging");

    // Defensive: clear any stale shift classes from older versions
    this.container
      ?.querySelectorAll(
        ".pinned-app-item.shift-left, .pinned-app-item.shift-right",
      )
      .forEach((el) => el.classList.remove("shift-left", "shift-right"));

    // Disable hover transforms while dragging to avoid rect jitter
    this.wrapper?.classList.add("is-dragging");
    this.container?.classList.add("is-dragging");

    // Prevent the click that fires after a drag
    this.blockNextClick = true;
    if (this.blockNextClickTimer) {
      window.clearTimeout(this.blockNextClickTimer);
    }
    this.blockNextClickTimer = window.setTimeout(() => {
      this.blockNextClick = false;
      this.blockNextClickTimer = null;
    }, 600);

    // Prevent text selection
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
  }

  queueDragFrame() {
    if (this.dragFrameRequested) return;
    this.dragFrameRequested = true;

    requestAnimationFrame(() => {
      this.dragFrameRequested = false;
      if (!this.isDragging) return;

      this.currentX = this.pendingX;
      this.currentY = this.pendingY;
      this.updateDragPosition();
      this.maybeReorderAtPoint(this.currentX, this.currentY);
    });
  }

  getPinnedItemElements() {
    if (!this.container) return [];
    return Array.from(this.container.querySelectorAll(".pinned-app-item"));
  }

  captureRects(excludeDragging = true) {
    const rects = new Map();
    for (const el of this.getPinnedItemElements()) {
      if (excludeDragging && el.classList.contains("dragging")) continue;
      const id = Number(el.dataset.appId);
      if (!Number.isFinite(id)) continue;
      rects.set(id, el.getBoundingClientRect());
    }
    return rects;
  }

  syncDomOrderToApps() {
    if (!this.container) return;
    const addButton = this.container.querySelector(".pinned-app-add");
    const existing = new Map(
      this.getPinnedItemElements().map((el) => [Number(el.dataset.appId), el]),
    );

    const frag = document.createDocumentFragment();
    for (const app of this.apps) {
      const el = existing.get(app.id);
      if (el) frag.appendChild(el);
    }

    if (addButton) {
      this.container.insertBefore(frag, addButton);
    } else {
      this.container.appendChild(frag);
    }
  }

  animateFlip(beforeRects) {
    const elements = this.getPinnedItemElements().filter(
      (el) => !el.classList.contains("dragging"),
    );

    for (const el of elements) {
      const id = Number(el.dataset.appId);
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
    void this.container?.offsetHeight;

    requestAnimationFrame(() => {
      const elements2 = this.getPinnedItemElements().filter(
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

  getClosestNonDraggingItemAtPoint(x, y) {
    const direct = document.elementFromPoint(x, y)?.closest(".pinned-app-item");
    if (direct && !direct.classList.contains("dragging")) return direct;

    // Fallback: closest by center distance
    const items = this.getPinnedItemElements().filter(
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

  maybeReorderAtPoint(x, y) {
    if (!this.draggedItem || !this.container) return;

    const targetEl = this.getClosestNonDraggingItemAtPoint(x, y);

    // Clear previous hover state
    this.container
      .querySelectorAll(
        ".pinned-app-item.drag-over, .pinned-app-item.shift-left, .pinned-app-item.shift-right",
      )
      .forEach((el) =>
        el.classList.remove("drag-over", "shift-left", "shift-right"),
      );

    if (!targetEl) {
      this.currentDropTarget = null;
      return;
    }

    const targetId = Number(targetEl.dataset.appId);
    const targetApp = this.apps.find((a) => a.id === targetId);
    if (!targetApp || targetApp.id === this.draggedItem.id) {
      this.currentDropTarget = null;
      return;
    }

    const draggedIndex = this.apps.findIndex(
      (a) => a.id === this.draggedItem.id,
    );
    const targetIndex = this.apps.findIndex((a) => a.id === targetApp.id);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const rect = targetEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const deadZone = rect.width * 0.08; // small hysteresis to avoid oscillation

    let insertionIndex = targetIndex;
    if (x > centerX + deadZone) insertionIndex = targetIndex + 1;
    else if (x < centerX - deadZone) insertionIndex = targetIndex;
    else {
      // Inside dead-zone: don't change ordering
      targetEl.classList.add("drag-over");
      this.currentDropTarget = targetApp;
      return;
    }

    // Convert insertion index to a "move-to" index in the array after removal
    let toIndex = insertionIndex;
    if (toIndex > draggedIndex) toIndex -= 1;
    toIndex = Math.max(0, Math.min(this.apps.length - 1, toIndex));

    targetEl.classList.add("drag-over");
    this.currentDropTarget = targetApp;

    if (toIndex === draggedIndex) return;

    const beforeRects = this.captureRects(true);

    const [moved] = this.apps.splice(draggedIndex, 1);
    this.apps.splice(toIndex, 0, moved);

    this.syncDomOrderToApps();
    this.animateFlip(beforeRects);
  }

  /**
   * Update drag ghost position
   */
  updateDragPosition() {
    if (!this.dragGhost) return;

    this.dragGhost.style.left = `${this.currentX}px`;
    this.dragGhost.style.top = `${this.currentY}px`;
  }

  /**
   * Check what element we're hovering over and animate items
   */
  checkDropTarget(x, y) {
    if (!this.draggedItem) return;

    const items = this.container.querySelectorAll(
      ".pinned-app-item:not(.dragging)",
    );
    let targetApp = null;
    let targetElement = null;

    items.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.sqrt(
        Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2),
      );

      // If we're within the item bounds or close to center
      if (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      ) {
        targetElement = item;
        const appId = parseInt(item.dataset.appId);
        targetApp = this.apps.find((a) => a.id === appId);
      }
    });

    // Remove shift classes from all items first
    items.forEach((item) => {
      item.classList.remove("shift-left", "shift-right", "drag-over");
    });

    if (targetApp && targetElement && targetApp.id !== this.draggedItem.id) {
      const draggedIndex = this.apps.findIndex(
        (a) => a.id === this.draggedItem.id,
      );
      const targetIndex = this.apps.findIndex((a) => a.id === targetApp.id);

      // Apply shift animations to items between dragged and target
      items.forEach((item) => {
        const appId = parseInt(item.dataset.appId);
        const itemIndex = this.apps.findIndex((a) => a.id === appId);

        if (draggedIndex < targetIndex) {
          // Dragging right: items between should shift left
          if (itemIndex > draggedIndex && itemIndex <= targetIndex) {
            item.classList.add("shift-left");
          }
        } else {
          // Dragging left: items between should shift right
          if (itemIndex >= targetIndex && itemIndex < draggedIndex) {
            item.classList.add("shift-right");
          }
        }
      });

      targetElement.classList.add("drag-over");
      this.currentDropTarget = targetApp;
    } else {
      this.currentDropTarget = null;
    }
  }

  /**
   * End drag and perform reorder
   */
  endDrag() {
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
    this.apps.forEach((app, index) => {
      app.order = index;
    });
    this.saveApps();

    // Cleanup
    document.querySelectorAll(".pinned-app-item").forEach((item) => {
      item.classList.remove(
        "dragging",
        "drag-over",
        "shift-left",
        "shift-right",
      );
    });

    this.wrapper?.classList.remove("is-dragging");
    this.container?.classList.remove("is-dragging");

    document.body.style.userSelect = "";
    document.body.style.webkitUserSelect = "";

    this.currentDropTarget = null;
  }
}

// Export for use
window.PinnedAppsManager = PinnedAppsManager;

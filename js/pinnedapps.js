/**
 * Pinned Apps Manager
 * Handles pinned websites/apps with drag-and-drop functionality
 * Features: favicon fetching, reordering, editing, 10 items per row
 */

class PinnedAppsManager {
  constructor(storage) {
    this.storage = storage;
    this.apps = [];
    this.draggedItem = null;
    this.container = document.getElementById("pinnedAppsGrid");
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

    // Delete confirmation modal elements
    this.deleteModal = document.getElementById("deleteConfirmModal");
    this.deleteAppName = document.getElementById("deleteAppName");
    this.confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
    this.cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
    this.pendingDeleteId = null;

    // Context menu element
    this.contextMenu = null;

    this.init();
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
        <span class="context-menu-icon">✏️</span>
        <span>Edit</span>
      </button>
      <button class="context-menu-item context-menu-delete">
        <span class="context-menu-icon">🗑️</span>
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
      true
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
        this.handleEditFormSubmit(e)
      );
    }

    // Close edit modal on outside click
    if (this.editModal) {
      this.editModal.addEventListener("click", (e) => {
        if (e.target === this.editModal) {
          this.hideEditModal();
        }
      });
    }

    // Close modal on outside click
    if (this.modal) {
      this.modal.addEventListener("click", (e) => {
        if (e.target === this.modal) {
          this.hideModal();
        }
      });
    }

    // Delete confirmation modal buttons
    if (this.confirmDeleteBtn) {
      this.confirmDeleteBtn.addEventListener("click", () =>
        this.confirmDelete()
      );
    }
    if (this.cancelDeleteBtn) {
      this.cancelDeleteBtn.addEventListener("click", () =>
        this.hideDeleteConfirmation()
      );
    }

    // Close delete modal on outside click
    if (this.deleteModal) {
      this.deleteModal.addEventListener("click", (e) => {
        if (e.target === this.deleteModal) {
          this.hideDeleteConfirmation();
        }
      });
    }
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

    if (this.editModal) {
      if (this.editNameInput) this.editNameInput.value = app.name;
      if (this.editUrlInput) this.editUrlInput.value = app.url;
      if (this.editIdInput) this.editIdInput.value = appId;
      this.editModal.classList.add("active");
      if (this.editNameInput) this.editNameInput.focus();
    }
  }

  /**
   * Hide edit app modal
   */
  hideEditModal() {
    if (this.editModal) {
      this.editModal.classList.remove("active");
      if (this.editForm) this.editForm.reset();
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
      app.name = name;
      app.url = url;
      // Refresh favicon with new URL
      app.favicon = this.getFaviconUrl(url);

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

    // Get favicon
    const favicon = this.getFaviconUrl(url);

    // Add app
    const app = {
      id: Date.now(),
      name: name,
      url: url,
      favicon: favicon,
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
      // Use Google's favicon service as primary
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
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
  }

  /**
   * Create app element
   */
  createAppElement(app) {
    const el = document.createElement("div");
    el.className = "pinned-app-item";
    el.draggable = true;
    el.dataset.appId = app.id;

    const faviconUrl = app.favicon || this.getFaviconUrl(app.url);
    const fallbackIcon = app.name.charAt(0).toUpperCase();

    el.innerHTML = `
      <a href="${
        app.url
      }" class="pinned-app-link" target="_blank" rel="noopener noreferrer">
        <div class="pinned-app-icon">
          ${
            faviconUrl
              ? `<img src="${faviconUrl}" alt="${app.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">`
              : ""
          }
          <span class="pinned-app-fallback" style="${
            faviconUrl ? "display:none" : ""
          }">${fallbackIcon}</span>
        </div>
        <span class="pinned-app-name">${this.escapeHtml(app.name)}</span>
      </a>
    `;

    // Drag events
    el.addEventListener("dragstart", (e) => this.handleDragStart(e, app));
    el.addEventListener("dragend", () => this.handleDragEnd());
    el.addEventListener("dragover", (e) => this.handleDragOver(e));
    el.addEventListener("drop", (e) => this.handleDrop(e, app));

    // Right-click context menu
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showContextMenu(e.clientX, e.clientY, app.id);
    });

    return el;
  }

  /**
   * Handle drag start
   */
  handleDragStart(e, app) {
    this.draggedItem = app;
    e.currentTarget.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", app.id);
  }

  /**
   * Handle drag end
   */
  handleDragEnd() {
    this.draggedItem = null;
    document.querySelectorAll(".pinned-app-item").forEach((item) => {
      item.classList.remove("dragging", "drag-over");
    });
  }

  /**
   * Handle drag over
   */
  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const target = e.target.closest(".pinned-app-item");
    if (target && !target.classList.contains("dragging")) {
      // Remove drag-over from all items
      document.querySelectorAll(".pinned-app-item").forEach((item) => {
        item.classList.remove("drag-over");
      });
      target.classList.add("drag-over");
    }
  }

  /**
   * Handle drop
   */
  handleDrop(e, targetApp) {
    e.preventDefault();

    if (!this.draggedItem || this.draggedItem.id === targetApp.id) return;

    // Find indexes
    const draggedIndex = this.apps.findIndex(
      (a) => a.id === this.draggedItem.id
    );
    const targetIndex = this.apps.findIndex((a) => a.id === targetApp.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Remove dragged item
    const [removed] = this.apps.splice(draggedIndex, 1);

    // Insert at new position
    this.apps.splice(targetIndex, 0, removed);

    // Update order
    this.apps.forEach((app, index) => {
      app.order = index;
    });

    this.saveApps();
    this.render();
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use
window.PinnedAppsManager = PinnedAppsManager;

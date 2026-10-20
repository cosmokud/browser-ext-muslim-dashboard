/**
 * GridLayoutManager: layout and sidebar state persistence.
 * Part of the class declared in js/gridlayout/index.js; load this after it.
 */
(function (prototype, members) {
  for (const name of Object.getOwnPropertyNames(members.prototype)) {
    if (name === "constructor") continue;
    Object.defineProperty(
      prototype,
      name,
      Object.getOwnPropertyDescriptor(members.prototype, name),
    );
  }
})(GridLayoutManager.prototype, class {

  getSavedNormalLayoutForMode(settings, layoutMode = "normalWide") {
    const modeKey = this.getNormalLayoutStorageKeyForMode(layoutMode);

    let savedLayout = settings[modeKey];

    if (!Array.isArray(savedLayout) || savedLayout.length === 0) {
      // Compressed mode can fall back to wide layout if it has never been saved.
      if (layoutMode === "compressed") {
        savedLayout =
          settings[this.getNormalLayoutStorageKeyForMode("normalWide")];
      }
    }

    if (!Array.isArray(savedLayout) || savedLayout.length === 0) {
      savedLayout = settings.gridLayoutNormal;
    }

    if (!Array.isArray(savedLayout) || savedLayout.length === 0) {
      savedLayout = settings.gridLayout;
    }

    return savedLayout;
  }

  loadLayoutForMode(mode) {
    const settings = this.storage.getSettings();

    let savedLayout = null;
    if (mode === "sidebar") {
      savedLayout = settings[this.getSidebarLayoutStorageKey()];
    } else {
      const normalMode = this.getMainContainerLayoutMode();
      savedLayout = this.getSavedNormalLayoutForMode(settings, normalMode);
      this.currentMainContainerLayoutMode = normalMode;
    }

    // Normalize/validate
    const normalized = this.normalizeLayout(savedLayout);
    this.rows = normalized;
    this.activeRows = JSON.parse(JSON.stringify(normalized));
  }

  normalizeLayout(layout) {
    const base = Array.isArray(layout) ? layout : null;
    const rows =
      base && Array.isArray(base) && base.length > 0
        ? JSON.parse(JSON.stringify(base))
        : JSON.parse(JSON.stringify(this.defaultLayout));

    // Validate saved layout has all components
    const allIds = new Set(Object.keys(this.componentSpans));
    const savedIds = new Set(rows.flat());
    const missingIds = [...allIds].filter((id) => !savedIds.has(id));

    if (missingIds.length > 0) {
      missingIds.forEach((id) => {
        const defaultRow = this.defaultLayout.find((row) => row.includes(id));
        if (defaultRow) {
          const defaultIndex = this.defaultLayout.indexOf(defaultRow);
          if (rows[defaultIndex]) {
            rows[defaultIndex].push(id);
          } else {
            rows.push([id]);
          }
        } else {
          rows.push([id]);
        }
      });
    }

    return rows;
  }

  getSidebarStateFromDOM() {
    const leftZone = this.getSidebarZone("left");
    const rightZone = this.getSidebarZone("right");
    const getIds = (zone) => {
      if (!zone) return [];
      return Array.from(
        zone.querySelectorAll(":scope > .sidebar-slot > .grid-draggable"),
      )
        .map((el) => el.dataset.gridId)
        .filter(Boolean);
    };

    return {
      left: getIds(leftZone),
      right: getIds(rightZone),
    };
  }

  saveSidebarStateFromDOM() {
    const state = this.getSidebarStateFromDOM();
    const settings = this.storage.getSettings();
    settings[this.getSidebarStateStorageKey()] = state;
    this.storage.saveSettings(settings);
  }

  applySidebarStateFromStorage() {
    const settings = this.storage.getSettings();
    const stored = settings[this.getSidebarStateStorageKey()];
    const state =
      stored && typeof stored === "object"
        ? {
            left: Array.isArray(stored.left) ? stored.left : [],
            right: Array.isArray(stored.right) ? stored.right : [],
          }
        : { left: [], right: [] };

    this.applySidebarState(state);
  }

  applySidebarState(state) {
    // Ensure clean slate
    this.undockAllSidebarItemsToGrid();

    const dockList = (side, ids) => {
      (Array.isArray(ids) ? ids : []).forEach((id) => {
        const el = this.getElementByComponentId(id);
        if (!el) return;
        this.dockElementToSidebar(el, side);
      });
    };

    dockList("left", state.left || []);
    dockList("right", state.right || []);

    this.updateSidebarZoneCounts();
    this.cleanupEmptyRows();
    this.updateRowsFromDOM();
  }
});

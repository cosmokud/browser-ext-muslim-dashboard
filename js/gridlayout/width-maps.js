/**
 * GridLayoutManager: saved widths per component and layout mode.
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

  getFocusModeMiddleWidthStorageKey() {
    return "quranFocusMiddleComponentWidths";
  }

  getNormalWideMiddleWidthStorageKey() {
    return "sidebarMiddleComponentWidthsNormalWide";
  }

  getCompressedMiddleWidthStorageKey() {
    return "sidebarMiddleComponentWidthsCompressed";
  }

  getLegacyMiddleWidthStorageKey() {
    return "sidebarMiddleComponentWidths";
  }

  getMiddleWidthStorageKey(componentId = "") {
    const id = String(componentId || "").trim();
    const isQuranFocusPocketQuran =
      id === "pocketQuranCard" && this.isQuranFocusModeContextActive();

    if (isQuranFocusPocketQuran) {
      return this.getFocusModeMiddleWidthStorageKey();
    }

    const mainLayoutMode = this.getMainContainerLayoutMode();
    return mainLayoutMode === "compressed"
      ? this.getCompressedMiddleWidthStorageKey()
      : this.getNormalWideMiddleWidthStorageKey();
  }

  getSidebarWidthMapFromSettings() {
    const settings = this.storage.getSettings();
    const raw = settings[this.getSidebarWidthStorageKey()];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return {};
    }

    const normalized = {};
    Object.entries(raw).forEach(([id, width]) => {
      const value = Number(width);
      if (!id || !Number.isFinite(value) || value <= 0) return;
      normalized[id] = Math.round(value);
    });

    return normalized;
  }

  saveSidebarWidthMapToSettings(widthMap) {
    const settings = this.storage.getSettings();
    settings[this.getSidebarWidthStorageKey()] = { ...(widthMap || {}) };
    this.storage.saveSettings(settings);
  }

  getMiddleWidthMapFromSettings(componentId = "") {
    const settings = this.storage.getSettings();
    const selectedKey = this.getMiddleWidthStorageKey(componentId);

    let raw = settings[selectedKey];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      // Back-compat: if mode-specific maps are missing, fall back to the
      // previous single-key middle width map.
      const legacyRaw = settings[this.getLegacyMiddleWidthStorageKey()];
      if (
        legacyRaw &&
        typeof legacyRaw === "object" &&
        !Array.isArray(legacyRaw)
      ) {
        raw = legacyRaw;
      }
    }

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return {};
    }

    const normalized = {};
    Object.entries(raw).forEach(([id, width]) => {
      const value = Number(width);
      if (!id || !Number.isFinite(value) || value <= 0) return;
      normalized[id] = Math.round(value);
    });

    return normalized;
  }

  saveMiddleWidthMapToSettings(widthMap, componentId = "") {
    const settings = this.storage.getSettings();
    const selectedKey = this.getMiddleWidthStorageKey(componentId);
    settings[selectedKey] = {
      ...(widthMap || {}),
    };

    // Back-compat: keep the legacy key synchronized with the normal-wide map.
    if (selectedKey === this.getNormalWideMiddleWidthStorageKey()) {
      settings[this.getLegacyMiddleWidthStorageKey()] = {
        ...(widthMap || {}),
      };
    }

    this.storage.saveSettings(settings);
  }

  getSidebarComponentId(el) {
    if (!el) return "";
    return String(el.dataset.gridId || el.id || "").trim();
  }

  getSavedSidebarComponentWidth(componentId) {
    const id = String(componentId || "").trim();
    if (!id) return null;

    const widthMap = this.getSidebarWidthMapFromSettings();
    const value = Number(widthMap[id]);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  setSavedSidebarComponentWidth(componentId, widthPx) {
    const id = String(componentId || "").trim();
    const value = Number(widthPx);
    if (!id || !Number.isFinite(value) || value <= 0) return;

    const widthMap = this.getSidebarWidthMapFromSettings();
    widthMap[id] = Math.round(value);
    this.saveSidebarWidthMapToSettings(widthMap);
  }

  clearSavedSidebarComponentWidth(componentId) {
    const id = String(componentId || "").trim();
    if (!id) return;

    const widthMap = this.getSidebarWidthMapFromSettings();
    if (!Object.prototype.hasOwnProperty.call(widthMap, id)) return;

    delete widthMap[id];
    this.saveSidebarWidthMapToSettings(widthMap);
  }

  getSavedMiddleComponentWidth(componentId) {
    const id = String(componentId || "").trim();
    if (!id) return null;

    const widthMap = this.getMiddleWidthMapFromSettings(id);
    const value = Number(widthMap[id]);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  setSavedMiddleComponentWidth(componentId, widthPx) {
    const id = String(componentId || "").trim();
    const value = Number(widthPx);
    if (!id || !Number.isFinite(value) || value <= 0) return;

    const widthMap = this.getMiddleWidthMapFromSettings(id);
    widthMap[id] = Math.round(value);
    this.saveMiddleWidthMapToSettings(widthMap, id);
  }

  clearSavedMiddleComponentWidth(componentId) {
    const id = String(componentId || "").trim();
    if (!id) return;

    const widthMap = this.getMiddleWidthMapFromSettings(id);
    if (!Object.prototype.hasOwnProperty.call(widthMap, id)) return;

    delete widthMap[id];
    this.saveMiddleWidthMapToSettings(widthMap, id);
  }

  getSidebarMinResizeWidth(el) {
    const componentId = this.getSidebarComponentId(el);
    const configuredMin = Number(this.componentMinWidths[componentId]);
    const fallbackMin = 220;
    if (!Number.isFinite(configuredMin) || configuredMin <= 0) {
      return fallbackMin;
    }

    return Math.max(180, Math.min(420, Math.round(configuredMin)));
  }

  getSidebarMaxResizeWidth(el) {
    if (!el) return this.getSidebarMinResizeWidth(el);

    const slot = el.closest(".sidebar-slot");
    const zone = slot ? slot.closest(".sidebar-zone") : null;
    const slotWidth = Math.round((slot && slot.clientWidth) || 0);
    const zoneWidth = Math.round((zone && zone.clientWidth) || 0);
    const currentWidth = Math.round(el.getBoundingClientRect().width || 0);

    return Math.max(
      slotWidth,
      zoneWidth,
      currentWidth,
      this.getSidebarMinResizeWidth(el),
    );
  }

  getMiddleMinResizeWidth(el) {
    const componentId = this.getSidebarComponentId(el);
    const configuredMin = Number(this.componentMinWidths[componentId]);
    const fallbackMin = 220;
    if (!Number.isFinite(configuredMin) || configuredMin <= 0) {
      return fallbackMin;
    }

    return Math.max(180, Math.min(620, Math.round(configuredMin)));
  }

  getMiddleMaxResizeWidth(el) {
    if (!el) return this.getMiddleMinResizeWidth(el);

    const minWidth = this.getMiddleMinResizeWidth(el);
    const currentWidth = Math.round(el.getBoundingClientRect().width || 0);
    if (this.isFocusModePocketQuranElement(el)) {
      // Focus mode uses a fixed-position Pocket Quran overlay, so clamp by viewport
      // width instead of row/layout flow to bypass grid/container limits.
      const viewportWidth = Math.round((window.innerWidth || 0) - 24);
      return Math.max(viewportWidth, currentWidth, minWidth);
    }

    const row = el.closest(".grid-flex-row");
    const rowWidth = Math.round((row && row.clientWidth) || 0);
    const layoutWidth = Math.round(this.getLayoutWidth() || 0);
    const baseMax = Math.max(rowWidth, layoutWidth, currentWidth, minWidth);

    const componentId = this.getSidebarComponentId(el);
    if (this.isThreeItemComponentId(componentId)) {
      const mainContainerWidth = Math.round(
        this.getMainContainerResponsiveWidth() || 0,
      );
      const hardCap = Math.max(
        1,
        Math.round(
          Number.isFinite(mainContainerWidth) && mainContainerWidth > 0
            ? mainContainerWidth
            : baseMax,
        ),
      );

      const cappedByRowBudget = this.getThreeItemRowResizeBudgetCap(
        el,
        hardCap,
      );
      return Math.max(1, Math.min(baseMax, cappedByRowBudget));
    }

    return baseMax;
  }

  applySidebarWidthToElement(el, widthPx, { persist = true } = {}) {
    if (!el) return;

    const width = Number(widthPx);
    if (!Number.isFinite(width) || width <= 0) return;

    const minWidth = this.getSidebarMinResizeWidth(el);
    const maxWidth = this.getSidebarMaxResizeWidth(el);
    const clampedWidth = Math.round(
      Math.min(maxWidth, Math.max(minWidth, width)),
    );

    el.style.width = `${clampedWidth}px`;
    el.style.maxWidth = `${clampedWidth}px`;
    el.style.marginLeft = "auto";
    el.style.marginRight = "auto";
    el.classList.add("sidebar-custom-width");
    el.dataset.sidebarCustomWidth = String(clampedWidth);

    this.emitLayoutLiveResize({
      reason: "sidebar-component-width",
      componentId: this.getSidebarComponentId(el),
      width: clampedWidth,
    });

    if (persist) {
      const componentId = this.getSidebarComponentId(el);
      if (componentId) {
        this.setSavedSidebarComponentWidth(componentId, clampedWidth);
      }
    }
  }

  restoreDefaultFlexForElement(el) {
    if (!el || !this.grid) return;
    if (el.classList.contains("sidebar-detached")) return;

    const id = this.getSidebarComponentId(el);
    if (!id || !this.componentSpans[id]) return;

    const row = el.closest(".grid-flex-row");
    if (!row) return;

    const visibleItems = Array.from(row.children).filter(
      (child) => !this.isComponentHidden(child),
    );
    this.setItemFlexBasis(el, id, visibleItems.length);
  }

  applyMiddleWidthToElement(el, widthPx, { persist = true } = {}) {
    if (!el || el.classList.contains("sidebar-detached")) return;

    const width = Number(widthPx);
    if (!Number.isFinite(width) || width <= 0) return;

    const minWidth = this.getMiddleMinResizeWidth(el);
    const maxWidth = this.getMiddleMaxResizeWidth(el);
    const clampedWidth = Math.round(
      Math.min(maxWidth, Math.max(minWidth, width)),
    );

    el.style.width = `${clampedWidth}px`;
    el.style.maxWidth = `${clampedWidth}px`;
    el.style.flex = `0 0 ${clampedWidth}px`;
    if (this.isFocusModePocketQuranElement(el)) {
      this.applyQuranFocusFloatingWidthStyles(el, clampedWidth);
      el.style.marginLeft = "auto";
      el.style.marginRight = "auto";
    } else {
      this.clearQuranFocusFloatingWidthStyles(el);
      el.style.marginLeft = "auto";
      el.style.marginRight = "auto";
    }
    el.classList.add("middle-custom-width");
    el.dataset.middleCustomWidth = String(clampedWidth);

    this.emitLayoutLiveResize({
      reason: "component-width",
      componentId: this.getSidebarComponentId(el),
      width: clampedWidth,
    });

    if (persist) {
      const componentId = this.getSidebarComponentId(el);
      if (componentId) {
        this.setSavedMiddleComponentWidth(componentId, clampedWidth);
      }
    }
  }

  resetSidebarWidthForElement(el, { keepSaved = true } = {}) {
    if (!el) return;

    el.style.removeProperty("width");
    el.style.removeProperty("max-width");
    el.style.removeProperty("margin-left");
    el.style.removeProperty("margin-right");
    el.classList.remove("sidebar-custom-width");
    delete el.dataset.sidebarCustomWidth;

    if (!keepSaved) {
      const componentId = this.getSidebarComponentId(el);
      if (componentId) {
        this.clearSavedSidebarComponentWidth(componentId);
      }
    }
  }

  resetMiddleWidthForElement(
    el,
    { keepSaved = true, restoreDefaultFlex = true } = {},
  ) {
    if (!el) return;

    this.clearQuranFocusFloatingWidthStyles(el);

    el.style.removeProperty("width");
    el.style.removeProperty("max-width");
    el.style.removeProperty("margin-left");
    el.style.removeProperty("margin-right");
    el.classList.remove("middle-custom-width");
    delete el.dataset.middleCustomWidth;

    if (restoreDefaultFlex) {
      this.restoreDefaultFlexForElement(el);
    }

    if (!keepSaved) {
      const componentId = this.getSidebarComponentId(el);
      if (componentId) {
        this.clearSavedMiddleComponentWidth(componentId);
      }
    }
  }

  applySavedSidebarWidthToElement(el) {
    if (!el) return;

    const componentId = this.getSidebarComponentId(el);
    const savedWidth = this.getSavedSidebarComponentWidth(componentId);
    if (savedWidth) {
      this.applySidebarWidthToElement(el, savedWidth, { persist: false });
      return;
    }

    this.resetSidebarWidthForElement(el, { keepSaved: true });
  }

  applySavedMiddleWidthToElement(el) {
    if (!el || el.classList.contains("sidebar-detached")) return;

    const componentId = this.getSidebarComponentId(el);
    const savedWidth = this.getSavedMiddleComponentWidth(componentId);
    if (savedWidth) {
      this.applyMiddleWidthToElement(el, savedWidth, { persist: false });
      return;
    }

    if (
      el.classList.contains("middle-custom-width") ||
      el.dataset.middleCustomWidth
    ) {
      this.resetMiddleWidthForElement(el, {
        keepSaved: true,
        restoreDefaultFlex: true,
      });
    }
  }

  applySavedMiddleWidthsFromDOM() {
    if (!this.grid) return;

    const middleItems = Array.from(
      this.grid.querySelectorAll(".grid-flex-row > .grid-draggable"),
    ).filter((el) => !el.classList.contains("sidebar-detached"));

    middleItems.forEach((el) => {
      this.ensureSidebarResizeHandles(el);
      this.applySavedMiddleWidthToElement(el);
    });
  }
});

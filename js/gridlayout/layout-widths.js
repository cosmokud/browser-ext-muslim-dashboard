/**
 * GridLayoutManager: layout width and storage keys.
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

  getLayoutWidth() {
    if (this.grid) {
      const rect = this.grid.getBoundingClientRect();
      if (rect && rect.width) {
        return Math.round(rect.width);
      }
      if (this.grid.offsetWidth) {
        return this.grid.offsetWidth;
      }
    }

    return (
      window.innerWidth ||
      document.documentElement.clientWidth ||
      document.body.clientWidth ||
      0
    );
  }

  getMainContainerResponsiveWidth() {
    const mainContainer =
      (this.grid &&
        (this.grid.closest(".main-container.container-wide") ||
          this.grid.closest(".main-container"))) ||
      document.querySelector(
        "#sidebarMiddle > .main-container.container-wide",
      ) ||
      document.querySelector(".main-container.container-wide") ||
      document.querySelector("#sidebarMiddle > .main-container") ||
      document.querySelector(".main-container");

    const width = Math.round(
      (mainContainer && mainContainer.getBoundingClientRect().width) || 0,
    );

    if (Number.isFinite(width) && width > 0) {
      return width;
    }

    return this.getLayoutWidth();
  }

  getNormalWideLayoutStorageKey() {
    return "gridLayoutNormalWide";
  }

  getCompressedLayoutStorageKey() {
    return "gridLayoutNormalCompressed";
  }

  getSidebarLayoutStorageKey() {
    return "gridLayoutSidebar";
  }

  getNormalLayoutStorageKeyForMode(layoutMode = "normalWide") {
    return layoutMode === "compressed"
      ? this.getCompressedLayoutStorageKey()
      : this.getNormalWideLayoutStorageKey();
  }

  getMainContainerLayoutMode() {
    return this.shouldForceSingleRowLayoutForThreeItemComponents()
      ? "compressed"
      : "normalWide";
  }

  saveNormalLayoutRowsForMode(
    layoutMode,
    rowsOverride = this.rows,
    settings = null,
  ) {
    const targetSettings = settings || this.storage.getSettings();
    const rows = Array.isArray(rowsOverride)
      ? JSON.parse(JSON.stringify(rowsOverride))
      : [];

    targetSettings[this.getNormalLayoutStorageKeyForMode(layoutMode)] = rows;

    // Back-compat: keep legacy normal keys synced with wide mode only.
    if (layoutMode === "normalWide") {
      targetSettings.gridLayoutNormal = JSON.parse(JSON.stringify(rows));
      targetSettings.gridLayout = JSON.parse(JSON.stringify(rows));
    }

    return targetSettings;
  }
});

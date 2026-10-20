/**
 * FloatingModeManager: grid layout lookups.
 * Part of the class declared in js/floating/index.js; load this after it.
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
})(FloatingModeManager.prototype, class {

  debugLog(scope, error, extra = null) {
    const message = error?.message || String(error);
    if (extra !== null && typeof extra !== "undefined") {
      console.debug(`[FloatingMode] ${scope}: ${message}`, extra);
      return;
    }
    console.debug(`[FloatingMode] ${scope}: ${message}`);
  }

  _isGridLayoutActive() {
    try {
      return !!document.querySelector(".content-grid .grid-flex-row");
    } catch (e) {
      return false;
    }
  }

  _getGridLayoutRowsSnapshot() {
    try {
      const rows = window.dashboard?.gridLayout?.rows;
      if (Array.isArray(rows)) return rows;
    } catch (e) {}

    try {
      const settings = this.getSettings();
      if (Array.isArray(settings?.gridLayout)) return settings.gridLayout;
    } catch (e) {}

    return null;
  }

  _getGridLayoutManager() {
    try {
      return window.dashboard?.gridLayout || null;
    } catch (e) {
      return null;
    }
  }

  _getComponentSpanMeta(componentId) {
    const grid = this._getGridLayoutManager();
    const dynamicMeta = grid?.componentSpans?.[componentId];
    if (dynamicMeta && typeof dynamicMeta === "object") {
      const span = Number(dynamicMeta.span);
      const minSpan = Number(dynamicMeta.minSpan);
      return {
        span: Number.isFinite(span) ? span : 6,
        minSpan: Number.isFinite(minSpan)
          ? minSpan
          : Number.isFinite(span)
            ? span
            : 6,
      };
    }

    const fallbackMeta = {
      header: { span: 2, minSpan: 2 },
      pinnedAppsSection: { span: 2, minSpan: 2 },
      searchBarSection: { span: 2, minSpan: 2 },
      quoteSection: { span: 2, minSpan: 2 },
      weatherCard: { span: 6, minSpan: 6 },
      hadithCard: { span: 2, minSpan: 2 },
      notesCard: { span: 2, minSpan: 2 },
      pocketQuranCard: { span: 2, minSpan: 2 },
      prayerTimesCard: { span: 2, minSpan: 2 },
      calendarCard: { span: 2, minSpan: 2 },
      qiblaCard: { span: 2, minSpan: 2 },
      lunarPhaseCard: { span: 2, minSpan: 2 },
      fastingCard: { span: 2, minSpan: 2 },
      flashcardCard: { span: 2, minSpan: 2 },
      adhkarCard: { span: 2, minSpan: 2 },
      todoCard: { span: 2, minSpan: 2 },
    };

    return fallbackMeta[componentId] || { span: 6, minSpan: 6 };
  }

  _isFullWidthGridComponent(componentId) {
    const meta = this._getComponentSpanMeta(componentId);
    return meta.span >= 6 || meta.minSpan >= 6;
  }

  _getComponentLayoutMode(componentId) {
    if (!componentId) return "full-width";
    return this._isFullWidthGridComponent(componentId)
      ? "full-width"
      : "three-item";
  }

  _canFitIntoThreeItemRow(row, componentId) {
    if (!Array.isArray(row) || !componentId) return false;
    if (this._isFullWidthGridComponent(componentId)) return false;
    if (row.length >= 3) return false;
    if (row.some((id) => this._isFullWidthGridComponent(id))) return false;

    const nextSpan = this._getComponentSpanMeta(componentId).span;
    const currentSpan = row.reduce(
      (sum, id) => sum + this._getComponentSpanMeta(id).span,
      0,
    );

    return currentSpan + nextSpan <= 6;
  }
});

/**
 * WeatherManager: responsive layout syncing.
 * Part of the class declared in js/weather/index.js; load this after it.
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
})(WeatherManager.prototype, class {

  runResponsiveLayoutSync({ includeChart = false } = {}) {
    this._weatherCardContentWidth = this.measureWeatherCardElementWidth();
    this.syncWeatherResponsiveLayout();
    this.applyForecastFlexLayout();
    this.updateWeatherLocationTruncation();
    this.updateForecastMetaWrapping();

    if (includeChart) {
      this.renderHourlyChart();
    }
  }

  queueResponsiveLayoutSyncFrame({ includeChart = false } = {}) {
    if (includeChart) {
      this._responsiveSyncFrameIncludeChart = true;
    }

    if (this._responsiveSyncFrameRaf) {
      return;
    }

    this._responsiveSyncFrameRaf = requestAnimationFrame(() => {
      this._responsiveSyncFrameRaf = null;
      const shouldRenderChart = this._responsiveSyncFrameIncludeChart;
      this._responsiveSyncFrameIncludeChart = false;
      this.runResponsiveLayoutSync({ includeChart: shouldRenderChart });
    });
  }

  handleExternalLayoutLiveResize(detail = {}) {
    const reason = String(detail?.reason || "").trim();
    const componentId = String(detail?.componentId || "").trim();

    // Direct component-width updates (Layout Editor and other runtime width
    // writes) should immediately update the cached content-box width.
    if (
      (reason === "component-width" || reason === "sidebar-component-width") &&
      componentId === "weatherCard"
    ) {
      const borderBoxWidth = Math.round(Number(detail?.width) || 0);
      if (
        Number.isFinite(borderBoxWidth) &&
        borderBoxWidth > 0 &&
        this.weatherCard
      ) {
        const cardStyle = window.getComputedStyle(this.weatherCard);
        const paddingLeft = parseFloat(cardStyle.paddingLeft) || 0;
        const paddingRight = parseFloat(cardStyle.paddingRight) || 0;
        const borderLeft = parseFloat(cardStyle.borderLeftWidth) || 0;
        const borderRight = parseFloat(cardStyle.borderRightWidth) || 0;

        const contentWidth = Math.max(
          0,
          Math.round(
            borderBoxWidth -
              paddingLeft -
              paddingRight -
              borderLeft -
              borderRight,
          ),
        );

        if (contentWidth > 0) {
          this._weatherCardContentWidth = contentWidth;
        }
      }
    }

    // High-frequency drag/resize updates: keep weather-content layout live on
    // every frame so card mode changes are visible while dragging.
    if (
      reason === "component-width" ||
      reason === "sidebar-component-width" ||
      reason === "middle-layout-width"
    ) {
      this.queueResponsiveLayoutSyncFrame({ includeChart: false });
      return;
    }

    // Resize-end transitions should include a settled pass for chart sizing
    // and any transient width reflow after mouse/touch release.
    if (
      reason === "component-resize-end" ||
      reason === "middle-layout-resize-end" ||
      reason === "container-width-setting" ||
      reason === "viewport-resize-sync"
    ) {
      this.queueResponsiveLayoutSyncFrame({ includeChart: false });
      this.scheduleResponsiveLayoutSync({
        includeChart: true,
        settlePass: true,
        debounceMs: 16,
      });
      return;
    }

    this.scheduleResponsiveLayoutSync({
      includeChart: true,
      settlePass: true,
      debounceMs: 48,
    });
  }

  scheduleResponsiveLayoutSync({
    includeChart = false,
    settlePass = false,
    debounceMs = 0,
  } = {}) {
    const runSync = () => {
      this.runResponsiveLayoutSync({ includeChart });
    };

    if (this._responsiveSyncTimer) {
      clearTimeout(this._responsiveSyncTimer);
      this._responsiveSyncTimer = null;
    }

    if (this._responsiveSyncRaf1) {
      cancelAnimationFrame(this._responsiveSyncRaf1);
      this._responsiveSyncRaf1 = null;
    }
    if (this._responsiveSyncRaf2) {
      cancelAnimationFrame(this._responsiveSyncRaf2);
      this._responsiveSyncRaf2 = null;
    }

    const delay = Math.max(0, Math.round(Number(debounceMs) || 0));
    this._responsiveSyncTimer = window.setTimeout(() => {
      this._responsiveSyncTimer = null;
      runSync();

      if (!settlePass) {
        return;
      }

      this._responsiveSyncRaf1 = requestAnimationFrame(() => {
        this._responsiveSyncRaf1 = null;
        this._responsiveSyncRaf2 = requestAnimationFrame(() => {
          this._responsiveSyncRaf2 = null;
          runSync();
        });
      });
    }, delay);
  }
});

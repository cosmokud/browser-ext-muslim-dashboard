/**
 * WeatherManager: weather event listeners.
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

  setupEventListeners() {
    if (this._listenersBound) return;
    this._listenersBound = true;

    if (this.weatherRefreshBtn) {
      this.weatherRefreshBtn.addEventListener("click", () =>
        this.fetchWeather({ force: false }),
      );
    }

    if (this.weatherChartTabs && this.weatherChartTabs.length) {
      this.weatherChartTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          const metric = tab.getAttribute("data-metric");
          if (!metric) return;
          this.selectedMetric = metric;
          this.updateMetricTabs();
          this._startHourlyChartAnimation();
          this.renderHourlyChart();
        });
      });
    }

    if (this.weatherChart) {
      this.weatherChart.addEventListener("mousemove", (e) =>
        this._handleChartMouseMove(e),
      );
      this.weatherChart.addEventListener("mouseleave", () =>
        this._handleChartMouseLeave(),
      );
    }

    if (
      !this._chartVisibilityObserver &&
      this.weatherChartWrap &&
      typeof IntersectionObserver !== "undefined"
    ) {
      this._chartVisibilityObserver = new IntersectionObserver(
        (entries) => {
          const isVisible = entries.some(
            (entry) => entry.isIntersecting && entry.intersectionRatio > 0,
          );

          if (this._chartInViewport === isVisible) return;
          this._chartInViewport = isVisible;

          if (!isVisible) {
            if (this._chartRaf) {
              cancelAnimationFrame(this._chartRaf);
              this._chartRaf = null;
            }
            this._chartAnim = null;
            this._hideWeatherChartTooltip();
            return;
          }

          this.renderHourlyChart();
        },
        {
          root: null,
          threshold: 0.02,
        },
      );

      this._chartVisibilityObserver.observe(this.weatherChartWrap);
    }

    this._weatherCardContentWidth = this.measureWeatherCardElementWidth();
    this.runResponsiveLayoutSync({ includeChart: true });

    if (
      !this._weatherResizeObserver &&
      this.weatherCard &&
      typeof ResizeObserver !== "undefined"
    ) {
      this._weatherResizeObserver = new ResizeObserver(() => {
        this._weatherCardContentWidth = this.measureWeatherCardElementWidth();
        this._onWeatherCardResize();
      });
      this._weatherResizeObserver.observe(this.weatherCard);
    }

    if (
      !this._weatherContentResizeObserver &&
      this.weatherContent &&
      typeof ResizeObserver !== "undefined"
    ) {
      this._weatherContentResizeObserver = new ResizeObserver(() => {
        this._onWeatherCardResize();
      });
      this._weatherContentResizeObserver.observe(this.weatherContent);
    }

    const mainContainerEl =
      this.weatherCard?.closest(".main-container") ||
      document.querySelector("#sidebarMiddle > .main-container") ||
      document.querySelector(".main-container");

    if (
      !this._weatherMainContainerResizeObserver &&
      mainContainerEl &&
      typeof ResizeObserver !== "undefined"
    ) {
      this._weatherMainContainerResizeObserver = new ResizeObserver(() => {
        this._onWeatherCardResize();
      });
      this._weatherMainContainerResizeObserver.observe(mainContainerEl);
    }

    if (
      !this._weatherCardMutationObserver &&
      this.weatherCard &&
      typeof MutationObserver !== "undefined"
    ) {
      this._weatherCardMutationObserver = new MutationObserver(() => {
        this.queueResponsiveLayoutSyncFrame({ includeChart: false });
        this.scheduleResponsiveLayoutSync({
          includeChart: false,
          settlePass: true,
          debounceMs: 12,
        });
      });

      this._weatherCardMutationObserver.observe(this.weatherCard, {
        attributes: true,
        attributeFilter: [
          "style",
          "class",
          "data-middle-custom-width",
          "data-sidebar-custom-width",
        ],
      });
    }

    this._weatherLayoutSyncEvents.forEach((eventName) => {
      document.addEventListener(eventName, this._externalLayoutSyncHandler);
    });

    window.addEventListener("resize", this._onResize);
  }
});

/**
 * WeatherManager, part 2 of 3.
 * Moved out of js/weather.js at method boundaries, so no single file carries the
 * whole class. The class itself is declared in js/weather.js; load this after it.
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

  _refreshWeatherIcons() {
    if (this.currentWeather) {
      this.displayCurrentWeather(this.currentWeather);
    }
    if (this.dailyForecast) {
      this.displayForecast(this.dailyForecast);
    }
    if (this.hourlyForecast) {
      this.renderHourlyChart();
    }
  }

  isPerformanceModeEnabled() {
    if (typeof window !== "undefined") {
      if (typeof window.__MD_PERFORMANCE_MODE__ === "boolean") {
        return window.__MD_PERFORMANCE_MODE__ === true;
      }
    }

    try {
      return this.storage.getSettings()?.performanceModeEnabled === true;
    } catch (e) {
      return false;
    }
  }

  isHighestVisualFidelityEnabled() {
    if (typeof window !== "undefined") {
      if (typeof window.__MD_HIGHEST_VISUAL_FIDELITY__ === "boolean") {
        return window.__MD_HIGHEST_VISUAL_FIDELITY__ === true;
      }
    }

    try {
      return (
        this.storage.getSettings()?.theme?.highestVisualFidelityEnabled === true
      );
    } catch (e) {
      return false;
    }
  }

  _getLocalDateKey(ts) {
    const d = ts ? new Date(ts) : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  _getWeatherForecastCache() {
    const cache = this.storage.get("weather_openmeteo_cache_v1", null);
    return cache && typeof cache === "object" ? cache : null;
  }

  _setWeatherForecastCache(cache) {
    try {
      this.storage.set("weather_openmeteo_cache_v1", cache);
    } catch (e) {}
  }

  _isUsableWeatherPayload(data) {
    if (!data || typeof data !== "object") return false;
    if (data.error === true) return false;

    const hasCurrent = data.current && typeof data.current === "object";
    const hasLegacyCurrent =
      data.current_weather && typeof data.current_weather === "object";
    const hasHourly = data.hourly && typeof data.hourly === "object";
    const hasDaily = data.daily && typeof data.daily === "object";

    return (hasCurrent || hasLegacyCurrent) && (hasHourly || hasDaily);
  }

  _validateWeatherPayload(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Weather API returned malformed payload.");
    }

    if (data.error === true) {
      const reason =
        typeof data.reason === "string" && data.reason.trim()
          ? data.reason.trim()
          : "Unknown weather API error";
      throw new Error(reason);
    }

    if (!this._isUsableWeatherPayload(data)) {
      throw new Error(
        "Weather API payload is missing required forecast fields.",
      );
    }
  }

  async init() {
    this.setupEventListeners();

    // Show loading state immediately (non-blocking)
    this.showLoadingState();

    // Initialize compact weather (will show loading state)
    this.initCompactWeather();

    // Fetch weather data (may take time due to geolocation + API)
    try {
      await this.fetchWeather();
    } catch (err) {
      console.warn("Weather fetch error during init:", err);
      this.showErrorState();
    }

    // Trigger the hourly chart animation on initial load so it animates
    // the same way it does when switching metric tabs.
    this._startHourlyChartAnimation();
    this.renderHourlyChart();

    // Update compact weather with fetched data
    this.updateCompactWeather();

    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.refreshInterval = setInterval(
      () => {
        this.fetchWeather({ force: false });
      },
      30 * 60 * 1000,
    );

    return;
  }

  initCompactWeather() {
    const settings = this.storage.getSettings();

    // Check if compact weather should be enabled
    if (!settings.compactWeatherEnabled) {
      this.hideCompactWeather();
      return;
    }

    // Create compact weather element if it doesn't exist
    this.ensureCompactWeatherElement();
    this.updateCompactWeather();
  }

  ensureCompactWeatherElement() {
    const settings = this.storage.getSettings();
    const headingSettings = settings.heading || {};
    const compactWeatherBgEnabled =
      headingSettings.wholeComponentSurfaceEnabled !== true &&
      headingSettings.compactWeatherBackgroundEnabled === true;

    const header = document.querySelector(".header");
    const greetingSection = document.querySelector(".greeting-section");
    const dateDisplay = document.getElementById("dateDisplay");
    const timeSection = document.querySelector(".time-section");
    if (!header || !greetingSection || !timeSection) return;

    const legacyRightSection = document.querySelector(".header-right-section");
    if (legacyRightSection && legacyRightSection.contains(timeSection)) {
      header.insertBefore(timeSection, legacyRightSection);
    }

    let compactWeather = document.getElementById("compactWeather");
    if (!compactWeather) {
      compactWeather = document.createElement("div");
      compactWeather.id = "compactWeather";
      compactWeather.className = "compact-weather";

      compactWeather.innerHTML = `
      <span class="compact-weather-icon"></span>
      <span class="compact-weather-temp"></span>
      <div class="compact-weather-details">
        <span class="compact-weather-feels"></span>
        <span class="compact-weather-humidity"></span>
        <span class="compact-weather-wind"></span>
      </div>
      <span class="compact-weather-location"></span>
    `;
    }

    if (!compactWeather.querySelector(".compact-weather-location")) {
      const locationEl = document.createElement("span");
      locationEl.className = "compact-weather-location";
      compactWeather.appendChild(locationEl);
    }

    if (legacyRightSection && legacyRightSection.contains(compactWeather)) {
      legacyRightSection.removeChild(compactWeather);
    }
    if (legacyRightSection && legacyRightSection.childElementCount === 0) {
      legacyRightSection.remove();
    }

    if (dateDisplay && dateDisplay.parentNode === greetingSection) {
      dateDisplay.insertAdjacentElement("afterend", compactWeather);
    } else {
      greetingSection.appendChild(compactWeather);
    }

    compactWeather.classList.toggle(
      "header-surface-enabled",
      compactWeatherBgEnabled,
    );

    this.compactWeatherEl = compactWeather;
  }

  updateCompactWeather() {
    const settings = this.storage.getSettings();

    if (!settings.compactWeatherEnabled) {
      this.hideCompactWeather();
      return;
    }

    this.ensureCompactWeatherElement();

    const compactEl = document.getElementById("compactWeather");
    if (!compactEl) return;

    const weather = this.currentWeather;
    if (!weather) {
      compactEl.classList.remove("active");
      return;
    }

    const mode = settings.compactWeatherMode || "simple";
    const showLocationName = settings.compactWeatherShowLocationName === true;
    const locationName =
      typeof weather.location === "string" ? weather.location.trim() : "";
    const weatherInfo = this.weatherCodes[weather.weatherCode] || {
      icon: "🌡️",
      desc: "Unknown",
    };
    const unitSymbol = weather.unit === "fahrenheit" ? "°F" : "°C";
    const windUnitLabel = weather.unit === "fahrenheit" ? "mph" : "km/h";

    // Update compact weather content
    const iconEl = compactEl.querySelector(".compact-weather-icon");
    const tempEl = compactEl.querySelector(".compact-weather-temp");
    const feelsEl = compactEl.querySelector(".compact-weather-feels");
    const humidityEl = compactEl.querySelector(".compact-weather-humidity");
    const windEl = compactEl.querySelector(".compact-weather-wind");
    const locationEl = compactEl.querySelector(".compact-weather-location");

    if (iconEl)
      iconEl.innerHTML = this._getIcon(weatherInfo.icon, { size: 24 });
    if (tempEl) {
      tempEl.textContent =
        weather.temperature === null
          ? `--${unitSymbol}`
          : `${weather.temperature}${unitSymbol}`;
    }

    // Detailed mode shows extra info
    if (feelsEl) {
      feelsEl.textContent =
        weather.feelsLike === null
          ? `Feels --${unitSymbol}`
          : `Feels ${weather.feelsLike}${unitSymbol}`;
    }
    if (humidityEl) {
      humidityEl.textContent =
        weather.humidity === null
          ? `Humidity --%`
          : `Humidity ${weather.humidity}%`;
    }
    if (windEl) {
      windEl.textContent =
        weather.windSpeed === null
          ? `Wind -- ${windUnitLabel}`
          : `Wind ${weather.windSpeed} ${windUnitLabel}`;
    }
    if (locationEl) {
      locationEl.textContent = locationName;
      locationEl.removeAttribute("title");
    }

    // Apply mode class
    compactEl.classList.remove(
      "compact-weather-simple",
      "compact-weather-detailed",
    );
    compactEl.classList.add(`compact-weather-${mode}`);
    compactEl.classList.toggle(
      "show-location",
      showLocationName && locationName.length > 0,
    );
    compactEl.classList.add("active");
  }

  hideCompactWeather() {
    const compactEl = document.getElementById("compactWeather");
    if (compactEl) {
      compactEl.classList.remove("active");
    }
  }

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

  updateMetricTabs() {
    if (!this.weatherChartTabs || !this.weatherChartTabs.length) return;
    const metric = this.selectedMetric || "temperature";
    this.weatherChartTabs.forEach((tab) => {
      const isActive = tab.getAttribute("data-metric") === metric;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  _hexToRgb(hexOrRgb) {
    if (!hexOrRgb) return null;
    const s = String(hexOrRgb).trim();

    // Accept rgb(...) or rgba(...)
    const rgbMatch = s.match(
      /^rgba?\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*[0-9.]+)?\s*\)$/i,
    );
    if (rgbMatch) {
      return {
        r: Math.round(Number(rgbMatch[1])),
        g: Math.round(Number(rgbMatch[2])),
        b: Math.round(Number(rgbMatch[3])),
      };
    }

    let hex = s.replace("#", "");
    if (hex.length === 3)
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    if (hex.length !== 6) return null;
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return { r, g, b };
  }

  _rgbToCss(rgb) {
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  }

  _rgbToHex(rgb) {
    if (!rgb) return "#000000";
    const toHex = (n) => {
      const v = Math.max(0, Math.min(255, Math.round(n)));
      const h = v.toString(16);
      return h.length === 1 ? "0" + h : h;
    };
    return "#" + toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b);
  }

  _interpolateHex(a, b, t) {
    const ra = this._hexToRgb(a);
    const rb = this._hexToRgb(b);
    if (!ra || !rb) return { r: 0, g: 0, b: 0 };
    const r = Math.round(ra.r + (rb.r - ra.r) * t);
    const g = Math.round(ra.g + (rb.g - ra.g) * t);
    const b2 = Math.round(ra.b + (rb.b - ra.b) * t);
    return { r, g, b: b2 };
  }

  _lightenHex(hex, factor) {
    const rgb = this._hexToRgb(hex);
    if (!rgb) return { r: 255, g: 255, b: 255 };
    const r = Math.round(rgb.r + (255 - rgb.r) * factor);
    const g = Math.round(rgb.g + (255 - rgb.g) * factor);
    const b = Math.round(rgb.b + (255 - rgb.b) * factor);
    return { r, g, b };
  }

  _colorForMetric(metric, value, min, max) {
    const v = Number.isFinite(value) ? value : null;
    if (v === null) return "#888888";

    let t = 0;
    if (Number.isFinite(min) && Number.isFinite(max) && max > min) {
      t = Math.max(0, Math.min(1, (v - min) / (max - min)));
    }

    // Define color endpoints for each metric
    switch (metric) {
      case "humidity": {
        const low = "#e6f6ff"; // very light blue
        const high = "#003f8a"; // deep blue
        const rgb = this._interpolateHex(low, high, t);
        return this._rgbToHex(rgb);
      }
      case "precipitation": {
        const low = "#ffffff";
        const high = "#bdbdbd";
        const rgb = this._interpolateHex(low, high, t);
        return this._rgbToHex(rgb);
      }
      case "wind": {
        const low = "#d7f6e6";
        const high = "#0b6b48";
        const rgb = this._interpolateHex(low, high, t);
        return this._rgbToHex(rgb);
      }
      case "temperature":
      default: {
        // blue -> red/orange
        const low = "#2b8cff";
        const high = "#ff3b30";
        const rgb = this._interpolateHex(low, high, t);
        return this._rgbToHex(rgb);
      }
    }
  }

  _ensureWeatherChartTooltip() {
    if (this.weatherChartTooltip) return this.weatherChartTooltip;
    if (!this.weatherChartWrap) return null;

    const tip = document.createElement("div");
    tip.className = "weather-chart-tooltip";
    tip.setAttribute("role", "tooltip");
    tip.setAttribute("aria-hidden", "true");
    this.weatherChartWrap.appendChild(tip);
    this.weatherChartTooltip = tip;
    return tip;
  }

  _handleChartMouseLeave() {
    this._chartHoverIndex = -1;
    this._hideWeatherChartTooltip();
  }

  _handleChartMouseMove(e) {
    if (!this.weatherChart || !this.weatherChartWrap) return;
    if (!this._chartBars || !this._chartLayout) return;

    const canvasRect = this.weatherChart.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;

    const idx = this._hitTestWeatherBarIndex(x, y);
    if (!Number.isFinite(idx) || idx < 0) {
      this._chartHoverIndex = -1;
      this._hideWeatherChartTooltip();
      return;
    }

    if (this._chartHoverIndex !== idx) {
      this._chartHoverIndex = idx;
    }

    this._showWeatherChartTooltip(idx);
  }

  _hitTestWeatherBarIndex(x, y) {
    const layout = this._chartLayout;
    if (!layout) return -1;
    if (x < layout.plotLeft || x > layout.plotLeft + layout.plotWidth)
      return -1;
    if (y < layout.plotTop || y > layout.plotBottom) return -1;

    const bars = this._chartBars;
    if (!Array.isArray(bars) || !bars.length) return -1;

    // Prefer direct hit on the bar's x-range; y is validated against plot area.
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      if (!b) continue;
      if (x >= b.x && x <= b.x + b.w) return i;
    }

    // Fallback: nearest by x center
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      if (!b) continue;
      const d = Math.abs(x - b.cx);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }

  _hideWeatherChartTooltip() {
    const tip = this._ensureWeatherChartTooltip();
    if (!tip) return;
    tip.classList.remove("active");
    tip.setAttribute("aria-hidden", "true");
  }

  _showWeatherChartTooltip(index) {
    const tip = this._ensureWeatherChartTooltip();
    if (!tip || !this.weatherChart || !this.weatherChartWrap) return;
    const bars = this._chartBars;
    const bar = Array.isArray(bars) ? bars[index] : null;
    if (!bar) {
      this._hideWeatherChartTooltip();
      return;
    }

    const wrapRect = this.weatherChartWrap.getBoundingClientRect();
    const canvasRect = this.weatherChart.getBoundingClientRect();

    const left = canvasRect.left - wrapRect.left + bar.cx;
    const top = canvasRect.top - wrapRect.top + bar.y;

    const label = bar.timeLabel ? `${bar.timeLabel}: ` : "";
    tip.textContent = `${label}${bar.valueLabel}`;

    // Position and clamp horizontally within the wrap
    const padding = 10;
    const maxLeft = wrapRect.width - padding;
    const clampedLeft = Math.max(padding, Math.min(maxLeft, left));

    tip.style.left = `${clampedLeft}px`;
    tip.style.top = `${top}px`;
    tip.classList.add("active");
    tip.setAttribute("aria-hidden", "false");
  }

  _startHourlyChartAnimation() {
    if (this._chartRaf) {
      cancelAnimationFrame(this._chartRaf);
      this._chartRaf = null;
    }

    if (
      this.isPerformanceModeEnabled() ||
      !this.isHighestVisualFidelityEnabled()
    ) {
      this._chartAnim = null;
      return;
    }

    this._chartAnim = {
      start: performance.now(),
      duration: 520,
      stagger: 16,
      metric: this.selectedMetric || "temperature",
    };
  }

  _applyWeatherIconAnimation(weatherCode) {
    if (!this.weatherIcon) return;
    const code = Number(weatherCode);
    const cls = this.weatherIcon.classList;
    ["weather-anim-sunny", "weather-anim-cloudy", "weather-anim-rainy"].forEach(
      (c) => cls.remove(c),
    );
    if (!Number.isFinite(code)) return;

    if (code === 0 || code === 1) {
      cls.add("weather-anim-sunny");
    } else if (code === 2 || code === 3 || code === 45 || code === 48) {
      cls.add("weather-anim-cloudy");
    } else if (code >= 71 && code <= 77) {
      cls.add("weather-anim-cloudy");
    } else {
      cls.add("weather-anim-rainy");
    }
  }

  _toNumber(value) {
    const n = typeof value === "string" ? Number.parseFloat(value) : value;
    return Number.isFinite(n) ? n : null;
  }

  _formatPlaceName(result) {
    if (!result) return "";
    const parts = [result.name, result.admin1, result.country].filter(Boolean);
    return parts.join(", ");
  }

  _extractCityLikeName(locationText) {
    const normalized = String(locationText || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!normalized) return "";

    const [firstPart] = normalized.split(",");
    const city = String(firstPart || "").trim();
    return city || normalized;
  }

  _getDashboardDisplayCity(settings = null) {
    const activeSettings = settings || this.storage.getSettings() || {};
    const useManualLocation = activeSettings.locationMethod === "manual";
    const locationTextEl = document.getElementById("locationText");
    const locationDisplayText = String(locationTextEl?.textContent || "")
      .replace(/\s+/g, " ")
      .trim();

    if (locationDisplayText) {
      const lowered = locationDisplayText.toLowerCase();
      const isTransientText =
        lowered.includes("detecting") ||
        lowered.includes("requesting permission") ||
        lowered.includes("loading");
      if (!isTransientText) {
        return this._extractCityLikeName(locationDisplayText);
      }
    }

    if (!useManualLocation) {
      const lastLocation = this.storage.getLastLocation();
      const lastCity = this._extractCityLikeName(lastLocation?.city || "");
      if (lastCity) {
        return lastCity;
      }
      return "";
    }

    return this._extractCityLikeName(activeSettings.city || "");
  }

  async _geocodeCity(city) {
    if (!city) return null;
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      city,
    )}&count=1&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const first = data?.results?.[0];
    if (!first) return null;
    return {
      latitude: first.latitude,
      longitude: first.longitude,
      city: this._extractCityLikeName(
        first.name || this._formatPlaceName(first),
      ),
    };
  }

  async _getBrowserLocation() {
    if (!navigator.geolocation) return null;

    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 10 * 60 * 1000,
        });
      });

      const latitude = this._toNumber(pos?.coords?.latitude);
      const longitude = this._toNumber(pos?.coords?.longitude);
      if (latitude === null || longitude === null) return null;

      const city = this._getDashboardDisplayCity(this.storage.getSettings());
      return { latitude, longitude, city };
    } catch {
      return null;
    }
  }

  async _resolveWeatherLocation(settings) {
    const mode = settings.weatherLocationMode || "dashboard";
    const useManualLocation = settings.locationMethod === "manual";

    if (mode === "custom") {
      const latitude = this._toNumber(settings.weatherLatitude);
      const longitude = this._toNumber(settings.weatherLongitude);
      const cityName = (settings.weatherCity || "").trim();
      if (latitude !== null && longitude !== null) {
        const city = cityName || this._getDashboardDisplayCity(settings);
        return { latitude, longitude, city: city || "" };
      }

      if (cityName) {
        const geo = await this._geocodeCity(cityName);
        if (geo) return geo;
      }
    }

    // dashboard location
    if (useManualLocation) {
      const latitude = this._toNumber(settings.latitude);
      const longitude = this._toNumber(settings.longitude);
      const city =
        this._extractCityLikeName(settings.city || "") ||
        this._getDashboardDisplayCity(settings);

      if (latitude !== null && longitude !== null) {
        return { latitude, longitude, city };
      }
    }

    const lastLocation = this.storage.getLastLocation();
    const lastLatitude = this._toNumber(lastLocation?.latitude);
    const lastLongitude = this._toNumber(lastLocation?.longitude);
    if (lastLatitude !== null && lastLongitude !== null) {
      const city =
        this._getDashboardDisplayCity(settings) ||
        this._extractCityLikeName(lastLocation?.city || "");
      return {
        latitude: lastLatitude,
        longitude: lastLongitude,
        city,
      };
    }

    return await this._getBrowserLocation();
  }

  async fetchWeather(opts = {}) {
    try {
      if (!this.weatherCard) return;

      const { force = false } = opts;

      const settings = this.storage.getSettings();
      const unit = settings.weatherUnit || "celsius";

      const location = await this._resolveWeatherLocation(settings);
      if (!location) {
        throw new Error("No location available");
      }

      const tempUnit = unit === "fahrenheit" ? "fahrenheit" : "celsius";
      const windUnit = unit === "fahrenheit" ? "mph" : "kmh";

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&forecast_days=7&timezone=auto&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}`;

      const todayKey = this._getLocalDateKey(Date.now());
      const cached = this._getWeatherForecastCache();
      const hasUsableCachedData =
        cached &&
        cached.url === url &&
        this._isUsableWeatherPayload(cached.data);
      const cacheHit =
        !force &&
        hasUsableCachedData &&
        cached.dateKey === todayKey &&
        cached.data;

      let data;
      let usedCache = false;

      if (cacheHit) {
        data = cached.data;
        usedCache = true;
      } else {
        // Fetch with retry logic for network errors (common in Chrome extensions)
        let response;
        let lastError;
        const maxRetries = 3;
        const retryDelay = 1000; // 1 second

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            response = await fetch(url);
            break; // Success, exit retry loop
          } catch (networkError) {
            lastError = networkError;
            console.warn(
              `Weather fetch attempt ${attempt}/${maxRetries} failed:`,
              networkError?.message || networkError,
            );
            if (attempt < maxRetries) {
              // Wait before retrying
              await new Promise((resolve) =>
                setTimeout(resolve, retryDelay * attempt),
              );
            }
          }
        }

        // If all retries failed, try to fall back to cached payload (even if stale).
        if (!response) {
          if (hasUsableCachedData) {
            data = cached.data;
            usedCache = true;
          } else {
            const errorMsg =
              lastError?.message === "Failed to fetch"
                ? "Network error - check your internet connection"
                : lastError?.message || "Unable to connect to weather service";
            throw new Error(errorMsg);
          }
        }

        if (!usedCache) {
          if (!response.ok) {
            const text = await response.text().catch(() => "");
            console.error(
              "Weather API response not OK:",
              response.status,
              text.substr ? text.substr(0, 200) : text,
            );
            throw new Error(
              `Weather API request failed (status ${response.status})`,
            );
          }

          try {
            data = await response.json();
          } catch (e) {
            const txt = await response.text().catch(() => "");
            console.error(
              "Weather API JSON parse error:",
              e,
              txt.substr ? txt.substr(0, 500) : txt,
            );
            throw new Error("Weather API returned invalid JSON");
          }

          try {
            this._validateWeatherPayload(data);
          } catch (validationError) {
            console.error(
              "Weather API payload validation failed:",
              validationError?.message || validationError,
            );
            if (hasUsableCachedData) {
              data = cached.data;
              usedCache = true;
            } else {
              throw validationError;
            }
          }

          // Persist only when we successfully fetched fresh valid data.
          if (!usedCache) {
            this._setWeatherForecastCache({
              url,
              dateKey: todayKey,
              data,
              savedAt: Date.now(),
            });
          }
        }
      }

      this._validateWeatherPayload(data);

      const current = data.current || data.current_weather || {};

      const displayLocationName =
        this._getDashboardDisplayCity(settings) ||
        this._extractCityLikeName(location.city) ||
        `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`;

      // Try to derive reasonable current values when API uses different field names
      const hourly = data.hourly || {};
      const pickNearestHourly = (arr) => {
        if (
          !Array.isArray(arr) ||
          !arr.length ||
          !Array.isArray(hourly.time) ||
          !hourly.time.length
        )
          return null;
        const now = new Date();
        for (let i = 0; i < hourly.time.length; i++) {
          const t = new Date(hourly.time[i]);
          if (t >= now)
            return Number.isFinite(Number(arr[i])) ? Number(arr[i]) : null;
        }
        const last = arr[arr.length - 1];
        return Number.isFinite(Number(last)) ? Number(last) : null;
      };

      const temps = hourly.temperature_2m || hourly.temperature || null;
      const hums = hourly.relative_humidity_2m || null;
      const prec = hourly.precipitation || null;
      const winds = hourly.wind_speed_10m || hourly.windspeed || null;

      const derivedTemp = Number.isFinite(current.temperature_2m)
        ? current.temperature_2m
        : Number.isFinite(current.temperature)
          ? current.temperature
          : pickNearestHourly(temps);

      const derivedFeels = Number.isFinite(current.apparent_temperature)
        ? current.apparent_temperature
        : null;

      const derivedHum = Number.isFinite(current.relative_humidity_2m)
        ? current.relative_humidity_2m
        : pickNearestHourly(hums);

      const derivedWind = Number.isFinite(current.wind_speed_10m)
        ? current.wind_speed_10m
        : Number.isFinite(current.windspeed)
          ? current.windspeed
          : pickNearestHourly(winds);

      const derivedWeatherCode =
        current.weather_code ?? current.weathercode ?? null;

      this.currentWeather = {
        temperature: Number.isFinite(derivedTemp)
          ? Math.round(derivedTemp)
          : null,
        feelsLike: Number.isFinite(derivedFeels)
          ? Math.round(derivedFeels)
          : null,
        humidity: Number.isFinite(derivedHum) ? Math.round(derivedHum) : null,
        windSpeed: Number.isFinite(derivedWind)
          ? Math.round(derivedWind)
          : null,
        weatherCode: derivedWeatherCode,
        unit: unit,
        windUnit: windUnit,
        location: displayLocationName,
      };

      this.dailyForecast = data.daily || null;
      this.hourlyForecast = data.hourly || null;
      this.lastFetch = Date.now();

      // keep selection in-range
      const dayCount = this.dailyForecast?.time?.length || 0;
      if (dayCount > 0) {
        this.selectedForecastIndex = Math.max(
          0,
          Math.min(this.selectedForecastIndex, dayCount - 1),
        );
      } else {
        this.selectedForecastIndex = 0;
      }

      this.updateDisplay();
    } catch (error) {
      console.error("Weather fetch error:", error);
      this.showError(error?.message || String(error));
    }
  }

  showError(message) {
    if (this.weatherIcon) {
      this.weatherIcon.innerHTML = this._getIcon("⚠️", { size: 48 });
    }
    if (this.weatherTemp) {
      this.weatherTemp.textContent = "--";
    }
    if (this.weatherDesc) {
      const suffix = message ? `: ${String(message).slice(0, 120)}` : "";
      this.weatherDesc.textContent = `Unable to load weather${suffix}`;
    }
    this.setWeatherLocationText("");

    if (this.weatherForecast) {
      this.weatherForecast.innerHTML = "";
    }
    if (this.weatherChartLegend) {
      this.weatherChartLegend.textContent = "";
    }
    if (this.weatherChart) {
      const ctx = this.weatherChart.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, this.weatherChart.width, this.weatherChart.height);
      }
    }
  }

  showLoadingState() {
    if (this.weatherIcon) {
      this.weatherIcon.innerHTML = this._getIcon("🌡️", { size: 48 });
    }
    if (this.weatherTemp) {
      this.weatherTemp.textContent = "--°";
    }
    if (this.weatherDesc) {
      this.weatherDesc.textContent = "Loading weather...";
    }
    this.setWeatherLocationText("Detecting location...");
    if (this.weatherFeelsLike) {
      this.weatherFeelsLike.textContent = "Feels like --°";
    }
    if (this.weatherHumidity) {
      this.weatherHumidity.textContent = "Humidity --%";
    }
    if (this.weatherWind) {
      this.weatherWind.textContent = "Wind --";
    }
    if (this.weatherForecast) {
      this.weatherForecast.innerHTML =
        '<div class="weather-loading-placeholder">Loading forecast...</div>';
    }
  }

  showErrorState() {
    this.showError("Failed to load weather data");
  }

  updateUnit(unit) {
    const settings = this.storage.getSettings();
    settings.weatherUnit = unit;
    this.storage.saveSettings(settings);
    this.fetchWeather({ force: true });
  }

  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    if (this._resizeTimer) {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = null;
    }

    if (this._forecastResizeTimer) {
      clearTimeout(this._forecastResizeTimer);
      this._forecastResizeTimer = null;
    }

    if (this._weatherCardResizeTimer) {
      clearTimeout(this._weatherCardResizeTimer);
      this._weatherCardResizeTimer = null;
    }

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

    if (this._responsiveSyncFrameRaf) {
      cancelAnimationFrame(this._responsiveSyncFrameRaf);
      this._responsiveSyncFrameRaf = null;
    }
    this._responsiveSyncFrameIncludeChart = false;

    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("resize", this._onForecastResize);

    this._weatherLayoutSyncEvents.forEach((eventName) => {
      document.removeEventListener(eventName, this._externalLayoutSyncHandler);
    });

    if (this._weatherResizeObserver) {
      this._weatherResizeObserver.disconnect();
      this._weatherResizeObserver = null;
    }

    if (this._weatherContentResizeObserver) {
      this._weatherContentResizeObserver.disconnect();
      this._weatherContentResizeObserver = null;
    }

    if (this._weatherMainContainerResizeObserver) {
      this._weatherMainContainerResizeObserver.disconnect();
      this._weatherMainContainerResizeObserver = null;
    }

    if (this._weatherCardMutationObserver) {
      this._weatherCardMutationObserver.disconnect();
      this._weatherCardMutationObserver = null;
    }

    if (this._chartVisibilityObserver) {
      this._chartVisibilityObserver.disconnect();
      this._chartVisibilityObserver = null;
    }
  }

  updateDisplay() {
    if (!this.currentWeather) return;

    const weather = this.currentWeather;
    const weatherInfo = this.weatherCodes[weather.weatherCode] || {
      icon: "🌡️",
      desc: "Unknown",
    };
    const unitSymbol = weather.unit === "fahrenheit" ? "°F" : "°C";
    const windUnitLabel = weather.unit === "fahrenheit" ? "mph" : "km/h";

    if (this.weatherIcon) {
      this.weatherIcon.innerHTML = this._getIcon(weatherInfo.icon, {
        size: 48,
      });
      this._applyWeatherIconAnimation(weather.weatherCode);
    }

    if (this.weatherTemp) {
      this.weatherTemp.textContent =
        weather.temperature === null
          ? `--${unitSymbol}`
          : `${weather.temperature}${unitSymbol}`;
    }

    if (this.weatherDesc) {
      this.weatherDesc.textContent = weatherInfo.desc;
    }

    this.setWeatherLocationText(weather.location);

    if (this.weatherFeelsLike) {
      this.weatherFeelsLike.textContent =
        weather.feelsLike === null
          ? `Feels like --${unitSymbol}`
          : `Feels like ${weather.feelsLike}${unitSymbol}`;
    }

    if (this.weatherHumidity) {
      this.weatherHumidity.textContent =
        weather.humidity === null ? `--%` : `${weather.humidity}%`;
    }

    if (this.weatherWind) {
      this.weatherWind.textContent =
        weather.windSpeed === null
          ? `-- ${windUnitLabel}`
          : `${weather.windSpeed} ${windUnitLabel}`;
    }

    // Update compact weather as well
    this.updateCompactWeather();

    this.syncWeatherResponsiveLayout();

    this.render7DayForecast();
    this.updateMetricTabs();
    this.renderHourlyChart();
  }

  setWeatherLocationText(locationText) {
    if (!this.weatherLocation) return;

    const displayText = String(locationText || "").trim();
    this.weatherLocation.textContent = displayText;
    this.weatherLocation.removeAttribute("data-full-location");
    this.weatherLocation.removeAttribute("aria-label");
    this.weatherLocation.removeAttribute("title");
    this.weatherLocation.removeAttribute("tabindex");

    this.updateWeatherLocationTruncation();
  }

  measureWeatherCardElementWidth() {
    if (!this.weatherCard) return 0;

    const readUsableContentWidth = (el) => {
      if (!el) return 0;

      const style = window.getComputedStyle(el);
      const paddingLeft = parseFloat(style.paddingLeft) || 0;
      const paddingRight = parseFloat(style.paddingRight) || 0;
      const borderLeft = parseFloat(style.borderLeftWidth) || 0;
      const borderRight = parseFloat(style.borderRightWidth) || 0;

      // Prefer clientWidth because it is stable under root zoom.
      const clientWidth = Number(el.clientWidth) || 0;
      if (Number.isFinite(clientWidth) && clientWidth > 0) {
        return Math.max(
          0,
          Math.round(clientWidth - paddingLeft - paddingRight),
        );
      }

      const rectWidth = Number(el.getBoundingClientRect().width) || 0;
      if (!Number.isFinite(rectWidth) || rectWidth <= 0) {
        return 0;
      }

      const usableWidth =
        rectWidth - paddingLeft - paddingRight - borderLeft - borderRight;

      return Math.max(0, Math.round(usableWidth));
    };

    // Use weather card content-box width as the authoritative responsive width.
    const weatherCardWidth = readUsableContentWidth(this.weatherCard);
    if (Number.isFinite(weatherCardWidth) && weatherCardWidth > 0) {
      return weatherCardWidth;
    }

    const weatherContentWidth = readUsableContentWidth(this.weatherContent);
    if (Number.isFinite(weatherContentWidth) && weatherContentWidth > 0) {
      return weatherContentWidth;
    }

    const fallbackClientWidth = Number(this.weatherCard.clientWidth) || 0;
    if (Number.isFinite(fallbackClientWidth) && fallbackClientWidth > 0) {
      const cardStyle = window.getComputedStyle(this.weatherCard);
      const paddingLeft = parseFloat(cardStyle.paddingLeft) || 0;
      const paddingRight = parseFloat(cardStyle.paddingRight) || 0;
      return Math.max(
        0,
        Math.round(fallbackClientWidth - paddingLeft - paddingRight),
      );
    }

    return 0;
  }

  getWeatherResponsiveWidth() {
    const measuredWidth = this.measureWeatherCardElementWidth();
    if (measuredWidth > 0) {
      this._weatherCardContentWidth = measuredWidth;
      return measuredWidth;
    }

    const observedWidth = Math.round(
      Number(this._weatherCardContentWidth) || 0,
    );
    if (Number.isFinite(observedWidth) && observedWidth > 0) {
      return observedWidth;
    }

    return 0;
  }

  isWeatherDetailsWrapping() {
    const weatherDetails =
      this.weatherDetails ||
      this.weatherCard?.querySelector(".weather-details") ||
      null;
    if (!weatherDetails) return false;
    if (weatherDetails.clientWidth <= 0) return false;

    const detailItems = Array.from(
      weatherDetails.querySelectorAll(".weather-detail-item"),
    );
    const detailValues = Array.from(
      weatherDetails.querySelectorAll(".weather-detail-value"),
    );

    const detailsComputed = window.getComputedStyle(weatherDetails);
    const detailsDirection = String(detailsComputed.flexDirection || "row");
    const usesColumnFlow = detailsDirection.includes("column");

    let wrappedToSecondRow = false;
    if (!usesColumnFlow && detailItems.length > 1) {
      const firstTop = Math.round(detailItems[0].getBoundingClientRect().top);
      wrappedToSecondRow = detailItems.some(
        (item, index) =>
          index > 0 &&
          Math.abs(Math.round(item.getBoundingClientRect().top) - firstTop) > 1,
      );
    }

    const valueTextWrapped = usesColumnFlow
      ? false
      : detailValues.some((valueEl) => {
          const rects = valueEl.getClientRects();
          return rects && rects.length > 1;
        });

    const detailsOverflowingHorizontally =
      weatherDetails.scrollWidth > weatherDetails.clientWidth + 1;

    return (
      wrappedToSecondRow || valueTextWrapped || detailsOverflowingHorizontally
    );
  }

  syncWeatherResponsiveLayout() {
    if (!this.weatherCard) return;

    const weatherStackBreakpoint = 1134;
    const weatherSingleColumnDetailsBreakpoint = 980;

    const responsiveWidth = this.getWeatherResponsiveWidth();
    if (!Number.isFinite(responsiveWidth) || responsiveWidth <= 0) {
      return;
    }

    // Keep transitions deterministic: only width drives wide/stacked.
    let layoutMode = "wide";
    if (responsiveWidth <= weatherStackBreakpoint) {
      layoutMode = "stacked";
    }

    this.weatherCard.setAttribute("data-weather-layout", layoutMode);

    const detailsLayoutMode =
      layoutMode === "stacked" ||
      responsiveWidth <= weatherSingleColumnDetailsBreakpoint
        ? "single-column"
        : "inline";

    this.weatherCard.setAttribute(
      "data-weather-details-layout",
      detailsLayoutMode,
    );
  }

  updateWeatherLocationTruncation() {
    if (!this.weatherLocation) return;

    this.weatherLocation.classList.remove(
      "weather-location-single-word",
      "weather-location-single-word-tight",
    );
    this.weatherLocation.style.removeProperty(
      "--weather-location-single-word-scale",
    );

    const displayText = String(this.weatherLocation.textContent || "").trim();
    if (!displayText) {
      this.weatherLocation.classList.remove("is-truncated");
      this.weatherLocation.removeAttribute("title");
      return;
    }

    const responsiveWidth = this.getWeatherResponsiveWidth();
    const isSingleWord = !/\s/.test(displayText);
    const isNarrowLayout = responsiveWidth > 0 && responsiveWidth <= 1000;

    let appliedSingleWordShrink = false;
    if (isSingleWord && isNarrowLayout) {
      this.weatherLocation.classList.add("weather-location-single-word");

      const clientWidth = Math.max(
        1,
        Math.round(this.weatherLocation.clientWidth),
      );
      const scrollWidth = Math.max(
        1,
        Math.round(this.weatherLocation.scrollWidth),
      );

      if (scrollWidth > clientWidth + 1) {
        const shrinkScale = Math.max(
          0.5,
          Math.min(1, clientWidth / scrollWidth),
        );

        this.weatherLocation.style.setProperty(
          "--weather-location-single-word-scale",
          shrinkScale.toFixed(4),
        );
        this.weatherLocation.classList.add(
          "weather-location-single-word-tight",
        );
        appliedSingleWordShrink = true;
      }
    }

    const maxLocationCharsBeforeTruncate = 64;
    const isTruncated =
      !appliedSingleWordShrink &&
      displayText.length > maxLocationCharsBeforeTruncate;
    this.weatherLocation.classList.toggle("is-truncated", isTruncated);

    this.weatherLocation.removeAttribute("title");
    this.weatherLocation.removeAttribute("tabindex");
  }
});

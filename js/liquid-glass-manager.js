/**
 * Liquid Glass Manager
 * Adapts the shuding/liquid-glass displacement shader math for dashboard-wide
 * backdrop-filter surfaces while preserving existing blur/opacity sliders.
 */
class LiquidGlassManager {
  static MAP_WIDTH = 300;
  static MAP_HEIGHT = 200;
  static DISABLED_FILTER_VALUE = "var(--liquid-glass-filter-empty, )";

  constructor(storage, themes) {
    this.storage = storage;
    this.themes = themes;

    this.filterId = "md-liquid-glass-filter";
    this.svgId = "md-liquid-glass-svg";

    this.svg = null;
    this.feImage = null;
    this.feDisplacementMap = null;
    this.canvas = null;
    this.context = null;

    this._rafId = null;
    this._boundSync = () => this.scheduleSync();
    this._boundResize = () => this.scheduleSync();
    this._initialized = false;

    this._lastEnabled = null;
    this._lastBlurPower = null;
  }

  init() {
    if (this._initialized) return;
    this._initialized = true;

    this.bindEvents();
    this.sync({ forceMap: true });
  }

  destroy() {
    if (!this._initialized) return;
    this._initialized = false;

    this.unbindEvents();

    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    this.applyDisabledVars();

    if (this.svg) {
      this.svg.remove();
      this.svg = null;
    }

    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
      this.context = null;
    }

    this.feImage = null;
    this.feDisplacementMap = null;
  }

  bindEvents() {
    document.addEventListener("md:glass-setting-changed", this._boundSync);
    document.addEventListener(
      "md:liquid-glass-setting-changed",
      this._boundSync,
    );
    document.addEventListener("md:ui-blur-update", this._boundSync);
    document.addEventListener("md:theme-change", this._boundSync);
    document.addEventListener("md:performance-mode-change", this._boundSync);
    document.addEventListener("md:card-blur-update", this._boundSync);
    window.addEventListener("resize", this._boundResize);
  }

  unbindEvents() {
    document.removeEventListener("md:glass-setting-changed", this._boundSync);
    document.removeEventListener(
      "md:liquid-glass-setting-changed",
      this._boundSync,
    );
    document.removeEventListener("md:ui-blur-update", this._boundSync);
    document.removeEventListener("md:theme-change", this._boundSync);
    document.removeEventListener("md:performance-mode-change", this._boundSync);
    document.removeEventListener("md:card-blur-update", this._boundSync);
    window.removeEventListener("resize", this._boundResize);
  }

  scheduleSync() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
    }

    this._rafId = requestAnimationFrame(() => {
      this._rafId = null;
      this.sync();
    });
  }

  sync({ forceMap = false } = {}) {
    const settings = this.getSettings();
    const blurPower = this.getBlurPower(settings);
    const enabled = this.getEffectiveEnabled(settings);

    if (!enabled) {
      this.applyDisabledVars();
      this._lastEnabled = false;
      this._lastBlurPower = blurPower;
      return;
    }

    this.ensureFilterDom();

    if (
      forceMap ||
      this._lastEnabled !== true ||
      this._lastBlurPower !== blurPower
    ) {
      this.updateDisplacementMap(blurPower);
    }

    const blurMultiplier = Math.min(2, Math.max(0, blurPower / 100));
    const microBlurPx = (0.25 * blurMultiplier).toFixed(3);
    const filterChain = `url(#${this.filterId}) blur(${microBlurPx}px) contrast(1.2) brightness(1.05) saturate(1.1)`;

    const root = document.documentElement;
    root.style.setProperty("--liquid-glass-filter", filterChain);
    root.style.setProperty("--liquid-glass-enabled", "1");
    root.dataset.liquidGlassEnabled = "true";

    this._lastEnabled = true;
    this._lastBlurPower = blurPower;
  }

  getSettings() {
    try {
      return this.storage?.getSettings?.() || {};
    } catch (e) {
      return {};
    }
  }

  getBlurPower(settings) {
    const numeric = Number(settings?.uiBlurPower);
    if (!Number.isFinite(numeric)) return 100;
    return Math.min(200, Math.max(0, Math.round(numeric)));
  }

  getEffectiveEnabled(settings) {
    const root = document.documentElement;
    const glassEnabled = this.themes?.isGlassEnabled?.() !== false;
    const liquidEnabled = this.themes?.isLiquidGlassEnabled?.() === true;
    const performanceModeEnabled =
      settings?.performanceModeEnabled === true ||
      root?.dataset?.performanceMode === "true";

    if (!this.supportsBackdropFilter()) {
      return false;
    }

    return glassEnabled && liquidEnabled && !performanceModeEnabled;
  }

  supportsBackdropFilter() {
    try {
      if (typeof CSS === "undefined" || typeof CSS.supports !== "function") {
        return false;
      }

      return (
        CSS.supports("backdrop-filter", "blur(1px)") ||
        CSS.supports("-webkit-backdrop-filter", "blur(1px)")
      );
    } catch (e) {
      return false;
    }
  }

  applyDisabledVars() {
    const root = document.documentElement;
    root.style.setProperty(
      "--liquid-glass-filter",
      LiquidGlassManager.DISABLED_FILTER_VALUE,
    );
    root.style.setProperty("--liquid-glass-enabled", "0");
    root.dataset.liquidGlassEnabled = "false";
  }

  ensureFilterDom() {
    if (this.svg && this.feImage && this.feDisplacementMap && this.context) {
      return;
    }

    if (!this.svg) {
      const existingSvg = document.getElementById(this.svgId);
      if (existingSvg) {
        existingSvg.remove();
      }

      this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this.svg.setAttribute("id", this.svgId);
      this.svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      this.svg.setAttribute("width", "0");
      this.svg.setAttribute("height", "0");
      this.svg.style.cssText =
        "position: fixed; top: 0; left: 0; pointer-events: none; z-index: -1;";

      const defs = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "defs",
      );
      const filter = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "filter",
      );

      filter.setAttribute("id", this.filterId);
      filter.setAttribute("filterUnits", "objectBoundingBox");
      filter.setAttribute("x", "0%");
      filter.setAttribute("y", "0%");
      filter.setAttribute("width", "100%");
      filter.setAttribute("height", "100%");
      filter.setAttribute("colorInterpolationFilters", "sRGB");

      this.feImage = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "feImage",
      );
      this.feImage.setAttribute("id", `${this.filterId}-map`);
      this.feImage.setAttribute("width", "100%");
      this.feImage.setAttribute("height", "100%");
      this.feImage.setAttribute("preserveAspectRatio", "none");

      this.feDisplacementMap = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "feDisplacementMap",
      );
      this.feDisplacementMap.setAttribute("in", "SourceGraphic");
      this.feDisplacementMap.setAttribute("in2", `${this.filterId}-map`);
      this.feDisplacementMap.setAttribute("xChannelSelector", "R");
      this.feDisplacementMap.setAttribute("yChannelSelector", "G");
      this.feDisplacementMap.setAttribute("scale", "0");

      filter.appendChild(this.feImage);
      filter.appendChild(this.feDisplacementMap);
      defs.appendChild(filter);
      this.svg.appendChild(defs);
      document.body.appendChild(this.svg);
    }

    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.width = LiquidGlassManager.MAP_WIDTH;
      this.canvas.height = LiquidGlassManager.MAP_HEIGHT;
      this.canvas.style.display = "none";
      this.context = this.canvas.getContext("2d");
      document.body.appendChild(this.canvas);
    }
  }

  updateDisplacementMap(blurPower) {
    if (!this.context || !this.feImage || !this.feDisplacementMap) return;

    const w = LiquidGlassManager.MAP_WIDTH;
    const h = LiquidGlassManager.MAP_HEIGHT;
    const data = new Uint8ClampedArray(w * h * 4);

    const distortionGain = Math.min(2, Math.max(0, blurPower / 100));

    if (distortionGain <= 0) {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 128;
        data[i + 1] = 128;
        data[i + 2] = 0;
        data[i + 3] = 255;
      }

      this.context.putImageData(new ImageData(data, w, h), 0, 0);
      this.feImage.setAttribute("href", this.canvas.toDataURL());
      this.feImage.setAttributeNS(
        "http://www.w3.org/1999/xlink",
        "href",
        this.canvas.toDataURL(),
      );
      this.feDisplacementMap.setAttribute("scale", "0");
      return;
    }

    let maxScale = 0;
    const rawValues = [];

    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % w;
      const y = Math.floor(i / 4 / w);
      const uv = { x: x / w, y: y / h };
      const mapped = this.defaultLiquidFragment(uv);

      const dx = (mapped.x * w - x) * distortionGain;
      const dy = (mapped.y * h - y) * distortionGain;

      maxScale = Math.max(maxScale, Math.abs(dx), Math.abs(dy));
      rawValues.push(dx, dy);
    }

    maxScale *= 0.5;

    if (maxScale <= 1e-6) {
      maxScale = 1;
    }

    let index = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = rawValues[index++] / maxScale + 0.5;
      const g = rawValues[index++] / maxScale + 0.5;

      data[i] = Math.round(Math.max(0, Math.min(1, r)) * 255);
      data[i + 1] = Math.round(Math.max(0, Math.min(1, g)) * 255);
      data[i + 2] = 0;
      data[i + 3] = 255;
    }

    this.context.putImageData(new ImageData(data, w, h), 0, 0);

    const dataUrl = this.canvas.toDataURL();
    this.feImage.setAttribute("href", dataUrl);
    this.feImage.setAttributeNS(
      "http://www.w3.org/1999/xlink",
      "href",
      dataUrl,
    );
    this.feDisplacementMap.setAttribute("scale", maxScale.toString());
  }

  defaultLiquidFragment(uv) {
    // Ground-truth formula from shuding/liquid-glass default fragment.
    const ix = uv.x - 0.5;
    const iy = uv.y - 0.5;
    const distanceToEdge = this.roundedRectSdf(ix, iy, 0.3, 0.2, 0.6);
    const displacement = this.smoothStep(0.8, 0, distanceToEdge - 0.15);
    const scaled = this.smoothStep(0, 1, displacement);

    return {
      x: ix * scaled + 0.5,
      y: iy * scaled + 0.5,
    };
  }

  smoothStep(a, b, t) {
    const normalized = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return normalized * normalized * (3 - 2 * normalized);
  }

  length(x, y) {
    return Math.sqrt(x * x + y * y);
  }

  roundedRectSdf(x, y, width, height, radius) {
    const qx = Math.abs(x) - width + radius;
    const qy = Math.abs(y) - height + radius;

    return (
      Math.min(Math.max(qx, qy), 0) +
      this.length(Math.max(qx, 0), Math.max(qy, 0)) -
      radius
    );
  }
}

window.LiquidGlassManager = LiquidGlassManager;

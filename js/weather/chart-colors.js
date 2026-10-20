/**
 * WeatherManager: metric tabs and chart colour scale.
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
});

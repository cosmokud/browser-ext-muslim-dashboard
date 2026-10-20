/**
 * WeatherManager: hourly chart tooltip and animation.
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
});

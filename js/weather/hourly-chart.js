/**
 * WeatherManager: hourly chart rendering.
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

  renderHourlyChart() {
    if (!this.weatherChart || !this.hourlyForecast) return;
    if (this._chartInViewport === false) return;

    const hourly = this.hourlyForecast;
    if (!Array.isArray(hourly.time) || hourly.time.length < 2) return;

    // Prefer selected day (from the 7-day forecast) if possible
    const selectedDate = this.dailyForecast?.time?.[this.selectedForecastIndex];
    let indices = [];
    if (typeof selectedDate === "string" && selectedDate.length >= 10) {
      indices = hourly.time
        .map((t, i) =>
          typeof t === "string" && t.startsWith(selectedDate) ? i : -1,
        )
        .filter((i) => i >= 0);
    }

    let from = 0;
    let to = 0;
    if (indices.length >= 2) {
      from = indices[0];
      // Most days are 24 points; handle DST by just taking up to 24 from that day.
      to = Math.min(from + 24, hourly.time.length);
    } else {
      const now = new Date();
      const startIndex = hourly.time.findIndex((t) => new Date(t) >= now);
      from = startIndex >= 0 ? startIndex : 0;
      to = Math.min(from + 24, hourly.time.length);
    }

    const times = hourly.time.slice(from, to).map((t) => new Date(t));
    const temps = (hourly.temperature_2m || []).slice(from, to);
    const humidity = (hourly.relative_humidity_2m || []).slice(from, to);
    const precip = (hourly.precipitation || []).slice(from, to);
    const wind = (hourly.wind_speed_10m || []).slice(from, to);

    const settings = this.storage.getSettings();
    const unitSymbol =
      (settings.weatherUnit || "celsius") === "fahrenheit" ? "°F" : "°C";
    const windUnitLabel =
      (settings.weatherUnit || "celsius") === "fahrenheit" ? "mph" : "km/h";

    const metric = this.selectedMetric || "temperature";
    let values = temps;
    let metricLabel = `Temperature (${unitSymbol})`;
    let metricUnit = unitSymbol;

    if (metric === "humidity") {
      values = humidity;
      metricLabel = "Humidity (%)";
      metricUnit = "%";
    } else if (metric === "precipitation") {
      values = precip;
      metricLabel = "Precipitation (mm)";
      metricUnit = "mm";
    } else if (metric === "wind") {
      values = wind;
      metricLabel = `Wind (${windUnitLabel})`;
      metricUnit = windUnitLabel;
    }

    if (this.weatherChartLegend) {
      const dayLabel = selectedDate
        ? new Date(selectedDate).toLocaleDateString(undefined, {
            weekday: "short",
          })
        : "";
      const prefix = dayLabel ? `${dayLabel} • ` : "";
      this.weatherChartLegend.textContent = `${prefix}${metricLabel}`;
    }

    const rootStyles = getComputedStyle(document.documentElement);
    const colorTemp =
      rootStyles.getPropertyValue("--weather-metric-temperature").trim() ||
      rootStyles.getPropertyValue("--accent-gold").trim() ||
      "#d4af37";
    const colorHum =
      rootStyles.getPropertyValue("--weather-metric-humidity").trim() ||
      rootStyles.getPropertyValue("--accent-blue").trim() ||
      "#0066cc";
    const colorPrecip =
      rootStyles.getPropertyValue("--weather-metric-precipitation").trim() ||
      rootStyles.getPropertyValue("--text-muted").trim() ||
      "rgba(255, 255, 255, 0.6)";
    const colorWind =
      rootStyles.getPropertyValue("--weather-metric-wind").trim() ||
      rootStyles.getPropertyValue("--primary-color").trim() ||
      "#1a5f4a";
    const colorMuted =
      rootStyles.getPropertyValue("--text-muted").trim() ||
      "rgba(255, 255, 255, 0.6)";
    const colorBorder =
      rootStyles.getPropertyValue("--glass-border").trim() ||
      "rgba(255, 255, 255, 0.2)";

    const canvas = this.weatherChart;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Cancel any in-flight frame; we'll schedule a fresh one if animation is still running.
    if (this._chartRaf) {
      cancelAnimationFrame(this._chartRaf);
      this._chartRaf = null;
    }

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth || 800;
    const cssHeight = canvas.clientHeight || 260;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = cssWidth;
    const height = cssHeight;
    ctx.clearRect(0, 0, width, height);

    const padding = { left: 54, right: 12, top: 12, bottom: 28 };
    const plotLeft = padding.left;
    const plotTop = padding.top;
    const plotBottom = height - padding.bottom;
    const plotHeight = plotBottom - plotTop;
    const plotWidth = width - padding.left - padding.right;
    const points = times.length;
    if (points < 2 || plotWidth <= 20 || plotHeight <= 20) return;

    const numericValues = (values || []).map((v) => Number(v));
    const finiteValues = numericValues.filter((v) => Number.isFinite(v));

    let min = 0;
    let max = finiteValues.length ? Math.max(...finiteValues) : 1;

    if (metric === "temperature") {
      min = finiteValues.length ? Math.min(...finiteValues) : 0;
      max = finiteValues.length ? Math.max(...finiteValues) : 1;
      if (min === max) {
        min -= 1;
        max += 1;
      }
    } else if (metric === "humidity") {
      min = 0;
      max = 100;
    } else {
      min = 0;
      max = max === 0 ? 1 : max;
    }

    const yFor = (v) => {
      const vv = Number.isFinite(v) ? v : min;
      const t = (vv - min) / (max - min);
      return plotBottom - 2 - t * (plotHeight - 10);
    };

    // axis frame
    ctx.strokeStyle = colorBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(plotLeft, plotTop, plotWidth, plotHeight);
    ctx.stroke();

    // horizontal grid lines
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = colorBorder;
    for (let i = 1; i <= 3; i++) {
      const y = plotTop + (plotHeight * i) / 4;
      ctx.beginPath();
      ctx.moveTo(plotLeft, y);
      ctx.lineTo(plotLeft + plotWidth, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // y labels (min/max)
    ctx.fillStyle = colorMuted;
    ctx.font = "12px Poppins, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(`${Math.round(max)}${metricUnit}`, plotLeft - 8, plotTop + 6);
    ctx.fillText(`${Math.round(min)}${metricUnit}`, plotLeft - 8, plotBottom);

    // bar color
    let barColor = colorTemp;
    if (metric === "humidity") barColor = colorHum;
    else if (metric === "precipitation") barColor = colorPrecip;
    else if (metric === "wind") barColor = colorWind;

    // bars
    const stepX = plotWidth / points;
    const barWidth = Math.max(2, Math.floor(stepX * 0.72));
    const baseY = yFor(min);

    // Cache layout + x hitboxes for tooltip
    this._chartLayout = {
      plotLeft,
      plotTop,
      plotBottom,
      plotWidth,
      plotHeight,
      stepX,
      barWidth,
      baseY,
      points,
    };

    const bars = new Array(points);

    const nowMs = performance.now();
    const anim = this._chartAnim;
    const performanceModeEnabled = this.isPerformanceModeEnabled();
    const highestVisualFidelityEnabled = this.isHighestVisualFidelityEnabled();
    const shouldAnimate =
      !performanceModeEnabled &&
      highestVisualFidelityEnabled &&
      !!anim &&
      anim.metric === metric &&
      nowMs - anim.start < anim.duration + points * anim.stagger + 60;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const scaleForIndex = (i) => {
      if (!shouldAnimate || !anim) return 1;
      const local = (nowMs - anim.start - i * anim.stagger) / anim.duration;
      const t = Math.max(0, Math.min(1, local));
      return easeOutCubic(t);
    };

    ctx.save();
    ctx.globalAlpha = 0.92;
    for (let i = 0; i < points; i++) {
      const x = plotLeft + i * stepX + stepX / 2;
      const y = yFor(numericValues[i]);
      const h = baseY - y;
      const heightPx = Math.max(0, h);
      const scale = scaleForIndex(i);
      const scaledH = heightPx * scale;
      const scaledY = baseY - scaledH;

      // compute a value-based color for this bar and use a subtle vertical gradient
      const baseColor = this._colorForMetric(
        metric,
        numericValues[i],
        min,
        max,
      );
      const topRgb = this._lightenHex(baseColor, 0.32);
      const topColor = this._rgbToCss(topRgb);
      const bottomColor = baseColor;
      const grad = ctx.createLinearGradient(0, scaledY, 0, scaledY + scaledH);
      grad.addColorStop(0, topColor);
      grad.addColorStop(1, bottomColor);
      ctx.fillStyle = grad;

      ctx.fillRect(x - barWidth / 2, scaledY, barWidth, scaledH);

      const value = numericValues[i];
      const valueLabel = Number.isFinite(value)
        ? `${Math.round(value * 10) / 10}${metricUnit}`
        : `--${metricUnit}`;
      const timeLabel = times[i]?.toLocaleTimeString(undefined, {
        hour: "numeric",
      });

      bars[i] = {
        x: x - barWidth / 2,
        w: barWidth,
        cx: x,
        y: scaledY,
        h: scaledH,
        valueLabel,
        timeLabel,
      };
    }
    ctx.restore();

    this._chartBars = bars;

    // subtle outline for readability
    ctx.strokeStyle = colorBorder;
    ctx.lineWidth = 1;
    for (let i = 0; i < points; i++) {
      const x = plotLeft + i * stepX + stepX / 2;
      const y = yFor(numericValues[i]);
      const h = baseY - y;
      const heightPx = Math.max(0, h);
      const scale = scaleForIndex(i);
      const scaledH = heightPx * scale;
      const scaledY = baseY - scaledH;
      ctx.strokeRect(x - barWidth / 2, scaledY, barWidth, scaledH);
    }

    // Draw current time vertical strip (if within range)
    (function () {
      if (!Array.isArray(times) || times.length < 2) return;
      const startMs = times[0].getTime();
      const endMs = times[times.length - 1].getTime();
      const nowMs = Date.now();
      if (endMs > startMs && nowMs >= startMs && nowMs <= endMs) {
        const p = (nowMs - startMs) / (endMs - startMs);
        const xPos = plotLeft + p * plotWidth;
        const stripW = Math.max(3, Math.min(14, stepX * 0.4));
        const half = stripW / 2;

        // vertical gradient stripe for depth
        const gradStrip = ctx.createLinearGradient(0, plotTop, 0, plotBottom);
        gradStrip.addColorStop(0, "rgba(255,255,255,0.02)");
        gradStrip.addColorStop(0.48, "rgba(255,255,255,0.06)");
        gradStrip.addColorStop(0.5, "rgba(255,255,255,0.12)");
        gradStrip.addColorStop(0.52, "rgba(255,255,255,0.06)");
        gradStrip.addColorStop(1, "rgba(255,255,255,0.02)");

        ctx.save();
        ctx.fillStyle = gradStrip;
        ctx.fillRect(xPos - half, plotTop, stripW, plotHeight);

        // center accent line
        ctx.strokeStyle = "rgba(255,255,255,0.24)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xPos, plotTop);
        ctx.lineTo(xPos, plotBottom);
        ctx.stroke();

        // 'Now' pill label above chart (clamped to plot area)
        const labelText = "Now";
        ctx.font = "11px Poppins, sans-serif";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        const txtW = Math.max(28, ctx.measureText(labelText).width + 12);
        const labelH = 18;
        let labelX = xPos - txtW / 2;
        const minX = plotLeft;
        const maxX = plotLeft + plotWidth - txtW;
        if (labelX < minX) labelX = minX;
        if (labelX > maxX) labelX = maxX;
        const labelY = plotTop - labelH - 8;

        // Draw rounded rect background for pill (softer transparent gray)
        const r = 6;
        ctx.fillStyle = "rgba(120,120,120,0.35)";
        ctx.beginPath();
        ctx.moveTo(labelX + r, labelY);
        ctx.arcTo(labelX + txtW, labelY, labelX + txtW, labelY + labelH, r);
        ctx.arcTo(labelX + txtW, labelY + labelH, labelX, labelY + labelH, r);
        ctx.arcTo(labelX, labelY + labelH, labelX, labelY, r);
        ctx.arcTo(labelX, labelY, labelX + txtW, labelY, r);
        ctx.closePath();
        ctx.fill();

        // label text (slightly softer white for contrast)
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fillText(labelText, labelX + txtW / 2, labelY + labelH / 2);

        ctx.restore();
      }
    })();

    // x labels (every 3 hours)
    const labelEvery = 3;
    ctx.fillStyle = colorMuted;
    ctx.font = "11px Poppins, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i < points; i += labelEvery) {
      const x = plotLeft + i * stepX + stepX / 2;
      const hourLabel = times[i].toLocaleTimeString(undefined, {
        hour: "numeric",
      });
      ctx.fillText(hourLabel, x, plotBottom + 6);
    }

    if (shouldAnimate) {
      this._chartRaf = requestAnimationFrame(() => this.renderHourlyChart());
    } else {
      this._chartAnim = null;
    }

    return;
  }
});

/**
 * WeatherManager: 7 day forecast rendering.
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

  render7DayForecast() {
    if (!this.weatherForecast) return;

    const daily = this.dailyForecast;
    const settings = this.storage.getSettings();
    const unitSymbol =
      (settings.weatherUnit || "celsius") === "fahrenheit" ? "°F" : "°C";
    const windUnitLabel =
      (settings.weatherUnit || "celsius") === "fahrenheit" ? "mph" : "km/h";

    if (!daily || !Array.isArray(daily.time) || daily.time.length === 0) {
      this.weatherForecast.innerHTML = "";
      return;
    }

    const items = daily.time.slice(0, 7).map((dateStr, index) => {
      const code = daily.weather_code?.[index];
      const max = daily.temperature_2m_max?.[index];
      const min = daily.temperature_2m_min?.[index];
      const precip = daily.precipitation_sum?.[index];
      const windMax = daily.wind_speed_10m_max?.[index];
      const info = this.weatherCodes[code] || { icon: "🌡️", desc: "" };
      const themedIcon = this._getIcon(info.icon, { size: 24 });

      const dayName = new Date(dateStr).toLocaleDateString(undefined, {
        weekday: "short",
      });

      const tempText =
        Number.isFinite(max) && Number.isFinite(min)
          ? `${Math.round(min)}–${Math.round(max)}${unitSymbol}`
          : `--${unitSymbol}`;

      const precipText = Number.isFinite(precip)
        ? `${Math.round(precip)}mm`
        : "--";
      const windText = Number.isFinite(windMax)
        ? `${Math.round(windMax)} ${windUnitLabel}`
        : "--";

      const selectedClass =
        index === this.selectedForecastIndex ? " selected" : "";
      return `
        <div class="weather-forecast-day${selectedClass}" data-day-index="${index}" title="${info.desc}">
          <div class="day-name">${dayName}</div>
          <div class="day-icon">${themedIcon}</div>
          <div class="day-temp">${tempText}</div>
          <div class="day-meta">
            <span>${precipText}</span>
            <span>${windText}</span>
          </div>
        </div>
      `;
    });

    this.weatherForecast.innerHTML = items.join("");

    // Click to select day (updates chart with animation)
    this.weatherForecast
      .querySelectorAll(".weather-forecast-day")
      .forEach((el) => {
        el.addEventListener("click", () => {
          const idx = Number(el.getAttribute("data-day-index"));
          if (!Number.isFinite(idx)) return;
          const wasSelected = this.selectedForecastIndex === idx;
          this.selectedForecastIndex = Math.max(0, Math.min(6, idx));
          this.render7DayForecast();
          // Trigger bar animation when day changes
          if (!wasSelected) {
            this._startHourlyChartAnimation();
          }
          this.renderHourlyChart();
        });
      });

    // Apply responsive flex rules so 7-column full rows remain exact,
    // and any incomplete last row items spread equally to fill the row.
    this.applyForecastFlexLayout();
    this.updateForecastMetaWrapping();
  }

  applyForecastFlexLayout() {
    const container = this.weatherForecast;
    if (!container) return;
    const items = Array.from(
      container.querySelectorAll(".weather-forecast-day"),
    );
    if (!items.length) return;

    container.style.justifyContent = "center";

    // Read gap from CSS var so JS math matches CSS exactly
    const computedGap =
      getComputedStyle(container).getPropertyValue("--wf-gap") || "10px";
    const gapPx = parseFloat(computedGap) || 10;

    // Breakpoints use card/container width so forecast adapts to grid/layout resizes.
    const w = Math.round(
      container.getBoundingClientRect().width ||
        container.clientWidth ||
        this.getWeatherResponsiveWidth() ||
        0,
    );
    let columns = 7;
    if (w <= 640) columns = 2;
    else if (w <= 1020) columns = 4;

    // Base width per item; centered container keeps incomplete rows centered.
    const base = `calc((100% - (${columns - 1} * ${gapPx}px)) / ${columns})`;

    // Set fixed basis for each item so rows remain visually centered.
    items.forEach((el) => {
      el.style.boxSizing = "border-box";
      el.style.flex = `0 0 ${base}`;
      el.style.maxWidth = "none";
    });
  }

  updateForecastMetaWrapping() {
    const container = this.weatherForecast;
    if (!container) return;

    const metaRows = Array.from(container.querySelectorAll(".day-meta"));
    if (!metaRows.length) return;

    metaRows.forEach((meta) => {
      meta.classList.remove("day-meta-wrap");
    });

    metaRows.forEach((meta) => {
      const windEl = meta.querySelector("span:last-child");
      const metaOverflowing = meta.scrollWidth > meta.clientWidth + 1;
      const windOverflowing = Boolean(
        windEl && windEl.scrollWidth > windEl.clientWidth + 1,
      );

      meta.classList.toggle(
        "day-meta-wrap",
        metaOverflowing || windOverflowing,
      );
    });
  }
});

/**
 * SettingsManager, part 3 of 9.
 * Moved out of js/settings.js at method boundaries, so no single file carries the
 * whole class. The class itself is declared in js/settings.js; load this after it.
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
})(SettingsManager.prototype, class {

  _parseLatLngFromText(text) {
    if (!text) return null;
    const raw = String(text).trim();
    if (!raw) return null;

    const candidates = [raw, this._safeDecodeURIComponent(raw)];

    for (const candidate of candidates) {
      // Google Maps URL often includes: @lat,lng,zoom
      const atMatch = candidate.match(
        /@\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/,
      );
      if (atMatch) {
        const normalized = this._normalizeLatLng(atMatch[1], atMatch[2]);
        if (normalized) return normalized;
      }

      // Google Maps data format sometimes includes: !3dLAT!4dLNG
      const dataMatch = candidate.match(
        /!3d\s*(-?\d+(?:\.\d+)?)\s*!4d\s*(-?\d+(?:\.\d+)?)/,
      );
      if (dataMatch) {
        const normalized = this._normalizeLatLng(dataMatch[1], dataMatch[2]);
        if (normalized) return normalized;
      }

      // Query params: q=lat,lng or ll=lat,lng or center=lat,lng
      const paramMatch = candidate.match(
        /[?&](?:q|query|ll|center)=\s*(-?\d+(?:\.\d+)?)(?:%2C|,|\s)+\s*(-?\d+(?:\.\d+)?)/i,
      );
      if (paramMatch) {
        const normalized = this._normalizeLatLng(paramMatch[1], paramMatch[2]);
        if (normalized) return normalized;
      }

      // Generic: first in-range "lat, lng" pair
      const pairRe = /(-?\d+(?:\.\d+)?)(?:\s*,\s*|\s+)(-?\d+(?:\.\d+)?)/g;
      let m;
      let best = null;
      let bestScore = -1;
      while ((m = pairRe.exec(candidate)) !== null) {
        const normalized = this._normalizeLatLng(m[1], m[2]);
        if (!normalized) continue;

        const a = String(m[1]);
        const b = String(m[2]);
        const hasDecA = a.includes(".");
        const hasDecB = b.includes(".");

        // Prefer pairs that look like real coordinates (usually decimal).
        // This helps avoid accidentally selecting integers like "15,17" from URLs.
        let score = 0;
        if (hasDecA) score += 2;
        if (hasDecB) score += 2;
        score += Math.min(6, a.replace(/[^0-9]/g, "").length);
        score += Math.min(6, b.replace(/[^0-9]/g, "").length);

        if (score > bestScore) {
          bestScore = score;
          best = normalized;
        }
      }
      if (best) return best;
    }

    return null;
  }

  async _readClipboardTextWithFallback() {
    try {
      if (navigator.clipboard?.readText) {
        return await navigator.clipboard.readText();
      }
    } catch {
      // ignore; fallback below
    }

    // Fallback for environments that block clipboard reads
    const manual = window.prompt(
      `Paste coordinates (e.g., ${this.storage.getCoordinateExample().text})`,
    );
    return manual || "";
  }

  applyCoordinateExamples() {
    const example = this.storage.getCoordinateExample();
    const text = example?.text || "";
    if (!text) return;

    [
      [this.latitudeInput, this.longitudeInput, this.pasteCoordsBtn],
      [
        this.weatherLatitudeInput,
        this.weatherLongitudeInput,
        this.weatherPasteCoordsBtn,
      ],
    ].forEach(([latInput, lngInput, pasteButton]) => {
      if (latInput) latInput.placeholder = String(example.latitude);
      if (lngInput) lngInput.placeholder = String(example.longitude);
      if (pasteButton) {
        const label = `Paste coordinates from clipboard (e.g., "${text}")`;
        pasteButton.title = label;
        pasteButton.setAttribute("aria-label", label);
      }
    });
  }

  _applyLatLngToInputs(latInput, lngInput, latLng) {
    if (!latInput || !lngInput) return;
    latInput.value = latLng.latitude;
    lngInput.value = latLng.longitude;

    // Trigger any listeners relying on change/input events
    latInput.dispatchEvent(new Event("input", { bubbles: true }));
    latInput.dispatchEvent(new Event("change", { bubbles: true }));
    lngInput.dispatchEvent(new Event("input", { bubbles: true }));
    lngInput.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async pasteLocationCoordinatesFromClipboard() {
    const text = await this._readClipboardTextWithFallback();
    const latLng = this._parseLatLngFromText(text);
    if (!latLng) {
      this.showToast(
        "Could not parse coordinates. Copy a Google Maps link or 'lat, lng' format.",
        "error",
      );
      return;
    }

    this._applyLatLngToInputs(this.latitudeInput, this.longitudeInput, latLng);
    this.showToast("Coordinates pasted into Location settings.", "success");
  }

  async pasteWeatherCoordinatesFromClipboard() {
    const text = await this._readClipboardTextWithFallback();
    const latLng = this._parseLatLngFromText(text);
    if (!latLng) {
      this.showToast(
        "Could not parse coordinates. Copy a Google Maps link or 'lat, lng' format.",
        "error",
      );
      return;
    }

    this._applyLatLngToInputs(
      this.weatherLatitudeInput,
      this.weatherLongitudeInput,
      latLng,
    );
    this.showToast("Coordinates pasted into Weather settings.", "success");
  }

  toggleCustomGreeting(show) {
    if (this.customGreetingGroup) {
      this.customGreetingGroup.style.display = show ? "block" : "none";
    }
    if (this.timeGreetingGroup) {
      this.timeGreetingGroup.style.display = show ? "none" : "block";
    }
  }

  toggleClockOptions(show) {
    const clockOptionsGroup = document.getElementById("clockOptionsGroup");
    const clockExtraOptions = document.getElementById("clockExtraOptions");
    if (clockOptionsGroup)
      clockOptionsGroup.style.display = show ? "block" : "none";
    if (clockExtraOptions)
      clockExtraOptions.style.display = show ? "block" : "none";
  }

  toggleAmPmOption(show) {
    const ampmOption = document.getElementById("ampmOption");
    if (ampmOption) ampmOption.style.display = show ? "flex" : "none";
  }

  toggleCustomInterval(show) {
    if (this.customIntervalGroup) {
      this.customIntervalGroup.style.display = show ? "block" : "none";
    }
  }

  toggleCompactWeatherOptions(show) {
    if (this.compactWeatherOptions) {
      this.compactWeatherOptions.style.display = show ? "block" : "none";
    }
  }

  toggleCustomWidth(show) {
    if (this.customWidthGroup) {
      this.customWidthGroup.style.display = show ? "block" : "none";
    }
  }

  clampNumber(value, min, max, fallback) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(max, Math.max(min, numeric));
  }

  normalizeColorHex(value, fallback = "") {
    const raw = String(value || "").trim();
    if (!raw) return fallback;

    const shortHex = raw.match(/^#([0-9a-f]{3})$/i);
    if (shortHex) {
      const expanded = shortHex[1]
        .split("")
        .map((c) => c + c)
        .join("")
        .toLowerCase();
      return `#${expanded}`;
    }

    const fullHex = raw.match(/^#([0-9a-f]{6})$/i);
    if (fullHex) {
      return `#${fullHex[1].toLowerCase()}`;
    }

    return fallback;
  }

  parseCssRgbColor(colorValue) {
    const value = String(colorValue || "").trim();
    const match = value.match(
      /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*[0-9.]+)?\s*\)$/i,
    );
    if (!match) return null;

    return {
      r: Math.max(0, Math.min(255, Math.round(Number(match[1])))),
      g: Math.max(0, Math.min(255, Math.round(Number(match[2])))),
      b: Math.max(0, Math.min(255, Math.round(Number(match[3])))),
    };
  }

  rgbToHex(r, g, b) {
    const toHex = (value) =>
      Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  getAutoHeaderGlowColor(targetSelector, fallback = "#ffffff") {
    if (typeof window.getComputedStyle !== "function") return fallback;

    const target =
      typeof targetSelector === "string"
        ? document.querySelector(targetSelector)
        : targetSelector;

    const source = target || document.body;
    if (!source) return fallback;

    const rgb = this.parseCssRgbColor(window.getComputedStyle(source).color);
    if (!rgb) return fallback;

    return this.rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
  }

  getAutoHeaderTextColor(targetSelector, fallback = "#ffffff") {
    if (typeof window.getComputedStyle !== "function") return fallback;

    const target =
      typeof targetSelector === "string"
        ? document.querySelector(targetSelector)
        : targetSelector;

    const source = target || document.body;
    if (!source) return fallback;

    const previousInlineColor =
      source.style && typeof source.style.getPropertyValue === "function"
        ? source.style.getPropertyValue("color")
        : null;
    if (previousInlineColor) {
      source.style.removeProperty("color");
    }

    const rgb = this.parseCssRgbColor(window.getComputedStyle(source).color);

    if (previousInlineColor) {
      source.style.setProperty("color", previousInlineColor);
    }

    if (!rgb) return fallback;

    return this.rgbToHex(rgb.r, rgb.g, rgb.b);
  }

  getHeaderColorControlDefault(config) {
    if (!config) return "#ffffff";
    if (config.defaultMode === "glow") {
      return this.getAutoHeaderGlowColor(config.defaultSelector);
    }
    return this.getAutoHeaderTextColor(config.defaultSelector);
  }

  loadHeaderColorControlValue(config, storedColor) {
    const input = config?.input;
    if (!input) return;

    const customColor = this.normalizeColorHex(storedColor, "");
    input.value = customColor || this.getHeaderColorControlDefault(config);
    input.dataset.themeDefault = customColor ? "false" : "true";
  }

  getHeaderColorControlSaveValue(input) {
    if (!input || input.dataset.themeDefault === "true") return "";
    return this.normalizeColorHex(input.value, "");
  }

  resetHeaderColorControlToTheme(config) {
    const input = config?.input;
    if (!input) return;

    input.value = this.getHeaderColorControlDefault(config);
    input.dataset.themeDefault = "true";
    this.applyHeaderQuickControlsInstantly();
  }

  refreshThemeDefaultHeaderTextColorControls() {
    this.getHeaderTextColorControlConfigs().forEach((config) => {
      const input = config?.input;
      if (!input || input.dataset.themeDefault !== "true") return;

      this.loadHeaderColorControlValue(config, "");
    });
  }

  clampHeaderGlowOpacity(value, fallback = 72) {
    return SettingsRegistry.coerce("bgDim", parseInt(value, 10), fallback);
  }

  clampHeaderGlowRadius(value, fallback = 14) {
    return this.clampNumber(parseInt(value, 10), 0, 50, fallback);
  }

  getHeaderTextColorControlConfigs() {
    return [
      {
        key: "greeting",
        settingKey: "greetingTextColor",
        input: this.headerGreetingTextColor,
        reset: this.headerGreetingTextColorReset,
        defaultSelector: "#greeting",
      },
      {
        key: "date",
        settingKey: "dateTextColor",
        input: this.headerDateTextColor,
        reset: this.headerDateTextColorReset,
        defaultSelector: "#dateDisplay",
      },
      {
        key: "time",
        settingKey: "timeTextColor",
        input: this.headerTimeTextColor,
        reset: this.headerTimeTextColorReset,
        defaultSelector: "#currentTime",
      },
      {
        key: "nextPrayer",
        settingKey: "nextPrayerTextColor",
        input: this.headerNextPrayerTextColor,
        reset: this.headerNextPrayerTextColorReset,
        defaultSelector: "#headerNextPrayer",
      },
      {
        key: "compactWeather",
        settingKey: "compactWeatherTextColor",
        input: this.headerCompactWeatherTextColor,
        reset: this.headerCompactWeatherTextColorReset,
        defaultSelector: "#compactWeather .compact-weather-temp",
      },
    ];
  }

  getHeaderGlowControlConfigs() {
    return [
      {
        key: "greeting",
        settingKey: "greetingGlowColor",
        toggle: this.headerGreetingGlowEnabled,
        color: this.headerGreetingGlowColor,
        input: this.headerGreetingGlowColor,
        reset: this.headerGreetingGlowColorReset,
        button: this.headerGreetingGlowPopoverBtn,
        popover: this.headerGreetingGlowPopover,
        opacity: this.headerGreetingGlowOpacity,
        opacityValue: this.headerGreetingGlowOpacityValue,
        radius: this.headerGreetingGlowRadius,
        radiusValue: this.headerGreetingGlowRadiusValue,
        defaultMode: "glow",
        defaultSelector: "#greeting",
      },
      {
        key: "date",
        settingKey: "dateGlowColor",
        toggle: this.headerDateGlowEnabled,
        color: this.headerDateGlowColor,
        input: this.headerDateGlowColor,
        reset: this.headerDateGlowColorReset,
        button: this.headerDateGlowPopoverBtn,
        popover: this.headerDateGlowPopover,
        opacity: this.headerDateGlowOpacity,
        opacityValue: this.headerDateGlowOpacityValue,
        radius: this.headerDateGlowRadius,
        radiusValue: this.headerDateGlowRadiusValue,
        defaultMode: "glow",
        defaultSelector: "#dateDisplay",
      },
      {
        key: "time",
        settingKey: "timeGlowColor",
        toggle: this.headerTimeGlowEnabled,
        color: this.headerTimeGlowColor,
        input: this.headerTimeGlowColor,
        reset: this.headerTimeGlowColorReset,
        button: this.headerTimeGlowPopoverBtn,
        popover: this.headerTimeGlowPopover,
        opacity: this.headerTimeGlowOpacity,
        opacityValue: this.headerTimeGlowOpacityValue,
        radius: this.headerTimeGlowRadius,
        radiusValue: this.headerTimeGlowRadiusValue,
        defaultMode: "glow",
        defaultSelector: "#currentTime",
      },
      {
        key: "nextPrayer",
        settingKey: "nextPrayerGlowColor",
        toggle: this.headerNextPrayerGlowEnabled,
        color: this.headerNextPrayerGlowColor,
        input: this.headerNextPrayerGlowColor,
        reset: this.headerNextPrayerGlowColorReset,
        button: this.headerNextPrayerGlowPopoverBtn,
        popover: this.headerNextPrayerGlowPopover,
        opacity: this.headerNextPrayerGlowOpacity,
        opacityValue: this.headerNextPrayerGlowOpacityValue,
        radius: this.headerNextPrayerGlowRadius,
        radiusValue: this.headerNextPrayerGlowRadiusValue,
        defaultMode: "glow",
        defaultSelector: "#headerNextPrayer",
      },
      {
        key: "compactWeather",
        settingKey: "compactWeatherGlowColor",
        toggle: this.headerCompactWeatherGlowEnabled,
        color: this.headerCompactWeatherGlowColor,
        input: this.headerCompactWeatherGlowColor,
        reset: this.headerCompactWeatherGlowColorReset,
        button: this.headerCompactWeatherGlowPopoverBtn,
        popover: this.headerCompactWeatherGlowPopover,
        opacity: this.headerCompactWeatherGlowOpacity,
        opacityValue: this.headerCompactWeatherGlowOpacityValue,
        radius: this.headerCompactWeatherGlowRadius,
        radiusValue: this.headerCompactWeatherGlowRadiusValue,
        defaultMode: "glow",
        defaultSelector: "#compactWeather .compact-weather-temp",
      },
    ];
  }

  updateHeaderGlowTuningUi() {
    this.getHeaderGlowControlConfigs().forEach((config) => {
      if (config.opacity && config.opacityValue) {
        const opacity = this.clampHeaderGlowOpacity(config.opacity.value, 72);
        config.opacity.value = String(opacity);
        config.opacityValue.textContent = `${opacity}%`;
      }
      if (config.radius && config.radiusValue) {
        const radius = this.clampHeaderGlowRadius(config.radius.value, 14);
        config.radius.value = String(radius);
        config.radiusValue.textContent = `${radius}px`;
      }
    });
  }

  closeAllHeaderGlowPopovers() {
    this.getHeaderGlowControlConfigs().forEach((config) => {
      if (config.popover) {
        config.popover.classList.remove("open");
      }
      if (config.button) {
        config.button.setAttribute("aria-expanded", "false");
      }
    });
  }

  setupHeaderColorControls() {
    [
      ...this.getHeaderTextColorControlConfigs(),
      ...this.getHeaderGlowControlConfigs(),
    ].forEach((config) => {
      const input = config.input || config.color;

      if (input && input.dataset.headerColorBound !== "1") {
        input.dataset.headerColorBound = "1";
        const applyCustomColor = () => {
          input.dataset.themeDefault = "false";
          this.applyHeaderQuickControlsInstantly();
        };
        input.addEventListener("input", applyCustomColor);
        input.addEventListener("change", applyCustomColor);
      }

      if (config.reset && config.reset.dataset.headerColorResetBound !== "1") {
        config.reset.dataset.headerColorResetBound = "1";
        config.reset.addEventListener("click", () => {
          this.resetHeaderColorControlToTheme(config);
        });
      }
    });
  }

  setupHeaderGlowPopoverControls() {
    const configs = this.getHeaderGlowControlConfigs();
    if (!configs.length) return;

    this.updateHeaderGlowTuningUi();

    configs.forEach((config) => {
      if (config.button && config.popover) {
        config.button.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          const willOpen = !config.popover.classList.contains("open");
          this.closeAllHeaderGlowPopovers();

          if (willOpen) {
            config.popover.classList.add("open");
            config.button.setAttribute("aria-expanded", "true");
          }
        });

        config.popover.addEventListener("click", (e) => {
          e.stopPropagation();
        });
      }

      if (config.opacity) {
        config.opacity.addEventListener("input", () => {
          this.updateHeaderGlowTuningUi();
          this.applyHeaderQuickControlsInstantly();
        });
        config.opacity.addEventListener("change", () => {
          this.updateHeaderGlowTuningUi();
          this.applyHeaderQuickControlsInstantly();
        });
      }

      if (config.radius) {
        config.radius.addEventListener("input", () => {
          this.updateHeaderGlowTuningUi();
          this.applyHeaderQuickControlsInstantly();
        });
        config.radius.addEventListener("change", () => {
          this.updateHeaderGlowTuningUi();
          this.applyHeaderQuickControlsInstantly();
        });
      }
    });

    if (this.modal && this.modal.dataset.headerGlowPopoverBound !== "1") {
      this.modal.dataset.headerGlowPopoverBound = "1";
      this.modal.addEventListener("click", () => {
        this.closeAllHeaderGlowPopovers();
      });
    }

    if (document.documentElement.dataset.headerGlowEscBound !== "1") {
      document.documentElement.dataset.headerGlowEscBound = "1";
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          this.closeAllHeaderGlowPopovers();
        }
      });
    }
  }

  updateCustomWidthLabel() {
    if (this.customWidthValue && this.containerWidthCustom) {
      const clamped = SettingsRegistry.coerce(
        "containerWidthCustom",
        parseInt(this.containerWidthCustom.value, 10),
      );
      this.containerWidthCustom.value = String(clamped);
      this.customWidthValue.textContent = clamped + "%";
    }
  }

  updateUiBlurPowerLabel() {
    if (this.uiBlurPowerValue && this.uiBlurPower) {
      const clamped = SettingsRegistry.coerce(
        "uiBlurPower",
        parseInt(this.uiBlurPower.value, 10),
      );
      this.uiBlurPower.value = String(clamped);
      this.uiBlurPowerValue.textContent = clamped + "%";
    }
  }

  updateBackgroundDimLabel() {
    if (this.bgDimValue && this.bgDim) {
      const clamped = this.normalizeBackgroundDim(this.bgDim.value, 100);
      this.bgDim.value = String(clamped);
      this.bgDimValue.textContent = clamped + "%";
    }
  }

  updateBackgroundBlurLabel() {
    if (this.bgBlurValue && this.bgBlur) {
      const clamped = this.normalizeBackgroundBlur(this.bgBlur.value, 0);
      this.bgBlur.value = String(clamped);
      this.bgBlurValue.textContent = clamped + "px";
    }
  }

  resolveDashboardQualityState(
    performanceModeEnabled,
    highestVisualFidelityEnabled,
    preferredMode = "performance",
  ) {
    let performance = performanceModeEnabled === true;
    let highest = highestVisualFidelityEnabled === true;

    if (performance && highest) {
      if (preferredMode === "highest") {
        performance = false;
      } else {
        highest = false;
      }
    }

    return {
      performanceModeEnabled: performance,
      highestVisualFidelityEnabled: highest,
    };
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

  applyUiBlurPower(powerPercent) {
    const clamped = SettingsRegistry.coerce("uiBlurPower", powerPercent);
    const baseMultiplier = clamped / 100;
    const highestVisualFidelityEnabled = this.isHighestVisualFidelityEnabled();
    const effectiveMultiplier = highestVisualFidelityEnabled
      ? baseMultiplier
      : Number((baseMultiplier * 0.72).toFixed(3));

    document.documentElement.style.setProperty(
      "--ui-blur-base-multiplier",
      String(baseMultiplier),
    );
    document.documentElement.style.setProperty(
      "--ui-blur-multiplier",
      String(effectiveMultiplier),
    );

    // Notify components that render UI outside their card's DOM subtree
    // (e.g., portalled dropdowns) to resync blur values.
    try {
      document.dispatchEvent(
        new CustomEvent("md:ui-blur-update", {
          detail: {
            multiplier: effectiveMultiplier,
            baseMultiplier,
            highestVisualFidelityEnabled,
          },
        }),
      );
    } catch (e) {}
  }

  applyHighestVisualFidelity(enabled) {
    const isEnabled = enabled === true;
    const root = document.documentElement;
    const body = document.body;

    if (root) {
      root.dataset.highestVisualFidelity = isEnabled ? "true" : "false";
      root.classList.toggle("highest-visual-fidelity", isEnabled);
    }

    if (body) {
      body.classList.toggle("highest-visual-fidelity", isEnabled);
    }

    window.__MD_HIGHEST_VISUAL_FIDELITY__ = isEnabled;

    try {
      document.dispatchEvent(
        new CustomEvent("md:highest-visual-fidelity-change", {
          detail: { enabled: isEnabled },
        }),
      );
    } catch (e) {}
  }

  applyDashboardQualityState(preferredMode = "performance") {
    const resolved = this.resolveDashboardQualityState(
      this.themePerformanceModeEnabled?.checked === true,
      this.themeHighestVisualFidelityEnabled?.checked === true,
      preferredMode,
    );

    if (this.themePerformanceModeEnabled) {
      this.themePerformanceModeEnabled.checked =
        resolved.performanceModeEnabled;
    }
    if (this.themeHighestVisualFidelityEnabled) {
      this.themeHighestVisualFidelityEnabled.checked =
        resolved.highestVisualFidelityEnabled;
    }

    this.applyHighestVisualFidelity(resolved.highestVisualFidelityEnabled);
    this.applyPerformanceMode(resolved.performanceModeEnabled);
    this.applyUiBlurPower(
      this.themeBlurPower?.value ?? this.storage.getSettings()?.uiBlurPower,
    );

    return resolved;
  }

  applyPerformanceMode(enabled) {
    const isEnabled = enabled === true;
    const root = document.documentElement;
    const body = document.body;

    if (root) {
      root.dataset.performanceMode = isEnabled ? "true" : "false";
      root.classList.toggle("performance-mode", isEnabled);
    }

    if (body) {
      body.classList.toggle("performance-mode", isEnabled);
    }

    window.__MD_PERFORMANCE_MODE__ = isEnabled;

    try {
      document.dispatchEvent(
        new CustomEvent("md:performance-mode-change", {
          detail: { enabled: isEnabled },
        }),
      );
    } catch (e) {}
  }

  initThemesPanel() {
    this.renderThemePickerGrid();
    this.loadThemePanelSettings();
    this.setupThemePanelEventListeners();
    this.setupIconThemePicker();

    // Listen for icon theme changes and update theme picker grid
    document.addEventListener("md:icon-theme-change", () => {
      this.renderThemePickerGrid();
    });

    document.addEventListener("md:theme-change", () => {
      this.refreshThemeDefaultHeaderTextColorControls();
    });
  }

  _startRefreshButton(btn, { label = "Refreshing…" } = {}) {
    if (!btn) return () => {};

    const originalText =
      btn.dataset?.mdIconifyOriginal || btn.textContent || "";
    const prevDisabled = btn.disabled === true;

    const iconHtml = `<span class="refresh-cw-icon" aria-hidden="true">${this._getIcon(
      "🔄",
      { size: 16, inline: true },
    )}</span>`;

    btn.classList.add("is-refreshing");
    btn.disabled = true;
    btn.innerHTML = `${iconHtml}<span class="refresh-label">${label}</span>`;

    let finished = false;
    return () => {
      if (finished) return;
      finished = true;
      btn.classList.remove("is-refreshing");
      btn.disabled = prevDisabled;
      btn.textContent = originalText;
      try {
        const iconThemes = window.dashboard?.iconThemes;
        if (iconThemes?.applyDomIconReplacements) {
          // applyDomIconReplacements doesn't process the root element itself,
          // so target the parent (or document) to re-iconify this button.
          iconThemes.applyDomIconReplacements(btn.parentElement || document);
        }
      } catch (e) {}
    };
  }

  setupIconThemePicker() {
    if (!this.iconThemePicker) return;

    // Load current icon theme setting
    const settings = this.storage.getSettings();
    const currentIconTheme = settings.iconTheme || "monochrome";
    this.updateIconThemePickerState(currentIconTheme);

    // Add click handlers to icon theme cards
    this.iconThemePicker.addEventListener("click", (e) => {
      const card = e.target.closest(".icon-theme-card");
      if (!card) return;

      const themeId = card.dataset.iconTheme;
      if (!themeId) return;

      this.updateIconThemePickerState(themeId);

      // Apply icon theme immediately
      if (window.dashboard?.iconThemes) {
        window.dashboard.iconThemes.setTheme(themeId, true);
      }
    });
  }

  updateIconThemePickerState(activeTheme) {
    if (!this.iconThemePicker) return;

    const cards = this.iconThemePicker.querySelectorAll(".icon-theme-card");
    cards.forEach((card) => {
      const themeId = card.dataset.iconTheme;
      card.classList.toggle("active", themeId === activeTheme);
    });
  }

  loadThemePanelSettings() {
    const settings = this.storage.getSettings();
    const themeSettings = settings.theme || {};

    // Load mode
    const mode = themeSettings.mode || "dark";
    this.updateThemeModeButtons(mode);

    // Load glass enabled
    const glassEnabled = themeSettings.glassEnabled !== false;
    if (this.themeGlassEnabled) {
      this.themeGlassEnabled.checked = glassEnabled;
    }
    if (this.themeBackgroundAwareFontColorEnabled) {
      this.themeBackgroundAwareFontColorEnabled.checked =
        themeSettings.backgroundAwareFontColorEnabled === true;
    }
    this.updateThemeBlurGroupState(glassEnabled);

    // Load blur power
    const blurPower = SettingsRegistry.coerce("uiBlurPower", settings.uiBlurPower);
    if (this.themeBlurPower) {
      this.themeBlurPower.value = String(blurPower);
    }
    this.updateThemeBlurPowerLabel();

    // Load glass opacity
    const glassOpacity = SettingsRegistry.coerce(
      "glassOpacity",
      themeSettings.glassOpacity,
      window.dashboard?.themes?.getGlassOpacity?.() ?? 50,
    );
    if (this.themeGlassOpacity) {
      this.themeGlassOpacity.value = String(glassOpacity);
    }
    this.updateThemeGlassOpacityLabel();

    // Load main grid component opacity
    const componentOpacity = SettingsRegistry.coerce(
      "componentOpacity",
      themeSettings.componentOpacity,
      window.dashboard?.themes?.getMainGridComponentOpacity?.() ?? 0,
    );
    if (this.themeComponentOpacity) {
      this.themeComponentOpacity.value = String(componentOpacity);
    }
    this.updateThemeComponentOpacityLabel();

    // Load modal panel opacity
    const modalOpacity = SettingsRegistry.coerce(
      "modalOpacity",
      themeSettings.modalOpacity,
      window.dashboard?.themes?.getModalOpacity?.() ?? 97,
    );
    if (this.themeModalOpacity) {
      this.themeModalOpacity.value = String(modalOpacity);
    }
    this.updateThemeModalOpacityLabel();

    // Load container width (now in Themes panel)
    if (this.themeContainerWidth) {
      this.themeContainerWidth.value = settings.containerWidth || "narrow";
    }
    if (settings.containerWidth === "custom") {
      this.toggleThemeCustomWidth(true);
      if (this.themeContainerWidthCustom) {
        const clamped = SettingsRegistry.coerce(
          "containerWidthCustom",
          settings.containerWidthCustom,
        );
        this.themeContainerWidthCustom.value = String(clamped);
      }
      this.updateThemeCustomWidthLabel();
    } else {
      this.toggleThemeCustomWidth(false);
    }

    const dashboardQualityState = this.resolveDashboardQualityState(
      settings.performanceModeEnabled === true,
      themeSettings.highestVisualFidelityEnabled === true,
      "performance",
    );

    if (this.themePerformanceModeEnabled) {
      this.themePerformanceModeEnabled.checked =
        dashboardQualityState.performanceModeEnabled;
    }
    if (this.themeHighestVisualFidelityEnabled) {
      this.themeHighestVisualFidelityEnabled.checked =
        dashboardQualityState.highestVisualFidelityEnabled;
    }
    this.applyHighestVisualFidelity(
      dashboardQualityState.highestVisualFidelityEnabled,
    );
    this.applyPerformanceMode(dashboardQualityState.performanceModeEnabled);
    this.applyUiBlurPower(settings.uiBlurPower ?? 100);

    // Highlight active theme
    const activeTheme = themeSettings.name || "emerald";
    this.updateThemePickerActiveState(activeTheme);
  }

  updateThemeModeButtons(mode) {
    this.themeModeButtons.forEach((btn) => {
      const btnMode = btn.dataset.mode;
      btn.classList.toggle("active", btnMode === mode);
    });
  }

  updateThemeBlurGroupState(glassEnabled) {
    const groups = document.querySelectorAll(".theme-blur-group");
    if (groups.length > 0) {
      groups.forEach((group) => {
        group.classList.toggle("disabled", !glassEnabled);
      });
      return;
    }

    if (this.themeBlurGroup) {
      this.themeBlurGroup.classList.toggle("disabled", !glassEnabled);
    }
  }

  updateThemeBlurPowerLabel() {
    if (this.themeBlurPowerValue && this.themeBlurPower) {
      const clamped = SettingsRegistry.coerce(
        "blurPower",
        parseInt(this.themeBlurPower.value, 10),
      );
      this.themeBlurPower.value = String(clamped);
      this.themeBlurPowerValue.textContent = clamped + "%";
    }
  }

  updateThemeGlassOpacityLabel() {
    if (this.themeGlassOpacityValue && this.themeGlassOpacity) {
      const clamped = SettingsRegistry.coerce(
        "glassOpacity",
        parseInt(this.themeGlassOpacity.value, 10),
      );
      this.themeGlassOpacity.value = String(clamped);
      this.themeGlassOpacityValue.textContent = clamped + "%";
    }
  }

  updateThemeComponentOpacityLabel() {
    if (this.themeComponentOpacityValue && this.themeComponentOpacity) {
      const clamped = SettingsRegistry.coerce(
        "componentOpacity",
        parseInt(this.themeComponentOpacity.value, 10),
      );
      this.themeComponentOpacity.value = String(clamped);
      this.themeComponentOpacityValue.textContent = clamped + "%";
    }
  }

  updateThemeModalOpacityLabel() {
    if (this.themeModalOpacityValue && this.themeModalOpacity) {
      const clamped = SettingsRegistry.coerce(
        "modalOpacity",
        parseInt(this.themeModalOpacity.value, 10),
      );
      this.themeModalOpacity.value = String(clamped);
      this.themeModalOpacityValue.textContent = clamped + "%";
    }
  }

  getSelectedClockStyleValue() {
    const selectedRadio = document.querySelector(
      'input[name="clockStyle"]:checked',
    );
    return selectedRadio?.value || "default";
  }

  isClockSurfaceLockedByStyle(clockStyle) {
    return clockStyle === "boxed" || clockStyle === "pill";
  }

  syncClockSurfaceToggleState(clockStyle = null) {
    if (!this.headerTimeBgEnabled) return;

    const selectedStyle = clockStyle || this.getSelectedClockStyleValue();
    const locked = this.isClockSurfaceLockedByStyle(selectedStyle);
    const wholeComponentSurfaceEnabled =
      this.headerWholeComponentSurfaceEnabled?.checked === true;

    if (locked) {
      this.headerTimeBgEnabled.checked = false;
    }

    this.headerTimeBgEnabled.disabled = locked || wholeComponentSurfaceEnabled;
    this.headerTimeBgEnabled.setAttribute(
      "aria-disabled",
      locked || wholeComponentSurfaceEnabled ? "true" : "false",
    );

    const label = this.headerTimeBgEnabled.closest(".header-surface-cell");
    if (label) {
      if (!label.dataset.defaultTitle) {
        label.dataset.defaultTitle = label.getAttribute("title") || "";
      }

      label.classList.toggle("disabled", locked || wholeComponentSurfaceEnabled);
      label.setAttribute(
        "aria-disabled",
        locked || wholeComponentSurfaceEnabled ? "true" : "false",
      );
      label.setAttribute(
        "title",
        locked
          ? "Clock Surface is unavailable for Boxed and Pill clock styles"
          : label.dataset.defaultTitle,
      );
    }
  }

  updateHeaderSurfaceBackgroundsLockState() {
    const wholeComponentSurfaceEnabled =
      this.headerWholeComponentSurfaceEnabled?.checked === true;
    const controls = [
      this.headerGreetingBgEnabled,
      this.headerDateBgEnabled,
      this.headerTimeBgEnabled,
      this.headerNextPrayerBgEnabled,
      this.headerCompactWeatherBgEnabled,
    ];

    controls.forEach((control) => {
      if (!control) return;
      control.disabled = wholeComponentSurfaceEnabled;
      control.setAttribute(
        "aria-disabled",
        wholeComponentSurfaceEnabled ? "true" : "false",
      );
      control
        .closest(".header-surface-cell")
        ?.classList.toggle("disabled", wholeComponentSurfaceEnabled);
    });

    if (this.headerSurfaceBackgroundsGroup) {
      this.headerSurfaceBackgroundsGroup.classList.remove("disabled");
      this.headerSurfaceBackgroundsGroup.setAttribute("aria-disabled", "false");
    }

    this.syncClockSurfaceToggleState();
  }

  updateHeaderGlowColorLockState() {
    this.getHeaderGlowControlConfigs().forEach((config) => {
      const enabled = config.toggle?.checked === true;

      if (config.color) {
        config.color.disabled = !enabled;
        config.color.setAttribute("aria-disabled", enabled ? "false" : "true");
      }

      if (config.reset) {
        config.reset.disabled = !enabled;
        config.reset.setAttribute("aria-disabled", enabled ? "false" : "true");
      }

      if (config.button) {
        config.button.disabled = !enabled;
        config.button.setAttribute("aria-disabled", enabled ? "false" : "true");
      }

      if (config.opacity) {
        config.opacity.disabled = !enabled;
        config.opacity.setAttribute(
          "aria-disabled",
          enabled ? "false" : "true",
        );
      }

      if (config.radius) {
        config.radius.disabled = !enabled;
        config.radius.setAttribute("aria-disabled", enabled ? "false" : "true");
      }

      if (!enabled && config.popover?.classList.contains("open")) {
        config.popover.classList.remove("open");
      }
      if (!enabled && config.button) {
        config.button.setAttribute("aria-expanded", "false");
      }
    });
  }

  applyHeaderQuickControlsInstantly() {
    const dashboard = window.dashboard;
    if (!dashboard || !this.storage) return;

    const settings = this.storage.getSettings();
    settings.heading = settings.heading || {};

    const selectedClockStyle = this.getSelectedClockStyleValue();
    const clockSurfaceLocked =
      this.isClockSurfaceLockedByStyle(selectedClockStyle);

    this.syncClockSurfaceToggleState(selectedClockStyle);

    settings.heading.showGreeting = this.showGreeting?.checked ?? true;
    settings.heading.showClock = this.showClock?.checked ?? true;
    settings.heading.showDate = this.showDate?.checked ?? true;
    settings.heading.showNextPrayer = this.showNextPrayer?.checked === true;
    settings.heading.clockStyle = selectedClockStyle;

    settings.compactWeatherEnabled =
      this.compactWeatherEnabled?.checked ?? false;

    settings.heading.wholeComponentSurfaceEnabled =
      this.headerWholeComponentSurfaceEnabled?.checked === true;
    settings.heading.greetingBackgroundEnabled =
      this.headerGreetingBgEnabled?.checked === true;
    settings.heading.dateBackgroundEnabled =
      this.headerDateBgEnabled?.checked === true;
    settings.heading.timeBackgroundEnabled = clockSurfaceLocked
      ? false
      : this.headerTimeBgEnabled?.checked === true;
    settings.heading.nextPrayerBackgroundEnabled =
      this.headerNextPrayerBgEnabled?.checked === true;
    settings.heading.compactWeatherBackgroundEnabled =
      this.headerCompactWeatherBgEnabled?.checked === true;

    settings.heading.greetingTextColor = this.getHeaderColorControlSaveValue(
      this.headerGreetingTextColor,
    );
    settings.heading.dateTextColor = this.getHeaderColorControlSaveValue(
      this.headerDateTextColor,
    );
    settings.heading.timeTextColor = this.getHeaderColorControlSaveValue(
      this.headerTimeTextColor,
    );
    settings.heading.nextPrayerTextColor = this.getHeaderColorControlSaveValue(
      this.headerNextPrayerTextColor,
    );
    settings.heading.compactWeatherTextColor =
      this.getHeaderColorControlSaveValue(this.headerCompactWeatherTextColor);

    settings.heading.greetingGlowEnabled =
      this.headerGreetingGlowEnabled?.checked === true;
    settings.heading.greetingGlowColor = settings.heading.greetingGlowEnabled
      ? this.getHeaderColorControlSaveValue(this.headerGreetingGlowColor)
      : "";
    settings.heading.greetingGlowOpacity = this.clampHeaderGlowOpacity(
      this.headerGreetingGlowOpacity?.value,
      72,
    );
    settings.heading.greetingGlowRadius = this.clampHeaderGlowRadius(
      this.headerGreetingGlowRadius?.value,
      14,
    );

    settings.heading.dateGlowEnabled =
      this.headerDateGlowEnabled?.checked === true;
    settings.heading.dateGlowColor = settings.heading.dateGlowEnabled
      ? this.getHeaderColorControlSaveValue(this.headerDateGlowColor)
      : "";
    settings.heading.dateGlowOpacity = this.clampHeaderGlowOpacity(
      this.headerDateGlowOpacity?.value,
      72,
    );
    settings.heading.dateGlowRadius = this.clampHeaderGlowRadius(
      this.headerDateGlowRadius?.value,
      14,
    );

    settings.heading.timeGlowEnabled =
      this.headerTimeGlowEnabled?.checked === true;
    settings.heading.timeGlowColor = settings.heading.timeGlowEnabled
      ? this.getHeaderColorControlSaveValue(this.headerTimeGlowColor)
      : "";
    settings.heading.timeGlowOpacity = this.clampHeaderGlowOpacity(
      this.headerTimeGlowOpacity?.value,
      72,
    );
    settings.heading.timeGlowRadius = this.clampHeaderGlowRadius(
      this.headerTimeGlowRadius?.value,
      14,
    );

    settings.heading.nextPrayerGlowEnabled =
      this.headerNextPrayerGlowEnabled?.checked === true;
    settings.heading.nextPrayerGlowColor = settings.heading
      .nextPrayerGlowEnabled
      ? this.getHeaderColorControlSaveValue(this.headerNextPrayerGlowColor)
      : "";
    settings.heading.nextPrayerGlowOpacity = this.clampHeaderGlowOpacity(
      this.headerNextPrayerGlowOpacity?.value,
      72,
    );
    settings.heading.nextPrayerGlowRadius = this.clampHeaderGlowRadius(
      this.headerNextPrayerGlowRadius?.value,
      14,
    );

    settings.heading.compactWeatherGlowEnabled =
      this.headerCompactWeatherGlowEnabled?.checked === true;
    settings.heading.compactWeatherGlowColor = settings.heading
      .compactWeatherGlowEnabled
      ? this.getHeaderColorControlSaveValue(
          this.headerCompactWeatherGlowColor,
        )
      : "";
    settings.heading.compactWeatherGlowOpacity = this.clampHeaderGlowOpacity(
      this.headerCompactWeatherGlowOpacity?.value,
      72,
    );
    settings.heading.compactWeatherGlowRadius = this.clampHeaderGlowRadius(
      this.headerCompactWeatherGlowRadius?.value,
      14,
    );

    this.storage.saveSettings(settings);

    this.toggleClockOptions(settings.heading.showClock !== false);
    this.toggleCompactWeatherOptions(settings.compactWeatherEnabled === true);

    if (typeof dashboard.updateGreeting === "function") {
      dashboard.updateGreeting();
    }
    if (typeof dashboard.updateDate === "function") {
      dashboard.updateDate();
    }
    if (
      dashboard.weather &&
      typeof dashboard.weather.updateCompactWeather === "function"
    ) {
      dashboard.weather.updateCompactWeather();
    }
    if (typeof dashboard.applyHeadingSettings === "function") {
      dashboard.applyHeadingSettings();
    }
  }

  toggleThemeCustomWidth(show) {
    if (this.themeCustomWidthGroup) {
      this.themeCustomWidthGroup.style.display = show ? "block" : "none";
    }
  }

  updateThemeCustomWidthLabel() {
    if (this.themeCustomWidthValue && this.themeContainerWidthCustom) {
      const clamped = SettingsRegistry.coerce(
        "containerWidthCustom",
        parseInt(this.themeContainerWidthCustom.value, 10),
      );
      this.themeContainerWidthCustom.value = String(clamped);
      this.themeCustomWidthValue.textContent = clamped + "%";
    }
  }

  renderThemePickerGrid() {
    if (!this.themePickerGrid || typeof ThemeManager === "undefined") return;

    const themes = ThemeManager.THEMES;
    const settings = this.storage.getSettings();
    const currentMode =
      window.dashboard?.themes?.getCurrentMode?.() ||
      settings.theme?.mode ||
      "dark";
    const activeTheme =
      window.dashboard?.themes?.getCurrentTheme?.() ||
      settings.theme?.name ||
      "emerald";

    let html = "";

    for (const [id, theme] of Object.entries(themes)) {
      const colors = theme[currentMode];
      const isActive = id === activeTheme;
      const isCustomizable = theme.customizable || false;

      // For customizable themes, preview using the saved/custom palette (per theme + mode)
      const palette = isCustomizable
        ? window.dashboard?.themes?.getCustomPalette?.(id, currentMode) ||
          settings.theme?.customPalettes?.[id]?.[currentMode] ||
          null
        : null;

      const previewPrimary = palette?.primary || colors.primary;
      const previewAccent =
        palette?.accentBackground ||
        palette?.accent ||
        colors.accentBackground ||
        colors.accent;
      const previewBg = palette?.bodyBg || colors.bodyBg;

      html += `
        <div class="theme-card${isActive ? " active" : ""}${
          isCustomizable ? " customizable" : ""
        }" data-theme="${id}" data-customizable="${isCustomizable}">
          <div class="theme-card-preview">
            <div class="theme-preview-primary" style="background: ${previewPrimary}"></div>
            <div class="theme-preview-accent" style="background: ${previewAccent}"></div>
            <div class="theme-preview-bg" style="background: ${previewBg}"></div>
          </div>
          <div class="theme-card-header">
            <span class="theme-card-icon">${this._getIcon(theme.icon, {
              size: 20,
            })}</span>
            <span class="theme-card-name">${theme.name}</span>
          </div>
          <div class="theme-card-desc">${theme.description}</div>
          ${
            isCustomizable
              ? `<button class="theme-card-customize" type="button" title="Customize palette"><span aria-hidden="true">${this._getIcon(
                  "🎨",
                  { size: 16 },
                )}</span></button>`
              : ""
          }
          <div class="theme-card-check">${this._getIcon("✓", {
            size: 16,
          })}</div>
        </div>
      `;
    }

    this.themePickerGrid.innerHTML = html;
  }

  openThemePaletteModal(themeName) {
    const overlay = document.getElementById("themePaletteModal");
    if (!overlay) return;

    const theme = ThemeManager.THEMES?.[themeName];
    if (!theme?.customizable) return;

    // Select the theme first so changes apply to dashboard immediately
    this.updateThemePickerActiveState(themeName);
    if (window.dashboard?.themes) {
      window.dashboard.themes.setTheme(themeName, false);
    }

    this._paletteModalTheme = themeName;
    this._paletteModalMode =
      window.dashboard?.themes?.getCurrentMode?.() || "dark";

    const resetBtn = document.getElementById("themePaletteResetDefaults");
    if (resetBtn) {
      const show = this._isThemePaletteResettable(themeName);
      resetBtn.style.display = show ? "inline-flex" : "none";
    }

    const title = document.getElementById("themePaletteModalTitle");
    if (title) {
      title.textContent = `🎨 Customize ${theme.name} Palette`;
    }

    this._themePaletteHasUnsavedPreview = false;
    this._toggleThemePaletteGlobalFontFields(themeName);

    this.updateThemePaletteModeButtons(this._paletteModalMode);
    this.syncThemePaletteModalInputs();

    overlay.classList.add("active");
    overlay.setAttribute("aria-hidden", "false");
  }

  closeThemePaletteModal() {
    this.flushThemePalettePreviewUpdates(true);

    const overlay = document.getElementById("themePaletteModal");
    if (!overlay) return;
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");

    this._paletteModalTheme = null;
    this._themePaletteHasUnsavedPreview = false;
  }

  _isThemePaletteResettable(themeName) {
    return (
      themeName === "pureWhite" ||
      themeName === "pureBlack" ||
      themeName === "userTheme"
    );
  }

  _isThemeWithGlobalFontPalette(themeName) {
    return (
      themeName === "pureWhite" ||
      themeName === "pureBlack" ||
      themeName === "userTheme"
    );
  }

  _getThemePaletteDefaultGlassTint(themeName, mode = "dark") {
    if (themeName === "pureBlack") return "#000000";
    if (themeName === "pureWhite") return "#ffffff";
    if (themeName === "userTheme") {
      return mode === "light" ? "#000000" : "#ffffff";
    }

    const primary = ThemeManager.THEMES?.[themeName]?.[mode]?.primary;
    return this._normalizeColorInputHex(primary, "#ffffff");
  }

  _getThemePaletteDefaultGlassBackground(themeName, mode = "dark") {
    const fallbackTint = this._getThemePaletteDefaultGlassTint(themeName, mode);
    const glassBg = ThemeManager.THEMES?.[themeName]?.[mode]?.glassBg;
    return this._normalizeColorInputHex(glassBg, fallbackTint);
  }

  _normalizeColorInputHex(value, fallbackHex) {
    if (typeof value !== "string") return fallbackHex;

    const normalized = value.trim().toLowerCase();
    if (/^#[a-f\d]{6}$/i.test(normalized)) return normalized;

    const shortMatch = normalized.match(/^#([a-f\d]{3})$/i);
    if (shortMatch) {
      const [r, g, b] = shortMatch[1].split("");
      return `#${r}${r}${g}${g}${b}${b}`;
    }

    const rgbaMatch = normalized
      .replace(/\s+/g, "")
      .match(/^rgba?\((\d+),(\d+),(\d+)(?:,[0-9.]+)?\)$/i);
    if (rgbaMatch) {
      const toHex = (channel) =>
        Math.max(0, Math.min(255, Number(channel)))
          .toString(16)
          .padStart(2, "0");
      return `#${toHex(rgbaMatch[1])}${toHex(rgbaMatch[2])}${toHex(
        rgbaMatch[3],
      )}`;
    }

    return fallbackHex;
  }

  _toggleThemePaletteGlobalFontFields(themeName) {
    const globalFontFields = document.getElementById(
      "themePaletteGlobalFontFields",
    );
    if (!globalFontFields) return;

    const supportsGlobalFontPalette =
      this._isThemeWithGlobalFontPalette(themeName);
    globalFontFields.classList.toggle("active", supportsGlobalFontPalette);
    globalFontFields.setAttribute(
      "aria-hidden",
      supportsGlobalFontPalette ? "false" : "true",
    );
  }

  scheduleThemePalettePreviewUpdate() {
    if (this._themePalettePreviewRaf) return;

    this._themePalettePreviewRaf = requestAnimationFrame(() => {
      this._themePalettePreviewRaf = null;
      this.applyThemePaletteFromModal(false, false);
      this._themePaletteHasUnsavedPreview = true;
    });
  }

  flushThemePalettePreviewUpdates(save = true) {
    if (this._themePalettePreviewRaf) {
      cancelAnimationFrame(this._themePalettePreviewRaf);
      this._themePalettePreviewRaf = null;
      this.applyThemePaletteFromModal(false, false);
      this._themePaletteHasUnsavedPreview = true;
    }

    if (save && this._themePaletteHasUnsavedPreview) {
      this.applyThemePaletteFromModal(true, true);
      this._themePaletteHasUnsavedPreview = false;
    }
  }

  updateThemePaletteModeButtons(mode) {
    const darkBtn = document.getElementById("themePaletteModeDark");
    const lightBtn = document.getElementById("themePaletteModeLight");
    if (darkBtn) darkBtn.classList.toggle("active", mode === "dark");
    if (lightBtn) lightBtn.classList.toggle("active", mode === "light");
  }

  syncThemePaletteModalInputs() {
    const themeName = this._paletteModalTheme;
    const mode = this._paletteModalMode || "dark";
    if (!themeName) return;

    const primaryEl = document.getElementById("themePalettePrimary");
    const onPrimaryEl = document.getElementById("themePaletteOnPrimaryText");
    const accentEl = document.getElementById("themePaletteAccent");
    const accentTextEl = document.getElementById("themePaletteAccentText");
    const bgEl = document.getElementById("themePaletteBackground");
    const glassBgEl = document.getElementById("themePaletteGlassBackground");
    const glassTintEl = document.getElementById("themePaletteGlassTint");
    const textPrimaryEl = document.getElementById("themePaletteTextPrimary");
    const textSecondaryEl = document.getElementById(
      "themePaletteTextSecondary",
    );
    const textMutedEl = document.getElementById("themePaletteTextMuted");
    const textPlaceholderEl = document.getElementById(
      "themePaletteTextPlaceholder",
    );
    if (
      !primaryEl ||
      !onPrimaryEl ||
      !accentEl ||
      !accentTextEl ||
      !bgEl ||
      !glassBgEl ||
      !glassTintEl
    )
      return;

    this._toggleThemePaletteGlobalFontFields(themeName);

    const base = ThemeManager.THEMES[themeName]?.[mode];
    if (!base) return;

    const palette =
      window.dashboard?.themes?.getCustomPalette?.(themeName, mode) || null;

    const defaultGlassTint = this._getThemePaletteDefaultGlassTint(
      themeName,
      mode,
    );
    const defaultGlassBackground = this._getThemePaletteDefaultGlassBackground(
      themeName,
      mode,
    );
    const resolvedPrimary = palette?.primary || base.primary;
    const defaultOnPrimaryText =
      palette?.onPrimaryText ||
      base.onPrimaryText ||
      (window.dashboard?.themes?._isDarkColor?.(resolvedPrimary)
        ? "#ffffff"
        : "#1a1a1a");
    const resolvedAccentBackground =
      palette?.accentBackground ||
      base.accentBackground ||
      palette?.accent ||
      base.accent;
    const resolvedAccentText =
      palette?.accentText || palette?.accent || base.accentText || base.accent;

    primaryEl.value = resolvedPrimary;
    onPrimaryEl.value = defaultOnPrimaryText;
    accentEl.value = this._normalizeColorInputHex(
      resolvedAccentBackground,
      base.accentBackground || base.accent,
    );
    accentTextEl.value = this._normalizeColorInputHex(
      resolvedAccentText,
      base.accentText || base.accent,
    );
    bgEl.value = palette?.bodyBg || base.bodyBg;
    glassBgEl.value = this._normalizeColorInputHex(
      palette?.glassBgColor || base.glassBg,
      defaultGlassBackground,
    );
    glassTintEl.value = palette?.glassTint || defaultGlassTint;

    if (
      this._isThemeWithGlobalFontPalette(themeName) &&
      textPrimaryEl &&
      textSecondaryEl &&
      textMutedEl &&
      textPlaceholderEl
    ) {
      const isDarkBackground =
        window.dashboard?.themes?._isDarkColor?.(
          palette?.bodyBg || base.bodyBg,
        ) || false;

      textPrimaryEl.value = this._normalizeColorInputHex(
        palette?.textPrimary || base.textPrimary,
        isDarkBackground ? "#ffffff" : "#1a1a1a",
      );
      textSecondaryEl.value = this._normalizeColorInputHex(
        palette?.textSecondary || base.textSecondary,
        isDarkBackground ? "#d9d9d9" : "#4d4d4d",
      );
      textMutedEl.value = this._normalizeColorInputHex(
        palette?.textMuted || base.textMuted,
        isDarkBackground ? "#9a9a9a" : "#7a7a7a",
      );
      textPlaceholderEl.value = this._normalizeColorInputHex(
        palette?.textPlaceholder ||
          base.textPlaceholder ||
          palette?.textMuted ||
          base.textMuted,
        isDarkBackground ? "#9a9a9a" : "#7a7a7a",
      );
    }
  }
});

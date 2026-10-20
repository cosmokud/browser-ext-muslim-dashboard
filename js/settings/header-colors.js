/**
 * SettingsManager: header text colour and glow controls.
 * Part of the class declared in js/settings/index.js; load this after it.
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
});

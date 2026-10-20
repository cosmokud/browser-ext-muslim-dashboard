/**
 * SettingsManager: theme panel and palette modal.
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

  resetThemePaletteToDefaults(save = true) {
    const themeName = this._paletteModalTheme;
    const mode = this._paletteModalMode || "dark";
    if (!themeName || !window.dashboard?.themes) return;

    if (!this._isThemePaletteResettable(themeName)) return;

    const base = ThemeManager.THEMES?.[themeName]?.[mode];
    if (!base) return;

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

    primaryEl.value = base.primary;
    onPrimaryEl.value =
      base.onPrimaryText ||
      (window.dashboard?.themes?._isDarkColor?.(base.primary)
        ? "#ffffff"
        : "#1a1a1a");
    accentEl.value = this._normalizeColorInputHex(
      base.accentBackground || base.accent,
      base.accent,
    );
    accentTextEl.value = this._normalizeColorInputHex(
      base.accentText || base.accent,
      base.accent,
    );
    bgEl.value = base.bodyBg;
    glassBgEl.value = this._getThemePaletteDefaultGlassBackground(
      themeName,
      mode,
    );
    glassTintEl.value = this._getThemePaletteDefaultGlassTint(themeName, mode);

    if (
      this._isThemeWithGlobalFontPalette(themeName) &&
      textPrimaryEl &&
      textSecondaryEl &&
      textMutedEl &&
      textPlaceholderEl
    ) {
      textPrimaryEl.value = this._normalizeColorInputHex(
        base.textPrimary,
        "#ffffff",
      );
      textSecondaryEl.value = this._normalizeColorInputHex(
        base.textSecondary,
        "#d9d9d9",
      );
      textMutedEl.value = this._normalizeColorInputHex(
        base.textMuted,
        "#9a9a9a",
      );
      textPlaceholderEl.value = this._normalizeColorInputHex(
        base.textPlaceholder || base.textMuted,
        "#9a9a9a",
      );
    }

    this.applyThemePaletteFromModal(save);
    this.renderThemePickerGrid();
  }

  applyThemePaletteFromModal(save = true, renderGrid = true) {
    const themeName = this._paletteModalTheme;
    const mode = this._paletteModalMode || "dark";
    if (!themeName || !window.dashboard?.themes) return;

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

    const accentBackground = accentEl.value;
    const accentText = accentTextEl.value;

    const palette = {
      primary: primaryEl.value,
      onPrimaryText: onPrimaryEl.value,
      accent: accentText,
      accentText,
      accentBackground,
      bodyBg: bgEl.value,
      glassBgColor: glassBgEl.value,
      glassTint: glassTintEl.value,
    };

    if (
      this._isThemeWithGlobalFontPalette(themeName) &&
      textPrimaryEl &&
      textSecondaryEl &&
      textMutedEl &&
      textPlaceholderEl
    ) {
      palette.textPrimary = textPrimaryEl.value;
      palette.textSecondary = textSecondaryEl.value;
      palette.textMuted = textMutedEl.value;
      palette.textPlaceholder = textPlaceholderEl.value;
    }

    window.dashboard.themes.setCustomPalette(themeName, mode, palette, save);

    if (renderGrid) {
      this.renderThemePickerGrid();
    }
  }

  updateThemePickerActiveState(activeTheme) {
    if (!this.themePickerGrid) return;

    const cards = this.themePickerGrid.querySelectorAll(".theme-card");
    cards.forEach((card) => {
      const themeName = card.dataset.theme;
      card.classList.toggle("active", themeName === activeTheme);
    });
  }
});

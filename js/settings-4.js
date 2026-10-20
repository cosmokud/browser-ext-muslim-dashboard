/**
 * SettingsManager, part 4 of 9.
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

  setupThemePanelEventListeners() {
    // Theme mode buttons
    this.themeModeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.mode;
        this.updateThemeModeButtons(mode);

        // Apply theme mode immediately
        if (window.dashboard?.themes) {
          window.dashboard.themes.setMode(mode, false);
        }

        // Re-render theme picker with new mode colors
        this.renderThemePickerGrid();

        this.scheduleAutoSave(120);
      });
    });

    // Glass enabled toggle
    if (this.themeGlassEnabled) {
      this.themeGlassEnabled.addEventListener("change", () => {
        const enabled = this.themeGlassEnabled.checked;
        this.updateThemeBlurGroupState(enabled);

        // Apply glass toggle immediately
        if (window.dashboard?.themes) {
          window.dashboard.themes.setGlassEnabled(enabled, false);
        }

        // Notify cards with "dashboard" blur state to update
        try {
          document.dispatchEvent(new CustomEvent("md:glass-setting-changed"));
        } catch (e) {}
      });
    }

    const themeSliderDefaults = {
      blurPower: 100,
      glassOpacity: 50,
      componentOpacity: 0,
      modalOpacity: 97,
    };
    const themeSliderDebounceMs = 120;

    const scheduleThemeSliderUpdate = (key, callback) => {
      if (this._themeSliderDebounceTimers[key]) {
        clearTimeout(this._themeSliderDebounceTimers[key]);
      }
      this._themeSliderDebounceTimers[key] = setTimeout(() => {
        this._themeSliderDebounceTimers[key] = null;
        callback();
      }, themeSliderDebounceMs);
    };

    const flushThemeSliderUpdate = (key, callback) => {
      if (this._themeSliderDebounceTimers[key]) {
        clearTimeout(this._themeSliderDebounceTimers[key]);
        this._themeSliderDebounceTimers[key] = null;
      }
      callback();
    };

    const applyThemeGlassOpacity = (opacity) => {
      if (window.dashboard?.themes?.setGlassOpacity) {
        window.dashboard.themes.setGlassOpacity(opacity, false);
      }

      try {
        document.dispatchEvent(new CustomEvent("md:glass-setting-changed"));
      } catch (e) {}
    };

    const applyThemeComponentOpacity = (opacity) => {
      if (window.dashboard?.themes?.setMainGridComponentOpacity) {
        window.dashboard.themes.setMainGridComponentOpacity(opacity, false);
      }
    };

    const applyThemeModalOpacity = (opacity) => {
      if (window.dashboard?.themes?.setModalOpacity) {
        window.dashboard.themes.setModalOpacity(opacity, false);
      }
    };

    // Blur power slider
    if (this.themeBlurPower) {
      this.themeBlurPower.addEventListener("input", () => {
        this.updateThemeBlurPowerLabel();
        const power = parseInt(this.themeBlurPower.value, 10);
        scheduleThemeSliderUpdate("blurPower", () =>
          this.applyUiBlurPower(power),
        );
      });

      this.themeBlurPower.addEventListener("change", () => {
        this.updateThemeBlurPowerLabel();
        const power = parseInt(this.themeBlurPower.value, 10);
        flushThemeSliderUpdate("blurPower", () => this.applyUiBlurPower(power));
      });

      this.themeBlurPower.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        this.themeBlurPower.value = String(themeSliderDefaults.blurPower);
        this.updateThemeBlurPowerLabel();
        const power = parseInt(this.themeBlurPower.value, 10);
        flushThemeSliderUpdate("blurPower", () => this.applyUiBlurPower(power));
        this.scheduleAutoSave(120);
      });
    }

    // Glass opacity slider
    if (this.themeGlassOpacity) {
      this.themeGlassOpacity.addEventListener("input", () => {
        this.updateThemeGlassOpacityLabel();
        const opacity = parseInt(this.themeGlassOpacity.value, 10);
        scheduleThemeSliderUpdate("glassOpacity", () =>
          applyThemeGlassOpacity(opacity),
        );
      });

      this.themeGlassOpacity.addEventListener("change", () => {
        this.updateThemeGlassOpacityLabel();
        const opacity = parseInt(this.themeGlassOpacity.value, 10);
        flushThemeSliderUpdate("glassOpacity", () =>
          applyThemeGlassOpacity(opacity),
        );
      });

      this.themeGlassOpacity.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        this.themeGlassOpacity.value = String(themeSliderDefaults.glassOpacity);
        this.updateThemeGlassOpacityLabel();
        const opacity = parseInt(this.themeGlassOpacity.value, 10);
        flushThemeSliderUpdate("glassOpacity", () =>
          applyThemeGlassOpacity(opacity),
        );
        this.scheduleAutoSave(120);
      });
    }

    // Component-only opacity slider
    if (this.themeComponentOpacity) {
      this.themeComponentOpacity.addEventListener("input", () => {
        this.updateThemeComponentOpacityLabel();
        const opacity = parseInt(this.themeComponentOpacity.value, 10);

        scheduleThemeSliderUpdate("componentOpacity", () =>
          applyThemeComponentOpacity(opacity),
        );
      });

      this.themeComponentOpacity.addEventListener("change", () => {
        this.updateThemeComponentOpacityLabel();
        const opacity = parseInt(this.themeComponentOpacity.value, 10);
        flushThemeSliderUpdate("componentOpacity", () =>
          applyThemeComponentOpacity(opacity),
        );
      });

      this.themeComponentOpacity.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        this.themeComponentOpacity.value = String(
          themeSliderDefaults.componentOpacity,
        );
        this.updateThemeComponentOpacityLabel();
        const opacity = parseInt(this.themeComponentOpacity.value, 10);
        flushThemeSliderUpdate("componentOpacity", () =>
          applyThemeComponentOpacity(opacity),
        );
        this.scheduleAutoSave(120);
      });
    }

    // Theme picker cards
    if (this.themePickerGrid) {
      this.themePickerGrid.addEventListener("click", (e) => {
        // Check if clicking on customize button
        const customizeBtn = e.target.closest(".theme-card-customize");
        if (customizeBtn) {
          e.stopPropagation();
          const card = customizeBtn.closest(".theme-card");
          const themeName = card?.dataset?.theme;
          if (themeName) this.openThemePaletteModal(themeName);
          return;
        }

        const card = e.target.closest(".theme-card");
        if (!card) return;

        const themeName = card.dataset.theme;
        this.updateThemePickerActiveState(themeName);

        // Apply theme immediately
        if (window.dashboard?.themes) {
          window.dashboard.themes.setTheme(themeName, false);
        }

        // Re-render to update preview colors
        this.renderThemePickerGrid();

        this.scheduleAutoSave(120);
      });
    }

    // Theme palette modal event listeners
    const paletteOverlay = document.getElementById("themePaletteModal");
    const paletteClose = document.getElementById("themePaletteClose");
    const paletteDone = document.getElementById("themePaletteDone");
    const paletteReset = document.getElementById("themePaletteResetDefaults");
    const modeDark = document.getElementById("themePaletteModeDark");
    const modeLight = document.getElementById("themePaletteModeLight");
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

    if (paletteOverlay) {
      this._bindOverlayCloseBehavior(paletteOverlay, () =>
        this.closeThemePaletteModal(),
      );
    }
    if (paletteClose) {
      paletteClose.addEventListener("click", () =>
        this.closeThemePaletteModal(),
      );
    }
    if (paletteDone) {
      paletteDone.addEventListener("click", () =>
        this.closeThemePaletteModal(),
      );
    }
    if (paletteReset) {
      paletteReset.addEventListener("click", () =>
        this.resetThemePaletteToDefaults(true),
      );
    }
    if (modeDark) {
      modeDark.addEventListener("click", () => {
        this.flushThemePalettePreviewUpdates(true);
        this._paletteModalMode = "dark";
        this.updateThemePaletteModeButtons("dark");
        this.syncThemePaletteModalInputs();
      });
    }
    if (modeLight) {
      modeLight.addEventListener("click", () => {
        this.flushThemePalettePreviewUpdates(true);
        this._paletteModalMode = "light";
        this.updateThemePaletteModeButtons("light");
        this.syncThemePaletteModalInputs();
      });
    }

    const onPalettePreviewInput = () =>
      this.scheduleThemePalettePreviewUpdate();
    const onPaletteCommit = () => this.flushThemePalettePreviewUpdates(true);

    if (primaryEl) {
      primaryEl.addEventListener("input", onPalettePreviewInput);
      primaryEl.addEventListener("change", onPaletteCommit);
    }
    if (onPrimaryEl) {
      onPrimaryEl.addEventListener("input", onPalettePreviewInput);
      onPrimaryEl.addEventListener("change", onPaletteCommit);
    }
    if (accentEl) {
      accentEl.addEventListener("input", onPalettePreviewInput);
      accentEl.addEventListener("change", onPaletteCommit);
    }
    if (accentTextEl) {
      accentTextEl.addEventListener("input", onPalettePreviewInput);
      accentTextEl.addEventListener("change", onPaletteCommit);
    }
    if (bgEl) {
      bgEl.addEventListener("input", onPalettePreviewInput);
      bgEl.addEventListener("change", onPaletteCommit);
    }
    if (glassBgEl) {
      glassBgEl.addEventListener("input", onPalettePreviewInput);
      glassBgEl.addEventListener("change", onPaletteCommit);
    }
    if (glassTintEl) {
      glassTintEl.addEventListener("input", onPalettePreviewInput);
      glassTintEl.addEventListener("change", onPaletteCommit);
    }
    if (textPrimaryEl) {
      textPrimaryEl.addEventListener("input", onPalettePreviewInput);
      textPrimaryEl.addEventListener("change", onPaletteCommit);
    }
    if (textSecondaryEl) {
      textSecondaryEl.addEventListener("input", onPalettePreviewInput);
      textSecondaryEl.addEventListener("change", onPaletteCommit);
    }
    if (textMutedEl) {
      textMutedEl.addEventListener("input", onPalettePreviewInput);
      textMutedEl.addEventListener("change", onPaletteCommit);
    }
    if (textPlaceholderEl) {
      textPlaceholderEl.addEventListener("input", onPalettePreviewInput);
      textPlaceholderEl.addEventListener("change", onPaletteCommit);
    }

    // Container width (in Themes panel)
    if (this.themeContainerWidth) {
      this.themeContainerWidth.addEventListener("change", (e) => {
        this.toggleThemeCustomWidth(e.target.value === "custom");
        this.applyContainerWidth(
          e.target.value,
          parseInt(this.themeContainerWidthCustom?.value, 10) || 70,
        );
      });
    }

    // Custom width slider (in Themes panel)
    if (this.themeContainerWidthCustom) {
      this.themeContainerWidthCustom.addEventListener("input", () => {
        this.updateThemeCustomWidthLabel();
        this.applyContainerWidth(
          this.themeContainerWidth?.value === "custom"
            ? "custom"
            : this.themeContainerWidth?.value,
          parseInt(this.themeContainerWidthCustom.value, 10),
        );
      });
    }

    if (this.themePerformanceModeEnabled) {
      this.themePerformanceModeEnabled.addEventListener("change", () => {
        this.applyDashboardQualityState("performance");
      });
    }

    if (this.themeHighestVisualFidelityEnabled) {
      this.themeHighestVisualFidelityEnabled.addEventListener("change", () => {
        this.applyDashboardQualityState("highest");
      });
    }

    // Modal panel opacity slider
    if (this.themeModalOpacity) {
      this.themeModalOpacity.addEventListener("input", () => {
        this.updateThemeModalOpacityLabel();
        const opacity = parseInt(this.themeModalOpacity.value, 10);

        scheduleThemeSliderUpdate("modalOpacity", () =>
          applyThemeModalOpacity(opacity),
        );
      });

      this.themeModalOpacity.addEventListener("change", () => {
        this.updateThemeModalOpacityLabel();
        const opacity = parseInt(this.themeModalOpacity.value, 10);
        flushThemeSliderUpdate("modalOpacity", () =>
          applyThemeModalOpacity(opacity),
        );
      });

      this.themeModalOpacity.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        this.themeModalOpacity.value = String(themeSliderDefaults.modalOpacity);
        this.updateThemeModalOpacityLabel();
        const opacity = parseInt(this.themeModalOpacity.value, 10);
        flushThemeSliderUpdate("modalOpacity", () =>
          applyThemeModalOpacity(opacity),
        );
        this.scheduleAutoSave(120);
      });
    }

    if (this.themeBackgroundAwareFontColorEnabled) {
      this.themeBackgroundAwareFontColorEnabled.addEventListener("change", () => {
        const enabled = this.themeBackgroundAwareFontColorEnabled.checked;
        window.dashboard?.themes?.setBackgroundAwareFontColorEnabled?.(
          enabled,
          false,
        );
      });
    }
  }

  saveThemeSettings(settings) {
    // Get current mode from buttons
    let mode = "dark";
    this.themeModeButtons.forEach((btn) => {
      if (btn.classList.contains("active")) {
        mode = btn.dataset.mode;
      }
    });

    // Get glass enabled
    const glassEnabled = this.themeGlassEnabled?.checked !== false;
    const glassOpacity = SettingsRegistry.coerce(
      "glassOpacity",
      parseInt(this.themeGlassOpacity?.value, 10),
    );
    const componentOpacity = SettingsRegistry.coerce(
      "componentOpacity",
      parseInt(this.themeComponentOpacity?.value, 10),
    );
    const modalOpacity = SettingsRegistry.coerce(
      "modalOpacity",
      parseInt(this.themeModalOpacity?.value, 10),
    );
    const backgroundAwareFontColorEnabled =
      this.themeBackgroundAwareFontColorEnabled?.checked === true;
    // Get active theme
    let activeTheme = "emerald";
    const activeCard =
      this.themePickerGrid?.querySelector(".theme-card.active");
    if (activeCard) {
      activeTheme = activeCard.dataset.theme;
    }

    const customAccent = window.dashboard?.themes?.getCustomAccent?.() || null;
    const customPalettes =
      window.dashboard?.themes?.getCustomPalettes?.() ||
      settings.theme?.customPalettes ||
      {};
    const dashboardQualityState = this.resolveDashboardQualityState(
      this.themePerformanceModeEnabled?.checked === true,
      this.themeHighestVisualFidelityEnabled?.checked === true,
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

    // Save theme settings
    settings.theme = {
      name: activeTheme,
      mode: mode,
      glassEnabled: glassEnabled,
      glassOpacity: glassOpacity,
      componentOpacity: componentOpacity,
      modalOpacity: modalOpacity,
      backgroundAwareFontColorEnabled: backgroundAwareFontColorEnabled,
      highestVisualFidelityEnabled:
        dashboardQualityState.highestVisualFidelityEnabled,
      customAccent: customAccent,
      customPalettes: customPalettes,
    };

    // Save blur power (now from Themes panel)
    settings.uiBlurPower = SettingsRegistry.coerce(
      "uiBlurPower",
      parseInt(this.themeBlurPower?.value, 10),
    );

    // Save container width only when a width control is present in the UI.
    if (this.themeContainerWidth) {
      settings.containerWidth = this.themeContainerWidth.value || "narrow";
      if (settings.containerWidth === "custom") {
        settings.containerWidthCustom = SettingsRegistry.coerce(
          "containerWidthCustom",
          parseInt(this.themeContainerWidthCustom?.value, 10),
        );
      }
    }

    settings.performanceModeEnabled =
      dashboardQualityState.performanceModeEnabled;

    // Apply theme manager settings only when values actually changed.
    const themeManager = window.dashboard?.themes;
    if (themeManager) {
      const currentTheme =
        typeof themeManager.getCurrentTheme === "function"
          ? themeManager.getCurrentTheme()
          : null;
      const currentMode =
        typeof themeManager.getCurrentMode === "function"
          ? themeManager.getCurrentMode()
          : null;
      const currentGlassEnabled =
        typeof themeManager.isGlassEnabled === "function"
          ? themeManager.isGlassEnabled()
          : null;
      const currentGlassOpacity =
        typeof themeManager.getGlassOpacity === "function"
          ? themeManager.getGlassOpacity()
          : null;
      const currentComponentOpacity =
        typeof themeManager.getMainGridComponentOpacity === "function"
          ? themeManager.getMainGridComponentOpacity()
          : null;
      const currentModalOpacity =
        typeof themeManager.getModalOpacity === "function"
          ? themeManager.getModalOpacity()
          : null;

      if (
        currentTheme !== activeTheme &&
        typeof themeManager.setTheme === "function"
      ) {
        themeManager.setTheme(activeTheme, false);
      }

      if (currentMode !== mode && typeof themeManager.setMode === "function") {
        themeManager.setMode(mode, false);
      }

      if (
        currentGlassEnabled !== glassEnabled &&
        typeof themeManager.setGlassEnabled === "function"
      ) {
        themeManager.setGlassEnabled(glassEnabled, false);
      }

      if (
        currentGlassOpacity !== glassOpacity &&
        typeof themeManager.setGlassOpacity === "function"
      ) {
        themeManager.setGlassOpacity(glassOpacity, false);
      }

      if (
        currentComponentOpacity !== componentOpacity &&
        typeof themeManager.setMainGridComponentOpacity === "function"
      ) {
        themeManager.setMainGridComponentOpacity(componentOpacity, false);
      }

      if (
        currentModalOpacity !== modalOpacity &&
        typeof themeManager.setModalOpacity === "function"
      ) {
        themeManager.setModalOpacity(modalOpacity, false);
      }

      if (
        typeof themeManager.setBackgroundAwareFontColorEnabled === "function"
      ) {
        themeManager.setBackgroundAwareFontColorEnabled(
          backgroundAwareFontColorEnabled,
          false,
        );
      }

      if (typeof window.dashboard.applyHeadingSettings === "function") {
        window.dashboard.applyHeadingSettings();
      }
    }
  }

  updateMethodAnglesDisplay() {
    const method = this.calculationMethod?.value || "MWL";

    if (method === "Custom") {
      if (this.methodAnglesInfo) this.methodAnglesInfo.style.display = "none";
      return;
    }

    // Get method params from PrayTimes
    const prayTimes = new PrayTimes(method);
    const params = prayTimes.methods[method]?.params || { fajr: 18, isha: 17 };

    if (this.methodFajrAngle) {
      this.methodFajrAngle.textContent = params.fajr + "°";
    }
    if (this.methodIshaAngle) {
      const ishaValue =
        typeof params.isha === "string" ? params.isha : params.isha + "°";
      this.methodIshaAngle.textContent = ishaValue;
    }
    if (this.methodAnglesInfo) {
      this.methodAnglesInfo.style.display = "block";
    }
  }

  normalizeBackgroundImageUrl(url) {
    return String(url || "").trim();
  }

  normalizeBackgroundImageImportUrl(url) {
    const raw = this.normalizeBackgroundImageUrl(url);
    if (!raw) return "";

    let normalized = raw;
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    }

    let parsed = null;
    try {
      parsed = new URL(normalized);
    } catch (e) {
      return "";
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }

    return parsed.href;
  }

  isRemoteBackgroundImageUrl(url) {
    const normalized = this.normalizeBackgroundImageUrl(url);
    return /^https?:\/\//i.test(normalized);
  }

  isValidCustomBackgroundReference(value) {
    const normalized = this.normalizeBackgroundImageUrl(value);
    if (!normalized) return false;

    return (
      this.isCustomBackgroundToken(normalized) ||
      normalized.startsWith("data:image") ||
      this.isRemoteBackgroundImageUrl(normalized)
    );
  }

  normalizeSolidColorHex(value) {
    let raw = String(value || "").trim();
    if (!raw) return "";

    if (raw.toLowerCase().startsWith(this._solidBackgroundUrlPrefix)) {
      raw = raw.slice(this._solidBackgroundUrlPrefix.length);
    }

    if (!raw.startsWith("#")) {
      raw = `#${raw}`;
    }

    const shortMatch = raw.match(/^#([0-9a-fA-F]{3})$/);
    if (shortMatch) {
      const [r, g, b] = shortMatch[1].split("");
      raw = `#${r}${r}${g}${g}${b}${b}`;
    }

    const fullMatch = raw.match(/^#([0-9a-fA-F]{6})$/);
    if (!fullMatch) return "";

    return `#${fullMatch[1].toUpperCase()}`;
  }

  isSolidColorBackgroundUrl(value) {
    const normalized = this.normalizeBackgroundImageUrl(value);
    return normalized.toLowerCase().startsWith(this._solidBackgroundUrlPrefix);
  }

  solidColorHexToBackgroundUrl(value) {
    const hex = this.normalizeSolidColorHex(value);
    if (!hex) return "";
    return `${this._solidBackgroundUrlPrefix}${hex}`;
  }

  solidColorBackgroundUrlToHex(value) {
    const normalized = this.normalizeBackgroundImageUrl(value);
    if (!this.isSolidColorBackgroundUrl(normalized)) {
      return "";
    }

    return this.normalizeSolidColorHex(
      normalized.slice(this._solidBackgroundUrlPrefix.length),
    );
  }

  normalizeBackgroundCategory(category) {
    const normalized = String(category || "").trim();
    if (!normalized) return "all";

    if (
      normalized === "allWithCustom" ||
      normalized === "allNoCustom" ||
      normalized === "all"
    ) {
      return "all";
    }

    return normalized;
  }

  normalizeBackgroundDisplayMode(mode) {
    const normalized = String(mode || "")
      .trim()
      .toLowerCase();
    const allowed = new Set([
      "fill",
      "fit",
      "stretch",
      "tile",
      "center",
      "span",
    ]);
    return allowed.has(normalized) ? normalized : "fill";
  }

  normalizeBackgroundDim(value, fallback = 100) {
    return SettingsRegistry.coerce("bgDim", parseInt(value, 10), fallback);
  }

  normalizeBackgroundBlur(value, fallback = 0) {
    return SettingsRegistry.coerce("bgBlur", parseInt(value, 10), fallback);
  }

  isCustomBackgroundToken(value) {
    const normalized = this.normalizeBackgroundImageUrl(value);
    const prefix = this._customBackgroundTokenPrefix || "mdcbg:id:";
    return normalized.startsWith(prefix) && normalized.length > prefix.length;
  }

  getCustomBackgroundTokenById(id) {
    const normalized = String(id || "").trim();
    if (!/^[a-z0-9_\-]+$/i.test(normalized)) return "";
    const prefix = this._customBackgroundTokenPrefix || "mdcbg:id:";
    return `${prefix}${normalized}`;
  }

  getCustomBackgroundIdFromToken(token) {
    const normalized = this.normalizeBackgroundImageUrl(token);
    if (!this.isCustomBackgroundToken(normalized)) return "";

    const prefix = this._customBackgroundTokenPrefix || "mdcbg:id:";
    return normalized.slice(prefix.length);
  }

  isCustomBackgroundMediaStoreAvailable() {
    return (
      typeof window !== "undefined" && typeof window.indexedDB !== "undefined"
    );
  }

  customBackgroundDbRequestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error || new Error("IndexedDB request failed"));
    });
  }

  customBackgroundTxDonePromise(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () =>
        reject(tx.error || new Error("IndexedDB transaction aborted"));
      tx.onerror = () =>
        reject(tx.error || new Error("IndexedDB transaction failed"));
    });
  }

  openCustomBackgroundMediaDb() {
    if (!this.isCustomBackgroundMediaStoreAvailable()) {
      return Promise.resolve(null);
    }

    if (this._customBackgroundMediaDbPromise) {
      return this._customBackgroundMediaDbPromise;
    }

    this._customBackgroundMediaDbPromise = new Promise((resolve) => {
      const request = window.indexedDB.open(
        this._customBackgroundMediaDbName,
        1,
      );

      request.onupgradeneeded = (event) => {
        const db = event.target?.result;
        if (!db) return;

        if (
          !db.objectStoreNames.contains(this._customBackgroundMediaStoreName)
        ) {
          const store = db.createObjectStore(
            this._customBackgroundMediaStoreName,
            {
              keyPath: "id",
            },
          );
          store.createIndex("updatedAt", "updatedAt", { unique: false });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        if (!db) {
          resolve(null);
          return;
        }

        db.onversionchange = () => {
          try {
            db.close();
          } catch (e) {}
          this._customBackgroundMediaDbPromise = null;
        };

        resolve(db);
      };

      request.onerror = () => {
        this._customBackgroundMediaDbPromise = null;
        resolve(null);
      };
    });

    return this._customBackgroundMediaDbPromise;
  }

  getCustomBackgroundMediaId(imageDataUrl) {
    const normalized = this.normalizeBackgroundImageUrl(imageDataUrl);
    if (!normalized) return "";

    let hash = 2166136261;
    for (let i = 0; i < normalized.length; i += 1) {
      hash ^= normalized.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    const safeHash = Math.abs(hash >>> 0).toString(36);
    return `cbg_${safeHash}_${normalized.length.toString(36)}`;
  }

  async loadCustomBackgroundMediaFromIndexedDb({ force = false } = {}) {
    if (this._customBackgroundMediaLoaded && !force) {
      return this._customBackgroundThumbByImageUrl;
    }

    if (this._customBackgroundMediaLoadPromise && !force) {
      return this._customBackgroundMediaLoadPromise;
    }

    this._customBackgroundMediaLoadPromise = (async () => {
      if (force) {
        this._customBackgroundThumbByImageUrl.clear();
        this._customBackgroundImageByToken.clear();
      }

      const db = await this.openCustomBackgroundMediaDb();
      if (!db) {
        this._customBackgroundMediaLoaded = true;
        return this._customBackgroundThumbByImageUrl;
      }

      try {
        const tx = db.transaction(
          this._customBackgroundMediaStoreName,
          "readonly",
        );
        const store = tx.objectStore(this._customBackgroundMediaStoreName);
        const records = await this.customBackgroundDbRequestToPromise(
          store.getAll(),
        );

        this._customBackgroundThumbByImageUrl.clear();
        this._customBackgroundImageByToken.clear();
        (Array.isArray(records) ? records : []).forEach((record) => {
          const id = String(record?.id || "").trim();
          const token = this.getCustomBackgroundTokenById(id);
          const imageDataUrl = this.normalizeBackgroundImageUrl(
            record?.imageDataUrl,
          );
          const thumbnailDataUrl = this.normalizeBackgroundImageUrl(
            record?.thumbnailDataUrl,
          );

          if (
            !token ||
            !imageDataUrl ||
            !imageDataUrl.startsWith("data:image")
          ) {
            return;
          }

          const resolvedThumb =
            thumbnailDataUrl && thumbnailDataUrl.startsWith("data:image")
              ? thumbnailDataUrl
              : imageDataUrl;

          this._customBackgroundImageByToken.set(token, imageDataUrl);
          this._customBackgroundThumbByImageUrl.set(token, resolvedThumb);
          this._customBackgroundThumbByImageUrl.set(
            imageDataUrl,
            resolvedThumb,
          );
          this._backgroundThumbUrlCache?.set(token, resolvedThumb);
          this._backgroundThumbUrlCache?.set(imageDataUrl, resolvedThumb);
        });

        this._customBackgroundMediaLoaded = true;
      } catch (e) {
        // Ignore IndexedDB read failures and keep graceful fallback.
        this._customBackgroundMediaLoaded = true;
      }

      return this._customBackgroundThumbByImageUrl;
    })().finally(() => {
      this._customBackgroundMediaLoadPromise = null;
    });

    return this._customBackgroundMediaLoadPromise;
  }

  async saveCustomBackgroundMediaToIndexedDb(imageDataUrl, thumbnailDataUrl) {
    const normalizedImage = this.normalizeBackgroundImageUrl(imageDataUrl);
    if (!normalizedImage || !normalizedImage.startsWith("data:image")) {
      return "";
    }

    const normalizedThumb = this.normalizeBackgroundImageUrl(thumbnailDataUrl);
    const resolvedThumb =
      normalizedThumb && normalizedThumb.startsWith("data:image")
        ? normalizedThumb
        : normalizedImage;

    const db = await this.openCustomBackgroundMediaDb();
    const id = this.getCustomBackgroundMediaId(normalizedImage);
    const token = this.getCustomBackgroundTokenById(id);
    if (!id || !token) {
      return "";
    }

    if (!db) {
      this._customBackgroundImageByToken.set(token, normalizedImage);
      this._customBackgroundThumbByImageUrl.set(token, resolvedThumb);
      this._customBackgroundThumbByImageUrl.set(normalizedImage, resolvedThumb);
      this._backgroundThumbUrlCache?.set(token, resolvedThumb);
      this._backgroundThumbUrlCache?.set(normalizedImage, resolvedThumb);
      return token;
    }

    try {
      const tx = db.transaction(
        this._customBackgroundMediaStoreName,
        "readwrite",
      );
      const store = tx.objectStore(this._customBackgroundMediaStoreName);
      const existing = await this.customBackgroundDbRequestToPromise(
        store.get(id),
      ).catch(() => null);
      const now = Date.now();

      store.put({
        id,
        imageDataUrl: normalizedImage,
        thumbnailDataUrl: resolvedThumb,
        createdAt:
          Number.isFinite(existing?.createdAt) && existing.createdAt > 0
            ? existing.createdAt
            : now,
        updatedAt: now,
      });

      await this.customBackgroundTxDonePromise(tx);

      this._customBackgroundImageByToken.set(token, normalizedImage);
      this._customBackgroundThumbByImageUrl.set(token, resolvedThumb);
      this._customBackgroundThumbByImageUrl.set(normalizedImage, resolvedThumb);
      this._backgroundThumbUrlCache?.set(token, resolvedThumb);
      this._backgroundThumbUrlCache?.set(normalizedImage, resolvedThumb);
      return token;
    } catch (e) {
      this._customBackgroundImageByToken.set(token, normalizedImage);
      this._customBackgroundThumbByImageUrl.set(token, resolvedThumb);
      this._customBackgroundThumbByImageUrl.set(normalizedImage, resolvedThumb);
      this._backgroundThumbUrlCache?.set(token, resolvedThumb);
      this._backgroundThumbUrlCache?.set(normalizedImage, resolvedThumb);
      return token;
    }
  }

  async deleteCustomBackgroundMediaByToken(token) {
    const normalizedToken = this.normalizeBackgroundImageUrl(token);
    if (!this.isCustomBackgroundToken(normalizedToken)) {
      return false;
    }

    const mediaId = this.getCustomBackgroundIdFromToken(normalizedToken);
    const mappedImage = this.normalizeBackgroundImageUrl(
      this._customBackgroundImageByToken?.get(normalizedToken),
    );
    const mappedThumb = this.normalizeBackgroundImageUrl(
      this._customBackgroundThumbByImageUrl?.get(normalizedToken),
    );

    this._customBackgroundImageByToken?.delete(normalizedToken);
    this._customBackgroundThumbByImageUrl?.delete(normalizedToken);
    this._backgroundThumbUrlCache?.delete(normalizedToken);

    if (mappedImage) {
      this._customBackgroundThumbByImageUrl?.delete(mappedImage);
      this._backgroundThumbUrlCache?.delete(mappedImage);
    }

    if (mappedThumb) {
      this._backgroundThumbUrlCache?.delete(mappedThumb);
    }

    if (!mediaId) {
      return true;
    }

    const db = await this.openCustomBackgroundMediaDb();
    if (!db) {
      return true;
    }

    try {
      const tx = db.transaction(
        this._customBackgroundMediaStoreName,
        "readwrite",
      );
      const store = tx.objectStore(this._customBackgroundMediaStoreName);
      store.delete(mediaId);
      await this.customBackgroundTxDonePromise(tx);
      return true;
    } catch (e) {
      return false;
    }
  }

  async clearCustomBackgroundMediaIndexedDb() {
    this._customBackgroundThumbByImageUrl.clear();
    this._customBackgroundImageByToken.clear();

    const db = await this.openCustomBackgroundMediaDb();
    if (!db) return;

    try {
      const tx = db.transaction(
        this._customBackgroundMediaStoreName,
        "readwrite",
      );
      const store = tx.objectStore(this._customBackgroundMediaStoreName);
      store.clear();
      await this.customBackgroundTxDonePromise(tx);
    } catch (e) {
      // ignore clear failures
    }
  }

  async buildCustomBackgroundThumbnailDataUrl(imageDataUrl) {
    const normalized = this.normalizeBackgroundImageUrl(imageDataUrl);
    if (!normalized || !normalized.startsWith("data:image")) {
      return "";
    }

    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        try {
          const targetWidth = 320;
          const targetHeight = 200;
          const srcWidth = img.naturalWidth || img.width || targetWidth;
          const srcHeight = img.naturalHeight || img.height || targetHeight;

          const scale = Math.max(
            targetWidth / srcWidth,
            targetHeight / srcHeight,
          );
          const drawWidth = srcWidth * scale;
          const drawHeight = srcHeight * scale;
          const offsetX = Math.round((targetWidth - drawWidth) / 2);
          const offsetY = Math.round((targetHeight - drawHeight) / 2);

          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(normalized);
            return;
          }

          ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
          const thumbDataUrl = canvas.toDataURL("image/jpeg", 0.78);
          resolve(this.normalizeBackgroundImageUrl(thumbDataUrl) || normalized);
        } catch (e) {
          resolve(normalized);
        }
      };

      img.onerror = () => resolve(normalized);
      img.src = normalized;
    });
  }

  async syncCustomBackgroundMediaFromSettings(settings = null) {
    if (this._customBackgroundMediaSyncPromise) {
      return this._customBackgroundMediaSyncPromise;
    }

    const resolvedSettings =
      settings && typeof settings === "object"
        ? settings
        : this.storage.getSettings();

    this._customBackgroundMediaSyncPromise = (async () => {
      await this.loadCustomBackgroundMediaFromIndexedDb();

      const rawEntries = Array.isArray(resolvedSettings?.customBackgrounds)
        ? resolvedSettings.customBackgrounds
        : [];
      const replacementMap = new Map();
      const normalizedRefs = [];
      const seenRefs = new Set();

      for (const entry of rawEntries) {
        const normalizedEntry = this.normalizeBackgroundImageUrl(entry);
        if (!normalizedEntry) continue;

        if (this.isCustomBackgroundToken(normalizedEntry)) {
          if (seenRefs.has(normalizedEntry)) continue;
          seenRefs.add(normalizedEntry);
          normalizedRefs.push(normalizedEntry);
          continue;
        }

        if (this.isRemoteBackgroundImageUrl(normalizedEntry)) {
          if (seenRefs.has(normalizedEntry)) continue;
          seenRefs.add(normalizedEntry);
          normalizedRefs.push(normalizedEntry);
          continue;
        }

        if (!normalizedEntry.startsWith("data:image")) {
          continue;
        }

        const thumbnailDataUrl =
          await this.buildCustomBackgroundThumbnailDataUrl(normalizedEntry);
        const token = await this.saveCustomBackgroundMediaToIndexedDb(
          normalizedEntry,
          thumbnailDataUrl,
        );
        if (!token) continue;

        replacementMap.set(normalizedEntry, token);
        if (seenRefs.has(token)) continue;
        seenRefs.add(token);
        normalizedRefs.push(token);
      }

      const cappedRefs = normalizedRefs.slice(
        0,
        SettingsManager.CUSTOM_BACKGROUND_LIMIT,
      );

      const currentRefs = rawEntries
        .map((entry) => this.normalizeBackgroundImageUrl(entry))
        .filter(Boolean);

      const refsChanged =
        currentRefs.length !== cappedRefs.length ||
        currentRefs.some((value, index) => value !== cappedRefs[index]);

      let settingsChanged = false;
      if (refsChanged) {
        resolvedSettings.customBackgrounds = cappedRefs;
        settingsChanged = true;
      }

      const validCustomRefSet = new Set(cappedRefs);
      const selectionMap =
        this.getBackgroundImageSelectionMap(resolvedSettings);
      let selectionChanged = false;

      Object.keys(selectionMap).forEach((category) => {
        const urls = Array.isArray(selectionMap[category])
          ? selectionMap[category]
          : [];

        const nextUrls = [];
        const seenUrls = new Set();

        urls.forEach((entry) => {
          const normalizedUrl = this.normalizeBackgroundImageUrl(entry);
          if (!normalizedUrl) {
            selectionChanged = true;
            return;
          }

          const replaced = replacementMap.get(normalizedUrl) || normalizedUrl;
          if (
            this.isCustomBackgroundToken(replaced) &&
            !validCustomRefSet.has(replaced)
          ) {
            selectionChanged = true;
            return;
          }

          if (seenUrls.has(replaced)) {
            selectionChanged = true;
            return;
          }

          if (replaced !== normalizedUrl) {
            selectionChanged = true;
          }

          seenUrls.add(replaced);
          nextUrls.push(replaced);
        });

        if (
          nextUrls.length !== urls.length ||
          nextUrls.some((value, index) => value !== urls[index])
        ) {
          selectionMap[category] = nextUrls;
          selectionChanged = true;
        }
      });

      if (selectionChanged) {
        resolvedSettings.backgroundImageSelections = selectionMap;
        settingsChanged = true;
      }

      if (settingsChanged) {
        this.storage.saveSettings(resolvedSettings);
      }

      this.applyCustomBackgroundThumbsToRenderedPool();
    })().finally(() => {
      this._customBackgroundMediaSyncPromise = null;
    });

    return this._customBackgroundMediaSyncPromise;
  }

  getBackgroundThumbnailPlaceholder() {
    return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
  }

  getBackgroundThumbnailUrl(imageUrl) {
    const normalized = this.normalizeBackgroundImageUrl(imageUrl);
    if (!normalized) {
      return this.getBackgroundThumbnailPlaceholder();
    }

    const customThumbFromMap = this.normalizeBackgroundImageUrl(
      this._customBackgroundThumbByImageUrl?.get(normalized),
    );

    const cached = this._backgroundThumbUrlCache?.get(normalized);
    if (cached) {
      if (
        !/^https?:\/\//i.test(normalized) &&
        customThumbFromMap &&
        cached !== customThumbFromMap
      ) {
        this._backgroundThumbUrlCache.set(normalized, customThumbFromMap);
        return customThumbFromMap;
      }
      return cached;
    }

    let thumbUrl = normalized;
    if (!/^https?:\/\//i.test(normalized)) {
      thumbUrl = customThumbFromMap || normalized;
      if (this.isCustomBackgroundToken(normalized) && !customThumbFromMap) {
        thumbUrl = this.getBackgroundThumbnailPlaceholder();
      }
    }

    if (/^https?:\/\//i.test(normalized)) {
      try {
        const parsed = new URL(normalized);
        if (/(^|\.)images\.unsplash\.com$/i.test(parsed.hostname)) {
          parsed.searchParams.set("auto", "format");
          parsed.searchParams.set("fit", "crop");
          parsed.searchParams.set("crop", "entropy");
          parsed.searchParams.set("w", "320");
          parsed.searchParams.set("h", "200");
          parsed.searchParams.set("q", "45");
          thumbUrl = parsed.toString();
        }
      } catch (e) {
        thumbUrl = normalized;
      }
    }

    if (this._backgroundThumbUrlCache) {
      this._backgroundThumbUrlCache.set(normalized, thumbUrl);
    }

    return thumbUrl;
  }

  isBackgroundThumbCacheAvailable() {
    return (
      typeof window !== "undefined" &&
      typeof window.caches !== "undefined" &&
      typeof window.fetch === "function"
    );
  }

  isBackgroundThumbRemoteUrl(url) {
    return /^https?:\/\//i.test(String(url || ""));
  }

  async openBackgroundThumbCache() {
    if (!this.isBackgroundThumbCacheAvailable()) {
      return null;
    }

    try {
      return await window.caches.open(this._backgroundThumbCacheName);
    } catch (e) {
      return null;
    }
  }

  async pruneBackgroundThumbCache(cache) {
    if (!cache) return;

    try {
      const keys = await cache.keys();
      const maxEntries = this._backgroundThumbCacheMaxEntries || 220;
      if (keys.length <= maxEntries) return;

      const excess = keys.length - maxEntries;
      for (let i = 0; i < excess; i += 1) {
        await cache.delete(keys[i]);
      }
    } catch (e) {
      // ignore cache pruning errors
    }
  }

  revokeBackgroundThumbBlobUrl(url) {
    if (!url || typeof url !== "string") return;
    if (!url.startsWith("blob:")) return;

    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      // ignore
    }
  }

  enforceBackgroundThumbBlobUrlLimit() {
    const cache = this._backgroundThumbBlobUrlCache;
    if (!(cache instanceof Map)) return;

    const maxEntries = this._backgroundThumbBlobUrlMaxEntries || 140;
    while (cache.size > maxEntries) {
      const oldestKey = cache.keys().next().value;
      const oldestValue = cache.get(oldestKey);
      cache.delete(oldestKey);
      this.revokeBackgroundThumbBlobUrl(oldestValue);
    }
  }

  clearBackgroundThumbBlobUrlCache() {
    if (this._backgroundThumbBlobUrlCache instanceof Map) {
      this._backgroundThumbBlobUrlCache.forEach((blobUrl) => {
        this.revokeBackgroundThumbBlobUrl(blobUrl);
      });
      this._backgroundThumbBlobUrlCache.clear();
    }

    if (this._backgroundThumbPendingLoads instanceof Map) {
      this._backgroundThumbPendingLoads.clear();
    }
  }

  async resolveBackgroundThumbSrc(thumbSrc) {
    const normalized = this.normalizeBackgroundImageUrl(thumbSrc);
    if (!normalized) {
      return this.getBackgroundThumbnailPlaceholder();
    }

    if (!this.isBackgroundThumbRemoteUrl(normalized)) {
      const customThumb = this.normalizeBackgroundImageUrl(
        this._customBackgroundThumbByImageUrl?.get(normalized),
      );
      if (customThumb) {
        return customThumb;
      }
      if (this.isCustomBackgroundToken(normalized)) {
        return this.getBackgroundThumbnailPlaceholder();
      }
      return normalized;
    }

    const existingBlobUrl = this._backgroundThumbBlobUrlCache?.get(normalized);
    if (existingBlobUrl) {
      return existingBlobUrl;
    }

    const pending = this._backgroundThumbPendingLoads?.get(normalized);
    if (pending) {
      return pending;
    }

    const loadPromise = (async () => {
      const cache = await this.openBackgroundThumbCache();
      if (!cache) {
        return normalized;
      }

      const request = new Request(normalized, {
        mode: "cors",
        credentials: "omit",
      });

      let response = null;
      try {
        response = await cache.match(request);
      } catch (e) {
        response = null;
      }

      if (!response) {
        try {
          response = await fetch(request, { cache: "force-cache" });
          if (response && (response.ok || response.type === "opaque")) {
            try {
              await cache.put(request, response.clone());
              void this.pruneBackgroundThumbCache(cache);
            } catch (e) {
              // ignore cache write failures
            }
          }
        } catch (e) {
          response = null;
        }
      }

      if (!response || response.type === "opaque" || !response.ok) {
        return normalized;
      }

      let blob;
      try {
        blob = await response.blob();
      } catch (e) {
        return normalized;
      }

      if (!blob || blob.size <= 0) {
        return normalized;
      }

      const blobUrl = URL.createObjectURL(blob);
      this._backgroundThumbBlobUrlCache.set(normalized, blobUrl);
      this.enforceBackgroundThumbBlobUrlLimit();
      return blobUrl;
    })()
      .catch(() => normalized)
      .finally(() => {
        this._backgroundThumbPendingLoads?.delete(normalized);
      });

    this._backgroundThumbPendingLoads?.set(normalized, loadPromise);
    return loadPromise;
  }

  loadBackgroundThumbImage(imgEl) {
    if (!(imgEl instanceof HTMLImageElement)) {
      return;
    }

    const thumbSrc = this.normalizeBackgroundImageUrl(imgEl.dataset.thumbSrc);
    if (!thumbSrc || imgEl.dataset.thumbLoaded === "1") {
      return;
    }

    imgEl.dataset.thumbLoaded = "pending";
    void this.resolveBackgroundThumbSrc(thumbSrc)
      .then((resolvedSrc) => {
        if (!imgEl.isConnected) {
          return;
        }

        imgEl.src = resolvedSrc;
        imgEl.dataset.thumbLoaded = "1";
      })
      .catch(() => {
        if (!imgEl.isConnected) return;
        imgEl.src = thumbSrc;
        imgEl.dataset.thumbLoaded = "1";
      });
  }

  applyCustomBackgroundThumbsToRenderedPool() {
    if (!this.customBgList) return;

    const thumbs = this.customBgList.querySelectorAll(
      "img.custom-bg-thumb[data-bg-source-url]",
    );
    thumbs.forEach((thumbEl) => {
      if (!(thumbEl instanceof HTMLImageElement)) return;

      const sourceUrl = this.normalizeBackgroundImageUrl(
        thumbEl.dataset.bgSourceUrl,
      );
      if (!sourceUrl || /^https?:\/\//i.test(sourceUrl)) {
        return;
      }

      const customThumb = this.normalizeBackgroundImageUrl(
        this._customBackgroundThumbByImageUrl?.get(sourceUrl),
      );
      if (!customThumb) return;

      thumbEl.dataset.thumbSrc = customThumb;
      thumbEl.dataset.thumbLoaded = "";
      this.loadBackgroundThumbImage(thumbEl);
    });
  }

  resetBackgroundThumbObserver() {
    if (this._backgroundThumbObserver) {
      this._backgroundThumbObserver.disconnect();
      this._backgroundThumbObserver = null;
    }
  }
});

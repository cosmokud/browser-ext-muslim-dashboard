/**
 * SettingsManager: theme panel events and save.
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
});

/**
 * SettingsManager: blur, dim and performance quality.
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
});

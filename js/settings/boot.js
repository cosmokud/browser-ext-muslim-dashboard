/**
 * SettingsManager: init and tab sizing.
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

  init() {
    this.loadSettings();
    this.applyStoredContentFontSettings();
    this.updateContentFontPickerLabels();
    this.ensureDetachedEditorModal();
    this.setupEventListeners();
    this.updateMethodAnglesDisplay();
    this.renderBackgroundImagePool();
    void this.syncCustomBackgroundMediaFromSettings();

    this.updateNotesCountHint();
    this.updatePocketQuranBookmarkStats();
    this.applyCoordinateExamples();

    // Initialize themes panel
    this.initThemesPanel();

    // Keep Settings tabs compact + consistent width
    this.updateSettingsTabsMinWidth();

    // Apply UI settings immediately (not only after Save)
    const settings = this.storage.getSettings();
    const dashboardQualityState = this.resolveDashboardQualityState(
      settings.performanceModeEnabled === true,
      settings?.theme?.highestVisualFidelityEnabled === true,
      "performance",
    );
    this.applyHighestVisualFidelity(
      dashboardQualityState.highestVisualFidelityEnabled,
    );
    this.applyUiBlurPower(settings.uiBlurPower ?? 100);
    this.applyPerformanceMode(dashboardQualityState.performanceModeEnabled);

    // Clean up any stale inline zoom left by the removed Dashboard Scale feature.
    const root = document.documentElement;
    if (root) {
      root.style.removeProperty("zoom");
      root.style.removeProperty("--dashboard-scale");
    }
  }

  updateSettingsTabsMinWidth() {
    const strip = this.tabStrip || document.querySelector(".settings-tabs");
    if (!strip) return;

    const tabs = Array.from(strip.querySelectorAll(".settings-tab"));
    if (!tabs.length) return;

    // Clear any previous width so we can measure natural content widths.
    strip.style.removeProperty("--settings-tab-width");
    strip.style.removeProperty("--settings-tab-min-width");

    // Wait a tick so icon-theme DOM replacements/fonts have landed.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        let maxWidth = 0;
        for (const tab of tabs) {
          const rect = tab.getBoundingClientRect();
          const contentWidth = Number.isFinite(tab.scrollWidth)
            ? tab.scrollWidth
            : 0;
          if (rect && Number.isFinite(rect.width)) {
            maxWidth = Math.max(maxWidth, rect.width, contentWidth);
          }
        }

        // Add extra breathing room so the longest label does not clip.
        const preferredWidth = Math.ceil(maxWidth + 24);
        const minReadableWidth = 152;
        const availableWidth = Math.max(0, Math.floor(strip.clientWidth - 16));
        const width =
          availableWidth > 0
            ? Math.min(
                Math.max(preferredWidth, minReadableWidth),
                availableWidth,
              )
            : Math.max(preferredWidth, minReadableWidth);
        if (Number.isFinite(width) && width > 0) {
          // Primary variable used by CSS
          strip.style.setProperty("--settings-tab-width", `${width}px`);
          // Back-compat with older CSS naming
          strip.style.setProperty("--settings-tab-min-width", `${width}px`);
        }
      });
    });
  }
});

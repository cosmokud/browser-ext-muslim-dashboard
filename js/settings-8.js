/**
 * SettingsManager, part 8 of 9.
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

  setupEventListeners() {
    // Open/close modal
    if (this.settingsBtn) {
      this.settingsBtn.addEventListener("click", () => this.openModal());
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => this.closeModal());
    }
    if (this.saveBtn) {
      this.saveBtn.addEventListener("click", (event) => {
        event.preventDefault();
        this.clearScheduledAutoSave();
        this.saveSettings({
          source: "manual",
          showToast: true,
          closeModal: true,
          showValidationErrors: true,
        });
      });
    }

    this._bindOverlayCloseBehavior(this.modal, () => this.closeModal());

    if (
      this.settingsVersionTrigger &&
      this.settingsVersionTrigger.dataset.bound !== "1"
    ) {
      this.settingsVersionTrigger.dataset.bound = "1";
      this.settingsVersionTrigger.addEventListener("click", (event) => {
        event.preventDefault();
        this.openChangelogModal();
      });
    }

    if (
      this.changelogCloseBtn &&
      this.changelogCloseBtn.dataset.bound !== "1"
    ) {
      this.changelogCloseBtn.dataset.bound = "1";
      this.changelogCloseBtn.addEventListener("click", () => {
        this.closeChangelogModal();
      });
    }

    if (
      this.changelogModal &&
      this.changelogModal.dataset.overlayCloseBound !== "1"
    ) {
      this.changelogModal.dataset.overlayCloseBound = "1";
      this._bindOverlayCloseBehavior(this.changelogModal, () =>
        this.closeChangelogModal(),
      );
    }

    // Tabs
    this.tabs.forEach((tab) => {
      tab.addEventListener("click", () => this.switchTab(tab.dataset.tab));
    });

    this.setupSettingsSearchEventListeners();
    this.setupSettingsAutoSaveListeners();
    this.bindDetachedEditorButtons();
    this.bindContentFontPickerButtons();

    // Keep all settings range sliders visually synced with their current value.
    if (this.modal && this.modal.dataset.rangeProgressBound !== "1") {
      this.modal.dataset.rangeProgressBound = "1";
      this.modal.addEventListener("input", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || target.type !== "range") {
          return;
        }
        this.updateRangeProgress(target);
      });
    }

    // Recompute min-width when icon theme changes (emoji vs Lucide sizes differ)
    if (!document.documentElement.dataset.settingsTabsMinWidthBound) {
      document.documentElement.dataset.settingsTabsMinWidthBound = "1";
      document.addEventListener("md:icon-theme-change", () => {
        this.updateSettingsTabsMinWidth();
      });

      window.addEventListener("resize", () => {
        this.updateSettingsTabsMinWidth();
      });

      window.addEventListener("orientationchange", () => {
        this.updateSettingsTabsMinWidth();
      });
    }

    // Make the location pin open the Location settings (click + keyboard)
    try {
      const locationIcons = document.querySelectorAll(".location-icon");
      locationIcons.forEach((icon) => {
        // Avoid attaching multiple listeners if init() runs more than once
        if (icon.dataset.settingsBound === "1") return;
        icon.dataset.settingsBound = "1";

        // Add ARIA/interaction defaults when missing
        if (!icon.hasAttribute("role")) icon.setAttribute("role", "button");
        if (!icon.hasAttribute("tabindex")) icon.setAttribute("tabindex", "0");
        if (!icon.hasAttribute("title"))
          icon.setAttribute("title", "Open Location settings");
        if (!icon.hasAttribute("aria-label"))
          icon.setAttribute("aria-label", "Open Location settings");

        icon.addEventListener("click", () => {
          try {
            this.openModal();
            this.switchTab("location");
            const firstEl =
              document.getElementById("requestLocationBtn") ||
              document.getElementById("cityInput");
            if (firstEl) firstEl.focus();
          } catch (err) {
            console.warn("Failed to open Location settings:", err);
          }
        });

        icon.addEventListener("keydown", (e) => {
          const key = e.key || e.keyCode;
          if (key === "Enter" || key === " " || key === 13 || key === 32) {
            e.preventDefault();
            icon.click();
          }
        });
      });
    } catch (e) {
      // Non-critical: if DOM not ready or icons absent, ignore
    }

    if (this.testNotificationBtn) {
      this.testNotificationBtn.addEventListener("click", () =>
        this.testBrowserNotification(),
      );
    }

    if (this.debugSimDateEnabled) {
      this.debugSimDateEnabled.addEventListener("change", () => {
        this.setDebugDateControlsEnabled(this.debugSimDateEnabled.checked);
      });
    }

    if (this.debugSimDatePicker) {
      this.debugSimDatePicker.addEventListener("change", () => {
        this.syncDebugDatePartsFromPicker();
      });
      this.debugSimDatePicker.addEventListener("input", () => {
        this.syncDebugDatePartsFromPicker();
      });
    }

    [this.debugSimDateYear, this.debugSimDateMonth, this.debugSimDateDay]
      .filter(Boolean)
      .forEach((el) => {
        el.addEventListener("input", () => this.syncDebugDatePickerFromParts());
      });

    // Notes import/export
    if (this.notesCardFontFamily) {
      this.notesCardFontFamily.addEventListener("change", () => {
        this.applyNotesCardFontFamily(this.notesCardFontFamily.value);
      });
    }

    if (this.importNotesBtn && this.importNotesInput) {
      this.importNotesBtn.addEventListener("click", () => {
        this.importNotesInput.click();
      });
    }

    if (this.exportNotesBtn) {
      this.exportNotesBtn.addEventListener("click", () => this.exportNotes());
    }

    if (this.importNotesInput) {
      this.importNotesInput.addEventListener("change", (e) =>
        this.handleNotesImport(e),
      );
    }

    // Location method toggle
    this.locationMethodRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        this.toggleManualLocation(radio.value === "manual");
        this.updateDetectedLocationText();
      });
    });

    // Request location permission
    if (this.requestLocationBtn) {
      this.requestLocationBtn.addEventListener("click", () =>
        this.requestLocation({ refreshWeather: true, showToast: true }),
      );
    }

    // Refresh detected location
    if (this.refreshLocationBtn) {
      this.refreshLocationBtn.addEventListener("click", () =>
        this.refreshDetectedLocation(),
      );
    }

    // Search city
    if (this.searchCityBtn) {
      this.searchCityBtn.addEventListener("click", () => this.searchCity());
    }

    // Paste coords (location)
    if (this.pasteCoordsBtn) {
      this.pasteCoordsBtn.addEventListener("click", () =>
        this.pasteLocationCoordinatesFromClipboard(),
      );
    }

    if (this.cityInput) {
      this.cityInput.addEventListener("input", () => {
        this._clearCitySearchResults(this.citySearchResults);
      });

      // Trigger search when user presses Enter in the city input
      this.cityInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.keyCode === 13) {
          e.preventDefault();
          // Avoid duplicate search while a search is already running
          if (this.searchCityBtn && this.searchCityBtn.disabled) return;
          this.searchCity();
        }
      });
    }

    // Weather location mode toggle
    this.weatherLocationModeRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        this.toggleWeatherManualLocation(radio.value === "custom");
      });
    });

    // Search city (weather)
    if (this.weatherSearchCityBtn) {
      this.weatherSearchCityBtn.addEventListener("click", () =>
        this.searchWeatherCity(),
      );
    }

    // Paste coords (weather)
    if (this.weatherPasteCoordsBtn) {
      this.weatherPasteCoordsBtn.addEventListener("click", () =>
        this.pasteWeatherCoordinatesFromClipboard(),
      );
    }

    if (this.weatherCityInput) {
      this.weatherCityInput.addEventListener("input", () => {
        this._clearCitySearchResults(this.weatherCitySearchResults);
      });

      // Trigger weather search when user presses Enter in the weather city input
      this.weatherCityInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.keyCode === 13) {
          e.preventDefault();
          if (this.weatherSearchCityBtn && this.weatherSearchCityBtn.disabled)
            return;
          this.searchWeatherCity();
        }
      });
    }

    // Prayer notify toggle: grey out At Time / Before / After when off
    for (const prayer in this.notificationCheckboxes) {
      const checkbox = this.notificationCheckboxes[prayer];
      if (!checkbox) continue;
      checkbox.addEventListener("change", () => {
        this.updatePrayerNotificationRowState(prayer);
      });
    }

    // Fasting notifications toggle
    if (this.fastingNotificationsEnabled) {
      this.fastingNotificationsEnabled.addEventListener("change", (e) => {
        this.toggleFastingNotificationOptions(e.target.checked);
      });
    }

    // Calculation method change - toggle custom angles and update display
    if (this.calculationMethod) {
      this.calculationMethod.addEventListener("change", (e) => {
        this.toggleCustomAngles(e.target.value === "Custom");
        this.updateMethodAnglesDisplay();
      });
    }

    // Background interval change - toggle custom interval field
    if (this.bgInterval) {
      this.bgInterval.addEventListener("change", (e) => {
        this.toggleCustomInterval(e.target.value === "custom");
      });
    }

    if (this.bgCategory) {
      this.bgCategory.addEventListener("change", () => {
        this.updateBackgroundPoolAddButtonVisibility();
        this.renderBackgroundImagePool();
        this._backgroundSettingsDirty = true;
      });
    }

    if (this.solidColorPicker) {
      this.solidColorPicker.addEventListener("input", () => {
        const normalized = this.normalizeSolidColorHex(
          this.solidColorPicker.value,
        );
        if (normalized && this.solidColorHexInput) {
          this.solidColorHexInput.value = normalized;
        }
      });
    }

    if (this.solidColorHexInput) {
      this.solidColorHexInput.addEventListener("input", () => {
        const normalized = this.normalizeSolidColorHex(
          this.solidColorHexInput.value,
        );
        if (normalized && this.solidColorPicker) {
          this.solidColorPicker.value = normalized;
        }
      });

      this.solidColorHexInput.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        void this.addSolidColorTemplate(this.solidColorHexInput.value);
      });
    }

    if (this.addSolidColorBtn) {
      this.addSolidColorBtn.addEventListener("click", () => {
        const value =
          this.solidColorHexInput?.value || this.solidColorPicker?.value;
        void this.addSolidColorTemplate(value);
      });
    }

    if (this.bgDisplayMode) {
      this.bgDisplayMode.addEventListener("change", () => {
        const mode = this.normalizeBackgroundDisplayMode(
          this.bgDisplayMode.value,
        );
        if (this.backgrounds?.updateDisplayMode) {
          this.backgrounds.updateDisplayMode(mode);
        }
        this._backgroundSettingsDirty = true;
      });
    }

    if (this.bgShuffle) {
      this.bgShuffle.addEventListener("change", () => {
        const enabled = this.bgShuffle.checked !== false;
        if (this.backgrounds?.updateShuffleMode) {
          this.backgrounds.updateShuffleMode(enabled);
        }
        this._backgroundSettingsDirty = true;
      });
    }

    if (this.bgDim) {
      this.bgDim.addEventListener("input", () => {
        this.updateBackgroundDimLabel();
        const dim = this.normalizeBackgroundDim(this.bgDim.value, 100);
        if (this.backgrounds?.updateDim) {
          this.backgrounds.updateDim(dim);
        }
        this._backgroundSettingsDirty = true;
      });
    }

    if (this.bgBlur) {
      this.bgBlur.addEventListener("input", () => {
        this.updateBackgroundBlurLabel();
        const blur = this.normalizeBackgroundBlur(this.bgBlur.value, 0);
        if (this.backgrounds?.updateBlur) {
          this.backgrounds.updateBlur(blur);
        }
        this._backgroundSettingsDirty = true;
      });
    }

    // Compact weather toggle
    if (this.compactWeatherEnabled) {
      this.compactWeatherEnabled.addEventListener("change", (e) => {
        this.toggleCompactWeatherOptions(e.target.checked);
        this.applyHeaderQuickControlsInstantly();
      });
    }

    // Container width change - toggle custom width slider and apply preview
    if (this.containerWidth) {
      this.containerWidth.addEventListener("change", (e) => {
        this.toggleCustomWidth(e.target.value === "custom");
        // Apply preview immediately
        this.applyContainerWidth(
          e.target.value,
          parseInt(this.containerWidthCustom?.value, 10) || 70,
        );
      });
    }

    // Container width slider change - update label and apply preview
    if (this.containerWidthCustom) {
      this.containerWidthCustom.addEventListener("input", () => {
        this.updateCustomWidthLabel();
        this.applyContainerWidth(
          this.containerWidth?.value === "custom"
            ? "custom"
            : this.containerWidth?.value,
          parseInt(this.containerWidthCustom.value, 10),
        );
      });
    }

    // UI blur power slider - live preview
    if (this.uiBlurPower) {
      this.uiBlurPower.addEventListener("input", () => {
        this.updateUiBlurPowerLabel();
        this.applyUiBlurPower(parseInt(this.uiBlurPower.value, 10));
      });
    }

    // Pinned Apps per-row slider - update label
    if (this.pinnedAppsPerRow) {
      this.pinnedAppsPerRow.addEventListener("input", () => {
        this.updatePinnedAppsPerRowLabel();
      });
    }

    // Pocket Quran sliders - update labels
    if (this.pocketQuranArabicSize) {
      this.pocketQuranArabicSize.addEventListener("input", () => {
        this.updatePocketQuranArabicSizeLabel();
      });
    }
    if (this.pocketQuranTranslationSize) {
      this.pocketQuranTranslationSize.addEventListener("input", () => {
        this.updatePocketQuranTranslationSizeLabel();
      });
    }
    if (this.pocketQuranHighlighterDelay) {
      this.pocketQuranHighlighterDelay.addEventListener("input", () => {
        this.updatePocketQuranHighlighterDelayLabel();
      });
    }
    if (this.pocketQuranPopupArabicSize) {
      this.pocketQuranPopupArabicSize.addEventListener("input", () => {
        this.updatePocketQuranPopupArabicSizeLabel();
      });
    }
    if (this.pocketQuranPopupTranslationSize) {
      this.pocketQuranPopupTranslationSize.addEventListener("input", () => {
        this.updatePocketQuranPopupTranslationSizeLabel();
      });
    }

    if (this.pocketQuranTranslationFontFamily) {
      this.pocketQuranTranslationFontFamily.addEventListener("change", () => {
        try {
          if (window.dashboard?.pocketQuran?.applyTranslationFontFamily) {
            window.dashboard.pocketQuran.applyTranslationFontFamily(
              this.pocketQuranTranslationFontFamily.value,
              { persist: false, recalculate: true },
            );
          }
        } catch (e) {
          // ignore
        }
      });
    }

    if (this.pocketQuranTranslationFontPickerBtn) {
      this.pocketQuranTranslationFontPickerBtn.addEventListener("click", () => {
        try {
          if (window.dashboard?.pocketQuran?.openTranslationFontPickerModal) {
            window.dashboard.pocketQuran.openTranslationFontPickerModal();
          }
        } catch (e) {
          // ignore
        }
      });
    }

    if (this.pocketQuranPopupTranslationFontPickerBtn) {
      this.pocketQuranPopupTranslationFontPickerBtn.addEventListener(
        "click",
        () => {
          try {
            if (window.dashboard?.pocketQuran?.openTranslationFontPickerModal) {
              window.dashboard.pocketQuran.openTranslationFontPickerModal({
                target: "popup",
                currentFont:
                  this.normalizePocketQuranPopupTranslationFontFamily(
                    this.pocketQuranPopupTranslationFontFamily?.value,
                  ),
              });
            }
          } catch (e) {
            // ignore
          }
        },
      );
    }

    if (this.pocketQuranReciterPickerBtn) {
      this.pocketQuranReciterPickerBtn.addEventListener("click", () => {
        try {
          if (window.dashboard?.pocketQuran?.openReciterModal) {
            window.dashboard.pocketQuran.openReciterModal();
          }
        } catch (e) {
          // ignore
        }
      });
    }

    if (this.pocketQuranArabicFontPickerBtn) {
      this.pocketQuranArabicFontPickerBtn.addEventListener("click", () => {
        try {
          if (window.dashboard?.pocketQuran?.openFontPickerModal) {
            window.dashboard.pocketQuran.openFontPickerModal();
          }
        } catch (e) {
          // ignore
        }
      });
    }

    if (this.pocketQuranPopupArabicFontPickerBtn) {
      this.pocketQuranPopupArabicFontPickerBtn.addEventListener("click", () => {
        try {
          if (window.dashboard?.pocketQuran?.openFontPickerModal) {
            window.dashboard.pocketQuran.openFontPickerModal({
              target: "popup",
              currentFont: this.normalizePocketQuranArabicFontFamily(
                this.pocketQuranPopupArabicFontFamily?.value,
              ),
            });
          }
        } catch (e) {
          // ignore
        }
      });
    }

    // Pocket Quran translation picker: open the existing pqTranslationModal
    if (this.pocketQuranTranslationPickerBtn) {
      this.pocketQuranTranslationPickerBtn.addEventListener("click", () => {
        try {
          if (window.dashboard?.pocketQuran?.openTranslationModal) {
            window.dashboard.pocketQuran.openTranslationModal();
            return;
          }
        } catch (e) {
          // ignore
        }
      });
    }

    if (this.pocketQuranResetAllTajweedColorsBtn) {
      this.pocketQuranResetAllTajweedColorsBtn.addEventListener("click", () => {
        this.resetAllPocketQuranTajweedColors();
      });
    }

    // Keep Settings UI in sync when translation changes from anywhere (header modal or settings modal)
    document.addEventListener("md:pq-translation-selected", (e) => {
      const id = parseInt(e?.detail?.translationId, 10);
      if (!Number.isFinite(id)) return;

      if (this.pocketQuranTranslationSelect) {
        const has = this.pocketQuranTranslationSelect.querySelector(
          `option[value="${id}"]`,
        );
        if (has) {
          this.pocketQuranTranslationSelect.value = String(id);
        }
      }

      this.updatePocketQuranTranslationPickerLabel();
    });

    // Keep Settings UI in sync when reciter/font choices change from the card modals.
    document.addEventListener("md:pq-reciter-selected", () => {
      this.updatePocketQuranReciterPickerLabel();
    });

    document.addEventListener("md:pq-arabic-font-selected", () => {
      this.updatePocketQuranArabicFontPickerLabel();
    });

    document.addEventListener("md:pq-popup-arabic-font-selected", (e) => {
      const normalized = this.normalizePocketQuranArabicFontFamily(
        e?.detail?.fontFamily,
      );

      if (this.pocketQuranPopupArabicFontFamily) {
        this.pocketQuranPopupArabicFontFamily.value = normalized;
      }

      this.updatePocketQuranPopupArabicFontPickerLabel();
      this.scheduleAutoSave(120);
    });

    document.addEventListener("md:pq-translation-font-selected", (e) => {
      const normalized = this.normalizePocketQuranTranslationFontFamily(
        e?.detail?.fontFamily,
      );
      if (this.pocketQuranTranslationFontFamily) {
        this.pocketQuranTranslationFontFamily.value = normalized;
      }
      this.updatePocketQuranTranslationFontPickerLabel();
      this.scheduleAutoSave(120);
    });

    document.addEventListener("md:pq-popup-translation-font-selected", (e) => {
      const normalized = this.normalizePocketQuranPopupTranslationFontFamily(
        e?.detail?.fontFamily,
      );
      if (this.pocketQuranPopupTranslationFontFamily) {
        this.pocketQuranPopupTranslationFontFamily.value = normalized;
      }
      this.updatePocketQuranPopupTranslationFontPickerLabel();
      this.scheduleAutoSave(120);
    });

    // Pocket Quran bookmark export/import
    if (this.pocketQuranExportBookmarksBtn) {
      this.pocketQuranExportBookmarksBtn.addEventListener("click", () => {
        this.exportPocketQuranBookmarks();
      });
    }
    if (
      this.pocketQuranImportBookmarksBtn &&
      this.pocketQuranImportBookmarksInput
    ) {
      this.pocketQuranImportBookmarksBtn.addEventListener("click", () => {
        this.pocketQuranImportBookmarksInput.click();
      });
      this.pocketQuranImportBookmarksInput.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) {
          this.importPocketQuranBookmarks(file);
          e.target.value = "";
        }
      });
    }

    // Add custom background
    if (this.selectAllBgPoolBtn) {
      this.selectAllBgPoolBtn.addEventListener("click", () => {
        this.selectAllBackgroundPoolImages();
      });
    }

    if (this.deselectAllBgPoolBtn) {
      this.deselectAllBgPoolBtn.addEventListener("click", () => {
        this.deselectAllBackgroundPoolImages();
      });
    }

    if (this.addCustomBgBtn) {
      this.addCustomBgBtn.addEventListener("click", () => {
        this.customBgInput?.click();
      });
    }

    if (this.addCustomBgUrlBtn) {
      this.addCustomBgUrlBtn.addEventListener("click", () => {
        void this.promptAndAddCustomBackgroundFromUrl();
      });
    }

    if (this.customBgInput) {
      this.customBgInput.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (file) {
          await this.addCustomBackground(file);
          e.target.value = ""; // Reset input
        }
      });
    }

    // Reset grid layout button
    const resetGridLayoutBtn = document.getElementById("resetGridLayoutBtn");
    if (resetGridLayoutBtn) {
      resetGridLayoutBtn.addEventListener("click", () => {
        const dashboard = window.dashboard;
        if (dashboard && (dashboard.gridLayout || dashboard.floating)) {
          const stopRefresh = this._startRefreshButton(resetGridLayoutBtn, {
            label: "Resetting…",
          });
          const startedAt = Date.now();

          try {
            if (typeof dashboard.floating?.resetToDefault === "function") {
              dashboard.floating.resetToDefault();
            }

            if (typeof dashboard.gridLayout?.resetToDefault === "function") {
              dashboard.gridLayout.resetToDefault();
            }

            const settings = this.storage.getSettings();
            const defaults = this.storage.getDefaultSettings();
            const defaultComponentVisibility =
              defaults && typeof defaults.componentVisibility === "object"
                ? { ...defaults.componentVisibility }
                : {};

            settings.componentVisibility = defaultComponentVisibility;
            this.storage.saveSettings(settings);
            this.loadVisibilitySettings(settings);

            if (typeof dashboard.applyComponentVisibility === "function") {
              dashboard.applyComponentVisibility();
            } else {
              applyLiveDashboardVisibility();
            }

            this.showToast(
              "Layout and component visibility reset to default!",
              "success",
            );
          } finally {
            const minDuration = 900;
            const elapsed = Date.now() - startedAt;
            const delay = Math.max(0, minDuration - elapsed);
            setTimeout(() => stopRefresh(), delay);
          }
        }
      });
    }

    const resetComponentSizesBtn = document.getElementById(
      "resetComponentSizesBtn",
    );
    if (resetComponentSizesBtn) {
      resetComponentSizesBtn.addEventListener("click", () => {
        if (window.dashboard && window.dashboard.gridLayout) {
          const stopRefresh = this._startRefreshButton(resetComponentSizesBtn, {
            label: "Resetting…",
          });
          const startedAt = Date.now();

          try {
            if (
              typeof window.dashboard.gridLayout
                .resetAllCustomComponentWidths === "function"
            ) {
              window.dashboard.gridLayout.resetAllCustomComponentWidths();
            }
            this.showToast("Component sizes reset to default!", "success");
          } finally {
            const minDuration = 900;
            const elapsed = Date.now() - startedAt;
            const delay = Math.max(0, minDuration - elapsed);
            setTimeout(() => stopRefresh(), delay);
          }
        }
      });
    }

    // Reset / Nuke confirmation modal wiring
    const resolveResetNukeConfirm = (confirmed) => {
      if (!this._resetNukeConfirmResolve) return;
      const resolve = this._resetNukeConfirmResolve;
      this._resetNukeConfirmResolve = null;
      try {
        this.resetNukeConfirmModal?.classList.remove("active");
      } catch (e) {}
      resolve(confirmed === true);
    };

    if (this.resetNukeCancelBtn) {
      this.resetNukeCancelBtn.addEventListener("click", () =>
        resolveResetNukeConfirm(false),
      );
    }
    if (this.resetNukeConfirmBtn) {
      this.resetNukeConfirmBtn.addEventListener("click", () =>
        resolveResetNukeConfirm(true),
      );
    }
    if (this.resetNukeConfirmModal) {
      this._bindOverlayCloseBehavior(this.resetNukeConfirmModal, () =>
        resolveResetNukeConfirm(false),
      );
    }
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Enter" &&
        this.resetNukeConfirmModal?.classList.contains("active")
      ) {
        e.preventDefault();
        resolveResetNukeConfirm(true);
        return;
      }

      if (e.key !== "Escape") return;
      if (this.resetNukeConfirmModal?.classList.contains("active")) {
        resolveResetNukeConfirm(false);
      }
    });

    const openResetNukeConfirmModal = (opts = {}) => {
      const title = String(opts.title || "Confirm");
      const text = String(opts.text || "");
      const iconEmoji = String(opts.icon || "⚠️");
      const confirmLabel = String(opts.confirmLabel || "Confirm");
      const cancelLabel = String(opts.cancelLabel || "Cancel");

      // Fallback: native confirm if modal isn't available.
      if (
        !this.resetNukeConfirmModal ||
        !this.resetNukeConfirmBtn ||
        !this.resetNukeCancelBtn
      ) {
        return Promise.resolve(window.confirm(`${title}\n\n${text}`));
      }

      // Cancel any prior pending confirm.
      if (this._resetNukeConfirmResolve) {
        try {
          this._resetNukeConfirmResolve(false);
        } catch (e) {}
        this._resetNukeConfirmResolve = null;
      }

      if (this.resetNukeConfirmIcon)
        this.resetNukeConfirmIcon.innerHTML = this._getIcon(iconEmoji, {
          size: 32,
        });
      if (this.resetNukeConfirmTitle)
        this.resetNukeConfirmTitle.textContent = title;
      if (this.resetNukeConfirmText)
        this.resetNukeConfirmText.textContent = text;
      this.resetNukeConfirmBtn.textContent = confirmLabel;
      this.resetNukeCancelBtn.textContent = cancelLabel;

      this.resetNukeConfirmModal.classList.add("active");

      return new Promise((resolve) => {
        this._resetNukeConfirmResolve = resolve;
      });
    };

    const resetWholeSettings = async () => {
      const current = this.storage.getSettings();
      const defaults = this.storage.getDefaultSettings();

      // Preserve user data that is stored inside settings.
      const preservedCustomBackgrounds = Array.isArray(
        current.customBackgrounds,
      )
        ? current.customBackgrounds
            .map((x) => this.normalizeBackgroundImageUrl(x))
            .filter((x) => this.isValidCustomBackgroundReference(x))
            .slice(0, SettingsManager.CUSTOM_BACKGROUND_LIMIT)
        : [];

      defaults.customBackgrounds = preservedCustomBackgrounds;

      this.storage.saveSettings(defaults);

      this.showToast("Settings reset to defaults. Reloading…", "success");
      setTimeout(() => window.location.reload(), 1200);
    };

    const nukeAllData = async () => {
      const defaults = this.storage.getDefaultSettings();

      // Clear all StorageManager data.
      try {
        this.storage.clear();
      } catch (e) {
        // ignore
      }

      // Also clear Sticky Notes (not using the StorageManager prefix).
      try {
        localStorage.removeItem("stickyNotes");
        localStorage.removeItem("stickyNotesVisible");
      } catch (e) {
        // ignore
      }

      try {
        await this.clearCustomBackgroundMediaIndexedDb();
      } catch (e) {
        // ignore
      }

      // Reset MV3 mirrored keys so the service worker converges to defaults.
      try {
        if (typeof chrome !== "undefined" && chrome.storage?.local?.set) {
          chrome.storage.local.set({
            md_settings: defaults,
            md_lastLocation: null,
          });
        }
      } catch (e) {
        // ignore
      }

      this.showToast("Everything was reset. Reloading…", "success");
      setTimeout(() => window.location.reload(), 1200);
    };

    if (this.resetWholeSettingsBtn) {
      this.resetWholeSettingsBtn.addEventListener("click", async () => {
        const ok = await openResetNukeConfirmModal({
          icon: "🧹",
          title: "Reset Whole Settings?",
          text: "This resets all settings to defaults, but keeps your custom data (flashcards, quotes, wallpapers, notes, Pocket Quran bookmarks, etc.).",
          confirmLabel: "Reset",
          cancelLabel: "Cancel",
        });
        if (!ok) return;
        await resetWholeSettings();
      });
    }

    if (this.nukeAllDataBtn) {
      this.nukeAllDataBtn.addEventListener("click", async () => {
        const ok1 = await openResetNukeConfirmModal({
          icon: "☢️",
          title: "Nuke Everything?",
          text: "This will permanently delete ALL settings and ALL user data on this device.",
          confirmLabel: "Continue",
          cancelLabel: "Cancel",
        });
        if (!ok1) return;

        const ok2 = await openResetNukeConfirmModal({
          icon: "☢️",
          title: "Final Confirmation",
          text: "Last chance: this cannot be undone. Proceed to reset EVERYTHING?",
          confirmLabel: "Yes, nuke it",
          cancelLabel: "Cancel",
        });
        if (!ok2) return;

        await nukeAllData();
      });
    }

    // Export custom searches
    if (this.exportCustomSearchesBtn) {
      this.exportCustomSearchesBtn.addEventListener("click", () => {
        this.exportCustomSearches();
      });
    }

    // Full export
    if (this.fullExportBtn) {
      this.fullExportBtn.addEventListener("click", () => {
        this.exportFullExport();
      });
    }

    // Import settings
    if (this.importSettingsBtn) {
      this.importSettingsBtn.addEventListener("click", () => {
        this.importSettingsInput?.click();
      });
    }

    if (this.importSettingsInput) {
      this.importSettingsInput.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            this.importAllSettings(event.target.result);
          };
          reader.readAsText(file);
          e.target.value = ""; // Reset input
        }
      });
    }

    // Import custom searches
    if (this.importCustomSearchesBtn) {
      this.importCustomSearchesBtn.addEventListener("click", () => {
        this.importCustomSearchesInput?.click();
      });
    }

    if (this.importCustomSearchesInput) {
      this.importCustomSearchesInput.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            this.importCustomSearches(event.target.result);
          };
          reader.readAsText(file);
          e.target.value = "";
        }
      });
    }

    const applyLiveDashboardVisibility = () => {
      const setPreviewVisibility = (el, shouldShow) => {
        if (!el) return;
        if (shouldShow) {
          if (el.style.getPropertyValue("display")) {
            el.style.removeProperty("display");
          }
        } else {
          el.style.setProperty("display", "none", "important");
        }
        el.setAttribute("aria-hidden", shouldShow ? "false" : "true");
      };

      const componentState = {
        header: this.visibilityHeader?.checked ?? true,
        quickPins: this.visibilityQuickPins?.checked ?? true,
        searchBar: this.visibilitySearchBar?.checked ?? true,
        quotes: this.visibilityQuotes?.checked ?? true,
        prayerTimes: this.visibilityPrayerTimes?.checked ?? true,
        hijriCalendar: this.visibilityHijriCalendar?.checked ?? true,
        qiblaDirection: this.visibilityQiblaDirection?.checked ?? true,
        weather: this.visibilityWeather?.checked ?? true,
        lunarPhase: this.visibilityLunarPhase?.checked ?? true,
        fasting: this.visibilityFasting?.checked ?? true,
        flashcards: this.visibilityFlashcards?.checked ?? true,
        adhkar: this.visibilityAdhkar?.checked ?? true,
        hadith: this.visibilityHadith?.checked ?? true,
        todoList: this.visibilityTodoList?.checked ?? true,
        notes: this.visibilityNotes?.checked ?? true,
        pocketQuran: this.visibilityPocketQuran?.checked ?? true,
      };

      const showClock =
        (this.showClock?.checked ?? true) && componentState.header === true;

      setPreviewVisibility(
        document.querySelector(".header"),
        componentState.header,
      );
      setPreviewVisibility(
        document.getElementById("pinnedAppsSection"),
        componentState.quickPins,
      );
      setPreviewVisibility(
        document.getElementById("searchBarSection"),
        componentState.searchBar,
      );
      setPreviewVisibility(
        document.getElementById("quoteSection"),
        componentState.quotes,
      );
      setPreviewVisibility(
        document.getElementById("prayerTimesCard"),
        componentState.prayerTimes,
      );
      setPreviewVisibility(
        document.getElementById("calendarCard"),
        componentState.hijriCalendar,
      );
      setPreviewVisibility(
        document.getElementById("qiblaCard"),
        componentState.qiblaDirection,
      );
      setPreviewVisibility(
        document.getElementById("weatherCard"),
        componentState.weather,
      );
      setPreviewVisibility(
        document.getElementById("lunarPhaseCard"),
        componentState.lunarPhase,
      );
      setPreviewVisibility(
        document.getElementById("fastingCard"),
        componentState.fasting,
      );
      setPreviewVisibility(
        document.getElementById("flashcardCard"),
        componentState.flashcards,
      );
      setPreviewVisibility(
        document.getElementById("adhkarCard"),
        componentState.adhkar,
      );
      setPreviewVisibility(
        document.getElementById("hadithCard"),
        componentState.hadith,
      );
      setPreviewVisibility(
        document.getElementById("todoCard"),
        componentState.todoList,
      );
      setPreviewVisibility(
        document.getElementById("notesCard"),
        componentState.notes,
      );
      setPreviewVisibility(
        document.getElementById("pocketQuranCard"),
        componentState.pocketQuran,
      );

      const timeSection = document.querySelector(".time-section");
      if (timeSection) {
        timeSection.style.display = showClock ? "" : "none";
        timeSection.setAttribute("aria-hidden", showClock ? "false" : "true");
      }

      const setSlotPreview = (slotId, shouldShow) => {
        const slot = document.getElementById(slotId);
        if (!slot) return;
        slot.style.display = shouldShow ? "" : "none";
        slot.setAttribute("aria-hidden", shouldShow ? "false" : "true");
      };

      setSlotPreview("momentPrayerSlot", componentState.prayerTimes);
      setSlotPreview("momentFastingSlot", componentState.fasting);
      setSlotPreview("momentQuoteSlot", componentState.quotes);
      setSlotPreview("momentPinnedAppsSlot", componentState.quickPins);
      setSlotPreview("momentSearchSlot", componentState.searchBar);
      setSlotPreview("momentClockSlot", showClock);

      try {
        document.dispatchEvent(new CustomEvent("md:visibility-changed"));
      } catch (e) {}

      try {
        if (window.dashboard?.floating?.updateAllButtons) {
          window.dashboard.floating.updateAllButtons();
        }
      } catch (e) {}
    };

    const bindMirroredVisibilityCheckboxes = (
      primary,
      mirror,
      onAfterSync = null,
    ) => {
      if (!primary || !mirror) return;

      primary.addEventListener("change", () => {
        mirror.checked = primary.checked;
        if (typeof onAfterSync === "function") onAfterSync();
      });

      mirror.addEventListener("change", () => {
        primary.checked = mirror.checked;
        if (typeof onAfterSync === "function") onAfterSync();
      });
    };

    bindMirroredVisibilityCheckboxes(
      this.visibilityPrayerTimes,
      this.momentVisibilityPrayerTimes,
      applyLiveDashboardVisibility,
    );
    bindMirroredVisibilityCheckboxes(
      this.visibilityFasting,
      this.momentVisibilityFasting,
      applyLiveDashboardVisibility,
    );
    bindMirroredVisibilityCheckboxes(
      this.visibilityQuotes,
      this.momentVisibilityQuotes,
      applyLiveDashboardVisibility,
    );
    bindMirroredVisibilityCheckboxes(
      this.visibilityQuickPins,
      this.momentVisibilityQuickPins,
      applyLiveDashboardVisibility,
    );
    bindMirroredVisibilityCheckboxes(
      this.visibilitySearchBar,
      this.momentVisibilitySearchBar,
      applyLiveDashboardVisibility,
    );
    bindMirroredVisibilityCheckboxes(
      this.showClock,
      this.momentVisibilityClock,
      () => {
        this.toggleClockOptions(this.showClock?.checked === true);
        applyLiveDashboardVisibility();
      },
    );

    [
      this.visibilityHeader,
      this.visibilityQuickPins,
      this.visibilitySearchBar,
      this.visibilityQuotes,
      this.visibilityPrayerTimes,
      this.visibilityHijriCalendar,
      this.visibilityQiblaDirection,
      this.visibilityWeather,
      this.visibilityLunarPhase,
      this.visibilityFasting,
      this.visibilityFlashcards,
      this.visibilityAdhkar,
      this.visibilityHadith,
      this.visibilityTodoList,
      this.visibilityNotes,
      this.visibilityPocketQuran,
    ].forEach((el) => {
      if (!el) return;
      el.addEventListener("change", applyLiveDashboardVisibility);
    });

    // Refresh background now
    if (this.changeBackgroundBtn) {
      this.changeBackgroundBtn.addEventListener("click", async () => {
        const stopRefresh = this._startRefreshButton(this.changeBackgroundBtn, {
          label: "Refreshing…",
        });
        const startedAt = Date.now();

        try {
          const settings = this.storage.getSettings();
          if (this.bgCategory) {
            settings.bgCategory = this.normalizeBackgroundCategory(
              this.bgCategory.value,
            );
          }
          settings.bgDisplayMode = this.normalizeBackgroundDisplayMode(
            this.bgDisplayMode?.value || settings.bgDisplayMode || "fill",
          );
          settings.bgDim = this.normalizeBackgroundDim(
            this.bgDim?.value ?? settings.bgDim,
            100,
          );
          settings.bgBlur = this.normalizeBackgroundBlur(
            this.bgBlur?.value ?? settings.bgBlur,
            0,
          );
          settings.bgShuffle = this.bgShuffle?.checked !== false;
          this.storage.saveSettings(settings);

          if (this.backgrounds) {
            if (typeof this.backgrounds.updateDisplayMode === "function") {
              this.backgrounds.updateDisplayMode(settings.bgDisplayMode);
            }
            if (typeof this.backgrounds.updateDim === "function") {
              this.backgrounds.updateDim(settings.bgDim);
            }
            if (typeof this.backgrounds.updateBlur === "function") {
              this.backgrounds.updateBlur(settings.bgBlur);
            }
            if (typeof this.backgrounds.updateShuffleMode === "function") {
              this.backgrounds.updateShuffleMode(settings.bgShuffle);
            }
            if (typeof this.backgrounds.updateCategory === "function") {
              this.backgrounds.updateCategory(settings.bgCategory || "all");
            } else if (
              typeof this.backgrounds.changeBackground === "function"
            ) {
              this.backgrounds.changeBackground();
            }
          }

          this.showToast("Background refreshed!", "success");
        } finally {
          const minDuration = 650;
          const elapsed = Date.now() - startedAt;
          const delay = Math.max(0, minDuration - elapsed);
          setTimeout(() => stopRefresh(), delay);
        }
      });
    }

    // Heading settings - greeting type toggle
    this.greetingTypeRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        this.toggleCustomGreeting(radio.value === "custom");
      });
    });

    // Heading settings - show clock toggle
    if (this.showClock) {
      this.showClock.addEventListener("change", () => {
        this.toggleClockOptions(this.showClock.checked);
        this.applyHeaderQuickControlsInstantly();
      });
    }

    this.setupHeaderColorControls();
    this.setupHeaderGlowPopoverControls();

    [
      this.headerGreetingGlowEnabled,
      this.headerDateGlowEnabled,
      this.headerTimeGlowEnabled,
      this.headerNextPrayerGlowEnabled,
      this.headerCompactWeatherGlowEnabled,
    ].forEach((toggle) => {
      if (!toggle) return;
      toggle.addEventListener("change", () => {
        this.updateHeaderGlowColorLockState();
        this.applyHeaderQuickControlsInstantly();
      });
    });

    if (this.headerWholeComponentSurfaceEnabled) {
      this.headerWholeComponentSurfaceEnabled.addEventListener("change", () => {
        this.updateHeaderSurfaceBackgroundsLockState();
        this.applyHeaderQuickControlsInstantly();
      });
    }

    [
      this.showGreeting,
      this.showDate,
      this.showNextPrayer,
      this.headerGreetingBgEnabled,
      this.headerDateBgEnabled,
      this.headerTimeBgEnabled,
      this.headerNextPrayerBgEnabled,
      this.headerCompactWeatherBgEnabled,
      this.headerGreetingGlowColor,
      this.headerDateGlowColor,
      this.headerTimeGlowColor,
      this.headerNextPrayerGlowColor,
      this.headerCompactWeatherGlowColor,
    ].forEach((control) => {
      if (!control) return;
      control.addEventListener("change", () => {
        this.applyHeaderQuickControlsInstantly();
      });
    });

    // Heading settings - clock format toggle (show/hide AM/PM option)
    this.clockFormatRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        this.toggleAmPmOption(radio.value === "12h");
      });
    });

    this.clockStyleRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        this.syncClockSurfaceToggleState(radio.value);
        this.applyHeaderQuickControlsInstantly();
      });
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        this.changelogModal?.classList.contains("active")
      ) {
        e.preventDefault();
        this.closeChangelogModal();
        return;
      }

      if (e.key === "Escape" && this.modal?.classList.contains("active")) {
        this.closeModal();
      }
    });
  }

  testBrowserNotification() {
    if (!this.debugEnabled) return;

    try {
      const hasChromeNotifications =
        typeof chrome !== "undefined" &&
        chrome.notifications &&
        typeof chrome.notifications.create === "function";

      const hasBrowserNotifications =
        typeof browser !== "undefined" &&
        browser.notifications &&
        typeof browser.notifications.create === "function";

      if (!hasChromeNotifications && !hasBrowserNotifications) {
        this.showToast("Notifications API not available here.", "error");
        return;
      }

      const options = {
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: "Muslim Dashboard",
        message: "This is a test notification from the Debug tab.",
        priority: 0,
      };

      if (hasChromeNotifications) {
        chrome.notifications.create(options, (notificationId) => {
          const err = chrome.runtime?.lastError;
          if (err) {
            this.showToast(
              `Notification failed: ${err.message || String(err)}`,
              "error",
            );
            return;
          }
          this.showToast(
            `Test notification sent${
              notificationId ? ": " + notificationId : ""
            }.`,
            "success",
          );
        });
        return;
      }

      // Firefox-style promise API
      Promise.resolve(browser.notifications.create("md-debug-test", options))
        .then(() => this.showToast("Test notification sent.", "success"))
        .catch((e) =>
          this.showToast(`Notification failed: ${e?.message || e}`, "error"),
        );
    } catch (e) {
      this.showToast(`Notification failed: ${e?.message || e}`, "error");
    }
  }

  updatePocketQuranReciterPickerLabel() {
    const btn = this.pocketQuranReciterPickerBtn;
    const labelEl = this.pocketQuranReciterPickerLabel;
    if (!btn || !labelEl) return;

    const pq = this.storage.getSettings()?.pocketQuran || {};
    const parsedId = parseInt(pq.reciterId, 10);
    const reciterId = Number.isFinite(parsedId) ? parsedId : 7;

    const cachedReciters = this.storage.get("pocketQuran_reciters_cache", []);
    let label = "";

    if (Array.isArray(cachedReciters)) {
      const reciter = cachedReciters.find((r) => r?.id === reciterId);
      if (reciter) {
        const name = String(reciter.name || "").trim();
        const style = String(reciter.style || "").trim();
        label = style ? `${name} (${style})` : name;
      }
    }

    if (!label) {
      const fallbackNames = {
        1: "Abdul Basit Abdul Samad (Murattal)",
        2: "Abdul Basit Abdul Samad (Mujawwad)",
        3: "Abdur-Rahman as-Sudais",
        4: "Abu Bakr al-Shatri",
        5: "Hani ar-Rifai",
        6: "Mahmoud Khalil Al-Husary",
        7: "Mishary Rashid Alafasy",
      };
      label = fallbackNames[reciterId] || `Reciter #${reciterId}`;
    }

    labelEl.textContent = label;
    btn.title = `Current reciter: ${label}`;
  }

  updatePocketQuranArabicFontPickerLabel() {
    const btn = this.pocketQuranArabicFontPickerBtn;
    const labelEl = this.pocketQuranArabicFontPickerLabel;
    if (!btn || !labelEl) return;

    const pq = this.storage.getSettings()?.pocketQuran || {};
    const font = this.normalizePocketQuranArabicFontFamily(pq.arabicFontFamily);

    labelEl.textContent = font;
    btn.title = `Current Arabic font: ${font}`;
  }

  updatePocketQuranPopupArabicFontPickerLabel() {
    const btn = this.pocketQuranPopupArabicFontPickerBtn;
    const labelEl = this.pocketQuranPopupArabicFontPickerLabel;
    if (!btn || !labelEl) return;

    const settings = this.storage.getSettings() || {};
    const pq = settings.pocketQuran || {};
    const pqPopup = settings.pocketQuranPopup || {};

    const font = this.normalizePocketQuranArabicFontFamily(
      this.pocketQuranPopupArabicFontFamily?.value ||
        pqPopup.arabicFontFamily ||
        pq.arabicFontFamily,
    );

    if (this.pocketQuranPopupArabicFontFamily) {
      this.pocketQuranPopupArabicFontFamily.value = font;
    }

    labelEl.textContent = font;
    btn.title = `Current popup Arabic font: ${font}`;
  }

  getContentFontPickerConfigs() {
    return [
      {
        card: "quotes",
        kind: "arabic",
        btnId: "quotesArabicFontPickerBtn",
        labelId: "quotesArabicFontPickerLabel",
        title: "Quotes Arabic Font",
        manager: this.quotes,
      },
      {
        card: "quotes",
        kind: "translation",
        btnId: "quotesTranslationFontPickerBtn",
        labelId: "quotesTranslationFontPickerLabel",
        title: "Quotes Translation Font",
        manager: this.quotes,
      },
      {
        card: "flashcards",
        kind: "arabic",
        btnId: "flashcardsArabicFontPickerBtn",
        labelId: "flashcardsArabicFontPickerLabel",
        title: "Flashcards Arabic Font",
        manager: this.flashcards,
      },
      {
        card: "flashcards",
        kind: "translation",
        btnId: "flashcardsTranslationFontPickerBtn",
        labelId: "flashcardsTranslationFontPickerLabel",
        title: "Flashcards Translation Font",
        manager: this.flashcards,
      },
      {
        card: "hadith",
        kind: "arabic",
        btnId: "hadithArabicFontPickerBtn",
        labelId: "hadithArabicFontPickerLabel",
        title: "Hadith Arabic Font",
        manager: this.hadith,
      },
      {
        card: "hadith",
        kind: "translation",
        btnId: "hadithTranslationFontPickerBtn",
        labelId: "hadithTranslationFontPickerLabel",
        title: "Hadith Translation Font",
        manager: this.hadith,
      },
      {
        card: "adhkar",
        kind: "arabic",
        btnId: "adhkarArabicFontPickerBtn",
        labelId: "adhkarArabicFontPickerLabel",
        title: "Adhkar Arabic Font",
        manager: this.adhkar,
      },
      {
        card: "adhkar",
        kind: "translation",
        btnId: "adhkarTranslationFontPickerBtn",
        labelId: "adhkarTranslationFontPickerLabel",
        title: "Adhkar Translation Font",
        manager: this.adhkar,
      },
    ];
  }

  getContentFontFamilies(kind) {
    if (kind === "translation") {
      return [
        "Poppins",
        "Noto Naskh Arabic",
        "Amiri",
        "Georgia",
        "Cascadia Code",
        "Courier New",
      ];
    }

    return [
      "Noto Naskh Arabic",
      "Amiri",
      "KFGQPC Uthman Taha Naskh",
      "KFGQPC KSA Regular",
      "KFGQPC Kufi Stylistic Regular",
      "KFGQPC AN Regular",
      "KFGQPC AlJalil Dot",
      "KFGQPC Sindhi Naskh Regular",
    ];
  }

  getContentFontPreviewText(kind) {
    return kind === "translation"
      ? "The quick brown fox jumps over the lazy dog"
      : "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
  }

  resolveContentTranslationFontCssValue(fontFamily) {
    if (fontFamily === "Georgia") return '"Georgia", serif';
    if (fontFamily === "Courier New") return '"Courier New", monospace';
    if (fontFamily === "Cascadia Code") {
      return '"Cascadia Code", "JetBrains Mono", Consolas, monospace';
    }
    return `"${fontFamily}", var(--font-primary)`;
  }

  getContentFontConfig(card, kind) {
    return this.getContentFontPickerConfigs().find(
      (cfg) => cfg.card === card && cfg.kind === kind,
    );
  }

  getCurrentContentFont(cfg) {
    const manager = cfg?.manager;
    const normalizer =
      cfg?.kind === "translation"
        ? manager?.normalizeTranslationFontFamily
        : manager?.normalizeArabicFontFamily;
    const current =
      cfg?.kind === "translation"
        ? manager?._translationFontFamily
        : manager?._arabicFontFamily;
    const fallback =
      cfg?.kind === "translation" ? "Poppins" : "Noto Naskh Arabic";
    return typeof normalizer === "function"
      ? normalizer.call(manager, current)
      : fallback;
  }

  bindContentFontPickerButtons() {
    this.getContentFontPickerConfigs().forEach((cfg) => {
      const btn = document.getElementById(cfg.btnId);
      if (!btn || btn.dataset.bound === "true") return;
      btn.dataset.bound = "true";
      btn.addEventListener("click", () => this.openContentFontPickerModal(cfg));
    });
  }

  applyStoredContentFontSettings() {
    const settings = this.storage.getSettings() || {};
    const values = {
      quotes: {
        arabic: settings.quoteArabicFontFamily,
        translation: settings.quoteTranslationFontFamily,
      },
      flashcards: {
        arabic: settings.flashcards?.arabicFontFamily,
        translation: settings.flashcards?.translationFontFamily,
      },
      hadith: {
        arabic: settings.hadith?.arabicFontFamily,
        translation: settings.hadith?.translationFontFamily,
      },
      adhkar: {
        arabic: settings.adhkar?.arabicFontFamily,
        translation: settings.adhkar?.translationFontFamily,
      },
    };

    this.getContentFontPickerConfigs().forEach((cfg) => {
      const method =
        cfg.kind === "translation"
          ? "applyTranslationFontFamily"
          : "applyArabicFontFamily";
      const font = values[cfg.card]?.[cfg.kind];
      if (cfg.manager && typeof cfg.manager[method] === "function") {
        cfg.manager[method](font, { persist: false });
      }
    });
  }

  updateContentFontPickerLabels() {
    this.getContentFontPickerConfigs().forEach((cfg) => {
      const btn = document.getElementById(cfg.btnId);
      const label = document.getElementById(cfg.labelId);
      if (!btn || !label) return;
      const font = this.getCurrentContentFont(cfg);
      label.textContent = font;
      btn.title = `Current ${cfg.title.replace(/^/, "").toLowerCase()}: ${font}`;
    });
  }

  ensureContentFontPickerModal() {
    let modal = document.getElementById("settingsContentFontModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "settingsContentFontModal";
    modal.className = "pq-bookmark-modal";
    modal.innerHTML = `
      <div class="pq-bookmark-modal-content pq-translation-modal-content">
        <div class="pq-bookmark-modal-header">
          <h3 class="pq-bookmark-modal-title">Font</h3>
          <button type="button" class="pq-bookmark-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="pq-bookmark-modal-body">
          <div class="pq-bookmark-search">
            <input type="text" class="pq-bookmark-search-input settings-content-font-search" placeholder="Search fonts..." />
          </div>
          <div class="pq-translation-list">
            <div class="pq-translation-items settings-content-font-items"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal
      .querySelector(".pq-bookmark-modal-close")
      ?.addEventListener("click", () => this.closeContentFontPickerModal());
    this._bindOverlayCloseBehavior(modal, () =>
      this.closeContentFontPickerModal(),
    );
    modal
      .querySelector(".settings-content-font-search")
      ?.addEventListener("input", (event) => {
        this.renderContentFontList(event.target?.value || "");
      });
    return modal;
  }
});

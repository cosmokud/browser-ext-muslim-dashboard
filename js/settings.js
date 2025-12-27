/**
 * Settings Manager
 * Handles settings modal and configuration for all features
 * Supports 25+ calculation methods, visibility settings, quotes import/export
 */

class SettingsManager {
  constructor(storage, prayerTimes, qibla, quotes, backgrounds) {
    this.storage = storage;
    this.prayerTimes = prayerTimes;
    this.qibla = qibla;
    this.quotes = quotes;
    this.backgrounds = backgrounds;

    // Modal elements
    this.modal = document.getElementById("settingsModal");
    this.settingsBtn = document.getElementById("settingsBtn");
    this.closeBtn = document.getElementById("settingsClose");
    this.saveBtn = document.getElementById("saveSettingsBtn");

    // Tabs
    this.tabs = document.querySelectorAll(".settings-tab");
    this.panels = document.querySelectorAll(".settings-panel");

    // Location elements
    this.locationMethodRadios = document.querySelectorAll(
      'input[name="locationMethod"]'
    );
    this.manualLocationFields = document.getElementById("manualLocationFields");
    this.cityInput = document.getElementById("cityInput");
    this.latitudeInput = document.getElementById("latitudeInput");
    this.longitudeInput = document.getElementById("longitudeInput");
    this.searchCityBtn = document.getElementById("searchCityBtn");
    this.requestLocationBtn = document.getElementById("requestLocationBtn");

    // Prayer elements
    this.calculationMethod = document.getElementById("calculationMethod");
    this.customAnglesGroup = document.getElementById("customAnglesGroup");
    this.customFajrAngle = document.getElementById("customFajrAngle");
    this.customIshaAngle = document.getElementById("customIshaAngle");
    this.customIshaMinutes = document.getElementById("customIshaMinutes");
    this.asrMethod = document.getElementById("asrMethod");
    this.highLatMethod = document.getElementById("highLatMethod");
    this.midnightMethod = document.getElementById("midnightMethod");
    this.duhaOffset = document.getElementById("duhaOffset");

    // Prayer visibility checkboxes
    this.visibilityCheckboxes = {
      fajr: document.getElementById("showFajr"),
      sunrise: document.getElementById("showSunrise"),
      duha: document.getElementById("showDuha"),
      dhuhr: document.getElementById("showDhuhr"),
      asr: document.getElementById("showAsr"),
      maghrib: document.getElementById("showMaghrib"),
      isha: document.getElementById("showIsha"),
      midnight: document.getElementById("showMidnight"),
      qiyam: document.getElementById("showQiyam"),
    };

    // Prayer adjustment inputs
    this.adjustmentInputs = {
      fajr: document.getElementById("adjustFajr"),
      sunrise: document.getElementById("adjustSunrise"),
      duha: document.getElementById("adjustDuha"),
      dhuhr: document.getElementById("adjustDhuhr"),
      asr: document.getElementById("adjustAsr"),
      maghrib: document.getElementById("adjustMaghrib"),
      isha: document.getElementById("adjustIsha"),
      midnight: document.getElementById("adjustMidnight"),
      qiyam: document.getElementById("adjustQiyam"),
    };

    // Quote elements
    this.useDefaultQuotes = document.getElementById("useDefaultQuotes");
    this.useUserQuotes = document.getElementById("useUserQuotes");
    this.newQuoteText = document.getElementById("newQuoteText");
    this.newQuoteSource = document.getElementById("newQuoteSource");
    this.newQuoteArabic = document.getElementById("newQuoteArabic");
    this.addQuoteBtn = document.getElementById("addQuoteBtn");

    // Background elements
    this.bgInterval = document.getElementById("bgInterval");
    this.customBgInterval = document.getElementById("customBgInterval");
    this.customIntervalGroup = document.getElementById("customIntervalGroup");
    this.bgCategory = document.getElementById("bgCategory");
    this.changeBackgroundBtn = document.getElementById("changeBackgroundBtn");

    // Angle display elements
    this.currentFajrAngle = document.getElementById("currentFajrAngle");
    this.currentIshaAngle = document.getElementById("currentIshaAngle");

    // Settings import/export
    this.importSettingsBtn = document.getElementById("importSettingsBtn");
    this.exportSettingsBtn = document.getElementById("exportSettingsBtn");
    this.importSettingsInput = document.getElementById("importSettingsInput");

    // Layout settings elements
    this.slotButtons = document.querySelectorAll(".slot-btn");
    this.containerWidth = document.getElementById("containerWidth");
    this.customWidthGroup = document.getElementById("customWidthGroup");
    this.customWidthSlider = document.getElementById("customWidthSlider");
    this.customWidthValue = document.getElementById("customWidthValue");
    this.showSideContainers = document.getElementById("showSideContainers");
    this.sideContainersOptions = document.getElementById(
      "sideContainersOptions"
    );
    this.sideAlignment = document.getElementById("sideAlignment");
    this.resetLayoutBtn = document.getElementById("resetLayoutBtn");

    // Components settings elements
    this.componentsList = document.getElementById("componentsList");
    this.addComponentSelect = document.getElementById("addComponentSelect");
    this.addComponentBtn = document.getElementById("addComponentBtn");

    // Prayer calculation methods reference
    this.prayerMethods = {
      MWL: { fajr: 18, isha: 17 },
      ISNA: { fajr: 15, isha: 15 },
      Egypt: { fajr: 19.5, isha: 17.5 },
      Makkah: { fajr: 18.5, isha: "90 min" },
      Karachi: { fajr: 18, isha: 18 },
      Tehran: { fajr: 17.7, isha: 14 },
      Jafari: { fajr: 16, isha: 14 },
      Kuwait: { fajr: 18, isha: 17.5 },
      Qatar: { fajr: 18, isha: "90 min" },
      Dubai: { fajr: 18.2, isha: 18.2 },
      Jordan: { fajr: 18, isha: 18 },
      Palestine: { fajr: 18, isha: 18 },
      Algeria: { fajr: 18, isha: 17 },
      Morocco: { fajr: 19, isha: 17 },
      Tunisia: { fajr: 18, isha: 18 },
      Singapore: { fajr: 20, isha: 18 },
      Malaysia: { fajr: 20, isha: 18 },
      Indonesia: { fajr: 20, isha: 18 },
      Brunei: { fajr: 20, isha: 18 },
      Turkey: { fajr: 18, isha: 17 },
      France: { fajr: 12, isha: 12 },
      Germany: { fajr: 18, isha: 17 },
      Russia: { fajr: 16, isha: 15 },
      Custom: { fajr: 18, isha: 17 },
    };
  }

  /**
   * Initialize settings
   */
  init() {
    this.loadSettings();
    this.setupEventListeners();
    this.updateAngleDisplay();
  }

  /**
   * Update angle display based on selected method
   */
  updateAngleDisplay() {
    const method = this.calculationMethod?.value || "MWL";
    const angles = this.prayerMethods[method] || this.prayerMethods.MWL;

    if (this.currentFajrAngle) {
      this.currentFajrAngle.textContent = `${angles.fajr}°`;
    }
    if (this.currentIshaAngle) {
      const ishaValue =
        typeof angles.isha === "string" ? angles.isha : `${angles.isha}°`;
      this.currentIshaAngle.textContent = ishaValue;
    }
  }

  /**
   * Load settings into form
   */
  loadSettings() {
    const settings = this.storage.getSettings();

    // Location settings
    const locationRadio = document.querySelector(
      `input[name="locationMethod"][value="${settings.locationMethod}"]`
    );
    if (locationRadio) locationRadio.checked = true;
    this.toggleManualLocation(settings.locationMethod === "manual");

    if (this.cityInput) this.cityInput.value = settings.city || "";
    if (this.latitudeInput) this.latitudeInput.value = settings.latitude || "";
    if (this.longitudeInput)
      this.longitudeInput.value = settings.longitude || "";

    // Prayer settings
    if (this.calculationMethod)
      this.calculationMethod.value = settings.calculationMethod;
    if (this.asrMethod) this.asrMethod.value = settings.asrMethod;
    if (this.highLatMethod) this.highLatMethod.value = settings.highLatMethod;
    if (this.midnightMethod)
      this.midnightMethod.value = settings.midnightMethod;
    if (this.duhaOffset) this.duhaOffset.value = settings.duhaOffset;

    // Custom angles
    if (this.customFajrAngle)
      this.customFajrAngle.value = settings.customFajrAngle;
    if (this.customIshaAngle)
      this.customIshaAngle.value = settings.customIshaAngle;
    if (this.customIshaMinutes)
      this.customIshaMinutes.checked = settings.customIshaMinutes;
    this.toggleCustomAngles(settings.calculationMethod === "Custom");

    // Prayer visibility
    for (const prayer in this.visibilityCheckboxes) {
      if (this.visibilityCheckboxes[prayer]) {
        this.visibilityCheckboxes[prayer].checked =
          settings.prayerVisibility[prayer];
      }
    }

    // Adjustments
    for (const prayer in this.adjustmentInputs) {
      if (this.adjustmentInputs[prayer] && settings.adjustments) {
        this.adjustmentInputs[prayer].value = settings.adjustments[prayer] || 0;
      }
    }

    // Quote settings
    if (this.useDefaultQuotes)
      this.useDefaultQuotes.checked = settings.useDefaultQuotes;
    if (this.useUserQuotes) this.useUserQuotes.checked = settings.useUserQuotes;

    // Background settings
    if (
      settings.bgInterval === "custom" ||
      !["15", "30", "60", "120", "1440"].includes(String(settings.bgInterval))
    ) {
      if (this.bgInterval) this.bgInterval.value = "custom";
      if (this.customBgInterval)
        this.customBgInterval.value =
          settings.customBgInterval || settings.bgInterval || 60;
      this.toggleCustomInterval(true);
    } else {
      if (this.bgInterval) this.bgInterval.value = settings.bgInterval;
      this.toggleCustomInterval(false);
    }
    if (this.bgCategory) this.bgCategory.value = settings.bgCategory;

    // Layout settings
    this.loadLayoutSettings(settings);

    // Update angle display
    this.updateAngleDisplay();
  }

  /**
   * Load layout settings
   */
  loadLayoutSettings(settings) {
    // Slots per row
    const slotsPerRow = settings.dockSlotsPerRow || 3;
    this.slotButtons.forEach((btn) => {
      btn.classList.toggle(
        "active",
        parseInt(btn.dataset.slots) === slotsPerRow
      );
    });

    // Container width
    if (this.containerWidth) {
      this.containerWidth.value = settings.dockContainerWidth || "default";
      this.toggleCustomWidth(settings.dockContainerWidth === "custom");
    }

    // Custom width slider
    if (this.customWidthSlider) {
      this.customWidthSlider.value = settings.dockCustomWidth || 80;
    }
    if (this.customWidthValue) {
      this.customWidthValue.textContent = `${settings.dockCustomWidth || 80}vw`;
    }

    // Side containers
    if (this.showSideContainers) {
      this.showSideContainers.checked =
        settings.dockShowSideContainers || false;
      this.toggleSideContainerOptions(settings.dockShowSideContainers || false);
    }

    // Side alignment
    if (this.sideAlignment) {
      this.sideAlignment.value = settings.dockSideAlignment || "center";
    }

    // Load components list
    this.renderComponentsList();
  }

  /**
   * Render the components list in settings
   */
  renderComponentsList() {
    if (!this.componentsList || !window.dockManager) return;

    const components = window.dockManager.getComponentsList();

    this.componentsList.innerHTML = "";

    components.forEach((comp) => {
      const item = document.createElement("div");
      item.className = `component-item ${comp.active ? "" : "inactive"}`;
      item.dataset.componentId = comp.id;

      item.innerHTML = `
        <div class="component-item-info">
          <span class="component-item-icon">${comp.icon}</span>
          <div>
            <div class="component-item-name">${comp.name}</div>
            <div class="component-item-status">${
              comp.active ? "Active" : "Not in layout"
            }</div>
          </div>
        </div>
        <div class="component-item-actions">
          ${
            comp.active
              ? `<button class="component-remove-btn" data-id="${comp.id}">Remove</button>`
              : `<button class="component-toggle-btn" data-id="${comp.id}">Add</button>`
          }
        </div>
      `;

      this.componentsList.appendChild(item);
    });

    // Bind remove buttons
    this.componentsList
      .querySelectorAll(".component-remove-btn")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const compId = e.target.dataset.id;
          if (window.dockManager) {
            window.dockManager.removeComponent(compId);
            this.renderComponentsList();
            this.updateAddComponentSelect();
          }
        });
      });

    // Bind add buttons
    this.componentsList
      .querySelectorAll(".component-toggle-btn")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const compId = e.target.dataset.id;
          if (window.dockManager) {
            window.dockManager.addComponent(compId, "main");
            this.renderComponentsList();
            this.updateAddComponentSelect();
          }
        });
      });

    // Update add component select
    this.updateAddComponentSelect();
  }

  /**
   * Update the add component dropdown
   */
  updateAddComponentSelect() {
    if (!this.addComponentSelect || !window.dockManager) return;

    const available = window.dockManager.getAvailableComponents();

    this.addComponentSelect.innerHTML =
      '<option value="">-- Select Component --</option>';

    available.forEach((comp) => {
      const option = document.createElement("option");
      option.value = comp.id;
      option.textContent = `${comp.icon} ${comp.name}`;
      this.addComponentSelect.appendChild(option);
    });
  }

  /**
   * Toggle custom width slider
   */
  toggleCustomWidth(show) {
    if (this.customWidthGroup) {
      this.customWidthGroup.style.display = show ? "block" : "none";
    }
  }

  /**
   * Toggle side container options
   */
  toggleSideContainerOptions(show) {
    if (this.sideContainersOptions) {
      this.sideContainersOptions.style.display = show ? "block" : "none";
    }
  }

  /**
   * Toggle custom interval input
   */
  toggleCustomInterval(show) {
    if (this.customIntervalGroup) {
      this.customIntervalGroup.style.display = show ? "block" : "none";
    }
  }

  /**
   * Save settings
   */
  saveSettings() {
    const settings = this.storage.getSettings();

    // Location settings
    const locationRadio = document.querySelector(
      'input[name="locationMethod"]:checked'
    );
    if (locationRadio) settings.locationMethod = locationRadio.value;
    settings.city = this.cityInput?.value || "";
    settings.latitude = parseFloat(this.latitudeInput?.value) || null;
    settings.longitude = parseFloat(this.longitudeInput?.value) || null;

    // Prayer settings
    settings.calculationMethod = this.calculationMethod?.value || "MWL";
    settings.asrMethod = this.asrMethod?.value || "Standard";
    settings.highLatMethod = this.highLatMethod?.value || "NightMiddle";
    settings.midnightMethod = this.midnightMethod?.value || "Standard";
    settings.duhaOffset = parseInt(this.duhaOffset?.value) || 20;

    // Custom angles
    settings.customFajrAngle = parseFloat(this.customFajrAngle?.value) || 18;
    settings.customIshaAngle = parseFloat(this.customIshaAngle?.value) || 17;
    settings.customIshaMinutes = this.customIshaMinutes?.checked || false;

    // Prayer visibility
    settings.prayerVisibility = {};
    for (const prayer in this.visibilityCheckboxes) {
      settings.prayerVisibility[prayer] =
        this.visibilityCheckboxes[prayer]?.checked || false;
    }

    // Adjustments
    settings.adjustments = {};
    for (const prayer in this.adjustmentInputs) {
      settings.adjustments[prayer] =
        parseInt(this.adjustmentInputs[prayer]?.value) || 0;
    }

    // Quote settings
    settings.useDefaultQuotes = this.useDefaultQuotes?.checked ?? true;
    settings.useUserQuotes = this.useUserQuotes?.checked ?? true;

    // Background settings
    const bgIntervalValue = this.bgInterval?.value;
    if (bgIntervalValue === "custom") {
      settings.bgInterval = "custom";
      settings.customBgInterval = parseInt(this.customBgInterval?.value) || 60;
    } else {
      settings.bgInterval = parseInt(bgIntervalValue) || 60;
      settings.customBgInterval = null;
    }
    settings.bgCategory = this.bgCategory?.value || "nature";

    // Layout settings
    const activeSlotBtn = document.querySelector(".slot-btn.active");
    settings.dockSlotsPerRow = activeSlotBtn
      ? parseInt(activeSlotBtn.dataset.slots)
      : 3;
    settings.dockContainerWidth = this.containerWidth?.value || "default";
    settings.dockCustomWidth = parseInt(this.customWidthSlider?.value) || 80;
    settings.dockShowSideContainers = this.showSideContainers?.checked || false;
    settings.dockSideAlignment = this.sideAlignment?.value || "center";

    // Save to storage
    this.storage.saveSettings(settings);

    // Apply changes
    this.applySettings(settings);

    // Apply layout changes if DockManager exists
    if (window.dockManager) {
      window.dockManager.setSlotsPerRow(settings.dockSlotsPerRow);
      window.dockManager.setContainerWidth(
        settings.dockContainerWidth,
        settings.dockCustomWidth
      );
      window.dockManager.setSideContainers(
        settings.dockShowSideContainers,
        settings.dockSideAlignment
      );
    }

    // Show confirmation
    this.showToast("Settings saved successfully!", "success");

    // Close modal
    this.closeModal();
  }

  /**
   * Export all dashboard settings as JSON
   */
  exportSettings() {
    const settings = this.storage.getSettings();
    const userQuotes = this.storage.getUserQuotes();
    const pinnedApps = this.storage.getPinnedApps();
    const todos = this.storage.getTodos();

    const exportData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      settings: settings,
      userQuotes: userQuotes,
      pinnedApps: pinnedApps,
      todos: todos,
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `muslim_dashboard_settings_${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast("Settings exported successfully!", "success");
  }

  /**
   * Import all dashboard settings from JSON
   */
  importSettings(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        if (!data.settings) {
          this.showToast("Invalid settings file format", "error");
          return;
        }

        // Import settings
        if (data.settings) {
          this.storage.saveSettings(data.settings);
        }

        // Import user quotes
        if (data.userQuotes && Array.isArray(data.userQuotes)) {
          this.storage.saveUserQuotes(data.userQuotes);
        }

        // Import pinned apps
        if (data.pinnedApps && Array.isArray(data.pinnedApps)) {
          this.storage.savePinnedApps(data.pinnedApps);
        }

        // Import todos
        if (data.todos && Array.isArray(data.todos)) {
          this.storage.saveTodos(data.todos);
        }

        this.showToast("Settings imported! Reloading...", "success");

        // Reload the page to apply all settings
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err) {
        this.showToast(
          "Failed to parse settings file: " + err.message,
          "error"
        );
      }
    };

    reader.onerror = () => {
      this.showToast("Failed to read file", "error");
    };

    reader.readAsText(file);
  }

  /**
   * Apply settings to components
   */
  applySettings(settings) {
    // Update prayer times
    if (this.prayerTimes) {
      this.prayerTimes.updateSettings(settings);
    }

    // Update location if manual
    if (
      settings.locationMethod === "manual" &&
      settings.latitude &&
      settings.longitude
    ) {
      if (this.prayerTimes) {
        this.prayerTimes.setManualLocation(
          settings.latitude,
          settings.longitude,
          settings.city
        );
      }
      if (this.qibla) {
        this.qibla.updateLocation(settings.latitude, settings.longitude);
      }
    } else if (this.prayerTimes) {
      this.prayerTimes.getLocation();
    }

    // Update background rotation
    if (this.backgrounds) {
      this.backgrounds.updateInterval(settings.bgInterval);
    }
  }

  /**
   * Toggle manual location fields
   */
  toggleManualLocation(show) {
    if (this.manualLocationFields) {
      if (show) {
        this.manualLocationFields.classList.add("active");
      } else {
        this.manualLocationFields.classList.remove("active");
      }
    }
  }

  /**
   * Toggle custom angles group
   */
  toggleCustomAngles(show) {
    if (this.customAnglesGroup) {
      this.customAnglesGroup.style.display = show ? "block" : "none";
    }
  }

  /**
   * Request location permission
   */
  async requestLocation() {
    if (this.prayerTimes) {
      await this.prayerTimes.requestLocation();
    }
  }

  /**
   * Search for city
   */
  async searchCity() {
    const cityName = this.cityInput?.value.trim();
    if (!cityName) {
      this.showToast("Please enter a city name", "error");
      return;
    }

    if (this.searchCityBtn) {
      this.searchCityBtn.textContent = "🔍 Searching...";
      this.searchCityBtn.disabled = true;
    }

    try {
      const results = await this.prayerTimes.searchCity(cityName);

      if (results && results.length > 0) {
        const result = results[0];
        if (this.cityInput) this.cityInput.value = result.city;
        if (this.latitudeInput)
          this.latitudeInput.value = result.latitude.toFixed(4);
        if (this.longitudeInput)
          this.longitudeInput.value = result.longitude.toFixed(4);
        this.showToast(`Found: ${result.city}`, "success");
      } else {
        this.showToast("City not found. Please try a different name.", "error");
      }
    } catch (error) {
      this.showToast("Search failed. Please try again.", "error");
    }

    if (this.searchCityBtn) {
      this.searchCityBtn.textContent = "🔍 Search City";
      this.searchCityBtn.disabled = false;
    }
  }

  /**
   * Add user quote
   */
  addUserQuote() {
    const text = this.newQuoteText?.value.trim();
    const source = this.newQuoteSource?.value.trim();
    const isArabic = this.newQuoteArabic?.checked || false;

    if (!text) {
      this.showToast("Please enter quote text", "error");
      return;
    }

    if (!source) {
      this.showToast("Please enter quote source", "error");
      return;
    }

    if (this.quotes) {
      this.quotes.addUserQuote(text, source, isArabic);
    }

    if (this.newQuoteText) this.newQuoteText.value = "";
    if (this.newQuoteSource) this.newQuoteSource.value = "";
    if (this.newQuoteArabic) this.newQuoteArabic.checked = false;

    this.showToast("Quote added!", "success");
  }

  /**
   * Open modal
   */
  openModal() {
    this.loadSettings();
    if (this.quotes) {
      this.quotes.renderQuotesList();
    }
    if (this.modal) {
      this.modal.classList.add("active");
    }
  }

  /**
   * Close modal
   */
  closeModal() {
    if (this.modal) {
      this.modal.classList.remove("active");
    }
  }

  /**
   * Switch tab
   */
  switchTab(tabName) {
    // Update tabs
    this.tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === tabName);
    });

    // Update panels
    this.panels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === `${tabName}Panel`);
    });

    // Refresh components list when switching to components tab
    if (tabName === "components") {
      this.renderComponentsList();
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = "info") {
    // Create toast container if not exists
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    // Create toast
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${type === "success" ? "✓" : type === "error" ? "✗" : "ℹ"}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    // Remove after delay
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Open/close modal
    if (this.settingsBtn) {
      this.settingsBtn.addEventListener("click", () => this.openModal());
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => this.closeModal());
    }
    if (this.saveBtn) {
      this.saveBtn.addEventListener("click", () => this.saveSettings());
    }

    if (this.modal) {
      this.modal.addEventListener("click", (e) => {
        if (e.target === this.modal) {
          this.closeModal();
        }
      });
    }

    // Tabs
    this.tabs.forEach((tab) => {
      tab.addEventListener("click", () => this.switchTab(tab.dataset.tab));
    });

    // Location method toggle
    this.locationMethodRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        this.toggleManualLocation(radio.value === "manual");
      });
    });

    // Request location permission
    if (this.requestLocationBtn) {
      this.requestLocationBtn.addEventListener("click", () =>
        this.requestLocation()
      );
    }

    // Search city
    if (this.searchCityBtn) {
      this.searchCityBtn.addEventListener("click", () => this.searchCity());
    }

    // Calculation method change - toggle custom angles and update display
    if (this.calculationMethod) {
      this.calculationMethod.addEventListener("change", (e) => {
        this.toggleCustomAngles(e.target.value === "Custom");
        this.updateAngleDisplay();
      });
    }

    // Add quote
    if (this.addQuoteBtn) {
      this.addQuoteBtn.addEventListener("click", () => this.addUserQuote());
    }

    // Background interval change - toggle custom input
    if (this.bgInterval) {
      this.bgInterval.addEventListener("change", (e) => {
        this.toggleCustomInterval(e.target.value === "custom");
      });
    }

    // Change background now
    if (this.changeBackgroundBtn) {
      this.changeBackgroundBtn.addEventListener("click", () => {
        const settings = this.storage.getSettings();
        if (this.bgCategory) {
          settings.bgCategory = this.bgCategory.value;
          this.storage.saveSettings(settings);
        }
        if (this.backgrounds) {
          this.backgrounds.updateCategory(this.bgCategory?.value || "nature");
          this.backgrounds.changeBackground();
        }
        this.showToast("Background changed!", "success");
      });
    }

    // Settings import/export
    if (this.exportSettingsBtn) {
      this.exportSettingsBtn.addEventListener("click", () =>
        this.exportSettings()
      );
    }
    if (this.importSettingsBtn) {
      this.importSettingsBtn.addEventListener("click", () => {
        if (this.importSettingsInput) {
          this.importSettingsInput.click();
        }
      });
    }
    if (this.importSettingsInput) {
      this.importSettingsInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          this.importSettings(file);
          this.importSettingsInput.value = "";
        }
      });
    }

    // Layout settings - Slot buttons
    this.slotButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.slotButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    // Container width change
    if (this.containerWidth) {
      this.containerWidth.addEventListener("change", (e) => {
        this.toggleCustomWidth(e.target.value === "custom");
      });
    }

    // Custom width slider
    if (this.customWidthSlider) {
      this.customWidthSlider.addEventListener("input", (e) => {
        if (this.customWidthValue) {
          this.customWidthValue.textContent = `${e.target.value}vw`;
        }
      });
    }

    // Side containers toggle
    if (this.showSideContainers) {
      this.showSideContainers.addEventListener("change", (e) => {
        this.toggleSideContainerOptions(e.target.checked);
      });
    }

    // Add component button
    if (this.addComponentBtn) {
      this.addComponentBtn.addEventListener("click", () => {
        const compId = this.addComponentSelect?.value;
        if (compId && window.dockManager) {
          window.dockManager.addComponent(compId, "main");
          this.renderComponentsList();
          this.showToast(`Component added!`, "success");
        }
      });
    }

    // Reset layout button
    if (this.resetLayoutBtn) {
      this.resetLayoutBtn.addEventListener("click", () => {
        if (
          confirm(
            "Reset layout to default? This will reset component positions and layout settings."
          )
        ) {
          // Reset layout settings
          this.slotButtons.forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.slots === "3");
          });
          if (this.containerWidth) this.containerWidth.value = "default";
          if (this.customWidthSlider) this.customWidthSlider.value = 80;
          if (this.customWidthValue) this.customWidthValue.textContent = "80vw";
          if (this.showSideContainers) this.showSideContainers.checked = false;
          if (this.sideAlignment) this.sideAlignment.value = "center";

          this.toggleCustomWidth(false);
          this.toggleSideContainerOptions(false);

          // Reset dock manager layout
          if (window.dockManager) {
            window.dockManager.resetLayout();
          }

          this.showToast("Layout reset to default!", "success");
        }
      });
    }

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.modal?.classList.contains("active")) {
        this.closeModal();
      }
    });
  }
}

// Export for use
window.SettingsManager = SettingsManager;

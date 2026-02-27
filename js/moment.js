class MomentModeManager {
  constructor(dashboard) {
    this.dashboard = dashboard;
    this.storage = dashboard.storage;
    this.active = false;

    this.momentBtn = null;
    this.exitBtn = null;
    this.layoutRoot = null;

    this.originalPositions = new Map();
  }

  init() {
    this.momentBtn = document.getElementById("momentModeBtn");
    this.exitBtn = document.getElementById("momentModeExitBtn");
    this.layoutRoot = document.getElementById("momentModeLayout");

    if (!this.momentBtn || !this.layoutRoot) return;

    this.dashboard._momentModeActive = false;
    this.dashboard._setMomentModeEnabled = (enabled) => {
      this.setEnabled(enabled === true);
    };

    this.momentBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.setEnabled(!this.active);
    });

    if (this.exitBtn) {
      this.exitBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setEnabled(false);
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.active) {
        this.setEnabled(false);
      }
    });

    this.syncLayoutVisibility();

    try {
      const settings = this.storage.getSettings();
      if (
        settings.momentModeEnabled === true ||
        settings.lastDashboardMode === "moment"
      ) {
        this.setEnabled(true);
      }
    } catch (e) {}
  }

  isActive() {
    return this.active;
  }

  setEnabled(enabled) {
    const next = enabled === true;
    if (next === this.active) return;

    if (next) {
      this.enterMode();
      return;
    }

    this.exitMode();
  }

  getBindings() {
    return [
      {
        key: "prayerTimesCard",
        getElement: () => document.getElementById("prayerTimesCard"),
        slotId: "momentPrayerSlot",
      },
      {
        key: "fastingCard",
        getElement: () => document.getElementById("fastingCard"),
        slotId: "momentFastingSlot",
      },
      {
        key: "quoteSection",
        getElement: () => document.getElementById("quoteSection"),
        slotId: "momentQuoteSlot",
      },
      {
        key: "pinnedAppsSection",
        getElement: () => document.getElementById("pinnedAppsSection"),
        slotId: "momentPinnedAppsSlot",
      },
      {
        key: "searchBarSection",
        getElement: () => document.getElementById("searchBarSection"),
        slotId: "momentSearchSlot",
      },
      {
        key: "timeSection",
        getElement: () => document.querySelector(".time-section"),
        slotId: "momentClockSlot",
      },
    ];
  }

  captureOriginalPosition(key, element) {
    if (!element || this.originalPositions.has(key)) return;

    this.originalPositions.set(key, {
      parent: element.parentNode,
      nextSibling: element.nextSibling,
    });
  }

  moveComponentsIntoMomentLayout() {
    this.getBindings().forEach((binding) => {
      const element = binding.getElement();
      const slot = document.getElementById(binding.slotId);
      if (!element || !slot) return;

      this.captureOriginalPosition(binding.key, element);
      slot.appendChild(element);
    });
  }

  restoreComponentsFromMomentLayout() {
    this.getBindings().forEach((binding) => {
      const element = binding.getElement();
      const original = this.originalPositions.get(binding.key);
      if (!element || !original || !original.parent) return;

      if (
        original.nextSibling &&
        original.nextSibling.parentNode === original.parent
      ) {
        original.parent.insertBefore(element, original.nextSibling);
      } else {
        original.parent.appendChild(element);
      }
    });

    this.originalPositions.clear();
  }

  closeFabMenu() {
    const fabMenu = document.getElementById("fabMenu");
    const fabToggle = document.getElementById("fabMenuToggle");
    const fabItems = document.getElementById("fabMenuItems");

    if (!fabMenu || !fabMenu.classList.contains("open")) return;

    fabMenu.classList.remove("open");
    if (fabToggle) {
      fabToggle.setAttribute("aria-expanded", "false");
      fabToggle.setAttribute("aria-label", "Open menu");
    }

    if (fabItems) {
      try {
        const active = document.activeElement;
        if (active && fabItems.contains(active)) {
          active.blur();
        }
      } catch (e) {}

      try {
        fabItems.setAttribute("inert", "");
      } catch (e) {}
      fabItems.setAttribute("aria-hidden", "true");
    }
  }

  saveModeState(isEnabled) {
    try {
      const settings = this.storage.getSettings();
      settings.momentModeEnabled = isEnabled === true;

      if (isEnabled) {
        settings.sidebarModeEnabled = false;
        settings.quranFocusModeEnabled = false;
        settings.lastDashboardMode = "moment";
      } else if (settings.lastDashboardMode === "moment") {
        settings.lastDashboardMode = "normal";
      }

      this.storage.saveSettings(settings);
    } catch (e) {}
  }

  setEditModeLocked(locked) {
    try {
      if (
        this.dashboard.gridLayout &&
        typeof this.dashboard.gridLayout.setEditModeLocked === "function"
      ) {
        this.dashboard.gridLayout.setEditModeLocked(locked === true);
      } else if (
        this.dashboard.gridLayout &&
        locked === true &&
        typeof this.dashboard.gridLayout.disableEditMode === "function"
      ) {
        this.dashboard.gridLayout.disableEditMode();
      }
    } catch (e) {}
  }

  enterMode() {
    try {
      if (
        this.dashboard._quranFocusModeActive &&
        typeof this.dashboard._setQuranFocusModeEnabled === "function"
      ) {
        this.dashboard._setQuranFocusModeEnabled(false);
      }
    } catch (e) {}

    try {
      if (
        this.dashboard.sidebarModeEnabled &&
        typeof this.dashboard._setSidebarModeEnabled === "function"
      ) {
        this.dashboard._setSidebarModeEnabled(false);
      }
    } catch (e) {}

    this.setEditModeLocked(true);

    this.active = true;
    this.dashboard._momentModeActive = true;

    this.momentBtn.classList.add("active");
    this.momentBtn.setAttribute("aria-pressed", "true");

    document.body.classList.add("moment-mode");
    this.layoutRoot.setAttribute("aria-hidden", "false");

    this.moveComponentsIntoMomentLayout();
    this.syncLayoutVisibility();
    this.closeFabMenu();

    this.saveModeState(true);

    try {
      window.dispatchEvent(new Event("resize"));
    } catch (e) {}
  }

  exitMode() {
    this.active = false;
    this.dashboard._momentModeActive = false;

    this.momentBtn.classList.remove("active");
    this.momentBtn.setAttribute("aria-pressed", "false");

    document.body.classList.remove("moment-mode");
    this.layoutRoot.setAttribute("aria-hidden", "true");

    this.restoreComponentsFromMomentLayout();
    this.setEditModeLocked(false);

    this.saveModeState(false);

    try {
      window.dispatchEvent(new Event("resize"));
    } catch (e) {}
  }

  syncInteractionSettings() {
    const settings = this.storage.getSettings();
    const moment = settings.moment || {};
    const hoverAutoHide = moment.hoverAutoHide || {};

    const hoverBySlot = {
      momentPrayerSlot: hoverAutoHide.prayerTimes !== false,
      momentFastingSlot: hoverAutoHide.fasting !== false,
      momentQuoteSlot: hoverAutoHide.quotes !== false,
      momentPinnedAppsSlot: hoverAutoHide.quickPins !== false,
      momentSearchSlot: hoverAutoHide.searchBar !== false,
    };

    Object.entries(hoverBySlot).forEach(([slotId, enabled]) => {
      const slot = document.getElementById(slotId);
      if (!slot) return;
      slot.setAttribute("data-hover-autohide", enabled ? "true" : "false");
    });
  }

  syncLayoutVisibility() {
    const settings = this.storage.getSettings();
    const visibility = settings.componentVisibility || {};
    const heading = settings.heading || {};

    const visibilityBySlot = {
      momentPrayerSlot: visibility.prayerTimes !== false,
      momentFastingSlot: visibility.fasting !== false,
      momentQuoteSlot: visibility.quotes !== false,
      momentPinnedAppsSlot: visibility.quickPins !== false,
      momentSearchSlot: visibility.searchBar !== false,
      momentClockSlot:
        visibility.header !== false && heading.showClock !== false,
    };

    Object.entries(visibilityBySlot).forEach(([slotId, shouldShow]) => {
      const slot = document.getElementById(slotId);
      if (!slot) return;
      slot.style.display = shouldShow ? "" : "none";
      slot.setAttribute("aria-hidden", shouldShow ? "false" : "true");
    });

    this.syncInteractionSettings();
  }
}

window.MomentModeManager = MomentModeManager;

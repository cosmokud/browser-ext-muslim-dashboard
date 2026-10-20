/**
 * SettingsManager: debug mode and date controls.
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

  applyDebugModeVisibility() {
    const enabled = globalThis.ENABLE_DEBUG_MODE === true;
    this.debugEnabled = enabled;

    if (this.debugTab) {
      this.debugTab.classList.toggle("hidden", !enabled);
      this.debugTab.setAttribute("aria-hidden", enabled ? "false" : "true");
      this.debugTab.toggleAttribute("disabled", !enabled);
    }

    if (this.debugPanel) {
      this.debugPanel.classList.toggle("hidden", !enabled);
    }

    // Safety: if debug is disabled while the tab is active, go back to Location.
    if (!enabled && this.debugPanel?.classList.contains("active")) {
      this.switchTab("location");
    }
  }

  setDebugDateControlsEnabled(enabled) {
    const next = enabled === true;

    if (this.debugDateControls) {
      this.debugDateControls.classList.toggle("is-disabled", !next);
    }

    [
      this.debugSimDatePicker,
      this.debugSimDateYear,
      this.debugSimDateMonth,
      this.debugSimDateDay,
      this.debugSimDateTime,
    ]
      .filter(Boolean)
      .forEach((el) => {
        el.disabled = !next;
      });
  }

  normalizeDebugDateYMD(rawValue) {
    return DebugClock.normalizeDateYMD(rawValue);
  }

  getDebugDateFromParts() {
    const yearRaw = String(this.debugSimDateYear?.value || "").trim();
    const monthRaw = String(this.debugSimDateMonth?.value || "").trim();
    const dayRaw = String(this.debugSimDateDay?.value || "").trim();

    if (!yearRaw && !monthRaw && !dayRaw) {
      return "";
    }

    if (!yearRaw || !monthRaw || !dayRaw) {
      return "";
    }

    const year = parseInt(yearRaw, 10);
    const month = parseInt(monthRaw, 10);
    const day = parseInt(dayRaw, 10);

    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day)
    ) {
      return "";
    }

    const combined = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return this.normalizeDebugDateYMD(combined);
  }

  syncDebugDatePartsFromPicker() {
    const normalized = this.normalizeDebugDateYMD(
      this.debugSimDatePicker?.value,
    );

    if (!normalized) {
      if (this.debugSimDateYear) this.debugSimDateYear.value = "";
      if (this.debugSimDateMonth) this.debugSimDateMonth.value = "";
      if (this.debugSimDateDay) this.debugSimDateDay.value = "";
      return;
    }

    const [year, month, day] = normalized.split("-");
    if (this.debugSimDateYear) this.debugSimDateYear.value = year;
    if (this.debugSimDateMonth) this.debugSimDateMonth.value = month;
    if (this.debugSimDateDay) this.debugSimDateDay.value = day;
  }

  syncDebugDatePickerFromParts() {
    const normalized = this.getDebugDateFromParts();

    if (normalized) {
      if (this.debugSimDatePicker) this.debugSimDatePicker.value = normalized;
      return;
    }

    const hasAnyPart =
      String(this.debugSimDateYear?.value || "").trim() ||
      String(this.debugSimDateMonth?.value || "").trim() ||
      String(this.debugSimDateDay?.value || "").trim();

    if (!hasAnyPart && this.debugSimDatePicker) {
      this.debugSimDatePicker.value = "";
    }
  }

  loadDebugSettings(settings) {
    const debug =
      settings && typeof settings.debug === "object" ? settings.debug : {};

    const enabled = debug.simulatedDateEnabled === true;
    const normalized = this.normalizeDebugDateYMD(debug.simulatedDate);

    if (this.debugSimDateEnabled) {
      this.debugSimDateEnabled.checked = enabled;
    }

    if (this.debugSimDatePicker) {
      this.debugSimDatePicker.value = normalized || "";
    }

    if (normalized) {
      const [year, month, day] = normalized.split("-");
      if (this.debugSimDateYear) this.debugSimDateYear.value = year;
      if (this.debugSimDateMonth) this.debugSimDateMonth.value = month;
      if (this.debugSimDateDay) this.debugSimDateDay.value = day;
    } else {
      if (this.debugSimDateYear) this.debugSimDateYear.value = "";
      if (this.debugSimDateMonth) this.debugSimDateMonth.value = "";
      if (this.debugSimDateDay) this.debugSimDateDay.value = "";
    }

    if (this.debugSimDateTime) {
      this.debugSimDateTime.value = DebugClock.normalizeTimeHM(
        debug.simulatedTime,
      );
    }

    this.setDebugDateControlsEnabled(enabled);
  }

  saveDebugSettings(settings, options = {}) {
    const { showValidationErrors = true } = options;

    settings.debug =
      settings.debug && typeof settings.debug === "object"
        ? settings.debug
        : {};

    const enabled = this.debugSimDateEnabled?.checked === true;
    const fromPicker = this.normalizeDebugDateYMD(
      this.debugSimDatePicker?.value,
    );
    const fromParts = this.getDebugDateFromParts();
    const selectedDate = fromPicker || fromParts;

    if (enabled && !selectedDate) {
      if (showValidationErrors) {
        this.showToast(
          "Please select a valid simulated date (YYYY-MM-DD).",
          "error",
        );
        if (this.debugEnabled) {
          try {
            this.switchTab("debug");
          } catch (e) {}
        }
      }
      return false;
    }

    settings.debug.simulatedDateEnabled = enabled;
    settings.debug.simulatedDate =
      selectedDate || settings.debug.simulatedDate || null;
    settings.debug.simulatedTime =
      DebugClock.normalizeTimeHM(this.debugSimDateTime?.value) || null;

    return true;
  }
});

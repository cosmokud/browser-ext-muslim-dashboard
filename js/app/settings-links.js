/**
 * MuslimDashboard: opening settings from the URL.
 * Part of the class declared in js/app/index.js; load this after it.
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
})(MuslimDashboard.prototype, class {

  getSettingsTabFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search || "");
      const raw =
        params.get("settingsTab") || params.get("openSettingsTab") || "";
      const tab = String(raw).trim();
      if (!tab) return "";

      const allowedTabs = new Set(["location", "prayer"]);
      return allowedTabs.has(tab) ? tab : "";
    } catch (e) {
      return "";
    }
  }

  getSettingsTabFromHash() {
    try {
      const hashText = String(window.location.hash || "").replace(/^#/, "");
      if (!hashText) return "";

      const params = new URLSearchParams(hashText);
      const raw =
        params.get("settingsTab") || params.get("openSettingsTab") || "";
      const tab = String(raw).trim();
      if (!tab) return "";

      const allowedTabs = new Set(["location", "prayer"]);
      return allowedTabs.has(tab) ? tab : "";
    } catch (e) {
      return "";
    }
  }

  clearSettingsTabQueryFromUrl() {
    try {
      const url = new URL(window.location.href);
      let changed = false;

      if (
        url.searchParams.has("settingsTab") ||
        url.searchParams.has("openSettingsTab")
      ) {
        url.searchParams.delete("settingsTab");
        url.searchParams.delete("openSettingsTab");
        changed = true;
      }

      const hashText = String(url.hash || "").replace(/^#/, "");
      if (hashText) {
        const hashParams = new URLSearchParams(hashText);
        const hasSettingsTabInHash =
          hashParams.has("settingsTab") || hashParams.has("openSettingsTab");

        if (hasSettingsTabInHash) {
          hashParams.delete("settingsTab");
          hashParams.delete("openSettingsTab");
          changed = true;

          const nextHash = hashParams.toString();
          url.hash = nextHash ? `#${nextHash}` : "";
        }
      }

      if (!changed) return;

      const searchText = url.searchParams.toString();
      const nextUrl = `${url.pathname}${searchText ? `?${searchText}` : ""}${url.hash || ""}`;
      history.replaceState(null, "", nextUrl);
    } catch (e) {
      // ignore
    }
  }

  openSettingsFromUrlIfRequested() {
    const requestedTab =
      this.getSettingsTabFromUrl() || this.getSettingsTabFromHash();
    if (!requestedTab || !this.settings) return;

    try {
      this.settings.openModal();
      this.settings.switchTab(requestedTab);

      if (requestedTab === "location") {
        const locationFocusEl =
          document.getElementById("requestLocationBtn") ||
          document.getElementById("cityInput");
        locationFocusEl?.focus?.();
      } else if (requestedTab === "prayer") {
        const prayerFocusEl =
          document.getElementById("calculationMethod") ||
          document.getElementById("showFajr");
        prayerFocusEl?.focus?.();
      }
    } catch (e) {
      console.warn("Failed to open settings from URL:", e);
    }

    this.clearSettingsTabQueryFromUrl();
  }
});

/**
 * SettingsManager: settings search.
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

  normalizeSettingsSearchText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  applySettingsSearch(rawQuery = "") {
    const query = this.normalizeSettingsSearchText(rawQuery);
    const tabs = Array.from(this.tabs || []);
    const panels = Array.from(this.panels || []);
    const panelMatchMap = new Map();
    let hasVisibleTab = false;

    panels.forEach((panel) => {
      const tabName = panel.id.replace(/Panel$/, "");
      const relatedTab = tabs.find((tab) => tab.dataset.tab === tabName);
      const tabText = this.normalizeSettingsSearchText(
        relatedTab?.textContent || "",
      );
      const panelText = this.normalizeSettingsSearchText(panel.textContent);
      const tabDirectMatch = query ? tabText.includes(query) : false;
      const groups = Array.from(panel.querySelectorAll(".setting-group"));

      panel.classList.remove("settings-search-filtered-out");

      if (!query) {
        groups.forEach((group) => {
          group.classList.remove(
            "settings-search-filtered-out",
            "settings-search-match",
          );
        });
        panelMatchMap.set(panel.id, true);
        return;
      }

      if (!groups.length) {
        const matches = tabDirectMatch || panelText.includes(query);
        panel.classList.toggle("settings-search-filtered-out", !matches);
        panelMatchMap.set(panel.id, matches);
        return;
      }

      let matchedGroups = 0;
      groups.forEach((group) => {
        const groupText = this.normalizeSettingsSearchText(group.textContent);
        const matches = tabDirectMatch || groupText.includes(query);

        group.classList.toggle("settings-search-filtered-out", !matches);
        group.classList.toggle(
          "settings-search-match",
          !tabDirectMatch && groupText.includes(query),
        );

        if (matches) {
          matchedGroups += 1;
        }
      });

      const panelMatches =
        tabDirectMatch || matchedGroups > 0 || panelText.includes(query);
      panelMatchMap.set(panel.id, panelMatches);
    });

    tabs.forEach((tab) => {
      const isDebugLocked = tab.dataset.tab === "debug" && !this.debugEnabled;
      if (isDebugLocked) {
        return;
      }

      const panelId = `${tab.dataset.tab}Panel`;
      const tabText = this.normalizeSettingsSearchText(tab.textContent);
      const matches =
        !query ||
        tabText.includes(query) ||
        panelMatchMap.get(panelId) === true;

      tab.classList.toggle("settings-search-filtered-out", !matches);
      tab.classList.toggle("settings-search-match-tab", query && matches);
      tab.setAttribute("aria-hidden", matches ? "false" : "true");

      if (matches) {
        hasVisibleTab = true;
      }
    });

    if (query) {
      const hasVisibleActiveTab = tabs.some(
        (tab) =>
          tab.classList.contains("active") &&
          !tab.classList.contains("settings-search-filtered-out"),
      );

      if (!hasVisibleActiveTab) {
        const firstMatchTab = tabs.find(
          (tab) => !tab.classList.contains("settings-search-filtered-out"),
        );
        if (firstMatchTab?.dataset?.tab) {
          this.switchTab(firstMatchTab.dataset.tab);
        }
      }
    }

    if (this.settingsSearchClearBtn) {
      this.settingsSearchClearBtn.hidden = query.length === 0;
    }

    if (this.settingsSearchEmpty) {
      if (query && !hasVisibleTab) {
        const safeQuery = String(rawQuery || "").trim();
        this.settingsSearchEmpty.textContent = safeQuery
          ? `No settings matched "${safeQuery}".`
          : "No settings matched.";
        this.settingsSearchEmpty.classList.add("active");
      } else {
        this.settingsSearchEmpty.textContent = "";
        this.settingsSearchEmpty.classList.remove("active");
      }
    }

    this.updateSettingsTabsMinWidth();
  }

  resetSettingsSearch() {
    if (this.settingsSearchInput) {
      this.settingsSearchInput.value = "";
    }
    this.applySettingsSearch("");
  }

  setupSettingsSearchEventListeners() {
    if (
      this.settingsSearchInput &&
      this.settingsSearchInput.dataset.bound !== "1"
    ) {
      this.settingsSearchInput.dataset.bound = "1";

      this.settingsSearchInput.addEventListener("input", () => {
        this.applySettingsSearch(this.settingsSearchInput.value);
      });

      this.settingsSearchInput.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          this.resetSettingsSearch();
          this.settingsSearchInput.blur();
        }
      });
    }

    if (
      this.settingsSearchClearBtn &&
      this.settingsSearchClearBtn.dataset.bound !== "1"
    ) {
      this.settingsSearchClearBtn.dataset.bound = "1";
      this.settingsSearchClearBtn.addEventListener("click", () => {
        this.resetSettingsSearch();
        this.settingsSearchInput?.focus();
      });
    }
  }
});

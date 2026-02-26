/**
 * Popup Prayer Times
 * Reuses dashboard prayer calculations/settings so popup and grid stay in sync.
 */

document.addEventListener("DOMContentLoaded", () => {
  const storage = new StorageManager();
  const themes = new ThemeManager(storage);
  const iconThemes = new IconThemeManager(storage);

  // Expose icon theme manager for PrayerTimesManager.getIconHtml()
  window.dashboard = {
    iconThemes,
  };

  const prayerTimes = new PrayerTimesManager(storage);

  const prayerCard = document.getElementById("prayerTimesCard");
  const hiddenCard = document.getElementById("popupPrayerHiddenState");
  const openDashboardButton = document.getElementById("popupOpenDashboardBtn");
  const openLocationSettingsIcon = document.getElementById(
    "popupOpenLocationSettingsIcon",
  );
  const openPrayerSettingsButton = document.getElementById(
    "popupOpenPrayerSettingsBtn",
  );

  const settingsStorageKey = `${storage.prefix}settings`;
  const locationStorageKey = `${storage.prefix}lastLocation`;

  let prayerInitialized = false;
  let resyncIntervalId = null;

  function getDashboardUrl(pathWithQuery = "index.html") {
    return typeof chrome !== "undefined" && chrome.runtime?.getURL
      ? chrome.runtime.getURL(pathWithQuery)
      : pathWithQuery;
  }

  function closePopup() {
    try {
      window.close();
    } catch (e) {
      // ignore
    }
  }

  function openUrlInCurrentTab(url) {
    if (!url) return;

    const fallbackNavigate = () => {
      try {
        window.location.assign(url);
      } catch (error) {
        console.warn("Could not navigate to dashboard URL:", error);
      }
    };

    const updateTabAndClose = (tabId = null) => {
      if (!(typeof chrome !== "undefined" && chrome.tabs?.update)) {
        fallbackNavigate();
        return;
      }

      const onUpdated = () => {
        const lastError = chrome.runtime?.lastError;
        if (lastError) {
          console.warn("Could not update active tab:", lastError.message);
          fallbackNavigate();
          return;
        }

        closePopup();
      };

      if (typeof tabId === "number") {
        chrome.tabs.update(tabId, { url }, onUpdated);
        return;
      }

      chrome.tabs.update({ url }, onUpdated);
    };

    try {
      if (
        typeof chrome !== "undefined" &&
        chrome.tabs?.query &&
        chrome.tabs?.update
      ) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const queryError = chrome.runtime?.lastError;
          if (queryError) {
            console.warn("Could not query active tab:", queryError.message);
            updateTabAndClose(null);
            return;
          }

          const activeTab = Array.isArray(tabs) ? tabs[0] : null;
          const activeTabId =
            activeTab && typeof activeTab.id === "number" ? activeTab.id : null;

          updateTabAndClose(activeTabId);
        });
        return;
      }
    } catch (error) {
      console.warn("Could not route to dashboard in current tab:", error);
    }

    fallbackNavigate();
  }

  function openDashboardTab() {
    openUrlInCurrentTab(getDashboardUrl("index.html"));
  }

  function openDashboardSettingsTab(tabName) {
    if (!tabName) {
      openDashboardTab();
      return;
    }

    const allowedTabs = new Set(["location", "prayer"]);
    const normalizedTab = String(tabName).trim();

    if (!allowedTabs.has(normalizedTab)) {
      openDashboardTab();
      return;
    }

    const targetUrl = getDashboardUrl(
      `index.html?settingsTab=${encodeURIComponent(normalizedTab)}`,
    );
    openUrlInCurrentTab(targetUrl);
  }

  function syncActionIcons() {
    const applyIcon = (element, emoji, size = 16) => {
      if (!element) return;
      element.innerHTML = iconThemes.getIcon(emoji, {
        size,
        className: "popup-action-icon",
        inline: true,
      });
    };

    applyIcon(openPrayerSettingsButton, "⚙️", 17);
    applyIcon(openDashboardButton, "⚙️", 18);
    applyIcon(openLocationSettingsIcon, "📍", 17);
  }

  function bindShortcut(element, handler) {
    if (!element) return;
    if (typeof handler !== "function") return;

    element.addEventListener("click", () => {
      handler();
    });

    element.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      handler();
    });
  }

  function isFiniteNumber(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue);
  }

  function normalizeLocation(rawLocation, fallbackCity = "Current Location") {
    if (
      !rawLocation ||
      !isFiniteNumber(rawLocation.latitude) ||
      !isFiniteNumber(rawLocation.longitude)
    ) {
      return null;
    }

    const cityName =
      typeof rawLocation.city === "string" && rawLocation.city.trim()
        ? rawLocation.city.trim()
        : fallbackCity;

    return {
      latitude: Number(rawLocation.latitude),
      longitude: Number(rawLocation.longitude),
      city: cityName,
    };
  }

  function setPopupVisibility(isPrayerVisible) {
    if (prayerCard) {
      prayerCard.hidden = !isPrayerVisible;
    }

    if (hiddenCard) {
      hiddenCard.hidden = isPrayerVisible;
    }
  }

  function applyThemeAndIconSettings() {
    try {
      themes.loadThemeSettings();
      themes.applyTheme();
    } catch (error) {
      console.warn("Popup theme sync failed:", error);
    }

    try {
      iconThemes.loadSettings();
      iconThemes.applyIconTheme();
      document.dispatchEvent(
        new CustomEvent("md:icon-theme-change", {
          detail: {
            theme: iconThemes.getCurrentTheme(),
          },
        }),
      );
      syncActionIcons();
    } catch (error) {
      console.warn("Popup icon theme sync failed:", error);
    }
  }

  async function ensurePrayerManagerInitialized() {
    if (prayerInitialized) return;
    prayerInitialized = true;
    await prayerTimes.init();
  }

  function syncLocation(settings) {
    if (!prayerInitialized) return;

    if (settings.locationMethod === "manual") {
      const manualLocation = normalizeLocation(
        {
          latitude: settings.latitude,
          longitude: settings.longitude,
          city: settings.city || "Custom Location",
        },
        "Custom Location",
      );

      if (manualLocation) {
        prayerTimes.location = manualLocation;
        prayerTimes.updatePrayerTimes();
      }
      return;
    }

    const lastLocation = normalizeLocation(storage.getLastLocation());
    if (lastLocation) {
      prayerTimes.location = lastLocation;
      prayerTimes.updatePrayerTimes();
    }
  }

  async function refreshPopupState() {
    const settings = storage.getSettings();

    applyThemeAndIconSettings();

    const isPrayerVisible = settings.componentVisibility?.prayerTimes !== false;
    setPopupVisibility(isPrayerVisible);

    if (!isPrayerVisible) return;

    await ensurePrayerManagerInitialized();
    prayerTimes.updateSettings(settings);
    syncLocation(settings);
  }

  function handleStorageChange(event) {
    const changedKey = event?.key;

    if (
      changedKey === null ||
      changedKey === settingsStorageKey ||
      changedKey === locationStorageKey
    ) {
      void refreshPopupState();
    }
  }

  function handleChromeStorageChange(changes, areaName) {
    if (areaName !== "local") return;
    if (changes?.md_settings || changes?.md_lastLocation) {
      void refreshPopupState();
    }
  }

  function startSoftResync() {
    if (resyncIntervalId) {
      clearInterval(resyncIntervalId);
    }

    resyncIntervalId = setInterval(() => {
      void refreshPopupState();
    }, 30000);
  }

  function stopSoftResync() {
    if (!resyncIntervalId) return;
    clearInterval(resyncIntervalId);
    resyncIntervalId = null;
  }

  bindShortcut(openDashboardButton, () => openDashboardSettingsTab("prayer"));
  bindShortcut(openLocationSettingsIcon, () =>
    openDashboardSettingsTab("location"),
  );
  bindShortcut(openPrayerSettingsButton, () =>
    openDashboardSettingsTab("prayer"),
  );

  window.addEventListener("storage", handleStorageChange);

  if (typeof chrome !== "undefined" && chrome.storage?.onChanged?.addListener) {
    chrome.storage.onChanged.addListener(handleChromeStorageChange);
  }

  window.addEventListener("beforeunload", () => {
    stopSoftResync();
    if (
      typeof chrome !== "undefined" &&
      chrome.storage?.onChanged?.removeListener
    ) {
      chrome.storage.onChanged.removeListener(handleChromeStorageChange);
    }
  });

  void refreshPopupState().finally(() => {
    startSoftResync();
  });
});

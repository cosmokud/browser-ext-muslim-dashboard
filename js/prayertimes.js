/**
 * Prayer Times Manager
 * Handles prayer time calculations, display, and visibility
 * Supports 9 prayer times with user-controlled visibility
 */

class PrayerTimesManager {
  constructor(storage) {
    this.storage = storage;
    this.prayTimes = new PrayTimes();
    this.times = {};
    this.location = null;
    this.countdownInterval = null;
    this.locationPermissionRequested = false;
    this.prayerDisplayDay = null;

    // All available prayer times
    this.allPrayers = [
      { key: "fajr", name: "Fajr", icon: "🌠" },
      { key: "sunrise", name: "Sunrise", icon: "🌅" },
      { key: "duha", name: "Duha", icon: "☀️" },
      { key: "dhuhr", name: "Dhuhr", icon: "🌤️" },
      { key: "asr", name: "Asr", icon: "⛅" },
      { key: "maghrib", name: "Maghrib", icon: "🌇" },
      { key: "isha", name: "Isha", icon: "🌙" },
      { key: "midnight", name: "Midnight", icon: "🕛" },
      { key: "qiyam", name: "Qiyam", icon: "🌃" },
    ];

    // DOM elements
    this.prayerList = document.getElementById("prayerList");
    this.locationText = document.getElementById("locationText");
    this.nextPrayerName = document.getElementById("nextPrayerName");
    this.nextPrayerCountdown = document.getElementById("nextPrayerCountdown");

    // Listen for icon theme changes
    document.addEventListener("md:icon-theme-change", () => {
      const settings = this.storage.getSettings();
      this.renderPrayerList(settings.prayerVisibility);
    });
  }

  getPrayerDisplayName(prayer) {
    if (prayer?.key === "dhuhr" && new Date().getDay() === 5) {
      return "Jumu'ah";
    }
    return prayer?.name || "";
  }

  /**
   * Initialize prayer times
   * Shows UI immediately with default/cached values, then updates when location is available
   */
  async init() {
    const settings = this.storage.getSettings();

    // Configure prayer times calculator
    this.configureCalculator(settings);

    // Render prayer list based on visibility settings (immediate)
    this.renderPrayerList(settings.prayerVisibility);

    // Show loading state
    if (this.locationText) {
      this.locationText.textContent = "Detecting...";
    }
    if (this.nextPrayerName) {
      this.nextPrayerName.textContent = "Loading...";
    }
    if (this.nextPrayerCountdown) {
      this.nextPrayerCountdown.textContent = "--:--:--";
    }

    // Try to use cached location first for immediate display
    const lastLocation = this.storage.getLastLocation();
    if (lastLocation) {
      this.location = lastLocation;
      this.updatePrayerTimes(); // Show cached data immediately
    }

    // Get fresh location (async, may take time)
    await this.getLocation();
  }

  /**
   * Configure the prayer times calculator
   */
  configureCalculator(settings) {
    // Set calculation method
    this.prayTimes.setMethod(settings.calculationMethod);

    // Set custom angles if using Custom method
    if (settings.calculationMethod === "Custom") {
      this.prayTimes.setFajrAngle(settings.customFajrAngle);
      this.prayTimes.setIshaAngle(
        settings.customIshaAngle,
        settings.customIshaMinutes,
      );
    }

    // Set Asr method
    this.prayTimes.setAsrMethod(settings.asrMethod);

    // Set higher latitude method
    this.prayTimes.setHighLatMethod(settings.highLatMethod);

    // Set midnight method
    this.prayTimes.setMidnightMethod(settings.midnightMethod);

    // Set Duha offset
    this.prayTimes.setDuhaOffset(settings.duhaOffset);

    // Set adjustments
    this.prayTimes.tune(settings.adjustments);
  }

  /**
   * Get icon HTML based on current icon theme
   */
  getIconHtml(emoji, options = {}) {
    if (window.dashboard?.iconThemes) {
      return window.dashboard.iconThemes.getIcon(emoji, options);
    }
    return emoji;
  }

  /**
   * Render prayer list based on visibility
   */
  renderPrayerList(visibility) {
    if (!this.prayerList) return;

    this.prayerList.innerHTML = "";

    this.allPrayers.forEach((prayer) => {
      if (visibility[prayer.key]) {
        const prayerItem = document.createElement("div");
        prayerItem.className = "prayer-item";
        prayerItem.dataset.prayer = prayer.key;
        const iconHtml = this.getIconHtml(prayer.icon, { size: 18 });
        const prayerName = this.getPrayerDisplayName(prayer);
        prayerItem.innerHTML = `
          <span class="prayer-name">
            <span class="prayer-icon">${iconHtml}</span>
            ${prayerName}
          </span>
          <span class="prayer-time" id="${prayer.key}Time">--:--</span>
        `;
        this.prayerList.appendChild(prayerItem);
      }
    });

    this.prayerDisplayDay = new Date().getDay();
  }

  refreshPrayerListForDay(visibility) {
    const currentDay = new Date().getDay();
    if (this.prayerDisplayDay === currentDay) return;
    this.renderPrayerList(visibility);
    this.displayPrayerTimes(visibility);
  }

  /**
   * Request location permission explicitly
   */
  async requestLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    if (this.locationText) {
      this.locationText.textContent = "Requesting permission...";
    }

    try {
      // Request with high accuracy for desktop
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      this.location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        city: "Current Location",
      };

      // Try to get city name
      await this.reverseGeocode(
        position.coords.latitude,
        position.coords.longitude,
      );

      // Save location
      this.storage.saveLastLocation(this.location);

      this.updatePrayerTimes();
    } catch (error) {
      console.error("Geolocation error:", error);

      let message = "Could not get location. ";
      switch (error.code) {
        case error.PERMISSION_DENIED:
          message += "Please allow location access in your browser settings.";
          break;
        case error.POSITION_UNAVAILABLE:
          message += "Location information unavailable.";
          break;
        case error.TIMEOUT:
          message += "Location request timed out.";
          break;
        default:
          message += "Unknown error occurred.";
      }

      alert(message);

      // Fall back to stored or default location
      if (!this.location) {
        this.useDefaultLocation();
      }
    }
  }

  /**
   * Get user location
   */
  async getLocation() {
    const settings = this.storage.getSettings();

    // Check for manual location first
    if (
      settings.locationMethod === "manual" &&
      settings.latitude &&
      settings.longitude
    ) {
      this.location = {
        latitude: settings.latitude,
        longitude: settings.longitude,
        city: settings.city || "Custom Location",
      };
      this.updatePrayerTimes();
      return;
    }

    // Try to get from storage
    const lastLocation = this.storage.getLastLocation();
    if (lastLocation) {
      this.location = lastLocation;
      this.updatePrayerTimes();
    }

    // Try to get current location if auto
    if (settings.locationMethod === "auto" && navigator.geolocation) {
      if (this.locationText) {
        this.locationText.textContent = "Detecting...";
      }

      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 600000, // 10 minutes
          });
        });

        this.location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          city: "Current Location",
        };

        // Try to get city name
        await this.reverseGeocode(
          position.coords.latitude,
          position.coords.longitude,
        );

        // Save location
        this.storage.saveLastLocation(this.location);

        this.updatePrayerTimes();
      } catch (error) {
        console.warn("Auto geolocation failed:", error.message);

        // Use stored location or default
        if (!this.location) {
          this.useDefaultLocation();
        } else if (this.locationText) {
          this.locationText.textContent = this.location.city;
        }
      }
    } else if (!this.location) {
      this.useDefaultLocation();
    }
  }

  /**
   * Use default location (Mecca)
   */
  useDefaultLocation() {
    this.location = {
      latitude: 21.4225,
      longitude: 39.8262,
      city: "Mecca (Default)",
    };
    this.updatePrayerTimes();
  }

  /**
   * Reverse geocode to get city name
   */
  async reverseGeocode(lat, lng) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
        {
          headers: {
            "Accept-Language": "en",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        const city =
          data.address.city ||
          data.address.town ||
          data.address.village ||
          data.address.county ||
          data.address.state;

        if (city) {
          this.location.city = city;
          if (this.locationText) {
            this.locationText.textContent = city;
          }
          this.storage.saveLastLocation(this.location);
        }
      }
    } catch (e) {
      console.error("Reverse geocode error:", e);
    }
  }

  /**
   * Search city by name
   */
  async searchCity(cityName) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          cityName,
        )}&limit=5`,
        {
          headers: {
            "Accept-Language": "en",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        return data.map((result) => ({
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          city: result.display_name.split(",")[0],
          fullName: result.display_name,
        }));
      }
    } catch (e) {
      console.error("City search error:", e);
    }

    return [];
  }

  /**
   * Update prayer times display
   */
  updatePrayerTimes() {
    if (!this.location) return;

    const date = new Date();
    const settings = this.storage.getSettings();

    // Get prayer times
    this.times = this.prayTimes.getTimes(
      date,
      [this.location.latitude, this.location.longitude],
      "auto",
      "auto",
      settings.timeFormat || "24h",
    );

    // Display times
    this.displayPrayerTimes(settings.prayerVisibility);

    // Update location text
    if (this.locationText) {
      this.locationText.textContent = this.location.city;
    }

    // Start countdown
    this.startCountdown();

    // Highlight next prayer
    this.highlightPrayer(settings.prayerVisibility);
  }

  /**
   * Display prayer times
   */
  displayPrayerTimes(visibility) {
    this.allPrayers.forEach((prayer) => {
      if (visibility[prayer.key]) {
        const timeEl = document.getElementById(`${prayer.key}Time`);
        if (timeEl) {
          timeEl.textContent = this.times[prayer.key] || "--:--";
        }
      }
    });
  }

  /**
   * Highlight next prayer
   */
  highlightPrayer(visibility) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Get visible prayers with their times
    const visiblePrayers = this.allPrayers
      .filter((p) => visibility[p.key])
      .map((prayer) => {
        const timeStr = this.times[prayer.key];
        if (!timeStr || timeStr === "-----") return null;

        const timeParts = timeStr.match(/(\d+):(\d+)/);
        if (!timeParts) return null;

        let hours = parseInt(timeParts[1]);
        const minutes = parseInt(timeParts[2]);

        // Handle AM/PM format
        if (timeStr.includes("PM") && hours !== 12) hours += 12;
        if (timeStr.includes("AM") && hours === 12) hours = 0;

        return {
          key: prayer.key,
          name: this.getPrayerDisplayName(prayer),
          minutes: hours * 60 + minutes,
        };
      })
      .filter(Boolean);

    // Remove existing highlights
    document.querySelectorAll(".prayer-item").forEach((item) => {
      item.classList.remove("active", "next");
    });

    // Find next prayer
    let nextPrayer = visiblePrayers.find((p) => p.minutes > currentTime);

    // If no prayer found today, next is first prayer tomorrow
    if (!nextPrayer && visiblePrayers.length > 0) {
      nextPrayer = visiblePrayers[0];
    }

    // Highlight next prayer
    if (nextPrayer) {
      const nextPrayerItem = document.querySelector(
        `[data-prayer="${nextPrayer.key}"]`,
      );
      if (nextPrayerItem) {
        nextPrayerItem.classList.add("next");
      }

      // Update next prayer display
      if (this.nextPrayerName) {
        this.nextPrayerName.textContent = nextPrayer.name;
      }
    }
  }

  /**
   * Start countdown timer
   */
  startCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.updateCountdown();
    this.countdownInterval = setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  /**
   * Update countdown display
   */
  updateCountdown() {
    const settings = this.storage.getSettings();
    const visibility = settings.prayerVisibility;
    this.refreshPrayerListForDay(visibility);

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentSeconds = now.getSeconds();

    // Get visible prayers with their times
    const visiblePrayers = this.allPrayers
      .filter((p) => visibility[p.key])
      .map((prayer) => {
        const timeStr = this.times[prayer.key];
        if (!timeStr || timeStr === "-----") return null;

        const timeParts = timeStr.match(/(\d+):(\d+)/);
        if (!timeParts) return null;

        let hours = parseInt(timeParts[1]);
        const minutes = parseInt(timeParts[2]);

        // Handle AM/PM format
        if (timeStr.includes("PM") && hours !== 12) hours += 12;
        if (timeStr.includes("AM") && hours === 12) hours = 0;

        return {
          key: prayer.key,
          name: this.getPrayerDisplayName(prayer),
          minutes: hours * 60 + minutes,
        };
      })
      .filter(Boolean);

    // Find next prayer
    let nextPrayer = visiblePrayers.find((p) => p.minutes > currentMinutes);
    let isTomorrow = false;

    // If no prayer found today, next is first prayer tomorrow
    if (!nextPrayer && visiblePrayers.length > 0) {
      nextPrayer = visiblePrayers[0];
      isTomorrow = true;
    }

    if (nextPrayer) {
      let diffMinutes;

      if (isTomorrow) {
        diffMinutes = 24 * 60 - currentMinutes + nextPrayer.minutes;
      } else {
        diffMinutes = nextPrayer.minutes - currentMinutes;
      }

      // Adjust for seconds
      let totalSeconds = diffMinutes * 60 - currentSeconds;
      if (totalSeconds < 0) totalSeconds = 0;

      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (this.nextPrayerCountdown) {
        this.nextPrayerCountdown.textContent = `${this.padZero(
          hours,
        )}:${this.padZero(minutes)}:${this.padZero(seconds)}`;
      }
    }

    // Update highlights
    this.highlightPrayer(visibility);
  }

  /**
   * Set manual location
   */
  setManualLocation(latitude, longitude, city) {
    this.location = { latitude, longitude, city };
    this.storage.saveLastLocation(this.location);
    this.updatePrayerTimes();
  }

  /**
   * Update calculation settings
   */
  updateSettings(settings) {
    this.configureCalculator(settings);
    this.renderPrayerList(settings.prayerVisibility);
    this.updatePrayerTimes();
  }

  /**
   * Get current location
   */
  getCurrentLocation() {
    return this.location;
  }

  /**
   * Get all prayer info
   */
  getAllPrayers() {
    return this.allPrayers;
  }

  /**
   * Get next visible prayer information with live countdown
   */
  getNextPrayerInfo(visibility = null) {
    const activeVisibility =
      visibility && typeof visibility === "object"
        ? visibility
        : this.storage.getSettings().prayerVisibility || {};

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentSeconds = now.getSeconds();

    const visiblePrayers = this.allPrayers
      .filter((p) => activeVisibility[p.key])
      .map((prayer) => {
        const timeStr = this.times[prayer.key];
        if (!timeStr || timeStr === "-----") return null;

        const timeParts = timeStr.match(/(\d+):(\d+)/);
        if (!timeParts) return null;

        let hours = parseInt(timeParts[1], 10);
        const minutes = parseInt(timeParts[2], 10);

        if (timeStr.includes("PM") && hours !== 12) hours += 12;
        if (timeStr.includes("AM") && hours === 12) hours = 0;

        return {
          key: prayer.key,
          name: this.getPrayerDisplayName(prayer),
          minutes: hours * 60 + minutes,
        };
      })
      .filter(Boolean);

    if (!visiblePrayers.length) {
      return null;
    }

    let nextPrayer = visiblePrayers.find((p) => p.minutes > currentMinutes);
    let isTomorrow = false;

    if (!nextPrayer) {
      nextPrayer = visiblePrayers[0];
      isTomorrow = true;
    }

    let diffMinutes;
    if (isTomorrow) {
      diffMinutes = 24 * 60 - currentMinutes + nextPrayer.minutes;
    } else {
      diffMinutes = nextPrayer.minutes - currentMinutes;
    }

    let totalSeconds = diffMinutes * 60 - currentSeconds;
    if (totalSeconds < 0) totalSeconds = 0;

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      key: nextPrayer.key,
      name: nextPrayer.name,
      isTomorrow,
      countdown: `${this.padZero(hours)}:${this.padZero(minutes)}:${this.padZero(seconds)}`,
    };
  }

  /**
   * Pad number with zero
   */
  padZero(num) {
    return String(num).padStart(2, "0");
  }
}

// Export for use
window.PrayerTimesManager = PrayerTimesManager;

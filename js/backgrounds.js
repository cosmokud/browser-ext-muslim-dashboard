/**
 * Background Manager
 * Handles background image rotation with nature images
 */

class BackgroundManager {
  constructor(storage) {
    this.storage = storage;
    this.bg1 = document.getElementById("bg1");
    this.bg2 = document.getElementById("bg2");
    this.currentBg = 1;
    this.intervalId = null;

    // High-quality nature background URLs from Unsplash (free to use)
    // Use `this.imageParams` to control image size/quality globally (e.g., "w=1920&q=80")
    this.imageParams = "w=1920&q=80";
    this.backgrounds = {
      nature: [
        "https://images.unsplash.com/photo-1758260990024-c8ad2660f1ff",
        "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d",
        "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05",
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e",
        "https://images.unsplash.com/photo-1472214103451-9374bd1c798e",
        "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07",
        "https://images.unsplash.com/photo-1501854140801-50d01698950b",
        "https://images.unsplash.com/photo-1426604966848-d7adac402bff",
        "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1",
        "https://images.unsplash.com/photo-1758260990024-c8ad2660f1ff",
      ],
      mosque: [
        "https://images.unsplash.com/photo-1584551246679-0daf3d275d0f",
        "https://images.unsplash.com/photo-1542816417-0983c9c9ad53",
      ],
      landscape: [
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b",
        "https://images.unsplash.com/photo-1493246507139-91e8fad9978e",
        "https://images.unsplash.com/photo-1500534623283-312aade485b7",
        "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
        "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8",
        "https://images.unsplash.com/photo-1508739773434-c26b3d09e071",
        "https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8",
      ],
      mountains: [
        "https://images.unsplash.com/photo-1454496522488-7a8e488e8606",
        "https://images.unsplash.com/photo-1519681393784-d120267933ba",
        "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99",
        "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5",
        "https://images.unsplash.com/photo-1464278533981-50106e6176b1",
        "https://images.unsplash.com/photo-1458668383970-8ddd3927deed",
        "https://images.unsplash.com/photo-1491002052546-bf38f186af56",
        "https://images.unsplash.com/photo-1445363692815-ebcd599f7621",
      ],
      ocean: [
        "https://images.unsplash.com/photo-1505118380757-91f5f5632de0",
        "https://images.unsplash.com/photo-1518837695005-2083093ee35b",
        "https://images.unsplash.com/photo-1484291470158-b8f8d608850d",
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
        "https://images.unsplash.com/photo-1439405326854-014607f694d7",
        "https://images.unsplash.com/photo-1476673160081-cf065bc4cf87",
        "https://images.unsplash.com/photo-1488462237308-ecaa28b729d7",
        "https://images.unsplash.com/photo-1471922694854-ff1b63b20054",
      ],
      forest: [
        "https://images.unsplash.com/photo-1448375240586-882707db888b",
        "https://images.unsplash.com/photo-1473448912268-2022ce9509d8",
        "https://images.unsplash.com/photo-1502082553048-f009c37129b9",
        "https://images.unsplash.com/photo-1476231682828-37e571bc172f",
        "https://images.unsplash.com/photo-1425913397330-cf8af2ff40a1",
        "https://images.unsplash.com/photo-1462275646964-a0e3c8e67f07",
        "https://images.unsplash.com/photo-1440581572325-0bea30075d9d",
        "https://images.unsplash.com/photo-1503435824048-a799a3a84bf7",
      ],
      sky: [
        "https://images.unsplash.com/photo-1517483000871-1dbf64a6e1c6",
        "https://images.unsplash.com/photo-1534088568595-a066f410bcda",
        "https://images.unsplash.com/photo-1513002749550-c59d786b8e6c",
        "https://images.unsplash.com/photo-1419833173245-f59e1b93f9ee",
        "https://images.unsplash.com/photo-1489549132488-d00b7eee80f1",
        "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b",
        "https://images.unsplash.com/photo-1477346611705-65d1883cee1e",
        "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869",
      ],
    };
  }

  /**
   * Initialize backgrounds
   */
  init() {
    const settings = this.storage.getSettings();
    this.loadBackground(settings);
    this.startRotation(settings.bgInterval);
  }

  /**
   * Get images array for a category
   */
  getImagesForCategory(category, settings) {
    if (category === "custom") {
      const customBgs = settings.customBackgrounds || [];
      return customBgs.length > 0 ? customBgs : this.backgrounds.nature;
    }
    return this.backgrounds[category] || this.backgrounds.nature;
  }

  /**
   * Load background image
   */
  loadBackground(settings) {
    const category = settings.bgCategory || "nature";
    const images = this.getImagesForCategory(category, settings);

    let index = settings.currentBgIndex || 0;
    // Ensure index is within bounds
    if (index >= images.length) {
      index = 0;
    }

    const lastChange = settings.lastBgChange;
    const intervalValue =
      settings.bgInterval === "custom"
        ? settings.bgIntervalCustom
        : settings.bgInterval;
    const interval = (intervalValue || 60) * 60 * 1000;
    const now = Date.now();

    // Check if we need to rotate
    if (lastChange && now - lastChange >= interval) {
      index = (index + 1) % images.length;
      settings.currentBgIndex = index;
      settings.lastBgChange = now;
      this.storage.saveSettings(settings);
    } else if (!lastChange) {
      settings.lastBgChange = now;
      this.storage.saveSettings(settings);
    }

    const imageUrl = images[index];
    this.setBackground(imageUrl);
  }

  /**
   * Append global image query params to a URL and return the full image URL
   */
  getImageUrl(url) {
    if (!this.imageParams) return url;
    const params = this.imageParams.startsWith("?")
      ? this.imageParams.slice(1)
      : this.imageParams;
    const baseUrl = url.split("?")[0];
    return `${baseUrl}?${params}`;
  }

  /**
   * Set image query params globally (e.g., "w=1920&q=80" or "?w=1920&q=80")
   */
  setImageParams(params) {
    this.imageParams = params;
  }

  /**
   * Set background with fade transition
   */
  setBackground(url) {
    const fullUrl = this.getImageUrl(url);
    const targetBg = this.currentBg === 1 ? this.bg2 : this.bg1;
    const currentBgEl = this.currentBg === 1 ? this.bg1 : this.bg2;

    // Preload image
    const img = new Image();
    img.onload = () => {
      targetBg.style.backgroundImage = `url(${fullUrl})`;
      targetBg.classList.add("active");
      currentBgEl.classList.remove("active");
      this.currentBg = this.currentBg === 1 ? 2 : 1;
    };
    img.onerror = () => {
      // Use fallback gradient if image fails
      targetBg.style.background =
        "linear-gradient(135deg, #1a5f4a 0%, #0d3d2e 100%)";
      targetBg.classList.add("active");
      currentBgEl.classList.remove("active");
    };
    img.src = fullUrl;
  }

  /**
   * Start background rotation
   */
  startRotation(intervalMinutes) {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    const intervalMs = intervalMinutes * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.changeBackground();
    }, intervalMs);
  }

  /**
   * Change to next background
   */
  changeBackground() {
    const settings = this.storage.getSettings();
    const category = settings.bgCategory || "nature";
    const images = this.getImagesForCategory(category, settings);

    let index = ((settings.currentBgIndex || 0) + 1) % images.length;
    settings.currentBgIndex = index;
    settings.lastBgChange = Date.now();
    this.storage.saveSettings(settings);

    const imageUrl = images[index];
    this.setBackground(imageUrl);
  }

  /**
   * Update category and restart
   */
  updateCategory(category) {
    const settings = this.storage.getSettings();
    settings.bgCategory = category;
    settings.currentBgIndex = 0;
    settings.lastBgChange = Date.now();
    this.storage.saveSettings(settings);

    const images = this.getImagesForCategory(category, settings);
    if (images.length > 0) {
      this.setBackground(images[0]);
    }
  }

  /**
   * Update interval
   */
  updateInterval(minutes) {
    this.startRotation(minutes);
  }
}

// Export for use
window.BackgroundManager = BackgroundManager;

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
    this.backgrounds = {
      nature: [
        "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=80", // Mountains sunrise
        "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1920&q=80", // Forest path
        "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1920&q=80", // Waterfall
        "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=80", // Foggy mountains
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80", // Sunlight forest
        "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1920&q=80", // Green valley
        "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=1920&q=80", // Orange flowers
        "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1920&q=80", // Green hills
        "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=1920&q=80", // Mountain lake
        "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=1920&q=80", // Autumn forest
      ],
      mosque: [
        "https://images.unsplash.com/photo-1545424920-b02fa0c1b513?w=1920&q=80", // Blue Mosque
        "https://images.unsplash.com/photo-1519817650390-64a93db51149?w=1920&q=80", // Mosque sunset
        "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=1920&q=80", // Mosque interior
        "https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=1920&q=80", // Mosque dome
        "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1920&q=80", // Grand mosque
        "https://images.unsplash.com/photo-1542816417-0983c9c9ad53?w=1920&q=80", // Mosque reflection
        "https://images.unsplash.com/photo-1609158349118-aa3dc23dae61?w=1920&q=80", // Medina mosque
        "https://images.unsplash.com/photo-1466442929976-97f336a657be?w=1920&q=80", // Mosque silhouette
      ],
      landscape: [
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80", // Alps
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80", // Mountain peak
        "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1920&q=80", // Lake reflection
        "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1920&q=80", // Savanna sunset
        "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80", // Scenic view
        "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1920&q=80", // Sunrise field
        "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1920&q=80", // Beach sunset
        "https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?w=1920&q=80", // Starry night
      ],
      mountains: [
        "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=1920&q=80", // Himalayas
        "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80", // Snowy peaks
        "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=1920&q=80", // Mountain sunrise
        "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=1920&q=80", // Alpine view
        "https://images.unsplash.com/photo-1464278533981-50106e6176b1?w=1920&q=80", // Rocky mountains
        "https://images.unsplash.com/photo-1458668383970-8ddd3927deed?w=1920&q=80", // Matterhorn
        "https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=1920&q=80", // Mountain road
        "https://images.unsplash.com/photo-1445363692815-ebcd599f7621?w=1920&q=80", // Mountain fog
      ],
      ocean: [
        "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&q=80", // Clear ocean
        "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1920&q=80", // Ocean wave
        "https://images.unsplash.com/photo-1484291470158-b8f8d608850d?w=1920&q=80", // Aerial ocean
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80", // Tropical beach
        "https://images.unsplash.com/photo-1439405326854-014607f694d7?w=1920&q=80", // Calm sea
        "https://images.unsplash.com/photo-1476673160081-cf065bc4cf87?w=1920&q=80", // Ocean sunset
        "https://images.unsplash.com/photo-1488462237308-ecaa28b729d7?w=1920&q=80", // Blue water
        "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=1920&q=80", // Beach rocks
      ],
      forest: [
        "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80", // Dark forest
        "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=1920&q=80", // Autumn woods
        "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1920&q=80", // Green trees
        "https://images.unsplash.com/photo-1476231682828-37e571bc172f?w=1920&q=80", // Forest light
        "https://images.unsplash.com/photo-1425913397330-cf8af2ff40a1?w=1920&q=80", // Misty forest
        "https://images.unsplash.com/photo-1462275646964-a0e3c8e67f07?w=1920&q=80", // Forest stream
        "https://images.unsplash.com/photo-1440581572325-0bea30075d9d?w=1920&q=80", // Pine forest
        "https://images.unsplash.com/photo-1503435824048-a799a3a84bf7?w=1920&q=80", // Bamboo forest
      ],
      sky: [
        "https://images.unsplash.com/photo-1517483000871-1dbf64a6e1c6?w=1920&q=80", // Sunset clouds
        "https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=1920&q=80", // Pink sky
        "https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?w=1920&q=80", // Blue clouds
        "https://images.unsplash.com/photo-1419833173245-f59e1b93f9ee?w=1920&q=80", // Golden hour
        "https://images.unsplash.com/photo-1489549132488-d00b7eee80f1?w=1920&q=80", // Stars
        "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1920&q=80", // Dramatic sky
        "https://images.unsplash.com/photo-1477346611705-65d1883cee1e?w=1920&q=80", // Dawn
        "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=1920&q=80", // Twilight
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
    if (category === 'custom') {
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
    const intervalValue = settings.bgInterval === 'custom' ? settings.bgIntervalCustom : settings.bgInterval;
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
   * Set background with fade transition
   */
  setBackground(url) {
    const targetBg = this.currentBg === 1 ? this.bg2 : this.bg1;
    const currentBgEl = this.currentBg === 1 ? this.bg1 : this.bg2;

    // Preload image
    const img = new Image();
    img.onload = () => {
      targetBg.style.backgroundImage = `url(${url})`;
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
    img.src = url;
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

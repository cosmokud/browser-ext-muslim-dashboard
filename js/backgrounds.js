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

    // Listen for icon theme changes
    document.addEventListener("md:icon-theme-change", () => {
      this._updateCameraIcon();
    });

    // High-quality nature background metadata from Unsplash (free to use)
    // Each image has a `url`, `credit` and `href` (dummy placeholders for now).
    // Use `this.imageParams` to control image size/quality globally (e.g., "w=1920&q=80")
    this.imageParams = "w=2560&q=80";
    this.backgrounds = {
      nature: [
        {
          url: "https://images.unsplash.com/photo-1758260990024-c8ad2660f1ff",
          credit: "Ahmet Yüksek",
          href: "https://unsplash.com/@ahmetyuksek",
        },
        {
          url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d",
          credit: "Tim Swaan",
          href: "https://unsplash.com/@timswaanphotography",
        },
        {
          url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05",
          credit: "v2osk",
          href: "https://unsplash.com/@v2osk",
        },
        {
          url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e",
          credit: "Lukasz Szmigiel",
          href: "https://unsplash.com/@szmigieldesign",
        },
        {
          url: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e",
          credit: "Robert Lukeman",
          href: "https://unsplash.com/@robertlukeman",
        },
        {
          url: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07",
          credit: "enrico bet",
          href: "https://unsplash.com/@henry_be",
        },
        {
          url: "https://images.unsplash.com/photo-1501854140801-50d01698950b",
          credit: "Qingbao Meng",
          href: "https://unsplash.com/@ideasboom",
        },
        {
          url: "https://images.unsplash.com/photo-1426604966848-d7adac402bff",
          credit: "Adam Kool",
          href: "https://unsplash.com/@adamkool",
        },
        {
          url: "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1",
          credit: "Quino Al",
          href: "https://unsplash.com/@quinoal",
        },
      ],
      landscape: [
        {
          url: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8",
          credit: "Dawid Zawiła",
          href: "https://unsplash.com/@davealmine",
        },
        {
          url: "https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8",
          credit: "Ken Cheung",
          href: "https://unsplash.com/@kencheungphoto",
        },
        {
          url: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869",
          credit: "Johannes Plenio",
          href: "https://unsplash.com/@jplenio",
        },
      ],
      mountains: [
        {
          url: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071",
          credit: "Cristina Gottardi",
          href: "https://unsplash.com/@cristina_gottardi",
        },
        {
          url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
          credit: "Samuel Ferrara",
          href: "https://unsplash.com/@samferrara",
        },
        {
          url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b",
          credit: "Kalen Emsley",
          href: "https://unsplash.com/@kalenemsley",
        },
        {
          url: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e",
          credit: "garrett parker",
          href: "https://unsplash.com/@garrettpsystems",
        },
        {
          url: "https://images.unsplash.com/photo-1500534623283-312aade485b7",
          credit: "Ivana Cajina",
          href: "https://unsplash.com/@von_co",
        },
        {
          url: "https://images.unsplash.com/photo-1454496522488-7a8e488e8606",
          credit: "Rohit Tandon",
          href: "https://unsplash.com/@sepoys",
        },
        {
          url: "https://images.unsplash.com/photo-1519681393784-d120267933ba",
          credit: "Benjamin Voros",
          href: "https://unsplash.com/@vorosbenisop",
        },
        {
          url: "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99",
          credit: "Jeremy Bishop",
          href: "https://unsplash.com/@jeremybishop",
        },
        {
          url: "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5",
          credit: "Daniel Leone",
          href: "https://unsplash.com/@danielleone",
        },
        {
          url: "https://images.unsplash.com/photo-1464278533981-50106e6176b1",
          credit: "Garrett Sears",
          href: "https://unsplash.com/@garrettsears",
        },
        {
          url: "https://images.unsplash.com/photo-1458668383970-8ddd3927deed",
          credit: "samsommer",
          href: "https://unsplash.com/@samsommer",
        },
        {
          url: "https://images.unsplash.com/photo-1491002052546-bf38f186af56",
          credit: "Adam Chang",
          href: "https://unsplash.com/@sametomorrow",
        },
        {
          url: "https://images.unsplash.com/photo-1445363692815-ebcd599f7621",
          credit: "Cagatay Orhan",
          href: "https://unsplash.com/@cagatayorhan",
        },
        {
          url: "https://images.unsplash.com/photo-1477346611705-65d1883cee1e",
          credit: "JOHN TOWNER",
          href: "https://unsplash.com/@heytowner",
        },
      ],
      ocean: [
        {
          url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0",
          credit: "Shifaaz shamoon",
          href: "https://unsplash.com/@sotti",
        },
        {
          url: "https://images.unsplash.com/photo-1518837695005-2083093ee35b",
          credit: "Matt Hardy",
          href: "https://unsplash.com/@matthardy",
        },
        {
          url: "https://images.unsplash.com/photo-1484291470158-b8f8d608850d",
          credit: "Christoffer Engström",
          href: "https://unsplash.com/@christoffere",
        },
        {
          url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
          credit: "Sean Oulashin",
          href: "https://unsplash.com/@oulashin",
        },
        {
          url: "https://images.unsplash.com/photo-1471922694854-ff1b63b20054",
          credit: "frank mckenna",
          href: "https://unsplash.com/@frankiefoto",
        },
      ],
      forest: [
        {
          url: "https://images.unsplash.com/photo-1448375240586-882707db888b",
          credit: "Sebastian Unrau",
          href: "https://unsplash.com/@sebastian_unrau",
        },
        {
          url: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8",
          credit: "Luca Bravo",
          href: "https://unsplash.com/@lucabravo",
        },
        {
          url: "https://images.unsplash.com/photo-1502082553048-f009c37129b9",
          credit: "niko photos",
          href: "https://unsplash.com/@niko_photos",
        },
        {
          url: "https://images.unsplash.com/photo-1476231682828-37e571bc172f",
          credit: "Geranimo",
          href: "https://unsplash.com/@geraninmo",
        },
        {
          url: "https://images.unsplash.com/photo-1425913397330-cf8af2ff40a1",
          credit: "Steven Kamenar",
          href: "https://unsplash.com/@skamenar",
        },
        {
          url: "https://images.unsplash.com/photo-1440581572325-0bea30075d9d",
          credit: "Gustav Gullstrand",
          href: "https://unsplash.com/@outoforbit",
        },
        {
          url: "https://images.unsplash.com/photo-1503435824048-a799a3a84bf7",
          credit: "Filip Zrnzević",
          href: "https://unsplash.com/@filipz",
        },
      ],
      sky: [
        {
          url: "https://images.unsplash.com/photo-1517483000871-1dbf64a6e1c6",
          credit: "CHUTTERSNAP",
          href: "https://unsplash.com/@chuttersnap",
        },
        {
          url: "https://images.unsplash.com/photo-1534088568595-a066f410bcda",
          credit: "Dadee Aissa",
          href: "https://unsplash.com/@dannyeve",
        },
        {
          url: "https://images.unsplash.com/photo-1513002749550-c59d786b8e6c",
          credit: "Taylor Van Riper",
          href: "https://unsplash.com/@taylorvanriper925",
        },
        {
          url: "https://images.unsplash.com/photo-1419833173245-f59e1b93f9ee",
          credit: "Sam Schooler",
          href: "https://unsplash.com/@sam",
        },
        {
          url: "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b",
          credit: "Tom Barrett",
          href: "https://unsplash.com/@wistomsin",
        },
      ],
      night: [
        {
          url: "https://images.unsplash.com/photo-1444080748397-f442aa95c3e5",
          credit: "Ryan Hutton",
          href: "https://unsplash.com/@ryan_hutton_",
        },
        {
          url: "https://images.unsplash.com/photo-1475274047050-1d0c0975c63e",
          credit: "Paul Lichtblau",
          href: "https://unsplash.com/@laup",
        },
        {
          url: "https://images.unsplash.com/photo-1509773896068-7fd415d91e2e",
          credit: "Jackson Hendry",
          href: "https://unsplash.com/@actionjackson801",
        },
        {
          url: "https://images.unsplash.com/photo-1482385916434-814664df9c5b",
          credit: "Nathan Anderson",
          href: "https://unsplash.com/@nathananderson",
        },
        {
          url: "https://images.unsplash.com/photo-1488866022504-f2584929ca5f",
          credit: "Nathan Anderson",
          href: "https://unsplash.com/@nathananderson",
        },
        {
          url: "https://images.unsplash.com/photo-1476504825079-f50520ac761d",
          credit: "Nathan Anderson",
          href: "https://unsplash.com/@nathananderson",
        },
        {
          url: "https://images.unsplash.com/photo-1467810160588-c86c0deb5d16",
          credit: "Thom Schneider",
          href: "https://unsplash.com/@thomschneider",
        },
        {
          url: "https://images.unsplash.com/photo-1456154875099-97a3a56074d3",
          credit: "Federico Beccari",
          href: "https://unsplash.com/@federize",
        },
        {
          url: "https://images.unsplash.com/photo-1528818955841-a7f1425131b5",
          credit: "Felix Mittermeier",
          href: "https://unsplash.com/@felix_mittermeier",
        },
        {
          url: "https://images.unsplash.com/photo-1456530308602-976f6a4bb440",
          credit: "Martin Jernberg",
          href: "https://unsplash.com/@martinjernberg",
        },
        {
          url: "https://images.unsplash.com/photo-1595520519880-a86c48ea536c",
          credit: "Joshua Woroniecki",
          href: "https://unsplash.com/@joshuaworoniecki",
        },
      ],
    };
    // Create the attribution element that is shown at bottom-left of the page
    this.createAttributionEl();
  }

  /**
   * Get icon based on current icon theme
   */
  _getIcon(emoji, options = {}) {
    if (window.dashboard?.iconThemes) {
      return window.dashboard.iconThemes.getIcon(emoji, options);
    }
    return emoji;
  }

  /**
   * Update camera icon when theme changes
   */
  _updateCameraIcon() {
    if (this.attributionEl) {
      const cam = this.attributionEl.querySelector('span[aria-hidden="true"]');
      if (cam) {
        cam.innerHTML = this._getIcon("📷", { size: 16 });
      }
    }
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

    const imageObj = this.normalizeImage(images[index]);
    this.setBackground(imageObj);
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
   * Normalize image entry to { url, credit, href }.
   * Accepts either a string (url) or an object with metadata.
   */
  normalizeImage(image) {
    if (!image) {
      return { url: "", credit: "", href: "" };
    }
    if (typeof image === "string") {
      return {
        url: image,
        credit: "Dummy Name",
        href: "https://unsplash.com/@",
      };
    }
    return {
      url: image.url || "",
      credit: image.credit || "Dummy Name",
      href: image.href || "https://unsplash.com/@",
    };
  }

  /**
   * Create a small attribution box and append to the document.
   * It's styled via CSS (#bg-attribution in styles.css).
   */
  createAttributionEl() {
    if (this.attributionEl) return;
    if (!document.body) {
      // If called too early, wait for DOMContentLoaded
      document.addEventListener(
        "DOMContentLoaded",
        () => this.createAttributionEl(),
        { once: true },
      );
      return;
    }

    const el = document.createElement("div");
    el.id = "bg-attribution";
    // Styles are now defined in CSS

    const cam = document.createElement("span");
    cam.innerHTML = this._getIcon("📷", { size: 16 });
    cam.setAttribute("aria-hidden", "true");
    Object.assign(cam.style, {
      display: "inline-flex",
      justifyContent: "center",
      alignItems: "center",
      width: "20px",
      height: "20px",
      fontSize: "16px",
      lineHeight: "20px",
      verticalAlign: "middle",
      transform: "translateY(-1px)",
      marginRight: "6px",
    });

    const label = document.createElement("span");
    label.textContent = "Photo by ";
    label.style.opacity = "0.95";

    const anchor = document.createElement("a");
    anchor.id = "bg-attribution-link";
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";

    el.appendChild(cam);
    el.appendChild(label);
    el.appendChild(anchor);

    document.body.appendChild(el);
    // Initially hide from assistive tech; visible state will set aria-hidden=false
    el.setAttribute("aria-hidden", "true");

    this.attributionEl = el;
    this.attributionAnchor = anchor;

    // Setup proximity trigger to show attribution near the bottom-left corner
    // Store timers on the instance so other methods (e.g., updateAttribution)
    // can cancel or reschedule them reliably.
    this._bgAttrHideTimer = null;
    this._BG_ATTR_HIDE_DELAY = 3000; // ms (user-requested for hover)
    this._BG_ATTR_FADE_MS = 420; // ms (match CSS fade duration)
    this._BG_ATTR_HOT_CORNER_WIDTH = 280; // px from left edge
    this._BG_ATTR_HOT_CORNER_HEIGHT = 180; // px from bottom edge
    this._bgAttrPointerNearCorner = false;

    const cancelBgAttrHide = () => {
      if (this._bgAttrHideTimer) {
        clearTimeout(this._bgAttrHideTimer);
        this._bgAttrHideTimer = null;
      }
      if (this._bgAttrStartupTimer) {
        clearTimeout(this._bgAttrStartupTimer);
        this._bgAttrStartupTimer = null;
      }
    };

    const showBgAttr = () => {
      cancelBgAttrHide();
      // If an exit animation was running or autohide was applied, cancel that and make visible
      el.classList.remove("exit-animate", "autohide");
      el.classList.add("hot-visible");
      try {
        el.setAttribute("aria-hidden", "false");
      } catch (e) {}
    };

    const scheduleHideBgAttr = (delay = this._BG_ATTR_HIDE_DELAY) => {
      cancelBgAttrHide();
      this._bgAttrHideTimer = setTimeout(() => {
        // Start a dedicated exit animation for a beautiful fade
        el.classList.add("exit-animate");
        // Remove visible state immediately so animation contrasts with visible look
        el.classList.remove("hot-visible");

        // After fade completes, finish hide by applying autohide and updating ARIA
        setTimeout(() => {
          el.classList.remove("exit-animate");
          if (!el.classList.contains("hot-visible")) {
            el.classList.add("autohide");
            try {
              el.setAttribute("aria-hidden", "true");
            } catch (e) {}
          } else {
            // If re-hovered during fade, keep visible
            el.classList.remove("autohide");
            try {
              el.setAttribute("aria-hidden", "false");
            } catch (e) {}
          }
        }, this._BG_ATTR_FADE_MS);

        this._bgAttrHideTimer = null;
      }, delay);
    };

    const isPointerNearBottomLeft = (event) => {
      if (!event) return false;
      const fromLeft = event.clientX;
      const fromBottom = window.innerHeight - event.clientY;
      return (
        fromLeft <= this._BG_ATTR_HOT_CORNER_WIDTH &&
        fromBottom <= this._BG_ATTR_HOT_CORNER_HEIGHT
      );
    };

    const maybeScheduleHideBgAttr = (delay = this._BG_ATTR_HIDE_DELAY) => {
      if (this._bgAttrPointerNearCorner) return;
      if (el.matches(":hover")) return;
      const active = document.activeElement;
      if (active && el.contains(active)) return;
      scheduleHideBgAttr(delay);
    };

    document.addEventListener(
      "mousemove",
      (event) => {
        const nearCorner = isPointerNearBottomLeft(event);
        if (nearCorner) {
          this._bgAttrPointerNearCorner = true;
          showBgAttr();
        } else if (this._bgAttrPointerNearCorner) {
          this._bgAttrPointerNearCorner = false;
          maybeScheduleHideBgAttr();
        }
      },
      { passive: true },
    );

    el.addEventListener("mouseenter", showBgAttr, { passive: true });
    el.addEventListener("mouseleave", () => maybeScheduleHideBgAttr());
    // Support keyboard focus as well
    el.addEventListener("focusin", showBgAttr);
    el.addEventListener("focusout", () => maybeScheduleHideBgAttr());
  }

  /**
   * Update attribution box content and visibility
   */
  updateAttribution(imageObj) {
    if (!this.attributionEl) this.createAttributionEl();
    if (!imageObj || !imageObj.credit) {
      this.attributionEl.classList.remove(
        "entrance-animate",
        "autohide",
        "hot-visible",
      );
      return;
    }
    this.attributionAnchor.textContent = imageObj.credit;
    this.attributionAnchor.href = imageObj.href || "#";

    // Show with bouncy entrance animation and ensure any previous hide is cancelled
    try {
      if (this._bgAttrHideTimer) {
        clearTimeout(this._bgAttrHideTimer);
        this._bgAttrHideTimer = null;
      }
    } catch (e) {}

    try {
      this.attributionEl.setAttribute("aria-hidden", "false");
    } catch (e) {}
    this.attributionEl.classList.remove(
      "autohide",
      "hot-visible",
      "exit-animate",
    );
    this.attributionEl.classList.add("entrance-animate");

    // After a longer visible period, fade out beautifully and then switch to autohide
    const _STARTUP_VISIBLE_MS = 5200; // ms (user requested)
    const _fadeMs = this._BG_ATTR_FADE_MS || 420;

    // Clear any previous startup timer, then schedule the exit
    if (this._bgAttrStartupTimer) {
      clearTimeout(this._bgAttrStartupTimer);
      this._bgAttrStartupTimer = null;
    }

    this._bgAttrStartupTimer = setTimeout(() => {
      this._bgAttrStartupTimer = null;
      this.attributionEl.classList.remove("entrance-animate");
      // Begin a pretty exit animation
      this.attributionEl.classList.add("exit-animate");

      // When animation ends, finalize autohide and update ARIA
      setTimeout(() => {
        this.attributionEl.classList.remove("exit-animate");
        if (!this.attributionEl.classList.contains("hot-visible")) {
          this.attributionEl.classList.add("autohide");
          try {
            this.attributionEl.setAttribute("aria-hidden", "true");
          } catch (e) {}
        } else {
          // If re-hovered, keep visible
          this.attributionEl.classList.remove("autohide");
          try {
            this.attributionEl.setAttribute("aria-hidden", "false");
          } catch (e) {}
        }
      }, _fadeMs);
    }, _STARTUP_VISIBLE_MS);
  }

  /**
   * Set background with fade transition
   */
  setBackground(image) {
    const imgObj = this.normalizeImage(image);
    const fullUrl = this.getImageUrl(imgObj.url);
    const targetBg = this.currentBg === 1 ? this.bg2 : this.bg1;
    const currentBgEl = this.currentBg === 1 ? this.bg1 : this.bg2;

    // Preload image
    const img = new Image();
    img.onload = () => {
      targetBg.style.backgroundImage = `url(${fullUrl})`;
      targetBg.style.backgroundSize = "cover";
      targetBg.style.backgroundPosition = "center center";
      targetBg.classList.add("active");
      currentBgEl.classList.remove("active");
      this.currentBg = this.currentBg === 1 ? 2 : 1;
      this.updateAttribution(imgObj);
    };
    img.onerror = () => {
      // Use fallback gradient if image fails
      targetBg.style.background =
        "linear-gradient(135deg, #1a5f4a 0%, #0d3d2e 100%)";
      targetBg.classList.add("active");
      currentBgEl.classList.remove("active");
      this.updateAttribution(imgObj);
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

    const imageObj = this.normalizeImage(images[index]);
    this.setBackground(imageObj);
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
      const imageObj = this.normalizeImage(images[0]);
      this.setBackground(imageObj);
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

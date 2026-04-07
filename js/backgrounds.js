/**
 * Background Manager
 * Handles background image rotation with nature images
 */

class BackgroundManager extends BaseManager {
  constructor(storage) {
    super();
    this.storage = storage;
    this.bg1 = document.getElementById("bg1");
    this.bg2 = document.getElementById("bg2");
    this.backgroundOverlayEl = document.querySelector(".background-overlay");
    this.currentBg = 1;
    this.currentImageUrl = "";
    this.intervalId = null;
    this.backgroundDisplayMode = "fill";
    this.backgroundDim = 100;
    this.backgroundBlur = 0;
    this.backgroundShuffle = true;
    this._setBackgroundRequestId = 0;
    this._customBackgroundTokenPrefix = "mdcbg:id:";
    this._customBackgroundMediaDbName = "md-custom-background-media-v1";
    this._customBackgroundMediaStoreName = "media";
    this._customBackgroundMediaDbPromise = null;
    this._customBackgroundResolvedUrlCache = new Map();
    this._solidBackgroundUrlPrefix = "solid:";
    this._defaultSolidBackgroundUrls = null;

    // Listen for icon theme changes
    document.addEventListener("md:icon-theme-change", () => {
      this._updateCameraIcon();
    });

    // High-quality nature background metadata from Unsplash.
    // Each image entry includes a `url`, `credit`, and source-profile `href`.
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
    this.updateDisplayMode(settings.bgDisplayMode || "fill");
    this.updateDim(settings.bgDim);
    this.updateBlur(settings.bgBlur);
    this.updateShuffleMode(settings.bgShuffle !== false);
    this.loadBackground(settings);
    this.startRotation(settings.bgInterval);
  }

  /**
   * Get images array for a category
   */
  normalizeBackgroundCategory(category) {
    const normalized = String(category || "").trim();
    if (!normalized) return "nature";

    if (
      normalized === "allWithCustom" ||
      normalized === "allNoCustom" ||
      normalized === "all"
    ) {
      return "all";
    }

    return normalized;
  }

  normalizeBackgroundDisplayMode(mode) {
    const normalized = String(mode || "")
      .trim()
      .toLowerCase();
    const allowed = new Set([
      "fill",
      "fit",
      "stretch",
      "tile",
      "center",
      "span",
    ]);
    return allowed.has(normalized) ? normalized : "fill";
  }

  normalizeBackgroundDim(value, fallback = 100) {
    const parsed = Number(value);
    const safe = Number.isFinite(parsed) ? parsed : fallback;
    return Math.min(100, Math.max(0, Math.round(safe)));
  }

  normalizeBackgroundBlur(value, fallback = 0) {
    const parsed = Number(value);
    const safe = Number.isFinite(parsed) ? parsed : fallback;
    return Math.min(40, Math.max(0, Math.round(safe)));
  }

  isShuffleEnabled(settings = null) {
    if (settings && typeof settings === "object") {
      return settings.bgShuffle !== false;
    }

    return this.backgroundShuffle !== false;
  }

  _getNextOrderedIndex(images, currentIndex) {
    if (!Array.isArray(images) || images.length === 0) return -1;
    if (!Number.isInteger(currentIndex) || currentIndex < 0) return 0;
    if (currentIndex >= images.length - 1) return 0;
    return currentIndex + 1;
  }

  _getDisplayStyleForMode(mode) {
    switch (this.normalizeBackgroundDisplayMode(mode)) {
      case "fit":
        return {
          size: "contain",
          position: "center center",
          repeat: "no-repeat",
        };
      case "stretch":
        return {
          size: "100% 100%",
          position: "center center",
          repeat: "no-repeat",
        };
      case "tile":
        return {
          size: "auto",
          position: "top left",
          repeat: "repeat",
        };
      case "center":
        return {
          size: "auto",
          position: "center center",
          repeat: "no-repeat",
        };
      case "span":
        return {
          size: "100% auto",
          position: "center center",
          repeat: "no-repeat",
        };
      case "fill":
      default:
        return {
          size: "cover",
          position: "center center",
          repeat: "no-repeat",
        };
    }
  }

  applyBackgroundDisplayMode(mode = null) {
    const resolvedMode =
      mode === null
        ? this.backgroundDisplayMode
        : this.normalizeBackgroundDisplayMode(mode);

    this.backgroundDisplayMode = resolvedMode;
    const style = this._getDisplayStyleForMode(resolvedMode);
    [this.bg1, this.bg2].forEach((el) => {
      if (!el) return;
      el.style.backgroundSize = style.size;
      el.style.backgroundPosition = style.position;
      el.style.backgroundRepeat = style.repeat;
    });
  }

  updateDisplayMode(mode) {
    this.applyBackgroundDisplayMode(mode);
  }

  applyBackgroundVisualEffects({ dim, blur } = {}) {
    const resolvedDim =
      dim === undefined
        ? this.backgroundDim
        : this.normalizeBackgroundDim(dim, this.backgroundDim);
    const resolvedBlur =
      blur === undefined
        ? this.backgroundBlur
        : this.normalizeBackgroundBlur(blur, this.backgroundBlur);

    this.backgroundDim = resolvedDim;
    this.backgroundBlur = resolvedBlur;

    if (this.backgroundOverlayEl) {
      this.backgroundOverlayEl.style.opacity = String(resolvedDim / 100);
    }

    const blurCss = resolvedBlur > 0 ? `blur(${resolvedBlur}px)` : "none";
    [this.bg1, this.bg2].forEach((el) => {
      if (!el) return;
      el.style.filter = blurCss;
      el.style.webkitFilter = blurCss;
    });
  }

  updateDim(dim) {
    this.applyBackgroundVisualEffects({ dim });
  }

  updateBlur(blur) {
    this.applyBackgroundVisualEffects({ blur });
  }

  updateShuffleMode(enabled) {
    this.backgroundShuffle = enabled !== false;
  }

  isCustomBackgroundToken(url) {
    const normalized = this._normalizeImageUrl(url);
    const prefix = this._customBackgroundTokenPrefix || "mdcbg:id:";
    return normalized.startsWith(prefix) && normalized.length > prefix.length;
  }

  getCustomBackgroundIdFromToken(token) {
    const normalized = this._normalizeImageUrl(token);
    if (!this.isCustomBackgroundToken(normalized)) return "";

    const prefix = this._customBackgroundTokenPrefix || "mdcbg:id:";
    return normalized.slice(prefix.length);
  }

  isCustomBackgroundMediaStoreAvailable() {
    return (
      typeof window !== "undefined" && typeof window.indexedDB !== "undefined"
    );
  }

  customBackgroundDbRequestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error || new Error("IndexedDB request failed"));
    });
  }

  openCustomBackgroundMediaDb() {
    if (!this.isCustomBackgroundMediaStoreAvailable()) {
      return Promise.resolve(null);
    }

    if (this._customBackgroundMediaDbPromise) {
      return this._customBackgroundMediaDbPromise;
    }

    this._customBackgroundMediaDbPromise = new Promise((resolve) => {
      const request = window.indexedDB.open(
        this._customBackgroundMediaDbName,
        1,
      );

      request.onupgradeneeded = (event) => {
        const db = event.target?.result;
        if (!db) return;

        if (
          !db.objectStoreNames.contains(this._customBackgroundMediaStoreName)
        ) {
          db.createObjectStore(this._customBackgroundMediaStoreName, {
            keyPath: "id",
          });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        if (!db) {
          resolve(null);
          return;
        }

        db.onversionchange = () => {
          try {
            db.close();
          } catch (e) {}
          this._customBackgroundMediaDbPromise = null;
        };

        resolve(db);
      };

      request.onerror = () => {
        this._customBackgroundMediaDbPromise = null;
        resolve(null);
      };
    });

    return this._customBackgroundMediaDbPromise;
  }

  async resolveCustomBackgroundTokenUrl(tokenUrl) {
    const normalizedToken = this._normalizeImageUrl(tokenUrl);
    if (!this.isCustomBackgroundToken(normalizedToken)) {
      return normalizedToken;
    }

    const cached = this._customBackgroundResolvedUrlCache.get(normalizedToken);
    if (cached) {
      return cached;
    }

    const mediaId = this.getCustomBackgroundIdFromToken(normalizedToken);
    if (!mediaId) {
      return "";
    }

    const db = await this.openCustomBackgroundMediaDb();
    if (!db) {
      return "";
    }

    try {
      const tx = db.transaction(
        this._customBackgroundMediaStoreName,
        "readonly",
      );
      const store = tx.objectStore(this._customBackgroundMediaStoreName);
      const record = await this.customBackgroundDbRequestToPromise(
        store.get(mediaId),
      );
      const imageDataUrl = this._normalizeImageUrl(record?.imageDataUrl);
      if (!imageDataUrl || !imageDataUrl.startsWith("data:image")) {
        return "";
      }

      this._customBackgroundResolvedUrlCache.set(normalizedToken, imageDataUrl);
      return imageDataUrl;
    } catch (e) {
      return "";
    }
  }

  async resolveBackgroundImageUrl(imageUrl) {
    const normalizedUrl = this._normalizeImageUrl(imageUrl);
    if (!normalizedUrl) return "";

    if (this.isCustomBackgroundToken(normalizedUrl)) {
      return this.resolveCustomBackgroundTokenUrl(normalizedUrl);
    }

    return normalizedUrl;
  }

  _getSpecialCategoryType(category) {
    return category === "all" || category === "custom" || category === "solid"
      ? category
      : null;
  }

  _normalizeSolidColorHex(value) {
    let raw = String(value || "").trim();
    if (!raw) return "";

    if (raw.toLowerCase().startsWith(this._solidBackgroundUrlPrefix)) {
      raw = raw.slice(this._solidBackgroundUrlPrefix.length);
    }

    if (!raw.startsWith("#")) {
      raw = `#${raw}`;
    }

    const shortMatch = raw.match(/^#([0-9a-fA-F]{3})$/);
    if (shortMatch) {
      const [r, g, b] = shortMatch[1].split("");
      raw = `#${r}${r}${g}${g}${b}${b}`;
    }

    const fullMatch = raw.match(/^#([0-9a-fA-F]{6})$/);
    if (!fullMatch) return "";

    return `#${fullMatch[1].toUpperCase()}`;
  }

  _solidColorHexToUrl(value) {
    const hex = this._normalizeSolidColorHex(value);
    if (!hex) return "";
    return `${this._solidBackgroundUrlPrefix}${hex}`;
  }

  _solidBackgroundUrlToColor(value) {
    const normalized = this._normalizeImageUrl(value);
    if (!this.isSolidColorBackgroundUrl(normalized)) return "";
    return this._normalizeSolidColorHex(
      normalized.slice(this._solidBackgroundUrlPrefix.length),
    );
  }

  isSolidColorBackgroundUrl(value) {
    const normalized = this._normalizeImageUrl(value);
    return normalized.toLowerCase().startsWith(this._solidBackgroundUrlPrefix);
  }

  _hslToHex(h, s, l) {
    const hh = (((Number(h) || 0) % 360) + 360) % 360;
    const ss = Math.max(0, Math.min(100, Number(s) || 0)) / 100;
    const ll = Math.max(0, Math.min(100, Number(l) || 0)) / 100;

    const c = (1 - Math.abs(2 * ll - 1)) * ss;
    const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
    const m = ll - c / 2;

    let r1 = 0;
    let g1 = 0;
    let b1 = 0;

    if (hh < 60) {
      r1 = c;
      g1 = x;
    } else if (hh < 120) {
      r1 = x;
      g1 = c;
    } else if (hh < 180) {
      g1 = c;
      b1 = x;
    } else if (hh < 240) {
      g1 = x;
      b1 = c;
    } else if (hh < 300) {
      r1 = x;
      b1 = c;
    } else {
      r1 = c;
      b1 = x;
    }

    const toHex2 = (n) =>
      Math.round((n + m) * 255)
        .toString(16)
        .padStart(2, "0")
        .toUpperCase();

    return `#${toHex2(r1)}${toHex2(g1)}${toHex2(b1)}`;
  }

  _getDefaultSolidBackgroundUrls() {
    if (Array.isArray(this._defaultSolidBackgroundUrls)) {
      return this._defaultSolidBackgroundUrls.slice();
    }

    const generated = [];
    const seen = new Set();
    const saturations = [88, 76, 64];
    const lightnesses = [58, 48, 38];

    for (let hue = 0; hue < 360; hue += 12) {
      saturations.forEach((sat, satIndex) => {
        const light = lightnesses[satIndex] ?? lightnesses[1];
        const hex = this._hslToHex(hue, sat, light);
        const url = this._solidColorHexToUrl(hex);
        if (!url || seen.has(url)) return;
        seen.add(url);
        generated.push(url);
      });
    }

    ["#0B1020", "#101820", "#1A1A1A", "#2B2B2B", "#E8E3D8", "#F5F5F5"]
      .map((hex) => this._solidColorHexToUrl(hex))
      .forEach((url) => {
        if (!url || seen.has(url)) return;
        seen.add(url);
        generated.push(url);
      });

    this._defaultSolidBackgroundUrls = generated;
    return generated.slice();
  }

  _getSolidBackgrounds(settings) {
    const defaultUrls = this._getDefaultSolidBackgroundUrls();
    const defaultSet = new Set(
      defaultUrls
        .map((entry) => this._normalizeImageUrl(entry))
        .filter(Boolean),
    );
    const customHexes = Array.isArray(settings?.solidColorTemplates)
      ? settings.solidColorTemplates
          .map((entry) => this._normalizeSolidColorHex(entry))
          .filter(Boolean)
      : [];

    const merged = [];
    const seen = new Set();

    [
      ...defaultUrls,
      ...customHexes.map((hex) => this._solidColorHexToUrl(hex)),
    ].forEach((url) => {
      const normalizedUrl = this._normalizeImageUrl(url);
      const hex = this._solidBackgroundUrlToColor(normalizedUrl);
      if (!normalizedUrl || !hex || seen.has(normalizedUrl)) return;
      seen.add(normalizedUrl);
      merged.push({
        url: normalizedUrl,
        credit: "",
        href: "",
        isCustomSolid: !defaultSet.has(normalizedUrl),
      });
    });

    return merged;
  }

  _getCustomBackgrounds(settings) {
    if (!Array.isArray(settings?.customBackgrounds)) {
      return [];
    }

    const normalized = [];
    const seen = new Set();
    settings.customBackgrounds.forEach((entry) => {
      if (typeof entry === "string") {
        const url = this._normalizeImageUrl(entry);
        if (!url || seen.has(url)) return;
        seen.add(url);
        normalized.push(url);
        return;
      }

      if (entry && typeof entry === "object") {
        const url = this._normalizeImageUrl(entry.url);
        if (!url || seen.has(url)) return;
        seen.add(url);
        normalized.push({
          ...entry,
          url,
        });
      }
    });

    return normalized;
  }

  _normalizeImageUrl(url) {
    return String(url || "").trim();
  }

  _getSelectedBackgroundUrlsForCategory(category, settings) {
    const normalizedCategory = this.normalizeBackgroundCategory(category);
    const map = settings?.backgroundImageSelections;
    if (!map || typeof map !== "object" || Array.isArray(map)) {
      return null;
    }

    const rawUrls = map[normalizedCategory];
    if (!Array.isArray(rawUrls)) {
      return null;
    }

    const dedupedUrls = [];
    const seen = new Set();
    rawUrls.forEach((value) => {
      const normalized = this._normalizeImageUrl(value);
      if (!normalized || seen.has(normalized)) {
        return;
      }
      seen.add(normalized);
      dedupedUrls.push(normalized);
    });

    return dedupedUrls;
  }

  getAllImagesForCategory(category, settings) {
    const normalizedCategory = this.normalizeBackgroundCategory(category);
    const resolvedSettings =
      settings && typeof settings === "object"
        ? settings
        : this.storage.getSettings();
    const specialCategory = this._getSpecialCategoryType(normalizedCategory);
    const allBuiltIn = Object.values(this.backgrounds).flat();
    const customBgs = this._getCustomBackgrounds(resolvedSettings);

    if (specialCategory === "all") {
      const merged = [...allBuiltIn, ...customBgs];
      return merged.length > 0 ? merged : this.backgrounds.nature;
    }

    if (specialCategory === "custom") {
      return customBgs;
    }

    if (specialCategory === "solid") {
      return this._getSolidBackgrounds(resolvedSettings);
    }

    return this.backgrounds[normalizedCategory] || this.backgrounds.nature;
  }

  getImagesForCategory(category, settings) {
    const normalizedCategory = this.normalizeBackgroundCategory(category);
    const resolvedSettings =
      settings && typeof settings === "object"
        ? settings
        : this.storage.getSettings();
    const allImages = this.getAllImagesForCategory(
      normalizedCategory,
      resolvedSettings,
    );
    const selectedUrls = this._getSelectedBackgroundUrlsForCategory(
      normalizedCategory,
      resolvedSettings,
    );

    if (!selectedUrls) {
      return allImages;
    }

    if (selectedUrls.length === 0) {
      return [];
    }

    const selectedSet = new Set(selectedUrls);
    const filtered = allImages.filter((image) => {
      const url = this._normalizeImageUrl(this.normalizeImage(image).url);
      return selectedSet.has(url);
    });

    // Fallback for migrated/legacy selection maps where URL formats changed.
    if (filtered.length === 0 && allImages.length > 0) {
      return allImages;
    }

    return filtered;
  }

  _getImageUrlByIndex(images, index) {
    if (!Array.isArray(images)) return "";
    if (!Number.isInteger(index) || index < 0 || index >= images.length) {
      return "";
    }
    return this._normalizeImageUrl(this.normalizeImage(images[index]).url);
  }

  findImageIndexByUrl(images, imageUrl) {
    if (!Array.isArray(images) || images.length === 0) return -1;

    const target = this._normalizeImageUrl(imageUrl);
    if (!target) return -1;

    for (let i = 0; i < images.length; i += 1) {
      if (this._getImageUrlByIndex(images, i) === target) {
        return i;
      }
    }

    return -1;
  }

  _getRandomIndex(length, excludeIndex = -1) {
    if (!Number.isFinite(length) || length <= 0) return 0;
    if (length === 1) return 0;

    let index = Math.floor(Math.random() * length);
    if (excludeIndex < 0 || excludeIndex >= length) {
      return index;
    }

    while (index === excludeIndex) {
      index = Math.floor(Math.random() * length);
    }

    return index;
  }

  _getRandomIndexAvoidingImage(images, options = {}) {
    if (!Array.isArray(images) || images.length === 0) return 0;

    const { excludeIndex = -1, excludeUrl = "" } = options;
    const normalizedExcludeUrl = this._normalizeImageUrl(excludeUrl);
    const candidates = [];

    for (let i = 0; i < images.length; i += 1) {
      const matchesIndex = Number.isInteger(excludeIndex) && i === excludeIndex;
      const matchesUrl =
        normalizedExcludeUrl &&
        this._getImageUrlByIndex(images, i) === normalizedExcludeUrl;

      if (!matchesIndex && !matchesUrl) {
        candidates.push(i);
      }
    }

    if (candidates.length === 0) {
      return this._getRandomIndex(images.length, excludeIndex);
    }

    const randomPos = Math.floor(Math.random() * candidates.length);
    return candidates[randomPos];
  }

  getCurrentImageUrl(settings = null) {
    const displayed = this._normalizeImageUrl(this.currentImageUrl);
    if (displayed) {
      return displayed;
    }

    const resolvedSettings =
      settings && typeof settings === "object"
        ? settings
        : this.storage.getSettings();
    const category = this.normalizeBackgroundCategory(
      resolvedSettings.bgCategory || "nature",
    );
    const images = this.getImagesForCategory(category, resolvedSettings);
    const index = Number.isInteger(resolvedSettings.currentBgIndex)
      ? resolvedSettings.currentBgIndex
      : -1;
    return this._getImageUrlByIndex(images, index);
  }

  /**
   * Load background image
   */
  loadBackground(settings) {
    const category = this.normalizeBackgroundCategory(
      settings.bgCategory || "nature",
    );
    this.updateDisplayMode(
      settings.bgDisplayMode || this.backgroundDisplayMode,
    );
    this.updateDim(settings.bgDim);
    this.updateBlur(settings.bgBlur);
    this.updateShuffleMode(settings.bgShuffle !== false);

    const images = this.getImagesForCategory(category, settings);
    if (images.length === 0) return;

    let index = Number.isInteger(settings.currentBgIndex)
      ? settings.currentBgIndex
      : -1;
    if (index < 0 || index >= images.length) {
      index = -1;
    }
    const previousImageUrl = this._getImageUrlByIndex(images, index);

    const lastChange = settings.lastBgChange;
    const intervalValue =
      settings.bgInterval === "custom"
        ? settings.bgIntervalCustom
        : settings.bgInterval;
    const intervalMinutes = Number(intervalValue) || 60;
    const interval = intervalMinutes * 60 * 1000;
    const now = Date.now();

    const shouldRotate =
      !lastChange || now - lastChange >= interval || index === -1;
    if (shouldRotate) {
      if (this.isShuffleEnabled(settings)) {
        index = this._getRandomIndexAvoidingImage(images, {
          excludeIndex: index,
          excludeUrl: previousImageUrl,
        });
      } else {
        index = this._getNextOrderedIndex(images, index);
      }
      settings.currentBgIndex = index;
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
    // Uploaded custom backgrounds are data/blob URLs; adding query params
    // corrupts them and causes image preload to fail.
    if (!/^https?:\/\//i.test(String(url || ""))) {
      return url;
    }
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
        credit: "",
        href: "",
      };
    }
    return {
      url: image.url || "",
      credit: image.credit || "",
      href: image.href || "",
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

    let bgAttrMoveRaf = null;
    let latestMoveEvent = null;

    const processBgAttrPointerMove = () => {
      bgAttrMoveRaf = null;

      const event = latestMoveEvent;
      latestMoveEvent = null;
      if (!event) return;

      const nearCorner = isPointerNearBottomLeft(event);
      if (nearCorner && !this._bgAttrPointerNearCorner) {
        this._bgAttrPointerNearCorner = true;
        showBgAttr();
      } else if (!nearCorner && this._bgAttrPointerNearCorner) {
        this._bgAttrPointerNearCorner = false;
        maybeScheduleHideBgAttr();
      }
    };

    document.addEventListener(
      "mousemove",
      (event) => {
        latestMoveEvent = event;
        if (bgAttrMoveRaf) return;
        bgAttrMoveRaf = requestAnimationFrame(processBgAttrPointerMove);
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
  async setBackground(image) {
    const imgObj = this.normalizeImage(image);
    const requestId = (this._setBackgroundRequestId || 0) + 1;
    this._setBackgroundRequestId = requestId;

    const sourceUrl = await this.resolveBackgroundImageUrl(imgObj.url);
    if (requestId !== this._setBackgroundRequestId) {
      return;
    }

    const targetBg = this.currentBg === 1 ? this.bg2 : this.bg1;
    const currentBgEl = this.currentBg === 1 ? this.bg1 : this.bg2;

    const solidColor = this._solidBackgroundUrlToColor(sourceUrl);
    if (solidColor) {
      this.applyBackgroundDisplayMode(this.backgroundDisplayMode);
      targetBg.style.backgroundImage = "none";
      targetBg.style.background = solidColor;
      targetBg.style.backgroundColor = solidColor;
      targetBg.classList.add("active");
      currentBgEl.classList.remove("active");
      this.currentBg = this.currentBg === 1 ? 2 : 1;
      this.currentImageUrl = this._normalizeImageUrl(imgObj.url);
      this.updateAttribution({ ...imgObj, credit: "", href: "" });
      return;
    }

    const fullUrl = this.getImageUrl(sourceUrl);

    if (!fullUrl) {
      targetBg.style.background =
        "linear-gradient(135deg, #1a5f4a 0%, #0d3d2e 100%)";
      targetBg.classList.add("active");
      currentBgEl.classList.remove("active");
      this.currentImageUrl = "";
      this.updateAttribution(imgObj);
      return;
    }

    // Preload image
    const img = new Image();
    img.onload = () => {
      if (requestId !== this._setBackgroundRequestId) {
        return;
      }

      this.applyBackgroundDisplayMode(this.backgroundDisplayMode);
      targetBg.style.backgroundImage = `url(${fullUrl})`;
      targetBg.classList.add("active");
      currentBgEl.classList.remove("active");
      this.currentBg = this.currentBg === 1 ? 2 : 1;
      this.currentImageUrl = this._normalizeImageUrl(imgObj.url);
      this.updateAttribution(imgObj);
    };
    img.onerror = () => {
      if (requestId !== this._setBackgroundRequestId) {
        return;
      }

      // Use fallback gradient if image fails
      targetBg.style.background =
        "linear-gradient(135deg, #1a5f4a 0%, #0d3d2e 100%)";
      targetBg.classList.add("active");
      currentBgEl.classList.remove("active");
      this.currentImageUrl = "";
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

    const safeIntervalMinutes = Number(intervalMinutes) || 60;
    const intervalMs = safeIntervalMinutes * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.changeBackground();
    }, intervalMs);
  }

  /**
   * Change to next background
   */
  changeBackground() {
    const settings = this.storage.getSettings();
    const category = this.normalizeBackgroundCategory(
      settings.bgCategory || "nature",
    );
    this.updateDisplayMode(
      settings.bgDisplayMode || this.backgroundDisplayMode,
    );
    this.updateDim(settings.bgDim);
    this.updateBlur(settings.bgBlur);
    this.updateShuffleMode(settings.bgShuffle !== false);

    const images = this.getImagesForCategory(category, settings);
    if (images.length === 0) return;

    const currentIndex = Number.isInteger(settings.currentBgIndex)
      ? settings.currentBgIndex
      : -1;
    const currentImageUrl = this.getCurrentImageUrl(settings);
    const index = this.isShuffleEnabled(settings)
      ? this._getRandomIndexAvoidingImage(images, {
          excludeIndex: currentIndex,
          excludeUrl: currentImageUrl,
        })
      : this._getNextOrderedIndex(images, currentIndex);
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
    const normalizedCategory = this.normalizeBackgroundCategory(category);
    this.updateDisplayMode(
      settings.bgDisplayMode || this.backgroundDisplayMode,
    );
    this.updateDim(settings.bgDim);
    this.updateBlur(settings.bgBlur);
    this.updateShuffleMode(settings.bgShuffle !== false);

    const previousCategory = this.normalizeBackgroundCategory(
      settings.bgCategory || "nature",
    );
    const previousImages = this.getImagesForCategory(
      previousCategory,
      settings,
    );
    const previousIndex = Number.isInteger(settings.currentBgIndex)
      ? settings.currentBgIndex
      : -1;
    const previousImageUrl =
      this._getImageUrlByIndex(previousImages, previousIndex) ||
      this.getCurrentImageUrl(settings);

    settings.bgCategory = normalizedCategory;
    const images = this.getImagesForCategory(normalizedCategory, settings);
    if (images.length > 0) {
      const index = this.isShuffleEnabled(settings)
        ? this._getRandomIndexAvoidingImage(images, {
            excludeIndex:
              previousCategory === normalizedCategory ? previousIndex : -1,
            excludeUrl: previousImageUrl,
          })
        : previousCategory === normalizedCategory
          ? this._getNextOrderedIndex(images, previousIndex)
          : 0;
      settings.currentBgIndex = index;
      settings.lastBgChange = Date.now();
      this.storage.saveSettings(settings);

      const imageObj = this.normalizeImage(images[index]);
      this.setBackground(imageObj);
      return;
    }

    settings.currentBgIndex = 0;
    settings.lastBgChange = Date.now();
    this.storage.saveSettings(settings);
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

/**
 * Favicon Cache Manager
 * Handles caching of favicons using IndexedDB for persistent storage
 * Features:
 * - Caches favicons as display-ready URL strings (data URLs or remote URLs)
 * - Supports custom favicon imports (file + URL)
 * - Automatic downscaling to 256x256 for large images
 * - Google favicon URL generation with caching
 * - Session-aware refresh control (only fetch on fresh start or manual refresh)
 */

class FaviconCacheManager {
  static DB_NAME = "MuslimDashboardFaviconCache";
  static DB_VERSION = 1;
  static STORE_NAME = "favicons";
  static MAX_SIZE = 256; // Maximum dimension for stored favicons
  static MAX_ENTRIES = 300; // Store cap, oldest auto-fetched icons first
  static FAILURE_TTL_MS = 24 * 60 * 60 * 1000; // A dead icon is not retried today
  static LOCAL_STORAGE_PREFIX = "muslim-dashboard:favicon:";

  constructor() {
    this.db = null;
    this.dbReady = this._initDB();
    this.sessionFetched = new Set(); // Track URLs fetched this session
  }

  /**
   * Initialize IndexedDB
   */
  async _initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(
        FaviconCacheManager.DB_NAME,
        FaviconCacheManager.DB_VERSION,
      );

      request.onerror = () => {
        console.error("FaviconCache: IndexedDB open error", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(FaviconCacheManager.STORE_NAME)) {
          const store = db.createObjectStore(FaviconCacheManager.STORE_NAME, {
            keyPath: "key",
          });
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("type", "type", { unique: false });
        }
      };
    });
  }

  /**
   * Ensure database is ready
   */
  async _ensureDB() {
    if (!this.db) {
      await this.dbReady;
    }
    return this.db;
  }

  /**
   * Generate a cache key from URL
   */
  _getCacheKey(url, type = "pinned") {
    const normalizedUrl = this._normalizeLookupUrl(url);
    if (normalizedUrl) {
      // Domain-base keys keep favicon cache consistent across deep paths.
      return `${type}:${normalizedUrl}`;
    }

    // For non-URL strings (like malformed templates), fall back to a safe key.
    const sanitized = String(url || "").replace(/[^a-zA-Z0-9.-]/g, "_");
    return `${type}:${sanitized}`;
  }

  _getLocalStorageKey(cacheKey) {
    return `${FaviconCacheManager.LOCAL_STORAGE_PREFIX}${cacheKey}`;
  }

  _isOfflineCacheableDataUrl(dataUrl) {
    return /^data:image\//i.test(String(dataUrl || ""));
  }

  _getLocalStorageCached(cacheKey) {
    try {
      const raw = localStorage.getItem(this._getLocalStorageKey(cacheKey));
      if (!raw) return null;

      const record = JSON.parse(raw);
      if (!this._isOfflineCacheableDataUrl(record?.dataUrl)) return null;
      return record;
    } catch (e) {
      return null;
    }
  }

  _setLocalStorageCached(cacheKey, record) {
    try {
      if (!this._isOfflineCacheableDataUrl(record?.dataUrl)) return false;
      localStorage.setItem(
        this._getLocalStorageKey(cacheKey),
        JSON.stringify(record),
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  _clearLocalStorageCache() {
    try {
      const prefix = FaviconCacheManager.LOCAL_STORAGE_PREFIX;
      const keys = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) keys.push(key);
      }
      keys.forEach((key) => localStorage.removeItem(key));
    } catch (e) {}
  }

  /**
   * Normalize URL inputs for cache lookups and favicon service requests.
   */
  _normalizeLookupUrl(url) {
    const rawUrl = String(url || "").trim();
    if (!rawUrl) return null;

    try {
      // Keep template URLs parseable without changing non-template URLs.
      const parsedUrl = new URL(rawUrl.replace(/%s/g, "test"));
      return new URL(`${parsedUrl.origin}/`).href;
    } catch (e) {
      return null;
    }
  }

  /**
   * Local hosts, whose icons Google's service does not know.
   */
  static isLocalUrl(url) {
    const rawUrl = String(url || "").trim();
    if (!rawUrl) return false;

    try {
      const hostname = new URL(rawUrl.replace(/%s/g, "test")).hostname;
      return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname);
    } catch (e) {
      return false;
    }
  }

  /**
   * Chrome's own favicon cache, the only source that can serve a local host.
   */
  static getLocalFaviconUrl(url, size = 32) {
    if (!FaviconCacheManager.isLocalUrl(url)) return null;
    if (typeof chrome === "undefined" || !chrome?.runtime?.getURL) return null;

    // Chrome accepts 16 and 32 here only, so MAX_SIZE would be rejected.
    const iconSize = Number(size) === 16 ? 16 : 32;
    const pageUrl = encodeURIComponent(String(url).trim());

    return `${chrome.runtime.getURL("/_favicon/")}?pageUrl=${pageUrl}&size=${iconSize}`;
  }

  /**
   * The bundled icon shown when a fetch gives up. Returning the Google URL
   * instead made every render ask Google again for an icon it cannot serve.
   */
  static getFallbackIconUrl() {
    try {
      if (typeof chrome !== "undefined" && chrome?.runtime?.getURL) {
        return chrome.runtime.getURL("icons/icon32.png");
      }
    } catch (e) {}

    return "icons/icon32.png";
  }

  /**
   * Build favicon service URL using a normalized domain-base URL.
   */
  _getFaviconServiceUrl(url, size = 256) {
    // Local hosts must never reach Google, which only answers with a globe.
    if (FaviconCacheManager.isLocalUrl(url)) return null;

    const normalizedUrl = this._normalizeLookupUrl(url);
    if (!normalizedUrl) return null;

    return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(normalizedUrl)}&sz=${size}`;
  }

  /**
   * A stored record only counts when it holds an image, and a local host's
   * record only when the user set it.
   */
  _readCachedDataUrl(record, isLocal) {
    if (!record?.dataUrl) return null;
    if (isLocal && record.isCustom !== true) return null;
    return record.dataUrl;
  }

  /**
   * The raw stored record, failure markers included.
   */
  async _getRecord(key) {
    try {
      const db = await this._ensureDB();
      return new Promise((resolve) => {
        const transaction = db.transaction(
          FaviconCacheManager.STORE_NAME,
          "readonly",
        );
        const request = transaction
          .objectStore(FaviconCacheManager.STORE_NAME)
          .get(key);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  }

  /**
   * A failed fetch is remembered, so a dead icon is not retried every new tab.
   */
  async _isRecentFailure(key) {
    const record = await this._getRecord(key);
    return (
      record?.failure === true &&
      Date.now() - Number(record.timestamp || 0) <
        FaviconCacheManager.FAILURE_TTL_MS
    );
  }

  async _setFailure(url, type) {
    try {
      const db = await this._ensureDB();
      const key = this._getCacheKey(url, type);

      return new Promise((resolve) => {
        const transaction = db.transaction(
          FaviconCacheManager.STORE_NAME,
          "readwrite",
        );
        const store = transaction.objectStore(
          FaviconCacheManager.STORE_NAME,
        );
        const request = store.put({
          key,
          url,
          type,
          dataUrl: null,
          failure: true,
          timestamp: Date.now(),
        });

        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
    } catch (e) {
      return false;
    }
  }

  /**
   * Keep the store bounded. The oldest records go first; an icon the user
   * imported themselves is never dropped.
   */
  async _pruneToCap() {
    const db = await this._ensureDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(
        FaviconCacheManager.STORE_NAME,
        "readwrite",
      );
      const store = transaction.objectStore(FaviconCacheManager.STORE_NAME);
      // Counting is cheap; loading every stored base64 icon on each write is not.
      const countRequest = store.count();

      countRequest.onsuccess = () => {
        if (Number(countRequest.result) <= FaviconCacheManager.MAX_ENTRIES) {
          resolve(false);
          return;
        }

        const request = store.getAll();
        request.onsuccess = () => {
          const records = (request.result || []).filter(
            (record) => record?.isCustom !== true,
          );
          const excess = records.length - FaviconCacheManager.MAX_ENTRIES;
          if (excess <= 0) {
            resolve(false);
            return;
          }

          records
            .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
            .slice(0, excess)
            .forEach((record) => store.delete(record.key));
          resolve(true);
        };

        request.onerror = () => resolve(false);
      };

      countRequest.onerror = () => resolve(false);
    });
  }

  /**
   * Get cached favicon
   * @param {string} url - The URL to get favicon for
   * @param {string} type - Type of favicon ('pinned' or 'search')
   * @returns {Promise<string|null>} - Cached favicon URL string or null
   */
  async getCached(url, type = "pinned") {
    const key = this._getCacheKey(url, type);
    const isLocal = FaviconCacheManager.isLocalUrl(url);
    try {
      const db = await this._ensureDB();

      return new Promise((resolve) => {
        const transaction = db.transaction(
          FaviconCacheManager.STORE_NAME,
          "readonly",
        );
        const store = transaction.objectStore(FaviconCacheManager.STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => {
          resolve(
            this._readCachedDataUrl(request.result, isLocal) ||
              this._readCachedDataUrl(this._getLocalStorageCached(key), isLocal),
          );
        };

        request.onerror = () => {
          console.warn(
            "FaviconCache: Error getting cached favicon",
            request.error,
          );
          resolve(null);
        };
      });
    } catch (e) {
      console.warn("FaviconCache: getCached error", e);
      return this._readCachedDataUrl(this._getLocalStorageCached(key), isLocal);
    }
  }

  /**
   * Store favicon in cache
   * @param {string} url - The URL the favicon belongs to
   * @param {string} dataUrl - Base64 data URL of the favicon
   * @param {string} type - Type of favicon ('pinned' or 'search')
   * @param {boolean} isCustom - Whether this is a user-imported favicon
   */
  async setCached(url, dataUrl, type = "pinned", isCustom = false) {
    try {
      const db = await this._ensureDB();
      const key = this._getCacheKey(url, type);

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(
          FaviconCacheManager.STORE_NAME,
          "readwrite",
        );
        const store = transaction.objectStore(FaviconCacheManager.STORE_NAME);

        const record = {
          key,
          url,
          dataUrl,
          type,
          isCustom,
          timestamp: Date.now(),
        };

        this._setLocalStorageCached(key, record);
        const request = store.put(record);

        request.onsuccess = () => {
          resolve(true);
          // Opportunistic, after the write: the store must stay bounded.
          this._pruneToCap().catch(() => {});
        };
        request.onerror = () => {
          console.warn("FaviconCache: Error storing favicon", request.error);
          reject(request.error);
        };
      });
    } catch (e) {
      console.warn("FaviconCache: setCached error", e);
      return false;
    }
  }

  /**
   * Remove favicon from cache
   * @param {string} url - The URL to remove favicon for
   * @param {string} type - Type of favicon ('pinned' or 'search')
   */
  async removeCached(url, type = "pinned") {
    try {
      const db = await this._ensureDB();
      const key = this._getCacheKey(url, type);

      return new Promise((resolve) => {
        const transaction = db.transaction(
          FaviconCacheManager.STORE_NAME,
          "readwrite",
        );
        const store = transaction.objectStore(FaviconCacheManager.STORE_NAME);
        const request = store.delete(key);

        request.onsuccess = () => resolve(true);
        request.onerror = () => {
          console.warn("FaviconCache: Error removing favicon", request.error);
          resolve(false);
        };
      });
    } catch (e) {
      console.warn("FaviconCache: removeCached error", e);
      return false;
    }
  }

  /**
   * Check if favicon is custom (user-imported)
   */
  async isCustomFavicon(url, type = "pinned") {
    try {
      const db = await this._ensureDB();
      const key = this._getCacheKey(url, type);

      return new Promise((resolve) => {
        const transaction = db.transaction(
          FaviconCacheManager.STORE_NAME,
          "readonly",
        );
        const store = transaction.objectStore(FaviconCacheManager.STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result;
          resolve(result?.isCustom === true);
        };

        request.onerror = () => resolve(false);
      });
    } catch (e) {
      return false;
    }
  }

  /**
   * Fetch favicon from service URL and cache it
   * @param {string} url - The URL to fetch favicon for
   * @param {string} type - Type of favicon ('pinned' or 'search')
   * @param {boolean} forceRefresh - Force fetch even if cached
   * @returns {Promise<string|null>} - Data URL, or the local fallback icon
   */
  async fetchAndCache(url, type = "pinned", forceRefresh = false) {
    const cacheKey = this._getCacheKey(url, type);

    // Local hosts have nothing to download: Chrome already has the icon.
    if (FaviconCacheManager.isLocalUrl(url)) {
      const custom = await this.getCached(url, type);
      if (custom) return custom;

      // A globe cached before local hosts changed source must not win.
      await this.removeCached(url, type);
      return FaviconCacheManager.getLocalFaviconUrl(url);
    }

    const faviconUrl = this._getFaviconServiceUrl(url, 256);
    if (!faviconUrl) return null;

    // Check if already fetched this session (unless forcing refresh)
    if (!forceRefresh && this.sessionFetched.has(cacheKey)) {
      const cached = await this.getCached(url, type);
      if (cached) return cached;
    }

    // Check existing cache (unless forcing refresh)
    if (!forceRefresh) {
      const cached = await this.getCached(url, type);
      if (cached) {
        this.sessionFetched.add(cacheKey);
        return cached;
      }

      // A miss within the failure TTL is a cache hit of its own: no request.
      if (await this._isRecentFailure(cacheKey)) {
        return FaviconCacheManager.getFallbackIconUrl();
      }
    }

    try {
      const resp = await fetch(faviconUrl, {
        cache: forceRefresh ? "reload" : "force-cache",
      });
      if (resp.ok) {
        const blob = await resp.blob();
        if (blob && blob.size > 0) {
          const dataUrl = await this._blobToDataUrl(blob);
          await this.setCached(url, dataUrl, type, false);
          this.sessionFetched.add(cacheKey);
          return dataUrl;
        }
      }
    } catch (e) {
      // Fall through to the stored data URL, then the local fallback below.
    }

    const fallbackCached = await this.getCached(url, type);
    if (fallbackCached) return fallbackCached;

    // Remember the miss: a repeat tab shows the local icon without asking.
    await this._setFailure(url, type);

    this.sessionFetched.add(cacheKey);
    return FaviconCacheManager.getFallbackIconUrl();
  }

  /**
   * Display URL for a favicon: Chrome's cache for local hosts, Google otherwise.
   * @param {string} url - The URL to show a favicon for
   * @param {number} size - Service size hint
   * @returns {string|null} - Display-ready favicon URL
   */
  getDisplayUrl(url, size = 256) {
    return (
      FaviconCacheManager.getLocalFaviconUrl(url) ||
      this._getFaviconServiceUrl(url, size)
    );
  }

  /**
   * Get favicon URL - uses cache or returns service URL as fallback
   * @param {string} url - The URL to get favicon for
   * @param {string} type - Type of favicon ('pinned' or 'search')
   * @param {boolean} preferCached - If true, only return cached version
   * @returns {Promise<string>} - Data URL or service URL
   */
  async getFaviconUrl(url, type = "pinned", preferCached = true) {
    // Try to get cached version first
    const cached = await this.getCached(url, type);
    if (cached) {
      return cached;
    }

    // If preferCached is true, don't auto-fetch
    if (preferCached) {
      return this.getDisplayUrl(url, 256);
    }

    // Fetch and cache
    const fetched = await this.fetchAndCache(url, type, false);
    if (fetched) {
      return fetched;
    }

    return this.getDisplayUrl(url, 256);
  }

  /**
   * Process and import a user-provided image file
   * @param {File} file - The image file to import
   * @param {string} url - The URL to associate this favicon with
   * @param {string} type - Type of favicon ('pinned' or 'search')
   * @returns {Promise<string>} - Base64 data URL
   */
  async importFromFile(file, url, type = "pinned") {
    return new Promise((resolve, reject) => {
      // Validate file type
      const validTypes = [
        "image/png",
        "image/x-icon",
        "image/vnd.microsoft.icon",
        "image/ico",
        "image/jpeg",
        "image/gif",
        "image/webp",
        "image/svg+xml",
      ];

      // Also check file extension for .ico files that might have wrong MIME
      const extension = file.name.toLowerCase().split(".").pop();
      const isValidExtension = [
        "png",
        "ico",
        "jpg",
        "jpeg",
        "gif",
        "webp",
        "svg",
      ].includes(extension);

      if (!validTypes.includes(file.type) && !isValidExtension) {
        reject(
          new Error(
            "Invalid file type. Please use PNG, ICO, JPG, GIF, WebP, or SVG.",
          ),
        );
        return;
      }

      // Check file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        reject(new Error("File too large. Maximum size is 5MB."));
        return;
      }

      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const dataUrl = e.target.result;

          // Process (downscale if needed)
          const processedDataUrl = await this._processImage(dataUrl);

          // Cache with isCustom flag
          await this.setCached(url, processedDataUrl, type, true);

          resolve(processedDataUrl);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Import an image URL: the bytes are downloaded once and kept as a data URL,
   * so later tabs read the icon from the cache instead of the network. A failed
   * download keeps today's behaviour and stores the remote URL.
   * @param {string} imageUrl - HTTP(S) image URL
   * @param {string} url - The URL to associate this favicon with
   * @param {string} type - Type of favicon ('pinned' or 'search')
   * @returns {Promise<string>} - Data URL, or the remote URL when it cannot be read
   */
  async importFromImageUrl(imageUrl, url, type = "pinned") {
    const rawImageUrl = String(imageUrl || "").trim();
    if (!rawImageUrl) {
      throw new Error("Please provide an image URL.");
    }

    let normalizedUrl = rawImageUrl;
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    let parsedUrl = null;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch (e) {
      throw new Error("Please enter a valid image URL.");
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Only HTTP(S) image URLs are supported.");
    }

    const remoteUrl = parsedUrl.href;
    try {
      const resp = await fetch(remoteUrl, { cache: "force-cache" });
      if (resp.ok) {
        const blob = await resp.blob();
        if (blob && blob.size > 0) {
          const raw = await this._blobToDataUrl(blob);
          // Same downscale as a file import; unreadable images keep their bytes.
          const dataUrl = await this._processImage(raw).catch(() => raw);
          await this.setCached(url, dataUrl, type, true);
          return dataUrl;
        }
      }
    } catch (e) {
      // Fall through: the remote URL is still a usable icon link.
    }

    return remoteUrl;
  }

  /**
   * Convert Blob to Data URL
   */
  _blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to convert blob"));
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Process image with optional square normalization.
   * @param {string} dataUrl - Base64 data URL
   * @param {Object} options - Processing options
   * @returns {Promise<string>} - Processed base64 data URL
   */
  async _processImage(dataUrl, options = {}) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        try {
          const maxSize = Number.isFinite(Number(options.maxSize))
            ? Math.max(1, Number(options.maxSize))
            : FaviconCacheManager.MAX_SIZE;
          const forceSquare = options.forceSquare === true;

          const needsSquareCrop = forceSquare && img.width !== img.height;
          const needsDownscale = forceSquare
            ? Math.min(img.width, img.height) > maxSize
            : img.width > maxSize || img.height > maxSize;

          if (!needsSquareCrop && !needsDownscale) {
            resolve(dataUrl);
            return;
          }

          let sourceX = 0;
          let sourceY = 0;
          let sourceWidth = img.width;
          let sourceHeight = img.height;
          let outputWidth = img.width;
          let outputHeight = img.height;

          if (forceSquare) {
            const squareSize = Math.min(img.width, img.height);
            sourceX = Math.floor((img.width - squareSize) / 2);
            sourceY = Math.floor((img.height - squareSize) / 2);
            sourceWidth = squareSize;
            sourceHeight = squareSize;

            const targetSize = Math.min(squareSize, maxSize);
            outputWidth = targetSize;
            outputHeight = targetSize;
          } else {
            const ratio = Math.min(maxSize / img.width, maxSize / img.height);
            outputWidth = Math.max(1, Math.round(img.width * ratio));
            outputHeight = Math.max(1, Math.round(img.height * ratio));
          }

          const canvas = document.createElement("canvas");
          canvas.width = outputWidth;
          canvas.height = outputHeight;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          ctx.drawImage(
            img,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            outputWidth,
            outputHeight,
          );

          const result = canvas.toDataURL("image/png", 0.92);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      };

      img.onerror = () => {
        reject(new Error("Failed to load image for processing"));
      };

      img.src = dataUrl;
    });
  }

  /**
   * Refresh favicon, ignoring the cache. The name is historical: a local host
   * resolves through Chrome's own favicon cache and never contacts Google.
   * @param {string} url - The URL to refresh favicon for
   * @param {string} type - Type of favicon ('pinned' or 'search')
   * @returns {Promise<string|null>} - New favicon URL string or null
   */
  async refreshFromGoogle(url, type = "pinned") {
    return this.fetchAndCache(url, type, true);
  }

  /**
   * Clear all cached favicons
   */
  async clearAll() {
    try {
      const db = await this._ensureDB();

      return new Promise((resolve) => {
        const transaction = db.transaction(
          FaviconCacheManager.STORE_NAME,
          "readwrite",
        );
        const store = transaction.objectStore(FaviconCacheManager.STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          this.sessionFetched.clear();
          this._clearLocalStorageCache();
          resolve(true);
        };

        request.onerror = () => {
          console.warn("FaviconCache: Error clearing cache", request.error);
          resolve(false);
        };
      });
    } catch (e) {
      console.warn("FaviconCache: clearAll error", e);
      this._clearLocalStorageCache();
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      const db = await this._ensureDB();

      return new Promise((resolve) => {
        const transaction = db.transaction(
          FaviconCacheManager.STORE_NAME,
          "readonly",
        );
        const store = transaction.objectStore(FaviconCacheManager.STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const records = request.result || [];
          const stats = {
            total: records.length,
            pinned: records.filter((r) => r.type === "pinned").length,
            search: records.filter((r) => r.type === "search").length,
            custom: records.filter((r) => r.isCustom).length,
            totalSize: records.reduce(
              (sum, r) => sum + (r.dataUrl?.length || 0),
              0,
            ),
          };
          resolve(stats);
        };

        request.onerror = () =>
          resolve({ total: 0, pinned: 0, search: 0, custom: 0, totalSize: 0 });
      });
    } catch (e) {
      return { total: 0, pinned: 0, search: 0, custom: 0, totalSize: 0 };
    }
  }

  /**
   * Initialize favicons for all items (called on fresh start)
   * @param {Array} pinnedApps - Array of pinned app objects
   * @param {Array} customSearches - Array of custom search objects
   */
  async initializeAll(pinnedApps = [], customSearches = []) {
    const tasks = [];

    // Process pinned apps
    for (const app of pinnedApps) {
      if (app.url) {
        tasks.push(this.fetchAndCache(app.url, "pinned", false));
      }
    }

    // Process custom searches
    for (const search of customSearches) {
      if (search.url) {
        tasks.push(this.fetchAndCache(search.url, "search", false));
      }
    }

    // Execute all in parallel with a concurrency limit
    const concurrencyLimit = 5;
    for (let i = 0; i < tasks.length; i += concurrencyLimit) {
      const batch = tasks.slice(i, i + concurrencyLimit);
      await Promise.allSettled(batch);
    }
  }
}

// Export singleton instance
window.FaviconCacheManager = FaviconCacheManager;
window.faviconCache = new FaviconCacheManager();

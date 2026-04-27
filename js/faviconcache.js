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
   * Build favicon service URL using a normalized domain-base URL.
   */
  _getFaviconServiceUrl(url, size = 256) {
    const normalizedUrl = this._normalizeLookupUrl(url);
    if (!normalizedUrl) return null;

    return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(normalizedUrl)}&sz=${size}`;
  }

  /**
   * Get cached favicon
   * @param {string} url - The URL to get favicon for
   * @param {string} type - Type of favicon ('pinned' or 'search')
   * @returns {Promise<string|null>} - Cached favicon URL string or null
   */
  async getCached(url, type = "pinned") {
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
          if (result && result.dataUrl) {
            resolve(result.dataUrl);
          } else {
            resolve(null);
          }
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
      return null;
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

        const request = store.put(record);

        request.onsuccess = () => resolve(true);
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
   * @returns {Promise<string|null>} - Favicon URL string or null
   */
  async fetchAndCache(url, type = "pinned", forceRefresh = false) {
    const faviconUrl = this._getFaviconServiceUrl(url, 256);
    if (!faviconUrl) return null;

    const cacheKey = this._getCacheKey(url, type);

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
    }

    // Keep automatic favicons URL-based to avoid CORS fetch failures.
    await this.setCached(url, faviconUrl, type, false);
    this.sessionFetched.add(cacheKey);
    return faviconUrl;
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
      const faviconUrl = this._getFaviconServiceUrl(url, 256);
      if (faviconUrl) {
        return faviconUrl;
      }
      return null;
    }

    // Fetch and cache
    const fetched = await this.fetchAndCache(url, type, false);
    if (fetched) {
      return fetched;
    }

    // Fallback to service URL
    const faviconUrl = this._getFaviconServiceUrl(url, 256);
    if (faviconUrl) {
      return faviconUrl;
    }

    return null;
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
   * Normalize an imported image URL without downloading/caching it.
   * URL imports are stored as direct links.
   * @param {string} imageUrl - HTTP(S) image URL
   * @returns {Promise<string>} - Normalized URL string
   */
  async importFromImageUrl(imageUrl, _url, _type = "pinned") {
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

    return parsedUrl.href;
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
   * Refresh favicon from service URL (force re-fetch)
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
          resolve(true);
        };

        request.onerror = () => {
          console.warn("FaviconCache: Error clearing cache", request.error);
          resolve(false);
        };
      });
    } catch (e) {
      console.warn("FaviconCache: clearAll error", e);
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

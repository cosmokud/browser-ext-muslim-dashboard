/**
 * SettingsManager: background pool, thumbnails and custom media.
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

  normalizeBackgroundImageUrl(url) {
    return String(url || "").trim();
  }

  normalizeBackgroundImageImportUrl(url) {
    const raw = this.normalizeBackgroundImageUrl(url);
    if (!raw) return "";

    let normalized = raw;
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    }

    let parsed = null;
    try {
      parsed = new URL(normalized);
    } catch (e) {
      return "";
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }

    return parsed.href;
  }

  isRemoteBackgroundImageUrl(url) {
    const normalized = this.normalizeBackgroundImageUrl(url);
    return /^https?:\/\//i.test(normalized);
  }

  isValidCustomBackgroundReference(value) {
    const normalized = this.normalizeBackgroundImageUrl(value);
    if (!normalized) return false;

    return (
      this.isCustomBackgroundToken(normalized) ||
      normalized.startsWith("data:image") ||
      this.isRemoteBackgroundImageUrl(normalized)
    );
  }

  normalizeSolidColorHex(value) {
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

  isSolidColorBackgroundUrl(value) {
    const normalized = this.normalizeBackgroundImageUrl(value);
    return normalized.toLowerCase().startsWith(this._solidBackgroundUrlPrefix);
  }

  solidColorHexToBackgroundUrl(value) {
    const hex = this.normalizeSolidColorHex(value);
    if (!hex) return "";
    return `${this._solidBackgroundUrlPrefix}${hex}`;
  }

  solidColorBackgroundUrlToHex(value) {
    const normalized = this.normalizeBackgroundImageUrl(value);
    if (!this.isSolidColorBackgroundUrl(normalized)) {
      return "";
    }

    return this.normalizeSolidColorHex(
      normalized.slice(this._solidBackgroundUrlPrefix.length),
    );
  }

  normalizeBackgroundCategory(category) {
    const normalized = String(category || "").trim();
    if (!normalized) return "all";

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
    return SettingsRegistry.coerce("bgDim", parseInt(value, 10), fallback);
  }

  normalizeBackgroundBlur(value, fallback = 0) {
    return SettingsRegistry.coerce("bgBlur", parseInt(value, 10), fallback);
  }

  isCustomBackgroundToken(value) {
    const normalized = this.normalizeBackgroundImageUrl(value);
    const prefix = this._customBackgroundTokenPrefix || "mdcbg:id:";
    return normalized.startsWith(prefix) && normalized.length > prefix.length;
  }

  getCustomBackgroundTokenById(id) {
    const normalized = String(id || "").trim();
    if (!/^[a-z0-9_\-]+$/i.test(normalized)) return "";
    const prefix = this._customBackgroundTokenPrefix || "mdcbg:id:";
    return `${prefix}${normalized}`;
  }

  getCustomBackgroundIdFromToken(token) {
    const normalized = this.normalizeBackgroundImageUrl(token);
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

  customBackgroundTxDonePromise(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () =>
        reject(tx.error || new Error("IndexedDB transaction aborted"));
      tx.onerror = () =>
        reject(tx.error || new Error("IndexedDB transaction failed"));
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
          const store = db.createObjectStore(
            this._customBackgroundMediaStoreName,
            {
              keyPath: "id",
            },
          );
          store.createIndex("updatedAt", "updatedAt", { unique: false });
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

  getCustomBackgroundMediaId(imageDataUrl) {
    const normalized = this.normalizeBackgroundImageUrl(imageDataUrl);
    if (!normalized) return "";

    let hash = 2166136261;
    for (let i = 0; i < normalized.length; i += 1) {
      hash ^= normalized.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    const safeHash = Math.abs(hash >>> 0).toString(36);
    return `cbg_${safeHash}_${normalized.length.toString(36)}`;
  }

  async loadCustomBackgroundMediaFromIndexedDb({ force = false } = {}) {
    if (this._customBackgroundMediaLoaded && !force) {
      return this._customBackgroundThumbByImageUrl;
    }

    if (this._customBackgroundMediaLoadPromise && !force) {
      return this._customBackgroundMediaLoadPromise;
    }

    this._customBackgroundMediaLoadPromise = (async () => {
      if (force) {
        this._customBackgroundThumbByImageUrl.clear();
        this._customBackgroundImageByToken.clear();
      }

      const db = await this.openCustomBackgroundMediaDb();
      if (!db) {
        this._customBackgroundMediaLoaded = true;
        return this._customBackgroundThumbByImageUrl;
      }

      try {
        const tx = db.transaction(
          this._customBackgroundMediaStoreName,
          "readonly",
        );
        const store = tx.objectStore(this._customBackgroundMediaStoreName);
        const records = await this.customBackgroundDbRequestToPromise(
          store.getAll(),
        );

        this._customBackgroundThumbByImageUrl.clear();
        this._customBackgroundImageByToken.clear();
        (Array.isArray(records) ? records : []).forEach((record) => {
          const id = String(record?.id || "").trim();
          const token = this.getCustomBackgroundTokenById(id);
          const imageDataUrl = this.normalizeBackgroundImageUrl(
            record?.imageDataUrl,
          );
          const thumbnailDataUrl = this.normalizeBackgroundImageUrl(
            record?.thumbnailDataUrl,
          );

          if (
            !token ||
            !imageDataUrl ||
            !imageDataUrl.startsWith("data:image")
          ) {
            return;
          }

          const resolvedThumb =
            thumbnailDataUrl && thumbnailDataUrl.startsWith("data:image")
              ? thumbnailDataUrl
              : imageDataUrl;

          this._customBackgroundImageByToken.set(token, imageDataUrl);
          this._customBackgroundThumbByImageUrl.set(token, resolvedThumb);
          this._customBackgroundThumbByImageUrl.set(
            imageDataUrl,
            resolvedThumb,
          );
          this._backgroundThumbUrlCache?.set(token, resolvedThumb);
          this._backgroundThumbUrlCache?.set(imageDataUrl, resolvedThumb);
        });

        this._customBackgroundMediaLoaded = true;
      } catch (e) {
        // Ignore IndexedDB read failures and keep graceful fallback.
        this._customBackgroundMediaLoaded = true;
      }

      return this._customBackgroundThumbByImageUrl;
    })().finally(() => {
      this._customBackgroundMediaLoadPromise = null;
    });

    return this._customBackgroundMediaLoadPromise;
  }

  async saveCustomBackgroundMediaToIndexedDb(imageDataUrl, thumbnailDataUrl) {
    const normalizedImage = this.normalizeBackgroundImageUrl(imageDataUrl);
    if (!normalizedImage || !normalizedImage.startsWith("data:image")) {
      return "";
    }

    const normalizedThumb = this.normalizeBackgroundImageUrl(thumbnailDataUrl);
    const resolvedThumb =
      normalizedThumb && normalizedThumb.startsWith("data:image")
        ? normalizedThumb
        : normalizedImage;

    const db = await this.openCustomBackgroundMediaDb();
    const id = this.getCustomBackgroundMediaId(normalizedImage);
    const token = this.getCustomBackgroundTokenById(id);
    if (!id || !token) {
      return "";
    }

    if (!db) {
      this._customBackgroundImageByToken.set(token, normalizedImage);
      this._customBackgroundThumbByImageUrl.set(token, resolvedThumb);
      this._customBackgroundThumbByImageUrl.set(normalizedImage, resolvedThumb);
      this._backgroundThumbUrlCache?.set(token, resolvedThumb);
      this._backgroundThumbUrlCache?.set(normalizedImage, resolvedThumb);
      return token;
    }

    try {
      const tx = db.transaction(
        this._customBackgroundMediaStoreName,
        "readwrite",
      );
      const store = tx.objectStore(this._customBackgroundMediaStoreName);
      const existing = await this.customBackgroundDbRequestToPromise(
        store.get(id),
      ).catch(() => null);
      const now = Date.now();

      store.put({
        id,
        imageDataUrl: normalizedImage,
        thumbnailDataUrl: resolvedThumb,
        createdAt:
          Number.isFinite(existing?.createdAt) && existing.createdAt > 0
            ? existing.createdAt
            : now,
        updatedAt: now,
      });

      await this.customBackgroundTxDonePromise(tx);

      this._customBackgroundImageByToken.set(token, normalizedImage);
      this._customBackgroundThumbByImageUrl.set(token, resolvedThumb);
      this._customBackgroundThumbByImageUrl.set(normalizedImage, resolvedThumb);
      this._backgroundThumbUrlCache?.set(token, resolvedThumb);
      this._backgroundThumbUrlCache?.set(normalizedImage, resolvedThumb);
      return token;
    } catch (e) {
      this._customBackgroundImageByToken.set(token, normalizedImage);
      this._customBackgroundThumbByImageUrl.set(token, resolvedThumb);
      this._customBackgroundThumbByImageUrl.set(normalizedImage, resolvedThumb);
      this._backgroundThumbUrlCache?.set(token, resolvedThumb);
      this._backgroundThumbUrlCache?.set(normalizedImage, resolvedThumb);
      return token;
    }
  }

  async deleteCustomBackgroundMediaByToken(token) {
    const normalizedToken = this.normalizeBackgroundImageUrl(token);
    if (!this.isCustomBackgroundToken(normalizedToken)) {
      return false;
    }

    const mediaId = this.getCustomBackgroundIdFromToken(normalizedToken);
    const mappedImage = this.normalizeBackgroundImageUrl(
      this._customBackgroundImageByToken?.get(normalizedToken),
    );
    const mappedThumb = this.normalizeBackgroundImageUrl(
      this._customBackgroundThumbByImageUrl?.get(normalizedToken),
    );

    this._customBackgroundImageByToken?.delete(normalizedToken);
    this._customBackgroundThumbByImageUrl?.delete(normalizedToken);
    this._backgroundThumbUrlCache?.delete(normalizedToken);

    if (mappedImage) {
      this._customBackgroundThumbByImageUrl?.delete(mappedImage);
      this._backgroundThumbUrlCache?.delete(mappedImage);
    }

    if (mappedThumb) {
      this._backgroundThumbUrlCache?.delete(mappedThumb);
    }

    if (!mediaId) {
      return true;
    }

    const db = await this.openCustomBackgroundMediaDb();
    if (!db) {
      return true;
    }

    try {
      const tx = db.transaction(
        this._customBackgroundMediaStoreName,
        "readwrite",
      );
      const store = tx.objectStore(this._customBackgroundMediaStoreName);
      store.delete(mediaId);
      await this.customBackgroundTxDonePromise(tx);
      return true;
    } catch (e) {
      return false;
    }
  }

  async clearCustomBackgroundMediaIndexedDb() {
    this._customBackgroundThumbByImageUrl.clear();
    this._customBackgroundImageByToken.clear();

    const db = await this.openCustomBackgroundMediaDb();
    if (!db) return;

    try {
      const tx = db.transaction(
        this._customBackgroundMediaStoreName,
        "readwrite",
      );
      const store = tx.objectStore(this._customBackgroundMediaStoreName);
      store.clear();
      await this.customBackgroundTxDonePromise(tx);
    } catch (e) {
      // ignore clear failures
    }
  }

  async buildCustomBackgroundThumbnailDataUrl(imageDataUrl) {
    const normalized = this.normalizeBackgroundImageUrl(imageDataUrl);
    if (!normalized || !normalized.startsWith("data:image")) {
      return "";
    }

    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        try {
          const targetWidth = 320;
          const targetHeight = 200;
          const srcWidth = img.naturalWidth || img.width || targetWidth;
          const srcHeight = img.naturalHeight || img.height || targetHeight;

          const scale = Math.max(
            targetWidth / srcWidth,
            targetHeight / srcHeight,
          );
          const drawWidth = srcWidth * scale;
          const drawHeight = srcHeight * scale;
          const offsetX = Math.round((targetWidth - drawWidth) / 2);
          const offsetY = Math.round((targetHeight - drawHeight) / 2);

          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(normalized);
            return;
          }

          ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
          const thumbDataUrl = canvas.toDataURL("image/jpeg", 0.78);
          resolve(this.normalizeBackgroundImageUrl(thumbDataUrl) || normalized);
        } catch (e) {
          resolve(normalized);
        }
      };

      img.onerror = () => resolve(normalized);
      img.src = normalized;
    });
  }

  async syncCustomBackgroundMediaFromSettings(settings = null) {
    if (this._customBackgroundMediaSyncPromise) {
      return this._customBackgroundMediaSyncPromise;
    }

    const resolvedSettings =
      settings && typeof settings === "object"
        ? settings
        : this.storage.getSettings();

    this._customBackgroundMediaSyncPromise = (async () => {
      await this.loadCustomBackgroundMediaFromIndexedDb();

      const rawEntries = Array.isArray(resolvedSettings?.customBackgrounds)
        ? resolvedSettings.customBackgrounds
        : [];
      const replacementMap = new Map();
      const normalizedRefs = [];
      const seenRefs = new Set();

      for (const entry of rawEntries) {
        const normalizedEntry = this.normalizeBackgroundImageUrl(entry);
        if (!normalizedEntry) continue;

        if (this.isCustomBackgroundToken(normalizedEntry)) {
          if (seenRefs.has(normalizedEntry)) continue;
          seenRefs.add(normalizedEntry);
          normalizedRefs.push(normalizedEntry);
          continue;
        }

        if (this.isRemoteBackgroundImageUrl(normalizedEntry)) {
          if (seenRefs.has(normalizedEntry)) continue;
          seenRefs.add(normalizedEntry);
          normalizedRefs.push(normalizedEntry);
          continue;
        }

        if (!normalizedEntry.startsWith("data:image")) {
          continue;
        }

        const thumbnailDataUrl =
          await this.buildCustomBackgroundThumbnailDataUrl(normalizedEntry);
        const token = await this.saveCustomBackgroundMediaToIndexedDb(
          normalizedEntry,
          thumbnailDataUrl,
        );
        if (!token) continue;

        replacementMap.set(normalizedEntry, token);
        if (seenRefs.has(token)) continue;
        seenRefs.add(token);
        normalizedRefs.push(token);
      }

      const cappedRefs = normalizedRefs.slice(
        0,
        SettingsManager.CUSTOM_BACKGROUND_LIMIT,
      );

      const currentRefs = rawEntries
        .map((entry) => this.normalizeBackgroundImageUrl(entry))
        .filter(Boolean);

      const refsChanged =
        currentRefs.length !== cappedRefs.length ||
        currentRefs.some((value, index) => value !== cappedRefs[index]);

      let settingsChanged = false;
      if (refsChanged) {
        resolvedSettings.customBackgrounds = cappedRefs;
        settingsChanged = true;
      }

      const validCustomRefSet = new Set(cappedRefs);
      const selectionMap =
        this.getBackgroundImageSelectionMap(resolvedSettings);
      let selectionChanged = false;

      Object.keys(selectionMap).forEach((category) => {
        const urls = Array.isArray(selectionMap[category])
          ? selectionMap[category]
          : [];

        const nextUrls = [];
        const seenUrls = new Set();

        urls.forEach((entry) => {
          const normalizedUrl = this.normalizeBackgroundImageUrl(entry);
          if (!normalizedUrl) {
            selectionChanged = true;
            return;
          }

          const replaced = replacementMap.get(normalizedUrl) || normalizedUrl;
          if (
            this.isCustomBackgroundToken(replaced) &&
            !validCustomRefSet.has(replaced)
          ) {
            selectionChanged = true;
            return;
          }

          if (seenUrls.has(replaced)) {
            selectionChanged = true;
            return;
          }

          if (replaced !== normalizedUrl) {
            selectionChanged = true;
          }

          seenUrls.add(replaced);
          nextUrls.push(replaced);
        });

        if (
          nextUrls.length !== urls.length ||
          nextUrls.some((value, index) => value !== urls[index])
        ) {
          selectionMap[category] = nextUrls;
          selectionChanged = true;
        }
      });

      if (selectionChanged) {
        resolvedSettings.backgroundImageSelections = selectionMap;
        settingsChanged = true;
      }

      if (settingsChanged) {
        this.storage.saveSettings(resolvedSettings);
      }

      this.applyCustomBackgroundThumbsToRenderedPool();
    })().finally(() => {
      this._customBackgroundMediaSyncPromise = null;
    });

    return this._customBackgroundMediaSyncPromise;
  }

  getBackgroundThumbnailPlaceholder() {
    return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
  }

  getBackgroundThumbnailUrl(imageUrl) {
    const normalized = this.normalizeBackgroundImageUrl(imageUrl);
    if (!normalized) {
      return this.getBackgroundThumbnailPlaceholder();
    }

    const customThumbFromMap = this.normalizeBackgroundImageUrl(
      this._customBackgroundThumbByImageUrl?.get(normalized),
    );

    const cached = this._backgroundThumbUrlCache?.get(normalized);
    if (cached) {
      if (
        !/^https?:\/\//i.test(normalized) &&
        customThumbFromMap &&
        cached !== customThumbFromMap
      ) {
        this._backgroundThumbUrlCache.set(normalized, customThumbFromMap);
        return customThumbFromMap;
      }
      return cached;
    }

    let thumbUrl = normalized;
    if (!/^https?:\/\//i.test(normalized)) {
      thumbUrl = customThumbFromMap || normalized;
      if (this.isCustomBackgroundToken(normalized) && !customThumbFromMap) {
        thumbUrl = this.getBackgroundThumbnailPlaceholder();
      }
    }

    if (/^https?:\/\//i.test(normalized)) {
      try {
        const parsed = new URL(normalized);
        if (/(^|\.)images\.unsplash\.com$/i.test(parsed.hostname)) {
          parsed.searchParams.set("auto", "format");
          parsed.searchParams.set("fit", "crop");
          parsed.searchParams.set("crop", "entropy");
          parsed.searchParams.set("w", "320");
          parsed.searchParams.set("h", "200");
          parsed.searchParams.set("q", "45");
          thumbUrl = parsed.toString();
        }
      } catch (e) {
        thumbUrl = normalized;
      }
    }

    if (this._backgroundThumbUrlCache) {
      this._backgroundThumbUrlCache.set(normalized, thumbUrl);
    }

    return thumbUrl;
  }

  isBackgroundThumbCacheAvailable() {
    return (
      typeof window !== "undefined" &&
      typeof window.caches !== "undefined" &&
      typeof window.fetch === "function"
    );
  }

  isBackgroundThumbRemoteUrl(url) {
    return /^https?:\/\//i.test(String(url || ""));
  }

  async openBackgroundThumbCache() {
    if (!this.isBackgroundThumbCacheAvailable()) {
      return null;
    }

    try {
      return await window.caches.open(this._backgroundThumbCacheName);
    } catch (e) {
      return null;
    }
  }

  async pruneBackgroundThumbCache(cache) {
    if (!cache) return;

    try {
      const keys = await cache.keys();
      const maxEntries = this._backgroundThumbCacheMaxEntries || 220;
      if (keys.length <= maxEntries) return;

      const excess = keys.length - maxEntries;
      for (let i = 0; i < excess; i += 1) {
        await cache.delete(keys[i]);
      }
    } catch (e) {
      // ignore cache pruning errors
    }
  }

  revokeBackgroundThumbBlobUrl(url) {
    if (!url || typeof url !== "string") return;
    if (!url.startsWith("blob:")) return;

    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      // ignore
    }
  }

  enforceBackgroundThumbBlobUrlLimit() {
    const cache = this._backgroundThumbBlobUrlCache;
    if (!(cache instanceof Map)) return;

    const maxEntries = this._backgroundThumbBlobUrlMaxEntries || 140;
    while (cache.size > maxEntries) {
      const oldestKey = cache.keys().next().value;
      const oldestValue = cache.get(oldestKey);
      cache.delete(oldestKey);
      this.revokeBackgroundThumbBlobUrl(oldestValue);
    }
  }

  clearBackgroundThumbBlobUrlCache() {
    if (this._backgroundThumbBlobUrlCache instanceof Map) {
      this._backgroundThumbBlobUrlCache.forEach((blobUrl) => {
        this.revokeBackgroundThumbBlobUrl(blobUrl);
      });
      this._backgroundThumbBlobUrlCache.clear();
    }

    if (this._backgroundThumbPendingLoads instanceof Map) {
      this._backgroundThumbPendingLoads.clear();
    }
  }

  async resolveBackgroundThumbSrc(thumbSrc) {
    const normalized = this.normalizeBackgroundImageUrl(thumbSrc);
    if (!normalized) {
      return this.getBackgroundThumbnailPlaceholder();
    }

    if (!this.isBackgroundThumbRemoteUrl(normalized)) {
      const customThumb = this.normalizeBackgroundImageUrl(
        this._customBackgroundThumbByImageUrl?.get(normalized),
      );
      if (customThumb) {
        return customThumb;
      }
      if (this.isCustomBackgroundToken(normalized)) {
        return this.getBackgroundThumbnailPlaceholder();
      }
      return normalized;
    }

    const existingBlobUrl = this._backgroundThumbBlobUrlCache?.get(normalized);
    if (existingBlobUrl) {
      return existingBlobUrl;
    }

    const pending = this._backgroundThumbPendingLoads?.get(normalized);
    if (pending) {
      return pending;
    }

    const loadPromise = (async () => {
      const cache = await this.openBackgroundThumbCache();
      if (!cache) {
        return normalized;
      }

      const request = new Request(normalized, {
        mode: "cors",
        credentials: "omit",
      });

      let response = null;
      try {
        response = await cache.match(request);
      } catch (e) {
        response = null;
      }

      if (!response) {
        try {
          response = await fetch(request, { cache: "force-cache" });
          if (response && (response.ok || response.type === "opaque")) {
            try {
              await cache.put(request, response.clone());
              void this.pruneBackgroundThumbCache(cache);
            } catch (e) {
              // ignore cache write failures
            }
          }
        } catch (e) {
          response = null;
        }
      }

      if (!response || response.type === "opaque" || !response.ok) {
        return normalized;
      }

      let blob;
      try {
        blob = await response.blob();
      } catch (e) {
        return normalized;
      }

      if (!blob || blob.size <= 0) {
        return normalized;
      }

      const blobUrl = URL.createObjectURL(blob);
      this._backgroundThumbBlobUrlCache.set(normalized, blobUrl);
      this.enforceBackgroundThumbBlobUrlLimit();
      return blobUrl;
    })()
      .catch(() => normalized)
      .finally(() => {
        this._backgroundThumbPendingLoads?.delete(normalized);
      });

    this._backgroundThumbPendingLoads?.set(normalized, loadPromise);
    return loadPromise;
  }

  loadBackgroundThumbImage(imgEl) {
    if (!(imgEl instanceof HTMLImageElement)) {
      return;
    }

    const thumbSrc = this.normalizeBackgroundImageUrl(imgEl.dataset.thumbSrc);
    if (!thumbSrc || imgEl.dataset.thumbLoaded === "1") {
      return;
    }

    imgEl.dataset.thumbLoaded = "pending";
    void this.resolveBackgroundThumbSrc(thumbSrc)
      .then((resolvedSrc) => {
        if (!imgEl.isConnected) {
          return;
        }

        imgEl.src = resolvedSrc;
        imgEl.dataset.thumbLoaded = "1";
      })
      .catch(() => {
        if (!imgEl.isConnected) return;
        imgEl.src = thumbSrc;
        imgEl.dataset.thumbLoaded = "1";
      });
  }

  applyCustomBackgroundThumbsToRenderedPool() {
    if (!this.customBgList) return;

    const thumbs = this.customBgList.querySelectorAll(
      "img.custom-bg-thumb[data-bg-source-url]",
    );
    thumbs.forEach((thumbEl) => {
      if (!(thumbEl instanceof HTMLImageElement)) return;

      const sourceUrl = this.normalizeBackgroundImageUrl(
        thumbEl.dataset.bgSourceUrl,
      );
      if (!sourceUrl || /^https?:\/\//i.test(sourceUrl)) {
        return;
      }

      const customThumb = this.normalizeBackgroundImageUrl(
        this._customBackgroundThumbByImageUrl?.get(sourceUrl),
      );
      if (!customThumb) return;

      thumbEl.dataset.thumbSrc = customThumb;
      thumbEl.dataset.thumbLoaded = "";
      this.loadBackgroundThumbImage(thumbEl);
    });
  }

  resetBackgroundThumbObserver() {
    if (this._backgroundThumbObserver) {
      this._backgroundThumbObserver.disconnect();
      this._backgroundThumbObserver = null;
    }
  }

  ensureBackgroundThumbObserver() {
    if (this._backgroundThumbObserver) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    this._backgroundThumbObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const img = entry.target;
          this.loadBackgroundThumbImage(img);

          observer.unobserve(img);
        });
      },
      {
        root: this.customBgList || null,
        rootMargin: "120px 0px",
        threshold: 0.01,
      },
    );
  }

  observeBackgroundThumbImage(imgEl) {
    if (!(imgEl instanceof HTMLImageElement)) {
      return;
    }

    this.ensureBackgroundThumbObserver();
    if (this._backgroundThumbObserver) {
      this._backgroundThumbObserver.observe(imgEl);
      return;
    }

    this.loadBackgroundThumbImage(imgEl);
  }

  getBackgroundImageSelectionMap(settings = null) {
    const resolvedSettings =
      settings && typeof settings === "object"
        ? settings
        : this.storage.getSettings();

    const rawMap = resolvedSettings.backgroundImageSelections;
    if (!rawMap || typeof rawMap !== "object" || Array.isArray(rawMap)) {
      return {};
    }

    const normalizedMap = {};
    Object.entries(rawMap).forEach(([category, urls]) => {
      if (!Array.isArray(urls)) return;
      const normalizedCategory = this.normalizeBackgroundCategory(category);

      const dedupedUrls = [];
      const seen = new Set();
      urls.forEach((value) => {
        const normalizedUrl = this.normalizeBackgroundImageUrl(value);
        if (!normalizedUrl || seen.has(normalizedUrl)) return;
        seen.add(normalizedUrl);
        dedupedUrls.push(normalizedUrl);
      });

      const existing = Array.isArray(normalizedMap[normalizedCategory])
        ? normalizedMap[normalizedCategory]
        : [];
      const merged = [];
      const mergedSeen = new Set();
      [...existing, ...dedupedUrls].forEach((url) => {
        if (mergedSeen.has(url)) return;
        mergedSeen.add(url);
        merged.push(url);
      });

      normalizedMap[normalizedCategory] = merged;
    });

    return normalizedMap;
  }

  getAllBackgroundImagesForCategory(category, settings) {
    if (!this.backgrounds) return [];

    if (typeof this.backgrounds.getAllImagesForCategory === "function") {
      return this.backgrounds.getAllImagesForCategory(category, settings);
    }

    if (typeof this.backgrounds.getImagesForCategory === "function") {
      return this.backgrounds.getImagesForCategory(category, settings);
    }

    return [];
  }

  updateBackgroundPoolAddButtonVisibility() {
    const selectedCategory = this.normalizeBackgroundCategory(
      this.bgCategory?.value || "all",
    );

    if (!this.addCustomBgBtn && !this.addCustomBgUrlBtn) {
      this.updateBackgroundPoolModeUi(selectedCategory);
      return;
    }

    const displayValue = selectedCategory === "custom" ? "inline-flex" : "none";
    if (this.addCustomBgBtn) {
      this.addCustomBgBtn.style.display = displayValue;
    }
    if (this.addCustomBgUrlBtn) {
      this.addCustomBgUrlBtn.style.display = displayValue;
    }

    this.updateBackgroundPoolModeUi(selectedCategory);
  }

  updateBackgroundPoolModeUi(category = null) {
    const selectedCategory = this.normalizeBackgroundCategory(
      category || this.bgCategory?.value || "all",
    );
    const isSolid = selectedCategory === "solid";

    if (this.backgroundPoolLabel) {
      this.backgroundPoolLabel.textContent = isSolid
        ? "Solid Color Pool"
        : "Background Image Pool";
    }

    if (this.backgroundPoolHint) {
      this.backgroundPoolHint.textContent = isSolid
        ? "Select which colors are included when the background rotates or refreshes."
        : "Select which images are included when the background rotates or refreshes.";
    }

    if (this.solidColorControls) {
      this.solidColorControls.hidden = !isSolid;
      this.solidColorControls.style.display = isSolid ? "grid" : "none";
    }

    if (isSolid && this.solidColorPicker && this.solidColorHexInput) {
      const pickerValue = this.normalizeSolidColorHex(
        this.solidColorPicker.value || this.solidColorHexInput.value,
      );
      if (pickerValue) {
        this.solidColorPicker.value = pickerValue;
        this.solidColorHexInput.value = pickerValue;
      }
    }
  }

  ensureBackgroundCategorySelectionInitialized(category, allImages, settings) {
    const normalizedCategory = this.normalizeBackgroundCategory(category);
    const resolvedSettings =
      settings && typeof settings === "object"
        ? settings
        : this.storage.getSettings();

    const selectionMap = this.getBackgroundImageSelectionMap(resolvedSettings);
    if (
      Object.prototype.hasOwnProperty.call(selectionMap, normalizedCategory)
    ) {
      return selectionMap[normalizedCategory];
    }

    const allUrls = allImages
      .map((image) => this.normalizeBackgroundImageUrl(image.url))
      .filter(Boolean);

    selectionMap[normalizedCategory] = allUrls;
    resolvedSettings.backgroundImageSelections = selectionMap;
    this.storage.saveSettings(resolvedSettings);
    return allUrls;
  }

  saveBackgroundSelectionForCategory(category, selectedUrls, settings = null) {
    if (!category) return;
    const normalizedCategory = this.normalizeBackgroundCategory(category);

    const resolvedSettings =
      settings && typeof settings === "object"
        ? settings
        : this.storage.getSettings();
    const selectionMap = this.getBackgroundImageSelectionMap(resolvedSettings);

    const dedupedUrls = [];
    const seen = new Set();
    selectedUrls.forEach((value) => {
      const normalizedUrl = this.normalizeBackgroundImageUrl(value);
      if (!normalizedUrl || seen.has(normalizedUrl)) return;
      seen.add(normalizedUrl);
      dedupedUrls.push(normalizedUrl);
    });

    selectionMap[normalizedCategory] = dedupedUrls;
    resolvedSettings.backgroundImageSelections = selectionMap;
    this.storage.saveSettings(resolvedSettings);
  }

  updateBackgroundPoolCount(selectedCount, totalCount) {
    if (this.customBgCount) {
      this.customBgCount.textContent = `${selectedCount}/${totalCount} selected`;
    }

    if (this.selectAllBgPoolBtn) {
      this.selectAllBgPoolBtn.disabled =
        totalCount === 0 || selectedCount === totalCount;
    }

    if (this.deselectAllBgPoolBtn) {
      this.deselectAllBgPoolBtn.disabled =
        totalCount === 0 || selectedCount === 0;
    }
  }

  applyBackgroundPoolSelectionToRenderedItems(selectedSet) {
    if (!(selectedSet instanceof Set)) {
      return;
    }

    const items = this.customBgList?.querySelectorAll(".custom-bg-item") || [];
    let selectedCount = 0;

    items.forEach((item, index) => {
      const url = this.normalizeBackgroundImageUrl(
        this._activeBgPoolImages?.[index]?.url,
      );
      const isSelected = Boolean(url) && selectedSet.has(url);
      if (isSelected) {
        selectedCount += 1;
      }

      item.classList.toggle("is-selected", isSelected);
      item.setAttribute("aria-pressed", isSelected ? "true" : "false");
    });

    this.updateBackgroundPoolCount(
      selectedCount,
      this._activeBgPoolImages.length,
    );
  }

  renderBackgroundImagePool() {
    if (!this.customBgList) return;

    this.resetBackgroundThumbObserver();

    const settings = this.storage.getSettings();
    const selectedCategory = this.normalizeBackgroundCategory(
      this.bgCategory?.value || settings.bgCategory || "all",
    );
    this.updateBackgroundPoolModeUi(selectedCategory);

    const rawImages = this.getAllBackgroundImagesForCategory(
      selectedCategory,
      settings,
    );

    const images = (Array.isArray(rawImages) ? rawImages : [])
      .map((entry) => {
        if (
          this.backgrounds &&
          typeof this.backgrounds.normalizeImage === "function"
        ) {
          const normalized = this.backgrounds.normalizeImage(entry);
          return {
            ...normalized,
            isCustomSolid:
              Boolean(entry?.isCustomSolid) ||
              Boolean(normalized?.isCustomSolid),
          };
        }

        if (typeof entry === "string") {
          return { url: entry, credit: "", href: "", isCustomSolid: false };
        }

        return {
          url: entry?.url || "",
          credit: entry?.credit || "",
          href: entry?.href || "",
          isCustomSolid: entry?.isCustomSolid === true,
        };
      })
      .map((entry) => ({
        ...entry,
        url: this.normalizeBackgroundImageUrl(entry.url),
        isCustomSolid: entry?.isCustomSolid === true,
      }))
      .filter((entry) => Boolean(entry.url));

    const solidCustomTemplateSet = new Set(
      selectedCategory === "solid" &&
        Array.isArray(settings.solidColorTemplates)
        ? settings.solidColorTemplates
            .map((entry) => this.normalizeSolidColorHex(entry))
            .filter(Boolean)
        : [],
    );

    this._activeBgPoolCategory = selectedCategory;
    this._activeBgPoolImages = images;

    if (images.length === 0) {
      const emptyHint = document.createElement("p");
      emptyHint.className = "empty-hint";
      emptyHint.textContent =
        selectedCategory === "custom"
          ? "No custom backgrounds yet. Use Import or URL to create your pool."
          : selectedCategory === "solid"
            ? "No solid colors available yet. Add one with the color selector."
            : "No backgrounds available for this category.";
      this.customBgList.replaceChildren(emptyHint);
      this.updateBackgroundPoolCount(0, 0);
      return;
    }

    const selectedUrls = this.ensureBackgroundCategorySelectionInitialized(
      selectedCategory,
      images,
      settings,
    );
    const selectedSet = new Set(selectedUrls);

    const fragment = document.createDocumentFragment();
    const thumbsToObserve = [];
    let selectedCount = 0;

    images.forEach((entry, index) => {
      const isSelected = selectedSet.has(entry.url);
      if (isSelected) selectedCount += 1;

      const item = document.createElement("button");
      item.type = "button";
      item.className = `custom-bg-item${isSelected ? " is-selected" : ""}`;
      item.dataset.index = String(index);
      item.setAttribute("aria-pressed", isSelected ? "true" : "false");

      let thumb = null;
      let solidHex = "";
      let isCustomSolidTemplate = false;
      if (selectedCategory === "solid") {
        solidHex = this.solidColorBackgroundUrlToHex(entry.url) || "#000000";
        isCustomSolidTemplate =
          entry?.isCustomSolid === true || solidCustomTemplateSet.has(solidHex);
        const swatch = document.createElement("span");
        swatch.className = "custom-bg-color-swatch";
        swatch.style.background = solidHex;

        const code = document.createElement("span");
        code.className = "custom-bg-color-code";
        code.textContent = solidHex;
        code.setAttribute("aria-hidden", "true");

        item.setAttribute("aria-label", `Solid color ${solidHex}`);
        item.appendChild(swatch);
        item.appendChild(code);
      } else {
        thumb = document.createElement("img");
        thumb.src = this.getBackgroundThumbnailPlaceholder();
        thumb.dataset.thumbSrc = this.getBackgroundThumbnailUrl(entry.url);
        thumb.dataset.bgSourceUrl = entry.url;
        thumb.alt = `Background ${index + 1}`;
        thumb.className = "custom-bg-thumb";
        thumb.loading = "lazy";
        thumb.decoding = "async";
        thumb.fetchPriority = "low";
        thumbsToObserve.push(thumb);
      }

      const check = document.createElement("span");
      check.className = "custom-bg-item-check";
      check.textContent = "✓";
      check.setAttribute("aria-hidden", "true");

      const canDeleteCustomBg = selectedCategory === "custom";
      const canDeleteCustomSolid =
        selectedCategory === "solid" && isCustomSolidTemplate;

      if (canDeleteCustomBg || canDeleteCustomSolid) {
        const deleteBtn = document.createElement("span");
        deleteBtn.className = "custom-bg-item-delete";
        deleteBtn.innerHTML = this._getIcon("🗑️", {
          size: 14,
          inline: true,
        });
        deleteBtn.setAttribute("role", "button");
        deleteBtn.setAttribute("tabindex", "0");
        deleteBtn.setAttribute(
          "title",
          canDeleteCustomSolid
            ? "Remove custom solid color"
            : "Remove from custom backgrounds",
        );
        deleteBtn.setAttribute(
          "aria-label",
          canDeleteCustomSolid
            ? `Remove custom solid color ${solidHex || index + 1}`
            : `Remove custom background ${index + 1}`,
        );

        const deleteHandler = (event) => {
          event.preventDefault();
          event.stopPropagation();
          void (async () => {
            const confirmed = await this.openConfirmModal({
              icon: "🗑️",
              title: canDeleteCustomSolid
                ? "Remove Custom Solid Color?"
                : "Remove Background?",
              text: canDeleteCustomSolid
                ? "This custom solid color will be removed from your palette."
                : "This background will be removed from your custom pool.",
              hint: "You can import it again anytime.",
              confirmLabel: "Remove",
              cancelLabel: "Keep",
            });

            if (!confirmed) return;
            if (canDeleteCustomSolid) {
              await this.removeSolidColorTemplate(entry.url);
              return;
            }

            await this.removeCustomBackgroundFromPool(entry.url);
          })();
        };

        deleteBtn.addEventListener("click", deleteHandler);
        deleteBtn.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            deleteHandler(event);
          }
        });

        item.appendChild(deleteBtn);
      }

      if (thumb) {
        item.appendChild(thumb);
      }
      item.appendChild(check);
      item.addEventListener("click", () => {
        this.toggleBackgroundPoolImageSelection(index);
      });

      fragment.appendChild(item);
    });

    this.customBgList.replaceChildren(fragment);
    if (selectedCategory !== "solid") {
      thumbsToObserve.forEach((thumb) => {
        this.observeBackgroundThumbImage(thumb);
      });
      this.applyCustomBackgroundThumbsToRenderedPool();
    }
    this.updateBackgroundPoolCount(selectedCount, images.length);
  }

  toggleBackgroundPoolImageSelection(index) {
    const category = this.normalizeBackgroundCategory(
      this._activeBgPoolCategory || this.bgCategory?.value || "all",
    );
    const entry = this._activeBgPoolImages?.[index];
    const imageUrl = this.normalizeBackgroundImageUrl(entry?.url);
    if (!imageUrl) return;

    const settings = this.storage.getSettings();
    const selectionMap = this.getBackgroundImageSelectionMap(settings);
    const currentSelection = Object.prototype.hasOwnProperty.call(
      selectionMap,
      category,
    )
      ? selectionMap[category]
      : this._activeBgPoolImages
          .map((image) => this.normalizeBackgroundImageUrl(image.url))
          .filter(Boolean);

    const selectedSet = new Set(currentSelection);
    if (selectedSet.has(imageUrl)) selectedSet.delete(imageUrl);
    else selectedSet.add(imageUrl);

    this.saveBackgroundSelectionForCategory(
      category,
      Array.from(selectedSet),
      settings,
    );
    this.applyBackgroundPoolSelectionToRenderedItems(selectedSet);
    this._backgroundSettingsDirty = true;
  }

  selectAllBackgroundPoolImages() {
    const category = this.normalizeBackgroundCategory(
      this._activeBgPoolCategory || this.bgCategory?.value || "all",
    );
    const urls = this._activeBgPoolImages
      .map((image) => this.normalizeBackgroundImageUrl(image.url))
      .filter(Boolean);
    this.saveBackgroundSelectionForCategory(category, urls);
    this.applyBackgroundPoolSelectionToRenderedItems(new Set(urls));
    this._backgroundSettingsDirty = true;
  }

  deselectAllBackgroundPoolImages() {
    const category = this.normalizeBackgroundCategory(
      this._activeBgPoolCategory || this.bgCategory?.value || "all",
    );
    this.saveBackgroundSelectionForCategory(category, []);
    this.applyBackgroundPoolSelectionToRenderedItems(new Set());
    this._backgroundSettingsDirty = true;
  }

  async addSolidColorTemplate(rawColor) {
    const solidHex = this.normalizeSolidColorHex(rawColor);
    if (!solidHex) {
      this.showToast("Please enter a valid hex color.", "error");
      return false;
    }

    const solidUrl = this.solidColorHexToBackgroundUrl(solidHex);
    if (!solidUrl) {
      this.showToast("Failed to build solid color template.", "error");
      return false;
    }

    const settings = this.storage.getSettings();

    const customTemplates = Array.isArray(settings.solidColorTemplates)
      ? settings.solidColorTemplates
          .map((entry) => this.normalizeSolidColorHex(entry))
          .filter(Boolean)
      : [];

    if (!customTemplates.includes(solidHex)) {
      customTemplates.push(solidHex);
    }
    settings.solidColorTemplates = customTemplates;

    const selectionMap = this.getBackgroundImageSelectionMap(settings);
    const solidSelection = Array.isArray(selectionMap.solid)
      ? selectionMap.solid
          .map((entry) => this.normalizeBackgroundImageUrl(entry))
          .filter(Boolean)
      : [];

    if (!solidSelection.includes(solidUrl)) {
      solidSelection.push(solidUrl);
    }
    selectionMap.solid = solidSelection;
    settings.backgroundImageSelections = selectionMap;

    this.storage.saveSettings(settings);
    this.renderBackgroundImagePool();
    this._backgroundSettingsDirty = true;

    if (this.solidColorPicker) {
      this.solidColorPicker.value = solidHex;
    }
    if (this.solidColorHexInput) {
      this.solidColorHexInput.value = solidHex;
    }

    this.showToast("Solid color template added!", "success");
    return true;
  }

  async removeSolidColorTemplate(value) {
    const solidHex = this.normalizeSolidColorHex(value);
    if (!solidHex) {
      return false;
    }

    const settings = this.storage.getSettings();
    const customTemplates = Array.isArray(settings.solidColorTemplates)
      ? settings.solidColorTemplates
          .map((entry) => this.normalizeSolidColorHex(entry))
          .filter(Boolean)
      : [];

    if (!customTemplates.includes(solidHex)) {
      this.showToast("Only custom solid colors can be removed.", "error");
      return false;
    }

    settings.solidColorTemplates = customTemplates.filter(
      (entry) => entry !== solidHex,
    );

    const solidUrl = this.solidColorHexToBackgroundUrl(solidHex);
    const selectionMap = this.getBackgroundImageSelectionMap(settings);
    const currentSolidSelection = Array.isArray(selectionMap.solid)
      ? selectionMap.solid
          .map((entry) => this.normalizeBackgroundImageUrl(entry))
          .filter(Boolean)
      : [];

    if (solidUrl) {
      selectionMap.solid = currentSolidSelection.filter(
        (entry) => entry !== solidUrl,
      );
    } else {
      selectionMap.solid = currentSolidSelection;
    }
    settings.backgroundImageSelections = selectionMap;

    this.storage.saveSettings(settings);
    this.renderBackgroundImagePool();
    this._backgroundSettingsDirty = true;

    const currentBgUrl = this.normalizeBackgroundImageUrl(
      (typeof this.backgrounds?.getCurrentImageUrl === "function"
        ? this.backgrounds.getCurrentImageUrl(settings)
        : this.backgrounds?.currentImageUrl) || "",
    );

    if (solidUrl && currentBgUrl === solidUrl) {
      const availableSolidUrls = new Set(
        (this.getAllBackgroundImagesForCategory("solid", settings) || [])
          .map((entry) =>
            this.normalizeBackgroundImageUrl(
              typeof entry === "string" ? entry : entry?.url,
            ),
          )
          .filter(Boolean),
      );

      if (!availableSolidUrls.has(solidUrl)) {
        this.refreshBackgroundAfterSettingsSave(settings);
      }
    }

    this.showToast("Custom solid color removed.", "success");
    return true;
  }

  async removeCustomBackgroundFromPool(imageUrl) {
    const normalizedUrl = this.normalizeBackgroundImageUrl(imageUrl);
    if (!normalizedUrl) {
      return false;
    }

    const settings = this.storage.getSettings();
    const customBgRefs = Array.isArray(settings.customBackgrounds)
      ? settings.customBackgrounds
          .map((entry) => this.normalizeBackgroundImageUrl(entry))
          .filter((entry) => this.isValidCustomBackgroundReference(entry))
      : [];

    const removalCandidates = new Set([normalizedUrl]);
    const mappedImage = this.normalizeBackgroundImageUrl(
      this._customBackgroundImageByToken?.get(normalizedUrl),
    );
    if (mappedImage) {
      removalCandidates.add(mappedImage);
    }

    const nextRefs = customBgRefs.filter(
      (entry) => !removalCandidates.has(entry),
    );
    if (nextRefs.length === customBgRefs.length) {
      this.showToast("Background not found in pool.", "error");
      return false;
    }

    settings.customBackgrounds = nextRefs.slice(
      0,
      SettingsManager.CUSTOM_BACKGROUND_LIMIT,
    );

    const selectionMap = this.getBackgroundImageSelectionMap(settings);
    Object.keys(selectionMap).forEach((category) => {
      const urls = Array.isArray(selectionMap[category])
        ? selectionMap[category]
        : [];

      selectionMap[category] = urls
        .map((value) => this.normalizeBackgroundImageUrl(value))
        .filter((value) => Boolean(value) && !removalCandidates.has(value));
    });
    settings.backgroundImageSelections = selectionMap;

    this.storage.saveSettings(settings);

    for (const candidate of removalCandidates) {
      this._backgroundThumbUrlCache?.delete(candidate);
      this._backgroundThumbPendingLoads?.delete(candidate);
      const blobThumb = this._backgroundThumbBlobUrlCache?.get(candidate);
      if (blobThumb) {
        this._backgroundThumbBlobUrlCache.delete(candidate);
        this.revokeBackgroundThumbBlobUrl(blobThumb);
      }
    }

    if (this.isCustomBackgroundToken(normalizedUrl)) {
      await this.deleteCustomBackgroundMediaByToken(normalizedUrl);
    }

    void this.syncCustomBackgroundMediaFromSettings(settings);
    this.renderBackgroundImagePool();
    this._backgroundSettingsDirty = true;

    const currentBgUrl = this.normalizeBackgroundImageUrl(
      (typeof this.backgrounds?.getCurrentImageUrl === "function"
        ? this.backgrounds.getCurrentImageUrl(settings)
        : this.backgrounds?.currentImageUrl) || "",
    );
    if (currentBgUrl && removalCandidates.has(currentBgUrl)) {
      this.refreshBackgroundAfterSettingsSave(settings);
    }

    this.showToast("Background removed from pool.", "success");
    return true;
  }

  readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event?.target?.result || "");
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async addCustomBackground(file) {
    const settings = this.storage.getSettings();
    const customBgRefs = Array.isArray(settings.customBackgrounds)
      ? settings.customBackgrounds
      : [];

    let base64 = "";
    try {
      base64 = this.normalizeBackgroundImageUrl(
        await this.readFileAsDataUrl(file),
      );
    } catch (e) {
      this.showToast("Failed to read image.", "error");
      return false;
    }

    if (!base64) {
      this.showToast("Failed to read image.", "error");
      return false;
    }

    const thumbnailDataUrl =
      await this.buildCustomBackgroundThumbnailDataUrl(base64);
    const token = await this.saveCustomBackgroundMediaToIndexedDb(
      base64,
      thumbnailDataUrl,
    );
    if (!token) {
      this.showToast("Failed to save background.", "error");
      return false;
    }

    const alreadyExists = customBgRefs.includes(token);
    if (
      !alreadyExists &&
      customBgRefs.length >= SettingsManager.CUSTOM_BACKGROUND_LIMIT
    ) {
      this.showToast(
        `Maximum ${SettingsManager.CUSTOM_BACKGROUND_LIMIT} custom backgrounds allowed`,
        "error",
      );
      return false;
    }

    if (!alreadyExists) {
      customBgRefs.push(token);
    }
    settings.customBackgrounds = customBgRefs.slice(
      0,
      SettingsManager.CUSTOM_BACKGROUND_LIMIT,
    );

    const selectionMap = this.getBackgroundImageSelectionMap(settings);
    const customSelection = Array.isArray(selectionMap.custom)
      ? selectionMap.custom.slice()
      : [];
    if (!customSelection.includes(token)) {
      customSelection.push(token);
    }
    selectionMap.custom = customSelection;
    settings.backgroundImageSelections = selectionMap;

    this.storage.saveSettings(settings);
    void this.syncCustomBackgroundMediaFromSettings(settings);
    this.renderBackgroundImagePool();
    this._backgroundSettingsDirty = true;
    this.showToast(
      alreadyExists ? "Background already in pool." : "Background added!",
      "success",
    );
    return true;
  }

  async addCustomBackgroundFromUrl(imageUrl) {
    const normalizedUrl = this.normalizeBackgroundImageImportUrl(imageUrl);
    if (!normalizedUrl) {
      this.showToast("Please enter a valid HTTP(S) image URL.", "error");
      return false;
    }

    const settings = this.storage.getSettings();
    const customBgRefs = Array.isArray(settings.customBackgrounds)
      ? settings.customBackgrounds
          .map((entry) => this.normalizeBackgroundImageUrl(entry))
          .filter((entry) => this.isValidCustomBackgroundReference(entry))
      : [];

    const alreadyExists = customBgRefs.includes(normalizedUrl);
    if (
      !alreadyExists &&
      customBgRefs.length >= SettingsManager.CUSTOM_BACKGROUND_LIMIT
    ) {
      this.showToast(
        `Maximum ${SettingsManager.CUSTOM_BACKGROUND_LIMIT} custom backgrounds allowed`,
        "error",
      );
      return false;
    }

    if (!alreadyExists) {
      customBgRefs.push(normalizedUrl);
    }
    settings.customBackgrounds = customBgRefs.slice(
      0,
      SettingsManager.CUSTOM_BACKGROUND_LIMIT,
    );

    const selectionMap = this.getBackgroundImageSelectionMap(settings);
    const customSelection = Array.isArray(selectionMap.custom)
      ? selectionMap.custom.slice()
      : [];
    if (!customSelection.includes(normalizedUrl)) {
      customSelection.push(normalizedUrl);
    }
    selectionMap.custom = customSelection;
    settings.backgroundImageSelections = selectionMap;

    this.storage.saveSettings(settings);
    void this.syncCustomBackgroundMediaFromSettings(settings);
    this.renderBackgroundImagePool();
    this._backgroundSettingsDirty = true;
    this.showToast(
      alreadyExists ? "Background already in pool." : "Background URL added!",
      "success",
    );
    return true;
  }

  async promptAndAddCustomBackgroundFromUrl() {
    const imageUrl = await this.openUrlInputModal({
      title: "Import Background by URL",
      description:
        "Paste a direct image URL. Only HTTP(S) image links are supported.",
      label: "Background image URL",
      placeholder: "https://example.com/wallpaper.jpg",
      submitLabel: "Import",
      initialValue: "https://",
      validate: (value) => {
        const normalized = this.normalizeBackgroundImageImportUrl(value);
        if (!normalized) return "";
        return this.isRemoteBackgroundImageUrl(normalized) ? normalized : "";
      },
      invalidMessage: "Please enter a valid HTTP(S) image URL.",
    });

    if (!imageUrl) {
      return false;
    }

    return this.addCustomBackgroundFromUrl(imageUrl);
  }
});

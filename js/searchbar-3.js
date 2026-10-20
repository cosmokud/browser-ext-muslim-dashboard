/**
 * SearchBarManager, part 3 of 3.
 * Moved out of js/searchbar.js at method boundaries, so no single file carries the
 * whole class. The class itself is declared in js/searchbar.js; load this after it.
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
})(SearchBarManager.prototype, class {

  _normalizeOptionalRgbString(rgbString) {
    return this._isValidRgbString(rgbString)
      ? this._normalizeRgbString(rgbString)
      : null;
  }

  _hexToRgbString(hex) {
    const s = String(hex || "").trim();
    const m = s.match(/^#?([0-9a-fA-F]{6})$/);
    if (!m) return null;
    const raw = m[1];
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }

  _rgbStringToHex(rgbString) {
    const m = String(rgbString || "")
      .trim()
      .match(/^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/);
    if (!m) return null;
    const clamp = (n) => Math.max(0, Math.min(255, n));
    const r = clamp(parseInt(m[1], 10));
    const g = clamp(parseInt(m[2], 10));
    const b = clamp(parseInt(m[3], 10));
    const toHex2 = (n) => n.toString(16).padStart(2, "0");
    return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
  }

  _parseHexColor(hex) {
    const rgb = this._hexToRgbString(hex);
    if (!rgb) return null;
    const m = rgb.match(/^(\d+),\s*(\d+),\s*(\d+)$/);
    if (!m) return null;
    return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
  }

  _mixRgb(a, b, t) {
    const mix = (x, y) => Math.round(x + (y - x) * t);
    return { r: mix(a.r, b.r), g: mix(a.g, b.g), b: mix(a.b, b.b) };
  }

  _rgbToString(c) {
    return `${c.r}, ${c.g}, ${c.b}`;
  }

  _hslToRgb(h, s, l) {
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

    return {
      r: Math.round((r1 + m) * 255),
      g: Math.round((g1 + m) * 255),
      b: Math.round((b1 + m) * 255),
    };
  }

  _getRainbowPalette(count) {
    const n = Math.max(1, Math.floor(Number(count) || 0));
    const out = [];
    for (let i = 0; i < n; i++) {
      const hue = (i * 360) / n;
      const rgb = this._hslToRgb(hue, 95, 55);
      out.push(`${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
    return out;
  }

  async _getFaviconDominantRgb(faviconUrl, { force = false } = {}) {
    const key = String(faviconUrl || "");
    this.faviconDominantFailureReason = null;
    if (!key) {
      return this._setFaviconDominantFailure(
        "Favicon dominant color failed: no favicon URL was available.",
      );
    }

    if (force) {
      this.faviconDominantCache.delete(key);
    }

    const cached = this.faviconDominantCache.get(key);
    if (cached) return cached;

    if (this.faviconDominantInFlight.has(key)) {
      try {
        await this.faviconDominantInFlight.get(key);
      } catch (e) {}
      return this.faviconDominantCache.get(key) || null;
    }

    const p = this._computeFaviconDominantRgb(key, { force })
      .then((rgb) => {
        if (this._isValidRgbString(rgb)) {
          this.faviconDominantCache.set(key, this._normalizeRgbString(rgb));
        }
      })
      .finally(() => {
        this.faviconDominantInFlight.delete(key);
      });

    this.faviconDominantInFlight.set(key, p);

    try {
      await p;
    } catch (e) {}

    return this.faviconDominantCache.get(key) || null;
  }

  async _createReadableFaviconSampleUrl(url, { force = false } = {}) {
    let fetchUrl = String(url || "");
    if (!fetchUrl) {
      return this._setFaviconDominantFailure(
        "Favicon dominant color failed: no favicon URL was available.",
      );
    }

    if (/^(data|blob|chrome-extension):/i.test(fetchUrl)) {
      return this._normalizeFaviconSampleToPngUrl(fetchUrl);
    }

    if (force) {
      try {
        const parsedUrl = new URL(fetchUrl);
        if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
          parsedUrl.searchParams.set(
            "_sb_favicon_color_refresh",
            String(Date.now()),
          );
          fetchUrl = parsedUrl.toString();
        }
      } catch (e) {}
    }

    try {
      const resp = await fetch(fetchUrl, {
        cache: force ? "reload" : "force-cache",
      });
      if (!resp.ok) {
        return this._setFaviconDominantFailure(
          `Favicon dominant color failed: favicon fetch returned HTTP ${resp.status}.`,
        );
      }

      const blob = await resp.blob();
      if (!blob || blob.size <= 0) {
        return this._setFaviconDominantFailure(
          "Favicon dominant color failed: favicon fetch returned an empty image.",
        );
      }

      const objectUrl = URL.createObjectURL(blob);
      const sample = await this._normalizeFaviconSampleToPngUrl(objectUrl);
      return {
        url: sample?.url || objectUrl,
        revoke: () => {
          if (typeof sample?.revoke === "function") sample.revoke();
          URL.revokeObjectURL(objectUrl);
        },
      };
    } catch (e) {
      return this._setFaviconDominantFailure(
        "Favicon dominant color failed: favicon fetch failed.",
      );
    }
  }

  _normalizeFaviconSampleToPngUrl(sourceUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";

      const cleanup = () => {
        img.onload = null;
        img.onerror = null;
      };

      img.onload = () => {
        try {
          const size = 64;
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d", {
            willReadFrequently: true,
          });
          if (!ctx) {
            cleanup();
            resolve(
              this._setFaviconDominantFailure(
                "Favicon dominant color failed: canvas is unavailable.",
              ),
            );
            return;
          }

          ctx.clearRect(0, 0, size, size);
          ctx.drawImage(img, 0, 0, size, size);

          canvas.toBlob(
            (pngBlob) => {
              cleanup();
              if (!pngBlob || pngBlob.size <= 0) {
                resolve(
                  this._setFaviconDominantFailure(
                    "Favicon dominant color failed: canvas PNG export failed.",
                  ),
                );
                return;
              }

              const pngUrl = URL.createObjectURL(pngBlob);
              resolve({
                url: pngUrl,
                revoke: () => URL.revokeObjectURL(pngUrl),
              });
            },
            "image/png",
          );
        } catch (e) {
          cleanup();
          resolve(
            this._setFaviconDominantFailure(
              "Favicon dominant color failed: favicon image draw failed.",
            ),
          );
        }
      };

      img.onerror = () => {
        cleanup();
        resolve(
          this._setFaviconDominantFailure(
            "Favicon dominant color failed: favicon image decode failed.",
          ),
        );
      };

      img.src = sourceUrl;
    });
  }

  async _createReadableFaviconSample(url, { force = false } = {}) {
    const sampleUrl = await this._createReadableFaviconSampleUrl(url, {
      force,
    });
    if (!sampleUrl?.url) {
      if (!this.faviconDominantFailureReason) {
        this._setFaviconDominantFailure(
          "Favicon dominant color failed: favicon image decode failed.",
        );
      }
      return null;
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";

      const cleanup = () => {
        img.onload = null;
        img.onerror = null;
      };

      img.onload = () => {
        try {
          const size = 64;
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d", {
            willReadFrequently: true,
          });
          if (!ctx) {
            cleanup();
            if (typeof sampleUrl.revoke === "function") sampleUrl.revoke();
            resolve(
              this._setFaviconDominantFailure(
                "Favicon dominant color failed: canvas is unavailable.",
              ),
            );
            return;
          }

          ctx.clearRect(0, 0, size, size);
          ctx.drawImage(img, 0, 0, size, size);
          cleanup();

          resolve({
            ctx,
            width: size,
            height: size,
            revoke: () => {
              if (typeof sampleUrl.revoke === "function") sampleUrl.revoke();
              canvas.width = 0;
              canvas.height = 0;
            },
          });
        } catch (e) {
          cleanup();
          if (typeof sampleUrl.revoke === "function") sampleUrl.revoke();
          resolve(
            this._setFaviconDominantFailure(
              "Favicon dominant color failed: favicon image draw failed.",
            ),
          );
        }
      };

      img.onerror = () => {
        cleanup();
        if (typeof sampleUrl.revoke === "function") sampleUrl.revoke();
        resolve(
          this._setFaviconDominantFailure(
            "Favicon dominant color failed: favicon image decode failed.",
          ),
        );
      };

      img.src = sampleUrl.url;
    });
  }

  async _computeFaviconDominantRgb(url, { force = false } = {}) {
    const sample = await this._createReadableFaviconSample(url, { force });
    if (!sample?.ctx) {
      if (!this.faviconDominantFailureReason) {
        this._setFaviconDominantFailure(
          "Favicon dominant color failed: favicon image decode failed.",
        );
      }
      return null;
    }

    try {
      let imageData = null;
      try {
        imageData = sample.ctx.getImageData(
          0,
          0,
          sample.width,
          sample.height,
        );
      } catch (e) {
        return this._setFaviconDominantFailure(
          "Favicon dominant color failed: canvas pixel read failed.",
        );
      }

      const rgb = this._getDominantFaviconRgbFromImageData(imageData);
      if (!Array.isArray(rgb) || rgb.length < 3) {
        return this._setFaviconDominantFailure(
          "Favicon dominant color failed: favicon has no visible pixels.",
        );
      }
      return `${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(
        rgb[2],
      )}`;
    } catch (e) {
      return this._setFaviconDominantFailure(
        "Favicon dominant color failed: unexpected color scan error.",
      );
    } finally {
      if (typeof sample.revoke === "function") {
        sample.revoke();
      }
    }
  }

  _getDominantFaviconRgbFromImageData(imageData) {
    const pixels = imageData?.data;
    if (!pixels || pixels.length < 4) return null;

    return (
      this._pickDominantFaviconRgb(pixels, {
        ignoreNearWhite: true,
        ignoreNearBlack: true,
        minAlpha: 24,
      }) ||
      this._pickDominantFaviconRgb(pixels, {
        ignoreNearWhite: false,
        ignoreNearBlack: false,
        minAlpha: 24,
      }) ||
      this._pickDominantFaviconRgb(pixels, {
        ignoreNearWhite: false,
        ignoreNearBlack: false,
        minAlpha: 1,
      })
    );
  }

  _pickDominantFaviconRgb(
    pixels,
    {
      ignoreNearWhite = true,
      ignoreNearBlack = true,
      minAlpha = 24,
      divider = 16,
    } = {},
  ) {
    const buckets = new Map();
    const step = 4;

    for (let i = 0; i < pixels.length; i += step) {
      const r = Number(pixels[i]) || 0;
      const g = Number(pixels[i + 1]) || 0;
      const b = Number(pixels[i + 2]) || 0;
      const a = Number(pixels[i + 3]) || 0;
      if (a < minAlpha) {
        continue;
      }
      if (ignoreNearWhite && this._isNearWhiteRgb(r, g, b)) {
        continue;
      }
      if (ignoreNearBlack && this._isNearBlackRgb(r, g, b)) {
        continue;
      }

      const bucketKey = [
        Math.round(r / divider),
        Math.round(g / divider),
        Math.round(b / divider),
      ].join(",");
      const alphaWeight = Math.max(0.05, a / 255);
      const bucket = buckets.get(bucketKey) || {
        weight: 0,
        r: 0,
        g: 0,
        b: 0,
      };
      bucket.weight += alphaWeight;
      bucket.r += r * alphaWeight;
      bucket.g += g * alphaWeight;
      bucket.b += b * alphaWeight;
      buckets.set(bucketKey, bucket);
    }

    let best = null;
    for (const bucket of buckets.values()) {
      const rgb = [
        Math.round(bucket.r / bucket.weight),
        Math.round(bucket.g / bucket.weight),
        Math.round(bucket.b / bucket.weight),
      ];
      const score = bucket.weight * (0.72 + this._getRgbSaturation(rgb) * 0.8);
      if (!best || score > best.score) {
        best = { rgb, score };
      }
    }

    return best?.rgb || null;
  }

  _isNearWhiteRgb(r, g, b) {
    return r >= 244 && g >= 244 && b >= 244 && Math.max(r, g, b) - Math.min(r, g, b) <= 18;
  }

  _isNearBlackRgb(r, g, b) {
    return r <= 42 && g <= 42 && b <= 42;
  }

  _getRgbSaturation(rgb) {
    const r = rgb[0] / 255;
    const g = rgb[1] / 255;
    const b = rgb[2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === min) return 0;
    const lightness = (max + min) / 2;
    const delta = max - min;
    return delta / (1 - Math.abs(2 * lightness - 1));
  }

  async _renderAccentPaletteForEngine(
    engineId,
    { refreshDominant = false, applyDominant = false } = {},
  ) {
    if (!this.contextMenu) return;
    const paletteEl = this.contextMenu.querySelector(
      '[data-role="accent-palette"]',
    );
    if (!paletteEl) return;

    const rainbow29 = this._getRainbowPalette(29);
    while (rainbow29.length < 29) rainbow29.push("255, 255, 255");

    // If no engine is selected yet, show a full rainbow row.
    if (!engineId) {
      const rainbow30 = this._getRainbowPalette(30);
      while (rainbow30.length < 30) rainbow30.push("255, 255, 255");
      this._renderSwatches(paletteEl, rainbow30.slice(0, 30));
      return;
    }

    const engine = this.searches.find((s) => String(s.id) === String(engineId));
    if (!engine) return;

    let faviconUrl =
      engine.cachedFavicon ||
      engine.favicon ||
      this.getFaviconUrlFromTemplate(engine.url);
    const cachedDominant = this.getCachedFaviconDominantRgb(faviconUrl);
    const knownDominant =
      cachedDominant || this._normalizeOptionalRgbString(engine.faviconDominantRgb);
    if (knownDominant) {
      this._renderSwatches(paletteEl, [...rainbow29, knownDominant], {
        dominantIndex: rainbow29.length,
      });
    } else {
      this._renderSwatches(paletteEl, rainbow29);
    }

    if (refreshDominant) {
      const refreshedFavicon =
        await this.refreshEngineFaviconForDominantColor(engine);
      if (refreshedFavicon) {
        faviconUrl = refreshedFavicon;
      }
    }

    if (!faviconUrl) return;

    let dominant;
    try {
      dominant = await this._getFaviconDominantRgb(faviconUrl, {
        force: refreshDominant,
      });
    } catch (e) {
      dominant = null;
    }
    if (!dominant) return;

    // If the menu moved to another engine while awaiting, abort.
    if (String(this.contextMenu?.dataset?.engineId) !== String(engineId))
      return;

    this._renderSwatches(paletteEl, [...rainbow29, dominant], {
      dominantIndex: rainbow29.length,
    });
    engine.faviconDominantRgb = this._normalizeRgbString(dominant);
    this.persist();
    if (applyDominant && engine.accentRgbSource !== "custom") {
      const normalizedDominant = this._normalizeRgbString(dominant);
      this.setEngineAccent(engine.id, normalizedDominant, { source: "favicon" });
    }
  }

  _renderSwatches(paletteEl, rgbList, { dominantIndex = -1 } = {}) {
    paletteEl.innerHTML = "";
    rgbList.forEach((rgb, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "context-menu-swatch";
      btn.dataset.rgb = rgb;
      btn.setAttribute("aria-label", `Set accent color ${rgb}`);
      btn.setAttribute(
        "title",
        idx === dominantIndex ? "Dominant favicon color" : "",
      );
      btn.style.background = `rgb(${rgb})`;
      paletteEl.appendChild(btn);
    });
  }

  render() {
    if (!this.strip) return;

    if (this.shell) {
      this.shell.classList.toggle("has-engines", this.searches.length > 0);

      const visible = Math.max(
        1,
        Math.min(SearchBarManager.MAX_VISIBLE, this.searches.length),
      );
      this.shell.style.setProperty("--sb-engine-visible", String(visible));
    }

    // Clear
    this.strip.innerHTML = "";

    const frag = document.createDocumentFragment();

    this.searches.forEach((engine) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "search-bar-engine-tab";
      btn.setAttribute("role", "tab");
      btn.setAttribute("data-id", String(engine.id));
      btn.setAttribute(
        "aria-selected",
        String(engine.id) === String(this.selectedId) ? "true" : "false",
      );
      btn.title = engine.name;

      const icon = document.createElement("span");
      icon.className = "search-bar-engine-icon";

      // Use cached favicon first, then stored favicon, then fetch URL
      const faviconUrl =
        engine.cachedFavicon ||
        engine.favicon ||
        this.getFaviconUrlFromTemplate(engine.url);
      const fallback = document.createElement("span");
      fallback.className = "search-bar-engine-fallback";
      fallback.textContent = engine.name.charAt(0).toUpperCase();

      if (faviconUrl) {
        const img = document.createElement("img");
        img.src = faviconUrl;
        img.alt = engine.name;
        img.draggable = false;
        img.addEventListener("error", () => {
          img.style.display = "none";
          fallback.style.display = "flex";
        });
        icon.appendChild(img);
      }

      icon.appendChild(fallback);
      btn.appendChild(icon);

      // Load cached favicon asynchronously if not already cached
      if (!engine.cachedFavicon && window.faviconCache) {
        this.loadCachedFaviconForEngine(engine, btn);
      }

      btn.addEventListener("click", () => {
        this.selectEngine(engine.id);
      });

      // Mouse-based custom drag (desktop)
      btn.addEventListener("mousedown", (e) =>
        this._handleEngineDragStart(e, engine, btn),
      );

      // Touch-based drag (mobile)
      btn.addEventListener(
        "touchstart",
        (e) => this._handleEngineTouchStart(e, engine, btn),
        { passive: false },
      );

      btn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showContextMenu(e.clientX, e.clientY, engine.id);
      });

      frag.appendChild(btn);
    });

    this.strip.appendChild(frag);

    // Final UI sync.
    this.updateSelectionUi();

    // Apply accent for current selection.
    const selected = this.getSelected();
    if (selected) {
      // Ensure favicon is stored for future loads.
      if (!selected.favicon) {
        selected.favicon = this.getFaviconUrlFromTemplate(selected.url);
        this.persist();
      }
      this.applyEngineAccent(selected);
    } else {
      // Reset to default accent and placeholder when empty.
      if (this.shell) {
        this.shell.style.setProperty("--sb-accent-rgb", "255, 255, 255");
      }
      this.setPlaceholder("Add a custom search");
    }

    // Arrow visibility and transform.
    this.updateStripTransform();
  }

  async loadCachedFaviconForEngine(engine, btnEl) {
    try {
      const cached = await window.faviconCache.getCached(engine.url, "search");
      if (cached) {
        const img = btnEl.querySelector(".search-bar-engine-icon img");
        if (img) {
          img.src = cached;
        }
        // Update engine object
        engine.cachedFavicon = cached;
        if (
          String(this.selectedId) === String(engine.id) &&
          engine.accentRgbSource !== "custom"
        ) {
          this._ensureDefaultAccentForEngine(engine).catch(() => {});
        }
      }
    } catch (e) {
      // Silently fail
    }
  }
});

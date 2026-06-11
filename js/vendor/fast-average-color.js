(function () {
  "use strict";

  const DEFAULT_COLOR = [0, 0, 0, 0];

  class FastAverageColor {
    constructor() {
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    }

    destroy() {
      if (this.canvas) {
        this.canvas.width = 0;
        this.canvas.height = 0;
      }
      this.canvas = null;
      this.ctx = null;
    }

    async getColorAsync(resource, options = {}) {
      const image = await this._loadResource(resource, options);
      return this.getColor(image, options);
    }

    getColor(resource, options = {}) {
      if (!this.canvas || !this.ctx) {
        throw new Error("FastAverageColor instance was destroyed.");
      }

      const width = Math.max(1, Math.floor(Number(options.width) || 32));
      const height = Math.max(1, Math.floor(Number(options.height) || 32));

      this.canvas.width = width;
      this.canvas.height = height;
      this.ctx.clearRect(0, 0, width, height);
      this.ctx.drawImage(
        resource,
        Number(options.left) || 0,
        Number(options.top) || 0,
        resource.naturalWidth || resource.videoWidth || resource.width || width,
        resource.naturalHeight || resource.videoHeight || resource.height || height,
        0,
        0,
        width,
        height,
      );

      const pixels = this.ctx.getImageData(0, 0, width, height).data;
      const rgba =
        options.algorithm === "dominant"
          ? this._getDominantColor(pixels, options)
          : this._getAverageColor(pixels, options);

      return this._buildResult(rgba);
    }

    _loadResource(resource, options) {
      if (
        resource instanceof HTMLImageElement ||
        resource instanceof HTMLCanvasElement ||
        resource instanceof HTMLVideoElement
      ) {
        return Promise.resolve(resource);
      }

      return new Promise((resolve, reject) => {
        const img = new Image();
        const src = String(resource || "");
        if (options.crossOrigin && !/^data:|^blob:/i.test(src)) {
          img.crossOrigin = options.crossOrigin;
        }
        img.decoding = "async";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Unable to load image."));
        img.src = src;
      });
    }

    _getDominantColor(pixels, options) {
      const buckets = new Map();
      const divider = Math.max(1, Number(options.dominantDivider) || 24);
      const step = Math.max(1, Number(options.step) || 1);

      for (let i = 0; i < pixels.length; i += 4 * step) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];
        if (a < 24 || this._isIgnoredColor(r, g, b, a, options.ignoredColor)) {
          continue;
        }

        const key = [
          Math.round(r / divider),
          Math.round(g / divider),
          Math.round(b / divider),
        ].join(",");
        const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0, a: 0 };
        bucket.count += 1;
        bucket.r += r;
        bucket.g += g;
        bucket.b += b;
        bucket.a += a;
        buckets.set(key, bucket);
      }

      let best = null;
      buckets.forEach((bucket) => {
        if (!best || bucket.count > best.count) {
          best = bucket;
        }
      });

      if (!best) return options.defaultColor || DEFAULT_COLOR;
      return [
        Math.round(best.r / best.count),
        Math.round(best.g / best.count),
        Math.round(best.b / best.count),
        Math.round(best.a / best.count),
      ];
    }

    _getAverageColor(pixels, options) {
      const step = Math.max(1, Number(options.step) || 1);
      let count = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let i = 0; i < pixels.length; i += 4 * step) {
        const pxR = pixels[i];
        const pxG = pixels[i + 1];
        const pxB = pixels[i + 2];
        const pxA = pixels[i + 3];
        if (
          pxA < 24 ||
          this._isIgnoredColor(pxR, pxG, pxB, pxA, options.ignoredColor)
        ) {
          continue;
        }
        count += 1;
        r += pxR;
        g += pxG;
        b += pxB;
        a += pxA;
      }

      if (!count) return options.defaultColor || DEFAULT_COLOR;
      return [
        Math.round(r / count),
        Math.round(g / count),
        Math.round(b / count),
        Math.round(a / count),
      ];
    }

    _isIgnoredColor(r, g, b, a, ignoredColor) {
      if (!ignoredColor) return false;
      const colors = Array.isArray(ignoredColor[0])
        ? ignoredColor
        : [ignoredColor];

      return colors.some((color) => {
        const threshold = Number(color[4]) || 0;
        return (
          Math.abs(r - Number(color[0])) <= threshold &&
          Math.abs(g - Number(color[1])) <= threshold &&
          Math.abs(b - Number(color[2])) <= threshold &&
          Math.abs(a - Number(color[3])) <= threshold
        );
      });
    }

    _buildResult(rgba) {
      const r = Math.max(0, Math.min(255, Number(rgba[0]) || 0));
      const g = Math.max(0, Math.min(255, Number(rgba[1]) || 0));
      const b = Math.max(0, Math.min(255, Number(rgba[2]) || 0));
      const a = Math.max(0, Math.min(255, Number(rgba[3]) || 0));
      const hex =
        "#" +
        [r, g, b]
          .map((value) => value.toString(16).padStart(2, "0"))
          .join("");
      const alpha = Math.round((a / 255) * 1000) / 1000;
      const isDark = r * 0.299 + g * 0.587 + b * 0.114 < 128;

      return {
        value: [r, g, b, a],
        rgb: [r, g, b],
        rgba: `rgba(${r}, ${g}, ${b}, ${alpha})`,
        hex,
        isDark,
        isLight: !isDark,
      };
    }
  }

  window.FastAverageColor = FastAverageColor;
})();

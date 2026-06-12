(function () {
  "use strict";

  const DEFAULT_IGNORED_COLORS = [
    [255, 255, 255, 255, 30],
    [0, 0, 0, 255, 48],
    [0, 0, 0, 0, 255],
  ];

  const ColorThief = {
    getColorSync(source, options = {}) {
      const pixels = this._getImageDataPixels(source);
      const palette = this._getPaletteFromPixels(pixels, options);
      if (palette.length) return palette[0];
      return Object.prototype.hasOwnProperty.call(options, "defaultColor")
        ? options.defaultColor
        : null;
    },

    getPaletteSync(source, options = {}) {
      const pixels = this._getImageDataPixels(source);
      return this._getPaletteFromPixels(pixels, options);
    },

    _getImageDataPixels(source) {
      if (source instanceof ImageData) {
        return source.data;
      }

      if (source?.data && typeof source.data.length === "number") {
        return source.data;
      }

      const width = Math.max(
        1,
        Math.floor(source?.naturalWidth || source?.videoWidth || source?.width || 0),
      );
      const height = Math.max(
        1,
        Math.floor(
          source?.naturalHeight || source?.videoHeight || source?.height || 0,
        ),
      );
      if (!width || !height) return new Uint8ClampedArray();

      const canvas =
        source instanceof HTMLCanvasElement
          ? source
          : document.createElement("canvas");
      if (!(source instanceof HTMLCanvasElement)) {
        canvas.width = width;
        canvas.height = height;
        const drawCtx = canvas.getContext("2d", { willReadFrequently: true });
        drawCtx.clearRect(0, 0, width, height);
        drawCtx.drawImage(source, 0, 0, width, height);
      }

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      return ctx.getImageData(0, 0, width, height).data;
    },

    _getPaletteFromPixels(pixels, options = {}) {
      const colorCount = Math.max(1, Math.floor(Number(options.colorCount) || 8));
      const quality = Math.max(1, Math.floor(Number(options.quality) || 1));
      const divider = Math.max(8, Math.floor(Number(options.divider) || 16));
      const ignoredColor = this._mergeIgnoredColors(options.ignoredColor);
      const buckets = new Map();

      for (let i = 0; i < pixels.length; i += 4 * quality) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];
        if (a < 24 || this._isIgnoredColor(r, g, b, a, ignoredColor)) {
          continue;
        }

        const key = [
          Math.round(r / divider),
          Math.round(g / divider),
          Math.round(b / divider),
        ].join(",");
        const bucket = buckets.get(key) || {
          count: 0,
          r: 0,
          g: 0,
          b: 0,
          a: 0,
        };
        bucket.count += 1;
        bucket.r += r;
        bucket.g += g;
        bucket.b += b;
        bucket.a += a;
        buckets.set(key, bucket);
      }

      return Array.from(buckets.values())
        .map((bucket) => {
          const rgb = [
            Math.round(bucket.r / bucket.count),
            Math.round(bucket.g / bucket.count),
            Math.round(bucket.b / bucket.count),
          ];
          return {
            rgb,
            score: bucket.count * (0.65 + this._saturation(rgb)),
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, colorCount)
        .map((item) => item.rgb);
    },

    _mergeIgnoredColors(ignoredColor) {
      if (!ignoredColor) return DEFAULT_IGNORED_COLORS;
      const colors = Array.isArray(ignoredColor[0])
        ? ignoredColor
        : [ignoredColor];
      return [...DEFAULT_IGNORED_COLORS, ...colors];
    },

    _isIgnoredColor(r, g, b, a, ignoredColor) {
      return ignoredColor.some((color) => {
        const threshold = Number(color[4]) || 0;
        return (
          Math.abs(r - Number(color[0])) <= threshold &&
          Math.abs(g - Number(color[1])) <= threshold &&
          Math.abs(b - Number(color[2])) <= threshold &&
          Math.abs(a - Number(color[3])) <= threshold
        );
      });
    },

    _saturation(rgb) {
      const r = rgb[0] / 255;
      const g = rgb[1] / 255;
      const b = rgb[2] / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max === min) return 0;
      const lightness = (max + min) / 2;
      const delta = max - min;
      return delta / (1 - Math.abs(2 * lightness - 1));
    },
  };

  window.ColorThief = ColorThief;
})();

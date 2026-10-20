/**
 * SettingsManager: container width and media emulation.
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

  emitLayoutLiveResize(detail = {}) {
    try {
      document.dispatchEvent(
        new CustomEvent("md:layout-live-resize", {
          detail: {
            source: "settings",
            ...(detail || {}),
          },
        }),
      );
    } catch (e) {}

    try {
      const weather = window.dashboard?.weather;
      if (
        weather &&
        typeof weather.handleExternalLayoutLiveResize === "function"
      ) {
        weather.handleExternalLayoutLiveResize(detail || {});
      }
    } catch (e) {}
  }

  queueContainerResizeWindowSync() {
    if (this._containerResizeWindowSyncRaf) {
      cancelAnimationFrame(this._containerResizeWindowSyncRaf);
      this._containerResizeWindowSyncRaf = null;
    }

    this._containerResizeWindowSyncRaf = requestAnimationFrame(() => {
      this._containerResizeWindowSyncRaf = null;
      try {
        window.dispatchEvent(new Event("resize"));
      } catch (e) {}
    });
  }

  applyContainerWidth(width, customValue) {
    const mainContainer = document.querySelector(".main-container");

    if (!mainContainer) return;

    // Remove existing width classes
    mainContainer.classList.remove(
      "container-extra-compact",
      "container-compact",
      "container-slim",
      "container-narrow",
      "container-medium",
      "container-wide",
      "container-full",
      "container-custom",
    );
    mainContainer.style.removeProperty("--custom-container-width");

    // Apply new width
    switch (width) {
      case "extra-compact":
        mainContainer.classList.add("container-extra-compact");
        break;
      case "compact":
        mainContainer.classList.add("container-compact");
        break;
      case "slim":
        mainContainer.classList.add("container-slim");
        break;
      case "medium":
        mainContainer.classList.add("container-medium");
        break;
      case "wide":
        mainContainer.classList.add("container-wide");
        break;
      case "full":
        mainContainer.classList.add("container-full");
        break;
      case "custom":
        mainContainer.classList.add("container-custom");
        {
          const clamped = SettingsRegistry.coerce("containerWidthCustom", customValue);
          if (this.containerWidthCustom) {
            this.containerWidthCustom.value = String(clamped);
          }
          if (this.customWidthValue) {
            this.customWidthValue.textContent = clamped + "%";
          }
          mainContainer.style.setProperty(
            "--custom-container-width",
            clamped + "%",
          );
        }
        break;
      default: // narrow
        mainContainer.classList.add("container-narrow");
        break;
    }

    this.scheduleContainerWidthMediaEmulation(mainContainer);
    this.emitLayoutLiveResize({
      reason: "container-width-setting",
      widthMode: width || "narrow",
      customValue,
    });
    this.queueContainerResizeWindowSync();
  }

  scheduleContainerWidthMediaEmulation(mainContainer = null) {
    this.ensureContainerWidthMediaListeners();

    if (mainContainer) {
      this._containerWidthMediaRoot = mainContainer;
    }

    if (this._containerWidthMediaRaf) {
      cancelAnimationFrame(this._containerWidthMediaRaf);
    }

    this._containerWidthMediaRaf = requestAnimationFrame(() => {
      this._containerWidthMediaRaf = null;
      this.applyContainerWidthMediaEmulation();
    });
  }

  ensureContainerWidthMediaListeners() {
    if (this._containerWidthMediaListenersReady) {
      return;
    }

    this._containerWidthMediaListenersReady = true;
    this._onContainerWidthViewportResize = () =>
      this.scheduleContainerWidthMediaEmulation();

    window.addEventListener("resize", this._onContainerWidthViewportResize);
    window.addEventListener(
      "orientationchange",
      this._onContainerWidthViewportResize,
    );
  }

  applyContainerWidthMediaEmulation() {
    const mainContainer =
      this._containerWidthMediaRoot ||
      document.querySelector(".main-container");

    if (!mainContainer) {
      this.removeContainerWidthMediaEmulation();
      return;
    }

    let containerWidth = 0;
    try {
      containerWidth = Math.round(mainContainer.getBoundingClientRect().width);
    } catch (e) {
      containerWidth = 0;
    }

    if (!containerWidth && mainContainer.offsetWidth) {
      containerWidth = Math.round(mainContainer.offsetWidth);
    }

    const viewportWidth = Math.max(
      window.innerWidth || 0,
      document.documentElement?.clientWidth || 0,
      document.body?.clientWidth || 0,
    );

    // If viewport is already narrow enough, native media queries handle responsiveness.
    if (
      !containerWidth ||
      !viewportWidth ||
      containerWidth >= viewportWidth - 1
    ) {
      this.removeContainerWidthMediaEmulation();
      return;
    }

    const widthMediaRules = this.getContainerWidthMediaRules();
    if (!widthMediaRules.length) {
      this.removeContainerWidthMediaEmulation();
      return;
    }

    const matchedBlocks = [];
    widthMediaRules.forEach((entry) => {
      if (
        this.mediaQueryMatchesContainerWidth(entry.mediaText, containerWidth)
      ) {
        matchedBlocks.push(entry.cssText);
      }
    });

    if (!matchedBlocks.length) {
      this.removeContainerWidthMediaEmulation();
      return;
    }

    let styleEl = this._containerWidthMediaStyleEl;
    if (!styleEl || !styleEl.isConnected) {
      styleEl = document.getElementById("md-container-width-media-emulation");
    }

    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "md-container-width-media-emulation";
      document.head.appendChild(styleEl);
    }

    this._containerWidthMediaStyleEl = styleEl;

    const nextCss =
      "/* Generated: emulate width media queries from dashboard container width */\n" +
      matchedBlocks.join("\n");

    if (styleEl.textContent !== nextCss) {
      styleEl.textContent = nextCss;
    }
  }

  getContainerWidthMediaRules() {
    const sheetCount = document.styleSheets.length;
    if (
      Array.isArray(this._containerWidthMediaRuleCache) &&
      this._containerWidthMediaRuleCacheSheetCount === sheetCount
    ) {
      return this._containerWidthMediaRuleCache;
    }

    const collected = [];
    Array.from(document.styleSheets).forEach((sheet) => {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch (e) {
        // Cross-origin stylesheets are not readable; skip them.
        return;
      }

      if (!rules) {
        return;
      }

      this.collectContainerWidthMediaRules(rules, collected);
    });

    this._containerWidthMediaRuleCache = collected;
    this._containerWidthMediaRuleCacheSheetCount = sheetCount;

    return collected;
  }

  collectContainerWidthMediaRules(ruleList, sink) {
    Array.from(ruleList).forEach((rule) => {
      if (!rule) {
        return;
      }

      const mediaText = rule.media?.mediaText;
      if (
        typeof mediaText === "string" &&
        /(max|min)-width\s*:\s*\d+(?:\.\d+)?px/i.test(mediaText)
      ) {
        const cssText = Array.from(rule.cssRules || [])
          .map((childRule) => childRule.cssText)
          .join("\n")
          .trim();

        if (cssText) {
          sink.push({ mediaText, cssText });
        }
        return;
      }

      if (rule.cssRules && !rule.media) {
        this.collectContainerWidthMediaRules(rule.cssRules, sink);
      }
    });
  }

  mediaQueryMatchesContainerWidth(mediaText, widthPx) {
    if (!mediaText || !Number.isFinite(widthPx)) {
      return false;
    }

    const clauses = String(mediaText).split(",");
    for (const clauseText of clauses) {
      const clause = clauseText.trim();
      if (!clause) {
        continue;
      }

      const featureMatches = Array.from(
        clause.matchAll(/\(\s*([a-z-]+)\s*:\s*[^)]+\)/gi),
      );

      if (!featureMatches.length) {
        continue;
      }

      const hasUnsupportedFeature = featureMatches.some((featureMatch) => {
        const featureName = featureMatch[1].toLowerCase();
        return featureName !== "max-width" && featureName !== "min-width";
      });

      if (hasUnsupportedFeature) {
        continue;
      }

      const maxWidthMatches = Array.from(
        clause.matchAll(/\(\s*max-width\s*:\s*([0-9.]+)px\s*\)/gi),
      );
      const minWidthMatches = Array.from(
        clause.matchAll(/\(\s*min-width\s*:\s*([0-9.]+)px\s*\)/gi),
      );

      if (!maxWidthMatches.length && !minWidthMatches.length) {
        continue;
      }

      let isMatch = true;

      maxWidthMatches.forEach((match) => {
        const maxWidth = parseFloat(match[1]);
        if (Number.isFinite(maxWidth) && widthPx > maxWidth + 0.01) {
          isMatch = false;
        }
      });

      minWidthMatches.forEach((match) => {
        const minWidth = parseFloat(match[1]);
        if (Number.isFinite(minWidth) && widthPx + 0.01 < minWidth) {
          isMatch = false;
        }
      });

      if (isMatch) {
        return true;
      }
    }

    return false;
  }

  removeContainerWidthMediaEmulation() {
    const styleEl =
      this._containerWidthMediaStyleEl ||
      document.getElementById("md-container-width-media-emulation");

    if (styleEl) {
      styleEl.remove();
    }

    this._containerWidthMediaStyleEl = null;
  }
});

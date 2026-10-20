/**
 * WeatherManager: card width and truncation measurement.
 * Part of the class declared in js/weather/index.js; load this after it.
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
})(WeatherManager.prototype, class {

  measureWeatherCardElementWidth() {
    if (!this.weatherCard) return 0;

    const readUsableContentWidth = (el) => {
      if (!el) return 0;

      const style = window.getComputedStyle(el);
      const paddingLeft = parseFloat(style.paddingLeft) || 0;
      const paddingRight = parseFloat(style.paddingRight) || 0;
      const borderLeft = parseFloat(style.borderLeftWidth) || 0;
      const borderRight = parseFloat(style.borderRightWidth) || 0;

      // Prefer clientWidth because it is stable under root zoom.
      const clientWidth = Number(el.clientWidth) || 0;
      if (Number.isFinite(clientWidth) && clientWidth > 0) {
        return Math.max(
          0,
          Math.round(clientWidth - paddingLeft - paddingRight),
        );
      }

      const rectWidth = Number(el.getBoundingClientRect().width) || 0;
      if (!Number.isFinite(rectWidth) || rectWidth <= 0) {
        return 0;
      }

      const usableWidth =
        rectWidth - paddingLeft - paddingRight - borderLeft - borderRight;

      return Math.max(0, Math.round(usableWidth));
    };

    // Use weather card content-box width as the authoritative responsive width.
    const weatherCardWidth = readUsableContentWidth(this.weatherCard);
    if (Number.isFinite(weatherCardWidth) && weatherCardWidth > 0) {
      return weatherCardWidth;
    }

    const weatherContentWidth = readUsableContentWidth(this.weatherContent);
    if (Number.isFinite(weatherContentWidth) && weatherContentWidth > 0) {
      return weatherContentWidth;
    }

    const fallbackClientWidth = Number(this.weatherCard.clientWidth) || 0;
    if (Number.isFinite(fallbackClientWidth) && fallbackClientWidth > 0) {
      const cardStyle = window.getComputedStyle(this.weatherCard);
      const paddingLeft = parseFloat(cardStyle.paddingLeft) || 0;
      const paddingRight = parseFloat(cardStyle.paddingRight) || 0;
      return Math.max(
        0,
        Math.round(fallbackClientWidth - paddingLeft - paddingRight),
      );
    }

    return 0;
  }

  getWeatherResponsiveWidth() {
    const measuredWidth = this.measureWeatherCardElementWidth();
    if (measuredWidth > 0) {
      this._weatherCardContentWidth = measuredWidth;
      return measuredWidth;
    }

    const observedWidth = Math.round(
      Number(this._weatherCardContentWidth) || 0,
    );
    if (Number.isFinite(observedWidth) && observedWidth > 0) {
      return observedWidth;
    }

    return 0;
  }

  isWeatherDetailsWrapping() {
    const weatherDetails =
      this.weatherDetails ||
      this.weatherCard?.querySelector(".weather-details") ||
      null;
    if (!weatherDetails) return false;
    if (weatherDetails.clientWidth <= 0) return false;

    const detailItems = Array.from(
      weatherDetails.querySelectorAll(".weather-detail-item"),
    );
    const detailValues = Array.from(
      weatherDetails.querySelectorAll(".weather-detail-value"),
    );

    const detailsComputed = window.getComputedStyle(weatherDetails);
    const detailsDirection = String(detailsComputed.flexDirection || "row");
    const usesColumnFlow = detailsDirection.includes("column");

    let wrappedToSecondRow = false;
    if (!usesColumnFlow && detailItems.length > 1) {
      const firstTop = Math.round(detailItems[0].getBoundingClientRect().top);
      wrappedToSecondRow = detailItems.some(
        (item, index) =>
          index > 0 &&
          Math.abs(Math.round(item.getBoundingClientRect().top) - firstTop) > 1,
      );
    }

    const valueTextWrapped = usesColumnFlow
      ? false
      : detailValues.some((valueEl) => {
          const rects = valueEl.getClientRects();
          return rects && rects.length > 1;
        });

    const detailsOverflowingHorizontally =
      weatherDetails.scrollWidth > weatherDetails.clientWidth + 1;

    return (
      wrappedToSecondRow || valueTextWrapped || detailsOverflowingHorizontally
    );
  }

  syncWeatherResponsiveLayout() {
    if (!this.weatherCard) return;

    const weatherStackBreakpoint = 1134;
    const weatherSingleColumnDetailsBreakpoint = 980;

    const responsiveWidth = this.getWeatherResponsiveWidth();
    if (!Number.isFinite(responsiveWidth) || responsiveWidth <= 0) {
      return;
    }

    // Keep transitions deterministic: only width drives wide/stacked.
    let layoutMode = "wide";
    if (responsiveWidth <= weatherStackBreakpoint) {
      layoutMode = "stacked";
    }

    this.weatherCard.setAttribute("data-weather-layout", layoutMode);

    const detailsLayoutMode =
      layoutMode === "stacked" ||
      responsiveWidth <= weatherSingleColumnDetailsBreakpoint
        ? "single-column"
        : "inline";

    this.weatherCard.setAttribute(
      "data-weather-details-layout",
      detailsLayoutMode,
    );
  }

  updateWeatherLocationTruncation() {
    if (!this.weatherLocation) return;

    this.weatherLocation.classList.remove(
      "weather-location-single-word",
      "weather-location-single-word-tight",
    );
    this.weatherLocation.style.removeProperty(
      "--weather-location-single-word-scale",
    );

    const displayText = String(this.weatherLocation.textContent || "").trim();
    if (!displayText) {
      this.weatherLocation.classList.remove("is-truncated");
      this.weatherLocation.removeAttribute("title");
      return;
    }

    const responsiveWidth = this.getWeatherResponsiveWidth();
    const isSingleWord = !/\s/.test(displayText);
    const isNarrowLayout = responsiveWidth > 0 && responsiveWidth <= 1000;

    let appliedSingleWordShrink = false;
    if (isSingleWord && isNarrowLayout) {
      this.weatherLocation.classList.add("weather-location-single-word");

      const clientWidth = Math.max(
        1,
        Math.round(this.weatherLocation.clientWidth),
      );
      const scrollWidth = Math.max(
        1,
        Math.round(this.weatherLocation.scrollWidth),
      );

      if (scrollWidth > clientWidth + 1) {
        const shrinkScale = Math.max(
          0.5,
          Math.min(1, clientWidth / scrollWidth),
        );

        this.weatherLocation.style.setProperty(
          "--weather-location-single-word-scale",
          shrinkScale.toFixed(4),
        );
        this.weatherLocation.classList.add(
          "weather-location-single-word-tight",
        );
        appliedSingleWordShrink = true;
      }
    }

    const maxLocationCharsBeforeTruncate = 64;
    const isTruncated =
      !appliedSingleWordShrink &&
      displayText.length > maxLocationCharsBeforeTruncate;
    this.weatherLocation.classList.toggle("is-truncated", isTruncated);

    this.weatherLocation.removeAttribute("title");
    this.weatherLocation.removeAttribute("tabindex");
  }
});

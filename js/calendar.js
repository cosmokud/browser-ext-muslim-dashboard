/**
 * Calendar Manager
 * Handles full interactive Hijri and Gregorian calendar display
 */

class CalendarManager {
  constructor(storage, hijriConverter) {
    this.storage = storage;
    this.hijriConverter = hijriConverter;
    this.calendarType = "hijri";
    this.currentDate = new Date();
    this.viewingDate = new Date();

    // DOM elements
    this.container = document.getElementById("calendarContainer");
    this.monthEl = document.getElementById("calendarMonth");
    this.yearEl = document.getElementById("calendarYear");
    this.daysEl = document.getElementById("calendarDays");
    this.prevBtn = document.getElementById("prevMonth");
    this.nextBtn = document.getElementById("nextMonth");
    this.hijriDisplay = document.getElementById("hijriDateDisplay");
    this.gregorianDisplay = document.getElementById("gregorianDateDisplay");
    this.typeBtns = document.querySelectorAll(".calendar-type-btn");

    this.calendarFastTooltipEl = null;
    this.activeFastTooltipDot = null;
    this.fastTooltipEventsBound = false;
  }

  /**
   * Initialize calendar
   */
  init() {
    const settings = this.storage.getSettings();
    this.calendarType = settings.calendarType || "hijri";
    this.hijriAdjustment = settings.hijriAdjustment || 0;

    this.bindEvents();
    this.render();
    this.updateTodayDisplay();
    this.updateActiveTypeBtn();
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    if (this.prevBtn) {
      this.prevBtn.addEventListener("click", () => this.changeMonth(-1));
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener("click", () => this.changeMonth(1));
    }

    this.typeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.calendarType = btn.dataset.type;
        this.updateActiveTypeBtn();
        this.render();
        this.updateTodayDisplay();

        // Save preference
        const settings = this.storage.getSettings();
        settings.calendarType = this.calendarType;
        this.storage.saveSettings(settings);
      });
    });

    this._bindFastingDotTooltipEvents();
  }

  /**
   * Update active type button
   */
  updateActiveTypeBtn() {
    this.typeBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.type === this.calendarType);
    });
  }

  /**
   * Change month
   */
  changeMonth(delta) {
    if (this.calendarType === "hijri") {
      // For Hijri, we approximate by adjusting the viewing date
      this.viewingDate.setDate(this.viewingDate.getDate() + delta * 29.5);
    } else {
      this.viewingDate.setMonth(this.viewingDate.getMonth() + delta);
    }
    this.render();
  }

  /**
   * Go to today
   */
  goToToday() {
    this.viewingDate = new Date();
    this.render();
  }

  /**
   * Render calendar
   */
  render() {
    if (this.calendarType === "hijri") {
      this.renderHijriCalendar();
    } else {
      this.renderGregorianCalendar();
    }
  }

  /**
   * Render Hijri calendar
   */
  renderHijriCalendar() {
    const hijriDate = this.hijriConverter.toHijri(
      this.viewingDate,
      this.hijriAdjustment,
    );
    const { year, month } = hijriDate;

    // Update header
    if (this.monthEl) {
      this.monthEl.textContent = this.hijriConverter.getHijriMonthName(month);
    }
    if (this.yearEl) {
      this.yearEl.textContent = year + " AH";
    }

    // Get days in month
    const daysInMonth = this.hijriConverter.getHijriDaysInMonth(year, month);

    // Get first day of month, aligned with the configured Hijri adjustment.
    const firstDayOfWeek = this._gregorianForDisplayedHijri(
      year,
      month,
      1,
    ).getDay();

    // Get today's Hijri date for highlighting
    const todayHijri = this.hijriConverter.toHijri(
      new Date(),
      this.hijriAdjustment,
    );

    this.renderDays(
      daysInMonth,
      firstDayOfWeek,
      todayHijri.day,
      todayHijri.month === month && todayHijri.year === year,
      {
        type: "hijri",
        hijriYear: year,
        hijriMonth: month,
      },
    );
  }

  /**
   * Render Gregorian calendar
   */
  renderGregorianCalendar() {
    const year = this.viewingDate.getFullYear();
    const month = this.viewingDate.getMonth();

    // Update header
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    if (this.monthEl) {
      this.monthEl.textContent = monthNames[month];
    }
    if (this.yearEl) {
      this.yearEl.textContent = year;
    }

    // Get days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Get first day of month
    const firstDayOfWeek = new Date(year, month, 1).getDay();

    // Check if current month
    const today = new Date();
    const isCurrentMonth =
      today.getFullYear() === year && today.getMonth() === month;
    const todayDay = today.getDate();

    this.renderDays(daysInMonth, firstDayOfWeek, todayDay, isCurrentMonth, {
      type: "gregorian",
      year,
      month,
    });
  }

  /**
   * Render calendar days
   */
  renderDays(daysInMonth, firstDayOfWeek, todayDay, isCurrentPeriod, context) {
    if (!this.daysEl) return;

    let html = "";
    const fastingVisibility = this._getFastingVisibilitySettings();

    // Empty cells before first day
    for (let i = 0; i < firstDayOfWeek; i++) {
      html += '<span class="calendar-day empty"></span>';
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateDetails = this._resolveDateDetails(context, day);
      const isToday = isCurrentPeriod && day === todayDay;
      const isFriday = dateDetails.gregorianDate.getDay() === 5;
      const markers = this._getFastingMarkersForDate(
        dateDetails.gregorianDate,
        dateDetails.hijriDate,
        fastingVisibility,
      );

      let classes = "calendar-day";
      if (isToday) classes += " today";
      if (isFriday) classes += " friday";
      if (markers.length) classes += " has-fast-marks";

      const dotsHtml = this._renderFastingMarkerDots(markers);

      html += `<span class="${classes}"><span class="calendar-day-number">${day}</span>${dotsHtml}</span>`;
    }

    this._hideCalendarFastTooltip();
    this.daysEl.innerHTML = html;
  }

  _resolveDateDetails(context, day) {
    if (context?.type === "hijri") {
      const hijriDate = {
        year: context.hijriYear,
        month: context.hijriMonth,
        day,
      };

      return {
        hijriDate,
        gregorianDate: this._gregorianForDisplayedHijri(
          hijriDate.year,
          hijriDate.month,
          hijriDate.day,
        ),
      };
    }

    const year = Number.isFinite(context?.year)
      ? context.year
      : this.viewingDate.getFullYear();
    const month = Number.isFinite(context?.month)
      ? context.month
      : this.viewingDate.getMonth();
    const gregorianDate = new Date(year, month, day);
    const hijriDate = this.hijriConverter.toHijri(
      gregorianDate,
      this.hijriAdjustment,
    );

    return { gregorianDate, hijriDate };
  }

  _gregorianForDisplayedHijri(hy, hm, hd) {
    const g = this.hijriConverter.toGregorian(hy, hm, hd);
    const shifted = new Date(g.getFullYear(), g.getMonth(), g.getDate());
    shifted.setDate(shifted.getDate() - Number(this.hijriAdjustment || 0));
    return shifted;
  }

  _getFastingVisibilitySettings() {
    const settings = this.storage?.getSettings
      ? this.storage.getSettings()
      : {};
    return settings?.fasting?.visibility || {};
  }

  _getFastingMarkersForDate(gregorianDate, hijriDate, visibility = {}) {
    const markers = [];
    const forbidden = [];

    const hm = Number(hijriDate?.month || 0);
    const hd = Number(hijriDate?.day || 0);
    const dow = gregorianDate.getDay();

    // Forbidden days override all other fasting categories.
    if (hm === 10 && hd === 1) {
      forbidden.push({
        key: "no-fast-eid-fitr",
        label: "No fasting: Eid al-Fitr (1 Shawwal)",
      });
    }
    if (hm === 12 && hd === 10) {
      forbidden.push({
        key: "no-fast-eid-adha",
        label: "No fasting: Eid al-Adha (10 Dhu al-Hijjah)",
      });
    }
    if (hm === 12 && hd >= 11 && hd <= 13) {
      forbidden.push({
        key: "no-fast-tashreeq",
        label: "No fasting: Days of Tashreeq (11-13 Dhu al-Hijjah)",
      });
    }

    if (forbidden.length) return forbidden;

    // During Ramadan, only the Ramadan marker should be shown.
    if (hm === 9) {
      if (visibility.ramadan !== false) {
        return [
          {
            key: "ramadan",
            label: "Ramadan (obligatory fasting month)",
          },
        ];
      }
      return [];
    }

    if (hm === 12 && hd >= 1 && hd <= 9 && visibility.dhuAlHijjah !== false) {
      markers.push({
        key: "dhu-hijjah-first-ten",
        label: "First 9 days of Dhu al-Hijjah",
      });
    }

    if (hm === 12 && hd === 9 && visibility.arafah !== false) {
      markers.push({
        key: "arafah",
        label: "Day of Arafah (9 Dhu al-Hijjah)",
      });
    }

    if (hm === 1 && hd === 9) {
      markers.push({
        key: "tasua",
        label: "Tasu'a (9 Muharram)",
      });
    }

    if (hm === 1 && hd === 10) {
      markers.push({
        key: "ashura",
        label: "Ashura (10 Muharram)",
      });
    }

    if (hm === 10 && hd >= 2) {
      markers.push({
        key: "shawwal-window",
        label: "6 days of Shawwal window",
      });
    }

    if (
      hd >= 13 &&
      hd <= 15 &&
      !(hm === 12 && hd === 13) &&
      visibility.ayyamAlBeed !== false
    ) {
      markers.push({
        key: "white-days",
        label: "Ayyam al-Bid (13th-15th)",
      });
    }

    if (dow === 1 && visibility.monday !== false) {
      markers.push({
        key: "monday",
        label: "Monday fast (weekly sunnah)",
      });
    }

    if (dow === 4 && visibility.thursday !== false) {
      markers.push({
        key: "thursday",
        label: "Thursday fast (weekly sunnah)",
      });
    }

    return markers;
  }

  _renderFastingMarkerDots(markers) {
    if (!Array.isArray(markers) || !markers.length) return "";

    const dots = markers
      .map((marker) => {
        const label = this._escapeAttribute(marker.label);
        const key = String(marker.key || "").replace(/[^a-z0-9-]/gi, "");
        return `<span class="calendar-fast-dot calendar-fast-dot--${key}" data-fast-tooltip="${label}" aria-label="${label}" tabindex="0"></span>`;
      })
      .join("");

    return `<span class="calendar-fast-dots">${dots}</span>`;
  }

  _bindFastingDotTooltipEvents() {
    if (!this.daysEl || this.fastTooltipEventsBound) return;
    this.fastTooltipEventsBound = true;

    this.daysEl.addEventListener("mouseover", (event) => {
      const dot = event.target.closest(".calendar-fast-dot");
      if (!dot || !this.daysEl.contains(dot)) return;
      this._showCalendarFastTooltip(dot, event.clientX, event.clientY);
    });

    this.daysEl.addEventListener("mousemove", (event) => {
      const dot = event.target.closest(".calendar-fast-dot");
      if (!dot || dot !== this.activeFastTooltipDot) return;
      this._positionCalendarFastTooltip(event.clientX, event.clientY);
    });

    this.daysEl.addEventListener("mouseout", (event) => {
      const dot = event.target.closest(".calendar-fast-dot");
      if (!dot || dot !== this.activeFastTooltipDot) return;
      this._hideCalendarFastTooltip();
    });

    this.daysEl.addEventListener("focusin", (event) => {
      const dot = event.target.closest(".calendar-fast-dot");
      if (!dot || !this.daysEl.contains(dot)) return;

      const rect = dot.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      this._showCalendarFastTooltip(dot, x, y);
    });

    this.daysEl.addEventListener("focusout", (event) => {
      const dot = event.target.closest(".calendar-fast-dot");
      if (!dot || dot !== this.activeFastTooltipDot) return;
      this._hideCalendarFastTooltip();
    });

    this.daysEl.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      this._hideCalendarFastTooltip();
    });

    window.addEventListener(
      "scroll",
      () => this._hideCalendarFastTooltip(),
      true,
    );
    window.addEventListener("resize", () => this._hideCalendarFastTooltip());
  }

  _ensureCalendarFastTooltip() {
    if (this.calendarFastTooltipEl) return this.calendarFastTooltipEl;

    const tip = document.createElement("div");
    tip.className = "calendar-fast-tooltip";
    tip.setAttribute("role", "tooltip");
    tip.setAttribute("aria-hidden", "true");
    document.body.appendChild(tip);

    this.calendarFastTooltipEl = tip;
    return tip;
  }

  _tooltipTextForDot(dot) {
    return (
      dot?.getAttribute("data-fast-tooltip") ||
      dot?.getAttribute("aria-label") ||
      ""
    ).trim();
  }

  _showCalendarFastTooltip(dot, clientX, clientY) {
    const text = this._tooltipTextForDot(dot);
    if (!text) {
      this._hideCalendarFastTooltip();
      return;
    }

    const tip = this._ensureCalendarFastTooltip();
    tip.textContent = text;
    tip.classList.add("active");
    tip.setAttribute("aria-hidden", "false");
    this.activeFastTooltipDot = dot;

    this._positionCalendarFastTooltip(clientX, clientY);
  }

  _positionCalendarFastTooltip(clientX, clientY) {
    const tip = this._ensureCalendarFastTooltip();
    if (!tip.classList.contains("active")) return;

    const margin = 12;
    const offsetX = 18;
    const offsetY = 16;
    const tipRect = tip.getBoundingClientRect();

    let left = clientX + offsetX;
    if (left + tipRect.width + margin > window.innerWidth) {
      left = clientX - tipRect.width - offsetX;
    }
    left = Math.max(
      margin,
      Math.min(left, window.innerWidth - tipRect.width - margin),
    );

    let top = clientY - tipRect.height - offsetY;
    let below = false;
    if (top < margin) {
      top = clientY + offsetY;
      below = true;
    }
    top = Math.max(
      margin,
      Math.min(top, window.innerHeight - tipRect.height - margin),
    );

    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(top)}px`;
    tip.classList.toggle("is-below", below);

    const arrowLeft = Math.max(
      12,
      Math.min(clientX - left, tipRect.width - 12),
    );
    tip.style.setProperty(
      "--calendar-fast-tooltip-arrow-left",
      `${Math.round(arrowLeft)}px`,
    );
  }

  _hideCalendarFastTooltip() {
    this.activeFastTooltipDot = null;
    const tip = this.calendarFastTooltipEl;
    if (!tip) return;

    tip.classList.remove("active", "is-below");
    tip.setAttribute("aria-hidden", "true");
  }

  _escapeAttribute(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /**
   * Update today's date display
   */
  updateTodayDisplay() {
    const today = new Date();
    const hijri = this.hijriConverter.toHijri(today, this.hijriAdjustment);

    if (this.hijriDisplay) {
      const hijriMonthName = this.hijriConverter.getHijriMonthName(hijri.month);
      this.hijriDisplay.textContent = `${hijri.day} ${hijriMonthName} ${hijri.year} AH`;
    }

    if (this.gregorianDisplay) {
      const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      this.gregorianDisplay.textContent = today.toLocaleDateString(
        "en-US",
        options,
      );
    }
  }

  /**
   * Set Hijri adjustment
   */
  setHijriAdjustment(days) {
    this.hijriAdjustment = days;
    this.render();
    this.updateTodayDisplay();
  }

  /**
   * Set calendar type
   */
  setCalendarType(type) {
    this.calendarType = type;
    this.updateActiveTypeBtn();
    this.render();
    this.updateTodayDisplay();
  }
}

// Export for use
window.CalendarManager = CalendarManager;

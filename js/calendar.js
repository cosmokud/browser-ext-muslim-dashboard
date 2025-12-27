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
      this.hijriAdjustment
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

    // Get first day of month
    const firstDayOfWeek = this.hijriConverter.getFirstDayOfHijriMonth(
      year,
      month
    );

    // Get today's Hijri date for highlighting
    const todayHijri = this.hijriConverter.toHijri(
      new Date(),
      this.hijriAdjustment
    );

    this.renderDays(
      daysInMonth,
      firstDayOfWeek,
      todayHijri.day,
      todayHijri.month === month && todayHijri.year === year
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

    this.renderDays(daysInMonth, firstDayOfWeek, todayDay, isCurrentMonth);
  }

  /**
   * Render calendar days
   */
  renderDays(daysInMonth, firstDayOfWeek, todayDay, isCurrentPeriod) {
    if (!this.daysEl) return;

    let html = "";

    // Empty cells before first day
    for (let i = 0; i < firstDayOfWeek; i++) {
      html += '<span class="calendar-day empty"></span>';
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = isCurrentPeriod && day === todayDay;
      const isFriday = (firstDayOfWeek + day - 1) % 7 === 5;

      let classes = "calendar-day";
      if (isToday) classes += " today";
      if (isFriday) classes += " friday";

      html += `<span class="${classes}">${day}</span>`;
    }

    this.daysEl.innerHTML = html;
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
        options
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

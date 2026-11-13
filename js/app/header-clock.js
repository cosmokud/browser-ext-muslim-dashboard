/**
 * MuslimDashboard: clock and date in the header.
 * Part of the class declared in js/app/index.js; load this after it.
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
})(MuslimDashboard.prototype, class {

  setCurrentTimeParts(hoursText, minutesText) {
    if (!this.currentTime) return;

    const safeHours = String(hoursText || "00");
    const safeMinutes = String(minutesText || "00");
    const timeText = `${safeHours}:${safeMinutes}`;
    if (this.currentTime.dataset.timeText === timeText) return;
    this.currentTime.dataset.timeText = timeText;

    this.currentTime.innerHTML =
      `<span class="time-hours">${safeHours}</span>` +
      `<span class="time-separator">:</span>` +
      `<span class="time-minutes">${safeMinutes}</span>`;
    this.currentTime.setAttribute("aria-label", timeText);
  }

  updateTime() {
    const now = new Date();
    const settings = this.storage.getSettings();
    const headingSettings = settings.heading || {};
    const clockFormat =
      headingSettings.clockFormat || settings.timeFormat || "24h";
    const is24h = clockFormat === "24h";
    const showAmPm = headingSettings.showAmPm !== false;

    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    if (!is24h) {
      const suffix = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      this.setCurrentTimeParts(String(hours), minutes);

      if (this.currentAmPm) {
        if (showAmPm) {
          this.currentAmPm.textContent = suffix;
          this.currentAmPm.style.display = "";
          this.currentAmPm.setAttribute("aria-hidden", "false");
        } else {
          this.currentAmPm.textContent = "";
          this.currentAmPm.style.display = "none";
          this.currentAmPm.setAttribute("aria-hidden", "true");
        }
      }
    } else {
      this.setCurrentTimeParts(String(hours).padStart(2, "0"), minutes);
      if (this.currentAmPm) {
        this.currentAmPm.textContent = "";
        this.currentAmPm.style.display = "none";
        this.currentAmPm.setAttribute("aria-hidden", "true");
      }
    }

    if (this.currentSeconds) {
      const secondsText = `:${seconds}`;
      if (this.currentSeconds.textContent !== secondsText) {
        this.currentSeconds.textContent = secondsText;
      }
    }

    this.updateHeaderNextPrayer(settings);
  }

  updateHeaderNextPrayer(settings = this.storage.getSettings()) {
    const headingSettings = settings.heading || {};
    const visibility = settings.componentVisibility || {};
    const shouldShow =
      visibility.header !== false &&
      headingSettings.showClock !== false &&
      headingSettings.showNextPrayer === true;

    if (this.headerNextPrayer) {
      const display = shouldShow ? "inline-flex" : "none";
      const ariaHidden = shouldShow ? "false" : "true";
      if (this.headerNextPrayer.style.display !== display) {
        this.headerNextPrayer.style.display = display;
      }
      if (this.headerNextPrayer.getAttribute("aria-hidden") !== ariaHidden) {
        this.headerNextPrayer.setAttribute("aria-hidden", ariaHidden);
      }
    }

    if (!shouldShow) return;

    const nextPrayerInfo =
      this.prayerTimes &&
      typeof this.prayerTimes.getNextPrayerInfo === "function"
        ? this.prayerTimes.getNextPrayerInfo(settings.prayerVisibility)
        : null;

    if (this.headerNextPrayerName) {
      const name = nextPrayerInfo?.name || "Loading...";
      if (this.headerNextPrayerName.textContent !== name) {
        this.headerNextPrayerName.textContent = name;
      }
    }

    if (this.headerNextPrayerCountdown) {
      const countdown = nextPrayerInfo?.countdown || "--:--:--";
      if (this.headerNextPrayerCountdown.textContent !== countdown) {
        this.headerNextPrayerCountdown.textContent = countdown;
      }
    }
  }

  updateDate() {
    const now = new Date();
    const settings = this.storage.getSettings();
    const headingSettings = settings.heading || {};
    const dateCalendar =
      headingSettings.dateCalendar || settings.calendarType || "hijri";
    const legacyShowWeekday = headingSettings.showWeekday;
    const dateFormat = this.normalizeHeadingDateFormat(
      headingSettings.dateFormat || "full",
      legacyShowWeekday,
    );
    const showIslamicEvents = headingSettings.showIslamicEvents !== false;

    let dateText = "";

    if (dateCalendar === "hijri" || dateCalendar === "both") {
      const islamicDay = new IslamicDay(settings);
      const hijriDate = islamicDay.dayFor(now);
      dateText = islamicDay.formatDay(hijriDate, dateFormat, "en");

      // Check for Islamic events
      if (showIslamicEvents) {
        const event = islamicDay.eventFor(hijriDate);
        if (event) {
          dateText += ` • ${event.name}`;
        }
      }

      if (dateCalendar === "both") {
        dateText += " | " + this.formatGregorianDate(now, dateFormat);
      }
    } else {
      dateText = this.formatGregorianDate(now, dateFormat);
    }

    this.dateDisplay.textContent = dateText;
  }
});

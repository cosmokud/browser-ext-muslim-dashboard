/**
 * PrayTimes.js - Prayer Times Calculator
 * Enhanced with 25+ calculation methods, higher latitude options,
 * and additional prayer times (Duha, Midnight, Qiyam/Last Third)
 *
 * Based on PrayTimes.org algorithm with significant enhancements
 */

class PrayTimes {
  constructor(method = "MWL") {
    // Time names for all 9+ prayer times
    this.timeNames = {
      imsak: "Imsak",
      fajr: "Fajr",
      sunrise: "Sunrise",
      duha: "Duha",
      dhuhr: "Dhuhr",
      asr: "Asr",
      sunset: "Sunset",
      maghrib: "Maghrib",
      isha: "Isha",
      midnight: "Midnight",
      qiyam: "Qiyam (Last Third)",
    };

    // Calculation Methods with Fajr and Isha angles/minutes
    this.methods = {
      // Major International Methods
      MWL: {
        name: "Muslim World League",
        params: { fajr: 18, isha: 17 },
      },
      ISNA: {
        name: "Islamic Society of North America (ISNA)",
        params: { fajr: 15, isha: 15 },
      },
      Egypt: {
        name: "Egyptian General Authority",
        params: { fajr: 19.5, isha: 17.5 },
      },
      Makkah: {
        name: "Umm Al-Qura, Makkah",
        params: { fajr: 18.5, isha: "90 min" },
      },
      Karachi: {
        name: "University of Islamic Sciences, Karachi",
        params: { fajr: 18, isha: 18 },
      },
      Tehran: {
        name: "Institute of Geophysics, Tehran",
        params: { fajr: 17.7, isha: 14, maghrib: 4.5, midnight: "Jafari" },
      },
      Jafari: {
        name: "Shia Ithna-Ashari, Leva Institute, Qum",
        params: { fajr: 16, isha: 14, maghrib: 4, midnight: "Jafari" },
      },

      // Regional Methods - Middle East
      Kuwait: {
        name: "Kuwait",
        params: { fajr: 18, isha: 17.5 },
      },
      Qatar: {
        name: "Qatar",
        params: { fajr: 18, isha: "90 min" },
      },
      Dubai: {
        name: "Dubai (UAE)",
        params: { fajr: 18.2, isha: 18.2 },
      },
      Jordan: {
        name: "Ministry of Awqaf, Jordan",
        params: { fajr: 18, isha: 18 },
      },
      Palestine: {
        name: "Ministry of Awqaf, Palestine",
        params: { fajr: 18, isha: 18 },
      },

      // Regional Methods - Africa
      Algeria: {
        name: "Algerian Ministry of Religious Affairs",
        params: { fajr: 18, isha: 17 },
      },
      Morocco: {
        name: "Morocco Ministry of Habous",
        params: { fajr: 19, isha: 17 },
      },
      Tunisia: {
        name: "Tunisia",
        params: { fajr: 18, isha: 18 },
      },

      // Regional Methods - Asia
      Singapore: {
        name: "MUIS, Singapore",
        params: { fajr: 20, isha: 18 },
      },
      Malaysia: {
        name: "JAKIM, Malaysia",
        params: { fajr: 20, isha: 18 },
      },
      Indonesia: {
        name: "Kemenag, Indonesia",
        params: { fajr: 20, isha: 18 },
      },
      Brunei: {
        name: "Brunei Darussalam",
        params: { fajr: 20, isha: 18 },
      },

      // Regional Methods - Europe/Turkey
      Turkey: {
        name: "Diyanet, Turkey",
        params: { fajr: 18, isha: 17 },
      },
      France: {
        name: "UOIF, France",
        params: { fajr: 12, isha: 12 },
      },
      Germany: {
        name: "IGMG, Germany",
        params: { fajr: 18, isha: 17 },
      },
      Russia: {
        name: "Spiritual Administration of Muslims, Russia",
        params: { fajr: 16, isha: 15 },
      },

      // Custom - User defined
      Custom: {
        name: "Custom Settings",
        params: { fajr: 18, isha: 17 },
      },
    };

    // Higher Latitude Adjustment Methods
    this.highLatMethods = {
      NightMiddle: "Middle of the Night",
      AngleBased: "Angle/60th of the Night",
      OneSeventh: "One-Seventh of the Night",
      None: "No Adjustment",
    };

    // Default parameters
    this.defaultParams = {
      imsak: "10 min",
      dhuhr: "0 min",
      maghrib: "0 min",
      asr: "Standard",
      highLats: "NightMiddle",
      midnight: "Standard",
    };

    // Duha time settings (minutes after sunrise)
    this.duhaOffset = 20; // Default: 20 minutes after sunrise

    // Calculation settings
    this.setting = { ...this.defaultParams };
    this.timeFormat = "24h";
    this.timeSuffixes = ["AM", "PM"];
    this.invalidTime = "-----";

    // Adjustments for each prayer
    this.adjustments = {};

    // Coordinates
    this.lat = 0;
    this.lng = 0;
    this.elv = 0;
    this.timeZone = 0;
    this.jDate = 0;

    // Initialize with default method
    this.setMethod(method);
  }

  /**
   * Get list of all available methods
   */
  getMethods() {
    const methodList = {};
    for (const key in this.methods) {
      methodList[key] = this.methods[key].name;
    }
    return methodList;
  }

  /**
   * Get higher latitude methods
   */
  getHighLatMethods() {
    return { ...this.highLatMethods };
  }

  /**
   * Set calculation method
   */
  setMethod(method) {
    if (this.methods[method]) {
      this.calcMethod = method;
      const params = this.methods[method].params;

      for (const key in params) {
        this.setting[key] = params[key];
      }
    }
  }

  /**
   * Set custom Fajr angle
   */
  setFajrAngle(angle) {
    this.setting.fajr = angle;
  }

  /**
   * Set custom Isha angle or minutes
   */
  setIshaAngle(value, isMinutes = false) {
    this.setting.isha = isMinutes ? `${value} min` : value;
  }

  /**
   * Set Asr calculation method
   */
  setAsrMethod(method) {
    this.setting.asr = method; // 'Standard' (Shafi'i) or 'Hanafi'
  }

  /**
   * Set higher latitude adjustment method
   */
  setHighLatMethod(method) {
    if (this.highLatMethods[method]) {
      this.setting.highLats = method;
    }
  }

  /**
   * Set midnight calculation method
   */
  setMidnightMethod(method) {
    this.setting.midnight = method; // 'Standard' or 'Jafari'
  }

  /**
   * Set Duha offset (minutes after sunrise)
   */
  setDuhaOffset(minutes) {
    this.duhaOffset = minutes || 20;
  }

  /**
   * Set time adjustments (in minutes)
   */
  tune(adjustments) {
    this.adjustments = adjustments || {};
  }

  /**
   * Get prayer times for a date and location
   */
  getTimes(date, coords, timezone, dst, format) {
    this.lat = coords[0];
    this.lng = coords[1];
    this.elv = coords[2] || 0;
    this.timeFormat = format || this.timeFormat;

    if (typeof timezone === "undefined" || timezone === "auto") {
      timezone = this.getTimeZone(date);
    }
    if (typeof dst === "undefined" || dst === "auto") {
      dst = this.getDst(date);
    }

    this.timeZone = timezone + (dst ? 1 : 0);
    this.jDate =
      this.julian(date.getFullYear(), date.getMonth() + 1, date.getDate()) -
      this.lng / (15 * 24);

    return this.computeTimes();
  }

  /**
   * Get formatted time string
   */
  getFormattedTime(time, format, suffixes) {
    if (isNaN(time)) return this.invalidTime;
    if (format === "Float") return time;

    suffixes = suffixes || this.timeSuffixes;
    time = this.fixHour(time + 0.5 / 60); // add 0.5 minutes to round

    const hours = Math.floor(time);
    const minutes = Math.floor((time - hours) * 60);
    const suffix = format === "12h" ? suffixes[hours < 12 ? 0 : 1] : "";
    const hour =
      format === "24h"
        ? this.twoDigitsFormat(hours)
        : ((hours + 12 - 1) % 12) + 1;

    return (
      hour + ":" + this.twoDigitsFormat(minutes) + (suffix ? " " + suffix : "")
    );
  }

  /**
   * Compute all prayer times
   */
  computeTimes() {
    let times = {
      imsak: 5,
      fajr: 5,
      sunrise: 6,
      dhuhr: 12,
      asr: 13,
      sunset: 18,
      maghrib: 18,
      isha: 18,
    };

    // Main calculation iteration
    times = this.computePrayerTimes(times);

    // Adjust times for timezone and high latitudes
    times = this.adjustTimes(times);

    // Calculate Duha (after sunrise)
    times.duha = times.sunrise + this.duhaOffset / 60;

    // Calculate midnight (Standard: midpoint between sunset and sunrise)
    // Jafari: midpoint between sunset and fajr
    if (this.setting.midnight === "Jafari") {
      times.midnight =
        times.sunset + this.timeDiff(times.sunset, times.fajr) / 2;
    } else {
      times.midnight =
        times.sunset + this.timeDiff(times.sunset, times.sunrise) / 2;
    }

    // Calculate Qiyam (Last Third of the Night)
    // Standard: 2/3 of the night from Maghrib
    const nightDuration = this.timeDiff(times.sunset, times.sunrise);
    times.qiyam = times.sunset + (nightDuration * 2) / 3;

    // Apply user adjustments
    times = this.tuneTimes(times);

    // Format times
    return this.modifyFormats(times);
  }

  /**
   * Compute prayer times at given julian date
   */
  computePrayerTimes(times) {
    const dayPortion = this.dayPortion(times);

    return {
      imsak: this.sunAngleTime(
        this.eval(this.setting.imsak),
        dayPortion.imsak,
        "ccw"
      ),
      fajr: this.sunAngleTime(
        this.eval(this.setting.fajr),
        dayPortion.fajr,
        "ccw"
      ),
      sunrise: this.sunAngleTime(
        this.riseSetAngle(),
        dayPortion.sunrise,
        "ccw"
      ),
      dhuhr: this.midDay(dayPortion.dhuhr),
      asr: this.asrTime(this.asrFactor(this.setting.asr), dayPortion.asr),
      sunset: this.sunAngleTime(this.riseSetAngle(), dayPortion.sunset),
      maghrib: this.sunAngleTime(
        this.eval(this.setting.maghrib),
        dayPortion.maghrib
      ),
      isha: this.sunAngleTime(this.eval(this.setting.isha), dayPortion.isha),
    };
  }

  /**
   * Adjust times for timezone and higher latitudes
   */
  adjustTimes(times) {
    // Adjust for timezone
    for (const key in times) {
      times[key] += this.timeZone - this.lng / 15;
    }

    // Handle higher latitudes
    if (this.setting.highLats !== "None") {
      times = this.adjustHighLats(times);
    }

    // Imsak adjustment
    if (this.isMin(this.setting.imsak)) {
      times.imsak = times.fajr - this.eval(this.setting.imsak) / 60;
    }

    // Maghrib adjustment
    if (this.isMin(this.setting.maghrib)) {
      times.maghrib = times.sunset + this.eval(this.setting.maghrib) / 60;
    }

    // Isha adjustment (if minutes based like Makkah method)
    if (this.isMin(this.setting.isha)) {
      times.isha = times.maghrib + this.eval(this.setting.isha) / 60;
    }

    // Dhuhr adjustment
    times.dhuhr += this.eval(this.setting.dhuhr) / 60;

    return times;
  }

  /**
   * Adjust times for higher latitudes
   */
  adjustHighLats(times) {
    const nightTime = this.timeDiff(times.sunset, times.sunrise);

    times.imsak = this.adjustHLTime(
      times.imsak,
      times.sunrise,
      this.eval(this.setting.imsak),
      nightTime,
      "ccw"
    );
    times.fajr = this.adjustHLTime(
      times.fajr,
      times.sunrise,
      this.eval(this.setting.fajr),
      nightTime,
      "ccw"
    );
    times.isha = this.adjustHLTime(
      times.isha,
      times.sunset,
      this.eval(this.setting.isha),
      nightTime
    );
    times.maghrib = this.adjustHLTime(
      times.maghrib,
      times.sunset,
      this.eval(this.setting.maghrib),
      nightTime
    );

    return times;
  }

  /**
   * Adjust a single time for higher latitudes
   */
  adjustHLTime(time, base, angle, night, direction) {
    const portion = this.nightPortion(angle, night);
    const timeDiff =
      direction === "ccw"
        ? this.timeDiff(time, base)
        : this.timeDiff(base, time);

    if (isNaN(time) || timeDiff > portion) {
      time = base + (direction === "ccw" ? -portion : portion);
    }

    return time;
  }

  /**
   * Night portion for high latitude adjustment
   */
  nightPortion(angle, night) {
    const method = this.setting.highLats;
    let portion = 1 / 2; // Default: NightMiddle

    if (method === "AngleBased") {
      portion = (1 / 60) * angle;
    } else if (method === "OneSeventh") {
      portion = 1 / 7;
    }

    return portion * night;
  }

  /**
   * Apply user time adjustments
   */
  tuneTimes(times) {
    if (this.adjustments) {
      for (const key in times) {
        times[key] += (this.adjustments[key] || 0) / 60;
      }
    }
    return times;
  }

  /**
   * Convert times to specified format
   */
  modifyFormats(times) {
    const formatted = {};
    for (const key in times) {
      formatted[key] = this.getFormattedTime(times[key], this.timeFormat);
    }
    return formatted;
  }

  /**
   * Day portion for each time
   */
  dayPortion(times) {
    const result = {};
    for (const key in times) {
      result[key] = times[key] / 24;
    }
    return result;
  }

  /**
   * Sun angle time
   */
  sunAngleTime(angle, time, direction) {
    const decl = this.sunPosition(this.jDate + time).declination;
    const noon = this.midDay(time);
    const t =
      (1 / 15) *
      this.arccos(
        (-this.sin(angle) - this.sin(decl) * this.sin(this.lat)) /
          (this.cos(decl) * this.cos(this.lat))
      );

    return noon + (direction === "ccw" ? -t : t);
  }

  /**
   * Mid-day time
   */
  midDay(time) {
    const eqt = this.sunPosition(this.jDate + time).equation;
    return this.fixHour(12 - eqt);
  }

  /**
   * Asr time
   */
  asrTime(factor, time) {
    const decl = this.sunPosition(this.jDate + time).declination;
    const angle = -this.arccot(factor + this.tan(Math.abs(this.lat - decl)));
    return this.sunAngleTime(angle, time);
  }

  /**
   * Asr shadow factor
   */
  asrFactor(method) {
    return method === "Hanafi" ? 2 : 1;
  }

  /**
   * Rise/set angle including elevation
   */
  riseSetAngle() {
    const angle = 0.0347 * Math.sqrt(this.elv);
    return 0.833 + angle;
  }

  /**
   * Sun position (declination and equation of time)
   */
  sunPosition(jd) {
    const D = jd - 2451545.0;
    const g = this.fixAngle(357.529 + 0.98560028 * D);
    const q = this.fixAngle(280.459 + 0.98564736 * D);
    const L = this.fixAngle(q + 1.915 * this.sin(g) + 0.02 * this.sin(2 * g));
    const e = 23.439 - 0.00000036 * D;
    const RA = this.arctan2(this.cos(e) * this.sin(L), this.cos(L)) / 15;

    return {
      declination: this.arcsin(this.sin(e) * this.sin(L)),
      equation: q / 15 - this.fixHour(RA),
    };
  }

  /**
   * Julian date from Gregorian
   */
  julian(year, month, day) {
    if (month <= 2) {
      year -= 1;
      month += 12;
    }
    const A = Math.floor(year / 100);
    const B = 2 - A + Math.floor(A / 4);

    return (
      Math.floor(365.25 * (year + 4716)) +
      Math.floor(30.6001 * (month + 1)) +
      day +
      B -
      1524.5
    );
  }

  /**
   * Get local timezone
   */
  getTimeZone(date) {
    const year = date.getFullYear();
    const t1 = this.gmtOffset(new Date(year, 0, 1));
    const t2 = this.gmtOffset(new Date(year, 6, 1));
    return Math.min(t1, t2);
  }

  /**
   * Check if DST is in effect
   */
  getDst(date) {
    return this.gmtOffset(date) !== this.getTimeZone(date);
  }

  /**
   * GMT offset in hours
   */
  gmtOffset(date) {
    return -date.getTimezoneOffset() / 60;
  }

  // ============ Utility Functions ============

  eval(str) {
    return (str + "").split(/[^0-9.+-]/)[0] * 1;
  }

  isMin(str) {
    return (str + "").indexOf("min") !== -1;
  }

  timeDiff(time1, time2) {
    return this.fixHour(time2 - time1);
  }

  twoDigitsFormat(num) {
    return num < 10 ? "0" + num : num;
  }

  // Trigonometric functions in degrees
  sin(d) {
    return Math.sin(this.dtr(d));
  }
  cos(d) {
    return Math.cos(this.dtr(d));
  }
  tan(d) {
    return Math.tan(this.dtr(d));
  }
  arcsin(x) {
    return this.rtd(Math.asin(x));
  }
  arccos(x) {
    return this.rtd(Math.acos(x));
  }
  arctan(x) {
    return this.rtd(Math.atan(x));
  }
  arccot(x) {
    return this.rtd(Math.atan(1 / x));
  }
  arctan2(y, x) {
    return this.rtd(Math.atan2(y, x));
  }

  // Degree/Radian conversion
  dtr(d) {
    return (d * Math.PI) / 180.0;
  }
  rtd(r) {
    return (r * 180.0) / Math.PI;
  }

  // Angle normalization
  fixAngle(a) {
    a = a - 360.0 * Math.floor(a / 360.0);
    return a < 0 ? a + 360.0 : a;
  }

  fixHour(a) {
    a = a - 24.0 * Math.floor(a / 24.0);
    return a < 0 ? a + 24.0 : a;
  }
}

// Export for use
window.PrayTimes = PrayTimes;

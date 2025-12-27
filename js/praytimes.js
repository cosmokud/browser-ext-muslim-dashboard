/**
 * PrayTimes.js - Prayer Times Calculator
 * Based on PrayTimes library by Hamid Zarrabi-Zadeh
 * http://praytimes.org/
 *
 * Adapted and optimized for Muslim Dashboard Extension
 */

class PrayTimes {
  constructor(method = "MWL") {
    // Time Names
    this.timeNames = {
      imsak: "Imsak",
      fajr: "Fajr",
      sunrise: "Sunrise",
      dhuhr: "Dhuhr",
      asr: "Asr",
      sunset: "Sunset",
      maghrib: "Maghrib",
      isha: "Isha",
      midnight: "Midnight",
    };

    // Calculation Methods
    this.methods = {
      MWL: {
        name: "Muslim World League",
        params: { fajr: 18, isha: 17 },
      },
      ISNA: {
        name: "Islamic Society of North America",
        params: { fajr: 15, isha: 15 },
      },
      Egypt: {
        name: "Egyptian General Authority of Survey",
        params: { fajr: 19.5, isha: 17.5 },
      },
      Makkah: {
        name: "Umm Al-Qura University, Makkah",
        params: { fajr: 18.5, isha: "90 min" },
      },
      Karachi: {
        name: "University of Islamic Sciences, Karachi",
        params: { fajr: 18, isha: 18 },
      },
      Tehran: {
        name: "Institute of Geophysics, University of Tehran",
        params: { fajr: 17.7, isha: 14, maghrib: 4.5, midnight: "Jafari" },
      },
      Jafari: {
        name: "Shia Ithna-Ashari, Leva Institute, Qum",
        params: { fajr: 16, isha: 14, maghrib: 4, midnight: "Jafari" },
      },
    };

    // Default Parameters
    this.defaultParams = {
      maghrib: "0 min",
      midnight: "Standard",
    };

    // Settings
    this.setting = {
      imsak: "10 min",
      dhuhr: "0 min",
      asr: "Standard",
      highLats: "NightMiddle",
    };

    // Time Format
    this.timeFormat = "24h";
    this.timeSuffixes = ["am", "pm"];
    this.invalidTime = "-----";

    // Coordinates
    this.lat = 0;
    this.lng = 0;
    this.elv = 0;
    this.timeZone = 0;
    this.jDate = 0;

    // Initialize with method
    this.setMethod(method);
  }

  // Set calculation method
  setMethod(method) {
    if (this.methods[method]) {
      this.calcMethod = method;
      const params = this.methods[method].params;
      for (let id in params) {
        this.setting[id] = params[id];
      }
    }
  }

  // Set asr juristic method
  setAsrMethod(method) {
    this.setting.asr = method === "Hanafi" ? "Hanafi" : "Standard";
  }

  // Adjust times by minutes
  adjust(times) {
    for (let i in times) {
      times[i] += (this.adjustments[i] || 0) / 60;
    }
    return times;
  }

  // Set adjustments
  tune(adjustments) {
    this.adjustments = adjustments;
  }

  // Get prayer times
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

  // Get formatted time
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

  // Compute prayer times
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

    // Main iterations
    for (let i = 1; i <= 1; i++) {
      times = this.computePrayerTimes(times);
    }

    times = this.adjustTimes(times);

    // Add midnight
    times.midnight =
      this.setting.midnight === "Jafari"
        ? times.sunset + this.timeDiff(times.sunset, times.fajr) / 2
        : times.sunset + this.timeDiff(times.sunset, times.sunrise) / 2;

    times = this.tuneTimes(times);
    return this.modifyFormats(times);
  }

  // Compute prayer times at given julian date
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

  // Adjust times
  adjustTimes(times) {
    for (let i in times) {
      times[i] += this.timeZone - this.lng / 15;
    }

    if (this.setting.highLats !== "None") {
      times = this.adjustHighLats(times);
    }

    if (this.isMin(this.setting.imsak)) {
      times.imsak = times.fajr - this.eval(this.setting.imsak) / 60;
    }
    if (this.isMin(this.setting.maghrib)) {
      times.maghrib = times.sunset + this.eval(this.setting.maghrib) / 60;
    }
    if (this.isMin(this.setting.isha)) {
      times.isha = times.maghrib + this.eval(this.setting.isha) / 60;
    }

    times.dhuhr += this.eval(this.setting.dhuhr) / 60;

    return times;
  }

  // Adjust times for higher latitudes
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

  // Adjust time for higher latitudes
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

  // Night portion for high latitude adjustment
  nightPortion(angle, night) {
    const method = this.setting.highLats;
    let portion = 1 / 2; // MidNight

    if (method === "AngleBased") {
      portion = (1 / 60) * angle;
    }
    if (method === "OneSeventh") {
      portion = 1 / 7;
    }

    return portion * night;
  }

  // Apply offset to times
  tuneTimes(times) {
    if (this.adjustments) {
      for (let i in times) {
        times[i] += (this.adjustments[i] || 0) / 60;
      }
    }
    return times;
  }

  // Convert times to given format
  modifyFormats(times) {
    for (let i in times) {
      times[i] = this.getFormattedTime(times[i], this.timeFormat);
    }
    return times;
  }

  // Day portion
  dayPortion(times) {
    const result = {};
    for (let i in times) {
      result[i] = times[i] / 24;
    }
    return result;
  }

  // Sun angle
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

  // Mid-day time
  midDay(time) {
    const eqt = this.sunPosition(this.jDate + time).equation;
    const noon = this.fixHour(12 - eqt);
    return noon;
  }

  // Asr time
  asrTime(factor, time) {
    const decl = this.sunPosition(this.jDate + time).declination;
    const angle = -this.arccot(factor + this.tan(Math.abs(this.lat - decl)));
    return this.sunAngleTime(angle, time);
  }

  // Asr factor
  asrFactor(method) {
    return method === "Hanafi" ? 2 : 1;
  }

  // Rise/set angle
  riseSetAngle() {
    const angle = 0.0347 * Math.sqrt(this.elv);
    return 0.833 + angle;
  }

  // Sun position
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

  // Julian date
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

  // Get timezone
  getTimeZone(date) {
    const year = date.getFullYear();
    const t1 = this.gmtOffset(new Date(year, 0, 1));
    const t2 = this.gmtOffset(new Date(year, 6, 1));
    return Math.min(t1, t2);
  }

  // Get DST
  getDst(date) {
    return this.gmtOffset(date) !== this.getTimeZone(date);
  }

  // GMT offset
  gmtOffset(date) {
    return -date.getTimezoneOffset() / 60;
  }

  // Helper functions
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

  // Trigonometric functions
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
  dtr(d) {
    return (d * Math.PI) / 180.0;
  }
  rtd(r) {
    return (r * 180.0) / Math.PI;
  }

  // Angle functions
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

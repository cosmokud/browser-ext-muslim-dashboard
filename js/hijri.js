/**
 * Hijri Calendar Converter
 * Converts between Gregorian and Islamic (Hijri) calendar
 * Based on the Umm al-Qura calendar
 */

class HijriDate {
  constructor() {
    // Islamic month names
    this.monthNames = {
      ar: [
        "محرم",
        "صفر",
        "ربيع الأول",
        "ربيع الثاني",
        "جمادى الأولى",
        "جمادى الآخرة",
        "رجب",
        "شعبان",
        "رمضان",
        "شوال",
        "ذو القعدة",
        "ذو الحجة",
      ],
      en: [
        "Muharram",
        "Safar",
        "Rabi al-Awwal",
        "Rabi al-Thani",
        "Jumada al-Awwal",
        "Jumada al-Thani",
        "Rajab",
        "Sha'ban",
        "Ramadan",
        "Shawwal",
        "Dhu al-Qi'dah",
        "Dhu al-Hijjah",
      ],
    };

    // Day names
    this.dayNames = {
      ar: [
        "الأحد",
        "الإثنين",
        "الثلاثاء",
        "الأربعاء",
        "الخميس",
        "الجمعة",
        "السبت",
      ],
      en: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
    };

    // Islamic day names
    this.islamicDayNames = {
      ar: [
        "يوم الأحد",
        "يوم الإثنين",
        "يوم الثلاثاء",
        "يوم الأربعاء",
        "يوم الخميس",
        "يوم الجمعة",
        "يوم السبت",
      ],
      en: [
        "Yawm al-Ahad",
        "Yawm al-Ithnayn",
        "Yawm ath-Thulatha'",
        "Yawm al-Arba'a'",
        "Yawm al-Khamis",
        "Yawm al-Jumu'ah",
        "Yawm as-Sabt",
      ],
    };
  }

  /**
   * Convert Gregorian date to Hijri date
   * @param {Date} date - Gregorian date
   * @param {number} adjustment - Days to adjust (default 0)
   * @returns {Object} - Hijri date object
   */
  toHijri(date, adjustment = 0) {
    const gd = date.getDate();
    const gm = date.getMonth() + 1;
    const gy = date.getFullYear();

    // Apply adjustment
    const adjustedDate = new Date(date);
    adjustedDate.setDate(adjustedDate.getDate() + adjustment);

    // Calculate Julian Day Number
    let jd = this.gregorianToJulian(
      adjustedDate.getFullYear(),
      adjustedDate.getMonth() + 1,
      adjustedDate.getDate()
    );

    // Convert to Hijri
    const hijri = this.julianToHijri(jd);

    return {
      year: hijri.year,
      month: hijri.month,
      day: hijri.day,
      dayOfWeek: adjustedDate.getDay(),
      monthName: this.monthNames.en[hijri.month - 1],
      monthNameAr: this.monthNames.ar[hijri.month - 1],
      dayName: this.dayNames.en[adjustedDate.getDay()],
      dayNameAr: this.dayNames.ar[adjustedDate.getDay()],
    };
  }

  /**
   * Convert Hijri date to Gregorian date
   * @param {number} hy - Hijri year
   * @param {number} hm - Hijri month
   * @param {number} hd - Hijri day
   * @returns {Date} - Gregorian date
   */
  toGregorian(hy, hm, hd) {
    const jd = this.hijriToJulian(hy, hm, hd);
    const greg = this.julianToGregorian(jd);
    return new Date(greg.year, greg.month - 1, greg.day);
  }

  /**
   * Convert Gregorian date to Julian Day Number
   */
  gregorianToJulian(year, month, day) {
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
   * Convert Julian Day Number to Hijri date
   */
  julianToHijri(jd) {
    jd = Math.floor(jd) + 0.5;
    const l = jd - 1948439.5 + 10632;
    const n = Math.floor((l - 1) / 10631);
    const l2 = l - 10631 * n + 354;
    const j =
      Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
      Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
    const l3 =
      l2 -
      Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
      Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
      29;
    const month = Math.floor((24 * l3) / 709);
    const day = l3 - Math.floor((709 * month) / 24);
    const year = 30 * n + j - 30;

    return { year, month, day };
  }

  /**
   * Convert Hijri date to Julian Day Number
   */
  hijriToJulian(year, month, day) {
    return (
      Math.floor((11 * year + 3) / 30) +
      354 * year +
      30 * month -
      Math.floor((month - 1) / 2) +
      day +
      1948440 -
      385
    );
  }

  /**
   * Convert Julian Day Number to Gregorian date
   */
  julianToGregorian(jd) {
    const z = Math.floor(jd + 0.5);
    const a = Math.floor((z - 1867216.25) / 36524.25);
    const aa = z + 1 + a - Math.floor(a / 4);
    const b = aa + 1524;
    const c = Math.floor((b - 122.1) / 365.25);
    const d = Math.floor(365.25 * c);
    const e = Math.floor((b - d) / 30.6001);

    const day = b - d - Math.floor(30.6001 * e);
    const month = e < 14 ? e - 1 : e - 13;
    const year = month > 2 ? c - 4716 : c - 4715;

    return { year, month, day };
  }

  /**
   * Format Hijri date
   * @param {Object} hijriDate - Hijri date object
   * @param {string} format - Format string
   * @param {string} lang - Language (en/ar)
   */
  format(hijriDate, format = "full", lang = "en") {
    const day = hijriDate.day;
    const month = lang === "ar" ? hijriDate.monthNameAr : hijriDate.monthName;
    const year = hijriDate.year;
    const dayName = lang === "ar" ? hijriDate.dayNameAr : hijriDate.dayName;

    const monthShort =
      lang === "ar" ? month : String(month).replace(/\s+/g, " ").slice(0, 3);
    const dayNameShort = lang === "ar" ? dayName : String(dayName).slice(0, 3);

    switch (format) {
      case "full-weekday":
        return `${dayName}, ${day} ${month} ${year} AH`;
      case "full":
      case "long":
        return `${day} ${month} ${year} AH`;
      case "medium-weekday":
        return `${dayNameShort}, ${day} ${monthShort} ${year} AH`;
      case "medium":
        return `${day} ${monthShort} ${year} AH`;
      case "short":
        return `${day}/${hijriDate.month}/${year}`;
      case "month-year":
        return `${month} ${year} AH`;
      default:
        return `${day} ${month} ${year} AH`;
    }
  }

  /**
   * Format Gregorian date
   */
  formatGregorian(date, format = "full") {
    const options = {
      full: { weekday: "long", year: "numeric", month: "long", day: "numeric" },
      long: { year: "numeric", month: "long", day: "numeric" },
      short: { year: "numeric", month: "numeric", day: "numeric" },
      "month-year": { year: "numeric", month: "long" },
    };

    return date.toLocaleDateString("en-US", options[format] || options.full);
  }

  /**
   * Get important Islamic dates
   */
  getIslamicEvents(hijriYear) {
    return [
      {
        month: 1,
        day: 1,
        name: "Islamic New Year",
        nameAr: "رأس السنة الهجرية",
      },
      { month: 1, day: 10, name: "Day of Ashura", nameAr: "يوم عاشوراء" },
      { month: 3, day: 12, name: "Mawlid al-Nabi", nameAr: "المولد النبوي" },
      {
        month: 7,
        day: 27,
        name: "Isra and Mi'raj",
        nameAr: "الإسراء والمعراج",
      },
      { month: 8, day: 15, name: "Mid-Sha'ban", nameAr: "ليلة النصف من شعبان" },
      { month: 9, day: 1, name: "Beginning of Ramadan", nameAr: "بداية رمضان" },
      {
        month: 9,
        day: 27,
        name: "Laylat al-Qadr (estimated)",
        nameAr: "ليلة القدر",
      },
      { month: 10, day: 1, name: "Eid al-Fitr", nameAr: "عيد الفطر" },
      { month: 12, day: 9, name: "Day of Arafah", nameAr: "يوم عرفة" },
      { month: 12, day: 10, name: "Eid al-Adha", nameAr: "عيد الأضحى" },
    ];
  }

  /**
   * Check if today is a special Islamic day
   */
  getTodayEvent(hijriDate) {
    const events = this.getIslamicEvents(hijriDate.year);
    return events.find(
      (e) => e.month === hijriDate.month && e.day === hijriDate.day
    );
  }

  /**
   * Get Hijri month name by month number (1-12)
   * @param {number} month - Month number (1-12)
   * @param {string} lang - Language (en/ar)
   * @returns {string} Month name
   */
  getHijriMonthName(month, lang = "en") {
    const index = Math.max(0, Math.min(11, month - 1));
    return this.monthNames[lang][index];
  }

  /**
   * Get number of days in a Hijri month
   * Uses the tabular Islamic calendar (30-year cycle)
   * @param {number} year - Hijri year
   * @param {number} month - Hijri month (1-12)
   * @returns {number} Number of days (29 or 30)
   */
  getHijriDaysInMonth(year, month) {
    // Odd months have 30 days, even months have 29 days
    // Exception: Month 12 has 30 days in leap years
    if (month % 2 === 1) {
      return 30; // Odd months: 30 days
    } else if (month === 12) {
      // Check if leap year (years 2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29 in 30-year cycle)
      const leapYears = [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29];
      const yearInCycle = ((year - 1) % 30) + 1;
      return leapYears.includes(yearInCycle) ? 30 : 29;
    } else {
      return 29; // Even months (except 12): 29 days
    }
  }

  /**
   * Get first day of Hijri month (day of week: 0=Sunday, 6=Saturday)
   * @param {number} year - Hijri year
   * @param {number} month - Hijri month (1-12)
   * @returns {number} Day of week (0-6)
   */
  getFirstDayOfHijriMonth(year, month) {
    // Convert first day of Hijri month to Gregorian to get day of week
    const jd = this.hijriToJulian(year, month, 1);
    const gregDate = this.julianToGregorian(jd);
    const date = new Date(gregDate.year, gregDate.month - 1, gregDate.day);
    return date.getDay();
  }

  /**
   * Convert Hijri date to Gregorian date object
   * @param {number} year - Hijri year
   * @param {number} month - Hijri month (1-12)
   * @param {number} day - Hijri day
   * @returns {Object} Gregorian date {year, month, day}
   */
  hijriToGregorian(year, month, day) {
    const jd = this.hijriToJulian(year, month, day);
    return this.julianToGregorian(jd);
  }

  /**
   * Get Gregorian month name
   * @param {number} month - Month number (1-12)
   * @returns {string} Month name
   */
  getGregorianMonthName(month) {
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
    return monthNames[Math.max(0, Math.min(11, month - 1))];
  }

  /**
   * Get first day of Gregorian month (day of week: 0=Sunday, 6=Saturday)
   * @param {number} year - Gregorian year
   * @param {number} month - Gregorian month (1-12)
   * @returns {number} Day of week (0-6)
   */
  getFirstDayOfGregorianMonth(year, month) {
    return new Date(year, month - 1, 1).getDay();
  }

  /**
   * Get number of days in a Gregorian month
   * @param {number} year - Gregorian year
   * @param {number} month - Gregorian month (1-12)
   * @returns {number} Number of days
   */
  getGregorianDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }
}

// Export for use
window.HijriDate = HijriDate;

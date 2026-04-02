/*
 * MV3 Service Worker
 * Schedules prayer-time notifications using chrome.alarms + chrome.notifications.
 */

/* global PrayTimes */

importScripts("praytimes.js");

const RESCHEDULE_ALARM_NAME = "md_reschedule";
const PRAYER_ALARM_PREFIX = "md_prayer_";
const FASTING_ALARM_NAME = "md_fasting_suhur";
const BADGE_TICK_ALARM_NAME = "md_badge_tick";

// If a device sleeps, Chrome may deliver missed alarms immediately on wake.
// Suppress notifications that are *too late* to avoid spamming.
const MAX_ALARM_LATE_MS = 5 * 60 * 1000;

const STORAGE_KEYS = {
  settings: "md_settings",
  lastLocation: "md_lastLocation",
};

const PRAYER_DEFS = [
  { key: "fajr", name: "Fajr" },
  { key: "sunrise", name: "Sunrise" },
  { key: "duha", name: "Duha" },
  { key: "dhuhr", name: "Dhuhr" },
  { key: "asr", name: "Asr" },
  { key: "maghrib", name: "Maghrib" },
  { key: "isha", name: "Isha" },
  { key: "midnight", name: "Midnight" },
  { key: "qiyam", name: "Qiyam" },
];

const DEFAULT_PRAYER_VISIBILITY = {
  fajr: true,
  sunrise: true,
  duha: false,
  dhuhr: true,
  asr: true,
  maghrib: true,
  isha: true,
  midnight: false,
  qiyam: false,
};

function storageGet(keys) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(keys, (result) => resolve(result || {}));
    } catch (e) {
      resolve({});
    }
  });
}

function storageSet(obj) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set(obj, () => resolve());
    } catch (e) {
      resolve();
    }
  });
}

function alarmsGetAll() {
  return new Promise((resolve) => {
    try {
      chrome.alarms.getAll((alarms) =>
        resolve(Array.isArray(alarms) ? alarms : []),
      );
    } catch (e) {
      resolve([]);
    }
  });
}

function alarmsClear(name) {
  return new Promise((resolve) => {
    try {
      chrome.alarms.clear(name, () => resolve());
    } catch (e) {
      resolve();
    }
  });
}

function alarmsCreate(name, alarmInfo) {
  try {
    chrome.alarms.create(name, alarmInfo);
  } catch (e) {
    // ignore
  }
}

function getVisiblePrayerDefs(settings) {
  const rawVisibility =
    settings?.prayerVisibility && typeof settings.prayerVisibility === "object"
      ? settings.prayerVisibility
      : {};

  const visibility = {
    ...DEFAULT_PRAYER_VISIBILITY,
    ...rawVisibility,
  };

  return PRAYER_DEFS.filter((def) => visibility[def.key] === true);
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function isStaleAlarm(alarm, maxLateMs) {
  const scheduledTime = alarm?.scheduledTime;
  if (!Number.isFinite(scheduledTime)) return false;

  const lateMs = Date.now() - scheduledTime;
  return lateMs > maxLateMs;
}

function toISODateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseTimeToDate(timeStr, baseDate) {
  if (!timeStr || timeStr === "-----") return null;

  const match = String(timeStr).match(/(\d+):(\d+)/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  const normalized = String(timeStr).toUpperCase();
  const hasAM = normalized.includes("AM");
  const hasPM = normalized.includes("PM");

  if (hasPM && hours !== 12) hours += 12;
  if (hasAM && hours === 12) hours = 0;

  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    hours,
    minutes,
    0,
    0,
  );
}

function configurePrayTimes(prayTimes, settings) {
  prayTimes.setMethod(settings.calculationMethod || "MWL");

  if (settings.calculationMethod === "Custom") {
    prayTimes.setFajrAngle(settings.customFajrAngle ?? 18);
    prayTimes.setIshaAngle(
      settings.customIshaAngle ?? 17,
      settings.customIshaMinutes ?? false,
    );
  }

  prayTimes.setAsrMethod(settings.asrMethod || "Standard");
  prayTimes.setHighLatMethod(settings.highLatMethod || "None");
  prayTimes.setMidnightMethod(settings.midnightMethod || "Standard");
  prayTimes.setDuhaOffset(settings.duhaOffset ?? 20);

  if (settings.adjustments && typeof settings.adjustments === "object") {
    prayTimes.tune(settings.adjustments);
  }
}

function pickLocation(settings, lastLocation) {
  if (
    settings.locationMethod === "manual" &&
    Number.isFinite(Number(settings.latitude)) &&
    Number.isFinite(Number(settings.longitude))
  ) {
    return {
      latitude: Number(settings.latitude),
      longitude: Number(settings.longitude),
      city: settings.city || "Custom Location",
    };
  }

  if (
    lastLocation &&
    Number.isFinite(Number(lastLocation.latitude)) &&
    Number.isFinite(Number(lastLocation.longitude))
  ) {
    return {
      latitude: Number(lastLocation.latitude),
      longitude: Number(lastLocation.longitude),
      city: lastLocation.city || "Last Location",
    };
  }

  // Default: Mecca
  return { latitude: 21.4225, longitude: 39.8262, city: "Mecca (Default)" };
}

async function clearPrayerAlarms() {
  const alarms = await alarmsGetAll();
  const toClear = alarms
    .map((a) => a && a.name)
    .filter(
      (name) =>
        typeof name === "string" && name.startsWith(PRAYER_ALARM_PREFIX),
    );

  for (const name of toClear) {
    // eslint-disable-next-line no-await-in-loop
    await alarmsClear(name);
  }
}

function scheduleDailyRescheduleAlarm(now = new Date()) {
  const next = new Date(now);
  next.setDate(now.getDate() + 1);
  next.setHours(0, 5, 0, 0); // 00:05 local time
  alarmsCreate(RESCHEDULE_ALARM_NAME, { when: next.getTime() });
}

function getPrayerNotificationsSettings(settings) {
  const pn =
    settings.prayerNotifications &&
    typeof settings.prayerNotifications === "object"
      ? settings.prayerNotifications
      : {};

  const defaultBeforeMinutes = clampNumber(pn.beforeMinutes, 0, 180, 10);
  const defaultAfterMinutes = clampNumber(pn.afterMinutes, 0, 180, 0);

  const perPrayerRaw =
    pn.perPrayer && typeof pn.perPrayer === "object" ? pn.perPrayer : null;

  const perPrayer = perPrayerRaw ? {} : null;
  if (perPrayerRaw) {
    for (const def of PRAYER_DEFS) {
      const entry = perPrayerRaw[def.key];

      // Legacy shape: boolean per prayer.
      if (typeof entry === "boolean") {
        perPrayer[def.key] = {
          enabled: entry === true,
          beforeMinutes: defaultBeforeMinutes,
          afterMinutes: defaultAfterMinutes,
          atTimeEnabled: true,
        };
        continue;
      }

      // New shape: object per prayer.
      if (entry && typeof entry === "object") {
        perPrayer[def.key] = {
          enabled: entry.enabled === true,
          beforeMinutes: clampNumber(
            entry.beforeMinutes,
            0,
            180,
            defaultBeforeMinutes,
          ),
          afterMinutes: clampNumber(
            entry.afterMinutes,
            0,
            180,
            defaultAfterMinutes,
          ),
          atTimeEnabled: true,
        };
      }
    }
  }

  return {
    enabled: Boolean(pn.enabled),
    defaultBeforeMinutes,
    defaultAfterMinutes,
    // at-time notification always on when enabled
    atTimeEnabled: true,
    perPrayer,
  };
}

function getPrayerNotificationConfig(prayerKey, settings, pn) {
  if (!pn.enabled) return null;

  // If user explicitly configured perPrayer, use it.
  if (pn.perPrayer) {
    const cfg = pn.perPrayer[prayerKey];
    if (!cfg || cfg.enabled !== true) return null;
    return cfg;
  }

  // Fallback: notify for visible prayers, using defaults.
  const vis =
    settings.prayerVisibility && typeof settings.prayerVisibility === "object"
      ? settings.prayerVisibility
      : {};
  if (vis[prayerKey] !== true) return null;

  return {
    enabled: true,
    beforeMinutes: pn.defaultBeforeMinutes,
    afterMinutes: pn.defaultAfterMinutes,
    atTimeEnabled: true,
  };
}

async function schedulePrayerNotifications() {
  const {
    [STORAGE_KEYS.settings]: settingsRaw,
    [STORAGE_KEYS.lastLocation]: lastLocationRaw,
  } = await storageGet([STORAGE_KEYS.settings, STORAGE_KEYS.lastLocation]);

  const settings =
    settingsRaw && typeof settingsRaw === "object" ? settingsRaw : {};
  const lastLocation =
    lastLocationRaw && typeof lastLocationRaw === "object"
      ? lastLocationRaw
      : null;

  const pn = getPrayerNotificationsSettings(settings);

  // Always clear existing alarms so we don't duplicate.
  await clearPrayerAlarms();

  // Keep the daily rescheduler alive.
  scheduleDailyRescheduleAlarm(new Date());

  if (!pn.enabled) return;

  const location = pickLocation(settings, lastLocation);
  const prayTimes = new PrayTimes();
  configurePrayTimes(prayTimes, settings);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const timeFormat = settings.timeFormat || "24h";

  const times = prayTimes.getTimes(
    today,
    [location.latitude, location.longitude],
    "auto",
    "auto",
    timeFormat,
  );

  // Store a small cache for debugging/visibility.
  await storageSet({
    md_prayerTimes_cache: {
      date: toISODateKey(today),
      location,
      timeFormat,
      times,
      scheduledAt: Date.now(),
    },
  });

  for (const def of PRAYER_DEFS) {
    const cfg = getPrayerNotificationConfig(def.key, settings, pn);
    if (!cfg) continue;

    const baseTimeStr = times[def.key];
    const baseDate = parseTimeToDate(baseTimeStr, today);
    if (!baseDate) continue;

    // Base (at-time)
    if (pn.atTimeEnabled && cfg.atTimeEnabled) {
      const when = baseDate.getTime();
      if (when > Date.now() + 1000) {
        alarmsCreate(`${PRAYER_ALARM_PREFIX}${def.key}_at`, { when });
      }
    }

    // Before
    if (cfg.beforeMinutes > 0) {
      const when = baseDate.getTime() - cfg.beforeMinutes * 60 * 1000;
      if (when > Date.now() + 1000) {
        alarmsCreate(`${PRAYER_ALARM_PREFIX}${def.key}_before`, { when });
      }
    }

    // After
    if (cfg.afterMinutes > 0) {
      const when = baseDate.getTime() + cfg.afterMinutes * 60 * 1000;
      if (when > Date.now() + 1000) {
        alarmsCreate(`${PRAYER_ALARM_PREFIX}${def.key}_after`, { when });
      }
    }
  }
}

function getPrayerName(prayerKey, referenceDate = new Date()) {
  const baseName =
    PRAYER_DEFS.find((p) => p.key === prayerKey)?.name || prayerKey;
  if (prayerKey === "dhuhr" && referenceDate.getDay() === 5) {
    return "Jumu'ah";
  }
  return baseName;
}

function formatBadgeCountdown(totalMinutes) {
  const minutes = clampNumber(totalMinutes, 0, 99999, 0);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours <= 9) {
    return `${hours}:${String(remainingMinutes).padStart(2, "0")}`;
  }

  if (hours <= 99) {
    return `${hours}h`;
  }

  return "99+h";
}

function formatCountdownTitle(totalMinutes) {
  const minutes = clampNumber(totalMinutes, 0, 99999, 0);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours <= 0) {
    return `${remainingMinutes}m`;
  }

  return `${hours}h ${String(remainingMinutes).padStart(2, "0")}m`;
}

function clearActionCountdownBadge() {
  try {
    chrome.action.setBadgeText({ text: "" });
  } catch (e) {}

  try {
    chrome.action.setTitle({ title: "Muslim Dashboard" });
  } catch (e) {}
}

function getNextVisiblePrayerInfo(settings, location, nowDate = new Date()) {
  const visiblePrayers = getVisiblePrayerDefs(settings);
  if (visiblePrayers.length === 0) return null;

  const prayTimes = new PrayTimes();
  configurePrayTimes(prayTimes, settings || {});

  const timeFormat = settings?.timeFormat || "24h";
  const coords = [location.latitude, location.longitude];

  const today = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate(),
  );
  const todayTimes = prayTimes.getTimes(
    today,
    coords,
    "auto",
    "auto",
    timeFormat,
  );

  for (const def of visiblePrayers) {
    const at = parseTimeToDate(todayTimes[def.key], today);
    if (!at) continue;

    if (at.getTime() > nowDate.getTime()) {
      return {
        key: def.key,
        name: getPrayerName(def.key, today),
        at,
      };
    }
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowTimes = prayTimes.getTimes(
    tomorrow,
    coords,
    "auto",
    "auto",
    timeFormat,
  );

  for (const def of visiblePrayers) {
    const at = parseTimeToDate(tomorrowTimes[def.key], tomorrow);
    if (!at) continue;

    return {
      key: def.key,
      name: getPrayerName(def.key, tomorrow),
      at,
    };
  }

  return null;
}

async function updateActionPrayerCountdownBadge() {
  try {
    const {
      [STORAGE_KEYS.settings]: settingsRaw,
      [STORAGE_KEYS.lastLocation]: lastLocationRaw,
    } = await storageGet([STORAGE_KEYS.settings, STORAGE_KEYS.lastLocation]);

    const settings =
      settingsRaw && typeof settingsRaw === "object" ? settingsRaw : {};
    const lastLocation =
      lastLocationRaw && typeof lastLocationRaw === "object"
        ? lastLocationRaw
        : null;

    if (settings?.componentVisibility?.prayerTimes === false) {
      clearActionCountdownBadge();
      return;
    }

    if (getVisiblePrayerDefs(settings).length === 0) {
      clearActionCountdownBadge();
      return;
    }

    const location = pickLocation(settings, lastLocation);
    const now = new Date();
    const next = getNextVisiblePrayerInfo(settings, location, now);

    if (!next?.at) {
      clearActionCountdownBadge();
      return;
    }

    const remainingMinutes = Math.max(
      0,
      Math.ceil((next.at.getTime() - now.getTime()) / (60 * 1000)),
    );

    const badgeText = formatBadgeCountdown(remainingMinutes);

    try {
      chrome.action.setBadgeBackgroundColor({ color: "#0d3d2e" });
    } catch (e) {}

    try {
      if (typeof chrome.action.setBadgeTextColor === "function") {
        chrome.action.setBadgeTextColor({ color: "#ffffff" });
      }
    } catch (e) {}

    try {
      chrome.action.setBadgeText({ text: badgeText });
    } catch (e) {}

    try {
      chrome.action.setTitle({
        title: `Next ${next.name} in ${formatCountdownTitle(remainingMinutes)}`,
      });
    } catch (e) {}
  } catch (e) {
    clearActionCountdownBadge();
  }
}

function ensureBadgeTickAlarm() {
  const now = new Date();
  const nextMinute = new Date(now);
  nextMinute.setSeconds(0, 0);
  nextMinute.setMinutes(nextMinute.getMinutes() + 1);

  alarmsCreate(BADGE_TICK_ALARM_NAME, {
    when: nextMinute.getTime(),
    periodInMinutes: 1,
  });
}

function formatMinutes(n) {
  return n === 1 ? "1 minute" : `${n} minutes`;
}

async function showPrayerNotification(prayerKey, kind) {
  const prayerName = getPrayerName(prayerKey);
  const titleBase = `${prayerName}`;

  let BeforeMinutes = 0;
  let AfterMinutes = 0;

  try {
    const { [STORAGE_KEYS.settings]: settingsRaw } = await storageGet([
      STORAGE_KEYS.settings,
    ]);

    const settings =
      settingsRaw && typeof settingsRaw === "object" ? settingsRaw : {};

    const pn = getPrayerNotificationsSettings(settings);
    if (pn && pn.enabled) {
      const cfg = getPrayerNotificationConfig(prayerKey, settings, pn);
      if (cfg) {
        BeforeMinutes = clampNumber(cfg.beforeMinutes, 0, 180, 0);
        AfterMinutes = clampNumber(cfg.afterMinutes, 0, 180, 0);
      } else {
        BeforeMinutes = clampNumber(pn.defaultBeforeMinutes, 0, 180, 0);
        AfterMinutes = clampNumber(pn.defaultAfterMinutes, 0, 180, 0);
      }
    }
  } catch (e) {
    // best effort; fall back to 0/0
  }

  let message = "";
  const bothZero = BeforeMinutes === 0 && AfterMinutes === 0;

  if (bothZero) {
    message = "Just now.";
  } else if (kind === "before") {
    message =
      BeforeMinutes === 0
        ? "Just now."
        : `Upcoming in ${formatMinutes(BeforeMinutes)}.`;
  } else if (kind === "after") {
    if (AfterMinutes === 0) {
      message = "Just now.";
    } else if (AfterMinutes === 1) {
      message = `1 minute has passed since ${prayerName} time.`;
    } else {
      message = `${AfterMinutes} minutes have passed since ${prayerName} time.`;
    }
  } else {
    message = "Just now.";
  }

  const notificationId = `${PRAYER_ALARM_PREFIX}${prayerKey}_${kind}_${Date.now()}`;

  const iconUrl =
    typeof chrome !== "undefined" && chrome.runtime?.getURL
      ? chrome.runtime.getURL("icons/icon128.png")
      : "icons/icon128.png";

  try {
    chrome.notifications.create(
      notificationId,
      {
        type: "basic",
        iconUrl,
        title: titleBase,
        message,
        priority: 1,
      },
      () => {
        const err = chrome.runtime?.lastError;
        if (err) {
          // Best-effort debugging aid.
          storageSet({
            md_prayerNotifications_lastError: {
              at: Date.now(),
              message: err.message || String(err),
              prayerKey,
              kind,
              BeforeMinutes,
              AfterMinutes,
            },
          });
        }
      },
    );
  } catch (e) {
    storageSet({
      md_prayerNotifications_lastError: {
        at: Date.now(),
        message: e?.message || String(e),
        prayerKey,
        kind,
        BeforeMinutes,
        AfterMinutes,
      },
    });
  }
}

// ============================================================================
// FASTING NOTIFICATIONS
// ============================================================================

/**
 * Simple Hijri date calculation for fasting notifications.
 * Based on Umm al-Qura approximation.
 */
function gregorianToHijri(date) {
  const jd =
    Math.floor((date.getTime() - Date.UTC(1970, 0, 1)) / 86400000) + 2440588;
  const l = jd - 1948440 + 10632;
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
 * Check if today is a fasting day based on settings.
 * Returns the type of fast or null if not a fasting day.
 */
function getTodayFastingType(settings, today) {
  const fasting = settings.fasting || {};
  const notify = fasting.notifications?.notify || {};
  const adjustment = Number(settings.hijriAdjustment || 0);

  // Adjust the date for Hijri calculation
  const adjustedDate = new Date(today);
  adjustedDate.setDate(adjustedDate.getDate() + adjustment);
  const hijri = gregorianToHijri(adjustedDate);

  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 4=Thu

  // Check Laylat al-Qadr day marker first (27 Ramadan)
  if (notify.laylatAlQadr !== false && hijri.month === 9 && hijri.day === 27) {
    return { type: "laylatAlQadr", label: "Laylat al-Qadr (27 Ramadan)" };
  }

  // Check Ramadan (month 9)
  if (notify.ramadan !== false && hijri.month === 9) {
    return { type: "ramadan", label: "Ramadan (month 9)" };
  }

  // Check Day of Arafah (9 Dhu al-Hijjah, month 12)
  if (notify.arafah !== false && hijri.month === 12 && hijri.day === 9) {
    return { type: "arafah", label: "Day of Arafah (9 Dhu al-Hijjah)" };
  }

  // Check Dhu al-Hijjah first 9 days (month 12, days 1-9)
  if (
    notify.dhuAlHijjah !== false &&
    hijri.month === 12 &&
    hijri.day >= 1 &&
    hijri.day <= 9
  ) {
    return {
      type: "dhuAlHijjah",
      label: "First 9 days of Dhu al-Hijjah (1-9 Dhu al-Hijjah)",
    };
  }

  // Check Tasu'a and Ashura (9-10 Muharram)
  if (notify.ashuraDays !== false && hijri.month === 1 && hijri.day === 9) {
    return { type: "tasua", label: "Tasu'a (9 Muharram)" };
  }
  if (notify.ashuraDays !== false && hijri.month === 1 && hijri.day === 10) {
    return { type: "ashura", label: "Ashura (10 Muharram)" };
  }

  // Check Ayyam al-Beed (13th-15th of any Hijri month, except Ramadan)
  if (
    notify.ayyamAlBeed !== false &&
    hijri.month !== 9 &&
    hijri.day >= 13 &&
    hijri.day <= 15
  ) {
    return {
      type: "ayyamAlBeed",
      label: "Ayyam al-Beed (13th-15th of each Hijri month)",
    };
  }

  // Check Monday fast
  if (notify.monday !== false && dayOfWeek === 1) {
    return { type: "monday", label: "Monday Fast" };
  }

  // Check Thursday fast
  if (notify.thursday !== false && dayOfWeek === 4) {
    return { type: "thursday", label: "Thursday Fast" };
  }

  return null;
}

/**
 * Schedule fasting Suhur notification for today (if applicable).
 */
async function scheduleFastingNotifications() {
  // Clear existing fasting alarm
  await alarmsClear(FASTING_ALARM_NAME);

  const {
    [STORAGE_KEYS.settings]: settingsRaw,
    [STORAGE_KEYS.lastLocation]: lastLocationRaw,
  } = await storageGet([STORAGE_KEYS.settings, STORAGE_KEYS.lastLocation]);

  const settings =
    settingsRaw && typeof settingsRaw === "object" ? settingsRaw : {};
  const lastLocation =
    lastLocationRaw && typeof lastLocationRaw === "object"
      ? lastLocationRaw
      : null;

  const fasting = settings.fasting || {};
  const notifications = fasting.notifications || {};

  // Check if fasting notifications are enabled
  if (!notifications.enabled) {
    await storageSet({
      md_fasting_status: { enabled: false, scheduledAt: Date.now() },
    });
    return;
  }

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  // Check if today is a fasting day
  const fastingType = getTodayFastingType(settings, todayStart);
  if (!fastingType) {
    await storageSet({
      md_fasting_status: {
        enabled: true,
        fastingDay: false,
        scheduledAt: Date.now(),
        date: toISODateKey(todayStart),
      },
    });
    return;
  }

  // Get Fajr time for today
  const location = pickLocation(settings, lastLocation);
  const prayTimes = new PrayTimes();
  configurePrayTimes(prayTimes, settings);

  const timeFormat = settings.timeFormat || "24h";
  const times = prayTimes.getTimes(
    todayStart,
    [location.latitude, location.longitude],
    "auto",
    "auto",
    timeFormat,
  );

  const fajrTimeStr = times.fajr;
  const fajrDate = parseTimeToDate(fajrTimeStr, todayStart);

  if (!fajrDate) {
    await storageSet({
      md_fasting_status: {
        enabled: true,
        error: "Could not parse Fajr time",
        fajrTimeStr,
        scheduledAt: Date.now(),
      },
    });
    return;
  }

  // Calculate Suhur notification time (minutesBefore before Fajr)
  const minutesBefore = clampNumber(notifications.minutesBefore, 5, 180, 60);
  const suhurTime = fajrDate.getTime() - minutesBefore * 60 * 1000;

  // Only schedule if the time is in the future
  if (suhurTime > Date.now() + 1000) {
    alarmsCreate(FASTING_ALARM_NAME, { when: suhurTime });

    await storageSet({
      md_fasting_status: {
        enabled: true,
        fastingDay: true,
        fastingType: fastingType.type,
        fastingLabel: fastingType.label,
        fajrTime: fajrTimeStr,
        suhurNotificationTime: new Date(suhurTime).toISOString(),
        minutesBefore,
        scheduledAt: Date.now(),
        date: toISODateKey(todayStart),
      },
    });
  } else {
    await storageSet({
      md_fasting_status: {
        enabled: true,
        fastingDay: true,
        fastingType: fastingType.type,
        fastingLabel: fastingType.label,
        missed: true,
        reason: "Suhur time already passed",
        fajrTime: fajrTimeStr,
        scheduledAt: Date.now(),
        date: toISODateKey(todayStart),
      },
    });
  }
}

/**
 * Show the fasting Suhur notification.
 */
async function showFastingNotification() {
  const { [STORAGE_KEYS.settings]: settingsRaw } = await storageGet([
    STORAGE_KEYS.settings,
  ]);
  const settings =
    settingsRaw && typeof settingsRaw === "object" ? settingsRaw : {};

  const fasting = settings.fasting || {};
  const minutesBefore = clampNumber(
    fasting.notifications?.minutesBefore,
    5,
    180,
    60,
  );

  // Get today's fasting type for the notification message
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const fastingType = getTodayFastingType(settings, todayStart);

  const title = "🌙 Suhur Time";
  let message = `Time to prepare for Suhur! Fajr is in ${minutesBefore} minutes.`;

  if (fastingType) {
    message = `${fastingType.label}: Time to prepare for Suhur! Fajr is in ${minutesBefore} minutes.`;
  }

  const notificationId = `${FASTING_ALARM_NAME}_${Date.now()}`;

  const iconUrl =
    typeof chrome !== "undefined" && chrome.runtime?.getURL
      ? chrome.runtime.getURL("icons/icon128.png")
      : "icons/icon128.png";

  try {
    chrome.notifications.create(
      notificationId,
      {
        type: "basic",
        iconUrl,
        title,
        message,
        priority: 2,
      },
      () => {
        const err = chrome.runtime?.lastError;
        if (err) {
          storageSet({
            md_fastingNotifications_lastError: {
              at: Date.now(),
              message: err.message || String(err),
            },
          });
        }
      },
    );
  } catch (e) {
    storageSet({
      md_fastingNotifications_lastError: {
        at: Date.now(),
        message: e?.message || String(e),
      },
    });
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  const name = alarm?.name;
  if (name === BADGE_TICK_ALARM_NAME) {
    updateActionPrayerCountdownBadge();
    return;
  }

  if (name === RESCHEDULE_ALARM_NAME) {
    schedulePrayerNotifications();
    scheduleFastingNotifications();
    updateActionPrayerCountdownBadge();
    return;
  }

  if (name === FASTING_ALARM_NAME) {
    if (isStaleAlarm(alarm, MAX_ALARM_LATE_MS)) return;
    void showFastingNotification();
    return;
  }

  if (typeof name !== "string" || !name.startsWith(PRAYER_ALARM_PREFIX)) return;

  if (isStaleAlarm(alarm, MAX_ALARM_LATE_MS)) return;

  const tail = name.slice(PRAYER_ALARM_PREFIX.length);
  const parts = tail.split("_");
  const prayerKey = parts[0];
  const kind = parts[1] || "at";

  void showPrayerNotification(prayerKey, kind);
});

chrome.runtime.onInstalled.addListener(() => {
  schedulePrayerNotifications();
  scheduleFastingNotifications();
  ensureBadgeTickAlarm();
  updateActionPrayerCountdownBadge();
});

chrome.runtime.onStartup?.addListener?.(() => {
  schedulePrayerNotifications();
  scheduleFastingNotifications();
  ensureBadgeTickAlarm();
  updateActionPrayerCountdownBadge();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;

  if (changes[STORAGE_KEYS.settings] || changes[STORAGE_KEYS.lastLocation]) {
    schedulePrayerNotifications();
    scheduleFastingNotifications();
    updateActionPrayerCountdownBadge();
  }
});

// Listen for manual reschedule request from settings
chrome.runtime.onMessage?.addListener?.((message) => {
  if (message?.type === "md_reschedule_fasting") {
    scheduleFastingNotifications();
    return;
  }

  if (message?.type === "md_update_prayer_badge") {
    updateActionPrayerCountdownBadge();
  }
});

ensureBadgeTickAlarm();
updateActionPrayerCountdownBadge();
